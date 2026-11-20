import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const bar = (attributes: string, note = 'C', octave = 5) =>
  `<music-measure ${attributes}><music-staff clef="treble"><music-note note="${note}" octave="${octave}" duration="whole"></music-note></music-staff></music-measure>`;

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

test('a first ending splits across rows and continues without a label', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4">${bar('')}${bar('ending="1"')}${bar(
      'ending="1" barline="repeat-end"'
    )}${bar('ending="2"')}</music-composition>`,
    900
  );
  const ending = () =>
    page.evaluate(() => {
      const measures = Array.from(document.querySelectorAll('music-measure'));
      return {
        split:
          Math.abs(
            measures[2].getBoundingClientRect().top -
              measures[1].getBoundingClientRect().top
          ) > 5,
        labels: measures.map(
          (measure) =>
            measure.shadowRoot?.querySelector('.ending-label')?.textContent ??
            null
        ),
        leftHooks: measures.map(
          (measure) =>
            measure.shadowRoot?.querySelector('.ending-hook-left') !== null
        ),
      };
    });

  expect(await ending()).toEqual({
    split: false,
    labels: [null, '1.', null, '2.'],
    leftHooks: [false, true, false, true],
  });

  await resizeHost(page, 220);
  await waitForRedrawCycle(page);
  expect(await ending()).toEqual({
    split: true,
    labels: [null, '1.', null, '2.'],
    leftHooks: [false, true, false, true],
  });
});

test('changing ending-numbering relabels the ending bars', async ({ page }) => {
  await render(
    page,
    `<music-composition time="4/4" measure-numbers="row-start">${bar('')}${bar(
      'ending="1" barline="repeat-end"'
    )}${bar('ending="2"')}${bar('')}</music-composition>`,
    900
  );
  const numbers = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('music-measure')).map(
        (measure) =>
          measure.shadowRoot?.querySelector('.measure-number')?.textContent ??
          null
      )
    );

  expect(await numbers()).toEqual(['1', '2', '3', null]);

  await page.evaluate(() =>
    document
      .querySelector('music-composition')
      ?.setAttribute('ending-numbering', 'duplicate')
  );
  await waitForRedrawCycle(page);
  expect(await numbers()).toEqual(['1', '2a', '2b', null]);
});

test('the bracket keeps clear of a fermata added to the 2nd ending', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4">${bar('')}${bar(
      'ending="1" barline="repeat-end"'
    )}${bar('ending="2"', 'C', 6)}</music-composition>`,
    900
  );
  // The 2nd ending's top line and the bracket line, from the measure's top.
  const gap = () =>
    page.evaluate(() => {
      const measure = document.querySelectorAll('music-measure')[2];
      const staff = measure.querySelector('music-staff');
      const line = staff?.shadowRoot
        ?.querySelector('.staff-container')
        ?.getBoundingClientRect().top;
      const bracket = measure.shadowRoot
        ?.querySelector('.ending-segment rect')
        ?.getBoundingClientRect().top;
      return (line ?? 0) - (bracket ?? 0);
    });

  const before = await gap();
  await page.evaluate(() =>
    document
      .querySelectorAll('music-measure')[2]
      .querySelector('music-note')
      ?.setAttribute('articulation', 'fermata')
  );
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
  expect(await gap()).toBeGreaterThan(before);
});

test('the bracket keeps clear of a note raised in two voices that combine', async ({
  page,
}) => {
  const voices = (octave: number) =>
    `<music-voice><music-note note="C" octave="${octave}" duration="whole"></music-note></music-voice>
     <music-voice><music-note note="E" octave="${octave}" duration="whole"></music-note></music-voice>`;
  await render(
    page,
    `<music-composition time="4/4">${bar('')}
      <music-measure ending="1" barline="repeat-end"><music-staff clef="treble">${voices(
        5
      )}</music-staff></music-measure>
      ${bar('ending="2"')}</music-composition>`,
    900
  );
  const gap = () =>
    page.evaluate(() => {
      const measure = document.querySelectorAll('music-measure')[1];
      const line = measure
        .querySelector('music-staff')
        ?.shadowRoot?.querySelector('.staff-container')
        ?.getBoundingClientRect().top;
      const bracket = measure.shadowRoot
        ?.querySelector('.ending-segment rect')
        ?.getBoundingClientRect().top;
      return (line ?? 0) - (bracket ?? 0);
    });

  const before = await gap();
  await page.evaluate(() =>
    document
      .querySelectorAll('music-measure')[1]
      .querySelectorAll('music-note')
      .forEach((note) => note.setAttribute('octave', '6'))
  );
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
  expect(await gap()).toBeGreaterThan(before);
});
