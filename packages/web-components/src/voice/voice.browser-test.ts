import { expect, type Page, test } from '@playwright/test';
import { resizeHost, waitForRedrawCycle } from '../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function render(page: Page, markup: string): Promise<void> {
  await page.evaluate((html) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = '800px';
    host.innerHTML = html;
  }, markup);
  await waitForRedrawCycle(page);
  await waitForRedrawCycle(page);
}

async function noteLefts(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('music-note')).map(
      (note) => note.getBoundingClientRect().left
    )
  );
}

async function restTops(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('music-rest')).map(
      (rest) => (rest as HTMLElement).style.top
    )
  );
}

async function beamWidths(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff');
    const beams = Array.from(
      staff?.shadowRoot?.querySelectorAll('.beams-container .beam') ?? []
    ) as SVGGraphicsElement[];
    return beams.map((beam) => beam.getBBox().width);
  });
}

test.describe('multi-voice staff', () => {
  test('same-beat notes across two voices land at the same x', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="D" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="E" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="F" octave="5" duration="quarter" articulation="accent"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="quarter"></music-note>
           <music-note note="B" octave="3" duration="quarter"></music-note>
           <music-note note="A" octave="3" duration="quarter"></music-note>
           <music-note note="G" octave="3" duration="quarter"></music-note>
         </music-voice>
       </music-staff>`
    );

    const lefts = await noteLefts(page);
    expect(lefts.length).toBe(8);
    const [voice1, voice2] = [lefts.slice(0, 4), lefts.slice(4, 8)];
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(voice1[i] - voice2[i])).toBeLessThan(1);
    }
  });

  test('voice 1 rests displace upward and voice 2 rests displace downward, away from each other', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="quarter"></music-note>
           <music-rest duration="quarter"></music-rest>
           <music-note note="D" octave="5" duration="quarter"></music-note>
           <music-note note="E" octave="5" duration="quarter"></music-note>
         </music-voice>
         <music-voice>
           <music-rest duration="quarter"></music-rest>
           <music-note note="C" octave="4" duration="quarter"></music-note>
           <music-note note="B" octave="3" duration="quarter"></music-note>
           <music-note note="A" octave="3" duration="quarter"></music-note>
         </music-voice>
       </music-staff>`
    );

    const [voice1RestTop, voice2RestTop] = (await restTops(page)).map((top) =>
      parseFloat(top)
    );
    // Voice 1 (up) displaces its rest above the plain duration-keyed Y;
    // voice 2 (down) displaces below — the two must land on opposite sides.
    expect(voice1RestTop).toBeLessThan(voice2RestTop);
  });

  test("a rest in voice 1 does not break voice 2's beam group", async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="eighth" articulation="accent"></music-note>
           <music-rest duration="eighth"></music-rest>
           <music-note note="D" octave="5" duration="eighth" articulation="accent"></music-note>
           <music-note note="E" octave="5" duration="eighth" articulation="accent"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="eighth"></music-note>
           <music-note note="B" octave="3" duration="eighth"></music-note>
           <music-note note="A" octave="3" duration="eighth"></music-note>
           <music-note note="G" octave="3" duration="eighth"></music-note>
         </music-voice>
       </music-staff>`
    );

    const widths = (await beamWidths(page)).sort((a, b) => a - b);
    // Voice 1's rest splits its run into a single 2-note beam spanning only
    // its last half-beat (D5-E5, beat 1.0 to 1.5); voice 2's uninterrupted
    // run beams all 4 notes together, spanning beat 0 to 1.5 — 3x as wide.
    expect(widths.length).toBe(2);
    const ratio = widths[1] / widths[0];
    expect(Math.abs(ratio - 3)).toBeLessThan(0.3);
  });

  test('resizing a multi-voice staff reflows both voices together, preserving same-beat alignment', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="D" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="E" octave="5" duration="quarter" articulation="accent"></music-note>
           <music-note note="F" octave="5" duration="quarter" articulation="accent"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="quarter"></music-note>
           <music-note note="B" octave="3" duration="quarter"></music-note>
           <music-note note="A" octave="3" duration="quarter"></music-note>
           <music-note note="G" octave="3" duration="quarter"></music-note>
         </music-voice>
       </music-staff>`
    );

    const wideLefts = await noteLefts(page);
    await resizeHost(page, 400);

    const narrowLefts = await noteLefts(page);
    const [narrowVoice1, narrowVoice2] = [
      narrowLefts.slice(0, 4),
      narrowLefts.slice(4, 8),
    ];
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(narrowVoice1[i] - narrowVoice2[i])).toBeLessThan(1);
    }
    // Genuinely reflowed, not just re-measured at the same position.
    expect(narrowLefts[3]).toBeLessThan(wideLefts[3]);
  });

  test('rhythmically identical voices auto-combine onto one shared stem', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="quarter"></music-note>
           <music-note note="D" octave="5" duration="quarter"></music-note>
           <music-note note="E" octave="5" duration="quarter"></music-note>
           <music-note note="F" octave="5" duration="quarter"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="quarter"></music-note>
           <music-note note="D" octave="4" duration="quarter"></music-note>
           <music-note note="E" octave="4" duration="quarter"></music-note>
           <music-note note="F" octave="4" duration="quarter"></music-note>
         </music-voice>
       </music-staff>`
    );

    const originalsHidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('music-note')).every(
        (note) => (note as HTMLElement).style.display === 'none'
      )
    );
    expect(originalsHidden).toBe(true);

    const synthesizedChordCount = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      return staff?.shadowRoot?.querySelectorAll('music-chord').length ?? 0;
    });
    expect(synthesizedChordCount).toBe(4);
  });

  test('a fully silent measure across both voices renders one centered shared rest', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-rest duration="whole"></music-rest>
         </music-voice>
         <music-voice>
           <music-rest duration="whole"></music-rest>
         </music-voice>
       </music-staff>`
    );

    const originalsHidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('music-rest')).every(
        (rest) => (rest as HTMLElement).style.display === 'none'
      )
    );
    expect(originalsHidden).toBe(true);

    const geometry = await page.evaluate(() => {
      const staff = document.querySelector('music-staff') as
        | (Element & { describeEndX: number })
        | null;
      if (staff === null) {
        throw new Error('staff not found');
      }
      const synthesizedRest = staff.shadowRoot?.querySelector('music-rest');
      if (synthesizedRest === null || synthesizedRest === undefined) {
        throw new Error('synthesized rest not found');
      }
      const staffRect = staff.getBoundingClientRect();
      const restRect = synthesizedRest.getBoundingClientRect();
      return {
        restVisible: (synthesizedRest as HTMLElement).style.display !== 'none',
        restCenter: restRect.left + restRect.width / 2 - staffRect.left,
        notesAreaLeft: staff.describeEndX,
        staffWidth: staffRect.width,
      };
    });

    expect(geometry.restVisible).toBe(true);
    const notesAreaCenter =
      geometry.notesAreaLeft +
      (geometry.staffWidth - geometry.notesAreaLeft) / 2;
    expect(Math.abs(geometry.restCenter - notesAreaCenter)).toBeLessThan(
      geometry.staffWidth * 0.1
    );
  });

  test('a tuplet in the lower voice renders its own bracket without disturbing the upper voice', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="half"></music-note>
           <music-note note="D" octave="5" duration="half"></music-note>
         </music-voice>
         <music-voice>
           <music-tuplet ratio="3">
             <music-note note="C" octave="4" duration="eighth"></music-note>
             <music-note note="B" octave="3" duration="eighth"></music-note>
             <music-note note="A" octave="3" duration="eighth"></music-note>
           </music-tuplet>
           <music-note note="G" octave="3" duration="half"></music-note>
           <music-note note="G" octave="3" duration="quarter"></music-note>
         </music-voice>
       </music-staff>`
    );

    const tupletBBox = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const group = staff?.shadowRoot?.querySelector(
        '.tuplet-group'
      ) as SVGGraphicsElement | null;
      return group === null || group === undefined
        ? null
        : group.getBBox().width;
    });
    expect(tupletBBox).not.toBeNull();
    expect(tupletBBox ?? 0).toBeGreaterThan(0);

    const upperVoiceLefts = (await noteLefts(page)).slice(0, 2);
    for (let i = 1; i < upperVoiceLefts.length; i++) {
      expect(upperVoiceLefts[i]).toBeGreaterThan(upperVoiceLefts[i - 1]);
    }
  });

  test('dynamics and hairpins in the lower voice render independently of the upper voice', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="quarter"></music-note>
           <music-note note="D" octave="5" duration="quarter"></music-note>
           <music-note note="C" octave="5" duration="quarter"></music-note>
           <music-note note="D" octave="5" duration="quarter"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="quarter" dynamic="p" crescendo="start"></music-note>
           <music-note note="D" octave="4" duration="quarter"></music-note>
           <music-note note="E" octave="4" duration="quarter"></music-note>
           <music-note note="F" octave="4" duration="quarter" dynamic="f" crescendo="end"></music-note>
         </music-voice>
       </music-staff>`
    );

    const result = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const markings = Array.from(
        staff?.shadowRoot?.querySelectorAll('.dynamic-marking') ?? []
      ).map((el) => el.textContent);
      const hairpin = staff?.shadowRoot?.querySelector(
        '.hairpin'
      ) as SVGGraphicsElement | null;
      return {
        markings,
        hairpinWidth:
          hairpin === null || hairpin === undefined
            ? null
            : hairpin.getBBox().width,
      };
    });

    expect(result.markings).toEqual(expect.arrayContaining(['p', 'f']));
    expect(result.hairpinWidth).not.toBeNull();
    expect(result.hairpinWidth ?? 0).toBeGreaterThan(0);
  });

  test('a trill in the lower voice renders its sign and line without needing a trill in the upper voice', async ({
    page,
  }) => {
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="half"></music-note>
           <music-note note="D" octave="5" duration="half"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="C" octave="4" duration="half" trill></music-note>
           <music-note note="G" octave="3" duration="half"></music-note>
         </music-voice>
       </music-staff>`
    );

    const result = await page.evaluate(() => {
      const trillingNote = document.querySelectorAll('music-note')[4];
      const staff = document.querySelector('music-staff');
      const line = staff?.shadowRoot?.querySelector(
        '.trill-lines-container .trill-line'
      ) as SVGGElement | null;
      return {
        signVisible:
          (trillingNote?.shadowRoot?.querySelector(
            '.trill-sign'
          ) as SVGGElement | null) !== null,
        lineWidth:
          line === null || line === undefined
            ? null
            : line.getBoundingClientRect().width,
      };
    });

    expect(result.signVisible).toBe(true);
    expect(result.lineWidth).not.toBeNull();
    expect(result.lineWidth ?? 0).toBeGreaterThan(0);
  });
});
