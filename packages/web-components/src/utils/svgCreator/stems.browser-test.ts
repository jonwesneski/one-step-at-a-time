import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function render(page: Page, markup: string): Promise<void> {
  await page.evaluate((html) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = '900px';
    host.style.padding = '120px 0';
    host.innerHTML = html;
  }, markup);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

type Stem = { up: boolean; lengthSpaces: number; top: number; bottom: number };

const SPACE_PX = 10;

async function stems(page: Page, selector: string): Promise<Stem[]> {
  const raw = await page.evaluate((query) => {
    const collect = (root: Document | ShadowRoot): Element[] => {
      const direct = Array.from(root.querySelectorAll(query));
      const nested = Array.from(root.querySelectorAll('*')).flatMap((element) =>
        element.shadowRoot && element.tagName !== 'MUSIC-NOTE'
          ? collect(element.shadowRoot)
          : []
      );
      return [...direct, ...nested];
    };
    return collect(document).flatMap((element) => {
      const stem = element.shadowRoot?.querySelector('.stem');
      if (!stem) {
        return [];
      }
      const rect = stem.getBoundingClientRect();
      return [
        {
          up: (element as unknown as { stemUp: boolean }).stemUp,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom,
        },
      ];
    });
  }, selector);
  return raw.map(({ up, height, top, bottom }) => ({
    up,
    lengthSpaces: height / SPACE_PX,
    top,
    bottom,
  }));
}

async function middleLineY(page: Page): Promise<number> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const lines = staff?.shadowRoot?.querySelectorAll('.staff-line');
    const middle = lines?.[1];
    if (!middle) {
      throw new Error('middle line missing');
    }
    const rect = middle.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });
}

const quarters = (pitches: [string, number][], attributes = '') =>
  pitches
    .map(
      ([note, octave]) =>
        `<music-note note="${note}" octave="${octave}" duration="quarter" ${attributes}></music-note>`
    )
    .join('');

test('a standard stem is 3½ spaces in both directions', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">${quarters([
      ['A', 4],
      ['C', 5],
    ])}</music-staff>`
  );
  const [a4, c5] = await stems(page, 'music-note');
  expect(a4.up).toBe(true);
  expect(c5.up).toBe(false);
  expect(a4.lengthSpaces).toBeCloseTo(3.5, 1);
  expect(c5.lengthSpaces).toBeCloseTo(3.5, 1);
});

test('notes past the first ledger line reach the middle line', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="5/4">${quarters([
      ['A', 5],
      ['B', 5],
      ['C', 6],
      ['D', 6],
      ['E', 6],
    ])}</music-staff>`
  );
  const [a5, b5, c6, d6, e6] = await stems(page, 'music-note');
  const middle = await middleLineY(page);
  expect(a5.lengthSpaces).toBeCloseTo(3.5, 1);
  expect(b5.lengthSpaces).toBeCloseTo(3.5, 1);
  for (const stem of [b5, c6, d6, e6]) {
    expect(stem.up).toBe(false);
    expect(Math.abs(stem.bottom - middle)).toBeLessThan(1.5);
  }
  expect(c6.lengthSpaces).toBeCloseTo(4, 1);
  expect(e6.lengthSpaces).toBeCloseTo(5, 1);
});

test('notes below the stave reach the middle line', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="3/4">${quarters([
      ['C', 4],
      ['A', 3],
      ['F', 3],
    ])}</music-staff>`
  );
  const [c4, a3, f3] = await stems(page, 'music-note');
  const middle = await middleLineY(page);
  expect(c4.lengthSpaces).toBeCloseTo(3.5, 1);
  for (const stem of [a3, f3]) {
    expect(stem.up).toBe(true);
    expect(Math.abs(stem.top - middle)).toBeLessThan(1.5);
  }
});

test('two voices shorten their stems progressively to the minimum', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="6/4">
      <music-voice>${quarters(
        [
          ['A', 4],
          ['B', 4],
          ['C', 5],
          ['D', 5],
          ['E', 5],
          ['F', 5],
          // A differing articulation keeps auto-combine from merging the voices.
        ],
        'articulation="staccato"'
      )}</music-voice>
      <music-voice>${quarters([
        ['C', 5],
        ['B', 4],
        ['A', 4],
        ['G', 4],
        ['F', 4],
        ['E', 4],
      ])}</music-voice>
    </music-staff>`
  );
  const all = await stems(page, 'music-note');
  const up = all.filter((stem) => stem.up).map((stem) => stem.lengthSpaces);
  const down = all.filter((stem) => !stem.up).map((stem) => stem.lengthSpaces);
  const expected = [3.5, 3.25, 3, 2.75, 2.5, 2.5];
  expected.forEach((length, i) => {
    expect(up[i]).toBeCloseTo(length, 1);
    expect(down[i]).toBeCloseTo(length, 1);
  });
});

test('a chord stem is measured from the head nearest the open end', async ({
  page,
}) => {
  const chord = (notes: [string, number][]) =>
    `<music-chord duration="quarter" stem-direction="down">${notes
      .map(
        ([note, octave]) =>
          `<music-note note="${note}" octave="${octave}" duration="quarter"></music-note>`
      )
      .join('')}</music-chord>`;
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
      ${chord([
        ['E', 5],
        ['A', 4],
      ])}
      ${chord([
        ['G', 5],
        ['B', 4],
        ['E', 4],
      ])}
    </music-staff>`
  );
  const [fromA4, fromE4] = await stems(page, 'music-chord');
  // The spread down to the open-end head, then its stem: 3 from A4, 2½ from E4.
  expect(fromA4.lengthSpaces).toBeCloseTo(2 + 3, 1);
  expect(fromE4.lengthSpaces).toBeCloseTo(4.5 + 2.5, 1);
});

test('a tuplet bracket clears the real tip of a chord stem', async ({
  page,
}) => {
  const tallChord = `<music-chord duration="quarter" stem-direction="up">
    <music-note note="C" octave="4" duration="quarter"></music-note>
    <music-note note="A" octave="5" duration="quarter"></music-note>
  </music-chord>`;
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
      <music-tuplet ratio="3">${tallChord}${tallChord}${tallChord}</music-tuplet>
    </music-staff>`
  );
  const [chord] = await stems(page, 'music-chord');
  const bracketBottom = await page.evaluate(() => {
    const brackets = document
      .querySelector('music-staff')
      ?.shadowRoot?.querySelectorAll('.tuplet-bracket');
    if (!brackets || brackets.length === 0) {
      throw new Error('tuplet bracket missing');
    }
    return Math.max(
      ...Array.from(brackets).map(
        (bracket) => bracket.getBoundingClientRect().bottom
      )
    );
  });
  expect(bracketBottom).toBeLessThanOrEqual(chord.top);
});

test('a centre-line note continues its surrounding stems', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="3/4">${quarters([
      ['G', 4],
      ['B', 4],
      ['A', 4],
    ])}</music-staff>`
  );
  const directions = (await stems(page, 'music-note')).map((stem) => stem.up);
  expect(directions).toEqual([true, true, true]);
});

test('a centre-line note keeps to its half-bar when direction varies', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">${quarters([
      ['C', 5],
      ['B', 4],
      ['A', 4],
      ['B', 4],
    ])}</music-staff>`
  );
  const directions = (await stems(page, 'music-note')).map((stem) => stem.up);
  expect(directions).toEqual([false, false, true, true]);
});

test('stems are thinner than stave lines, and all stave lines match', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="1/4">${quarters([
      ['A', 4],
    ])}</music-staff>`
  );
  const { stemWidth, innerLine, outerLine } = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const note = document.querySelector('music-note');
    const stem = note?.shadowRoot?.querySelector('.stem');
    const group = stem?.closest('g');
    const scale = (group as SVGGElement | null)?.getCTM()?.a ?? 1;
    const line = staff?.shadowRoot?.querySelector('.staff-line');
    const container = staff?.shadowRoot?.querySelector('.staff-container');
    if (!stem || !line || !container) {
      throw new Error('stem or stave line missing');
    }
    return {
      stemWidth: Number(stem.getAttribute('stroke-width')) * scale,
      innerLine: line.getBoundingClientRect().height,
      outerLine: parseFloat(getComputedStyle(container).borderTopWidth),
    };
  });
  expect(innerLine).toBe(outerLine);
  expect(stemWidth).toBeLessThan(innerLine);
  expect(stemWidth).toBeGreaterThan(innerLine / 2);
});

test('cross-staff beam members keep the beam line as their length', async ({
  page,
}) => {
  await render(
    page,
    `<music-measure>
      <music-staff clef="treble" time="2/4">
        <music-note note="E" octave="5" duration="eighth" beam-group="g"></music-note>
        <music-note note="D" octave="5" duration="eighth" beam-group="g"></music-note>
      </music-staff>
      <music-staff clef="bass" time="2/4">
        <music-note note="C" octave="3" duration="eighth" beam-group="g"></music-note>
        <music-note note="D" octave="3" duration="eighth" beam-group="g"></music-note>
      </music-staff>
    </music-measure>`
  );
  await waitForRedrawCycle(page);
  const beamY = await page.evaluate(() => {
    const beam = document
      .querySelector('music-measure')
      ?.shadowRoot?.querySelector('polygon');
    if (!beam) {
      throw new Error('cross-staff beam missing');
    }
    const rect = beam.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  for (const stem of await stems(page, 'music-note')) {
    const tip = stem.up ? stem.top : stem.bottom;
    expect(tip).toBeGreaterThanOrEqual(beamY.top - 1.5);
    expect(tip).toBeLessThanOrEqual(beamY.bottom + 1.5);
  }
});
