import { expect, test } from '@playwright/test';
import {
  buildComposition,
  resizeHost,
  waitForRedrawCycle,
} from '../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test.describe('music-composition responsive layout', () => {
  test('connectors stay attached to their endpoint notes across a resize', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const composition = document.createElement('music-composition');
      const measure = document.createElement('music-measure');
      const treble = document.createElement('music-staff-treble');
      const noteA = document.createElement('music-note');
      noteA.setAttribute('note', 'C4');
      noteA.setAttribute('duration', 'quarter');
      noteA.setAttribute('tie', 'start');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('note', 'C4');
      noteB.setAttribute('duration', 'quarter');
      noteB.setAttribute('tie', 'end');
      const noteC = document.createElement('music-note');
      noteC.setAttribute('note', 'D4');
      noteC.setAttribute('duration', 'quarter');
      const noteD = document.createElement('music-note');
      noteD.setAttribute('note', 'E4');
      noteD.setAttribute('duration', 'quarter');
      treble.appendChild(noteA);
      treble.appendChild(noteB);
      treble.appendChild(noteC);
      treble.appendChild(noteD);
      measure.appendChild(treble);
      composition.appendChild(measure);
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const baseline = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
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
        composition.querySelectorAll('music-note')
      ) as HTMLElement[];
      return {
        pathCount: paths.length,
        firstPathBBox:
          paths.length > 0 ? paths[0].getBoundingClientRect() : null,
        startNoteRect: notes[0].getBoundingClientRect(),
        endNoteRect: notes[1].getBoundingClientRect(),
      };
    });

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

    const afterResize = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
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
        composition.querySelectorAll('music-note')
      ) as HTMLElement[];
      return {
        pathCount: paths.length,
        firstPathBBox:
          paths.length > 0 ? paths[0].getBoundingClientRect() : null,
        startNoteRect: notes[0].getBoundingClientRect(),
        endNoteRect: notes[1].getBoundingClientRect(),
      };
    });

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
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const composition = document.createElement('music-composition');
      const measure = document.createElement('music-measure');
      const treble = document.createElement('music-staff-treble');
      const a = document.createElement('music-note');
      a.setAttribute('note', 'C4');
      a.setAttribute('duration', 'quarter');
      a.setAttribute('tie', 'start');
      const b = document.createElement('music-note');
      b.setAttribute('note', 'C4');
      b.setAttribute('duration', 'quarter');
      b.setAttribute('tie', 'end');
      treble.appendChild(a);
      treble.appendChild(b);
      measure.appendChild(treble);
      composition.appendChild(measure);
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const baseline = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
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
    });
    expect(baseline).toBe(1);

    await page.evaluate(() => {
      const treble = document.querySelector('music-staff-treble');
      if (treble === null) {
        throw new Error('staff missing');
      }
      const c = document.createElement('music-note');
      c.setAttribute('note', 'D4');
      c.setAttribute('duration', 'quarter');
      c.setAttribute('tie', 'start');
      const d = document.createElement('music-note');
      d.setAttribute('note', 'D4');
      d.setAttribute('duration', 'quarter');
      d.setAttribute('tie', 'end');
      treble.appendChild(c);
      treble.appendChild(d);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const afterAdd = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
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
    });
    expect(afterAdd).toBeGreaterThan(baseline);

    await resizeHost(page, 500);
    await waitForRedrawCycle(page);

    const afterResize = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
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
    });
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
      page.evaluate(() => {
        const composition = document.querySelector('music-composition');
        if (composition === null) {
          throw new Error('composition missing');
        }
        const measures = Array.from(
          composition.querySelectorAll('music-measure')
        ) as HTMLElement[];
        const rows: { top: number; staves: boolean[] }[] = [];
        for (const measure of measures) {
          const top = measure.getBoundingClientRect().top;
          const staff = measure.querySelector('music-staff-treble');
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
      });

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

    const rows = await page.evaluate(() => {
      const composition = document.querySelector('music-composition');
      if (composition === null) {
        throw new Error('composition missing');
      }
      const measures = Array.from(
        composition.querySelectorAll('music-measure')
      ) as HTMLElement[];
      const grouped: { top: number; staves: boolean[] }[] = [];
      for (const measure of measures) {
        const top = measure.getBoundingClientRect().top;
        const staff = measure.querySelector('music-staff-treble');
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
    });

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
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '900px';
      const composition = document.createElement('music-composition');
      for (let i = 0; i < 4; i++) {
        const measure = document.createElement('music-measure');
        const staff = document.createElement('music-staff-treble');
        measure.appendChild(staff);
        composition.appendChild(measure);
      }
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);

    const readShowClefsPerMeasure = () =>
      page.evaluate(() => {
        const measures = Array.from(
          document.querySelectorAll('music-measure')
        ) as HTMLElement[];
        return measures.map((measure) => {
          const staff = Array.from(measure.children).find((el) =>
            el.nodeName.startsWith('MUSIC-STAFF-')
          );
          return staff
            ? (staff as unknown as { showDescribe: boolean }).showDescribe
            : false;
        });
      });

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
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '1600px';
      const composition = document.createElement('music-composition');
      composition.setAttribute('keysig', 'D');
      composition.setAttribute('mode', 'major');
      for (let i = 0; i < 6; i++) {
        const measure = document.createElement('music-measure');
        const staff = document.createElement('music-staff-treble');
        for (let j = 0; j < 4; j++) {
          const note = document.createElement('music-note');
          note.setAttribute('note', 'D4');
          note.setAttribute('duration', 'quarter');
          staff.appendChild(note);
        }
        measure.appendChild(staff);
        composition.appendChild(measure);
      }
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const groupByRow = async () =>
      page.evaluate(() => {
        const composition = document.querySelector('music-composition');
        if (composition === null) {
          throw new Error('composition missing');
        }
        const measures = Array.from(
          composition.querySelectorAll('music-measure')
        ) as HTMLElement[];
        const rows: {
          top: number;
          staves: boolean[];
          keySigVisible: boolean[];
        }[] = [];
        for (const measure of measures) {
          const top = measure.getBoundingClientRect().top;
          const staff = measure.querySelector('music-staff-treble');
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
      });

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

  test('all measures share the same row when composition is inside a flex justify-center container (regression for 1-measure-per-row bug)', async ({
    page,
  }) => {
    // Replicates MusicScore.tsx: 3 measures (treble+bass, treble+bass+vocal-with-lyrics,
    // treble+bass) inside a flex justify-center parent with no explicit width on the
    // composition. Before :host { width: 100% }, the composition sized to the max-content
    // of its widest measure (~389px), causing each measure to wrap to its own row.
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '1200px';
      host.style.display = 'flex';
      host.style.justifyContent = 'center';

      const composition = document.createElement('music-composition');
      composition.setAttribute('keysig', 'D');
      composition.setAttribute('mode', 'major');
      composition.setAttribute('time', '4/4');

      // Measure 1: treble (4 quarter notes) + bass (1 note)
      const m1 = document.createElement('music-measure');
      const m1Treble = document.createElement('music-staff-treble');
      for (const v of ['C4', 'D4', 'E4', 'F4']) {
        const note = document.createElement('music-note');
        note.setAttribute('note', v);
        note.setAttribute('duration', 'quarter');
        m1Treble.appendChild(note);
      }
      const m1Bass = document.createElement('music-staff-bass');
      const m1BassNote = document.createElement('music-note');
      m1BassNote.setAttribute('note', 'A');
      m1BassNote.setAttribute('duration', 'quarter');
      m1Bass.appendChild(m1BassNote);
      m1.appendChild(m1Treble);
      m1.appendChild(m1Bass);

      // Measure 2: treble (2 notes) + bass (2 notes) + vocal with 2 lyric verses
      const m2 = document.createElement('music-measure');
      const m2Treble = document.createElement('music-staff-treble');
      for (const v of ['A', 'D']) {
        const note = document.createElement('music-note');
        note.setAttribute('note', v);
        note.setAttribute('duration', 'eighth');
        m2Treble.appendChild(note);
      }
      const m2Bass = document.createElement('music-staff-bass');
      for (const v of ['A', 'A']) {
        const note = document.createElement('music-note');
        note.setAttribute('note', v);
        note.setAttribute('duration', 'quarter');
        m2Bass.appendChild(note);
      }
      const m2Vocal = document.createElement('music-staff-vocal');
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
        const note = document.createElement('music-note');
        note.setAttribute('note', vocalValues[i]);
        note.setAttribute('duration', vocalDurations[i]);
        m2Vocal.appendChild(note);
      }
      const lyrics1 = document.createElement('music-lyrics');
      lyrics1.setAttribute('verse', '1');
      lyrics1.textContent = 'Hap-py birth-day to_ you you_';
      const lyrics2 = document.createElement('music-lyrics');
      lyrics2.setAttribute('verse', '2');
      lyrics2.textContent = 'Hap-py birth-day dear_ friend friend_';
      m2Vocal.appendChild(lyrics1);
      m2Vocal.appendChild(lyrics2);
      m2.appendChild(m2Treble);
      m2.appendChild(m2Bass);
      m2.appendChild(m2Vocal);

      // Measure 3: treble (4 quarter notes) + bass (1 note)
      const m3 = document.createElement('music-measure');
      const m3Treble = document.createElement('music-staff-treble');
      for (const v of ['A', 'A', 'A', 'A']) {
        const note = document.createElement('music-note');
        note.setAttribute('note', v);
        note.setAttribute('duration', 'quarter');
        m3Treble.appendChild(note);
      }
      const m3Bass = document.createElement('music-staff-bass');
      const m3BassNote = document.createElement('music-note');
      m3BassNote.setAttribute('note', 'A');
      m3BassNote.setAttribute('duration', 'quarter');
      m3Bass.appendChild(m3BassNote);
      m3.appendChild(m3Treble);
      m3.appendChild(m3Bass);

      composition.appendChild(m1);
      composition.appendChild(m2);
      composition.appendChild(m3);
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const measureTops = await page.evaluate(() => {
      const measures = Array.from(
        document.querySelectorAll('music-measure')
      ) as HTMLElement[];
      return measures.map((m) => Math.round(m.getBoundingClientRect().top));
    });

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

    const topsAfterShrink = await page.evaluate(() => {
      const measures = Array.from(
        document.querySelectorAll('music-measure')
      ) as HTMLElement[];
      return measures.map((m) => Math.round(m.getBoundingClientRect().top));
    });

    expect(topsAfterShrink).toHaveLength(3);
    // The last measure must have wrapped below the first measure.
    expect(topsAfterShrink[2]).toBeGreaterThan(topsAfterShrink[0] + 5);
  });

  test('#scheduleRedraw debounces a burst of resizes into one redraw', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const composition = document.createElement('music-composition');
      const measure = document.createElement('music-measure');
      const treble = document.createElement('music-staff-treble');
      const a = document.createElement('music-note');
      a.setAttribute('note', 'C4');
      a.setAttribute('duration', 'quarter');
      a.setAttribute('tie', 'start');
      const b = document.createElement('music-note');
      b.setAttribute('note', 'C4');
      b.setAttribute('duration', 'quarter');
      b.setAttribute('tie', 'end');
      treble.appendChild(a);
      treble.appendChild(b);
      measure.appendChild(treble);
      composition.appendChild(measure);
      host.appendChild(composition);
    });
    await waitForRedrawCycle(page);
    await waitForRedrawCycle(page);

    const mutationCount = await page.evaluate(async () => {
      const composition = document.querySelector('music-composition');
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
    });

    expect(mutationCount).toBeLessThanOrEqual(4);
  });
});
