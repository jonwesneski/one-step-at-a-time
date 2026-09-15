import type { AccidentalType } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  STAFF_LINE_SPACING,
  TRILL_ACCIDENTAL_GAP_PX,
  TRILL_ACCIDENTAL_SCALE,
  TRILL_NOTCH_HEIGHT_PX,
  TRILL_PARENTHESIS_BOW_PX,
  TRILL_PARENTHESIS_NOTE_GAP_PX,
  TRILL_PARENTHESIS_OVERSHOOT_PX,
  TRILL_PARENTHESIS_STROKE_WIDTH,
  TRILL_SIGN_HEIGHT_PX,
  TRILL_WAVE_HEIGHT_PX,
  TRILL_WRITTEN_NOTE_SCALE,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  createNoteSvg,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
  noteHeadCenter,
} from './note';

// ─── Trill sign ─────────────────────────────────────────────────────────────
//
// Path data below is derived from an engraved glyph outline via
// `scripts/extract-glyphs.mjs` (regenerate with
// `pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- \
//   ornamentTrill wiggleTrill`). Each outline is normalized to a top-left
// origin, staff-space units, y-down. See README.md's "Drawing / SMuFL glyphs"
// section and CLAUDE.md's "Known Incomplete Areas" for provenance.

const ORNAMENT_TRILL_PATH_D =
  'M 1.064 0 C 1.048 0 1.024 0.008 1.012 0.012 L 0.816 0.076 C 0.78 0.088 0.764 0.1 0.748 0.14 L 0.604 0.492 C 0.588 0.532 0.584 0.54 0.572 0.54 C 0.556 0.54 0.532 0.52 0.496 0.504 C 0.44 0.48 0.388 0.468 0.328 0.468 C 0.14 0.468 0 0.58 0 0.748 C 0 0.872 0.084 0.976 0.264 0.976 C 0.312 0.976 0.364 0.968 0.388 0.968 C 0.396 0.968 0.4 0.972 0.4 0.98 C 0.4 0.988 0.396 1 0.388 1.02 L 0.344 1.128 C 0.3 1.236 0.268 1.316 0.268 1.4 C 0.268 1.512 0.344 1.6 0.496 1.6 C 0.704 1.6 0.904 1.432 0.904 1.136 C 0.904 1.04 0.888 0.952 0.852 0.864 C 0.844 0.844 0.84 0.836 0.84 0.824 C 0.84 0.8 0.864 0.78 0.928 0.744 L 0.952 0.732 C 1.092 0.648 1.188 0.592 1.264 0.592 C 1.3 0.592 1.316 0.604 1.316 0.652 C 1.316 0.692 1.304 0.74 1.292 0.768 L 1 1.492 C 0.992 1.512 0.988 1.524 0.988 1.536 C 0.988 1.552 1 1.56 1.032 1.56 L 1.228 1.56 C 1.264 1.56 1.276 1.552 1.292 1.512 L 1.552 0.864 C 1.604 0.732 1.732 0.584 1.82 0.584 C 1.844 0.584 1.86 0.592 1.86 0.608 C 1.86 0.644 1.772 0.656 1.772 0.768 C 1.772 0.848 1.832 0.896 1.916 0.896 C 2.012 0.896 2.084 0.816 2.084 0.676 C 2.084 0.56 2.024 0.464 1.876 0.464 C 1.772 0.464 1.688 0.52 1.628 0.588 C 1.592 0.628 1.588 0.644 1.572 0.644 C 1.552 0.644 1.568 0.616 1.536 0.556 C 1.508 0.504 1.448 0.468 1.36 0.468 C 1.2 0.468 1.048 0.548 0.964 0.592 C 0.912 0.62 0.888 0.636 0.868 0.636 C 0.86 0.636 0.856 0.632 0.856 0.624 C 0.856 0.608 0.868 0.584 0.876 0.564 L 1.076 0.068 C 1.084 0.048 1.088 0.036 1.088 0.024 C 1.088 0.008 1.08 0 1.064 0 M 0.328 0.56 C 0.372 0.56 0.532 0.596 0.532 0.656 C 0.532 0.668 0.524 0.688 0.516 0.708 L 0.5 0.748 C 0.48 0.8 0.464 0.812 0.412 0.824 C 0.36 0.836 0.312 0.844 0.272 0.844 C 0.14 0.844 0.108 0.78 0.108 0.724 C 0.108 0.652 0.168 0.56 0.328 0.56 M 0.756 0.892 C 0.792 0.892 0.812 1.104 0.812 1.14 C 0.812 1.316 0.704 1.476 0.588 1.476 C 0.556 1.476 0.544 1.456 0.544 1.428 C 0.544 1.396 0.56 1.344 0.576 1.304 C 0.576 1.3 0.58 1.3 0.732 0.92 C 0.74 0.9 0.744 0.892 0.756 0.892';
const ORNAMENT_TRILL_NATURAL_WIDTH = 2.084;
const ORNAMENT_TRILL_NATURAL_HEIGHT = 1.6;

const ORNAMENT_TRILL_SCALE =
  TRILL_SIGN_HEIGHT_PX / ORNAMENT_TRILL_NATURAL_HEIGHT;

/** Rendered width (px) of the trill sign — callers position the wavy line and layout footprint off this. */
export const TRILL_SIGN_WIDTH_PX =
  ORNAMENT_TRILL_NATURAL_WIDTH * ORNAMENT_TRILL_SCALE;

export type TrillSignProps = {
  /** Local-space X at which the sign's left edge sits, flush with the notehead's left edge. */
  leftX: number;
  /** Local-space Y at which the sign's bottom edge sits. */
  bottomY: number;
  /**
   * The trilling (auxiliary) pitch's accidental, when it needs to be shown —
   * drawn small, above the sign, centered on it. v1 always places it above,
   * never beside, regardless of available horizontal space (see
   * CLAUDE.md's Known Incomplete Areas).
   */
  accidental?: AccidentalType | null;
};

// Centers a small accidental symbol above [leftX, leftX + signWidth] x
// bottomY - signHeight, with a fixed gap.
function appendTrillAccidental(
  group: SVGGElement,
  accidental: AccidentalType,
  leftX: number,
  signTopY: number,
  signWidth: number
): void {
  const width = ACCIDENTAL_SYMBOL_WIDTH[accidental] * TRILL_ACCIDENTAL_SCALE;
  const height = ACCIDENTAL_SYMBOL_HEIGHT[accidental] * TRILL_ACCIDENTAL_SCALE;
  const symbol = createAccidentalSvg(accidental);
  symbol.setAttribute('width', `${width}`);
  symbol.setAttribute('height', `${height}`);
  symbol.setAttribute('x', `${leftX + signWidth / 2 - width / 2}`);
  symbol.setAttribute('y', `${signTopY - TRILL_ACCIDENTAL_GAP_PX - height}`);
  symbol.classList.add('trill-accidental');
  group.appendChild(symbol);
}

/** The stylized "tr" sign (+ optional trilling-note accidental above it), positioned by its left/bottom edges. */
export function createTrillSignSvg({
  leftX,
  bottomY,
  accidental = null,
}: TrillSignProps): SVGGElement {
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.classList.add('trill-sign');

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('trill-sign-glyph');
  group.setAttribute(
    'transform',
    `translate(${leftX} ${
      bottomY - TRILL_SIGN_HEIGHT_PX
    }) scale(${ORNAMENT_TRILL_SCALE})`
  );
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ORNAMENT_TRILL_PATH_D);
  path.setAttribute('fill', 'currentColor');
  group.appendChild(path);
  wrapper.appendChild(group);

  if (accidental !== null) {
    appendTrillAccidental(
      wrapper,
      accidental,
      leftX,
      bottomY - TRILL_SIGN_HEIGHT_PX,
      TRILL_SIGN_WIDTH_PX
    );
  }

  return wrapper;
}

// ─── Trill (wavy extension) line ───────────────────────────────────────────

const WIGGLE_TRILL_PATH_D =
  'M 0.024 0.352 C 0.088 0.352 0.156 0.296 0.196 0.256 C 0.212 0.244 0.244 0.232 0.268 0.232 C 0.476 0.232 0.48 0.444 0.764 0.444 C 0.848 0.444 0.992 0.404 1.144 0.268 C 1.192 0.22 1.224 0.172 1.224 0.144 C 1.224 0.136 1.22 0.128 1.212 0.124 C 1.208 0.12 1.204 0.12 1.196 0.12 C 1.164 0.12 1.112 0.144 1.056 0.188 C 1.04 0.196 1.004 0.212 0.972 0.212 C 0.764 0.212 0.76 0 0.48 0 C 0.392 0 0.256 0.06 0.132 0.16 L 0.052 0.232 C 0.016 0.272 0 0.304 0 0.328 C 0 0.344 0.008 0.352 0.024 0.352';
const WIGGLE_TRILL_NATURAL_HEIGHT = 0.444;
const WIGGLE_TRILL_ADVANCE = 0.948;

/** Rendered horizontal repeat pitch (px) of one wiggle tile at its natural scale. */
const NOMINAL_TRILL_PITCH_PX = WIGGLE_TRILL_ADVANCE * STAFF_LINE_SPACING;

const appendTrillTile = (
  parent: SVGGElement,
  translateX: number,
  pitchPx: number
): void => {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', WIGGLE_TRILL_PATH_D);
  path.setAttribute(
    'transform',
    `translate(${translateX} 0) scale(${pitchPx / WIGGLE_TRILL_ADVANCE} ${
      TRILL_WAVE_HEIGHT_PX / WIGGLE_TRILL_NATURAL_HEIGHT
    })`
  );
  path.setAttribute('fill', 'currentColor');
  path.classList.add('trill-wave-tile');
  parent.appendChild(path);
};

export type TrillLineProps = {
  /** Local-space X at which the line starts (just right of the sign). */
  startX: number;
  /** Local-space X at which the line ends. */
  endX: number;
  /** Local-space Y at which the line's bottom edge sits — matches the sign's `bottomY`. */
  bottomY: number;
};

/**
 * Build the wavy extension line as a `<g>` stretching an integer number of
 * tiles to exactly cover `endX - startX`, the same stretch-to-fit approach as
 * the arpeggio wave (see `svgCreator/arpeggio.ts`) but tiling horizontally.
 * Returns null when there is no room for even one tile.
 */
export function createTrillLineSvg({
  startX,
  endX,
  bottomY,
}: TrillLineProps): SVGGElement | null {
  const spanWidth = endX - startX;
  if (spanWidth <= 0) {
    return null;
  }

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('trill-line');
  group.setAttribute(
    'transform',
    `translate(${startX} ${bottomY - TRILL_WAVE_HEIGHT_PX})`
  );

  const tileCount = Math.max(1, Math.round(spanWidth / NOMINAL_TRILL_PITCH_PX));
  const pitchPx = spanWidth / tileCount;
  for (let i = 0; i < tileCount; i++) {
    appendTrillTile(group, i * pitchPx, pitchPx);
  }

  return group;
}

export type TrillContinuationSignProps = {
  /** Root-space X at which the sign's left parenthesis begins. */
  leftX: number;
  /** Root-space Y at which the sign's bottom edge sits — matches the resumed line's own `bottomY`. */
  bottomY: number;
};

export type TrillContinuationSignResult = {
  element: SVGGElement;
  /** Total rendered width (px) — the resumed line starts just past this. */
  width: number;
};

/**
 * Restates the trill sign, in parentheses, at the start of a new row, once a
 * trill's own tie chain has carried its line across a system break — reuses
 * the same parenthesis primitive as the written trilling notehead. Callers
 * only draw this at all when the crossing is a system break (an ordinary
 * same-row barline never restates anything) and `trill-continuation` is not
 * `'line-only'` (which drops the restated sign entirely, not just the
 * brackets — there is no unbracketed variant of this glyph).
 */
export function createTrillContinuationSignSvg({
  leftX,
  bottomY,
}: TrillContinuationSignProps): TrillContinuationSignResult {
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.classList.add('trill-continuation-sign');

  const centerY = bottomY - TRILL_SIGN_HEIGHT_PX / 2;
  const halfHeight = TRILL_SIGN_HEIGHT_PX / 2 + TRILL_PARENTHESIS_OVERSHOOT_PX;

  let x = leftX;
  appendParenthesis(wrapper, x, centerY, halfHeight, 'left');
  x += TRILL_PARENTHESIS_STROKE_WIDTH + TRILL_PARENTHESIS_NOTE_GAP_PX;

  wrapper.appendChild(createTrillSignSvg({ leftX: x, bottomY }));
  x += TRILL_SIGN_WIDTH_PX + TRILL_PARENTHESIS_NOTE_GAP_PX;

  appendParenthesis(wrapper, x, centerY, halfHeight, 'right');
  x += TRILL_PARENTHESIS_STROKE_WIDTH;

  return { element: wrapper, width: x - leftX };
}

/** Vertical end-notch marking an explicit `trill-stop` — drawn at the line's cut-off X. */
export function createTrillNotchSvg(
  x: number,
  bottomY: number
): SVGLineElement {
  const notch = document.createElementNS(SVG_NS, 'line');
  notch.classList.add('trill-notch');
  notch.setAttribute('x1', `${x}`);
  notch.setAttribute('y1', `${bottomY}`);
  notch.setAttribute('x2', `${x}`);
  notch.setAttribute('y2', `${bottomY - TRILL_NOTCH_HEIGHT_PX}`);
  notch.setAttribute('stroke', 'currentColor');
  notch.setAttribute('stroke-width', '1.4');
  return notch;
}

// ─── Written trilling note ─────────────────────────────────────────────────
//
// A small notehead in parentheses after the main notehead — required when
// the trilling pitch can't be expressed as "the diatonic upper neighbor,
// optionally re-accidentalled" (e.g. it shares the main note's own letter).
// Never a grace note: no stem, no flag, no slur.

function appendParenthesis(
  group: SVGGElement,
  x: number,
  centerY: number,
  halfHeight: number,
  side: 'left' | 'right'
): void {
  const bow =
    side === 'left' ? -TRILL_PARENTHESIS_BOW_PX : TRILL_PARENTHESIS_BOW_PX;
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${x} ${centerY - halfHeight} Q ${x + bow} ${centerY} ${x} ${
      centerY + halfHeight
    }`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${TRILL_PARENTHESIS_STROKE_WIDTH}`);
  path.setAttribute('stroke-linecap', 'round');
  path.classList.add('trill-parenthesis');
  group.appendChild(path);
}

// A function, not a module-level constant: svgCreator/note.ts imports the
// sign builders from this file, so a top-level `NOTE_HEAD_RADIUS_PX * ...`
// constant here would evaluate during that circular import's module init,
// before note.ts finishes assigning NOTE_HEAD_RADIUS_PX ("cannot access
// before initialization"). Deferring the read into a function body, only
// called after both modules have finished loading, avoids that.
const writtenNoteHeadWidthPx = (): number =>
  2 * NOTE_HEAD_RADIUS_PX * TRILL_WRITTEN_NOTE_SCALE;

/**
 * Rightward footprint (px) a written trilling notehead (`trill-note`)
 * reserves — mirrors `createWrittenTrillNoteSvg`'s own layout math exactly,
 * without building the SVG, so `staffClassicalBase.ts` can reserve the space
 * before positions are known.
 */
export function computeWrittenTrillNoteWidth(
  accidental: AccidentalType | null
): number {
  let width =
    2 * (TRILL_PARENTHESIS_STROKE_WIDTH + TRILL_PARENTHESIS_NOTE_GAP_PX) +
    writtenNoteHeadWidthPx();
  if (accidental !== null) {
    width +=
      ACCIDENTAL_SYMBOL_WIDTH[accidental] * TRILL_WRITTEN_NOTE_SCALE +
      TRILL_PARENTHESIS_NOTE_GAP_PX;
  }
  return width;
}

export type WrittenTrillNoteProps = {
  /** Local-space X at which the left parenthesis begins. */
  leftX: number;
  /** Local-space Y of the notehead's own vertical center. */
  centerY: number;
  /** Accidental drawn immediately left of the notehead, inside the parentheses. */
  accidental: AccidentalType | null;
};

export type WrittenTrillNoteResult = {
  element: SVGGElement;
  /** Total rendered width (px), left parenthesis to right parenthesis — callers reserve rightward layout footprint off this. */
  width: number;
};

/**
 * Builds the written trilling notehead: `(` + optional accidental + a small
 * unstemmed notehead + `)`, laid out left to right starting at `leftX`.
 */
export function createWrittenTrillNoteSvg({
  leftX,
  centerY,
  accidental,
}: WrittenTrillNoteProps): WrittenTrillNoteResult {
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.classList.add('trill-written-note');

  const noteHeadWidth = writtenNoteHeadWidthPx();
  const noteHeadHalfHeight =
    NOTE_HEAD_RADIUS_PX * 0.75 * TRILL_WRITTEN_NOTE_SCALE;
  const parenthesisHalfHeight =
    noteHeadHalfHeight + TRILL_PARENTHESIS_OVERSHOOT_PX;

  let x = leftX;
  appendParenthesis(wrapper, x, centerY, parenthesisHalfHeight, 'left');
  x += TRILL_PARENTHESIS_STROKE_WIDTH + TRILL_PARENTHESIS_NOTE_GAP_PX;

  if (accidental !== null) {
    const width =
      ACCIDENTAL_SYMBOL_WIDTH[accidental] * TRILL_WRITTEN_NOTE_SCALE;
    const height =
      ACCIDENTAL_SYMBOL_HEIGHT[accidental] * TRILL_WRITTEN_NOTE_SCALE;
    const symbol = createAccidentalSvg(accidental);
    symbol.setAttribute('width', `${width}`);
    symbol.setAttribute('height', `${height}`);
    symbol.setAttribute('x', `${x}`);
    symbol.setAttribute('y', `${centerY - height / 2}`);
    symbol.classList.add('trill-written-note-accidental');
    wrapper.appendChild(symbol);
    x += width + TRILL_PARENTHESIS_NOTE_GAP_PX;
  }

  const [noteGroup] = createNoteSvg({
    duration: 'quarter',
    stemUp: true,
    noStem: true,
    noFlags: true,
    qualifiedElementName: 'g',
  });
  const { cx, cy } = noteHeadCenter(true, 'quarter', true);
  const xCenter = x + noteHeadWidth / 2;
  const translateX = xCenter - TRILL_WRITTEN_NOTE_SCALE * cx * NOTE_SCALE;
  const translateY = centerY - TRILL_WRITTEN_NOTE_SCALE * cy * NOTE_SCALE;
  noteGroup.setAttribute(
    'transform',
    `translate(${translateX} ${translateY}) scale(${TRILL_WRITTEN_NOTE_SCALE})`
  );
  noteGroup.classList.remove('note');
  noteGroup.classList.add('trill-written-notehead');
  // Not a drag target — this notehead has no independent pitch/octave attrs.
  noteGroup.querySelector('.head-hit-zone')?.remove();
  const head = noteGroup.querySelector('.head');
  if (head) {
    head.classList.remove('head');
    head.classList.add('trill-written-head');
  }
  wrapper.appendChild(noteGroup);
  x += noteHeadWidth + TRILL_PARENTHESIS_NOTE_GAP_PX;

  appendParenthesis(wrapper, x, centerY, parenthesisHalfHeight, 'right');
  x += TRILL_PARENTHESIS_STROKE_WIDTH;

  return { element: wrapper, width: x - leftX };
}
