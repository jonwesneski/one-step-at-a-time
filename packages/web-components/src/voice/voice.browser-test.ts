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

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
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
    // Matches TwoVoicesWithTupletInLowerVoice exactly (voice.stories.ts) —
    // the tuplet notes are quarter notes (never beamed), so this exercises
    // the real bracket line + numeral, not just the beamed omitBracket path.
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="half"></music-note>
           <music-note note="D" octave="5" duration="half" articulation="staccato"></music-note>
         </music-voice>
         <music-voice>
           <music-tuplet ratio="3">
             <music-note note="B" octave="3" duration="quarter"></music-note>
             <music-note note="A" octave="3" duration="quarter"></music-note>
             <music-note note="G" octave="3" duration="quarter"></music-note>
           </music-tuplet>
           <music-note note="F" octave="3" duration="half"></music-note>
         </music-voice>
       </music-staff>`
    );

    const geometry = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const svg = staff?.shadowRoot?.querySelector('.transcribe-container');
      const group = staff?.shadowRoot?.querySelector(
        '.tuplet-group'
      ) as SVGGraphicsElement | null;
      const bracketLines = Array.from(
        staff?.shadowRoot?.querySelectorAll('.tuplet-bracket') ?? []
      ) as SVGLineElement[];
      const notes = Array.from(document.querySelectorAll('music-note'));
      return {
        groupWidth: group === null ? null : group.getBBox().width,
        svgRect: svg?.getBoundingClientRect() ?? null,
        groupRect: group?.getBoundingClientRect() ?? null,
        bracketRects: bracketLines.map((line) => line.getBoundingClientRect()),
        voice1NoteRects: notes
          .slice(0, 2)
          .map((note) => note.getBoundingClientRect()),
        // The notehead specifically, not the whole <music-note> (which
        // includes its stem — the bracket is meant to sit just past the
        // stem tip, so comparing against the full element would be
        // overly strict).
        tupletNoteheadRects: notes.slice(2, 5).map((note) => {
          const head = note.shadowRoot?.querySelector('.head');
          return head?.getBoundingClientRect() ?? note.getBoundingClientRect();
        }),
      };
    });
    expect(geometry.groupWidth).not.toBeNull();
    expect(geometry.groupWidth ?? 0).toBeGreaterThan(0);

    // The bracket/numeral, forced below the staff by voice 2's down-stem
    // policy, stays within the staff's own rendered SVG area —
    // #estimateBelowStaffBudget must reserve enough room for it.
    expect(geometry.svgRect).not.toBeNull();
    expect(geometry.groupRect).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
    expect(geometry.groupRect!.bottom).toBeLessThanOrEqual(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
      geometry.svgRect!.bottom + 1
    );
    // ...and never vertically overlaps voice 1's own notes/stems — the
    // direct regression check for the reported "bracket crosses through the
    // other voice" bug.
    for (const noteRect of geometry.voice1NoteRects) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
      expect(geometry.groupRect!.top).toBeGreaterThanOrEqual(noteRect.bottom);
    }

    // The bracket's own arm/hook lines never visually overlap the tuplet's
    // own noteheads — the direct regression check for the "bracket sits at
    // notehead height, numeral unreadable" bug (a non-beamed tuplet whose
    // notes sit well past the staff needs baseY clamped past its own
    // extreme notehead, not just the nominal fixed clearance). A true
    // rectangle-overlap test, not just a top/bottom edge comparison — a
    // hook is a short vertical mark anchored to one specific note's own x
    // position and only needs to clear that note, not the group's worst.
    expect(geometry.bracketRects.length).toBeGreaterThan(0);
    for (const bracketRect of geometry.bracketRects) {
      for (const noteheadRect of geometry.tupletNoteheadRects) {
        expect(rectsOverlap(bracketRect, noteheadRect)).toBe(false);
      }
    }

    const upperVoiceLefts = (await noteLefts(page)).slice(0, 2);
    for (let i = 1; i < upperVoiceLefts.length; i++) {
      expect(upperVoiceLefts[i]).toBeGreaterThan(upperVoiceLefts[i - 1]);
    }
  });

  test('dynamics and hairpins in the lower voice render independently of the upper voice', async ({
    page,
  }) => {
    // Matches TwoVoicesWithDynamicsInBothVoices exactly (voice.stories.ts) —
    // voice 2 reaches down to B3/A3/G3/F3, outside the fixed
    // DYNAMICS_BASELINE_Y's safe range, exercising the per-voice clamp.
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="C" octave="5" duration="quarter" dynamic="f" articulation="staccato"></music-note>
           <music-note note="D" octave="5" duration="quarter" articulation="staccato"></music-note>
           <music-note note="E" octave="5" duration="quarter" articulation="staccato"></music-note>
           <music-note note="F" octave="5" duration="quarter" articulation="staccato"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="B" octave="3" duration="quarter" dynamic="pp" crescendo="start"></music-note>
           <music-note note="A" octave="3" duration="quarter"></music-note>
           <music-note note="G" octave="3" duration="quarter"></music-note>
           <music-note note="F" octave="3" duration="quarter" crescendo="end"></music-note>
         </music-voice>
       </music-staff>`
    );

    const result = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const markings = Array.from(
        staff?.shadowRoot?.querySelectorAll('.dynamic-marking') ?? []
      ).map((el) => el.textContent);
      // Per-voice dynamics containers, in creation order (voice 1's default
      // one first, voice 2's created lazily second) — comparing each
      // voice's own marking(s) against its own notes and, for the
      // cross-voice check below, against the other voice's notes too.
      const dynamicsContainers = staff?.shadowRoot?.querySelectorAll(
        '.dynamics-container'
      );
      const voice1MarkingRects = Array.from(
        dynamicsContainers?.[0]?.querySelectorAll('.dynamic-marking') ?? []
      ).map((el) => el.getBoundingClientRect());
      const voice2MarkingRects = Array.from(
        dynamicsContainers?.[1]?.querySelectorAll('.dynamic-marking') ?? []
      ).map((el) => el.getBoundingClientRect());
      const hairpin = staff?.shadowRoot?.querySelector(
        '.hairpin'
      ) as SVGGraphicsElement | null;
      const notes = Array.from(document.querySelectorAll('music-note'));
      const voice1NoteRects = notes
        .slice(0, 4)
        .map((note) => note.getBoundingClientRect());
      const voice2NoteRects = notes
        .slice(4, 8)
        .map((note) => note.getBoundingClientRect());
      return {
        markings,
        voice1MarkingRects,
        voice2MarkingRects,
        voice1NoteRects,
        voice2NoteRects,
        hairpinWidth:
          hairpin === null || hairpin === undefined
            ? null
            : hairpin.getBBox().width,
      };
    });

    expect(result.markings).toEqual(expect.arrayContaining(['pp', 'f']));
    expect(result.hairpinWidth).not.toBeNull();
    expect(result.hairpinWidth ?? 0).toBeGreaterThan(0);

    // Voice 2's own dynamic marking never visually overlaps voice 2's own
    // note/stem — the direct regression check for the "pp sits through the
    // stem" bug (a fixed baseline that doesn't clear a genuinely low,
    // down-stem note).
    expect(result.voice2MarkingRects.length).toBeGreaterThan(0);
    for (const markingRect of result.voice2MarkingRects) {
      for (const noteRect of result.voice2NoteRects) {
        expect(rectsOverlap(markingRect, noteRect)).toBe(false);
      }
    }

    // Voice 1's own dynamic marking renders on its OWN side of the staff
    // (above, matching its up-stem direction) rather than always below —
    // the direct regression check for the "voice 1's f overlaps voice 2's
    // note" bug, and confirms the multi-voice placement convention: never
    // overlaps voice 2's notes, and sits above voice 2's own marking.
    expect(result.voice1MarkingRects.length).toBeGreaterThan(0);
    for (const markingRect of result.voice1MarkingRects) {
      for (const noteRect of result.voice2NoteRects) {
        expect(rectsOverlap(markingRect, noteRect)).toBe(false);
      }
      for (const voice2MarkingRect of result.voice2MarkingRects) {
        expect(markingRect.top).toBeLessThan(voice2MarkingRect.top);
      }
      // Renders within the actual visible page (top >= 0), not clipped
      // above the viewport — getBoundingClientRect() happily returns a
      // valid, non-empty rect for an off-screen element too, so this is
      // the direct regression check for the "correctly positioned in SVG
      // coordinates, but the page never grew to show it" bug (Fix 9):
      // above-staff budget must reach the host element's own margin, not
      // just its internal transcribeContainer viewBox.
      expect(markingRect.top).toBeGreaterThanOrEqual(0);
    }
  });

  test('a trill in the lower voice renders its sign and line without needing a trill in the upper voice', async ({
    page,
  }) => {
    // Matches TwoVoicesWithTrillInLowerVoice exactly (voice.stories.ts) —
    // voice 1's E5/D5 are high enough that the trill's nominal above-staff
    // Y would otherwise cross straight through voice 1's own stem.
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="half"></music-note>
           <music-note note="D" octave="5" duration="half" articulation="staccato"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="B" octave="3" duration="half" trill></music-note>
           <music-note note="F" octave="3" duration="half"></music-note>
         </music-voice>
       </music-staff>`
    );

    const result = await page.evaluate(() => {
      const trillingNote = document.querySelectorAll('music-note')[2];
      const staff = document.querySelector('music-staff');
      const line = staff?.shadowRoot?.querySelector(
        '.trill-lines-container .trill-line'
      ) as SVGGElement | null;
      const sign = trillingNote?.shadowRoot?.querySelector(
        '.trill-sign'
      ) as SVGGElement | null;
      const voice1NoteRects = Array.from(
        document.querySelectorAll('music-note')
      )
        .slice(0, 2)
        .map((note) => note.getBoundingClientRect());
      return {
        signRect:
          sign === null || sign === undefined
            ? null
            : sign.getBoundingClientRect(),
        lineRect:
          line === null || line === undefined
            ? null
            : line.getBoundingClientRect(),
        voice1NoteRects,
      };
    });

    expect(result.signRect).not.toBeNull();
    expect(result.lineRect).not.toBeNull();
    expect(result.lineRect?.width ?? 0).toBeGreaterThan(0);

    // Neither the trill sign glyph nor the line ever visually overlaps
    // voice 1's own notehead/stem — the direct regression check for the
    // reported "sign/line crosses through the other voice" bug. The sign
    // is checked separately from the line since they're drawn by two
    // independent code paths (see #trillLineLiftClearingOtherVoices).
    for (const noteRect of result.voice1NoteRects) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
      expect(rectsOverlap(result.signRect!, noteRect)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
      expect(rectsOverlap(result.lineRect!, noteRect)).toBe(false);
    }
  });

  test("a trill line raises above another voice's own content directly in its horizontal path", async ({
    page,
  }) => {
    // A trill line's own natural end point is the trilling note's own next
    // note (see rules/trillRules.ts#resolveTrillSpans' endBeforeIndex) — a
    // whole-note trill has no next note in its own voice, so its line runs
    // the full remaining measure width, guaranteeing it crosses voice 1's
    // later, up-stem note in this span. The direct exercise of
    // #trillLineYClearingOtherVoices, independent of whether any specific
    // story's own geometry happens to trigger it.
    await render(
      page,
      `<music-staff clef="treble" time="4/4">
         <music-voice>
           <music-note note="E" octave="5" duration="half"></music-note>
           <music-note note="D" octave="5" duration="half" articulation="staccato"></music-note>
         </music-voice>
         <music-voice>
           <music-note note="B" octave="3" duration="whole" trill></music-note>
         </music-voice>
       </music-staff>`
    );

    const result = await page.evaluate(() => {
      const staff = document.querySelector('music-staff');
      const line = staff?.shadowRoot?.querySelector(
        '.trill-lines-container .trill-line'
      ) as SVGGElement | null;
      const voice1NoteRects = Array.from(
        document.querySelectorAll('music-note')
      )
        .slice(0, 2)
        .map((note) => note.getBoundingClientRect());
      return {
        lineRect:
          line === null || line === undefined
            ? null
            : line.getBoundingClientRect(),
        voice1NoteRects,
      };
    });

    expect(result.lineRect).not.toBeNull();
    expect(result.lineRect?.width ?? 0).toBeGreaterThan(0);
    // The line's own horizontal span genuinely reaches voice 1's 2nd note —
    // confirms this scenario actually exercises the collision path, not
    // just a coincidental non-overlap.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
    expect(result.lineRect!.right).toBeGreaterThan(
      result.voice1NoteRects[1].left
    );
    for (const noteRect of result.voice1NoteRects) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
      expect(rectsOverlap(result.lineRect!, noteRect)).toBe(false);
    }
  });
});
