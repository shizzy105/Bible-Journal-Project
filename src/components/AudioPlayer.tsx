import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, Gauge } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  durationSeconds?: number;
  title?: string;
  onDelete?: () => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

// Fixed visual waveform bar heights for clean voice note representation
const WAVEFORM_HEIGHTS = [
  25, 40, 60, 35, 75, 95, 45, 80, 50, 90, 65, 30, 85, 100, 40, 70, 55, 85, 45,
  90, 60, 35, 75, 50, 80, 40, 65, 35,
];

// Helper to convert base64 data URLs to local blob URLs for smooth browser audio streaming
function ensurePlayableObjectUrl(src: string): string {
  if (!src) return '';
  if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  if (src.startsWith('data:audio/')) {
    try {
      const parts = src.split(',');
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mimeType });
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn('Failed to convert base64 to Blob URL:', e);
    }
  }
  return src;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  durationSeconds = 0,
  onDelete,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds || 1);
  const [speedIndex, setSpeedIndex] = useState<number>(1); // Default 1x
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const currentSpeed = SPEED_OPTIONS[speedIndex];

  // Sync duration prop if provided
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  // Setup HTML5 Audio element with object URL support
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);

    if (!src || src.trim() === '') {
      audioRef.current = null;
      return;
    }

    const playableUrl = ensurePlayableObjectUrl(src);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = playableUrl;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handleError = (e: Event) => {
      console.warn('Audio element playback error:', e, audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;

      // Clean up generated blob URL if created locally
      if (playableUrl.startsWith('blob:') && playableUrl !== src) {
        URL.revokeObjectURL(playableUrl);
      }
    };
  }, [src]);

  // Direct toggle play/pause control
  const togglePlay = async () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      audio.playbackRate = currentSpeed;

      // Reset to 0 if track ended or near the end
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.1)) {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Audio play request failed:', err);
      setIsPlaying(false);
    }
  };

  // Update speed on active audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed]);

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
  };

  // Seeking via Waveform Click / Touch Drag
  const handleSeekFromEvent = (clientX: number) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = fraction * duration;

    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeekFromEvent(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleSeekFromEvent(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className={`relative my-2.5 px-3.5 py-2.5 rounded-2xl bg-[#FEF9E7] dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex items-center gap-3 text-amber-900 dark:text-amber-100 select-none ${className}`}
    >
      {/* 1. PLAY / PAUSE BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="w-9 h-9 rounded-full bg-white dark:bg-amber-900 shadow-xs flex items-center justify-center text-amber-500 dark:text-amber-300 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current text-amber-500 dark:text-amber-300" />
        ) : (
          <Play className="w-4 h-4 fill-current text-amber-500 dark:text-amber-300 ml-0.5" />
        )}
      </button>

      {/* 2. TIME DISPLAY */}
      <span className="font-mono font-bold text-sm tracking-tight text-amber-600 dark:text-amber-300 shrink-0 min-w-[42px]">
        {formatTime(currentTime)}
      </span>

      {/* 3. WAVEFORM BARS & SCRUBBING NEEDLE */}
      <div
        ref={waveformRef}
        onMouseDown={handleWaveformMouseDown}
        onTouchStart={(e) => {
          if (e.touches[0]) handleSeekFromEvent(e.touches[0].clientX);
        }}
        className="relative flex-1 h-8 flex items-center gap-[2.5px] cursor-pointer py-1"
        title="Tap or drag to scrub audio position"
      >
        {WAVEFORM_HEIGHTS.map((height, idx) => {
          const barPercent = (idx / (WAVEFORM_HEIGHTS.length - 1)) * 100;
          const isPlayed = barPercent <= progressPercent;

          return (
            <div
              key={idx}
              style={{ height: `${height}%` }}
              className={`w-0.5 rounded-full transition-colors duration-75 ${
                isPlayed
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-amber-300/50 dark:bg-amber-800/50'
              }`}
            />
          );
        })}

        {/* SCRUBBING NEEDLE LINE WITH INDICATOR */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-amber-500 dark:bg-amber-400 pointer-events-none transition-all duration-75 shadow-xs"
          style={{ left: `${progressPercent}%` }}
        >
          {/* Triangular indicator handle at bottom of needle */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-amber-500 dark:border-b-amber-400" />
        </div>
      </div>

      {/* 4. SPEED CONTROLLER BUTTON */}
      <button
        onClick={cycleSpeed}
        className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-amber-900/80 border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-200 text-xs font-mono font-bold hover:bg-white transition-colors shrink-0 flex items-center gap-0.5 shadow-2xs"
        title="Change playback speed"
      >
        <Gauge className="w-3 h-3 text-amber-500 dark:text-amber-400" />
        <span>{currentSpeed}x</span>
      </button>

      {/* 5. TRASH / DELETE BUTTON */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg text-amber-500 hover:text-red-500 dark:text-amber-400 dark:hover:text-red-400 transition-colors shrink-0"
          title="Delete voice note"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

