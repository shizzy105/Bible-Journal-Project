import React, { useState, useEffect } from 'react';
import { JournalEntry } from './types/journal';
import {
  getStoredEntries,
  saveSingleEntry,
  deleteStoredEntry,
  getStoredTheme,
  setStoredTheme,
} from './services/storage';
import { DeviceFrame } from './components/DeviceFrame';
import { HomeScreen } from './components/HomeScreen';
import { NoteEditorScreen } from './components/NoteEditorScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { SearchOverlay } from './components/SearchOverlay';
import { AndroidCodeExportModal } from './components/AndroidCodeExportModal';
import { warmupOfflineBibleCache } from './data/bibleData';

export default function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeScreen, setActiveScreen] = useState<'home' | 'editor' | 'calendar'>('home');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showAndroidCode, setShowAndroidCode] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Load entries, theme, and pre-warm Bible cache on mount
  useEffect(() => {
    const loadedEntries = getStoredEntries();
    setEntries(loadedEntries);

    const savedTheme = getStoredTheme();
    setDarkMode(savedTheme === 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Warm up offline Bible cache in background
    warmupOfflineBibleCache();
  }, []);

  const handleToggleDarkMode = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    setStoredTheme(nextTheme ? 'dark' : 'light');
    if (nextTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setActiveScreen('editor');
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

    setSelectedEntry(newEntry);
    setActiveScreen('editor');
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
      setSelectedEntry(null);
      setActiveScreen('home');
    }
  };

  return (
    <DeviceFrame darkMode={darkMode}>
      {activeScreen === 'home' && (
        <HomeScreen
          entries={entries}
          onSelectEntry={handleSelectEntry}
          onCreateNewEntry={() => handleCreateNewEntry()}
          onOpenCalendar={() => setActiveScreen('calendar')}
          onOpenSearch={() => setShowSearch(true)}
          onOpenAndroidCode={() => setShowAndroidCode(true)}
          onDeleteEntry={handleDeleteEntry}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      )}

      {activeScreen === 'editor' && selectedEntry && (
        <NoteEditorScreen
          entry={selectedEntry}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onBack={() => setActiveScreen('home')}
          darkMode={darkMode}
        />
      )}

      {activeScreen === 'calendar' && (
        <CalendarScreen
          entries={entries}
          onSelectEntry={handleSelectEntry}
          onCreateEntryForDate={(dateStr) => handleCreateNewEntry(dateStr)}
          onBack={() => setActiveScreen('home')}
          darkMode={darkMode}
        />
      )}

      {/* Modals */}
      {showSearch && (
        <SearchOverlay
          entries={entries}
          onClose={() => setShowSearch(false)}
          onSelectEntry={handleSelectEntry}
          darkMode={darkMode}
        />
      )}

      {showAndroidCode && (
        <AndroidCodeExportModal onClose={() => setShowAndroidCode(false)} />
      )}
    </DeviceFrame>
  );
}
