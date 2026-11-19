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

// The `BelowStaff` story: a triplet reaching B3/A3, outside treble clef's
// C6-C4 Y-coordinate table, whose numeral must stay inside the staff's SVG.
test("BelowStaff tuplet: notes resolve to real below-staff positions, and the numeral stays within the staff's rendered SVG", async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="3/4">
       <music-tuplet ratio="3">
         <music-note note="C" octave="4" duration="eighth"></music-note>
         <music-note note="B" octave="3" duration="eighth"></music-note>
         <music-note note="A" octave="3" duration="eighth"></music-note>
       </music-tuplet>
       <music-note note="G" octave="3" duration="quarter"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const svg = staff?.shadowRoot?.querySelector('.transcribe-container');
    const notes = Array.from(document.querySelectorAll('music-note'));
    const numeral = staff?.shadowRoot?.querySelector('.tuplet-numeral');
    return {
      svgRect: svg?.getBoundingClientRect() ?? null,
      noteTops: notes.map((note) => note.getBoundingClientRect().top),
      numeralRect: numeral?.getBoundingClientRect() ?? null,
    };
  });

  expect(info.svgRect).not.toBeNull();
  // Every note (including B3/A3, outside treble's own table) lands below
  // the SVG's own top edge, not teleported up near y=0.
  for (const top of info.noteTops) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
    expect(top).toBeGreaterThan(info.svgRect!.top);
  }

  // The tuplet numeral — pushed further out past the lowest note (B3/A3 are
  // beamed, so the numeral clears the beam stack rather than sitting at a
  // fixed nominal offset) — still stays within the staff's own rendered SVG
  // area, proving #estimateBelowStaffBudget reserved enough room for it.
  expect(info.numeralRect).not.toBeNull();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
  expect(info.numeralRect!.bottom).toBeLessThanOrEqual(info.svgRect!.bottom);
});
