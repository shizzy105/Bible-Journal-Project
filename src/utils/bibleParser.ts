import { BIBLE_BOOKS } from '../data/bibleData';
import { BibleReferenceMatch } from '../types/journal';

// Build alias map: lowercase abbreviation -> Book Object
const ALIAS_TO_BOOK_MAP = new Map<string, typeof BIBLE_BOOKS[0]>();

// Populate alias map
BIBLE_BOOKS.forEach((book) => {
  // Full name
  ALIAS_TO_BOOK_MAP.set(book.name.toLowerCase(), book);
  // Id
  ALIAS_TO_BOOK_MAP.set(book.id.toLowerCase(), book);
  // Abbreviations
  book.abbreviations.forEach((abbr) => {
    ALIAS_TO_BOOK_MAP.set(abbr.toLowerCase(), book);
  });
});

// Get all keys sorted by length descending so longest matches first
const SORTED_BOOK_KEYS = Array.from(ALIAS_TO_BOOK_MAP.keys()).sort((a, b) => b.length - a.length);

/**
 * Escapes regex special characters
 */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Regex to capture:
// Group 1: Book name/abbr
// Group 2: Chapter number
// Group 3: Separator (':' or 'v' or 'verse' or '.')
// Group 4: Start verse number
// Group 5: Optional end verse number (e.g. -7 or -12)
const BOOK_PATTERN = SORTED_BOOK_KEYS.map((key) => escapeRegExp(key)).join('|');

// Regex matches patterns like:
// "Matt 5:7", "Matthew 5 v 7", "Matt 5 v 7-20", "1 Cor 13:4-7", "Jn 3:16", "Romans 8:28-30"
const BIBLE_REF_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\b[\\s.]*(\\d{1,3})[\\s]*(?:[:.]|v|ver|verse)?[\\s]*(\\d{1,3})(?:[\\s]*(?:[-–—]|to)[\\s]*(\\d{1,3}))?`,
  'gi'
);

/**
 * Scans text and extracts all valid Bible references.
 */
export function parseBibleReferences(text: string): BibleReferenceMatch[] {
  if (!text || typeof text !== 'string') return [];

  const matches: BibleReferenceMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  BIBLE_REF_REGEX.lastIndex = 0;

  while ((match = BIBLE_REF_REGEX.exec(text)) !== null) {
    const rawBookMatch = match[1];
    const chapterStr = match[2];
    const startVerseStr = match[3];
    const endVerseStr = match[4];

    const bookObj = ALIAS_TO_BOOK_MAP.get(rawBookMatch.toLowerCase());

    if (bookObj) {
      const chapter = parseInt(chapterStr, 10);
      const startVerse = parseInt(startVerseStr, 10);
      const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined;

      // Validate chapter and verse sanity (e.g., chapter <= 150, verse <= 200)
      if (chapter > 0 && chapter <= bookObj.chaptersCount && startVerse > 0 && startVerse <= 180) {
        matches.push({
          fullMatch: match[0],
          bookName: bookObj.name,
          bookId: bookObj.id,
          chapter,
          startVerse,
          endVerse,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  return matches;
}

/**
 * Renders text parts interspersed with detected Bible reference tokens
 */
export interface TextSegment {
  type: 'text' | 'bibleRef';
  content: string;
  match?: BibleReferenceMatch;
}

export function segmentTextWithReferences(text: string): TextSegment[] {
  const matches = parseBibleReferences(text);
  if (matches.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: TextSegment[] = [];
  let currentIndex = 0;

  matches.forEach((m) => {
    if (m.startIndex > currentIndex) {
      segments.push({
        type: 'text',
        content: text.slice(currentIndex, m.startIndex),
      });
    }

    segments.push({
      type: 'bibleRef',
      content: m.fullMatch,
      match: m,
    });

    currentIndex = m.endIndex;
  });

  if (currentIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(currentIndex),
    });
  }

  return segments;
}
