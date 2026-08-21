import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { JournalEntry, AppFont } from './types/journal';
import {
  getStoredEntries,
  saveSingleEntry,
  deleteStoredEntry,
  getStoredTheme,
  setStoredTheme,
  getStoredFont,
  setStoredFont,
  AppTheme,
} from './services/storage';
import { DeviceFrame } from './components/DeviceFrame';
import { HomeScreen } from './components/HomeScreen';
import { NoteEditorScreen } from './components/NoteEditorScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { RecentlyDeletedScreen } from './components/RecentlyDeletedScreen';
import { SearchOverlay } from './components/SearchOverlay';
import { AndroidCodeExportModal } from './components/AndroidCodeExportModal';
import { warmupOfflineBibleCache } from './data/bibleData';

export default function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeScreen, setActiveScreen] = useState<'home' | 'editor' | 'calendar' | 'settings' | 'recently-deleted'>('home');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showAndroidCode, setShowAndroidCode] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('system');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(false);
  const [currentFont, setCurrentFont] = useState<AppFont>('system');

  // Resolved dark mode boolean factoring in system preference when in 'system' mode
  const effectiveDarkMode =
    currentTheme === 'system'
      ? systemIsDark
      : currentTheme === 'dark' || currentTheme === 'navy';

  const applyThemeToDom = (theme: AppTheme, isSysDark: boolean) => {
    document.documentElement.classList.remove('dark', 'sepia', 'navy');
    if (theme === 'system') {
      if (isSysDark) {
        document.documentElement.classList.add('dark');
      }
    } else if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'sepia') {
      document.documentElement.classList.add('sepia');
    } else if (theme === 'navy') {
      document.documentElement.classList.add('dark', 'navy');
    }
  };

  const applyFontToDom = (font: AppFont) => {
    document.documentElement.setAttribute('data-app-font', font);
    document.body.setAttribute('data-app-font', font);
  };

  // Listen for system/phone OS dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
      if (currentTheme === 'system') {
        applyThemeToDom('system', e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, [currentTheme]);

  // Load entries, theme, font, and pre-warm Bible cache on mount
  useEffect(() => {
    const loadedEntries = getStoredEntries();
    setEntries(loadedEntries);

    const savedTheme = getStoredTheme();
    setCurrentTheme(savedTheme);

    const sysDark = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    setSystemIsDark(sysDark);
    applyThemeToDom(savedTheme, sysDark);

    const savedFont = getStoredFont();
    setCurrentFont(savedFont);
    applyFontToDom(savedFont);

    // Warm up offline Bible cache in background
    warmupOfflineBibleCache();

    // Initialize root browser history state so back button behaves predictably
    try {
      if (!window.history.state || !window.history.state.screen) {
        window.history.replaceState({ screen: 'home' }, '');
      }
    } catch {
      // ignore
    }
  }, []);

  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastExitPressTimeRef = useRef<number>(0);
  const lastBackActionTimestampRef = useRef<number>(0);

  // Keep latest navigation state in refs for back button listeners
  const showAndroidCodeRef = useRef(showAndroidCode);
  showAndroidCodeRef.current = showAndroidCode;

  const showSearchRef = useRef(showSearch);
  showSearchRef.current = showSearch;

  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;

  // Unified global back handler for Android Hardware Back, Popstate, and UI Back
  const handleGlobalBack = () => {
    const now = Date.now();
    // Debounce rapid repeated back triggers (e.g. within 280ms)
    if (now - lastBackActionTimestampRef.current < 280) {
      return;
    }
    lastBackActionTimestampRef.current = now;

    // 1. If Code Export Modal is open -> close it
    if (showAndroidCodeRef.current) {
      setShowAndroidCode(false);
      return;
    }

    // 2. If Search Overlay is open -> close it
    if (showSearchRef.current) {
      setShowSearch(false);
      return;
    }

    // 3. Dispatch 'app:android-back' event to let active sub-screens (e.g. Note Editor) dismiss open sub-modals
    const backEvt = new CustomEvent('app:android-back', { cancelable: true });
    const notCanceled = window.dispatchEvent(backEvt);
    if (!notCanceled) {
      // A sub-modal inside NoteEditor intercepted and handled the back event
      return;
    }

    // 4. Handle App-level screen navigation
    const current = activeScreenRef.current;
    if (current === 'recently-deleted') {
      navigateToScreen('settings');
      return;
    }
    
    if (current === 'editor' || current === 'calendar' || current === 'settings') {
      navigateToScreen('home', null);
      return;
    }

    // 5. Already on home screen: Native Android "Double Back to Exit" pattern
    if (current === 'home') {
      const elapsedSinceFirstExitTap = now - lastExitPressTimeRef.current;
      if (elapsedSinceFirstExitTap < 2200 && elapsedSinceFirstExitTap > 100) {
        // Second press within 2.2 seconds -> Exit app cleanly
        try {
          CapApp.exitApp();
        } catch {
          // web browser fallback
        }
      } else {
        // First press on home screen -> Show toast reminder
        lastExitPressTimeRef.current = now;
        setShowExitToast(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2200);
      }
    }
  };

  // Sync Android Hardware Back Button (@capacitor/app & cordova) + Browser Popstate
  useEffect(() => {
    let capListener: any = null;

    // 1. Capacitor Native Android Back Button Listener
    const registerCapacitorBack = async () => {
      try {
        capListener = await CapApp.addListener('backButton', () => {
          handleGlobalBack();
        });
      } catch {
        // Running in standard browser
      }
    };

    registerCapacitorBack();

    // 2. Standard Cordova / Android WebView backbutton event
    const handleCordovaBack = (e: Event) => {
      e.preventDefault();
      handleGlobalBack();
    };
    document.addEventListener('backbutton', handleCordovaBack);

    // 3. Browser History PopState (only sync if not already handled)
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (showAndroidCodeRef.current || showSearchRef.current) {
        handleGlobalBack();
        return;
      }
      if (state && state.screen) {
        setActiveScreen(state.screen);
        if (state.screen !== 'editor') {
          setSelectedEntry(null);
        }
      } else {
        if (activeScreenRef.current !== 'home') {
          setActiveScreen('home');
          setSelectedEntry(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (capListener && typeof capListener.remove === 'function') {
        capListener.remove();
      }
      document.removeEventListener('backbutton', handleCordovaBack);
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, []);

  // Navigation helpers with History API pushState
  const navigateToScreen = (screen: 'home' | 'editor' | 'calendar' | 'settings' | 'recently-deleted', entry?: JournalEntry | null) => {
    setActiveScreen(screen);
    if (entry !== undefined) {
      setSelectedEntry(entry);
    }
    try {
      window.history.pushState({ screen, entryId: entry?.id }, '');
    } catch {
      // ignore
    }
  };

  const navigateBack = () => {
    handleGlobalBack();
  };

  const handleChangeTheme = (newTheme: AppTheme) => {
    setCurrentTheme(newTheme);
    setStoredTheme(newTheme);
    applyThemeToDom(newTheme, systemIsDark);
  };

  const handleChangeFont = (newFont: AppFont) => {
    setCurrentFont(newFont);
    setStoredFont(newFont);
    applyFontToDom(newFont);
  };

  const handleToggleDarkMode = () => {
    const nextTheme: AppTheme = effectiveDarkMode ? 'light' : 'dark';
    handleChangeTheme(nextTheme);
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    navigateToScreen('editor', entry);
  };

  const handleCreateNewEntry = (customDateStr?: string) => {
    const todayStr = customDateStr || new Date().toISOString().split('T')[0];
    const newEntry: JournalEntry = {
      id: `note-${Date.now()}`,
      title: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dateString: todayStr,
      pinned: false,
      blocks: [
        {
          id: `text-${Date.now()}`,
          type: 'text',
          content: '',
        },
      ],
    };

    navigateToScreen('editor', newEntry);
  };

  const handleSaveEntry = (updatedEntry: JournalEntry) => {
    const updatedList = saveSingleEntry(updatedEntry);
    setEntries(updatedList);
    setSelectedEntry(updatedEntry);
  };

  const handleDeleteEntry = (entryId: string) => {
    const updatedList = deleteStoredEntry(entryId);
    setEntries(updatedList);
    if (selectedEntry?.id === entryId) {
      navigateToScreen('home', null);
    }
  };

  const handleRestoreFromTrash = (restoredEntry: JournalEntry) => {
    const all = getStoredEntries();
    setEntries(all);
  };

  const handleNotesImported = () => {
    const all = getStoredEntries();
    setEntries(all);
    const theme = getStoredTheme();
    setCurrentTheme(theme);
    applyThemeToDom(theme, systemIsDark);
    const font = getStoredFont();
    setCurrentFont(font);
    applyFontToDom(font);
  };

  return (
    <DeviceFrame darkMode={effectiveDarkMode}>
      {activeScreen === 'home' && (
        <HomeScreen
          entries={entries}
          onSelectEntry={handleSelectEntry}
          onCreateNewEntry={() => handleCreateNewEntry()}
          onOpenCalendar={() => navigateToScreen('calendar')}
          onOpenSearch={() => {
            setShowSearch(true);
            try {
              window.history.pushState({ modal: 'search' }, '');
            } catch {}
          }}
          onOpenSettings={() => navigateToScreen('settings')}
          onDeleteEntry={handleDeleteEntry}
          darkMode={effectiveDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      )}

      {activeScreen === 'editor' && selectedEntry && (
        <NoteEditorScreen
          entry={selectedEntry}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onBack={navigateBack}
          darkMode={effectiveDarkMode}
        />
      )}

      {activeScreen === 'calendar' && (
        <CalendarScreen
          entries={entries}
          onSelectEntry={handleSelectEntry}
          onCreateEntryForDate={(dateStr) => handleCreateNewEntry(dateStr)}
          onBack={navigateBack}
          darkMode={effectiveDarkMode}
        />
      )}

      {activeScreen === 'settings' && (
        <SettingsScreen
          onBack={navigateBack}
          currentTheme={currentTheme}
          onChangeTheme={handleChangeTheme}
          currentFont={currentFont}
          onChangeFont={handleChangeFont}
          onOpenRecentlyDeleted={() => navigateToScreen('recently-deleted')}
          onNotesImported={handleNotesImported}
          onOpenAndroidCode={() => {
            setShowAndroidCode(true);
            try {
              window.history.pushState({ modal: 'android_export' }, '');
            } catch {}
          }}
        />
      )}

      {activeScreen === 'recently-deleted' && (
        <RecentlyDeletedScreen
          onBack={navigateBack}
          onRestoreEntry={handleRestoreFromTrash}
          darkMode={effectiveDarkMode}
        />
      )}

      {/* Modals */}
      {showSearch && (
        <SearchOverlay
          entries={entries}
          onClose={() => {
            setShowSearch(false);
          }}
          onSelectEntry={handleSelectEntry}
          darkMode={effectiveDarkMode}
        />
      )}

      {showAndroidCode && (
        <AndroidCodeExportModal onClose={() => setShowAndroidCode(false)} />
      )}

      {/* Android Toast for "Press back again to exit" */}
      {showExitToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-2 rounded-full bg-stone-900/90 dark:bg-stone-800/95 text-white text-xs font-semibold shadow-xl backdrop-blur-sm border border-stone-700/50 flex items-center gap-2">
            <span>Press back again to exit</span>
          </div>
        </div>
      )}
    </DeviceFrame>
  );
}

