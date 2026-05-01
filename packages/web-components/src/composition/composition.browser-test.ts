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
      noteA.setAttribute('value', 'C4');
      noteA.setAttribute('duration', 'quarter');
      noteA.setAttribute('tie', 'start');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('value', 'C4');
      noteB.setAttribute('duration', 'quarter');
      noteB.setAttribute('tie', 'end');
      const noteC = document.createElement('music-note');
      noteC.setAttribute('value', 'D4');
      noteC.setAttribute('duration', 'quarter');
      const noteD = document.createElement('music-note');
      noteD.setAttribute('value', 'E4');
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
      a.setAttribute('value', 'C4');
      a.setAttribute('duration', 'quarter');
      a.setAttribute('tie', 'start');
      const b = document.createElement('music-note');
      b.setAttribute('value', 'C4');
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
      c.setAttribute('value', 'D4');
      c.setAttribute('duration', 'quarter');
      c.setAttribute('tie', 'start');
      const d = document.createElement('music-note');
      d.setAttribute('value', 'D4');
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
          const showClef = (staff as unknown as { showClef: boolean }).showClef;
          const existingRow = rows.find((r) => Math.abs(r.top - top) <= 5);
          if (existingRow === undefined) {
            rows.push({ top, staves: [showClef] });
          } else {
            existingRow.staves.push(showClef);
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
        const showClef = (staff as unknown as { showClef: boolean }).showClef;
        const existingRow = grouped.find((r) => Math.abs(r.top - top) <= 5);
        if (existingRow === undefined) {
          grouped.push({ top, staves: [showClef] });
        } else {
          existingRow.staves.push(showClef);
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
      a.setAttribute('value', 'C4');
      a.setAttribute('duration', 'quarter');
      a.setAttribute('tie', 'start');
      const b = document.createElement('music-note');
      b.setAttribute('value', 'C4');
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
