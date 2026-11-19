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
