import type {
  ArpeggioType,
  DynamicMarking,
  HairpinKind,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ARPEGGIO_BRACKET_LIP_PX,
  ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX,
  ARPEGGIO_HAIRPIN_GAP_PX,
  ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX,
  ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX,
  ARPEGGIO_STROKE_WIDTH,
  ARPEGGIO_TEXT_FONT_SIZE,
  ARPEGGIO_VERTICAL_OVERSHOOT_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  DYNAMICS_FONT_SIZE,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
} from '../notationDimensions';
import { createDynamicMarkingSvg, createVerticalHairpinSvg } from './dynamics';

// ─── Wiggle tiles ────────────────────────────────────────────────────────────
//
// Path data below is derived from engraved wiggle glyph outlines via
// `scripts/extract-glyphs.mjs` (regenerate with
// `pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- \
//   wiggleArpeggiatoUp:rotate90 wiggleArpeggiatoUpArrow:rotate90 \
//   wiggleArpeggiatoDownArrow:rotate90`). Each outline is normalized to a
// top-left origin, staff-space units, y-down, and rotated so the wiggle runs
// vertically (top to bottom). See README.md's "Drawing / SMuFL glyphs" section
// and CLAUDE.md's "Known Incomplete Areas" for provenance. `advance` is the
// repeat pitch along the vertical axis; a tile's own height exceeds it, so
// stacked tiles overlap and read as one continuous line.

const PLAIN_TILE = {
  d: 'M 0.096 0.032 C 0.096 0.056 0.1 0.08 0.12 0.108 C 0.136 0.14 0.188 0.18 0.188 0.204 C 0.188 0.236 0 0.28 0 0.416 C 0 0.532 0.168 0.72 0.272 0.78 C 0.284 0.784 0.296 0.788 0.304 0.788 C 0.312 0.788 0.316 0.784 0.32 0.78 L 0.332 0.76 C 0.332 0.752 0.324 0.708 0.316 0.688 C 0.3 0.664 0.26 0.632 0.26 0.608 C 0.26 0.56 0.464 0.528 0.464 0.376 C 0.464 0.252 0.264 0.064 0.152 0.008 C 0.14 0 0.132 0 0.124 0 C 0.116 0 0.112 0 0.108 0.008',
  width: 0.464,
  advance: 0.548,
};

const UP_ARROW_TILE = {
  d: 'M 0.1 0.028 C 0.1 0.028 0.1 0.028 0.1 0.032 L 0.096 0.036 C 0.096 0.052 0.1 0.068 0.108 0.084 C 0.124 0.124 0.212 0.18 0.212 0.224 C 0.212 0.3 0 0.348 0 0.544 C 0 0.664 0.212 0.952 0.308 0.952 C 0.316 0.952 0.316 0.948 0.32 0.944 L 0.336 0.924 C 0.336 0.924 0.34 0.92 0.34 0.912 C 0.34 0.904 0.336 0.892 0.332 0.876 C 0.316 0.84 0.252 0.8 0.252 0.756 C 0.252 0.652 0.468 0.624 0.468 0.416 C 0.468 0.344 0.38 0.204 0.28 0.104 L 0.18 0.02 C 0.16 0.008 0.144 0 0.132 0 C 0.124 0 0.12 0.004 0.116 0.008',
  width: 0.468,
  advance: 0.688,
};

const DOWN_ARROW_TILE = {
  d: 'M 0.212 0.228 C 0.212 0.392 0 0.396 0 0.64 C 0 0.772 0.112 0.92 0.204 1.012 C 0.24 1.044 0.272 1.064 0.296 1.064 C 0.312 1.064 0.324 1.056 0.324 1.036 C 0.324 1.004 0.304 0.968 0.288 0.944 C 0.268 0.916 0.236 0.888 0.232 0.852 C 0.232 0.728 0.376 0.66 0.42 0.56 C 0.44 0.524 0.444 0.48 0.444 0.436 C 0.444 0.304 0.288 0.116 0.188 0.032 C 0.156 0.008 0.132 0 0.116 0 C 0.1 0 0.088 0.008 0.088 0.028 L 0.092 0.036 C 0.1 0.092 0.212 0.156 0.212 0.228',
  width: 0.444,
  advance: 0.804,
};

/** Rendered vertical repeat pitch (px) of a plain wiggle tile. */
const NOMINAL_PITCH_PX = PLAIN_TILE.advance * STAFF_LINE_SPACING;

export type ArpeggioProps = {
  arpeggio: ArpeggioType;
  /** Pixel Y of the top notehead center in the host SVG's coordinate space. */
  topY: number;
  /** Pixel Y of the bottom notehead center (equal to topY for a single note). */
  bottomY: number;
  /**
   * Negative pixel X at which the sign's right edge sits — left of the
   * accidental column, or the notehead left edge when there is none.
   */
  rightEdgeX: number;
};

type Tile = { d: string; width: number; advance: number };

const appendTilePath = (
  parent: SVGGElement,
  tile: Tile,
  translateY: number,
  pitchPx: number,
  extraClass: string
): void => {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', tile.d);
  path.setAttribute(
    'transform',
    `translate(0 ${translateY}) scale(${ARPEGGIO_WAVE_WIDTH_PX / tile.width} ${
      pitchPx / tile.advance
    })`
  );
  path.setAttribute('fill', 'currentColor');
  path.classList.add('arpeggio-wave', extraClass);
  parent.appendChild(path);
};

/**
 * Build the arpeggio sign as an `<g>` positioned by a single translate so its
 * right edge lands at `rightEdgeX` and its span brackets the notehead range
 * plus a small overshoot. Returns null for an unrecognized value.
 */
export function createArpeggioSvg({
  arpeggio,
  topY,
  bottomY,
  rightEdgeX,
}: ArpeggioProps): SVGGElement | null {
  const spanTop = topY - ARPEGGIO_VERTICAL_OVERSHOOT_PX;
  const spanBottom = bottomY + ARPEGGIO_VERTICAL_OVERSHOOT_PX;
  const spanHeight = spanBottom - spanTop;

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('arpeggio', `arpeggio-${arpeggio}`);
  group.setAttribute(
    'transform',
    `translate(${rightEdgeX - ARPEGGIO_WAVE_WIDTH_PX} ${spanTop})`
  );

  if (arpeggio === 'non-arpeggiate') {
    const bracket = document.createElementNS(SVG_NS, 'path');
    bracket.setAttribute(
      'd',
      `M ${ARPEGGIO_WAVE_WIDTH_PX} 0 L 0 0 L 0 ${spanHeight} L ${ARPEGGIO_BRACKET_LIP_PX} ${spanHeight}`
    );
    bracket.setAttribute('fill', 'none');
    bracket.setAttribute('stroke', 'currentColor');
    bracket.setAttribute('stroke-width', `${ARPEGGIO_STROKE_WIDTH}`);
    bracket.setAttribute('stroke-linecap', 'square');
    bracket.classList.add('arpeggio-bracket');
    group.appendChild(bracket);
    return group;
  }

  const tileCount = Math.max(1, Math.round(spanHeight / NOMINAL_PITCH_PX));
  const pitchPx = spanHeight / tileCount;

  for (let i = 0; i < tileCount; i++) {
    if (i === 0 && arpeggio === 'up-arrow') {
      appendTilePath(group, UP_ARROW_TILE, 0, pitchPx, 'arpeggio-arrowhead');
    } else if (i === tileCount - 1 && arpeggio === 'down') {
      appendTilePath(
        group,
        DOWN_ARROW_TILE,
        i * pitchPx,
        pitchPx,
        'arpeggio-arrowhead'
      );
    } else {
      appendTilePath(group, PLAIN_TILE, i * pitchPx, pitchPx, 'arpeggio-tile');
    }
  }

  return group;
}

/** Whether an arpeggio value is a rolled wave (not the non-arpeggiate bracket). */
export const isArpeggioWaveVariant = (
  arpeggio: ArpeggioType | null
): arpeggio is Exclude<ArpeggioType, 'non-arpeggiate'> =>
  arpeggio === 'up' || arpeggio === 'up-arrow' || arpeggio === 'down';

export type ArpeggioHairpinProps = {
  kind: HairpinKind;
  from: DynamicMarking | null;
  to: DynamicMarking | null;
  /** The rolled wave variant this hairpin accompanies — sets the roll direction. */
  arpeggio: Exclude<ArpeggioType, 'non-arpeggiate'>;
  /** Pixel Y of the top notehead center in the host SVG's coordinate space. */
  topY: number;
  /** Pixel Y of the bottom notehead center (equal to topY for a single note). */
  bottomY: number;
  /** Left edge (px X) of the arpeggio sign — the hairpin sits just left of it. */
  signLeftEdgeX: number;
  /**
   * When true, the wedge is extended to span at least the staff height and the
   * dynamic letters land just beyond the staff lines — used element-local so
   * the letters clear the staff even for a low chord. Omit for the cross-staff
   * form, whose span already covers both staves.
   */
  staffRelative?: boolean;
};

/**
 * Append the vertical dynamic-change hairpin — a wedge plus a dynamic letter
 * outside each end — just left of the arpeggio sign. `from`/`to` are in roll
 * order; an upward roll puts `from` at the bottom and `to` at the top, a
 * downward roll the reverse.
 */
export function appendArpeggioHairpin(
  target: SVGElement,
  {
    kind,
    from,
    to,
    arpeggio,
    topY,
    bottomY,
    signLeftEdgeX,
    staffRelative = false,
  }: ArpeggioHairpinProps
): void {
  let spanTopY = topY - ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX;
  let spanBottomY = bottomY + ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX;
  if (staffRelative) {
    spanTopY = Math.min(spanTopY, STAFF_TOP_LINE_Y);
    spanBottomY = Math.max(spanBottomY, STAFF_BOTTOM_LINE_Y);
  }
  const spineX =
    signLeftEdgeX -
    ARPEGGIO_HAIRPIN_GAP_PX -
    ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX / 2;

  // Roll runs bottom→top for up / up-arrow, top→bottom for down.
  const fromEnd: 'top' | 'bottom' = arpeggio === 'down' ? 'top' : 'bottom';
  const toEnd: 'top' | 'bottom' = fromEnd === 'top' ? 'bottom' : 'top';
  const narrowEnd = kind === 'crescendo' ? fromEnd : toEnd;

  target.setAttribute('overflow', 'visible');
  target.appendChild(
    createVerticalHairpinSvg(kind, spanTopY, spanBottomY, spineX, narrowEnd)
  );

  const topMark = fromEnd === 'top' ? from : to;
  const bottomMark = fromEnd === 'bottom' ? from : to;
  if (topMark !== null) {
    target.appendChild(
      createDynamicMarkingSvg(
        topMark,
        spineX,
        spanTopY - ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX
      )
    );
  }
  if (bottomMark !== null) {
    target.appendChild(
      createDynamicMarkingSvg(
        bottomMark,
        spineX,
        spanBottomY + ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX + DYNAMICS_FONT_SIZE
      )
    );
  }
}

/**
 * The `sempre arpeggiando` passage instruction, drawn once above the staff at
 * the start of the passage. `x`/`y` are the text anchor (start, baseline).
 */
export function createSempreArpeggiandoText(
  x: number,
  y: number,
  label = 'sempre arpegg.'
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', `${x}`);
  text.setAttribute('y', `${y}`);
  text.setAttribute('text-anchor', 'start');
  text.setAttribute('font-style', 'italic');
  text.setAttribute('font-family', 'serif');
  text.setAttribute('font-size', `${ARPEGGIO_TEXT_FONT_SIZE}`);
  text.setAttribute('fill', 'currentColor');
  text.classList.add('sempre-arpeggiando');
  text.textContent = label;
  return text;
}
