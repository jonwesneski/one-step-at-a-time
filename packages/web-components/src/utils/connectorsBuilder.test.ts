/**
 * @jest-environment jsdom
 */
import '@/src/index';

import { NoteElementType, NoteLikeElementType } from '../types/elements';
import {
  buildConnectorSvgs,
  collectNoteLikeElements,
  ConnectorPair,
  pairConnectors,
} from './connectorsBuilder';
import { MUSIC_GUITAR_NOTE, MUSIC_NOTE } from './consts';
import { DurationType } from '../types/theory';

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

const makeNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement(MUSIC_NOTE);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el as NoteLikeElementType;
};

const makeGuitarNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement(MUSIC_GUITAR_NOTE);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el as NoteLikeElementType;
};

describe('collectNoteLikeElements', () => {
  it('finds <music-note> and <music-guitar-note> descendants', () => {
    const root = document.createElement('div');
    root.appendChild(makeNote({ note: 'C', octave: '4' }));
    root.appendChild(makeGuitarNote({ fret: '5', string: '3' }));
    document.body.appendChild(root);

    const notes = collectNoteLikeElements(root);
    expect(notes).toHaveLength(2);
    expect(notes[0].tagName.toLowerCase()).toBe(MUSIC_NOTE);
    expect(notes[1].tagName.toLowerCase()).toBe(MUSIC_GUITAR_NOTE);
  });
});

describe('pairConnectors', () => {
  it('pairs adjacent ties', () => {
    const a = makeNote({ note: 'C', octave: '4', tie: 'start' });
    const b = makeNote({ note: 'C', octave: '4', tie: 'end' });
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
    const a = makeNote({ note: 'C', octave: '4', tie: 'start' });
    const b = makeNote({ note: 'D', octave: '4', tie: 'end' });

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
    const a = makeNote({ note: 'C4', tie: 'start', slur: 'start' });
    const b = makeNote({ slur: 'end' });
    const c = makeNote({ note: 'C4', tie: 'end' });

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

describe('buildConnectorSvgs', () => {
  const rootRect = {
    top: 0,
    left: 0,
    right: 1000,
    bottom: 500,
    width: 1000,
    height: 500,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  const makeLayoutNote = (opts: {
    stemUp: boolean;
    left?: number;
    top?: number;
  }): NoteElementType => {
    const el = document.createElement(MUSIC_NOTE);
    const left = opts.left ?? 50;
    const top = opts.top ?? 100;
    const rect = {
      top,
      bottom: top + 20,
      left,
      right: left + 20,
      width: 20,
      height: 20,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect);
    Object.defineProperty(el, 'stemUp', {
      get: () => opts.stemUp,
      configurable: true,
    });
    Object.defineProperty(el, 'duration', {
      get: (): DurationType => 'quarter',
      configurable: true,
    });
    Object.defineProperty(el, 'noFlags', {
      get: () => false,
      configurable: true,
    });
    return el as unknown as NoteElementType;
  };

  const parsePath = (d: string) => {
    const mMatch = d.match(/^M (\S+) (\S+)/);
    const qMatch = d.match(/Q (\S+) (\S+) (\S+) (\S+)$/);
    return {
      fromX: Number(mMatch![1]),
      fromY: Number(mMatch![2]),
      cx: Number(qMatch![1]),
      cy: Number(qMatch![2]),
      toX: Number(qMatch![3]),
      toY: Number(qMatch![4]),
    };
  };

  it('stem-up note produces a tie that bulges below (control point y > anchor y)', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50 });
    const endNote = makeLayoutNote({ stemUp: true, left: 150 });
    const pair: ConnectorPair = {
      kind: 'tie',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    const d = svgGroup.querySelector('path')!.getAttribute('d')!;
    const { fromY, cy } = parsePath(d);
    expect(cy).toBeGreaterThan(fromY);
  });

  it('stem-down note produces a tie that bulges above (control point y < anchor y)', () => {
    const startNote = makeLayoutNote({ stemUp: false, left: 50 });
    const endNote = makeLayoutNote({ stemUp: false, left: 150 });
    const pair: ConnectorPair = {
      kind: 'tie',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    const d = svgGroup.querySelector('path')!.getAttribute('d')!;
    const { fromY, cy } = parsePath(d);
    expect(cy).toBeLessThan(fromY);
  });

  it('tie anchors use each note own stem direction for y-offset independently', () => {
    // start stemUp=true: anchor pushed below notehead center (+5px offset) → y=142
    // end stemUp=false: anchor pushed above notehead center (-5px offset) → y=99
    // Both notes at same rect.top=100 so fromY ≠ toY.
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: false, left: 150, top: 100 });
    const pair: ConnectorPair = {
      kind: 'tie',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    const d = svgGroup.querySelector('path')!.getAttribute('d')!;
    const { fromY, toY } = parsePath(d);
    // stemUp=true anchor is further below than stemUp=false anchor for same rect.top
    expect(fromY).toBeGreaterThan(toY);
  });

  it('slur uses start note stem direction for curve direction regardless of end note stem direction', () => {
    // start stemUp=true (startBulge='below'), end stemUp=false (would be 'above' if independent)
    // slur keeps startBulge for createCurveSvg → control point must be below the midpoint
    const startNote = makeLayoutNote({ stemUp: true, left: 50 });
    const endNote = makeLayoutNote({ stemUp: false, left: 150 });
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    const d = svgGroup.querySelector('path')!.getAttribute('d')!;
    const { fromY, cy, toY } = parsePath(d);
    expect(cy).toBeGreaterThan((fromY + toY) / 2);
  });
});
