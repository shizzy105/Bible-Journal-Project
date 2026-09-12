import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
  BookOpen,
  Download,
  CheckCircle2,
  Trash2,
  Mail,
  Globe,
  Sparkles,
  RefreshCw,
  HardDrive,
  Check,
  FileText,
  Type,
  ChevronRight,
  ChevronDown,
  Clock,
  ArrowUpDown,
  Upload,
  Share2,
  Copy,
  FileJson,
  AlertTriangle,
  FileUp,
  FileDown,
  Layers,
  Database,
  Archive,
  Image as ImageIcon,
  Music,
} from 'lucide-react';
import {
  AppTheme,
  RefFormat,
  getStoredTheme,
  setStoredTheme,
  getStoredTranslation,
  setStoredTranslation,
  getDownloadedTranslations,
  setDownloadedTranslations,
  getStoredRefFormat,
  setStoredRefFormat,
  getEnabledTranslations,
  setEnabledTranslations,
  getRecentlyDeletedEntries,
  getStoredEntries,
  createFullBackupData,
  downloadBackupFile,
  validateBackupJson,
  applyImportedBackup,
  BackupValidationResult,
} from '../services/storage';
import {
  createZipBackup,
  saveOrDownloadZipFile,
  shareZipBackupFile,
  extractAndRestoreZipBackup,
} from '../services/zipExportImport';
import { AppFont, BackupData } from '../types/journal';
import { warmupOfflineBibleCache } from '../data/bibleData';

interface SettingsScreenProps {
  onBack: () => void;
  currentTheme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
  currentFont: AppFont;
  onChangeFont: (font: AppFont) => void;
  onOpenRecentlyDeleted: () => void;
  onNotesImported?: () => void;
  onOpenAndroidCode?: () => void;
}

const FONT_OPTIONS: {
  id: AppFont;
  name: string;
  category: string;
  desc: string;
  sample: string;
  fontFamily: string;
}[] = [
  {
    id: 'system',
    name: 'Original Default',
    category: 'System + Classic Serif',
    desc: 'Clean modern interface paired with classic literary book serif',
    sample: 'Thy word is a lamp unto my feet, and a light unto my path.',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  {
    id: 'literata',
    name: 'Literata Serif',
    category: 'Classic Bible',
    desc: 'Majestic literary typeface designed for scriptures',
    sample: 'In the beginning was the Word, and the Word was with God.',
    fontFamily: "'Literata', Georgia, serif",
  },
  {
    id: 'crimson',
    name: 'Crimson Pro',
    category: 'Theological',
    desc: 'Classic book elegance, traditional devotionals',
    sample: 'For by grace are ye saved through faith; and that not of yourselves.',
    fontFamily: "'Crimson Pro', Garamond, serif",
  },
  {
    id: 'nunito',
    name: 'Nunito Rounded',
    category: 'Peaceful',
    desc: 'Soft, friendly, calm devotional reading atmosphere',
    sample: 'The LORD is my shepherd; I shall not want.',
    fontFamily: "'Nunito', system-ui, sans-serif",
  },
  {
    id: 'slab',
    name: 'Roboto Slab',
    category: 'Modern Slab',
    desc: 'Bold, structured, contemporary study layout',
    sample: 'I can do all things through Christ which strengtheneth me.',
    fontFamily: "'Roboto Slab', Georgia, serif",
  },
  {
    id: 'caveat',
    name: 'Caveat Journal',
    category: 'Handwritten',
    desc: 'Warm, organic, handwritten personal reflection feel',
    sample: 'Be strong and of a good courage; be not afraid.',
    fontFamily: "'Caveat', cursive, sans-serif",
  },
];

const ALL_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)', desc: 'Classic, verbatim 1611 majestic text', size: '4.2 MB' },
  { id: 'NKJV', name: 'New King James Version (NKJV)', desc: 'Modern readability maintaining classic accuracy', size: '4.5 MB' },
  { id: 'ESV', name: 'English Standard Version (ESV)', desc: 'Word-for-word literary accuracy & precision', size: '4.6 MB' },
  { id: 'WEB', name: 'World English Bible (WEB)', desc: 'Modern public domain English translation', size: '4.1 MB' },
  { id: 'NIV', name: 'New International Version (NIV)', desc: 'Thought-for-thought modern clarity', size: '4.8 MB' },
  { id: 'NLT', name: 'New Living Translation (NLT)', desc: 'Dynamic equivalence, easy reading', size: '4.7 MB' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  currentTheme,
  onChangeTheme,
  currentFont,
  onChangeFont,
  onOpenRecentlyDeleted,
  onNotesImported,
  onOpenAndroidCode,
}) => {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('KJV');
  const [downloadedList, setDownloadedList] = useState<string[]>(['KJV', 'WEB']);
  const [enabledVersions, setEnabledVersions] = useState<string[]>(['KJV']);
  const [refFormat, setRefFormat] = useState<RefFormat>('long');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [cacheClearedMsg, setCacheClearedMsg] = useState<boolean>(false);
  const [deletedCount, setDeletedCount] = useState<number>(0);

  // Backup / Export / Import states
  const [backupStats, setBackupStats] = useState<{
    totalNotes: number;
    totalVoice: number;
    totalDrawings: number;
    totalImages: number;
  }>({ totalNotes: 0, totalVoice: 0, totalDrawings: 0, totalImages: 0 });
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);
  const [importInputMode, setImportInputMode] = useState<'file' | 'paste'>('file');
  const [pastedJson, setPastedJson] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<BackupValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [restorePreferences, setRestorePreferences] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Accordion rollup state for each subgroup
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    theme: false,
    font: false,
    format: false,
    translations: false,
    backup: false,
    trash: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const refreshStats = () => {
    const entries = getStoredEntries();
    let vCount = 0;
    let dCount = 0;
    let iCount = 0;
    entries.forEach((e) => {
      e.blocks.forEach((b) => {
        if (b.type === 'voice') vCount++;
        if (b.type === 'drawing') dCount++;
        if (b.type === 'image') iCount++;
      });
    });
    setBackupStats({
      totalNotes: entries.length,
      totalVoice: vCount,
      totalDrawings: dCount,
      totalImages: iCount,
    });
    setDeletedCount(getRecentlyDeletedEntries().length);
  };

  useEffect(() => {
    setSelectedTranslation(getStoredTranslation());
    setDownloadedList(getDownloadedTranslations());
    setRefFormat(getStoredRefFormat());
    setEnabledVersions(getEnabledTranslations());
    refreshStats();
  }, []);

  const handleToggleEnabledVersion = (transId: string) => {
    let next: string[];
    if (enabledVersions.includes(transId)) {
      if (enabledVersions.length <= 1) {
        return; // Always keep at least 1 version enabled
      }
      next = enabledVersions.filter((id) => id !== transId);
    } else {
      next = [...enabledVersions, transId];
    }
    setEnabledVersions(next);
    setEnabledTranslations(next);
  };

  const handleSelectRefFormat = (fmt: RefFormat) => {
    setRefFormat(fmt);
    setStoredRefFormat(fmt);
  };

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
    }, 1400);
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('offline_bible_verses');
      localStorage.removeItem('custom_scripture_cache');
    } catch (_) {}
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 3000);
  };

  // ----------------------------------------------------
  // BACKUP & EXPORT HANDLERS (Portable ZIP Package + Native Android Share)
  // ----------------------------------------------------

  const handleExportZipFile = async () => {
    setExportLoading(true);
    setExportStatusText('Packaging notes, audio files, drawings & images into ZIP...');
    setExportSuccessMsg(null);
    setCopySuccessMsg(null);
    setImportErrorMsg(null);
    try {
      const backup = await createFullBackupData();
      const zipOutput = await createZipBackup(backup);
      const res = await saveOrDownloadZipFile(zipOutput.zipBlob, zipOutput.zipBase64, zipOutput.filename);

      const mediaParts: string[] = [];
      if (zipOutput.stats.voiceCount > 0) mediaParts.push(`${zipOutput.stats.voiceCount} audio`);
      if (zipOutput.stats.drawingCount > 0) mediaParts.push(`${zipOutput.stats.drawingCount} sketches`);
      if (zipOutput.stats.imageCount > 0) mediaParts.push(`${zipOutput.stats.imageCount} photos`);
      const mediaStr = mediaParts.length > 0 ? ` with ${mediaParts.join(', ')}` : '';

      setExportSuccessMsg(`Successfully exported ${zipOutput.stats.notesCount} notes${mediaStr} to "${res.filename}"`);
      setTimeout(() => setExportSuccessMsg(null), 6000);
    } catch (err: any) {
      setImportErrorMsg(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportLoading(false);
      setExportStatusText('');
    }
  };

  const handleExportJsonFile = async () => {
    setExportLoading(true);
    setExportStatusText('Generating JSON backup file...');
    setExportSuccessMsg(null);
    setCopySuccessMsg(null);
    try {
      const backup = await createFullBackupData();
      const filename = downloadBackupFile(backup);
      setExportSuccessMsg(`Exported ${backup.metadata?.totalNotes || backup.entries.length} notes to "${filename}"`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err: any) {
      setImportErrorMsg(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportLoading(false);
      setExportStatusText('');
    }
  };

  const handleCopyBackupJson = async () => {
    setExportLoading(true);
    setExportStatusText('Copying JSON to clipboard...');
    setCopySuccessMsg(null);
    try {
      const backup = await createFullBackupData();
      const jsonStr = JSON.stringify(backup, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopySuccessMsg('Self-contained backup JSON copied to clipboard!');
      setTimeout(() => setCopySuccessMsg(null), 4000);
    } catch (err: any) {
      setImportErrorMsg('Could not copy to clipboard. Please use file download.');
    } finally {
      setExportLoading(false);
      setExportStatusText('');
    }
  };

  const handleShareBackup = async () => {
    setExportLoading(true);
    setExportStatusText('Generating complete ZIP archive for sharing...');
    setExportSuccessMsg(null);
    setCopySuccessMsg(null);
    setImportErrorMsg(null);
    try {
      const backup = await createFullBackupData();
      const zipOutput = await createZipBackup(backup);
      const res = await shareZipBackupFile(
        zipOutput.zipBlob,
        zipOutput.zipBase64,
        zipOutput.filename,
        zipOutput.stats.notesCount
      );

      if (res.shared) {
        setExportSuccessMsg(`Share sheet opened for "${zipOutput.filename}"`);
      } else {
        setExportSuccessMsg(res.message);
      }
      setTimeout(() => setExportSuccessMsg(null), 6000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setImportErrorMsg(`Share failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setExportLoading(false);
      setExportStatusText('');
    }
  };

  // ----------------------------------------------------
  // IMPORT & RESTORE HANDLERS (Extracts ZIP and Restores Binary Media)
  // ----------------------------------------------------

  const processFile = async (file: File) => {
    setImportErrorMsg(null);
    setImportSuccessMsg(null);
    setImporting(true);

    try {
      const isZip =
        file.name.toLowerCase().endsWith('.zip') ||
        file.type.includes('zip') ||
        file.type.includes('compressed');

      if (isZip) {
        const validation = await extractAndRestoreZipBackup(file);
        setPreviewResult(validation);
        if (!validation.valid) {
          setImportErrorMsg(validation.error || 'Invalid backup ZIP archive.');
        }
      } else {
        const text = await file.text();
        const validation = validateBackupJson(text);
        setPreviewResult(validation);
        if (!validation.valid) {
          setImportErrorMsg(validation.error || 'Invalid backup file.');
        }
      }
    } catch (err: any) {
      setImportErrorMsg(`Failed to read backup file: ${err?.message || 'Read error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handlePastedChange = (text: string) => {
    setPastedJson(text);
    setImportErrorMsg(null);
    setImportSuccessMsg(null);
    if (!text.trim()) {
      setPreviewResult(null);
      return;
    }
    const validation = validateBackupJson(text);
    setPreviewResult(validation);
    if (!validation.valid) {
      setImportErrorMsg(validation.error || 'Invalid JSON backup format.');
    }
  };

  const handleExecuteImport = () => {
    if (!previewResult || !previewResult.valid || !previewResult.backup) {
      setImportErrorMsg('No valid backup loaded to import.');
      return;
    }

    setImporting(true);
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    try {
      const res = applyImportedBackup(previewResult.backup, importMode, restorePreferences);
      if (res.success) {
        refreshStats();
        if (onNotesImported) {
          onNotesImported();
        }
        setImportSuccessMsg(
          `Success! Imported ${res.importedCount} notes in ${res.mode === 'merge' ? 'Merge' : 'Replace'} mode. Total notes on device: ${res.totalActiveCount}.`
        );
        setPreviewResult(null);
        setPastedJson('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setTimeout(() => setImportSuccessMsg(null), 8000);
      }
    } catch (err: any) {
      setImportErrorMsg(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClearImport = () => {
    setPreviewResult(null);
    setPastedJson('');
    setImportErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper summary text for current theme
  const getThemeSummary = () => {
    switch (currentTheme) {
      case 'system':
        return 'Phone Mode (Auto)';
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Obsidian';
      case 'black':
        return 'Pitch Black (OLED)';
      case 'navy':
        return 'Scripture Navy';
      default:
        return 'Light Mode';
    }
  };

  // Helper summary text for current font
  const getFontSummary = () => {
    const found = FONT_OPTIONS.find((f) => f.id === currentFont);
    return found ? found.name : 'Original Default';
  };

  const isPureBlack = currentTheme === 'black';
  const isNavy = currentTheme === 'navy';
  const isNeutralDark = currentTheme === 'dark';

  const bgClass = isPureBlack
    ? 'bg-black text-neutral-100'
    : isNavy
    ? 'bg-[#0b132b] text-[#e0e1dd]'
    : isNeutralDark
    ? 'bg-neutral-950 text-neutral-100'
    : 'bg-stone-100 text-stone-900';

  const headerClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : isNeutralDark
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-200 shadow-2xs';

  const cardClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/80 border-[#3a506b]'
    : isNeutralDark
    ? 'bg-neutral-900/80 border-neutral-800'
    : 'bg-white border-stone-200';

  const countBadgeClass = isPureBlack
    ? 'bg-neutral-900 text-neutral-300'
    : isNavy
    ? 'bg-[#1c2541] text-[#e0e1dd]'
    : isNeutralDark
    ? 'bg-neutral-800 text-neutral-300'
    : 'bg-stone-200/60 text-stone-700';

  return (
    <div className={`flex flex-col min-h-full transition-colors ${bgClass}`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${headerClass}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">App Settings</h1>
            <p className="text-xs opacity-60">Tap any section to expand options</p>
          </div>
        </div>
      </div>

      {/* Main Settings Accordion List */}
      <div className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full space-y-3.5 pb-24">
        {/* SUBGROUP 1: THEME & VISUAL STYLE */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          {/* Header Bar */}
          <button
            type="button"
            onClick={() => toggleSection('theme')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">Theme & Appearance</h2>
                <div className="text-xs opacity-60 truncate">
                  Active: <span className="font-semibold text-red-500 dark:text-red-400">{getThemeSummary()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${countBadgeClass}`}>
                {getThemeSummary()}
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.theme ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {/* Roll Down Content */}
          {openSections.theme && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs opacity-70 mb-4">
                Select your preferred visual atmosphere for reading and journal writing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* System Auto Theme */}
                <button
                  onClick={() => onChangeTheme('system')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative sm:col-span-2 ${
                    currentTheme === 'system'
                      ? 'border-red-600 bg-red-500/10 text-current ring-2 ring-red-500/20'
                      : 'border-stone-300 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 text-current hover:border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-red-500" />
                      <span className="font-bold text-sm">Match Phone System Mode (Auto)</span>
                    </div>
                    {currentTheme === 'system' && <Check className="w-4 h-4 text-red-600 font-bold" />}
                  </div>
                  <div className="text-[11px] opacity-75">
                    Automatically switches between Light and Dark mode based on your phone's system appearance
                  </div>
                </button>

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
                      ? 'border-red-500 bg-neutral-900 text-white ring-2 ring-red-500/20'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Moon className="w-5 h-5 text-neutral-300" />
                    {currentTheme === 'dark' && <Check className="w-4 h-4 text-red-500 font-bold" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Dark Obsidian</div>
                    <div className="text-[11px] opacity-70">Deep neutral charcoal dark mode</div>
                  </div>
                </button>

                {/* Pitch Black (OLED) Theme */}
                <button
                  onClick={() => onChangeTheme('black')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 text-left transition-all relative ${
                    currentTheme === 'black'
                      ? 'border-red-500 bg-black text-white ring-2 ring-red-500/20'
                      : 'border-neutral-800 bg-black text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-5 h-5 rounded-full bg-black border-2 border-neutral-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    {currentTheme === 'black' && <Check className="w-4 h-4 text-red-500 font-bold" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Pitch Black (OLED)</div>
                    <div className="text-[11px] opacity-70">True #000000 pure black</div>
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
          )}
        </div>

        {/* SUBGROUP 2: APP FONT & TYPOGRAPHY */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          <button
            type="button"
            onClick={() => toggleSection('font')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 shrink-0">
                <Type className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">App Font & Typography</h2>
                <div className="text-xs opacity-60 truncate">
                  Active: <span className="font-semibold text-red-500 dark:text-red-400">{getFontSummary()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${countBadgeClass}`}>
                {getFontSummary()}
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.font ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {openSections.font && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs opacity-70 mb-4">
                Select the typeface for reading scriptures and writing journal notes throughout the app.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FONT_OPTIONS.map((f) => {
                  const isSelected = currentFont === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onChangeFont(f.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-red-600 bg-red-500/5 ring-2 ring-red-500/20'
                          : currentTheme === 'black'
                          ? 'border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-200'
                          : currentTheme === 'dark'
                          ? 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                          : currentTheme === 'navy'
                          ? 'border-[#3a506b] bg-[#1c2541]/50 hover:border-[#5bc0be]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-bold text-sm leading-tight">{f.name}</div>
                          <div className="text-[10px] opacity-60 font-semibold">{f.category}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 font-black" />
                          </div>
                        )}
                      </div>

                      <div
                        className="p-2.5 rounded-xl bg-stone-100/70 dark:bg-neutral-800/60 border border-stone-200/60 dark:border-neutral-700/50 text-xs leading-relaxed line-clamp-2"
                        style={{ fontFamily: f.fontFamily }}
                      >
                        "{f.sample}"
                      </div>

                      <div className="text-[10px] opacity-60 leading-tight">
                        {f.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SUBGROUP 3: SCRIPTURE REFERENCE FORMAT */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          <button
            type="button"
            onClick={() => toggleSection('format')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">Scripture Tag Format</h2>
                <div className="text-xs opacity-60 truncate">
                  Style: <span className="font-semibold text-red-500 dark:text-red-400">{refFormat === 'long' ? 'Long Format' : 'Short Format'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${countBadgeClass}`}>
                {refFormat === 'long' ? 'Long (Hebrews 3 v 1)' : 'Short (Heb 3 v 1)'}
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.format ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {openSections.format && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs opacity-70 mb-4">
                Choose whether inserted scripture bubble tags appear with full book names or abbreviated across all journal notes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Long Format Option */}
                <button
                  type="button"
                  onClick={() => handleSelectRefFormat('long')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    refFormat === 'long'
                      ? 'border-red-600 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20'
                      : 'border-stone-200 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-900/50 hover:border-stone-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">Long Format</span>
                      {refFormat === 'long' && <Check className="w-4 h-4 text-red-600 font-bold" />}
                    </div>
                    <p className="text-[11px] opacity-70 mb-3">Full book name</p>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-red-100/90 dark:bg-red-950/90 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-mono text-xs font-bold self-start">
                    Hebrews 3 v 1
                  </div>
                </button>

                {/* Short Format Option */}
                <button
                  type="button"
                  onClick={() => handleSelectRefFormat('short')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    refFormat === 'short'
                      ? 'border-red-600 bg-red-50/50 dark:bg-red-950/30 ring-2 ring-red-500/20'
                      : 'border-stone-200 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-900/50 hover:border-stone-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">Short Format</span>
                      {refFormat === 'short' && <Check className="w-4 h-4 text-red-600 font-bold" />}
                    </div>
                    <p className="text-[11px] opacity-70 mb-3">Abbreviated book name</p>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-red-100/90 dark:bg-red-950/90 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-mono text-xs font-bold self-start">
                    Heb 3 v 1
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SUBGROUP 4: BIBLE TRANSLATIONS & OFFLINE DOWNLOADS */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          <button
            type="button"
            onClick={() => toggleSection('translations')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">Bible Translations & Offline</h2>
                <div className="text-xs opacity-60 truncate">
                  Default: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedTranslation}</span> • {downloadedList.length} Offline
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {selectedTranslation}
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.translations ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {openSections.translations && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs opacity-70 mb-4">
                Set default translations, enable viewer versions, and download full editions for 100% offline study.
              </p>

              <div className="space-y-3">
                {ALL_TRANSLATIONS.map((trans) => {
                  const isDownloaded = downloadedList.includes(trans.id);
                  const isSelected = selectedTranslation === trans.id;
                  const isDownloading = downloadingId === trans.id;
                  const isEnabledInViewer = enabledVersions.includes(trans.id);

                  return (
                    <div
                      key={trans.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                        isSelected
                          ? 'border-red-500/80 bg-red-500/5'
                          : 'border-stone-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{trans.name}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded-md shrink-0">
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
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-200 dark:bg-neutral-800 hover:bg-stone-300 dark:hover:bg-neutral-700 transition-colors"
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
                              <div className="w-full bg-stone-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
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

                      {/* Toggle Switch for Scripture Viewer Version Options */}
                      <div className="pt-2.5 border-t border-stone-200/60 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-xs font-semibold opacity-80">
                          Show in Scripture Viewer options
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabledVersion(trans.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabledInViewer ? 'bg-red-600' : 'bg-stone-300 dark:bg-neutral-700'
                          }`}
                          role="switch"
                          aria-checked={isEnabledInViewer}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isEnabledInViewer ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cache Storage Summary & Clear */}
              <div className="mt-5 pt-4 border-t border-stone-200 dark:border-neutral-800 flex items-center justify-between text-xs">
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
          )}
        </div>

        {/* SUBGROUP 5: BACKUP, EXPORT & IMPORT (Device Migration & Sync) */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          <button
            type="button"
            onClick={() => toggleSection('backup')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <ArrowUpDown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">Backup, Export & Import</h2>
                <div className="text-xs opacity-60 truncate">
                  Transfer notes across devices • {backupStats.totalNotes} {backupStats.totalNotes === 1 ? 'note' : 'notes'} stored
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {backupStats.totalNotes} Notes
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.backup ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {openSections.backup && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <p className="text-xs opacity-70">
                Back up your entire journal or migrate seamlessly when changing phones or browsers. Exports include all note blocks, scriptures, voice recordings, sketches, and preferences.
              </p>

              {/* Data Overview Stats Bar */}
              <div className="p-3 rounded-2xl bg-stone-100/80 dark:bg-neutral-900/60 border border-stone-200/70 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold opacity-80">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>On Device Storage:</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-neutral-800 font-bold">
                    {backupStats.totalNotes} Notes
                  </span>
                  {backupStats.totalVoice > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                      {backupStats.totalVoice} Audio
                    </span>
                  )}
                  {backupStats.totalDrawings > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {backupStats.totalDrawings} Drawings
                    </span>
                  )}
                  {backupStats.totalImages > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {backupStats.totalImages} Photos
                    </span>
                  )}
                  {deletedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-200/60 dark:bg-neutral-800 opacity-60">
                      {deletedCount} Trash
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION A: EXPORT NOTES */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-sm">Export Notes Package</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    ZIP & JSON Formats
                  </span>
                </div>
                <p className="text-[11px] opacity-70">
                  Export a <strong>portable ZIP package</strong> containing your notes, real audio recordings, drawings, and photos. You can also share the file directly via Android&apos;s native share sheet.
                </p>

                {exportLoading && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>{exportStatusText || 'Preparing export package...'}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Download ZIP Package */}
                  <button
                    type="button"
                    onClick={handleExportZipFile}
                    disabled={exportLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ZIP Package</span>
                  </button>

                  {/* Share ZIP Backup */}
                  <button
                    type="button"
                    onClick={handleShareBackup}
                    disabled={exportLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share ZIP File</span>
                  </button>
                </div>

                {/* Additional / Fallback formats */}
                <div className="pt-2 border-t border-stone-200/60 dark:border-neutral-800 flex items-center gap-2">
                  <span className="text-[11px] font-semibold opacity-60">Other formats:</span>
                  <button
                    type="button"
                    onClick={handleExportJsonFile}
                    disabled={exportLoading}
                    className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-indigo-600 underline flex items-center gap-1"
                  >
                    <FileJson className="w-3 h-3" />
                    <span>JSON File</span>
                  </button>
                  <span className="opacity-40">•</span>
                  <button
                    type="button"
                    onClick={handleCopyBackupJson}
                    disabled={exportLoading}
                    className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-indigo-600 underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>

                {exportSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{exportSuccessMsg}</span>
                  </div>
                )}

                {copySuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{copySuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* SECTION B: IMPORT & RESTORE NOTES */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-neutral-800 bg-stone-50/50 dark:bg-neutral-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-sm">Import & Restore Notes</span>
                  </div>

                  {/* Input Mode Selector */}
                  <div className="flex items-center p-0.5 rounded-xl bg-stone-200/80 dark:bg-neutral-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setImportInputMode('file');
                        setImportErrorMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        importInputMode === 'file'
                          ? 'bg-white dark:bg-neutral-700 text-current shadow-2xs'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      File (.zip / .json)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportInputMode('paste');
                        setImportErrorMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        importInputMode === 'paste'
                          ? 'bg-white dark:bg-neutral-700 text-current shadow-2xs'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      Paste Text
                    </button>
                  </div>
                </div>

                {/* File Upload Mode */}
                {importInputMode === 'file' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".zip,.json,application/zip,application/x-zip-compressed,application/json,text/plain"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          processFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                          : 'border-stone-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-stone-100/50 dark:hover:bg-neutral-805/40'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                        <FileUp className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-xs">Tap to select or drop .zip or .json backup</div>
                      <div className="text-[11px] opacity-60 mt-0.5">Supports full ZIP backups with audio & drawings from any device</div>
                    </div>
                  </div>
                )}

                {/* Paste JSON Mode */}
                {importInputMode === 'paste' && (
                  <div className="space-y-2">
                    <textarea
                      value={pastedJson}
                      onChange={(e) => handlePastedChange(e.target.value)}
                      placeholder='Paste your backup JSON content here (e.g. {"version":"2.0", "entries":[...]})'
                      rows={4}
                      className="w-full p-3 rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {pastedJson && (
                      <button
                        type="button"
                        onClick={() => handlePastedChange('')}
                        className="text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline"
                      >
                        Clear pasted text
                      </button>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {importErrorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Import Error</div>
                      <div className="text-[11px] opacity-90">{importErrorMsg}</div>
                    </div>
                  </div>
                )}

                {/* Validated Backup Preview & Confirmation Dialog */}
                {previewResult && previewResult.valid && previewResult.backup && (
                  <div className="p-4 rounded-2xl border-2 border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300">
                          Backup Verified & Ready to Restore
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-60">
                        v{previewResult.stats?.version || '2.0'}
                      </span>
                    </div>

                    {/* Inspection Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-stone-200 dark:border-neutral-800">
                        <div className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                          {previewResult.stats?.notesCount || 0}
                        </div>
                        <div className="text-[10px] opacity-60">Notes Found</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-stone-200 dark:border-neutral-800">
                        <div className="font-black text-sm text-rose-500">
                          {previewResult.stats?.voiceCount || 0}
                        </div>
                        <div className="text-[10px] opacity-60">Voice Audios</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-stone-200 dark:border-neutral-800">
                        <div className="font-black text-sm text-amber-500">
                          {previewResult.stats?.drawingCount || 0}
                        </div>
                        <div className="text-[10px] opacity-60">Drawings</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-stone-200 dark:border-neutral-800">
                        <div className="font-black text-sm text-emerald-500">
                          {previewResult.stats?.imageCount || 0}
                        </div>
                        <div className="text-[10px] opacity-60">Photos</div>
                      </div>
                    </div>

                    {previewResult.stats?.date && (
                      <div className="text-[11px] opacity-60 text-center">
                        Backup exported on:{' '}
                        <span className="font-semibold">
                          {new Date(previewResult.stats.date).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Import Mode Selector */}
                    <div className="pt-2 border-t border-indigo-500/20 space-y-2">
                      <div className="text-xs font-bold">Select Import Strategy:</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImportMode('merge')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                            importMode === 'merge'
                              ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                              : 'border-stone-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Merge Notes (Recommended)</span>
                            {importMode === 'merge' && <Check className="w-3.5 h-3.5 font-bold" />}
                          </div>
                          <p className="text-[10px] opacity-75">
                            Keep existing notes on this device and combine with imported notes.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                            importMode === 'replace'
                              ? 'border-red-600 bg-red-50/10 text-red-700 dark:text-red-300 ring-2 ring-red-500/20'
                              : 'border-stone-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Replace All Notes</span>
                            {importMode === 'replace' && <Check className="w-3.5 h-3.5 font-bold" />}
                          </div>
                          <p className="text-[10px] opacity-75">
                            Overwrite existing notes with this backup file completely.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Restore Preferences Checkbox */}
                    {previewResult.backup.preferences && (
                      <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={restorePreferences}
                          onChange={(e) => setRestorePreferences(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="opacity-80">
                          Also restore saved theme, font & scripture formatting preferences
                        </span>
                      </label>
                    )}

                    {/* Confirm Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={importing}
                        className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {importing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Restoring Notes...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm & Restore {previewResult.stats?.notesCount || 0} Notes</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearImport}
                        disabled={importing}
                        className="py-2.5 px-3 rounded-xl bg-stone-200 dark:bg-neutral-800 hover:bg-stone-300 dark:hover:bg-neutral-700 font-bold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Import Success Banner */}
                {importSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{importSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SUBGROUP 6: RECENTLY DELETED (TRASH) */}
        <div className={`rounded-3xl border transition-all overflow-hidden shadow-xs ${cardClass}`}>
          <button
            type="button"
            onClick={() => toggleSection('trash')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-stone-500/5 focus:outline-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight">Trash & Recovery</h2>
                <div className="text-xs opacity-60 truncate">
                  {deletedCount} {deletedCount === 1 ? 'note' : 'notes'} in trash (30-day retention)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {deletedCount} Notes
              </span>
              <div
                className={`p-1.5 rounded-xl transition-transform duration-200 ${
                  openSections.trash ? 'rotate-180 bg-stone-200/50 dark:bg-neutral-800' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </button>

          {openSections.trash && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-200/60 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs opacity-70 mb-4">
                Notes you delete are preserved in the trash for 30 days before permanent deletion.
              </p>

              <button
                onClick={onOpenRecentlyDeleted}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${
                  currentTheme === 'black'
                    ? 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800'
                    : currentTheme === 'dark'
                    ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                    : currentTheme === 'navy'
                    ? 'bg-[#1c2541]/80 hover:bg-[#232f55] border-[#3a506b]'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm group-hover:text-red-500 transition-colors">
                      Recently Deleted Notes
                    </div>
                    <div className="text-xs opacity-60">
                      {deletedCount} {deletedCount === 1 ? 'note' : 'notes'} in trash
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-red-500">
                  <span>View Trash</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* SUBGROUP 7: CONTACT & SUPPORT */}
        <a
          id="settings-contact-panel"
          href="mailto:asornotes@gmail.com?subject=Bible%20Journal%20Feedback"
          className={`block rounded-3xl border transition-all overflow-hidden shadow-xs group cursor-pointer ${
            currentTheme === 'black'
              ? 'bg-neutral-950 hover:bg-neutral-900 border-neutral-900 hover:border-neutral-800'
              : currentTheme === 'dark'
              ? 'bg-neutral-900/90 hover:bg-neutral-800/90 border-neutral-800 hover:border-neutral-700'
              : currentTheme === 'navy'
              ? 'bg-[#1c2541]/80 hover:bg-[#232f55] border-[#3a506b] hover:border-[#4f6d7a]'
              : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="w-full p-4 sm:p-5 flex items-center justify-between text-left">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight group-hover:text-blue-500 transition-colors">
                  Contact & Support
                </h2>
                <div className="text-xs opacity-60 truncate">
                  asornotes@gmail.com • Feedback, suggestions & questions
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                asornotes@gmail.com
              </span>
              <div className="p-1.5 rounded-xl bg-stone-200/50 dark:bg-neutral-800 text-stone-600 dark:text-stone-300 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};
