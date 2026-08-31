import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BackupData, JournalEntry, JournalBlock, VoiceBlock, DrawingBlock, ImageBlock } from '../types/journal';
import { BackupValidationResult, validateBackupJson } from './storage';

// Extension to MIME mapping
const MIME_BY_EXT: Record<string, string> = {
  aac: 'audio/aac',
  webm: 'audio/webm',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
};

// MIME to Extension mapping
const EXT_BY_MIME: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
};

export function getMimeFromExtension(ext: string): string {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  return MIME_BY_EXT[cleanExt] || 'application/octet-stream';
}

export function getExtensionFromMime(mime: string, defaultExt = 'bin'): string {
  const cleanMime = mime.toLowerCase().split(';')[0].trim();
  return EXT_BY_MIME[cleanMime] || defaultExt;
}

/**
 * Converts a data URL (base64 or text) to a binary Uint8Array and extracted MIME type.
 */
export function parseDataUrl(dataUrl: string): { data: Uint8Array; mimeType: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;

    const metaPart = dataUrl.substring(5, commaIdx);
    const dataPart = dataUrl.substring(commaIdx + 1);

    const isBase64 = metaPart.includes(';base64');
    const mimeType = (metaPart.split(';')[0] || 'application/octet-stream').trim();

    if (isBase64) {
      const binaryString = atob(dataPart);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { data: bytes, mimeType };
    } else {
      // URL-encoded or raw string
      const decoded = decodeURIComponent(dataPart);
      const encoder = new TextEncoder();
      return { data: encoder.encode(decoded), mimeType };
    }
  } catch (err) {
    console.warn('Failed to parse data URL:', err);
    return null;
  }
}

/**
 * Reads binary media from a data URL, blob URL, or remote URL into a Uint8Array.
 */
export async function fetchMediaBytes(
  url: string,
  fallbackMime = 'application/octet-stream'
): Promise<{ data: Uint8Array; mimeType: string } | null> {
  if (!url) return null;

  // 1. If it's a data URL, parse directly
  if (url.startsWith('data:')) {
    return parseDataUrl(url);
  }

  // 2. If it's a blob: or http(s): URL, fetch it
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const mimeType = blob.type || fallbackMime;
    return { data: new Uint8Array(arrayBuffer), mimeType };
  } catch (err) {
    console.warn('Failed to fetch media bytes from URL:', url, err);
    return null;
  }
}

export interface ZipExportOutput {
  zipBlob: Blob;
  zipBase64: string;
  filename: string;
  stats: {
    notesCount: number;
    voiceCount: number;
    drawingCount: number;
    imageCount: number;
  };
}

/**
 * Creates a complete, self-contained ZIP archive containing:
 *  - journal.json (with metadata and relative media paths)
 *  - media/ (containing actual binary audio, drawing, and image files)
 */
export async function createZipBackup(backup: BackupData): Promise<ZipExportOutput> {
  const zip = new JSZip();
  const mediaFolder = zip.folder('media');

  let voiceCount = 0;
  let drawingCount = 0;
  let imageCount = 0;

  // Clone entries so we can update media references to relative paths for the ZIP journal.json
  const portableEntries: JournalEntry[] = [];

  for (const entry of backup.entries) {
    const portableBlocks: JournalBlock[] = [];

    for (const block of entry.blocks) {
      if (block.type === 'voice') {
        const voiceBlock = block as VoiceBlock;
        if (voiceBlock.audioUrl) {
          const media = await fetchMediaBytes(voiceBlock.audioUrl, 'audio/aac');
          if (media && media.data.length > 0) {
            const ext = getExtensionFromMime(media.mimeType, 'aac');
            const fileName = `voice_${entry.id}_${voiceBlock.id}.${ext}`;
            const relativePath = `media/${fileName}`;

            mediaFolder?.file(fileName, media.data);
            voiceCount++;

            portableBlocks.push({
              ...voiceBlock,
              audioUrl: relativePath,
            });
            continue;
          }
        }
        portableBlocks.push(voiceBlock);
      } else if (block.type === 'drawing') {
        const drawingBlock = block as DrawingBlock;
        if (drawingBlock.dataUrl) {
          const media = await fetchMediaBytes(drawingBlock.dataUrl, 'image/png');
          if (media && media.data.length > 0) {
            const ext = getExtensionFromMime(media.mimeType, 'png');
            const fileName = `drawing_${entry.id}_${drawingBlock.id}.${ext}`;
            const relativePath = `media/${fileName}`;

            mediaFolder?.file(fileName, media.data);
            drawingCount++;

            portableBlocks.push({
              ...drawingBlock,
              dataUrl: relativePath,
            });
            continue;
          }
        }
        portableBlocks.push(drawingBlock);
      } else if (block.type === 'image') {
        const imageBlock = block as ImageBlock;
        if (imageBlock.imageUrl) {
          const media = await fetchMediaBytes(imageBlock.imageUrl, 'image/png');
          if (media && media.data.length > 0) {
            const ext = getExtensionFromMime(media.mimeType, 'png');
            const fileName = `image_${entry.id}_${imageBlock.id}.${ext}`;
            const relativePath = `media/${fileName}`;

            mediaFolder?.file(fileName, media.data);
            imageCount++;

            portableBlocks.push({
              ...imageBlock,
              imageUrl: relativePath,
            });
            continue;
          }
        }
        portableBlocks.push(imageBlock);
      } else {
        // Text, verse, etc.
        portableBlocks.push(block);
      }
    }

    portableEntries.push({
      ...entry,
      blocks: portableBlocks,
    });
  }

  // Also process recently deleted entries if present
  let portableDeleted: typeof backup.recentlyDeleted = undefined;
  if (backup.recentlyDeleted && Array.isArray(backup.recentlyDeleted)) {
    portableDeleted = [];
    for (const delItem of backup.recentlyDeleted) {
      const entry = delItem.entry;
      const portableBlocks: JournalBlock[] = [];

      for (const block of entry.blocks) {
        if (block.type === 'voice') {
          const voiceBlock = block as VoiceBlock;
          if (voiceBlock.audioUrl) {
            const media = await fetchMediaBytes(voiceBlock.audioUrl, 'audio/aac');
            if (media && media.data.length > 0) {
              const ext = getExtensionFromMime(media.mimeType, 'aac');
              const fileName = `voice_del_${entry.id}_${voiceBlock.id}.${ext}`;
              const relativePath = `media/${fileName}`;

              mediaFolder?.file(fileName, media.data);
              portableBlocks.push({ ...voiceBlock, audioUrl: relativePath });
              continue;
            }
          }
          portableBlocks.push(voiceBlock);
        } else if (block.type === 'drawing') {
          const drawingBlock = block as DrawingBlock;
          if (drawingBlock.dataUrl) {
            const media = await fetchMediaBytes(drawingBlock.dataUrl, 'image/png');
            if (media && media.data.length > 0) {
              const ext = getExtensionFromMime(media.mimeType, 'png');
              const fileName = `drawing_del_${entry.id}_${drawingBlock.id}.${ext}`;
              const relativePath = `media/${fileName}`;

              mediaFolder?.file(fileName, media.data);
              portableBlocks.push({ ...drawingBlock, dataUrl: relativePath });
              continue;
            }
          }
          portableBlocks.push(drawingBlock);
        } else if (block.type === 'image') {
          const imageBlock = block as ImageBlock;
          if (imageBlock.imageUrl) {
            const media = await fetchMediaBytes(imageBlock.imageUrl, 'image/png');
            if (media && media.data.length > 0) {
              const ext = getExtensionFromMime(media.mimeType, 'png');
              const fileName = `image_del_${entry.id}_${imageBlock.id}.${ext}`;
              const relativePath = `media/${fileName}`;

              mediaFolder?.file(fileName, media.data);
              portableBlocks.push({ ...imageBlock, imageUrl: relativePath });
              continue;
            }
          }
          portableBlocks.push(imageBlock);
        } else {
          portableBlocks.push(block);
        }
      }

      portableDeleted.push({
        ...delItem,
        entry: { ...entry, blocks: portableBlocks },
      });
    }
  }

  const portableBackup: BackupData = {
    ...backup,
    version: '2.0-portable',
    exportedAt: new Date().toISOString(),
    entries: portableEntries,
    recentlyDeleted: portableDeleted,
    metadata: {
      totalNotes: portableEntries.length,
      totalVoiceNotes: voiceCount,
      totalDrawings: drawingCount,
    },
  };

  // Add journal.json to root of ZIP
  zip.file('journal.json', JSON.stringify(portableBackup, null, 2));

  // Generate both Blob and Base64 outputs
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `asor_notes_backup_${dateStr}.zip`;

  return {
    zipBlob,
    zipBase64,
    filename,
    stats: {
      notesCount: portableEntries.length,
      voiceCount,
      drawingCount,
      imageCount,
    },
  };
}

/**
 * Downloads the ZIP file on the web or saves it to device storage on Android via Capacitor.
 */
export async function saveOrDownloadZipFile(
  zipBlob: Blob,
  zipBase64: string,
  filename: string
): Promise<{ success: boolean; filename: string; method: 'web_download' | 'android_saved'; path?: string }> {
  // 1. Android Capacitor Native Platform
  if (Capacitor.isNativePlatform()) {
    try {
      // Save to Cache directory first for immediate access
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: zipBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      // Also attempt to copy or save to Documents if available
      try {
        await Filesystem.writeFile({
          path: filename,
          data: zipBase64,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (_) {}

      return {
        success: true,
        filename,
        method: 'android_saved',
        path: writeResult.uri,
      };
    } catch (err) {
      console.warn('Capacitor Filesystem.writeFile failed, falling back to web download:', err);
    }
  }

  // 2. Web Browser Fallback (Standard Blob Download)
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return {
    success: true,
    filename,
    method: 'web_download',
  };
}

/**
 * Shares the actual ZIP file via the native Android share sheet or Web Share API.
 */
export async function shareZipBackupFile(
  zipBlob: Blob,
  zipBase64: string,
  filename: string,
  notesCount: number
): Promise<{ success: boolean; shared: boolean; message: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const shareTitle = 'Asor Notes Backup';
  const shareText = `Complete backup of ${notesCount} Asor Notes entries including audio, drawings, and images (${dateStr}).`;

  // 1. Capacitor Native Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // Ensure file exists in Cache directory
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: zipBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const fileUri = writeResult.uri;

      // Check if sharing is supported
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: fileUri,
          dialogTitle: 'Share / Export Asor Notes Backup',
        });
        return { success: true, shared: true, message: 'Share sheet opened' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('canceled')) {
        return { success: true, shared: false, message: 'Share cancelled' };
      }
      console.warn('Capacitor native share failed, falling back to web share:', err);
    }
  }

  // 2. Standard Web Share API with actual File
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([zipBlob], filename, { type: 'application/zip' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        return { success: true, shared: true, message: 'Backup file shared successfully' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, shared: false, message: 'Share cancelled' };
      }
    }
  }

  // 3. Fallback: Trigger download if sharing is unavailable
  await saveOrDownloadZipFile(zipBlob, zipBase64, filename);
  return {
    success: true,
    shared: false,
    message: `Share not available in this environment. Downloaded "${filename}" instead.`,
  };
}

/**
 * Extracts a ZIP backup archive, restores all binary audio/drawings/images to persistent Base64 Data URLs,
 * and validates the resulting BackupData.
 */
export async function extractAndRestoreZipBackup(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<BackupValidationResult> {
  try {
    const zip = await JSZip.loadAsync(fileOrBuffer);

    // 1. Locate journal.json (or backup.json)
    let journalJsonFile = zip.file('journal.json') || zip.file('backup.json');

    if (!journalJsonFile) {
      // Look for any .json file at the root or within
      const jsonFileKey = Object.keys(zip.files).find((k) => k.endsWith('.json') && !k.startsWith('__MACOSX'));
      if (jsonFileKey) {
        journalJsonFile = zip.file(jsonFileKey);
      }
    }

    if (!journalJsonFile) {
      return {
        valid: false,
        error: 'No journal.json found inside the ZIP archive. Please select a valid Asor Notes backup ZIP.',
      };
    }

    const journalJsonText = await journalJsonFile.async('string');
    const baseValidation = validateBackupJson(journalJsonText);

    if (!baseValidation.valid || !baseValidation.backup) {
      return baseValidation;
    }

    const backup = baseValidation.backup;
    const restoredEntries: JournalEntry[] = [];

    let restoredVoiceCount = 0;
    let restoredDrawingCount = 0;
    let restoredImageCount = 0;

    // Helper to resolve media file from ZIP into a base64 data URL
    const resolveMediaToDataUrl = async (mediaPath: string, defaultMime: string): Promise<string | null> => {
      if (!mediaPath) return null;

      // If it's already a full data URL, keep it
      if (mediaPath.startsWith('data:')) {
        return mediaPath;
      }

      // Clean path
      const cleanPath = mediaPath.replace(/^\.\//, '').replace(/^\//, '');
      const zipMedia = zip.file(cleanPath) || zip.file(`media/${cleanPath}`) || zip.file(cleanPath.replace(/^media\//, ''));

      if (!zipMedia) {
        console.warn('Media file not found in ZIP:', mediaPath);
        return null;
      }

      const ext = cleanPath.split('.').pop() || '';
      const mime = getMimeFromExtension(ext) || defaultMime;
      const base64Data = await zipMedia.async('base64');
      return `data:${mime};base64,${base64Data}`;
    };

    // Process all entries and restore media files
    for (const entry of backup.entries) {
      const restoredBlocks: JournalBlock[] = [];

      for (const block of entry.blocks) {
        if (block.type === 'voice') {
          const voiceBlock = block as VoiceBlock;
          const restoredAudioUrl = await resolveMediaToDataUrl(voiceBlock.audioUrl, 'audio/aac');
          if (restoredAudioUrl) {
            restoredVoiceCount++;
            restoredBlocks.push({
              ...voiceBlock,
              audioUrl: restoredAudioUrl,
            });
          } else {
            // Keep block as is
            restoredBlocks.push(voiceBlock);
          }
        } else if (block.type === 'drawing') {
          const drawingBlock = block as DrawingBlock;
          const restoredDataUrl = await resolveMediaToDataUrl(drawingBlock.dataUrl, 'image/png');
          if (restoredDataUrl) {
            restoredDrawingCount++;
            restoredBlocks.push({
              ...drawingBlock,
              dataUrl: restoredDataUrl,
            });
          } else {
            restoredBlocks.push(drawingBlock);
          }
        } else if (block.type === 'image') {
          const imageBlock = block as ImageBlock;
          const restoredImageUrl = await resolveMediaToDataUrl(imageBlock.imageUrl, 'image/png');
          if (restoredImageUrl) {
            restoredImageCount++;
            restoredBlocks.push({
              ...imageBlock,
              imageUrl: restoredImageUrl,
            });
          } else {
            restoredBlocks.push(imageBlock);
          }
        } else {
          restoredBlocks.push(block);
        }
      }

      restoredEntries.push({
        ...entry,
        blocks: restoredBlocks,
      });
    }

    // Process recently deleted entries if present
    let restoredDeleted: typeof backup.recentlyDeleted = undefined;
    if (backup.recentlyDeleted && Array.isArray(backup.recentlyDeleted)) {
      restoredDeleted = [];
      for (const delItem of backup.recentlyDeleted) {
        const entry = delItem.entry;
        const restoredBlocks: JournalBlock[] = [];

        for (const block of entry.blocks) {
          if (block.type === 'voice') {
            const voiceBlock = block as VoiceBlock;
            const restoredAudioUrl = await resolveMediaToDataUrl(voiceBlock.audioUrl, 'audio/aac');
            restoredBlocks.push(restoredAudioUrl ? { ...voiceBlock, audioUrl: restoredAudioUrl } : voiceBlock);
          } else if (block.type === 'drawing') {
            const drawingBlock = block as DrawingBlock;
            const restoredDataUrl = await resolveMediaToDataUrl(drawingBlock.dataUrl, 'image/png');
            restoredBlocks.push(restoredDataUrl ? { ...drawingBlock, dataUrl: restoredDataUrl } : drawingBlock);
          } else if (block.type === 'image') {
            const imageBlock = block as ImageBlock;
            const restoredImageUrl = await resolveMediaToDataUrl(imageBlock.imageUrl, 'image/png');
            restoredBlocks.push(restoredImageUrl ? { ...imageBlock, imageUrl: restoredImageUrl } : imageBlock);
          } else {
            restoredBlocks.push(block);
          }
        }

        restoredDeleted.push({
          ...delItem,
          entry: { ...entry, blocks: restoredBlocks },
        });
      }
    }

    const fullyRestoredBackup: BackupData = {
      ...backup,
      entries: restoredEntries,
      recentlyDeleted: restoredDeleted,
      metadata: {
        totalNotes: restoredEntries.length,
        totalVoiceNotes: restoredVoiceCount,
        totalDrawings: restoredDrawingCount,
      },
    };

    return {
      valid: true,
      backup: fullyRestoredBackup,
      stats: {
        notesCount: restoredEntries.length,
        voiceCount: restoredVoiceCount,
        drawingCount: restoredDrawingCount,
        deletedCount: restoredDeleted?.length || 0,
        date: backup.exportedAt || new Date().toISOString(),
        version: backup.version || '2.0',
      },
    };
  } catch (err: any) {
    console.error('Failed to extract ZIP backup:', err);
    return {
      valid: false,
      error: `Could not read ZIP archive: ${err?.message || 'Invalid or corrupted ZIP file.'}`,
    };
  }
}
