/**
 * Core pure logic helpers for ClipForge AI Video Clipper
 * Decoupled from React UI for deterministic testing and client runtime.
 */

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

export function mmSsToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) throw new Error(`Invalid timestamp: ${timeStr}`);
    return mins * 60 + secs;
  }
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const secs = parseFloat(parts[2]);
    if (isNaN(hours) || isNaN(mins) || isNaN(secs)) throw new Error(`Invalid timestamp: ${timeStr}`);
    return hours * 3600 + mins * 60 + secs;
  }
  throw new Error(`Invalid timestamp format: ${timeStr}`);
}

export function secondsToMmSs(totalSeconds: number): string {
  const safeSec = Math.max(0, totalSeconds);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const TIMESTAMP_REGEX = /\[\s*START:\s*(\d{1,2}:\d{2})\s*,\s*END:\s*(\d{1,2}:\d{2})\s*\]/i;
export const BACKUP_REGEX = /(?:start|from)?\s*[:=\-]?\s*(\d{1,2}:\d{2})\s*(?:to|and|-|,|\s)+\s*(?:end|until)?\s*[:=\-]?\s*(\d{1,2}:\d{2})/i;

export function extractTimestampsFromLlm(responseText: string): {
  startStr: string;
  endStr: string;
  startSec: number;
  endSec: number;
  duration: number;
} | null {
  const match = TIMESTAMP_REGEX.exec(responseText) || BACKUP_REGEX.exec(responseText);
  if (!match) return null;

  try {
    const startStr = match[1];
    const endStr = match[2];
    const startSec = mmSsToSeconds(startStr);
    const endSec = mmSsToSeconds(endStr);
    const duration = Math.max(0, endSec - startSec);
    return { startStr, endStr, startSec, endSec, duration: Math.round(duration * 100) / 100 };
  } catch {
    return null;
  }
}

export function formatTimestampSrt(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.floor(Math.round((safeSec - Math.floor(safeSec)) * 1000));
  const finalMillis = millis >= 1000 ? 999 : millis;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${finalMillis.toString().padStart(3, '0')}`;
}

export function calculate9x16Crop(sourceWidth: number, sourceHeight: number): {
  cropWidth: number;
  cropHeight: number;
  offsetX: number;
  offsetY: number;
  filterString: string;
} {
  // In FFmpeg: crop=ih*9/16:ih
  const cropHeight = sourceHeight;
  const cropWidth = Math.floor(sourceHeight * (9 / 16));
  const offsetX = Math.floor((sourceWidth - cropWidth) / 2);
  const offsetY = 0;
  return {
    cropWidth,
    cropHeight,
    offsetX,
    offsetY,
    filterString: `crop=ih*9/16:ih`,
  };
}

export function buildSrtFromWords(
  words: WordTimestamp[],
  clipStartSec: number,
  clipEndSec: number,
  wordsPerBlock: number = 4
): string {
  const wordsInClip = words.filter(
    (w) => w.end >= clipStartSec && w.start <= clipEndSec
  );

  if (wordsInClip.length === 0) {
    const relEnd = Math.max(1, clipEndSec - clipStartSec);
    return `1\n00:00:00,000 --> ${formatTimestampSrt(relEnd)}\nKey Highlight Moment\n\n`;
  }

  const blocks: string[] = [];
  let blockIndex = 1;

  for (let i = 0; i < wordsInClip.length; i += wordsPerBlock) {
    const chunk = wordsInClip.slice(i, i + wordsPerBlock);
    const rawStart = chunk[0].start;
    const rawEnd = chunk[chunk.length - 1].end;

    const relStart = Math.max(0, rawStart - clipStartSec);
    const relEnd = Math.max(relStart + 0.3, rawEnd - clipStartSec);
    const text = chunk.map((w) => w.word.trim()).join(' ');

    blocks.push(`${blockIndex}\n${formatTimestampSrt(relStart)} --> ${formatTimestampSrt(relEnd)}\n${text}\n`);
    blockIndex++;
  }

  return blocks.join('\n');
}
