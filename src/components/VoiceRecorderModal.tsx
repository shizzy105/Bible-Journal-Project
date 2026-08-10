import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, Check, AlertCircle } from 'lucide-react';
import { VoiceBlock } from '../types/journal';
import { AudioPlayer } from './AudioPlayer';

interface VoiceRecorderModalProps {
  onClose: () => void;
  onSaveVoiceNote: (voiceBlock: VoiceBlock) => void;
}

// Helper to construct a realistic 16-bit PCM WAV audio Blob via Web Audio synthesis
function createSampleAudioBlob(durationSeconds: number): Blob {
  const sampleRate = 22050;
  const numSamples = Math.max(Math.floor(sampleRate * durationSeconds), sampleRate);
  const buffer = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const speechCadence = Math.sin(t * 6) * 0.5 + 0.5;
    const fundamental = Math.sin(2 * Math.PI * 220 * t);
    const harmonic1 = Math.sin(2 * Math.PI * 440 * t) * 0.4;
    const harmonic2 = Math.sin(2 * Math.PI * 660 * t) * 0.2;
    buffer[i] = (fundamental + harmonic1 + harmonic2) * 0.3 * speechCadence;
  }

  const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ onClose, onSaveVoiceNote }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRealRecording();

    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    stopTimer();
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startSimulatedRecording = () => {
    setPermissionError('');
    setAudioUrl('');
    setAudioBlob(null);
    setIsSimulatedMode(true);
    setIsRecording(true);
    startTimer();
  };

  const startRealRecording = async () => {
    setPermissionError('');
    setAudioUrl('');
    setAudioBlob(null);
    setIsSimulatedMode(false);

    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      location.protocol !== 'https:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      setPermissionError('Microphone recording requires a secure (HTTPS) connection.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Microphone API is not supported or is restricted in this WebView/frame container.');
      return;
    }

    // Check if running inside Android WebView / Capacitor
    const isCapacitorOrWebView =
      typeof window !== 'undefined' &&
      ((window as any).Capacitor ||
        /Capacitor|Android|wv/i.test(navigator.userAgent));

    try {
      // Prompt for audio stream via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const finalType = mimeType || audioChunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (base64data) {
            setAudioUrl(base64data);
          }
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setIsRecording(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone access was blocked by your browser frame settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No physical microphone was detected on your system.');
      } else {
        setPermissionError('Microphone permission is restricted in this browser preview.');
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopTimer();

    if (isSimulatedMode) {
      const duration = recordingTime > 0 ? recordingTime : 2;
      const sampleBlob = createSampleAudioBlob(duration);
      setAudioBlob(sampleBlob);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        if (base64data) {
          setAudioUrl(base64data);
        }
      };
      reader.readAsDataURL(sampleBlob);
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSave = () => {
    if (!audioUrl) return;

    const finalDuration = recordingTime > 0 ? recordingTime : 1;
    const voiceBlock: VoiceBlock = {
      id: `voice-${Date.now()}`,
      type: 'voice',
      audioUrl: audioUrl,
      durationSeconds: finalDuration,
      title: `Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      createdAt: new Date().toISOString(),
    };

    onSaveVoiceNote(voiceBlock);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/60 text-red-500 flex items-center justify-center mb-3">
          <Mic className="w-6 h-6 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold text-white">Voice Journal Note</h3>
        <p className="text-xs text-stone-400 mt-1 mb-4">
          {isRecording
            ? isSimulatedMode
              ? 'Recording simulated audio note...'
              : 'Recording audio...'
            : audioUrl
            ? 'Audio note recorded'
            : permissionError
            ? 'Microphone restricted in browser frame'
            : 'Tap button below to start recording'}
        </p>

        {permissionError && (
          <div className="w-full bg-red-950/60 border border-red-800/80 rounded-2xl p-3.5 mb-4 text-red-200 text-xs flex flex-col gap-2.5 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span className="font-semibold text-red-300">Browser Frame Permission Limit</span>
            </div>
            <p className="text-stone-300 leading-relaxed text-[11px]">{permissionError}</p>
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => startSimulatedRecording()}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Record Demo Voice Note (Web Audio)</span>
              </button>
              <button
                onClick={() => startRealRecording()}
                className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Retry Hardware Mic Access</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Timer Counter */}
        <div className="text-4xl font-mono font-bold tracking-wider text-red-400 my-2">
          {formatTime(recordingTime)}
        </div>

        {/* Dynamic Sound Wave Pulse Animation */}
        <div className="flex items-center justify-center gap-1.5 h-12 my-3">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 bg-red-500 rounded-full transition-all duration-300 ${
                isRecording ? `animate-bounce h-${(i % 3) * 4 + 4}` : 'h-2 bg-stone-700'
              }`}
              style={{
                animationDelay: `${i * 0.15}s`,
                height: isRecording ? `${Math.sin(i + recordingTime) * 16 + 24}px` : '8px',
              }}
            />
          ))}
        </div>

        {/* Interactive Audio Player Preview when recording is stopped */}
        {!isRecording && audioUrl && (
          <div className="w-full my-2 text-left">
            <AudioPlayer src={audioUrl} durationSeconds={recordingTime} title="Recorded Audio Preview" />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-2 w-full">
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
            </button>
          ) : audioUrl ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => startRealRecording()}
                className="py-3 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-2xl flex items-center justify-center gap-1.5 text-xs transition-transform active:scale-95"
              >
                <Mic className="w-4 h-4 text-red-400" />
                <span>Re-record</span>
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-xs sm:text-sm"
              >
                <Check className="w-5 h-5" />
                <span>Save Voice Note</span>
              </button>
            </div>
          ) : !permissionError ? (
            <button
              onClick={() => startRealRecording()}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
