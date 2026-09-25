import { expect, type Page, test } from '@playwright/test';
import { waitForRedrawCycle } from '../../../test-fixtures/helpers';
import { OCTAVE_SIGN_TRAILING_GAP_PX } from '../notationDimensions';

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

async function cornerAndStopNoteHeadRects(
  page: Page
): Promise<{ corner: DOMRect; head: DOMRect }> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const corner = staff?.shadowRoot?.querySelector('.octave-corner');
    // `.head` lives inside each <music-note>'s own shadow root, not the
    // staff's — a plain querySelectorAll from the staff can't pierce that
    // nested boundary.
    const stopNote = Array.from(
      staff?.querySelectorAll('music-note') ?? []
    ).find((el) => el.hasAttribute('octave-stop'));
    const head = stopNote?.shadowRoot?.querySelector('.head');
    if (!corner || !head) {
      throw new Error('corner or notehead not found');
    }
    return {
      corner: (corner as SVGPathElement).getBoundingClientRect(),
      head: (head as SVGGraphicsElement).getBoundingClientRect(),
    };
  });
}

async function lineAndSpanHeadRects(
  page: Page
): Promise<{ line: DOMRect; heads: DOMRect[] }> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const line = staff?.shadowRoot?.querySelector('.octave-extension-line');
    const notes = Array.from(staff?.querySelectorAll('music-note') ?? []);
    const heads = notes
      .map((note) => note.shadowRoot?.querySelector('.head'))
      .filter((head): head is Element => head !== null && head !== undefined)
      .map((head) => (head as SVGGraphicsElement).getBoundingClientRect());
    if (!line || heads.length === 0) {
      throw new Error('extension line or noteheads not found');
    }
    return {
      line: (line as SVGLineElement).getBoundingClientRect(),
      heads,
    };
  });
}

test('the corner terminator clears the closing notehead by the intended trailing gap', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" octave-shift="8va"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
       <music-note note="E" octave="5" duration="quarter" octave-stop></music-note>
       <music-note note="F" octave="5" duration="quarter"></music-note>
     </music-staff>`
  );

  const { corner, head } = await cornerAndStopNoteHeadRects(page);
  expect(corner.left - head.right).toBeGreaterThanOrEqual(
    OCTAVE_SIGN_TRAILING_GAP_PX
  );
});

test('a raise span over the highest note the clef supports pushes its row clear of the notehead, past the fixed nominal position', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="6" duration="whole" octave-shift="15ma" octave-stop></music-note>
     </music-staff>`
  );

  const { line, heads } = await lineAndSpanHeadRects(page);
  // SVG Y grows downward — the line must sit strictly above (smaller Y
  // than) every note's own real ink, not merely above its fixed nominal
  // offset.
  for (const head of heads) {
    expect(line.bottom).toBeLessThanOrEqual(head.top);
  }
});

test('a lower span over the lowest note the clef supports pushes its row clear of the notehead, past the fixed nominal position', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="bass" time="4/4">
       <music-note note="E" octave="2" duration="whole" octave-shift="8vb" octave-stop></music-note>
     </music-staff>`
  );

  const { line, heads } = await lineAndSpanHeadRects(page);
  for (const head of heads) {
    expect(line.top).toBeGreaterThanOrEqual(head.bottom);
  }
});

test('an ordinary mid-staff span keeps comfortable clearance without needing the content-aware push', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" octave-shift="8va"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
       <music-note note="E" octave="5" duration="quarter"></music-note>
       <music-note note="F" octave="5" duration="quarter" octave-stop></music-note>
     </music-staff>`
  );

  const { line, heads } = await lineAndSpanHeadRects(page);
  for (const head of heads) {
    expect(head.top - line.bottom).toBeGreaterThan(OCTAVE_SIGN_TRAILING_GAP_PX);
  }
});

test('an octave span defaults to outermost, past a tuplet numeral already occupying the above-staff space', async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="3/4">
       <music-tuplet ratio="3">
         <music-note note="C" octave="5" duration="eighth" octave-shift="8va"></music-note>
         <music-note note="D" octave="5" duration="eighth"></music-note>
         <music-note note="E" octave="5" duration="eighth" octave-stop></music-note>
       </music-tuplet>
     </music-staff>`
  );

  const { octaveNumeral, tupletNumeral } = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const octaveNumeral = staff?.shadowRoot?.querySelector(
      '.octave-signs-container .octave-sign-numeral'
    );
    const tupletNumeral = staff?.shadowRoot?.querySelector(
      '.tuplets-container .tuplet-numeral'
    );
    if (!octaveNumeral || !tupletNumeral) {
      throw new Error('octave or tuplet numeral not found');
    }
    return {
      octaveNumeral: (
        octaveNumeral as SVGGraphicsElement
      ).getBoundingClientRect(),
      tupletNumeral: (
        tupletNumeral as SVGGraphicsElement
      ).getBoundingClientRect(),
    };
  });

  // SVG Y grows downward — "outermost" (furthest from the staff) means a
  // strictly smaller Y than the decoration it must sit outside of.
  expect(octaveNumeral.bottom).toBeLessThanOrEqual(tupletNumeral.top);
});

test("a trilling closing note's own line end extends the octave line's corner past the bare notehead", async ({
  page,
}) => {
  await render(
    page,
    `<music-staff clef="treble" time="4/4">
       <music-note note="C" octave="5" duration="quarter" octave-shift="8va"></music-note>
       <music-note note="D" octave="5" duration="quarter"></music-note>
       <music-note note="E" octave="5" duration="quarter"></music-note>
       <music-note note="F" octave="5" duration="quarter" trill trill-line="auto" octave-stop></music-note>
     </music-staff>`
  );

  const { corner, trillLine, head } = await page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const corner = staff?.shadowRoot?.querySelector('.octave-corner');
    const trillLine = staff?.shadowRoot?.querySelector('.trill-line');
    const stopNote = Array.from(
      staff?.querySelectorAll('music-note') ?? []
    ).find((el) => el.hasAttribute('octave-stop'));
    const head = stopNote?.shadowRoot?.querySelector('.head');
    if (!corner || !trillLine || !head) {
      throw new Error('corner, trill line, or notehead not found');
    }
    return {
      corner: (corner as SVGPathElement).getBoundingClientRect(),
      trillLine: (trillLine as SVGGElement).getBoundingClientRect(),
      head: (head as SVGGraphicsElement).getBoundingClientRect(),
    };
  });

  // Without the trill, the corner would land just past the notehead's own
  // trailing gap — the trill's own (much longer, untied) line reaching to
  // the end of the available width proves the octave line followed it there.
  expect(corner.left - head.right).toBeGreaterThan(50);
  expect(corner.right).toBeGreaterThanOrEqual(trillLine.right - 5);
});
