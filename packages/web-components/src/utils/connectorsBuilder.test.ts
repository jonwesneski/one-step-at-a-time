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
  collectConnectorPairs,
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
  MUSIC_CHORD,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_STAFF,
  MUSIC_VOICE,
} from './consts';
import {
  SLUR_ARTICULATION_CLEARANCE_PX,
  SLUR_OBSTACLE_CLEARANCE_PX,
} from './notationDimensions';

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

const makeNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement(MUSIC_NOTE);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el as NoteLikeElementType;
};

const makeGuitarNote = (attrs: Record<string, string>): NoteLikeElementType => {
  const el = document.createElement(MUSIC_GUITAR_NOTE);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
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

  it("marks each slur-group segment dotted from its own start's slur-style", () => {
    const root = document.createElement('div');
    const first = makePositionedNote(
      { 'slur-group': 'phrase1', 'slur-style': 'dotted' },
      0
    );
    const second = makePositionedNote({ 'slur-group': 'phrase1' }, 100);
    const third = makePositionedNote({ 'slur-group': 'phrase1' }, 200);
    root.append(first, second, third);

    const pairs = collectPhraseSlurPairs(root);

    expect(pairs.map((pair) => pair.dotted)).toEqual([true, false]);
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

  it('connects across a system break in measure order, not x order', () => {
    const root = document.createElement('div');
    const firstMeasure = document.createElement(MUSIC_MEASURE);
    const secondMeasure = document.createElement(MUSIC_MEASURE);
    const rowOneStart = makePositionedNote({ 'slur-group': 'phrase1' }, 400);
    const rowOneEnd = makePositionedNote({ 'slur-group': 'phrase1' }, 700);
    const rowTwo = makePositionedNote({ 'slur-group': 'phrase1' }, 40);
    firstMeasure.append(rowOneStart, rowOneEnd);
    secondMeasure.append(rowTwo);
    root.append(firstMeasure, secondMeasure);

    const pairs = collectPhraseSlurPairs(root);

    expect(pairs.map((pair) => [pair.start, pair.end])).toEqual([
      [rowOneStart, rowOneEnd],
      [rowOneEnd, rowTwo],
    ]);
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

describe('collectConnectorPairs', () => {
  const breathWarnings = () =>
    (console.warn as jest.Mock).mock.calls.filter(([message]) =>
      String(message).includes('breath-mark under a slur')
    );

  it('pairs connectors and warns once about a breath mark a slur carries on past', () => {
    const root = document.createElement('div');
    const start = makeNote({ slur: 'start' });
    const inside = makeNote({ 'breath-mark': 'tick' });
    const end = makeNote({ slur: 'end', 'breath-mark': 'tick' });
    root.append(start, inside, end);

    expect(collectConnectorPairs(root).pairs).toHaveLength(1);
    expect(breathWarnings()).toHaveLength(1);
    expect(breathWarnings()[0][1]).toBe(inside);

    collectConnectorPairs(root);
    expect(breathWarnings()).toHaveLength(1);

    inside.removeAttribute('breath-mark');
    collectConnectorPairs(root);
    inside.setAttribute('breath-mark', 'comma');
    collectConnectorPairs(root);
    expect(breathWarnings()).toHaveLength(2);
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

  it('leaves out entries a staff hid, and the notes of a hidden chord', () => {
    const root = document.createElement('div');
    const shown = makeNote({ note: 'C', octave: '4' });
    const hidden = makeNote({ note: 'D', octave: '4' });
    hidden.style.display = 'none';
    const chord = document.createElement(MUSIC_CHORD);
    const chordNote = makeNote({ note: 'E', octave: '4' });
    chordNote.setAttribute('tie', 'start');
    chord.appendChild(chordNote);
    chord.style.display = 'none';
    root.append(shown, hidden, chord);
    document.body.appendChild(root);

    expect(collectNoteLikeElements(root)).toEqual([shown]);
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
    // Both voices tie across the barline. An unpartitioned walk would pair
    // measure 2 voice 1's `end` with measure 1 voice 2's `start`.
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
    ); // mispaired across voices

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

  it('marks a tie dotted when its start sets tie-style="dotted"', () => {
    const a = makeNote({ note: 'C', octave: '4', tie: 'start' });
    a.setAttribute('tie-style', 'dotted');
    const b = makeNote({ note: 'C', octave: '4', tie: 'end' });
    const solidStart = makeNote({ note: 'D', octave: '4', tie: 'start' });
    const solidEnd = makeNote({ note: 'D', octave: '4', tie: 'end' });
    const pairs = pairConnectors([a, b, solidStart, solidEnd]);
    expect(pairs.find((pair) => pair.start === a)?.dotted).toBe(true);
    expect(pairs.find((pair) => pair.start === solidStart)?.dotted).toBe(false);
  });

  it('marks a slur dotted when its start sets slur-style="dotted"', () => {
    const a = makeNote({ slur: 'start', 'slur-style': 'dotted' });
    const b = makeNote({ slur: 'end' });
    const solidStart = makeNote({ slur: 'start' });
    const solidEnd = makeNote({ slur: 'end', 'slur-style': 'dotted' });
    const pairs = pairConnectors([a, b, solidStart, solidEnd]);
    expect(pairs.find((pair) => pair.start === a)?.dotted).toBe(true);
    // Read from the start only.
    expect(pairs.find((pair) => pair.start === solidStart)?.dotted).toBe(false);
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
        decorationRects: [],
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
        decorationRects: [],
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
      rowLeftOf: () => 0,
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
        decorationRects: [],
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
      rowLeftOf: () => 0,
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
        decorationRects: [],
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      { rootRect, rowLeftOf: () => 0 }
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
    // A stem far above the notehead, where the anchor should land. A plain
    // element stands in for <line class="stem">: jsdom's class selectors
    // miss createElementNS'd SVG elements.
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
      rowLeftOf: () => 0,
    });
    const baseline = parsePath(
      withoutFlag.querySelector('path')!.getAttribute('d')!
    );

    const [withFlag] = buildConnectorSvgs([pair], {
      rootRect,
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
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
      rowLeftOf: () => 0,
    });
    const withStemPath = parsePath(
      withStem.querySelector('path')!.getAttribute('d')!
    );

    expect(withStemPath.fromY).toBeCloseTo(baseline.fromY, 5);
  });

  // A stand-in for a note's `.articulations` group at a fixed rect.
  const addMarks = (
    note: Element,
    rect: { left: number; top: number; right: number; bottom: number }
  ): void => {
    const marks = document.createElement('div');
    marks.classList.add('articulations');
    jest.spyOn(marks, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    } as DOMRect);
    note.shadowRoot!.appendChild(marks);
  };

  const quadraticYAt = (
    path: ReturnType<typeof parsePath>,
    x: number
  ): number => {
    const t = (x - path.fromX) / (path.toX - path.fromX);
    const mt = 1 - t;
    return mt * mt * path.fromY + 2 * mt * t * path.cy + t * t * path.toY;
  };

  describe('slurs and articulation marks', () => {
    const slurBetween = (
      start: NoteElementType,
      end: NoteElementType
    ): ConnectorPair => ({
      kind: 'slur',
      start: start as unknown as NoteLikeElementType,
      end: end as unknown as NoteLikeElementType,
      nestingLevel: 0,
    });

    const drawOne = (pair: ConnectorPair) =>
      parsePath(
        buildConnectorSvgs([pair], { rootRect, rowLeftOf: () => 0 })[0]
          .querySelector('path')!
          .getAttribute('d')!
      );

    it('moves a slur end below the staccato dot of its stem-up note', () => {
      const start = makeLayoutNote({ stemUp: true, left: 50 });
      const end = makeLayoutNote({ stemUp: true, left: 250 });
      const pair = slurBetween(start, end);
      const plain = drawOne(pair);

      addMarks(start, {
        left: 56,
        right: 64,
        top: plain.fromY - 3,
        bottom: plain.fromY + 6,
      });
      const marked = drawOne(pair);

      expect(marked.fromY).toBeCloseTo(
        plain.fromY + 6 + SLUR_ARTICULATION_CLEARANCE_PX,
        5
      );
      expect(marked.toY).toBeCloseTo(plain.toY, 5);
    });

    it('moves a slur end above the tenuto line of its stem-down note', () => {
      const start = makeLayoutNote({ stemUp: false, left: 50 });
      const end = makeLayoutNote({ stemUp: false, left: 250 });
      const pair = slurBetween(start, end);
      const plain = drawOne(pair);

      addMarks(end, {
        left: 252,
        right: 268,
        top: plain.toY - 5,
        bottom: plain.toY + 2,
      });
      const marked = drawOne(pair);

      expect(marked.toY).toBeCloseTo(
        plain.toY - 5 - SLUR_ARTICULATION_CLEARANCE_PX,
        5
      );
    });

    it("ignores marks that don't span the end's x, such as a grace note's", () => {
      const start = makeLayoutNote({ stemUp: true, left: 50 });
      const end = makeLayoutNote({ stemUp: true, left: 250 });
      const pair = slurBetween(start, end);
      const plain = drawOne(pair);

      addMarks(start, {
        left: 30,
        right: 40,
        top: plain.fromY,
        bottom: plain.fromY + 20,
      });

      expect(drawOne(pair).fromY).toBeCloseTo(plain.fromY, 5);
    });

    it('carries the arc outside the marks of every note between its ends', () => {
      const staff = document.createElement(MUSIC_STAFF);
      const start = makeLayoutNote({ stemUp: true, left: 50 });
      const middle = makeLayoutNote({ stemUp: true, left: 150 });
      const end = makeLayoutNote({ stemUp: true, left: 250 });
      const after = makeLayoutNote({ stemUp: true, left: 350 });
      staff.append(start, middle, end, after);
      const pair = slurBetween(start, end);
      const plain = drawOne(pair);

      // Deeper than the default arc at the middle note's x.
      const markBottom = quadraticYAt(plain, 160) + 15;
      addMarks(middle, {
        left: 155,
        right: 165,
        top: markBottom - 8,
        bottom: markBottom,
      });
      // Marks outside the slur's span change nothing.
      addMarks(after, {
        left: 355,
        right: 365,
        top: markBottom + 40,
        bottom: markBottom + 60,
      });
      const marked = drawOne(pair);

      expect(marked.fromY).toBeCloseTo(plain.fromY, 5);
      for (const x of [155, 160, 165]) {
        expect(quadraticYAt(marked, x)).toBeGreaterThanOrEqual(
          markBottom + SLUR_ARTICULATION_CLEARANCE_PX - 1e-6
        );
      }
    });

    it('leaves a slur over unmarked notes as it was', () => {
      const staff = document.createElement(MUSIC_STAFF);
      const start = makeLayoutNote({ stemUp: true, left: 50 });
      const middle = makeLayoutNote({ stemUp: true, left: 150 });
      const end = makeLayoutNote({ stemUp: true, left: 250 });
      staff.append(start, middle, end);
      const plain = parsePath(
        buildConnectorSvgs(
          [
            {
              kind: 'tie',
              start: start as unknown as NoteLikeElementType,
              end: end as unknown as NoteLikeElementType,
              nestingLevel: 0,
            },
          ],
          { rootRect, rowLeftOf: () => 0 }
        )[0]
          .querySelector('path')!
          .getAttribute('d')!
      );
      const slur = drawOne(slurBetween(start, end));

      // Same bulge as the default curve; only the head offset differs.
      expect(slur.cy - (slur.fromY + slur.toY) / 2).toBeCloseTo(
        plain.cy - (plain.fromY + plain.toY) / 2,
        5
      );
    });

    it("moves a cross-staff slur's end past its own marks", () => {
      const treble = makeStaffWithRect(0, 100);
      const bass = makeStaffWithRect(200, 300);
      const start = makeLayoutNote({ stemUp: false, left: 50, top: 250 });
      bass.appendChild(start);
      const end = makeLayoutNote({ stemUp: false, left: 750, top: 50 });
      treble.appendChild(end);
      const pair = slurBetween(start, end);
      const plain = drawOne(pair);

      addMarks(start, {
        left: 56,
        right: 64,
        top: plain.fromY - 8,
        bottom: plain.fromY + 2,
      });
      const marked = drawOne(pair);

      expect(marked.fromY).toBeCloseTo(
        plain.fromY - 8 - SLUR_ARTICULATION_CLEARANCE_PX,
        5
      );
    });

    it('carries an enclosing slur outside the slur nested inside it, whatever order the pairs come in', () => {
      // The inner notes sit lower, so the outer slur's default arc would cut
      // through the inner one.
      const notes = [50, 150, 250, 350].map((left, index) =>
        makeLayoutNote({
          stemUp: true,
          left,
          top: index === 1 || index === 2 ? 125 : 100,
        })
      );
      document.createElement(MUSIC_STAFF).append(...notes);
      const outer: ConnectorPair = {
        ...slurBetween(notes[0], notes[3]),
        nestingLevel: 1,
      };
      const inner = slurBetween(notes[1], notes[2]);
      const alone = drawOne(outer);

      const [outerSvg, innerSvg] = buildConnectorSvgs([outer, inner], {
        rootRect,
        rowLeftOf: () => 0,
      }).sort(
        (a, b) =>
          parsePath(a.querySelector('path')!.getAttribute('d')!).fromX -
          parsePath(b.querySelector('path')!.getAttribute('d')!).fromX
      );
      const outerPath = parsePath(
        outerSvg.querySelector('path')!.getAttribute('d')!
      );
      const innerPath = parsePath(
        innerSvg.querySelector('path')!.getAttribute('d')!
      );

      expect(outerPath.cy).toBeGreaterThan(alone.cy);
      for (let k = 0; k <= 10; k++) {
        const x =
          innerPath.fromX + ((innerPath.toX - innerPath.fromX) * k) / 10;
        expect(quadraticYAt(outerPath, x)).toBeGreaterThan(
          quadraticYAt(innerPath, x)
        );
      }
    });

    it('leaves a slur alone beside one it does not enclose', () => {
      const notes = [50, 150, 250, 350].map((left) =>
        makeLayoutNote({ stemUp: true, left })
      );
      const first = slurBetween(notes[0], notes[1]);
      const second = slurBetween(notes[2], notes[3]);
      const alone = drawOne(second);

      const svgs = buildConnectorSvgs([first, second], {
        rootRect,
        rowLeftOf: () => 0,
      });
      const secondPath = parsePath(
        svgs[1].querySelector('path')!.getAttribute('d')!
      );
      expect(secondPath.cy).toBeCloseTo(alone.cy, 5);
    });

    it('draws a dotted slur with dashes', () => {
      const start = makeLayoutNote({ stemUp: true, left: 50 });
      const end = makeLayoutNote({ stemUp: true, left: 250 });
      const [svg] = buildConnectorSvgs(
        [{ ...slurBetween(start, end), dotted: true }],
        { rootRect, rowLeftOf: () => 0 }
      );
      const path = svg.querySelector('path')!;
      expect(path.classList.contains('dotted')).toBe(true);
      expect(path.getAttribute('stroke-dasharray')).not.toBeNull();
    });
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
