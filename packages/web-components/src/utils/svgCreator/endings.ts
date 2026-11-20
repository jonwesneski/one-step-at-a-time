import { SVG_NS } from '../consts';
import {
  ENDING_HOOK_PX,
  ENDING_LABEL_FONT_SIZE,
  ENDING_LABEL_HEIGHT_PX,
  ENDING_LABEL_INSET_PX,
  ENDING_LINE_THICKNESS_PX,
} from '../notationDimensions';

export type EndingSegmentSvgInput = {
  x1: number;
  x2: number;
  y: number;
  leftHook: boolean;
  rightHook: boolean;
  label: string | null;
  labelIsText: boolean;
};

const rect = (x: number, y: number, width: number, height: number) => {
  const element = document.createElementNS(SVG_NS, 'rect');
  element.setAttribute('x', `${x}`);
  element.setAttribute('y', `${y}`);
  element.setAttribute('width', `${Math.max(0, width)}`);
  element.setAttribute('height', `${height}`);
  element.setAttribute('fill', 'currentColor');
  return element;
};

/**
 * One bar's piece of an ending bracket: the line from x1 to x2 at y, hooks
 * dropping from its ends, and the label hanging inside the left hook.
 */
export function createEndingSegmentSvg(
  input: EndingSegmentSvgInput
): SVGGElement {
  const { x1, x2, y, leftHook, rightHook, label, labelIsText } = input;
  const half = ENDING_LINE_THICKNESS_PX / 2;
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('ending-segment');
  group.appendChild(rect(x1, y - half, x2 - x1, ENDING_LINE_THICKNESS_PX));
  if (leftHook) {
    const hook = rect(
      x1,
      y - half,
      ENDING_LINE_THICKNESS_PX,
      ENDING_HOOK_PX + half
    );
    hook.classList.add('ending-hook-left');
    group.appendChild(hook);
  }
  if (rightHook) {
    const hook = rect(
      x2 - ENDING_LINE_THICKNESS_PX,
      y - half,
      ENDING_LINE_THICKNESS_PX,
      ENDING_HOOK_PX + half
    );
    hook.classList.add('ending-hook-right');
    group.appendChild(hook);
  }
  if (label !== null) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.classList.add('ending-label');
    text.setAttribute('x', `${x1 + ENDING_LABEL_INSET_PX}`);
    text.setAttribute('y', `${y + ENDING_LABEL_HEIGHT_PX}`);
    text.setAttribute('font-size', `${ENDING_LABEL_FONT_SIZE}`);
    text.setAttribute('fill', 'currentColor');
    if (labelIsText) {
      text.setAttribute('font-family', 'serif');
      text.setAttribute('font-style', 'italic');
    } else {
      text.setAttribute('font-family', 'Leland, Bravura, serif');
      text.setAttribute('font-weight', 'bold');
    }
    text.textContent = label;
    group.appendChild(text);
  }
  return group;
}
