import {
  computeChordAccidentalPlacements,
  totalChordAccidentalWidth,
  type AccidentalPlacementInput,
} from '../../rules/accidentalRules';
import {
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
} from '../../rules/arpeggioRules';
import { computeAdjacentDisplacements } from '../../rules/chordRules';
import { GraceNoteDescriptor } from '../../rules/graceRules';
import type {
  AccidentalType,
  ArpeggioType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  TrillFinishSlur,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ARPEGGIO_CHORD_GAP_PX,
  ARPEGGIO_WAVE_WIDTH_PX,
  BASE_STEM_LENGTH_PX,
  GRACE_MAIN_GAP_PX,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TRILL_ABOVE_STAFF_GAP_PX,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';
import {
  appendArpeggioHairpin,
  createArpeggioSvg,
  isArpeggioWaveVariant,
} from './arpeggio';
import { createArticulationMarks } from './articulations';
import { createGraceNotesSvg, createTrillFinishNotesSvg } from './graceNotes';
import {
  createNoteSvg,
  NOTE_HEAD_RADIUS_PX,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  NOTE_STEM_X_OFFSET,
  NOTE_SVG_WIDTH,
  noteHeadCenter,
  type NoteProps,
} from './note';
import { createTrillSignSvg } from './trill';

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
  arpeggio?: ArpeggioType | null;
  arpeggioHairpin?: HairpinKind | null;
  arpeggioHairpinFrom?: DynamicMarking | null;
  arpeggioHairpinTo?: DynamicMarking | null;
  trill?: boolean;
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
  // A trill's finishing grace note(s), placed after the chord — same
  // reference-note relationship as graceNotes.
  trillFinishNotes?: GraceNoteDescriptor[] | null;
  trillFinishSlur?: TrillFinishSlur;
};

export const createChordSvg = ({
  duration,
  staffYCoordinates,
  arpeggio = null,
  arpeggioHairpin = null,
  arpeggioHairpinFrom = null,
  arpeggioHairpinTo = null,
  trill = false,
  trillAccidental = null,
  trillSignExtraLift = 0,
  noFlags = false,
  noStem = false,
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
  trillFinishNotes,
  trillFinishSlur = 'to-main',
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
      // A chord-level noStem (the whole chord defers to a cross-staff shared
      // stem drawn elsewhere) suppresses every notehead's own stem, including
      // the extremal one — not just the non-extremal noteheads that already
      // never draw their own stem within a normal chord.
      noStem: noStem || !isExtremal,
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

  // Leftward extent of the chord's own column (accidentals and displaced
  // heads) — the arpeggio sign sits just left of this, and the grace group
  // just left of the sign.
  const anyAccidentalShown = (noteAccidentals ?? []).some(
    (noteAccidental) => noteAccidental != null
  );
  const accidentalColumnWidth = anyAccidentalShown
    ? totalChordAccidentalWidth(noteAccidentals ?? [], staffYCoordinates)
    : 0;
  const maxLeftHeadDisplacement = Math.max(
    0,
    ...displacements.map((displacement) => -displacement.xOffset)
  );
  const arpeggioFootprint = computeArpeggioFootprintWidth(
    arpeggio,
    anyAccidentalShown
  );
  const drawArpeggioHairpin =
    arpeggioHairpin !== null && isArpeggioWaveVariant(arpeggio);
  const arpeggioHairpinFootprint = drawArpeggioHairpin
    ? computeArpeggioHairpinFootprintWidth(
        arpeggioHairpin,
        arpeggioHairpinFrom,
        arpeggioHairpinTo
      )
    : 0;

  // Absolute left edge (chord-SVG coords) of the chord's leftmost column.
  // maxLeftHeadDisplacement is a leftward delta on an adjacent head, not a
  // coordinate, so subtract it from the real notehead-left edge.
  const normalHeadLeftX =
    noteHeadCenter(stemUp, duration, noFlags).cx * NOTE_SCALE -
    NOTE_HEAD_RADIUS_PX;
  let columnLeftX = normalHeadLeftX;
  if (maxLeftHeadDisplacement > 0) {
    columnLeftX = Math.min(
      columnLeftX,
      normalHeadLeftX - maxLeftHeadDisplacement
    );
  }
  if (anyAccidentalShown) {
    columnLeftX = Math.min(columnLeftX, -accidentalColumnWidth);
  }

  // Grace notes — placed before the chord, left of its accidental column,
  // any leftward-displaced heads, and any arpeggio sign.
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
        columnLeftX -
        arpeggioFootprint -
        arpeggioHairpinFootprint -
        GRACE_MAIN_GAP_PX,
      mainAccidentalShown: anyAccidentalShown,
      mainStemUp: stemUp,
      mainStaffY: graceLedgerStaffY,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(graceGroup);
  }

  // Finishing grace note(s) — placed after the chord's own notehead column.
  // Chords reserve no rightward decoration today, so (unlike the leading
  // side) the anchor is the fixed per-entry SVG width every note/chord
  // shares (NOTE_SVG_WIDTH), not a chord-specific right edge.
  if (trillFinishNotes && trillFinishNotes.length > 0) {
    const referenceHeadCenterYPx =
      STAFF_Y_PADDING + staffYCoordinates[0] - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const referenceHeadCenterXPx =
      noteHeadCenter(stemUp, duration, noFlags).cx * NOTE_SCALE +
      (displacementMap.get(0) ?? 0);
    const { element: trillFinishGroup } = createTrillFinishNotesSvg({
      trillFinishNotes,
      trillFinishSlur,
      mainHeadCenterXPx: referenceHeadCenterXPx,
      mainHeadCenterYPx: referenceHeadCenterYPx,
      anchorLeftXPx: NOTE_SVG_WIDTH + GRACE_MAIN_GAP_PX,
      mainStaffY: graceLedgerStaffY,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(trillFinishGroup);
  }

  // Arpeggio sign — left of the accidental column / displaced heads (or just
  // left of the noteheads when there is neither), spanning the chord's
  // notehead range. staffYCoordinates is declaration order, not pitch order,
  // hence Math.min / Math.max for the top and bottom heads.
  if (arpeggio && staffYCoordinates.length > 0) {
    const topY =
      STAFF_Y_PADDING +
      Math.min(...staffYCoordinates) -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const bottomY =
      STAFF_Y_PADDING +
      Math.max(...staffYCoordinates) -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const signRightEdgeX = columnLeftX - ARPEGGIO_CHORD_GAP_PX;
    const sign = createArpeggioSvg({
      arpeggio,
      topY,
      bottomY,
      rightEdgeX: signRightEdgeX,
    });
    if (sign) {
      svg.setAttribute('overflow', 'visible');
      svg.appendChild(sign);
    }

    if (drawArpeggioHairpin && isArpeggioWaveVariant(arpeggio)) {
      appendArpeggioHairpin(svg, {
        kind: arpeggioHairpin,
        from: arpeggioHairpinFrom,
        to: arpeggioHairpinTo,
        arpeggio,
        topY,
        bottomY,
        signLeftEdgeX: signRightEdgeX - ARPEGGIO_WAVE_WIDTH_PX,
        staffRelative: true,
      });
    }
  }

  // Trill sign — a fixed gap above the staff top line, flush with the
  // notehead's own left edge (not shifted for an accidental column — the
  // sign sits well clear of the accidental's height, above the staff). A
  // constant staff-relative Y (not adjusted for the chord's own pitch) keeps
  // it aligned with the staff-level trill line drawn off the same notes.
  if (trill && staffYCoordinates.length > 0) {
    const bottomY =
      STAFF_Y_PADDING +
      STAFF_TOP_LINE_Y -
      NOTE_HEAD_Y_OFFSET_CORRECTION -
      TRILL_ABOVE_STAFF_GAP_PX -
      trillSignExtraLift;
    const sign = createTrillSignSvg({
      leftX: normalHeadLeftX,
      bottomY,
      accidental: trillAccidental,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(sign);
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
