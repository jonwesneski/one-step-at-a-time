import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../test-fixtures/helpers';
import type { DurationType, LetterOctave } from '../types/theory';

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
  const flexString = await page.evaluate(() => {
    const measure = document.querySelector(
      'music-measure'
    ) as HTMLElement | null;
    if (measure === null) {
      throw new Error('music-measure not found');
    }
    return measure.style.flex;
  });
  return parseFlex(flexString);
}

async function buildMeasureWithNotes(
  page: Page,
  duration: DurationType,
  noteValues: LetterOctave[]
): Promise<void> {
  await page.evaluate(
    ({ duration, noteValues }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const composition = document.createElement('music-composition');
      const measure = document.createElement('music-measure');
      const staff = document.createElement('music-staff-treble');
      for (const value of noteValues) {
        const note = document.createElement('music-note');
        note.setAttribute('value', value);
        note.setAttribute('duration', duration);
        staff.appendChild(note);
      }
      measure.appendChild(staff);
      composition.appendChild(measure);
      host.appendChild(composition);
    },
    { duration, noteValues }
  );
}

const ONE_NOTE: LetterOctave[] = ['C4'];
const FOUR_NOTES: LetterOctave[] = ['C4', 'D4', 'E4', 'F4'];
const CHORD_NOTES: LetterOctave[] = ['C4', 'E4', 'G4', 'B4', 'D5'];

test.describe('music-measure busyness score layout', () => {
  test('whole note → score 1 → flex grow 0.2, basis 180px', async ({
    page,
  }) => {
    const duration: DurationType = 'whole';
    await buildMeasureWithNotes(page, duration, ONE_NOTE);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.2, 5);
    expect(flex.basis).toBeCloseTo(180, 1);
  });

  test('half note → score 1 → flex grow 0.2, basis 180px', async ({
    page,
  }) => {
    const duration: DurationType = 'half';
    await buildMeasureWithNotes(page, duration, ONE_NOTE);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.2, 5);
    expect(flex.basis).toBeCloseTo(180, 1);
  });

  test('quarter note → score 1 → flex grow 0.2, basis 180px', async ({
    page,
  }) => {
    const duration: DurationType = 'quarter';
    await buildMeasureWithNotes(page, duration, ONE_NOTE);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.2, 5);
    expect(flex.basis).toBeCloseTo(180, 1);
  });

  test('eighth notes → score 2 → flex grow 0.4, basis 210px', async ({
    page,
  }) => {
    const duration: DurationType = 'eighth';
    await buildMeasureWithNotes(page, duration, FOUR_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });

  test('sixteenth notes → score 2 → flex grow 0.4, basis 210px', async ({
    page,
  }) => {
    const duration: DurationType = 'sixteenth';
    await buildMeasureWithNotes(page, duration, FOUR_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });

  test('thirtysecond notes → score 2 → flex grow 0.4, basis 210px', async ({
    page,
  }) => {
    const duration: DurationType = 'thirtysecond';
    await buildMeasureWithNotes(page, duration, FOUR_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });

  test('sixtyfourth notes → score 2 → flex grow 0.4, basis 210px', async ({
    page,
  }) => {
    const duration: DurationType = 'sixtyfourth';
    await buildMeasureWithNotes(page, duration, FOUR_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });

  test('hundredtwentyeighth notes → score 3 → flex grow 0.6, basis 240px', async ({
    page,
  }) => {
    const duration: DurationType = 'hundredtwentyeighth';
    await buildMeasureWithNotes(page, duration, FOUR_NOTES);
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.6, 5);
    expect(flex.basis).toBeCloseTo(240, 1);
  });

  test('5-note chord with quarter duration → score 2 → flex grow 0.4, basis 210px', async ({
    page,
  }) => {
    const chordNotes: LetterOctave[] = CHORD_NOTES;
    const duration: DurationType = 'quarter';
    await page.evaluate(
      ({ chordNotes, duration }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const composition = document.createElement('music-composition');
        const measure = document.createElement('music-measure');
        const staff = document.createElement('music-staff-treble');
        const chord = document.createElement('music-chord');
        chord.setAttribute('duration', duration);
        for (const value of chordNotes) {
          const note = document.createElement('music-note');
          note.setAttribute('value', value);
          note.setAttribute('duration', duration);
          chord.appendChild(note);
        }
        staff.appendChild(chord);
        measure.appendChild(staff);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      { chordNotes, duration }
    );
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });

  test('5-note chord with sixteenth duration → score 3 → flex grow 0.6, basis 240px', async ({
    page,
  }) => {
    const chordNotes: LetterOctave[] = CHORD_NOTES;
    const duration: DurationType = 'sixteenth';
    await page.evaluate(
      ({ chordNotes, duration }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const composition = document.createElement('music-composition');
        const measure = document.createElement('music-measure');
        const staff = document.createElement('music-staff-treble');
        const chord = document.createElement('music-chord');
        chord.setAttribute('duration', duration);
        for (const value of chordNotes) {
          const note = document.createElement('music-note');
          note.setAttribute('value', value);
          note.setAttribute('duration', duration);
          chord.appendChild(note);
        }
        staff.appendChild(chord);
        measure.appendChild(staff);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      { chordNotes, duration }
    );
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.6, 5);
    expect(flex.basis).toBeCloseTo(240, 1);
  });

  test('two staves in one measure — measure applies max busyness score', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const composition = document.createElement('music-composition');
      const measure = document.createElement('music-measure');

      const slowStaff = document.createElement('music-staff-treble');
      for (const value of ['C4', 'D4', 'E4', 'F4'] as LetterOctave[]) {
        const note = document.createElement('music-note');
        note.setAttribute('value', value);
        note.setAttribute('duration', 'whole' satisfies DurationType);
        slowStaff.appendChild(note);
      }

      const fastStaff = document.createElement('music-staff-treble');
      for (const value of ['C4', 'D4', 'E4', 'F4'] as LetterOctave[]) {
        const note = document.createElement('music-note');
        note.setAttribute('value', value);
        note.setAttribute('duration', 'eighth' satisfies DurationType);
        fastStaff.appendChild(note);
      }

      measure.appendChild(slowStaff);
      measure.appendChild(fastStaff);
      composition.appendChild(measure);
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);

    const flex = await readMeasureFlex(page);
    expect(flex.grow).toBeCloseTo(0.4, 5);
    expect(flex.basis).toBeCloseTo(210, 1);
  });
});
