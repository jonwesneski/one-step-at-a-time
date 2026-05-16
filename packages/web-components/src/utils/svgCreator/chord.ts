import { AccidentalType } from '../../types/theory';
import { SVG_NS } from '../consts';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import {
  createNoteSvg,
  type NoteProps,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
} from './note';
import { createSharpSvg } from './sharp';

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
  noteAccidentals?: (AccidentalType | null | undefined)[];
};

type AccidentalPlacementInput = {
  noteIndex: number;
  accidental: AccidentalType;
  yPixel: number;
};

type AccidentalPlacement = AccidentalPlacementInput & {
  xOffset: number;
};

const COLUMN_GAP = 2;

function hasVerticalStrokes(type: AccidentalType): boolean {
  return type === 'sharp' || type === 'natural';
}

function minVerticalClearance(a: AccidentalType, b: AccidentalType): number {
  if (hasVerticalStrokes(a) || hasVerticalStrokes(b)) {
    // Vertical strokes must not join — require clearance just over a sixth (~25px).
    return 26;
  }
  return (ACCIDENTAL_SYMBOL_HEIGHT[a] + ACCIDENTAL_SYMBOL_HEIGHT[b]) / 2;
}

function computeChordAccidentalPlacements(
  inputs: AccidentalPlacementInput[]
): AccidentalPlacement[] {
  if (inputs.length === 0) {
    return [];
  }

  // Sort ascending by yPixel (lowest y = highest pitch)
  const sorted = [...inputs].sort((a, b) => a.yPixel - b.yPixel);

  // Build interleaved order: highest, lowest, 2nd-highest, 2nd-lowest, ...
  // Exception: adjacent-note pairs (within one step ~5px) use descending order.
  const isAdjacentPair =
    sorted.length === 2 && Math.abs(sorted[0].yPixel - sorted[1].yPixel) <= 6;

  const ordered: AccidentalPlacementInput[] = [];
  if (isAdjacentPair) {
    ordered.push(sorted[0], sorted[1]);
  } else {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
      ordered.push(sorted[lo++]);
      if (lo <= hi) {
        ordered.push(sorted[hi--]);
      }
    }
  }

  // Assign columns: col 0 = rightmost (closest to notehead)
  const columns: AccidentalPlacementInput[][] = [];
  const placements: AccidentalPlacement[] = new Array(inputs.length);

  for (const item of ordered) {
    let assignedColumn = -1;
    for (let col = 0; col < columns.length; col++) {
      const fits = columns[col].every(
        (existing) =>
          Math.abs(existing.yPixel - item.yPixel) >=
          minVerticalClearance(existing.accidental, item.accidental)
      );
      if (fits) {
        assignedColumn = col;
        break;
      }
    }
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push([]);
    }
    columns[assignedColumn].push(item);

    // Placeholder — xOffset computed after all columns are assigned
    placements[item.noteIndex] = { ...item, xOffset: 0 };
  }

  // Compute column widths and cumulative x offsets
  const columnWidths = columns.map(
    (col) =>
      Math.max(...col.map((i) => ACCIDENTAL_SYMBOL_WIDTH[i.accidental])) +
      COLUMN_GAP
  );
  const cumulativeX: number[] = [];
  let runningX = 0;
  for (const width of columnWidths) {
    cumulativeX.push(runningX);
    runningX += width;
  }

  // Assign xOffset to each placement
  for (let col = 0; col < columns.length; col++) {
    for (const item of columns[col]) {
      placements[item.noteIndex] = {
        ...placements[item.noteIndex],
        xOffset: -(cumulativeX[col] + ACCIDENTAL_SYMBOL_WIDTH[item.accidental]),
      };
    }
  }

  return placements;
}

export function totalChordAccidentalWidth(
  noteAccidentals: (AccidentalType | null | undefined)[],
  staffYCoordinates: number[]
): number {
  const inputs: AccidentalPlacementInput[] = [];
  for (let i = 0; i < noteAccidentals.length; i++) {
    const acc = noteAccidentals[i];
    if (acc) {
      inputs.push({
        noteIndex: i,
        accidental: acc,
        yPixel: staffYCoordinates[i],
      });
    }
  }
  if (inputs.length === 0) {
    return 0;
  }
  const placements = computeChordAccidentalPlacements(inputs);
  if (placements.length === 0) {
    return 0;
  }
  return Math.min(...placements.map((p) => p.xOffset)) * -1;
}

export const createChordSvg = ({
  duration,
  staffYCoordinates,
  noFlags = false,
  stemUp = true,
  stemExtension = 0,
  noteAccidentals,
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

  let extremalYOffset = 0;
  for (let i = 0; i < staffYCoordinates.length; i++) {
    const staffYCoordinate = staffYCoordinates[i];
    const isExtremal = staffYCoordinate === stemNoteY;
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
    noteSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    noteSvg.setAttribute('y', (8 + staffYCoordinate - yOffset).toString());
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
          yPixel: 8 + staffYCoordinates[i],
        });
      }
    }

    if (inputs.length > 0) {
      const placements = computeChordAccidentalPlacements(inputs);
      svg.setAttribute('overflow', 'visible');

      for (const placement of placements) {
        const symbolWidth = ACCIDENTAL_SYMBOL_WIDTH[placement.accidental];
        const symbolHeight = ACCIDENTAL_SYMBOL_HEIGHT[placement.accidental];

        let symbolSvg: SVGElement;
        if (placement.accidental === 'sharp') {
          symbolSvg = createSharpSvg();
        } else if (placement.accidental === 'flat') {
          symbolSvg = createFlatSvg();
        } else if (placement.accidental === 'natural') {
          symbolSvg = createNaturalSvg();
        } else if (placement.accidental === 'double-sharp') {
          symbolSvg = createDoubleSharpSvg();
        } else {
          symbolSvg = createDoubleFlatSvg();
        }

        // xOffset is already negative (left of notehead left edge)
        // yPixel is the notehead center in chord SVG space
        symbolSvg.setAttribute('x', `${placement.xOffset - symbolWidth}`);
        symbolSvg.setAttribute('y', `${placement.yPixel - symbolHeight / 2}`);
        svg.appendChild(symbolSvg);
      }
    }
  }

  return [svg, extremalYOffset];
};
