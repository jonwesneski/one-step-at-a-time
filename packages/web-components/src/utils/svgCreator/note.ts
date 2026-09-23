// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space

import { durationToFlagCountMap } from '../../rules/theoryConsts';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  DurationType,
  DynamicMarking,
  HairpinKind,
  StressType,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  STAFF_TOP_LINE_Y,
  TRILL_ABOVE_STAFF_GAP_PX,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  appendArpeggioHairpin,
  createArpeggioSvg,
  isArpeggioWaveVariant,
} from './arpeggio';
import { createArticulationMarks } from './articulations';
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
export const NOTE_Y_STEM_START = 100;
export const NOTE_STEM_TIP_Y_OFFSET = NOTE_Y_STEM_START * NOTE_SCALE; // stem tip y for stem-up (~5.33px)
// Y offset used to align the notehead with a staff line when positioning the note SVG.
// = Math.round(10 + (NOTE_Y_STEM_START + 760) * NOTE_SCALE). Must stay in sync with
// createNoteSvg's yHeadOffset formula for the base stem length (no flag extension).
export const NOTE_Y_HEAD_OFFSET_STEM_UP = 47; // Math.round(10 + 700 * (32/600))
const BASE_STEM_LENGTH = 600; // ~32px at NOTE_SCALE (~4 staff line spaces)
const STEM_WIDTH = 22;
const HEAD_WIDTH = 80;
const FLAG_Y_SPACING = 120;
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

/**
 * Extra pixels added to the stem-down tip offset for notes with more than one
 * flag. The note SVG extends the stem by (flagCount - 1) * FLAG_Y_SPACING
 * coordinate units for each additional flag beyond the first (sixteenth, 32nd,
 * etc.). This extension grows downward, so only stem-down beams are affected.
 */
export function flagStemExtensionPx(flagCount: number): number {
  return flagCount > 1 ? (flagCount - 1) * FLAG_Y_SPACING * NOTE_SCALE : 0;
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
  qualifiedElementName?: 'svg' | 'g';
  accidental?: AccidentalType;
  articulation?: ArticulationType | null;
  stress?: StressType | null;
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
  stemUp = true,
  stemExtension = 0,
  qualifiedElementName = 'svg',
  accidental,
  articulation,
  stress,
  arpeggio,
  arpeggioHairpin = null,
  arpeggioHairpinFrom = null,
  arpeggioHairpinTo = null,
  trill = false,
  trillAccidental = null,
  staffY = null,
  trillSignExtraLift = 0,
}: NoteProps): [SVGElement | SVGGElement, number] => {
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

  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;

  // Extend stem on larger flag counts
  const flagStemExtension =
    !noFlags && flagCount > 1 ? (flagCount - 1) * FLAG_Y_SPACING : 0;
  const yStemEnd = NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension;

  // Stem
  const stemX = stemUp
    ? xStart + HEAD_WIDTH - 15
    : xStart + STEM_WIDTH - HEAD_WIDTH + 5;
  if (!noStem && duration !== 'whole' && duration !== 'double-whole') {
    const stemExtensionInternal = stemExtension / NOTE_SCALE;
    // Stem-up: right side of head, tip at top (y1), head end at bottom (y2).
    // Stem-down: left side of head, head end at top (y1), tip at bottom (y2).
    const stemY1 = stemUp
      ? NOTE_Y_STEM_START - stemExtensionInternal
      : HEAD_WIDTH;
    const stemY2 = stemUp
      ? yStemEnd
      : HEAD_WIDTH +
        BASE_STEM_LENGTH +
        flagStemExtension +
        stemExtensionInternal;
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
    stem.setAttribute('stroke-width', STEM_WIDTH.toString());
    g.appendChild(stem);
  }

  // Flag(s)
  if (!noStem && !noFlags && flagCount > 0) {
    const xFlagStart = stemX;
    const flag = document.createElementNS(SVG_NS, 'g');
    flag.classList.add('flag');

    const flagName = 'single-flag';
    const singleFlag = document.createElementNS(SVG_NS, 'path');
    singleFlag.classList.add(flagName);
    singleFlag.id = flagName;
    const stemExtensionInternal = stemExtension / NOTE_SCALE;

    let flagPath: string;
    let flagYStep: number;
    if (stemUp) {
      // Stem tip is at the top; flag sweeps right and downward.
      // Filled closed tapered shape: wide at the base (stem attachment), narrows
      // toward the bottom. Outer curve sweeps right/down; inner curve returns to
      // a narrow point near the base.
      const yFlagTip = NOTE_Y_STEM_START - stemExtensionInternal;
      const yFlagBase = yFlagTip + 100;
      flagPath = `M${xFlagStart},${yFlagBase}
       Q${xFlagStart + 160},${yFlagBase + 40}
         ${xFlagStart + 140},${yFlagBase + 260}
       C${xFlagStart + 160},${yFlagBase + -60}
         ${xFlagStart + 20},${yFlagTip + 100}
         ${xFlagStart},${yFlagTip}
       Z`;
      // Additional flags stack downward along the stem (toward the head).
      flagYStep = FLAG_Y_SPACING;
    } else {
      // Stem tip is at the bottom; flag sweeps right and upward (mirror of stem-up).
      const yFlagTip =
        HEAD_WIDTH +
        BASE_STEM_LENGTH +
        flagStemExtension +
        stemExtensionInternal;
      const yFlagBase = yFlagTip - 100;
      flagPath = `M${xFlagStart},${yFlagBase}
       Q${xFlagStart + 160},${yFlagBase - 40}
         ${xFlagStart + 140},${yFlagBase - 260}
       C${xFlagStart + 160},${yFlagBase + 60}
         ${xFlagStart + 20},${yFlagTip - 100}
         ${xFlagStart},${yFlagTip}
       Z`;
      // Additional flags stack upward along the stem (toward the head).
      flagYStep = -FLAG_Y_SPACING;
    }

    singleFlag.setAttribute('d', flagPath);
    singleFlag.setAttribute('fill', 'currentColor');
    singleFlag.setAttribute('stroke', 'currentColor');
    singleFlag.setAttribute('stroke-width', '5');
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
  const headXStartStr = stemUp
    ? (xStart - 10).toString()
    : (xStart + STEM_WIDTH).toString();
  const headYStartStr = stemUp ? yStemEnd.toString() : HEAD_WIDTH.toString();
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
  headHitZone.setAttribute('rx', (HEAD_WIDTH * 1.5).toString());
  headHitZone.setAttribute('ry', (HEAD_WIDTH * 0.75 * 1.5).toString());
  headHitZone.setAttribute(
    'transform',
    `rotate(-30 ${headXStartStr} ${headYStartStr})`
  );
  headHitZone.setAttribute('fill', 'transparent');
  headHitZone.setAttribute('stroke', 'none');
  g.appendChild(headHitZone);

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

  if (duration === 'double-whole') {
    const headCx = stemUp ? xStart - 10 : xStart + STEM_WIDTH;
    const headCy = stemUp ? yStemEnd : HEAD_WIDTH;
    const barHalfHeight = HEAD_WIDTH * 0.75 + 20;
    const barY1 = headCy - barHalfHeight;
    const barY2 = headCy + barHalfHeight;
    const barInnerGap = HEAD_WIDTH + 20;
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
  });
  if (articulationMarks) {
    g.appendChild(articulationMarks);
    svg.setAttribute('overflow', 'visible');
  }

  svg.appendChild(g);

  if (accidental && qualifiedElementName === 'svg') {
    const symbolWidth = ACCIDENTAL_SYMBOL_WIDTH[accidental];
    const symbolHeight = ACCIDENTAL_SYMBOL_HEIGHT[accidental];
    const yHeadCenter = stemUp
      ? NOTE_Y_HEAD_OFFSET_STEM_UP
      : NOTE_Y_HEAD_OFFSET_STEM_DOWN;

    const symbolSvg = createAccidentalSvg(accidental);

    symbolSvg.setAttribute('x', `${-(symbolWidth + ACCIDENTAL_NOTE_GAP)}`);
    symbolSvg.setAttribute('y', `${yHeadCenter - symbolHeight / 2}`);
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(symbolSvg);
  }

  if (arpeggio && qualifiedElementName === 'svg') {
    const headCenterY = stemUp
      ? NOTE_Y_HEAD_OFFSET_STEM_UP
      : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
    const headLeftX =
      (stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX) -
      NOTE_HEAD_RADIUS_PX;
    const accidentalLeftX = accidental
      ? -(ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP)
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
  noFlags: boolean
): number {
  const { cy } = noteHeadCenter(stemUp, duration, noFlags);
  return Math.round(NOTE_HEAD_Y_OFFSET_CORRECTION + cy * NOTE_SCALE);
}

export function noteHeadCenter(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean
): { cx: number; cy: number } {
  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension =
    !noFlags && flagCount > 1 ? (flagCount - 1) * FLAG_Y_SPACING : 0;
  const yStemEnd = NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension;
  return {
    cx: stemUp ? xStart - 10 : xStart + STEM_WIDTH,
    cy: stemUp ? yStemEnd : HEAD_WIDTH,
  };
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
