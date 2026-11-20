import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const BAR = `<music-staff clef="treble">
  <music-note note="G" octave="4" duration="quarter"></music-note>
  <music-note note="A" octave="4" duration="quarter"></music-note>
  <music-note note="B" octave="4" duration="quarter"></music-note>
  <music-note note="C" octave="5" duration="quarter"></music-note>
</music-staff>`;

async function render(page: Page, markup: string, width: number) {
  await page.evaluate(
    ({ html, w }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.style.width = `${w}px`;
      host.innerHTML = html;
    },
    { html: markup, w: width }
  );
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

// The repeat-start bar's staff and the bar before it.
async function junction(page: Page) {
  return page.evaluate(() => {
    const staves = Array.from(document.querySelectorAll('music-staff')) as (
      | HTMLElement & { startRepeat: string; endBarline: string }
    )[];
    const index = staves.findIndex(
      (staff) => staff.parentElement?.hasAttribute('repeat-start') ?? false
    );
    const sameRow =
      Math.abs(
        staves[index].getBoundingClientRect().top -
          staves[index - 1].getBoundingClientRect().top
      ) < 5;
    return {
      start: staves[index].startRepeat,
      before: staves[index - 1].endBarline,
      sameRow,
    };
  });
}

test('a start repeat replaces the barline mid-row, and follows the clef once it wraps to a row start', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4" max-width="none">
      <music-measure>${BAR}</music-measure>
      <music-measure>${BAR}</music-measure>
      <music-measure repeat-start>${BAR}</music-measure>
    </music-composition>`,
    1200
  );
  expect(await junction(page)).toEqual({
    start: 'shared-thick',
    before: 'none',
    sameRow: true,
  });

  await resizeHost(page, 520);
  await waitForRedrawCycle(page);
  expect(await junction(page)).toEqual({
    start: 'full',
    before: 'single',
    sameRow: false,
  });

  await resizeHost(page, 1200);
  await waitForRedrawCycle(page);
  expect(await junction(page)).toEqual({
    start: 'shared-thick',
    before: 'none',
    sameRow: true,
  });
});

test('double-bar-before-repeat ends the row in a thin double barline only while the repeat starts the next row', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4" max-width="none" double-bar-before-repeat>
      <music-measure>${BAR}</music-measure>
      <music-measure>${BAR}</music-measure>
      <music-measure repeat-start>${BAR}</music-measure>
    </music-composition>`,
    520
  );
  expect((await junction(page)).before).toBe('double');

  await page.evaluate(() =>
    document
      .querySelector('music-composition')
      ?.removeAttribute('double-bar-before-repeat')
  );
  await waitForRedrawCycle(page);
  expect((await junction(page)).before).toBe('single');

  await page.evaluate(() =>
    document
      .querySelector('music-composition')
      ?.setAttribute('double-bar-before-repeat', '')
  );
  await waitForRedrawCycle(page);
  await resizeHost(page, 1200);
  await waitForRedrawCycle(page);
  expect(await junction(page)).toEqual({
    start: 'shared-thick',
    before: 'none',
    sameRow: true,
  });
});

test('a mid-bar barline written in one staff lines up through every staff of the measure', async ({
  page,
}) => {
  await render(
    page,
    `<music-measure time="4/4">
      <music-staff clef="treble">
        <music-note note="E" octave="5" duration="eighth"></music-note>
        <music-note note="D" octave="5" duration="eighth"></music-note>
        <music-note note="E" octave="5" duration="eighth"></music-note>
        <music-barline type="repeat-start"></music-barline>
        <music-note note="D" octave="5" duration="eighth"></music-note>
        <music-note note="C" octave="5" duration="half"></music-note>
      </music-staff>
      <music-staff clef="bass">
        <music-note note="C" octave="3" duration="half"></music-note>
        <music-note note="G" octave="2" duration="half"></music-note>
      </music-staff>
    </music-measure>`,
    700
  );
  const thickLefts = async () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('music-staff')).map(
        (staff) =>
          staff.shadowRoot
            ?.querySelector('.mid-bar-barlines-container .barline-thick')
            ?.getBoundingClientRect().left ?? Number.NaN
      )
    );
  const [top, bottom] = await thickLefts();
  expect(Math.abs(top - bottom)).toBeLessThan(1);

  await resizeHost(page, 450);
  await waitForRedrawCycle(page);
  const [narrowTop, narrowBottom] = await thickLefts();
  expect(Math.abs(narrowTop - narrowBottom)).toBeLessThan(1);
  expect(narrowTop).not.toBe(top);
});
