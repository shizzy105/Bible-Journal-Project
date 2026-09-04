import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, X, Check, AlertCircle, Search } from 'lucide-react';
import { BIBLE_BOOKS, getMaxVersesForChapter } from '../data/bibleData';
import { parseBibleReferences, formatRefMatch } from '../utils/bibleParser';
import { getStoredRefFormat } from '../services/storage';
import { parseStrongsReference, getStrongsEntrySync, fetchStrongsEntryAsync } from '../data/strongsData';
import { StrongsEntry } from '../types/journal';

interface InsertReferenceModalProps {
  onClose: () => void;
  onInsert: (formattedRef: string) => void;
  darkMode?: boolean;
}

export const InsertReferenceModal: React.FC<InsertReferenceModalProps> = ({
  onClose,
  onInsert,
  darkMode,
}) => {
  // Free text query or structured selection - start empty
  const [query, setQuery] = useState<string>('');
  const [showBookDropdown, setShowBookDropdown] = useState<boolean>(false);
  const [strongsPreview, setStrongsPreview] = useState<StrongsEntry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute effective dark mode if prop is not passed
  const isDark =
    darkMode ??
    (typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Check if current input is a Strong's reference format
  const strongsMatch = useMemo(() => {
    return parseStrongsReference(query);
  }, [query]);

  // Load Strong's preview asynchronously when a valid Strong's number is entered
  useEffect(() => {
    if (!strongsMatch || !strongsMatch.isValidRange) {
      setStrongsPreview(null);
      return;
    }

    const sync = getStrongsEntrySync(strongsMatch.id);
    if (sync) {
      setStrongsPreview(sync);
      return;
    }

    let isMounted = true;
    fetchStrongsEntryAsync(strongsMatch.id).then((entry) => {
      if (isMounted && entry) {
        setStrongsPreview(entry);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [strongsMatch]);

  // Filter book suggestions based on user input (disabled for Strong's queries)
  const bookSuggestions = useMemo(() => {
    const search = query.toLowerCase().trim();
    // Concordance doesn't need autosuggest - hide book suggestions when typing Strong's
    if (!search || strongsMatch || /^(?:strong'?s?\s*)?[hg]\d+/i.test(search)) return [];
    // Match against full name, id, or abbreviations
    return BIBLE_BOOKS.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.id.toLowerCase().includes(search) ||
        b.abbreviations.some((abbr) => abbr.toLowerCase().includes(search))
    ).slice(0, 6);
  }, [query, strongsMatch]);

  // Live reference validation logic with strict chapter & verse count checking + Strong's concordance
  const validationResult = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Please enter a scripture reference or Strong\'s concordance number (e.g. H867, G765).' };
    }

    // First check if query matches Strong's concordance (H867, G765, etc.)
    if (strongsMatch) {
      if (!strongsMatch.isValidRange) {
        return {
          isValid: false,
          isStrongs: true,
          error:
            strongsMatch.type === 'H'
              ? `Strong's Hebrew concordance numbers range from H1 to H${strongsMatch.maxAllowed}.`
              : `Strong's Greek concordance numbers range from G1 to G${strongsMatch.maxAllowed}.`,
        };
      }

      const preview = strongsPreview || getStrongsEntrySync(strongsMatch.id);
      const displayLabel = preview
        ? `${strongsMatch.id} — ${preview.lemma} (${preview.translit}): ${preview.strongs_def}`
        : `${strongsMatch.id} (${strongsMatch.type === 'H' ? 'Hebrew' : 'Greek'} Lexicon)`;

      return {
        isValid: true,
        isStrongs: true,
        formatted: strongsMatch.id,
        displayName: displayLabel,
      };
    }

    // First attempt parsing with strict regex bible parser
    const matches = parseBibleReferences(trimmed);
    if (matches.length > 0) {
      const match = matches[0];
      return {
        isValid: true,
        isStrongs: false,
        match,
        formatted: formatRefMatch(match, getStoredRefFormat()),
      };
    }

    // Detailed error diagnostics if parsing failed:
    // Find book object by checking if trimmed starts with a book or abbreviation
    const searchLower = trimmed.toLowerCase();
    
    // Sort books so longer name/abbreviation matches first (e.g., '1 Corinthians' before '1')
    let bookObj: typeof BIBLE_BOOKS[0] | undefined;
    let matchLen = 0;

    for (const b of BIBLE_BOOKS) {
      if (searchLower.startsWith(b.name.toLowerCase()) && b.name.length > matchLen) {
        bookObj = b;
        matchLen = b.name.length;
      }
      if (searchLower.startsWith(b.id.toLowerCase()) && b.id.length > matchLen) {
        bookObj = b;
        matchLen = b.id.length;
      }
      for (const abbr of b.abbreviations) {
        if (searchLower.startsWith(abbr.toLowerCase()) && abbr.length > matchLen) {
          bookObj = b;
          matchLen = abbr.length;
        }
      }
    }

    // Fallback: Check first word / tokens
    const parts = trimmed.split(/[\s.:]+/);
    if (!bookObj) {
      const possibleBookText = parts[0]?.toLowerCase();
      bookObj = BIBLE_BOOKS.find(
        (b) =>
          b.name.toLowerCase() === possibleBookText ||
          b.id.toLowerCase() === possibleBookText ||
          b.abbreviations.some((a) => a.toLowerCase() === possibleBookText) ||
          b.name.toLowerCase().startsWith(possibleBookText || '')
      );
    }

    if (!bookObj) {
      return {
        isValid: false,
        error: `Reference "${parts[0] || ''}" not recognized. Enter a valid Bible reference (e.g. Matt 8 v 9) or Strong's # (e.g. H867, G765).`,
      };
    }

    // Extract numbers in query after the matched book name/abbreviation
    const queryAfterBook = trimmed.slice(matchLen).trim();
    const numbers = (queryAfterBook || trimmed).match(/\d+/g);

    if (!numbers || numbers.length === 0) {
      return {
        isValid: false,
        error: `Please specify a chapter number for ${bookObj.name} (1–${bookObj.chaptersCount}).`,
      };
    }

    const chapterNum = parseInt(numbers[0], 10);
    if (isNaN(chapterNum) || chapterNum <= 0) {
      return {
        isValid: false,
        error: `Please specify a valid chapter number for ${bookObj.name} (1–${bookObj.chaptersCount}).`,
      };
    }

    if (chapterNum > bookObj.chaptersCount) {
      return {
        isValid: false,
        error: `${bookObj.name} only has ${bookObj.chaptersCount} chapters. Chapter ${chapterNum} does not exist!`,
      };
    }

    const maxVerses = getMaxVersesForChapter(bookObj.name, chapterNum);

    if (numbers.length >= 2) {
      const verseNum = parseInt(numbers[1], 10);

      if (verseNum <= 0) {
        return {
          isValid: false,
          error: `Verse number must be at least 1.`,
        };
      }

      if (verseNum > maxVerses) {
        return {
          isValid: false,
          error: `${bookObj.name} chapter ${chapterNum} only has ${maxVerses} verses. Verse ${verseNum} does not exist in the Bible!`,
        };
      }

      if (numbers.length >= 3) {
        const endVerseNum = parseInt(numbers[2], 10);
        if (endVerseNum > maxVerses) {
          return {
            isValid: false,
            error: `${bookObj.name} chapter ${chapterNum} only has ${maxVerses} verses. End verse ${endVerseNum} is out of range!`,
          };
        }
        if (endVerseNum < verseNum) {
          return {
            isValid: false,
            error: `End verse (${endVerseNum}) cannot be smaller than start verse (${verseNum}).`,
          };
        }
        if (endVerseNum - verseNum > 50) {
          return {
            isValid: false,
            error: `Verse range (${verseNum}-${endVerseNum}) is too wide (max 50 verses per reference).`,
          };
        }
      }
    }

    return {
      isValid: false,
      error: `Please specify a verse for ${bookObj.name} ${chapterNum} (e.g. "${bookObj.name} ${chapterNum} v 1").`,
    };
  }, [query]);

  const handleSelectBook = (bookName: string) => {
    setShowBookDropdown(false);
    const newQuery = `${bookName} `;
    setQuery(newQuery);
    if (inputRef.current) {
      inputRef.current.focus();
      const pos = newQuery.length;
      inputRef.current.setSelectionRange(pos, pos);
    }
  };

  const handleInsert = () => {
    if (validationResult.isValid && validationResult.formatted) {
      onInsert(validationResult.formatted);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className={`relative w-full max-w-md border rounded-3xl shadow-2xl p-5 sm:p-6 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-3 mb-4 ${
            isDark ? 'border-slate-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/15 text-red-600 dark:text-red-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-stone-900'}`}>
                Insert Scripture Reference
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                Inserts an atomic scripture/strongs link in your note
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-stone-100 text-stone-400 hover:text-stone-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <label
              className={`block text-xs font-bold mb-1.5 ${
                isDark ? 'text-slate-300' : 'text-stone-700'
              }`}
            >
              Type Reference or Strong's (e.g. Matt 8 v 9, H867, G765):
            </label>
            <div className="relative flex items-center">
              <Search
                className={`w-4 h-4 absolute left-3.5 pointer-events-none ${
                  isDark ? 'text-slate-500' : 'text-stone-400'
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowBookDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsert();
                  }
                }}
                onFocus={() => setShowBookDropdown(true)}
                placeholder="e.g. Matt 8 v 9, H867, G765, John 3:16"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-600 shadow-inner transition-colors ${
                  isDark
                    ? 'bg-slate-950 text-white placeholder:text-slate-500 border border-slate-700'
                    : 'bg-stone-100 text-stone-900 placeholder:text-stone-400 border border-stone-300'
                }`}
              />
            </div>

            {/* Live Book Suggestions Dropdown */}
            {showBookDropdown && bookSuggestions.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-1 z-30 border rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 divide-slate-800/80 text-slate-100'
                    : 'bg-white border-stone-200 divide-stone-100 text-stone-900'
                }`}
              >
                <div
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold ${
                    isDark ? 'text-slate-400 bg-slate-900/80' : 'text-stone-500 bg-stone-50'
                  }`}
                >
                  Book Suggestions
                </div>
                {bookSuggestions.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleSelectBook(book.name);
                    }}
                    onClick={() => handleSelectBook(book.name)}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition-colors ${
                      isDark
                        ? 'hover:bg-slate-800/90 text-slate-200'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <span className="font-bold">{book.name}</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      {book.testament} • {book.chaptersCount} chapters
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Validation Feedback Status Banner */}
          {validationResult.isValid ? (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-medium ${
                isDark
                  ? 'bg-emerald-950/70 border-emerald-800/90 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="overflow-hidden">
                <span className="font-bold">
                  {validationResult.isStrongs ? "Valid Strong's Concordance: " : 'Valid Reference: '}
                </span>
                <span className="underline font-mono">
                  {validationResult.displayName || validationResult.formatted}
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs ${
                isDark
                  ? 'bg-red-950/70 border-red-900/80 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{validationResult.error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <span
              className={`text-[11px] font-bold block mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-stone-500'
              }`}
            >
              Quick Verified Examples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'G353',
                'H4709',
                'H867',
                'G765',
                'Matt 8 v 9',
                'Daniel 5 v 10',
                'John 3:16',
                '1 Cor 13:4-8',
                'Ps 23:1-6',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setQuery(preset);
                    setShowBookDropdown(false);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  onClick={() => {
                    setQuery(preset);
                    setShowBookDropdown(false);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono border transition-colors ${
                    isDark
                      ? 'bg-slate-800 hover:bg-red-950/80 hover:text-red-300 hover:border-red-800 text-slate-300 border-slate-700'
                      : 'bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-stone-700 border-stone-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div
            className={`flex items-center justify-end gap-2 pt-3 border-t ${
              isDark ? 'border-slate-800' : 'border-stone-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult.isValid}
              onClick={handleInsert}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Insert Reference</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
