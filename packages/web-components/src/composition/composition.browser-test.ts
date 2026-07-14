import { expect, test } from '@playwright/test';
import {
  buildComposition,
  resizeHost,
  waitForRedrawCycle,
} from '../../test-fixtures/helpers';
import {
  COMMON_ATTRIBUTES,
  MUSIC_COMPOSITION,
  MUSIC_LYRICS,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_STAFF_VOCAL,
} from '../utils/consts';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test.describe(`${MUSIC_COMPOSITION} responsive layout`, () => {
  test('connectors stay attached to their endpoint notes across a resize', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);
        const treble = document.createElement(staffTag);
        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C4');
        noteA.setAttribute('duration', 'quarter');
        noteA.setAttribute('tie', 'start');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'C4');
        noteB.setAttribute('duration', 'quarter');
        noteB.setAttribute('tie', 'end');
        const noteC = document.createElement(noteTag);
        noteC.setAttribute('note', 'D4');
        noteC.setAttribute('duration', 'quarter');
        const noteD = document.createElement(noteTag);
        noteD.setAttribute('note', 'E4');
        noteD.setAttribute('duration', 'quarter');
        treble.appendChild(noteA);
        treble.appendChild(noteB);
        treble.appendChild(noteC);
        treble.appendChild(noteD);
        measure.appendChild(treble);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const baseline = await page.evaluate(
      ({ compositionTag, noteTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        if (overlay === null) {
          throw new Error('overlay missing');
        }
        const paths = Array.from(
          overlay.querySelectorAll('path')
        ) as SVGPathElement[];
        const notes = Array.from(
          composition.querySelectorAll(noteTag)
        ) as HTMLElement[];
        return {
          pathCount: paths.length,
          firstPathBBox:
            paths.length > 0 ? paths[0].getBoundingClientRect() : null,
          startNoteRect: notes[0].getBoundingClientRect(),
          endNoteRect: notes[1].getBoundingClientRect(),
        };
      },
      { compositionTag: MUSIC_COMPOSITION, noteTag: MUSIC_NOTE }
    );

    expect(baseline.pathCount).toBeGreaterThanOrEqual(1);
    expect(baseline.firstPathBBox).not.toBeNull();
    if (baseline.firstPathBBox === null) {
      throw new Error('unreachable');
    }
    const baselineConnectorMidX =
      baseline.firstPathBBox.left + baseline.firstPathBBox.width / 2;
    const baselineNotesMidX =
      (baseline.startNoteRect.left + baseline.endNoteRect.right) / 2;
    expect(Math.abs(baselineConnectorMidX - baselineNotesMidX)).toBeLessThan(
      30
    );

    await resizeHost(page, 500);
    await waitForRedrawCycle(page);

    const afterResize = await page.evaluate(
      ({ compositionTag, noteTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        if (overlay === null) {
          throw new Error('overlay missing');
        }
        const paths = Array.from(
          overlay.querySelectorAll('path')
        ) as SVGPathElement[];
        const notes = Array.from(
          composition.querySelectorAll(noteTag)
        ) as HTMLElement[];
        return {
          pathCount: paths.length,
          firstPathBBox:
            paths.length > 0 ? paths[0].getBoundingClientRect() : null,
          startNoteRect: notes[0].getBoundingClientRect(),
          endNoteRect: notes[1].getBoundingClientRect(),
        };
      },
      { compositionTag: MUSIC_COMPOSITION, noteTag: MUSIC_NOTE }
    );

    expect(afterResize.pathCount).toBeGreaterThanOrEqual(1);
    expect(afterResize.firstPathBBox).not.toBeNull();
    if (afterResize.firstPathBBox === null) {
      throw new Error('unreachable');
    }
    const afterMidX =
      afterResize.firstPathBBox.left + afterResize.firstPathBBox.width / 2;
    const afterNotesMidX =
      (afterResize.startNoteRect.left + afterResize.endNoteRect.right) / 2;
    expect(Math.abs(afterMidX - afterNotesMidX)).toBeLessThan(30);
    expect(Math.abs(afterMidX - baselineConnectorMidX)).toBeGreaterThan(1);
  });

  test('connectors update count when a tied note pair is added', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);
        const treble = document.createElement(staffTag);
        const a = document.createElement(noteTag);
        a.setAttribute('note', 'C4');
        a.setAttribute('duration', 'quarter');
        a.setAttribute('tie', 'start');
        const b = document.createElement(noteTag);
        b.setAttribute('note', 'C4');
        b.setAttribute('duration', 'quarter');
        b.setAttribute('tie', 'end');
        treble.appendChild(a);
        treble.appendChild(b);
        measure.appendChild(treble);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const baseline = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      return overlay.querySelectorAll('path').length;
    }, MUSIC_COMPOSITION);
    expect(baseline).toBe(1);

    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const treble = document.querySelector(staffTag);
        if (treble === null) {
          throw new Error('staff missing');
        }
        const c = document.createElement(noteTag);
        c.setAttribute('note', 'D4');
        c.setAttribute('duration', 'quarter');
        c.setAttribute('tie', 'start');
        const d = document.createElement(noteTag);
        d.setAttribute('note', 'D4');
        d.setAttribute('duration', 'quarter');
        d.setAttribute('tie', 'end');
        treble.appendChild(c);
        treble.appendChild(d);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const afterAdd = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      return overlay.querySelectorAll('path').length;
    }, MUSIC_COMPOSITION);
    expect(afterAdd).toBeGreaterThan(baseline);

    await resizeHost(page, 500);
    await waitForRedrawCycle(page);

    const afterResize = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      return overlay.querySelectorAll('path').length;
    }, MUSIC_COMPOSITION);
    expect(afterResize).toBe(afterAdd);
  });

  test('clef visibility — only first staff in each row shows the clef across resizes', async ({
    page,
  }) => {
    await buildComposition(page, {
      measureCount: 6,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 1600,
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const groupByRow = async () =>
      page.evaluate(
        ({ compositionTag, measureTag, staffTag }) => {
          const composition = document.querySelector(compositionTag);
          if (composition === null) {
            throw new Error('composition missing');
          }
          const measures = Array.from(
            composition.querySelectorAll(measureTag)
          ) as HTMLElement[];
          const rows: { top: number; staves: boolean[] }[] = [];
          for (const measure of measures) {
            const top = measure.getBoundingClientRect().top;
            const staff = measure.querySelector(staffTag);
            if (staff === null) {
              throw new Error('staff missing');
            }
            const showDescribe = (staff as unknown as { showDescribe: boolean })
              .showDescribe;
            const existingRow = rows.find((r) => Math.abs(r.top - top) <= 5);
            if (existingRow === undefined) {
              rows.push({ top, staves: [showDescribe] });
            } else {
              existingRow.staves.push(showDescribe);
            }
          }
          return rows.map((r) => r.staves);
        },
        {
          compositionTag: MUSIC_COMPOSITION,
          measureTag: MUSIC_MEASURE,
          staffTag: MUSIC_STAFF,
        }
      );

    const wideRows = await groupByRow();
    expect(wideRows.length).toBeGreaterThanOrEqual(1);
    for (const row of wideRows) {
      expect(row[0]).toBe(true);
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBe(false);
      }
    }

    await resizeHost(page, 400);
    await waitForRedrawCycle(page);

    const narrowRows = await groupByRow();
    expect(narrowRows.length).toBeGreaterThanOrEqual(2);
    for (const row of narrowRows) {
      expect(row[0]).toBe(true);
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBe(false);
      }
    }
  });

  test('clef visibility round-trips when widening back', async ({ page }) => {
    await buildComposition(page, {
      measureCount: 6,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 400,
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    await resizeHost(page, 1600);
    await waitForRedrawCycle(page);

    const rows = await page.evaluate(
      ({ compositionTag, measureTag, staffTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null) {
          throw new Error('composition missing');
        }
        const measures = Array.from(
          composition.querySelectorAll(measureTag)
        ) as HTMLElement[];
        const grouped: { top: number; staves: boolean[] }[] = [];
        for (const measure of measures) {
          const top = measure.getBoundingClientRect().top;
          const staff = measure.querySelector(staffTag);
          if (staff === null) {
            throw new Error('staff missing');
          }
          const showDescribe = (staff as unknown as { showDescribe: boolean })
            .showDescribe;
          const existingRow = grouped.find((r) => Math.abs(r.top - top) <= 5);
          if (existingRow === undefined) {
            grouped.push({ top, staves: [showDescribe] });
          } else {
            existingRow.staves.push(showDescribe);
          }
        }
        return grouped.map((r) => r.staves);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
      }
    );

    for (const row of rows) {
      expect(row[0]).toBe(true);
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBe(false);
      }
    }
  });

  test('clef visibility — 3-per-row → 2-per-row puts clef on correct measures (regression)', async ({
    page,
  }) => {
    // 4 empty measures at 900px → flex-basis 300px each → rows [M1,M2,M3] and [M4]
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';
        const composition = document.createElement(compositionTag);
        for (let i = 0; i < 4; i++) {
          const measure = document.createElement(measureTag);
          const staff = document.createElement(staffTag);
          measure.appendChild(staff);
          composition.appendChild(measure);
        }
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
      }
    );
    await waitForRedrawCycle(page);

    const readShowClefsPerMeasure = () =>
      page.evaluate((measureTag) => {
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        return measures.map((measure) => {
          const staff = Array.from(measure.children).find(
            (el) =>
              el.nodeName === 'MUSIC-STAFF' ||
              el.nodeName.startsWith('MUSIC-STAFF-')
          );
          return staff
            ? (staff as unknown as { showDescribe: boolean }).showDescribe
            : false;
        });
      }, MUSIC_MEASURE);

    const initial = await readShowClefsPerMeasure();
    expect(initial).toEqual([true, false, false, true]);

    // Resize to 600px → 2 × 300px = 600px fits two measures → rows [M1,M2] and [M3,M4]
    await resizeHost(page, 600);

    const after = await readShowClefsPerMeasure();
    expect(after).toEqual([true, false, true, false]);
  });

  test('key signature and clef visibility — only first staff in each row shows both, across resizes', async ({
    page,
  }) => {
    await page.evaluate(
      ({
        compositionTag,
        measureTag,
        staffTag,
        noteTag,
        keySigAttr,
        modeAttr,
      }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '1600px';
        const composition = document.createElement(compositionTag);
        composition.setAttribute(keySigAttr, 'D');
        composition.setAttribute(modeAttr, 'major');
        for (let i = 0; i < 6; i++) {
          const measure = document.createElement(measureTag);
          const staff = document.createElement(staffTag);
          for (let j = 0; j < 4; j++) {
            const note = document.createElement(noteTag);
            note.setAttribute('note', 'D4');
            note.setAttribute('duration', 'quarter');
            staff.appendChild(note);
          }
          measure.appendChild(staff);
          composition.appendChild(measure);
        }
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        keySigAttr: COMMON_ATTRIBUTES.KEY_SIG,
        modeAttr: COMMON_ATTRIBUTES.MODE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const groupByRow = async () =>
      page.evaluate(
        ({ compositionTag, measureTag, staffTag }) => {
          const composition = document.querySelector(compositionTag);
          if (composition === null) {
            throw new Error('composition missing');
          }
          const measures = Array.from(
            composition.querySelectorAll(measureTag)
          ) as HTMLElement[];
          const rows: {
            top: number;
            staves: boolean[];
            keySigVisible: boolean[];
          }[] = [];
          for (const measure of measures) {
            const top = measure.getBoundingClientRect().top;
            const staff = measure.querySelector(staffTag);
            if (staff === null) {
              throw new Error('staff missing');
            }
            const showDescribe = (staff as unknown as { showDescribe: boolean })
              .showDescribe;
            const keySigEl = staff.shadowRoot?.querySelector('.key-signature');
            const keySigHasContent =
              keySigEl !== null &&
              keySigEl !== undefined &&
              keySigEl.childElementCount > 0;
            const existingRow = rows.find((r) => Math.abs(r.top - top) <= 5);
            if (existingRow === undefined) {
              rows.push({
                top,
                staves: [showDescribe],
                keySigVisible: [keySigHasContent],
              });
            } else {
              existingRow.staves.push(showDescribe);
              existingRow.keySigVisible.push(keySigHasContent);
            }
          }
          return rows.map((r) => ({
            staves: r.staves,
            keySigVisible: r.keySigVisible,
          }));
        },
        {
          compositionTag: MUSIC_COMPOSITION,
          measureTag: MUSIC_MEASURE,
          staffTag: MUSIC_STAFF,
        }
      );

    const wideRows = await groupByRow();
    expect(wideRows.length).toBeGreaterThanOrEqual(1);
    for (const row of wideRows) {
      expect(row.staves[0]).toBe(true);
      expect(row.keySigVisible[0]).toBe(true);
      for (let i = 1; i < row.staves.length; i++) {
        expect(row.staves[i]).toBe(false);
        expect(row.keySigVisible[i]).toBe(false);
      }
    }

    await resizeHost(page, 400);
    await waitForRedrawCycle(page);

    const narrowRows = await groupByRow();
    expect(narrowRows.length).toBeGreaterThanOrEqual(2);
    for (const row of narrowRows) {
      expect(row.staves[0]).toBe(true);
      expect(row.keySigVisible[0]).toBe(true);
      for (let i = 1; i < row.staves.length; i++) {
        expect(row.staves[i]).toBe(false);
        expect(row.keySigVisible[i]).toBe(false);
      }
    }
  });

  async function buildTwoMeasureClefChange(
    page: import('@playwright/test').Page,
    hostWidth: number
  ): Promise<void> {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag, hostWidth }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = `${hostWidth}px`;

        const composition = document.createElement(compositionTag);

        const m1 = document.createElement(measureTag);
        const m1Staff = document.createElement(staffTag);
        m1Staff.setAttribute('clef', 'treble');
        const m1Note = document.createElement(noteTag);
        m1Note.setAttribute('note', 'C');
        m1Note.setAttribute('octave', '5');
        m1Note.setAttribute('duration', 'whole');
        m1Staff.appendChild(m1Note);
        m1.appendChild(m1Staff);

        const m2 = document.createElement(measureTag);
        const m2Staff = document.createElement(staffTag);
        m2Staff.setAttribute('clef', 'bass');
        const m2Note = document.createElement(noteTag);
        m2Note.setAttribute('note', 'C');
        m2Note.setAttribute('octave', '3');
        m2Note.setAttribute('duration', 'whole');
        m2Staff.appendChild(m2Note);
        m2.appendChild(m2Staff);

        composition.appendChild(m1);
        composition.appendChild(m2);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        hostWidth,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
  }

  test('mid-row measure-boundary clef change: second measure shows its clef even though not first-in-row, and no courtesy clef is drawn', async ({
    page,
  }) => {
    // Wide enough that both measures land on the same row.
    await buildTwoMeasureClefChange(page, 900);

    const result = await page.evaluate(
      ({ measureTag, overlaySelector }) => {
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        const tops = measures.map((m) =>
          Math.round(m.getBoundingClientRect().top)
        );
        const staves = measures.map(
          (m) =>
            Array.from(m.children).find(
              (el) =>
                el.nodeName === 'MUSIC-STAFF' ||
                el.nodeName.startsWith('MUSIC-STAFF-')
            ) as unknown as { clefChangeAtBoundary: boolean } | undefined
        );
        const composition = document.querySelector('music-composition');
        const overlay = composition?.shadowRoot?.querySelector(overlaySelector);
        return {
          sameRow: Math.abs(tops[1] - tops[0]) <= 5,
          secondClefChangeAtBoundary: staves[1]?.clefChangeAtBoundary ?? null,
          courtesyGlyphCount: overlay?.children.length ?? -1,
        };
      },
      { measureTag: MUSIC_MEASURE, overlaySelector: '.courtesy-clef-overlay' }
    );

    expect(result.sameRow).toBe(true);
    expect(result.secondClefChangeAtBoundary).toBe(true);
    expect(result.courtesyGlyphCount).toBe(0);
  });

  test('row-wrap clef change: outgoing staff gets a courtesy clef and incoming staff shows its clef despite not being first-in-row by default', async ({
    page,
  }) => {
    // Narrower than 2 measures' combined 100px CSS min-width, forcing each
    // measure onto its own row.
    await buildTwoMeasureClefChange(page, 150);

    const result = await page.evaluate(
      ({ measureTag, overlaySelector }) => {
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        const tops = measures.map((m) =>
          Math.round(m.getBoundingClientRect().top)
        );
        const staves = measures.map(
          (m) =>
            Array.from(m.children).find(
              (el) =>
                el.nodeName === 'MUSIC-STAFF' ||
                el.nodeName.startsWith('MUSIC-STAFF-')
            ) as unknown as { clefChangeAtBoundary: boolean } | undefined
        );
        const composition = document.querySelector('music-composition');
        const overlay = composition?.shadowRoot?.querySelector(overlaySelector);
        return {
          differentRows: Math.abs(tops[1] - tops[0]) > 5,
          secondClefChangeAtBoundary: staves[1]?.clefChangeAtBoundary ?? null,
          courtesyGlyphCount: overlay?.children.length ?? -1,
          // Bass and treble clef SVGs have distinct viewBox dimensions
          // (createBassClefSvg vs createTrebleClefSvg) — used below to
          // confirm the courtesy glyph previews the UPCOMING (bass) clef,
          // not a repeat of the outgoing (treble) one.
          courtesyGlyphHtml: overlay?.innerHTML ?? '',
        };
      },
      { measureTag: MUSIC_MEASURE, overlaySelector: '.courtesy-clef-overlay' }
    );

    expect(result.differentRows).toBe(true);
    // Second measure is first-in-its-row anyway, so this flag doesn't change
    // its visibility here — but it must still be set consistently.
    expect(result.secondClefChangeAtBoundary).toBe(true);
    expect(result.courtesyGlyphCount).toBe(1);
    // The courtesy clef must preview the incoming (bass) clef, not repeat
    // the outgoing (treble) one — this is the entire point of a courtesy
    // clef. Bass and treble clef glyphs have distinct SVG viewBox dimensions.
    expect(result.courtesyGlyphHtml).toContain('744.09');
    expect(result.courtesyGlyphHtml).not.toContain('165.4 496.2');
  });

  test('all measures share the same row when composition is inside a flex justify-center container (regression for 1-measure-per-row bug)', async ({
    page,
  }) => {
    // Replicates MusicScore.tsx: 3 measures (treble+bass, treble+bass+vocal-with-lyrics,
    // treble+bass) inside a flex justify-center parent with no explicit width on the
    // composition. Before :host { width: 100% }, the composition sized to the max-content
    // of its widest measure (~389px), causing each measure to wrap to its own row.
    await page.evaluate(
      ({
        compositionTag,
        measureTag,
        staffTag,
        staffVocalTag,
        noteTag,
        lyricsTag,
        keySigAttr,
        modeAttr,
        timeSigAttr,
      }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '1200px';
        host.style.display = 'flex';
        host.style.justifyContent = 'center';

        const composition = document.createElement(compositionTag);
        composition.setAttribute(keySigAttr, 'D');
        composition.setAttribute(modeAttr, 'major');
        composition.setAttribute(timeSigAttr, '4/4');

        // Measure 1: treble (4 quarter notes) + bass (1 note)
        const m1 = document.createElement(measureTag);
        const m1Treble = document.createElement(staffTag);
        m1Treble.setAttribute('clef', 'treble');
        for (const v of ['C4', 'D4', 'E4', 'F4']) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', v);
          note.setAttribute('duration', 'quarter');
          m1Treble.appendChild(note);
        }
        const m1Bass = document.createElement(staffTag);
        m1Bass.setAttribute('clef', 'bass');
        const m1BassNote = document.createElement(noteTag);
        m1BassNote.setAttribute('note', 'A');
        m1BassNote.setAttribute('duration', 'quarter');
        m1Bass.appendChild(m1BassNote);
        m1.appendChild(m1Treble);
        m1.appendChild(m1Bass);

        // Measure 2: treble (2 notes) + bass (2 notes) + vocal with 2 lyric verses
        const m2 = document.createElement(measureTag);
        const m2Treble = document.createElement(staffTag);
        m2Treble.setAttribute('clef', 'treble');
        for (const v of ['A', 'D']) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', v);
          note.setAttribute('duration', 'eighth');
          m2Treble.appendChild(note);
        }
        const m2Bass = document.createElement(staffTag);
        m2Bass.setAttribute('clef', 'bass');
        for (const v of ['A', 'A']) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', v);
          note.setAttribute('duration', 'quarter');
          m2Bass.appendChild(note);
        }
        const m2Vocal = document.createElement(staffVocalTag);
        m2Vocal.setAttribute('voice', 'soprano');
        const vocalValues = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'A5'];
        const vocalDurations = [
          'eighth',
          'eighth',
          'eighth',
          'eighth',
          'eighth',
          'eighth',
          'quarter',
        ];
        for (let i = 0; i < vocalValues.length; i++) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', vocalValues[i]);
          note.setAttribute('duration', vocalDurations[i]);
          m2Vocal.appendChild(note);
        }
        const lyrics1 = document.createElement(lyricsTag);
        lyrics1.setAttribute('verse', '1');
        lyrics1.textContent = 'Hap-py birth-day to_ you you_';
        const lyrics2 = document.createElement(lyricsTag);
        lyrics2.setAttribute('verse', '2');
        lyrics2.textContent = 'Hap-py birth-day dear_ friend friend_';
        m2Vocal.appendChild(lyrics1);
        m2Vocal.appendChild(lyrics2);
        m2.appendChild(m2Treble);
        m2.appendChild(m2Bass);
        m2.appendChild(m2Vocal);

        // Measure 3: treble (4 quarter notes) + bass (1 note)
        const m3 = document.createElement(measureTag);
        const m3Treble = document.createElement(staffTag);
        m3Treble.setAttribute('clef', 'treble');
        for (const v of ['A', 'A', 'A', 'A']) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', v);
          note.setAttribute('duration', 'quarter');
          m3Treble.appendChild(note);
        }
        const m3Bass = document.createElement(staffTag);
        m3Bass.setAttribute('clef', 'bass');
        const m3BassNote = document.createElement(noteTag);
        m3BassNote.setAttribute('note', 'A');
        m3BassNote.setAttribute('duration', 'quarter');
        m3Bass.appendChild(m3BassNote);
        m3.appendChild(m3Treble);
        m3.appendChild(m3Bass);

        composition.appendChild(m1);
        composition.appendChild(m2);
        composition.appendChild(m3);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        staffVocalTag: MUSIC_STAFF_VOCAL,
        noteTag: MUSIC_NOTE,
        lyricsTag: MUSIC_LYRICS,
        keySigAttr: COMMON_ATTRIBUTES.KEY_SIG,
        modeAttr: COMMON_ATTRIBUTES.MODE,
        timeSigAttr: COMMON_ATTRIBUTES.TIME_SIG,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const measureTops = await page.evaluate((measureTag) => {
      const measures = Array.from(
        document.querySelectorAll(measureTag)
      ) as HTMLElement[];
      return measures.map((m) => Math.round(m.getBoundingClientRect().top));
    }, MUSIC_MEASURE);

    expect(measureTops).toHaveLength(3);
    // Total minWidth across all measures (≈ 769px) is less than the 900px composition
    // grid, so all three should land on the same row.
    const [top0, top1, top2] = measureTops;
    expect(Math.abs(top1 - top0)).toBeLessThanOrEqual(5);
    expect(Math.abs(top2 - top0)).toBeLessThanOrEqual(5);

    // Shrink the host so measures must reflow to multiple rows.
    // At 500px the combined flex-basis of any two adjacent measures (≥ 579px)
    // exceeds the container, so each measure wraps to its own row.
    await resizeHost(page, 500);
    await waitForRedrawCycle(page);

    const topsAfterShrink = await page.evaluate((measureTag) => {
      const measures = Array.from(
        document.querySelectorAll(measureTag)
      ) as HTMLElement[];
      return measures.map((m) => Math.round(m.getBoundingClientRect().top));
    }, MUSIC_MEASURE);

    expect(topsAfterShrink).toHaveLength(3);
    // The last measure must have wrapped below the first measure.
    expect(topsAfterShrink[2]).toBeGreaterThan(topsAfterShrink[0] + 5);
  });

  test('#scheduleRedraw debounces a burst of resizes into one redraw', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);
        const treble = document.createElement(staffTag);
        const a = document.createElement(noteTag);
        a.setAttribute('note', 'C4');
        a.setAttribute('duration', 'quarter');
        a.setAttribute('tie', 'start');
        const b = document.createElement(noteTag);
        b.setAttribute('note', 'C4');
        b.setAttribute('duration', 'quarter');
        b.setAttribute('tie', 'end');
        treble.appendChild(a);
        treble.appendChild(b);
        measure.appendChild(treble);
        composition.appendChild(measure);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const mutationCount = await page.evaluate(async (compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      let mutations = 0;
      const observer = new MutationObserver((records) => {
        mutations += records.length;
      });
      observer.observe(overlay, { childList: true });

      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      const widths = [780, 760, 740, 720, 700];
      for (const w of widths) {
        host.style.width = `${w}px`;
      }

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => queueMicrotask(() => resolve()))
        )
      );
      observer.disconnect();
      return mutations;
    }, MUSIC_COMPOSITION);

    expect(mutationCount).toBeLessThanOrEqual(4);
  });

  test('cross measure ties — single connector arcs above on same row then splits into two segments on cross-row after resize', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '1200px';

        const composition = document.createElement(compositionTag);

        // Measure 1: C5 E5 G5 filler + C5 quarter tie=start
        const measure1 = document.createElement(measureTag);
        const staff1 = document.createElement(staffTag);
        for (const [note, octave] of [
          ['C', '5'],
          ['E', '5'],
          ['G', '5'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff1.appendChild(n);
        }
        const tieStart = document.createElement(noteTag);
        tieStart.setAttribute('note', 'C');
        tieStart.setAttribute('octave', '5');
        tieStart.setAttribute('duration', 'quarter');
        tieStart.setAttribute('tie', 'start');
        staff1.appendChild(tieStart);
        measure1.appendChild(staff1);

        // Measure 2: C5 half tie=end + E5 G5 filler
        const measure2 = document.createElement(measureTag);
        const staff2 = document.createElement(staffTag);
        const tieEnd = document.createElement(noteTag);
        tieEnd.setAttribute('note', 'C');
        tieEnd.setAttribute('octave', '5');
        tieEnd.setAttribute('duration', 'half');
        tieEnd.setAttribute('tie', 'end');
        staff2.appendChild(tieEnd);
        for (const [note, octave] of [
          ['E', '5'],
          ['G', '5'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff2.appendChild(n);
        }
        measure2.appendChild(staff2);

        composition.appendChild(measure1);
        composition.appendChild(measure2);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    // --- Phase 1: same row ---
    const sameRow = await page.evaluate(
      ({ compositionTag, noteTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        // Path coordinates are relative to .composition-wrapper (the rootRect used
        // in buildConnectorSvgs), not the composition element itself.
        const wrapper = composition.shadowRoot.querySelector(
          '.composition-wrapper'
        );
        if (overlay === null || wrapper === null) {
          throw new Error('overlay or wrapper missing');
        }
        const wrapperRect = wrapper.getBoundingClientRect();
        const paths = Array.from(
          overlay.querySelectorAll('path')
        ) as SVGPathElement[];
        const notes = Array.from(
          composition.querySelectorAll(noteTag)
        ) as HTMLElement[];

        // notes[3] = tie-start (4th note), notes[4] = tie-end (5th note)
        const startNoteRect = notes[3].getBoundingClientRect();
        const endNoteRect = notes[4].getBoundingClientRect();
        const startNoteCenterX =
          startNoteRect.left - wrapperRect.left + startNoteRect.width / 2;
        const endNoteCenterX =
          endNoteRect.left - wrapperRect.left + endNoteRect.width / 2;

        const d = paths[0]?.getAttribute('d') ?? '';
        const mMatch = d.match(/^M (\S+) (\S+)/);
        const qMatch = d.match(/Q (\S+) (\S+) (\S+) (\S+)$/);

        return {
          pathCount: paths.length,
          fromX: Number(mMatch?.[1] ?? '0'),
          fromY: Number(mMatch?.[2] ?? '0'),
          cx: Number(qMatch?.[1] ?? '0'),
          cy: Number(qMatch?.[2] ?? '0'),
          toX: Number(qMatch?.[3] ?? '0'),
          toY: Number(qMatch?.[4] ?? '0'),
          startNoteCenterX,
          endNoteCenterX,
        };
      },
      { compositionTag: MUSIC_COMPOSITION, noteTag: MUSIC_NOTE }
    );

    // One connector — both notes are on the same row
    expect(sameRow.pathCount).toBe(1);

    // Connector x-range spans from near the start note to near the end note
    expect(Math.abs(sameRow.fromX - sameRow.startNoteCenterX)).toBeLessThan(20);
    expect(Math.abs(sameRow.toX - sameRow.endNoteCenterX)).toBeLessThan(20);

    // C5 is above the staff middle line → stem-down → tie must arc ABOVE the notehead
    expect(sameRow.cy).toBeLessThan(sameRow.fromY);
    expect(sameRow.cy).toBeLessThan(sameRow.toY);

    // --- Phase 2: cross-row after resize ---
    await resizeHost(page, 200);
    await waitForRedrawCycle(page);

    const crossRow = await page.evaluate(
      ({ compositionTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        if (overlay === null) {
          throw new Error('overlay missing');
        }
        const paths = Array.from(
          overlay.querySelectorAll('path')
        ) as SVGPathElement[];

        const parseSegment = (d: string) => {
          const mMatch = d.match(/^M (\S+) (\S+)/);
          const qMatch = d.match(/Q (\S+) (\S+) (\S+) (\S+)$/);
          return {
            fromX: Number(mMatch?.[1] ?? '0'),
            fromY: Number(mMatch?.[2] ?? '0'),
            cx: Number(qMatch?.[1] ?? '0'),
            cy: Number(qMatch?.[2] ?? '0'),
            toX: Number(qMatch?.[3] ?? '0'),
            toY: Number(qMatch?.[4] ?? '0'),
          };
        };

        return {
          pathCount: paths.length,
          first: parseSegment(paths[0]?.getAttribute('d') ?? ''),
          second: parseSegment(paths[1]?.getAttribute('d') ?? ''),
        };
      },
      { compositionTag: MUSIC_COMPOSITION }
    );

    // Cross-row produces two path segments
    expect(crossRow.pathCount).toBe(2);

    // First segment: runs from the start-note anchor to the row-right edge
    expect(crossRow.first.toX).toBeGreaterThan(crossRow.first.fromX);

    // Second segment: starts at the row-left edge (notes area start, after the
    // clef — typically ~40-80px from the left)
    expect(crossRow.second.fromX).toBeLessThan(100);

    // Both segments arc above (cy < fromY) — C5 is stem-down
    expect(crossRow.first.cy).toBeLessThan(crossRow.first.fromY);
    expect(crossRow.second.cy).toBeLessThan(crossRow.second.fromY);
  });

  test('cross-measure hairpin on the same row renders as a single segment', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '1200px';

        const composition = document.createElement(compositionTag);

        const measure1 = document.createElement(measureTag);
        const staff1 = document.createElement(staffTag);
        for (const [note, octave] of [
          ['C', '5'],
          ['D', '5'],
          ['E', '5'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff1.appendChild(n);
        }
        const crescendoStart = document.createElement(noteTag);
        crescendoStart.setAttribute('note', 'F');
        crescendoStart.setAttribute('octave', '5');
        crescendoStart.setAttribute('duration', 'quarter');
        crescendoStart.setAttribute('crescendo', 'start');
        staff1.appendChild(crescendoStart);
        measure1.appendChild(staff1);

        const measure2 = document.createElement(measureTag);
        const staff2 = document.createElement(staffTag);
        const crescendoEnd = document.createElement(noteTag);
        crescendoEnd.setAttribute('note', 'G');
        crescendoEnd.setAttribute('octave', '5');
        crescendoEnd.setAttribute('duration', 'quarter');
        crescendoEnd.setAttribute('crescendo', 'end');
        staff2.appendChild(crescendoEnd);
        for (const [note, octave] of [
          ['A', '5'],
          ['B', '5'],
          ['C', '6'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff2.appendChild(n);
        }
        measure2.appendChild(staff2);

        composition.appendChild(measure1);
        composition.appendChild(measure2);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const hairpinCount = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      return overlay.querySelectorAll('g.hairpin').length;
    }, MUSIC_COMPOSITION);

    // Both notes are on the same row (different staves, same measure row) —
    // resolveHairpinSegments' same-row branch renders exactly one segment.
    expect(hairpinCount).toBe(1);
  });

  test('cross-system hairpin splits into two segments with correct edges and stays open (decrescendo)', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '1200px';

        const composition = document.createElement(compositionTag);

        const measure1 = document.createElement(measureTag);
        const staff1 = document.createElement(staffTag);
        for (const [note, octave] of [
          ['C', '5'],
          ['D', '5'],
          ['E', '5'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff1.appendChild(n);
        }
        const decrescendoStart = document.createElement(noteTag);
        decrescendoStart.setAttribute('note', 'F');
        decrescendoStart.setAttribute('octave', '5');
        decrescendoStart.setAttribute('duration', 'quarter');
        decrescendoStart.setAttribute('decrescendo', 'start');
        staff1.appendChild(decrescendoStart);
        measure1.appendChild(staff1);

        const measure2 = document.createElement(measureTag);
        const staff2 = document.createElement(staffTag);
        const decrescendoEnd = document.createElement(noteTag);
        decrescendoEnd.setAttribute('note', 'G');
        decrescendoEnd.setAttribute('octave', '5');
        decrescendoEnd.setAttribute('duration', 'quarter');
        decrescendoEnd.setAttribute('decrescendo', 'end');
        staff2.appendChild(decrescendoEnd);
        for (const [note, octave] of [
          ['A', '5'],
          ['B', '5'],
          ['C', '6'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff2.appendChild(n);
        }
        measure2.appendChild(staff2);

        composition.appendChild(measure1);
        composition.appendChild(measure2);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    await resizeHost(page, 200);
    await waitForRedrawCycle(page);

    const segments = await page.evaluate((compositionTag) => {
      const composition = document.querySelector(compositionTag);
      if (composition === null || composition.shadowRoot === null) {
        throw new Error('composition not ready');
      }
      const overlay = composition.shadowRoot.querySelector(
        '.connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('overlay missing');
      }
      const groups = Array.from(
        overlay.querySelectorAll('g.hairpin')
      ) as SVGGElement[];

      const parseLine = (d: string) => {
        const match = d.match(/^M (\S+) (\S+) L (\S+) (\S+)$/);
        return {
          fromX: Number(match?.[1] ?? '0'),
          fromY: Number(match?.[2] ?? '0'),
          toX: Number(match?.[3] ?? '0'),
          toY: Number(match?.[4] ?? '0'),
        };
      };

      const wrapper = composition.shadowRoot.querySelector(
        '.composition-wrapper'
      );
      const staffs = Array.from(
        document.querySelectorAll('music-staff')
      ) as HTMLElement[];
      if (wrapper === null || staffs.length !== 2) {
        throw new Error('staves not ready');
      }
      const rootRect = wrapper.getBoundingClientRect();
      const [staff1, staff2] = staffs;
      const describeContainer2 = staff2.shadowRoot?.querySelector(
        '.describe-container'
      );
      if (describeContainer2 === null || describeContainer2 === undefined) {
        throw new Error('describe container missing');
      }

      return {
        segments: groups.map((g) => {
          const paths = Array.from(
            g.querySelectorAll('path')
          ) as SVGPathElement[];
          return {
            top: parseLine(paths[0]?.getAttribute('d') ?? ''),
            bottom: parseLine(paths[1]?.getAttribute('d') ?? ''),
          };
        }),
        expectedRowRight: staff1.getBoundingClientRect().right - rootRect.left,
        expectedRowLeft:
          describeContainer2.getBoundingClientRect().right - rootRect.left,
      };
    }, MUSIC_COMPOSITION);

    expect(segments.segments).toHaveLength(2);
    const [first, second] = segments.segments;

    // First segment ends exactly at the row-right edge (staff1's own right
    // edge — see composition.ts pairRowRight computation).
    expect(first.top.toX).toBeCloseTo(segments.expectedRowRight, 0);
    expect(first.bottom.toX).toBeCloseTo(segments.expectedRowRight, 0);

    // Second segment starts exactly at the row-left edge (notes area start of
    // staff2, after its clef — see composition.ts pairRowLeft computation).
    expect(second.top.fromX).toBeCloseTo(segments.expectedRowLeft, 0);
    expect(second.bottom.fromX).toBeCloseTo(segments.expectedRowLeft, 0);

    // Decrescendo, first segment: right end "remains open" at the system edge
    // (top/bottom haven't converged to a point) per the engraving rule in
    // resolveHairpinSegments' openAtEnd handling.
    expect(Math.abs(first.top.toY - first.bottom.toY)).toBeGreaterThan(1);

    // Second segment starts already-open (signalling the change was in
    // progress on the previous system) and converges to a point at its end.
    const openHeightAtStart = Math.abs(second.top.fromY - second.bottom.fromY);
    const openHeightAtEnd = Math.abs(second.top.toY - second.bottom.toY);
    expect(openHeightAtStart).toBeGreaterThan(openHeightAtEnd);
    expect(openHeightAtEnd).toBeLessThan(1);
  });

  test('adding a crescendo attribute after render triggers a hairpin redraw without a resize (regression: composition must listen for dynamic-attribute-change)', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '200px';

        const composition = document.createElement(compositionTag);

        const measure1 = document.createElement(measureTag);
        const staff1 = document.createElement(staffTag);
        for (const [note, octave] of [
          ['C', '5'],
          ['D', '5'],
          ['E', '5'],
          ['F', '5'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff1.appendChild(n);
        }
        measure1.appendChild(staff1);

        const measure2 = document.createElement(measureTag);
        const staff2 = document.createElement(staffTag);
        for (const [note, octave] of [
          ['G', '5'],
          ['A', '5'],
          ['B', '5'],
          ['C', '6'],
        ] as const) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', note);
          n.setAttribute('octave', octave);
          n.setAttribute('duration', 'quarter');
          staff2.appendChild(n);
        }
        measure2.appendChild(staff2);

        composition.appendChild(measure1);
        composition.appendChild(measure2);
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const countHairpins = () =>
      page.evaluate((compositionTag) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        if (overlay === null) {
          throw new Error('overlay missing');
        }
        return overlay.querySelectorAll('g.hairpin').length;
      }, MUSIC_COMPOSITION);

    expect(await countHairpins()).toBe(0);

    // Mutate crescendo attributes only — no resize, no slotchange, no
    // connector-attribute-change. The composition should still redraw via its
    // dynamic-attribute-change listener.
    await page.evaluate((staffTag) => {
      const staves = Array.from(
        document.querySelectorAll(staffTag)
      ) as HTMLElement[];
      const [staff1, staff2] = staves;
      const lastNoteOfStaff1 = staff1.children[
        staff1.children.length - 1
      ] as HTMLElement;
      const firstNoteOfStaff2 = staff2.children[0] as HTMLElement;
      lastNoteOfStaff1.setAttribute('crescendo', 'start');
      firstNoteOfStaff2.setAttribute('crescendo', 'end');
    }, MUSIC_STAFF);
    await waitForRedrawCycle(page);

    // Staves are on separate rows (200px host), so the new hairpin renders as
    // a two-segment cross-system split.
    expect(await countHairpins()).toBe(2);
  });
});
