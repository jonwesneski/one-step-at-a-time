import {
  accidentalInkRect,
  accidentalPitchOffset,
  accidentalSymbolHeight,
  accidentalSymbolWidth,
} from '../../rules/accidentalRules';
import type {
  CurvePoint,
  ObstacleRect,
} from '../../rules/connectorPlacementRules';
import {
  computeGraceBeamYs,
  computeGraceLayout,
  GraceNoteDescriptor,
  resolveOrnamentSlur,
} from '../../rules/graceRules';
import { resolveGraceNoteheads } from '../../rules/noteheadRules';
import { computeLedgerLines } from '../../rules/staffNoteRules';
import { durationToFlagCountMap } from '../../rules/theoryConsts';
import type {
  AccidentalType,
  ArticulationType,
  GraceDuration,
  GraceSlur,
  GraceType,
  NoteheadType,
  TrillFinishSlur,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  BASE_STEM_LENGTH_PX,
  GRACE_BEAM_COUNT,
  GRACE_BEAM_GAP_PX,
  GRACE_BEAM_THICKNESS_PX,
  GRACE_NOTE_ADVANCE_PX,
  GRACE_SCALE,
  GRACE_SLASH_HALF_HEIGHT_PX,
  GRACE_SLASH_HALF_WIDTH_PX,
  GRACE_SLASH_STROKE_WIDTH,
  GRACE_SLASH_TIP_INSET_PX,
  STAFF_Y_STEP,
  STEM_OVERLAP_PX,
  STEM_STROKE_WIDTH_PX,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import { createArticulationMarks } from './articulations';
import { createCurveSvg, DEFAULT_BULGE_HEIGHT } from './curve';
import {
  createNoteSvg,
  flagStemExtensionPx,
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  noteHeadCenter,
  noteHeadGeometry,
  noteHeadLeftOverhangPx,
  TAIL_UP_WIDTH_PX,
} from './note';

// Full-size stem stroke is 22 units in the note's 600-unit space (≈1.17px);
// grace stems scale that down.
const GRACE_STEM_STROKE_WIDTH = STEM_STROKE_WIDTH_PX * GRACE_SCALE;
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
// Vertical clearance above a grace stem/beam tip; padded beyond
// SLUR_ACCIDENTAL_CLEARANCE_PX since the outer beam renders
// STEM_OVERLAP_PX × GRACE_SCALE above the raw beam Y.
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
  // The chord's top note (the head itself for a single note): the slur's
  // landing target when it bulges above.
  mainTopNoteXPx: number;
  mainTopNoteYPx: number;
  // The slur's landing point for a descending grace group: the main stem tip
  // when stem-up, else its top notehead.
  mainSlurTargetXPx: number;
  mainSlurTargetYPx: number;
  // Right edge available to the grace group — already left of the main
  // element's accidental footprint, including the grace-to-main gap.
  anchorRightXPx: number;
  // The ink of the main element's shown accidentals. Any flips the slur
  // above, over them, starting from the grace stem tip.
  mainAccidentalRects: readonly ObstacleRect[];
  // Main note's own stem direction. Stem-down puts the main stem on the same
  // (left) side the slur approaches from, so the slur needs extra horizontal
  // clearance on that end to avoid crossing it.
  mainStemUp: boolean;
  // Staff Y of the main notehead — enables grace ledger lines. null in
  // standalone mode (matching the main note's own ledger-line behavior).
  mainStaffY: number | null;
  // A cue note's grace notes are this much smaller.
  ratio?: number;
};

// A cue note's ornament group is drawn `ratio` times as large about the point
// it hangs from (its end beside the note, level with the main head). Inside
// it, positions given in the host's px are mapped back by `local`, and a
// pitch step is 1/ratio as tall, so its heads still land on their stave
// positions.
type OrnamentFrame = {
  local: (x: number, y: number) => { x: number; y: number };
  stepPx: number;
  wrap: (group: SVGGElement) => SVGGElement;
};

function ornamentFrame(x: number, y: number, ratio: number): OrnamentFrame {
  return {
    local: (px, py) =>
      ratio === 1
        ? { x: px, y: py }
        : { x: x + (px - x) / ratio, y: y + (py - y) / ratio },
    stepPx: STAFF_Y_STEP / ratio,
    wrap: (group) => {
      if (ratio !== 1) {
        group.setAttribute(
          'transform',
          `translate(${x} ${y}) scale(${ratio}) translate(${-x} ${-y})`
        );
      }
      return group;
    },
  };
}

const localRect = (frame: OrnamentFrame, rect: ObstacleRect): ObstacleRect => {
  const topLeft = frame.local(rect.left, rect.top);
  const bottomRight = frame.local(rect.right, rect.bottom);
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: bottomRight.x,
    bottom: bottomRight.y,
  };
};

type OrnamentNoteGroupResult = {
  group: SVGGElement;
  // Y of the first note's stem/beam tip — the leading grace slur's alternate
  // start anchor (see buildGraceSlur), and a trill-finish slur's "to-main"
  // anchor.
  firstStemTipY: number;
  // Y of the last note's stem/beam tip — a trill-finish slur's "to-next"
  // anchor. Equal to firstStemTipY for a single (non-group) ornament.
  lastStemTipY: number;
};

// Heads, stems, beams, ledger lines, and (leading-only) articulations and
// slash, for leading and trill-finish grace groups. Slurs and accidentals are
// the caller's.
function renderOrnamentNoteGroup(
  graceNotes: GraceNoteDescriptor[],
  // The explicit duration attribute, null when unset. Heads and flags draw
  // an unset value as an eighth, but a group's beam count has its own
  // default (resolveGroupBeamCount's null branch).
  explicitGroupDuration: GraceDuration | null,
  headXCenters: number[],
  headYCenters: number[],
  mainStaffY: number | null,
  mainHeadCenterYPx: number,
  // null for a trill's finishing notes: the acciaccatura slash and per-note
  // articulation marks belong to leading grace notes only.
  graceType: GraceType | null,
  stepPx: number
): OrnamentNoteGroupResult {
  const group = document.createElementNS(SVG_NS, 'g');
  const isGroup = graceNotes.length > 1;
  const writtenDuration = explicitGroupDuration ?? 'eighth';
  const allowSlashAndArticulation = graceType !== null;

  appendLedgerLines(
    group,
    graceNotes,
    headXCenters,
    mainStaffY,
    mainHeadCenterYPx,
    stepPx
  );

  const stemXs = headXCenters.map(
    (headXCenter) => headXCenter + GRACE_STEM_X_FROM_HEAD_CENTER
  );

  let firstStemTipY: number;
  let lastStemTipY: number;

  if (isGroup) {
    for (let i = 0; i < graceNotes.length; i++) {
      group.appendChild(
        buildGraceHead(
          writtenDuration,
          true,
          headXCenters[i],
          headYCenters[i],
          graceNotes[i].notehead
        )
      );
      const articulation = graceNotes[i].articulation;
      if (allowSlashAndArticulation && articulation !== null) {
        const marks = buildGraceArticulation(
          articulation,
          writtenDuration,
          true,
          headXCenters[i],
          headYCenters[i]
        );
        if (marks !== null) {
          group.appendChild(marks);
        }
      }
    }

    const beamYs = computeGraceBeamYs(stemXs, headYCenters);
    // The beam's topmost point, not just note 0's — on an ascending beam
    // (pitch rising left to right) beamYs[0] is the beam's lowest point, so
    // clearing only against it lets a slur graze the beam further along its
    // rise.
    firstStemTipY = Math.min(...beamYs);
    lastStemTipY = beamYs[beamYs.length - 1];
    for (let i = 0; i < graceNotes.length; i++) {
      const stem = document.createElementNS(SVG_NS, 'line');
      stem.classList.add('grace-stem');
      stem.setAttribute('x1', `${stemXs[i]}`);
      stem.setAttribute('y1', `${beamYs[i]}`);
      stem.setAttribute('x2', `${stemXs[i]}`);
      stem.setAttribute(
        'y2',
        `${
          headYCenters[i] +
          graceStemAnchorOffsetY(writtenDuration, graceNotes[i].notehead)
        }`
      );
      stem.setAttribute('stroke', 'currentColor');
      stem.setAttribute('stroke-width', `${GRACE_STEM_STROKE_WIDTH}`);
      group.appendChild(stem);
    }

    const beamCount = resolveGroupBeamCount(explicitGroupDuration);
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

    if (allowSlashAndArticulation && graceType === 'acciaccatura') {
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
        graceNotes[0].notehead
      )
    );
    const articulation = graceNotes[0].articulation;
    if (allowSlashAndArticulation && articulation !== null) {
      const marks = buildGraceArticulation(
        articulation,
        writtenDuration,
        false,
        headXCenters[0],
        headYCenters[0]
      );
      if (marks !== null) {
        group.appendChild(marks);
      }
    }

    const stemTipY = loneGraceStemTipY(writtenDuration, headYCenters[0]);
    firstStemTipY = stemTipY;
    lastStemTipY = stemTipY;

    if (allowSlashAndArticulation && graceType === 'acciaccatura') {
      // The slash crosses a little below the stem tip.
      group.appendChild(
        buildSlash(stemXs[0], stemTipY + GRACE_SLASH_TIP_INSET_PX)
      );
    }
  }

  return { group, firstStemTipY, lastStemTipY };
}

// Grace notes are always stem-up and placed by their head, so tails past the
// second move the tip away from it.
function loneGraceStemTipY(
  duration: GraceDuration,
  headYCenter: number
): number {
  return (
    headYCenter -
    GRACE_SCALE *
      (BASE_STEM_LENGTH_PX +
        flagStemExtensionPx(durationToFlagCountMap.get(duration) ?? 0))
  );
}

/** The top of a leading grace group's stems and beams (px). */
export function graceInkTopY(
  graceNotes: GraceNoteDescriptor[],
  graceDuration: GraceDuration | null,
  mainHeadCenterYPx: number,
  ratio = 1
): number {
  const headYCenters = graceNotes.map(
    ({ relativeStaffSteps }) =>
      mainHeadCenterYPx - (relativeStaffSteps * STAFF_Y_STEP) / ratio
  );
  const localTop =
    graceNotes.length === 1
      ? loneGraceStemTipY(graceDuration ?? 'eighth', headYCenters[0])
      : Math.min(
          ...computeGraceBeamYs(
            computeGraceLayout(graceNotes).headXCenters,
            headYCenters
          )
        ) -
        STEM_OVERLAP_PX * GRACE_SCALE;
  return mainHeadCenterYPx + ratio * (localTop - mainHeadCenterYPx);
}

/** The bottom edge (px) of a grace group's lowest head. */
export function graceHeadsBottomY(
  graceNotes: readonly GraceNoteDescriptor[],
  mainHeadCenterYPx: number,
  ratio = 1
): number {
  return (
    Math.max(
      ...graceNotes.map(
        ({ relativeStaffSteps }) =>
          mainHeadCenterYPx - relativeStaffSteps * STAFF_Y_STEP
      )
    ) +
    STAFF_Y_STEP * GRACE_SCALE * ratio
  );
}

export function createGraceNotesSvg({
  graceNotes,
  graceType,
  graceDuration,
  graceSlur,
  mainHeadCenterXPx,
  mainHeadCenterYPx,
  mainTopNoteXPx,
  mainTopNoteYPx,
  mainSlurTargetXPx,
  mainSlurTargetYPx,
  anchorRightXPx,
  mainAccidentalRects,
  mainStemUp,
  mainStaffY,
  ratio = 1,
}: GraceNotesProps): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('grace-notes');
  const frame = ornamentFrame(anchorRightXPx, mainHeadCenterYPx, ratio);
  const mainHead = frame.local(mainHeadCenterXPx, mainHeadCenterYPx);
  const mainTopNote = frame.local(mainTopNoteXPx, mainTopNoteYPx);
  const mainSlurTarget = frame.local(mainSlurTargetXPx, mainSlurTargetYPx);

  const layout = computeGraceLayout(graceNotes);
  const headXCenters = layout.headXCenters.map(
    (headXCenter) => anchorRightXPx - layout.totalWidth + headXCenter
  );
  const headYCenters = graceNotes.map(
    (graceNote) =>
      mainHeadCenterYPx - graceNote.relativeStaffSteps * frame.stepPx
  );

  const { group: noteGroup, firstStemTipY: firstGraceStemTipY } =
    renderOrnamentNoteGroup(
      graceNotes,
      graceDuration,
      headXCenters,
      headYCenters,
      mainStaffY,
      mainHeadCenterYPx,
      graceType,
      frame.stepPx
    );
  group.appendChild(noteGroup);

  if (graceSlur === 'auto') {
    // Same first-vs-last comparison as computeGraceBeamYs' own slant — Y
    // grows downward, so a smaller first head Y means the group's pitch
    // trends downward (descending) left to right.
    const isDescendingGroup =
      headYCenters[0] < headYCenters[headYCenters.length - 1];
    group.appendChild(
      buildGraceSlur(
        headXCenters[0],
        headYCenters[0],
        firstGraceStemTipY,
        mainHead.x,
        mainHead.y,
        mainTopNote.x,
        mainTopNote.y,
        mainSlurTarget.x,
        mainSlurTarget.y,
        mainAccidentalRects.length > 0,
        mainStemUp,
        isDescendingGroup,
        [
          ...mainAccidentalRects.map((rect) => localRect(frame, rect)),
          ...graceAccidentalRects(graceNotes, headXCenters, headYCenters),
          ...innerGraceHeadRects(headXCenters, headYCenters),
        ]
      )
    );
  }

  appendGraceAccidentals(group, graceNotes, headXCenters, headYCenters);

  return frame.wrap(group);
}

export type TrillFinishNotesProps = {
  trillFinishNotes: GraceNoteDescriptor[];
  trillFinishSlur: TrillFinishSlur;
  // Main notehead center in the host SVG's pixel space — same role as
  // GraceNotesProps' mainHeadCenterXPx/YPx, but the finishing group's own
  // anchor is its LEFT edge (it grows rightward, away from the main note)
  // rather than a right edge.
  mainHeadCenterXPx: number;
  mainHeadCenterYPx: number;
  // Left edge available to the finishing group — already right of the main
  // element's own notehead, including the main-to-finishing gap.
  anchorLeftXPx: number;
  // Staff Y of the main notehead — enables ledger lines, same as
  // GraceNotesProps.mainStaffY.
  mainStaffY: number | null;
  ratio?: number;
};

/**
 * How far (px) a finishing figure's tail reaches past its layout width. Only a
 * lone finishing note has a tail, and it points at whatever follows; a group is
 * beamed.
 */
export function trillFinishTailOverhangPx(
  noteCount: number,
  ratio = 1
): number {
  return noteCount === 1
    ? ratio *
        (GRACE_STEM_X_FROM_HEAD_CENTER +
          GRACE_SCALE * TAIL_UP_WIDTH_PX -
          GRACE_NOTE_ADVANCE_PX / 2)
    : 0;
}

export type TrillFinishNotesResult = {
  element: SVGGElement;
  /** Total rendered width (px) — callers reserve rightward layout footprint off this (mirrors computeGraceFootprintWidth). */
  width: number;
};

/**
 * Builds a trill's finishing grace note(s) after the main note, with the
 * 'to-main' slur. The staff draws the 'to-next' half.
 */
export function createTrillFinishNotesSvg({
  trillFinishNotes,
  trillFinishSlur,
  mainHeadCenterXPx,
  mainHeadCenterYPx,
  anchorLeftXPx,
  mainStaffY,
  ratio = 1,
}: TrillFinishNotesProps): TrillFinishNotesResult {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('trill-finish-notes');
  const frame = ornamentFrame(anchorLeftXPx, mainHeadCenterYPx, ratio);
  const mainHead = frame.local(mainHeadCenterXPx, mainHeadCenterYPx);

  const layout = computeGraceLayout(trillFinishNotes);
  const headXCenters = layout.headXCenters.map(
    (headXCenter) => anchorLeftXPx + headXCenter
  );
  const headYCenters = trillFinishNotes.map(
    (note) => mainHeadCenterYPx - note.relativeStaffSteps * frame.stepPx
  );

  const { group: noteGroup } = renderOrnamentNoteGroup(
    trillFinishNotes,
    null,
    headXCenters,
    headYCenters,
    mainStaffY,
    mainHeadCenterYPx,
    null,
    frame.stepPx
  );
  group.appendChild(noteGroup);

  if (trillFinishSlur === 'to-main' || trillFinishSlur === 'both') {
    group.appendChild(
      createOrnamentConnectorSlur(
        mainHead.x,
        mainHead.y,
        NOTE_HEAD_RADIUS_PX * 0.75,
        headXCenters[0],
        headYCenters[0],
        TRILL_FINISH_HEAD_RY,
        true,
        graceAccidentalRects(
          trillFinishNotes.slice(0, 1),
          headXCenters,
          headYCenters
        )
      )
    );
  }

  appendGraceAccidentals(group, trillFinishNotes, headXCenters, headYCenters);

  return { element: frame.wrap(group), width: ratio * layout.totalWidth };
}

// A trill-finish slur half: notehead to notehead, always bulging below (a v1
// simplification of buildGraceSlur's rules). It passes under the accidentals
// of the note it leads to, and lands below its head where no stem is in the way.
export function createOrnamentConnectorSlur(
  fromXCenter: number,
  fromYCenter: number,
  fromHeadRy: number,
  toXCenter: number,
  toYCenter: number,
  toHeadRy: number,
  toStemUp: boolean,
  toAccidentalRects: readonly ObstacleRect[]
): SVGGElement {
  const fromY = fromYCenter + fromHeadRy + SLUR_HEAD_CLEARANCE_PX;
  const toY = toYCenter + toHeadRy + SLUR_HEAD_CLEARANCE_PX;
  const slur = createCurveSvg({
    ...resolveOrnamentSlur(
      {
        x: fromXCenter + fromHeadRy + SLUR_HEAD_CLEARANCE_PX,
        y: fromY,
      },
      {
        x:
          toStemUp && toAccidentalRects.length > 0
            ? toXCenter
            : toXCenter - toHeadRy - SLUR_HEAD_CLEARANCE_PX,
        y: toY,
      },
      'below',
      ornamentSlurBulgeHeight,
      toAccidentalRects
    ),
    bulge: 'below',
  });
  slur.classList.add('trill-finish-slur');
  return slur;
}

// Grows the bulge so the control point stays beyond both endpoints.
function ornamentSlurBulgeHeight(from: CurvePoint, to: CurvePoint): number {
  return Math.max(
    DEFAULT_BULGE_HEIGHT,
    Math.abs(from.y - to.y) / 2 + SLUR_HEAD_CLEARANCE_PX
  );
}

// Grace-note-head radius at GRACE_SCALE — the "from" or "to" head-radius arg
// for createOrnamentConnectorSlur when one endpoint is a finishing grace
// note (as opposed to a full-size main notehead, NOTE_HEAD_RADIUS_PX * 0.75).
export const TRILL_FINISH_HEAD_RY = GRACE_SCALE * NOTE_HEAD_RADIUS_PX * 0.75;

// A grace head reuses the full note renderer at reduced scale. The wrapper
// transform places the scaled head center at (xCenter, yCenter). Group heads
// are stemless — the group draws shared stems and beams itself. The
// translation uses the ellipse head's centre for every notehead so the stem
// column (which a glyph head is anchored to) stays where the group's stems are.
function buildGraceHead(
  duration: GraceDuration,
  stemless: boolean,
  xCenter: number,
  yCenter: number,
  notehead: NoteheadType = 'normal'
): SVGGElement {
  const [noteGroup] = createNoteSvg({
    duration,
    stemUp: true,
    noStem: stemless,
    noFlags: stemless,
    qualifiedElementName: 'g',
    notehead,
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
    const graceFlagId = 'grace-single-flag';
    flagPath.id = graceFlagId;
    for (const use of noteGroup.querySelectorAll('use')) {
      use.setAttribute('href', `#${graceFlagId}`);
    }
  }

  return noteGroup as SVGGElement;
}

// Per grace note, how far (px, at grace scale) its head reaches left of the
// ellipse head's edge.
export function graceHeadLeftOverhangsPx(
  graceNoteheads: readonly (NoteheadType | null)[] | null,
  graceCount: number,
  graceDuration: GraceDuration | null
): number[] {
  return resolveGraceNoteheads(graceNoteheads ?? [], graceCount).map(
    (notehead) =>
      GRACE_SCALE *
      noteHeadLeftOverhangPx(true, graceDuration ?? 'eighth', notehead)
  );
}

// Pixel offset from a grace head's centre to where its stem meets the head
// (non-zero only for a glyph head whose anchor sits off-centre).
function graceStemAnchorOffsetY(
  duration: GraceDuration,
  notehead: NoteheadType = 'normal'
): number {
  const { anchorY, cy } = noteHeadGeometry(true, duration, true, notehead);
  return GRACE_SCALE * (anchorY - cy) * NOTE_SCALE;
}

// A grace note's articulation, under the transform buildGraceHead uses. Grace
// notes are stem-up, so marks sit below the head. The marks bypass
// createNoteSvg, so its inner scale(NOTE_SCALE) is applied here.
function buildGraceArticulation(
  articulation: ArticulationType,
  duration: GraceDuration,
  stemless: boolean,
  xCenter: number,
  yCenter: number
): SVGGElement | null {
  const { cx, cy } = noteHeadCenter(true, duration, stemless);
  const marks = createArticulationMarks({
    articulation,
    stemUp: true,
    noteHeadCenterX: cx,
    noteHeadCenterY: cy,
  });
  if (marks === null) {
    return null;
  }
  const translateX = xCenter - GRACE_SCALE * cx * NOTE_SCALE;
  const translateY = yCenter - GRACE_SCALE * cy * NOTE_SCALE;
  const wrapper = document.createElementNS(SVG_NS, 'g');
  wrapper.setAttribute(
    'transform',
    `translate(${translateX} ${translateY}) scale(${GRACE_SCALE})`
  );
  const noteSpaceScale = document.createElementNS(SVG_NS, 'g');
  noteSpaceScale.setAttribute('transform', `scale(${NOTE_SCALE})`);
  noteSpaceScale.appendChild(marks);
  wrapper.appendChild(noteSpaceScale);
  return wrapper;
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
  const slash = document.createElementNS(SVG_NS, 'line');
  slash.classList.add('grace-slash');
  slash.setAttribute('x1', `${crossingX - GRACE_SLASH_HALF_WIDTH_PX}`);
  slash.setAttribute('y1', `${crossingY + GRACE_SLASH_HALF_HEIGHT_PX}`);
  slash.setAttribute('x2', `${crossingX + GRACE_SLASH_HALF_WIDTH_PX}`);
  slash.setAttribute('y2', `${crossingY - GRACE_SLASH_HALF_HEIGHT_PX}`);
  slash.setAttribute('stroke', 'currentColor');
  slash.setAttribute('stroke-width', `${GRACE_SLASH_STROKE_WIDTH}`);
  return slash;
}

// The slur runs from the first grace note to the main note: below, notehead
// to notehead, onto the chord's bottom note. A shown main accidental flips it
// above, from the grace stem tip onto the chord's top note. A descending group
// also goes above, with both ends at stem tips, so it clears every head.
//
// Over an accidental the slur lands above the head's centre, which leaves it
// room to come down. Each end is also pushed past a stem on its approach side.
function buildGraceSlur(
  firstGraceHeadX: number,
  firstGraceHeadY: number,
  firstGraceStemTipY: number,
  mainHeadCenterXPx: number,
  mainHeadCenterYPx: number,
  mainTopNoteXPx: number,
  mainTopNoteYPx: number,
  // Resolved by the caller per its own stem-up/down state — see
  // GraceNotesProps. Only consulted when isDescendingGroup is true.
  mainSlurTargetXPx: number,
  mainSlurTargetYPx: number,
  accidentalShown: boolean,
  mainStemUp: boolean,
  isDescendingGroup: boolean,
  obstacles: readonly ObstacleRect[]
): SVGGElement {
  const bulgeAbove = accidentalShown || isDescendingGroup;
  const bulge = bulgeAbove ? 'above' : 'below';
  const direction = bulgeAbove ? -1 : 1;
  // A shown accidental decides the horizontal target; otherwise a descending
  // group lands on the stem x.
  const targetXPx = accidentalShown
    ? mainTopNoteXPx
    : isDescendingGroup
    ? mainSlurTargetXPx
    : mainHeadCenterXPx;
  // Vertical target: a descending group lands on the real stem tip (or
  // highest notehead) instead of a plain notehead — independent of
  // accidentalShown, which only picked the top-vs-reference note above.
  const targetYPx = isDescendingGroup
    ? mainSlurTargetYPx
    : accidentalShown
    ? mainTopNoteYPx
    : mainHeadCenterYPx;
  const graceHeadRy = GRACE_SCALE * NOTE_HEAD_RADIUS_PX * 0.75;
  // A cue main head is full size in its grace group's frame.
  const mainHeadRy = NOTE_HEAD_RADIUS_PX * 0.75;
  const mainStemInApproachPath = !mainStemUp && !accidentalShown;
  // Clear the notehead ellipse, and the stem's own offset when it sits in the
  // curve's approach path (stem-down, no accidental).
  const headClearanceX = NOTE_HEAD_RADIUS_PX + SLUR_HEAD_CLEARANCE_PX;
  const stemClearanceX = mainStemInApproachPath
    ? MAIN_STEM_X_FROM_HEAD_CENTER + SLUR_STEM_CLEARANCE_PX
    : 0;
  const landsOnStemTip = isDescendingGroup && mainStemUp;
  const toX =
    accidentalShown && !landsOnStemTip
      ? targetXPx
      : targetXPx - Math.max(headClearanceX, stemClearanceX);
  // Grace-side start: a descending group always starts at the grace stem
  // tip (structurally clears every interior grace head, which a
  // notehead-anchored start cannot guarantee); the accidental case's
  // existing running-start also uses the stem tip; otherwise the notehead.
  const fromY =
    isDescendingGroup || accidentalShown
      ? firstGraceStemTipY + direction * SLUR_STEM_TIP_CLEARANCE_PX
      : firstGraceHeadY + direction * (graceHeadRy + SLUR_HEAD_CLEARANCE_PX);
  // A descending group lands at a stem tip, needing the stem-tip margin;
  // otherwise it lands on a notehead.
  const toY = isDescendingGroup
    ? targetYPx + direction * SLUR_STEM_TIP_CLEARANCE_PX
    : targetYPx + direction * (mainHeadRy + SLUR_HEAD_CLEARANCE_PX);
  const slur = createCurveSvg({
    ...resolveOrnamentSlur(
      {
        x:
          firstGraceHeadX +
          GRACE_STEM_X_FROM_HEAD_CENTER +
          SLUR_STEM_CLEARANCE_PX,
        y: fromY,
      },
      { x: toX, y: toY },
      bulge,
      ornamentSlurBulgeHeight,
      obstacles
    ),
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
  mainStaffY: number | null,
  mainHeadCenterYPx: number,
  stepPx: number
): void {
  if (mainStaffY === null) {
    return;
  }
  // A staff position's px Y is the main head's, moved by its steps from the
  // main note.
  const stepScale = stepPx / STAFF_Y_STEP;
  const halfLength =
    GRACE_SCALE * NOTE_HEAD_RADIUS_PX + GRACE_LEDGER_LINE_MARGIN;

  for (let i = 0; i < graceNotes.length; i++) {
    const graceStaffY =
      mainStaffY - graceNotes[i].relativeStaffSteps * STAFF_Y_STEP;
    for (const ledgerLine of computeLedgerLines([graceStaffY], true)) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.classList.add('grace-ledger-line');
      const lineY =
        mainHeadCenterYPx + (ledgerLine.staffY - mainStaffY) * stepScale;
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

function graceAccidentalLeftX(
  graceNote: GraceNoteDescriptor,
  accidental: AccidentalType,
  headXCenter: number
): number {
  return (
    headXCenter -
    GRACE_SCALE * (NOTE_HEAD_RADIUS_PX + 1) -
    (graceNote.headLeftOverhangPx ?? 0) -
    GRACE_SCALE * accidentalSymbolWidth(accidental)
  );
}

function graceAccidentalRects(
  graceNotes: GraceNoteDescriptor[],
  headXCenters: number[],
  headYCenters: number[]
): ObstacleRect[] {
  return graceNotes.flatMap((graceNote, i) =>
    graceNote.accidental === null
      ? []
      : [
          accidentalInkRect(
            graceNote.accidental,
            graceAccidentalLeftX(
              graceNote,
              graceNote.accidental,
              headXCenters[i]
            ),
            headYCenters[i],
            { scale: GRACE_SCALE }
          ),
        ]
  );
}

// Every head but the one the slur starts from.
function innerGraceHeadRects(
  headXCenters: number[],
  headYCenters: number[]
): ObstacleRect[] {
  const rx = GRACE_SCALE * NOTE_HEAD_RADIUS_PX;
  const ry = rx * 0.75;
  return headXCenters.slice(1).map((headXCenter, i) => ({
    left: headXCenter - rx,
    right: headXCenter + rx,
    top: headYCenters[i + 1] - ry,
    bottom: headYCenters[i + 1] + ry,
  }));
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
    const symbolWidth = GRACE_SCALE * accidentalSymbolWidth(accidental);
    const symbolHeight = GRACE_SCALE * accidentalSymbolHeight(accidental);
    symbolSvg.setAttribute('width', `${symbolWidth}px`);
    symbolSvg.setAttribute('height', `${symbolHeight}px`);
    symbolSvg.setAttribute(
      'x',
      `${graceAccidentalLeftX(graceNotes[i], accidental, headXCenters[i])}`
    );
    symbolSvg.setAttribute(
      'y',
      `${headYCenters[i] - GRACE_SCALE * accidentalPitchOffset(accidental)}`
    );
    group.appendChild(symbolSvg);
  }
}
