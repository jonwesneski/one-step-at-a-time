import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

type Box = { x: number; y: number; width: number; height: number };

async function render(page: Page, html: string): Promise<void> {
  await page.evaluate((markup) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = '600px';
    host.innerHTML = markup;
  }, html);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

async function signBox(
  page: Page,
  selector: string,
  within = '.arpeggio'
): Promise<Box | null> {
  return page.evaluate(
    ({ selector, within }) => {
      const chord = document.querySelector(selector);
      const sign = chord?.shadowRoot?.querySelector(within) as
        | SVGGraphicsElement
        | null
        | undefined;
      if (!sign) {
        return null;
      }
      const box = sign.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    },
    { selector, within }
  );
}

async function headBox(page: Page, selector: string): Promise<Box> {
  return page.evaluate((selector) => {
    const chord = document.querySelector(selector);
    const heads = Array.from(
      chord?.shadowRoot?.querySelectorAll('.head') ?? []
    ) as SVGGraphicsElement[];
    const rects = heads.map((h) => h.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, selector);
}

test('the sign spans the chord notehead range and sits left of the heads', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-chord id="c" chord="Cmaj7" duration="whole" arpeggio="up"></music-chord>
     </music-staff>`
  );

  const sign = await signBox(page, '#c');
  const heads = await headBox(page, '#c');
  expect(sign).not.toBeNull();
  if (sign === null) {
    return;
  }

  // Vertically brackets the notehead column (with a small overshoot each end).
  expect(sign.y).toBeLessThanOrEqual(heads.y + 1);
  expect(sign.y + sign.height).toBeGreaterThanOrEqual(
    heads.y + heads.height - 1
  );
  // Right edge sits just left of the noteheads.
  expect(sign.x + sign.width).toBeLessThanOrEqual(heads.x + 1);
});

test('grace group, arpeggio sign and noteheads stay in left-to-right order', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-chord id="c" duration="whole" arpeggio="up-arrow" grace="F#,G">
         <music-note note="D#" octave="4"></music-note>
         <music-note note="F#" octave="4"></music-note>
         <music-note note="A#" octave="4"></music-note>
       </music-chord>
     </music-staff>`
  );

  const graceHeads = await page.evaluate(() => {
    const chord = document.querySelector('#c');
    const heads = Array.from(
      chord?.shadowRoot?.querySelectorAll('.grace-head') ?? []
    ) as SVGGraphicsElement[];
    const rects = heads.map((h) => h.getBoundingClientRect());
    return {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
    };
  });
  const arpeggio = await signBox(page, '#c', '.arpeggio');
  const heads = await headBox(page, '#c');
  expect(arpeggio).not.toBeNull();
  if (arpeggio === null) {
    return;
  }
  // Left-to-right, no overlap: grace heads → arpeggio sign → chord noteheads
  // (the sign clears the accidental column, which sits between it and the heads).
  expect(graceHeads.right).toBeLessThanOrEqual(arpeggio.x + 2);
  expect(arpeggio.x + arpeggio.width).toBeLessThanOrEqual(heads.x + 1);
});

test('an unbroken cross-staff arpeggio is one line and suppresses the per-staff signs', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4">
       <music-measure>
         <music-staff clef="treble" group="grand" time="4/4">
           <music-chord id="top" chord="Cmaj" duration="whole" arpeggio="up"></music-chord>
         </music-staff>
         <music-staff clef="bass" time="4/4">
           <music-chord chord="Cmaj" duration="whole" arpeggio-for="top">
             <music-note note="C" octave="3"></music-note>
             <music-note note="E" octave="3"></music-note>
             <music-note note="G" octave="3"></music-note>
           </music-chord>
         </music-staff>
       </music-measure>
     </music-composition>`
  );

  const localSigns = await page.evaluate(() => {
    const chords = Array.from(document.querySelectorAll('music-chord'));
    return chords.filter((c) => c.shadowRoot?.querySelector('.arpeggio'))
      .length;
  });
  const connectors = await page.evaluate(
    () =>
      document
        .querySelector('music-measure')
        ?.shadowRoot?.querySelectorAll('.arpeggio-connector').length ?? 0
  );

  expect(localSigns).toBe(0);
  expect(connectors).toBe(1);
});
