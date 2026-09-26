import React, { useState, useEffect } from 'react';
import { X, Copy, Check, PlusCircle, Loader2, BookOpen, Languages, Sparkles, Search } from 'lucide-react';
import { StrongsEntry } from '../types/journal';
import { fetchStrongsEntryAsync, getStrongsEntrySync } from '../data/strongsData';

interface StrongsConcordancePopupProps {
  strongsId: string;
  onClose: () => void;
  onInsertIntoNote?: (formattedText: string) => void;
  onViewUsage?: (strongsId: string, lemma?: string) => void;
}

export const StrongsConcordancePopup: React.FC<StrongsConcordancePopupProps> = ({
  strongsId,
  onClose,
  onInsertIntoNote,
  onViewUsage,
}) => {
  const [entry, setEntry] = useState<StrongsEntry | null>(() => getStrongsEntrySync(strongsId));
  const [loading, setLoading] = useState<boolean>(!entry);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const sync = getStrongsEntrySync(strongsId);
    if (sync) {
      setEntry(sync);
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchStrongsEntryAsync(strongsId).then((result) => {
      if (isMounted && result) {
        setEntry(result);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [strongsId]);

  const handleCopy = () => {
    if (!entry) return;
    const kjvText = entry.kjv_usage || entry.kjv_def;
    const textToCopy = `Strong's ${entry.id} (${entry.language}):\n${entry.lemma} [${entry.translit}${entry.pron ? ` / ${entry.pron}` : ''}]\nDefinition: ${entry.strongs_def}\n${kjvText ? `KJV Usage: ${kjvText}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!onInsertIntoNote) return;
    const targetId = (entry?.id || strongsId).toUpperCase().trim();
    if (!targetId) return;
    onInsertIntoNote(targetId);
    onClose();
  };

  const isHebrew = entry?.language === 'Hebrew' || entry?.language === 'Aramaic' || strongsId.toUpperCase().startsWith('H');

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
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
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Strong's {strongsId.toUpperCase()}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-900/40 text-red-300 border border-red-800/40">
                  {entry?.language || (isHebrew ? 'Hebrew' : 'Greek')}
                </span>
              </div>
              <p className="text-xs text-stone-400">Exhaustive Biblical Concordance & Lexicon</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word Display Banner */}
        <div className="px-5 py-4 bg-stone-950 border-b border-stone-800 flex flex-col items-center justify-center text-center">
          {loading && !entry ? (
            <div className="py-4 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <span className="text-xs text-stone-400">Loading Strong's lexicon entry...</span>
            </div>
          ) : entry ? (
            <>
              {/* Original Hebrew / Greek Lemma */}
              <div
                dir={isHebrew ? 'rtl' : 'ltr'}
                className={`text-3xl sm:text-4xl font-serif font-semibold mb-1.5 ${
                  isHebrew ? 'font-serif text-amber-200 tracking-wide' : 'text-sky-200'
                }`}
              >
                {entry.lemma}
              </div>

              {/* Transliteration & Pronunciation */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {entry.translit && (
                  <span className="font-mono text-stone-300 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700">
                    Translit: <strong className="text-white">{entry.translit}</strong>
                  </span>
                )}
                {entry.pron && (
                  <span className="font-mono text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700">
                    Pron: <em className="text-stone-300 not-italic">{entry.pron}</em>
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Definition and Details Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-sans text-stone-200 text-sm leading-relaxed min-h-[140px] overscroll-contain">
          {loading && !entry ? (
            <div className="flex flex-col items-center justify-center py-8 text-stone-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <p className="text-xs">Fetching Strong's definition...</p>
            </div>
          ) : entry ? (
            <>
              {/* Strong's Definition */}
              <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800">
                <span className="text-[11px] uppercase tracking-wider font-bold text-red-400 block mb-1">
                  Strong's Definition
                </span>
                <p className="text-stone-100 font-serif text-base leading-relaxed">
                  {entry.strongs_def}
                </p>
              </div>

              {/* Derivation / Etymology */}
              {entry.derivation && (
                <div className="bg-stone-950/40 p-3 rounded-xl border border-stone-800/80">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block mb-1">
                    Origin / Derivation
                  </span>
                  <p className="text-stone-300 text-xs leading-normal">
                    {entry.derivation}
                  </p>
                </div>
              )}

              {/* King James Version Usage */}
              {(entry.kjv_usage || entry.kjv_def) && (
                <div className="bg-stone-950/40 p-3 rounded-xl border border-stone-800/80">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400/90 block mb-1">
                    KJV Usage
                  </span>
                  <p className="text-stone-300 text-xs italic leading-normal">
                    {entry.kjv_usage || entry.kjv_def}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center text-stone-400 text-xs">
              Entry not found for {strongsId}.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!entry}
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
                <span>Copy</span>
              </>
            )}
          </button>

          {onInsertIntoNote && (
            <button
              type="button"
              onClick={handleInsert}
              disabled={!entry}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Insert to Note</span>
            </button>
          )}

          {onViewUsage ? (
            <button
              type="button"
              onClick={() => {
                if (entry) {
                  onViewUsage(strongsId, entry.lemma);
                } else {
                  onViewUsage(strongsId);
                }
              }}
              disabled={!entry}
              className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-colors"
              title="View all biblical occurrences in KJV#"
            >
              <Search className="w-4 h-4" />
              <span>View Usage</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
