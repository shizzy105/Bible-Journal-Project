import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Pin,
  Trash2,
  Mic,
  Edit3,
  BookOpen,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Type,
  Check,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
} from 'lucide-react';
import {
  JournalEntry,
  JournalBlock,
  TextBlock,
  VoiceBlock,
  DrawingBlock,
  ImageBlock,
  VerseBlock,
  BibleReferenceMatch,
} from '../types/journal';
import { AudioPlayer } from './AudioPlayer';
import { segmentTextWithReferences, parseBibleReferences } from '../utils/bibleParser';
import { BibleVersePopup } from './BibleVersePopup';
import { VoiceRecorderModal } from './VoiceRecorderModal';
import { DrawingCanvasModal } from './DrawingCanvasModal';
import { InsertReferenceModal } from './InsertReferenceModal';

interface NoteEditorScreenProps {
  entry: JournalEntry;
  onSave: (updatedEntry: JournalEntry) => void;
  onDelete: (entryId: string) => void;
  onBack: () => void;
  darkMode: boolean;
}

// Sub-component for clean, auto-expanding Rich Text Block with inline Scripture links & formatting support
interface TextBlockItemProps {
  block: TextBlock;
  onChange: (content: string) => void;
  onDeleteBlock: () => void;
  onOpenVerse: (match: BibleReferenceMatch) => void;
  darkMode: boolean;
  autoFocus?: boolean;
}

const TextBlockItem: React.FC<TextBlockItemProps> = ({
  block,
  onChange,
  onDeleteBlock,
  onOpenVerse,
  darkMode,
  autoFocus,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Helper to place caret at end of contenteditable element
  const focusEditorAndPlaceCaret = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // Helper to construct HTML from text content containing bible references while preserving rich text markup
  const buildHtmlFromText = (text: string) => {
    if (!text) return '';
    // If text already contains data-ref or rich HTML markup, preserve it directly
    if (
      text.includes('data-ref') ||
      text.includes('<b') ||
      text.includes('<i') ||
      text.includes('<u') ||
      text.includes('<mark') ||
      text.includes('<font') ||
      text.includes('style=') ||
      text.includes('<div')
    ) {
      return text;
    }

    const segments = segmentTextWithReferences(text);
    return segments
      .map((seg) => {
        if (seg.type === 'bibleRef' && seg.match) {
          const escapedContent = seg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<span contenteditable="false" data-ref="${escapedContent}" class="inline-flex items-center gap-1 mx-1 my-0 px-2 py-[2px] rounded-md bg-red-100/90 dark:bg-red-950/70 border border-red-200/80 dark:border-red-900/80 text-red-600 dark:text-red-400 font-semibold text-[0.9em] leading-tight align-baseline select-none cursor-pointer"><span class="ref-click-btn inline-flex items-center gap-1 hover:underline"><svg class="w-3.5 h-3.5 inline shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span>${escapedContent}</span></span><span class="ref-delete-btn p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-900 text-red-500 transition-colors ml-0.5 cursor-pointer" title="Remove reference">✕</span></span>`;
        } else {
          return seg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
        }
      })
      .join('');
  };

  // Sync content updates
  useEffect(() => {
    if (editorRef.current) {
      const html = buildHtmlFromText(block.content);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
        if (autoFocus) {
          focusEditorAndPlaceCaret();
        }
      }
    }
  }, [block.content]);

  useEffect(() => {
    if (autoFocus) {
      focusEditorAndPlaceCaret();
    }
  }, [autoFocus]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // If Backspace key on empty block, delete the text block
    if (e.key === 'Backspace' && (!block.content || block.content.trim() === '')) {
      e.preventDefault();
      onDeleteBlock();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Clicked on scripture text or icon -> Open Verse Reader
    const refClickBtn = target.closest('.ref-click-btn');
    if (refClickBtn) {
      e.stopPropagation();
      const parentSpan = target.closest('[data-ref]');
      const refStr = parentSpan?.getAttribute('data-ref');
      if (refStr) {
        const matches = parseBibleReferences(refStr);
        if (matches.length > 0) {
          onOpenVerse(matches[0]);
        }
      }
      return;
    }

    // Clicked on '✕' delete button -> Remove tag from text
    const refDeleteBtn = target.closest('.ref-delete-btn');
    if (refDeleteBtn) {
      e.stopPropagation();
      const parentSpan = target.closest('[data-ref]');
      if (parentSpan) {
        parentSpan.remove();
        handleInput();
      }
      return;
    }
  };

  return (
    <div className="relative min-h-[40px] py-1 cursor-text">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        data-placeholder="Start typing..."
        className="w-full bg-transparent font-serif text-lg sm:text-xl leading-relaxed text-stone-900 dark:text-stone-100 focus:outline-none p-0 empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400/40 select-text"
      />
    </div>
  );
};

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({
  entry,
  onSave,
  onDelete,
  onBack,
  darkMode,
}) => {
  const [title, setTitle] = useState<string>(entry.title);
  const [blocks, setBlocks] = useState<JournalBlock[]>(entry.blocks);
  const [dateString, setDateString] = useState<string>(entry.dateString);
  const [isPinned, setIsPinned] = useState<boolean>(entry.pinned || false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Active Insertion Index (where new media/text/reference block is inserted)
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(entry.blocks.length - 1);

  // Modals state
  const [activePopupMatch, setActivePopupMatch] = useState<BibleReferenceMatch | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState<boolean>(false);
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [customRefInput, setCustomRefInput] = useState<string>('Matt 5 v 7-20');
  const [showFormatToolbar, setShowFormatToolbar] = useState<boolean>(false);

  const executeFormat = (command: string, value: string = '') => {
    try {
      document.execCommand(command, false, value);
    } catch (err) {
      console.warn('Execute format command error:', err);
    }
  };

  // Image Upload File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Playback state & refs
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Debounced Auto-Save
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const updated: JournalEntry = {
        ...entry,
        title,
        blocks,
        dateString,
        pinned: isPinned,
        updatedAt: new Date().toISOString(),
      };
      onSave(updated);
      setSaveStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [title, blocks, dateString, isPinned]);

  // Handle updating text content
  const handleTextBlockChange = (blockId: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content: newContent } : b))
    );
  };

  // Move block up in sequence
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setActiveBlockIndex(index - 1);
  };

  // Move block down in sequence
  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setActiveBlockIndex(index + 1);
  };

  // Delete a block at index
  const handleDeleteBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to insert a block at current target index
  const insertBlockAt = (newBlock: JournalBlock, targetIndex?: number) => {
    const idx = targetIndex !== undefined && targetIndex >= 0 ? targetIndex : blocks.length - 1;
    setBlocks((prev) => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, newBlock);
      return copy;
    });
    setActiveBlockIndex(idx + 1);
  };

  // Helper to insert a media block AND auto-append an empty text block below it for seamless typing
  const insertMediaWithTextBelow = (mediaBlock: JournalBlock) => {
    const newTextBlock: TextBlock = {
      id: `text-${Date.now() + 1}`,
      type: 'text',
      content: '',
    };

    setBlocks((prev) => {
      const targetIdx = activeBlockIndex >= 0 && activeBlockIndex < prev.length ? activeBlockIndex : prev.length - 1;
      const copy = [...prev];
      copy.splice(targetIdx + 1, 0, mediaBlock, newTextBlock);
      return copy;
    });
    setActiveBlockIndex(activeBlockIndex + 2);
  };

  // Add new Text block
  const handleAddTextBlock = (atIndex?: number) => {
    const newBlock: TextBlock = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: '',
    };
    insertBlockAt(newBlock, atIndex !== undefined ? atIndex : activeBlockIndex);
  };

  // Handle Voice Note created
  const handleAddVoiceNote = (voiceBlock: VoiceBlock) => {
    insertMediaWithTextBelow(voiceBlock);
  };

  // Handle Drawing created
  const handleAddDrawing = (drawingBlock: DrawingBlock) => {
    insertMediaWithTextBelow(drawingBlock);
  };

  // Handle Image Upload from Gallery/Camera
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const imageBlock: ImageBlock = {
          id: `image-${Date.now()}`,
          type: 'image',
          imageUrl: dataUrl,
          createdAt: new Date().toISOString(),
        };
        insertMediaWithTextBelow(imageBlock);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert Reference (e.g. Matt 5 v 7-20) into active text block or as text
  const handleInsertReferenceText = (refText: string) => {
    const formattedRef = `${refText.trim()} `;

    if (blocks.length === 0) {
      const newBlock: TextBlock = {
        id: `text-${Date.now()}`,
        type: 'text',
        content: formattedRef,
      };
      setBlocks([newBlock]);
      setActiveBlockIndex(0);
    } else {
      const targetIdx = activeBlockIndex >= 0 && activeBlockIndex < blocks.length ? activeBlockIndex : blocks.length - 1;
      const targetBlock = blocks[targetIdx];

      if (targetBlock && targetBlock.type === 'text') {
        setBlocks((prev) =>
          prev.map((b, i) =>
            i === targetIdx ? { ...b, content: (b.content ? b.content + ' ' : '') + formattedRef } : b
          )
        );
      } else {
        const newBlock: TextBlock = {
          id: `text-${Date.now()}`,
          type: 'text',
          content: formattedRef,
        };
        insertBlockAt(newBlock, targetIdx);
      }
    }
    setShowReferenceModal(false);
  };

  const handleToggleVoicePlay = (voiceBlock: VoiceBlock) => {
    if (playingVoiceId === voiceBlock.id) {
      stopCurrentAudio();
      setPlayingVoiceId(null);
    } else {
      stopCurrentAudio();
      setPlayingVoiceId(voiceBlock.id);

      let playedReal = false;
      if (
        voiceBlock.audioUrl &&
        (voiceBlock.audioUrl.startsWith('blob:') ||
          voiceBlock.audioUrl.startsWith('http') ||
          voiceBlock.audioUrl.startsWith('data:'))
      ) {
        try {
          const audio = new Audio(voiceBlock.audioUrl);
          activeAudioRef.current = audio;

          audio.onended = () => {
            setPlayingVoiceId(null);
            activeAudioRef.current = null;
          };

          audio.onerror = () => {
            activeAudioRef.current = null;
            setPlayingVoiceId(null);
          };

          audio.play().then(() => {
            playedReal = true;
          }).catch(() => {
            activeAudioRef.current = null;
            setPlayingVoiceId(null);
          });
        } catch {
          activeAudioRef.current = null;
          setPlayingVoiceId(null);
        }
      }
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-stone-900'}`}>
      {/* Hidden File Input for Photo Uploads */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-stone-100'
        } backdrop-blur-md`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 dark:text-stone-300 transition-colors"
            title="Back to Journal List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Date Picker Button */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-red-500" />
            <input
              type="date"
              value={dateString}
              onChange={(e) => setDateString(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400 font-medium">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>

          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-xl transition-colors ${
              isPinned
                ? 'bg-red-600 text-white'
                : 'hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400'
            }`}
            title={isPinned ? 'Unpin note' : 'Pin note to top'}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this journal note?')) {
                onDelete(entry.id);
                onBack();
              }
            }}
            className="p-2 rounded-xl hover:bg-red-950/40 text-stone-400 hover:text-red-500 transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Editor Workspace */}
      <div
        id="main-canvas"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === 'main-canvas' || e.target === e.currentTarget) {
            if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
              handleAddTextBlock(blocks.length - 1);
            } else {
              setActiveBlockIndex(blocks.length - 1);
            }
          }
        }}
        className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4 pb-36 min-h-[70vh] cursor-text"
      >
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title..."
          className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent focus:outline-none placeholder:text-stone-400/60 text-stone-900 dark:text-white"
        />

        {/* Sequential Mixed Content Blocks List */}
        <div className="space-y-4">
          {blocks.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 dark:border-slate-800 rounded-3xl p-6">
              <p className="text-sm font-semibold text-stone-500">Your note entry is currently empty.</p>
              <p className="text-xs text-stone-400 mt-1 mb-4">Add text, images, voice notes, sketches, or scripture references in any order below.</p>
              <button
                onClick={() => handleAddTextBlock(0)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-2xl shadow-md"
              >
                + Start Writing
              </button>
            </div>
          )}

          {blocks.map((block, index) => {
            return (
              <div
                key={block.id}
                onClick={() => setActiveBlockIndex(index)}
                className="relative group transition-all"
              >
                {/* Subtle Hover Action Bar for moving/deleting block */}
                <div className="absolute right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 bg-stone-900/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1 rounded-full text-white text-[10px] shadow-lg">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(index);
                    }}
                    disabled={index === 0}
                    className="p-1 hover:text-red-400 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(index);
                    }}
                    disabled={index === blocks.length - 1}
                    className="p-1 hover:text-red-400 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBlock(index);
                    }}
                    className="p-1 hover:text-red-400 text-stone-300"
                    title="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* 1. TEXT BLOCK */}
                {block.type === 'text' && (
                  <TextBlockItem
                    block={block}
                    onChange={(content) => handleTextBlockChange(block.id, content)}
                    onDeleteBlock={() => handleDeleteBlock(index)}
                    onOpenVerse={(match) => setActivePopupMatch(match)}
                    darkMode={darkMode}
                    autoFocus={activeBlockIndex === index}
                  />
                )}

                {/* Legacy Verse Block Fallback as Text */}
                {block.type === 'verse' && (
                  <TextBlockItem
                    block={{
                      id: block.id,
                      type: 'text',
                      content: `${block.reference}`,
                    }}
                    onChange={(content) => handleTextBlockChange(block.id, content)}
                    onDeleteBlock={() => handleDeleteBlock(index)}
                    onOpenVerse={(match) => setActivePopupMatch(match)}
                    darkMode={darkMode}
                  />
                )}

                {/* 3. IMAGE BLOCK */}
                {block.type === 'image' && (
                  <div className="relative group my-3 flex flex-col items-center">
                    <img
                      src={block.imageUrl}
                      alt="Journal Attachment"
                      className="max-h-96 w-full object-cover rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(index);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/70 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md active:scale-90"
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 4. VOICE BLOCK - Feature-rich Audio Player with progress timeline, scrubbing, and speed control */}
                {block.type === 'voice' && (
                  <AudioPlayer
                    src={block.audioUrl}
                    durationSeconds={block.durationSeconds}
                    title={block.title || 'Voice Note'}
                    onDelete={() => handleDeleteBlock(index)}
                  />
                )}

                {/* 5. DRAWING BLOCK - Clean Sketch Container */}
                {block.type === 'drawing' && (
                  <div className="relative group my-3 flex flex-col items-center bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3 shadow-xs">
                    <img
                      src={block.dataUrl}
                      alt="Prayer Sketch"
                      className="max-h-72 w-full object-contain rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(index);
                      }}
                      className="absolute top-5 right-5 p-2 rounded-full bg-stone-950/70 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md active:scale-90"
                      title="Delete sketch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar (Input Media & Reference Toolbar) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 p-2 sm:p-3 border-t flex flex-col gap-2 ${
          darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-stone-200 text-stone-800'
        } backdrop-blur-md shadow-lg max-w-2xl mx-auto rounded-t-3xl`}
      >
        {/* Rich Text Formatting Sub-Toolbar Drawer attached directly under/above the Text button */}
        {showFormatToolbar && (
          <div className="flex items-center justify-between gap-1 p-2 bg-stone-100 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 backdrop-blur-md overflow-x-auto text-stone-800 dark:text-stone-200 shadow-sm animate-in fade-in duration-150">
            {/* Style Group: Bold, Italic, Underline */}
            <div className="flex items-center gap-1 border-r border-stone-300 dark:border-slate-700 pr-2 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('bold');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 font-bold active:scale-95 transition-transform"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('italic');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 italic active:scale-95 transition-transform"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('underline');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 underline active:scale-95 transition-transform"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Font Size Group */}
            <div className="flex items-center gap-1 border-r border-stone-300 dark:border-slate-700 pr-2 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '2');
                }}
                className="px-2 py-1 rounded-lg text-xs font-bold hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 active:scale-95"
                title="Small font size"
              >
                S
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '3');
                }}
                className="px-2 py-1 rounded-lg text-sm font-bold hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 active:scale-95"
                title="Medium font size"
              >
                M
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '5');
                }}
                className="px-2 py-1 rounded-lg text-base font-extrabold hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 active:scale-95"
                title="Large font size"
              >
                L
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '6');
                }}
                className="px-2 py-1 rounded-lg text-lg font-black hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-900 dark:text-white active:scale-95"
                title="Extra Large font size"
              >
                XL
              </button>
            </div>

            {/* Alignment Group */}
            <div className="flex items-center gap-1 border-r border-stone-300 dark:border-slate-700 pr-2 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('justifyLeft');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 active:scale-95"
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('justifyCenter');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 active:scale-95"
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('justifyRight');
                }}
                className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 active:scale-95"
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            {/* Verse Highlighting Colors */}
            <div className="flex items-center gap-1.5 pl-1 shrink-0">
              <Highlighter className="w-3.5 h-3.5 opacity-60 shrink-0" title="Verse Highlight" />
              {/* Yellow Gold */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('hiliteColor', '#fef08a');
                }}
                className="w-5 h-5 rounded-full bg-yellow-300 border border-yellow-400 hover:scale-110 transition-transform ring-1 ring-black/10"
                title="Highlight Yellow Gold"
              />
              {/* Rose Red */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('hiliteColor', '#fca5a5');
                }}
                className="w-5 h-5 rounded-full bg-red-300 border border-red-400 hover:scale-110 transition-transform ring-1 ring-black/10"
                title="Highlight Rose Grace"
              />
              {/* Emerald Green */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('hiliteColor', '#bbf7d0');
                }}
                className="w-5 h-5 rounded-full bg-emerald-300 border border-emerald-400 hover:scale-110 transition-transform ring-1 ring-black/10"
                title="Highlight Life Green"
              />
              {/* Sky Blue */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('hiliteColor', '#bfdbfe');
                }}
                className="w-5 h-5 rounded-full bg-blue-300 border border-blue-400 hover:scale-110 transition-transform ring-1 ring-black/10"
                title="Highlight Living Water Blue"
              />
              {/* Clear Highlight */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('removeFormat');
                  executeFormat('hiliteColor', 'transparent');
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-slate-700"
                title="Remove Highlight / Clear Format"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-around gap-1.5 pt-1">
          {/* Add Text Block / Toggle Format Options */}
          <button
            onClick={() => {
              if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
                handleAddTextBlock();
              }
              setShowFormatToolbar((prev) => !prev);
            }}
            className={`flex-1 py-2 px-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 ${
              showFormatToolbar
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-slate-700'
            }`}
            title="Toggle Rich Text formatting options (Bold, Italic, Underline, Size, Highlight)"
          >
            <Type className={`w-4 h-4 ${showFormatToolbar ? 'text-white' : 'text-blue-500'}`} />
            <span>Text</span>
          </button>

          {/* Add Image/Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Add photo or image from gallery"
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>Photo</span>
          </button>

          {/* Add Voice Note Button */}
          <button
            onClick={() => setShowVoiceRecorder(true)}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Record audio voice note"
          >
            <Mic className="w-4 h-4 text-rose-500" />
            <span>Voice</span>
          </button>

          {/* Add Sketch Button */}
          <button
            onClick={() => setShowDrawingCanvas(true)}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Draw prayer sketch"
          >
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span>Sketch</span>
          </button>

          {/* + Reference Button */}
          <button
            onClick={() => setShowReferenceModal(true)}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-transform active:scale-95 shrink-0"
            title="Add Bible verse reference"
          >
            <BookOpen className="w-4 h-4" />
            <span>+ Reference</span>
          </button>
        </div>
      </div>

      {/* Scripture Reference Input Modal with Book Suggestions & Strict Chapter/Verse Validation */}
      {showReferenceModal && (
        <InsertReferenceModal
          onClose={() => setShowReferenceModal(false)}
          onInsert={handleInsertReferenceText}
        />
      )}

      {/* Verse Reader Modal */}
      {activePopupMatch && (
        <BibleVersePopup
          match={activePopupMatch}
          onClose={() => setActivePopupMatch(null)}
          onInsertIntoNote={handleInsertReferenceText}
        />
      )}

      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorderModal
          onClose={() => setShowVoiceRecorder(false)}
          onSaveVoiceNote={handleAddVoiceNote}
        />
      )}

      {/* Drawing Canvas Modal */}
      {showDrawingCanvas && (
        <DrawingCanvasModal
          onClose={() => setShowDrawingCanvas(false)}
          onSaveDrawing={handleAddDrawing}
        />
      )}
    </div>
  );
};

