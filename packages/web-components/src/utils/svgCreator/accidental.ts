import {
  accidentalReminderPadding,
  accidentalReminderParenCenter,
  accidentalReminderParenHeight,
  accidentalSymbolHeight,
  accidentalSymbolWidth,
  baseAccidental,
  quarterToneOf,
} from '../../rules/accidentalRules';
import type {
  AccidentalType,
  ConventionalAccidentalType,
} from '../../types/theory';
import { SVG_NS } from '../consts';
import { ACCIDENTAL_REMINDER_PAREN_WIDTH_PX } from '../notationDimensions';
import { appendAccidentalArrow } from './accidentalArrow';
import { createDoubleFlatSvg } from './doubleFlat';
import { createDoubleSharpSvg } from './doubleSharp';
import { createFlatSvg } from './flat';
import { createNaturalSvg } from './natural';
import { createParenthesisSvg } from './parenthesis';
import { createSharpSvg } from './sharp';

function createBaseGlyph(accidental: ConventionalAccidentalType): SVGElement {
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

function createGlyph(accidental: AccidentalType): SVGElement {
  const base = baseAccidental(accidental);
  const glyph = createBaseGlyph(base);
  const quarterTone = quarterToneOf(accidental);
  if (quarterTone !== null) {
    appendAccidentalArrow(glyph, base, quarterTone);
  }
  return glyph;
}

/**
 * An accidental's glyph, or for a reminder the glyph between parentheses,
 * in a box `accidentalSymbolWidth` wide and the glyph's height tall. A
 * quarter-tone arrow reaches above or below that box.
 */
export function createAccidentalSvg(
  accidental: AccidentalType,
  parenthesized = false
): SVGElement {
  const glyph = createGlyph(accidental);
  if (!parenthesized) {
    return glyph;
  }
  const { left } = accidentalReminderPadding(accidental);
  const width = accidentalSymbolWidth(accidental, true);
  const glyphHeight = accidentalSymbolHeight(accidental);
  const parenWidth = ACCIDENTAL_REMINDER_PAREN_WIDTH_PX;
  const parenHeight = accidentalReminderParenHeight(accidental);
  const parenTop = accidentalReminderParenCenter(accidental) - parenHeight / 2;
  const wrapper = document.createElementNS(SVG_NS, 'svg');
  wrapper.classList.add('accidental-reminder');
  wrapper.setAttribute('width', `${width}`);
  wrapper.setAttribute('height', `${glyphHeight}`);
  wrapper.setAttribute('overflow', 'visible');
  glyph.setAttribute('x', `${parenWidth + left}`);
  glyph.setAttribute('y', '0');
  wrapper.append(
    createParenthesisSvg('open', 0, parenTop, parenWidth, parenHeight),
    glyph,
    createParenthesisSvg(
      'close',
      width - parenWidth,
      parenTop,
      parenWidth,
      parenHeight
    )
  );
  return wrapper;
}
