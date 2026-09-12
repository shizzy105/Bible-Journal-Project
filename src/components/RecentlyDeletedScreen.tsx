import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Clock,
  BookOpen,
  Mic,
  Edit3,
  Calendar,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
} from 'lucide-react';
import { DeletedJournalEntry, JournalEntry } from '../types/journal';
import {
  getRecentlyDeletedEntries,
  restoreDeletedEntry,
  permanentlyDeleteEntry,
  emptyRecentlyDeleted,
  AppTheme,
} from '../services/storage';
import { getJournalEntryTextSnippet, parseBibleReferences, formatDateDDMMYYYY } from '../utils/bibleParser';

interface RecentlyDeletedScreenProps {
  onBack: () => void;
  onRestoreEntry?: (entry: JournalEntry) => void;
  darkMode: boolean;
  currentTheme?: AppTheme;
}

export const RecentlyDeletedScreen: React.FC<RecentlyDeletedScreenProps> = ({
  onBack,
  onRestoreEntry,
  darkMode,
  currentTheme,
}) => {
  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

  const bgClass = isPureBlack
    ? 'bg-black text-white'
    : isNavy
    ? 'bg-[#0b132b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-950 text-neutral-100'
    : 'bg-stone-100 text-stone-900';

  const navBarClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-200 shadow-2xs';

  const infoBannerClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 text-neutral-300'
    : isNavy
    ? 'bg-[#1c2541]/60 border-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
    : 'bg-stone-200/60 border-stone-300/80 text-stone-700';

  const cardClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 hover:border-neutral-800 shadow-sm'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] hover:border-[#4f6d7a] shadow-sm'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-sm'
    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-md';

  const modalBgClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 text-white'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] text-white'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 text-white'
    : 'bg-white border-stone-200 text-stone-900';

  const modalFooterClass = isPureBlack
    ? 'border-neutral-900 bg-black'
    : isNavy
    ? 'border-[#3a506b] bg-[#0b132b]'
    : darkMode
    ? 'border-neutral-800 bg-neutral-950'
    : 'border-stone-200 bg-stone-50';

  const secondaryBtnClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
    : isNavy
    ? 'bg-[#232f55] hover:bg-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
    : 'bg-stone-100 hover:bg-stone-200 text-stone-700';

  const dividerClass = isPureBlack
    ? 'border-neutral-900'
    : isNavy
    ? 'border-[#3a506b]'
    : darkMode
    ? 'border-neutral-800'
    : 'border-stone-100';

  const [deletedList, setDeletedList] = useState<DeletedJournalEntry[]>([]);
  const [previewEntry, setPreviewEntry] = useState<JournalEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [entryToPermanentlyDelete, setEntryToPermanentlyDelete] = useState<JournalEntry | null>(null);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState<boolean>(false);

  useEffect(() => {
    loadDeletedList();
  }, []);

  const loadDeletedList = () => {
    const list = getRecentlyDeletedEntries();
    setDeletedList(list);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleRestore = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const result = restoreDeletedEntry(id);
    setDeletedList(result.deleted);
    const restored = result.active.find((item) => item.id === id);
    if (restored && onRestoreEntry) {
      onRestoreEntry(restored);
    }
    showToast('Note restored to your journal!');
    if (previewEntry?.id === id) {
      setPreviewEntry(null);
    }
  };

  const confirmPermanentlyDelete = () => {
    if (!entryToPermanentlyDelete) return;
    const id = entryToPermanentlyDelete.id;
    setEntryToPermanentlyDelete(null);
    const remaining = permanentlyDeleteEntry(id);
    setDeletedList(remaining);
    showToast('Note permanently deleted.');
    if (previewEntry?.id === id) {
      setPreviewEntry(null);
    }
  };

  const confirmEmptyTrash = () => {
    setShowEmptyTrashModal(false);
    emptyRecentlyDeleted();
    setDeletedList([]);
    showToast('Trash emptied completely.');
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deletedTime = new Date(deletedAt).getTime();
    if (isNaN(deletedTime)) return 30;
    const diffDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return Math.max(1, Math.min(30, remaining));
  };

  return (
    <div
      className={`flex flex-col min-h-full transition-colors ${bgClass}`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 dark:bg-neutral-800/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-neutral-700 flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${navBarClass}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Recently Deleted</h1>
            <p className="text-xs opacity-60">Auto-erased after 30 days</p>
          </div>
        </div>

        {deletedList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyTrashModal(true)}
            className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
            title="Empty all items in trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="max-w-xl mx-auto w-full px-4 sm:px-6 pt-4">
        <div
          className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${infoBannerClass}`}
        >
          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">30-Day Retention Window:</span> Notes remain here for 30 days after deletion so you can recover accidental deletions. Items older than 30 days are automatically purged.
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full pb-20">
        {deletedList.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-stone-200/60 dark:bg-neutral-800/60 flex items-center justify-center mx-auto mb-4 text-stone-400 dark:text-neutral-500">
              <Trash2 className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-bold mb-1">Trash is Empty</h3>
            <p className="text-xs text-stone-400 dark:text-neutral-500 max-w-xs mx-auto">
              No notes have been deleted in the past 30 days. When you delete a note from your journal, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {deletedList.map((item) => {
              const entry = item.entry;
              const daysLeft = getDaysRemaining(item.deletedAt);
              const snippet = getJournalEntryTextSnippet(entry);
              const hasRefs = entry.blocks.some(
                (b) => b.type === 'verse' || (b.type === 'text' && parseBibleReferences(b.content).length > 0)
              );
              const hasVoice = entry.blocks.some((b) => b.type === 'voice');
              const hasDrawing = entry.blocks.some((b) => b.type === 'drawing');

              return (
                <div
                  key={entry.id}
                  onClick={() => setPreviewEntry(entry)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer group ${cardClass}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-base line-clamp-1 group-hover:text-red-500 transition-colors">
                      {entry.title || 'Untitled Note'}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        daysLeft <= 5
                          ? 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 dark:text-neutral-400 line-clamp-2 my-1 leading-relaxed">
                    {snippet || 'No text content'}
                  </p>

                  <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${dividerClass} text-[10px] text-stone-400`}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-red-500" />
                      <span>Created: {formatDateDDMMYYYY(entry.dateString)}</span>
                    </span>
                    {hasRefs && (
                      <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-semibold">
                        <BookOpen className="w-3 h-3" />
                        <span>Scripture</span>
                      </span>
                    )}
                    {hasVoice && (
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Mic className="w-3 h-3" />
                        <span>Voice</span>
                      </span>
                    )}
                    {hasDrawing && (
                      <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <Edit3 className="w-3 h-3" />
                        <span>Sketch</span>
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className={`flex items-center justify-end gap-2 mt-3 pt-2.5 border-t ${dividerClass}`}>
                    <button
                      type="button"
                      onClick={(e) => handleRestore(entry.id, e)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                      title="Restore note to journal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToPermanentlyDelete(entry);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-stone-600 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="Permanently erase note"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete Forever</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Read-Only Preview Modal */}
      {previewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-lg max-h-[85vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${modalBgClass}`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${dividerClass}`}>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm">Note Preview (Read-Only)</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl font-black">{previewEntry.title || 'Untitled Note'}</h2>
                <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  <span>{formatDateDDMMYYYY(previewEntry.dateString)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {previewEntry.blocks.map((block) => {
                  if (block.type === 'text') {
                    return (
                      <div
                        key={block.id}
                        className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: block.content || '<p class="opacity-40 italic">Empty block</p>' }}
                      />
                    );
                  }
                  if (block.type === 'drawing') {
                    return (
                      <div key={block.id} className={`p-2 border rounded-2xl bg-white dark:bg-neutral-900 ${dividerClass}`}>
                        <img
                          src={block.dataUrl}
                          alt="Sketch"
                          className="max-h-56 mx-auto object-contain rounded-xl"
                        />
                      </div>
                    );
                  }
                  if (block.type === 'image') {
                    return (
                      <div key={block.id} className={`p-2 border rounded-2xl bg-white dark:bg-neutral-900 ${dividerClass}`}>
                        <img
                          src={block.imageUrl}
                          alt="Attached Screenshot"
                          className="max-h-64 mx-auto object-contain rounded-xl"
                        />
                      </div>
                    );
                  }
                  if (block.type === 'voice') {
                    return (
                      <div key={block.id} className={`p-3 rounded-2xl border flex items-center gap-3 bg-stone-100 dark:bg-neutral-900 ${dividerClass}`}>
                        <Mic className="w-4 h-4 text-emerald-500" />
                        <div className="text-xs">
                          <span className="font-bold">Audio Note</span>
                          <span className="opacity-60 ml-2">({block.durationSeconds}s)</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-between gap-3 ${modalFooterClass}`}>
              <button
                type="button"
                onClick={() => setEntryToPermanentlyDelete(previewEntry)}
                className="px-3.5 py-2 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>

              <button
                type="button"
                onClick={() => handleRestore(previewEntry.id)}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanently Delete Confirmation Modal */}
      {entryToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-sm p-5 sm:p-6 rounded-3xl border shadow-2xl ${modalBgClass}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3.5">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-1">Permanently delete note?</h3>
            <p className="text-xs opacity-75 mb-5 leading-relaxed">
              "{entryToPermanentlyDelete.title || 'Untitled Note'}" will be erased immediately. This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEntryToPermanentlyDelete(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${secondaryBtnClass}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentlyDelete}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Forever</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {showEmptyTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-sm p-5 sm:p-6 rounded-3xl border shadow-2xl ${modalBgClass}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3.5">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-1">Empty all trash?</h3>
            <p className="text-xs opacity-75 mb-5 leading-relaxed">
              All {deletedList.length} note(s) in Recently Deleted will be permanently destroyed.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEmptyTrashModal(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${secondaryBtnClass}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEmptyTrash}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
