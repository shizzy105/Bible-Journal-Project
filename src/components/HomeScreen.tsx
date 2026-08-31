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
}) => {
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // Sort entries: Pinned entries first, then by date descending
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div
      className={`flex flex-col min-h-full transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-stone-100 text-stone-900'
      }`}
    >
      {/* Top Bar (Redmi Notes Header Style) */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-stone-200 shadow-2xs'
        }`}
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
            className="p-2.5 rounded-2xl hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="Search notes"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenCalendar}
            className="p-2.5 rounded-2xl hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="Open Calendar"
          >
            <Calendar className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 transition-colors"
            title="App Settings (Translations & Themes)"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-2xl hover:bg-stone-200 dark:hover:bg-slate-800 text-amber-500 transition-colors"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-700" />}
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

              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800 hover:border-red-600/80 hover:shadow-xl'
                      : 'bg-white border-stone-200/80 hover:border-red-300 hover:shadow-lg'
                  }`}
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
                        className="p-1.5 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-slate-800 transition-colors"
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
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-slate-800/80 text-[10px]">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {references.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{references.length} Ref</span>
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
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-stone-200 text-stone-900'
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
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
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
