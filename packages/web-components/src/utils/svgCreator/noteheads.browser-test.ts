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
    host.style.padding = '80px 0';
    host.innerHTML = html;
  }, markup);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

type Box = { left: number; right: number; top: number; bottom: number };

// Bounding boxes of the nth note's head, stem and ledger lines.
async function noteParts(
  page: Page,
  index: number
): Promise<{ head: Box; stem: Box | null; ledgers: Box[] }> {
  return page.evaluate((i) => {
    const toBox = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const note = document.querySelectorAll('music-note')[i];
    const root = note.shadowRoot;
    const head = root?.querySelector('.head');
    if (!head) {
      throw new Error('head missing');
    }
    const stem = root?.querySelector('.stem');
    return {
      head: toBox(head),
      stem: stem ? toBox(stem) : null,
      ledgers: Array.from(root?.querySelectorAll('.ledger-line') ?? []).map(
        toBox
      ),
    };
  }, index);
}

async function staffLines(
  page: Page,
  staffIndex = 0
): Promise<{ top: number; bottom: number }> {
  return page.evaluate((i) => {
    const staff = document.querySelectorAll('music-staff')[i];
    const container = staff.shadowRoot?.querySelector('.staff-container');
    if (!container) {
      throw new Error('staff container missing');
    }
    const r = container.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  }, staffIndex);
}

test('a crossed head joins its stem at an arm tip, not its centre', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="A" octave="3" duration="quarter" notehead="x"></music-note>
       <music-note note="E" octave="5" duration="quarter" notehead="x"></music-note>
     </music-staff>`
  );

  const up = await noteParts(page, 0);
  expect(up.stem).not.toBeNull();
  // Stem-up: on the head's right edge, meeting it in its upper half.
  expect(Math.abs((up.stem?.right ?? 0) - up.head.right)).toBeLessThan(1.5);
  const upCentreY = (up.head.top + up.head.bottom) / 2;
  expect(up.stem?.bottom ?? 0).toBeLessThan(upCentreY);
  expect(up.stem?.bottom ?? 0).toBeGreaterThanOrEqual(up.head.top - 0.5);

  const down = await noteParts(page, 1);
  // Stem-down: on the head's left edge, meeting it in its lower half.
  expect(Math.abs((down.stem?.left ?? 0) - down.head.left)).toBeLessThan(1.5);
  const downCentreY = (down.head.top + down.head.bottom) / 2;
  expect(down.stem?.top ?? 0).toBeGreaterThan(downCentreY);
  expect(down.stem?.top ?? 0).toBeLessThanOrEqual(down.head.bottom + 0.5);
});

test('a diamond joins its stem at a side corner', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="A" octave="4" duration="half" notehead="diamond-white"></music-note>
     </music-staff>`
  );
  const { head, stem } = await noteParts(page, 0);
  expect(Math.abs((stem?.right ?? 0) - head.right)).toBeLessThan(1.5);
  // The corner is near the middle of the head, not its top point.
  expect(stem?.bottom ?? 0).toBeGreaterThan(
    head.top + (head.bottom - head.top) / 4
  );
});

test('a diamond in a space pokes slightly past both stave lines', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="A" octave="4" duration="half" notehead="diamond-white"></music-note>
       <music-note note="A" octave="4" duration="half"></music-note>
     </music-staff>`
  );
  const diamond = await noteParts(page, 0);
  const ellipse = await noteParts(page, 1);
  expect(diamond.head.top).toBeLessThan(ellipse.head.top);
  expect(diamond.head.bottom).toBeGreaterThan(ellipse.head.bottom);
});

test('ledger lines span a wide whole-note diamond', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="4" duration="whole" notehead="diamond"></music-note>
     </music-staff>`
  );
  const { head, ledgers } = await noteParts(page, 0);
  expect(ledgers.length).toBeGreaterThan(0);
  expect(ledgers[0].left).toBeLessThan(head.left);
  expect(ledgers[0].right).toBeGreaterThan(head.right);
});

test('an isolated triangle sits outside the stave without ledger lines', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="1/8">
       <music-note duration="eighth" notehead="triangle-up"></music-note>
     </music-staff>
     <music-staff clef="bass" time="1/8">
       <music-note duration="eighth" notehead="triangle-down"></music-note>
     </music-staff>`
  );
  const treble = await staffLines(page, 0);
  const up = await noteParts(page, 0);
  expect(up.head.bottom).toBeLessThan(treble.top);
  expect(up.ledgers).toHaveLength(0);
  // Stem points down into the stave.
  expect(up.stem?.bottom ?? 0).toBeGreaterThan(treble.top);

  const bass = await staffLines(page, 1);
  const down = await noteParts(page, 1);
  expect(down.head.top).toBeGreaterThan(bass.bottom);
  expect(down.ledgers).toHaveLength(0);
  expect(down.stem?.top ?? Infinity).toBeLessThan(bass.bottom);
});

test('a triangle after a run sits above everything in the run', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="A" octave="5" duration="eighth"></music-note>
       <music-note note="F" octave="6" duration="sixteenth"></music-note>
       <music-note note="Bb" octave="6" duration="sixteenth"></music-note>
       <music-note duration="sixteenth" notehead="triangle-up"></music-note>
       <music-rest duration="sixteenth"></music-rest>
       <music-rest duration="eighth"></music-rest>
     </music-staff>`
  );
  const runTops = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const { head, stem } = await noteParts(page, i);
      return Math.min(head.top, stem?.top ?? Infinity);
    })
  );
  const triangle = await noteParts(page, 3);
  expect(triangle.head.bottom).toBeLessThan(Math.min(...runTops));
});

test('a tie joins two crossed heads', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="2/4">
       <music-note note="B" octave="4" duration="quarter" notehead="x" tie="start"></music-note>
       <music-note note="B" octave="4" duration="quarter" notehead="x" tie="end"></music-note>
     </music-staff>`
  );
  const tie = await page.evaluate(() => {
    const connector = document
      .querySelector('music-staff')
      ?.shadowRoot?.querySelector('.connector');
    if (!connector) {
      return null;
    }
    const r = connector.getBoundingClientRect();
    return { left: r.left, right: r.right };
  });
  expect(tie).not.toBeNull();
  const first = await noteParts(page, 0);
  const second = await noteParts(page, 1);
  // Anchored on the cross heads: starts over the first, ends over the second.
  expect(tie?.left ?? 0).toBeGreaterThanOrEqual(first.head.left - 2);
  expect(tie?.left ?? 0).toBeLessThanOrEqual(first.head.right + 2);
  expect(tie?.right ?? 0).toBeGreaterThanOrEqual(second.head.left - 2);
  expect(tie?.right ?? 0).toBeLessThanOrEqual(second.head.right + 2);
});
