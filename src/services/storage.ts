import { JournalEntry } from '../types/journal';

const STORAGE_KEY_ENTRIES = 'bible_journal_entries_v2';
const STORAGE_KEY_THEME = 'bible_journal_theme_v1';
const STORAGE_KEY_TRANSLATION = 'bible_journal_translation_v1';

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
        audioUrl: '', // Will play synthetic voice note demo or real recording
        durationSeconds: 28,
        title: 'Faith & Hope Reflection.m4a',
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

export function getStoredEntries(): JournalEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!data) {
      // First time initialization with starter entries
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(STARTER_ENTRIES));
      return STARTER_ENTRIES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse stored entries:', err);
    return STARTER_ENTRIES;
  }
}

export function saveStoredEntries(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save entries to storage:', err);
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

export function getStoredTheme(): 'light' | 'dark' {
  return (localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark') || 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

export function getStoredTranslation(): string {
  return localStorage.getItem(STORAGE_KEY_TRANSLATION) || 'WEB';
}

export function setStoredTranslation(trans: string): void {
  localStorage.setItem(STORAGE_KEY_TRANSLATION, trans);
}
