import {
  computeGraceBeamYs,
  computeGraceLayout,
  GraceNoteDescriptor,
} from '../../rules/graceRules';
import { computeLedgerLines } from '../../rules/staffNoteRules';
import { durationToFlagCountMap } from '../../rules/theoryConsts';
import type { GraceDuration, GraceSlur, GraceType } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  BASE_STEM_LENGTH_PX,
  GRACE_BEAM_COUNT,
  GRACE_BEAM_GAP_PX,
  GRACE_BEAM_THICKNESS_PX,
  GRACE_SCALE,
  GRACE_SLASH_HALF_HEIGHT_PX,
  GRACE_SLASH_HALF_WIDTH_PX,
  GRACE_SLASH_STROKE_WIDTH,
  GRACE_SLASH_TIP_INSET_PX,
  STAFF_Y_STEP,
  STEM_OVERLAP_PX,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import { createCurveSvg, DEFAULT_BULGE_HEIGHT } from './curve';
import {
  createNoteSvg,
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  noteHeadCenter,
} from './note';

// Full-size stem stroke is 22 units in the note's 600-unit space (≈1.17px);
// grace stems scale that down.
const GRACE_STEM_STROKE_WIDTH = 22 * NOTE_SCALE * GRACE_SCALE;
// Horizontal offset from a grace head center to its stem (stem-up — grace
// notes are always rendered stem-up).
export const GRACE_STEM_X_FROM_HEAD_CENTER =
  GRACE_SCALE * (NOTE_STEM_X_OFFSET - NOTE_HEAD_CX_STEM_UP_PX);
// Horizontal offset from a main notehead center to its stem when stem-down
// (stem sits left of the head center; symmetric with the stem-up offset).
export const MAIN_STEM_X_FROM_HEAD_CENTER =
  NOTE_HEAD_CX_STEM_DOWN_PX - NOTE_STEM_X_OFFSET_STEM_DOWN;
const GRACE_LEDGER_LINE_MARGIN = 2;
const GRACE_LEDGER_STROKE_WIDTH = '0.8';
// Vertical clearance between a notehead edge and the slur endpoints.
export const SLUR_HEAD_CLEARANCE_PX = 1.5;
// Extra horizontal clearance past a stem's own X offset, so the slur anchors
// clear of the stem instead of the stem crossing the slur's path.
const SLUR_STEM_CLEARANCE_PX = 1.5;
// Shared base clearance on both ends of the slur when it bulges above to
// avoid an accidental, so the visual gap matches on each side. Starting
// value — tune visually in Storybook.
const SLUR_ACCIDENTAL_CLEARANCE_PX = 1.5;
// Vertical clearance above a grace stem/beam tip. Padded beyond
// SLUR_ACCIDENTAL_CLEARANCE_PX because a group's outer beam layer renders
// STEM_OVERLAP_PX * GRACE_SCALE above the raw beam Y (a deliberate
// stem/beam-blend overlap), which would otherwise eat most of the margin —
// a render-overlap correction, not a stylistic gap choice, so it only
// applies to this (grace) side.
const SLUR_STEM_TIP_CLEARANCE_PX =
  SLUR_ACCIDENTAL_CLEARANCE_PX + STEM_OVERLAP_PX * GRACE_SCALE;

export type GraceNotesProps = {
  graceNotes: GraceNoteDescriptor[];
  graceType: GraceType;
  graceDuration: GraceDuration | null;
  graceSlur: GraceSlur;
  // Main notehead center in the host SVG's pixel space — the grace group's
  // own anchor (head positions, ledger lines) and the slur's landing target
  // when it bulges below (default). For a chord this is the reference note
  // (staffYCoordinates[0]), not necessarily the lowest pitch.
  mainHeadCenterXPx: number;
  mainHeadCenterYPx: number;
  // The chord's top (highest-pitch) note — same point as mainHeadCenterXPx/
  // YPx for a single note. Used only as the slur's landing target when it
  // bulges above (see buildGraceSlur): after arcing up and over, the curve
  // should land on the nearest (top) notehead rather than travel back down
  // past the other chord tones to reach the reference note.
  mainTopNoteXPx: number;
  mainTopNoteYPx: number;
  // Right edge available to the grace group — already left of the main
  // element's accidental footprint, including the grace-to-main gap.
  anchorRightXPx: number;
  // Whether the main element displays an accidental. True flips the slur
  // above the heads and anchors its grace-side start at the grace stem/beam
  // tip instead of the notehead (more clearance altitude). The main-side
  // endpoint's horizontal pullback (see buildGraceSlur) clears the
  // accidental's actual rendered edge directly — not an approximated
  // "footprint width" — so it's correct regardless of the accidental's
  // type or how many other accidentals/columns the chord has.
  mainAccidentalShown: boolean;
  // Main note's own stem direction. Stem-down puts the main stem on the same
  // (left) side the slur approaches from, so the slur needs extra horizontal
  // clearance on that end to avoid crossing it.
  mainStemUp: boolean;
  // Staff Y of the main notehead — enables grace ledger lines. null in
  // standalone mode (matching the main note's own ledger-line behavior).
  mainStaffY: number | null;
};

export function createGraceNotesSvg({
  graceNotes,
  graceType,
  graceDuration,
  graceSlur,
  mainHeadCenterXPx,
  mainHeadCenterYPx,
  mainTopNoteXPx,
  mainTopNoteYPx,
  anchorRightXPx,
  mainAccidentalShown,
  mainStemUp,
  mainStaffY,
}: GraceNotesProps): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  group.classList.add('grace-notes');

  const isGroup = graceNotes.length > 1;
  const writtenDuration = graceDuration ?? 'eighth';
  const layout = computeGraceLayout(graceNotes);
  const headXCenters = layout.headXCenters.map(
    (headXCenter) => anchorRightXPx - layout.totalWidth + headXCenter
  );
  const headYCenters = graceNotes.map(
    (graceNote) =>
      mainHeadCenterYPx - graceNote.relativeStaffSteps * STAFF_Y_STEP
  );

  appendLedgerLines(
    group,
    graceNotes,
    headXCenters,
    headYCenters,
    mainStaffY,
    mainHeadCenterYPx
  );

  const stemXs = headXCenters.map(
    (headXCenter) => headXCenter + GRACE_STEM_X_FROM_HEAD_CENTER
  );

  // Y of the first grace note's stem/beam tip — an alternate slur-start
  // anchor to the notehead, used when the slur must bulge above to clear a
  // main-element accidental (see buildGraceSlur).
  let firstGraceStemTipY: number;

  if (isGroup) {
    for (let i = 0; i < graceNotes.length; i++) {
      group.appendChild(
        buildGraceHead(
          writtenDuration,
          true,
          headXCenters[i],
          headYCenters[i],
          i
        )
      );
    }

    const beamYs = computeGraceBeamYs(stemXs, headYCenters);
    // The beam's topmost point, not just note 0's — on an ascending beam
    // (pitch rising left to right) beamYs[0] is the beam's lowest point, so
    // clearing only against it lets the slur graze the beam further along
    // its rise.
    firstGraceStemTipY = Math.min(...beamYs);
    for (let i = 0; i < graceNotes.length; i++) {
      const stem = document.createElementNS(SVG_NS, 'line');
      stem.classList.add('grace-stem');
      stem.setAttribute('x1', `${stemXs[i]}`);
      stem.setAttribute('y1', `${beamYs[i]}`);
      stem.setAttribute('x2', `${stemXs[i]}`);
      stem.setAttribute('y2', `${headYCenters[i]}`);
      stem.setAttribute('stroke', 'currentColor');
      stem.setAttribute('stroke-width', `${GRACE_STEM_STROKE_WIDTH}`);
      group.appendChild(stem);
    }

    const beamCount = resolveGroupBeamCount(graceDuration);
    const firstStemX = stemXs[0];
    const lastStemX = stemXs[stemXs.length - 1];
    const firstBeamY = beamYs[0];
    const lastBeamY = beamYs[beamYs.length - 1];
    for (let layer = 0; layer < beamCount; layer++) {
      const layerOffset =
        layer * (GRACE_BEAM_THICKNESS_PX + GRACE_BEAM_GAP_PX) -
        STEM_OVERLAP_PX * GRACE_SCALE;
      const beam = document.createElementNS(SVG_NS, 'polygon');
      beam.classList.add('grace-beam');
      beam.setAttribute(
        'points',
        [
          `${firstStemX},${firstBeamY + layerOffset}`,
          `${lastStemX},${lastBeamY + layerOffset}`,
          `${lastStemX},${lastBeamY + layerOffset + GRACE_BEAM_THICKNESS_PX}`,
          `${firstStemX},${firstBeamY + layerOffset + GRACE_BEAM_THICKNESS_PX}`,
        ].join(' ')
      );
      beam.setAttribute('fill', 'currentColor');
      group.appendChild(beam);
    }

    if (graceType === 'acciaccatura') {
      const beamStackHeight =
        beamCount * GRACE_BEAM_THICKNESS_PX +
        (beamCount - 1) * GRACE_BEAM_GAP_PX;
      group.appendChild(
        buildSlash(firstStemX, firstBeamY + beamStackHeight / 2)
      );
    }
  } else {
    group.appendChild(
      buildGraceHead(
        writtenDuration,
        false,
        headXCenters[0],
        headYCenters[0],
        0
      )
    );

    // Grace notes are always stem-up, and a stem-up tip position doesn't
    // move with flag count (extra flags stack down toward the head, not up
    // past the tip), so this holds regardless of the grace duration's flag
    // count.
    const stemTipY = headYCenters[0] - GRACE_SCALE * BASE_STEM_LENGTH_PX;
    firstGraceStemTipY = stemTipY;

    if (graceType === 'acciaccatura') {
      // The slash crosses a little below the stem tip.
      group.appendChild(
        buildSlash(stemXs[0], stemTipY + GRACE_SLASH_TIP_INSET_PX)
      );
    }
  }

  if (graceSlur === 'auto') {
    group.appendChild(
      buildGraceSlur(
        headXCenters[0],
        headYCenters[0],
        firstGraceStemTipY,
        mainHeadCenterXPx,
        mainHeadCenterYPx,
        mainTopNoteXPx,
        mainTopNoteYPx,
        mainAccidentalShown,
        mainStemUp
      )
    );
  }

  appendGraceAccidentals(group, graceNotes, headXCenters, headYCenters);

  return group;
}

// A grace head reuses the full note renderer at reduced scale. The wrapper
// transform places the scaled head center at (xCenter, yCenter). Group heads
// are stemless — the group draws shared stems and beams itself.
function buildGraceHead(
  duration: GraceDuration,
  stemless: boolean,
  xCenter: number,
  yCenter: number,
  index: number
): SVGGElement {
  const [noteGroup] = createNoteSvg({
    duration,
    stemUp: true,
    noStem: stemless,
    noFlags: stemless,
    qualifiedElementName: 'g',
  });
  const { cx, cy } = noteHeadCenter(true, duration, stemless);
  const translateX = xCenter - GRACE_SCALE * cx * NOTE_SCALE;
  const translateY = yCenter - GRACE_SCALE * cy * NOTE_SCALE;
  noteGroup.setAttribute(
    'transform',
    `translate(${translateX} ${translateY}) scale(${GRACE_SCALE})`
  );
  noteGroup.classList.remove('note');
  noteGroup.classList.add('grace-note');

  // Grace heads must not be pitch-drag targets — strip the hit zone and
  // rename the head class so drag hit-testing skips them.
  noteGroup.querySelector('.head-hit-zone')?.remove();
  const head = noteGroup.querySelector('.head');
  if (head) {
    head.classList.remove('head');
    head.classList.add('grace-head');
  }

  // Re-id the flag so <use> references do not collide with the main note's
  // flag in the same shadow root.
  const flagPath = noteGroup.querySelector('path.single-flag');
  if (flagPath) {
    const graceFlagId = `grace-single-flag-${index}`;
    flagPath.id = graceFlagId;
    for (const use of noteGroup.querySelectorAll('use')) {
      use.setAttribute('href', `#${graceFlagId}`);
    }
  }

  return noteGroup as SVGGElement;
}

function resolveGroupBeamCount(graceDuration: GraceDuration | null): number {
  if (graceDuration === null) {
    return GRACE_BEAM_COUNT;
  }
  const flagCount = durationToFlagCountMap.get(graceDuration) ?? 0;
  if (flagCount === 0) {
    console.warn(
      `grace-duration "${graceDuration}" has no beams — a grace-note group cannot be joined at that value; using ${GRACE_BEAM_COUNT} beams`
    );
    return GRACE_BEAM_COUNT;
  }
  return flagCount;
}

// The acciaccatura slash rises left-to-right through the crossing point.
function buildSlash(crossingX: number, crossingY: number): SVGLineElement {
  const slash = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
  slash.classList.add('grace-slash');
  slash.setAttribute('x1', `${crossingX - GRACE_SLASH_HALF_WIDTH_PX}`);
  slash.setAttribute('y1', `${crossingY + GRACE_SLASH_HALF_HEIGHT_PX}`);
  slash.setAttribute('x2', `${crossingX + GRACE_SLASH_HALF_WIDTH_PX}`);
  slash.setAttribute('y2', `${crossingY - GRACE_SLASH_HALF_HEIGHT_PX}`);
  slash.setAttribute('stroke', 'currentColor');
  slash.setAttribute('stroke-width', `${GRACE_SLASH_STROKE_WIDTH}`);
  return slash;
}

// The slur runs from the first grace note to a main-side target note. By
// default (no main accidental) it goes below, notehead to notehead, landing
// on the reference note (the chord's bottom note in a chord, or the only
// note for a single note) — matching standard engraving practice. When the
// main accidental would sit in its path, it flips above and its target
// switches to the chord's *top* note instead: after arcing up and over, the
// curve should land on the notehead nearest that side rather than travel
// back down past the other chord tones to reach the reference note (which
// is what a below-side target would force it to do). This also matches the
// "slur leads to the pitch that resolves the ornament" engraving guidance.
// The grace-side start also moves from the notehead to the grace note's
// stem/beam tip in the above case — a higher "running start" altitude that
// lets the curve clear a tall or far-reaching accidental without a
// contorted shape.
//
// The main-side endpoint's *distance from its target notehead* stays the
// same constant regardless of whether an accidental is shown, or how many
// the chord has — it clears the accidental's actual rendered right edge
// directly (see accidentalClearanceX below), not an approximated
// "footprint width" tied to the accidental's own size or column depth. That
// alone is provably sufficient to keep the curve clear of the symbol: since
// createCurveSvg's control point X is always the exact midpoint of the two
// endpoints, the quadratic Bezier's X-component collapses to pure linear
// interpolation between them (the bulge only ever moves Y, never X) — so a
// `to.x` right of the accidental's right edge (i.e. past it, toward the
// notehead) keeps *every* point on the curve clear of it, no matter how
// tall the arc is.
//
// Both ends are anchored past their nearest stem (not just the notehead), so
// the curve never crosses a stem: the grace stem sits right of the grace
// head (grace notes are always stem-up), so `from.x` is pushed right of it;
// the main stem only sits on the slur's approach side (left of its head)
// when the main note is stem-down, and only threatens the curve when it
// also spans downward from the head center (the same side as a 'below'
// bulge) — so `to.x` is pushed left of the stem only for that one
// dangerous combination.
function buildGraceSlur(
  firstGraceHeadX: number,
  firstGraceHeadY: number,
  firstGraceStemTipY: number,
  mainHeadCenterXPx: number,
  mainHeadCenterYPx: number,
  mainTopNoteXPx: number,
  mainTopNoteYPx: number,
  accidentalShown: boolean,
  mainStemUp: boolean
): SVGGElement {
  const bulge = accidentalShown ? 'above' : 'below';
  const direction = accidentalShown ? -1 : 1;
  const targetXPx = accidentalShown ? mainTopNoteXPx : mainHeadCenterXPx;
  const targetYPx = accidentalShown ? mainTopNoteYPx : mainHeadCenterYPx;
  const graceHeadRy = GRACE_SCALE * NOTE_HEAD_RADIUS_PX * 0.75;
  const mainHeadRy = NOTE_HEAD_RADIUS_PX * 0.75;
  const mainStemInApproachPath = !mainStemUp && !accidentalShown;
  // Always clear the notehead ellipse; additionally clear the stem's own
  // offset when it sits in the curve's approach path (stem-down, no
  // accidental), or the shown accidental's own rendered edge — whichever
  // pullback is larger wins.
  const headClearanceX = NOTE_HEAD_RADIUS_PX + SLUR_HEAD_CLEARANCE_PX;
  const stemClearanceX = mainStemInApproachPath
    ? MAIN_STEM_X_FROM_HEAD_CENTER + SLUR_STEM_CLEARANCE_PX
    : 0;
  // A shown accidental's *nearest* column (the one closest to the notehead)
  // always renders with its right edge at exactly -ACCIDENTAL_NOTE_GAP in
  // the chord/note's own local space — both note.ts's single-accidental
  // placement (`x = -(width + GAP)`) and accidentalRules.ts's chord-column
  // placement (column 0's `xOffset = -(0 + width)`, rendered `x = xOffset -
  // GAP`) reduce to the same `right edge = x + width = -GAP` once the width
  // term cancels out — independent of the accidental's type/width, and of
  // how many further (always further-left, never closer) columns the chord
  // has. So clearing it needs no width/column data at all, only whether an
  // accidental is shown. This fixes a prior bug: using the *aggregate*
  // column width (correct for reserving the grace group's own layout space,
  // wrong here) under-cleared multi-column chords, since the outermost
  // column's width doesn't predict the nearest column's edge.
  const accidentalClearanceX = accidentalShown
    ? targetXPx + ACCIDENTAL_NOTE_GAP - SLUR_HEAD_CLEARANCE_PX
    : 0;
  const toX =
    targetXPx - Math.max(headClearanceX, stemClearanceX, accidentalClearanceX);
  const fromY = accidentalShown
    ? firstGraceStemTipY + direction * SLUR_STEM_TIP_CLEARANCE_PX
    : firstGraceHeadY + direction * (graceHeadRy + SLUR_HEAD_CLEARANCE_PX);
  const toY = targetYPx + direction * (mainHeadRy + SLUR_HEAD_CLEARANCE_PX);
  // The default bulge assumes endpoints close to their noteheads; an
  // accidental can push `toY` far past that, so grow the bulge to keep the
  // curve's control point beyond both endpoints instead of dipping back
  // toward the notehead it was supposed to clear.
  const bulgeHeight = Math.max(
    DEFAULT_BULGE_HEIGHT,
    Math.abs(fromY - toY) / 2 + SLUR_HEAD_CLEARANCE_PX
  );
  const slur = createCurveSvg({
    from: {
      x:
        firstGraceHeadX +
        GRACE_STEM_X_FROM_HEAD_CENTER +
        SLUR_STEM_CLEARANCE_PX,
      y: fromY,
    },
    to: {
      x: toX,
      y: toY,
    },
    bulgeHeight,
    bulge,
  });
  slur.classList.add('grace-slur');
  return slur;
}

// Short ledger lines for grace heads beyond the staff. Only possible when the
// staff position of the main head is known (in-staff rendering).
function appendLedgerLines(
  group: SVGGElement,
  graceNotes: GraceNoteDescriptor[],
  headXCenters: number[],
  headYCenters: number[],
  mainStaffY: number | null,
  mainHeadCenterYPx: number
): void {
  if (mainStaffY === null) {
    return;
  }
  // Pixel Y of a staff position = padding + staffY, and the main head center
  // is padding + mainStaffY, so padding falls out of the difference.
  const staffYPadding = mainHeadCenterYPx - mainStaffY;
  const halfLength =
    GRACE_SCALE * NOTE_HEAD_RADIUS_PX + GRACE_LEDGER_LINE_MARGIN;

  for (let i = 0; i < graceNotes.length; i++) {
    const graceStaffY =
      mainStaffY - graceNotes[i].relativeStaffSteps * STAFF_Y_STEP;
    for (const ledgerLine of computeLedgerLines([graceStaffY], true)) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.classList.add('grace-ledger-line');
      const lineY = staffYPadding + ledgerLine.staffY;
      line.setAttribute('x1', `${headXCenters[i] - halfLength}`);
      line.setAttribute('y1', `${lineY}`);
      line.setAttribute('x2', `${headXCenters[i] + halfLength}`);
      line.setAttribute('y2', `${lineY}`);
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', GRACE_LEDGER_STROKE_WIDTH);
      group.appendChild(line);
    }
  }
}

// Scaled accidental symbols, each placed just left of its grace head.
function appendGraceAccidentals(
  group: SVGGElement,
  graceNotes: GraceNoteDescriptor[],
  headXCenters: number[],
  headYCenters: number[]
): void {
  for (let i = 0; i < graceNotes.length; i++) {
    const accidental = graceNotes[i].accidental;
    if (accidental === null) {
      continue;
    }
    const symbolSvg = createAccidentalSvg(accidental);
    symbolSvg.classList.add('grace-accidental');
    const symbolWidth = GRACE_SCALE * ACCIDENTAL_SYMBOL_WIDTH[accidental];
    const symbolHeight = GRACE_SCALE * ACCIDENTAL_SYMBOL_HEIGHT[accidental];
    symbolSvg.setAttribute('width', `${symbolWidth}px`);
    symbolSvg.setAttribute('height', `${symbolHeight}px`);
    const symbolRightEdge =
      headXCenters[i] - GRACE_SCALE * (NOTE_HEAD_RADIUS_PX + 1);
    symbolSvg.setAttribute('x', `${symbolRightEdge - symbolWidth}`);
    symbolSvg.setAttribute('y', `${headYCenters[i] - symbolHeight / 2}`);
    group.appendChild(symbolSvg);
  }
}
