import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  PlusCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import {
  BibleSearchResult,
  SearchScope,
  searchBibleText,
  searchStrongsUsage,
  warmupSearchData,
} from '../services/bibleSearchService';
import { getBookNumber } from '../data/bibleData';

export interface StrongsSearchTarget {
  id: string;
  lemma?: string;
}

interface BibleSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: string;
  currentTranslation: string;
  onSelectVerse: (book: string, chapter: number, verse: number) => void;
  onInsertVerse?: (referenceText: string) => void;
  darkMode?: boolean;
  activeStrongsSearch?: StrongsSearchTarget | null;
  onClearStrongsSearch?: () => void;
  hasActiveSearchSession?: boolean;
  onResetSearchSession?: () => void;
  initialQuery?: string;
}

const VISIBLE_CHUNK_SIZE = 40;

// Memoized individual search result card to avoid re-rendering entire list on keypress
interface SearchResultCardProps {
  res: BibleSearchResult;
  query: string;
  allowPartialMatch?: boolean;
  activeStrongsSearch?: StrongsSearchTarget | null;
  currentTranslation: string;
  isCopied: boolean;
  isInserted: boolean;
  darkMode: boolean;
  onCopy: (res: BibleSearchResult, e: React.MouseEvent) => void;
  onInsert?: (res: BibleSearchResult, e: React.MouseEvent) => void;
  onSelect: (res: BibleSearchResult) => void;
}

const SearchResultCard = React.memo<SearchResultCardProps>(function SearchResultCard({
  res,
  query,
  allowPartialMatch = false,
  activeStrongsSearch,
  currentTranslation,
  isCopied,
  isInserted,
  darkMode,
  onCopy,
  onInsert,
  onSelect,
}) {
  const renderHighlighted = () => {
    // If Strong's search mode with detected translated English word
    if (activeStrongsSearch && res.matchedStrongsWord) {
      const escapedWord = res.matchedStrongsWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
      const parts = res.cleanText.split(regex);

      return (
        <span>
          {parts.map((part, i) => {
            if (part.toLowerCase() === res.matchedStrongsWord?.toLowerCase()) {
              return (
                <mark
                  key={i}
                  className="bg-amber-500/25 text-amber-900 dark:text-amber-200 font-bold px-1 py-0.5 rounded transition-colors"
                >
                  {part}
                </mark>
              );
            }
            return part;
          })}
        </span>
      );
    }

    // Regular keyword / phrase highlight
    const trimmed = query.trim();
    if (!trimmed) return <span>{res.cleanText}</span>;

    const isPhrase =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"));
    const rawTokens = isPhrase
      ? [trimmed.slice(1, -1).trim()]
      : trimmed.split(/\s+/).filter(Boolean);

    if (rawTokens.length === 0) return <span>{res.cleanText}</span>;

    const pattern = rawTokens
      .map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('|');
    const regex = allowPartialMatch
      ? new RegExp(`(${pattern})`, 'gi')
      : new RegExp(`\\b(${pattern})\\b`, 'gi');
    const parts = res.cleanText.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = rawTokens.some(
            (t) => t.toLowerCase() === part.toLowerCase()
          );
          if (isMatch) {
            return (
              <mark
                key={i}
                className="bg-red-500/20 text-red-900 dark:text-red-200 font-semibold px-0.5 py-0.2 rounded"
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect(res)}
      className={`group p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-text text-left relative ${
        darkMode
          ? 'bg-stone-900/80 hover:bg-stone-850 border-stone-800 hover:border-stone-700'
          : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300 shadow-2xs'
      }`}
    >
      {/* Card Header: Reference Badge & Inline Actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            {res.bookName} {res.chapter}:{res.verse}
          </span>

          {res.matchedStrongsWord && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Translated: &ldquo;{res.matchedStrongsWord}&rdquo;
            </span>
          )}
        </div>

        {/* Inline Actions (Copy / Insert) */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => onCopy(res, e)}
            className={`p-1.5 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
            title="Copy Verse"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {onInsert && (
            <button
              type="button"
              onClick={(e) => onInsert(res, e)}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs"
              title="Insert into Note"
            >
              {isInserted ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Verse Text Body */}
      <p className="text-xs sm:text-[13px] leading-relaxed text-stone-800 dark:text-stone-200">
        {renderHighlighted()}
      </p>
    </div>
  );
});

export const BibleSearchDrawer: React.FC<BibleSearchDrawerProps> = ({
  isOpen,
  onClose,
  currentBook,
  currentTranslation,
  onSelectVerse,
  onInsertVerse,
  darkMode = false,
  activeStrongsSearch,
  onClearStrongsSearch,
  hasActiveSearchSession,
  onResetSearchSession,
  initialQuery,
}) => {
  // Decoupled raw input state (immediate, 0ms lag) vs debounced search query
  const [inputVal, setInputVal] = useState<string>(() => initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>(() => initialQuery || '');

  const [scope, setScope] = useState<SearchScope>('ALL');
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(VISIBLE_CHUNK_SIZE);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [copiedVerseKey, setCopiedVerseKey] = useState<string | null>(null);
  const [insertedVerseKey, setInsertedVerseKey] = useState<string | null>(null);
  const [allowPartialMatch, setAllowPartialMatch] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelectedVerseRef = useRef<boolean>(false);

  const currentBookNum = useMemo(() => getBookNumber(currentBook), [currentBook]);

  // Synchronize initialQuery if passed from parent
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setInputVal(initialQuery);
      setDebouncedQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  // Focus input when opened ONLY for a fresh search.
  // When returning to view other search returns / verses, do NOT pop the keyboard up!
  useEffect(() => {
    if (isOpen) {
      warmupSearchData(currentTranslation);

      // If search session was dismissed outside (e.g. dismissed search banner), reset drawer for fresh search
      if (hasActiveSearchSession === false && justSelectedVerseRef.current) {
        justSelectedVerseRef.current = false;
        setInputVal('');
        setDebouncedQuery('');
        setResults([]);
      }

      const isReturningToResults =
        justSelectedVerseRef.current ||
        Boolean(hasActiveSearchSession) ||
        Boolean(activeStrongsSearch) ||
        inputVal.trim().length > 0 ||
        results.length > 0;

      if (!isReturningToResults) {
        // Fresh search: auto-focus input so keyboard comes up
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } else {
        // Returning to view existing search returns: explicitly blur so keyboard stays down
        if (inputRef.current) {
          inputRef.current.blur();
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    } else {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [isOpen, activeStrongsSearch, currentTranslation, hasActiveSearchSession]);

  // Reset visible count when results change
  useEffect(() => {
    setVisibleCount(VISIBLE_CHUNK_SIZE);
  }, [results]);

  // Instant input typing handler + debounced search update
  const handleInputChange = (val: string) => {
    justSelectedVerseRef.current = false;
    setInputVal(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      setResults([]);
      setIsSearching(false);
      setProgress(0);
      return;
    }

    // 250ms debounce: guarantees fluid 60fps typing while searching promptly when typing pauses
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 250);
  };

  // Handle Strong's Concordance occurrence search
  useEffect(() => {
    if (!isOpen || !activeStrongsSearch) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setProgress(0);
    setResults([]);

    searchStrongsUsage(
      activeStrongsSearch.id,
      scope,
      (pct, currentMatches) => {
        setProgress(pct);
        setResults(currentMatches);
      },
      controller.signal
    )
      .then((finalMatches) => {
        if (!controller.signal.aborted) {
          setResults(finalMatches);
          setIsSearching(false);
          setProgress(100);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, activeStrongsSearch, scope]);

  // Handle regular text search based on debouncedQuery
  useEffect(() => {
    if (!isOpen || activeStrongsSearch) return;

    const trimmed = debouncedQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setProgress(0);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setProgress(0);

    searchBibleText(
      trimmed,
      currentTranslation,
      scope,
      currentBookNum,
      (pct, currentMatches) => {
        setProgress(pct);
        setResults(currentMatches);
      },
      controller.signal,
      allowPartialMatch
    )
      .then((finalMatches) => {
        if (!controller.signal.aborted) {
          setResults(finalMatches);
          setIsSearching(false);
          setProgress(100);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, scope, currentTranslation, currentBookNum, isOpen, activeStrongsSearch, allowPartialMatch]);

  const handleCopy = useCallback((res: BibleSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const verseKey = `${res.bookName}-${res.chapter}-${res.verse}`;
    const textToCopy = `${res.cleanText} (${res.bookName} ${res.chapter}:${res.verse} ${
      currentTranslation === 'KJV_STRONGS' ? 'KJV' : currentTranslation
    })`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedVerseKey(verseKey);
    setTimeout(() => setCopiedVerseKey(null), 2000);
  }, [currentTranslation]);

  const handleInsert = useCallback((res: BibleSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onInsertVerse) return;
    const verseKey = `${res.bookName}-${res.chapter}-${res.verse}`;
    const textToInsert = `"${res.cleanText}" — ${res.bookName} ${res.chapter}:${res.verse} (${
      currentTranslation === 'KJV_STRONGS' ? 'KJV' : currentTranslation
    })`;
    onInsertVerse(textToInsert);
    setInsertedVerseKey(verseKey);
    setTimeout(() => setInsertedVerseKey(null), 2000);
  }, [onInsertVerse, currentTranslation]);

  const handleCloseDrawer = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  }, [onClose]);

  const handleSelectVerse = useCallback((res: BibleSearchResult) => {
    justSelectedVerseRef.current = true;
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSelectVerse(res.bookName, res.chapter, res.verse);
    onClose();
  }, [onSelectVerse, onClose]);

  if (!isOpen) return null;

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = results.length > visibleCount;

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col backdrop-blur-md animate-in fade-in duration-150 ${
        darkMode ? 'bg-stone-950/98 text-stone-100' : 'bg-white/98 text-stone-900'
      }`}
    >
      {/* Top Header Row */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
          darkMode ? 'border-stone-800 bg-stone-900/90' : 'border-stone-200 bg-stone-50/90'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Scripture Search</h2>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
              {activeStrongsSearch
                ? `Strong's ${activeStrongsSearch.id} Concordance Occurrences`
                : `Searching in ${
                    currentTranslation === 'KJV_STRONGS' ? 'KJV#' : currentTranslation
                  }`}
            </p>
          </div>
        </div>

        {/* Close Drawer Button */}
        <button
          type="button"
          onClick={handleCloseDrawer}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            darkMode
              ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
              : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300 shadow-2xs'
          }`}
          title="Close Search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Strong's Usage Banner (If in Concordance mode) */}
      {activeStrongsSearch && (
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 ${
            darkMode
              ? 'bg-amber-950/30 border-amber-900/40 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-600 text-white shrink-0">
              {activeStrongsSearch.id}
            </span>
            <span className="text-xs font-semibold truncate">
              {activeStrongsSearch.lemma ? (
                <>
                  <span className="italic">{activeStrongsSearch.lemma}</span>
                  <span className="opacity-75 mx-1.5">•</span>
                </>
              ) : null}
              {isSearching ? 'Scanning occurrences...' : `${results.length} occurrences in KJV#`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onClearStrongsSearch) onClearStrongsSearch();
              setResults([]);
            }}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-amber-500/20 transition-colors shrink-0 flex items-center gap-1"
            title="Switch to Text Search"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Search Input Bar (Hidden in Concordance mode to avoid clutter) */}
      {!activeStrongsSearch && (
        <div className="p-3 sm:px-4 border-b border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder='Search words or "exact phrases" (e.g. faith works, "living water")...'
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border outline-none transition-colors ${
                darkMode
                  ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder-stone-500 focus:border-red-500'
                  : 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-red-500 focus:bg-white'
              }`}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  justSelectedVerseRef.current = false;
                  handleInputChange('');
                  onResetSearchSession?.();
                  requestAnimationFrame(() => {
                    inputRef.current?.focus();
                  });
                }}
                className="absolute right-2.5 p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scope Filters and Partial Match Switch */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mr-0.5">
                Scope:
              </span>
              {(
                [
                  { id: 'ALL', label: 'All', title: 'Entire Bible' },
                  { id: 'OT', label: 'OT', title: 'Old Testament' },
                  { id: 'NT', label: 'NT', title: 'New Testament' },
                  { id: 'BOOK', label: currentBook, title: `Current Book (${currentBook})` },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  title={s.title}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    scope === s.id
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : darkMode
                      ? 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Partial Match Toggle Switch (Default: OFF) */}
            <div
              onClick={() => setAllowPartialMatch((prev) => !prev)}
              className="flex items-center gap-2 cursor-pointer select-none py-0.5 px-1 rounded-lg transition-colors hover:opacity-90 shrink-0"
              title="When OFF (default): Searches for exact whole words only (e.g. 'as' will not match 'has'). When ON: Searches for partial matches/substrings (e.g. 'pray' matches 'prayer')."
            >
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                Partial match
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={allowPartialMatch}
                onClick={(e) => {
                  e.stopPropagation();
                  setAllowPartialMatch((prev) => !prev);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowPartialMatch
                    ? 'bg-red-600'
                    : darkMode
                    ? 'bg-stone-700'
                    : 'bg-stone-300'
                }`}
                title={
                  allowPartialMatch
                    ? 'Partial match ON: matches parts of words'
                    : 'Partial match OFF: matches exact whole words only'
                }
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    allowPartialMatch ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar (when scanning across books) */}
      {isSearching && (
        <div className="w-full bg-stone-200 dark:bg-stone-800 h-1 overflow-hidden shrink-0">
          <div
            className="bg-red-600 h-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results List / Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 overscroll-contain">
        {/* Loading Spinner State */}
        {isSearching && results.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-xs font-medium">
              {activeStrongsSearch
                ? `Scanning Scripture for Strong's ${activeStrongsSearch.id}...`
                : `Searching ${
                    currentTranslation === 'KJV_STRONGS' ? 'KJV#' : currentTranslation
                  } (${progress}%)...`}
            </p>
          </div>
        )}

        {/* Empty State when no query entered */}
        {!isSearching && !activeStrongsSearch && !inputVal.trim() && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Search the Scriptures</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 max-w-sm mt-1">
                Type words to find verses containing all of them (e.g.{' '}
                <span className="font-mono text-red-500">peace surpasses</span>), or use quotes for
                exact phrases (e.g.{' '}
                <span className="font-mono text-red-500">&quot;living water&quot;</span>).
              </p>
            </div>
          </div>
        )}

        {/* Short query hint */}
        {!isSearching && !activeStrongsSearch && inputVal.trim().length === 1 && (
          <div className="py-12 text-center text-stone-400 px-4">
            <p className="text-xs font-medium">Please type at least 2 characters to search...</p>
          </div>
        )}

        {/* No Results Found */}
        {!isSearching &&
          ((inputVal.trim().length >= 2 && debouncedQuery.trim().length >= 2) ||
            activeStrongsSearch) &&
          results.length === 0 && (
            <div className="py-16 text-center text-stone-400 px-4">
              <p className="text-sm font-semibold">No matching verses found</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Try checking your spelling, using fewer keywords, or broadening the scope filter.
              </p>
            </div>
          )}

        {/* Results Header Counter */}
        {results.length > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 dark:text-stone-500 px-1 pb-1">
            <span>
              {results.length} {results.length === 1 ? 'verse' : 'verses'} found
              {isSearching ? ` (searching... ${progress}%)` : ''}
            </span>
            <span className="text-[10px] uppercase font-semibold">Tap verse to view in chapter</span>
          </div>
        )}

        {/* Results Items */}
        {visibleResults.map((res) => {
          const verseKey = `${res.bookName}-${res.chapter}-${res.verse}`;
          return (
            <SearchResultCard
              key={verseKey}
              res={res}
              query={debouncedQuery}
              allowPartialMatch={allowPartialMatch}
              activeStrongsSearch={activeStrongsSearch}
              currentTranslation={currentTranslation}
              isCopied={copiedVerseKey === verseKey}
              isInserted={insertedVerseKey === verseKey}
              darkMode={darkMode}
              onCopy={handleCopy}
              onInsert={onInsertVerse ? handleInsert : undefined}
              onSelect={handleSelectVerse}
            />
          );
        })}

        {/* Show More Button if results exceed visible chunk */}
        {hasMore && (
          <div className="pt-2 pb-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + VISIBLE_CHUNK_SIZE)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                darkMode
                  ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-800'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
              }`}
            >
              Show More ({results.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
