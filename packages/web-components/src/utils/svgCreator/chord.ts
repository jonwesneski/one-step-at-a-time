import {
  computeChordAccidentalPlacements,
  totalChordAccidentalWidth,
  type AccidentalPlacementInput,
} from '../../rules/accidentalRules';
import { computeAdjacentDisplacements } from '../../rules/chordRules';
import { GraceNoteDescriptor } from '../../rules/graceRules';
import {
  AccidentalType,
  GraceDuration,
  GraceSlur,
  GraceType,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  BASE_STEM_LENGTH_PX,
  GRACE_MAIN_GAP_PX,
  STAFF_Y_PADDING,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import { createArticulationMarks } from './articulations';
import { createGraceNotesSvg } from './graceNotes';
import {
  createNoteSvg,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  NOTE_STEM_X_OFFSET,
  noteHeadCenter,
  type NoteProps,
} from './note';

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
  noteAccidentals?: (AccidentalType | null | undefined)[];
  // Grace notes are placed relative to the chord's reference note (notes[0],
  // which is staffYCoordinates[0] by index parity).
  graceNotes?: GraceNoteDescriptor[] | null;
  graceType?: GraceType;
  graceDuration?: GraceDuration | null;
  graceSlur?: GraceSlur;
  // Staff Y of the reference note when ledger lines should render (in-staff
  // mode); null in standalone mode, matching the chord's own ledger behavior.
  graceLedgerStaffY?: number | null;
};

export const createChordSvg = ({
  duration,
  staffYCoordinates,
  noFlags = false,
  stemUp = true,
  stemExtension = 0,
  noteAccidentals,
  articulation,
  stress,
  graceNotes,
  graceType = 'acciaccatura',
  graceDuration = null,
  graceSlur = 'auto',
  graceLedgerStaffY = null,
}: ChordProps): [SVGElement | SVGGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('chord');
  svg.dataset.duration = duration;

  // For stem-up the stem belongs to the bottommost note (highest staffY);
  // for stem-down it belongs to the topmost note (lowest staffY).
  const stemNoteY = stemUp
    ? Math.max(...staffYCoordinates)
    : Math.min(...staffYCoordinates);

  // The stem must extend past all noteheads so the tip is the same height
  // above the outermost notehead as a single note's stem would be.
  const chordSpread =
    Math.max(...staffYCoordinates) - Math.min(...staffYCoordinates);

  const displacements = computeAdjacentDisplacements(staffYCoordinates, stemUp);
  const displacementMap = new Map(
    displacements.map((d) => [d.noteIndex, d.xOffset])
  );

  let extremalYOffset = 0;
  let extremalXOffset = 0;
  for (let i = 0; i < staffYCoordinates.length; i++) {
    const staffYCoordinate = staffYCoordinates[i];
    const isExtremal = staffYCoordinate === stemNoteY;
    // Articulation is a chord-level mark drawn once (below), never per note, so
    // the per-note SVGs are created without accent/articulation/stress.
    const [noteSvg, yOffset] = createNoteSvg({
      duration,
      noFlags,
      noStem: !isExtremal,
      stemUp,
      stemExtension: isExtremal
        ? noFlags
          ? stemExtension
          : Math.max(stemExtension, chordSpread)
        : 0,
      qualifiedElementName: 'svg',
    });
    if (isExtremal) {
      extremalYOffset = yOffset;
    }
    const xOffset = displacementMap.get(i) ?? 0;
    if (isExtremal) {
      extremalXOffset = xOffset;
    }
    if (xOffset !== 0) {
      noteSvg.setAttribute('x', xOffset.toString());
    }
    if (xOffset < 0) {
      svg.setAttribute('overflow', 'visible');
    }
    noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    noteSvg.setAttribute(
      'y',
      (STAFF_Y_PADDING + staffYCoordinate - yOffset).toString()
    );
    svg.appendChild(noteSvg);
  }

  // Render accidentals if provided
  if (noteAccidentals) {
    const inputs: AccidentalPlacementInput[] = [];
    for (let i = 0; i < noteAccidentals.length; i++) {
      const acc = noteAccidentals[i];
      if (acc) {
        inputs.push({
          noteIndex: i,
          accidental: acc,
          yPixel: STAFF_Y_PADDING + staffYCoordinates[i],
        });
      }
    }

    if (inputs.length > 0) {
      const placements = computeChordAccidentalPlacements(inputs);
      svg.setAttribute('overflow', 'visible');

      for (const placement of placements) {
        const symbolHeight = ACCIDENTAL_SYMBOL_HEIGHT[placement.accidental];
        const symbolSvg = createAccidentalSvg(placement.accidental);

        // xOffset is already negative (left of notehead left edge)
        // yPixel is the notehead center in chord SVG space
        symbolSvg.setAttribute(
          'x',
          `${placement.xOffset - ACCIDENTAL_NOTE_GAP}`
        );
        symbolSvg.setAttribute('y', `${placement.yPixel - symbolHeight / 2}`);
        svg.appendChild(symbolSvg);
      }
    }
  }

  // Grace notes — placed before the chord, left of its accidental column and
  // any leftward-displaced heads.
  if (graceNotes && graceNotes.length > 0 && staffYCoordinates.length > 0) {
    const referenceStaffY = staffYCoordinates[0];
    const referenceHeadCenterYPx =
      STAFF_Y_PADDING + referenceStaffY - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const referenceHeadCenterXPx =
      noteHeadCenter(stemUp, duration, noFlags).cx * NOTE_SCALE +
      (displacementMap.get(0) ?? 0);
    // The slur's landing target when it bulges above (see buildGraceSlur) —
    // the chord's top (highest-pitch) note, found by actual staffY minimum
    // since staffYCoordinates preserves declaration order, not pitch order.
    const topNoteIndex = staffYCoordinates.indexOf(
      Math.min(...staffYCoordinates)
    );
    const topNoteHeadCenterYPx =
      STAFF_Y_PADDING +
      staffYCoordinates[topNoteIndex] -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const topNoteHeadCenterXPx =
      noteHeadCenter(stemUp, duration, noFlags).cx * NOTE_SCALE +
      (displacementMap.get(topNoteIndex) ?? 0);
    const shownAccidentals = (noteAccidentals ?? []).filter(
      (noteAccidental): noteAccidental is AccidentalType =>
        noteAccidental != null
    );
    const anyAccidentalShown = shownAccidentals.length > 0;
    const accidentalColumnWidth = anyAccidentalShown
      ? totalChordAccidentalWidth(noteAccidentals ?? [], staffYCoordinates)
      : 0;
    const maxLeftHeadDisplacement = Math.max(
      0,
      ...displacements.map((displacement) => -displacement.xOffset)
    );
    // Only used for a descending grace group's stem-tip slur anchoring (see
    // buildGraceSlur): when the chord is stem-up, its real rendered stem
    // tip (reusing the same stem X and chordSpread/stemExtension geometry
    // the chord's own stem uses above, lines ~66-97); when stem-down, the
    // chord's top note instead (no stem is projected in that case).
    // Unused (and harmless to compute) otherwise.
    const bottomNoteHeadCenterYPx =
      STAFF_Y_PADDING +
      Math.max(...staffYCoordinates) -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const effectiveStemExtension = noFlags
      ? stemExtension
      : Math.max(stemExtension, chordSpread);
    const mainSlurTargetXPx = stemUp
      ? NOTE_STEM_X_OFFSET + extremalXOffset
      : topNoteHeadCenterXPx;
    const mainSlurTargetYPx = stemUp
      ? bottomNoteHeadCenterYPx - BASE_STEM_LENGTH_PX - effectiveStemExtension
      : topNoteHeadCenterYPx;
    const graceGroup = createGraceNotesSvg({
      graceNotes,
      graceType,
      graceDuration,
      graceSlur,
      mainHeadCenterXPx: referenceHeadCenterXPx,
      mainHeadCenterYPx: referenceHeadCenterYPx,
      mainTopNoteXPx: topNoteHeadCenterXPx,
      mainTopNoteYPx: topNoteHeadCenterYPx,
      mainSlurTargetXPx,
      mainSlurTargetYPx,
      anchorRightXPx:
        -Math.max(accidentalColumnWidth, maxLeftHeadDisplacement) -
        GRACE_MAIN_GAP_PX,
      mainAccidentalShown: anyAccidentalShown,
      mainStemUp: stemUp,
      mainStaffY: graceLedgerStaffY,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(graceGroup);
  }

  // Chord-level articulation — drawn once, over the extremal (stem-side outer)
  const { cx: noteHeadCenterX, cy: noteHeadCenterY } = noteHeadCenter(
    stemUp,
    duration,
    noFlags
  );
  const articulationMarks = createArticulationMarks({
    articulation,
    stress,
    stemUp,
    noteHeadCenterX,
    noteHeadCenterY,
  });
  if (articulationMarks) {
    const wrapper = document.createElementNS(SVG_NS, 'svg');
    wrapper.setAttribute('overflow', 'visible');
    if (extremalXOffset !== 0) {
      wrapper.setAttribute('x', extremalXOffset.toString());
    }
    wrapper.setAttribute(
      'y',
      (STAFF_Y_PADDING + stemNoteY - extremalYOffset).toString()
    );
    const scaled = document.createElementNS(SVG_NS, 'g');
    scaled.setAttribute('transform', `scale(${NOTE_SCALE})`);
    scaled.appendChild(articulationMarks);
    wrapper.appendChild(scaled);
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(wrapper);
  }

  return [svg, extremalYOffset];
};
