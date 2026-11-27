import {
  type Phoneme,
  phonemeArrow,
  phonemeBracketWidthPx,
  phonemeSpacingPx,
  phonemeWidthPx,
} from '../../rules/phonemeRules';
import { SVG_NS } from '../consts';
import {
  PHONEME_ARROW_HEAD_HEIGHT_PX,
  PHONEME_ARROW_HEAD_LENGTH_PX,
  PHONEME_ASCENT_RATIO,
  PHONEME_FONT_SIZE_PX,
  PHONEME_INK_GAP_PX,
  PHONEME_X_HEIGHT_RATIO,
  STAFF_LINE_THICKNESS_PX,
} from '../notationDimensions';

function createText(
  content: string,
  x: number,
  baselineY: number,
  anchor: 'start' | 'middle' | 'end'
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', `${x}`);
  text.setAttribute('y', `${baselineY}`);
  text.setAttribute('text-anchor', anchor);
  text.setAttribute('font-size', `${PHONEME_FONT_SIZE_PX}`);
  text.setAttribute('font-family', 'serif');
  text.setAttribute('fill', 'currentColor');
  text.textContent = content;
  return text;
}

/** A phoneme, upright, centred on x. */
export function createPhonemeSvg(
  content: string,
  centerX: number,
  baselineY: number
): SVGTextElement {
  const text = createText(content, centerX, baselineY, 'middle');
  text.classList.add('phoneme');
  return text;
}

/** A run's opening bracket ending at x, or its closing one starting there. */
export function createPhonemeBracketSvg(
  side: 'open' | 'close',
  x: number,
  baselineY: number
): SVGTextElement {
  const text = createText(
    side === 'open' ? '[' : ']',
    x,
    baselineY,
    side === 'open' ? 'end' : 'start'
  );
  text.classList.add('phoneme-bracket');
  return text;
}

/** The height of a row's arrows: half its x-height above the baseline. */
export function phonemeArrowY(baselineY: number): number {
  return baselineY - (PHONEME_FONT_SIZE_PX * PHONEME_X_HEIGHT_RATIO) / 2;
}

/** An arrow between phonemes: a thin line, with an open head at its end. */
export function createPhonemeArrowSvg(
  fromX: number,
  toX: number,
  y: number,
  head: boolean
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('phoneme-arrow');
  const half = PHONEME_ARROW_HEAD_HEIGHT_PX / 2;
  const back = toX - Math.min(PHONEME_ARROW_HEAD_LENGTH_PX, toX - fromX);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${fromX} ${y} L ${toX} ${y}` +
      (head ? ` M ${back} ${y - half} L ${toX} ${y} L ${back} ${y + half}` : '')
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${STAFF_LINE_THICKNESS_PX}`);
  path.setAttribute('stroke-linejoin', 'round');
  group.appendChild(path);
  return group;
}

/**
 * A standalone entry's phonemes under its ink, the first on its head, each
 * run bracketed; an arrow out of the entry is dropped.
 */
export function createStandalonePhonemesSvg(
  phonemes: readonly Phoneme[],
  headX: number,
  inkBottomY: number
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('phonemes');
  const baselineY =
    inkBottomY +
    PHONEME_INK_GAP_PX +
    PHONEME_FONT_SIZE_PX * PHONEME_ASCENT_RATIO;
  const widths = phonemes.map(({ text }) => phonemeWidthPx(text));
  let centerX = headX;
  phonemes.forEach(({ text, arrowAfter }, i) => {
    const opens = i === 0 || !phonemes[i - 1].arrowAfter;
    const closes = !arrowAfter || i === phonemes.length - 1;
    const half = widths[i] / 2;
    if (opens) {
      group.appendChild(
        createPhonemeBracketSvg('open', centerX - half, baselineY)
      );
    }
    group.appendChild(createPhonemeSvg(text, centerX, baselineY));
    if (closes) {
      group.appendChild(
        createPhonemeBracketSvg('close', centerX + half, baselineY)
      );
    }
    const next = widths[i + 1];
    if (next === undefined) {
      return;
    }
    const linked = arrowAfter;
    const nextX =
      centerX +
      half +
      (linked ? phonemeSpacingPx(true) : phonemeSpacingPx(false)) +
      (linked ? 0 : 2 * phonemeBracketWidthPx()) +
      next / 2;
    const arrow = linked
      ? phonemeArrow(centerX + half, nextX - next / 2)
      : null;
    if (arrow !== null) {
      group.appendChild(
        createPhonemeArrowSvg(
          arrow.fromX,
          arrow.toX,
          phonemeArrowY(baselineY),
          arrow.head
        )
      );
    }
    centerX = nextX;
  });
  return group;
}
