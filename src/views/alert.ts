import type { SubEvent } from '../types.js';
import { encodeText, VT, COLS, ROWS, center } from '../minitel.js';

// INVERT_ON is an invisible attribute switch — takes no screen cell
const CONTENT_WIDTH = COLS;
const SEPARATOR = '='.repeat(CONTENT_WIDTH);
const BLANK = ' '.repeat(CONTENT_WIDTH);

// A fully white line: INVERT_ON + 40 inverted cells.
// No explicit CRLF — in scroll mode, filling all 40 columns auto-advances to the next line.
function invertedLine(text: string): Buffer {
  return Buffer.concat([VT.INVERT_ON, encodeText(center(text, CONTENT_WIDTH))]);
}

function labelFor(event: SubEvent): string {
  switch (event.type) {
    case 'sub':            return '*** NOUVEAU SUB ! ***';
    case 'resub':          return `*** RESUB ${event.months ?? ''} MOIS ! ***`;
    case 'subgift':        return '*** SUB OFFERT ! ***';
    case 'anonsubgift':    return '*** SUB ANONYME ! ***';
    case 'submysterygift': return '*** MULTI-SUB ! ***';
  }
}

export function buildSubAlert(event: SubEvent): Buffer {
  const startRow = Math.floor(ROWS / 2) - 3;
  const label = labelFor(event);
  const name = event.username.toUpperCase().slice(0, CONTENT_WIDTH);

  return Buffer.concat([
    VT.CLEAR,
    VT.CURSOR_OFF,
    VT.moveTo(startRow, 1),
    invertedLine(SEPARATOR),
    invertedLine(BLANK),
    invertedLine(label),
    invertedLine(name),
    invertedLine(BLANK),
    invertedLine(SEPARATOR),
  ]);
}
