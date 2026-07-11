import { AccidentalType } from '../../types/theory';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import { createSharpSvg } from './sharp';

export function createAccidentalSvg(accidental: AccidentalType): SVGElement {
  switch (accidental) {
    case 'sharp':
      return createSharpSvg();
    case 'flat':
      return createFlatSvg();
    case 'natural':
      return createNaturalSvg();
    case 'double-sharp':
      return createDoubleSharpSvg();
    default:
      return createDoubleFlatSvg();
  }
}
