import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function render(page: Page, markup: string): Promise<void> {
  await page.evaluate((html) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = '600px';
    host.innerHTML = html;
  }, markup);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

async function stemTipTops(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('music-note')).map(
      (note) =>
        note.shadowRoot?.querySelector('.stem')?.getBoundingClientRect().top ??
        Number.NaN
    )
  );
}

async function strokeCount(page: Page): Promise<number> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('music-note')).reduce(
      (count, note) =>
        count +
        (note.shadowRoot?.querySelectorAll('.tremolo-stroke').length ?? 0),
      0
    )
  );
}

async function setTremolo(page: Page, value: string | null): Promise<void> {
  await page.evaluate((tremolo) => {
    for (const note of Array.from(document.querySelectorAll('music-note'))) {
      if (tremolo === null) {
        note.removeAttribute('tremolo');
      } else {
        note.setAttribute('tremolo', tremolo);
      }
    }
  }, value);
  await waitForRedrawCycle(page);
}

test('adding a tremolo to beamed notes lengthens their stems, and removing it restores them', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="E" octave="4" duration="eighth"></music-note>
       <music-note note="E" octave="4" duration="eighth"></music-note>
     </music-staff>`
  );
  const plainTops = await stemTipTops(page);

  await setTremolo(page, '2');

  const tremoloTops = await stemTipTops(page);
  expect(await strokeCount(page)).toBe(4);
  tremoloTops.forEach((top, i) => expect(top).toBeLessThan(plainTops[i]));

  await setTremolo(page, null);

  expect(await strokeCount(page)).toBe(0);
  const restoredTops = await stemTipTops(page);
  restoredTops.forEach((top, i) => expect(top).toBeCloseTo(plainTops[i], 1));
});

test('adding a tremolo to one of two beamed notes splits the beam', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="E" octave="4" duration="eighth"></music-note>
       <music-note note="E" octave="4" duration="eighth"></music-note>
     </music-staff>`
  );
  const beamGroups = () =>
    page.evaluate(
      () =>
        document
          .querySelector('music-staff')
          ?.shadowRoot?.querySelectorAll('.beam-group').length ?? 0
    );
  expect(await beamGroups()).toBe(1);

  await page.evaluate(() => {
    document.querySelector('music-note')?.setAttribute('tremolo', '1');
  });
  await waitForRedrawCycle(page);

  expect(await beamGroups()).toBe(0);
});

test('a dotted tie across a barline repeats the accidental, and a solid one drops it again', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition>
       <music-measure>
         <music-staff clef="treble" time="2/4">
           <music-note id="from" note="F#" octave="4" duration="half" tremolo="3" tie="start"></music-note>
         </music-staff>
       </music-measure>
       <music-measure>
         <music-staff clef="treble" time="2/4">
           <music-note id="to" note="F#" octave="4" duration="half" tremolo="3" tie="end"></music-note>
         </music-staff>
       </music-measure>
     </music-composition>`
  );
  const tiedInAccidental = () =>
    page.evaluate(
      () =>
        (
          document.getElementById('to') as unknown as {
            showAccidental: unknown;
          }
        ).showAccidental ?? null
    );
  const setTieStyle = async (style: string) => {
    await page.evaluate((value) => {
      document.getElementById('from')?.setAttribute('tie-style', value);
    }, style);
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
  };

  expect(await tiedInAccidental()).toBeNull();

  await setTieStyle('dotted');
  expect(await tiedInAccidental()).toBe('sharp');

  await setTieStyle('solid');
  expect(await tiedInAccidental()).toBeNull();
});

test('resizing keeps a two-note tremolo’s beams centred between its stems', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-tremolo strokes="3">
         <music-note note="F" octave="4" duration="half"></music-note>
         <music-note note="A" octave="4" duration="half"></music-note>
       </music-tremolo>
       <music-note note="C" octave="5" duration="half"></music-note>
     </music-staff>`
  );
  const offCentre = () =>
    page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const beam = staff?.shadowRoot
        ?.querySelector('.tremolo-beam')
        ?.getBoundingClientRect();
      const stems = Array.from(
        document.querySelectorAll('music-tremolo music-note')
      ).map(
        (note) =>
          note.shadowRoot?.querySelector('.stem')?.getBoundingClientRect().x ??
          Number.NaN
      );
      if (beam === undefined) {
        return Number.NaN;
      }
      return beam.x + beam.width / 2 - (stems[0] + stems[1]) / 2;
    });

  expect(Math.abs(await offCentre())).toBeLessThan(1);

  await resizeHost(page, 360);
  await waitForRedrawCycle(page);

  expect(Math.abs(await offCentre())).toBeLessThan(1);
});

test('changing a member’s value breaks the tremolo and respaces the bar', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-tremolo strokes="3">
         <music-note note="F" octave="4" duration="half"></music-note>
         <music-note id="second" note="A" octave="4" duration="half"></music-note>
       </music-tremolo>
       <music-note id="after" note="C" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );
  const state = () =>
    page.evaluate(() => ({
      beams:
        document
          .querySelector('music-staff')
          ?.shadowRoot?.querySelectorAll('.tremolo-beam').length ?? 0,
      afterX: document.getElementById('after')?.getBoundingClientRect().x ?? 0,
    }));
  const before = await state();
  expect(before.beams).toBe(3);

  await page.evaluate(() => {
    document.getElementById('second')?.setAttribute('duration', 'quarter');
  });
  await waitForRedrawCycle(page);

  const after = await state();
  expect(after.beams).toBe(0);
  expect(after.afterX).not.toBeCloseTo(before.afterX, 0);
});

const grandStaffTremolo = (groupOnBottom = 't1') => `
  <music-measure>
    <music-staff clef="treble" time="4/4" group="grand">
      <music-tremolo id="top-tremolo" tremolo-group="t1">
        <music-note id="top-note" note="E" octave="5" duration="half"></music-note>
        <music-rest duration="half" hidden></music-rest>
      </music-tremolo>
      <music-rest duration="half"></music-rest>
    </music-staff>
    <music-staff clef="bass" time="4/4">
      <music-tremolo tremolo-group="${groupOnBottom}">
        <music-rest duration="half" hidden></music-rest>
        <music-note id="bottom-note" note="A" octave="2" duration="half"></music-note>
      </music-tremolo>
      <music-rest duration="half"></music-rest>
    </music-staff>
  </music-measure>`;

async function crossStaffBeamCentreOffset(page: Page): Promise<number> {
  return page.evaluate(() => {
    const measure = document.querySelector('music-measure');
    const beams = Array.from(
      measure?.shadowRoot?.querySelectorAll(
        '.cross-staff-tremolos-overlay .tremolo-beam'
      ) ?? []
    ).map((beam) => beam.getBoundingClientRect());
    const staves = Array.from(document.querySelectorAll('music-staff')).map(
      (staff) =>
        staff.shadowRoot
          ?.querySelector('.staff-container')
          ?.getBoundingClientRect()
    );
    if (beams.length === 0 || !staves[0] || !staves[1]) {
      return Number.NaN;
    }
    const stackMiddle =
      (Math.min(...beams.map((beam) => beam.top)) +
        Math.max(...beams.map((beam) => beam.bottom))) /
      2;
    return stackMiddle - (staves[0].bottom + staves[1].top) / 2;
  });
}

test('a tremolo-group draws its beams between the hands and keeps them there on resize', async ({
  page,
}) => {
  await render(page, grandStaffTremolo());
  expect(Math.abs(await crossStaffBeamCentreOffset(page))).toBeLessThan(2);

  await resizeHost(page, 380);
  await waitForRedrawCycle(page);

  expect(Math.abs(await crossStaffBeamCentreOffset(page))).toBeLessThan(2);
});

test('breaking a tremolo-group falls back to each staff on its own and restores the stems', async ({
  page,
}) => {
  await render(page, grandStaffTremolo());
  const state = () =>
    page.evaluate(() => ({
      measureBeams:
        document
          .querySelector('music-measure')
          ?.shadowRoot?.querySelectorAll(
            '.cross-staff-tremolos-overlay .tremolo-beam'
          ).length ?? 0,
      topStemUp: (
        document.getElementById('top-note') as unknown as { stemUp: boolean }
      ).stemUp,
      topExtension: (
        document.getElementById('top-note') as unknown as {
          stemExtension: number;
        }
      ).stemExtension,
    }));
  const joined = await state();
  expect(joined.measureBeams).toBe(3);
  expect(joined.topStemUp).toBe(false);
  expect(joined.topExtension).toBeGreaterThan(0);

  await page.evaluate(() => {
    document.getElementById('top-tremolo')?.removeAttribute('tremolo-group');
  });
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);

  const apart = await state();
  expect(apart.measureBeams).toBe(0);
  expect(apart.topExtension).toBe(0);
});
