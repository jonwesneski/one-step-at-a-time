/**
 * @jest-environment jsdom
 */
import '@/src/index';

import type { NoteElementType, NoteLikeElementType } from '../types/elements';
import type { DurationType } from '../types/theory';
import {
  buildConnectorSvgs,
  collectNoteLikeElements,
  ConnectorPair,
  pairConnectors,
  partitionByVoice,
} from './connectorsBuilder';
import {
  MUSIC_GUITAR_NOTE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_VOICE,
} from './consts';

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

describe('partitionByVoice', () => {
  it('puts a bare note (no <music-voice> ancestor) into voice 1', () => {
    const note = makeNote({ note: 'C', octave: '4' });
    document.body.appendChild(note);

    const byVoice = partitionByVoice([note]);
    expect(byVoice.get(1)).toEqual([note]);
    expect(byVoice.size).toBe(1);
  });

  it('numbers voices by <music-voice> sibling position', () => {
    const voice1 = document.createElement(MUSIC_VOICE);
    const voice2 = document.createElement(MUSIC_VOICE);
    const staff = document.createElement(MUSIC_STAFF);
    const noteInVoice1 = makeNote({ note: 'C', octave: '4' });
    const noteInVoice2 = makeNote({ note: 'D', octave: '4' });
    voice1.appendChild(noteInVoice1);
    voice2.appendChild(noteInVoice2);
    staff.appendChild(voice1);
    staff.appendChild(voice2);
    document.body.appendChild(staff);

    const byVoice = partitionByVoice([noteInVoice1, noteInVoice2]);
    expect(byVoice.get(1)).toEqual([noteInVoice1]);
    expect(byVoice.get(2)).toEqual([noteInVoice2]);
  });

  it('regression: two voices both sustaining an open (for-less) tie across a measure boundary — partitioning prevents the LIFO stack from mispairing them', () => {
    // Realistic failure shape: measure 1's staff has voice 1 then voice 2
    // (document order), each ending with an open `tie="start"` (both parts
    // held across the barline — a common musical situation). Measure 2's
    // staff again has voice 1 then voice 2, each starting with `tie="end"`.
    // In one flat, unpartitioned document-order walk, by the time
    // measure-2-voice-1's `end` is reached, the LIFO stack top is
    // measure-1-VOICE-2's start (pushed after voice 1's), not voice 1's —
    // a real cross-voice mispairing, not a hypothetical one.
    const m1Voice1 = document.createElement(MUSIC_VOICE);
    const m1Voice2 = document.createElement(MUSIC_VOICE);
    const m1Staff = document.createElement(MUSIC_STAFF);
    const m2Voice1 = document.createElement(MUSIC_VOICE);
    const m2Voice2 = document.createElement(MUSIC_VOICE);
    const m2Staff = document.createElement(MUSIC_STAFF);
    const root = document.createElement('div');

    const v1Start = makeNote({ note: 'C', octave: '4', tie: 'start' });
    const v2Start = makeNote({ note: 'E', octave: '4', tie: 'start' });
    const v1End = makeNote({ note: 'C', octave: '4', tie: 'end' });
    const v2End = makeNote({ note: 'E', octave: '4', tie: 'end' });

    m1Voice1.append(v1Start);
    m1Voice2.append(v2Start);
    m1Staff.append(m1Voice1, m1Voice2);
    m2Voice1.append(v1End);
    m2Voice2.append(v2End);
    m2Staff.append(m2Voice1, m2Voice2);
    root.append(m1Staff, m2Staff);
    document.body.appendChild(root);

    // Without partitioning, pairing the flat document-order list directly
    // mispairs voice 1's end with voice 2's start (LIFO stack top).
    const unpartitionedPairs = pairConnectors(collectNoteLikeElements(root));
    expect(unpartitionedPairs).toHaveLength(2);
    expect(unpartitionedPairs.find((p) => p.end === v1End)?.start).toBe(
      v2Start
    ); // the bug, demonstrated

    // With partitioning, each voice pairs independently and correctly.
    const byVoice = partitionByVoice(collectNoteLikeElements(root));
    const partitionedPairs = [...byVoice.values()].flatMap((notes) =>
      pairConnectors(notes)
    );
    expect(partitionedPairs).toHaveLength(2);
    expect(partitionedPairs.find((p) => p.start === v1Start)?.end).toBe(v1End);
    expect(partitionedPairs.find((p) => p.start === v2Start)?.end).toBe(v2End);
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

  it('emits a self-pair for tie="laissez-vibrer" (and the lv alias)', () => {
    const a = makeNote({ note: 'C', octave: '4', tie: 'laissez-vibrer' });
    const b = makeNote({ note: 'D', octave: '4', tie: 'lv' });
    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toMatchObject({
      kind: 'tie',
      start: a,
      end: a,
      laissezVibrer: true,
    });
    expect(pairs[1].laissezVibrer).toBe(true);
  });

  it('does not treat slur="laissez-vibrer" as an l.v. tie', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const a = makeNote({ slur: 'laissez-vibrer' });
    expect(pairConnectors([a])).toHaveLength(0);
    warn.mockRestore();
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

  it('slur across a pitch interval on a standalone staff renders one curve, not a split pair', () => {
    // Start/end noteheads sit at different rect.top (different pitch). Row
    // detection must resolve to the shared <music-staff>, which never wraps —
    // otherwise the >5px top delta trips the cross-row split and the curve runs
    // to the staff edges instead of the end note.
    // Detached staff: gives the notes a shared ancestor for row detection
    // without triggering the staff's slot-render pass (which fights the mocks).
    const staff = document.createElement(MUSIC_STAFF);
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: false, left: 150, top: 145 });
    staff.append(startNote as unknown as Node, endNote as unknown as Node);

    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const groups = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    expect(groups).toHaveLength(1);
    const { fromX, toX } = parsePath(
      groups[0].querySelector('path')!.getAttribute('d')!
    );
    expect(fromX).toBeCloseTo(60);
    expect(toX).toBeCloseTo(160);
  });

  it('draws one fanned tie per run-to-chord pair for a music-arpeggio', () => {
    const chord = makeLayoutNote({ stemUp: false, left: 300, top: 100 });
    Object.defineProperty(chord, 'staffYCoordinates', {
      get: () => [20, 12, 4],
      configurable: true,
    });
    const run = [50, 120, 190].map((left) =>
      makeLayoutNote({ stemUp: true, left, top: 100 })
    );

    const pairs: ConnectorPair[] = run.map((runNote, i) => ({
      kind: 'tie',
      start: runNote,
      end: chord as unknown as NoteLikeElementType,
      nestingLevel: 0,
      arpeggioRun: { targetToneIndex: i, runNotes: run },
    }));

    const svgs = buildConnectorSvgs(pairs, {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    expect(svgs).toHaveLength(3);

    // Each curve starts at its own run x and ends near the chord.
    const ends = svgs.map(
      (g) => parsePath(g.querySelector('path')!.getAttribute('d')!).toX
    );
    expect(new Set(ends).size).toBe(1); // all converge on the chord centre x (bbox fallback)
    const starts = svgs.map(
      (g) => parsePath(g.querySelector('path')!.getAttribute('d')!).fromX
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(3); // distinct run x's
  });

  it('draws a laissez-vibrer tie as one open curve, with an l.v. label when set', () => {
    const note = makeLayoutNote({ stemUp: true, left: 100, top: 100 });
    const svgs = buildConnectorSvgs(
      [
        {
          kind: 'tie',
          start: note,
          end: note,
          nestingLevel: 0,
          laissezVibrer: true,
          label: 'l.v.',
        } as ConnectorPair,
      ],
      { rootRect, rowLeft: 0, rowRight: 800 }
    );
    expect(svgs).toHaveLength(1);
    const path = parsePath(svgs[0].querySelector('path')!.getAttribute('d')!);
    // Curves forward (to the right) off the notehead.
    expect(path.toX).toBeGreaterThan(path.fromX);
    expect(svgs[0].querySelector('text')?.textContent).toBe('l.v.');
  });

  it('divides a run-to-chord tie into two stubs when a run notehead obscures it', () => {
    // run[0] at x=50 ties to a chord tone; run[1] sits directly under the flat
    // part of that tie so the curve would pass through its notehead.
    const chord = makeLayoutNote({ stemUp: false, left: 300, top: 100 });
    Object.defineProperty(chord, 'staffYCoordinates', {
      get: () => [10],
      configurable: true,
    });
    const runFirst = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    // Positioned so its notehead centre sits on the run[0]→chord tie curve.
    const runMiddle = makeLayoutNote({ stemUp: true, left: 170, top: 123 });

    const pair: ConnectorPair = {
      kind: 'tie',
      start: runFirst,
      end: chord as unknown as NoteLikeElementType,
      nestingLevel: 0,
      arpeggioRun: {
        targetToneIndex: 0,
        runNotes: [runFirst, runMiddle],
      },
    };

    const svgs = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    // Two short stubs instead of one full curve.
    expect(svgs).toHaveLength(2);
    const [a, b] = svgs.map((g) =>
      parsePath(g.querySelector('path')!.getAttribute('d')!)
    );
    // A centre gap: the stubs stop short of each other.
    expect(Math.min(a.toX, a.fromX)).toBeGreaterThan(a.fromX - 1); // sanity
    expect(Math.abs(a.fromX - b.fromX)).toBeGreaterThan(0);
  });
});
