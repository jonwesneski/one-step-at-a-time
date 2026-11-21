import { describe, expect, it } from 'vitest';
import { upsertConnector } from './connectorsHelpers';
import {
  joinLyrics,
  parseLyricSyllables,
  setStaffLyrics,
  sungEntryCount,
} from './lyricsHelpers';
import { staffSettingsOf } from './staffSettingsHelpers';
import type { CompositionStructure, MusicEntry, VocalStaff } from './types';

function vocalStructure(): CompositionStructure {
  const entries: MusicEntry[] = [
    { id: 'n1', type: 'note', value: 'C', duration: 'quarter' },
    { id: 'n2', type: 'note', value: 'C', duration: 'quarter' },
    {
      id: 'ch',
      type: 'chord',
      notes: [{ value: 'C' }, { value: 'E' }],
      duration: 'quarter',
    },
    { id: 'r', type: 'rest', duration: 'quarter' },
  ];
  const staff: VocalStaff = {
    id: 'v',
    type: 'vocal',
    voiceType: 'tenor',
    voiceOrder: ['v1'],
    voicesById: { v1: { id: 'v1', entryIds: ['n1', 'n2', 'ch', 'r'] } },
    group: null,
    groupId: null,
  };
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['v'] } },
    stavesById: { v: staff },
    entriesById: Object.fromEntries(entries.map((e) => [e.id, e])),
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

describe('parseLyricSyllables', () => {
  it('splits words and hyphenated syllables, marking melismas', () => {
    expect(parseLyricSyllables('Ky-ri-e  e_')).toEqual([
      { text: 'Ky', isMelisma: false, isHyphenated: true },
      { text: 'ri', isMelisma: false, isHyphenated: true },
      { text: 'e', isMelisma: false, isHyphenated: false },
      { text: 'e', isMelisma: true, isHyphenated: false },
    ]);
  });
});

describe('sungEntryCount', () => {
  it('counts notes and chords once each, not rests', () => {
    const s = vocalStructure();
    expect(sungEntryCount(s, s.stavesById.v)).toBe(3);
  });

  it('skips a tie continuation', () => {
    const s = upsertConnector(vocalStructure(), 'n1', 'n2', 'tie');
    expect(sungEntryCount(s, s.stavesById.v)).toBe(2);
  });
});

describe('setStaffLyrics', () => {
  it('sorts verses and drops blank ones', () => {
    const next = setStaffLyrics(vocalStructure(), 'v', [
      { verse: 2, text: ' la ' },
      { verse: 1, text: 'do re' },
      { verse: 3, text: '   ' },
    ]);
    expect((next.stavesById.v as VocalStaff).lyrics).toEqual([
      { verse: 1, text: 'do re' },
      { verse: 2, text: 'la' },
    ]);
  });

  it('returns the same structure when nothing changes', () => {
    const s = setStaffLyrics(vocalStructure(), 'v', [{ verse: 1, text: 'a' }]);
    expect(setStaffLyrics(s, 'v', [{ verse: 1, text: 'a' }])).toBe(s);
  });
});

describe('joinLyrics', () => {
  it('joins measures verse by verse', () => {
    expect(
      joinLyrics([
        [{ verse: 1, text: 'Hap-py' }],
        undefined,
        [
          { verse: 1, text: 'birth-day' },
          { verse: 2, text: 'to you' },
        ],
      ])
    ).toEqual([
      { verse: 1, text: 'Hap-py birth-day' },
      { verse: 2, text: 'to you' },
    ]);
  });
});

describe('staffSettingsOf', () => {
  it('leaves one measure’s lyrics behind', () => {
    const staff = {
      ...(vocalStructure().stavesById.v as VocalStaff),
      lyrics: [{ verse: 1, text: 'la' }],
    };
    expect(staffSettingsOf(staff)).not.toHaveProperty('lyrics');
    expect(staffSettingsOf(staff)).toMatchObject({
      type: 'vocal',
      voiceType: 'tenor',
    });
  });
});
