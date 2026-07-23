import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../test-fixtures/helpers';
import type { NoteLetterOctave } from '../types/elements';
import type { DurationType } from '../types/theory';
import {
  MUSIC_COMPOSITION,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_STAFF,
} from '../utils/consts';

const MIN_NOTE_WIDTH = 20;

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

interface FlexValues {
  grow: number;
  shrink: number;
  basis: number;
}

function parseFlex(flexValue: string): FlexValues {
  const parts = flexValue.split(' ');
  return {
    grow: parseFloat(parts[0]),
    shrink: parseFloat(parts[1]),
    basis: parseFloat(parts[2]),
  };
}

async function readMeasureFlex(page: Page): Promise<FlexValues> {
  const flexString = await page.evaluate((measureTag) => {
    const measure = document.querySelector(measureTag) as HTMLElement | null;
    if (measure === null) {
      throw new Error(`${measureTag} not found`);
    }
    return measure.style.flex;
  }, MUSIC_MEASURE);
  return parseFlex(flexString);
}

async function readDescribeEndX(page: Page): Promise<number> {
  return page.evaluate((staffTag) => {
    const staff = document.querySelector(staffTag) as
      | (Element & { describeEndX: number })
      | null;
    if (staff === null) {
      throw new Error(`${staffTag} not found`);
    }
    return staff.describeEndX;
  }, MUSIC_STAFF);
}

async function buildMeasureWithNotes(
  page: Page,
  duration: DurationType,
  noteValues: NoteLetterOctave[]
): Promise<void> {
  await page.evaluate(
    ({
      duration,
      noteValues,
      compositionTag,
      measureTag,
      staffTag,
      noteTag,
    }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '900px';
      const composition = document.createElement(compositionTag);
      const measure = document.createElement(measureTag);
      const staff = document.createElement(staffTag);
      for (const value of noteValues) {
        const note = document.createElement(noteTag);
        note.setAttribute('note', value[0]);
        note.setAttribute('octave', value[1]);
        note.setAttribute('duration', duration);
        staff.appendChild(note);
      }
      measure.appendChild(staff);
      composition.appendChild(measure);
      host.appendChild(composition);
    },
    {
      duration,
      noteValues,
      compositionTag: MUSIC_COMPOSITION,
      measureTag: MUSIC_MEASURE,
      staffTag: MUSIC_STAFF,
      noteTag: MUSIC_NOTE,
    }
  );
}

const ONE_NOTE: NoteLetterOctave[] = ['C4'];
const FOUR_NOTES: NoteLetterOctave[] = ['C4', 'D4', 'E4', 'F4'];
const EIGHT_NOTES: NoteLetterOctave[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
];
const ELEVEN_NOTES: NoteLetterOctave[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
  'D5',
  'E5',
  'F5',
];
const FIFTEEN_NOTES: NoteLetterOctave[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
  'D5',
  'E5',
  'F5',
  'G5',
  'A5',
  'B5',
  'C6',
];
// 16 × MIN_NOTE_WIDTH (20) = 320px, guaranteeing minWidth > 300 regardless of describeEndX
const SIXTEEN_NOTES: NoteLetterOctave[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
  'D5',
  'E5',
  'F5',
  'G5',
  'A5',
  'B5',
  'C6',
  'D6',
];

test.describe(`${MUSIC_MEASURE} min-width layout`, () => {
  test('single whole note — basis equals describeEndX + MIN_NOTE_WIDTH, grow clamped to minimum', async ({
    page,
  }) => {
    await buildMeasureWithNotes(page, 'whole', ONE_NOTE);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    const describeEndX = await readDescribeEndX(page);

    expect(
      Math.abs(flex.basis - (describeEndX + MIN_NOTE_WIDTH))
    ).toBeLessThanOrEqual(1);
    expect(flex.grow).toBeCloseTo(0.2, 5);
  });

  test('basis scales linearly with note count — delta = noteCount × MIN_NOTE_WIDTH', async ({
    page,
  }) => {
    await buildMeasureWithNotes(page, 'eighth', ONE_NOTE);
    await waitForRedrawCycle(page);
    const flex1 = await readMeasureFlex(page);

    await buildMeasureWithNotes(page, 'eighth', EIGHT_NOTES);
    await waitForRedrawCycle(page);
    const flex8 = await readMeasureFlex(page);

    expect(flex8.basis - flex1.basis).toBeCloseTo(7 * MIN_NOTE_WIDTH, 1);
  });

  test('16 hundredtwentyeighth notes — basis exceeds old 300px cap (regression)', async ({
    page,
  }) => {
    await buildMeasureWithNotes(page, 'hundredtwentyeighth', SIXTEEN_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    const describeEndX = await readDescribeEndX(page);

    // 16 × 20 = 320px of notes alone, so minWidth > 300 regardless of describeEndX
    expect(flex.basis).toBeGreaterThan(300);
    expect(
      Math.abs(flex.basis - (describeEndX + 16 * MIN_NOTE_WIDTH))
    ).toBeLessThanOrEqual(1);
  });

  test('notes do not bleed — proportionalWidth is non-negative for 15 hundredtwentyeighth notes', async ({
    page,
  }) => {
    await buildMeasureWithNotes(page, 'hundredtwentyeighth', FIFTEEN_NOTES);
    await waitForRedrawCycle(page);

    const { staffWidth, describeEndX } = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag) as
        | (Element & { describeEndX: number })
        | null;
      if (staff === null) {
        throw new Error('staff not found');
      }
      return {
        staffWidth: staff.getBoundingClientRect().width,
        describeEndX: staff.describeEndX,
      };
    }, MUSIC_STAFF);

    const proportionalWidth = staffWidth - describeEndX - 15 * MIN_NOTE_WIDTH;
    expect(proportionalWidth).toBeGreaterThanOrEqual(0);
  });

  test('two staves — measure uses the larger minWidth', async ({ page }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);

        const slowStaff = document.createElement(staffTag);
        const wholeNote = document.createElement(noteTag);
        wholeNote.setAttribute('note', ('C4' satisfies NoteLetterOctave)[0]);
        wholeNote.setAttribute('octave', ('C4' satisfies NoteLetterOctave)[1]);
        wholeNote.setAttribute('duration', 'whole' satisfies DurationType);
        slowStaff.appendChild(wholeNote);

        const fastStaff = document.createElement(staffTag);
        for (const value of [
          'C4',
          'D4',
          'E4',
          'F4',
          'G4',
          'A4',
          'B4',
          'C5',
        ] as NoteLetterOctave[]) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', value[0]);
          note.setAttribute('octave', value[1]);
          note.setAttribute('duration', 'eighth' satisfies DurationType);
          fastStaff.appendChild(note);
        }

        measure.appendChild(slowStaff);
        measure.appendChild(fastStaff);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    const describeEndX = await readDescribeEndX(page);

    const minWidthFor1Note = describeEndX + 1 * MIN_NOTE_WIDTH;
    const minWidthFor8Notes = describeEndX + 8 * MIN_NOTE_WIDTH;

    expect(Math.abs(flex.basis - minWidthFor8Notes)).toBeLessThanOrEqual(1);
    expect(flex.basis).toBeGreaterThan(minWidthFor1Note);
  });

  test('flex-grow increases monotonically as note count grows', async ({
    page,
  }) => {
    const noteCounts: NoteLetterOctave[][] = [
      ONE_NOTE,
      FOUR_NOTES,
      ELEVEN_NOTES,
      FIFTEEN_NOTES,
    ];

    const grows: number[] = [];
    for (const noteValues of noteCounts) {
      await buildMeasureWithNotes(page, 'quarter', noteValues);
      await waitForRedrawCycle(page);
      const flex = await readMeasureFlex(page);
      grows.push(flex.grow);
    }

    for (let i = 1; i < grows.length; i++) {
      expect(grows[i]).toBeGreaterThanOrEqual(grows[i - 1]);
    }
  });
});

test.describe(`${MUSIC_MEASURE} group connectors`, () => {
  async function buildMeasureWithStaves(
    page: Page,
    staffGroups: (string | null)[]
  ): Promise<void> {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag, staffGroups }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);

        for (const group of staffGroups) {
          const staff = document.createElement(staffTag);
          if (group !== null) {
            staff.setAttribute('group', group);
          }
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'C');
          note.setAttribute('octave', '4');
          note.setAttribute('duration', 'whole');
          staff.appendChild(note);
          measure.appendChild(staff);
        }

        composition.appendChild(measure);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        staffGroups,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
  }

  async function readGroupConnectorGlyphs(
    page: Page
  ): Promise<{ tag: string; className: string }[]> {
    return page.evaluate((measureTag) => {
      const measure = document.querySelector(measureTag);
      const container = measure?.shadowRoot?.querySelector('.group-connectors');
      if (!container) {
        return [];
      }
      return Array.from(container.children).map((el) => ({
        tag: el.tagName,
        className: el.getAttribute('class') ?? '',
      }));
    }, MUSIC_MEASURE);
  }

  test('a grand-staff pair renders exactly one brace glyph', async ({
    page,
  }) => {
    await buildMeasureWithStaves(page, ['grand', null]);
    const glyphs = await readGroupConnectorGlyphs(page);
    expect(glyphs).toHaveLength(1);
    expect(glyphs[0].className).toContain('brace');
  });

  test('a bracket pair renders exactly one bracket glyph', async ({ page }) => {
    await buildMeasureWithStaves(page, ['bracket', null]);
    const glyphs = await readGroupConnectorGlyphs(page);
    expect(glyphs).toHaveLength(1);
    expect(glyphs[0].className).toContain('bracket');
  });

  test('two independent grand-staff pairs in one measure render two brace glyphs', async ({
    page,
  }) => {
    await buildMeasureWithStaves(page, ['grand', null, 'grand', null]);
    const glyphs = await readGroupConnectorGlyphs(page);
    expect(glyphs).toHaveLength(2);
    expect(glyphs.every((g) => g.className.includes('brace'))).toBe(true);
  });

  test('a grouped staff with no next sibling renders no connector', async ({
    page,
  }) => {
    await buildMeasureWithStaves(page, [null, 'grand']);
    const glyphs = await readGroupConnectorGlyphs(page);
    expect(glyphs).toHaveLength(0);
  });

  test('ungrouped staves render no group connector', async ({ page }) => {
    await buildMeasureWithStaves(page, [null, null]);
    const glyphs = await readGroupConnectorGlyphs(page);
    expect(glyphs).toHaveLength(0);
  });

  test('a grand-staff pair connector height matches its 2 staves, not the whole measure', async ({
    page,
  }) => {
    await buildMeasureWithStaves(page, ['grand', null, null]);
    const heights = await page.evaluate((measureTag) => {
      const measure = document.querySelector(measureTag);
      const shadow = measure?.shadowRoot;
      const brace = shadow?.querySelector('.group-connectors svg.brace');
      const barline = shadow?.querySelector<HTMLElement>('.staff-connector');
      return {
        braceHeight: brace ? Number(brace.getAttribute('height')) : null,
        barlineHeight: barline ? parseFloat(barline.style.height) : null,
      };
    }, MUSIC_MEASURE);

    expect(heights.braceHeight).not.toBeNull();
    expect(heights.barlineHeight).not.toBeNull();
    // The brace only spans 2 of the 3 staves, so it must be shorter than the
    // barline that spans all 3.
    expect(heights.braceHeight as number).toBeLessThan(
      heights.barlineHeight as number
    );
  });

  test('composition reserves left padding only when a grouped staff is present', async ({
    page,
  }) => {
    await buildMeasureWithStaves(page, ['grand', null]);
    const withGroup = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      const wrapper = composition?.shadowRoot?.querySelector(
        '.composition-wrapper'
      );
      return wrapper?.classList.contains('has-group-connector') ?? false;
    }, MUSIC_COMPOSITION);
    expect(withGroup).toBe(true);

    await buildMeasureWithStaves(page, [null, null]);
    const withoutGroup = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      const wrapper = composition?.shadowRoot?.querySelector(
        '.composition-wrapper'
      );
      return wrapper?.classList.contains('has-group-connector') ?? false;
    }, MUSIC_COMPOSITION);
    expect(withoutGroup).toBe(false);
  });
});
