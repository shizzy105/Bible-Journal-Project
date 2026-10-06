import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  CornerUpLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Copy,
  Check,
  PlusCircle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BIBLE_BOOKS,
  getMaxVersesForChapter,
  getBibleVersesSync,
  fetchBibleVersesAsync,
  prefetchAdjacentBooks,
  sanitizeVerseText,
} from '../data/bibleData';
import { BibleVerse } from '../types/journal';
import {
  getEnabledTranslations,
  getStoredTranslation,
  setStoredTranslation,
  getStoredRefFormat,
  getStoredBiblePosition,
  setStoredBiblePosition,
} from '../services/storage';
import { BOOK_SHORT_NAMES, formatVerseRanges } from '../utils/bibleParser';

import { StrongsConcordancePopup } from './StrongsConcordancePopup';
import { ConcordanceVerseRenderer } from './ConcordanceVerseRenderer';
import { BibleSearchDrawer, StrongsSearchTarget } from './BibleSearchDrawer';

const ALL_POSSIBLE_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)' },
  { id: 'KJV_STRONGS', name: "King James Version with Strong's Concordance" },
  { id: 'YOR', name: 'Bíbélì Mímọ́ (Yoruba)' },
  { id: 'NKJV', name: 'New King James Version (NKJV)' },
  { id: 'ESV', name: 'English Standard Version (ESV)' },
  { id: 'WEB', name: 'World English Bible (WEB)' },
  { id: 'NIV', name: 'New International Version (NIV)' },
  { id: 'NLT', name: 'New Living Translation (NLT)' },
];

interface QuickBibleReaderModalProps {
  onClose: () => void;
  onInsertChip: (chipText: string) => void;
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  initialSelectedVerses?: number[];
  initialTranslation?: string;
  initialSearchQuery?: string;
  initialStrongsSearch?: StrongsSearchTarget;
  darkMode?: boolean;
}

export const QuickBibleReaderModal: React.FC<QuickBibleReaderModalProps> = ({
  onClose,
  onInsertChip,
  initialBook,
  initialChapter,
  initialVerse,
  initialSelectedVerses,
  initialTranslation,
  initialSearchQuery,
  initialStrongsSearch,
  darkMode = false,
}) => {
  // Navigation State - restore last read position so inserting text and returning maintains exact place
  const [selectedBook, setSelectedBook] = useState<string>(() => {
    if (initialBook) return initialBook;
    const pos = getStoredBiblePosition();
    return pos.book || 'Matthew';
  });
  const [selectedChapter, setSelectedChapter] = useState<number>(() => {
    if (initialChapter && initialChapter > 0) return initialChapter;
    const pos = getStoredBiblePosition();
    return pos.chapter || 5;
  });
  const [availableTranslations, setAvailableTranslations] = useState<string[]>(() => {
    const enabled = getEnabledTranslations();
    return enabled.length > 0 ? enabled : ['KJV', 'KJV_STRONGS', 'ESV'];
  });
  const [selectedTranslation, setSelectedTranslation] = useState<string>(() => {
    if (initialTranslation) return initialTranslation;
    const savedTrans = getStoredTranslation();
    const enabled = getEnabledTranslations();
    const list = enabled.length > 0 ? enabled : ['KJV', 'KJV_STRONGS', 'ESV'];
    return list.includes(savedTrans) ? savedTrans : list[0] || 'KJV_STRONGS';
  });

  // Target verse to scroll to (from search results, initialSelectedVerses, or initialVerse)
  const [targetScrollVerse, setTargetScrollVerse] = useState<number | null>(() => {
    if (initialSelectedVerses && initialSelectedVerses.length > 0) {
      return initialSelectedVerses[0];
    }
    return initialVerse && initialVerse > 0 ? initialVerse : null;
  });

  // Search Drawer State & persistent results session
  const [showSearchDrawer, setShowSearchDrawer] = useState<boolean>(() => {
    return Boolean(initialSearchQuery || initialStrongsSearch);
  });
  const [activeStrongsSearch, setActiveStrongsSearch] = useState<StrongsSearchTarget | null>(() => {
    return initialStrongsSearch || null;
  });
  const [hasActiveSearchSession, setHasActiveSearchSession] = useState<boolean>(() => {
    return Boolean(initialSearchQuery || initialStrongsSearch);
  });

  // Save Bible reading position whenever book or chapter changes
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      setStoredBiblePosition(selectedBook, selectedChapter);
    }
  }, [selectedBook, selectedChapter]);

  // Verse Selection State (for selecting a specific verse or verse range)
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  // Content state
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeStrongsId, setActiveStrongsId] = useState<string | null>(null);

  // Book picker overlay state
  const [showBookPicker, setShowBookPicker] = useState<boolean>(false);
  const [showChapterPicker, setShowChapterPicker] = useState<boolean>(false);
  const [showTranslationPicker, setShowTranslationPicker] = useState<boolean>(false);
  const [bookSearch, setBookSearch] = useState<string>('');
  const [bookTab, setBookTab] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Current Book Object
  const currentBookObj = useMemo(() => {
    return BIBLE_BOOKS.find((b) => b.name.toLowerCase() === selectedBook.toLowerCase()) || BIBLE_BOOKS[0];
  }, [selectedBook]);

  const maxVerses = useMemo(() => {
    return getMaxVersesForChapter(currentBookObj.name, selectedChapter);
  }, [currentBookObj, selectedChapter]);

  // Track previous position to know if only translation changed vs book/chapter
  const prevBookRef = useRef<string>(currentBookObj.name);
  const prevChapterRef = useRef<number>(selectedChapter);
  const prevTranslationRef = useRef<string>(selectedTranslation);
  const preservedVerseRef = useRef<number | null>(
    initialSelectedVerses && initialSelectedVerses.length > 0
      ? initialSelectedVerses[0]
      : initialVerse && initialVerse > 0
      ? initialVerse
      : null
  );

  // If opened with initialVerse or initialSelectedVerses, auto-highlight it
  useEffect(() => {
    if (initialSelectedVerses && initialSelectedVerses.length > 0) {
      setSelectedVerses(initialSelectedVerses);
    } else if (initialVerse && initialVerse > 0) {
      setSelectedVerses([initialVerse]);
    }
  }, [initialVerse, initialSelectedVerses]);

  // Calculate the currently visible verse near the top of the reader scrollport
  const getTopVisibleVerse = (): number => {
    if (!contentScrollRef.current) return 1;
    const container = contentScrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const verseElements = container.querySelectorAll<HTMLElement>('[data-verse]');

    for (let i = 0; i < verseElements.length; i++) {
      const el = verseElements[i];
      const rect = el.getBoundingClientRect();
      // If the verse bottom is below the top padding/header line
      if (rect.bottom >= containerRect.top + 20) {
        const vNum = parseInt(el.getAttribute('data-verse') || '1', 10);
        if (!isNaN(vNum) && vNum > 0) {
          return vNum;
        }
      }
    }
    return 1;
  };

  // Scroll smoothly/instantly to a specific verse
  const scrollToVerse = (verseNum: number, behavior: ScrollBehavior = 'auto') => {
    if (!contentScrollRef.current || !verseNum || verseNum <= 1) {
      if (contentScrollRef.current && verseNum === 1) {
        contentScrollRef.current.scrollTop = 0;
      }
      return;
    }
    const container = contentScrollRef.current;
    const verseEl = container.querySelector<HTMLElement>(`[data-verse="${verseNum}"]`);
    if (verseEl) {
      const containerRect = container.getBoundingClientRect();
      const verseRect = verseEl.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (verseRect.top - containerRect.top) - 12;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior,
      });
    }
  };

  // Load translations preference on mount
  useEffect(() => {
    const enabled = getEnabledTranslations();
    const list = enabled.length > 0 ? enabled : ['KJV'];
    setAvailableTranslations(list);

    if (!initialTranslation) {
      const savedTrans = getStoredTranslation();
      if (list.includes(savedTrans)) {
        setSelectedTranslation(savedTrans);
      } else if (list.length > 0) {
        setSelectedTranslation(list[0]);
      }
    }
  }, [initialTranslation]);

  // Open concordance search in KJV# translation
  const handleOpenConcordanceSearch = (strongsId: string, lemma?: string) => {
    setSelectedTranslation('KJV_STRONGS');
    setActiveStrongsId(null);
    setActiveStrongsSearch({ id: strongsId, lemma });
    setShowSearchDrawer(true);
    setHasActiveSearchSession(true);
  };

  // Lock body and background scrolling while QuickBibleReaderModal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
    };
  }, []);

  // Dismiss any mobile software keyboard so the Bible reader occupies the full screen view
  useEffect(() => {
    const dismissKeyboard = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && typeof activeEl.blur === 'function') {
        activeEl.blur();
      }
      const editables = document.querySelectorAll<HTMLElement>('input, textarea, [contenteditable="true"]');
      editables.forEach((el) => {
        try {
          el.blur();
        } catch {
          // ignore
        }
      });
    };

    dismissKeyboard();
    const timer1 = setTimeout(dismissKeyboard, 40);
    const timer2 = setTimeout(dismissKeyboard, 120);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleClose = () => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && typeof activeEl.blur === 'function') {
      activeEl.blur();
    }
    onClose();
  };

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearchDrawer) {
          setShowSearchDrawer(false);
        } else if (showBookPicker) {
          setShowBookPicker(false);
        } else if (showChapterPicker) {
          setShowChapterPicker(false);
        } else if (showTranslationPicker) {
          setShowTranslationPicker(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSearchDrawer, showBookPicker, showChapterPicker, showTranslationPicker]);

  // Fetch Verses when book, chapter, or translation changes
  useEffect(() => {
    let isMounted = true;

    const isChapterChange =
      prevBookRef.current !== currentBookObj.name || prevChapterRef.current !== selectedChapter;
    const isTranslationChange = prevTranslationRef.current !== selectedTranslation;

    prevBookRef.current = currentBookObj.name;
    prevChapterRef.current = selectedChapter;
    prevTranslationRef.current = selectedTranslation;

    if (isChapterChange) {
      setSelectedVerses([]); // reset verse selection when changing chapter
      preservedVerseRef.current = null;
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
      }
    } else if (isTranslationChange && preservedVerseRef.current === null) {
      // Capture the verse before translation switch
      preservedVerseRef.current = getTopVisibleVerse();
    }

    // 1. Instantaneous in-memory cache lookup (0ms render!)
    const syncVerses = getBibleVersesSync(
      currentBookObj.name,
      selectedChapter,
      1,
      maxVerses,
      selectedTranslation
    );

    if (syncVerses && syncVerses.length > 0) {
      setVerses(syncVerses);
      setLoading(false);
      // Pre-load adjacent books quietly in background for zero-lag navigation
      prefetchAdjacentBooks(currentBookObj.name, selectedTranslation);
      if (syncVerses.length >= maxVerses) {
        return;
      }
    } else {
      setLoading(true);
    }

    // 2. Fetch full real scripture text (from local bundled JSON or online fallback)
    fetchBibleVersesAsync(
      currentBookObj.name,
      selectedChapter,
      1,
      maxVerses,
      selectedTranslation
    )
      .then((asyncVerses) => {
        if (isMounted) {
          if (asyncVerses && asyncVerses.length > 0) {
            setVerses(asyncVerses);
          }
          setLoading(false);
          // Prefetch adjacent books once loaded
          prefetchAdjacentBooks(currentBookObj.name, selectedTranslation);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentBookObj.name, selectedChapter, selectedTranslation, maxVerses]);

  // Restore preserved or target verse position when new verses are loaded
  useEffect(() => {
    if (targetScrollVerse !== null && verses.length > 0) {
      const v = targetScrollVerse;
      requestAnimationFrame(() => {
        scrollToVerse(v);
        setSelectedVerses([v]);
        const timer = setTimeout(() => {
          scrollToVerse(v);
          setTargetScrollVerse(null);
        }, 80);
        return () => clearTimeout(timer);
      });
    } else if (preservedVerseRef.current !== null && verses.length > 0) {
      const v = preservedVerseRef.current;
      requestAnimationFrame(() => {
        scrollToVerse(v);
        // Secondary timeout to account for dynamic text flow / font rendering
        const timer = setTimeout(() => {
          scrollToVerse(v);
          preservedVerseRef.current = null;
        }, 60);
        return () => clearTimeout(timer);
      });
    }
  }, [verses, targetScrollVerse]);

  // Helper to know if previous or next chapter exists
  const canGoPrev = useMemo(() => {
    if (selectedChapter > 1) return true;
    const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === currentBookObj.id);
    return bookIndex > 0;
  }, [selectedChapter, currentBookObj.id]);

  const canGoNext = useMemo(() => {
    if (selectedChapter < currentBookObj.chaptersCount) return true;
    const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === currentBookObj.id);
    return bookIndex < BIBLE_BOOKS.length - 1;
  }, [selectedChapter, currentBookObj.chaptersCount, currentBookObj.id]);

  // Handle Chapter Step (Prev / Next)
  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter((prev) => prev - 1);
    } else {
      // Go to previous book if available
      const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === currentBookObj.id);
      if (bookIndex > 0) {
        const prevBook = BIBLE_BOOKS[bookIndex - 1];
        setSelectedBook(prevBook.name);
        setSelectedChapter(prevBook.chaptersCount);
      }
    }
  };

  const handleNextChapter = () => {
    if (selectedChapter < currentBookObj.chaptersCount) {
      setSelectedChapter((prev) => prev + 1);
    } else {
      // Go to next book if available
      const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === currentBookObj.id);
      if (bookIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[bookIndex + 1];
        setSelectedBook(nextBook.name);
        setSelectedChapter(1);
      }
    }
  };

  // Toggle individual verse in or out of selection (supports multiple non-continuous verses)
  const handleVerseClick = (verseNum: number) => {
    setSelectedVerses((prev) => {
      if (prev.includes(verseNum)) {
        return prev.filter((v) => v !== verseNum);
      } else {
        return [...prev, verseNum].sort((a, b) => a - b);
      }
    });
  };

  // Build Reference Text (e.g. "Esther 1 v 2, 4" or "Matt 5 v 7-20")
  const currentRefString = useMemo(() => {
    const isShort = getStoredRefFormat() === 'short';
    const bookDisp = isShort ? (BOOK_SHORT_NAMES[currentBookObj.name] || currentBookObj.name) : currentBookObj.name;

    if (selectedVerses.length === 0) {
      return `${bookDisp} ${selectedChapter}`;
    }
    const verseRangeStr = formatVerseRanges(selectedVerses);
    return `${bookDisp} ${selectedChapter} v ${verseRangeStr}`;
  }, [currentBookObj.name, selectedChapter, selectedVerses]);

  // Selected verses content
  const activeVersesList = useMemo(() => {
    if (selectedVerses.length === 0) {
      return verses;
    }
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    return verses.filter((v) => sorted.includes(v.verse));
  }, [verses, selectedVerses]);

  const activeVersesText = useMemo(() => {
    return activeVersesList.map((v) => `${v.verse}. ${sanitizeVerseText(v.text, false)}`).join('\n');
  }, [activeVersesList]);

  // Actions
  const handleCopy = () => {
    const translationLabel = selectedTranslation === 'KJV_STRONGS' ? 'KJV' : selectedTranslation;
    const textToCopy = `"${activeVersesText.trim()}"\n— ${currentRefString} (${translationLabel})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertChip = () => {
    onInsertChip(currentRefString);
    onClose();
  };

  // Filtered Books for Book Picker
  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return BIBLE_BOOKS.filter((book) => {
      if (bookTab === 'OT' && book.testament !== 'OT') return false;
      if (bookTab === 'NT' && book.testament !== 'NT') return false;
      if (!q) return true;
      return (
        book.name.toLowerCase().includes(q) ||
        book.abbreviations.some((abbr) => abbr.toLowerCase().includes(q))
      );
    });
  }, [bookSearch, bookTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Main Reader Dialog */}
      <div
        className={`relative w-full max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 h-[92dvh] max-h-[92dvh] sm:h-auto sm:max-h-[85vh] flex flex-col border transition-colors ${
          darkMode
            ? 'bg-stone-900 border-stone-800 text-stone-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-stone-500/30 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Top App Bar with Translation, Book & Chapter Controls */}
        <div
          className={`px-3 sm:px-5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            darkMode ? 'bg-stone-900/95 border-stone-800' : 'bg-stone-50/95 border-stone-200'
          }`}
        >
          {/* Left: Translation -> Book -> Chapter Navigator (Single clean compact horizontal row without wrapping) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap min-w-0 overflow-x-auto no-scrollbar py-0.5">
            {/* 1. Translation Trigger Pill */}
            <button
              type="button"
              onClick={() => {
                preservedVerseRef.current = getTopVisibleVerse();
                setShowTranslationPicker((prev) => !prev);
                setShowBookPicker(false);
                setShowChapterPicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-all border shrink-0 ${
                showTranslationPicker
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-red-400 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-red-700 border-stone-300 shadow-2xs'
              }`}
              title="Switch Translation"
            >
              <span className="truncate max-w-[75px] sm:max-w-none">
                {selectedTranslation === 'KJV_STRONGS' ? 'KJV#' : selectedTranslation}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform opacity-75 shrink-0 ${
                  showTranslationPicker ? 'rotate-180 text-white' : 'text-red-400'
                }`}
              />
            </button>

            {/* 2. Book Selector Pill */}
            <button
              type="button"
              onClick={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                setShowBookPicker((prev) => !prev);
                setShowChapterPicker(false);
                setShowTranslationPicker(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-all border shrink-0 ${
                showBookPicker
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-100 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-stone-900 border-stone-300 shadow-2xs'
              }`}
              title="Select Bible Book"
            >
              <span className="truncate max-w-[100px] sm:max-w-[150px]">{currentBookObj.name}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform opacity-75 shrink-0 ${
                  showBookPicker ? 'rotate-180 text-white' : 'text-stone-400'
                }`}
              />
            </button>

            {/* 3. Compact Chapter Selector Pill */}
            <button
              type="button"
              onClick={() => {
                setShowChapterPicker((prev) => !prev);
                setShowBookPicker(false);
                setShowTranslationPicker(false);
                setShowSearchDrawer(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs transition-all border shrink-0 ${
                showChapterPicker
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-100 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-stone-900 border-stone-300 shadow-2xs'
              }`}
              title="Select Chapter"
            >
              <span className="tabular-nums">{selectedChapter}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform opacity-75 shrink-0 ${
                  showChapterPicker ? 'rotate-180 text-white' : 'text-stone-400'
                }`}
              />
            </button>
          </div>

          {/* Right: Search & Return to Note */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 4. Scripture Search Button */}
            <button
              type="button"
              onClick={() => {
                if (showSearchDrawer && document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                setShowSearchDrawer((prev) => !prev);
                setShowBookPicker(false);
                setShowChapterPicker(false);
                setShowTranslationPicker(false);
              }}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 flex items-center justify-center ${
                showSearchDrawer
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300 shadow-2xs'
              }`}
              title="Search Scripture words, phrases & concordance occurrences"
              aria-label="Search Scripture"
            >
              <Search
                className={`w-[18px] h-[18px] transition-colors shrink-0 ${
                  showSearchDrawer ? 'text-white' : 'text-stone-500 dark:text-stone-300 hover:text-red-500'
                }`}
              />
            </button>

            {/* Return to Note Button */}
            <button
              type="button"
              onClick={handleClose}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 flex items-center justify-center ${
                darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300 shadow-2xs'
              }`}
              title="Return to Note (Esc)"
              aria-label="Return to Note"
            >
              <CornerUpLeft className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Reopen Search Banner (allows user to easily go back to search results after tapping a verse) */}
        {hasActiveSearchSession && !showSearchDrawer && (
          <div
            className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
              darkMode
                ? 'bg-red-950/40 hover:bg-red-900/60 border-red-900/40 text-red-300'
                : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
            }`}
            onClick={() => {
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
              setShowSearchDrawer(true);
            }}
            title="Click to reopen search results"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {activeStrongsSearch
                  ? `Strong's ${activeStrongsSearch.id} results`
                  : 'Search Results'}{' '}
                — Tap to view other search verses
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHasActiveSearchSession(false);
                setActiveStrongsSearch(null);
              }}
              className="p-1 rounded hover:bg-red-200/50 dark:hover:bg-red-900/80 transition-colors shrink-0"
              title="Dismiss search banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Book Picker Popover / Drawer */}
        {showBookPicker && (
          <div
            className={`p-3.5 sm:p-4 border-b flex flex-col gap-3 shadow-inner animate-in fade-in duration-150 ${
              darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-100 border-stone-200'
            }`}
          >
            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Select Book
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  • 66 Books
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBookPicker(false);
                  setBookSearch('');
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                title="Close book picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input and Testament Tabs */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Search 66 books (e.g. Genesis, Matt, Dan)..."
                  className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                    darkMode
                      ? 'bg-stone-900 border-stone-700 text-stone-100 placeholder-stone-500'
                      : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400'
                  }`}
                />
              </div>

              <div
                className={`flex rounded-xl p-0.5 border text-xs font-bold shrink-0 ${
                  darkMode ? 'bg-stone-900 border-stone-700' : 'bg-white border-stone-300'
                }`}
              >
                {(['ALL', 'OT', 'NT'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setBookTab(tab)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      bookTab === tab
                        ? 'bg-red-600 text-white shadow-2xs'
                        : darkMode
                        ? 'text-stone-400 hover:text-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Books Grid: 2 columns on mobile for full readable names, scaling up on larger screens */}
            <div className="max-h-[50vh] sm:max-h-80 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-1 overscroll-contain">
              {filteredBooks.map((book) => {
                const isCurrent = book.id === currentBookObj.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                      setSelectedBook(book.name);
                      setSelectedChapter(1);
                      setShowBookPicker(false);
                      setBookSearch('');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-left transition-all border flex items-center justify-between gap-1.5 active:scale-[0.98] ${
                      isCurrent
                        ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-500/30'
                        : darkMode
                        ? 'bg-stone-900 hover:bg-stone-800 text-stone-100 border-stone-800 hover:border-stone-700'
                        : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 hover:border-stone-300 shadow-2xs'
                    }`}
                    title={`${book.name} (${book.chaptersCount} chapters)`}
                  >
                    <span className="truncate flex-1 font-semibold">{book.name}</span>
                    <span
                      className={`text-[10px] tabular-nums shrink-0 font-normal ${
                        isCurrent ? 'text-red-100' : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {book.chaptersCount}ch
                    </span>
                  </button>
                );
              })}

              {filteredBooks.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-stone-400 dark:text-stone-500 font-medium">
                  No Bible books matching "{bookSearch}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chapter Picker Popover / Drawer */}
        {showChapterPicker && (
          <div
            className={`p-4 border-b flex flex-col gap-3 shadow-inner animate-in fade-in duration-150 ${
              darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-100 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  {currentBookObj.name} Chapters
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  • {currentBookObj.chaptersCount} {currentBookObj.chaptersCount === 1 ? 'Chapter' : 'Chapters'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterPicker(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                title="Close chapter picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chapters Grid */}
            <div className="max-h-52 overflow-y-auto grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 p-1 overscroll-contain">
              {Array.from({ length: currentBookObj.chaptersCount }, (_, i) => i + 1).map((ch) => {
                const isCurrent = ch === selectedChapter;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChapter(ch);
                      setShowChapterPicker(false);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all border ${
                      isCurrent
                        ? 'bg-red-600 text-white border-red-600 shadow-xs scale-105 ring-2 ring-red-500/40'
                        : darkMode
                        ? 'bg-stone-900 hover:bg-stone-800 hover:border-stone-700 text-stone-200 border-stone-800/80 active:scale-95'
                        : 'bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-800 border-stone-200 active:scale-95 shadow-2xs'
                    }`}
                    title={`Chapter ${ch}`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Translation Picker Popover / Drawer */}
        {showTranslationPicker && (
          <div
            className={`p-4 border-b flex flex-col gap-3 shadow-inner animate-in fade-in duration-150 ${
              darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-100 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                Bible Translations
              </span>
              <button
                type="button"
                onClick={() => setShowTranslationPicker(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                title="Close translation picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Translations List Grid */}
            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 overscroll-contain">
              {ALL_POSSIBLE_TRANSLATIONS.filter((t) => availableTranslations.includes(t.id)).map((t) => {
                const isCurrent = t.id === selectedTranslation;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      preservedVerseRef.current = getTopVisibleVerse();
                      setSelectedTranslation(t.id);
                      setStoredTranslation(t.id);
                      setShowTranslationPicker(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all border ${
                      isCurrent
                        ? 'bg-red-600/10 border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 font-bold shadow-2xs'
                        : darkMode
                        ? 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-stone-700'
                        : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 hover:border-stone-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {t.id === 'KJV_STRONGS' ? "KJV (Strong's)" : t.id}
                        {t.id === 'KJV_STRONGS' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold uppercase">
                            Strong&apos;s #
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                        {t.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <Check className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Context Banner: Active Book & Chapter info */}
        <div
          className={`px-4 sm:px-6 py-2 border-b flex items-center justify-between text-xs ${
            darkMode ? 'bg-stone-950/70 border-stone-800/80 text-stone-400' : 'bg-stone-100/70 border-stone-200 text-stone-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-red-600 dark:text-red-400">
              {currentBookObj.name} {selectedChapter}
            </span>
            <span>•</span>
            <span>{maxVerses} Verses</span>
            <span>•</span>
            <span>{selectedTranslation === 'KJV_STRONGS' ? 'KJV#' : selectedTranslation}</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedVerses.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 dark:text-red-400 font-semibold">
                  {selectedVerses.length} verse{selectedVerses.length > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVerses([])}
                  className="underline hover:text-red-600 ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-[11px] opacity-75 hidden sm:inline">
                Tap any verse to select/quote specific lines
              </span>
            )}
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />}
          </div>
        </div>

        {/* Verses Scrollable Area with Middle-Edge Chapter Navigation Arrows */}
        <div className="relative flex-1 min-h-[220px] flex flex-col overflow-hidden">
          {/* Left Middle Edge Chapter Navigation Arrow */}
          <button
            type="button"
            onClick={handlePrevChapter}
            disabled={!canGoPrev}
            className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all active:scale-90 ${
              !canGoPrev
                ? 'opacity-0 pointer-events-none'
                : darkMode
                ? 'bg-stone-800/90 hover:bg-stone-700 text-stone-100 border-stone-700 hover:border-red-500/50 shadow-black/50'
                : 'bg-white/95 hover:bg-stone-50 text-stone-800 border-stone-200 hover:border-red-300 shadow-stone-400/30'
            }`}
            title="Go to previous chapter"
            aria-label="Previous chapter"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
          </button>

          {/* Right Middle Edge Chapter Navigation Arrow */}
          <button
            type="button"
            onClick={handleNextChapter}
            disabled={!canGoNext}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all active:scale-90 ${
              !canGoNext
                ? 'opacity-0 pointer-events-none'
                : darkMode
                ? 'bg-stone-800/90 hover:bg-stone-700 text-stone-100 border-stone-700 hover:border-red-500/50 shadow-black/50'
                : 'bg-white/95 hover:bg-stone-50 text-stone-800 border-stone-200 hover:border-red-300 shadow-stone-400/30'
            }`}
            title="Go to next chapter"
            aria-label="Next chapter"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
          </button>

          {/* Verses Scroll Container */}
          <div
            ref={contentScrollRef}
            className="p-4 sm:p-6 px-10 sm:px-14 overflow-y-auto space-y-2.5 font-serif leading-relaxed text-base sm:text-lg flex-1 overscroll-contain"
          >
            {loading && verses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400 space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                <p className="text-sm font-sans">
                  Loading {currentBookObj.name} {selectedChapter} ({selectedTranslation})...
                </p>
              </div>
            ) : (
              verses.map((v) => {
                const isSelected = selectedVerses.includes(v.verse);
                return (
                  <div
                    key={v.verse}
                    id={`quick-bible-verse-${v.verse}`}
                    data-verse={v.verse}
                    onClick={() => handleVerseClick(v.verse)}
                    className={`flex gap-3 items-baseline p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? darkMode
                          ? 'bg-red-950/60 border border-red-800 text-stone-100 shadow-sm'
                          : 'bg-red-50 border border-red-200 text-stone-900 shadow-2xs'
                        : darkMode
                        ? 'hover:bg-stone-800/60 text-stone-200 border border-transparent'
                        : 'hover:bg-stone-100/70 text-stone-800 border border-transparent'
                    }`}
                  >
                    <span
                      className={`text-xs font-sans font-bold select-none px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : darkMode
                          ? 'bg-stone-800 text-red-400 border border-stone-700'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {v.verse}
                    </span>
                    <div className="flex-1 select-text leading-relaxed">
                      {selectedTranslation === 'KJV_STRONGS' || v.text.includes('<S>') ? (
                        <ConcordanceVerseRenderer
                          text={v.text}
                          onSelectStrongs={(id) => setActiveStrongsId(id)}
                          darkMode={darkMode}
                        />
                      ) : (
                        v.text
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Strong's Concordance Modal within Reader */}
        {activeStrongsId && (
          <StrongsConcordancePopup
            strongsId={activeStrongsId}
            onClose={() => setActiveStrongsId(null)}
            onInsertIntoNote={onInsertChip ? (text) => {
              onInsertChip(text);
              setActiveStrongsId(null);
            } : undefined}
            onViewUsage={(sId, lemma) => {
              handleOpenConcordanceSearch(sId, lemma);
            }}
          />
        )}

        {/* Bottom Action Bar: Note Insertion & Copy Controls */}
        <div
          className={`px-3.5 pt-2 pb-3 sm:px-4 sm:pt-2.5 sm:pb-3.5 border-t flex flex-col gap-2 shrink-0 ${
            darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200'
          }`}
        >
          {/* Active Reference / Selection Name above all buttons in smallest legible font */}
          <div className="text-center text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 truncate px-2">
            {currentRefString}
          </div>

          {/* Action Buttons Row: Copy (Left), Insert (Middle), Done (Right) */}
          <div className="flex items-center justify-between gap-2">
            {/* Copy Button (Left) */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={verses.length === 0}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                copied
                  ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : darkMode
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300 shadow-2xs'
              }`}
              title="Copy scripture text to clipboard with reference and version citation"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Insert Text button (Middle) */}
            <button
              type="button"
              onClick={handleInsertChip}
              disabled={verses.length === 0}
              className="flex-[1.3] flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-transform active:scale-95"
              title={`Insert [${currentRefString}] chip into active note`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Insert Text</span>
            </button>

            {/* Done button (Right) */}
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                darkMode ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              Done
            </button>
          </div>
        </div>

        {/* Scripture Search Drawer Overlay */}
        <BibleSearchDrawer
          isOpen={showSearchDrawer}
          onClose={() => setShowSearchDrawer(false)}
          currentBook={selectedBook}
          currentTranslation={selectedTranslation}
          onSelectVerse={(book, chapter, verse) => {
            setSelectedBook(book);
            setSelectedChapter(chapter);
            setTargetScrollVerse(verse);
            setSelectedVerses([verse]);
            setHasActiveSearchSession(true);
            setShowSearchDrawer(false);
          }}
          onInsertVerse={onInsertChip}
          darkMode={darkMode}
          activeStrongsSearch={activeStrongsSearch}
          onClearStrongsSearch={() => setActiveStrongsSearch(null)}
          hasActiveSearchSession={hasActiveSearchSession}
          onResetSearchSession={() => setHasActiveSearchSession(false)}
          initialQuery={initialSearchQuery}
        />
      </div>
    </div>
  );
};
