import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const bar = (keySig: string) => `<music-measure key-sig="${keySig}">
  <music-staff clef="treble">
    <music-note note="A" octave="4" duration="quarter"></music-note>
    <music-note note="B" octave="4" duration="quarter"></music-note>
    <music-note note="C" octave="5" duration="quarter"></music-note>
    <music-note note="D" octave="5" duration="quarter"></music-note>
  </music-staff>
</music-measure>`;

async function render(page: Page, width: number) {
  await page.evaluate(
    ({ html, w }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.style.width = `${w}px`;
      host.innerHTML = html;
    },
    {
      html: `<music-composition time="4/4">${[
        bar('D'),
        bar('D'),
        bar('C'),
        bar('C'),
      ].join('')}</music-composition>`,
      w: width,
    }
  );
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

// Where the D major → C major change at the third barline is drawn.
async function keyChange(page: Page) {
  return page.evaluate(() => {
    const measures = Array.from(document.querySelectorAll('music-measure'));
    const staves = measures.map(
      (measure) => measure.querySelector('music-staff') as HTMLElement
    );
    const naturals = (staff: HTMLElement, selector: string) =>
      staff.shadowRoot?.querySelectorAll(`${selector} .cancellation-natural`)
        .length ?? -1;
    return {
      rowStart:
        Math.abs(
          measures[2].getBoundingClientRect().top -
            measures[1].getBoundingClientRect().top
        ) > 5,
      naturalsMidRow: naturals(staves[2], '.describe-container'),
      naturalsAtRowEnd: naturals(staves[1], '.end-warnings-container'),
    };
  });
}

test('a key change moves between mid-row naturals and a row-end courtesy as the row wraps', async ({
  page,
}) => {
  await render(page, 900);
  expect(await keyChange(page)).toEqual({
    rowStart: false,
    naturalsMidRow: 2,
    naturalsAtRowEnd: 0,
  });

  await resizeHost(page, 260);
  await waitForRedrawCycle(page);
  expect(await keyChange(page)).toEqual({
    rowStart: true,
    naturalsMidRow: 0,
    naturalsAtRowEnd: 2,
  });

  await resizeHost(page, 900);
  await waitForRedrawCycle(page);
  expect(await keyChange(page)).toEqual({
    rowStart: false,
    naturalsMidRow: 2,
    naturalsAtRowEnd: 0,
  });
});

test('a row-end courtesy settles instead of rescheduling redraws', async ({
  page,
}) => {
  await render(page, 260);
  await waitForRedrawCycle(page);
  expect((await keyChange(page)).naturalsAtRowEnd).toBe(2);

  const positionedCount = await page.evaluate(async () => {
    let count = 0;
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host missing');
    }
    host.addEventListener('staff-notes-positioned', () => {
      count++;
    });
    await new Promise<void>((resolve) => {
      let frame = 0;
      const tick = () => {
        frame++;
        if (frame >= 10) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return count;
  });
  expect(positionedCount).toBe(0);
});
