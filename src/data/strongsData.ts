import { StrongsEntry } from '../types/journal';

// Built-in synchronous seed dictionary for immediate validation & offline access
export const PRELOADED_STRONGS: Record<string, StrongsEntry> = {
  H799: {
    id: 'H799',
    language: 'Hebrew',
    number: 799,
    lemma: 'אֶשְׁדָּת',
    translit: 'ʼeshdâth',
    pron: "esh-dawth'",
    derivation: 'from H784 (אֵשׁ) and H1881 (דָּת);',
    strongs_def: 'a fire-law',
    kjv_def: 'fiery law.',
    kjv_usage: 'a fiery (1x).',
  },
  H79: {
    id: 'H79',
    language: 'Hebrew',
    number: 79,
    lemma: 'אָבַק',
    translit: 'ʼâbaq',
    pron: "aw-bak'",
    derivation: 'a primitive root, probably to float away (as vapor), but used only as denominative from H80 (אָבָק);',
    strongs_def: 'to bedust, i.e. grapple',
    kjv_def: 'wrestle.',
    kjv_usage: 'alone and there wrestled (1x), as he wrestled (1x).',
  },
  H867: {
    id: 'H867',
    language: 'Hebrew',
    number: 867,
    lemma: 'אֶתְנִי',
    translit: 'ʼEthnîy',
    pron: "eth-nee'",
    derivation: 'perhaps from H866 (אֶתְנָה); munificence;',
    strongs_def: 'Ethni, an Israelite',
    kjv_def: 'Ethni.',
    kjv_usage: 'Ethni (1x).',
  },
  H4709: {
    id: 'H4709',
    language: 'Hebrew',
    number: 4709,
    lemma: 'מִצְפָּה',
    translit: 'Mitspâh',
    pron: "mits-paw'",
    derivation: 'feminine of H4708 (מִצְפֶּה);',
    strongs_def: 'Mitspah, the name of two places in Palestine',
    kjv_def: "Mitspah. (This seems rather to be only an orthographic variation of H4708 (מִצְפֶּה) when 'in pause'.)",
    kjv_usage: 'Mizpah (18x), Mizpeh (14x).',
  },
  G353: {
    id: 'G353',
    language: 'Greek',
    number: 353,
    lemma: 'ἀναλαμβάνω',
    translit: 'analambánō',
    pron: "an-al-am-ban'-o",
    derivation: 'from G303 (ἀνά) and G2983 (λαμβάνω);',
    strongs_def: 'to take up',
    kjv_def: 'receive up, take (in, unto, up).',
    kjv_usage: 'take up (4x), receive up (3x), take (3x), take in (2x), take into (1x).',
  },
  G765: {
    id: 'G765',
    language: 'Greek',
    number: 765,
    lemma: 'ἀσεβής',
    translit: 'asebḗs',
    pron: "as-eb-ace'",
    derivation: 'from G1 (Α) (as a negative particle) and a presumed derivative of G4576 (σέβομαι);',
    strongs_def: 'irreverent, i.e. (by extension) impious or wicked',
    kjv_def: 'ungodly (man)',
    kjv_usage: 'ungodly (8x), ungodly men (1x).',
  },
  H1: {
    id: 'H1',
    language: 'Hebrew',
    number: 1,
    lemma: 'אָב',
    translit: 'ʼâb',
    pron: 'awb',
    derivation: 'a primitive word;',
    strongs_def: 'father, in a literal and immediate, or figurative and remote application',
    kjv_def: "chief, (fore-) father(-less), patrimony, principal. Compare names in 'Abi-'.",
    kjv_usage: 'father (1,205x), chief (2x), fatherless + H369 (2x), heritage (1x), patrimony (1x), principal (1x).',
  },
  H2: {
    id: 'H2',
    language: 'Aramaic',
    number: 2,
    lemma: 'אַב',
    translit: 'ʼab',
    pron: 'ab',
    derivation: 'corresponding to H1 (אָב);',
    strongs_def: 'father',
    kjv_def: 'father.',
    kjv_usage: 'father (9x).',
  },
  H1254: {
    id: 'H1254',
    language: 'Hebrew',
    number: 1254,
    lemma: 'בָּרָא',
    translit: 'bârâʼ',
    pron: 'baw-raw',
    derivation: 'a primitive root; to create (by forming from nothing)',
    strongs_def: 'to create (properly, shape; hence, form, fashion)',
    kjv_def: 'choose, create(-or), cut down, dispatch, done, make (fat).',
    kjv_usage: 'create (41x), creator (3x), choose (2x), make (2x), cut down (2x), dispatch (1x), done (1x), fat (1x).',
  },
  H7225: {
    id: 'H7225',
    language: 'Hebrew',
    number: 7225,
    lemma: 'רֵאשִׁית',
    translit: 'rêʼshîyth',
    pron: 'ray-sheeth',
    derivation: 'from the same as H7218 (רֹאשׁ); the first, in place, time, order or rank',
    strongs_def: 'the first, in place, time, order or rank (specifically, a firstfruit)',
    kjv_def: 'beginning, chief(-est), first(-fruits, part, time), principal thing.',
    kjv_usage: 'beginning (18x), firstfruits (11x), first (9x), chief (8x), misc (5x).',
  },
  G1: {
    id: 'G1',
    language: 'Greek',
    number: 1,
    lemma: 'Α',
    translit: 'A',
    pron: 'al-fah',
    derivation: 'of Hebrew origin; the first letter of the Greek alphabet;',
    strongs_def: 'Alpha (as an initial letter), denoting beginning, or (as a prefix) privation or union',
    kjv_def: 'Alpha.',
    kjv_usage: 'Alpha (4x).',
  },
  G26: {
    id: 'G26',
    language: 'Greek',
    number: 26,
    lemma: 'ἀγάπη',
    translit: 'agápē',
    pron: 'ag-ah-pay',
    derivation: 'from G25 (ἀγαπάω); love, i.e. affection or benevolence',
    strongs_def: 'love, i.e. affection or benevolence; specially (plural) a love-feast',
    kjv_def: '(feast of) charity(-ably), dear, love.',
    kjv_usage: 'love (86x), charity (27x), dear (1x), charitably (1x), feast of charity (1x).',
  },
  G3056: {
    id: 'G3056',
    language: 'Greek',
    number: 3056,
    lemma: 'λόγος',
    translit: 'lógos',
    pron: 'log-os',
    derivation: 'from G3004 (λέγω); something said (including the thought)',
    strongs_def: 'something said (including the thought); by implication, a topic, reason, or computation; specially, the Divine Expression (Christ)',
    kjv_def: 'account, cause, communication, doctrine, preaching, saying, speech, talk, thing, treatise, utterance, word, work.',
    kjv_usage: 'word (218x), saying (50x), account (8x), speech (8x), preaching (4x), treatise (1x), communication (1x).',
  },
  G4102: {
    id: 'G4102',
    language: 'Greek',
    number: 4102,
    lemma: 'πίστις',
    translit: 'pístis',
    pron: 'pis-tis',
    derivation: 'from G3982 (πείθω); persuasion, i.e. credence; moral conviction',
    strongs_def: 'persuasion, i.e. credence; moral conviction of religious truth; specially, reliance upon Christ for salvation',
    kjv_def: 'assurance, belief, believe, faith, fidelity.',
    kjv_usage: 'faith (239x), assurance (1x), believe (1x), believe + G1722 (1x), fidelity (1x).',
  },
};

// Global in-memory cache populated from fetched JSON
const strongsCache = new Map<string, StrongsEntry>(Object.entries(PRELOADED_STRONGS));

// Cache for the full loaded dictionary blobs
let hebrewDictionaryPromise: Promise<Record<string, any>> | null = null;
let greekDictionaryPromise: Promise<Record<string, any>> | null = null;
let hebrewDictionaryData: Record<string, any> | null = null;
let greekDictionaryData: Record<string, any> | null = null;

export const MAX_HEBREW_STRONGS = 8674;
export const MAX_GREEK_STRONGS = 5624;

/**
 * Parses user input to detect if it is a Strong's reference (e.g. H867, G765, h867, g765, H0867, Strong's H867).
 */
export function parseStrongsReference(query: string): {
  id: string;
  type: 'H' | 'G';
  number: number;
  isValidRange: boolean;
  maxAllowed: number;
} | null {
  if (!query || typeof query !== 'string') return null;
  const trimmed = query.trim();

  // Regex matches H867, G765, Strong's H867, Strongs G765, H 867, etc.
  const regex = /^(?:strong'?s?\s*)?([HhGg])\s*0*([1-9]\d{0,4})$/i;
  const match = trimmed.match(regex);

  if (!match) return null;

  const prefix = match[1].toUpperCase() as 'H' | 'G';
  const num = parseInt(match[2], 10);
  const normalizedId = `${prefix}${num}`;
  const maxAllowed = prefix === 'H' ? MAX_HEBREW_STRONGS : MAX_GREEK_STRONGS;
  const isValidRange = num >= 1 && num <= maxAllowed;

  return {
    id: normalizedId,
    type: prefix,
    number: num,
    isValidRange,
    maxAllowed,
  };
}

/**
 * Synchronous check to return entry if present in memory.
 * Checks both the preloaded/cached map and any fully loaded in-memory dictionaries.
 */
export function getStrongsEntrySync(id: string): StrongsEntry | null {
  const parsed = parseStrongsReference(id);
  if (!parsed || !parsed.isValidRange) return null;

  const normalized = parsed.id;
  const cached = strongsCache.get(normalized);
  if (cached) return cached;

  if (parsed.type === 'H' && hebrewDictionaryData) {
    const raw = hebrewDictionaryData[normalized];
    if (raw) {
      const entry: StrongsEntry = {
        id: normalized,
        language: raw.derivation?.toLowerCase().includes('aramaic') ? 'Aramaic' : 'Hebrew',
        number: parsed.number,
        lemma: raw.lemma || '',
        translit: raw.xlit || raw.translit || '',
        pron: raw.pron || '',
        derivation: raw.derivation || '',
        strongs_def: (raw.strongs_def || '').trim(),
        kjv_def: (raw.kjv_def || '').trim(),
        kjv_usage: (raw.kjv_usage || raw.kjv_def || '').trim(),
      };
      strongsCache.set(normalized, entry);
      return entry;
    }
  } else if (parsed.type === 'G' && greekDictionaryData) {
    const raw = greekDictionaryData[normalized];
    if (raw) {
      const entry: StrongsEntry = {
        id: normalized,
        language: 'Greek',
        number: parsed.number,
        lemma: raw.lemma || '',
        translit: raw.translit || raw.xlit || '',
        pron: raw.pron || '',
        derivation: raw.derivation || '',
        strongs_def: (raw.strongs_def || '').trim(),
        kjv_def: (raw.kjv_def || '').trim(),
        kjv_usage: (raw.kjv_usage || raw.kjv_def || '').trim(),
      };
      strongsCache.set(normalized, entry);
      return entry;
    }
  }

  return null;
}

/**
 * Loads the Hebrew dictionary JSON asynchronously with multi-tier fallback
 */
async function loadHebrewDictionary(): Promise<Record<string, any>> {
  if (hebrewDictionaryData) return hebrewDictionaryData;
  if (hebrewDictionaryPromise) return hebrewDictionaryPromise;
  hebrewDictionaryPromise = (async () => {
    // 1. Try bundled dynamic import via Vite
    try {
      const mod = await import('./strongs/hebrew.json');
      const data = (mod && (mod.default || mod)) as Record<string, any>;
      if (data && (data.H1 || data.H4709 || data.H867 || data.H799)) {
        hebrewDictionaryData = data;
        return data;
      }
    } catch {
      // continue to network fallback
    }

    // 2. Try root fetch
    try {
      const res = await fetch('/strongs/hebrew.json');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          hebrewDictionaryData = parsed;
          return parsed;
        }
      }
    } catch {
      // continue to relative fetch
    }

    // 3. Try relative fetch
    try {
      const res = await fetch('./strongs/hebrew.json');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          hebrewDictionaryData = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    // Reset promise so subsequent calls can retry instead of permanently returning empty
    hebrewDictionaryPromise = null;
    return {};
  })();
  return hebrewDictionaryPromise;
}

/**
 * Loads the Greek dictionary JSON asynchronously with multi-tier fallback
 */
async function loadGreekDictionary(): Promise<Record<string, any>> {
  if (greekDictionaryData) return greekDictionaryData;
  if (greekDictionaryPromise) return greekDictionaryPromise;
  greekDictionaryPromise = (async () => {
    // 1. Try bundled dynamic import via Vite
    try {
      const mod = await import('./strongs/greek.json');
      const data = (mod && (mod.default || mod)) as Record<string, any>;
      if (data && (data.G1 || data.G353 || data.G765)) {
        greekDictionaryData = data;
        return data;
      }
    } catch {
      // continue to network fallback
    }

    // 2. Try root fetch
    try {
      const res = await fetch('/strongs/greek.json');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          greekDictionaryData = parsed;
          return parsed;
        }
      }
    } catch {
      // continue to relative fetch
    }

    // 3. Try relative fetch
    try {
      const res = await fetch('./strongs/greek.json');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          greekDictionaryData = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    greekDictionaryPromise = null;
    return {};
  })();
  return greekDictionaryPromise;
}

// Background preload on startup so lookups are instantaneous
if (typeof window !== 'undefined') {
  setTimeout(() => {
    loadHebrewDictionary().catch(() => {});
    loadGreekDictionary().catch(() => {});
  }, 100);
}

/**
 * Fetches a Strong's entry asynchronously, caching it for subsequent calls.
 */
export async function fetchStrongsEntryAsync(id: string): Promise<StrongsEntry | null> {
  const parsed = parseStrongsReference(id);
  if (!parsed || !parsed.isValidRange) return null;

  const normalizedId = parsed.id;
  const cached = strongsCache.get(normalizedId);
  if (cached) return cached;

  try {
    if (parsed.type === 'H') {
      const dict = await loadHebrewDictionary();
      const raw = dict[normalizedId];
      if (raw) {
        const entry: StrongsEntry = {
          id: normalizedId,
          language: raw.derivation?.toLowerCase().includes('aramaic') ? 'Aramaic' : 'Hebrew',
          number: parsed.number,
          lemma: raw.lemma || '',
          translit: raw.xlit || raw.translit || '',
          pron: raw.pron || '',
          derivation: raw.derivation || '',
          strongs_def: (raw.strongs_def || '').trim(),
          kjv_def: (raw.kjv_def || '').trim(),
          kjv_usage: (raw.kjv_usage || raw.kjv_def || '').trim(),
        };
        strongsCache.set(normalizedId, entry);
        return entry;
      }
    } else {
      const dict = await loadGreekDictionary();
      const raw = dict[normalizedId];
      if (raw) {
        const entry: StrongsEntry = {
          id: normalizedId,
          language: 'Greek',
          number: parsed.number,
          lemma: raw.lemma || '',
          translit: raw.translit || raw.xlit || '',
          pron: raw.pron || '',
          derivation: raw.derivation || '',
          strongs_def: (raw.strongs_def || '').trim(),
          kjv_def: (raw.kjv_def || '').trim(),
          kjv_usage: (raw.kjv_usage || raw.kjv_def || '').trim(),
        };
        strongsCache.set(normalizedId, entry);
        return entry;
      }
    }
  } catch (err) {
    console.warn('Error fetching Strongs entry:', err);
  }

  // Fallback placeholder if not found in dictionary
  const fallback: StrongsEntry = {
    id: normalizedId,
    language: parsed.type === 'H' ? 'Hebrew' : 'Greek',
    number: parsed.number,
    lemma: parsed.type === 'H' ? 'עברית' : 'Ἑλληνικά',
    translit: normalizedId,
    strongs_def: `Strong's ${parsed.type === 'H' ? 'Hebrew' : 'Greek'} Dictionary entry for ${normalizedId}.`,
    kjv_def: '',
    kjv_usage: '',
  };
  return fallback;
}
