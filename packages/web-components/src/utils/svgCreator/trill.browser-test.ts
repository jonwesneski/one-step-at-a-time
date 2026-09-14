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
    host.innerHTML = html;
  }, markup);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

async function trillLineRects(page: Page): Promise<DOMRect[]> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const lines = Array.from(
      staff?.shadowRoot?.querySelectorAll(
        '.trill-lines-container .trill-line'
      ) ?? []
    );
    return lines.map((line) => (line as SVGGElement).getBoundingClientRect());
  });
}

async function trillNotchCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document
        .querySelector('music-staff')
        ?.shadowRoot?.querySelectorAll('.trill-lines-container .trill-notch')
        .length ?? 0
  );
}

test('draws a line by default for an untied single trill note (standard practice)', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const rects = await trillLineRects(page);
  expect(rects).toHaveLength(1);
  expect(rects[0].width).toBeGreaterThan(0);

  const signVisible = await page.evaluate(() => {
    const note = document.querySelector('music-note');
    return (
      (note?.shadowRoot?.querySelector('.trill-sign') as SVGGElement | null) !==
      null
    );
  });
  expect(signVisible).toBe(true);
});

test('trill-line="none" suppresses the line, sign only', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note
         note="C"
         octave="5"
         duration="quarter"
         trill
         trill-line="none"
       ></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  expect(await trillLineRects(page)).toHaveLength(0);

  const signVisible = await page.evaluate(() => {
    const note = document.querySelector('music-note');
    return (
      (note?.shadowRoot?.querySelector('.trill-sign') as SVGGElement | null) !==
      null
    );
  });
  expect(signVisible).toBe(true);
});

test('draws a positive-width line spanning a tied pair, stopping short of the following note', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const rects = await trillLineRects(page);
  expect(rects).toHaveLength(1);
  expect(rects[0].width).toBeGreaterThan(0);

  const thirdNoteLeft = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    return notes[2].getBoundingClientRect().left;
  });
  expect(rects[0].right).toBeLessThanOrEqual(thirdNoteLeft);
});

test('sits above the staff top line', async ({ page }) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
     </music-staff>`
  );

  const [lineTop, staffTopLine] = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const line = staff?.shadowRoot?.querySelector(
      '.trill-lines-container .trill-line'
    );
    const firstStaffLine = staff?.shadowRoot?.querySelector('.staff-line');
    return [
      line?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      firstStaffLine?.getBoundingClientRect().top ?? 0,
    ];
  });
  expect(lineTop).toBeLessThan(staffTopLine);
});

test('draws exactly one notch at an explicit trill-stop, even mid tie-chain', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="start" trill-stop></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  expect(await trillNotchCount(page)).toBe(1);
});

test('resolves independent re-articulated trills as separate lines', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill></music-note>
       <music-note note="D" octave="5" duration="quarter" trill></music-note>
     </music-staff>`
  );

  const rects = await trillLineRects(page);
  expect(rects).toHaveLength(2);
  expect(rects[1].left).toBeGreaterThan(rects[0].right);
});

test('redraws the line when trill is toggled after the initial render', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
     </music-staff>`
  );

  expect(await trillLineRects(page)).toHaveLength(0);

  await page.evaluate(() => {
    const note = document.querySelector('music-note') as HTMLElement & {
      trill: boolean;
    };
    note.trill = true;
  });
  await waitForRedrawCycle(page);

  expect(await trillLineRects(page)).toHaveLength(1);
});

test('draws the key-signature-implied accidental above the sign', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4" key-sig="G">
       <music-note note="E" octave="5" duration="quarter" trill></music-note>
       <music-note note="F" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const [accidentalRect, signRect] = await page.evaluate(() => {
    const note = document.querySelector('music-note');
    const accidental = note?.shadowRoot?.querySelector('.trill-accidental');
    // .trill-sign-glyph is the bare "tr" glyph, not the wrapper — the
    // wrapper's own bounding box would include the accidental itself.
    const sign = note?.shadowRoot?.querySelector('.trill-sign-glyph');
    return [
      accidental?.getBoundingClientRect() ?? null,
      sign?.getBoundingClientRect() ?? null,
    ];
  });

  expect(accidentalRect).not.toBeNull();
  expect(signRect).not.toBeNull();
  // G major implies F# above E — the accidental sits above (smaller Y) the sign.
  expect(accidentalRect!.bottom).toBeLessThanOrEqual(signRect!.top);
});

test('draws no accidental when the key signature already implies it unaltered', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const accidentalVisible = await page.evaluate(
    () =>
      document
        .querySelector('music-note')
        ?.shadowRoot?.querySelector('.trill-accidental') !== null
  );
  expect(accidentalVisible).toBe(false);
});

test('an explicit trill-accidental override redraws the accidental after the initial render', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  await page.evaluate(() => {
    const note = document.querySelector('music-note') as HTMLElement & {
      trillAccidental: string;
    };
    note.trillAccidental = 'double-sharp';
  });
  await waitForRedrawCycle(page);

  const accidentalVisible = await page.evaluate(
    () =>
      document
        .querySelector('music-note')
        ?.shadowRoot?.querySelector('.trill-accidental') !== null
  );
  expect(accidentalVisible).toBe(true);
});

test('draws the written trilling notehead (parentheses + notehead) after the main note, with its own accidental', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill trill-note="F#"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const written = staff?.shadowRoot?.querySelector('.trill-written-note');
    const parens = staff?.shadowRoot?.querySelectorAll('.trill-parenthesis');
    const head = staff?.shadowRoot?.querySelector('.trill-written-head');
    const accidental = staff?.shadowRoot?.querySelector(
      '.trill-written-note-accidental'
    );
    const mainNote = document.querySelector('music-note');
    const mainHead = mainNote?.shadowRoot?.querySelector('.head');
    return {
      writtenRect: written?.getBoundingClientRect() ?? null,
      parenCount: parens?.length ?? 0,
      headRect: head?.getBoundingClientRect() ?? null,
      accidentalVisible: accidental !== null,
      mainHeadRect: mainHead?.getBoundingClientRect() ?? null,
    };
  });

  expect(info.writtenRect).not.toBeNull();
  expect(info.parenCount).toBe(2);
  expect(info.headRect).not.toBeNull();
  expect(info.accidentalVisible).toBe(true);
  // The written notehead sits to the right of the main note's own head.
  expect(info.headRect!.left).toBeGreaterThan(info.mainHeadRect!.right);
});

test('pushes the following note rightward to make room for the written trilling notehead', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill trill-note="F#"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );
  const [trilledRect, followingRect, writtenRect] = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const staff = document.querySelector('music-staff');
    const written = staff?.shadowRoot?.querySelector('.trill-written-note');
    return [
      notes[0].getBoundingClientRect(),
      notes[1].getBoundingClientRect(),
      written?.getBoundingClientRect() ?? null,
    ];
  });

  expect(writtenRect).not.toBeNull();
  // The following note starts clear of the written notehead's own right edge.
  expect(followingRect.left).toBeGreaterThanOrEqual(writtenRect!.right);
  expect(followingRect.left).toBeGreaterThan(trilledRect.right);
});

test('a tie starting from a written-trilling-note note begins clear of the parenthesized notehead', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill trill-note="F#" tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const written = staff?.shadowRoot?.querySelector('.trill-written-note');
    const tiePath = staff?.shadowRoot?.querySelector('.connector path');
    return {
      writtenRect: written?.getBoundingClientRect() ?? null,
      tieRect: tiePath?.getBoundingClientRect() ?? null,
    };
  });

  expect(info.writtenRect).not.toBeNull();
  expect(info.tieRect).not.toBeNull();
  // The tie curve's own left edge (its start point, since it runs left to
  // right into the second note) sits clear of the written notehead's right
  // edge — it does not run through the parenthesized notehead.
  // Within a sub-pixel tolerance of the notehead's own right edge (rendering
  // rounding, not a real gap — the nudge itself is exact analytically).
  expect(info.tieRect!.left).toBeGreaterThanOrEqual(
    info.writtenRect!.right - 1
  );
});

test('defers the written notehead to the second tied note when the first is a short value', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="eighth" trill trill-note="F#" tie="start"></music-note>
       <music-note note="C" octave="5" duration="eighth" tie="end"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const [firstRect, secondRect, writtenRect] = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const staff = document.querySelector('music-staff');
    const written = staff?.shadowRoot?.querySelector('.trill-written-note');
    return [
      notes[0].getBoundingClientRect(),
      notes[1].getBoundingClientRect(),
      written?.getBoundingClientRect() ?? null,
    ];
  });

  expect(writtenRect).not.toBeNull();
  // Anchored after the SECOND note, not cramped against the short first one.
  expect(writtenRect!.left).toBeGreaterThanOrEqual(secondRect.right);
  expect(writtenRect!.left).toBeGreaterThan(firstRect.right);
});

test('draws the finishing grace note (plain notehead, no slash) after the main note, with a to-main slur', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill-finish="D"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const group = notes[0].shadowRoot?.querySelector('.trill-finish-notes');
    const head = group?.querySelector('.grace-head');
    const slash = group?.querySelector('.grace-slash');
    const slur = group?.querySelector('.trill-finish-slur');
    const mainHead = notes[0].shadowRoot?.querySelector('.head');
    return {
      groupPresent: group !== null,
      headRect: head?.getBoundingClientRect() ?? null,
      slashPresent: slash !== null,
      slurPresent: slur !== null,
      mainHeadRect: mainHead?.getBoundingClientRect() ?? null,
    };
  });

  expect(info.groupPresent).toBe(true);
  expect(info.headRect).not.toBeNull();
  expect(info.slashPresent).toBe(false);
  expect(info.slurPresent).toBe(true);
  expect(info.headRect!.left).toBeGreaterThan(info.mainHeadRect!.right);
});

test('pushes the following note rightward to make room for the finishing grace note', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill-finish="D"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const [hostRect, followingRect, groupRect] = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const group = notes[0].shadowRoot?.querySelector('.trill-finish-notes');
    return [
      notes[0].getBoundingClientRect(),
      notes[1].getBoundingClientRect(),
      group?.getBoundingClientRect() ?? null,
    ];
  });

  expect(groupRect).not.toBeNull();
  expect(followingRect.left).toBeGreaterThanOrEqual(groupRect!.right);
  expect(followingRect.left).toBeGreaterThan(hostRect.right);
});

test('a tie starting from a note with trill-finish begins clear of the finishing group', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill-finish="D" tie="start"></music-note>
       <music-note note="C" octave="5" duration="quarter" tie="end"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const staff = document.querySelector('music-staff');
    const group = notes[0].shadowRoot?.querySelector('.trill-finish-notes');
    // The notehead itself, not the whole group's bounding box — a single
    // (non-group) finishing note also has its own stem, a thin line the tie
    // curve passing a couple of px away from doesn't visually collide with
    // the way it would a full notehead ellipse, so the notehead is the
    // meaningful collision target here.
    const head = group?.querySelector('.grace-head');
    const tiePath = staff?.shadowRoot?.querySelector('.connector path');
    return {
      headRect: head?.getBoundingClientRect() ?? null,
      tieRect: tiePath?.getBoundingClientRect() ?? null,
    };
  });

  expect(info.headRect).not.toBeNull();
  expect(info.tieRect).not.toBeNull();
  expect(info.tieRect!.left).toBeGreaterThanOrEqual(info.headRect!.right - 1);
});

test('draws a to-next slur reaching toward the following note when trill-finish-slur is to-next', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" trill-finish="D" trill-finish-slur="to-next"></music-note>
       <music-note note="E" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const info = await page.evaluate(() => {
    const notes = document.querySelectorAll('music-note');
    const staff = document.querySelector('music-staff');
    const group = notes[0].shadowRoot?.querySelector('.trill-finish-notes');
    const slur = staff?.shadowRoot?.querySelector(
      '.trill-lines-container .trill-finish-slur'
    );
    return {
      groupRect: group?.getBoundingClientRect() ?? null,
      slurRect: slur?.getBoundingClientRect() ?? null,
      nextRect: notes[1].getBoundingClientRect(),
    };
  });

  expect(info.groupRect).not.toBeNull();
  expect(info.slurRect).not.toBeNull();
  // The slur starts at/after the finishing group's own right edge and
  // reaches into the following note's own span.
  expect(info.slurRect!.left).toBeGreaterThanOrEqual(info.groupRect!.left);
  expect(info.slurRect!.right).toBeGreaterThan(info.groupRect!.right);
  expect(info.slurRect!.right).toBeLessThanOrEqual(info.nextRect.right + 1);
});
