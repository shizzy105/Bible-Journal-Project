import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, PlusCircle } from 'lucide-react';
import { getBibleVerses, TRANSLATIONS } from '../data/bibleData';
import { BibleReferenceMatch } from '../types/journal';

interface BibleVersePopupProps {
  match: BibleReferenceMatch | null;
  onClose: () => void;
  onInsertIntoNote?: (formattedText: string) => void;
}

export const BibleVersePopup: React.FC<BibleVersePopupProps> = ({ match, onClose, onInsertIntoNote }) => {
  const [selectedTranslation, setSelectedTranslation] = useState<string>('WEB');
  const [copied, setCopied] = useState<boolean>(false);

  if (!match) return null;

  const verses = getBibleVerses(
    match.bookName,
    match.chapter,
    match.startVerse,
    match.endVerse,
    selectedTranslation
  );

  const referenceTitle = match.endVerse
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
              <p className="text-xs text-stone-400">Protestant Cannon • Scripture Verse</p>
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
          <span className="text-stone-400 font-medium">Translation:</span>
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
        <div className="p-5 overflow-y-auto space-y-3 font-serif text-stone-200 leading-relaxed text-base">
          {verses.map((v) => (
            <div key={v.verse} className="flex gap-2.5 items-baseline group">
              <span className="text-xs font-sans font-bold text-red-400 select-none bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/30">
                {v.verse}
              </span>
              <p className="flex-1 text-stone-100">{v.text}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
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
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
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
