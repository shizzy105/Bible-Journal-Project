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
  Undo2,
  Redo2,
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
import {
  segmentTextWithReferences,
  parseBibleReferences,
  processHtmlWithReferences,
  createRefChipHtml,
  formatDateDDMMYYYY,
} from '../utils/bibleParser';
import { BibleVersePopup } from './BibleVersePopup';
import { StrongsConcordancePopup } from './StrongsConcordancePopup';
import { VoiceRecorderModal } from './VoiceRecorderModal';
import { DrawingCanvasModal } from './DrawingCanvasModal';
import { InsertReferenceModal } from './InsertReferenceModal';
import { ImageBlockItem } from './ImageBlockItem';
import { parseStrongsReference } from '../data/strongsData';

// Helpers for caret character offset tracking inside contenteditable elements
function getCaretCharacterOffsetWithin(element: HTMLElement): { start: number; end: number } {
  let start = 0;
  let end = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (element.contains(range.commonAncestorContainer)) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      start = preCaretRange.toString().length;
      end = start + range.toString().length;
    }
  }
  return { start, end };
}

function setCaretCharacterOffsetWithin(element: HTMLElement, startOffset: number, endOffset: number = startOffset) {
  const sel = window.getSelection();
  if (!sel) return;

  let currentPos = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;

  function traverse(node: Node) {
    if (startNode && endNode) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLen = node.textContent?.length || 0;
      if (!startNode && currentPos + textLen >= startOffset) {
        startNode = node;
        startNodeOffset = Math.max(0, startOffset - currentPos);
      }
      if (!endNode && currentPos + textLen >= endOffset) {
        endNode = node;
        endNodeOffset = Math.max(0, endOffset - currentPos);
      }
      currentPos += textLen;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }

  traverse(element);

  if (!startNode) {
    startNode = element;
    startNodeOffset = element.childNodes.length;
  }
  if (!endNode) {
    endNode = startNode;
    endNodeOffset = startNodeOffset;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {
    console.warn('Failed to set caret character offset:', e);
  }
}

// Utility to keep the active caret/selection comfortably visible above the software keyboard & bottom bar
export const ensureCaretVisible = (safetyMargin = 80) => {
  if (typeof window === 'undefined') return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const editableEl = (
    container.nodeType === Node.ELEMENT_NODE
      ? (container as HTMLElement).closest('[contenteditable="true"], input, textarea')
      : container.parentElement?.closest('[contenteditable="true"], input, textarea')
  ) as HTMLElement | null;

  if (!editableEl) return;

  let rect = range.getBoundingClientRect();

  // Handle collapsed caret with 0x0 rect by creating a temporary zero-width marker
  if (rect.width === 0 && rect.height === 0) {
    try {
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u200b'));
      const cloned = range.cloneRange();
      cloned.insertNode(span);
      rect = span.getBoundingClientRect();
      if (span.parentNode) {
        span.parentNode.removeChild(span);
      }
    } catch {
      const node = range.startContainer;
      const parentEl = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      if (parentEl) {
        rect = parentEl.getBoundingClientRect();
      }
    }
  }

  if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.left === 0 && rect.right === 0)) return;

  const viewport = window.visualViewport;
  const vpHeight = viewport ? viewport.height : window.innerHeight;
  const vpTop = viewport ? viewport.offsetTop : 0;
  const vpBottom = vpTop + vpHeight;

  // Account for fixed bottom action bar (~70px)
  const bottomBarHeight = 70;
  const maxAllowedBottom = vpBottom - bottomBarHeight - safetyMargin;
  const minAllowedTop = vpTop + 75;

  if (rect.bottom > maxAllowedBottom) {
    const scrollDelta = rect.bottom - maxAllowedBottom;
    window.scrollBy({ top: scrollDelta, behavior: 'smooth' });
  } else if (rect.top < minAllowedTop) {
    const scrollDelta = rect.top - minAllowedTop;
    window.scrollBy({ top: scrollDelta, behavior: 'smooth' });
  }
};

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
  blockIndex?: number;
  totalBlocksCount?: number;
  onChange: (content: string) => void;
  onDeleteBlock: () => void;
  onOpenVerse: (match: BibleReferenceMatch) => void;
  onOpenStrongs?: (strongsId: string) => void;
  onSelectionChange?: () => void;
  darkMode: boolean;
  autoFocus?: boolean;
}

const TextBlockItem: React.FC<TextBlockItemProps> = ({
  block,
  blockIndex,
  totalBlocksCount,
  onChange,
  onDeleteBlock,
  onOpenVerse,
  onOpenStrongs,
  onSelectionChange,
  darkMode,
  autoFocus,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);
  const prevAutoFocusRef = useRef(false);
  const lastTapHandledRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number; target: HTMLElement | null } | null>(null);

  // Helper to place caret at end of contenteditable element safely without forcing page jump or scroll shift
  const focusEditorAndPlaceCaret = () => {
    if (!editorRef.current) return;
    try {
      editorRef.current.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch {
      // ignore
    }
  };

  // Helper to construct HTML from text content containing bible references while preserving rich text markup
  const buildHtmlFromText = (text: string) => {
    if (!text) return '';
    return processHtmlWithReferences(text);
  };

  // Initialize and synchronize content updates safely without destroying active DOM cursor
  useEffect(() => {
    if (!editorRef.current) return;

    const html = buildHtmlFromText(block.content);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      editorRef.current.innerHTML = html;
      if (autoFocus) {
        focusEditorAndPlaceCaret();
      }
      return;
    }

    // Crucial: If the user is currently focused/editing in this element, DO NOT overwrite innerHTML
    if (document.activeElement === editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [block.content]);

  // Handle autoFocus ONLY on initial transition from false -> true when NOT already focused
  useEffect(() => {
    if (autoFocus && !prevAutoFocusRef.current) {
      if (document.activeElement !== editorRef.current) {
        focusEditorAndPlaceCaret();
      }
    }
    prevAutoFocusRef.current = !!autoFocus;
  }, [autoFocus]);

  // Direct native DOM capture listeners for mobile Android WebView / Capacitor instant tap detection
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const triggerOpenVerse = (refEl: HTMLElement) => {
      const strongsAttr = refEl.getAttribute('data-strongs');
      const refStr = refEl.getAttribute('data-ref') || strongsAttr;
      if (refStr) {
        const strongsMatch = parseStrongsReference(refStr);
        if (strongsMatch && strongsMatch.isValidRange) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          lastTapHandledRef.current = Date.now();
          onOpenStrongs?.(strongsMatch.id);
          return;
        }
        const matches = parseBibleReferences(refStr);
        if (matches.length > 0) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          lastTapHandledRef.current = Date.now();
          onOpenVerse(matches[0]);
        }
      }
    };

    const onTouchStartCapture = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartPosRef.current = null;
        return;
      }
      const touch = e.touches[0];
      const target = e.target as HTMLElement | null;
      const refSpan = target?.closest('[data-ref]') as HTMLElement | null;
      if (refSpan) {
        // Prevent contenteditable from stealing focus and requiring long press
        e.stopPropagation();
        touchStartPosRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
          target: refSpan,
        };
      } else {
        touchStartPosRef.current = null;
      }
    };

    const onTouchMoveCapture = (e: TouchEvent) => {
      if (!touchStartPosRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dist = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      );
      if (dist > 15) {
        touchStartPosRef.current = null;
      }
    };

    const onTouchEndCapture = (e: TouchEvent) => {
      if (!touchStartPosRef.current) return;
      const start = touchStartPosRef.current;
      touchStartPosRef.current = null;

      const duration = Date.now() - start.time;
      // Fast single tap response (< 600ms)
      if (duration < 600 && start.target) {
        e.preventDefault();
        e.stopPropagation();
        triggerOpenVerse(start.target);
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const refSpan = target?.closest('[data-ref]') as HTMLElement | null;

      // Prevent duplicate trigger if touched within last 500ms
      if (Date.now() - lastTapHandledRef.current < 500) {
        if (refSpan) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (refSpan) {
        e.preventDefault();
        e.stopPropagation();
        triggerOpenVerse(refSpan);
      }
    };

    el.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: false });
    el.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: true });
    el.addEventListener('touchend', onTouchEndCapture, { capture: true, passive: false });
    el.addEventListener('click', onClickCapture, { capture: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStartCapture, { capture: true });
      el.removeEventListener('touchmove', onTouchMoveCapture, { capture: true });
      el.removeEventListener('touchend', onTouchEndCapture, { capture: true });
      el.removeEventListener('click', onClickCapture, { capture: true });
    };
  }, [onOpenVerse]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    onSelectionChange?.();
    ensureCaretVisible(70);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent accidental block deletion
    if (e.key === 'Backspace') {
      const el = editorRef.current;
      const text = el ? (el.innerText || '').replace(/[\u200B\u00A0\s]/g, '') : '';
      const hasMediaOrRef = el ? !!el.querySelector('[data-ref], img, audio, video') : false;

      // If the block has text content or reference chips, DO NOT delete the block container!
      if (text.length > 0 || hasMediaOrRef) {
        return;
      }

      // If this is the only block, never delete it
      if (totalBlocksCount !== undefined && totalBlocksCount <= 1) {
        return;
      }

      e.preventDefault();
      onDeleteBlock();
    }
  };

  return (
    <div className="relative min-h-[40px] py-1 cursor-text">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-block-index={blockIndex}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={() => onSelectionChange?.()}
        onMouseUp={() => onSelectionChange?.()}
        onFocus={() => onSelectionChange?.()}
        data-placeholder="Start typing..."
        style={{ color: darkMode ? '#f8fafc' : '#0f172a' }}
        className="w-full bg-transparent font-serif text-base sm:text-lg leading-relaxed text-stone-900 dark:text-stone-100 focus:outline-none p-0 empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400/40 select-text"
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
  const [activeStrongsId, setActiveStrongsId] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState<boolean>(false);
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [customRefInput, setCustomRefInput] = useState<string>('Matt 5 v 7-20');
  const [showFormatToolbar, setShowFormatToolbar] = useState<boolean>(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: string;
    align: 'left' | 'center' | 'right';
  }>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: '3',
    align: 'left',
  });

  // Latest state reference for instant save flush on back or unmount
  const latestDataRef = useRef({ title, blocks, dateString, isPinned });
  latestDataRef.current = { title, blocks, dateString, isPinned };

  const flushSave = () => {
    try {
      const updated: JournalEntry = {
        ...entry,
        title: latestDataRef.current.title,
        blocks: latestDataRef.current.blocks,
        dateString: latestDataRef.current.dateString,
        pinned: latestDataRef.current.isPinned,
        updatedAt: new Date().toISOString(),
      };
      onSave(updated);
    } catch {
      // ignore
    }
  };

  // Intercept back button / modal dismissal in editor
  const handleEditorBack = () => {
    if (showDeleteModal) {
      setShowDeleteModal(false);
      return;
    }
    if (showReferenceModal) {
      setShowReferenceModal(false);
      return;
    }
    if (activePopupMatch) {
      setActivePopupMatch(null);
      return;
    }
    if (activeStrongsId) {
      setActiveStrongsId(null);
      return;
    }
    if (showVoiceRecorder) {
      setShowVoiceRecorder(false);
      return;
    }
    if (showDrawingCanvas) {
      setShowDrawingCanvas(false);
      return;
    }
    if (showFormatToolbar) {
      setShowFormatToolbar(false);
      return;
    }
    flushSave();
    onBack();
  };

  // Close modals when user presses popstate / hardware back
  useEffect(() => {
    const handlePopState = (e?: Event) => {
      let modalClosed = false;
      if (showDeleteModal) {
        setShowDeleteModal(false);
        modalClosed = true;
      } else if (showReferenceModal) {
        setShowReferenceModal(false);
        modalClosed = true;
      } else if (activePopupMatch) {
        setActivePopupMatch(null);
        modalClosed = true;
      } else if (activeStrongsId) {
        setActiveStrongsId(null);
        modalClosed = true;
      } else if (showVoiceRecorder) {
        setShowVoiceRecorder(false);
        modalClosed = true;
      } else if (showDrawingCanvas) {
        setShowDrawingCanvas(false);
        modalClosed = true;
      } else if (showFormatToolbar) {
        setShowFormatToolbar(false);
        modalClosed = true;
      }

      if (modalClosed && e) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app:android-back', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app:android-back', handlePopState);
      flushSave();
    };
  }, [
    showDeleteModal,
    showReferenceModal,
    activePopupMatch,
    activeStrongsId,
    showVoiceRecorder,
    showDrawingCanvas,
    showFormatToolbar,
  ]);

  // Undo & Redo History State
  interface EditorSnapshot {
    title: string;
    blocks: JournalBlock[];
    dateString: string;
    isPinned: boolean;
  }

  const undoStackRef = useRef<EditorSnapshot[]>([]);
  const redoStackRef = useRef<EditorSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const isHistoryNavigatingRef = useRef<boolean>(false);
  const lastSnapshotStrRef = useRef<string>('');
  const snapshotDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize initial snapshot
  useEffect(() => {
    lastSnapshotStrRef.current = JSON.stringify({
      title: entry.title,
      blocks: entry.blocks,
      dateString: entry.dateString,
      isPinned: entry.pinned || false,
    });
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, [entry.id]);

  const pushHistorySnapshot = (immediate = false) => {
    if (isHistoryNavigatingRef.current) return;

    const currentSnapshot: EditorSnapshot = {
      title,
      blocks: JSON.parse(JSON.stringify(blocks)),
      dateString,
      isPinned,
    };

    const currentStr = JSON.stringify(currentSnapshot);
    if (currentStr === lastSnapshotStrRef.current) return;

    const performPush = () => {
      if (lastSnapshotStrRef.current) {
        try {
          const prevSnapshot: EditorSnapshot = JSON.parse(lastSnapshotStrRef.current);
          undoStackRef.current = [...undoStackRef.current.slice(-40), prevSnapshot];
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
        } catch (_) {}
      }
      lastSnapshotStrRef.current = currentStr;
    };

    if (immediate) {
      if (snapshotDebounceTimerRef.current) clearTimeout(snapshotDebounceTimerRef.current);
      performPush();
    } else {
      if (snapshotDebounceTimerRef.current) clearTimeout(snapshotDebounceTimerRef.current);
      snapshotDebounceTimerRef.current = setTimeout(performPush, 400);
    }
  };

  // Push snapshot on state changes
  useEffect(() => {
    if (!isHistoryNavigatingRef.current) {
      pushHistorySnapshot(false);
    }
  }, [title, blocks, dateString, isPinned]);

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;

    const currentSnapshot: EditorSnapshot = {
      title,
      blocks: JSON.parse(JSON.stringify(blocks)),
      dateString,
      isPinned,
    };

    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, currentSnapshot];

    isHistoryNavigatingRef.current = true;
    setTitle(previous.title);
    setBlocks(previous.blocks);
    setDateString(previous.dateString);
    setIsPinned(previous.isPinned);
    lastSnapshotStrRef.current = JSON.stringify(previous);

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 100);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;

    const currentSnapshot: EditorSnapshot = {
      title,
      blocks: JSON.parse(JSON.stringify(blocks)),
      dateString,
      isPinned,
    };

    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, currentSnapshot];

    isHistoryNavigatingRef.current = true;
    setTitle(next.title);
    setBlocks(next.blocks);
    setDateString(next.dateString);
    setIsPinned(next.isPinned);
    lastSnapshotStrRef.current = JSON.stringify(next);

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    setTimeout(() => {
      isHistoryNavigatingRef.current = false;
    }, 100);
  };

  // Keyboard listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, title, blocks, dateString, isPinned]);

  interface SavedEditorState {
    entryId: string;
    blockIndex: number;
    blockId?: string;
    startOffset: number;
    endOffset: number;
    scrollY: number;
    wasFocused: boolean;
    rangeCloned?: Range | null;
    timestamp: number;
  }

  const lastSelectionRef = useRef<Range | null>(null);
  const savedEditorStateRef = useRef<SavedEditorState | null>(null);

  const updateFormatState = () => {
    if (typeof document === 'undefined') return;
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');

      let sizeVal = document.queryCommandValue('fontSize') || '3';
      if (sizeVal === '1' || sizeVal === '2') sizeVal = '2';
      else if (sizeVal === '3' || sizeVal === '4') sizeVal = '3';
      else if (sizeVal === '5') sizeVal = '5';
      else if (sizeVal === '6' || sizeVal === '7') sizeVal = '6';
      else sizeVal = '3';

      const isCenter = document.queryCommandState('justifyCenter');
      const isRight = document.queryCommandState('justifyRight');
      const alignVal = isRight ? 'right' : isCenter ? 'center' : 'left';

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        fontSize: sizeVal,
        align: alignVal,
      });
    } catch {
      // ignore
    }
  };

  const saveEditorState = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    let activeEl: HTMLElement | null = null;
    let rangeCloned: Range | null = null;

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      activeEl = (
        container.nodeType === Node.ELEMENT_NODE
          ? (container as HTMLElement).closest('[contenteditable="true"]')
          : container.parentElement?.closest('[contenteditable="true"]')
      ) as HTMLElement | null;

      if (activeEl) {
        rangeCloned = range.cloneRange();
        lastSelectionRef.current = rangeCloned;
      }
    }

    const isFocused = !!activeEl && document.activeElement === activeEl;

    if (activeEl) {
      const blockIdxStr = activeEl.getAttribute('data-block-index');
      const blockIdx = blockIdxStr ? parseInt(blockIdxStr, 10) : activeBlockIndex;
      const offsets = getCaretCharacterOffsetWithin(activeEl);

      const state: SavedEditorState = {
        entryId: entry.id,
        blockIndex: isNaN(blockIdx) ? activeBlockIndex : blockIdx,
        blockId: blocks[blockIdx]?.id,
        startOffset: offsets.start,
        endOffset: offsets.end,
        scrollY: window.scrollY,
        wasFocused: isFocused,
        rangeCloned,
        timestamp: Date.now(),
      };

      savedEditorStateRef.current = state;
      try {
        sessionStorage.setItem(
          `editor_state_${entry.id}`,
          JSON.stringify({
            entryId: state.entryId,
            blockIndex: state.blockIndex,
            startOffset: state.startOffset,
            endOffset: state.endOffset,
            scrollY: state.scrollY,
            wasFocused: state.wasFocused,
            timestamp: state.timestamp,
          })
        );
      } catch {
        // ignore
      }
    } else {
      savedEditorStateRef.current = {
        entryId: entry.id,
        blockIndex: activeBlockIndex,
        startOffset: 0,
        endOffset: 0,
        scrollY: window.scrollY,
        wasFocused: false,
        timestamp: Date.now(),
      };
    }
  };

  const restoreEditorState = (forceFocus = false) => {
    let state = savedEditorStateRef.current;

    if (!state || state.entryId !== entry.id) {
      try {
        const stored = sessionStorage.getItem(`editor_state_${entry.id}`);
        if (stored) {
          state = JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }

    if (!state || state.entryId !== entry.id) return;

    window.scrollTo({ top: state.scrollY, behavior: 'instant' });

    const shouldFocus = forceFocus || state.wasFocused;
    if (!shouldFocus) return;

    setTimeout(() => {
      if (!state) return;
      const selector = `[data-block-index="${state.blockIndex}"]`;
      const editorEl = document.querySelector(selector) as HTMLElement | null;

      if (editorEl) {
        editorEl.focus({ preventScroll: true });

        let rangeRestored = false;
        if (state.rangeCloned) {
          try {
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(state.rangeCloned);
              rangeRestored = true;
            }
          } catch {
            rangeRestored = false;
          }
        }

        if (!rangeRestored) {
          setCaretCharacterOffsetWithin(editorEl, state.startOffset, state.endOffset);
        }

        setTimeout(() => {
          ensureCaretVisible(90);
        }, 180);
      }
    }, 60);
  };

  const saveSelection = () => {
    saveEditorState();
    updateFormatState();
  };

  useEffect(() => {
    const handleDocSelectionChange = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handleDocSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleDocSelectionChange);
    };
  }, []);

  // Listeners for Viewport Resize (soft keyboard) and App Background / Resume lifecycle
  useEffect(() => {
    const handleViewportResize = () => {
      if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
        ensureCaretVisible(80);
      }
    };

    const handleViewportScroll = () => {
      if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
        ensureCaretVisible(80);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportScroll);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveEditorState();
      } else if (document.visibilityState === 'visible') {
        restoreEditorState(false);
      }
    };

    const handlePageShow = () => {
      restoreEditorState(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportScroll);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [entry.id]);

  const executeFormat = (command: string, value: string = '') => {
    try {
      document.execCommand(command, false, value);
      setTimeout(updateFormatState, 10);
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

  // Helper to append chip inside block element instead of after closing tag
  const appendChipToHtmlContent = (html: string, chipHtml: string): string => {
    if (!html || !html.trim()) return chipHtml;
    const trimmed = html.trim();
    if (trimmed.endsWith('</div>')) {
      return trimmed.slice(0, -6) + '&nbsp;' + chipHtml + '</div>';
    }
    if (trimmed.endsWith('</p>')) {
      return trimmed.slice(0, -4) + '&nbsp;' + chipHtml + '</p>';
    }
    if (trimmed.endsWith('<br>') || trimmed.endsWith('<br/>')) {
      const lastBr = trimmed.lastIndexOf('<br');
      return trimmed.slice(0, lastBr) + '&nbsp;' + chipHtml;
    }
    return trimmed + '&nbsp;' + chipHtml;
  };

  // Insert Reference (e.g. Matt 5 v 7-20) into active text block or as text
  const handleInsertReferenceText = (refText: string) => {
    const trimmed = refText.trim();
    if (!trimmed) return;
    const chipHtml = createRefChipHtml(trimmed);

    let insertedInline = false;
    const savedState = savedEditorStateRef.current;
    const rangeToUse = lastSelectionRef.current || savedState?.rangeCloned;

    if (rangeToUse) {
      try {
        const range = rangeToUse;
        const container = range.commonAncestorContainer;
        const editorEl = (
          container.nodeType === Node.ELEMENT_NODE
            ? (container as HTMLElement).closest('[contenteditable="true"]')
            : container.parentElement?.closest('[contenteditable="true"]')
        ) as HTMLElement | null;

        if (editorEl) {
          editorEl.focus({ preventScroll: true });
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);

            // Create nodes to insert: chip span + space text node
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chipHtml + '&nbsp;';

            const frag = document.createDocumentFragment();
            let lastInsertedNode: Node | null = null;
            while (tempDiv.firstChild) {
              lastInsertedNode = tempDiv.firstChild;
              frag.appendChild(lastInsertedNode);
            }

            range.deleteContents();
            range.insertNode(frag);

            // Place caret AFTER the last inserted node (after the space text node)
            if (lastInsertedNode) {
              const newRange = document.createRange();
              if (lastInsertedNode.nodeType === Node.TEXT_NODE) {
                const len = lastInsertedNode.textContent?.length || 0;
                newRange.setStart(lastInsertedNode, len);
                newRange.setEnd(lastInsertedNode, len);
              } else {
                newRange.setStartAfter(lastInsertedNode);
                newRange.setEndAfter(lastInsertedNode);
              }
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }

            // Sync updated innerHTML with state
            const blockIdxStr = editorEl.getAttribute('data-block-index');
            const blockIdx = blockIdxStr ? parseInt(blockIdxStr, 10) : activeBlockIndex;
            if (!isNaN(blockIdx) && blockIdx >= 0 && blockIdx < blocks.length) {
              const newHtml = editorEl.innerHTML;
              setBlocks((prev) =>
                prev.map((b, i) => (i === blockIdx && b.type === 'text' ? { ...b, content: newHtml } : b))
              );
            }

            insertedInline = true;
          }
        }
      } catch {
        insertedInline = false;
      }
    }

    if (!insertedInline && savedState && savedState.blockIndex >= 0 && savedState.blockIndex < blocks.length) {
      const targetIdx = savedState.blockIndex;
      const selector = `[data-block-index="${targetIdx}"]`;
      const editorEl = document.querySelector(selector) as HTMLElement | null;

      if (editorEl) {
        editorEl.focus({ preventScroll: true });
        setCaretCharacterOffsetWithin(editorEl, savedState.startOffset, savedState.endOffset);

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = chipHtml + '&nbsp;';

          const frag = document.createDocumentFragment();
          let lastInsertedNode: Node | null = null;
          while (tempDiv.firstChild) {
            lastInsertedNode = tempDiv.firstChild;
            frag.appendChild(lastInsertedNode);
          }

          range.deleteContents();
          range.insertNode(frag);

          if (lastInsertedNode) {
            const newRange = document.createRange();
            if (lastInsertedNode.nodeType === Node.TEXT_NODE) {
              const len = lastInsertedNode.textContent?.length || 0;
              newRange.setStart(lastInsertedNode, len);
              newRange.setEnd(lastInsertedNode, len);
            } else {
              newRange.setStartAfter(lastInsertedNode);
              newRange.setEndAfter(lastInsertedNode);
            }
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }

          const newHtml = editorEl.innerHTML;
          setBlocks((prev) =>
            prev.map((b, i) => (i === targetIdx && b.type === 'text' ? { ...b, content: newHtml } : b))
          );

          insertedInline = true;
        }
      }
    }

    if (!insertedInline) {
      if (blocks.length === 0) {
        const newBlock: TextBlock = {
          id: `text-${Date.now()}`,
          type: 'text',
          content: chipHtml,
        };
        setBlocks([newBlock]);
        setActiveBlockIndex(0);
      } else {
        const targetIdx = activeBlockIndex >= 0 && activeBlockIndex < blocks.length ? activeBlockIndex : blocks.length - 1;
        const targetBlock = blocks[targetIdx];

        if (targetBlock && targetBlock.type === 'text') {
          setBlocks((prev) =>
            prev.map((b, i) =>
              i === targetIdx ? { ...b, content: appendChipToHtmlContent(b.content, chipHtml) } : b
            )
          );
        } else {
          const newBlock: TextBlock = {
            id: `text-${Date.now()}`,
            type: 'text',
            content: chipHtml,
          };
          insertBlockAt(newBlock, targetIdx);
        }
      }
    }

    lastSelectionRef.current = null;
    setShowReferenceModal(false);

    setTimeout(() => {
      ensureCaretVisible(90);
    }, 120);
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

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch (_) {}
      }
      dateInputRef.current.focus();
      dateInputRef.current.click();
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
        className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between sticky top-0 z-20 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-stone-100'
        } backdrop-blur-md`}
      >
        {/* Left Section: Back + Date (dd/mm/yyyy) + Undo / Redo */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleEditorBack}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 dark:text-stone-300 transition-colors shrink-0"
            title="Back to Journal List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Normal Size Date Display Pill (dd/mm/yyyy) */}
          <div
            onClick={handleCalendarClick}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors cursor-pointer group shrink-0 border border-stone-200/70 dark:border-slate-700/70 shadow-2xs"
            title="Change Note Date (DD/MM/YYYY)"
          >
            <Calendar className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs font-bold tracking-tight select-none">
              {formatDateDDMMYYYY(dateString)}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateString}
              onChange={(e) => {
                if (e.target.value) {
                  setDateString(e.target.value);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto"
            />
          </div>

          {/* Undo and Redo Controls */}
          <div className="flex items-center gap-0.5 pl-1.5 border-l border-stone-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Section: Save status + Pin + Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-[10px] sm:text-[11px] text-stone-400 font-medium hidden xs:inline">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>

          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isPinned
                ? 'bg-red-600 text-white'
                : 'hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400'
            }`}
            title={isPinned ? 'Unpin note' : 'Pin note to top'}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-red-500/10 text-stone-400 hover:text-red-500 transition-colors"
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
                    blockIndex={index}
                    totalBlocksCount={blocks.length}
                    onChange={(content) => handleTextBlockChange(block.id, content)}
                    onDeleteBlock={() => handleDeleteBlock(index)}
                    onOpenVerse={(match) => setActivePopupMatch(match)}
                    onOpenStrongs={(strongsId) => setActiveStrongsId(strongsId)}
                    onSelectionChange={saveSelection}
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
                    blockIndex={index}
                    totalBlocksCount={blocks.length}
                    onChange={(content) => handleTextBlockChange(block.id, content)}
                    onDeleteBlock={() => handleDeleteBlock(index)}
                    onOpenVerse={(match) => setActivePopupMatch(match)}
                    onOpenStrongs={(strongsId) => setActiveStrongsId(strongsId)}
                    onSelectionChange={saveSelection}
                    darkMode={darkMode}
                  />
                )}

                {/* 3. IMAGE BLOCK */}
                {block.type === 'image' && (
                  <ImageBlockItem
                    block={block}
                    onDelete={() => handleDeleteBlock(index)}
                    darkMode={darkMode}
                  />
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
                      className="max-h-80 w-full object-contain rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(index);
                      }}
                      className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/70 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md active:scale-90"
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
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.bold
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 font-bold'
                }`}
                title="Bold"
              >
                <Bold className={`w-4 h-4 ${activeFormats.bold ? 'stroke-[3]' : ''}`} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('italic');
                }}
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.italic
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 italic'
                }`}
                title="Italic"
              >
                <Italic className={`w-4 h-4 ${activeFormats.italic ? 'stroke-[3]' : ''}`} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('underline');
                }}
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.underline
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100 underline'
                }`}
                title="Underline"
              >
                <Underline className={`w-4 h-4 ${activeFormats.underline ? 'stroke-[3]' : ''}`} />
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
                className={`px-2 py-1 rounded-lg text-xs font-bold active:scale-95 transition-all ${
                  activeFormats.fontSize === '2'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300'
                }`}
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
                className={`px-2 py-1 rounded-lg text-sm font-bold active:scale-95 transition-all ${
                  activeFormats.fontSize === '3'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300'
                }`}
                title="Medium font size (Default)"
              >
                M
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '5');
                }}
                className={`px-2 py-1 rounded-lg text-base font-extrabold active:scale-95 transition-all ${
                  activeFormats.fontSize === '5'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-100'
                }`}
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
                className={`px-2 py-1 rounded-lg text-lg font-black active:scale-95 transition-all ${
                  activeFormats.fontSize === '6'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-900 dark:text-white'
                }`}
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
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.align === 'left'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
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
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.align === 'center'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
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
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.align === 'right'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
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
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
                handleAddTextBlock();
              }
              setShowFormatToolbar((prev) => !prev);
            }}
            onClick={(e) => {
              e.preventDefault();
            }}
            className={`flex-1 py-2 px-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 ${
              showFormatToolbar || activeFormats.bold || activeFormats.italic || activeFormats.underline
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-slate-700'
            }`}
            title="Toggle Rich Text formatting options (Bold, Italic, Underline, Size, Highlight)"
          >
            <Type className={`w-4 h-4 ${showFormatToolbar || activeFormats.bold || activeFormats.italic || activeFormats.underline ? 'text-white' : 'text-blue-500'}`} />
            <span>Text</span>
          </button>

          {/* Add Image/Photo Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Add photo or image from gallery"
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>Photo</span>
          </button>

          {/* Add Voice Note Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowVoiceRecorder(true)}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Record audio voice note"
          >
            <Mic className="w-4 h-4 text-rose-500" />
            <span>Voice</span>
          </button>

          {/* Add Sketch Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowDrawingCanvas(true)}
            className="flex-1 py-2 px-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-1 border border-stone-200 dark:border-slate-700 transition-transform active:scale-95"
            title="Draw prayer sketch"
          >
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span>Sketch</span>
          </button>

          {/* + Reference Button */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              saveSelection();
              setShowReferenceModal(true);
            }}
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
          darkMode={darkMode}
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

      {/* Strong's Concordance Modal */}
      {activeStrongsId && (
        <StrongsConcordancePopup
          strongsId={activeStrongsId}
          onClose={() => setActiveStrongsId(null)}
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

      {/* In-App Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-sm p-5 sm:p-6 rounded-3xl border shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3.5">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-1">Move note to trash?</h3>
            <p className="text-xs opacity-75 mb-5 leading-relaxed">
              This note will be moved to <strong className="font-semibold">Recently Deleted</strong> and retained for 30 days before permanent erasure.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete(entry.id);
                  onBack();
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

