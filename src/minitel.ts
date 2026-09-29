// Videotex byte sequences for Minitel 1B
// Reference: iodeo/Minitel-ESP32 uPyMinitel constantes.py + Minitel.py
// Cursor position: 0x1F + (0x40 + row) + (0x40 + col), 1-based, row first

export const COLS = 40;
export const ROWS = 24; // reserve row 25 for status

export const VT = {
  CLEAR:       Buffer.from([0x0C]),        // FF  — clear screen + cursor home
  HOME:        Buffer.from([0x1E]),        // RS  — cursor home (no clear)
  CURSOR_OFF:  Buffer.from([0x14]),        // COF
  CURSOR_ON:   Buffer.from([0x11]),        // CON
  CRLF:        Buffer.from([0x0D, 0x0A]), // CR + LF
  // Each attribute byte occupies one cell position in Videotex mode (renders as a space)
  INVERT_ON:   Buffer.from([0x1B, 0x5D]), // debut inversion video
  INVERT_OFF:  Buffer.from([0x1B, 0x5C]), // fond normal (end inversion)
  // PRO2 + START + ROULEAU: switch to scroll mode (default is page mode)
  SCROLL_ON:   Buffer.from([0x1B, 0x3A, 0x69, 0x43]),
  moveTo: (row: number, col: number): Buffer =>
    Buffer.from([0x1F, 0x40 + row, 0x40 + col]),
};

const SS2 = 0x19;
// Videotex accent sequences: SS2 + accent_code + base_letter (3 bytes, 1 cell)
// accent codes: grave=0x41, acute=0x42, circumflex=0x43, diaeresis=0x48, cedilla=0x4B
const ACCENT_MAP: Record<string, [number, number]> = {
  'é': [0x42, 0x65], 'É': [0x42, 0x45], // e acute
  'è': [0x41, 0x65], 'È': [0x41, 0x45], // e grave
  'ê': [0x43, 0x65], 'Ê': [0x43, 0x45], // e circumflex
  'ë': [0x48, 0x65], 'Ë': [0x48, 0x45], // e diaeresis
  'à': [0x41, 0x61], 'À': [0x41, 0x41], // a grave
  'â': [0x43, 0x61], 'Â': [0x43, 0x41], // a circumflex
  'ù': [0x41, 0x75], 'Ù': [0x41, 0x55], // u grave
  'û': [0x43, 0x75], 'Û': [0x43, 0x55], // u circumflex
  'ü': [0x48, 0x75], 'Ü': [0x48, 0x55], // u diaeresis
  'î': [0x43, 0x69], 'Î': [0x43, 0x49], // i circumflex
  'ï': [0x48, 0x69], 'Ï': [0x48, 0x49], // i diaeresis
  'ô': [0x43, 0x6F], 'Ô': [0x43, 0x4F], // o circumflex
  'ö': [0x48, 0x6F], 'Ö': [0x48, 0x4F], // o diaeresis
  'ç': [0x4B, 0x63], 'Ç': [0x4B, 0x43], // c cedilla
};

export function encodeText(str: string): Buffer {
  // Normalize common Unicode punctuation to ASCII equivalents
  const s = str
    .replace(/[‘’‚‛′]/g, "'") // curly/prime apostrophes
    .replace(/[“”„‟″]/g, '"') // curly double quotes
    .replace(/[–—]/g, '-')                    // en/em dash
    .replace(/…/g, '...');                         // ellipsis

  const bytes: number[] = [];
  for (const ch of s) {
    if (ch in ACCENT_MAP) {
      const [accent, base] = ACCENT_MAP[ch];
      bytes.push(SS2, accent, base);
    } else {
      const code = ch.charCodeAt(0);
      bytes.push(code >= 0x20 && code <= 0x7E ? code : 0x3F);
    }
  }
  return Buffer.from(bytes);
}

// Pad/truncate a string to exactly `width` chars
export function fixed(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

// Center a string within `width` chars, padding both sides so length === width
export function center(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  const leftPad = Math.floor((width - str.length) / 2);
  const rightPad = width - str.length - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}
