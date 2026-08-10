import { JournalEntry } from '../types/journal';

const STORAGE_KEY_ENTRIES = 'bible_journal_entries_v2';
const STORAGE_KEY_THEME = 'bible_journal_theme_v1';
const STORAGE_KEY_TRANSLATION = 'bible_journal_translation_v1';

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

export function deleteStoredEntry(id: string): JournalEntry[] {
  const current = getStoredEntries();
  const updated = current.filter((e) => e.id !== id);
  saveStoredEntries(updated);
  return updated;
}

export type AppTheme = 'light' | 'dark' | 'sepia' | 'navy';

export function getStoredTheme(): AppTheme {
  return (localStorage.getItem(STORAGE_KEY_THEME) as AppTheme) || 'light';
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
