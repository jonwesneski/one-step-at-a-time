/**
 * @jest-environment jsdom
 */
import '@/src/index';

import type { DoubleStemmedBeamGroup } from '../rules/doubleStemmedBeamRules';
import type {
  NoteChordOrRestElementType,
  NoteElementType,
  NoteLikeElementType,
} from '../types/elements';
import type { DurationType } from '../types/theory';
import {
  buildConnectorSvgs,
  collectEntryObstacles,
  collectNoteLikeElements,
  collectPhraseSlurPairs,
  ConnectorPair,
  EntryGeometry,
  pairConnectors,
  partitionByVoice,
  resolveSlurGroupPlacement,
} from './connectorsBuilder';
import {
  MUSIC_GUITAR_NOTE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_STAFF,
  MUSIC_VOICE,
} from './consts';
import { SLUR_OBSTACLE_CLEARANCE_PX } from './notationDimensions';

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

describe('resolveSlurGroupPlacement', () => {
  const makeGroup = (
    id: string,
    members: DoubleStemmedBeamGroup['members']
  ): DoubleStemmedBeamGroup => ({
    id,
    topStaffIndex: 0,
    bottomStaffIndex: 1,
    members,
  });

  it("places a same-group slur pair over the group's own two staves", () => {
    const startNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const endNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const group = makeGroup('g1', [
      { staffIndex: 0, entryIndex: 0, isRest: false },
      { staffIndex: 1, entryIndex: 0, isRest: false },
      { staffIndex: 0, entryIndex: 1, isRest: false },
    ]);
    const elementToGroup = new Map<
      NoteChordOrRestElementType,
      DoubleStemmedBeamGroup
    >([
      [startNote as unknown as NoteChordOrRestElementType, group],
      [endNote as unknown as NoteChordOrRestElementType, group],
    ]);

    const groupSlurStaves = resolveSlurGroupPlacement([pair], elementToGroup);

    expect(groupSlurStaves.get(pair)).toEqual({
      topStaffIndex: 0,
      bottomStaffIndex: 1,
    });
  });

  it('leaves a pair alone when its endpoints belong to different (or no) beam-groups', () => {
    const startNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const endNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const groupA = makeGroup('a', [
      { staffIndex: 0, entryIndex: 0, isRest: false },
      { staffIndex: 1, entryIndex: 0, isRest: false },
    ]);
    const groupB = makeGroup('b', [
      { staffIndex: 0, entryIndex: 2, isRest: false },
      { staffIndex: 1, entryIndex: 2, isRest: false },
    ]);
    const elementToGroup = new Map<
      NoteChordOrRestElementType,
      DoubleStemmedBeamGroup
    >([
      [startNote as unknown as NoteChordOrRestElementType, groupA],
      [endNote as unknown as NoteChordOrRestElementType, groupB],
    ]);

    expect(resolveSlurGroupPlacement([pair], elementToGroup).size).toBe(0);
  });

  it('ignores non-slur pairs even when both endpoints share a group', () => {
    const startNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const endNote = document.createElement(MUSIC_NOTE) as NoteLikeElementType;
    const pair: ConnectorPair = {
      kind: 'tie',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const group = makeGroup('g1', [
      { staffIndex: 0, entryIndex: 0, isRest: false },
      { staffIndex: 1, entryIndex: 0, isRest: false },
    ]);
    const elementToGroup = new Map<
      NoteChordOrRestElementType,
      DoubleStemmedBeamGroup
    >([
      [startNote as unknown as NoteChordOrRestElementType, group],
      [endNote as unknown as NoteChordOrRestElementType, group],
    ]);

    expect(resolveSlurGroupPlacement([pair], elementToGroup).size).toBe(0);
  });
});

describe('collectPhraseSlurPairs', () => {
  const makePositionedNote = (
    attrs: Record<string, string>,
    left: number
  ): NoteLikeElementType => {
    const el = makeNote(attrs);
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left,
      top: 0,
      right: left + 10,
      bottom: 10,
      width: 10,
      height: 10,
      x: left,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    return el;
  };

  it('connects consecutive members of a slur-group in real x order, not DOM order', () => {
    const root = document.createElement('div');
    const rightNote = makePositionedNote({ 'slur-group': 'phrase1' }, 300);
    const leftNote = makePositionedNote({ 'slur-group': 'phrase1' }, 50);
    // Appended in reverse-of-x order, to confirm sorting is by real x, not DOM order.
    root.appendChild(rightNote);
    root.appendChild(leftNote);

    const pairs = collectPhraseSlurPairs(root);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('slur');
    expect(pairs[0].start).toBe(leftNote);
    expect(pairs[0].end).toBe(rightNote);
  });

  it('produces N-1 consecutive pairs for an N-member group', () => {
    const root = document.createElement('div');
    const notes = [0, 100, 200, 300].map((left) =>
      makePositionedNote({ 'slur-group': 'phrase1' }, left)
    );
    for (const note of notes) {
      root.appendChild(note);
    }

    const pairs = collectPhraseSlurPairs(root);

    expect(pairs).toHaveLength(3);
    expect(pairs[0].start).toBe(notes[0]);
    expect(pairs[0].end).toBe(notes[1]);
    expect(pairs[1].start).toBe(notes[1]);
    expect(pairs[1].end).toBe(notes[2]);
    expect(pairs[2].start).toBe(notes[2]);
    expect(pairs[2].end).toBe(notes[3]);
  });

  it('warns and skips a group with only one member', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const root = document.createElement('div');
    root.appendChild(makePositionedNote({ 'slur-group': 'lonely' }, 0));

    const pairs = collectPhraseSlurPairs(root);

    expect(pairs).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('lonely'));
  });

  it('ignores notes with no slur-group', () => {
    const root = document.createElement('div');
    root.appendChild(makePositionedNote({}, 0));
    root.appendChild(makePositionedNote({}, 100));

    expect(collectPhraseSlurPairs(root)).toHaveLength(0);
  });

  it('keeps two different slur-group ids independent', () => {
    const root = document.createElement('div');
    root.appendChild(makePositionedNote({ 'slur-group': 'a' }, 0));
    root.appendChild(makePositionedNote({ 'slur-group': 'a' }, 50));
    root.appendChild(makePositionedNote({ 'slur-group': 'b' }, 100));
    root.appendChild(makePositionedNote({ 'slur-group': 'b' }, 150));

    expect(collectPhraseSlurPairs(root)).toHaveLength(2);
  });
});

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

  it('pairs a glissando and resolves its hint text into the pair label', () => {
    const a = makeNote({
      note: 'C',
      octave: '4',
      glissando: 'start',
      'glissando-hint': 'white-key',
    });
    const b = makeNote({ note: 'C', octave: '5', glissando: 'end' });

    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      kind: 'glissando',
      start: a,
      end: b,
      label: 'white-note gliss.',
    });
  });

  it('leaves a glissando pair with no label when no hint is set', () => {
    const a = makeNote({ note: 'C', octave: '4', glissando: 'start' });
    const b = makeNote({ note: 'C', octave: '5', glissando: 'end' });

    const pairs = pairConnectors([a, b]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].label).toBeUndefined();
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

  const parseCubicPath = (d: string) => {
    const numbers = d
      .match(/^M (\S+) (\S+) C (\S+) (\S+) (\S+) (\S+) (\S+) (\S+)$/)!
      .slice(1)
      .map(Number);
    const [fromX, fromY, c1x, c1y, c2x, c2y, toX, toY] = numbers;
    const pointAt = (t: number) => {
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const e = t * t * t;
      return {
        x: a * fromX + b * c1x + c * c2x + e * toX,
        y: a * fromY + b * c1y + c * c2y + e * toY,
      };
    };
    return { fromX, fromY, c1x, c1y, c2x, c2y, toX, toY, pointAt };
  };

  const rectDistance = (
    point: { x: number; y: number },
    rect: { left: number; top: number; right: number; bottom: number }
  ): number =>
    Math.hypot(
      Math.max(rect.left - point.x, 0, point.x - rect.right),
      Math.max(rect.top - point.y, 0, point.y - rect.bottom)
    );

  const makeEntry = (
    element: Element,
    opts: {
      staffIndex: number;
      centerX: number;
      glyphRects?: EntryGeometry['glyphRects'];
      isRest?: boolean;
    }
  ): EntryGeometry => ({
    element,
    isRest: opts.isRest ?? false,
    centerX: opts.centerX,
    rowTop: 0,
    staffIndex: opts.staffIndex,
    glyphRects: opts.glyphRects ?? [],
  });

  // Two sibling staves under one parent, so each resolves its own staff index
  // (treble 0, bass 1); unmocked rects keep both on one row.
  const makeGrandStaff = () => {
    const parent = document.createElement('div');
    const treble = document.createElement(MUSIC_STAFF);
    const bass = document.createElement(MUSIC_STAFF);
    parent.append(treble, bass);
    return { treble, bass };
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

  it('draws a cross-staff slur as a cubic whose curvature scales with its own real horizontal span', () => {
    const { treble, bass } = makeGrandStaff();
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: true, left: 750, top: 150 });
    treble.appendChild(startNote);
    bass.appendChild(endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });

    const path = parseCubicPath(
      svgGroup.querySelector('path')!.getAttribute('d')!
    );
    const middle = path.pointAt(0.5);
    const chordMidY = (path.fromY + path.toY) / 2;
    // Span is ~700px; DEFAULT_BULGE_HEIGHT alone (~9px) would read as a
    // near-straight diagonal against it. An even split goes above.
    expect(chordMidY - middle.y).toBeGreaterThan(30);
  });

  it("leaves a same-staff slur's bulge height at the small fixed default, unaffected by a wide span", () => {
    const staff = document.createElement(MUSIC_STAFF);
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: false, left: 750, top: 50 });
    staff.appendChild(startNote);
    staff.appendChild(endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });

    const path = parsePath(svgGroup.querySelector('path')!.getAttribute('d')!);
    const straightMidY = (path.fromY + path.toY) / 2;
    expect(Math.abs(path.cy - straightMidY)).toBeLessThan(15);
  });

  it('reshapes a cross-staff slur so it keeps clear of another entry its default curve would cross', () => {
    const { treble, bass } = makeGrandStaff();
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: true, left: 750, top: 150 });
    treble.appendChild(startNote);
    bass.appendChild(endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [withoutObstacle] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const basePath = parseCubicPath(
      withoutObstacle.querySelector('path')!.getAttribute('d')!
    );

    const onCurve = basePath.pointAt(0.3);
    const obstacleRect = {
      left: onCurve.x - 5,
      right: onCurve.x + 5,
      top: onCurve.y - 5,
      bottom: onCurve.y + 5,
    };
    const rest = document.createElement('div');
    const [withObstacle] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
      entryObstacles: {
        entries: [
          makeEntry(rest, {
            staffIndex: 0,
            centerX: onCurve.x,
            glyphRects: [obstacleRect],
            isRest: true,
          }),
        ],
        beamSlices: [],
      },
    });
    const clearedPath = parseCubicPath(
      withObstacle.querySelector('path')!.getAttribute('d')!
    );

    for (let i = 0; i <= 200; i++) {
      expect(
        rectDistance(clearedPath.pointAt(i / 200), obstacleRect)
      ).toBeGreaterThan(SLUR_OBSTACLE_CLEARANCE_PX - 1);
    }
  });

  it("ignores a cross-staff slur's own endpoint glyphs as obstacles", () => {
    const { treble, bass } = makeGrandStaff();
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: true, left: 750, top: 150 });
    treble.appendChild(startNote);
    bass.appendChild(endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [withoutEntries] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const anchorBox = (x: number, y: number) => ({
      left: x - 10,
      right: x + 10,
      top: y - 10,
      bottom: y + 10,
    });
    const basePath = parseCubicPath(
      withoutEntries.querySelector('path')!.getAttribute('d')!
    );

    const [withOwnEndpointsOnly] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
      entryObstacles: {
        entries: [
          makeEntry(startNote, {
            staffIndex: 0,
            centerX: 60,
            glyphRects: [anchorBox(basePath.fromX, basePath.fromY)],
          }),
          makeEntry(endNote, {
            staffIndex: 1,
            centerX: 760,
            glyphRects: [anchorBox(basePath.toX, basePath.toY)],
          }),
        ],
        beamSlices: [],
      },
    });

    expect(withOwnEndpointsOnly.querySelector('path')!.getAttribute('d')).toBe(
      withoutEntries.querySelector('path')!.getAttribute('d')
    );
  });

  it('places a cross-staff slur below when the bottom staff holds the majority of its notes', () => {
    const { treble, bass } = makeGrandStaff();
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: true, left: 750, top: 150 });
    treble.appendChild(startNote);
    bass.appendChild(endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
      entryObstacles: {
        entries: [
          makeEntry(startNote, { staffIndex: 0, centerX: 60 }),
          makeEntry(document.createElement('div'), {
            staffIndex: 1,
            centerX: 300,
          }),
          makeEntry(document.createElement('div'), {
            staffIndex: 1,
            centerX: 500,
          }),
          makeEntry(endNote, { staffIndex: 1, centerX: 760 }),
        ],
        beamSlices: [],
      },
    });

    const path = parseCubicPath(
      svgGroup.querySelector('path')!.getAttribute('d')!
    );
    expect(path.pointAt(0.5).y).toBeGreaterThan((path.fromY + path.toY) / 2);
  });

  it("places a same-group double-stemmed slur over the group's majority staff even when both endpoints sit on one staff", () => {
    const { treble } = makeGrandStaff();
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 50 });
    const endNote = makeLayoutNote({ stemUp: false, left: 250, top: 50 });
    treble.append(startNote, endNote);
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    // Treble stems down would ordinarily curve above; the group's majority
    // is on the bottom staff.
    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
      groupSlurStaves: new Map([
        [pair, { topStaffIndex: 0, bottomStaffIndex: 1 }],
      ]),
      entryObstacles: {
        entries: [
          makeEntry(startNote, { staffIndex: 0, centerX: 60 }),
          makeEntry(document.createElement('div'), {
            staffIndex: 1,
            centerX: 120,
          }),
          makeEntry(document.createElement('div'), {
            staffIndex: 1,
            centerX: 160,
          }),
          makeEntry(document.createElement('div'), {
            staffIndex: 1,
            centerX: 200,
          }),
          makeEntry(endNote, { staffIndex: 0, centerX: 260 }),
        ],
        beamSlices: [],
      },
    });

    const path = parseCubicPath(
      svgGroup.querySelector('path')!.getAttribute('d')!
    );
    expect(path.pointAt(0.5).y).toBeGreaterThan((path.fromY + path.toY) / 2);
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

  it('glissando renders a straight line, not a curve', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: true, left: 150, top: 60 });
    const pair: ConnectorPair = {
      kind: 'glissando',
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
    expect(d).not.toContain('Q');
    expect(d).toMatch(/^M \S+ \S+ L \S+ \S+$/);
  });

  it('glissando renders its hint text as a label near the line', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: true, left: 150, top: 60 });
    const pair: ConnectorPair = {
      kind: 'glissando',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
      label: 'white-note gliss.',
    };

    const [svgGroup] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });

    expect(svgGroup.querySelector('text')?.textContent).toBe(
      'white-note gliss.'
    );
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

  it('pushes a slur further out when it would otherwise cross a beam rect (Chapter G — never let a slur intersect a beam)', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: true, left: 250, top: 100 });
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };

    const [withoutBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    const basePath = parsePath(
      withoutBeam.querySelector('path')!.getAttribute('d')!
    );

    // A beam rect straddling the curve's own default control point — the
    // unpushed curve would pass straight through it.
    const beamRect = {
      left: basePath.cx - 20,
      right: basePath.cx + 20,
      top: basePath.cy - 5,
      bottom: basePath.cy + 5,
      width: 40,
      height: 10,
      x: basePath.cx - 20,
      y: basePath.cy - 5,
      toJSON: () => ({}),
    } as DOMRect;

    const [withBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
      beamRects: [beamRect],
    });
    const pushedPath = parsePath(
      withBeam.querySelector('path')!.getAttribute('d')!
    );

    // Same bulge direction (stem-up slurs bulge below), but the pushed
    // curve's own control point sits further from the anchors' shared
    // midline than the un-pushed default.
    const mid = (basePath.fromY + basePath.toY) / 2;
    expect(Math.sign(pushedPath.cy - mid)).toBe(Math.sign(basePath.cy - mid));
    expect(Math.abs(pushedPath.cy - mid)).toBeGreaterThan(
      Math.abs(basePath.cy - mid)
    );
  });

  it('leaves a slur unpushed when a beam rect does not overlap its own x-span', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 100 });
    const endNote = makeLayoutNote({ stemUp: true, left: 250, top: 100 });
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [withoutBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    const basePath = parsePath(
      withoutBeam.querySelector('path')!.getAttribute('d')!
    );

    const farRect = {
      left: 900,
      right: 950,
      top: 0,
      bottom: 500,
      width: 50,
      height: 500,
      x: 900,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const [withFarBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
      beamRects: [farRect],
    });
    const farPath = parsePath(
      withFarBeam.querySelector('path')!.getAttribute('d')!
    );
    expect(farPath.cy).toBeCloseTo(basePath.cy, 5);
  });

  it('does not push (or infinitely inflate) a curve against a beam rect that sits between its two endpoints — a structurally unavoidable crossing, e.g. a real cross-staff slur spanning across its own beam', () => {
    // start above the rect, end below it — the curve must travel from one
    // to the other, so it crosses the rect's own Y range no matter how far
    // any control point is pushed. This is the ordinary shape for a slur
    // whose two ends sit on opposite staves of the double-stemmed group it
    // phrases over.
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 10 });
    const endNote = makeLayoutNote({ stemUp: true, left: 250, top: 300 });
    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [withoutBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    const basePath = parsePath(
      withoutBeam.querySelector('path')!.getAttribute('d')!
    );

    const straddlingRect = {
      left: 100,
      right: 200,
      top: 150,
      bottom: 160,
      width: 100,
      height: 10,
      x: 100,
      y: 150,
      toJSON: () => ({}),
    } as DOMRect;
    const [withBeam] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
      beamRects: [straddlingRect],
    });
    const pushedPath = parsePath(
      withBeam.querySelector('path')!.getAttribute('d')!
    );

    // Unchanged — no amount of pushing helps here, so none is attempted.
    expect(pushedPath.cy).toBeCloseTo(basePath.cy, 5);
  });

  it('anchors an inner-voice-flagged slur endpoint at the real stem tip instead of the notehead', () => {
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 200 });
    const endNote = makeLayoutNote({ stemUp: true, left: 250, top: 100 });
    // A real stem far above the notehead — computeStemEndAnchor should
    // anchor near this, not near the notehead's own much-lower y. A plain
    // (non-namespaced) element stands in for the real SVG <line class="stem">
    // here — jsdom's class-selector matching has a known quirk with
    // createElementNS'd SVG elements (works fine in a real browser; only
    // the .stem query() call itself is under test, not the element's own
    // namespace/tag).
    const stem = document.createElement('div');
    stem.classList.add('stem');
    jest.spyOn(stem, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      bottom: 30,
      left: 55,
      right: 57,
      width: 2,
      height: 10,
      x: 55,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    startNote.shadowRoot!.appendChild(stem);

    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [withoutFlag] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
    });
    const baseline = parsePath(
      withoutFlag.querySelector('path')!.getAttribute('d')!
    );

    const [withFlag] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 800,
      innerVoiceElements: new Set([startNote]),
    });
    const flagged = parsePath(
      withFlag.querySelector('path')!.getAttribute('d')!
    );

    // The stem tip (top: 20) sits well above the notehead anchor the
    // baseline curve used — forcing the stem-end anchor should move the
    // curve's own start point up to match, not leave it at the notehead.
    expect(flagged.fromY).toBeLessThan(baseline.fromY);
  });

  const makeStaffWithRect = (top: number, bottom: number): Element => {
    const staff = document.createElement(MUSIC_STAFF);
    jest.spyOn(staff, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom,
      left: 0,
      right: 1000,
      width: 1000,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect);
    return staff;
  };

  it("anchors a cross-staff slur endpoint past its own stem tip when that stem points toward the slur's side", () => {
    const treble = makeStaffWithRect(0, 100);
    const bass = makeStaffWithRect(200, 300);

    // Bass note whose stem points UP — toward the treble staff above it.
    const startNote = makeLayoutNote({ stemUp: true, left: 50, top: 250 });
    bass.appendChild(startNote);
    const endNote = makeLayoutNote({ stemUp: false, left: 750, top: 50 });
    treble.appendChild(endNote);

    const stem = document.createElement('div');
    stem.classList.add('stem');
    jest.spyOn(stem, 'getBoundingClientRect').mockReturnValue({
      top: 230,
      bottom: 260,
      left: 55,
      right: 57,
      width: 2,
      height: 30,
      x: 55,
      y: 230,
      toJSON: () => ({}),
    } as DOMRect);
    startNote.shadowRoot!.appendChild(stem);

    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [svg] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const path = parsePath(svg.querySelector('path')!.getAttribute('d')!);

    // An even split goes above; the bass stem points up, so the anchor sits
    // past its tip: stem top (230) minus SLUR_BEYOND_BEAM_CLEARANCE_PX
    // (STAFF_LINE_SPACING(10) * 1.2 = 12) = 218.
    expect(path.fromY).toBeCloseTo(218, 5);
  });

  it('anchors both ends of a cross-staff slur on its own side — a treble stem-up end goes past its stem tip when the slur is above', () => {
    const { treble, bass } = makeGrandStaff();
    // Bass stem-down start (notehead faces above), treble stem-up end.
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 250 });
    bass.appendChild(startNote);
    const endNote = makeLayoutNote({ stemUp: true, left: 750, top: 50 });
    treble.appendChild(endNote);
    const stem = document.createElement('div');
    stem.classList.add('stem');
    jest.spyOn(stem, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      bottom: 60,
      left: 765,
      right: 767,
      width: 2,
      height: 40,
      x: 765,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    endNote.shadowRoot!.appendChild(stem);

    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [svg] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const path = parseCubicPath(svg.querySelector('path')!.getAttribute('d')!);

    // stem top (20) minus SLUR_BEYOND_BEAM_CLEARANCE_PX (12) = 8, above the
    // stem rather than under the notehead.
    expect(path.toY).toBeCloseTo(8, 5);
    expect(path.pointAt(0.5).y).toBeLessThan((path.fromY + path.toY) / 2);
  });

  it("keeps the notehead anchor (ignoring any real stem rect) when a cross-staff slur endpoint's notehead faces the slur's side", () => {
    const treble = makeStaffWithRect(0, 100);
    const bass = makeStaffWithRect(200, 300);

    // Bass note whose stem points DOWN — away from the treble staff above it.
    const startNote = makeLayoutNote({ stemUp: false, left: 50, top: 250 });
    bass.appendChild(startNote);
    const endNote = makeLayoutNote({ stemUp: false, left: 750, top: 50 });
    treble.appendChild(endNote);

    const pair: ConnectorPair = {
      kind: 'slur',
      start: startNote,
      end: endNote,
      nestingLevel: 0,
    };
    const [withoutStem] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const baseline = parsePath(
      withoutStem.querySelector('path')!.getAttribute('d')!
    );

    const stem = document.createElement('div');
    stem.classList.add('stem');
    jest.spyOn(stem, 'getBoundingClientRect').mockReturnValue({
      top: 230,
      bottom: 260,
      left: 55,
      right: 57,
      width: 2,
      height: 30,
      x: 55,
      y: 230,
      toJSON: () => ({}),
    } as DOMRect);
    startNote.shadowRoot!.appendChild(stem);

    const [withStem] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeft: 0,
      rowRight: 1000,
    });
    const withStemPath = parsePath(
      withStem.querySelector('path')!.getAttribute('d')!
    );

    expect(withStemPath.fromY).toBeCloseTo(baseline.fromY, 5);
  });
});

describe('collectEntryObstacles', () => {
  it('skips a hidden spacer rest — it draws nothing for a slur to avoid', () => {
    const staff = document.createElement(MUSIC_STAFF);
    const visibleRest = document.createElement(MUSIC_REST);
    const spacerRest = document.createElement(MUSIC_REST);
    spacerRest.hidden = true;
    staff.append(visibleRest, spacerRest);
    document.body.appendChild(staff);

    const { entries } = collectEntryObstacles(
      document.body,
      document.body.getBoundingClientRect(),
      []
    );

    const elements = entries.map((entry) => entry.element);
    expect(elements).toContain(visibleRest);
    expect(elements).not.toContain(spacerRest);
  });
});
