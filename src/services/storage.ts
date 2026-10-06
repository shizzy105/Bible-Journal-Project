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

// Helper to create inline interactive reference chips for starter entries
function createStarterRefChip(refText: string): string {
  const escaped = refText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span data-ref="${escaped}" style="touch-action: manipulation; -webkit-user-select: all; user-select: all; -webkit-touch-callout: none; pointer-events: auto; -webkit-tap-highlight-color: transparent; cursor: pointer;" class="ref-chip inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-red-100 dark:bg-red-950/90 border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-[0.88em] leading-normal cursor-pointer whitespace-nowrap active:scale-95 transition-transform"><span class="ref-click-btn inline align-baseline hover:underline" style="pointer-events: auto; -webkit-user-select: all; user-select: all;">${escaped}</span></span>`;
}

// Helper to create inline interactive Strong's chips for starter entries
function createStarterStrongsChip(strongsId: string): string {
  const escaped = strongsId.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span data-strongs="${escaped}" style="touch-action: manipulation; -webkit-user-select: all; user-select: all; -webkit-touch-callout: none; pointer-events: auto; -webkit-tap-highlight-color: transparent; cursor: pointer;" class="ref-chip inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-blue-100 dark:bg-blue-950/90 border border-blue-200/50 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold text-[0.88em] leading-normal cursor-pointer whitespace-nowrap active:scale-95 transition-transform"><span class="ref-click-btn inline align-baseline hover:underline" style="pointer-events: auto; -webkit-user-select: all; user-select: all;">${escaped}</span></span>`;
}

// Welcome starter entry explaining Asor Notes features (pinned for new installations)
const WELCOME_ENTRY: JournalEntry = {
  id: 'entry-welcome',
  title: 'Welcome to Asor Notes! 📖✨',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dateString: new Date().toISOString().split('T')[0],
  pinned: true,
  blocks: [
    {
      id: 'wb-1',
      type: 'text',
      content:
        '<div><strong>Welcome to Asor Notes!</strong> A personal, distraction-free sanctuary designed for sermon notes, daily devotionals, Bible study, and spiritual reflections.</div><div><br></div><div>Here is a quick guide to help you get the most out of your journal:</div>',
    },
    {
      id: 'wb-2',
      type: 'text',
      content:
        '<div><strong>📖 1. Insert Interactive Scripture References</strong></div>' +
        '<div>Tap the <strong>+ Reference</strong> button (or book icon) in the bottom toolbar to insert any Scripture passage into your note, such as:</div>' +
        '<div><ul>' +
        '<li>A single verse: ' +
        createStarterRefChip('John 3:16') +
        '</li>' +
        '<li>A string of verses: ' +
        createStarterRefChip('Rom 12:1-2') +
        '</li>' +
        '<li>A full chapter: ' +
        createStarterRefChip('Psalm 23') +
        '</li>' +
        '</ul></div>' +
        '<div>Once inserted:</div>' +
        '<div><ul>' +
        '<li><strong>Tap any reference chip</strong> at any time to read the passage in a clean popup.</li>' +
        '<li><strong>Switch translations</strong> on the fly between KJV, NKJV, ESV, NIV, NLT, and Yoruba (Bíbélì Mímọ́).</li>' +
        '<li><strong>Examine Greek &amp; Hebrew roots</strong> directly with the integrated Strong\'s Concordance.</li>' +
        '</ul></div>',
    },
    {
      id: 'wb-3',
      type: 'text',
      content:
        '<div><strong>✍️ 2. Smart Formatting Shortcuts</strong></div>' +
        '<div><ul>' +
        '<li>Type <code>- </code> or <code>* </code> at the start of a line to automatically create a bullet list.</li>' +
        '<li>Type <code>---</code> on an empty line to insert a clean divider rule.</li>' +
        '<li>Format text with headings, bold, italics, underline, custom colors, highlights, and font sizes using the bottom toolbar.</li>' +
        '</ul></div>',
    },
    {
      id: 'wb-4',
      type: 'text',
      content:
        '<div><strong>🎨 3. Multi-Media Journal Blocks</strong></div>' +
        '<div>Enrich your study notes with different types of media:</div>' +
        '<div><ul>' +
        '<li>🎙️ <strong>Voice Recordings:</strong> Capture sermons or spoken reflections with built-in playback controls.</li>' +
        '<li>🎨 <strong>Sketches &amp; Drawings:</strong> Draw diagrams, mind maps, or handwritten prayer notes on the canvas.</li>' +
        '<li>📷 <strong>Photos &amp; Images:</strong> Insert sermon slides, book photos, or study materials.</li>' +
        '</ul></div>',
    },
    {
      id: 'wb-5',
      type: 'text',
      content:
        '<div><strong>🗓️ 4. Organization &amp; Calendar View</strong></div>' +
        '<div><ul>' +
        '<li><strong>Pin Notes:</strong> Tap the Pin icon to keep essential notes at the top (like this welcome note!).</li>' +
        '<li><strong>Calendar View:</strong> Tap the calendar icon in the header to review your spiritual walk day-by-day.</li>' +
        '<li><strong>Instant Search:</strong> Find any note, topic, or Bible reference in seconds using the search bar.</li>' +
        '</ul></div>',
    },
    {
      id: 'wb-6',
      type: 'text',
      content:
        '<div><strong>🔒 5. 100% Offline &amp; Private</strong></div>' +
        '<div>Your notes remain securely stored on your device with no accounts or internet required. You can export or backup your entire journal at any time in <strong>Settings</strong>.</div>' +
        '<div><br></div>' +
        '<div>🌐 <strong>Official Website:</strong> Visit <a href="https://asornotes.com" target="_blank" rel="noopener noreferrer" style="color: #ef4444; font-weight: 600; text-decoration: underline;">Asornotes.com</a> for tips, updates, and devotionals.</div>' +
        '<div><br></div>' +
        '<div><em>May your study time be blessed and fruitful!</em> 🙏</div>',
    },
  ],
};

// Shortcuts starter entry explaining all instant editor shortcuts (pinned for new installations)
const SHORTCUTS_ENTRY: JournalEntry = {
  id: 'entry-shortcuts',
  title: 'Editor & Keyboard Shortcuts ⚡📝',
  createdAt: new Date(Date.now() - 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1000).toISOString(),
  dateString: new Date().toISOString().split('T')[0],
  pinned: true,
  blocks: [
    {
      id: 'sc-1',
      type: 'text',
      content:
        '<div><strong>Speed up your note-taking with Asor Shortcuts!</strong> Whether you are in church listening to a fast-moving sermon, journaling in personal devotion, or studying scripture roots, these quick gestures and typing shortcuts will save you time.</div>',
    },
    {
      id: 'sc-2',
      type: 'text',
      content:
        '<div><strong>⚡ 1. Instant Scripture Pill Trigger (<code>//</code> or <code>..</code>)</strong></div>' +
        '<div>Type a citation followed immediately by double slash <code>//</code> or double period <code>..</code> to convert it into an interactive pill in real time:</div>' +
        '<div><ul>' +
        '<li>Type <code>John 3:16//</code> ➔ ' + createStarterRefChip('John 3:16') + '</li>' +
        '<li>Type <code>Rom 8:28-30..</code> ➔ ' + createStarterRefChip('Rom 8:28-30') + '</li>' +
        '<li>Type <code>Psalm 23//</code> ➔ ' + createStarterRefChip('Psalm 23') + '</li>' +
        '<li>Type <code>G2424//</code> (Strong’s for Jesus) ➔ ' + createStarterStrongsChip('G2424') + '</li>' +
        '<li>Type <code>H1234..</code> ➔ ' + createStarterStrongsChip('H1234') + '</li>' +
        '</ul></div>' +
        '<div><em>The cursor automatically lands right after a space so you can keep typing without lifting your fingers!</em></div>',
    },
    {
      id: 'sc-3',
      type: 'text',
      content:
        '<div><strong>🧹 2. 1-Tap Pill Deletion</strong></div>' +
        '<div><ul>' +
        '<li>Press <strong>Backspace</strong> once behind any Scripture pill or Strong’s badge to wipe out the whole pill instantly.</li>' +
        '<li>No awkward broken characters, no lingering brackets, and your mobile keyboard remains open.</li>' +
        '</ul></div>',
    },
    {
      id: 'sc-4',
      type: 'text',
      content:
        '<div><strong>📋 3. Quick Markdown Formatting</strong></div>' +
        '<div><ul>' +
        '<li><strong>Bullet List:</strong> Type <code>- </code> or <code>* </code> at the start of a line to begin an unordered list. Press Enter on an empty bullet to exit the list.</li>' +
        '<li><strong>Horizontal Divider:</strong> Type <code>---</code> (three hyphens) on any line to instantly insert a sleek horizontal divider rule.</li>' +
        '</ul></div>',
    },
    {
      id: 'sc-5',
      type: 'text',
      content:
        '<div><strong>📅 4. Beautiful Custom Date Selector</strong></div>' +
        '<div><ul>' +
        '<li>Tap the <strong>Date pill</strong> at the top left of the note editor to open the custom calendar selector.</li>' +
        '<li>Tap <strong>Today</strong> or <strong>Yesterday</strong> for fast 1-tap logging.</li>' +
        '<li>Tap the <strong>Month &amp; Year header</strong> to quickly jump across years (1960–2045) and months in a single tap.</li>' +
        '</ul></div>',
    },
    {
      id: 'sc-6',
      type: 'text',
      content:
        '<div><strong>⌨️ 5. Desktop &amp; External Keyboard Hotkeys</strong></div>' +
        '<div>If you use an external keyboard or tablet:</div>' +
        '<div><ul>' +
        '<li><strong>Ctrl + Z / ⌘ + Z:</strong> Undo last action</li>' +
        '<li><strong>Ctrl + Y / ⌘ + Y (or Ctrl+Shift+Z):</strong> Redo action</li>' +
        '<li><strong>Ctrl + A / ⌘ + A:</strong> Select all note blocks (reveals batch Copy, Cut, and Delete bar)</li>' +
        '<li><strong>Escape:</strong> Close popups, modals, and deselect all blocks</li>' +
        '</ul></div>',
    },
    {
      id: 'sc-7',
      type: 'text',
      content:
        '<div><strong>💡 Try it right here!</strong></div>' +
        '<div>Tap below this line and type <code>Heb 11:1//</code> or <code>- Faith is...</code> to see the shortcuts in action:</div>' +
        '<div><br></div>',
    },
  ],
};

// Settings & Customization starter entry explaining all options in settings (pinned for new installations)
const SETTINGS_GUIDE_ENTRY: JournalEntry = {
  id: 'entry-settings-guide',
  title: 'Settings & Customization Guide ⚙️🛠️',
  createdAt: new Date(Date.now() - 2000).toISOString(),
  updatedAt: new Date(Date.now() - 2000).toISOString(),
  dateString: new Date().toISOString().split('T')[0],
  pinned: true,
  blocks: [
    {
      id: 'sg-1',
      type: 'text',
      content:
        '<div><strong>Personalize your study experience!</strong> Tap the <strong>⚙️ Settings</strong> icon in the top header at any time to tailor Asor Notes to your preferences. Everything operates 100% locally on your device with complete offline privacy.</div><div><br></div><div>Here is a quick walkthrough of every setting option:</div>',
    },
    {
      id: 'sg-2',
      type: 'text',
      content:
        '<div><strong>🎨 1. Theme &amp; Appearance</strong></div>' +
        '<div>Switch your reading atmosphere to match your environment:</div>' +
        '<div><ul>' +
        '<li><strong>☀️ Light Mode:</strong> Warm, classic parchment and paper aesthetic with crisp contrast.</li>' +
        '<li><strong>🌙 Dark Mode:</strong> Gentle dark tones for evening study without eye fatigue.</li>' +
        '<li><strong>🖤 Pure Black (OLED):</strong> True pitch-black pixels for maximum contrast and battery efficiency on OLED screens.</li>' +
        '<li><strong>🌌 Navy Theme:</strong> A calming midnight blue sanctuary palette.</li>' +
        '<li><strong>📱 System Default:</strong> Automatically syncs with your operating system theme.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-3',
      type: 'text',
      content:
        '<div><strong>📖 2. Bible Translations &amp; Offline Storage</strong></div>' +
        '<div><ul>' +
        '<li><strong>Default Translation:</strong> Choose which version opens first when tapping a scripture pill (KJV, Strong\'s Concordance, Yoruba Bíbélì Mímọ́, NKJV, ESV, WEB, NIV, or NLT).</li>' +
        '<li><strong>Offline Bible Pre-Caching:</strong> Pre-load full Bible translations onto your device with one tap. Access every chapter and verse offline anywhere—in churches with spotty reception, on flights, or on retreats.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-4',
      type: 'text',
      content:
        '<div><strong>🔤 3. App Font &amp; Typography</strong></div>' +
        '<div>Choose a typeface designed for comfort and focus:</div>' +
        '<div><ul>' +
        '<li><strong>Original Default:</strong> Modern clean interface paired with classic book serif text.</li>' +
        '<li><strong>Literata Serif:</strong> Majestic literary serif designed specifically for scriptures.</li>' +
        '<li><strong>Crimson Pro:</strong> Theological book elegance for classic devotionals.</li>' +
        '<li><strong>Nunito Rounded:</strong> Soft, friendly, and calm devotional reading atmosphere.</li>' +
        '<li><strong>Roboto Slab:</strong> Bold, structured, contemporary study layout.</li>' +
        '<li><strong>Caveat Journal:</strong> Warm, organic, handwritten reflection style.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-5',
      type: 'text',
      content:
        '<div><strong>🏷️ 4. Scripture Tag Format</strong></div>' +
        '<div>Customize how scripture citations look in your notes:</div>' +
        '<div><ul>' +
        '<li><strong>Pill Badge with Translation:</strong> Shows full book, verse, and version tag (e.g., [John 3:16 · KJV]).</li>' +
        '<li><strong>Minimalist Pill:</strong> Clean, compact pill badge displaying just the citation (e.g., [John 3:16]).</li>' +
        '<li><strong>Raw Text:</strong> Retains references as standard inline text.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-6',
      type: 'text',
      content:
        '<div><strong>💾 5. Backup, Export &amp; Import (100% Offline &amp; Private)</strong></div>' +
        '<div>Take total control of your study records:</div>' +
        '<div><ul>' +
        '<li><strong>Full ZIP Archive:</strong> Exports all your notes, audio recordings, canvas drawings, and photos in a single portable ZIP package.</li>' +
        '<li><strong>JSON Backup:</strong> Lightweight file backup for quick transfer.</li>' +
        '<li><strong>Restore &amp; Merge:</strong> Move notes to a new phone, tablet, or browser without losing or overwriting existing entries.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-7',
      type: 'text',
      content:
        '<div><strong>🗑️ 6. Trash &amp; 30-Day Recovery</strong></div>' +
        '<div><ul>' +
        '<li>Deleted notes are safely held in <strong>Recently Deleted</strong> for 30 days before permanent erasure.</li>' +
        '<li>Restore accidentally deleted sermon notes with a single tap, or empty the trash whenever you choose.</li>' +
        '</ul></div>',
    },
    {
      id: 'sg-8',
      type: 'text',
      content:
        '<div><strong>ℹ️ 7. Privacy, Credits &amp; Official Website</strong></div>' +
        '<div><ul>' +
        '<li><strong>Privacy Guarantee:</strong> Zero accounts, zero ads, zero telemetry. Your notes never leave your personal device.</li>' +
        '<li><strong>Official Website:</strong> Visit <a href="https://asornotes.com" target="_blank" rel="noopener noreferrer" style="color: #ef4444; font-weight: 600; text-decoration: underline;">Asornotes.com</a> for updates, new features, and user guides.</li>' +
        '</ul></div>',
    },
  ],
};

// Sample starter entries demonstrating all features
const STARTER_ENTRIES: JournalEntry[] = [
  WELCOME_ENTRY,
  SHORTCUTS_ENTRY,
  SETTINGS_GUIDE_ENTRY,
  {
    id: 'entry-sample-1',
    title: 'Sermon Notes: The Power of Mercy',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // Yesterday
    updatedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    dateString: new Date(Date.now() - 3600000 * 24 * 1).toISOString().split('T')[0],
    pinned: false,
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
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    dateString: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
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
      // If user has the sample starter dataset or is missing Welcome, Shortcuts, or Settings guides, ensure they are present
      if (inMemoryEntries && Array.isArray(inMemoryEntries)) {
        const welcomeIdx = inMemoryEntries.findIndex((e) => e.id === 'entry-welcome');
        const shortcutsIdx = inMemoryEntries.findIndex((e) => e.id === 'entry-shortcuts');
        const settingsIdx = inMemoryEntries.findIndex((e) => e.id === 'entry-settings-guide');
        let shouldSave = false;

        // Ensure Welcome entry contains Asornotes.com
        if (welcomeIdx !== -1) {
          const welcome = inMemoryEntries[welcomeIdx];
          const hasWebUrl = welcome.blocks?.some((b) => b.type === 'text' && 'content' in b && (b.content as string)?.includes('Asornotes.com'));
          if (!hasWebUrl) {
            inMemoryEntries[welcomeIdx] = WELCOME_ENTRY;
            shouldSave = true;
          }
        }

        if (shortcutsIdx === -1) {
          if (welcomeIdx !== -1) {
            inMemoryEntries.splice(welcomeIdx + 1, 0, SHORTCUTS_ENTRY);
          } else {
            inMemoryEntries = [SHORTCUTS_ENTRY, ...inMemoryEntries];
          }
          shouldSave = true;
        }

        if (settingsIdx === -1) {
          const insertPos = inMemoryEntries.findIndex((e) => e.id === 'entry-shortcuts');
          if (insertPos !== -1) {
            inMemoryEntries.splice(insertPos + 1, 0, SETTINGS_GUIDE_ENTRY);
          } else if (welcomeIdx !== -1) {
            inMemoryEntries.splice(welcomeIdx + 1, 0, SETTINGS_GUIDE_ENTRY);
          } else {
            inMemoryEntries = [SETTINGS_GUIDE_ENTRY, ...inMemoryEntries];
          }
          shouldSave = true;
        }

        if (welcomeIdx === -1 && inMemoryEntries.some((e) => e.id.startsWith('entry-sample-'))) {
          inMemoryEntries = [WELCOME_ENTRY, ...inMemoryEntries];
          shouldSave = true;
        }

        if (shouldSave) {
          saveStoredEntries(inMemoryEntries);
        }
      }
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
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'long';
  try {
    const val = localStorage.getItem(STORAGE_KEY_REF_FORMAT);
    return val === 'short' ? 'short' : 'long';
  } catch {
    return 'long';
  }
}

export function setStoredRefFormat(format: RefFormat): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_REF_FORMAT, format);
  } catch {
    // ignore
  }
}

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'sepia') {
      // Seamlessly migrate legacy sepia preference to pure black
      return 'black';
    }
    if (saved && ['system', 'light', 'dark', 'black', 'navy'].includes(saved)) {
      return saved as AppTheme;
    }
  } catch {
    // ignore
  }
  // Default to system auto
  return 'system';
}

export function setStoredTheme(theme: AppTheme): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch {
    // ignore
  }
}

export function getStoredTranslation(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'KJV_STRONGS';
  try {
    return localStorage.getItem(STORAGE_KEY_TRANSLATION) || 'KJV_STRONGS';
  } catch {
    return 'KJV_STRONGS';
  }
}

export function setStoredTranslation(trans: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TRANSLATION, trans);
  } catch {
    // ignore
  }
}

const STORAGE_KEY_DOWNLOADED_TRANS = 'bible_journal_downloaded_translations_v2';
const STORAGE_KEY_ENABLED_VERSIONS = 'bible_journal_enabled_versions_v2';

export function getEnabledTranslations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENABLED_VERSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return ['KJV', 'KJV_STRONGS']; // Only KJV and Concordance (KJV) are bundled by default
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure core bundled translations are always available offline
        if (!parsed.includes('KJV')) parsed.unshift('KJV');
        if (!parsed.includes('KJV_STRONGS')) parsed.push('KJV_STRONGS');
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return ['KJV', 'KJV_STRONGS']; // Only KJV and Concordance (KJV) are bundled by default
}

export function setDownloadedTranslations(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOWNLOADED_TRANS, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save downloaded translations:', err);
  }
}

const STORAGE_KEY_LAST_READ_BOOK = 'bible_journal_last_read_book_v1';
const STORAGE_KEY_LAST_READ_CHAPTER = 'bible_journal_last_read_chapter_v1';

export function getStoredBiblePosition(): { book: string; chapter: number } {
  try {
    const book = localStorage.getItem(STORAGE_KEY_LAST_READ_BOOK);
    const chapterRaw = localStorage.getItem(STORAGE_KEY_LAST_READ_CHAPTER);
    const chapter = chapterRaw ? parseInt(chapterRaw, 10) : 1;
    if (book) {
      return { book, chapter: Number.isNaN(chapter) || chapter < 1 ? 1 : chapter };
    }
  } catch {
    // fallback
  }
  return { book: 'Matthew', chapter: 5 };
}

export function setStoredBiblePosition(book: string, chapter: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_READ_BOOK, book);
    localStorage.setItem(STORAGE_KEY_LAST_READ_CHAPTER, chapter.toString());
  } catch (err) {
    console.warn('Failed to save last read Bible position:', err);
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
