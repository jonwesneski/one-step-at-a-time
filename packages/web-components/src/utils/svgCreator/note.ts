import { contourMinLengthPx } from '../../rules/bendContourRules';
import type { Phoneme } from '../../rules/phonemeRules';
import { signStackHeightPx } from '../../rules/signRules';
import type { SignPlacement } from '../../types/elements';
import { createStandalonePhonemesSvg } from './phonemes';
// Stem geometry constants derived from createNoteSvg()'s 600-unit coordinate space

import {
  accidentalPitchOffset,
  accidentalReach,
  accidentalSymbolWidth,
} from '../../rules/accidentalRules';
import {
  augmentationDotRowWidthPx,
  resolveNoteDotStaffY,
} from '../../rules/augmentationDotRules';
import { layoutBends, type ResolvedBend } from '../../rules/glissandoRules';
import {
  forcedStemUp,
  isHeadless,
  resolveNoteheadGlyph,
  suppressesAccidental,
  type NoteheadGlyph,
} from '../../rules/noteheadRules';
import {
  durationToBase,
  durationToDotCount,
  durationToFlagCountMap,
  isOpenDuration,
  isStemlessDuration,
} from '../../rules/theoryConsts';
import {
  resolveStrokePlacement,
  STAFF_BAND,
  stemEndingFor,
  stemMarkHalfHeightPx,
  TREMOLO_STROKE_HALF_HEIGHT_PX,
} from '../../rules/tremoloRules';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  BreathMark,
  DurationType,
  DynamicMarking,
  HairpinKind,
  NoteheadType,
  NoteSign,
  NoteSize,
  StemMark,
  StressType,
  TremoloLabel,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ARPEGGIO_CHORD_GAP_PX,
  AUGMENTATION_DOT_DIAMETER_PX,
  AUGMENTATION_DOT_NOTEHEAD_GAP_PX,
  AUGMENTATION_DOT_TAIL_CLEARANCE_PX,
  AUGMENTATION_DOT_TAIL_GAP_PX,
  BASE_STEM_LENGTH_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  BEND_STANDALONE_LENGTH_PX,
  BREATH_MARK_INK_GAP_PX,
  BREATH_MARK_STANDALONE_GAP_PX,
  CUE_SCALE,
  DOWN_TAIL_HEAD_ROOM_PX,
  FLAG_STEM_STEP_PX,
  QUAVER_TAIL_LENGTH_PX,
  SIGN_GAP_PX,
  STACKED_TAIL_LENGTH_PX,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STEM_OVERLAP_PX,
  STEM_STROKE_WIDTH_PX,
  TREMOLO_NUMERAL_GAP_PX,
  TRILL_ABOVE_STAFF_GAP_PX,
  TUPLET_NUMERAL_FONT_SIZE,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  appendArpeggioHairpin,
  createArpeggioSvg,
  isArpeggioWaveVariant,
} from './arpeggio';
import {
  articulationStackDepth,
  createArticulationMarks,
} from './articulations';
import { createAugmentationDotsSvg } from './augmentationDots';
import { breathMarkWidthPx, createBreathMarkSvg } from './breathMarks';
import { bendTargetWidthPx, createBendSvg } from './glissando';
import {
  createNoteheadGlyphPath,
  placeNoteheadGlyph,
  type NoteheadPlacement,
} from './noteheads';
import { createSignsSvg } from './signs';
import { createStemMarkSvg } from './stemMark';
import {
  appendTechniqueLabels,
  appendTechniqueTextBelow,
  techniqueLabels,
  type TechniqueLabel,
} from './techniqueLabel';
import { createTremoloNumeral, createTremoloStrokes } from './tremolo';
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

/** How large a note of `size` is drawn against a full-size one. */
export const noteSizeScale = (size: NoteSize): number =>
  size === 'cue' ? CUE_SCALE : 1;

// Notehead geometry in pixel space — used by ledgerLines.ts and chord.ts
export const NOTE_HEAD_RADIUS_PX = HEAD_WIDTH * NOTE_SCALE; // ≈ 4.27px
// Also the length of a fractional beam.
export const NOTEHEAD_WIDTH_PX = 2 * NOTE_HEAD_RADIUS_PX;
export const ADJACENT_NOTE_X_DISPLACEMENT_PX = 150 * NOTE_SCALE; // = 8px
// Moves a down-stem head right so its stem lines up with an up-stem head's
// stem a second away in another voice (~6.3px).
export const OPPOSITE_STEM_ALIGN_OFFSET_PX =
  NOTE_STEM_X_OFFSET - NOTE_STEM_X_OFFSET_STEM_DOWN;
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
  // A reminder accidental, drawn in parentheses.
  accidentalParenthesized?: boolean;
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
  // multi-voice staff (see StaffNotationElementBase#trillLineLift,
  // which computes the same value the sibling trill line/notch use, so the
  // sign and line move together as one visual unit).
  trillSignExtraLift?: number;
  // Staff-resolved dot rows (see INoteElement.augmentationDotRows).
  augmentationDotRows?: readonly number[] | null;
  // See INoteElement.augmentationDotShiftPx.
  augmentationDotShiftPx?: number;
  // Another voice draws the head this note shares in a unison; the stem,
  // flags, ledger lines and accidental are still drawn.
  omitsHead?: boolean;
  // Tremolo strokes to draw (resolved from the `tremolo` value); 0 for none.
  tremoloStrokeCount?: number;
  // A `stem-mark="cross"`.
  stemMark?: StemMark | null;
  signs?: readonly NoteSign[] | null;
  // The staff's placement of the signs; null stacks them above the note's own
  // ink.
  signPlacement?: SignPlacement | null;
  // Tuplet numeral beyond the stem's end (or the strokes on a stemless head).
  tremoloTuplet?: number | null;
  // Times the articulation's length mark repeats across a row.
  articulationRepeatCount?: number;
  // Drawn above the note only standalone; a staff draws its own row.
  tremoloLabel?: TremoloLabel | null;
  glissandoLabel?: string | null;
  techniqueText?: TechniqueLabel | null;
  techniqueTextBelow?: boolean;
  // Drawn under the note only standalone; a staff draws its own row.
  phonemes?: readonly Phoneme[] | null;
  // Drawn just after the note only standalone; a staff places it in the gap
  // before the next entry.
  breathMark?: BreathMark | null;
  // A standalone note's bend.
  bend?: ResolvedBend | null;
  // CUE_SCALE for a cue-sized note.
  scale?: number;
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
  accidentalParenthesized = false,
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
  augmentationDotRows = null,
  augmentationDotShiftPx = 0,
  omitsHead = false,
  tremoloStrokeCount = 0,
  stemMark = null,
  signs = null,
  signPlacement = null,
  tremoloTuplet = null,
  articulationRepeatCount = 1,
  tremoloLabel = null,
  glissandoLabel = null,
  techniqueText = null,
  techniqueTextBelow = false,
  phonemes = null,
  breathMark = null,
  bend = null,
  scale = 1,
}: NoteProps): [SVGElement | SVGGElement, number] => {
  const stemUp = forcedStemUp(notehead) ?? requestedStemUp;
  const headGeometry = noteHeadGeometry(
    stemUp,
    duration,
    noFlags,
    notehead,
    scale
  );
  const leftOverhang = noteHeadLeftOverhangPx(
    stemUp,
    duration,
    notehead,
    scale
  );
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
    stemExtension,
    scale
  );
  if (!noStem && !isStemlessDuration(duration)) {
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
      ((scale * STEM_STROKE_WIDTH_PX) / NOTE_SCALE).toString()
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

    const tailLength =
      tailLengthPx(stemUp, flagCount, tailRoomStemExtension, scale) /
      NOTE_SCALE;
    const tailXScale = (scale * STAFF_LINE_SPACING) / NOTE_SCALE;
    const tailYScale =
      tailLength / (stemUp ? TAIL_UP_NATURAL_HEIGHT : TAIL_DOWN_NATURAL_HEIGHT);
    const tailTopY = stemUp ? stemTipY : stemTipY - tailLength;
    // Additional tails stack along the stem, toward the head.
    const flagYStep = scale * (stemUp ? FLAG_Y_SPACING : -FLAG_Y_SPACING);

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
  const headFill = isOpenDuration(duration) ? 'none' : 'currentColor';

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
  const headless = isHeadless(notehead);
  // The shared head of a unison is drawn by the other voice's note.
  if (!omitsHead && !headless) {
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
      head.setAttribute('rx', headGeometry.halfWidth.toString());
      head.setAttribute('ry', headGeometry.halfHeight.toString());
      head.setAttribute(
        'transform',
        `rotate(-30 ${headXStartStr} ${headYStartStr})`
      );
      head.setAttribute('stroke', 'currentColor');
      head.setAttribute('fill', headFill);
      head.setAttribute('stroke-width', `${30 * scale}`);
      g.appendChild(head);
    }
  }

  if (durationToBase[duration] === 'double-whole' && !headless) {
    const headCx = headGeometry.cx;
    const headCy = headGeometry.cy;
    const barHalfHeight = headGeometry.halfHeight + 20 * scale;
    const barY1 = headCy - barHalfHeight;
    const barY2 = headCy + barHalfHeight;
    const barInnerGap = headGeometry.halfWidth + 20 * scale;
    const barOuterGap = barInnerGap + scale * (STEM_WIDTH + 10);

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
      bar.setAttribute('stroke-width', `${scale * STEM_WIDTH}`);
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
    noteHeadCenterY:
      Number(headYStartStr) -
      (signs !== null && !stemUp && articulationStemAnchorBeamLevels === null
        ? (signPlacement?.articulationLiftPx ?? 0) / NOTE_SCALE
        : 0),
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
    repeatCount: articulationRepeatCount,
    scale,
  });
  if (articulationMarks) {
    g.appendChild(articulationMarks);
    svg.setAttribute('overflow', 'visible');
  }

  svg.appendChild(g);

  const stemless = isStemlessDuration(duration);
  const headCenterPxY = headGeometry.cy * NOTE_SCALE;
  // Outermost ink (px) on the side above the head, for a standalone label.
  let inkTopY = headCenterPxY - headGeometry.halfHeight * NOTE_SCALE;
  if (!stemUp) {
    inkTopY = Math.min(
      inkTopY,
      headCenterPxY -
        articulationStackDepth(articulation, stress, scale) * NOTE_SCALE
    );
  }
  // A breath mark sits beside the stem, clear of whatever is above the head.
  const besideStemTopY = inkTopY;
  if (stemUp && !stemless && !noStem) {
    inkTopY = Math.min(inkTopY, stemTipY * NOTE_SCALE);
  }
  // Lowest ink (px), for a standalone text below.
  let inkBottomY = headCenterPxY + headGeometry.halfHeight * NOTE_SCALE;
  if (stemUp) {
    inkBottomY = Math.max(
      inkBottomY,
      headCenterPxY +
        articulationStackDepth(articulation, stress, scale) * NOTE_SCALE
    );
  } else if (!stemless && !noStem) {
    inkBottomY = Math.max(inkBottomY, stemTipY * NOTE_SCALE);
  }
  if ((tremoloStrokeCount > 0 || stemMark !== null) && (stemless || !noStem)) {
    // Standalone, the head stands in for staff Y 0 and nothing snaps to lines.
    const headStaffY = staffY ?? 0;
    const ending = stemEndingFor(duration, noFlags);
    const { centerYs, markCenterY } = resolveStrokePlacement({
      headY: headStaffY,
      stemUp,
      stemMark,
      strokeCount: tremoloStrokeCount,
      staff: staffY === null ? null : STAFF_BAND,
      stemLengthPx: stemless
        ? null
        : scale * BASE_STEM_LENGTH_PX +
          stemExtension +
          (ending.kind === 'beam' ? STEM_OVERLAP_PX : 0),
      ending,
      canLengthenStem: false,
    });
    const strokeX = (stemless ? headGeometry.cx : stemX) * NOTE_SCALE;
    const strokeYs = centerYs.map((y) => headCenterPxY + y - headStaffY);
    svg.setAttribute('overflow', 'visible');
    if (stemMark !== null && markCenterY !== null) {
      const crossY = headCenterPxY + markCenterY - headStaffY;
      svg.appendChild(createStemMarkSvg(stemMark, strokeX, crossY, scale));
      if (stemless && stemUp) {
        inkTopY = Math.min(
          inkTopY,
          crossY - scale * stemMarkHalfHeightPx(stemMark)
        );
      }
    }
    if (strokeYs.length > 0) {
      svg.appendChild(createTremoloStrokes(strokeX, strokeYs, scale));
    }
    if (stemless && stemUp && strokeYs.length > 0) {
      inkTopY = Math.min(
        inkTopY,
        strokeYs[strokeYs.length - 1] - TREMOLO_STROKE_HALF_HEIGHT_PX
      );
    }

    if (tremoloTuplet !== null && strokeYs.length > 0) {
      const outward = stemUp ? -1 : 1;
      const outerEdgeY = stemless
        ? strokeYs[strokeYs.length - 1] +
          outward * TREMOLO_STROKE_HALF_HEIGHT_PX
        : stemTipY * NOTE_SCALE +
          (ending.kind === 'beam' ? outward * STEM_OVERLAP_PX : 0);
      const numeralY =
        outerEdgeY +
        outward * (TREMOLO_NUMERAL_GAP_PX + TUPLET_NUMERAL_FONT_SIZE / 2);
      svg.appendChild(createTremoloNumeral(strokeX, numeralY, tremoloTuplet));
      if (stemUp) {
        inkTopY = Math.min(inkTopY, numeralY - TUPLET_NUMERAL_FONT_SIZE / 2);
      }
    }
  }

  if (signs !== null) {
    const signsBottomY =
      signPlacement !== null && staffY !== null
        ? headCenterPxY + signPlacement.bottomY - staffY
        : inkTopY - SIGN_GAP_PX;
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(
      createSignsSvg(
        signs,
        (headless && !stemless ? stemX : headGeometry.cx) * NOTE_SCALE,
        signsBottomY
      )
    );
    inkTopY = Math.min(inkTopY, signsBottomY - signStackHeightPx(signs));
  }

  if (qualifiedElementName === 'svg') {
    const headLeftX = (headGeometry.cx - headGeometry.halfWidth) * NOTE_SCALE;
    appendTechniqueLabels(
      svg,
      headLeftX,
      inkTopY,
      techniqueLabels(
        tremoloLabel,
        glissandoLabel,
        techniqueTextBelow ? null : techniqueText
      )
    );
    let belowBottomY = inkBottomY;
    if (techniqueTextBelow && techniqueText !== null) {
      belowBottomY = appendTechniqueTextBelow(
        svg,
        headLeftX,
        inkBottomY,
        techniqueText
      );
    }
    if (phonemes !== null) {
      svg.setAttribute('overflow', 'visible');
      svg.appendChild(
        createStandalonePhonemesSvg(
          phonemes,
          headGeometry.cx * NOTE_SCALE,
          belowBottomY
        )
      );
    }
  }

  const dotLayout = noteAugmentationDotLayout({
    duration,
    stemUp,
    noFlags,
    noStem,
    notehead,
    stemExtension,
    staffY,
    rowStaffYs: augmentationDotRows,
    columnShiftPx: augmentationDotShiftPx,
    scale,
  });
  const dots = dotLayout && createAugmentationDotsSvg(dotLayout);
  if (dots) {
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(dots);
  }

  if (breathMark !== null && qualifiedElementName === 'svg') {
    const tailRightX =
      stemUp && !noStem && !noFlags && flagCount > 0
        ? stemX * NOTE_SCALE + scale * TAIL_UP_WIDTH_PX
        : -Infinity;
    const rightX = Math.max(
      (headGeometry.cx + headGeometry.halfWidth) * NOTE_SCALE,
      dotLayout?.rightEdgeX ?? -Infinity,
      tailRightX
    );
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(
      createBreathMarkSvg(
        breathMark,
        rightX +
          BREATH_MARK_STANDALONE_GAP_PX +
          breathMarkWidthPx(breathMark) / 2,
        besideStemTopY - BREATH_MARK_INK_GAP_PX
      )
    );
  }

  if (bend !== null && qualifiedElementName === 'svg') {
    const headY = headGeometry.cy * NOTE_SCALE;
    const tail = upTailInk({
      duration,
      stemUp,
      noFlags,
      noStem,
      stemExtension,
      tailRoomStemExtension,
      scale,
    });
    const layout = layoutBends({
      heads: [
        {
          y: headY,
          dotY: dotLayout?.rowCentersY[0] ?? null,
          staffY: null,
          bend,
        },
      ],
      inkRight: Math.max(
        (headGeometry.cx + headGeometry.halfWidth) * NOTE_SCALE,
        dotLayout?.rightEdgeX ?? -Infinity
      ),
      tail: tail && { right: tail.rightX, bottomY: tail.bottomY },
      limit: {
        kind: 'length',
        length: Math.max(
          BEND_STANDALONE_LENGTH_PX,
          contourMinLengthPx(bend.contour?.length ?? 0)
        ),
      },
      targetWidthPx: bendTargetWidthPx,
    });
    if (layout !== null) {
      svg.setAttribute('overflow', 'visible');
      svg.appendChild(createBendSvg(layout));
    }
  }

  if (
    accidental &&
    qualifiedElementName === 'svg' &&
    !suppressesAccidental(notehead)
  ) {
    const symbolWidth = accidentalSymbolWidth(
      accidental,
      accidentalParenthesized
    );
    const yHeadCenter = headGeometry.cy * NOTE_SCALE;

    const symbolSvg = createAccidentalSvg(accidental, accidentalParenthesized);
    symbolSvg.classList.add('accidental');
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(
      placeAccidentalSvg(
        symbolSvg,
        cueLeftShiftPx(stemUp, scale) -
          leftOverhang -
          scale * (symbolWidth + ACCIDENTAL_NOTE_GAP),
        yHeadCenter - scale * accidentalPitchOffset(accidental),
        scale
      )
    );
  }

  if (arpeggio && qualifiedElementName === 'svg' && !headless) {
    const headCenterY = headGeometry.cy * NOTE_SCALE;
    const headLeftX = (headGeometry.cx - headGeometry.halfWidth) * NOTE_SCALE;
    const accidentalLeftX =
      accidental && !suppressesAccidental(notehead)
        ? cueLeftShiftPx(stemUp, scale) -
          leftOverhang -
          scale *
            (accidentalReach(accidental, accidentalParenthesized) +
              ACCIDENTAL_NOTE_GAP)
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
        signRightEdgeX,
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

// Length (px) of each drawn tail.
function tailLengthPx(
  stemUp: boolean,
  flagCount: number,
  tailRoomStemExtension: number,
  scale = 1
): number {
  if (scale !== 1) {
    return (
      scale * tailLengthPx(stemUp, flagCount, tailRoomStemExtension / scale)
    );
  }
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
  return stemUp
    ? unfittedTailLengthPx
    : Math.min(
        unfittedTailLengthPx,
        tailRoomPx -
          (flagCount - 1) * FLAG_STEM_STEP_PX -
          DOWN_TAIL_HEAD_ROOM_PX
      );
}

export type NoteDotLayoutInput = {
  duration: DurationType;
  stemUp: boolean;
  noFlags: boolean;
  noStem: boolean;
  notehead: NoteheadType;
  stemExtension: number;
  // Staff Y of the head, or null standalone (dots stay at the head's centre).
  staffY: number | null;
  // Overrides the head's own dot row (another voice placed it).
  rowStaffYs?: readonly number[] | null;
  // Moves the dot column right, past another voice's head (a unison's one
  // dotted part dots after the whole group).
  columnShiftPx?: number;
  scale?: number;
};

export type NoteDotLayout = {
  dotCount: number;
  leftX: number;
  rowCentersY: number[];
  rightEdgeX: number;
  scale?: number;
};

/**
 * Where a lone note's dots go, in its own SVG's px space: half a space past
 * the head, in the head's space (or the space above a line), moved right of
 * an up-stem tail whose end would otherwise cover them.
 */
export function noteAugmentationDotLayout({
  duration,
  stemUp: requestedStemUp,
  noFlags,
  noStem,
  notehead,
  stemExtension,
  staffY,
  rowStaffYs = null,
  columnShiftPx = 0,
  scale = 1,
}: NoteDotLayoutInput): NoteDotLayout | null {
  const dotCount = durationToDotCount[duration];
  if (dotCount === 0 || rowStaffYs?.length === 0 || isHeadless(notehead)) {
    return null;
  }
  const stemUp = forcedStemUp(notehead) ?? requestedStemUp;
  const head = noteHeadGeometry(stemUp, duration, noFlags, notehead, scale);
  const headCenterY = head.cy * NOTE_SCALE;
  const rowCentersY =
    staffY === null
      ? [headCenterY]
      : (rowStaffYs ?? [resolveNoteDotStaffY(staffY)]).map(
          (row) => headCenterY + row - staffY
        );
  let leftX =
    (head.cx + head.halfWidth) * NOTE_SCALE +
    scale * AUGMENTATION_DOT_NOTEHEAD_GAP_PX;
  const tailClearX = upTailDotClearX({
    duration,
    stemUp,
    noFlags,
    noStem,
    stemExtension,
    tailRoomStemExtension: stemExtension,
    rowCentersY,
    scale,
  });
  if (tailClearX !== null) {
    leftX = Math.max(leftX, tailClearX);
  }
  leftX += columnShiftPx;
  return {
    dotCount,
    leftX,
    rowCentersY,
    rightEdgeX: leftX + augmentationDotRowWidthPx(dotCount, scale),
    scale,
  };
}

type UpTailInput = {
  duration: DurationType;
  stemUp: boolean;
  noFlags: boolean;
  noStem: boolean;
  stemExtension: number;
  tailRoomStemExtension: number;
  scale?: number;
};

/**
 * How far right and down (note-local px) an unbeamed up-stem's tails reach,
 * or null with none.
 */
export function upTailInk({
  duration,
  stemUp,
  noFlags,
  noStem,
  stemExtension,
  tailRoomStemExtension,
  scale = 1,
}: UpTailInput): { rightX: number; bottomY: number } | null {
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  if (!stemUp || noStem || noFlags || flagCount === 0) {
    return null;
  }
  const { x: stemX, y: stemTipY } = stemTipPosition(
    stemUp,
    duration,
    noFlags,
    stemExtension,
    scale
  );
  return {
    rightX: stemX * NOTE_SCALE + scale * TAIL_UP_WIDTH_PX,
    bottomY:
      (stemTipY + scale * (flagCount - 1) * FLAG_Y_SPACING) * NOTE_SCALE +
      tailLengthPx(stemUp, flagCount, tailRoomStemExtension, scale),
  };
}

/**
 * The x (note-local px) a dot row must start at to clear an unbeamed
 * up-stem's tails, or null when the tails end clear of every row.
 */
export function upTailDotClearX({
  rowCentersY,
  ...tailInput
}: UpTailInput & { rowCentersY: readonly number[] }): number | null {
  const tail = upTailInk(tailInput);
  if (tail === null) {
    return null;
  }
  const scale = tailInput.scale ?? 1;
  const dotTopY =
    Math.min(...rowCentersY) - (scale * AUGMENTATION_DOT_DIAMETER_PX) / 2;
  return tail.bottomY + AUGMENTATION_DOT_TAIL_CLEARANCE_PX <= dotTopY
    ? null
    : tail.rightX + scale * AUGMENTATION_DOT_TAIL_GAP_PX;
}

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
  noFlags: boolean,
  notehead: NoteheadType = 'normal',
  scale = 1
): { cx: number; cy: number } {
  const { cx, cy } = noteHeadGeometry(
    stemUp,
    duration,
    noFlags,
    notehead,
    scale
  );
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

// A cue-sized note is the full-size one drawn `scale` times as large about
// the ellipse head's left edge and the head's centre (600-unit space), so its
// head keeps its place on the stave and the stem column stays the same for
// every notehead.
function scaleOriginX(stemUp: boolean): number {
  return (
    (stemUp ? COORD_WIDTH / 2 - 10 : COORD_WIDTH / 2 + STEM_WIDTH) - HEAD_WIDTH
  );
}

function headCenterY(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean
): number {
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension = noFlags ? 0 : flagStemExtensionUnits(flagCount);
  return stemUp
    ? NOTE_Y_STEM_START + BASE_STEM_LENGTH + flagStemExtension
    : HEAD_WIDTH;
}

// Notehead geometry in the 600-unit space. The stem column is the same for
// every notehead; a glyph head is translated so its stem anchor lands on it.
export function noteHeadGeometry(
  requestedStemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType = 'normal',
  scale = 1
): NoteHeadGeometry {
  const full = fullSizeNoteHeadGeometry(
    requestedStemUp,
    duration,
    noFlags,
    notehead
  );
  if (scale === 1) {
    return full;
  }
  const originX = scaleOriginX(forcedStemUp(notehead) ?? requestedStemUp);
  const x = (value: number): number => originX + scale * (value - originX);
  const y = (value: number): number => full.cy + scale * (value - full.cy);
  return {
    cx: x(full.cx),
    cy: full.cy,
    halfWidth: scale * full.halfWidth,
    halfHeight: scale * full.halfHeight,
    anchorY: y(full.anchorY),
    glyph: full.glyph,
    placement: full.placement && {
      cx: x(full.placement.cx),
      cy: full.cy,
      halfWidth: scale * full.placement.halfWidth,
      halfHeight: scale * full.placement.halfHeight,
      anchorY: y(full.placement.anchorY),
      originX: x(full.placement.originX),
      originY: y(full.placement.originY),
      scale: scale * full.placement.scale,
    },
  };
}

function fullSizeNoteHeadGeometry(
  requestedStemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType
): NoteHeadGeometry {
  const stemUp = forcedStemUp(notehead) ?? requestedStemUp;
  const xStart = COORD_WIDTH / 2;
  const cy = headCenterY(stemUp, duration, noFlags);
  const upStemEllipseCx = xStart - 10;
  const ellipseCx = stemUp ? upStemEllipseCx : xStart + STEM_WIDTH;
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
    // A semibreve has no stem to stand on either side of, so it starts where
    // an up-stem ellipse does, whichever way its voice's stems point.
    ...(glyph === 'whole'
      ? { leftX: upStemEllipseCx - HEAD_WIDTH }
      : isStemlessDuration(duration)
      ? { centreX: ellipseCx }
      : {}),
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
  notehead: NoteheadType = 'normal',
  scale = 1
): number {
  const ellipse = noteHeadGeometry(stemUp, duration, false);
  const head = noteHeadGeometry(stemUp, duration, false, notehead);
  return (
    scale *
    Math.max(
      0,
      (ellipse.cx - ellipse.halfWidth - (head.cx - head.halfWidth)) * NOTE_SCALE
    )
  );
}

// How far (px) right a cue note's left decorations move: what stands left of
// the box's left edge keeps its distance from the head's left edge at scale.
export function cueLeftShiftPx(stemUp: boolean, scale: number): number {
  return (1 - scale) * scaleOriginX(stemUp) * NOTE_SCALE;
}

/** What a cue note reaches left of its box, from the full size's reach. */
export function cueLeftwardExtentPx(
  fullExtentPx: number,
  stemUp: boolean,
  scale: number
): number {
  return fullExtentPx === 0
    ? 0
    : Math.max(0, scale * fullExtentPx - cueLeftShiftPx(stemUp, scale));
}

// An accidental's glyph at (x, y), drawn at `scale` from there.
export function placeAccidentalSvg(
  symbol: SVGElement,
  x: number,
  y: number,
  scale: number
): SVGElement {
  if (scale === 1) {
    symbol.setAttribute('x', `${x}`);
    symbol.setAttribute('y', `${y}`);
    return symbol;
  }
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
  group.appendChild(symbol);
  return group;
}

// How far (px) right of the note's box centre a semibreve is centred; every
// other full-size head is taken to be at the box's centre, and a cue head
// moves left with its smaller width.
export function noteHeadCenterShiftPx(
  duration: DurationType,
  notehead: NoteheadType = 'normal',
  scale = 1
): number {
  const full = noteHeadGeometry(true, duration, false, notehead);
  const drawn = noteHeadGeometry(true, duration, false, notehead, scale);
  return (
    (resolveNoteheadGlyph(notehead, duration) === 'whole'
      ? full.cx * NOTE_SCALE - NOTE_SVG_WIDTH / 2
      : 0) +
    (drawn.cx - full.cx) * NOTE_SCALE
  );
}

// The stem tip (600-unit space), as createNoteSvg draws it. A cue note's
// base length and tail lengthening scale; `stemExtension` is real px beyond
// them.
export function stemTipPosition(
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  stemExtension: number,
  scale = 1
): { x: number; y: number } {
  const xStart = COORD_WIDTH / 2;
  const flagCount = durationToFlagCountMap.get(duration) ?? 0;
  const flagStemExtension = noFlags ? 0 : flagStemExtensionUnits(flagCount);
  const stemExtensionInternal = stemExtension / NOTE_SCALE;
  const originX = scaleOriginX(stemUp);
  const fullX = stemUp
    ? xStart + HEAD_WIDTH - 15
    : xStart + STEM_WIDTH - HEAD_WIDTH + 5;
  const cy = headCenterY(stemUp, duration, noFlags);
  const length =
    scale * (BASE_STEM_LENGTH + flagStemExtension) + stemExtensionInternal;
  return {
    x: originX + scale * (fullX - originX),
    y: stemUp ? cy - length : cy + length,
  };
}

// Where the stem meets the double-stemmed beam's visible surface facing the
// notehead (600-unit space): the inner-voice articulation anchor. The tip sits
// inside the beam polygon (by BEAM_THICKNESS_PX − STEM_OVERLAP_PX stem-up,
// STEM_OVERLAP_PX stem-down), and each of `beamLevels` adds one beam step.
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
    beamLevels * BEAM_STEP_PX;
  const towardNoteSign = stemUp ? 1 : -1;
  return { x, y: y + (towardNoteSign * hiddenPastSurfacePx) / NOTE_SCALE };
}

// Pixel Y of a stem-up tip, whatever the note's direction. Flags lengthen
// the head end, not the tip.
export function stemUpTipYPx(stemExtension = 0): number {
  return NOTE_STEM_TIP_Y_OFFSET - stemExtension;
}
