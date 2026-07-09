import { AccidentalType } from '../../types/theory';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import { createSharpSvg } from './sharp';

export function createAccidentalSvg(accidental: AccidentalType): SVGElement {
  if (accidental === 'sharp') {
    return createSharpSvg();
  } else if (accidental === 'flat') {
    return createFlatSvg();
  } else if (accidental === 'natural') {
    return createNaturalSvg();
  } else if (accidental === 'double-sharp') {
    return createDoubleSharpSvg();
  } else {
    return createDoubleFlatSvg();
  }
}
