import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Plus,
  Moon,
  Sun,
  Pin,
  Trash2,
  Mic,
  Edit3,
  FileCode,
  Check,
  ChevronRight,
  Bookmark,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { AppLogoIcon } from './AppLogoIcon';
import { JournalEntry } from '../types/journal';
import { parseBibleReferences, getJournalEntryTextSnippet, formatDateDDMMYYYY } from '../utils/bibleParser';
import { AppTheme } from '../services/storage';

interface HomeScreenProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onCreateNewEntry: () => void;
  onOpenCalendar: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onDeleteEntry: (entryId: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentTheme?: AppTheme;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  entries,
  onSelectEntry,
  onCreateNewEntry,
  onOpenCalendar,
  onOpenSearch,
  onOpenSettings,
  onDeleteEntry,
  darkMode,
  onToggleDarkMode,
  currentTheme,
}) => {
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

  // Sort entries: Pinned entries first, then by date descending
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const bgContainerClass = isPureBlack
    ? 'bg-black text-white'
    : isNavy
    ? 'bg-[#0b132b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-950 text-neutral-100'
    : 'bg-stone-100 text-stone-900';

  const headerClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-200 shadow-2xs';

  const headerBtnClass = isPureBlack
    ? 'hover:bg-neutral-900 text-stone-300'
    : isNavy
    ? 'hover:bg-[#253256] text-[#e0e1dd]'
    : darkMode
    ? 'hover:bg-neutral-800 text-neutral-300'
    : 'hover:bg-stone-200 text-stone-600';

  return (
    <div className={`flex flex-col min-h-full transition-colors ${bgContainerClass}`}>
      {/* Top Bar (Redmi Notes Header Style) */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${headerClass}`}
      >
        <div className="flex items-center gap-2.5">
          <AppLogoIcon className="w-9 h-9" />
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-stone-900 dark:text-white">
              Asor Notes
            </h1>
          </div>
        </div>

        {/* Right Icon Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onOpenSearch}
            className={`p-2.5 rounded-2xl transition-colors ${headerBtnClass}`}
            title="Search notes"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenCalendar}
            className={`p-2.5 rounded-2xl transition-colors ${headerBtnClass}`}
            title="Open Calendar"
          >
            <Calendar className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-2.5 rounded-2xl transition-colors ${headerBtnClass}`}
            title="App Settings (Translations & Themes)"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleDarkMode}
            className={`p-2.5 rounded-2xl transition-colors ${
              isPureBlack
                ? 'hover:bg-neutral-900 text-amber-400'
                : isNavy
                ? 'hover:bg-[#253256] text-amber-400'
                : darkMode
                ? 'hover:bg-neutral-800 text-amber-400'
                : 'hover:bg-stone-200 text-stone-700'
            }`}
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Notes List Area */}
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full pb-24">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Recent Journal Entries ({sortedEntries.length})
          </h3>
        </div>

        {/* Notes Grid */}
        {sortedEntries.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-red-500" />
            <p className="text-base font-bold text-stone-600 dark:text-stone-300">Your Asor Notes journal is empty</p>
            <p className="text-xs text-stone-400 mt-1">Tap the red + button below to write your first reflection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {sortedEntries.map((entry) => {
              const cleanSnippet = getJournalEntryTextSnippet(entry);
              const hasVoice = entry.blocks.some((b) => b.type === 'voice');
              const hasDrawing = entry.blocks.some((b) => b.type === 'drawing');
              const references = parseBibleReferences(cleanSnippet);
              const strongsCount = (entry.blocks.reduce((acc, b) => {
                if (b.type !== 'text') return acc;
                const matches = b.content.match(/data-strongs="[HG]\d+"/gi);
                return acc + (matches ? matches.length : 0);
              }, 0));
              const totalRefs = references.length + strongsCount;

              const cardClass = isPureBlack
                ? 'bg-neutral-950 border-neutral-900 hover:border-neutral-700 hover:shadow-xl'
                : isNavy
                ? 'bg-[#1c2541] border-[#3a506b] hover:border-cyan-500/50 hover:shadow-xl'
                : darkMode
                ? 'bg-neutral-900 border-neutral-800 hover:border-red-600/80 hover:shadow-xl'
                : 'bg-white border-stone-200/80 hover:border-red-300 hover:shadow-lg';

              const cardDividerClass = isPureBlack
                ? 'border-neutral-900'
                : isNavy
                ? 'border-[#3a506b]'
                : darkMode
                ? 'border-neutral-800/80'
                : 'border-stone-100';

              const trashBtnHover = isPureBlack
                ? 'hover:bg-neutral-900'
                : isNavy
                ? 'hover:bg-[#253256]'
                : darkMode
                ? 'hover:bg-neutral-800'
                : 'hover:bg-stone-200';

              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between group ${cardClass}`}
                >
                  <div>
                    {/* Entry Header */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {entry.pinned && (
                          <Pin className="w-3.5 h-3.5 text-red-500 fill-current shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-stone-400">
                          {formatDateDDMMYYYY(entry.dateString)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete(entry);
                        }}
                        className={`p-1.5 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ${trashBtnHover}`}
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Entry Title */}
                    <h4
                      className={`font-extrabold text-base line-clamp-1 mb-1 ${
                        darkMode ? 'text-white' : 'text-stone-900'
                      }`}
                    >
                      {entry.title || 'Untitled Note'}
                    </h4>

                    {/* Content Snippet */}
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 leading-relaxed mb-3">
                      {cleanSnippet || 'No text content added yet...'}
                    </p>
                  </div>

                  {/* Badges / Feature Tags */}
                  <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${cardDividerClass}`}>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {totalRefs > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{totalRefs} Ref</span>
                        </span>
                      )}
                      {hasVoice && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          <span>Audio</span>
                        </span>
                      )}
                      {hasDrawing && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          <span>Sketch</span>
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (Redmi Red FAB) */}
      <button
        onClick={onCreateNewEntry}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ring-4 ring-red-500/30"
        title="Create New Note"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      {/* In-App Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-sm p-5 sm:p-6 rounded-3xl border shadow-2xl ${
              isPureBlack
                ? 'bg-neutral-950 border-neutral-900 text-white'
                : isNavy
                ? 'bg-[#1c2541] border-[#3a506b] text-white'
                : darkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3.5">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-1">Delete "{entryToDelete.title || 'Untitled Note'}"?</h3>
            <p className="text-xs opacity-75 mb-5 leading-relaxed">
              This entry will be moved to <strong className="font-semibold">Recently Deleted</strong> and preserved for 30 days before permanent erasure.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isPureBlack
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
                    : isNavy
                    ? 'bg-[#253256] hover:bg-[#2e3e6b] text-[#e0e1dd]'
                    : darkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = entryToDelete.id;
                  setEntryToDelete(null);
                  onDeleteEntry(id);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
