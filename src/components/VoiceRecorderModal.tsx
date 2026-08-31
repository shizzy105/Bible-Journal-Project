import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, Check, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';
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
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const useNativePluginRef = useRef<boolean>(false);

  useEffect(() => {
    checkPermissionStatus();
    startRealRecording();

    return () => {
      stopTimer();
      if (useNativePluginRef.current) {
        VoiceRecorder.stopRecording().catch(() => {});
      } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const checkPermissionStatus = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const hasPerm = await VoiceRecorder.hasAudioRecordingPermission();
        setPermissionState(hasPerm.value ? 'granted' : 'prompt');
        return;
      }

      if (navigator.permissions && navigator.permissions.query) {
        const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionState(res.state as 'prompt' | 'granted' | 'denied');
        res.onchange = () => {
          setPermissionState(res.state as 'prompt' | 'granted' | 'denied');
          if (res.state === 'granted') {
            setPermissionError('');
          }
        };
      }
    } catch {
      // Permission query not supported in all environments
    }
  };

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
    useNativePluginRef.current = false;

    // 1. Check Capacitor Native Audio Recording path (Android / iOS app)
    if (Capacitor.isNativePlatform()) {
      try {
        const permResult = await VoiceRecorder.hasAudioRecordingPermission();
        if (!permResult.value) {
          const reqResult = await VoiceRecorder.requestAudioRecordingPermission();
          if (!reqResult.value) {
            setPermissionError('Microphone permission was denied on Android. Please open Android Settings > Apps > Asor Notes > Permissions and enable Microphone.');
            setPermissionState('denied');
            return;
          }
        }

        const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
        if (!canRecord.value) {
          setPermissionError('Audio recording is not supported on this mobile device.');
          return;
        }

        await VoiceRecorder.startRecording();
        useNativePluginRef.current = true;
        setPermissionState('granted');
        setIsRecording(true);
        startTimer();
        return;
      } catch (err: any) {
        console.warn('Native Capacitor VoiceRecorder failed, falling back to getUserMedia:', err);
      }
    }

    // 2. Standard Browser Web Audio Path (Web / Dev Preview)
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
      setPermissionError('Microphone access is not supported by this browser or WebView container.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');

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
      setPermissionState('denied');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied or blocked.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No active microphone device was found on this system.');
      } else {
        setPermissionError('Microphone recording failed to initialize.');
      }
    }
  };

  const handleOpenSystemSettings = () => {
    // Attempt Capacitor native settings open if present
    if ((window as any).Capacitor?.native?.openSettings) {
      (window as any).Capacitor.native.openSettings();
      return;
    }

    try {
      window.location.href = 'app-settings:';
    } catch {
      // Fallback
    }

    startRealRecording();
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    stopTimer();

    // 1. Native Capacitor Audio Record Stop
    if (useNativePluginRef.current) {
      try {
        const recordResult = await VoiceRecorder.stopRecording();
        if (recordResult.value && recordResult.value.recordDataBase64) {
          const mime = recordResult.value.mimeType || 'audio/aac';
          const base64Url = `data:${mime};base64,${recordResult.value.recordDataBase64}`;
          setAudioUrl(base64Url);
          const durSeconds = Math.round((recordResult.value.msDuration || 0) / 1000) || recordingTime || 1;
          setRecordingTime(durSeconds);
        }
        useNativePluginRef.current = false;
        return;
      } catch (err) {
        console.error('Error stopping native recording:', err);
      }
    }

    // 2. Web MediaRecorder Stop
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
          {isRecording
            ? 'Recording audio...'
            : audioUrl
            ? 'Audio note recorded'
            : permissionError
            ? 'Microphone permission required'
            : 'Tap button below to start recording'}
        </p>

        {permissionError && (
          <div className="w-full bg-red-950/60 border border-red-800/80 rounded-2xl p-3.5 mb-4 text-red-200 text-xs flex flex-col gap-2.5 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span className="font-semibold text-red-300">Microphone Access Denied</span>
            </div>
            <p className="text-stone-300 leading-relaxed text-[11px]">{permissionError}</p>
            
            <div className="bg-stone-950/80 rounded-xl p-2.5 border border-stone-800 text-[10px] text-stone-400 leading-relaxed">
              <span className="text-red-400 font-bold block mb-0.5">Android App Setup Tip:</span>
              On Android, open <strong className="text-stone-200">Settings &gt; Apps &gt; Asor Notes &gt; Permissions</strong> and set <strong className="text-stone-200">Microphone</strong> to "Allow while using app".
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={startRealRecording}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Request Microphone Access Again</span>
              </button>
              <button
                onClick={handleOpenSystemSettings}
                className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-stone-400" />
                <span>Open Device App Settings</span>
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
                onClick={startRealRecording}
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
              onClick={startRealRecording}
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

