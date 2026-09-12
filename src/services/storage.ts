import { JournalEntry, DeletedJournalEntry, AppFont, BackupData } from '../types/journal';

const STORAGE_KEY_ENTRIES = 'bible_journal_entries_v2';
const STORAGE_KEY_THEME = 'bible_journal_theme_v1';
const STORAGE_KEY_TRANSLATION = 'bible_journal_translation_v1';
const STORAGE_KEY_RECENTLY_DELETED = 'bible_journal_recently_deleted_v2';
const STORAGE_KEY_APP_FONT = 'bible_journal_app_font_v1';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days in milliseconds

const DB_NAME = 'BibleJournalDB_v2';
const DB_STORE = 'journal_entries';

// Dynamic 1-second 440Hz chime WAV data URL helper for starter voice notes
function createSampleWavDataUrl(): string {
  try {
    const sampleRate = 8000;
    const duration = 1;
    const numSamples = sampleRate * duration;
    const headerSize = 44;
    const buffer = new Uint8Array(headerSize + numSamples);
    const view = new DataView(buffer.buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-3 * t);
      buffer[headerSize + i] = Math.floor((sample + 1) * 127.5);
    }

    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch {
    return '';
  }
}

// Sample starter entries demonstrating all features
const STARTER_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-sample-1',
    title: 'Sermon Notes: The Power of Mercy',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    dateString: new Date(Date.now() - 3600000 * 24 * 1).toISOString().split('T')[0],
    pinned: true,
    blocks: [
      {
        id: 'b1',
        type: 'text',
        content:
          'Today\'s sermon at church focused deeply on beatitudes and practicing active compassion. Matt 5 v 7 really stood out to me as a foundational life verse.',
      },
      {
        id: 'b3',
        type: 'text',
        content:
          'We also reflected on 1 Cor 13:4-7 regarding how patience and kindness form the bedrock of genuine love. Key takeaway: Choose grace over judgment every single day.',
      },
    ],
  },
  {
    id: 'entry-sample-2',
    title: 'Morning Devotional & Prayer Sketch',
    createdAt: new Date().toISOString(), // Today
    updatedAt: new Date().toISOString(),
    dateString: new Date().toISOString().split('T')[0],
    pinned: false,
    blocks: [
      {
        id: 'b4',
        type: 'text',
        content:
          'Meditated on Psalm 23 during early prayer. The LORD is my shepherd; I shall not want. He leadeth me beside the still waters. Read Ps 23:1-6 for peace.',
      },
      {
        id: 'b5',
        type: 'drawing',
        dataUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120"><rect width="100%" height="100%" fill="%23fff7ed"/><path d="M 30 90 Q 90 20 150 90 T 270 90" fill="none" stroke="%23dc2626" stroke-width="4"/><circle cx="150" cy="45" r="15" fill="%23f59e0b"/><text x="110" y="110" font-family="sans-serif" font-size="12" fill="%2378350f">Still Waters &amp; Sunrise</text></svg>',
        width: 300,
        height: 120,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'b6',
        type: 'text',
        content: 'Remember to check John 3:16 and Rom 8:28 before evening group study.',
      },
    ],
  },
  {
    id: 'entry-sample-3',
    title: 'Voice Reflection on Faith & Hope',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    dateString: new Date(Date.now() - 3600000 * 24 * 3).toISOString().split('T')[0],
    pinned: false,
    blocks: [
      {
        id: 'b7',
        type: 'text',
        content: 'Recorded a brief audio journal after studying Phil 4:13 in the evening.',
      },
      {
        id: 'b8',
        type: 'voice',
        audioUrl: createSampleWavDataUrl(),
        durationSeconds: 1,
        title: 'Faith & Hope Reflection.wav',
        createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      },
      {
        id: 'b9',
        type: 'text',
        content: 'I can do all things through Christ who strengthens me. Amen!',
      },
    ],
  },
];

// IndexedDB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory entries cache for instant UI rendering
let inMemoryEntries: JournalEntry[] | null = null;

export function getStoredEntries(): JournalEntry[] {
  if (inMemoryEntries) {
    return inMemoryEntries;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (data) {
      inMemoryEntries = JSON.parse(data);
      // Background async sync with IndexedDB to load full audio if truncated in localStorage
      loadEntriesFromIndexedDB();
      return inMemoryEntries!;
    }
  } catch (err) {
    console.error('Failed to parse stored entries:', err);
  }

  inMemoryEntries = STARTER_ENTRIES;
  saveStoredEntries(inMemoryEntries);
  return inMemoryEntries;
}

async function loadEntriesFromIndexedDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const dbEntries = request.result as JournalEntry[];
      if (dbEntries && dbEntries.length > 0) {
        inMemoryEntries = dbEntries;
      }
    };
  } catch (_) {}
}

export function saveStoredEntries(entries: JournalEntry[]): void {
  inMemoryEntries = entries;

  // 1. Save to IndexedDB (unlimited quota for audio & images)
  openDB().then((db) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.clear();
    entries.forEach((e) => store.put(e));
  }).catch((err) => {
    console.warn('IndexedDB save warning:', err);
  });

  // 2. Save to LocalStorage safely (prevent QuotaExceededError crashes)
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  } catch (err) {
    console.warn('LocalStorage limit reached. Full entry stored in IndexedDB:', err);
    try {
      // Stripping heavy base64 strings for localStorage fallback
      const lightweight = entries.map((e) => ({
        ...e,
        blocks: e.blocks.map((b) => {
          if (b.type === 'voice' && b.audioUrl && b.audioUrl.length > 10000) {
            return { ...b, audioUrl: '' };
          }
          return b;
        }),
      }));
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(lightweight));
    } catch (_) {
      // Ignore quota fallback error as IndexedDB holds full data
    }
  }
}

export function saveSingleEntry(entry: JournalEntry): JournalEntry[] {
  const current = getStoredEntries();
  const index = current.findIndex((e) => e.id === entry.id);

  let updated: JournalEntry[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    updated = [{ ...entry, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current];
  }

  saveStoredEntries(updated);
  return updated;
}

export function getRecentlyDeletedEntries(): DeletedJournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENTLY_DELETED);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeletedJournalEntry[];
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    // Filter out entries older than 30 days
    const valid = parsed.filter((item) => {
      const deletedTime = new Date(item.deletedAt).getTime();
      return !isNaN(deletedTime) && now - deletedTime <= RETENTION_MS;
    });

    // If auto-purged items were removed, save clean list back
    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_RECENTLY_DELETED, JSON.stringify(valid));
    }

    // Sort newest deleted first
    return valid.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } catch (err) {
    console.warn('Failed to load recently deleted entries:', err);
    return [];
  }
}

export function saveRecentlyDeletedEntries(list: DeletedJournalEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECENTLY_DELETED, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save recently deleted entries:', err);
  }
}

export function deleteStoredEntry(id: string): JournalEntry[] {
  const current = getStoredEntries();
  const entryToDelete = current.find((e) => e.id === id);

  if (entryToDelete) {
    // Add to recently deleted list
    const deletedList = getRecentlyDeletedEntries().filter((d) => d.entry.id !== id);
    const newDeletedRecord: DeletedJournalEntry = {
      entry: entryToDelete,
      deletedAt: new Date().toISOString(),
    };
    saveRecentlyDeletedEntries([newDeletedRecord, ...deletedList]);
  }

  const updated = current.filter((e) => e.id !== id);
  saveStoredEntries(updated);
  return updated;
}

export function restoreDeletedEntry(id: string): { active: JournalEntry[]; deleted: DeletedJournalEntry[] } {
  const deletedList = getRecentlyDeletedEntries();
  const targetRecord = deletedList.find((d) => d.entry.id === id);

  if (targetRecord) {
    // Save back to active entries
    const currentActive = getStoredEntries();
    const updatedActive = [
      { ...targetRecord.entry, updatedAt: new Date().toISOString() },
      ...currentActive.filter((e) => e.id !== id),
    ];
    saveStoredEntries(updatedActive);

    // Remove from deleted list
    const remainingDeleted = deletedList.filter((d) => d.entry.id !== id);
    saveRecentlyDeletedEntries(remainingDeleted);

    return { active: updatedActive, deleted: remainingDeleted };
  }

  return { active: getStoredEntries(), deleted: deletedList };
}

export function permanentlyDeleteEntry(id: string): DeletedJournalEntry[] {
  const deletedList = getRecentlyDeletedEntries();
  const remaining = deletedList.filter((d) => d.entry.id !== id);
  saveRecentlyDeletedEntries(remaining);
  return remaining;
}

export function emptyRecentlyDeleted(): void {
  saveRecentlyDeletedEntries([]);
}

export function getStoredFont(): AppFont {
  const val = localStorage.getItem(STORAGE_KEY_APP_FONT) as AppFont;
  const validFonts: AppFont[] = ['system', 'literata', 'crimson', 'nunito', 'slab', 'caveat'];
  return validFonts.includes(val) ? val : 'system';
}

export function setStoredFont(font: AppFont): void {
  try {
    localStorage.setItem(STORAGE_KEY_APP_FONT, font);
  } catch (err) {
    console.warn('Failed to save font preference:', err);
  }
}

export type AppTheme = 'system' | 'light' | 'dark' | 'black' | 'navy';
export type RefFormat = 'long' | 'short';

const STORAGE_KEY_REF_FORMAT = 'bible_journal_ref_format_v1';

export function getStoredRefFormat(): RefFormat {
  const val = localStorage.getItem(STORAGE_KEY_REF_FORMAT);
  return val === 'short' ? 'short' : 'long';
}

export function setStoredRefFormat(format: RefFormat): void {
  localStorage.setItem(STORAGE_KEY_REF_FORMAT, format);
}

export function getStoredTheme(): AppTheme {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved === 'sepia') {
    // Seamlessly migrate legacy sepia preference to pure black
    return 'black';
  }
  if (saved && ['system', 'light', 'dark', 'black', 'navy'].includes(saved)) {
    return saved as AppTheme;
  }
  // Default to system auto
  return 'system';
}

export function setStoredTheme(theme: AppTheme): void {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

export function getStoredTranslation(): string {
  return localStorage.getItem(STORAGE_KEY_TRANSLATION) || 'NKJV';
}

export function setStoredTranslation(trans: string): void {
  localStorage.setItem(STORAGE_KEY_TRANSLATION, trans);
}

const STORAGE_KEY_DOWNLOADED_TRANS = 'bible_journal_downloaded_translations_v1';
const STORAGE_KEY_ENABLED_VERSIONS = 'bible_journal_enabled_versions_v1';

export function getEnabledTranslations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENABLED_VERSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return ['KJV']; // KJV is ON by default
}

export function setEnabledTranslations(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED_VERSIONS, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save enabled versions:', err);
  }
}

export function getDownloadedTranslations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOWNLOADED_TRANS);
    return raw ? JSON.parse(raw) : ['KJV', 'WEB', 'NKJV'];
  } catch {
    return ['KJV', 'WEB', 'NKJV'];
  }
}

export function setDownloadedTranslations(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOWNLOADED_TRANS, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save downloaded translations:', err);
  }
}

// ----------------------------------------------------
// BACKUP, EXPORT & IMPORT (Device Migration & Sync)
// ----------------------------------------------------

export async function createFullBackupData(): Promise<BackupData> {
  // Ensure we get fresh data from IndexedDB in case voice notes or heavy sketches were stored there
  let currentEntries = getStoredEntries();
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const request = store.getAll();
    const dbEntries = await new Promise<JournalEntry[]>((resolve) => {
      request.onsuccess = () => resolve(request.result as JournalEntry[]);
      request.onerror = () => resolve(currentEntries);
    });
    if (dbEntries && dbEntries.length > 0) {
      currentEntries = dbEntries;
    }
  } catch (_) {
    // fallback to memory/localStorage
  }

  const deletedEntries = getRecentlyDeletedEntries();
  let totalVoiceNotes = 0;
  let totalDrawings = 0;
  let totalImages = 0;

  currentEntries.forEach((entry) => {
    entry.blocks.forEach((b) => {
      if (b.type === 'voice') totalVoiceNotes++;
      if (b.type === 'drawing') totalDrawings++;
      if (b.type === 'image') totalImages++;
    });
  });

  const backup: BackupData = {
    version: '2.0',
    app: 'AsorNotes',
    exportedAt: new Date().toISOString(),
    entries: currentEntries,
    recentlyDeleted: deletedEntries,
    preferences: {
      theme: getStoredTheme(),
      appFont: getStoredFont(),
      refFormat: getStoredRefFormat(),
      translation: getStoredTranslation(),
      enabledVersions: getEnabledTranslations(),
    },
    metadata: {
      totalNotes: currentEntries.length,
      totalVoiceNotes,
      totalDrawings,
    },
  };

  return backup;
}

export function downloadBackupFile(backup: BackupData): string {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `asor_notes_backup_${dateStr}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  backup?: BackupData;
  stats?: {
    notesCount: number;
    voiceCount: number;
    drawingCount: number;
    imageCount?: number;
    deletedCount: number;
    date: string;
    version: string;
  };
}

export function validateBackupJson(rawInput: string | any): BackupValidationResult {
  try {
    let parsed: any;
    if (typeof rawInput === 'string') {
      parsed = JSON.parse(rawInput.trim());
    } else {
      parsed = rawInput;
    }

    if (!parsed) {
      return { valid: false, error: 'Backup file is empty or invalid JSON.' };
    }

    let entries: JournalEntry[] = [];
    let recentlyDeleted: DeletedJournalEntry[] = [];
    let preferences: BackupData['preferences'] = undefined;
    let exportedAt = new Date().toISOString();
    let version = '2.0';

    // Format 1: Standard structured BackupData { app, version, entries: [...] }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
      entries = parsed.entries;
      if (Array.isArray(parsed.recentlyDeleted)) {
        recentlyDeleted = parsed.recentlyDeleted;
      }
      if (parsed.preferences && typeof parsed.preferences === 'object') {
        preferences = parsed.preferences;
      }
      if (parsed.exportedAt) exportedAt = parsed.exportedAt;
      if (parsed.version) version = parsed.version;
    }
    // Format 2: Direct array of JournalEntry[] (raw export)
    else if (Array.isArray(parsed)) {
      entries = parsed;
    } else {
      return {
        valid: false,
        error: 'Unrecognized format. Expected an Asor Notes backup or notes array.',
      };
    }

    // Validate entries structure
    const validEntries: JournalEntry[] = [];
    for (const e of entries) {
      if (e && typeof e === 'object' && typeof e.id === 'string' && Array.isArray(e.blocks)) {
        validEntries.push({
          id: e.id,
          title: typeof e.title === 'string' ? e.title : 'Untitled Note',
          createdAt: e.createdAt || new Date().toISOString(),
          updatedAt: e.updatedAt || new Date().toISOString(),
          dateString: e.dateString || new Date().toISOString().split('T')[0],
          blocks: e.blocks,
          pinned: !!e.pinned,
          colorTag: e.colorTag,
        });
      }
    }

    if (validEntries.length === 0 && recentlyDeleted.length === 0) {
      return {
        valid: false,
        error: 'No valid journal notes found in this backup file.',
      };
    }

    let voiceCount = 0;
    let drawingCount = 0;
    let imageCount = 0;
    validEntries.forEach((entry) => {
      entry.blocks.forEach((b) => {
        if (b.type === 'voice') voiceCount++;
        if (b.type === 'drawing') drawingCount++;
        if (b.type === 'image') imageCount++;
      });
    });

    const structuredBackup: BackupData = {
      version,
      app: 'AsorNotes',
      exportedAt,
      entries: validEntries,
      recentlyDeleted,
      preferences,
      metadata: {
        totalNotes: validEntries.length,
        totalVoiceNotes: voiceCount,
        totalDrawings: drawingCount,
      },
    };

    return {
      valid: true,
      backup: structuredBackup,
      stats: {
        notesCount: validEntries.length,
        voiceCount,
        drawingCount,
        imageCount,
        deletedCount: recentlyDeleted.length,
        date: exportedAt,
        version,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `JSON parsing error: ${err?.message || 'Could not parse file'}`,
    };
  }
}

export interface ImportResult {
  success: boolean;
  mode: 'merge' | 'replace';
  importedCount: number;
  totalActiveCount: number;
  restoredPreferences: boolean;
}

export function applyImportedBackup(
  backup: BackupData,
  mode: 'merge' | 'replace',
  restorePreferences = false
): ImportResult {
  const current = getStoredEntries();
  let updatedEntries: JournalEntry[] = [];

  if (mode === 'replace') {
    updatedEntries = [...backup.entries];
  } else {
    // Mode 'merge': Preserve existing notes and add/update incoming notes
    const entryMap = new Map<string, JournalEntry>();
    // First, seed with current local notes
    current.forEach((e) => entryMap.set(e.id, e));

    // Next, merge incoming notes. If existing, pick the newer updated timestamp or incoming
    backup.entries.forEach((incoming) => {
      const existing = entryMap.get(incoming.id);
      if (!existing) {
        entryMap.set(incoming.id, incoming);
      } else {
        const incomingTime = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime();
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          entryMap.set(incoming.id, incoming);
        }
      }
    });

    updatedEntries = Array.from(entryMap.values());
  }

  // Sort: Pinned first, then newest updatedAt
  updatedEntries.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  // Save active entries to storage and IndexedDB
  saveStoredEntries(updatedEntries);

  // Handle recently deleted notes if in backup
  if (backup.recentlyDeleted && Array.isArray(backup.recentlyDeleted)) {
    if (mode === 'replace') {
      saveRecentlyDeletedEntries(backup.recentlyDeleted);
    } else {
      const currentTrash = getRecentlyDeletedEntries();
      const trashMap = new Map<string, DeletedJournalEntry>();
      currentTrash.forEach((d) => trashMap.set(d.entry.id, d));
      backup.recentlyDeleted.forEach((d) => trashMap.set(d.entry.id, d));
      saveRecentlyDeletedEntries(Array.from(trashMap.values()));
    }
  }

  // Handle Preferences if requested and present
  let preferencesApplied = false;
  if (restorePreferences && backup.preferences) {
    if (backup.preferences.theme) {
      setStoredTheme(backup.preferences.theme as AppTheme);
    }
    if (backup.preferences.appFont) {
      setStoredFont(backup.preferences.appFont as AppFont);
    }
    if (backup.preferences.refFormat) {
      setStoredRefFormat(backup.preferences.refFormat as RefFormat);
    }
    if (backup.preferences.translation) {
      setStoredTranslation(backup.preferences.translation);
    }
    if (backup.preferences.enabledVersions) {
      setEnabledTranslations(backup.preferences.enabledVersions);
    }
    preferencesApplied = true;
  }

  return {
    success: true,
    mode,
    importedCount: backup.entries.length,
    totalActiveCount: updatedEntries.length,
    restoredPreferences: preferencesApplied,
  };
}
