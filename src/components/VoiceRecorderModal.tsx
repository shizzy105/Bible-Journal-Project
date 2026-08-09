import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, X, Check, Volume2, AlertCircle } from 'lucide-react';
import { VoiceBlock } from '../types/journal';

interface VoiceRecorderModalProps {
  onClose: () => void;
  onSaveVoiceNote: (voiceBlock: VoiceBlock) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ onClose, onSaveVoiceNote }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string>('');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Start recording when modal opens
  useEffect(() => {
    startRealOrSimulatedRecording();

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

  const startRealOrSimulatedRecording = async () => {
    setPermissionError('');
    setIsSimulated(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
          // Stop stream tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start(200);
        setIsRecording(true);
        startTimer();
      } else {
        throw new Error('MediaDevices API not available');
      }
    } catch (err: any) {
      console.warn('Microphone permission blocked or unavailable. Switching to synthetic recording simulation:', err);
      setIsSimulated(true);
      setIsRecording(true);
      startTimer();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else if (isSimulated) {
      // Create a dummy audio blob url
      setAudioUrl('demo-audio');
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!audioUrl) return;

    if (isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.play();
        setIsPlayingPreview(true);
      } else if (isSimulated) {
        // Simulated play audio timer
        setIsPlayingPreview(true);
        setTimeout(() => setIsPlayingPreview(false), recordingTime * 1000 || 3000);
      }
    }
  };

  const handleSave = () => {
    const finalDuration = recordingTime > 0 ? recordingTime : 15;
    const voiceBlock: VoiceBlock = {
      id: `voice-${Date.now()}`,
      type: 'voice',
      audioUrl: audioUrl || 'demo-audio',
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

        {isSimulated && (
          <div className="w-full bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5 mb-4 text-amber-300 text-[11px] flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Sandbox Mic Mode active. Audio duration and playback simulated seamlessly.</span>
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

        {audioUrl && !isSimulated && (
          <audio
            ref={audioPreviewRef}
            src={audioUrl}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-4 w-full">
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Recording</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleTogglePreviewPlay}
                className="flex-1 py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-2xl flex items-center justify-center gap-2 border border-stone-700 transition-colors"
              >
                {isPlayingPreview ? (
                  <>
                    <Pause className="w-4 h-4 text-red-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>Play Preview</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <Check className="w-5 h-5" />
                <span>Save Note</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
