/**
 * @jest-environment jsdom
 */
import '../index';
import { NoteLikeElementType } from '../types/elements';
import { collectNoteLikeElements, pairConnectors } from './connectorsBuilder';

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

const makeNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement('music-note');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el as NoteLikeElementType;
};

const makeGuitarNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement('music-guitar-note');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el as NoteLikeElementType;
};

describe('collectNoteLikeElements', () => {
  it('finds <music-note> and <music-guitar-note> descendants', () => {
    const root = document.createElement('div');
    root.appendChild(makeNote({ value: 'C4' }));
    root.appendChild(makeGuitarNote({ fret: '5', string: '3' }));
    document.body.appendChild(root);

    const notes = collectNoteLikeElements(root);
    expect(notes).toHaveLength(2);
    expect(notes[0].tagName.toLowerCase()).toBe('music-note');
    expect(notes[1].tagName.toLowerCase()).toBe('music-guitar-note');
  });
});

describe('pairConnectors', () => {
  it('pairs adjacent ties', () => {
    const a = makeNote({ value: 'C4', tie: 'start' });
    const b = makeNote({ value: 'C4', tie: 'end' });
    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('tie');
    expect(pairs[0].start).toBe(a);
    expect(pairs[0].end).toBe(b);
  });

  it('pairs slurs using LIFO stack for nested starts', () => {
    const a = makeNote({ slur: 'start' });
    const b = makeNote({ slur: 'start' });
    const c = makeNote({ slur: 'end' });
    const d = makeNote({ slur: 'end' });

    const pairs = pairConnectors([a, b, c, d]);
    expect(pairs).toHaveLength(2);
    // First end closes the inner (most recent) start
    expect(pairs[0].start).toBe(b);
    expect(pairs[0].end).toBe(c);
    // Second end closes the outer start
    expect(pairs[1].start).toBe(a);
    expect(pairs[1].end).toBe(d);
  });

  it('handles consecutive non-overlapping slurs', () => {
    const a = makeNote({ slur: 'start' });
    const b = makeNote({ slur: 'end' });
    const c = makeNote({ slur: 'start' });
    const d = makeNote({ slur: 'end' });

    const pairs = pairConnectors([a, b, c, d]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].start).toBe(a);
    expect(pairs[0].end).toBe(b);
    expect(pairs[1].start).toBe(c);
    expect(pairs[1].end).toBe(d);
  });

  it('explicit for="id" overrides the LIFO stack for overlap', () => {
    const a = makeNote({ id: 'phrase', slur: 'start' });
    const b = makeNote({ slur: 'start' });
    const c = makeNote({ for: 'phrase', slur: 'end' });
    const d = makeNote({ slur: 'end' });

    const pairs = pairConnectors([a, b, c, d]);
    expect(pairs).toHaveLength(2);
    // First end has for="phrase" → matches A explicitly (overlap scenario)
    expect(pairs[0].start).toBe(a);
    expect(pairs[0].end).toBe(c);
    // Second end falls back to stack → pairs with B
    expect(pairs[1].start).toBe(b);
    expect(pairs[1].end).toBe(d);
  });

  it('warns when a tie start/end have different pitches', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const a = makeNote({ value: 'C4', tie: 'start' });
    const b = makeNote({ value: 'D4', tie: 'end' });

    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it('warns on orphan end (no matching start)', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const orphan = makeNote({ slur: 'end' });

    const pairs = pairConnectors([orphan]);
    expect(pairs).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('orphan slur end')
    );
  });

  it('warns on unbalanced start (no matching end)', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const start = makeNote({ slur: 'start' });

    const pairs = pairConnectors([start]);
    expect(pairs).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('unbalanced slur start'),
      start
    );
  });

  it('warns and falls back to stack top when for= points to a missing id', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const a = makeNote({ slur: 'start' });
    const b = makeNote({ for: 'missing', slur: 'end' });

    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].start).toBe(a);
    expect(pairs[0].end).toBe(b);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('for="missing"'));
  });

  it('maintains independent stacks per connector kind', () => {
    const a = makeNote({ value: 'C4', tie: 'start', slur: 'start' });
    const b = makeNote({ slur: 'end' });
    const c = makeNote({ value: 'C4', tie: 'end' });

    const pairs = pairConnectors([a, b, c]);
    // Tie and slur should each form their own pair without interfering
    const tiePair = pairs.find((p) => p.kind === 'tie');
    const slurPair = pairs.find((p) => p.kind === 'slur');
    expect(tiePair?.start).toBe(a);
    expect(tiePair?.end).toBe(c);
    expect(slurPair?.start).toBe(a);
    expect(slurPair?.end).toBe(b);
  });

  it('pairs guitar-tab hammer-on connectors', () => {
    const a = makeGuitarNote({ fret: '5', string: '3', 'hammer-on': 'start' });
    const b = makeGuitarNote({ fret: '7', string: '3', 'hammer-on': 'end' });

    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('hammer-on');
  });
});
