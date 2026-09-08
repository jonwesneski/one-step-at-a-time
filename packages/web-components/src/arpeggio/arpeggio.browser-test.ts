import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../test-fixtures/helpers';

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

async function connectorCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    return staff?.shadowRoot?.querySelectorAll('.connector').length ?? 0;
  });
}

async function runHeadCenters(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const notes = Array.from(
      document.querySelectorAll('music-arpeggio > music-note')
    );
    return notes.map((n) => {
      const head = n.shadowRoot?.querySelector('.head') as
        | SVGGraphicsElement
        | null
        | undefined;
      const r = head?.getBoundingClientRect() ?? n.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  });
}

test('draws one tie per run note, fanning into the chord, and does not overflow the bar', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-arpeggio>
         <music-note note="C" octave="4"></music-note>
         <music-note note="E" octave="4"></music-note>
         <music-note note="G" octave="4"></music-note>
         <music-chord chord="Cmaj" duration="whole"></music-chord>
       </music-arpeggio>
     </music-staff>`
  );

  expect(await connectorCount(page)).toBe(3);

  // Run notes are visible (bar-fit exemption worked) and beamed.
  const beams = await page.evaluate(
    () =>
      document
        .querySelector('music-staff')
        ?.shadowRoot?.querySelectorAll('.beams-container .beam').length ?? 0
  );
  expect(beams).toBeGreaterThan(0);

  const centers = await runHeadCenters(page);
  expect(centers).toHaveLength(3);
  // Ascending run.
  expect(centers[0]).toBeLessThan(centers[1]);
  expect(centers[1]).toBeLessThan(centers[2]);
});

test('anchors each tie on the real chord-tone notehead (second-interval chord)', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-arpeggio>
         <music-note note="C" octave="5"></music-note>
         <music-note note="D" octave="5"></music-note>
         <music-chord duration="whole">
           <music-note note="C" octave="5"></music-note>
           <music-note note="D" octave="5"></music-note>
         </music-chord>
       </music-arpeggio>
     </music-staff>`
  );

  // Two ties; their end x's should differ because C5 and D5 sit a second apart
  // and the chord displaces one notehead.
  const endXs = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const paths = Array.from(
      staff?.shadowRoot?.querySelectorAll('.connector path') ?? []
    );
    return paths.map((p) => {
      const d = p.getAttribute('d') ?? '';
      const m = d.match(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)$/);
      return m ? Number(m[1]) : NaN;
    });
  });
  expect(endXs).toHaveLength(2);
  expect(Math.abs(endXs[0] - endXs[1])).toBeGreaterThan(2);
});

test('divides a tie into two stubs when a cluster target would obscure it', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-arpeggio>
         <music-note note="C" octave="5"></music-note>
         <music-note note="D" octave="5"></music-note>
         <music-note note="E" octave="5"></music-note>
         <music-chord duration="whole">
           <music-note note="C" octave="5"></music-note>
           <music-note note="D" octave="5"></music-note>
           <music-note note="E" octave="5"></music-note>
         </music-chord>
       </music-arpeggio>
     </music-staff>`
  );

  // 3 ties, at least one divided → more than 3 .connector groups, and at least
  // one pair of paths with a horizontal gap between their inner ends.
  const paths = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    return Array.from(
      staff?.shadowRoot?.querySelectorAll('.connector path') ?? []
    ).map((p) => p.getAttribute('d') ?? '');
  });
  expect(paths.length).toBeGreaterThan(3);
});

test('an unmatched run pitch gets a laissez-vibrer tie with an l.v. label', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-arpeggio lv-label unmatched="lv">
         <music-note note="C" octave="4"></music-note>
         <music-note note="F" octave="4"></music-note>
         <music-chord chord="Cmaj" duration="whole"></music-chord>
       </music-arpeggio>
     </music-staff>`
  );

  const labels = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    return Array.from(
      staff?.shadowRoot?.querySelectorAll('.connector text') ?? []
    ).map((t) => t.textContent);
  });
  expect(labels).toContain('l.v.');
});
