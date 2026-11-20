import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const bar = (attributes: string, clef: string) =>
  `<music-measure ${attributes}><music-staff clef="${clef}"><music-note note="C" octave="${
    clef === 'bass' ? 3 : 5
  }" duration="whole"></music-note></music-staff></music-measure>`;

// The first ending's warning before :‖, and the second ending's reminder.
async function display(page: Page) {
  return page.evaluate(() => {
    const staves = Array.from(document.querySelectorAll('music-staff'));
    return {
      warningClefs:
        staves[2].shadowRoot?.querySelectorAll(
          '.end-warnings-container .courtesy-clef'
        ).length ?? -1,
      reminderParens:
        staves[3].shadowRoot?.querySelectorAll(
          '.describe-container .parenthesis-open, .describe-container .parenthesis-close'
        ).length ?? -1,
    };
  });
}

test('changing the clef inside a repeated section adds and removes its warnings', async ({
  page,
}) => {
  await page.evaluate((html) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = '900px';
    host.innerHTML = html;
  }, `<music-composition time="4/4">${bar('repeat-start', 'bass')}${bar('', 'bass')}${bar('ending="1" barline="repeat-end"', 'bass')}${bar('ending="2"', 'bass')}</music-composition>`);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
  expect(await display(page)).toEqual({ warningClefs: 0, reminderParens: 0 });

  const setClefs = (clef: string) =>
    page.evaluate((value) => {
      Array.from(document.querySelectorAll('music-staff'))
        .slice(1)
        .forEach((staff) => {
          staff.setAttribute('clef', value);
          staff
            .querySelector('music-note')
            ?.setAttribute('octave', value === 'bass' ? '3' : '5');
        });
    }, clef);

  await setClefs('treble');
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
  expect(await display(page)).toEqual({ warningClefs: 1, reminderParens: 2 });

  await setClefs('bass');
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
  expect(await display(page)).toEqual({ warningClefs: 0, reminderParens: 0 });
});
