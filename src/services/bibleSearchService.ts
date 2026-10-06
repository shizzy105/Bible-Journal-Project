import { BIBLE_BOOKS, getBookNumber, loadBookData } from '../data/bibleData';

export interface BibleSearchResult {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  cleanText: string;
  matchedStrongsWord?: string;
  matchSnippet?: string;
}

export type SearchScope = 'ALL' | 'OT' | 'NT' | 'BOOK';

// In-memory cache for full translations (KJV, KJV_STRONGS, ESV, NKJV, WEB, NIV, NLT)
type FullBibleData = Record<string, Record<string, Record<string, string>>>;
const FULL_TRANSLATION_CACHE = new Map<string, FullBibleData>();
const PENDING_FULL_FETCHES = new Map<string, Promise<FullBibleData | null>>();

// In-memory cache for Strong's reverse occurrence indices
// Format: Record<strongsId, Array<[bookNum, chapterNum, verseNum, matchedWord]>>
type StrongsOccurrencesMap = Record<string, Array<[number, number, number, string]>>;
let GREEK_OCCURRENCES_INDEX: StrongsOccurrencesMap | null = null;
let HEBREW_OCCURRENCES_INDEX: StrongsOccurrencesMap | null = null;
let GREEK_INDEX_PROMISE: Promise<StrongsOccurrencesMap | null> | null = null;
let HEBREW_INDEX_PROMISE: Promise<StrongsOccurrencesMap | null> | null = null;

/**
 * Loads the full translation JSON into memory
 */
export async function loadFullTranslation(translation: string): Promise<FullBibleData | null> {
  const transKey = translation.toUpperCase();
  const bundledFull = ['KJV', 'KJV_STRONGS', 'ESV', 'NKJV', 'WEB', 'NIV', 'NLT', 'YOR'];
  if (!bundledFull.includes(transKey)) {
    return null;
  }

  const cached = FULL_TRANSLATION_CACHE.get(transKey);
  if (cached) return cached;

  const pending = PENDING_FULL_FETCHES.get(transKey);
  if (pending) return pending;

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/bible/${transKey}.json`);
      if (res.ok) {
        const data: FullBibleData = await res.json();
        FULL_TRANSLATION_CACHE.set(transKey, data);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  })();

  PENDING_FULL_FETCHES.set(transKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    PENDING_FULL_FETCHES.delete(transKey);
  }
}

/**
 * Loads the pre-compiled Strong's occurrence index
 */
async function loadStrongsIndex(id: string): Promise<StrongsOccurrencesMap | null> {
  const isGreek = id.toUpperCase().startsWith('G');
  if (isGreek) {
    if (GREEK_OCCURRENCES_INDEX) return GREEK_OCCURRENCES_INDEX;
    if (GREEK_INDEX_PROMISE) return GREEK_INDEX_PROMISE;
    GREEK_INDEX_PROMISE = (async () => {
      try {
        const res = await fetch('/bible/strongs_greek_index.json');
        if (res.ok) {
          const data: StrongsOccurrencesMap = await res.json();
          GREEK_OCCURRENCES_INDEX = data;
          return data;
        }
      } catch {
        // ignore
      }
      return null;
    })();
    try {
      return await GREEK_INDEX_PROMISE;
    } finally {
      GREEK_INDEX_PROMISE = null;
    }
  } else {
    if (HEBREW_OCCURRENCES_INDEX) return HEBREW_OCCURRENCES_INDEX;
    if (HEBREW_INDEX_PROMISE) return HEBREW_INDEX_PROMISE;
    HEBREW_INDEX_PROMISE = (async () => {
      try {
        const res = await fetch('/bible/strongs_hebrew_index.json');
        if (res.ok) {
          const data: StrongsOccurrencesMap = await res.json();
          HEBREW_OCCURRENCES_INDEX = data;
          return data;
        }
      } catch {
        // ignore
      }
      return null;
    })();
    try {
      return await HEBREW_INDEX_PROMISE;
    } finally {
      HEBREW_INDEX_PROMISE = null;
    }
  }
}

/**
 * Background cache warmer: loads active translation & indices quietly in background
 */
export function warmupSearchData(translation: string = 'KJV') {
  if (typeof window === 'undefined') return;
  const transKey = translation.toUpperCase();
  loadFullTranslation(transKey).catch(() => {});
  // Pre-fetch Greek index as it is compact (433KB gzipped) and popular for NT study
  loadStrongsIndex('G1').catch(() => {});
}

/**
 * Strips Strong's tags and XML/HTML markup from verse text
 */
export function stripMarkup(text: string): string {
  if (!text) return '';
  if (!text.includes('<')) return text;
  return text
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*$/gi, '')
    .replace(/<S[^>]*>[\s\S]*?<\/S>/gi, '')
    .replace(/<S[^>]*>/gi, '')
    .replace(/<\/S>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts matched Strong's English word right before the tag
 */
function extractStrongsWord(verseText: string, normalizedId: string): string {
  if (!verseText) return '';
  const cleanVerse = verseText
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<sup[^>]*>[\s\S]*$/gi, '');
  const directMatch = cleanVerse.match(
    new RegExp(`([\\w'’\\-]+)?\\s*<S[^>]*>${normalizedId}<\\/S>`, 'i')
  );
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }
  return '';
}

/**
 * Determine book ID range based on scope
 */
export function getBookRangeForScope(
  scope: SearchScope,
  currentBookNum: number = 1
): { startBook: number; endBook: number } {
  switch (scope) {
    case 'OT':
      return { startBook: 1, endBook: 39 };
    case 'NT':
      return { startBook: 40, endBook: 66 };
    case 'BOOK':
      return { startBook: currentBookNum, endBook: currentBookNum };
    case 'ALL':
    default:
      return { startBook: 1, endBook: 66 };
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Searches the Bible for words, phrases, or separate words across verses.
 * Supports whole-word exact matching by default (so 'as' doesn't match 'has'),
 * with optional allowPartialMatch for substring / stemming matches.
 * Optimized with word pre-filtering and in-memory full translation caching.
 */
export async function searchBibleText(
  rawQuery: string,
  translation: string = 'KJV',
  scope: SearchScope = 'ALL',
  currentBookNum: number = 1,
  onProgress?: (progressPercent: number, currentMatches: BibleSearchResult[]) => void,
  abortSignal?: AbortSignal,
  allowPartialMatch: boolean = false
): Promise<BibleSearchResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const results: BibleSearchResult[] = [];
  const transKey = translation.toUpperCase();
  const { startBook, endBook } = getBookRangeForScope(scope, currentBookNum);

  // Check if query is an exact phrase (quoted)
  const isPhrase =
    (query.startsWith('"') && query.endsWith('"')) ||
    (query.startsWith("'") && query.endsWith("'"));
  const cleanQuery = isPhrase ? query.slice(1, -1).trim() : query;
  const searchWords = isPhrase
    ? [cleanQuery.toLowerCase()]
    : cleanQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0);

  if (searchWords.length === 0) return [];

  // Pre-compile word boundary regexes once for whole-word exact matching
  const wordRegexes = !allowPartialMatch
    ? searchWords.map((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i'))
    : null;

  // Try fast path: Full translation in-memory object (KJV, KJV_STRONGS, ESV, NKJV, WEB, NIV, NLT)
  const fullData = await loadFullTranslation(transKey);
  if (abortSignal?.aborted) return results;

  if (fullData) {
    const totalBooks = endBook - startBook + 1;
    let booksScanned = 0;

    for (let b = startBook; b <= endBook; b++) {
      if (abortSignal?.aborted) return results;

      const bookStr = String(b);
      const bookData = fullData[bookStr];
      const bookObj = BIBLE_BOOKS[b - 1];
      const bookName = bookObj?.name || `Book ${b}`;

      if (bookData) {
        for (const ch in bookData) {
          const chNum = Number(ch);
          const chData = bookData[ch];
          for (const v in chData) {
            const vNum = Number(v);
            const rawText = chData[v];
            const lower = rawText.toLowerCase();

            // Ultra-fast sub-microsecond pre-filter:
            let match = true;
            for (let i = 0; i < searchWords.length; i++) {
              if (!lower.includes(searchWords[i])) {
                match = false;
                break;
              }
            }
            if (!match) continue;

            const hasMarkup = rawText.includes('<');
            const clean = hasMarkup ? stripMarkup(rawText) : rawText;
            const cleanLower = clean.toLowerCase();

            // When exact whole-word matching is active, verify word boundaries on clean text
            if (wordRegexes) {
              let wholeWordMatch = true;
              for (let i = 0; i < wordRegexes.length; i++) {
                if (!wordRegexes[i].test(cleanLower)) {
                  wholeWordMatch = false;
                  break;
                }
              }
              if (!wholeWordMatch) continue;
            } else {
              // Partial search mode: verify on clean text if markup exists
              if (hasMarkup) {
                let cleanMatch = true;
                for (let i = 0; i < searchWords.length; i++) {
                  if (!cleanLower.includes(searchWords[i])) {
                    cleanMatch = false;
                    break;
                  }
                }
                if (!cleanMatch) continue;
              }
            }

            results.push({
              bookId: b,
              bookName,
              chapter: chNum,
              verse: vNum,
              text: rawText,
              cleanText: clean,
            });
          }
        }
      }

      booksScanned++;
      if (onProgress && booksScanned % 15 === 0) {
        onProgress(Math.round((booksScanned / totalBooks) * 100), [...results]);
      }
    }

    if (onProgress) onProgress(100, results);
    return results;
  }

  // Fallback modular book loading path for any custom translations
  const totalBooks = endBook - startBook + 1;
  let booksScanned = 0;
  const BATCH_SIZE = 12;
  const bookNumbers: number[] = [];
  for (let b = startBook; b <= endBook; b++) {
    bookNumbers.push(b);
  }

  for (let i = 0; i < bookNumbers.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) return results;

    const batch = bookNumbers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (b) => {
        const bookObj = BIBLE_BOOKS[b - 1];
        if (!bookObj) return;

        const data = await loadBookData(bookObj.name, transKey);
        if (data) {
          for (const ch in data) {
            const chNum = Number(ch);
            const chData = data[ch];
            for (const v in chData) {
              const vNum = Number(v);
              const rawText = chData[v];
              const lower = rawText.toLowerCase();

              let match = true;
              for (let wIdx = 0; wIdx < searchWords.length; wIdx++) {
                if (!lower.includes(searchWords[wIdx])) {
                  match = false;
                  break;
                }
              }
              if (!match) continue;

              const hasMarkup = rawText.includes('<');
              const clean = hasMarkup ? stripMarkup(rawText) : rawText;
              const cleanLower = clean.toLowerCase();

              if (wordRegexes) {
                let wholeWordMatch = true;
                for (let wIdx = 0; wIdx < wordRegexes.length; wIdx++) {
                  if (!wordRegexes[wIdx].test(cleanLower)) {
                    wholeWordMatch = false;
                    break;
                  }
                }
                if (!wholeWordMatch) continue;
              } else if (hasMarkup) {
                let cleanMatch = true;
                for (let wIdx = 0; wIdx < searchWords.length; wIdx++) {
                  if (!cleanLower.includes(searchWords[wIdx])) {
                    cleanMatch = false;
                    break;
                  }
                }
                if (!cleanMatch) continue;
              }

              results.push({
                bookId: b,
                bookName: bookObj.name,
                chapter: chNum,
                verse: vNum,
                text: rawText,
                cleanText: clean,
              });
            }
          }
        }
      })
    );

    booksScanned += batch.length;
    if (onProgress) {
      onProgress(Math.round((booksScanned / totalBooks) * 100), [...results]);
    }
  }

  // Sort results by bookId, chapter, verse
  results.sort((a, b) => {
    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  if (onProgress) onProgress(100, results);
  return results;
}

/**
 * Searches for all occurrences of a Strong's concordance entry (e.g. G4102 or H7225)
 * in KJV_STRONGS.
 * Uses pre-computed reverse index for near-instant lookup (<15ms).
 */
export async function searchStrongsUsage(
  strongsId: string,
  preferredScope?: SearchScope,
  onProgress?: (progressPercent: number, currentMatches: BibleSearchResult[]) => void,
  abortSignal?: AbortSignal
): Promise<BibleSearchResult[]> {
  const normalizedId = strongsId.toUpperCase().replace(/^([GH])0+/, '$1');
  const isGreek = normalizedId.startsWith('G');
  const isHebrew = normalizedId.startsWith('H');

  let startBook = 1;
  let endBook = 66;

  if (preferredScope && preferredScope !== 'ALL') {
    const range = getBookRangeForScope(preferredScope);
    startBook = range.startBook;
    endBook = range.endBook;
  } else if (isGreek) {
    startBook = 40;
    endBook = 66;
  } else if (isHebrew) {
    startBook = 1;
    endBook = 39;
  }

  // 1. Instant Index lookup (<15ms)
  const [index, kjvStrongs] = await Promise.all([
    loadStrongsIndex(normalizedId),
    loadFullTranslation('KJV_STRONGS'),
  ]);

  if (abortSignal?.aborted) return [];

  if (index && index[normalizedId]) {
    const rawMatches = index[normalizedId];
    const filteredMatches = rawMatches.filter(
      ([b]) => b >= startBook && b <= endBook
    );

    const results: BibleSearchResult[] = [];
    for (let i = 0; i < filteredMatches.length; i++) {
      const [b, ch, v, word] = filteredMatches[i];
      const bookObj = BIBLE_BOOKS[b - 1];
      const bookName = bookObj?.name || `Book ${b}`;

      let rawText = '';
      if (kjvStrongs && kjvStrongs[String(b)]?.[String(ch)]?.[String(v)]) {
        rawText = kjvStrongs[String(b)][String(ch)][String(v)];
      }

      const clean = rawText.includes('<') ? stripMarkup(rawText) : rawText;

      results.push({
        bookId: b,
        bookName,
        chapter: ch,
        verse: v,
        text: rawText,
        cleanText: clean,
        matchedStrongsWord: word || extractStrongsWord(rawText, normalizedId),
      });
    }

    if (onProgress) onProgress(100, results);
    return results;
  }

  // 2. Fallback scan if index did not have entry or was unavailable
  const results: BibleSearchResult[] = [];
  const tagRegex = new RegExp(`<S[^>]*>${normalizedId}<\\/S>`, 'i');

  if (kjvStrongs) {
    for (let b = startBook; b <= endBook; b++) {
      if (abortSignal?.aborted) return results;

      const bookStr = String(b);
      const bookData = kjvStrongs[bookStr];
      const bookObj = BIBLE_BOOKS[b - 1];
      const bookName = bookObj?.name || `Book ${b}`;

      if (bookData) {
        for (const ch in bookData) {
          const chNum = Number(ch);
          const chData = bookData[ch];
          for (const v in chData) {
            const vNum = Number(v);
            const rawText = chData[v];
            if (rawText.includes(normalizedId) && tagRegex.test(rawText)) {
              const matchedWord = extractStrongsWord(rawText, normalizedId);
              const clean = stripMarkup(rawText);
              results.push({
                bookId: b,
                bookName,
                chapter: chNum,
                verse: vNum,
                text: rawText,
                cleanText: clean,
                matchedStrongsWord: matchedWord,
              });
            }
          }
        }
      }
    }

    if (onProgress) onProgress(100, results);
    return results;
  }

  // 3. Fallback per-book loading path
  const totalBooks = endBook - startBook + 1;
  let booksScanned = 0;
  const bookNumbers: number[] = [];
  for (let b = startBook; b <= endBook; b++) {
    bookNumbers.push(b);
  }

  const BATCH_SIZE = 12;
  for (let i = 0; i < bookNumbers.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) return results;

    const batch = bookNumbers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (b) => {
        const bookObj = BIBLE_BOOKS[b - 1];
        if (!bookObj) return;

        const data = await loadBookData(bookObj.name, 'KJV_STRONGS');
        if (data) {
          for (const ch in data) {
            const chNum = Number(ch);
            const chData = data[ch];
            for (const v in chData) {
              const vNum = Number(v);
              const rawText = chData[v];
              if (rawText.includes(normalizedId) && tagRegex.test(rawText)) {
                const matchedWord = extractStrongsWord(rawText, normalizedId);
                const clean = stripMarkup(rawText);
                results.push({
                  bookId: b,
                  bookName: bookObj.name,
                  chapter: chNum,
                  verse: vNum,
                  text: rawText,
                  cleanText: clean,
                  matchedStrongsWord: matchedWord,
                });
              }
            }
          }
        }
      })
    );

    booksScanned += batch.length;
    if (onProgress) {
      onProgress(Math.round((booksScanned / totalBooks) * 100), [...results]);
    }
  }

  results.sort((a, b) => {
    if (a.bookId !== b.bookId) return a.bookId - b.bookId;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  if (onProgress) onProgress(100, results);
  return results;
}
