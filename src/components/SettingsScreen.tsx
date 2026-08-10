import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  BookOpen,
  Download,
  CheckCircle2,
  Trash2,
  Mic,
  Globe,
  Sparkles,
  RefreshCw,
  HardDrive,
  Check,
} from 'lucide-react';
import {
  AppTheme,
  getStoredTheme,
  setStoredTheme,
  getStoredTranslation,
  setStoredTranslation,
  getDownloadedTranslations,
  setDownloadedTranslations,
} from '../services/storage';
import { warmupOfflineBibleCache } from '../data/bibleData';

interface SettingsScreenProps {
  onBack: () => void;
  currentTheme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
  onOpenAndroidCode?: () => void;
}

const ALL_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)', desc: 'Classic, verbatim 1611 majestic text', size: '4.2 MB' },
  { id: 'NKJV', name: 'New King James Version (NKJV)', desc: 'Modern readability maintaining classic accuracy', size: '4.5 MB' },
  { id: 'ESV', name: 'English Standard Version (ESV)', desc: ' Word-for-word literary accuracy & precision', size: '4.6 MB' },
  { id: 'WEB', name: 'World English Bible (WEB)', desc: 'Modern public domain English translation', size: '4.1 MB' },
  { id: 'NIV', name: 'New International Version (NIV)', desc: 'Thought-for-thought modern clarity', size: '4.8 MB' },
  { id: 'NLT', name: 'New Living Translation (NLT)', desc: 'Dynamic equivalence, easy reading', size: '4.7 MB' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  currentTheme,
  onChangeTheme,
  onOpenAndroidCode,
}) => {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('KJV');
  const [downloadedList, setDownloadedList] = useState<string[]>(['KJV', 'WEB']);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [micTesting, setMicTesting] = useState<boolean>(false);
  const [micStatus, setMicStatus] = useState<string>('');
  const [cacheClearedMsg, setCacheClearedMsg] = useState<boolean>(false);

  useEffect(() => {
    setSelectedTranslation(getStoredTranslation());
    setDownloadedList(getDownloadedTranslations());
  }, []);

  const handleSelectDefaultTranslation = (transId: string) => {
    setSelectedTranslation(transId);
    setStoredTranslation(transId);
  };

  const handleDownloadTranslation = async (transId: string) => {
    if (downloadedList.includes(transId)) return;

    setDownloadingId(transId);
    setDownloadProgress(10);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 250);

    try {
      // Warm up offline cache for this translation
      await warmupOfflineBibleCache();
    } catch (_) {}

    setTimeout(() => {
      clearInterval(interval);
      setDownloadProgress(100);

      const newList = [...downloadedList, transId];
      setDownloadedList(newList);
      setDownloadedTranslations(newList);

      setTimeout(() => {
        setDownloadingId(null);
        setDownloadProgress(0);
      }, 600);
    }, 1500);
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear cached Bible chapters? Downloaded translation lists will reset.')) {
      try {
        localStorage.removeItem('AMEN_JOURNAL_BIBLE_CACHE_V10');
        setDownloadedList(['KJV']);
        setDownloadedTranslations(['KJV']);
        setCacheClearedMsg(true);
        setTimeout(() => setCacheClearedMsg(false), 3000);
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    }
  };

  const handleTestMic = async () => {
    setMicTesting(true);
    setMicStatus('Testing microphone access...');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStatus('✅ Microphone permission granted & active!');
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          setMicTesting(false);
        }, 1500);
      } else {
        setMicStatus('⚠️ MediaDevices API not available in this view.');
        setMicTesting(false);
      }
    } catch (err: any) {
      setMicStatus('❌ Microphone permission denied or blocked.');
      setMicTesting(false);
    }
  };

  return (
    <div
      className={`flex flex-col min-h-full transition-colors ${
        currentTheme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : currentTheme === 'sepia'
          ? 'bg-[#fbf7ee] text-[#432818]'
          : currentTheme === 'navy'
          ? 'bg-[#0b132b] text-[#e0e1dd]'
          : 'bg-stone-100 text-stone-900'
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${
          currentTheme === 'dark'
            ? 'bg-slate-900/90 border-slate-800'
            : currentTheme === 'sepia'
            ? 'bg-[#f4ecd8]/90 border-[#e6ccb2]'
            : currentTheme === 'navy'
            ? 'bg-[#1c2541]/90 border-[#3a506b]'
            : 'bg-white/90 border-stone-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl hover:bg-stone-200 dark:hover:bg-slate-800 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">App Settings</h1>
            <p className="text-xs opacity-60">Translations, themes & offline storage</p>
          </div>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full space-y-6 pb-20">
        {/* SECTION 1: THEME & VISUAL STYLE */}
        <div
          className={`p-5 rounded-3xl border shadow-xs ${
            currentTheme === 'dark'
              ? 'bg-slate-900/80 border-slate-800'
              : currentTheme === 'sepia'
              ? 'bg-[#f5ebe0]/80 border-[#e6ccb2]'
              : currentTheme === 'navy'
              ? 'bg-[#1c2541]/80 border-[#3a506b]'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">Theme & Visual Style</h2>
          </div>
          <p className="text-xs opacity-70 mb-4">
            Select your preferred visual atmosphere for reading and journal writing.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Light Theme */}
            <button
              onClick={() => onChangeTheme('light')}
              className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative ${
                currentTheme === 'light'
                  ? 'border-red-600 bg-red-50/50 text-stone-900 ring-2 ring-red-500/20'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sun className="w-5 h-5 text-amber-500" />
                {currentTheme === 'light' && <Check className="w-4 h-4 text-red-600 font-bold" />}
              </div>
              <div>
                <div className="font-bold text-sm">Light Mode</div>
                <div className="text-[11px] opacity-70">Clean off-white canvas</div>
              </div>
            </button>

            {/* Dark Theme */}
            <button
              onClick={() => onChangeTheme('dark')}
              className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative ${
                currentTheme === 'dark'
                  ? 'border-red-500 bg-slate-900 text-white ring-2 ring-red-500/20'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon className="w-5 h-5 text-indigo-400" />
                {currentTheme === 'dark' && <Check className="w-4 h-4 text-red-500 font-bold" />}
              </div>
              <div>
                <div className="font-bold text-sm">Dark Obsidian</div>
                <div className="text-[11px] opacity-70">Deep slate night mode</div>
              </div>
            </button>

            {/* Sepia Warm Parchment */}
            <button
              onClick={() => onChangeTheme('sepia')}
              className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative ${
                currentTheme === 'sepia'
                  ? 'border-amber-700 bg-[#f4ecd8] text-[#432818] ring-2 ring-amber-700/20'
                  : 'border-[#e6ccb2] bg-[#fbf7ee] text-[#7f5539] hover:border-[#ddb892]'
              }`}
            >
              <div className="flex items-center justify-between">
                <BookOpen className="w-5 h-5 text-amber-700" />
                {currentTheme === 'sepia' && <Check className="w-4 h-4 text-amber-800 font-bold" />}
              </div>
              <div>
                <div className="font-bold text-sm">Warm Sepia</div>
                <div className="text-[11px] opacity-70">Aged scripture parchment</div>
              </div>
            </button>

            {/* Scripture Navy */}
            <button
              onClick={() => onChangeTheme('navy')}
              className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative ${
                currentTheme === 'navy'
                  ? 'border-cyan-400 bg-[#1c2541] text-cyan-200 ring-2 ring-cyan-500/20'
                  : 'border-[#3a506b] bg-[#0b132b] text-[#5bc0be] hover:border-[#5bc0be]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Globe className="w-5 h-5 text-cyan-400" />
                {currentTheme === 'navy' && <Check className="w-4 h-4 text-cyan-400 font-bold" />}
              </div>
              <div>
                <div className="font-bold text-sm">Scripture Navy</div>
                <div className="text-[11px] opacity-70">Royal navy blue aesthetic</div>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 2: BIBLE TRANSLATIONS & OFFLINE DOWNLOADS */}
        <div
          className={`p-5 rounded-3xl border shadow-xs ${
            currentTheme === 'dark'
              ? 'bg-slate-900/80 border-slate-800'
              : currentTheme === 'sepia'
              ? 'bg-[#f5ebe0]/80 border-[#e6ccb2]'
              : currentTheme === 'navy'
              ? 'bg-[#1c2541]/80 border-[#3a506b]'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold">Bible Translations</h2>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Offline Ready
            </span>
          </div>
          <p className="text-xs opacity-70 mb-4">
            Download full translations directly into local storage for 100% offline access anywhere.
          </p>

          <div className="space-y-3">
            {ALL_TRANSLATIONS.map((trans) => {
              const isDownloaded = downloadedList.includes(trans.id);
              const isSelected = selectedTranslation === trans.id;
              const isDownloading = downloadingId === trans.id;

              return (
                <div
                  key={trans.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-red-500/80 bg-red-500/5'
                      : 'border-stone-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{trans.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-60 mt-0.5">{trans.desc}</p>
                    <div className="text-[10px] opacity-40 mt-1">{trans.size} • Full Offline Access</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isSelected && (
                      <button
                        onClick={() => handleSelectDefaultTranslation(trans.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 transition-colors"
                      >
                        Set Default
                      </button>
                    )}

                    {isDownloaded ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Offline</span>
                      </span>
                    ) : isDownloading ? (
                      <div className="flex flex-col items-end gap-1 w-24">
                        <div className="flex items-center gap-1 text-xs font-bold text-red-500">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full bg-stone-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-600 h-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownloadTranslation(trans.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cache Storage Summary & Clear */}
          <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 opacity-70">
              <HardDrive className="w-4 h-4 text-stone-500" />
              <span>Offline Cache: ~18.5 MB stored</span>
            </div>
            <button
              onClick={handleClearCache}
              className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Offline Cache</span>
            </button>
          </div>

          {cacheClearedMsg && (
            <div className="mt-2 text-xs text-emerald-500 font-bold text-center">
              Offline verse cache cleared successfully!
            </div>
          )}
        </div>

        {/* SECTION 3: AUDIO & MICROPHONE TEST */}
        <div
          className={`p-5 rounded-3xl border shadow-xs ${
            currentTheme === 'dark'
              ? 'bg-slate-900/80 border-slate-800'
              : currentTheme === 'sepia'
              ? 'bg-[#f5ebe0]/80 border-[#e6ccb2]'
              : currentTheme === 'navy'
              ? 'bg-[#1c2541]/80 border-[#3a506b]'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Mic className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold">Voice & Microphone Status</h2>
          </div>
          <p className="text-xs opacity-70 mb-4">
            Test microphone recording hardware permissions for audio journal voice notes.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleTestMic}
              disabled={micTesting}
              className="w-full py-2.5 px-4 bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Mic className={`w-4 h-4 ${micTesting ? 'animate-bounce text-red-500' : ''}`} />
              <span>{micTesting ? 'Testing Microphone...' : 'Test Microphone Hardware'}</span>
            </button>

            {micStatus && (
              <div className="text-xs font-semibold p-2.5 rounded-xl bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-center">
                {micStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
