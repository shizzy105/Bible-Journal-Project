import React, { useState } from 'react';
import { Search, X, BookOpen, Mic, Edit3, Calendar, Tag, ArrowRight } from 'lucide-react';
import { JournalEntry } from '../types/journal';
import { parseBibleReferences, getJournalEntryTextSnippet, formatDateDDMMYYYY } from '../utils/bibleParser';
import { AppTheme } from '../services/storage';

interface SearchOverlayProps {
  entries: JournalEntry[];
  onClose: () => void;
  onSelectEntry: (entry: JournalEntry) => void;
  darkMode: boolean;
  currentTheme?: AppTheme;
}

const QUICK_SUGGESTIONS = [
  'Matthew',
  'John 3:16',
  'Psalms',
  'Prayer',
  'Romans 8',
  'Sermon',
  'Voice Note',
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  entries,
  onClose,
  onSelectEntry,
  darkMode,
  currentTheme,
}) => {
  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

  const overlayBgClass = isPureBlack
    ? 'bg-black/95 text-white'
    : isNavy
    ? 'bg-[#0b132b]/95 text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-950/95 text-neutral-100'
    : 'bg-stone-100/95 text-stone-900';

  const headerClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-200 shadow-2xs';

  const inputClass = isPureBlack
    ? 'bg-neutral-900 text-white placeholder-neutral-500 border border-neutral-800'
    : isNavy
    ? 'bg-[#1c2541] text-white placeholder-stone-400 border border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-800 text-white placeholder-neutral-400 border border-neutral-700'
    : 'bg-stone-100 text-stone-900 placeholder-stone-400 border border-stone-300';

  const closeBtnClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
    : isNavy
    ? 'bg-[#1c2541] hover:bg-[#232f55] text-[#e0e1dd] border border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
    : 'bg-stone-200 hover:bg-stone-300 text-stone-700 border border-stone-300';

  const filterBarClass = isPureBlack
    ? 'border-neutral-900 bg-black/60'
    : isNavy
    ? 'border-[#3a506b] bg-[#0b132b]/60'
    : darkMode
    ? 'border-neutral-800 bg-neutral-900/40'
    : 'border-stone-200 bg-stone-50';

  const filterChipInactiveClass = isPureBlack
    ? 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
    : isNavy
    ? 'bg-[#1c2541] text-[#e0e1dd] hover:bg-[#232f55]'
    : darkMode
    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300';

  const suggestionChipClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800'
    : isNavy
    ? 'bg-[#1c2541] hover:bg-[#232f55] text-[#e0e1dd] border border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
    : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 shadow-2xs';

  const cardClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 hover:border-red-600/80 shadow-md'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] hover:border-red-500 shadow-md'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 hover:border-red-600/80 shadow-md'
    : 'bg-white border-stone-200/90 hover:border-red-300 hover:shadow-md';

  const cardDividerClass = isPureBlack
    ? 'border-neutral-900'
    : isNavy
    ? 'border-[#3a506b]'
    : darkMode
    ? 'border-neutral-800'
    : 'border-stone-200/60';

  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'verses' | 'voice' | 'drawing'>('all');

  const filteredEntries = entries.filter((entry) => {
    const lowerQuery = query.toLowerCase().trim();

    const titleMatch = entry.title.toLowerCase().includes(lowerQuery);
    const dateMatch = entry.dateString.includes(lowerQuery);
    const fullContent = getJournalEntryTextSnippet(entry).toLowerCase();
    const contentMatch = fullContent.includes(lowerQuery);

    const matchesQuery = !lowerQuery || titleMatch || dateMatch || contentMatch;

    if (!matchesQuery) return false;

    if (activeFilter === 'verses') {
      return entry.blocks.some(
        (b) =>
          b.type === 'verse' ||
          (b.type === 'text' &&
            (parseBibleReferences(b.content).length > 0 ||
              /data-strongs|data-ref="[HG]\d+"/i.test(b.content)))
      );
    }
    if (activeFilter === 'voice') {
      return entry.blocks.some((b) => b.type === 'voice');
    }
    if (activeFilter === 'drawing') {
      return entry.blocks.some((b) => b.type === 'drawing');
    }

    return true;
  });

  const verseCount = entries.filter((e) =>
    e.blocks.some(
      (b) =>
        b.type === 'verse' ||
        (b.type === 'text' &&
          (parseBibleReferences(b.content).length > 0 ||
            /data-strongs|data-ref="[HG]\d+"/i.test(b.content)))
    )
  ).length;
  const voiceCount = entries.filter((e) => e.blocks.some((b) => b.type === 'voice')).length;
  const drawingCount = entries.filter((e) => e.blocks.some((b) => b.type === 'drawing')).length;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col backdrop-blur-md animate-fadeIn transition-colors ${overlayBgClass}`}
    >
      {/* Search Header Bar */}
      <div
        className={`p-4 border-b flex items-center gap-3 sticky top-0 z-10 ${headerClass}`}
      >
        <div className="relative flex-1 flex items-center">
          <Search className="w-5 h-5 text-red-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, scriptures (e.g. John 3:16)..."
            className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${inputClass}`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 rounded-full hover:bg-stone-300/50 dark:hover:bg-neutral-800 text-stone-400 hover:text-stone-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-colors ${closeBtnClass}`}
        >
          Close
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div
        className={`px-4 py-3 flex items-center gap-2 overflow-x-auto border-b ${filterBarClass}`}
      >
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-red-600 text-white shadow-md'
              : filterChipInactiveClass
          }`}
        >
          All Notes ({entries.length})
        </button>
        <button
          onClick={() => setActiveFilter('verses')}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeFilter === 'verses'
              ? 'bg-red-600 text-white shadow-md'
              : filterChipInactiveClass
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Bible References ({verseCount})</span>
        </button>
        <button
          onClick={() => setActiveFilter('voice')}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeFilter === 'voice'
              ? 'bg-red-600 text-white shadow-md'
              : filterChipInactiveClass
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Audio ({voiceCount})</span>
        </button>
        <button
          onClick={() => setActiveFilter('drawing')}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
            activeFilter === 'drawing'
              ? 'bg-red-600 text-white shadow-md'
              : filterChipInactiveClass
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Sketches ({drawingCount})</span>
        </button>
      </div>

      {/* Suggested Quick Terms if query is empty */}
      {!query && (
        <div className="px-4 py-3 max-w-3xl w-full mx-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-neutral-400 mb-2">
            <Tag className="w-3.5 h-3.5 text-red-500" />
            <span>Quick Suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${suggestionChipClass}`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl w-full mx-auto space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 text-stone-500 dark:text-neutral-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20 text-red-500" />
            <p className="text-base font-bold">No journal notes found</p>
            <p className="text-xs text-stone-400 dark:text-neutral-500 mt-1 max-w-xs mx-auto">
              {query ? `No notes matching "${query}". Try another search term.` : 'Start typing to search across your notes.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const hasRefs = entry.blocks.some(
              (b) => b.type === 'verse' || (b.type === 'text' && parseBibleReferences(b.content).length > 0)
            );
            const hasVoice = entry.blocks.some((b) => b.type === 'voice');
            const hasDrawing = entry.blocks.some((b) => b.type === 'drawing');
            const cleanSnippet = getJournalEntryTextSnippet(entry);

            return (
              <div
                key={entry.id}
                onClick={() => {
                  onSelectEntry(entry);
                  onClose();
                }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer group ${cardClass}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4
                    className={`font-bold text-base line-clamp-1 group-hover:text-red-500 transition-colors ${
                      darkMode ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {entry.title || 'Untitled Journal Note'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-neutral-400 shrink-0 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                    <span>{formatDateDDMMYYYY(entry.dateString)}</span>
                  </div>
                </div>

                <p className="text-xs text-stone-500 dark:text-neutral-400 line-clamp-2 my-1 leading-relaxed">
                  {cleanSnippet || 'No text content'}
                </p>

                {/* Feature Badges */}
                <div className={`flex items-center justify-between mt-3 pt-2.5 border-t ${cardDividerClass}`}>
                  <div className="flex items-center gap-2 text-[10px]">
                    {hasRefs && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>Scripture</span>
                      </span>
                    )}
                    {hasVoice && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span>Audio</span>
                      </span>
                    )}
                    {hasDrawing && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        <span>Sketch</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-red-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
