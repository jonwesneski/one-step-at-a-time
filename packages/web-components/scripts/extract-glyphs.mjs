// Glyph extractor for the notation library.
//
// AUTHOR-TIME ONLY. This script is never run by the build, tests, CI, or the
// published package, and `opentype.js` is a dev-only dependency. Its OUTPUT —
// the `*_PATH_D` / `*_NATURAL_*` constants you paste into a
// `src/utils/svgCreator/*.ts` file — is the source of truth and the only thing
// that ships. The script is kept in the repo purely so that extraction is
// reproducible for the next glyph (or a reference-font version bump). Deleting
// it after a commit breaks nothing.
//
// One generic script for every glyph — pass glyph names as arguments:
//
//   pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- \
//     wiggleArpeggiatoUp:rotate90 wiggleArpeggiatoUpArrow:rotate90 \
//     wiggleArpeggiatoDownArrow:rotate90
//
// A `:rotate90` suffix rotates the outline 90 degrees clockwise (a horizontal
// glyph, e.g. a wiggle segment, becomes a vertical one running top to bottom).
// It prints one ready-to-paste constant block per glyph. See the "Drawing /
// SMuFL glyphs" section of README.md for the full workflow, and CLAUDE.md's
// "Known Incomplete Areas" for provenance context. Per repo convention the
// pasted constants and their surrounding comments do NOT name the reference
// font in source.
//
// Normalization (matches the existing `BRACE_PATH_D` convention in
// svgCreator/staffGroup.ts): the outline is translated so its bounding box's
// min corner sits at (0, 0) and scaled from font units into staff-space units
// (1 staff space = unitsPerEm / 4), keeping the y-down orientation
// opentype.js's getPath already produces. The result's own coordinate space is
// therefore X in [0, naturalWidth], Y in [0, naturalHeight] — a renderer only
// needs to multiply by STAFF_LINE_SPACING and position it.
//
// NOTE: the checked-in reference metadata JSON has drifted from the checked-in
// reference .otf (its glyph bounding boxes no longer match), so this script
// reads geometry straight from the font outline and ignores the metadata.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = join(SCRIPT_DIR, '..', 'smufl', 'Bravura.otf');

// SMuFL codepoints for the glyphs this repo extracts. Add entries as needed.
const CODEPOINTS = {
  arpeggiato: 0xeaa9,
  arpeggiatoUp: 0xeaaa,
  arpeggiatoDown: 0xeaab,
  wiggleArpeggiatoUp: 0xeaa0,
  wiggleArpeggiatoDown: 0xeaa1,
  wiggleArpeggiatoUpArrow: 0xeaa2,
  wiggleArpeggiatoDownArrow: 0xeaa3,
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    'usage: node scripts/extract-glyphs.mjs <glyphName>[:rotate90] [...]\n' +
      'known glyphs: ' +
      Object.keys(CODEPOINTS).join(', ')
  );
  process.exit(1);
}

const font = opentype.parse(readFileSync(FONT_PATH).buffer);
const staffSpaceUnits = font.unitsPerEm / 4;

const round = (n) => Math.round(n * 1000) / 1000;

const constName = (glyphName) =>
  glyphName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();

for (const arg of args) {
  const [glyphName, ...modifiers] = arg.split(':');
  const rotate90 = modifiers.includes('rotate90');
  const codepoint = CODEPOINTS[glyphName];
  if (codepoint === undefined) {
    console.error(`unknown glyph "${glyphName}"`);
    process.exit(1);
  }

  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  const path = glyph.getPath(0, 0, font.unitsPerEm);
  const box = path.getBoundingBox();
  const rawWidth = (box.x2 - box.x1) / staffSpaceUnits;
  const rawHeight = (box.y2 - box.y1) / staffSpaceUnits;

  // Normalize to bbox-min origin, staff-space units, y-down. With :rotate90
  // also rotate 90 degrees clockwise: (x, y) -> (rawHeight - y, x), which maps
  // the box [0,w]x[0,h] to [0,h]x[0,w] with the top-left origin preserved, so a
  // rightward-running horizontal glyph becomes a downward-running vertical one.
  const norm = (x, y) => {
    const px = round((x - box.x1) / staffSpaceUnits);
    const py = round((y - box.y1) / staffSpaceUnits);
    return rotate90 ? [round(rawHeight - py), px] : [px, py];
  };

  const d = path.commands
    .map((c) => {
      const [x, y] = c.type === 'Z' ? [0, 0] : norm(c.x, c.y);
      switch (c.type) {
        case 'M':
          return `M ${x} ${y}`;
        case 'L':
          return `L ${x} ${y}`;
        case 'C': {
          const [x1, y1] = norm(c.x1, c.y1);
          const [x2, y2] = norm(c.x2, c.y2);
          return `C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
        }
        case 'Q': {
          const [x1, y1] = norm(c.x1, c.y1);
          return `Q ${x1} ${y1} ${x} ${y}`;
        }
        case 'Z':
          return 'Z';
        default:
          throw new Error(`unhandled path command ${c.type}`);
      }
    })
    .join(' ');

  const base = constName(glyphName) + (rotate90 ? '_V' : '');
  const naturalWidth = round(rotate90 ? rawHeight : rawWidth);
  const naturalHeight = round(rotate90 ? rawWidth : rawHeight);
  const advance = round(glyph.advanceWidth / staffSpaceUnits);

  console.log(`\n// ${glyphName}${rotate90 ? ' (rotated 90 clockwise)' : ''}`);
  console.log(`const ${base}_PATH_D =\n  '${d}';`);
  console.log(`const ${base}_NATURAL_WIDTH = ${naturalWidth};`);
  console.log(`const ${base}_NATURAL_HEIGHT = ${naturalHeight};`);
  console.log(
    `const ${base}_ADVANCE = ${advance}; // repeat pitch (staff spaces) along the ${
      rotate90 ? 'vertical' : 'horizontal'
    } axis`
  );
}
