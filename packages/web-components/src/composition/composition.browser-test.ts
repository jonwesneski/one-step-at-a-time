import { expect, type Page, test } from '@playwright/test';
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
  MUSIC_STAFF_GUITAR_TAB,
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

  test('empty measures keep their clef flush left and unscaled as they wrap across rows (regression: stale viewBox on note-less resize)', async ({
    page,
  }) => {
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
          staff.setAttribute('clef', 'treble');
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
    await waitForRedrawCycle(page);

    const readStaffGeometry = () =>
      page.evaluate((staffTag) => {
        const staves = Array.from(
          document.querySelectorAll(staffTag)
        ) as HTMLElement[];
        return staves.map((staff) => {
          if (staff.shadowRoot === null) {
            throw new Error('staff not ready');
          }
          const transcribeContainer = staff.shadowRoot.querySelector(
            '.transcribe-container'
          ) as SVGSVGElement | null;
          if (transcribeContainer === null) {
            throw new Error('transcribe container missing');
          }
          const containerRect = transcribeContainer.getBoundingClientRect();
          const viewBox = transcribeContainer.viewBox.baseVal;
          const clef = staff.shadowRoot.querySelector(
            '.describe-container .clef'
          );
          const clefRect = clef !== null ? clef.getBoundingClientRect() : null;
          return {
            containerWidth: containerRect.width,
            viewBoxWidth: viewBox.width,
            clefOffsetX:
              clefRect !== null ? clefRect.left - containerRect.left : null,
            clefWidth: clefRect !== null ? clefRect.width : null,
          };
        });
      }, MUSIC_STAFF);

    // At 900px only M1 (row 1) and M4 (alone in row 2, stretched to fill it)
    // show a clef; that's expected — nothing has resized yet.
    const wide = await readStaffGeometry();
    expect(wide).toHaveLength(4);
    for (const staff of wide) {
      expect(staff.viewBoxWidth).toBeCloseTo(staff.containerWidth, 0);
    }

    // Narrow further so every measure wraps onto its own row — each becomes
    // first (and only) in its row, so every staff now shows a clef. M1-M3's
    // actual width shrinks from their original 300px flex-basis share, and
    // M4's shrinks from the full 900px it was stretched to fill.
    await resizeHost(page, 250);

    const narrow = await readStaffGeometry();
    expect(narrow).toHaveLength(4);
    for (const staff of narrow) {
      expect(staff.viewBoxWidth).toBeCloseTo(staff.containerWidth, 0);
      expect(staff.clefOffsetX).not.toBeNull();
      expect(staff.clefWidth).not.toBeNull();
    }

    // With viewBox tracking the container 1:1, the clef's fixed pixel
    // offset (CLEF_X_OFFSET) renders unscaled — every staff should show the
    // same left offset and the same glyph width, regardless of which row it
    // wrapped to or how wide that staff used to be.
    const offsets = narrow.map((s) => s.clefOffsetX as number);
    const widths = narrow.map((s) => s.clefWidth as number);
    for (let i = 1; i < offsets.length; i++) {
      expect(Math.abs(offsets[i] - offsets[0])).toBeLessThan(1);
      expect(Math.abs(widths[i] - widths[0])).toBeLessThan(1);
    }
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

  test('a genuine clef boundary settles instead of perpetually rescheduling redraws (regression: reset-then-set two-pass assignment)', async ({
    page,
  }) => {
    await buildTwoMeasureClefChange(page, 900);
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const staffNotesPositionedCount = await page.evaluate(async () => {
      let count = 0;
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.addEventListener('staff-notes-positioned', () => {
        count++;
      });

      await new Promise<void>((resolve) => {
        let frame = 0;
        const tick = () => {
          frame++;
          if (frame >= 10) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      return count;
    });

    expect(staffNotesPositionedCount).toBe(0);
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

  async function buildTimeSignatureComposition(
    page: import('@playwright/test').Page,
    measureTimes: (string | null)[],
    options?: { includeGuitarTab?: boolean }
  ): Promise<void> {
    await page.evaluate(
      ({
        compositionTag,
        measureTag,
        staffTag,
        guitarTabTag,
        noteTag,
        measureTimes,
        includeGuitarTab,
      }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';

        const composition = document.createElement(compositionTag);

        measureTimes.forEach((time) => {
          const measure = document.createElement(measureTag);

          const staff = document.createElement(staffTag);
          staff.setAttribute('clef', 'treble');
          if (time !== null) {
            staff.setAttribute('time', time);
          }
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'C');
          note.setAttribute('octave', '5');
          note.setAttribute('duration', 'whole');
          staff.appendChild(note);
          measure.appendChild(staff);

          if (includeGuitarTab) {
            const tabStaff = document.createElement(guitarTabTag);
            const tabNote = document.createElement(noteTag);
            tabNote.setAttribute('note', 'C');
            tabNote.setAttribute('octave', '4');
            tabNote.setAttribute('duration', 'whole');
            tabStaff.appendChild(tabNote);
            measure.appendChild(tabStaff);
          }

          composition.appendChild(measure);
        });

        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        guitarTabTag: MUSIC_STAFF_GUITAR_TAB,
        noteTag: MUSIC_NOTE,
        measureTimes,
        includeGuitarTab: options?.includeGuitarTab ?? false,
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
  }

  async function getTimeSignatureVisibilityPerMeasure(
    page: import('@playwright/test').Page
  ): Promise<boolean[]> {
    return page.evaluate((measureTag) => {
      const measures = Array.from(
        document.querySelectorAll(measureTag)
      ) as HTMLElement[];
      return measures.map((m) => {
        const staff = Array.from(m.children).find(
          (el) => el.nodeName === 'MUSIC-STAFF'
        );
        const timeSig = staff?.shadowRoot?.querySelector('.time-signature');
        return timeSig !== null && timeSig !== undefined;
      });
    }, MUSIC_MEASURE);
  }

  async function getTimeSignatureTextPerMeasure(
    page: import('@playwright/test').Page
  ): Promise<(string | null)[]> {
    return page.evaluate((measureTag) => {
      const measures = Array.from(
        document.querySelectorAll(measureTag)
      ) as HTMLElement[];
      return measures.map((m) => {
        const staff = Array.from(m.children).find(
          (el) => el.nodeName === 'MUSIC-STAFF'
        );
        return (
          staff?.shadowRoot?.querySelector('.time-signature')?.textContent ??
          null
        );
      });
    }, MUSIC_MEASURE);
  }

  test('time signature only renders on the first measure when the time signature never changes', async ({
    page,
  }) => {
    await buildTimeSignatureComposition(page, ['4/4', '4/4', '4/4']);

    const visibility = await getTimeSignatureVisibilityPerMeasure(page);

    expect(visibility).toEqual([true, false, false]);
  });

  test('time signature renders again on a measure that changes it mid-composition', async ({
    page,
  }) => {
    await buildTimeSignatureComposition(page, ['4/4', '4/4', '3/4']);

    const visibility = await getTimeSignatureVisibilityPerMeasure(page);

    expect(visibility).toEqual([true, false, true]);
  });

  test('time signature renders again when a measure redefines the original signature after a change', async ({
    page,
  }) => {
    await buildTimeSignatureComposition(page, ['4/4', '3/4', '4/4']);

    const visibility = await getTimeSignatureVisibilityPerMeasure(page);

    expect(visibility).toEqual([true, true, true]);
  });

  test('time signature continuity check compares a guitar tab staff pair without throwing and does not disturb the classical staff pair', async ({
    page,
  }) => {
    await buildTimeSignatureComposition(page, ['4/4', '3/4', '4/4'], {
      includeGuitarTab: true,
    });

    const visibility = await getTimeSignatureVisibilityPerMeasure(page);

    expect(visibility).toEqual([true, true, true]);

    const timeChangeAtBoundaryPerMeasure = await page.evaluate((measureTag) => {
      const measures = Array.from(
        document.querySelectorAll(measureTag)
      ) as HTMLElement[];
      return measures.map((m) => {
        const staff = Array.from(m.children).find(
          (el) => el.nodeName === 'MUSIC-STAFF'
        ) as unknown as { timeChangeAtBoundary: boolean } | undefined;
        return staff?.timeChangeAtBoundary ?? null;
      });
    }, MUSIC_MEASURE);

    // Mirrors `visibility` above: the flag drives the glyph, so it should be
    // false on the first measure (visibility comes from "first measure",
    // not the boundary flag) and true on every later measure whose time
    // differs from its predecessor.
    expect(timeChangeAtBoundaryPerMeasure).toEqual([false, true, true]);
  });

  test('time signature reappears (with the new meter) after measure 1 is replaced by a fresh node (rebar remount)', async ({
    page,
  }) => {
    await buildTimeSignatureComposition(page, ['4/4', '4/4']);
    expect(await getTimeSignatureTextPerMeasure(page)).toEqual(['44', null]);

    // Replace measure 1 with a brand-new node carrying a *different* meter —
    // what a rebar does. Its staff connects before the composition's
    // MutationObserver writes `number`, so the "first measure" glyph only
    // survives if that decision is made from live DOM position, not `number`.
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const composition = document.querySelector(compositionTag);
        const oldFirst = composition?.querySelector(measureTag);
        if (composition == null || oldFirst == null) {
          throw new Error('composition/measure missing');
        }
        const measure = document.createElement(measureTag);
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');
        staff.setAttribute('time', '3/4');
        const note = document.createElement(noteTag);
        note.setAttribute('note', 'C');
        note.setAttribute('octave', '5');
        note.setAttribute('duration', 'half');
        staff.appendChild(note);
        measure.appendChild(staff);
        composition.replaceChild(measure, oldFirst);
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

    // Measure 1 shows the remounted meter (3/4); measure 2 now shows 4/4 as a
    // real mid-piece change at the barline.
    expect(await getTimeSignatureTextPerMeasure(page)).toEqual(['34', '44']);
  });

  test('grand-staff first measure keeps its time signature through a multi-measure remount', async ({
    page,
  }) => {
    // A grand staff in each measure; the reported failure was a rebar to 1/4
    // that remounted several such measures at once.
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag, clefs, times }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';
        const composition = document.createElement(compositionTag);
        times.forEach((time) => {
          const measure = document.createElement(measureTag);
          clefs.forEach((clef) => {
            const staff = document.createElement(staffTag);
            staff.setAttribute('clef', clef);
            staff.setAttribute('time', time);
            const note = document.createElement(noteTag);
            note.setAttribute('note', 'C');
            note.setAttribute('octave', '4');
            note.setAttribute('duration', 'whole');
            staff.appendChild(note);
            measure.appendChild(staff);
          });
          composition.appendChild(measure);
        });
        host.appendChild(composition);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        clefs: ['treble', 'bass'],
        times: ['4/4'],
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    // Replace the one measure and append two more fresh 1/4 measures in one
    // commit (3 measures, uniform meter).
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag, clefs }) => {
        const composition = document.querySelector(compositionTag);
        const oldFirst = composition?.querySelector(measureTag);
        if (composition == null || oldFirst == null) {
          throw new Error('composition/measure missing');
        }
        const makeMeasure = () => {
          const measure = document.createElement(measureTag);
          clefs.forEach((clef) => {
            const staff = document.createElement(staffTag);
            staff.setAttribute('clef', clef);
            staff.setAttribute('time', '1/4');
            const note = document.createElement(noteTag);
            note.setAttribute('note', 'C');
            note.setAttribute('octave', '4');
            note.setAttribute('duration', 'quarter');
            staff.appendChild(note);
            measure.appendChild(staff);
          });
          return measure;
        };
        composition.replaceChild(makeMeasure(), oldFirst);
        composition.appendChild(makeMeasure());
        composition.appendChild(makeMeasure());
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        clefs: ['treble', 'bass'],
      }
    );
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const perMeasure = await page.evaluate((measureTag) => {
      return Array.from(document.querySelectorAll(measureTag)).map((m) =>
        Array.from(m.children)
          .filter((el) => el.nodeName === 'MUSIC-STAFF')
          .map(
            (s) =>
              s.shadowRoot?.querySelector('.time-signature')?.textContent ??
              null
          )
      );
    }, MUSIC_MEASURE);

    expect(perMeasure).toEqual([
      ['14', '14'],
      [null, null],
      [null, null],
    ]);
  });

  test('after a full remount that wraps to a second row: clef + key sig repeat per row, time signature stays on measure 1 only', async ({
    page,
  }) => {
    // Build one wide row (D major so the key signature has visible content).
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
        // Narrow enough that the remounted 6 measures below wrap; kept constant
        // for the whole test so no host resize is involved.
        host.style.width = '640px';
        const composition = document.createElement(compositionTag);
        composition.setAttribute(keySigAttr, 'D');
        composition.setAttribute(modeAttr, 'major');
        for (let m = 0; m < 2; m++) {
          const measure = document.createElement(measureTag);
          const staff = document.createElement(staffTag);
          staff.setAttribute('clef', 'treble');
          for (let n = 0; n < 4; n++) {
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

    // Full remount (what a rebar does): drop every measure and add fresh ones.
    // 6 measures at 640px wrap to a second row on their own — no host resize.
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition == null) {
          throw new Error('composition missing');
        }
        composition.querySelectorAll(measureTag).forEach((m) => m.remove());
        for (let m = 0; m < 6; m++) {
          const measure = document.createElement(measureTag);
          const staff = document.createElement(staffTag);
          staff.setAttribute('clef', 'treble');
          for (let n = 0; n < 4; n++) {
            const note = document.createElement(noteTag);
            note.setAttribute('note', 'D4');
            note.setAttribute('duration', 'quarter');
            staff.appendChild(note);
          }
          measure.appendChild(staff);
          composition.appendChild(measure);
        }
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

    const rows = await page.evaluate(
      ({ compositionTag, measureTag, staffTag }) => {
        const measures = Array.from(
          document
            .querySelector(compositionTag)
            ?.querySelectorAll(measureTag) ?? []
        ) as HTMLElement[];
        const grouped: {
          top: number;
          cells: { clef: boolean; keySig: boolean; timeSig: boolean }[];
        }[] = [];
        for (const measure of measures) {
          const top = Math.round(measure.getBoundingClientRect().top);
          const staff = measure.querySelector(staffTag);
          const describe = staff?.shadowRoot?.querySelector(
            '.describe-container'
          );
          const cell = {
            clef: describe?.querySelector('svg.clef') != null,
            keySig:
              (describe?.querySelector('.key-signature')?.childElementCount ??
                0) > 0,
            timeSig: describe?.querySelector('.time-signature') != null,
          };
          const row = grouped.find((r) => Math.abs(r.top - top) <= 5);
          if (row === undefined) {
            grouped.push({ top, cells: [cell] });
          } else {
            row.cells.push(cell);
          }
        }
        return grouped.map((r) => r.cells);
      },
      {
        compositionTag: MUSIC_COMPOSITION,
        measureTag: MUSIC_MEASURE,
        staffTag: MUSIC_STAFF,
      }
    );

    expect(rows.length).toBeGreaterThanOrEqual(2);
    rows.forEach((row, rowIndex) => {
      // Clef + key signature repeat on the first measure of every row.
      expect(row[0].clef).toBe(true);
      expect(row[0].keySig).toBe(true);
      for (let i = 1; i < row.length; i++) {
        expect(row[i].clef).toBe(false);
        expect(row[i].keySig).toBe(false);
      }
      // Time signature only on the very first measure of the piece — never
      // repeated per row.
      row.forEach((cell, colIndex) => {
        expect(cell.timeSig).toBe(rowIndex === 0 && colIndex === 0);
      });
    });
  });

  test('all measures share the same row when composition is inside a flex justify-center container (regression for 1-measure-per-row bug)', async ({
    page,
  }) => {
    // Replicates MusicScore.tsx: 3 measures (treble+bass, treble+bass+vocal-with-lyrics,
    // treble+bass) inside a flex justify-center parent with no explicit width on the
    // composition. Before :host { width: 100% }, the composition sized to the max-content
    // of its widest measure (~389px), causing each measure to wrap to its own row.
    // max-width is raised to match the host so the test isn't coupled to the exact
    // natural-width formula — the default 900px cap is narrower than these three
    // measures' combined beat-proportional natural width.
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
        composition.setAttribute('max-width', '1200');

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
        timeSigAttr: COMMON_ATTRIBUTES.TIME,
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
    // Combined natural width across all measures fits under the 1200px cap,
    // so all three should land on the same row.
    const [top0, top1, top2] = measureTops;
    expect(Math.abs(top1 - top0)).toBeLessThanOrEqual(5);
    expect(Math.abs(top2 - top0)).toBeLessThanOrEqual(5);

    // Shrink the host so measures must reflow to multiple rows — well below
    // the combined natural width, so at least the last measure must wrap.
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

  test.describe('trill continuation across measures', () => {
    // Measure 1: 3 quarter fillers + a trill+tie=start quarter (4 beats).
    // Measure 2: a tie=end half (continuing the tie, no `trill` attribute of
    // its own) + 2 quarter fillers (4 beats). The trill's own tie chain
    // carries the line across the barline with no repeated `trill`.
    async function buildTiedTrillAcrossMeasures(
      page: Page,
      hostWidth: number,
      trillContinuation?: 'bracketed' | 'line-only'
    ): Promise<void> {
      await page.evaluate(
        ({
          compositionTag,
          measureTag,
          staffTag,
          noteTag,
          continuation,
          hostWidthPx,
        }) => {
          const host = document.getElementById('host');
          if (host === null) {
            throw new Error('host missing');
          }
          host.innerHTML = '';
          host.style.width = `${hostWidthPx}px`;

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
          const trillStart = document.createElement(noteTag);
          trillStart.setAttribute('note', 'F');
          trillStart.setAttribute('octave', '5');
          trillStart.setAttribute('duration', 'quarter');
          trillStart.setAttribute('trill', '');
          trillStart.setAttribute('tie', 'start');
          if (continuation) {
            trillStart.setAttribute('trill-continuation', continuation);
          }
          staff1.appendChild(trillStart);
          measure1.appendChild(staff1);

          const measure2 = document.createElement(measureTag);
          const staff2 = document.createElement(staffTag);
          const tieEnd = document.createElement(noteTag);
          tieEnd.setAttribute('note', 'F');
          tieEnd.setAttribute('octave', '5');
          tieEnd.setAttribute('duration', 'half');
          tieEnd.setAttribute('tie', 'end');
          staff2.appendChild(tieEnd);
          for (const [note, octave] of [
            ['G', '5'],
            ['A', '5'],
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
          continuation: trillContinuation,
          hostWidthPx: hostWidth,
        }
      );
      await waitForRedrawCycle(page);
      await waitForRedrawCycle(page);
    }

    async function readTrillContinuationOverlay(page: Page) {
      return page.evaluate((compositionTag) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.trill-continuation-overlay'
        );
        const wrapper = composition.shadowRoot.querySelector(
          '.composition-wrapper'
        );
        if (overlay === null || wrapper === null) {
          throw new Error('overlay or wrapper missing');
        }
        const wrapperRect = wrapper.getBoundingClientRect();
        const lines = Array.from(
          overlay.querySelectorAll('g.trill-line')
        ) as SVGGElement[];
        const signs = Array.from(
          overlay.querySelectorAll('g.trill-continuation-sign')
        ) as SVGGElement[];
        const staves = Array.from(
          composition.querySelectorAll('music-staff')
        ) as HTMLElement[];
        const secondStaffRect = staves[1].getBoundingClientRect();
        return {
          lineCount: lines.length,
          signCount: signs.length,
          parenthesisCountInSign:
            signs[0]?.querySelectorAll('.trill-parenthesis').length ?? 0,
          signGlyphCount:
            signs[0]?.querySelectorAll('.trill-sign-glyph').length ?? 0,
          signRight: signs[0]
            ? signs[0].getBoundingClientRect().right - wrapperRect.left
            : null,
          lineLeft: lines[0]
            ? lines[0].getBoundingClientRect().left - wrapperRect.left
            : null,
          secondStaffLeft: secondStaffRect.left - wrapperRect.left,
        };
      }, MUSIC_COMPOSITION);
    }

    test('resumes on the same row with no restated sign', async ({ page }) => {
      await buildTiedTrillAcrossMeasures(page, 1200);
      const result = await readTrillContinuationOverlay(page);
      expect(result.lineCount).toBe(1);
      expect(result.signCount).toBe(0);
      // The resumed line starts at or after the second measure's own left
      // edge (it begins inside that measure's notes area, past the barline).
      expect(result.lineLeft).not.toBeNull();
      expect(result.lineLeft as number).toBeGreaterThanOrEqual(
        result.secondStaffLeft - 1
      );
    });

    test('restates a bracketed sign at the start of a new row (default)', async ({
      page,
    }) => {
      await buildTiedTrillAcrossMeasures(page, 220);
      const result = await readTrillContinuationOverlay(page);
      expect(result.lineCount).toBe(1);
      expect(result.signCount).toBe(1);
      expect(result.parenthesisCountInSign).toBe(2);
      expect(result.signGlyphCount).toBe(1);
      // The line resumes clear of the restated sign's own right edge.
      expect(result.lineLeft).not.toBeNull();
      expect(result.signRight).not.toBeNull();
      expect(result.lineLeft as number).toBeGreaterThan(
        result.signRight as number
      );
    });

    test('`trill-continuation="line-only"` suppresses the restated sign at a row wrap', async ({
      page,
    }) => {
      await buildTiedTrillAcrossMeasures(page, 220, 'line-only');
      const result = await readTrillContinuationOverlay(page);
      expect(result.lineCount).toBe(1);
      expect(result.signCount).toBe(0);
      // With no sign to clear, the line starts right at the new row's own
      // notes area, same as the same-row case.
      expect(result.lineLeft).not.toBeNull();
      expect(result.lineLeft as number).toBeGreaterThanOrEqual(
        result.secondStaffLeft - 1
      );
    });
  });
});

test.describe(`${MUSIC_COMPOSITION} cross-staff slurs (grand staff)`, () => {
  // composition.ts's own #redrawConnectors() collects note-like elements
  // across every staff in every measure with no staff filter, so a slur
  // whose start/end land on two different sibling staves should already
  // pair and render — this verifies that's actually true, not assumed.
  test('a slur from the treble staff to the bass staff renders one curve spanning both endpoints', async ({
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
        treble.setAttribute('clef', 'treble');
        treble.setAttribute('group', 'grand');
        const trebleStart = document.createElement(noteTag);
        trebleStart.setAttribute('note', 'C');
        trebleStart.setAttribute('octave', '5');
        trebleStart.setAttribute('duration', 'quarter');
        trebleStart.setAttribute('slur', 'start');
        trebleStart.setAttribute('id', 'slur-start');
        treble.appendChild(trebleStart);
        for (const value of ['D', 'E', 'F']) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', value);
          note.setAttribute('octave', '5');
          note.setAttribute('duration', 'quarter');
          treble.appendChild(note);
        }

        const bass = document.createElement(staffTag);
        bass.setAttribute('clef', 'bass');
        const bassA = document.createElement(noteTag);
        bassA.setAttribute('note', 'C');
        bassA.setAttribute('octave', '4');
        bassA.setAttribute('duration', 'half');
        bass.appendChild(bassA);
        const bassEnd = document.createElement(noteTag);
        bassEnd.setAttribute('note', 'G');
        bassEnd.setAttribute('octave', '3');
        bassEnd.setAttribute('duration', 'half');
        bassEnd.setAttribute('slur', 'end');
        bassEnd.setAttribute('for', 'slur-start');
        bass.appendChild(bassEnd);

        measure.appendChild(treble);
        measure.appendChild(bass);
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

    const result = await page.evaluate(
      ({ compositionTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null || composition.shadowRoot === null) {
          throw new Error('composition not ready');
        }
        const overlay = composition.shadowRoot.querySelector(
          '.connectors-overlay'
        );
        const paths = overlay
          ? (Array.from(overlay.querySelectorAll('path')) as SVGPathElement[])
          : [];
        const start = document.getElementById('slur-start');
        const end = document.querySelector('[for="slur-start"]');
        return {
          pathCount: paths.length,
          pathBBox: paths.length > 0 ? paths[0].getBoundingClientRect() : null,
          startRect: start?.getBoundingClientRect() ?? null,
          endRect: end?.getBoundingClientRect() ?? null,
        };
      },
      { compositionTag: MUSIC_COMPOSITION }
    );

    expect(result.pathCount).toBeGreaterThanOrEqual(1);
    expect(result.pathBBox).not.toBeNull();
    expect(result.startRect).not.toBeNull();
    expect(result.endRect).not.toBeNull();
    if (
      result.pathBBox === null ||
      result.startRect === null ||
      result.endRect === null
    ) {
      throw new Error('unreachable');
    }
    // A real cross-staff curve spans vertically from the treble note down to
    // the bass note — a same-staff slur would never have this much height.
    // (The curve's own bulge anchors near, not exactly at, each note's own
    // edge, so this checks the span is close to the full gap rather than
    // requiring the bbox to exactly reach past both note rects.)
    const gap = result.endRect.top - result.startRect.bottom;
    expect(result.pathBBox.height).toBeGreaterThan(gap * 0.9);
    expect(result.pathBBox.top).toBeLessThanOrEqual(result.startRect.bottom);
  });
});

test.describe(`${MUSIC_COMPOSITION} measure numbers`, () => {
  test('measure-numbers="row-start" shows only the first measure of each row, with its own number', async ({
    page,
  }) => {
    await buildComposition(page, {
      measureCount: 6,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 1600,
    });
    await page.evaluate(
      ({ compositionTag, measureTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null) {
          throw new Error('composition missing');
        }
        composition.setAttribute('measure-numbers', 'row-start');
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        measures.forEach((m, i) => m.setAttribute('number', `${i + 1}`));
      },
      { compositionTag: MUSIC_COMPOSITION, measureTag: MUSIC_MEASURE }
    );
    await waitForRedrawCycle(page);
    await resizeHost(page, 400);
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const rows = await page.evaluate(
      ({ measureTag }) => {
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        const grouped: { top: number; entries: (string | null)[] }[] = [];
        for (const measure of measures) {
          const top = measure.getBoundingClientRect().top;
          const text =
            measure.shadowRoot?.querySelector('.measure-numbers > *')
              ?.textContent ?? null;
          const existingRow = grouped.find((r) => Math.abs(r.top - top) <= 5);
          if (existingRow === undefined) {
            grouped.push({ top, entries: [text] });
          } else {
            existingRow.entries.push(text);
          }
        }
        return grouped.map((r) => r.entries);
      },
      { measureTag: MUSIC_MEASURE }
    );

    expect(rows.length).toBeGreaterThanOrEqual(2);
    let expectedNumber = 1;
    for (const row of rows) {
      expect(row[0]).toBe(`${expectedNumber}`);
      for (let i = 1; i < row.length; i++) {
        expect(row[i]).toBeNull();
      }
      expectedNumber += row.length;
    }
  });

  test('measure-numbers="row-end" shows only the last measure of each row, with its own number', async ({
    page,
  }) => {
    await buildComposition(page, {
      measureCount: 6,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 1600,
    });
    await page.evaluate(
      ({ compositionTag, measureTag }) => {
        const composition = document.querySelector(compositionTag);
        if (composition === null) {
          throw new Error('composition missing');
        }
        composition.setAttribute('measure-numbers', 'row-end');
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        measures.forEach((m, i) => m.setAttribute('number', `${i + 1}`));
      },
      { compositionTag: MUSIC_COMPOSITION, measureTag: MUSIC_MEASURE }
    );
    await waitForRedrawCycle(page);
    await resizeHost(page, 400);
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const rows = await page.evaluate(
      ({ measureTag }) => {
        const measures = Array.from(
          document.querySelectorAll(measureTag)
        ) as HTMLElement[];
        const grouped: { top: number; entries: (string | null)[] }[] = [];
        for (const measure of measures) {
          const top = measure.getBoundingClientRect().top;
          const text =
            measure.shadowRoot?.querySelector('.measure-numbers > *')
              ?.textContent ?? null;
          const existingRow = grouped.find((r) => Math.abs(r.top - top) <= 5);
          if (existingRow === undefined) {
            grouped.push({ top, entries: [text] });
          } else {
            existingRow.entries.push(text);
          }
        }
        return grouped.map((r) => r.entries);
      },
      { measureTag: MUSIC_MEASURE }
    );

    expect(rows.length).toBeGreaterThanOrEqual(2);
    let seen = 0;
    for (const row of rows) {
      seen += row.length;
      for (let i = 0; i < row.length - 1; i++) {
        expect(row[i]).toBeNull();
      }
      expect(row[row.length - 1]).toBe(`${seen}`);
    }
  });

  // The earlier unstyled stub rendered `number` as an inline element sharing
  // normal document flow with the slotted staves — its presence/absence
  // shifted the staff's real position, throwing off the brace's own fixed-px
  // position (position: absolute, unaffected by flow) relative to it. This
  // proves the new implementation, built entirely from absolutely-positioned
  // overlays, can't repeat that: toggling measure-numbers on must not move
  // the brace at all.
  test('turning measure-numbers on does not move a grand-staff brace (regression)', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '400px';
        const composition = document.createElement(compositionTag);
        const measure = document.createElement(measureTag);
        measure.setAttribute('number', '1');

        const treble = document.createElement(staffTag);
        treble.setAttribute('clef', 'treble');
        treble.setAttribute('group', 'grand');
        const trebleNote = document.createElement(noteTag);
        trebleNote.setAttribute('note', 'C');
        trebleNote.setAttribute('octave', '5');
        trebleNote.setAttribute('duration', 'whole');
        treble.appendChild(trebleNote);

        const bass = document.createElement(staffTag);
        bass.setAttribute('clef', 'bass');
        const bassNote = document.createElement(noteTag);
        bassNote.setAttribute('note', 'C');
        bassNote.setAttribute('octave', '3');
        bassNote.setAttribute('duration', 'whole');
        bass.appendChild(bassNote);

        measure.appendChild(treble);
        measure.appendChild(bass);
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

    const readBraceTop = () =>
      page.evaluate(
        ({ measureTag }) => {
          const measure = document.querySelector(measureTag);
          const brace = measure?.shadowRoot?.querySelector(
            '.group-connectors svg.brace'
          );
          return brace?.getBoundingClientRect().top ?? null;
        },
        { measureTag: MUSIC_MEASURE }
      );

    const braceTopBefore = await readBraceTop();
    expect(braceTopBefore).not.toBeNull();

    await page.evaluate(
      ({ compositionTag }) => {
        document
          .querySelector(compositionTag)
          ?.setAttribute('measure-numbers', 'all');
      },
      { compositionTag: MUSIC_COMPOSITION }
    );
    await waitForRedrawCycle(page);

    const numberShown = await page.evaluate(
      ({ measureTag }) =>
        document
          .querySelector(measureTag)
          ?.shadowRoot?.querySelector('.measure-numbers > *')?.textContent ??
        null,
      { measureTag: MUSIC_MEASURE }
    );
    expect(numberShown).toBe('1');

    const braceTopAfter = await readBraceTop();
    expect(braceTopAfter).toBe(braceTopBefore);
  });
});

test.describe(`${MUSIC_COMPOSITION} measure width sharing`, () => {
  async function readMeasureWidths(page: Page): Promise<number[]> {
    return page.evaluate(
      (measureTag) =>
        Array.from(document.querySelectorAll(measureTag)).map(
          (m) => m.getBoundingClientRect().width
        ),
      MUSIC_MEASURE
    );
  }

  async function readWrapperWidth(page: Page): Promise<number> {
    return page.evaluate((compositionTag) => {
      const wrapper = document
        .querySelector(compositionTag)
        ?.shadowRoot?.querySelector('.composition-wrapper');
      if (!wrapper) {
        throw new Error('wrapper not found');
      }
      return wrapper.getBoundingClientRect().width;
    }, MUSIC_COMPOSITION);
  }

  async function readMeasureRowCount(page: Page): Promise<number> {
    return page.evaluate((measureTag) => {
      const tops = Array.from(document.querySelectorAll(measureTag)).map((m) =>
        Math.round(m.getBoundingClientRect().top)
      );
      return new Set(tops).size;
    }, MUSIC_MEASURE);
  }

  test('a lone measure fills the composition row', async ({ page }) => {
    await buildComposition(page, {
      measureCount: 1,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 900,
    });
    await waitForRedrawCycle(page);

    const [measureWidth] = await readMeasureWidths(page);
    const wrapperWidth = await readWrapperWidth(page);
    expect(Math.abs(measureWidth - wrapperWidth)).toBeLessThanOrEqual(2);
  });

  test('equal-content measures split the row evenly (past the first, which carries the clef)', async ({
    page,
  }) => {
    await buildComposition(page, {
      measureCount: 3,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 900,
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const widths = await readMeasureWidths(page);
    expect(widths).toHaveLength(3);
    expect(await readMeasureRowCount(page)).toBe(1);
    // measures 2 and 3 have identical content and neither shows the describe
    // area, so they get identical widths
    expect(Math.abs(widths[1] - widths[2])).toBeLessThan(3);
    // the first measure is wider — it carries the clef / key / time
    expect(widths[0]).toBeGreaterThan(widths[1]);
  });

  test('a sparse measure and a dense measure split the row in proportion to content', async ({
    page,
  }) => {
    await page.evaluate(
      ({ compositionTag, measureTag, staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '900px';
        const composition = document.createElement(compositionTag);

        const sparse = document.createElement(measureTag);
        const sparseStaff = document.createElement(staffTag);
        sparseStaff.setAttribute('clef', 'treble');
        const quarterNote = document.createElement(noteTag);
        quarterNote.setAttribute('note', 'C');
        quarterNote.setAttribute('octave', '4');
        quarterNote.setAttribute('duration', 'quarter');
        sparseStaff.appendChild(quarterNote);
        sparse.appendChild(sparseStaff);

        const dense = document.createElement(measureTag);
        const denseStaff = document.createElement(staffTag);
        denseStaff.setAttribute('clef', 'treble');
        for (let i = 0; i < 8; i++) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'CDEFGABC'[i]);
          note.setAttribute('octave', '4');
          note.setAttribute('duration', 'eighth');
          denseStaff.appendChild(note);
        }
        dense.appendChild(denseStaff);

        composition.appendChild(sparse);
        composition.appendChild(dense);
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

    const [sparseWidth, denseWidth] = await readMeasureWidths(page);
    // both fit on one row
    expect(await readMeasureRowCount(page)).toBe(1);
    // the busier measure claims more of the row
    expect(denseWidth).toBeGreaterThan(sparseWidth * 1.5);
  });

  test('max-width attribute caps the composition wrapper', async ({ page }) => {
    await buildComposition(page, {
      measureCount: 1,
      notesPerMeasure: 4,
      duration: 'quarter',
      hostWidth: 1400,
    });
    await waitForRedrawCycle(page);
    expect(await readWrapperWidth(page)).toBeLessThanOrEqual(905);

    await page.evaluate((compositionTag) => {
      document.querySelector(compositionTag)?.setAttribute('max-width', '600');
    }, MUSIC_COMPOSITION);
    await waitForRedrawCycle(page);
    expect(Math.abs((await readWrapperWidth(page)) - 600)).toBeLessThanOrEqual(
      2
    );

    await page.evaluate((compositionTag) => {
      document.querySelector(compositionTag)?.setAttribute('max-width', 'none');
    }, MUSIC_COMPOSITION);
    await waitForRedrawCycle(page);
    expect(await readWrapperWidth(page)).toBeGreaterThan(1300);
  });

  test('raising max-width lets more measures share a row', async ({ page }) => {
    await buildComposition(page, {
      measureCount: 6,
      notesPerMeasure: 6,
      duration: 'quarter',
      hostWidth: 1800,
    });
    await waitForRedrawCycle(page);
    const cappedRows = await readMeasureRowCount(page);

    await page.evaluate((compositionTag) => {
      document.querySelector(compositionTag)?.setAttribute('max-width', 'none');
    }, MUSIC_COMPOSITION);
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);
    const uncappedRows = await readMeasureRowCount(page);

    expect(uncappedRows).toBeLessThan(cappedRows);
  });
});
