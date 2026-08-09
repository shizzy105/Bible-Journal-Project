import React, { useState, useMemo } from 'react';
import { BookOpen, X, Check, AlertCircle, Search } from 'lucide-react';
import { BIBLE_BOOKS } from '../data/bibleData';
import { parseBibleReferences } from '../utils/bibleParser';

interface InsertReferenceModalProps {
  onClose: () => void;
  onInsert: (formattedRef: string) => void;
}

export const InsertReferenceModal: React.FC<InsertReferenceModalProps> = ({
  onClose,
  onInsert,
}) => {
  // Free text query or structured selection
  const [query, setQuery] = useState<string>('Matt 8 v 9');
  const [selectedBookName, setSelectedBookName] = useState<string>('Matthew');
  const [showBookDropdown, setShowBookDropdown] = useState<boolean>(false);

  // Filter book suggestions based on user input
  const bookSuggestions = useMemo(() => {
    if (!query.trim()) return BIBLE_BOOKS.slice(0, 8);
    const search = query.toLowerCase().trim();
    // Match against full name, id, or abbreviations
    return BIBLE_BOOKS.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.id.toLowerCase().includes(search) ||
        b.abbreviations.some((abbr) => abbr.toLowerCase().includes(search))
    ).slice(0, 6);
  }, [query]);

  // Live reference validation logic
  const validationResult = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Please enter a scripture reference.' };
    }

    // Attempt to parse using regex bible parser
    const matches = parseBibleReferences(trimmed);
    if (matches.length > 0) {
      const match = matches[0];
      return {
        isValid: true,
        match,
        formatted: `${match.bookName} ${match.chapter} v ${
          match.startVerse
        }${match.endVerse ? `-${match.endVerse}` : ''}`,
      };
    }

    // If regex failed, check WHY it failed for custom feedback
    // Extract first word as possible book
    const parts = trimmed.split(/[\s.:]+/);
    const possibleBookText = parts[0]?.toLowerCase();

    // Find book object
    const bookObj = BIBLE_BOOKS.find(
      (b) =>
        b.name.toLowerCase() === possibleBookText ||
        b.id.toLowerCase() === possibleBookText ||
        b.abbreviations.some((a) => a.toLowerCase() === possibleBookText) ||
        b.name.toLowerCase().startsWith(possibleBookText || '')
    );

    if (!bookObj) {
      return {
        isValid: false,
        error: `Book "${parts[0] || ''}" not found. Select a suggested book below.`,
      };
    }

    const chapterNum = parseInt(parts[1], 10);
    if (isNaN(chapterNum) || chapterNum <= 0) {
      return {
        isValid: false,
        error: `Please specify a chapter number for ${bookObj.name} (1–${bookObj.chaptersCount}).`,
      };
    }

    if (chapterNum > bookObj.chaptersCount) {
      return {
        isValid: false,
        error: `${bookObj.name} only has ${bookObj.chaptersCount} chapters. Chapter ${chapterNum} does not exist!`,
      };
    }

    const verseNum = parseInt(parts[2] || parts[3], 10);
    if (isNaN(verseNum) || verseNum <= 0) {
      return {
        isValid: false,
        error: `Please specify a valid verse number for ${bookObj.name} ${chapterNum}.`,
      };
    }

    if (verseNum > 176) {
      return {
        isValid: false,
        error: `Verse ${verseNum} is out of range for ${bookObj.name} ${chapterNum}.`,
      };
    }

    return {
      isValid: false,
      error: `Invalid verse format. Try "Matt 8 v 9" or "John 3:16".`,
    };
  }, [query]);

  const handleSelectBook = (bookName: string) => {
    setSelectedBookName(bookName);
    setShowBookDropdown(false);
    // Auto populate query with selected book and chapter 1 verse 1 if empty
    setQuery(`${bookName} 1 v 1`);
  };

  const handleInsert = () => {
    if (validationResult.isValid && validationResult.formatted) {
      onInsert(validationResult.formatted);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl shadow-2xl p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Insert Scripture Reference</h3>
              <p className="text-[11px] text-stone-400">Inserts an atomic scripture link in your note</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <label className="block text-xs font-bold text-stone-300 mb-1.5">
              Type Reference or Book Name:
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowBookDropdown(true);
                }}
                onFocus={() => setShowBookDropdown(true)}
                placeholder="e.g. Matt 8 v 9, Daniel 5 v 10, John 3:16"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-950 border border-stone-800 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Live Book Suggestions Dropdown */}
            {showBookDropdown && bookSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-stone-950 border border-stone-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-stone-900">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-stone-500 bg-stone-900/50">
                  Book Suggestions
                </div>
                {bookSuggestions.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => handleSelectBook(book.name)}
                    className="w-full text-left px-3.5 py-2 hover:bg-stone-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-bold text-stone-200">{book.name}</span>
                    <span className="text-[11px] text-stone-500">
                      {book.testament} • {book.chaptersCount} chapters
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Validation Feedback Status Banner */}
          {validationResult.isValid ? (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2.5 text-emerald-300 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Valid Reference: </span>
                <span className="underline font-mono">{validationResult.formatted}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-900/80 flex items-center gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationResult.error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold text-stone-400 block mb-1.5">
              Quick Verified Examples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Matt 8 v 9',
                'Daniel 5 v 10',
                'John 3:16',
                '1 Cor 13:4-8',
                'Ps 23:1-6',
                'Rom 8:28-30',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setQuery(preset);
                    setShowBookDropdown(false);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-red-950 hover:text-red-300 text-stone-300 text-xs font-mono border border-stone-700 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult.isValid}
              onClick={handleInsert}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
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
