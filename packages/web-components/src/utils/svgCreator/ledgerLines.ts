import type { HeadExtent } from '../../rules/chordRules';
import { computeLedgerLines, LedgerLine } from '../../rules/staffNoteRules';
import { SVG_NS } from '../consts';
import { STAFF_LINE_THICKNESS_PX } from '../notationDimensions';
import {
  ADJACENT_NOTE_X_DISPLACEMENT_PX,
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
} from './note';

const LEDGER_LINE_MARGIN = 6;

/** How far (px) ledger lines reach past the heads they pass through. */
export function ledgerLineOverhangPx(
  staffYCoordinates: number[],
  stemUp: boolean
): number {
  return computeLedgerLines(staffYCoordinates, stemUp).length > 0
    ? LEDGER_LINE_MARGIN
    : 0;
}

const ellipseHeadExtent = (stemUp: boolean): LedgerHeadExtent => {
  const cxPx = stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX;
  const left = cxPx - NOTE_HEAD_RADIUS_PX;
  const right = cxPx + NOTE_HEAD_RADIUS_PX;
  return {
    cxPx,
    halfWidthPx: NOTE_HEAD_RADIUS_PX,
    all: stemUp
      ? { left, right: right + ADJACENT_NOTE_X_DISPLACEMENT_PX }
      : { left: left - ADJACENT_NOTE_X_DISPLACEMENT_PX, right },
  };
};

// Horizontal extent of the head the ledger lines pass through, in the note
// SVG's pixel space; defaults to the ellipse head. A double line spans `all`
// the heads, a single one any displaced head it passes through (`tones`).
export type LedgerHeadExtent = {
  cxPx: number;
  halfWidthPx: number;
  all?: HeadExtent;
  tones?: readonly (HeadExtent & { staffY: number })[];
};

export function createLedgerLineElements(
  ledgerLines: LedgerLine[],
  stemUp: boolean,
  staffYPadding: number,
  head: LedgerHeadExtent = ellipseHeadExtent(stemUp)
): SVGLineElement[] {
  const { cxPx, halfWidthPx } = head;
  const single = { left: cxPx - halfWidthPx, right: cxPx + halfWidthPx };
  return ledgerLines.map((ledgerLine) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.classList.add('ledger-line');

    const svgY = staffYPadding + ledgerLine.staffY;

    const spanned =
      ledgerLine.widthType === 'double'
        ? [head.all ?? single]
        : [
            single,
            ...(head.tones ?? []).filter(
              ({ staffY }) => staffY === ledgerLine.staffY
            ),
          ];
    const left = Math.min(...spanned.map((extent) => extent.left));
    const right = Math.max(...spanned.map((extent) => extent.right));

    line.setAttribute('x1', (left - LEDGER_LINE_MARGIN).toString());
    line.setAttribute('y1', svgY.toString());
    line.setAttribute('x2', (right + LEDGER_LINE_MARGIN).toString());
    line.setAttribute('y2', svgY.toString());
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', `${STAFF_LINE_THICKNESS_PX}`);

    return line;
  });
}

export function addLedgerLines(
  svg: SVGElement | SVGGElement,
  staffYCoordinates: number[],
  stemUp: boolean,
  staffYPadding: number,
  head?: LedgerHeadExtent
): void {
  const ledgerLines = computeLedgerLines(staffYCoordinates, stemUp);
  if (ledgerLines.length === 0) {
    return;
  }
  svg.setAttribute('overflow', 'visible');
  const firstChild = svg.firstChild;
  for (const el of createLedgerLineElements(
    ledgerLines,
    stemUp,
    staffYPadding,
    head
  )) {
    svg.insertBefore(el, firstChild);
  }
}
