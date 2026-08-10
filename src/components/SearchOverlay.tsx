import React, { useState } from 'react';
import { Search, X, BookOpen, Mic, Edit3, Calendar, FileText } from 'lucide-react';
import { JournalEntry } from '../types/journal';
import { parseBibleReferences, stripHtmlTags } from '../utils/bibleParser';

interface SearchOverlayProps {
  entries: JournalEntry[];
  onClose: () => void;
  onSelectEntry: (entry: JournalEntry) => void;
  darkMode: boolean;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  entries,
  onClose,
  onSelectEntry,
  darkMode,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'verses' | 'voice' | 'drawing'>('all');

  const filteredEntries = entries.filter((entry) => {
    // Text search matching title or blocks
    const lowerQuery = query.toLowerCase().trim();

    const titleMatch = entry.title.toLowerCase().includes(lowerQuery);
    const dateMatch = entry.dateString.includes(lowerQuery);

    const fullContent = entry.blocks
      .map((b) => (b.type === 'text' ? stripHtmlTags(b.content) : ''))
      .join(' ')
      .toLowerCase();

    const contentMatch = fullContent.includes(lowerQuery);

    const matchesQuery = !lowerQuery || titleMatch || dateMatch || contentMatch;

    if (!matchesQuery) return false;

    // Filter type checking
    if (activeFilter === 'verses') {
      return entry.blocks.some(
        (b) => b.type === 'verse' || (b.type === 'text' && parseBibleReferences(b.content).length > 0)
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950/90 backdrop-blur-md animate-fadeIn">
      {/* Search Header Bar */}
      <div
        className={`p-4 border-b flex items-center gap-3 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        <Search className="w-5 h-5 text-red-500 shrink-0" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes, Bible references (e.g. Matt 5:7)..."
          className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-stone-400"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-stone-800/50 text-stone-400">
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold shrink-0"
        >
          Cancel
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-stone-800/60 bg-stone-950/80">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeFilter === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          All ({entries.length})
        </button>
        <button
          onClick={() => setActiveFilter('verses')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeFilter === 'verses'
              ? 'bg-red-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Bible References</span>
        </button>
        <button
          onClick={() => setActiveFilter('voice')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeFilter === 'voice'
              ? 'bg-red-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Notes</span>
        </button>
        <button
          onClick={() => setActiveFilter('drawing')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
            activeFilter === 'drawing'
              ? 'bg-red-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Drawings</span>
        </button>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl w-full mx-auto space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No matching journal notes found.</p>
            <p className="text-xs text-stone-600 mt-1">Try searching for "Matthew", "prayer", or a date.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const hasRefs = entry.blocks.some(
              (b) => b.type === 'verse' || (b.type === 'text' && parseBibleReferences(b.content).length > 0)
            );
            const hasVoice = entry.blocks.some((b) => b.type === 'voice');
            const hasDrawing = entry.blocks.some((b) => b.type === 'drawing');

            const rawSnippet = entry.blocks.find((b) => b.type === 'text')?.content || '';
            const textSnippet = stripHtmlTags(rawSnippet) || 'No text content';

            return (
              <div
                key={entry.id}
                onClick={() => {
                  onSelectEntry(entry);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-red-900/80 hover:bg-slate-800'
                    : 'bg-white border-stone-200 hover:border-red-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`font-bold text-base line-clamp-1 ${
                      darkMode ? 'text-white' : 'text-stone-900'
                    }`}
                  >
                    {entry.title || 'Untitled Journal Note'}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 shrink-0">
                    <Calendar className="w-3 h-3 text-red-500" />
                    <span>{entry.dateString}</span>
                  </div>
                </div>

                <p className="text-xs text-stone-400 line-clamp-2 my-1 font-serif leading-relaxed">
                  {textSnippet}
                </p>

                {/* Feature Tags */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-800/40 text-[10px]">
                  {hasRefs && (
                    <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 font-semibold border border-red-900/40 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Scripture References</span>
                    </span>
                  )}
                  {hasVoice && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-semibold border border-emerald-900/40 flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      <span>Voice Note</span>
                    </span>
                  )}
                  {hasDrawing && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 font-semibold border border-amber-900/40 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>Sketch</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
