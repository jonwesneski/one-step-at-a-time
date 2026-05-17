import {
  computeChordAccidentalPlacements,
  type AccidentalPlacementInput,
} from '../../rules/accidentalRules';
import { AccidentalType } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
} from '../notationDimensions';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import { createNoteSvg, type NoteProps } from './note';
import { createSharpSvg } from './sharp';

type ChordProps = NoteProps & {
  staffYCoordinates: number[];
  noteAccidentals?: (AccidentalType | null | undefined)[];
};

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
