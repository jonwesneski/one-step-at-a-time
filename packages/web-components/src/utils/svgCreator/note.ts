// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space

import {
  forcedStemUp,
  resolveNoteheadGlyph,
  suppressesAccidental,
  type NoteheadGlyph,
} from '../../rules/noteheadRules';
import { durationToFlagCountMap } from '../../rules/theoryConsts';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  DurationType,
  DynamicMarking,
  HairpinKind,
  NoteheadType,
  StressType,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  BASE_STEM_LENGTH_PX,
  BEAM_GAP_PX,
  BEAM_THICKNESS_PX,
  DOWN_TAIL_HEAD_ROOM_PX,
  FLAG_STEM_STEP_PX,
  QUAVER_TAIL_LENGTH_PX,
  STACKED_TAIL_LENGTH_PX,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STEM_OVERLAP_PX,
  STEM_STROKE_WIDTH_PX,
  TRILL_ABOVE_STAFF_GAP_PX,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  appendArpeggioHairpin,
  createArpeggioSvg,
  isArpeggioWaveVariant,
} from './arpeggio';
import { createArticulationMarks } from './articulations';
import {
  createNoteheadGlyphPath,
  placeNoteheadGlyph,
  type NoteheadPlacement,
} from './noteheads';
import { createTrillSignSvg } from './trill';

// scaled down to the 32px note SVG viewport. Used to compute beam attachment points.
export const NOTE_SVG_WIDTH = 32;
// Draw in a 600-unit-wide coordinate space scaled to a 32x60 viewport via a
// uniform scale transform on a wrapper <g>. This avoids viewBox-based sizing
// quirks when the SVG is nested inside other SVG elements.
export const COORD_WIDTH = 600;
// 32/600 — applied uniformly to both axes
export const NOTE_SCALE = NOTE_SVG_WIDTH / COORD_WIDTH;
// SVG viewport height (px). Must be tall enough to contain the notehead.
export const NOTE_SVG_HEIGHT = 60;
export const NOTE_STEM_X_OFFSET = 365 * NOTE_SCALE; // stem x within a note SVG, stem-up (~19.47px)
export const NOTE_STEM_X_OFFSET_STEM_DOWN = 247 * NOTE_SCALE; // stem x within a note SVG, stem-down (~13.17px)
const BASE_STEM_LENGTH = BASE_STEM_LENGTH_PX / NOTE_SCALE;
// Notehead centre y for stem-up. Fixed independently of stem length, so a stem
// length change moves only the tip and every head-position consumer holds.
const STEM_UP_HEAD_Y = 700;
export const NOTE_Y_STEM_START = STEM_UP_HEAD_Y - BASE_STEM_LENGTH;
export const NOTE_STEM_TIP_Y_OFFSET = NOTE_Y_STEM_START * NOTE_SCALE; // stem tip y for stem-up (~2.33px)
// Y offset used to align the notehead with a staff line when positioning the note SVG.
// Must stay in sync with createNoteSvg's yHeadOffset formula (no flag extension).
export const NOTE_Y_HEAD_OFFSET_STEM_UP = Math.round(
  10 + STEM_UP_HEAD_Y * NOTE_SCALE
); // 47
const STEM_WIDTH = 22;
const HEAD_WIDTH = 80;
const FLAG_Y_SPACING = FLAG_STEM_STEP_PX / NOTE_SCALE;
// A stem has room for two tails; each further tail lengthens it.
const TAILS_WITHOUT_LENGTHENING = 2;
// Tail outlines in stave-space units, with the stem along x = 0. The up tail's
// stem tip is at y = 0; the down tail's is at y = its natural height.
const TAIL_UP_PATH_D =
  'M 0.952 3.196 C 0.952 3.196 1.056 2.816 1.056 2.504 C 1.056 2.004 0.848 1.532 0.596 1.132 C 0.392 0.816 0.224 0.472 0.16 0.088 C 0.148 0.024 0.116 0 0.076 0 C 0.032 0 0 0.012 0 0.06 L 0 1.016 C 0.264 1.064 0.644 1.608 0.788 1.948 C 0.848 2.084 0.884 2.312 0.884 2.548 C 0.884 2.728 0.856 2.916 0.788 3.096 C 0.78 3.12 0.776 3.14 0.776 3.156 C 0.776 3.22 0.816 3.256 0.84 3.272 C 0.864 3.288 0.932 3.264 0.952 3.196';
const TAIL_UP_NATURAL_HEIGHT = 3.277;
export const TAIL_UP_WIDTH_PX = 1.056 * STAFF_LINE_SPACING;
const TAIL_DOWN_PATH_D =
  'M 0.96 0.192 C 1.016 0.36 1.044 0.56 1.044 0.74 C 1.044 0.976 0.944 1.312 0.884 1.448 C 0.736 1.784 0.536 2.108 0 2.288 L 0 3.228 C 0 3.268 0.032 3.288 0.064 3.288 C 0.1 3.288 0.152 3.264 0.16 3.2 C 0.228 2.82 0.524 2.472 0.728 2.156 C 0.98 1.76 1.224 1.284 1.224 0.784 C 1.224 0.472 1.144 0.188 1.112 0.06 C 1.1 0.016 1.076 0 1.048 0 C 0.988 0 0.92 0.076 0.96 0.192';
const TAIL_DOWN_NATURAL_HEIGHT = 3.288;
export const TAIL_DOWN_WIDTH_PX = 1.224 * STAFF_LINE_SPACING;
// Y offset to align the notehead when stem is down (head is near the top of the SVG).
export const NOTE_Y_HEAD_OFFSET_STEM_DOWN = Math.round(
  10 + HEAD_WIDTH * NOTE_SCALE
); // 14
// The +10 added in computeYHeadOffset for staff CSS alignment.
// Actual notehead pixel center = yHeadOffset - NOTE_HEAD_Y_OFFSET_CORRECTION.
export const NOTE_HEAD_Y_OFFSET_CORRECTION = 10;
// Pixel distance from top of the note SVG to the stem tip when stem is down.
export const NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN =
  (HEAD_WIDTH + BASE_STEM_LENGTH) * NOTE_SCALE;

function flagStemExtensionUnits(flagCount: number): number {
  return Math.max(0, flagCount - TAILS_WITHOUT_LENGTHENING) * FLAG_Y_SPACING;
}

/**
 * Extra pixels of stem length a flagged note draws for its tails. The extension
 * grows downward in the note SVG, so it moves a stem-down tip and a stem-up head.
 */
export function flagStemExtensionPx(flagCount: number): number {
  return flagStemExtensionUnits(flagCount) * NOTE_SCALE;
}

// Notehead geometry in pixel space — used by ledgerLines.ts and chord.ts
export const NOTE_HEAD_RADIUS_PX = HEAD_WIDTH * NOTE_SCALE; // ≈ 4.27px
export const ADJACENT_NOTE_X_DISPLACEMENT_PX = 150 * NOTE_SCALE; // = 8px
export const NOTE_HEAD_CX_STEM_UP_PX = (COORD_WIDTH / 2 - 10) * NOTE_SCALE; // ≈ 15.47px
export const NOTE_HEAD_CX_STEM_DOWN_PX =
  (COORD_WIDTH / 2 + STEM_WIDTH) * NOTE_SCALE; // ≈ 17.17px

export {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
} from '../notationDimensions';

export type NoteProps = {
  duration: DurationType;
  noFlags?: boolean;
  noStem?: boolean; // true for non-extremal chord notes — renders head only, no stem or flags
  stemUp?: boolean;
  stemExtension?: number; // used in beaming
  // Extension of the stem measured from the head a lone tail must not overshoot.
  // Defaults to stemExtension; a chord's own stem also spans its spread.
  tailRoomStemExtension?: number;
  qualifiedElementName?: 'svg' | 'g';
  // A triangle forces its own stem direction, overriding stemUp.
  notehead?: NoteheadType;
  accidental?: AccidentalType;
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  // Set by the ancestor <music-measure> — see
  // INoteElement.articulationStemAnchorBeamLevels. When non-null, articulation
  // marks anchor next to the beam this note's stem reaches (derived locally
  // from stemUp/stemExtension/duration plus that beam-level count — no
  // coordinates need to cross from measure.ts) instead of the notehead.
  articulationStemAnchorBeamLevels?: number | null;
  arpeggio?: ArpeggioType | null;
  arpeggioHairpin?: HairpinKind | null;
  arpeggioHairpinFrom?: DynamicMarking | null;
  arpeggioHairpinTo?: DynamicMarking | null;
  trill?: boolean;
  // Accidental to draw on the trilling (auxiliary) pitch, above the sign —
  // the resolved value (staff-computed default, or the `trill-accidental`
  // override), not the raw attribute.
  trillAccidental?: AccidentalType | null;
  // Staff-absolute Y of the notehead (same value as the `staffY` property) —
  // lets the trill sign sit a fixed gap above the staff top line. Trills
  // require a staff (the wavy line needs sibling elements in the same note
  // stream to span into, so a sign with no possible line is not drawn
  // either): null (standalone, no staff) suppresses the sign entirely.
  staffY?: number | null;
  // Staff-written px to raise the trill sign further above its own nominal
  // Y — set when another voice's own content occupies that territory in a
  // multi-voice staff (see StaffClassicalElementBase#trillLineYClearingOtherVoices,
  // which computes the same value the sibling trill line/notch use, so the
  // sign and line move together as one visual unit).
  trillSignExtraLift?: number;
};

// Local-space X at which a note's trill sign's left edge sits, flush with the
// notehead's own left edge. Exported so the staff-level trill-line pass can
// recompute the same X without reaching into a note's shadow DOM.
export function trillSignLeftX(stemUp: boolean): number {
  return (
    (stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX) -
    NOTE_HEAD_RADIUS_PX
  );
}

// Local-space Y at which a note's trill sign's bottom edge sits — a fixed gap
// above the staff top line, converted from the shared staff-absolute
// coordinate space into this note's own translated SVG.
function trillSignBottomY(
  stemUp: boolean,
  staffY: number,
  extraLift: number
): number {
  const headCenterY = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return (
    headCenterY -
    NOTE_HEAD_Y_OFFSET_CORRECTION -
    staffY +
    (STAFF_TOP_LINE_Y - TRILL_ABOVE_STAFF_GAP_PX) -
    extraLift
  );
}

export const createNoteSvg = ({
  duration,
  noFlags = false,
  noStem = false,
  stemUp: requestedStemUp = true,
  stemExtension = 0,
  tailRoomStemExtension = stemExtension,
  qualifiedElementName = 'svg',
  notehead = 'normal',
  accidental,
  articulation,
  stress,
  articulationStemAnchorBeamLevels = null,
  arpeggio,
  arpeggioHairpin = null,
  arpeggioHairpinFrom = null,
  arpeggioHairpinTo = null,
  trill = false,
  trillAccidental = null,
  staffY = null,
  trillSignExtraLift = 0,
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const stemUp = forcedStemUp(notehead) ?? requestedStemUp;
  const headGeometry = noteHeadGeometry(stemUp, duration, noFlags, notehead);
  const leftOverhang = noteHeadLeftOverhangPx(stemUp, duration, notehead);
  const svg = document.createElementNS(SVG_NS, qualifiedElementName);
  if (qualifiedElementName === 'svg') {
    svg.setAttribute('xmlns', SVG_NS);
  }
  svg.classList.add('note');
  svg.dataset.duration = duration;
  svg.dataset.stemUp = `${stemUp}`;
  svg.setAttribute('width', `${NOTE_SVG_WIDTH}`);
  svg.setAttribute('height', `${NOTE_SVG_HEIGHT}`);
  // Not using viewbox but it should be somewhere around:
  // COORD_WIDTH and BASE_STEM_LENGTH (height; just starting though)

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${NOTE_SCALE})`);

  const flagCount = durationToFlagCountMap.get(duration) ?? 0;

  const flagStemExtension = noFlags ? 0 : flagStemExtensionUnits(flagCount);

  // Stem — computed unconditionally (not just inside the `!noStem` block
  // below) so articulationStemAnchorBeamLevels can reuse the same tip position the
  // stem itself is drawn to; an inner-voice double-stemmed member always
  // has a real stem anyway (noStem is for shared-stem/chord-internal
  // suppression, unrelated).
  const { x: stemX, y: stemTipY } = stemTipPosition(
    stemUp,
    duration,
    noFlags,
    stemExtension
  );
  if (!noStem && duration !== 'whole' && duration !== 'double-whole') {
    // Stem-up: right side of head, tip at top (y1), head end at bottom (y2).
    // Stem-down: left side of head, head end at top (y1), tip at bottom (y2).
    const stemY1 = stemUp ? stemTipY : headGeometry.anchorY;
    const stemY2 = stemUp ? headGeometry.anchorY : stemTipY;
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.classList.add('stem');
    stem.setAttribute('x1', stemX.toString());
    stem.setAttribute('y1', stemY1.toString());
    stem.setAttribute('x2', stemX.toString());
    stem.setAttribute('y2', stemY2.toString());
    if (stemExtension !== 0 || flagStemExtension > 0) {
      svg.setAttribute('overflow', 'visible');
    }
    stem.setAttribute('stroke', 'currentColor');
    stem.setAttribute(
      'stroke-width',
      (STEM_STROKE_WIDTH_PX / NOTE_SCALE).toString()
    );
    g.appendChild(stem);
  }

  // Flag(s)
  if (!noStem && !noFlags && flagCount > 0) {
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');

    const flagName = 'single-flag';
    const singleFlag = document.createElementNS(SVG_NS, 'path');
    singleFlag.classList.add(flagName);
    singleFlag.id = flagName;

    const tailRoomPx =
      BASE_STEM_LENGTH_PX +
      tailRoomStemExtension +
      flagStemExtensionPx(flagCount);
    const unfittedTailLengthPx =
      flagCount === 1
        ? Math.min(QUAVER_TAIL_LENGTH_PX, tailRoomPx)
        : STACKED_TAIL_LENGTH_PX;
    // A down-stem's tails curve back under the head, so the outermost stops at
    // the head's lower edge. An up-stem's end to the side of the head.
    const tailLengthPx = stemUp
      ? unfittedTailLengthPx
      : Math.min(
          unfittedTailLengthPx,
          tailRoomPx -
            (flagCount - 1) * FLAG_STEM_STEP_PX -
            DOWN_TAIL_HEAD_ROOM_PX
        );
    const tailLength = tailLengthPx / NOTE_SCALE;
    const tailXScale = STAFF_LINE_SPACING / NOTE_SCALE;
    const tailYScale =
      tailLength / (stemUp ? TAIL_UP_NATURAL_HEIGHT : TAIL_DOWN_NATURAL_HEIGHT);
    const tailTopY = stemUp ? stemTipY : stemTipY - tailLength;
    // Additional tails stack along the stem, toward the head.
    const flagYStep = stemUp ? FLAG_Y_SPACING : -FLAG_Y_SPACING;

    singleFlag.setAttribute('d', stemUp ? TAIL_UP_PATH_D : TAIL_DOWN_PATH_D);
    singleFlag.setAttribute(
      'transform',
      `translate(${stemX} ${tailTopY}) scale(${tailXScale} ${tailYScale})`
    );
    singleFlag.setAttribute('fill', 'currentColor');
    flag.appendChild(singleFlag);

    for (let i = 1; i < flagCount; i++) {
      const flagCopy = document.createElementNS(SVG_NS, 'use');
      flagCopy.setAttribute('href', `#${flagName}`);
      flagCopy.setAttribute('y', (flagYStep * i).toString());
      flag.appendChild(flagCopy);
    }

    g.appendChild(flag);
  }

  // Head
  const headXStartStr = headGeometry.cx.toString();
  const headYStartStr = headGeometry.cy.toString();
  const headFill =
    duration === 'half' || duration === 'whole' || duration === 'double-whole'
      ? 'none'
      : 'currentColor';

  // Enlarged invisible hit zone behind the notehead for easier targeting.
  // 1.5× the head size; transparent but captures pointer events.
  const headHitZone = document.createElementNS(SVG_NS, 'ellipse');
  headHitZone.classList.add('head-hit-zone');
  headHitZone.setAttribute('cx', headXStartStr);
  headHitZone.setAttribute('cy', headYStartStr);
  headHitZone.setAttribute('rx', (headGeometry.halfWidth * 1.5).toString());
  headHitZone.setAttribute('ry', (headGeometry.halfHeight * 1.5).toString());
  if (!headGeometry.placement) {
    headHitZone.setAttribute(
      'transform',
      `rotate(-30 ${headXStartStr} ${headYStartStr})`
    );
  }
  headHitZone.setAttribute('fill', 'transparent');
  headHitZone.setAttribute('stroke', 'none');
  g.appendChild(headHitZone);

  if (headGeometry.glyph && headGeometry.placement) {
    // Glyph outlines can reach past the 32x60 viewport (a stem-down
    // diamond or triangle head rises above y = 0).
    svg.setAttribute('overflow', 'visible');
    const head = createNoteheadGlyphPath(
      headGeometry.glyph,
      headGeometry.placement
    );
    head.classList.add('head');
    g.appendChild(head);
  } else {
    const head = document.createElementNS(SVG_NS, 'ellipse');
    head.classList.add('head');
    head.setAttribute('cx', headXStartStr);
    head.setAttribute('cy', headYStartStr);
    head.setAttribute('rx', HEAD_WIDTH.toString());
    head.setAttribute('ry', (HEAD_WIDTH * 0.75).toString());
    head.setAttribute(
      'transform',
      `rotate(-30 ${headXStartStr} ${headYStartStr})`
    );
    head.setAttribute('stroke', 'currentColor');
    head.setAttribute('fill', headFill);
    head.setAttribute('stroke-width', '30');
    g.appendChild(head);
  }

  if (duration === 'double-whole') {
    const headCx = headGeometry.cx;
    const headCy = headGeometry.cy;
    const barHalfHeight = headGeometry.halfHeight + 20;
    const barY1 = headCy - barHalfHeight;
    const barY2 = headCy + barHalfHeight;
    const barInnerGap = headGeometry.halfWidth + 20;
    const barOuterGap = barInnerGap + STEM_WIDTH + 10;

    for (const xOffset of [
      barInnerGap,
      barOuterGap,
      -barInnerGap,
      -barOuterGap,
    ]) {
      const bar = document.createElementNS(SVG_NS, 'line');
      bar.setAttribute('x1', (headCx + xOffset).toString());
      bar.setAttribute('y1', barY1.toString());
      bar.setAttribute('x2', (headCx + xOffset).toString());
      bar.setAttribute('y2', barY2.toString());
      bar.setAttribute('stroke', 'currentColor');
      bar.setAttribute('stroke-width', STEM_WIDTH.toString());
      g.appendChild(bar);
    }
  }

  // Articulation marks live inside the note's scaled <g> (alongside the
  // notehead), so they move/scale with the notehead group — unlike accidentals,
  // which are appended to the outer <svg> below.
  const articulationMarks = createArticulationMarks({
    articulation,
    stress,
    stemUp,
    noteHeadCenterX: Number(headXStartStr),
    noteHeadCenterY: Number(headYStartStr),
    stemAnchor:
      articulationStemAnchorBeamLevels !== null
        ? stemBeamJunctionPosition(
            stemUp,
            duration,
            noFlags,
            stemExtension,
            articulationStemAnchorBeamLevels
          )
        : null,
  });
  if (articulationMarks) {
    g.appendChild(articulationMarks);
    svg.setAttribute('overflow', 'visible');
  }

  svg.appendChild(g);

  if (
    accidental &&
    qualifiedElementName === 'svg' &&
    !suppressesAccidental(notehead)
  ) {
    const symbolWidth = ACCIDENTAL_SYMBOL_WIDTH[accidental];
    const symbolHeight = ACCIDENTAL_SYMBOL_HEIGHT[accidental];
    const yHeadCenter = stemUp
      ? NOTE_Y_HEAD_OFFSET_STEM_UP
      : NOTE_Y_HEAD_OFFSET_STEM_DOWN;

    const symbolSvg = createAccidentalSvg(accidental);

    symbolSvg.setAttribute(
      'x',
      `${-(symbolWidth + ACCIDENTAL_NOTE_GAP + leftOverhang)}`
    );
    symbolSvg.setAttribute('y', `${yHeadCenter - symbolHeight / 2}`);
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(symbolSvg);
  }

  if (arpeggio && qualifiedElementName === 'svg') {
    const headCenterY = stemUp
      ? NOTE_Y_HEAD_OFFSET_STEM_UP
      : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
    const headLeftX = (headGeometry.cx - headGeometry.halfWidth) * NOTE_SCALE;
    const accidentalLeftX =
      accidental && !suppressesAccidental(notehead)
        ? -(
            ACCIDENTAL_SYMBOL_WIDTH[accidental] +
            ACCIDENTAL_NOTE_GAP +
            leftOverhang
          )
        : headLeftX;
    const signRightEdgeX = accidentalLeftX - ARPEGGIO_CHORD_GAP_PX;
    const sign = createArpeggioSvg({
      arpeggio,
      topY: headCenterY,
      bottomY: headCenterY,
      rightEdgeX: signRightEdgeX,
    });
    if (sign) {
      svg.setAttribute('overflow', 'visible');
      svg.appendChild(sign);
    }

    if (arpeggioHairpin && isArpeggioWaveVariant(arpeggio)) {
      // A lone note has no staff-line frame in its local coordinate space, so
      // the letters stay at the wedge ends rather than being pushed outside a
      // staff (a lone-note arpeggio hairpin is a rare edge case anyway).
      appendArpeggioHairpin(svg, {
        kind: arpeggioHairpin,
        from: arpeggioHairpinFrom,
        to: arpeggioHairpinTo,
        arpeggio,
        topY: headCenterY,
        bottomY: headCenterY,
        signLeftEdgeX: signRightEdgeX - ARPEGGIO_WAVE_WIDTH_PX,
      });
    }
  }

  if (trill && qualifiedElementName === 'svg' && staffY !== null) {
    const leftX = trillSignLeftX(stemUp);
    const bottomY = trillSignBottomY(stemUp, staffY, trillSignExtraLift);
    const sign = createTrillSignSvg({
      leftX,
      bottomY,
      accidental: trillAccidental,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(sign);
  }

  const yHeadOffset = computeYHeadOffset(stemUp, duration, noFlags);

  return [svg, yHeadOffset];
};

// Compute the Y offset from the top of the note SVG to the notehead center.
// Deterministic from rendering params — used by both createNoteSvg (return value)
// and the staff (for positioning notes before their SVG renders).
export function computeYHeadOffset(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType = 'normal'
): number {
  const { cy } = noteHeadCenter(stemUp, duration, noFlags, notehead);
  return Math.round(NOTE_HEAD_Y_OFFSET_CORRECTION + cy * NOTE_SCALE);
}

export function noteHeadCenter(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType = 'normal'
): { cx: number; cy: number } {
  const { cx, cy } = noteHeadGeometry(stemUp, duration, noFlags, notehead);
  return { cx, cy };
}

export type NoteHeadGeometry = {
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
  // Y at which the stem meets the head (the centre for the ellipse).
  anchorY: number;
  glyph: NoteheadGlyph | null;
  placement: NoteheadPlacement | null;
};

// Notehead geometry in the 600-unit space. The stem column is the same for
// every notehead; a glyph head is translated so its stem anchor lands on it.
export function noteHeadGeometry(
  requestedStemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType = 'normal'
): NoteHeadGeometry {
  const stemUp = forcedStemUp(notehead) ?? requestedStemUp;
  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension = noFlags ? 0 : flagStemExtensionUnits(flagCount);
  const yStemEnd = NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension;
  const cy = stemUp ? yStemEnd : HEAD_WIDTH;
  const ellipseCx = stemUp ? xStart - 10 : xStart + STEM_WIDTH;
  const glyph = resolveNoteheadGlyph(notehead, duration);
  if (!glyph) {
    return {
      cx: ellipseCx,
      cy,
      halfWidth: HEAD_WIDTH,
      halfHeight: HEAD_WIDTH * 0.75,
      anchorY: cy,
      glyph: null,
      placement: null,
    };
  }
  const placement = placeNoteheadGlyph({
    glyph,
    stemUp,
    stemX: stemTipPosition(stemUp, duration, noFlags, 0).x,
    stemWidth: STEM_WIDTH,
    cy,
    unitsPerPx: 1 / NOTE_SCALE,
    centreX:
      duration === 'whole' || duration === 'double-whole'
        ? ellipseCx
        : undefined,
  });
  return {
    cx: placement.cx,
    cy,
    halfWidth: placement.halfWidth,
    halfHeight: placement.halfHeight,
    anchorY: placement.anchorY,
    glyph,
    placement,
  };
}

// How far (px) a glyph head reaches left of where the ellipse head's left
// edge would be. Accidentals, the arpeggio sign and grace notes are laid out
// against the ellipse's edge, so they shift left by this much.
export function noteHeadLeftOverhangPx(
  stemUp: boolean,
  duration: DurationType,
  notehead: NoteheadType = 'normal'
): number {
  const ellipse = noteHeadGeometry(stemUp, duration, false);
  const head = noteHeadGeometry(stemUp, duration, false, notehead);
  return Math.max(
    0,
    (ellipse.cx - ellipse.halfWidth - (head.cx - head.halfWidth)) * NOTE_SCALE
  );
}

// This note's own real stem-tip position (600-unit space) — the same
// geometry createNoteSvg's own stem line is drawn to, factored out so a
// caller (createArticulationMarks, via a passed-through stemAnchor) can
// anchor there without duplicating the formula. Unlike noteHeadCenter
// above, this depends on stemExtension, since that's exactly what moves
// the tip (e.g. to reach a cross-staff double-stemmed beam).
export function stemTipPosition(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  stemExtension: number
): { x: number; y: number } {
  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension = noFlags ? 0 : flagStemExtensionUnits(flagCount);
  const stemExtensionInternal = stemExtension / NOTE_SCALE;
  return {
    x: stemUp ? xStart + HEAD_WIDTH - 15 : xStart + STEM_WIDTH - HEAD_WIDTH + 5,
    y: stemUp
      ? NOTE_Y_STEM_START - stemExtensionInternal
      : HEAD_WIDTH +
        BASE_STEM_LENGTH +
        flagStemExtension +
        stemExtensionInternal,
  };
}

// This note's own real position where its stem meets the double-stemmed
// beam's actual visible surface (600-unit space) — used as the anchor for
// an inner-voice articulation mark instead of the raw stem tip.
// measure.ts#redrawDoubleStemmedBeams extends a member's stem past the
// beam's near surface by a fixed STEM_OVERLAP_PX (so the drawn line
// reliably disappears under the beam's opaque fill), and that overlap is
// asymmetric: a stem-up member's raw tip sits deep inside the polygon body
// (it travels through BEAM_THICKNESS_PX - STEM_OVERLAP_PX of hidden beam
// before reaching its own tip target), while a stem-down member's raw tip
// is only STEM_OVERLAP_PX past its own near surface. A mark placed at the
// raw tip would therefore often render underneath the beam's fill — this
// walks back from the tip, toward the notehead, by exactly that hidden
// distance, landing right at the beam's real visible edge. beamLevels
// secondary/fractional levels between the tip and the notehead add one
// beam step each: whether they stack toward this notehead (the stem passes
// through them) or away from it (the stem is extended out to them), the
// surface facing the notehead is that many steps nearer the notehead than
// the tip's own level.
export function stemBeamJunctionPosition(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  stemExtension: number,
  beamLevels = 0
): { x: number; y: number } {
  const { x, y } = stemTipPosition(stemUp, duration, noFlags, stemExtension);
  const hiddenPastSurfacePx =
    (stemUp ? BEAM_THICKNESS_PX - STEM_OVERLAP_PX : STEM_OVERLAP_PX) +
    beamLevels * (BEAM_THICKNESS_PX + BEAM_GAP_PX);
  const towardNoteSign = stemUp ? 1 : -1;
  return { x, y: y + (towardNoteSign * hiddenPastSurfacePx) / NOTE_SCALE };
}

// Pixel Y of where a stem-up tip would sit, regardless of the note's actual
// stem direction — per createNoteSvg's own stem geometry, a stem-up tip is
// at NOTE_Y_STEM_START minus any external stemExtension (no flag-count
// dependency: extra flags on a stem-up note extend the *head* end of the
// stem, not the tip — see createNoteSvg's stemY1/stemY2). Used only by the
// grace slur's descending-group stem-tip anchoring (see buildGraceSlur).
export function stemUpTipYPx(stemExtension = 0): number {
  return NOTE_STEM_TIP_Y_OFFSET - stemExtension;
}
