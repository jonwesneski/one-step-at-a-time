/**
 * @jest-environment jsdom
 */
import { SVG_NS } from '../consts';
import {
  TECHNIQUE_LABEL_CHAR_WIDTH_PX,
  TECHNIQUE_LABEL_FONT_SIZE_PX,
  TECHNIQUE_LABEL_GAP_PX,
  TECHNIQUE_LABEL_LINE_HEIGHT_PX,
} from '../notationDimensions';
import {
  appendTechniqueLabels,
  createTechniqueLabel,
  techniqueLabelHangPx,
  techniqueLabelHeightPx,
  techniqueLabels,
  techniqueLabelWidthPx,
  techniqueTextLabel,
  textWidthPx,
  wrapTechniqueLabel,
} from './techniqueLabel';

const labelFor = (text: string) => techniqueLabels(null, text)[0];

describe('techniqueLabels', () => {
  it('puts a tremolo label nearest the note', () => {
    expect(techniqueLabels(null, null)).toEqual([]);
    expect(techniqueLabels('flz', 'lip').map(({ lines }) => lines)).toEqual([
      ['flz.'],
      ['lip'],
    ]);
  });
});

describe('createTechniqueLabel', () => {
  it('keeps a tremolo label upright on one line', () => {
    const [trem] = techniqueLabels('trem', null);
    const text = createTechniqueLabel(4, 20, trem);
    expect(text.outerHTML).toBe(
      `<text class="tremolo-label" x="4" y="20" text-anchor="start" font-family="serif" font-size="${TECHNIQUE_LABEL_FONT_SIZE_PX}" fill="currentColor">trem.</text>`
    );
    expect(techniqueLabelWidthPx(trem)).toBe(5 * TECHNIQUE_LABEL_CHAR_WIDTH_PX);
  });

  it('draws gliss. in italics and the rest upright', () => {
    const style = (text: string) =>
      createTechniqueLabel(0, 0, labelFor(text)).getAttribute('font-style');
    expect(style('quasi-gliss')).toBe('italic');
    expect(style('chrom')).toBeNull();
    expect(style('anything else')).toBeNull();
  });

  it('ends its last line on the baseline', () => {
    const label = labelFor('bend down|¼-tone');
    const text = createTechniqueLabel(4, 50, label);
    expect(Number(text.getAttribute('y'))).toBe(
      50 - TECHNIQUE_LABEL_LINE_HEIGHT_PX
    );
    const spans = Array.from(text.querySelectorAll('tspan'));
    expect(spans.map(({ textContent }) => textContent)).toEqual([
      'bend down',
      '¼-tone',
    ]);
    expect(spans.map((span) => span.getAttribute('x'))).toEqual(['4', '4']);
    expect(Number(spans[1].getAttribute('dy'))).toBe(
      TECHNIQUE_LABEL_LINE_HEIGHT_PX
    );
    expect(techniqueLabelHeightPx(label)).toBe(
      TECHNIQUE_LABEL_FONT_SIZE_PX + TECHNIQUE_LABEL_LINE_HEIGHT_PX
    );
  });
});

describe('techniqueLabelWidthPx', () => {
  it('follows the longest line and its characters', () => {
    expect(techniqueLabelWidthPx(labelFor('a|bend down'))).toBe(
      techniqueLabelWidthPx(labelFor('bend down'))
    );
    expect(techniqueLabelWidthPx(labelFor('mmm'))).toBeGreaterThan(
      techniqueLabelWidthPx(labelFor('iii'))
    );
  });
});

describe('appendTechniqueLabels', () => {
  it('stacks labels up from the ink', () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    appendTechniqueLabels(svg, 0, 30, techniqueLabels('flz', 'bend'));
    const ys = Array.from(svg.querySelectorAll('text')).map((text) =>
      Number(text.getAttribute('y'))
    );
    const first = 30 - TECHNIQUE_LABEL_GAP_PX;
    expect(ys).toEqual([
      first,
      first - TECHNIQUE_LABEL_FONT_SIZE_PX - TECHNIQUE_LABEL_GAP_PX,
    ]);
  });
});

describe('wrapTechniqueLabel', () => {
  it('breaks lines at their spaces to fit, keeping the written breaks', () => {
    const label = labelFor('bend|one two three four');
    const width = techniqueLabelWidthPx(labelFor('one two t'));
    const { lines } = wrapTechniqueLabel(label, width);
    expect(lines).toEqual(['bend', 'one two', 'three', 'four']);
  });

  it('leaves a label that fits, one long word and tremolo labels alone', () => {
    const label = labelFor('bend down');
    expect(wrapTechniqueLabel(label, 1000)).toBe(label);
    expect(wrapTechniqueLabel(label, 0)).toBe(label);
    expect(wrapTechniqueLabel(labelFor('portamento'), 10).lines).toEqual([
      'portamento',
    ]);
    const [tremolo] = techniqueLabels('non-trem', null);
    expect(wrapTechniqueLabel(tremolo, 10)).toBe(tremolo);
  });
});

describe('technique text', () => {
  it('stacks above a glissando label, upright unless italic', () => {
    const text = techniqueTextLabel('hum', 'normal');
    expect(techniqueLabels(null, 'lip', text).map(({ kind }) => kind)).toEqual([
      'glissando',
      'text',
    ]);
    expect(techniqueTextLabel(' | ', 'normal')).toBeNull();
    const svg = createTechniqueLabel(
      0,
      0,
      techniqueTextLabel('legato', 'italic')!
    );
    expect(svg.classList.contains('technique-text')).toBe(true);
    expect(svg.getAttribute('font-style')).toBe('italic');
  });

  it('hangs an opening bracket left of the margin', () => {
    const label = techniqueTextLabel(
      'blow air|(pitches sound higher)',
      'normal'
    )!;
    const [first, second] = Array.from(
      createTechniqueLabel(40, 50, label).querySelectorAll('tspan')
    );
    expect(Number(first.getAttribute('x'))).toBe(40);
    expect(Number(second.getAttribute('x'))).toBeCloseTo(40 - textWidthPx('('));
    expect(techniqueLabelHangPx(label)).toBeCloseTo(textWidthPx('('));
    expect(techniqueLabelWidthPx(label)).toBeCloseTo(
      textWidthPx('(pitches sound higher)') - textWidthPx('(')
    );
  });

  it('wraps at spaces', () => {
    const label = techniqueTextLabel('one two three four', 'normal')!;
    expect(
      wrapTechniqueLabel(label, textWidthPx('three four') + 1).lines
    ).toEqual(['one two', 'three four']);
  });
});
