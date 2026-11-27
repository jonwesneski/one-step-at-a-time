import {
  accidentalInkRect,
  accidentalPitchOffset,
  computeChordAccidentalPlacements,
  totalChordAccidentalWidth,
  type AccidentalPlacementInput,
} from '../../rules/accidentalRules';
import {
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
} from '../../rules/arpeggioRules';
import {
  augmentationDotRowWidthPx,
  resolveChordDotStaffYs,
} from '../../rules/augmentationDotRules';
import { contourMinLengthPx } from '../../rules/bendContourRules';
import {
  computeAdjacentDisplacements,
  type HeadExtent,
  type NoteDisplacement,
} from '../../rules/chordRules';
import type { ObstacleRect } from '../../rules/connectorPlacementRules';
import {
  bendDotYs,
  layoutBends,
  type ResolvedBend,
} from '../../rules/glissandoRules';
import { GraceNoteDescriptor } from '../../rules/graceRules';
import { isHeadless } from '../../rules/noteheadRules';
import { signStackHeightPx } from '../../rules/signRules';
import {
  durationToBase,
  durationToDotCount,
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
  DurationType,
  GraceDuration,
  GraceSlur,
  GraceType,
  NoteheadType,
  TrillFinishSlur,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ARPEGGIO_CHORD_GAP_PX,
  AUGMENTATION_DOT_NOTEHEAD_GAP_PX,
  BASE_STEM_LENGTH_PX,
  BEND_STANDALONE_LENGTH_PX,
  BREATH_MARK_INK_GAP_PX,
  BREATH_MARK_STANDALONE_GAP_PX,
  GRACE_MAIN_GAP_PX,
  SIGN_GAP_PX,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  STEM_OVERLAP_PX,
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
import { createGraceNotesSvg, createTrillFinishNotesSvg } from './graceNotes';
import {
  computeYHeadOffset,
  createNoteSvg,
  cueLeftShiftPx,
  flagStemExtensionPx,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  NOTE_SVG_WIDTH,
  noteHeadCenter,
  noteHeadGeometry,
  placeAccidentalSvg,
  stemBeamJunctionPosition,
  stemTipPosition,
  TAIL_UP_WIDTH_PX,
  upTailDotClearX,
  upTailInk,
  type NoteDotLayout,
  type NoteProps,
} from './note';
import { createStandalonePhonemesSvg } from './phonemes';
import { createSignsSvg } from './signs';
import { createStemMarkSvg } from './stemMark';
import {
  appendTechniqueLabels,
  appendTechniqueTextBelow,
  techniqueLabels,
} from './techniqueLabel';
import { createTremoloNumeral, createTremoloStrokes } from './tremolo';
import { createTrillSignSvg } from './trill';

// A chord draws its tones itself, so the per-note head/accidental/staff
// props don't apply.
type ChordProps = Omit<
  NoteProps,
  | 'qualifiedElementName'
  | 'tailRoomStemExtension'
  | 'notehead'
  | 'accidental'
  | 'staffY'
  | 'bend'
> & {
  staffYCoordinates: number[];
  noteAccidentals?: (AccidentalType | null | undefined)[];
  // Per tone: a reminder accidental, drawn in parentheses.
  noteAccidentalsParenthesized?: readonly boolean[];
  // Per tone, aligned with staffYCoordinates; missing entries are normal.
  noteheads?: readonly NoteheadType[];
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
  // A standalone chord's bends, per tone.
  bends?: readonly (ResolvedBend | null)[];
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
  noteAccidentalsParenthesized = [],
  noteheads = [],
  articulation,
  stress,
  articulationStemAnchorBeamLevels = null,
  graceNotes,
  graceType = 'acciaccatura',
  graceDuration = null,
  graceSlur = 'auto',
  graceLedgerStaffY = null,
  trillFinishNotes,
  trillFinishSlur = 'to-main',
  augmentationDotRows = null,
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
  bends = [],
  scale = 1,
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
  // The real extension the extremal note's own stem actually renders with.
  // A beamed stem's extension already includes the spread; an unbeamed one is
  // measured from the head nearest the open end. Reused below for the
  // chord-level articulation anchor and the grace slur target.
  const effectiveStemExtension = noFlags
    ? stemExtension
    : stemExtension + chordSpread;

  const headInput = {
    duration,
    staffYCoordinates,
    stemUp,
    noFlags,
    noteheads,
    scale,
  };
  const headLeftOverhang = chordHeadLeftOverhangPx(headInput);
  const displacements = chordHeadDisplacements(headInput);
  const displacementMap = new Map(
    displacements.map((d) => [d.noteIndex, d.xOffset])
  );

  let extremalYOffset = 0;
  let extremalXOffset = 0;
  for (let i = 0; i < staffYCoordinates.length; i++) {
    const staffYCoordinate = staffYCoordinates[i];
    const isExtremal = staffYCoordinate === stemNoteY;
    // Articulation is a chord-level mark drawn once (below), never per note, so
    // the per-note SVGs are created without accent/articulation/stress. The
    // same goes for dots: tones get the undotted value and the chord draws
    // one dot column below.
    const [noteSvg, yOffset] = createNoteSvg({
      duration: durationToBase[duration],
      noFlags,
      // A chord-level noStem (the whole chord defers to a cross-staff shared
      // stem drawn elsewhere) suppresses every notehead's own stem, including
      // the extremal one — not just the non-extremal noteheads that already
      // never draw their own stem within a normal chord.
      noStem: noStem || !isExtremal,
      stemUp,
      stemExtension: isExtremal ? effectiveStemExtension : 0,
      tailRoomStemExtension: isExtremal ? stemExtension : 0,
      qualifiedElementName: 'svg',
      notehead: noteheads[i] ?? 'normal',
      scale,
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

  const stemless = isStemlessDuration(duration);
  const base = durationToBase[duration];
  const outward = stemUp ? -1 : 1;
  // Strokes start past the head nearest the stem's open end.
  const nearestHeadY = stemUp
    ? Math.min(...staffYCoordinates)
    : Math.max(...staffYCoordinates);
  const ending = stemEndingFor(duration, noFlags);
  // Base-length stem from that head, to a beam's outer edge when beamed.
  const nearestHeadStemLengthPx =
    scale * BASE_STEM_LENGTH_PX +
    (noFlags ? stemExtension - chordSpread : stemExtension) +
    (ending.kind === 'beam' ? STEM_OVERLAP_PX : 0);
  const nearestHeadCenterY = chordToneHeadCenterY(
    nearestHeadY,
    stemUp,
    base,
    noFlags
  );
  const stemOuterY =
    nearestHeadCenterY +
    outward *
      (nearestHeadStemLengthPx +
        (ending.kind === 'tail'
          ? scale * flagStemExtensionPx(ending.flagCount)
          : 0));
  const topHeadCenterY = chordToneHeadCenterY(
    Math.min(...staffYCoordinates),
    stemUp,
    base,
    noFlags
  );
  // Outermost ink (px) above the chord, for a standalone label.
  let inkTopY =
    topHeadCenterY -
    noteHeadGeometry(stemUp, base, noFlags, 'normal', scale).halfHeight *
      NOTE_SCALE;
  if (!stemUp) {
    inkTopY = Math.min(
      inkTopY,
      topHeadCenterY -
        articulationStackDepth(articulation, stress, scale) * NOTE_SCALE
    );
  }
  // A breath mark sits beside the stem, clear of whatever is above the heads.
  const besideStemTopY = inkTopY;
  if (stemUp && !stemless && !noStem) {
    inkTopY = Math.min(inkTopY, stemOuterY);
  }
  // Lowest ink (px), for a standalone text below.
  const bottomHeadCenterY = chordToneHeadCenterY(
    Math.max(...staffYCoordinates),
    stemUp,
    base,
    noFlags
  );
  let inkBottomY =
    bottomHeadCenterY +
    noteHeadGeometry(stemUp, base, noFlags, 'normal', scale).halfHeight *
      NOTE_SCALE;
  if (stemUp) {
    inkBottomY = Math.max(
      inkBottomY,
      bottomHeadCenterY +
        articulationStackDepth(articulation, stress, scale) * NOTE_SCALE
    );
  } else if (!stemless && !noStem) {
    inkBottomY = Math.max(inkBottomY, stemOuterY);
  }
  if ((tremoloStrokeCount > 0 || stemMark !== null) && (stemless || !noStem)) {
    const { centerYs, markCenterY } = resolveStrokePlacement({
      headY: nearestHeadY,
      stemUp,
      stemMark,
      strokeCount: tremoloStrokeCount,
      staff: STAFF_BAND,
      stemLengthPx: stemless ? null : nearestHeadStemLengthPx,
      ending,
      canLengthenStem: false,
    });
    // A stemless chord centres its strokes on its undisplaced column, the
    // side a stem's heads normally sit.
    const centerX = stemless
      ? noteHeadGeometry(stemUp, base, noFlags, 'normal', scale).cx * NOTE_SCALE
      : extremalXOffset +
        stemTipPosition(stemUp, base, noFlags, 0, scale).x * NOTE_SCALE;
    const strokeYs = centerYs.map((y) =>
      chordToneHeadCenterY(y, stemUp, base, noFlags)
    );
    svg.setAttribute('overflow', 'visible');
    if (stemMark !== null && markCenterY !== null) {
      const crossY = chordToneHeadCenterY(markCenterY, stemUp, base, noFlags);
      svg.appendChild(createStemMarkSvg(stemMark, centerX, crossY, scale));
      if (stemless && stemUp) {
        inkTopY = Math.min(
          inkTopY,
          crossY - scale * stemMarkHalfHeightPx(stemMark)
        );
      }
    }
    if (strokeYs.length > 0) {
      svg.appendChild(createTremoloStrokes(centerX, strokeYs, scale));
    }
    const outerStrokeY = strokeYs[strokeYs.length - 1];
    if (stemless && stemUp && outerStrokeY !== undefined) {
      inkTopY = Math.min(inkTopY, outerStrokeY - TREMOLO_STROKE_HALF_HEIGHT_PX);
    }
    if (tremoloTuplet !== null && outerStrokeY !== undefined) {
      const outerEdgeY = stemless
        ? outerStrokeY + outward * TREMOLO_STROKE_HALF_HEIGHT_PX
        : stemOuterY;
      const numeralY =
        outerEdgeY +
        outward * (TREMOLO_NUMERAL_GAP_PX + TUPLET_NUMERAL_FONT_SIZE / 2);
      svg.appendChild(createTremoloNumeral(centerX, numeralY, tremoloTuplet));
      if (stemUp) {
        inkTopY = Math.min(inkTopY, numeralY - TUPLET_NUMERAL_FONT_SIZE / 2);
      }
    }
  }
  const labelHead = noteHeadGeometry(stemUp, base, noFlags, 'normal', scale);
  if (signs !== null) {
    const signsBottomY =
      signPlacement !== null
        ? chordToneHeadCenterY(signPlacement.bottomY, stemUp, base, noFlags)
        : inkTopY - SIGN_GAP_PX;
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(
      createSignsSvg(signs, labelHead.cx * NOTE_SCALE, signsBottomY)
    );
    inkTopY = Math.min(inkTopY, signsBottomY - signStackHeightPx(signs));
  }
  const labelLeftX = (labelHead.cx - labelHead.halfWidth) * NOTE_SCALE;
  appendTechniqueLabels(
    svg,
    labelLeftX,
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
      labelLeftX,
      inkBottomY,
      techniqueText
    );
  }
  if (phonemes !== null) {
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(
      createStandalonePhonemesSvg(
        phonemes,
        labelHead.cx * NOTE_SCALE,
        belowBottomY
      )
    );
  }

  const dotLayout = chordAugmentationDotLayout({
    duration,
    staffYCoordinates,
    stemUp,
    noFlags,
    noStem,
    noteheads,
    stemExtension,
    rowStaffYs: augmentationDotRows,
    scale,
  });
  const dots = dotLayout && createAugmentationDotsSvg(dotLayout);
  if (dots) {
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(dots);
  }

  if (breathMark !== null) {
    const tailRightX =
      stemUp && !noStem && ending.kind === 'tail'
        ? extremalXOffset +
          stemTipPosition(stemUp, base, noFlags, 0, scale).x * NOTE_SCALE +
          scale * TAIL_UP_WIDTH_PX
        : -Infinity;
    const rightX = Math.max(
      chordHeadExtentPx(headInput).right,
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

  if (bends.some((bend) => bend !== null)) {
    const headYs = staffYCoordinates.map(
      (staffY) => STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION
    );
    const dotYs = bendDotYs(headYs, dotLayout?.rowCentersY ?? []);
    const layout = layoutBends({
      heads: headYs.flatMap((y, i) => {
        const bend = bends[i] ?? null;
        return bend === null ? [] : [{ y, dotY: dotYs[i], staffY: null, bend }];
      }),
      inkRight: Math.max(
        chordHeadExtentPx(headInput).right,
        dotLayout?.rightEdgeX ?? -Infinity
      ),
      tail: chordUpTailInk({
        duration,
        staffYCoordinates,
        stemUp,
        noFlags,
        noStem,
        stemExtension,
        scale,
      }),
      limit: {
        kind: 'length',
        length: Math.max(
          BEND_STANDALONE_LENGTH_PX,
          ...bends.map((bend) => contourMinLengthPx(bend?.contour?.length ?? 0))
        ),
      },
      targetWidthPx: bendTargetWidthPx,
    });
    if (layout !== null) {
      svg.setAttribute('overflow', 'visible');
      svg.appendChild(createBendSvg(layout));
    }
  }

  // Render accidentals if provided
  const accidentalRects: ObstacleRect[] = [];
  if (noteAccidentals) {
    const inputs: AccidentalPlacementInput[] = [];
    for (let i = 0; i < noteAccidentals.length; i++) {
      const acc = noteAccidentals[i];
      if (acc) {
        inputs.push({
          noteIndex: i,
          accidental: acc,
          parenthesized: noteAccidentalsParenthesized[i] ?? false,
          // Centred on the head as drawn.
          yPixel: chordToneHeadCenterY(
            staffYCoordinates[i],
            stemUp,
            duration,
            noFlags,
            noteheads[i] ?? 'normal'
          ),
        });
      }
    }

    if (inputs.length > 0) {
      const placements = computeChordAccidentalPlacements(inputs, scale);
      svg.setAttribute('overflow', 'visible');

      for (const placement of placements) {
        const symbolSvg = createAccidentalSvg(
          placement.accidental,
          placement.parenthesized ?? false
        );
        symbolSvg.classList.add('accidental');

        // xOffset is already negative (left of notehead left edge)
        // yPixel is the notehead center in chord SVG space
        const symbolX =
          cueLeftShiftPx(stemUp, scale) +
          placement.xOffset -
          scale * ACCIDENTAL_NOTE_GAP -
          headLeftOverhang;
        accidentalRects.push(
          accidentalInkRect(placement.accidental, symbolX, placement.yPixel, {
            parenthesized: placement.parenthesized,
            scale,
          })
        );
        svg.appendChild(
          placeAccidentalSvg(
            symbolSvg,
            symbolX,
            placement.yPixel -
              scale * accidentalPitchOffset(placement.accidental),
            scale
          )
        );
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
    ? totalChordAccidentalWidth(
        noteAccidentals ?? [],
        staffYCoordinates,
        noteAccidentalsParenthesized,
        scale
      )
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
  const normalHeadLeftX = Math.min(
    ...(staffYCoordinates.length > 0 ? staffYCoordinates : [0]).map((_, i) => {
      const { cx, halfWidth } = noteHeadGeometry(
        stemUp,
        duration,
        noFlags,
        noteheads[i] ?? 'normal',
        scale
      );
      return (cx - halfWidth) * NOTE_SCALE;
    })
  );
  let columnLeftX = normalHeadLeftX;
  if (maxLeftHeadDisplacement > 0) {
    columnLeftX = Math.min(
      columnLeftX,
      normalHeadLeftX - maxLeftHeadDisplacement
    );
  }
  if (anyAccidentalShown) {
    columnLeftX = Math.min(
      columnLeftX,
      cueLeftShiftPx(stemUp, scale) - accidentalColumnWidth - headLeftOverhang
    );
  }

  // Grace notes — placed before the chord, left of its accidental column,
  // any leftward-displaced heads, and any arpeggio sign.
  if (graceNotes && graceNotes.length > 0 && staffYCoordinates.length > 0) {
    const referenceStaffY = staffYCoordinates[0];
    const referenceHeadCenterYPx =
      STAFF_Y_PADDING + referenceStaffY - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const referenceHeadCenterXPx =
      noteHeadCenter(stemUp, duration, noFlags, 'normal', scale).cx *
        NOTE_SCALE +
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
      noteHeadCenter(stemUp, duration, noFlags, 'normal', scale).cx *
        NOTE_SCALE +
      (displacementMap.get(topNoteIndex) ?? 0);
    // A descending grace group's slur target: the stem tip when stem-up,
    // else the top note.
    const bottomNoteHeadCenterYPx =
      STAFF_Y_PADDING +
      Math.max(...staffYCoordinates) -
      NOTE_HEAD_Y_OFFSET_CORRECTION;
    const mainSlurTargetXPx = stemUp
      ? stemTipPosition(stemUp, base, noFlags, 0, scale).x * NOTE_SCALE +
        extremalXOffset
      : topNoteHeadCenterXPx;
    const mainSlurTargetYPx = stemUp
      ? bottomNoteHeadCenterYPx -
        scale * BASE_STEM_LENGTH_PX -
        effectiveStemExtension
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
      mainAccidentalRects: accidentalRects,
      mainStemUp: stemUp,
      mainStaffY: graceLedgerStaffY,
      ratio: scale,
    });
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(graceGroup);
  }

  // Finishing grace note(s) — placed after the chord's own notehead column.
  // Anchored at NOTE_SVG_WIDTH, the per-entry width every note/chord shares.
  if (trillFinishNotes && trillFinishNotes.length > 0) {
    const referenceHeadCenterYPx =
      STAFF_Y_PADDING + staffYCoordinates[0] - NOTE_HEAD_Y_OFFSET_CORRECTION;
    const referenceHeadCenterXPx =
      noteHeadCenter(stemUp, duration, noFlags, 'normal', scale).cx *
        NOTE_SCALE +
      (displacementMap.get(0) ?? 0);
    const { element: trillFinishGroup } = createTrillFinishNotesSvg({
      trillFinishNotes,
      trillFinishSlur,
      mainHeadCenterXPx: referenceHeadCenterXPx,
      mainHeadCenterYPx: referenceHeadCenterYPx,
      anchorLeftXPx:
        Math.max(NOTE_SVG_WIDTH, dotLayout?.rightEdgeX ?? 0) +
        GRACE_MAIN_GAP_PX,
      mainStaffY: graceLedgerStaffY,
      ratio: scale,
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
        signRightEdgeX,
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
    noFlags,
    'normal',
    scale
  );
  const articulationMarks = createArticulationMarks({
    articulation,
    stress,
    stemUp,
    noteHeadCenterX,
    noteHeadCenterY:
      noteHeadCenterY -
      (signs !== null && !stemUp && articulationStemAnchorBeamLevels === null
        ? (signPlacement?.articulationLiftPx ?? 0) / NOTE_SCALE
        : 0),
    stemAnchor:
      articulationStemAnchorBeamLevels !== null
        ? stemBeamJunctionPosition(
            stemUp,
            duration,
            noFlags,
            effectiveStemExtension,
            articulationStemAnchorBeamLevels
          )
        : null,
    repeatCount: articulationRepeatCount,
    scale,
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

export type ChordDotLayoutInput = {
  duration: DurationType;
  staffYCoordinates: readonly number[];
  stemUp: boolean;
  noFlags: boolean;
  noStem: boolean;
  noteheads?: readonly NoteheadType[];
  stemExtension: number;
  // Overrides the chord's own dot rows (another voice placed them).
  rowStaffYs?: readonly number[] | null;
  scale?: number;
};

// The note the chord's stem starts from, the top of its SVG and how far the
// stem passes the other heads (px).
function chordStemNote(
  staffYCoordinates: readonly number[],
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean
): { index: number; top: number; spread: number } {
  const lowest = Math.max(...staffYCoordinates);
  const highest = Math.min(...staffYCoordinates);
  const index = staffYCoordinates.indexOf(stemUp ? lowest : highest);
  return {
    index,
    top:
      STAFF_Y_PADDING +
      staffYCoordinates[index] -
      computeYHeadOffset(stemUp, duration, noFlags),
    spread: lowest - highest,
  };
}

/**
 * How far right (chord px) and down (staff container px) a chord's up-stem
 * tails reach, or null with none. One staff Y gives a note's.
 */
export function chordUpTailInk({
  duration,
  staffYCoordinates,
  stemUp,
  noFlags,
  noStem,
  stemExtension,
  scale = 1,
}: {
  duration: DurationType;
  staffYCoordinates: readonly number[];
  stemUp: boolean;
  noFlags: boolean;
  noStem: boolean;
  stemExtension: number;
  scale?: number;
}): { right: number; bottomY: number } | null {
  const { index, top, spread } = chordStemNote(
    staffYCoordinates,
    stemUp,
    duration,
    noFlags
  );
  const tail = upTailInk({
    duration,
    stemUp,
    noFlags,
    noStem,
    stemExtension: noFlags ? stemExtension : stemExtension + spread,
    tailRoomStemExtension: stemExtension,
    scale,
  });
  if (tail === null) {
    return null;
  }
  const displacement = chordHeadDisplacements({
    duration,
    staffYCoordinates,
    stemUp,
    noFlags,
    scale,
  }).find(({ noteIndex }) => noteIndex === index);
  return {
    right: tail.rightX + (displacement?.xOffset ?? 0),
    bottomY: top + tail.bottomY,
  };
}

/**
 * One dot column after the chord's rightmost head (displaced heads included),
 * in chord-SVG px; rows follow resolveChordDotStaffYs.
 */
export function chordAugmentationDotLayout({
  duration,
  staffYCoordinates,
  stemUp,
  noFlags,
  noStem,
  noteheads = [],
  stemExtension,
  rowStaffYs = null,
  scale = 1,
}: ChordDotLayoutInput): NoteDotLayout | null {
  const dotCount = durationToDotCount[duration];
  const headedYs = staffYCoordinates.filter(
    (_, index) => !isHeadless(noteheads[index] ?? null)
  );
  if (dotCount === 0 || headedYs.length === 0 || rowStaffYs?.length === 0) {
    return null;
  }
  const headInput = {
    duration,
    staffYCoordinates,
    stemUp,
    noFlags,
    noteheads,
    scale,
  };
  const displacementMap = new Map(
    chordHeadDisplacements(headInput).map((d) => [d.noteIndex, d.xOffset])
  );
  const { right: headRightX } = chordHeadExtentPx(headInput);
  const rowCentersY = (rowStaffYs ?? resolveChordDotStaffYs(headedYs)).map(
    (staffY) => STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION
  );
  let leftX = headRightX + scale * AUGMENTATION_DOT_NOTEHEAD_GAP_PX;

  const stemNote = chordStemNote(staffYCoordinates, stemUp, duration, noFlags);
  const tailClearX = upTailDotClearX({
    duration,
    stemUp,
    noFlags,
    noStem,
    stemExtension: noFlags ? stemExtension : stemExtension + stemNote.spread,
    tailRoomStemExtension: stemExtension,
    rowCentersY: rowCentersY.map((y) => y - stemNote.top),
    scale,
  });
  if (tailClearX !== null) {
    leftX = Math.max(
      leftX,
      tailClearX + (displacementMap.get(stemNote.index) ?? 0)
    );
  }
  return {
    dotCount,
    leftX,
    rowCentersY,
    rightEdgeX: leftX + augmentationDotRowWidthPx(dotCount, scale),
    scale,
  };
}

export type ChordHeadExtentInput = {
  duration: DurationType;
  staffYCoordinates: readonly number[];
  stemUp: boolean;
  noFlags: boolean;
  noteheads?: readonly NoteheadType[];
  scale?: number;
};

// One tone's head in its undisplaced place.
function undisplacedHeadExtentPx(
  {
    duration,
    stemUp,
    noFlags,
    noteheads = [],
    scale = 1,
  }: ChordHeadExtentInput,
  toneIndex: number
): HeadExtent {
  const { cx, halfWidth } = noteHeadGeometry(
    stemUp,
    duration,
    noFlags,
    noteheads[toneIndex] ?? 'normal',
    scale
  );
  return {
    left: (cx - halfWidth) * NOTE_SCALE,
    right: (cx + halfWidth) * NOTE_SCALE,
  };
}

/**
 * The heads a chord moves aside, each clear of the head a step from it. A
 * headless tone has nothing to move or to clear.
 */
export function chordHeadDisplacements(
  input: ChordHeadExtentInput
): NoteDisplacement[] {
  const headed = input.staffYCoordinates.flatMap((_, index) =>
    isHeadless(input.noteheads?.[index] ?? null) ? [] : [index]
  );
  return computeAdjacentDisplacements(
    headed.map((index) => input.staffYCoordinates[index]),
    input.stemUp,
    headed.map((index) => undisplacedHeadExtentPx(input, index))
  ).map((displacement) => ({
    ...displacement,
    noteIndex: headed[displacement.noteIndex],
  }));
}

/** Left and right ink edges (chord-SVG px) of one tone's head, displaced or not. */
export function chordToneHeadExtentPx(
  input: ChordHeadExtentInput,
  toneIndex: number
): HeadExtent {
  const shift =
    chordHeadDisplacements(input).find(
      (displacement) => displacement.noteIndex === toneIndex
    )?.xOffset ?? 0;
  const { left, right } = undisplacedHeadExtentPx(input, toneIndex);
  return { left: left + shift, right: right + shift };
}

// Centre Y (chord-SVG px) of the head at staffY, as createChordSvg places it.
export function chordToneHeadCenterY(
  staffY: number,
  stemUp: boolean,
  duration: DurationType,
  noFlags: boolean,
  notehead: NoteheadType = 'normal'
): number {
  const base = durationToBase[duration];
  return (
    STAFF_Y_PADDING +
    staffY -
    computeYHeadOffset(stemUp, base, noFlags) +
    noteHeadGeometry(stemUp, base, noFlags, notehead).cy * NOTE_SCALE
  );
}

/**
 * How far (px) a chord's heads, displaced ones included, reach left of where
 * an ellipse's left edge would be; what is drawn left of the heads moves left
 * by it.
 */
export function chordHeadLeftOverhangPx(input: ChordHeadExtentInput): number {
  if (input.staffYCoordinates.length === 0) {
    return 0;
  }
  const plain = noteHeadGeometry(
    input.stemUp,
    input.duration,
    input.noFlags,
    'normal',
    input.scale
  );
  return Math.max(
    0,
    (plain.cx - plain.halfWidth) * NOTE_SCALE - chordHeadExtentPx(input).left
  );
}

/** Left and right ink edges (chord-SVG px) of every head, displaced ones included. */
export function chordHeadExtentPx(input: ChordHeadExtentInput): {
  left: number;
  right: number;
} {
  let left = Infinity;
  let right = -Infinity;
  input.staffYCoordinates.forEach((_, index) => {
    const extent = chordToneHeadExtentPx(input, index);
    left = Math.min(left, extent.left);
    right = Math.max(right, extent.right);
  });
  return { left, right };
}
