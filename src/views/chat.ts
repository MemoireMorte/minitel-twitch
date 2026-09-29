import type { ChatMessage } from '../types.js';
import { encodeText, VT, COLS } from '../minitel.js';

// INVERT_ON and INVERT_OFF are invisible attribute switches — they take no screen cells.
// Visual layout: [INV_ON]username[INV_OFF]: message
const SEPARATOR = ': ';

function prefixVisualWidth(username: string): number {
  return username.length + SEPARATOR.length;
}

function wordWrap(text: string, firstWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let current = '';
  let width = firstWidth;

  for (const word of words) {
    const chunk = current ? ` ${word}` : word;
    if (current.length + chunk.length <= width) {
      current += chunk;
    } else {
      if (!current) {
        lines.push(word.slice(0, width));
        current = word.slice(width);
      } else {
        lines.push(current);
        current = word.slice(0, COLS);
      }
      width = COLS; // continuation lines use full width
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function formatChatLine(msg: ChatMessage): Buffer {
  const username = msg.username.slice(0, 15);
  const prefixWidth = prefixVisualWidth(username);
  const firstWidth = COLS - prefixWidth;

  const lines = wordWrap(msg.message, firstWidth);
  const chunks: Buffer[] = [];

  lines.forEach((line, i) => {
    const visualWidth = (i === 0 ? prefixWidth : 0) + line.length;
    const crlf = visualWidth < COLS ? [VT.CRLF] : [];
    if (i === 0) {
      chunks.push(VT.INVERT_ON, encodeText(username), VT.INVERT_OFF, encodeText(SEPARATOR + line), ...crlf);
    } else {
      chunks.push(encodeText(line), ...crlf);
    }
  });

  chunks.push(VT.CRLF);
  return Buffer.concat(chunks);
}
