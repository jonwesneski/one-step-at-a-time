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

test('the vertical hairpin spans the chord, sits left of the sign, and puts a dynamic letter outside each end of the staff', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-chord
         id="c"
         chord="Cmaj7"
         duration="whole"
         arpeggio="up"
         arpeggio-hairpin="crescendo"
         arpeggio-hairpin-from="p"
         arpeggio-hairpin-to="f"
       ></music-chord>
     </music-staff>`
  );

  const wedge = await signBox(page, '#c', '.arpeggio-hairpin');
  const sign = await signBox(page, '#c', '.arpeggio');
  const heads = await headBox(page, '#c');
  expect(wedge).not.toBeNull();
  expect(sign).not.toBeNull();
  if (wedge === null || sign === null) {
    return;
  }

  // Extends to at least the staff height (the low Cmaj7 chord's own range is
  // smaller, so the staff-relative extension must have kicked in).
  const staffLines = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const lines = Array.from(
      staff?.shadowRoot?.querySelectorAll('.staff-line, line') ?? []
    ) as SVGGraphicsElement[];
    const rects = lines.map((l) => l.getBoundingClientRect());
    return {
      top: Math.min(...rects.map((r) => r.top)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  });
  expect(wedge.y).toBeLessThanOrEqual(staffLines.top + 2);
  expect(wedge.y + wedge.height).toBeGreaterThanOrEqual(staffLines.bottom - 2);
  // Sits left of the arpeggio sign.
  expect(wedge.x + wedge.width).toBeLessThanOrEqual(sign.x + 1);

  // Two dynamic letters, one clear above the top notehead and one clear below
  // the bottom notehead.
  const letters = await page.evaluate(() => {
    const chord = document.querySelector('#c');
    const texts = Array.from(
      chord?.shadowRoot?.querySelectorAll('.dynamic-marking') ?? []
    ) as SVGGraphicsElement[];
    const rects = texts.map((t) => t.getBoundingClientRect());
    return {
      count: texts.length,
      minBottom: Math.min(...rects.map((r) => r.bottom)),
      maxTop: Math.max(...rects.map((r) => r.top)),
    };
  });
  expect(letters.count).toBe(2);
  expect(letters.minBottom).toBeLessThan(heads.y);
  expect(letters.maxTop).toBeGreaterThan(heads.y + heads.height);
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

test('a cross-staff arpeggio draws one continuous vertical hairpin through both staves', async ({
  page,
}) => {
  await render(
    page,
    `<music-composition time="4/4">
       <music-measure>
         <music-staff clef="treble" group="grand" time="4/4">
           <music-chord
             id="top"
             chord="Cmaj"
             duration="whole"
             arpeggio="up"
             arpeggio-hairpin="crescendo"
             arpeggio-hairpin-from="p"
             arpeggio-hairpin-to="mf"
           ></music-chord>
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

  const result = await page.evaluate(() => {
    const measure = document.querySelector('music-measure');
    const overlay = measure?.shadowRoot?.querySelector('.arpeggio-connectors');
    const wedge = overlay?.querySelector('.arpeggio-hairpin-connector');
    const staves = Array.from(document.querySelectorAll('music-staff'));
    const trebleBox = staves[0]?.getBoundingClientRect();
    const bassBox = staves[1]?.getBoundingClientRect();
    const wedgeBox = (
      wedge as SVGGraphicsElement | null
    )?.getBoundingClientRect();
    const localHairpins = Array.from(
      document.querySelectorAll('music-chord')
    ).filter((c) => c.shadowRoot?.querySelector('.arpeggio-hairpin')).length;
    const letters =
      overlay?.querySelectorAll('.arpeggio-hairpin-connector text').length ?? 0;
    return {
      wedges:
        overlay?.querySelectorAll('.arpeggio-hairpin-connector').length ?? 0,
      localHairpins,
      letters,
      crossesGap:
        wedgeBox != null &&
        trebleBox != null &&
        bassBox != null &&
        wedgeBox.top <= trebleBox.bottom &&
        wedgeBox.bottom >= bassBox.top,
    };
  });

  expect(result.wedges).toBe(1);
  expect(result.localHairpins).toBe(0);
  expect(result.letters).toBe(2);
  expect(result.crossesGap).toBe(true);
});

test('adding arpeggio-for to a connected chord reflows its staff', async ({
  page,
}) => {
  // The bass chord shows accidentals, so the arpeggio sign sits left of the
  // whole accidental column — a clearly measurable reservation
  // (ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX), unlike the sub-2px no-accidental
  // footprint.
  await render(
    page,
    `<music-composition time="4/4">
       <music-measure>
         <music-staff clef="treble" group="grand" time="4/4">
           <music-chord id="top" chord="Cmaj" duration="whole" arpeggio="up"></music-chord>
         </music-staff>
         <music-staff clef="bass" time="4/4">
           <music-chord id="bottom" duration="whole">
             <music-note note="C#" octave="3"></music-note>
             <music-note note="E" octave="3"></music-note>
             <music-note note="G#" octave="3"></music-note>
           </music-chord>
         </music-staff>
       </music-measure>
     </music-composition>`
  );

  const before = await headBox(page, '#bottom');

  await page.evaluate(() => {
    document.querySelector('#bottom')?.setAttribute('arpeggio-for', 'top');
  });
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);

  const after = await headBox(page, '#bottom');
  const connectors = await page.evaluate(
    () =>
      document
        .querySelector('music-measure')
        ?.shadowRoot?.querySelectorAll('.arpeggio-connector').length ?? 0
  );

  expect(after.x).toBeGreaterThan(before.x + 6);
  expect(connectors).toBe(1);
});
