import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, Check, AlertCircle } from 'lucide-react';
import { VoiceBlock } from '../types/journal';
import { AudioPlayer } from './AudioPlayer';

interface VoiceRecorderModalProps {
  onClose: () => void;
  onSaveVoiceNote: (voiceBlock: VoiceBlock) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ onClose, onSaveVoiceNote }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording when modal opens
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

  const startRealRecording = async () => {
    setPermissionError('');
    setAudioUrl('');
    setAudioBlob(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
          const finalType = mimeType || (audioChunksRef.current[0]?.type) || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: finalType });
          setAudioBlob(blob);

          // Create direct Blob URL for instant native audio playback
          const blobUrl = URL.createObjectURL(blob);
          setAudioUrl(blobUrl);

          // Convert Blob to Base64 Data URL for persistent storage
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            if (base64data) {
              setAudioUrl(base64data);
            }
          };
          reader.readAsDataURL(blob);

          // Stop stream tracks to free microphone
          stream.getTracks().forEach((track) => track.stop());
        };

        // Start continuous recording without fragmentation
        mediaRecorderRef.current.start();
        setIsRecording(true);
        startTimer();
      } else {
        throw new Error('MediaDevices API not available');
      }
    } catch (err: any) {
      console.warn('Microphone permission blocked or unavailable:', err);
      setPermissionError('Microphone permission is required to record voice notes. Please grant microphone permissions in your browser or device settings.');
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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
          {isRecording ? 'Recording audio...' : 'Audio note recorded'}
        </p>

        {permissionError && (
          <div className="w-full bg-red-950/60 border border-red-800/80 rounded-xl p-3 mb-4 text-red-200 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{permissionError}</span>
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
                isRecording
                  ? `animate-bounce h-${(i % 3) * 4 + 4}`
                  : 'h-2 bg-stone-700'
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
            <AudioPlayer
              src={audioUrl}
              durationSeconds={recordingTime}
              title="Recorded Audio Preview"
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-2 w-full">
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Check className="w-5 h-5" />
              <span>Save Voice Note</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
