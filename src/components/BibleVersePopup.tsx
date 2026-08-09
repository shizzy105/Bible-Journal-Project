import React, { useState, useEffect } from 'react';
import { X, Copy, Check, BookOpen, PlusCircle, Loader2, WifiOff } from 'lucide-react';
import { getBibleVersesSync, fetchBibleVersesAsync, TRANSLATIONS } from '../data/bibleData';
import { BibleReferenceMatch, BibleVerse } from '../types/journal';

interface BibleVersePopupProps {
  match: BibleReferenceMatch | null;
  onClose: () => void;
  onInsertIntoNote?: (formattedText: string) => void;
}

export const BibleVersePopup: React.FC<BibleVersePopupProps> = ({ match, onClose, onInsertIntoNote }) => {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('WEB');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!match) return;
    let isMounted = true;
    setLoading(true);

    // Initial sync load from local DB / LocalStorage cache
    const syncVerses = getBibleVersesSync(
      match.bookName,
      match.chapter,
      match.startVerse,
      match.endVerse,
      selectedTranslation
    );

    if (syncVerses) {
      setVerses(syncVerses);
      setLoading(false);
    }

    // Async live API fetch for 100% real verbatim text
    fetchBibleVersesAsync(
      match.bookName,
      match.chapter,
      match.startVerse,
      match.endVerse,
      selectedTranslation
    ).then((asyncVerses) => {
      if (isMounted) {
        if (asyncVerses && asyncVerses.length > 0) {
          setVerses(asyncVerses);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [match, selectedTranslation]);

  if (!match) return null;

  const referenceTitle = match.endVerse && match.endVerse !== match.startVerse
    ? `${match.bookName} ${match.chapter}:${match.startVerse}-${match.endVerse}`
    : `${match.bookName} ${match.chapter}:${match.startVerse}`;

  const fullVerseText = verses.map((v) => `${v.verse}. ${v.text}`).join('\n');

  const handleCopy = () => {
    const textToCopy = `"${fullVerseText.trim()}"\n— ${referenceTitle} (${selectedTranslation})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertIntoNote) {
      const formattedInsert = `\n> "${fullVerseText.trim()}"\n> — ${referenceTitle} (${selectedTranslation})\n`;
      onInsertIntoNote(formattedInsert);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Popup Card / Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 text-stone-100 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col transition-all transform animate-slideUp">
        {/* Header Handle for Mobile */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Title & Close Bar */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-800/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{referenceTitle}</h3>
              <p className="text-xs text-stone-400">Verbatim Scripture • Exact Translation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Translation Selector Bar */}
        <div className="px-5 py-2 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium flex items-center gap-1.5">
            Translation:
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400 inline ml-1" />}
          </span>
          <select
            value={selectedTranslation}
            onChange={(e) => setSelectedTranslation(e.target.value)}
            className="bg-stone-800 text-red-300 font-medium px-2.5 py-1 rounded-md border border-stone-700 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} - {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Verses Content Body */}
        <div className="p-5 overflow-y-auto space-y-3 font-serif text-stone-200 leading-relaxed text-base min-h-[140px]">
          {loading && verses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <p className="text-xs font-sans">Fetching exact Scripture text...</p>
            </div>
          ) : (
            verses.map((v) => (
              <div key={v.verse} className="flex gap-2.5 items-baseline group">
                <span className="text-xs font-sans font-bold text-red-400 select-none bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/30 shrink-0">
                  {v.verse}
                </span>
                <p className="flex-1 text-stone-100">{v.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            disabled={loading && verses.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-400" />
                <span>Copy Verse</span>
              </>
            )}
          </button>

          {onInsertIntoNote && (
            <button
              onClick={handleInsert}
              disabled={loading && verses.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Insert to Note</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
