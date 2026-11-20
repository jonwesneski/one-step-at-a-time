import { AccidentalType } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ACCIDENTAL_REMINDER_PAREN_WIDTH_PX,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  STAFF_LINE_SPACING,
} from '../notationDimensions';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import { createParenthesisSvg } from './parenthesis';
import { createSharpSvg } from './sharp';

function createGlyph(accidental: AccidentalType): SVGElement {
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

/**
 * An accidental's glyph, or for a reminder the glyph between parentheses,
 * in a box `accidentalSymbolWidth` wide and the glyph's height tall.
 */
export function createAccidentalSvg(
  accidental: AccidentalType,
  parenthesized = false
): SVGElement {
  const glyph = createGlyph(accidental);
  if (!parenthesized) {
    return glyph;
  }
  const glyphWidth = ACCIDENTAL_SYMBOL_WIDTH[accidental];
  const glyphHeight = ACCIDENTAL_SYMBOL_HEIGHT[accidental];
  const parenWidth = ACCIDENTAL_REMINDER_PAREN_WIDTH_PX;
  const parenHeight = Math.max(glyphHeight * 0.8, STAFF_LINE_SPACING * 2);
  const parenTop = (glyphHeight - parenHeight) / 2;
  const wrapper = document.createElementNS(SVG_NS, 'svg');
  wrapper.classList.add('accidental-reminder');
  wrapper.setAttribute('width', `${glyphWidth + parenWidth * 2}`);
  wrapper.setAttribute('height', `${glyphHeight}`);
  wrapper.setAttribute('overflow', 'visible');
  glyph.setAttribute('x', `${parenWidth}`);
  glyph.setAttribute('y', '0');
  wrapper.append(
    createParenthesisSvg('open', 0, parenTop, parenWidth, parenHeight),
    glyph,
    createParenthesisSvg(
      'close',
      parenWidth + glyphWidth,
      parenTop,
      parenWidth,
      parenHeight
    )
  );
  return wrapper;
}
