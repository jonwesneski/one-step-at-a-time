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

const textTop = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      document
        .querySelector('music-staff')
        ?.shadowRoot?.querySelector('.technique-text')
        ?.getBoundingClientRect().top ?? NaN
  );

test('adding a sign to a beamed note lifts the text over it, and removing it lowers the text again', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note id="slapped" note="C" octave="4" duration="eighth" technique-text="slap"></music-note>
       <music-note note="G" octave="4" duration="eighth"></music-note>
       <music-rest duration="quarter"></music-rest>
     </music-staff>`
  );
  const plain = await textTop(page);

  const setSign = (value: string | null) =>
    page.evaluate((sign) => {
      const note = document.getElementById('slapped');
      if (sign === null) {
        note?.removeAttribute('sign');
      } else {
        note?.setAttribute('sign', sign);
      }
    }, value);

  await setSign('plus');
  await waitForRedrawCycle(page);
  const signTop = await page.evaluate(
    () =>
      document
        .getElementById('slapped')
        ?.shadowRoot?.querySelector('.signs')
        ?.getBoundingClientRect().top ?? NaN
  );
  const lifted = await textTop(page);
  expect(lifted).toBeLessThan(plain);
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector('music-staff')
          ?.shadowRoot?.querySelector('.technique-text')
          ?.getBoundingClientRect().bottom ?? NaN
    )
  ).toBeLessThanOrEqual(signTop);

  await setSign(null);
  await waitForRedrawCycle(page);
  expect(await textTop(page)).toBeCloseTo(plain, 0);
});
