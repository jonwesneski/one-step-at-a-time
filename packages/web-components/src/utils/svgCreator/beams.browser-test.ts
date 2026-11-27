import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function render(page: Page, markup: string, width: number) {
  await page.evaluate(
    ({ html, hostWidth }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.style.width = `${hostWidth}px`;
      host.innerHTML = html;
    },
    { html: markup, hostWidth: width }
  );
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

async function setWidth(page: Page, width: number) {
  await resizeHost(page, width);
  await waitForRedrawCycle(page);
}

const LONE_NOTE = `
  <music-staff clef="treble" time="2/4">
    <music-rest duration="eighth" beam-over></music-rest>
    <music-note note="G" octave="4" duration="eighth"></music-note>
    <music-rest duration="quarter"></music-rest>
  </music-staff>`;

const stubWidth = (page: Page) =>
  page.evaluate(() => {
    const beam = document
      .querySelector('music-staff')
      ?.shadowRoot?.querySelector('.beam-group');
    return beam?.getBoundingClientRect().width ?? 0;
  });

test.describe('beam-over rests', () => {
  test("a lone note's stub shortens as the bar narrows, and grows back", async ({
    page,
  }) => {
    await render(page, LONE_NOTE, 900);
    const wide = await stubWidth(page);
    await setWidth(page, 160);
    const narrow = await stubWidth(page);
    expect(narrow).toBeGreaterThan(0);
    expect(narrow).toBeLessThan(wide);
    await setWidth(page, 900);
    expect(await stubWidth(page)).toBeCloseTo(wide, 1);
  });

  test('toggling beam-over swaps the note’s tail for a stub, and back', async ({
    page,
  }) => {
    await render(page, LONE_NOTE, 600);
    const state = () =>
      page.evaluate(() => {
        const note = document.querySelector('music-note');
        return {
          beams:
            document
              .querySelector('music-staff')
              ?.shadowRoot?.querySelectorAll('.beam-group').length ?? 0,
          tails: note?.shadowRoot?.querySelectorAll('.flag').length ?? 0,
        };
      });
    expect(await state()).toEqual({ beams: 1, tails: 0 });

    await page.evaluate(() =>
      document.querySelector('music-rest')?.removeAttribute('beam-over')
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
    const unbeamed = await state();
    expect(unbeamed.beams).toBe(0);
    expect(unbeamed.tails).toBeGreaterThan(0);

    await page.evaluate(() =>
      document.querySelector('music-rest')?.setAttribute('beam-over', '')
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
    expect(await state()).toEqual({ beams: 1, tails: 0 });
  });
});
