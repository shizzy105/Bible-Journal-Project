import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Plus,
  Moon,
  Sun,
  Pin,
  PinOff,
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
  onTogglePinEntry?: (entryId: string) => void;
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
  onTogglePinEntry,
  darkMode,
  onToggleDarkMode,
  currentTheme,
}) => {
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [heldEntry, setHeldEntry] = useState<JournalEntry | null>(null);

  // Long press refs and timing
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const startHold = (entry: JournalEntry, x: number, y: number) => {
    touchStartPosRef.current = { x, y };
    isLongPressTriggeredRef.current = false;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      setHeldEntry(entry);
    }, 450);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

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
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      startHold(entry, e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (touchStartPosRef.current && e.touches.length === 1) {
                      const dist = Math.hypot(
                        e.touches[0].clientX - touchStartPosRef.current.x,
                        e.touches[0].clientY - touchStartPosRef.current.y
                      );
                      if (dist > 10) {
                        cancelHold();
                      }
                    }
                  }}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      startHold(entry, e.clientX, e.clientY);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (touchStartPosRef.current) {
                      const dist = Math.hypot(
                        e.clientX - touchStartPosRef.current.x,
                        e.clientY - touchStartPosRef.current.y
                      );
                      if (dist > 10) {
                        cancelHold();
                      }
                    }
                  }}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cancelHold();
                    setHeldEntry(entry);
                  }}
                  onClick={() => {
                    if (isLongPressTriggeredRef.current) {
                      isLongPressTriggeredRef.current = false;
                      return;
                    }
                    onSelectEntry(entry);
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between group select-none ${cardClass}`}
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

      {/* Hold Down Options Menu (Pin / Delete) */}
      {heldEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setHeldEntry(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm p-5 rounded-t-3xl sm:rounded-3xl border shadow-2xl animate-slideUp sm:animate-scaleIn ${
              isPureBlack
                ? 'bg-neutral-950 border-neutral-900 text-white'
                : isNavy
                ? 'bg-[#1c2541] border-[#3a506b] text-white'
                : darkMode
                ? 'bg-neutral-900 border-neutral-800 text-white'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            {/* Note Preview Info */}
            <div className="mb-4 pb-3 border-b border-stone-200 dark:border-stone-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Note Options
              </span>
              <h3 className="text-base font-extrabold truncate mt-0.5">
                {heldEntry.title || 'Untitled Note'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {formatDateDDMMYYYY(heldEntry.dateString)}
              </p>
            </div>

            {/* Actions List */}
            <div className="flex flex-col gap-2">
              {/* Pin / Unpin Button */}
              <button
                type="button"
                onClick={() => {
                  const entryToPin = heldEntry;
                  setHeldEntry(null);
                  onTogglePinEntry?.(entryToPin.id);
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl font-bold text-sm transition-colors text-left ${
                  isPureBlack
                    ? 'hover:bg-neutral-900 text-stone-200'
                    : isNavy
                    ? 'hover:bg-[#253256] text-[#e0e1dd]'
                    : darkMode
                    ? 'hover:bg-neutral-800 text-neutral-200'
                    : 'hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    heldEntry.pinned
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {heldEntry.pinned ? (
                    <PinOff className="w-5 h-5" />
                  ) : (
                    <Pin className="w-5 h-5 fill-current" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">
                    {heldEntry.pinned ? 'Unpin Note' : 'Pin to Top'}
                  </div>
                  <div className="text-xs opacity-60 font-normal">
                    {heldEntry.pinned
                      ? 'Remove from top of list'
                      : 'Keep at the top of your notes'}
                  </div>
                </div>
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => {
                  const entryToDeleteRef = heldEntry;
                  setHeldEntry(null);
                  setEntryToDelete(entryToDeleteRef);
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl font-bold text-sm transition-colors text-left hover:bg-red-500/10 text-red-500"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">Delete Note</div>
                  <div className="text-xs opacity-75 font-normal">
                    Move to Recently Deleted
                  </div>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="mt-4 pt-2 border-t border-stone-200 dark:border-stone-800/80">
              <button
                type="button"
                onClick={() => setHeldEntry(null)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isPureBlack
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-stone-300'
                    : isNavy
                    ? 'bg-[#253256] hover:bg-[#2e3e6b] text-[#e0e1dd]'
                    : darkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-stone-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
