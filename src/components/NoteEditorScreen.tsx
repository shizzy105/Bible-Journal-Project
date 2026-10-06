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
  MoreVertical,
  TextSelect,
  Copy,
  Scissors,
  List,
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
import { QuickBibleReaderModal } from './QuickBibleReaderModal';
import { DatePickerModal } from './DatePickerModal';
import { ImageBlockItem } from './ImageBlockItem';
import { parseStrongsReference } from '../data/strongsData';
import { prefetchBook } from '../data/bibleData';
import { AppTheme, getStoredTranslation, getStoredBiblePosition } from '../services/storage';

// Helpers to record and restore DOM node paths within contenteditable elements across re-renders
function getDomNodePath(root: Node, target: Node): number[] {
  const path: number[] = [];
  let curr: Node | null = target;
  while (curr && curr !== root) {
    const parent: Node | null = curr.parentNode;
    if (!parent) break;
    const index = Array.prototype.indexOf.call(parent.childNodes, curr);
    if (index === -1) break;
    path.unshift(index);
    curr = parent;
  }
  return path;
}

function getNodeFromDomPath(root: Node, path: number[]): Node | null {
  let curr: Node = root;
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    if (!curr.childNodes || idx < 0 || idx >= curr.childNodes.length) {
      return null;
    }
    curr = curr.childNodes[idx];
  }
  return curr;
}

// Helpers for caret character offset tracking inside contenteditable elements
function getCaretCharacterOffsetWithin(element: HTMLElement): { start: number; end: number } {
  let start = 0;
  let end = 0;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (element.contains(range.commonAncestorContainer)) {
      try {
        const preCaretRange = document.createRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        start = preCaretRange.toString().length;
        end = start + range.toString().length;
      } catch {
        // Fallback calculation via node traversal
        let charCount = 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let currentTextNode = walker.nextNode();
        while (currentTextNode) {
          if (currentTextNode === range.startContainer) {
            start = charCount + range.startOffset;
            break;
          }
          charCount += currentTextNode.textContent?.length || 0;
          currentTextNode = walker.nextNode();
        }
        end = start + range.toString().length;
      }
    }
  }
  return { start, end };
}

function getRangeFromCharacterOffsetWithin(element: HTMLElement, startOffset: number, endOffset: number = startOffset): Range | null {
  let currentPos = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;
  let lastTextNode: Node | null = null;

  function traverse(node: Node) {
    if (startNode && endNode) return;

    if (node.nodeType === Node.TEXT_NODE) {
      lastTextNode = node;
      const textLen = node.textContent?.length || 0;
      if (!startNode && currentPos + textLen >= startOffset) {
        startNode = node;
        startNodeOffset = Math.max(0, Math.min(textLen, startOffset - currentPos));
      }
      if (!endNode && currentPos + textLen >= endOffset) {
        endNode = node;
        endNodeOffset = Math.max(0, Math.min(textLen, endOffset - currentPos));
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
    if (lastTextNode) {
      startNode = lastTextNode;
      startNodeOffset = lastTextNode.textContent?.length || 0;
    } else {
      startNode = element;
      startNodeOffset = element.childNodes.length;
    }
  }
  if (!endNode) {
    endNode = startNode;
    endNodeOffset = startNodeOffset;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  } catch (e) {
    console.warn('Failed to create range from character offset:', e);
    return null;
  }
}

function setCaretCharacterOffsetWithin(element: HTMLElement, startOffset: number, endOffset: number = startOffset) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = getRangeFromCharacterOffsetWithin(element, startOffset, endOffset);
  if (range) {
    try {
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      console.warn('Failed to set caret character offset:', e);
    }
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
  currentTheme?: AppTheme;
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
  onSelectAll?: () => void;
  darkMode: boolean;
  autoFocus?: boolean;
  isModalOpen?: boolean;
}

// Helper to obtain Range from coordinates across WebKit/Blink and standard browsers
function getRangeFromPoint(x: number, y: number): Range | null {
  if (typeof document === 'undefined') return null;
  if (typeof document.caretRangeFromPoint === 'function') {
    try {
      return document.caretRangeFromPoint(x, y);
    } catch {
      // ignore
    }
  } else if ('caretPositionFromPoint' in document) {
    try {
      const pos = (document as unknown as { caretPositionFromPoint: (px: number, py: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
      if (pos && pos.offsetNode) {
        const range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        return range;
      }
    } catch {
      // ignore
    }
  }
  return null;
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
  onSelectAll,
  darkMode,
  autoFocus,
  isModalOpen,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);
  const lastTapHandledRef = useRef<number>(0);
  const lastChipDeletedTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number; target: HTMLElement | null } | null>(null);

  // Check and clean any partially deleted or damaged reference chips (WhatsApp-style 1-Tap Instant Wipeout)
  const cleanupDamagedRefChips = (): boolean => {
    if (!editorRef.current) return false;
    const chips = editorRef.current.querySelectorAll<HTMLElement>('[data-ref], .ref-chip');
    let removedAny = false;

    chips.forEach((chip) => {
      const expectedRef = (chip.getAttribute('data-ref') || chip.getAttribute('data-strongs') || '').trim();
      const currentText = (chip.textContent || '').trim();

      // If the text inside the chip was altered or partially backspaced
      if (expectedRef && currentText !== expectedRef) {
        lastChipDeletedTimeRef.current = Date.now();
        const parent = chip.parentNode;
        const prevSibling = chip.previousSibling;
        const nextSibling = chip.nextSibling;

        chip.remove();
        removedAny = true;

        // Position caret cleanly right where the chip was
        const sel = window.getSelection();
        if (sel && editorRef.current) {
          const newRange = document.createRange();
          if (prevSibling) {
            if (prevSibling.nodeType === Node.TEXT_NODE) {
              const len = (prevSibling.nodeValue || '').length;
              newRange.setStart(prevSibling, len);
            } else {
              newRange.setStartAfter(prevSibling);
            }
          } else if (nextSibling) {
            if (nextSibling.nodeType === Node.TEXT_NODE) {
              newRange.setStart(nextSibling, 0);
            } else {
              newRange.setStartBefore(nextSibling);
            }
          } else if (parent && parent.contains(editorRef.current)) {
            newRange.setStart(editorRef.current, 0);
          } else if (parent) {
            const br = document.createElement('br');
            parent.appendChild(br);
            newRange.setStart(parent, 0);
          }
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    });

    if (removedAny) {
      if (editorRef.current) {
        editorRef.current.focus({ preventScroll: true });
        if (editorRef.current.childNodes.length === 0) {
          editorRef.current.appendChild(document.createElement('br'));
        }
        onChange(editorRef.current.innerHTML);
        onSelectionChange?.();
      }
      return true;
    }
    return false;
  };

  // Helper to reliably delete adjacent reference chips on Backspace/Delete across mobile keyboards (SwiftKey, Gboard, Samsung)
  const tryDeleteAdjacentRefChip = (direction: 'backward' | 'forward'): boolean => {
    if (!editorRef.current) return false;
    if (Date.now() - lastChipDeletedTimeRef.current < 80) {
      return true;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;

    const range = sel.getRangeAt(0);

    // If an active selection spans or contains a reference chip
    if (!range.collapsed) {
      const fragment = range.cloneContents();
      const chipsInSelection = fragment.querySelectorAll('[data-ref], .ref-chip');
      if (chipsInSelection.length > 0) {
        lastChipDeletedTimeRef.current = Date.now();
        range.deleteContents();
        if (editorRef.current) {
          editorRef.current.focus({ preventScroll: true });
          if (!editorRef.current.innerHTML.trim()) {
            editorRef.current.innerHTML = '<br>';
          }
          onChange(editorRef.current.innerHTML);
          onSelectionChange?.();
        }
        return true;
      }
      return false;
    }

    const anchorNode = sel.anchorNode;
    const offset = sel.anchorOffset;
    if (!anchorNode || !editorRef.current.contains(anchorNode)) return false;

    let targetChip: HTMLElement | null = null;

    // Check if the caret is directly inside or on a chip
    const chipAncestor = (
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement).closest('[data-ref], .ref-chip')
        : anchorNode.parentElement?.closest('[data-ref], .ref-chip')
    ) as HTMLElement | null;

    if (chipAncestor && editorRef.current.contains(chipAncestor)) {
      targetChip = chipAncestor;
    }

    if (!targetChip && direction === 'backward') {
      // 1. If anchorNode is an Element
      if (anchorNode.nodeType === Node.ELEMENT_NODE) {
        const el = anchorNode as HTMLElement;
        let idx = offset - 1;
        while (idx >= 0) {
          const child = el.childNodes[idx];
          if (child && child.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(child.nodeValue || '')) {
            idx--;
            continue;
          }
          if (child && child.nodeType === Node.ELEMENT_NODE) {
            const htmlChild = child as HTMLElement;
            if (htmlChild.matches?.('[data-ref], .ref-chip') || htmlChild.querySelector?.('[data-ref], .ref-chip')) {
              targetChip = (htmlChild.matches?.('[data-ref], .ref-chip') ? htmlChild : htmlChild.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
              // Clean any whitespace text nodes that were between cursor and chip
              for (let w = idx + 1; w < offset; w++) {
                (el.childNodes[w] as unknown as ChildNode | null)?.remove();
              }
            }
          }
          break;
        }

        // If cursor is at start of element, look at previous siblings
        if (!targetChip && idx < 0) {
          let prev = el.previousSibling;
          while (prev && prev.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(prev.nodeValue || '')) {
            prev = prev.previousSibling;
          }
          if (prev && prev.nodeType === Node.ELEMENT_NODE) {
            const htmlPrev = prev as HTMLElement;
            if (htmlPrev.matches?.('[data-ref], .ref-chip') || htmlPrev.querySelector?.('[data-ref], .ref-chip')) {
              targetChip = (htmlPrev.matches?.('[data-ref], .ref-chip') ? htmlPrev : htmlPrev.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
            }
          }
        }
      }

      // 2. If anchorNode is a Text Node
      if (!targetChip && anchorNode.nodeType === Node.TEXT_NODE) {
        const text = anchorNode.nodeValue || '';
        const precedingText = text.slice(0, offset);

        if (/^[\s\u200B\u00A0\uFEFF]*$/.test(precedingText)) {
          let prev = anchorNode.previousSibling;
          while (prev && prev.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(prev.nodeValue || '')) {
            prev = prev.previousSibling;
          }
          if (prev && prev.nodeType === Node.ELEMENT_NODE) {
            const htmlPrev = prev as HTMLElement;
            if (htmlPrev.matches?.('[data-ref], .ref-chip') || htmlPrev.querySelector?.('[data-ref], .ref-chip')) {
              targetChip = (htmlPrev.matches?.('[data-ref], .ref-chip') ? htmlPrev : htmlPrev.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
              if (offset > 0) {
                anchorNode.nodeValue = text.slice(offset);
              }
            }
          }
        }

        // Check if text node is inside an inline element whose previous sibling is a chip
        if (!targetChip && /^[\s\u200B\u00A0\uFEFF]*$/.test(precedingText)) {
          let curr: Node | null = anchorNode;
          while (curr && curr.parentNode && curr.parentNode !== editorRef.current && !curr.previousSibling) {
            curr = curr.parentNode;
          }
          if (curr && curr.previousSibling) {
            let prev: Node | null = curr.previousSibling;
            while (prev && prev.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(prev.nodeValue || '')) {
              prev = prev.previousSibling;
            }
            if (prev && prev.nodeType === Node.ELEMENT_NODE) {
              const htmlPrev = prev as HTMLElement;
              if (htmlPrev.matches?.('[data-ref], .ref-chip') || htmlPrev.querySelector?.('[data-ref], .ref-chip')) {
                targetChip = (htmlPrev.matches?.('[data-ref], .ref-chip') ? htmlPrev : htmlPrev.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
                if (offset > 0) {
                  anchorNode.nodeValue = text.slice(offset);
                }
              }
            }
          }
        }
      }
    } else if (!targetChip && direction === 'forward') {
      // Forward delete
      if (anchorNode.nodeType === Node.ELEMENT_NODE) {
        const el = anchorNode as HTMLElement;
        let idx = offset;
        while (idx < el.childNodes.length) {
          const child = el.childNodes[idx];
          if (child && child.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(child.nodeValue || '')) {
            idx++;
            continue;
          }
          if (child && child.nodeType === Node.ELEMENT_NODE) {
            const htmlChild = child as HTMLElement;
            if (htmlChild.matches?.('[data-ref], .ref-chip') || htmlChild.querySelector?.('[data-ref], .ref-chip')) {
              targetChip = (htmlChild.matches?.('[data-ref], .ref-chip') ? htmlChild : htmlChild.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
              for (let w = offset; w < idx; w++) {
                (el.childNodes[w] as unknown as ChildNode | null)?.remove();
              }
            }
          }
          break;
        }
      }

      if (!targetChip && anchorNode.nodeType === Node.TEXT_NODE) {
        const text = anchorNode.nodeValue || '';
        const followingText = text.slice(offset);
        if (/^[\s\u200B\u00A0\uFEFF]*$/.test(followingText)) {
          let next = anchorNode.nextSibling;
          while (next && next.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(next.nodeValue || '')) {
            next = next.nextSibling;
          }
          if (next && next.nodeType === Node.ELEMENT_NODE) {
            const htmlNext = next as HTMLElement;
            if (htmlNext.matches?.('[data-ref], .ref-chip') || htmlNext.querySelector?.('[data-ref], .ref-chip')) {
              targetChip = (htmlNext.matches?.('[data-ref], .ref-chip') ? htmlNext : htmlNext.querySelector?.('[data-ref], .ref-chip')) as HTMLElement;
              if (followingText.length > 0) {
                anchorNode.nodeValue = text.slice(0, offset);
              }
            }
          }
        }
      }
    }

    if (!targetChip || !editorRef.current.contains(targetChip)) {
      return false;
    }

    lastChipDeletedTimeRef.current = Date.now();

    const parent = targetChip.parentNode as HTMLElement | null;
    if (!parent) return false;

    const prevSibling = targetChip.previousSibling;
    let nextSibling = targetChip.nextSibling;

    // Clean up any immediately adjacent trailing ZWSP text node so it doesn't leave orphaned invisible chars
    if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && /^[\s\u200B\u00A0\uFEFF]*$/.test(nextSibling.nodeValue || '')) {
      const tempNext = nextSibling.nextSibling;
      nextSibling.remove();
      nextSibling = tempNext;
    }

    targetChip.remove();

    // Re-affirm focus immediately so SwiftKey / Android IME keeps the keyboard active
    editorRef.current.focus({ preventScroll: true });

    const newRange = document.createRange();

    if (direction === 'backward') {
      if (prevSibling) {
        if (prevSibling.nodeType === Node.TEXT_NODE) {
          const len = (prevSibling.nodeValue || '').length;
          newRange.setStart(prevSibling, len);
          newRange.collapse(true);
        } else {
          newRange.setStartAfter(prevSibling);
          newRange.collapse(true);
        }
      } else if (nextSibling) {
        if (nextSibling.nodeType === Node.TEXT_NODE) {
          newRange.setStart(nextSibling, 0);
          newRange.collapse(true);
        } else {
          newRange.setStartBefore(nextSibling);
          newRange.collapse(true);
        }
      } else {
        const br = document.createElement('br');
        parent.appendChild(br);
        newRange.setStart(parent, 0);
        newRange.collapse(true);
      }
    } else {
      if (nextSibling) {
        if (nextSibling.nodeType === Node.TEXT_NODE) {
          newRange.setStart(nextSibling, 0);
          newRange.collapse(true);
        } else {
          newRange.setStartBefore(nextSibling);
          newRange.collapse(true);
        }
      } else if (prevSibling) {
        if (prevSibling.nodeType === Node.TEXT_NODE) {
          const len = (prevSibling.nodeValue || '').length;
          newRange.setStart(prevSibling, len);
          newRange.collapse(true);
        } else {
          newRange.setStartAfter(prevSibling);
          newRange.collapse(true);
        }
      } else {
        const br = document.createElement('br');
        parent.appendChild(br);
        newRange.setStart(parent, 0);
        newRange.collapse(true);
      }
    }

    sel.removeAllRanges();
    sel.addRange(newRange);

    // Keep editor focused after range placement
    editorRef.current.focus({ preventScroll: true });

    if (editorRef.current) {
      if (editorRef.current.childNodes.length === 0) {
        editorRef.current.appendChild(document.createElement('br'));
      }
      onChange(editorRef.current.innerHTML);
      onSelectionChange?.();
    }

    return true;
  };

  // Helper to place caret at tapped coordinates or end of contenteditable element safely
  const focusEditorAndPlaceCaret = (clientX?: number, clientY?: number) => {
    if (!editorRef.current) return;
    try {
      editorRef.current.focus({ preventScroll: true });

      if (editorRef.current.childNodes.length === 0 || editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = '<br>';
      }

      const isBlank =
        editorRef.current.innerHTML === '<br>' ||
        editorRef.current.innerHTML === '<br/>' ||
        !editorRef.current.innerText.trim();

      if (isBlank) {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(editorRef.current, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }

      if (clientX !== undefined && clientY !== undefined) {
        const range = getRangeFromPoint(clientX, clientY);
        if (
          range &&
          (editorRef.current.contains(range.startContainer) || range.startContainer === editorRef.current)
        ) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }
        }
      }
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

    // Crucial: If the element's current innerHTML already matches block.content or if currently focused or modal is open, DO NOT overwrite innerHTML
    if (
      editorRef.current.innerHTML === block.content ||
      (block.content === '' && (editorRef.current.innerHTML === '<br>' || editorRef.current.innerHTML === '<br/>')) ||
      document.activeElement === editorRef.current ||
      isModalOpen ||
      Date.now() - lastChipDeletedTimeRef.current < 800
    ) {
      return;
    }

    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [block.content, isModalOpen]);

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

    const onNativeBeforeInput = (e: Event) => {
      const inputEvent = e as InputEvent;
      if (!inputEvent || !inputEvent.inputType) return;
      if (
        inputEvent.inputType === 'deleteContentBackward' ||
        inputEvent.inputType === 'deleteWordBackward' ||
        inputEvent.inputType === 'deleteSoftLineBackward' ||
        inputEvent.inputType === 'deleteHardLineBackward' ||
        inputEvent.inputType === 'deleteEntireSoftLine' ||
        inputEvent.inputType === 'deleteContent'
      ) {
        // Inspect target ranges if provided by Android / Chromium IME
        let chipTarget: HTMLElement | null = null;
        if (typeof inputEvent.getTargetRanges === 'function') {
          try {
            const ranges = inputEvent.getTargetRanges();
            for (const r of ranges) {
              const sc = r.startContainer;
              const ec = r.endContainer;
              const chip1 = (sc.nodeType === Node.ELEMENT_NODE ? (sc as HTMLElement) : sc.parentElement)?.closest('[data-ref], .ref-chip');
              const chip2 = (ec.nodeType === Node.ELEMENT_NODE ? (ec as HTMLElement) : ec.parentElement)?.closest('[data-ref], .ref-chip');
              chipTarget = (chip1 || chip2) as HTMLElement | null;
              if (chipTarget) break;
            }
          } catch {
            // ignore
          }
        }

        if (chipTarget && editorRef.current?.contains(chipTarget)) {
          lastChipDeletedTimeRef.current = Date.now();
          const prev = chipTarget.previousSibling;
          chipTarget.remove();
          if (inputEvent.cancelable) {
            inputEvent.preventDefault();
          }
          inputEvent.stopPropagation();
          if (editorRef.current) {
            editorRef.current.focus({ preventScroll: true });
            const sel = window.getSelection();
            if (sel) {
              const nr = document.createRange();
              if (prev) {
                if (prev.nodeType === Node.TEXT_NODE) {
                  nr.setStart(prev, (prev.nodeValue || '').length);
                } else {
                  nr.setStartAfter(prev);
                }
              } else {
                nr.setStart(editorRef.current, 0);
              }
              nr.collapse(true);
              sel.removeAllRanges();
              sel.addRange(nr);
            }
            if (editorRef.current.childNodes.length === 0) {
              editorRef.current.appendChild(document.createElement('br'));
            }
            onChange(editorRef.current.innerHTML);
            onSelectionChange?.();
          }
          return;
        }

        if (tryDeleteAdjacentRefChip('backward')) {
          if (inputEvent.cancelable) {
            inputEvent.preventDefault();
          }
          inputEvent.stopPropagation();
        }
      } else if (
        inputEvent.inputType === 'deleteContentForward' ||
        inputEvent.inputType === 'deleteWordForward' ||
        inputEvent.inputType === 'deleteSoftLineForward' ||
        inputEvent.inputType === 'deleteHardLineForward'
      ) {
        if (tryDeleteAdjacentRefChip('forward')) {
          if (inputEvent.cancelable) {
            inputEvent.preventDefault();
          }
          inputEvent.stopPropagation();
        }
      } else if (inputEvent.inputType && inputEvent.inputType.startsWith('insert')) {
        // Prevent typing text or spaces inside the chip badge:
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const chip = (
            sel.anchorNode.nodeType === Node.ELEMENT_NODE
              ? (sel.anchorNode as HTMLElement)
              : sel.anchorNode.parentElement
          )?.closest('[data-ref], .ref-chip') as HTMLElement | null;
          if (chip && editorRef.current?.contains(chip)) {
            let nextTextNode: Text | null = null;
            if (chip.nextSibling && chip.nextSibling.nodeType === Node.TEXT_NODE) {
              nextTextNode = chip.nextSibling as Text;
            } else {
              nextTextNode = document.createTextNode('\u00A0');
              (chip as unknown as ChildNode).after(nextTextNode);
            }
            const textVal = nextTextNode.nodeValue || '';
            if (!textVal) {
              nextTextNode.nodeValue = '\u00A0';
            }
            const r = document.createRange();
            const caretPos = /^[\s\u00A0]/.test(nextTextNode.nodeValue || '') ? 1 : (nextTextNode.nodeValue || '').length;
            r.setStart(nextTextNode, Math.min(caretPos, (nextTextNode.nodeValue || '').length));
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      }
    };

    const mutationObserver = new MutationObserver(() => {
      cleanupDamagedRefChips();
    });
    mutationObserver.observe(el, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    el.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: false });
    el.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: true });
    el.addEventListener('touchend', onTouchEndCapture, { capture: true, passive: false });
    el.addEventListener('click', onClickCapture, { capture: true });
    el.addEventListener('beforeinput', onNativeBeforeInput as EventListener, { capture: true });

    return () => {
      mutationObserver.disconnect();
      el.removeEventListener('touchstart', onTouchStartCapture, { capture: true });
      el.removeEventListener('touchmove', onTouchMoveCapture, { capture: true });
      el.removeEventListener('touchend', onTouchEndCapture, { capture: true });
      el.removeEventListener('click', onClickCapture, { capture: true });
      el.removeEventListener('beforeinput', onNativeBeforeInput as EventListener, { capture: true });
    };
  }, [onOpenVerse]);

  const handleInput = () => {
    if (!editorRef.current) return;

    // 1-Tap Instant Wipeout: clean any partially deleted chips immediately
    if (cleanupDamagedRefChips()) {
      return;
    }

    // Check for inline shortcuts before general input handling
    try {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const anchorNode = sel.anchorNode;
        if (anchorNode.nodeType === Node.TEXT_NODE) {
          const text = anchorNode.nodeValue || '';
          const offset = sel.anchorOffset;

          // 0. Instant Scripture / Strong's Trigger Shortcut: typing '//' or '..' right after a valid reference converts it to an interactive pill
          const textBeforeCursor = text.slice(0, offset);
          let triggerType: '//' | '..' | null = null;
          if (textBeforeCursor.endsWith('//')) {
            triggerType = '//';
          } else if (textBeforeCursor.endsWith('..') && !textBeforeCursor.endsWith('...')) {
            triggerType = '..';
          }

          if (triggerType) {
            const rawCandidate = textBeforeCursor.slice(0, -2);
            // Ignore if looks like a web protocol e.g. https:, http:, ftp:
            if (!/(?:https?|ftp):$/i.test(rawCandidate.trim())) {
              // 1. Check for Strong's concordance code e.g. H1234 or G2424
              const strongsMatch = rawCandidate.match(/(?:^|\s|\b)([HGhg]\d{1,5})\s*$/);
              let matchedRefStr: string | null = null;
              let matchStartIdx = -1;

              if (strongsMatch) {
                const parsedStrongs = parseStrongsReference(strongsMatch[1]);
                if (parsedStrongs && parsedStrongs.isValidRange) {
                  matchedRefStr = parsedStrongs.id;
                  matchStartIdx = rawCandidate.lastIndexOf(strongsMatch[1]);
                }
              }

              // 2. If not Strong's, check Bible Reference
              if (!matchedRefStr) {
                const bibleMatches = parseBibleReferences(rawCandidate);
                if (bibleMatches.length > 0) {
                  const lastMatch = bibleMatches[bibleMatches.length - 1];
                  const trimmedCandidate = rawCandidate.trimEnd();
                  if (lastMatch.endIndex === trimmedCandidate.length) {
                    matchedRefStr = lastMatch.fullMatch;
                    matchStartIdx = lastMatch.startIndex;
                  }
                }
              }

              if (matchedRefStr && matchStartIdx !== -1) {
                const beforeVerseText = text.slice(0, matchStartIdx);
                const afterTriggerText = text.slice(offset);

                const chipHtml = createRefChipHtml(matchedRefStr);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chipHtml;
                const chipEl = tempDiv.firstElementChild as HTMLElement;

                if (chipEl) {
                  const trailingText = '\u00A0' + (afterTriggerText ? afterTriggerText.replace(/^ /, '\u00A0') : '');
                  const trailingNode = document.createTextNode(trailingText);

                  if (beforeVerseText.length > 0) {
                    anchorNode.nodeValue = beforeVerseText;
                    (anchorNode as unknown as ChildNode).after(chipEl);
                  } else {
                    (anchorNode as unknown as ChildNode).replaceWith(chipEl);
                  }
                  (chipEl as unknown as ChildNode).after(trailingNode);

                  // Position cursor cleanly in trailingNode after the non-breaking space
                  const newRange = document.createRange();
                  newRange.setStart(trailingNode, 1);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);

                  if (editorRef.current) {
                    editorRef.current.focus({ preventScroll: true });
                    const newHtml = editorRef.current.innerHTML;
                    onChange(newHtml);
                    onSelectionChange?.();
                  }
                  return;
                }
              }
            }
          }

          // 1. Triple Hyphen Divider: '---' on a line -> replace with clean <hr class="note-divider">
          if (text === '---' || text.endsWith('\n---') || /(?:^|\n)\s*---$/.test(text)) {
            // Find current position and replace '---' with a divider
            const matchIndex = text.lastIndexOf('---');
            if (matchIndex !== -1 && offset >= matchIndex + 3) {
              const beforeText = text.slice(0, matchIndex).replace(/\n+$/, '');
              const afterText = text.slice(matchIndex + 3).replace(/^\n+/, '');

              const hr = document.createElement('hr');
              hr.className = 'note-divider';
              const nextLine = document.createElement('div');
              if (afterText.trim().length > 0) {
                nextLine.textContent = afterText;
              } else {
                nextLine.innerHTML = '<br>';
              }

              // Determine the top-level block inside editorRef
              let topBlock: HTMLElement | null = null;
              let curr: Node | null = anchorNode;
              while (curr && curr.parentNode !== editorRef.current) {
                curr = curr.parentNode;
              }
              if (curr && curr.nodeType === Node.ELEMENT_NODE) {
                topBlock = curr as HTMLElement;
              }

              const parentEl = anchorNode.parentElement;
              const isDirectChild = parentEl === editorRef.current || !topBlock;

              const childAnchor = anchorNode as unknown as ChildNode;

              if (isDirectChild) {
                // anchorNode is a direct child of editorRef.current
                if (beforeText.trim().length > 0) {
                  anchorNode.nodeValue = beforeText;
                  childAnchor.after(hr);
                  hr.after(nextLine);
                } else {
                  // Remove any previous <br> before this anchorNode
                  const prev = anchorNode.previousSibling as unknown as ChildNode | null;
                  if (prev && (prev as unknown as Node).nodeName === 'BR') {
                    prev.remove();
                  }
                  childAnchor.replaceWith(hr);
                  hr.after(nextLine);
                }
              } else {
                // anchorNode is inside topBlock (e.g. a div, p, li)
                // Check if topBlock only contained '---'
                const blockText = (topBlock.innerText || '').replace(/[\u200B\u00A0\s-]/g, '');
                const hasMedia = !!topBlock.querySelector('img, audio, video, [data-ref]');

                if (!blockText && !hasMedia) {
                  // The block was only holding '---' (and whitespace/br)
                  topBlock.replaceWith(hr);
                  hr.after(nextLine);
                } else {
                  // topBlock has preceding text (e.g. Paragraph <br> ---)
                  if (beforeText.trim().length > 0) {
                    anchorNode.nodeValue = beforeText;
                  } else {
                    const prev = anchorNode.previousSibling as unknown as ChildNode | null;
                    if (prev && (prev as unknown as Node).nodeName === 'BR') {
                      prev.remove();
                    }
                    childAnchor.remove();
                  }
                  topBlock.after(hr);
                  hr.after(nextLine);
                }
              }

              // Move cursor cleanly to the new line below the divider
              const newRange = document.createRange();
              newRange.setStart(nextLine, 0);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);

              let newHtml = editorRef.current.innerHTML;
              onChange(newHtml);
              onSelectionChange?.();
              return;
            }
          }

          // 2. Bullet shortcut: typing '- ' or '* ' at start of line -> convert to <ul><li>
          if (
            (text === '- ' || text === '* ' || text === '-\u00A0' || text === '*\u00A0' ||
             text.endsWith('\n- ') || text.endsWith('\n* ') || text.endsWith('\n-\u00A0') || text.endsWith('\n*\u00A0')) &&
            !anchorNode.parentElement?.closest('li')
          ) {
            const parentBlock = (anchorNode.parentElement?.closest('div, p') || anchorNode.parentElement) as HTMLElement | null;

            // Clean the trigger text from the text node
            const triggerIdx = text.lastIndexOf('-');
            const starIdx = text.lastIndexOf('*');
            const cutIdx = Math.max(triggerIdx, starIdx);
            const preservedText = cutIdx > 0 ? text.slice(0, cutIdx).replace(/\n+$/, '') : '';

            // Create target <ul> and <li>
            const ul = document.createElement('ul');
            const li = document.createElement('li');
            li.innerHTML = '<br>';
            ul.appendChild(li);

            if (parentBlock && editorRef.current.contains(parentBlock) && parentBlock !== editorRef.current) {
              if (preservedText.trim().length > 0) {
                // If there was preceding text inside the same paragraph (e.g. user hit Enter creating a <br> or newline)
                anchorNode.nodeValue = preservedText;
                // Remove trailing <br> elements right before the bullet
                let prev = anchorNode.nextSibling;
                while (prev && prev.nodeName === 'BR') {
                  const toRemove = prev;
                  prev = prev.nextSibling;
                  toRemove.remove();
                }
                parentBlock.after(ul);
              } else if (parentBlock.previousSibling || parentBlock.nextSibling) {
                // Empty paragraph block: replace this paragraph with <ul>
                parentBlock.replaceWith(ul);
              } else {
                // It's the only block, append list
                parentBlock.replaceWith(ul);
              }
            } else {
              // Direct child of editorRef
              if (preservedText.trim().length > 0) {
                anchorNode.nodeValue = preservedText;
                editorRef.current.appendChild(ul);
              } else {
                anchorNode.nodeValue = '';
                editorRef.current.appendChild(ul);
              }
            }

            // Place caret cleanly inside the new <li>
            const newRange = document.createRange();
            newRange.setStart(li, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            let newHtml = editorRef.current.innerHTML;
            onChange(newHtml);
            onSelectionChange?.();
            return;
          }
        }
      }
    } catch {
      // ignore
    }

    // Ensure chips never absorb stray spaces inside their badge
    if (editorRef.current) {
      const chips = editorRef.current.querySelectorAll<HTMLElement>('[data-ref], .ref-chip');
      chips.forEach((chip) => {
        const expected = (chip.getAttribute('data-ref') || chip.getAttribute('data-strongs') || '').trim();
        const clickBtn = (chip.querySelector('.ref-click-btn') as HTMLElement | null) || chip;
        const currentRaw = clickBtn.textContent || '';
        if (expected && currentRaw !== expected && currentRaw.trim() === expected) {
          const extraSpaces = currentRaw.slice(expected.length);
          clickBtn.textContent = expected;
          let nextNode = chip.nextSibling;
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            nextNode.nodeValue = extraSpaces + (nextNode.nodeValue || '');
          } else {
            const newTextNode = document.createTextNode(extraSpaces || '\u00A0');
            (chip as unknown as ChildNode).after(newTextNode);
            nextNode = newTextNode;
          }
          const sel = window.getSelection();
          if (sel && nextNode) {
            const r = document.createRange();
            r.setStart(nextNode, (nextNode.nodeValue || '').length);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      });
    }

    let html = editorRef.current.innerHTML;
    if (html === '<br>' || html === '<br/>' || !editorRef.current.innerText.trim()) {
      html = '';
    }
    onChange(html);
    onSelectionChange?.();
    ensureCaretVisible(70);
  };

  const handleFocus = () => {
    if (!editorRef.current) return;
    if (editorRef.current.childNodes.length === 0 || editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = '<br>';
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    onSelectionChange?.();
  };

  const handleBlur = () => {
    if (!editorRef.current) return;
    if (isModalOpen) return;
    // Prevent accidental blur during chip deletion across Android IMEs (SwiftKey, Gboard, Samsung)
    if (Date.now() - lastChipDeletedTimeRef.current < 500) {
      editorRef.current.focus({ preventScroll: true });
      return;
    }
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml === '<br>' || currentHtml === '<br/>' || !editorRef.current.innerText.trim()) {
      editorRef.current.innerHTML = '';
      onChange('');
      return;
    }
    const processedHtml = processHtmlWithReferences(currentHtml);
    if (processedHtml !== currentHtml) {
      editorRef.current.innerHTML = processedHtml;
      onChange(processedHtml);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Intercept Select All (Ctrl+A / Cmd+A) to select entire note across all blocks
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      if (onSelectAll) {
        e.preventDefault();
        onSelectAll();
        return;
      }
    }

    // Handle Enter inside an empty list item to cleanly exit the bullet list
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const li = (
          sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement)
            : sel.anchorNode.parentElement
        )?.closest('li');

        if (li && editorRef.current?.contains(li)) {
          const liText = (li.innerText || '').replace(/[\u200B\u00A0\s]/g, '');
          if (!liText) {
            // Empty list item: exit list cleanly into regular paragraph / div
            e.preventDefault();
            document.execCommand('insertUnorderedList', false);
            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
            onSelectionChange?.();
            return;
          }
        }
      }
    }

    // Prevent accidental block deletion and support Backspace/Delete across hardware & mobile keyboards
    const isBackspace = e.key === 'Backspace' || e.code === 'Backspace' || e.keyCode === 8;
    const isDelete = e.key === 'Delete' || e.code === 'Delete' || e.keyCode === 46;

    if (isBackspace) {
      if (tryDeleteAdjacentRefChip('backward')) {
        e.preventDefault();
        return;
      }

      // If inside an empty list item, backspace should outdent/exit list rather than deleting whole block
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const li = (
          sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement)
            : sel.anchorNode.parentElement
        )?.closest('li');

        if (li && editorRef.current?.contains(li)) {
          const liText = (li.innerText || '').replace(/[\u200B\u00A0\uFEFF\s]/g, '');
          if (!liText) {
            e.preventDefault();
            document.execCommand('insertUnorderedList', false);
            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
            onSelectionChange?.();
            return;
          }
        }
      }

      const el = editorRef.current;
      const text = el ? (el.innerText || '').replace(/[\u200B\u00A0\uFEFF\s]/g, '') : '';
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
    } else if (isDelete) {
      if (tryDeleteAdjacentRefChip('forward')) {
        e.preventDefault();
        return;
      }
    }
  };

  const isLastBlock = totalBlocksCount !== undefined ? blockIndex === totalBlocksCount - 1 : false;

  return (
    <div
      onMouseDown={(e) => {
        if (editorRef.current && e.target !== editorRef.current) {
          const interactive = (e.target as HTMLElement).closest('[data-ref], .ref-chip, button, audio, video, img, a');
          if (!interactive) {
            focusEditorAndPlaceCaret(e.clientX, e.clientY);
          }
        }
      }}
      onClick={(e) => {
        // If user tapped on padding/wrapper outside editorRef and not on an interactive chip
        if (editorRef.current && e.target !== editorRef.current) {
          const interactive = (e.target as HTMLElement).closest('[data-ref], .ref-chip, button, audio, video, img, a');
          if (!interactive) {
            focusEditorAndPlaceCaret(e.clientX, e.clientY);
          }
        }
      }}
      className="relative min-h-[40px] py-1 cursor-text"
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-block-index={blockIndex}
        onInput={handleInput}
        onBeforeInput={(e: React.FormEvent<HTMLDivElement>) => {
          const nativeEvt = e.nativeEvent as InputEvent;
          if (!nativeEvt || !nativeEvt.inputType) return;
          if (
            nativeEvt.inputType === 'deleteContentBackward' ||
            nativeEvt.inputType === 'deleteWordBackward' ||
            nativeEvt.inputType === 'deleteSoftLineBackward' ||
            nativeEvt.inputType === 'deleteHardLineBackward' ||
            nativeEvt.inputType === 'deleteEntireSoftLine'
          ) {
            if (tryDeleteAdjacentRefChip('backward')) {
              e.preventDefault();
            }
          } else if (
            nativeEvt.inputType === 'deleteContentForward' ||
            nativeEvt.inputType === 'deleteWordForward' ||
            nativeEvt.inputType === 'deleteSoftLineForward' ||
            nativeEvt.inputType === 'deleteHardLineForward'
          ) {
            if (tryDeleteAdjacentRefChip('forward')) {
              e.preventDefault();
            }
          } else if (nativeEvt.inputType && nativeEvt.inputType.startsWith('insert')) {
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
              const chip = (
                sel.anchorNode.nodeType === Node.ELEMENT_NODE
                  ? (sel.anchorNode as HTMLElement)
                  : sel.anchorNode.parentElement
              )?.closest('[data-ref], .ref-chip') as HTMLElement | null;
              if (chip && editorRef.current?.contains(chip)) {
                let nextTextNode: Text | null = null;
                if (chip.nextSibling && chip.nextSibling.nodeType === Node.TEXT_NODE) {
                  nextTextNode = chip.nextSibling as Text;
                } else {
                  nextTextNode = document.createTextNode('\u00A0');
                  (chip as unknown as ChildNode).after(nextTextNode);
                }
                const textVal = nextTextNode.nodeValue || '';
                if (!textVal) {
                  nextTextNode.nodeValue = '\u00A0';
                }
                const r = document.createRange();
                const caretPos = /^[\s\u00A0]/.test(nextTextNode.nodeValue || '') ? 1 : (nextTextNode.nodeValue || '').length;
                r.setStart(nextTextNode, Math.min(caretPos, (nextTextNode.nodeValue || '').length));
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
              }
            }
          }
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => onSelectionChange?.()}
        onMouseUp={() => onSelectionChange?.()}
        onPointerUp={() => onSelectionChange?.()}
        onTouchEnd={() => onSelectionChange?.()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-placeholder="Start typing..."
        style={{ color: darkMode ? '#f8fafc' : '#0f172a' }}
        className={`relative w-full bg-transparent font-serif text-base sm:text-lg leading-relaxed text-stone-900 dark:text-stone-100 focus:outline-none p-0 before:pointer-events-none before:text-stone-400/40 before:absolute before:left-0 before:top-0 empty:before:content-[attr(data-placeholder)] [&:has(>br:only-child)]:before:content-[attr(data-placeholder)] select-text ${
          isLastBlock ? 'min-h-[240px] sm:min-h-[360px]' : 'min-h-[32px]'
        }`}
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
  currentTheme,
}) => {
  const isPureBlack =
    currentTheme === 'black' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('pure-black'));
  const isNavy =
    currentTheme === 'navy' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('navy'));

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
  const [editingDrawingIndex, setEditingDrawingIndex] = useState<number | null>(null);
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [showQuickBibleReader, setShowQuickBibleReader] = useState<boolean>(false);
  const [readerInitialParams, setReaderInitialParams] = useState<{
    book?: string;
    chapter?: number;
    verse?: number;
    selectedVerses?: number[];
    translation?: string;
    initialSearchQuery?: string;
    initialStrongsSearch?: { id: string; lemma?: string };
  }>({});
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [customRefInput, setCustomRefInput] = useState<string>('Matt 5 v 7-20');
  const [showFormatToolbar, setShowFormatToolbar] = useState<boolean>(false);
  const [isAllBlocksSelected, setIsAllBlocksSelected] = useState<boolean>(false);
  const isAllBlocksSelectedRef = useRef<boolean>(false);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);
  const blocksContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isAllBlocksSelectedRef.current = isAllBlocksSelected;
  }, [isAllBlocksSelected]);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Flag to block destructive selectionchange overwrites while any modal is open
  const isAnyModalOpen =
    showReferenceModal ||
    showVoiceRecorder ||
    showDrawingCanvas ||
    showQuickBibleReader ||
    showDeleteModal ||
    showDatePickerModal ||
    !!activePopupMatch ||
    !!activeStrongsId;
  const isAnyModalOpenRef = useRef<boolean>(false);
  isAnyModalOpenRef.current = isAnyModalOpen;

  const adjustTitleHeight = () => {
    const el = titleTextareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  // Helper to dismiss mobile software keyboard and unfocus any editable note element
  const dismissKeyboard = () => {
    if (typeof document === 'undefined') return;
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && typeof activeEl.blur === 'function') {
      activeEl.blur();
    }
    const editables = document.querySelectorAll<HTMLElement>('input, textarea, [contenteditable="true"]');
    editables.forEach((el) => {
      try {
        el.blur();
      } catch {
        // ignore
      }
    });
  };

  useEffect(() => {
    adjustTitleHeight();
    window.addEventListener('resize', adjustTitleHeight);
    return () => {
      window.removeEventListener('resize', adjustTitleHeight);
    };
  }, [title]);

  // Pre-load core Bible books in background while user types so "Bible" modal opens instantaneously
  useEffect(() => {
    const userTrans = getStoredTranslation() || 'KJV_STRONGS';
    const lastPos = getStoredBiblePosition();
    if (lastPos && lastPos.book) {
      prefetchBook(lastPos.book, userTrans);
    }
    prefetchBook('Matthew', userTrans);
    prefetchBook('Genesis', userTrans);
    prefetchBook('Psalms', userTrans);
  }, []);

  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    bullet: boolean;
    fontSize: string;
    align: 'left' | 'center' | 'right';
  }>({
    bold: false,
    italic: false,
    underline: false,
    bullet: false,
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

  // Close moreMenu when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Intercept back button / modal dismissal in editor
  const handleEditorBack = () => {
    if (showMoreMenu) {
      setShowMoreMenu(false);
      return;
    }
    if (showDeleteModal) {
      setShowDeleteModal(false);
      return;
    }
    if (showReferenceModal) {
      setShowReferenceModal(false);
      return;
    }
    if (showQuickBibleReader) {
      setShowQuickBibleReader(false);
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
      if (showMoreMenu) {
        setShowMoreMenu(false);
        modalClosed = true;
      } else if (showDeleteModal) {
        setShowDeleteModal(false);
        modalClosed = true;
      } else if (showReferenceModal) {
        setShowReferenceModal(false);
        modalClosed = true;
      } else if (showQuickBibleReader) {
        setShowQuickBibleReader(false);
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
    showMoreMenu,
    showDeleteModal,
    showReferenceModal,
    showQuickBibleReader,
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

  const handleSelectAllBlocks = () => {
    if (!blocksContainerRef.current) return;
    const container = blocksContainerRef.current;

    try {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(container);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (_) {}

    setIsAllBlocksSelected(true);
    isAllBlocksSelectedRef.current = true;
  };

  const handleDeselectAll = () => {
    setIsAllBlocksSelected(false);
    isAllBlocksSelectedRef.current = false;
    try {
      const sel = window.getSelection();
      sel?.removeAllRanges();
    } catch (_) {}
  };

  const handleCopySelectedBlocks = () => {
    const textPieces: string[] = [];
    const htmlPieces: string[] = [];

    blocks.forEach((block) => {
      if (block.type === 'text') {
        const temp = document.createElement('div');
        temp.innerHTML = block.content;
        const plain = temp.innerText.trim();
        if (plain) textPieces.push(plain);
        htmlPieces.push(`<div>${block.content}</div>`);
      } else if (block.type === 'image') {
        textPieces.push(block.caption ? `[Image: ${block.caption}]` : '[Image]');
        htmlPieces.push(`<div><img src="${block.url}" alt="${block.caption || ''}" /></div>`);
      } else if (block.type === 'voice') {
        textPieces.push(`[Voice Note: ${block.duration ? Math.round(block.duration) + 's' : 'Audio'}]`);
      } else if (block.type === 'drawing') {
        textPieces.push('[Sketch Drawing]');
      }
    });

    const fullPlainText = textPieces.join('\n\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(fullPlainText);
      } catch (_) {}
    }

    setCopyToastMessage('All note content copied to clipboard');
    setTimeout(() => setCopyToastMessage(null), 2000);
  };

  const handleCutSelectedBlocks = () => {
    handleCopySelectedBlocks();
    pushHistorySnapshot(true);
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `b_${Date.now()}`;
    setBlocks([{ id: newId, type: 'text', content: '' }]);
    setIsAllBlocksSelected(false);
    isAllBlocksSelectedRef.current = false;
    setTimeout(() => {
      const el = document.querySelector(`[data-block-index="0"]`) as HTMLElement | null;
      if (el) el.focus();
    }, 50);
  };

  const handleDeleteSelectedBlocks = () => {
    pushHistorySnapshot(true);
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `b_${Date.now()}`;
    setBlocks([{ id: newId, type: 'text', content: '' }]);
    setIsAllBlocksSelected(false);
    isAllBlocksSelectedRef.current = false;
    setTimeout(() => {
      const el = document.querySelector(`[data-block-index="0"]`) as HTMLElement | null;
      if (el) el.focus();
    }, 50);
  };

  // Keyboard listener for Ctrl+A, Delete/Backspace when all selected, and Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const activeEl = document.activeElement;
        // If focused inside the title textarea, let default title select-all work
        if (activeEl === titleTextareaRef.current) {
          return;
        }
        e.preventDefault();
        handleSelectAllBlocks();
        return;
      }

      // If all blocks are selected, handle Backspace or Delete
      if (isAllBlocksSelectedRef.current && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        handleDeleteSelectedBlocks();
        return;
      }

      // If all blocks are selected, handle Escape
      if (isAllBlocksSelectedRef.current && e.key === 'Escape') {
        e.preventDefault();
        handleDeselectAll();
        return;
      }

      // If all blocks are selected and user types a single printable character to replace all
      if (
        isAllBlocksSelectedRef.current &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1
      ) {
        e.preventDefault();
        pushHistorySnapshot(true);
        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `b_${Date.now()}`;
        setBlocks([{ id: newId, type: 'text', content: e.key }]);
        setIsAllBlocksSelected(false);
        isAllBlocksSelectedRef.current = false;
        setTimeout(() => {
          const el = document.querySelector(`[data-block-index="0"]`) as HTMLElement | null;
          if (el) {
            el.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(el);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch (_) {}
          }
        }, 50);
        return;
      }

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

    const handleWindowCopy = (e: ClipboardEvent) => {
      if (isAllBlocksSelectedRef.current) {
        e.preventDefault();
        handleCopySelectedBlocks();
      }
    };

    const handleWindowCut = (e: ClipboardEvent) => {
      if (isAllBlocksSelectedRef.current) {
        e.preventDefault();
        handleCutSelectedBlocks();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleWindowCopy);
    window.addEventListener('cut', handleWindowCut);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleWindowCopy);
      window.removeEventListener('cut', handleWindowCut);
    };
  }, [canUndo, canRedo, title, blocks, dateString, isPinned]);

  // Deselect on collapse or click away
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!isAllBlocksSelectedRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setIsAllBlocksSelected(false);
        isAllBlocksSelectedRef.current = false;
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  interface SavedEditorState {
    entryId: string;
    blockIndex: number;
    blockId?: string;
    startOffset: number;
    endOffset: number;
    scrollY: number;
    wasFocused: boolean;
    rangeCloned?: Range | null;
    startPath?: number[];
    startPathOffset?: number;
    endPath?: number[];
    endPathOffset?: number;
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

      let isBullet = false;
      try {
        isBullet = document.queryCommandState('insertUnorderedList');
      } catch {
        // fallback check if selection anchor is within <ul> or <li>
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
          const parentEl = sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement)
            : sel.anchorNode.parentElement;
          isBullet = !!parentEl?.closest('ul');
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        bullet: isBullet,
        fontSize: sizeVal,
        align: alignVal,
      });
    } catch {
      // ignore
    }
  };

  const saveEditorState = () => {
    if (typeof window === 'undefined') return;
    if (isAnyModalOpenRef.current) return;

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
      const validBlockIdx = !isNaN(blockIdx) && blockIdx >= 0 && blockIdx < blocks.length ? blockIdx : activeBlockIndex;

      // If the editor is NOT actively focused, and we already have a valid saved editor state for this entry:
      // DO NOT allow an unfocused blur/click/selectionchange event to overwrite the authentic saved cursor position!
      if (!isFocused && savedEditorStateRef.current && savedEditorStateRef.current.entryId === entry.id) {
        return;
      }

      const offsets = getCaretCharacterOffsetWithin(activeEl);

      let startPath: number[] | undefined;
      let startPathOffset: number | undefined;
      let endPath: number[] | undefined;
      let endPathOffset: number | undefined;

      if (rangeCloned) {
        startPath = getDomNodePath(activeEl, rangeCloned.startContainer);
        startPathOffset = rangeCloned.startOffset;
        endPath = getDomNodePath(activeEl, rangeCloned.endContainer);
        endPathOffset = rangeCloned.endOffset;
      }

      const state: SavedEditorState = {
        entryId: entry.id,
        blockIndex: validBlockIdx,
        blockId: blocks[validBlockIdx]?.id,
        startOffset: offsets.start,
        endOffset: offsets.end,
        scrollY: window.scrollY,
        wasFocused: isFocused,
        rangeCloned,
        startPath,
        startPathOffset,
        endPath,
        endPathOffset,
        timestamp: Date.now(),
      };

      savedEditorStateRef.current = state;
      setActiveBlockIndex(validBlockIdx);
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
            startPath: state.startPath,
            startPathOffset: state.startPathOffset,
            endPath: state.endPath,
            endPathOffset: state.endPathOffset,
            timestamp: state.timestamp,
          })
        );
      } catch {
        // ignore
      }
    } else {
      // Do not destroy previous valid caret/block position if user simply tapped an action button or modal
      if (savedEditorStateRef.current && savedEditorStateRef.current.entryId === entry.id) {
        // Only update scroll position if current scroll is non-zero
        if (window.scrollY > 0) {
          savedEditorStateRef.current.scrollY = window.scrollY;
        }
      }
    }
  };

  const restoreEditorState = (forceFocus = false) => {
    // If the user is ALREADY actively focused inside an editable block, NEVER steal focus away!
    const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (activeEl && (activeEl.getAttribute('contenteditable') === 'true' || activeEl.closest('[contenteditable="true"]'))) {
      return;
    }

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
        if (
          state.rangeCloned &&
          state.rangeCloned.startContainer &&
          state.rangeCloned.startContainer.isConnected &&
          editorEl.contains(state.rangeCloned.commonAncestorContainer)
        ) {
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

        if (!rangeRestored && state.startPath && state.startPath.length > 0) {
          const targetNode = getNodeFromDomPath(editorEl, state.startPath);
          if (targetNode) {
            try {
              const pathRange = document.createRange();
              const maxOffset = targetNode.nodeType === Node.TEXT_NODE
                ? (targetNode.textContent?.length || 0)
                : targetNode.childNodes.length;
              pathRange.setStart(targetNode, Math.min(state.startPathOffset ?? 0, maxOffset));
              pathRange.collapse(true);
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(pathRange);
                rangeRestored = true;
              }
            } catch (_) {}
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

    let computedNewIndex = 2;
    setBlocks((prev) => {
      const targetIdx = activeBlockIndex >= 0 && activeBlockIndex < prev.length ? activeBlockIndex : prev.length - 1;
      const validTarget = Math.max(0, targetIdx);
      const copy = [...prev];
      copy.splice(validTarget + 1, 0, mediaBlock, newTextBlock);
      computedNewIndex = validTarget + 2;
      return copy;
    });

    setActiveBlockIndex(computedNewIndex);

    // Update savedEditorStateRef to point directly to the newly inserted text block below the media
    savedEditorStateRef.current = {
      entryId: entry.id,
      blockIndex: computedNewIndex,
      blockId: newTextBlock.id,
      startOffset: 0,
      endOffset: 0,
      scrollY: window.scrollY,
      wasFocused: true,
      timestamp: Date.now(),
    };
    try {
      sessionStorage.setItem(
        `editor_state_${entry.id}`,
        JSON.stringify(savedEditorStateRef.current)
      );
    } catch {}

    // Focus and place caret into the new text block beneath the media immediately and after modal animations
    const focusTarget = () => {
      const el = document.querySelector(`[data-block-index="${computedNewIndex}"]`) as HTMLElement | null;
      if (el) {
        el.focus({ preventScroll: false });
        if (el.childNodes.length === 0 || el.innerHTML === '') {
          el.innerHTML = '<br>';
        }
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(el, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {}
        ensureCaretVisible(80);
      }
    };

    setTimeout(focusTarget, 60);
    setTimeout(focusTarget, 160);
    setTimeout(focusTarget, 320);
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

  const lastCanvasTapHandledRef = useRef<number>(0);
  const canvasTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Activates the text cursor and brings up software keyboard when tapping anywhere on blank space
  const handleBlankAreaActivation = (clientX: number, clientY: number, targetEl: HTMLElement) => {
    // If the tap targeted an interactive UI control, let it handle its event
    if (
      targetEl.closest(
        'button, input, textarea, select, [data-ref], .ref-chip, audio, video, a, [role="button"], [role="menuitem"]'
      )
    ) {
      return;
    }

    // 1. If user tapped directly on or inside a text editor block:
    const tappedEditable = targetEl.closest<HTMLElement>('[contenteditable="true"]');
    if (tappedEditable && tappedEditable.closest('#main-canvas')) {
      tappedEditable.focus({ preventScroll: true });
      if (tappedEditable.childNodes.length === 0 || tappedEditable.innerHTML === '') {
        tappedEditable.innerHTML = '<br>';
      }
      const range = getRangeFromPoint(clientX, clientY);
      const sel = window.getSelection();
      if (sel) {
        if (range && (tappedEditable.contains(range.startContainer) || range.startContainer === tappedEditable)) {
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          const fallbackRange = document.createRange();
          if (tappedEditable.innerHTML === '<br>' || tappedEditable.innerHTML === '<br/>') {
            fallbackRange.setStart(tappedEditable, 0);
            fallbackRange.collapse(true);
          } else {
            fallbackRange.selectNodeContents(tappedEditable);
            fallbackRange.collapse(false);
          }
          sel.removeAllRanges();
          sel.addRange(fallbackRange);
        }
      }
      const idxStr = tappedEditable.getAttribute('data-block-index');
      if (idxStr) {
        const parsed = parseInt(idxStr, 10);
        if (!isNaN(parsed)) {
          setActiveBlockIndex(parsed);
          savedEditorStateRef.current = {
            entryId: entry.id,
            blockIndex: parsed,
            startOffset: 0,
            endOffset: 0,
            scrollY: window.scrollY,
            wasFocused: true,
            timestamp: Date.now(),
          };
          try {
            sessionStorage.setItem(
              `editor_state_${entry.id}`,
              JSON.stringify(savedEditorStateRef.current)
            );
          } catch {}
        }
      }
      return;
    }

    // 2. If no blocks or the last block is not a text block, create and focus a new text block
    if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
      handleAddTextBlock(blocks.length - 1);
      setTimeout(() => {
        const textEditors = document.querySelectorAll<HTMLElement>('#main-canvas [contenteditable="true"]');
        const last = textEditors[textEditors.length - 1];
        if (last) {
          last.focus({ preventScroll: true });
          if (last.childNodes.length === 0 || last.innerHTML === '') {
            last.innerHTML = '<br>';
          }
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.setStart(last, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }, 50);
      return;
    }

    // 3. User tapped on blank space outside any text editor:
    // Select the text editor that is vertically closest or beneath clientY (never jumping to an unrelated block above)
    const textEditors = Array.from(
      document.querySelectorAll<HTMLElement>('#main-canvas [contenteditable="true"]')
    );
    if (textEditors.length > 0) {
      let bestEditor = textEditors[textEditors.length - 1];
      let minDistance = Infinity;

      for (const ed of textEditors) {
        const rect = ed.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          bestEditor = ed;
          minDistance = 0;
          break;
        }
        const dist = clientY < rect.top ? rect.top - clientY : clientY - rect.bottom;
        if (dist < minDistance) {
          minDistance = dist;
          bestEditor = ed;
        }
      }

      bestEditor.focus({ preventScroll: true });
      if (bestEditor.childNodes.length === 0 || bestEditor.innerHTML === '') {
        bestEditor.innerHTML = '<br>';
      }
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        if (bestEditor.innerHTML === '<br>' || bestEditor.innerHTML === '<br/>') {
          range.setStart(bestEditor, 0);
          range.collapse(true);
        } else {
          range.selectNodeContents(bestEditor);
          range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const idxStr = bestEditor.getAttribute('data-block-index');
      if (idxStr) {
        const parsed = parseInt(idxStr, 10);
        if (!isNaN(parsed)) {
          setActiveBlockIndex(parsed);
          savedEditorStateRef.current = {
            entryId: entry.id,
            blockIndex: parsed,
            startOffset: 0,
            endOffset: 0,
            scrollY: window.scrollY,
            wasFocused: true,
            timestamp: Date.now(),
          };
          try {
            sessionStorage.setItem(
              `editor_state_${entry.id}`,
              JSON.stringify(savedEditorStateRef.current)
            );
          } catch {}
        }
      }
    }
  };

  // Handle Voice Note created
  const handleAddVoiceNote = (voiceBlock: VoiceBlock) => {
    insertMediaWithTextBelow(voiceBlock);
  };

  // Handle Drawing created or updated
  const handleAddDrawing = (drawingBlock: DrawingBlock) => {
    if (editingDrawingIndex !== null && editingDrawingIndex >= 0 && editingDrawingIndex < blocks.length) {
      const existing = blocks[editingDrawingIndex];
      if (existing && existing.type === 'drawing') {
        const updatedBlocks = [...blocks];
        updatedBlocks[editingDrawingIndex] = {
          ...existing,
          dataUrl: drawingBlock.dataUrl,
        };
        setBlocks(updatedBlocks);
        setEditingDrawingIndex(null);
        return;
      }
    }
    insertMediaWithTextBelow(drawingBlock);
    setEditingDrawingIndex(null);
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
    if (!html || !html.trim()) return chipHtml + '&nbsp;';
    const trimmed = html.trim();
    if (trimmed.endsWith('</div>')) {
      return trimmed.slice(0, -6) + '&nbsp;' + chipHtml + '&nbsp;</div>';
    }
    if (trimmed.endsWith('</p>')) {
      return trimmed.slice(0, -4) + '&nbsp;' + chipHtml + '&nbsp;</p>';
    }
    if (trimmed.endsWith('<br>') || trimmed.endsWith('<br/>')) {
      const lastBr = trimmed.lastIndexOf('<br');
      return trimmed.slice(0, lastBr) + '&nbsp;' + chipHtml + '&nbsp;';
    }
    return trimmed + '&nbsp;' + chipHtml + '&nbsp;';
  };

  // Helper to insert arbitrary HTML into the active editor or append to block
  const insertHtmlIntoEditor = (htmlContent: string) => {
    let insertedInline = false;
    const savedState = savedEditorStateRef.current;

    // Determine target block index accurately
    // Prefer savedState if valid and from this entry, otherwise activeBlockIndex, otherwise latest text block or last block
    let targetIdx = -1;
    if (savedState && savedState.entryId === entry.id && savedState.blockIndex >= 0 && savedState.blockIndex < blocks.length) {
      targetIdx = savedState.blockIndex;
    } else if (activeBlockIndex >= 0 && activeBlockIndex < blocks.length) {
      targetIdx = activeBlockIndex;
    } else {
      // Find the last text block if any exists, otherwise the last block
      let lastTextIdx = -1;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === 'text') {
          lastTextIdx = i;
          break;
        }
      }
      targetIdx = lastTextIdx >= 0 ? lastTextIdx : (blocks.length > 0 ? blocks.length - 1 : 0);
    }

    const editorEl = targetIdx >= 0 ? (document.querySelector(`[data-block-index="${targetIdx}"]`) as HTMLElement | null) : null;

    if (editorEl && targetIdx >= 0) {
      try {
        const sel = window.getSelection();
        let rangeToInsert: Range | null = null;

        // Priority 1: Use cloned range from snapshot if still connected inside this editor (captures exact newline/paragraph & consecutive insertions)
        if (
          savedState?.rangeCloned &&
          savedState.rangeCloned.startContainer &&
          savedState.rangeCloned.startContainer.isConnected &&
          editorEl.contains(savedState.rangeCloned.commonAncestorContainer)
        ) {
          rangeToInsert = savedState.rangeCloned;
        }

        // Priority 2: Resolve exact DOM node path if saved (immune to text offset ambiguities on empty lines)
        if (!rangeToInsert && savedState?.startPath && savedState.startPath.length > 0) {
          const targetNode = getNodeFromDomPath(editorEl, savedState.startPath);
          if (targetNode) {
            try {
              const pathRange = document.createRange();
              const maxOffset = targetNode.nodeType === Node.TEXT_NODE
                ? (targetNode.textContent?.length || 0)
                : targetNode.childNodes.length;
              pathRange.setStart(targetNode, Math.min(savedState.startPathOffset ?? 0, maxOffset));
              pathRange.collapse(true);
              rangeToInsert = pathRange;
            } catch (_) {}
          }
        }

        // Priority 3: Restore from saved character offset snapshot (highest fidelity across modals)
        if (
          !rangeToInsert &&
          savedState &&
          typeof savedState.startOffset === 'number' &&
          savedState.blockIndex === targetIdx
        ) {
          const charRange = getRangeFromCharacterOffsetWithin(
            editorEl,
            savedState.startOffset,
            savedState.endOffset ?? savedState.startOffset
          );
          if (charRange) {
            rangeToInsert = charRange;
          }
        }

        // Priority 4: Check if currently active selection is genuinely focused inside this editor
        if (
          !rangeToInsert &&
          sel &&
          sel.rangeCount > 0 &&
          document.activeElement === editorEl &&
          editorEl.contains(sel.getRangeAt(0).commonAncestorContainer)
        ) {
          rangeToInsert = sel.getRangeAt(0);
        }

        // Priority 5: Fallback to appending at the end of this block
        if (!rangeToInsert) {
          const endRange = document.createRange();
          endRange.selectNodeContents(editorEl);
          endRange.collapse(false);
          rangeToInsert = endRange;
        }

        if (rangeToInsert && sel) {
          // If inserting into an empty line container with a solitary placeholder <br>,
          // remove the placeholder <br> so the inserted chip takes the line cleanly without creating an extra gap.
          const startCont = rangeToInsert.startContainer;
          if (startCont.nodeType === Node.ELEMENT_NODE) {
            const containerEl = startCont as HTMLElement;
            if (containerEl.childNodes.length === 1 && containerEl.firstChild?.nodeName === 'BR') {
              containerEl.removeChild(containerEl.firstChild);
            }
          } else if (startCont.nodeName === 'BR' && startCont.parentNode) {
            const parentEl = startCont.parentNode as HTMLElement;
            if (parentEl !== editorEl && parentEl.childNodes.length === 1) {
              const newRange = document.createRange();
              newRange.selectNode(startCont);
              newRange.collapse(true);
              rangeToInsert = newRange;
              parentEl.removeChild(startCont);
            }
          }

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;

          const frag = document.createDocumentFragment();
          let lastInsertedNode: Node | null = null;
          while (tempDiv.firstChild) {
            lastInsertedNode = tempDiv.firstChild;
            frag.appendChild(lastInsertedNode);
          }

          rangeToInsert.deleteContents();
          rangeToInsert.insertNode(frag);

          // Focus editor without resetting cursor
          editorEl.focus({ preventScroll: true });

          // Place caret immediately after the inserted content
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
            lastSelectionRef.current = newRange.cloneRange();
          }

          // Directly sync state with updated editor innerHTML
          const newHtml = editorEl.innerHTML;
          setBlocks((prev) =>
            prev.map((b, i) => (i === targetIdx && b.type === 'text' ? { ...b, content: newHtml } : b))
          );
          setActiveBlockIndex(targetIdx);

          // Update saved editor state offsets and DOM path so consecutive insertions immediately follow
          const offsets = getCaretCharacterOffsetWithin(editorEl);
          const newStartPath = lastInsertedNode ? getDomNodePath(editorEl, lastInsertedNode) : undefined;
          savedEditorStateRef.current = {
            entryId: entry.id,
            blockIndex: targetIdx,
            blockId: blocks[targetIdx]?.id,
            startOffset: offsets.start,
            endOffset: offsets.end,
            scrollY: window.scrollY,
            wasFocused: true,
            rangeCloned: lastSelectionRef.current,
            startPath: newStartPath,
            startPathOffset: lastInsertedNode?.nodeType === Node.TEXT_NODE ? (lastInsertedNode.textContent?.length || 0) : 1,
            timestamp: Date.now(),
          };

          try {
            sessionStorage.setItem(
              `editor_state_${entry.id}`,
              JSON.stringify({
                entryId: savedEditorStateRef.current.entryId,
                blockIndex: savedEditorStateRef.current.blockIndex,
                startOffset: savedEditorStateRef.current.startOffset,
                endOffset: savedEditorStateRef.current.endOffset,
                scrollY: savedEditorStateRef.current.scrollY,
                wasFocused: savedEditorStateRef.current.wasFocused,
                startPath: savedEditorStateRef.current.startPath,
                startPathOffset: savedEditorStateRef.current.startPathOffset,
                timestamp: savedEditorStateRef.current.timestamp,
              })
            );
          } catch {
            // ignore
          }

          insertedInline = true;
        }
      } catch (err) {
        console.warn('Error inserting HTML inline:', err);
        insertedInline = false;
      }
    }

    if (!insertedInline) {
      if (blocks.length === 0) {
        const newBlock: TextBlock = {
          id: `text-${Date.now()}`,
          type: 'text',
          content: htmlContent,
        };
        setBlocks([newBlock]);
        setActiveBlockIndex(0);
      } else {
        const fallbackIdx = targetIdx >= 0 && targetIdx < blocks.length ? targetIdx : blocks.length - 1;
        const targetBlock = blocks[fallbackIdx];

        if (targetBlock && targetBlock.type === 'text') {
          const updatedContent = appendChipToHtmlContent(targetBlock.content, htmlContent);
          setBlocks((prev) =>
            prev.map((b, i) =>
              i === fallbackIdx ? { ...b, content: updatedContent } : b
            )
          );
          setActiveBlockIndex(fallbackIdx);
          setTimeout(() => {
            const fallbackEl = document.querySelector(`[data-block-index="${fallbackIdx}"]`) as HTMLElement | null;
            if (fallbackEl) {
              fallbackEl.focus({ preventScroll: true });
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(fallbackEl);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                lastSelectionRef.current = range.cloneRange();
                const offsets = getCaretCharacterOffsetWithin(fallbackEl);
                savedEditorStateRef.current = {
                  entryId: entry.id,
                  blockIndex: fallbackIdx,
                  blockId: blocks[fallbackIdx]?.id,
                  startOffset: offsets.start,
                  endOffset: offsets.end,
                  scrollY: window.scrollY,
                  wasFocused: true,
                  rangeCloned: lastSelectionRef.current,
                  timestamp: Date.now(),
                };
              }
            }
          }, 30);
        } else {
          const newBlock: TextBlock = {
            id: `text-${Date.now()}`,
            type: 'text',
            content: htmlContent,
          };
          insertBlockAt(newBlock, fallbackIdx);
        }
      }
    }
  };

  // Open Reference Modal after recording genuine caret selection
  const handleOpenReferenceModal = () => {
    saveSelection();
    isAnyModalOpenRef.current = true;
    setShowReferenceModal(true);
  };

  // Insert Reference (e.g. Matt 5 v 7-20) as an interactive clickable chip
  const handleInsertReferenceText = (refText: string) => {
    const trimmed = refText.trim();
    if (!trimmed) return;
    const chipHtml = createRefChipHtml(trimmed);
    insertHtmlIntoEditor(chipHtml + '&nbsp;');
    setShowReferenceModal(false);
    isAnyModalOpenRef.current = false;
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
    setShowDatePickerModal(true);
  };

  const editorBgClass = isPureBlack
    ? 'bg-black text-white'
    : isNavy
    ? 'bg-[#0b132b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-950 text-neutral-100'
    : 'bg-white text-stone-900';

  const editorHeaderClass = isPureBlack
    ? 'bg-black/95 border-neutral-900'
    : isNavy
    ? 'bg-[#1c2541]/90 border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-900/90 border-neutral-800'
    : 'bg-white/90 border-stone-100';

  const actionBtnClass = isPureBlack
    ? 'hover:bg-neutral-900 text-stone-300 hover:text-white'
    : isNavy
    ? 'hover:bg-[#253256] text-[#e0e1dd]'
    : darkMode
    ? 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
    : 'hover:bg-stone-100 text-stone-500';

  const datePillClass = isPureBlack
    ? 'bg-neutral-950 text-neutral-200 border-neutral-800 hover:bg-neutral-900'
    : isNavy
    ? 'bg-[#1c2541] text-[#e0e1dd] border-[#3a506b] hover:bg-[#253256]'
    : darkMode
    ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
    : 'bg-stone-100 text-stone-700 border-stone-200/70 hover:bg-stone-200';

  const dividerClass = isPureBlack
    ? 'border-neutral-900'
    : isNavy
    ? 'border-[#3a506b]'
    : darkMode
    ? 'border-neutral-800'
    : 'border-stone-200';

  const bottomBarClass = isPureBlack
    ? 'bg-black/95 border-neutral-900 text-neutral-100'
    : isNavy
    ? 'bg-[#1c2541]/95 border-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100'
    : 'bg-white/95 border-stone-200 text-stone-800';

  const formatToolbarClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 text-neutral-200'
    : isNavy
    ? 'bg-[#0b132b] border-[#3a506b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
    : 'bg-stone-100 border-stone-200 text-stone-800';

  const toolbarBtnClass = isPureBlack
    ? 'bg-neutral-950 hover:bg-neutral-900 text-neutral-200 border-neutral-900'
    : isNavy
    ? 'bg-[#0b132b] hover:bg-[#162238] text-[#e0e1dd] border-[#3a506b]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200';

  const modalClass = isPureBlack
    ? 'bg-neutral-950 border-neutral-900 text-white'
    : isNavy
    ? 'bg-[#1c2541] border-[#3a506b] text-white'
    : darkMode
    ? 'bg-neutral-900 border-neutral-800 text-white'
    : 'bg-white border-stone-200 text-stone-900';

  const bibleBtnClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border-neutral-800 hover:border-red-700/60'
    : isNavy
    ? 'bg-[#1c2541] hover:bg-[#253256] text-[#e0e1dd] border-[#3a506b] hover:border-cyan-500/60'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-700 hover:border-red-700/60'
    : 'bg-stone-100 hover:bg-stone-200/90 text-stone-800 border-stone-300 hover:border-red-300';

  const cancelBtnClass = isPureBlack
    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200'
    : isNavy
    ? 'bg-[#253256] hover:bg-[#2e3e6b] text-[#e0e1dd]'
    : darkMode
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
    : 'bg-stone-100 hover:bg-stone-200 text-stone-700';

  return (
    <div className={`flex flex-col min-h-screen ${editorBgClass}`}>
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
        className={`px-2.5 sm:px-4 py-2 sm:py-3 border-b flex items-center justify-between gap-1.5 sm:gap-2 sticky top-0 z-20 ${editorHeaderClass} backdrop-blur-md`}
      >
        {/* Left Section: Back + Date (dd/mm/yyyy) + Undo / Redo */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          <button
            onClick={handleEditorBack}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${actionBtnClass}`}
            title="Back to Journal List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Normal Size Date Display Pill (dd/mm/yyyy) */}
          <button
            type="button"
            onClick={handleCalendarClick}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer group shrink-0 border shadow-2xs active:scale-95 ${datePillClass}`}
            title="Change Note Date (DD/MM/YYYY)"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 shrink-0" />
            <span className="text-xs font-bold tracking-tight select-none">
              {formatDateDDMMYYYY(dateString)}
            </span>
          </button>

          {/* Undo and Redo Controls */}
          <div className={`flex items-center gap-0.5 pl-1 sm:pl-1.5 border-l shrink-0 ${dividerClass}`}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90 ${actionBtnClass}`}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90 ${actionBtnClass}`}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Section: Bible Reader + Save status + 3-Dot Overflow Menu (Pin & Delete) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Scripture Reader Button with compact Bible label */}
          <button
            type="button"
            onPointerDown={() => {
              saveSelection();
              dismissKeyboard();
            }}
            onTouchStart={() => {
              saveSelection();
              dismissKeyboard();
            }}
            onMouseDown={() => {
              saveSelection();
              dismissKeyboard();
            }}
            onClick={() => {
              saveSelection();
              dismissKeyboard();
              setShowQuickBibleReader(true);
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border shadow-2xs shrink-0 ${bibleBtnClass}`}
            title="Open Bible Reader & Full Chapter (Esc to return)"
            aria-label="Bible"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="font-semibold text-xs tracking-tight">Bible</span>
          </button>

          <span className="text-[10px] sm:text-[11px] text-stone-400 font-medium hidden lg:inline">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>

          {/* 3-Dot Overflow Menu: Pin and Delete */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all active:scale-90 ${
                showMoreMenu
                  ? isPureBlack
                    ? 'bg-neutral-800 text-white'
                    : isNavy
                    ? 'bg-[#253256] text-[#e0e1dd]'
                    : darkMode
                    ? 'bg-neutral-700 text-white'
                    : 'bg-stone-200 text-stone-900'
                  : actionBtnClass
              }`}
              title="More options (Pin, Delete)"
              aria-label="More options"
              aria-expanded={showMoreMenu}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Popup */}
            {showMoreMenu && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-44 rounded-2xl p-1.5 shadow-xl border z-30 animate-in fade-in zoom-in-95 duration-100 ${
                  isPureBlack
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-100 shadow-black/60'
                    : isNavy
                    ? 'bg-[#1c2541] border-[#3a506b] text-[#e0e1dd] shadow-black/40'
                    : darkMode
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-100 shadow-black/60'
                    : 'bg-white border-stone-200 text-stone-900 shadow-stone-400/20'
                }`}
              >
                {/* Pin/Unpin option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPinned(!isPinned);
                    setShowMoreMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isPinned
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                      : isPureBlack
                      ? 'hover:bg-neutral-900 text-neutral-200'
                      : isNavy
                      ? 'hover:bg-[#253256] text-[#e0e1dd]'
                      : darkMode
                      ? 'hover:bg-neutral-800 text-neutral-200'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-current text-red-600 dark:text-red-400' : ''}`} />
                  <span>{isPinned ? 'Unpin Note' : 'Pin to Top'}</span>
                </button>

                <div className={`my-1 h-px ${isPureBlack ? 'bg-neutral-900' : isNavy ? 'bg-[#3a506b]' : darkMode ? 'bg-neutral-800' : 'bg-stone-100'}`} />

                {/* Delete option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Delete Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Scrollable Editor Workspace */}
      <div
        id="main-canvas"
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            canvasTouchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              time: Date.now(),
            };
          } else {
            canvasTouchStartRef.current = null;
          }
        }}
        onTouchEnd={(e) => {
          if (!canvasTouchStartRef.current) return;
          const start = canvasTouchStartRef.current;
          canvasTouchStartRef.current = null;
          const duration = Date.now() - start.time;
          const touch = e.changedTouches[0];
          if (!touch) return;
          const dist = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
          // If a quick tap with minimal movement (< 15px), activate cursor immediately
          if (duration < 500 && dist < 15) {
            const targetEl = e.target as HTMLElement;
            // If user tapped directly inside or on a contenteditable block or wrapper, let native Android touch proceed!
            if (targetEl.closest('[contenteditable="true"], .cursor-text')) {
              return;
            }
            const isInteractive = targetEl.closest(
              'button, input, textarea, select, [data-ref], .ref-chip, audio, video, img, a, [role="button"], [role="menuitem"]'
            );
            if (!isInteractive) {
              lastCanvasTapHandledRef.current = Date.now();
              handleBlankAreaActivation(touch.clientX, touch.clientY, targetEl);
            }
          }
        }}
        onMouseDown={(e) => {
          const targetEl = e.target as HTMLElement;
          const isInteractive = targetEl.closest(
            'button, input, textarea, select, [data-ref], .ref-chip, audio, video, img, a, [role="button"], [role="menuitem"]'
          );
          if (!isInteractive && !targetEl.isContentEditable && !targetEl.closest('[contenteditable="true"], .cursor-text')) {
            e.preventDefault();
          }
        }}
        onClick={(e) => {
          if (Date.now() - lastCanvasTapHandledRef.current < 400) return;
          handleBlankAreaActivation(e.clientX, e.clientY, e.target as HTMLElement);
        }}
        className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4 pb-36 min-h-[75vh] cursor-text"
      >
        {/* Title Input (Auto-wrapping to next line with dynamic height expansion) */}
        <div className="pb-2 border-b border-red-500/40 dark:border-red-500/40 focus-within:border-red-500 transition-colors">
          <textarea
            ref={titleTextareaRef}
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value)}
            onInput={adjustTitleHeight}
            placeholder="Title..."
            className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent focus:outline-none placeholder:text-stone-400/60 text-stone-900 dark:text-white resize-none overflow-hidden break-words leading-snug block"
          />
        </div>

        {/* Sequential Mixed Content Blocks List */}
        <div ref={blocksContainerRef} className="space-y-4 select-text">
          {blocks.length === 0 && (
            <div className={`text-center py-12 border-2 border-dashed rounded-3xl p-6 ${dividerClass}`}>
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
                onMouseDown={(e) => {
                  const targetEl = e.target as HTMLElement;
                  const isInteractive = targetEl.closest(
                    'button, input, textarea, select, [data-ref], .ref-chip, audio, video, img, a, [role="button"], [role="menuitem"]'
                  );
                  if (!isInteractive && !targetEl.isContentEditable && !targetEl.closest('[contenteditable="true"], .cursor-text')) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  if (isAllBlocksSelected) {
                    setIsAllBlocksSelected(false);
                    isAllBlocksSelectedRef.current = false;
                  }
                  setActiveBlockIndex(index);
                  if (block.type === 'text') {
                    const editorEl = document.querySelector(`[data-block-index="${index}"]`) as HTMLElement | null;
                    if (editorEl && document.activeElement !== editorEl) {
                      editorEl.focus({ preventScroll: true });
                    }
                  }
                }}
                className={`relative group transition-all rounded-2xl ${
                  isAllBlocksSelected
                    ? 'ring-2 ring-blue-500/80 bg-blue-500/10 dark:bg-blue-500/15 p-1.5'
                    : ''
                }`}
              >
                {/* Subtle Hover Action Bar for moving/deleting media blocks (never on text blocks) */}
                {block.type !== 'text' && (
                  <div className="absolute right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 bg-stone-900/90 dark:bg-neutral-800/90 backdrop-blur-md px-2 py-1 rounded-full text-white text-[10px] shadow-lg pointer-events-none group-hover:pointer-events-auto">
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
                )}

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
                    onSelectAll={handleSelectAllBlocks}
                    darkMode={darkMode}
                    autoFocus={activeBlockIndex === index}
                    isModalOpen={isAnyModalOpen}
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
                    onSelectAll={handleSelectAllBlocks}
                    darkMode={darkMode}
                    isModalOpen={isAnyModalOpen}
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

                {/* 5. DRAWING BLOCK - Clean Sketch Container with Edit Sketch Support */}
                {block.type === 'drawing' && (
                  <div
                    onClick={() => {
                      setEditingDrawingIndex(index);
                      setShowDrawingCanvas(true);
                    }}
                    className="relative group my-3 flex flex-col items-center bg-white dark:bg-neutral-900 border border-stone-200/80 dark:border-neutral-800 rounded-3xl p-3 shadow-xs cursor-pointer hover:border-red-500/50 transition-all"
                    title="Tap to continue editing sketch"
                  >
                    <img
                      src={block.dataUrl}
                      alt="Prayer Sketch"
                      className="max-h-80 w-full object-contain rounded-2xl"
                    />

                    {/* Top-Left: Edit Sketch Action Button (Pencil Icon) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDrawingIndex(index);
                        setShowDrawingCanvas(true);
                      }}
                      className="absolute top-4 left-4 p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md transition-all active:scale-90 border border-red-500 z-10"
                      title="Continue Editing Sketch"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Top-Right: Delete Sketch Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(index);
                      }}
                      className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/70 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md active:scale-90 z-10"
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
        className={`fixed bottom-0 left-0 right-0 z-30 px-2 py-2 sm:p-3 border-t flex flex-col gap-2 ${bottomBarClass} backdrop-blur-md shadow-lg max-w-2xl mx-auto rounded-t-3xl`}
      >
        {/* Rich Text Formatting Sub-Toolbar Drawer attached directly under/above the Text button */}
        {showFormatToolbar && (
          <div className={`flex items-center justify-between gap-1 p-2 rounded-2xl border backdrop-blur-md overflow-x-auto shadow-sm animate-in fade-in duration-150 ${formatToolbarClass}`}>
            {/* Style Group: Bold, Italic, Underline */}
            <div className={`flex items-center gap-1 border-r pr-2 shrink-0 ${dividerClass}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('bold');
                }}
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.bold
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-800 dark:text-neutral-100 font-bold'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-800 dark:text-neutral-100 italic'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-800 dark:text-neutral-100 underline'
                }`}
                title="Underline"
              >
                <Underline className={`w-4 h-4 ${activeFormats.underline ? 'stroke-[3]' : ''}`} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('insertUnorderedList');
                }}
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.bullet
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-500'
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-800 dark:text-neutral-100'
                }`}
                title="Bullet List"
              >
                <List className={`w-4 h-4 ${activeFormats.bullet ? 'stroke-[2.5]' : ''}`} />
              </button>
            </div>

            {/* Font Size Group */}
            <div className={`flex items-center gap-1 border-r pr-2 shrink-0 ${dividerClass}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('fontSize', '2');
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold active:scale-95 transition-all ${
                  activeFormats.fontSize === '2'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-700 dark:text-neutral-300'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-700 dark:text-neutral-300'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-800 dark:text-neutral-100'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700 text-stone-900 dark:text-white'
                }`}
                title="Extra Large font size"
              >
                XL
              </button>
            </div>

            {/* Alignment Group */}
            <div className={`flex items-center gap-1 border-r pr-2 shrink-0 ${dividerClass}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeFormat('justifyLeft');
                }}
                className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                  activeFormats.align === 'left'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700'
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
                    : 'hover:bg-stone-200 dark:hover:bg-neutral-700'
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
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-neutral-200 hover:bg-stone-200 dark:hover:bg-neutral-700"
                title="Remove Highlight / Clear Format"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Select All in Format Options */}
            <div className={`flex items-center pl-1 border-l shrink-0 ${dividerClass}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectAllBlocks();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold text-stone-700 dark:text-neutral-200 hover:bg-stone-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                title="Select All Note Content (Ctrl+A)"
              >
                <TextSelect className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="hidden sm:inline">Select All</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-1 sm:gap-2 pt-0.5">
          {/* Add Text Block / Toggle Format Options - Unaffected */}
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
            className={`py-2 px-2.5 sm:px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-all active:scale-95 shrink-0 ${
              showFormatToolbar || activeFormats.bold || activeFormats.italic || activeFormats.underline
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : toolbarBtnClass
            }`}
            title="Toggle Rich Text formatting options (Bold, Italic, Underline, Size, Highlight)"
          >
            <Type className={`w-4 h-4 ${showFormatToolbar || activeFormats.bold || activeFormats.italic || activeFormats.underline ? 'text-white' : 'text-blue-500'}`} />
            <span>Text</span>
          </button>

          {/* Add Image/Photo Button - Compact icon with responsive/shortened text */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`py-2 px-2 sm:px-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-transform active:scale-95 shrink-0 ${toolbarBtnClass}`}
            title="Add photo or image from gallery"
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span className="hidden min-[380px]:inline">Photo</span>
          </button>

          {/* Add Voice Note Button - Compact icon with responsive/shortened text */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowVoiceRecorder(true)}
            className={`py-2 px-2 sm:px-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-transform active:scale-95 shrink-0 ${toolbarBtnClass}`}
            title="Record audio voice note"
          >
            <Mic className="w-4 h-4 text-rose-500" />
            <span className="hidden min-[380px]:inline">Voice</span>
          </button>

          {/* Add Sketch Button - Compact icon with responsive/shortened text */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowDrawingCanvas(true)}
            className={`py-2 px-2 sm:px-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 border transition-transform active:scale-95 shrink-0 ${toolbarBtnClass}`}
            title="Draw prayer sketch"
          >
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span className="hidden min-[380px]:inline">Sketch</span>
          </button>

          {/* + Reference Button - Restored full form with prominent prominence */}
          <button
            type="button"
            onPointerDown={() => {
              saveSelection();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onTouchStart={() => {
              saveSelection();
            }}
            onClick={handleOpenReferenceModal}
            className="flex-1 min-w-0 py-2 px-2.5 sm:px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
            title="Add Bible verse reference or Strong's concordance"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate whitespace-nowrap">+ Reference</span>
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

      {/* Quick Scripture Reader & Full Chapter Modal */}
      {showQuickBibleReader && (
        <QuickBibleReaderModal
          key={`${readerInitialParams.book || 'default'}-${readerInitialParams.chapter || 1}-${readerInitialParams.verse || 0}-${readerInitialParams.translation || 'default'}-${readerInitialParams.initialStrongsSearch?.id || 'none'}`}
          onClose={() => {
            setShowQuickBibleReader(false);
            setReaderInitialParams({});
          }}
          onInsertChip={handleInsertReferenceText}
          initialBook={readerInitialParams.book}
          initialChapter={readerInitialParams.chapter}
          initialVerse={readerInitialParams.verse}
          initialSelectedVerses={readerInitialParams.selectedVerses}
          initialTranslation={readerInitialParams.translation}
          initialSearchQuery={readerInitialParams.initialSearchQuery}
          initialStrongsSearch={readerInitialParams.initialStrongsSearch}
          darkMode={darkMode}
        />
      )}

      {/* Verse Reader Modal */}
      {activePopupMatch && (
        <BibleVersePopup
          match={activePopupMatch}
          onClose={() => setActivePopupMatch(null)}
          onInsertIntoNote={handleInsertReferenceText}
          onOpenInBible={(book, chapter, verse, translation, strongsTarget, selectedVerses) => {
            dismissKeyboard();
            setReaderInitialParams({
              book,
              chapter,
              verse,
              selectedVerses,
              translation: strongsTarget ? 'KJV_STRONGS' : translation,
              initialStrongsSearch: strongsTarget,
            });
            setShowQuickBibleReader(true);
          }}
        />
      )}

      {/* Strong's Concordance Modal */}
      {activeStrongsId && (
        <StrongsConcordancePopup
          strongsId={activeStrongsId}
          onClose={() => setActiveStrongsId(null)}
          onInsertIntoNote={handleInsertReferenceText}
          onViewUsage={(sId, lemma) => {
            dismissKeyboard();
            setActiveStrongsId(null);
            const isGreek = sId.toUpperCase().startsWith('G');
            setReaderInitialParams({
              book: isGreek ? 'Matthew' : 'Genesis',
              chapter: 1,
              verse: 1,
              translation: 'KJV_STRONGS',
              initialStrongsSearch: { id: sId, lemma },
            });
            setShowQuickBibleReader(true);
          }}
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
          initialDataUrl={
            editingDrawingIndex !== null && blocks[editingDrawingIndex]?.type === 'drawing'
              ? (blocks[editingDrawingIndex] as DrawingBlock).dataUrl
              : undefined
          }
          onClose={() => {
            setShowDrawingCanvas(false);
            setEditingDrawingIndex(null);
          }}
          onSaveDrawing={handleAddDrawing}
        />
      )}

      {/* In-App Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-sm p-5 sm:p-6 rounded-3xl border shadow-2xl ${modalClass}`}
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
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${cancelBtnClass}`}
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

      {/* Floating Action Bar when All Blocks are Selected */}
      {isAllBlocksSelected && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-stone-900/95 dark:bg-neutral-850/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 animate-fadeIn">
          <div className="flex items-center gap-1.5 pr-2 border-r border-white/20 text-xs font-bold text-blue-400">
            <TextSelect className="w-4 h-4" />
            <span className="select-none">All Selected</span>
          </div>
          <button
            type="button"
            onClick={handleCopySelectedBlocks}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold active:scale-95 transition-all"
            title="Copy All (Ctrl+C)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={handleCutSelectedBlocks}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold active:scale-95 transition-all"
            title="Cut All (Ctrl+X)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Cut</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSelectedBlocks}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-red-300 text-xs font-bold active:scale-95 transition-all"
            title="Delete All (Backspace / Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="p-1 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Deselect (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Copy Toast Notification */}
      {copyToastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-stone-900/90 dark:bg-neutral-800/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-white/10 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copyToastMessage}</span>
        </div>
      )}

      {/* Custom App-Styled Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePickerModal}
        initialDateString={dateString}
        onSelectDate={(newDate) => {
          setDateString(newDate);
        }}
        onClose={() => setShowDatePickerModal(false)}
        darkMode={darkMode}
        currentTheme={currentTheme}
      />
    </div>
  );
};

