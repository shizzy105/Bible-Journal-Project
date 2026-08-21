import { BIBLE_BOOKS, getMaxVersesForChapter } from '../data/bibleData';
import { BibleReferenceMatch } from '../types/journal';
import { RefFormat, getStoredRefFormat } from '../services/storage';

export const BOOK_SHORT_NAMES: Record<string, string> = {
  Genesis: 'Gen',
  Exodus: 'Ex',
  Leviticus: 'Lev',
  Numbers: 'Num',
  Deuteronomy: 'Deut',
  Joshua: 'Josh',
  Judges: 'Judg',
  Ruth: 'Ruth',
  '1 Samuel': '1 Sam',
  '2 Samuel': '2 Sam',
  '1 Kings': '1 Kgs',
  '2 Kings': '2 Kgs',
  '1 Chronicles': '1 Chron',
  '2 Chronicles': '2 Chron',
  Ezra: 'Ezra',
  Nehemiah: 'Neh',
  Esther: 'Esth',
  Job: 'Job',
  Psalms: 'Ps',
  Proverbs: 'Prov',
  Ecclesiastes: 'Eccl',
  'Song of Solomon': 'Song',
  Isaiah: 'Isa',
  Jeremiah: 'Jer',
  Lamentations: 'Lam',
  Ezekiel: 'Ezek',
  Daniel: 'Dan',
  Hosea: 'Hos',
  Joel: 'Joel',
  Amos: 'Amos',
  Obadiah: 'Obad',
  Jonah: 'Jonah',
  Micah: 'Mic',
  Nahum: 'Nah',
  Habakkuk: 'Hab',
  Zephaniah: 'Zeph',
  Haggai: 'Hag',
  Zechariah: 'Zech',
  Malachi: 'Mal',
  Matthew: 'Matt',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Romans: 'Rom',
  '1 Corinthians': '1 Cor',
  '2 Corinthians': '2 Cor',
  Galatians: 'Gal',
  Ephesians: 'Eph',
  Philippians: 'Phil',
  Colossians: 'Col',
  '1 Thessalonians': '1 Thess',
  '2 Thessalonians': '2 Thess',
  '1 Timothy': '1 Tim',
  '2 Timothy': '2 Tim',
  Titus: 'Titus',
  Philemon: 'Philem',
  Hebrews: 'Heb',
  James: 'Jas',
  '1 Peter': '1 Pet',
  '2 Peter': '2 Pet',
  '1 John': '1 John',
  '2 John': '2 John',
  '3 John': '3 John',
  Jude: 'Jude',
  Revelation: 'Rev',
};

export function formatRefMatch(match: BibleReferenceMatch, format?: RefFormat): string {
  const targetFormat = format || getStoredRefFormat();
  const bookDisp = targetFormat === 'short'
    ? (BOOK_SHORT_NAMES[match.bookName] || match.bookName)
    : match.bookName;
  const verseStr = match.endVerse && match.endVerse !== match.startVerse
    ? `${match.startVerse}-${match.endVerse}`
    : `${match.startVerse}`;
  return `${bookDisp} ${match.chapter} v ${verseStr}`;
}

export function formatRefString(refText: string, format?: RefFormat): string {
  if (!refText) return refText;
  const matches = parseBibleReferences(refText);
  if (matches.length > 0) {
    return formatRefMatch(matches[0], format);
  }
  return refText;
}

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
    const prepared = html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|blockquote)>/gi, ' ')
      .replace(/<(p|div|h1|h2|h3|h4|h5|h6|li|tr|blockquote)[^>]*>/gi, ' ');

    const doc = new DOMParser().parseFromString(prepared, 'text/html');
    const text = doc.body.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function getJournalEntryTextSnippet(entry: { blocks: Array<{ type: string; content?: string }> }): string {
  if (!entry || !entry.blocks) return '';
  return entry.blocks
    .filter((b) => b.type === 'text' && b.content)
    .map((b) => stripHtmlTags(b.content || ''))
    .filter(Boolean)
    .join(' ');
}

export function createRefChipHtml(refText: string, format?: RefFormat): string {
  const formattedText = formatRefString(refText, format);
  const escapedContent = formattedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span contenteditable="false" data-ref="${escapedContent}" role="button" tabindex="0" style="touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; pointer-events: auto; -webkit-tap-highlight-color: transparent; cursor: pointer;" class="ref-chip inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-red-100 dark:bg-red-950/80 border-0 text-red-600 dark:text-red-400 font-semibold text-[0.88em] leading-normal select-none cursor-pointer whitespace-nowrap active:scale-95 transition-transform"><span class="ref-click-btn inline-block align-baseline hover:underline" data-ref="${escapedContent}" style="pointer-events: auto; -webkit-user-select: none; user-select: none;">${escapedContent}</span></span>`;
}

export function processHtmlWithReferences(html: string, format?: RefFormat): string {
  if (!html) return '';
  const targetFormat = format || getStoredRefFormat();
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild;
    if (!container) return html;

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-ref') || el.closest('[data-ref]')) {
          const targetEl = el.hasAttribute('data-ref') ? el : (el.closest('[data-ref]') as HTMLElement);
          if (targetEl) {
            const rawRef = targetEl.getAttribute('data-ref') || '';
            const matches = parseBibleReferences(rawRef);
            if (matches.length > 0) {
              const updatedRef = formatRefMatch(matches[0], targetFormat);
              targetEl.setAttribute('data-ref', updatedRef);
              const clickBtn = targetEl.querySelector('.ref-click-btn');
              if (clickBtn) {
                clickBtn.textContent = updatedRef;
              } else {
                targetEl.textContent = updatedRef;
              }
            }
          }
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
            wrapper.innerHTML = createRefChipHtml(m.fullMatch, targetFormat);
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

export function formatDateDDMMYYYY(isoDateStr: string): string {
  try {
    if (!isoDateStr) return 'DD/MM/YYYY';
    const parts = isoDateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    return isoDateStr;
  } catch {
    return isoDateStr;
  }
}

