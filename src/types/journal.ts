export type BlockType = 'text' | 'voice' | 'drawing' | 'verse' | 'image';

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

export interface VoiceBlock {
  id: string;
  type: 'voice';
  audioUrl: string; // Base64 data URL or Blob URL
  durationSeconds: number;
  title?: string;
  createdAt: string;
}

export interface DrawingBlock {
  id: string;
  type: 'drawing';
  dataUrl: string; // Image PNG base64
  width: number;
  height: number;
  createdAt: string;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  imageUrl: string; // Data URL or Object URL
  caption?: string;
  createdAt: string;
}

export interface VerseBlock {
  id: string;
  type: 'verse';
  reference: string;
  text: string;
  translation: string;
}

export type JournalBlock = TextBlock | VoiceBlock | DrawingBlock | VerseBlock | ImageBlock;

export interface JournalEntry {
  id: string;
  title: string;
  createdAt: string; // ISO string or timestamp
  updatedAt: string;
  dateString: string; // YYYY-MM-DD format for calendar mapping
  blocks: JournalBlock[];
  pinned?: boolean;
  colorTag?: string; // Redmi note color accent if any
}

export interface BibleBook {
  id: string;
  name: string;
  abbreviations: string[];
  testament: 'OT' | 'NT';
  chaptersCount: number;
}

export interface BibleReferenceMatch {
  fullMatch: string;
  bookName: string;
  bookId: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  startIndex: number;
  endIndex: number;
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

export interface DeletedJournalEntry {
  entry: JournalEntry;
  deletedAt: string; // ISO string timestamp
}

export interface BackupData {
  version: string;
  exportedAt: string;
  app: string;
  entries: JournalEntry[];
  recentlyDeleted?: DeletedJournalEntry[];
  preferences?: {
    theme?: string;
    appFont?: string;
    refFormat?: string;
    translation?: string;
    enabledVersions?: string[];
  };
  metadata?: {
    totalNotes: number;
    totalVoiceNotes: number;
    totalDrawings: number;
    totalImages?: number;
  };
}

export type AppFont = 'system' | 'literata' | 'crimson' | 'nunito' | 'slab' | 'caveat';
