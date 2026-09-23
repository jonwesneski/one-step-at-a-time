/**
 * @jest-environment jsdom
 */
import { CONNECTOR_LABEL_CHAR_WIDTH_PX } from '../notationDimensions';
import { BULGE_STEP_PX, createCurveSvg } from './curve';

describe('createCurveSvg', () => {
  it('renders a quadratic bezier path for smooth curves', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
    });
    const path = group.querySelector('path');
    expect(path).not.toBeNull();
    const d = path!.getAttribute('d') ?? '';
    expect(d).toMatch(/^M 0 100 Q .+ 100 100$/);
  });

  it('bulges above (negative y offset) when bulge is "above"', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
    });
    const d = group.querySelector('path')!.getAttribute('d') ?? '';
    // Control point y should be less than endpoint y (above on screen = smaller y).
    const match = d.match(/Q (\S+) (\S+)/);
    expect(match).not.toBeNull();
    const cy = Number(match![2]);
    expect(cy).toBeLessThan(100);
  });

  it('bulges below when bulge is "below"', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'below',
    });
    const d = group.querySelector('path')!.getAttribute('d') ?? '';
    const match = d.match(/Q (\S+) (\S+)/);
    const cy = Number(match![2]);
    expect(cy).toBeGreaterThan(100);
  });

  it('renders a straight line when style is "straight"', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
      style: 'straight',
    });
    const d = group.querySelector('path')!.getAttribute('d') ?? '';
    expect(d).toBe('M 0 100 L 100 100');
  });

  it('includes a text label when provided', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
      label: 'H',
    });
    const text = group.querySelector('text');
    expect(text).not.toBeNull();
    expect(text!.textContent).toBe('H');
  });

  it('uses full from/to span for open-left split', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 500, y: 100 },
      bulge: 'above',
    });
    const d = group.querySelector('path')!.getAttribute('d') ?? '';
    expect(d.startsWith('M 0 100')).toBe(true);
    expect(d).toMatch(/500 100$/);
  });

  it('uses full from/to span for open-right split', () => {
    const group = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 500, y: 100 },
      bulge: 'above',
    });
    const d = group.querySelector('path')!.getAttribute('d') ?? '';
    expect(d.startsWith('M 0 100')).toBe(true);
    expect(d).toMatch(/500 100$/);
  });

  it("clears a steep straight-style line across the label's full width, not just its midpoint", () => {
    const label = 'black-note gliss.';
    const from = { x: 0, y: 300 };
    const to = { x: 100, y: 0 };
    const group = createCurveSvg({
      from,
      to,
      bulge: 'above',
      style: 'straight',
      label,
    });
    const text = group.querySelector('text')!;
    const labelY = Number(text.getAttribute('y'));

    const slope = (to.y - from.y) / (to.x - from.x);
    const trueMidY = (from.y + to.y) / 2;
    const halfWidth = (label.length * CONNECTOR_LABEL_CHAR_WIDTH_PX) / 2;
    // The line's y at the label's rightmost edge — the steep edge closest to
    // "above" on this ascending line — is what a slope-naive fixed offset
    // from the midpoint alone would fail to clear.
    const yAtRightEdge = trueMidY + slope * halfWidth;

    expect(labelY).toBeLessThan(yAtRightEdge);
  });

  it('pushes the control point further out per nestingLevel', () => {
    const baseGroup = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
    });
    const nestedGroup = createCurveSvg({
      from: { x: 0, y: 100 },
      to: { x: 100, y: 100 },
      bulge: 'above',
      nestingLevel: 2,
    });
    const baseCy = Number(
      baseGroup
        .querySelector('path')!
        .getAttribute('d')!
        .match(/Q (\S+) (\S+)/)![2]
    );
    const nestedCy = Number(
      nestedGroup
        .querySelector('path')!
        .getAttribute('d')!
        .match(/Q (\S+) (\S+)/)![2]
    );
    // 'above' → control point y < endpoint y; nestedCy should be further above (smaller).
    expect(baseCy - nestedCy).toBeCloseTo(2 * BULGE_STEP_PX, 5);
  });
});
