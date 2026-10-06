import { BIBLE_BOOKS, getMaxVersesForChapter } from '../data/bibleData';
import { BibleReferenceMatch } from '../types/journal';
import { RefFormat, getStoredRefFormat } from '../services/storage';
import { parseStrongsReference } from '../data/strongsData';

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

export function formatVerseRanges(verses: number[]): string {
  if (!verses || verses.length === 0) return '';
  const sorted = Array.from(new Set(verses)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === rangeEnd + 1) {
      rangeEnd = current;
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      rangeStart = current;
      rangeEnd = current;
    }
  }
  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
  return ranges.join(', ');
}

export function formatRefMatch(match: BibleReferenceMatch, format?: RefFormat): string {
  const targetFormat = format || getStoredRefFormat();
  const bookDisp = targetFormat === 'short'
    ? (BOOK_SHORT_NAMES[match.bookName] || match.bookName)
    : match.bookName;
  if (match.isFullChapter) {
    return `${bookDisp} ${match.chapter}`;
  }
  const verseStr = match.verseList && match.verseList.length > 0
    ? formatVerseRanges(match.verseList)
    : match.endVerse && match.endVerse !== match.startVerse
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

function registerBookAlias(alias: string, book: typeof BIBLE_BOOKS[0]) {
  if (!alias) return;
  const clean = alias.toLowerCase().trim();
  if (clean) {
    ALIAS_TO_BOOK_MAP.set(clean, book);
  }
}

// Populate alias map with complete names, IDs, abbreviations, short names, and numbered variants
BIBLE_BOOKS.forEach((book) => {
  registerBookAlias(book.name, book);
  registerBookAlias(book.id, book);
  book.abbreviations.forEach((abbr) => registerBookAlias(abbr, book));
  
  if (BOOK_SHORT_NAMES[book.name]) {
    registerBookAlias(BOOK_SHORT_NAMES[book.name], book);
  }

  // Handle all numbered books (1, 2, 3) e.g., 1 Kings, 2 Kings, 1 Sam, 2 Sam, etc.
  const numMatch = book.name.match(/^([123])\s+(.+)$/);
  if (numMatch) {
    const num = numMatch[1];
    const rest = numMatch[2];
    const ord = num === '1' ? '1st' : num === '2' ? '2nd' : '3rd';
    const word = num === '1' ? 'first' : num === '2' ? 'second' : 'third';
    const roman = num === '1' ? 'i' : num === '2' ? 'ii' : 'iii';

    registerBookAlias(`${num}${rest}`, book);
    registerBookAlias(`${num} ${rest}`, book);
    registerBookAlias(`${ord} ${rest}`, book);
    registerBookAlias(`${ord}${rest}`, book);
    registerBookAlias(`${word} ${rest}`, book);
    registerBookAlias(`${word}${rest}`, book);
    registerBookAlias(`${roman} ${rest}`, book);
    registerBookAlias(`${roman}${rest}`, book);

    const short = BOOK_SHORT_NAMES[book.name];
    if (short) {
      const shortMatch = short.match(/^([123])\s+(.+)$/);
      if (shortMatch) {
        const sRest = shortMatch[2];
        registerBookAlias(`${num}${sRest}`, book);
        registerBookAlias(`${num} ${sRest}`, book);
        registerBookAlias(`${ord} ${sRest}`, book);
        registerBookAlias(`${ord}${sRest}`, book);
        registerBookAlias(`${word} ${sRest}`, book);
        registerBookAlias(`${roman} ${sRest}`, book);
      }
    }
  }
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
// "Matt 5:7", "Matthew 5 v 7", "Matt 5 v 7-20", "Esther 1 v 2, 4", "Esther 1 v 2,4", "1 Cor 13:4-7, 13", "Jn 3:16", "Romans 8:28-30", "Daniel 5", "Dan 5", "Genesis 1"
const BIBLE_REF_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\b[\\s.]*(\\d{1,3})(?:(?:[\\s]*(?:[:.]|v\\b|ver\\b|verse\\b)[\\s]*|[\\s]+)(\\d{1,3}(?:[\\s]*(?:[-–—]|to)[\\s]*\\d{1,3})?(?:[\\s]*,[\\s]*\\d{1,3}(?:[\\s]*(?:[-–—]|to)[\\s]*\\d{1,3})?)*))?`,
  'gi'
);

/**
 * Scans text and extracts all valid Bible references with strict chapter/verse bounds.
 * Supports full chapter references, verse ranges, and multiple non-continuous verses (e.g. "Esther 1 v 2, 4").
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
    const versesStr = match[3];

    const bookObj = ALIAS_TO_BOOK_MAP.get(rawBookMatch.toLowerCase());

    if (bookObj) {
      const chapter = parseInt(chapterStr, 10);
      const isChapterValid = chapter > 0 && chapter <= bookObj.chaptersCount;
      const maxVerses = getMaxVersesForChapter(bookObj.name, chapter);

      if (!isChapterValid || maxVerses <= 0) {
        continue;
      }

      if (versesStr !== undefined) {
        // Parse comma-separated verse segments or ranges, e.g. "2, 4" or "2,4" or "7-20" or "2-3, 5, 8"
        const segments = versesStr.split(',');
        const verseList: number[] = [];
        let allValid = true;

        for (const seg of segments) {
          const trimmedSeg = seg.trim();
          if (!trimmedSeg) {
            allValid = false;
            break;
          }
          const rangeMatch = trimmedSeg.match(/^(\d{1,3})(?:[\s]*(?:[-–—]|to)[\s]*(\d{1,3}))?$/);
          if (!rangeMatch) {
            allValid = false;
            break;
          }
          const s = parseInt(rangeMatch[1], 10);
          const e = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;

          if (e !== undefined) {
            if (s > 0 && e >= s && e <= maxVerses && e - s <= 50) {
              for (let i = s; i <= e; i++) {
                verseList.push(i);
              }
            } else {
              allValid = false;
              break;
            }
          } else {
            if (s > 0 && s <= maxVerses) {
              verseList.push(s);
            } else {
              allValid = false;
              break;
            }
          }
        }

        if (allValid && verseList.length > 0) {
          const sortedVerses = Array.from(new Set(verseList)).sort((a, b) => a - b);
          const startVerse = sortedVerses[0];
          const endVerse = sortedVerses[sortedVerses.length - 1];

          matches.push({
            fullMatch: match[0],
            bookName: bookObj.name,
            bookId: bookObj.id,
            chapter,
            startVerse,
            endVerse,
            verseList: sortedVerses,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            isFullChapter: false,
          });
        }
      } else {
        // Full Chapter Reference (e.g. "Daniel 5", "Dan 5", "John 3", "Genesis 1")
        matches.push({
          fullMatch: match[0],
          bookName: bookObj.name,
          bookId: bookObj.id,
          chapter,
          startVerse: 1,
          endVerse: maxVerses,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          isFullChapter: true,
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
  const strongsMatch = parseStrongsReference(refText);
  if (strongsMatch && strongsMatch.isValidRange) {
    const escapedContent = strongsMatch.id;
    return `<span data-ref="${escapedContent}" data-strongs="${escapedContent}" style="touch-action: manipulation; -webkit-user-select: all; user-select: all; -webkit-touch-callout: none; pointer-events: auto; -webkit-tap-highlight-color: transparent; cursor: pointer;" class="ref-chip strongs-chip inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-red-100 dark:bg-red-950/90 border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-[0.88em] leading-normal cursor-pointer whitespace-nowrap active:scale-95 transition-transform"><span class="ref-click-btn inline align-baseline hover:underline" style="pointer-events: auto; -webkit-user-select: all; user-select: all; border: none !important; outline: none !important; background: transparent !important; box-shadow: none !important;">${escapedContent}</span></span>`;
  }
  const formattedText = formatRefString(refText, format);
  const escapedContent = formattedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<span data-ref="${escapedContent}" style="touch-action: manipulation; -webkit-user-select: all; user-select: all; -webkit-touch-callout: none; pointer-events: auto; -webkit-tap-highlight-color: transparent; cursor: pointer;" class="ref-chip inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-red-100 dark:bg-red-950/90 border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-[0.88em] leading-normal cursor-pointer whitespace-nowrap active:scale-95 transition-transform"><span class="ref-click-btn inline align-baseline hover:underline" style="pointer-events: auto; -webkit-user-select: all; user-select: all; border: none !important; outline: none !important; background: transparent !important; box-shadow: none !important;">${escapedContent}</span></span>`;
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

        // If this element is the inner click label, sanitize it so it never carries borders or data-ref
        if (el.classList.contains('ref-click-btn')) {
          el.removeAttribute('data-ref');
          el.removeAttribute('data-strongs');
          el.removeAttribute('contenteditable');
          el.classList.remove('ref-chip', 'strongs-chip');
          el.style.removeProperty('border');
          el.style.removeProperty('background');
          el.style.removeProperty('background-color');
          return;
        }

        if (el.hasAttribute('data-ref') || el.classList.contains('ref-chip')) {
          const targetEl = el;
          // Strip any conflicting inline backgrounds/colors that might have been copied/pasted from light mode
          targetEl.style.removeProperty('background');
          targetEl.style.removeProperty('background-color');
          targetEl.style.removeProperty('color');
          targetEl.removeAttribute('tabindex');
          targetEl.removeAttribute('contenteditable');
          if (targetEl.getAttribute('role') === 'button') {
            targetEl.removeAttribute('role');
          }
          targetEl.style.webkitUserSelect = 'all';
          targetEl.style.userSelect = 'all';

          // Clean up any inner .ref-click-btn that might have accidentally retained data-ref, data-strongs, or ref-chip class
          const innerBtn = targetEl.querySelector('.ref-click-btn');
          if (innerBtn) {
            innerBtn.removeAttribute('data-ref');
            innerBtn.removeAttribute('data-strongs');
            innerBtn.removeAttribute('tabindex');
            innerBtn.removeAttribute('role');
            innerBtn.removeAttribute('contenteditable');
            innerBtn.classList.remove('ref-chip', 'strongs-chip');
            (innerBtn as HTMLElement).style.removeProperty('border');
            (innerBtn as HTMLElement).style.removeProperty('background');
            (innerBtn as HTMLElement).style.removeProperty('background-color');
            (innerBtn as HTMLElement).style.webkitUserSelect = 'all';
            (innerBtn as HTMLElement).style.userSelect = 'all';
          }

          // Normalize classes so existing pills always receive standard dark/light styling
          const isStrongs = targetEl.hasAttribute('data-strongs') || targetEl.classList.contains('strongs-chip');
          targetEl.className = `ref-chip ${isStrongs ? 'strongs-chip ' : ''}inline-block align-baseline mx-1 my-0 px-2 py-[1.5px] rounded-md bg-red-100 dark:bg-red-950/90 border border-red-200/50 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-[0.88em] leading-normal cursor-pointer whitespace-nowrap active:scale-95 transition-transform`;

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
          // Ensure every chip is immediately followed by a ZWSP text node for SwiftKey / Android IME stability
          if (!targetEl.nextSibling || targetEl.nextSibling.nodeType !== Node.TEXT_NODE || !(targetEl.nextSibling.nodeValue?.startsWith('\uFEFF'))) {
            const zwsp = doc.createTextNode('\uFEFF');
            targetEl.parentNode?.insertBefore(zwsp, targetEl.nextSibling);
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
            while (wrapper.firstChild) {
              frag.appendChild(wrapper.firstChild);
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

