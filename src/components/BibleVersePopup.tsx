import React, { useState, useEffect } from 'react';
import { X, Copy, Check, BookOpen, PlusCircle, Loader2, WifiOff, ChevronDown } from 'lucide-react';
import { getBibleVersesSync, fetchBibleVersesAsync, sanitizeVerseText, TRANSLATIONS } from '../data/bibleData';
import { BibleReferenceMatch, BibleVerse } from '../types/journal';
import { getEnabledTranslations, getStoredTranslation, setStoredTranslation } from '../services/storage';
import { formatVerseRanges } from '../utils/bibleParser';
import { StrongsConcordancePopup } from './StrongsConcordancePopup';
import { ConcordanceVerseRenderer } from './ConcordanceVerseRenderer';

const ALL_POSSIBLE_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)' },
  { id: 'KJV_STRONGS', name: "King James Version with Strong's Concordance" },
  { id: 'NKJV', name: 'New King James Version (NKJV)' },
  { id: 'ESV', name: 'English Standard Version (ESV)' },
  { id: 'WEB', name: 'World English Bible (WEB)' },
  { id: 'NIV', name: 'New International Version (NIV)' },
  { id: 'NLT', name: 'New Living Translation (NLT)' },
];

interface BibleVersePopupProps {
  match: BibleReferenceMatch | null;
  onClose: () => void;
  onInsertIntoNote?: (formattedText: string) => void;
  onOpenInBible?: (
    book: string,
    chapter: number,
    verse?: number,
    translation?: string,
    strongsTarget?: { id: string; lemma?: string },
    selectedVerses?: number[]
  ) => void;
}

export const BibleVersePopup: React.FC<BibleVersePopupProps> = ({
  match,
  onClose,
  onInsertIntoNote,
  onOpenInBible,
}) => {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('KJV');
  const [availableTranslations, setAvailableTranslations] = useState<string[]>(['KJV']);
  const [showTranslationPicker, setShowTranslationPicker] = useState<boolean>(false);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeStrongsId, setActiveStrongsId] = useState<string | null>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const enabled = getEnabledTranslations();
    const list = enabled.length > 0 ? enabled : ['KJV', 'KJV_STRONGS', 'ESV'];
    setAvailableTranslations(list);

    const savedTrans = getStoredTranslation();
    if (list.includes(savedTrans)) {
      setSelectedTranslation(savedTrans);
    } else if (list.length > 0) {
      setSelectedTranslation(list.includes('KJV_STRONGS') ? 'KJV_STRONGS' : list[0]);
    }
  }, []);

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
      if (match.verseList && match.verseList.length > 0) {
        setVerses(syncVerses.filter((v) => match.verseList!.includes(v.verse)));
      } else {
        setVerses(syncVerses);
      }
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
          if (match.verseList && match.verseList.length > 0) {
            setVerses(asyncVerses.filter((v) => match.verseList!.includes(v.verse)));
          } else {
            setVerses(asyncVerses);
          }
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

  const referenceTitle = match.isFullChapter
    ? `${match.bookName} ${match.chapter}`
    : match.verseList && match.verseList.length > 0
    ? `${match.bookName} ${match.chapter} v ${formatVerseRanges(match.verseList)}`
    : match.endVerse && match.endVerse !== match.startVerse
    ? `${match.bookName} ${match.chapter}:${match.startVerse}-${match.endVerse}`
    : `${match.bookName} ${match.chapter}:${match.startVerse}`;

  const fullVerseText = verses.map((v) => `${v.verse}. ${sanitizeVerseText(v.text, false)}`).join('\n');

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
              <p className="text-xs text-stone-400">
                {match.isFullChapter
                  ? `Full Chapter • ${verses.length || (match.endVerse || 0)} Verses`
                  : 'Verbatim Scripture • Exact Translation'}
              </p>
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
        <div className="px-5 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium flex items-center gap-1.5">
            Translation:
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400 inline ml-1" />}
          </span>
          <button
            type="button"
            onClick={() => setShowTranslationPicker((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
              showTranslationPicker
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-stone-800 hover:bg-stone-700 text-red-400 border-stone-700'
            }`}
            title="Switch Translation"
          >
            <span>{selectedTranslation === 'KJV_STRONGS' ? 'KJV#' : selectedTranslation}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform opacity-70 ${
                showTranslationPicker ? 'rotate-180 text-white' : 'text-red-400'
              }`}
            />
          </button>
        </div>

        {/* Translation Picker Drawer */}
        {showTranslationPicker && (
          <div className="p-3.5 border-b border-stone-800 bg-stone-950/95 flex flex-col gap-2 shadow-inner animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                Choose Translation
              </span>
              <button
                type="button"
                onClick={() => setShowTranslationPicker(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-1.5 p-0.5 overscroll-contain">
              {ALL_POSSIBLE_TRANSLATIONS.filter((t) => availableTranslations.includes(t.id)).map((t) => {
                const isCurrent = t.id === selectedTranslation;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTranslation(t.id);
                      setStoredTranslation(t.id);
                      setShowTranslationPicker(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${
                      isCurrent
                        ? 'bg-red-600/10 border-red-500 text-red-400 font-bold shadow-2xs'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {t.id === 'KJV_STRONGS' ? "KJV (Strong's)" : t.id}
                        {t.id === 'KJV_STRONGS' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase">
                            Strong&apos;s #
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-stone-400 truncate">{t.name}</span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Verses Content Body */}
        <div className="p-5 overflow-y-auto space-y-3 font-serif text-stone-200 leading-relaxed text-base min-h-[140px] overscroll-contain">
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
                <div className="flex-1 text-stone-100">
                  {selectedTranslation === 'KJV_STRONGS' || v.text.includes('<S>') ? (
                    <ConcordanceVerseRenderer
                      text={v.text}
                      onSelectStrongs={(id) => setActiveStrongsId(id)}
                      darkMode={true}
                    />
                  ) : (
                    v.text
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Strong's Concordance Modal on top of Bible Verse Popup */}
        {activeStrongsId && (
          <StrongsConcordancePopup
            strongsId={activeStrongsId}
            onClose={() => setActiveStrongsId(null)}
            onInsertIntoNote={onInsertIntoNote ? (text) => {
              onInsertIntoNote(text);
              setActiveStrongsId(null);
            } : undefined}
            onViewUsage={(sId, lemma) => {
              setActiveStrongsId(null);
              onClose();
              if (onOpenInBible && match) {
                onOpenInBible(
                  match.book,
                  match.chapter,
                  match.verseStart,
                  'KJV_STRONGS',
                  { id: sId, lemma }
                );
              }
            }}
          />
        )}

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

          {onOpenInBible && match ? (
            <button
              onClick={() => {
                onOpenInBible(
                  match.bookName,
                  match.chapter,
                  match.startVerse,
                  selectedTranslation,
                  undefined,
                  match.verseList
                );
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
              title="Open full passage in Bible reader"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read in Bible</span>
            </button>
          ) : onInsertIntoNote ? (
            <button
              onClick={handleInsert}
              disabled={loading && verses.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Insert to Note</span>
            </button>
          ) : null}

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
