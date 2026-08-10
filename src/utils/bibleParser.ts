import { BIBLE_BOOKS, getMaxVersesForChapter } from '../data/bibleData';
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

const BOOK_PATTERN = SORTED_BOOK_KEYS.map((key) => escapeRegExp(key)).join('|');

// Regex matches patterns like:
// "Matt 5:7", "Matthew 5 v 7", "Matt 5 v 7-20", "1 Cor 13:4-7", "Jn 3:16", "Romans 8:28-30"
const BIBLE_REF_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\b[\\s.]*(\\d{1,3})[\\s]*(?:[:.]|v|ver|verse)?[\\s]*(\\d{1,3})(?:[\\s]*(?:[-–—]|to)[\\s]*(\\d{1,5}))?`,
  'gi'
);

/**
 * Scans text and extracts all valid Bible references with strict chapter/verse bounds.
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

      // Strict Chapter & Verse Bounds Checking
      const isChapterValid = chapter > 0 && chapter <= bookObj.chaptersCount;
      const maxVerses = getMaxVersesForChapter(bookObj.name, chapter);

      const isStartVerseValid = startVerse > 0 && startVerse <= maxVerses;
      const isEndVerseValid =
        endVerse === undefined ||
        (endVerse >= startVerse && endVerse <= maxVerses && endVerse - startVerse <= 50);

      if (isChapterValid && isStartVerseValid && isEndVerseValid) {
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

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html.replace(/<[^>]*>/g, '');
  }
}

export function createRefChipHtml(refText: string): string {
  const escapedContent = refText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span contenteditable="false" data-ref="${escapedContent}" class="inline-flex items-center mx-1 my-0 px-2 py-[2px] rounded-md bg-red-100/90 dark:bg-red-950/70 border border-red-200/80 dark:border-red-900/80 text-red-600 dark:text-red-400 font-semibold text-[0.9em] leading-tight align-baseline select-none cursor-pointer"><span class="ref-click-btn inline-flex items-center hover:underline">${escapedContent}</span></span>`;
}

export function processHtmlWithReferences(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild;
    if (!container) return html;

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-ref') || el.closest('[data-ref]')) {
          return;
        }
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || '';
        const matches = parseBibleReferences(text);
        if (matches.length > 0) {
          const frag = doc.createDocumentFragment();
          let lastIndex = 0;
          matches.forEach((m) => {
            if (m.startIndex > lastIndex) {
              frag.appendChild(doc.createTextNode(text.slice(lastIndex, m.startIndex)));
            }
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = createRefChipHtml(m.fullMatch);
            if (wrapper.firstElementChild) {
              frag.appendChild(wrapper.firstElementChild);
            } else {
              frag.appendChild(doc.createTextNode(m.fullMatch));
            }
            lastIndex = m.endIndex;
          });
          if (lastIndex < text.length) {
            frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
          }
          node.parentNode?.replaceChild(frag, node);
        }
        return;
      }

      const children = Array.from(node.childNodes);
      children.forEach((child) => walk(child));
    };

    walk(container);
    return container.innerHTML;
  } catch {
    return html;
  }
}
