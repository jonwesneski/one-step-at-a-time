import {
  resolveGlissandoLabel,
  type LabelAnchor,
} from '../../rules/glissandoLabelRules';
import type { TremoloLabel } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  TECHNIQUE_LABEL_CHAR_WIDTH_PX,
  TECHNIQUE_LABEL_FONT_SIZE_PX,
  TECHNIQUE_LABEL_GAP_PX,
  TECHNIQUE_LABEL_LINE_HEIGHT_PX,
} from '../notationDimensions';

// ─── Technique labels ───────────────────────────────────────────────────────
//
// Text above the stave over one entry: a tremolo label, a glissando label.

export type TechniqueLabel = {
  kind: 'tremolo' | 'glissando';
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

/** An entry's labels, the one nearest the note first. */
export function techniqueLabels(
  tremoloLabel: TremoloLabel | null,
  glissandoLabel: string | null
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
  return labels;
}

// Share of the font size each kind of character advances in a serif face.
const CHARACTER_WIDTHS: readonly [RegExp, number][] = [
  [/[ijl.,:;'!|]/, 0.28],
  [/[ ftr()-]/, 0.34],
  [/[mwMW¼½¾]/, 0.8],
  [/[A-Z]/, 0.7],
];
const CHARACTER_WIDTH = 0.5;

// A little over, since serif faces differ.
const WIDTH_MARGIN = 1.08;

function textWidthPx(line: string): number {
  const ems = Array.from(line).reduce(
    (sum, character) =>
      sum +
      (CHARACTER_WIDTHS.find(([pattern]) => pattern.test(character))?.[1] ??
        CHARACTER_WIDTH),
    0
  );
  return ems * TECHNIQUE_LABEL_FONT_SIZE_PX * WIDTH_MARGIN;
}

/**
 * Estimated drawn width (px) of a label's longest line. A glissando label may
 * be a whole instruction, so it is judged by its characters.
 */
export function techniqueLabelWidthPx({ kind, lines }: TechniqueLabel): number {
  return Math.max(
    ...lines.map((line) =>
      kind === 'tremolo'
        ? line.length * TECHNIQUE_LABEL_CHAR_WIDTH_PX
        : textWidthPx(line)
    )
  );
}

/**
 * A glissando label with every line wider than `maxWidth` broken at its
 * spaces. A single word wider than that stays whole.
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

/** A label starting at leftX, its last line on baselineY. */
export function createTechniqueLabel(
  leftX: number,
  baselineY: number,
  { kind, lines, italic }: TechniqueLabel
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.classList.add(`${kind}-label`);
  text.setAttribute('x', `${leftX}`);
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
    span.setAttribute('x', `${leftX}`);
    span.setAttribute('dy', `${i === 0 ? 0 : TECHNIQUE_LABEL_LINE_HEIGHT_PX}`);
    span.textContent = line;
    text.appendChild(span);
  });
  return text;
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
