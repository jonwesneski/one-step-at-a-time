import {
  resolveGlissandoLabel,
  type LabelAnchor,
} from '../../rules/glissandoLabelRules';
import {
  estimateTextWidthPx,
  hangOf,
  parseTechniqueText,
} from '../../rules/techniqueTextRules';
import type { TextStyle, TremoloLabel } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  TECHNIQUE_LABEL_CHAR_WIDTH_PX,
  TECHNIQUE_LABEL_FONT_SIZE_PX,
  TECHNIQUE_LABEL_GAP_PX,
  TECHNIQUE_LABEL_LINE_HEIGHT_PX,
  TECHNIQUE_TEXT_BELOW_GAP_PX,
} from '../notationDimensions';

// ─── Technique labels ───────────────────────────────────────────────────────
//
// Text over (or under) one entry: a tremolo label, a glissando label, a
// technique text.

export type TechniqueLabel = {
  kind: 'tremolo' | 'glissando' | 'text';
  lines: readonly string[];
  italic: boolean;
  anchor: LabelAnchor;
};

const TREMOLO_LABEL_TEXT: Record<TremoloLabel, string> = {
  trem: 'trem.',
  'non-trem': 'non trem.',
  flz: 'flz.',
  flt: 'flt.',
  frull: 'frull.',
  ord: 'ord.',
  nat: 'nat.',
  norm: 'norm.',
};

/**
 * A `technique-text` as a label: it starts at the first grace head, or the
 * head. Null with no text.
 */
export function techniqueTextLabel(
  value: string | null,
  style: TextStyle
): TechniqueLabel | null {
  const lines = parseTechniqueText(value);
  return lines === null
    ? null
    : {
        kind: 'text',
        lines: lines.map(({ text }) => text),
        italic: style === 'italic',
        anchor: 'grace',
      };
}

/** An entry's labels above the stave, the one nearest the note first. */
export function techniqueLabels(
  tremoloLabel: TremoloLabel | null,
  glissandoLabel: string | null,
  text: TechniqueLabel | null = null
): TechniqueLabel[] {
  const labels: TechniqueLabel[] = [];
  if (tremoloLabel !== null) {
    labels.push({
      kind: 'tremolo',
      lines: [TREMOLO_LABEL_TEXT[tremoloLabel]],
      italic: false,
      anchor: 'head',
    });
  }
  const glissando = resolveGlissandoLabel(glissandoLabel);
  if (glissando !== null) {
    labels.push({ kind: 'glissando', ...glissando });
  }
  if (text !== null) {
    labels.push(text);
  }
  return labels;
}

export function textWidthPx(line: string): number {
  return estimateTextWidthPx(line, TECHNIQUE_LABEL_FONT_SIZE_PX);
}

// How far (px) a line's opening quote or bracket hangs left of the margin.
function hangWidthPx(
  kind: TechniqueLabel['kind'],
  line: string,
  count: number
) {
  return kind === 'text' ? textWidthPx(hangOf(line, count)) : 0;
}

/**
 * Estimated drawn width (px) of a label's longest line from its margin. A
 * glissando label or technique text may be a whole instruction, so it is
 * judged by its characters.
 */
export function techniqueLabelWidthPx({ kind, lines }: TechniqueLabel): number {
  return Math.max(
    ...lines.map((line) =>
      kind === 'tremolo'
        ? line.length * TECHNIQUE_LABEL_CHAR_WIDTH_PX
        : textWidthPx(line) - hangWidthPx(kind, line, lines.length)
    )
  );
}

/** How far (px) a label's hanging punctuation reaches left of its margin. */
export function techniqueLabelHangPx({ kind, lines }: TechniqueLabel): number {
  return Math.max(
    0,
    ...lines.map((line) => hangWidthPx(kind, line, lines.length))
  );
}

/**
 * A glissando label or technique text with every line wider than `maxWidth`
 * broken at its spaces. A single word wider than that stays whole.
 */
export function wrapTechniqueLabel(
  label: TechniqueLabel,
  maxWidth: number
): TechniqueLabel {
  if (
    label.kind === 'tremolo' ||
    maxWidth <= 0 ||
    techniqueLabelWidthPx(label) <= maxWidth
  ) {
    return label;
  }
  const lines = label.lines.flatMap((line) => {
    const wrapped: string[] = [];
    for (const word of line.split(/\s+/)) {
      const last = wrapped.length - 1;
      const joined = last < 0 ? word : `${wrapped[last]} ${word}`;
      if (last >= 0 && textWidthPx(joined) <= maxWidth) {
        wrapped[last] = joined;
      } else {
        wrapped.push(word);
      }
    }
    return wrapped;
  });
  return { ...label, lines };
}

export function techniqueLabelHeightPx({ lines }: TechniqueLabel): number {
  return (
    TECHNIQUE_LABEL_FONT_SIZE_PX +
    (lines.length - 1) * TECHNIQUE_LABEL_LINE_HEIGHT_PX
  );
}

/**
 * A label whose margin is leftX, its last line on baselineY. A technique
 * text's opening quotes and brackets hang left of the margin.
 */
export function createTechniqueLabel(
  leftX: number,
  baselineY: number,
  { kind, lines, italic }: TechniqueLabel
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.classList.add(kind === 'text' ? 'technique-text' : `${kind}-label`);
  const lineX = (line: string): number =>
    leftX - hangWidthPx(kind, line, lines.length);
  text.setAttribute('x', `${lineX(lines[0])}`);
  text.setAttribute(
    'y',
    `${baselineY - (lines.length - 1) * TECHNIQUE_LABEL_LINE_HEIGHT_PX}`
  );
  text.setAttribute('text-anchor', 'start');
  text.setAttribute('font-family', 'serif');
  text.setAttribute('font-size', `${TECHNIQUE_LABEL_FONT_SIZE_PX}`);
  if (italic) {
    text.setAttribute('font-style', 'italic');
  }
  text.setAttribute('fill', 'currentColor');
  if (lines.length === 1) {
    text.textContent = lines[0];
    return text;
  }
  lines.forEach((line, i) => {
    const span = document.createElementNS(SVG_NS, 'tspan');
    span.setAttribute('x', `${lineX(line)}`);
    span.setAttribute('dy', `${i === 0 ? 0 : TECHNIQUE_LABEL_LINE_HEIGHT_PX}`);
    span.textContent = line;
    text.appendChild(span);
  });
  return text;
}

/** A standalone entry's text below its lowest ink. */
export function appendTechniqueTextBelow(
  svg: SVGElement,
  leftX: number,
  inkBottomY: number,
  label: TechniqueLabel
): number {
  const baselineY =
    inkBottomY + TECHNIQUE_TEXT_BELOW_GAP_PX + techniqueLabelHeightPx(label);
  svg.setAttribute('overflow', 'visible');
  svg.appendChild(createTechniqueLabel(leftX, baselineY, label));
  return baselineY;
}

/** A standalone entry's labels, stacked above its topmost ink. */
export function appendTechniqueLabels(
  svg: SVGElement,
  leftX: number,
  inkTopY: number,
  labels: readonly TechniqueLabel[]
): void {
  let baselineY = inkTopY - TECHNIQUE_LABEL_GAP_PX;
  for (const label of labels) {
    svg.setAttribute('overflow', 'visible');
    svg.appendChild(createTechniqueLabel(leftX, baselineY, label));
    baselineY -= techniqueLabelHeightPx(label) + TECHNIQUE_LABEL_GAP_PX;
  }
}
