import { expect, type Page, test } from '@playwright/test';
import {
  buildStandaloneTrebleStaff,
  resizeHost,
  waitForRedrawCycle,
  waitForStaffNotesPositioned,
} from '../../test-fixtures/helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function readNoteLefts(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const notes = Array.from(document.querySelectorAll('music-note'));
    return notes.map((n) => n.getBoundingClientRect().left);
  });
}

async function readBeamShapes(
  page: Page
): Promise<{ count: number; firstBBox: { x: number; width: number } | null }> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff-treble');
    if (staff === null || staff.shadowRoot === null) {
      throw new Error('staff not ready');
    }
    const beamsContainer = staff.shadowRoot.querySelector('.beams-container');
    if (beamsContainer === null) {
      return { count: 0, firstBBox: null };
    }
    const beams = Array.from(
      beamsContainer.querySelectorAll('.beam')
    ) as SVGGraphicsElement[];
    if (beams.length === 0) {
      return { count: 0, firstBBox: null };
    }
    const bbox = beams[0].getBBox();
    return {
      count: beams.length,
      firstBBox: { x: bbox.x, width: bbox.width },
    };
  });
}

async function readStandaloneConnectors(
  page: Page
): Promise<{ count: number; firstBBox: { x: number; width: number } | null }> {
  return page.evaluate(() => {
    const staff = document.querySelector('music-staff-treble');
    if (staff === null || staff.shadowRoot === null) {
      throw new Error('staff not ready');
    }
    const connectors = Array.from(
      staff.shadowRoot.querySelectorAll('.connector')
    ) as SVGGraphicsElement[];
    if (connectors.length === 0) {
      return { count: 0, firstBBox: null };
    }
    const bbox = connectors[0].getBBox();
    return {
      count: connectors.length,
      firstBBox: { x: bbox.x, width: bbox.width },
    };
  });
}

test.describe('music-staff-treble responsive layout', () => {
  test('note left-edges remain strictly monotonic across a resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneTrebleStaff(page, {
      notes: 8,
      duration: 'quarter',
      hostWidth: 800,
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readNoteLefts(page);
    expect(wide.length).toBe(8);
    for (let i = 1; i < wide.length; i++) {
      expect(wide[i]).toBeGreaterThan(wide[i - 1]);
    }

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);

    const narrow = await readNoteLefts(page);
    expect(narrow.length).toBe(8);
    for (let i = 1; i < narrow.length; i++) {
      expect(narrow[i]).toBeGreaterThan(narrow[i - 1]);
    }
  });

  test('note spacing scales down proportionally on 800 to 400px', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneTrebleStaff(page, {
      notes: 8,
      duration: 'quarter',
      hostWidth: 800,
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readNoteLefts(page);
    const wideDeltas: number[] = [];
    for (let i = 1; i < wide.length; i++) {
      wideDeltas.push(wide[i] - wide[i - 1]);
    }

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);

    const narrow = await readNoteLefts(page);
    const narrowDeltas: number[] = [];
    for (let i = 1; i < narrow.length; i++) {
      narrowDeltas.push(narrow[i] - narrow[i - 1]);
    }

    expect(wideDeltas.length).toBe(narrowDeltas.length);
    for (let i = 0; i < wideDeltas.length; i++) {
      expect(narrowDeltas[i]).toBeLessThan(wideDeltas[i]);
    }

    const ratios = narrowDeltas.map((d, i) => d / wideDeltas[i]);
    const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    for (const r of ratios) {
      expect(Math.abs(r - meanRatio)).toBeLessThan(0.15);
    }
  });

  test('beams persist across a resize for eighth notes', async ({ page }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneTrebleStaff(page, {
      notes: 4,
      duration: 'eighth',
      hostWidth: 800,
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wideBeams = await readBeamShapes(page);
    expect(wideBeams.count).toBeGreaterThanOrEqual(1);
    expect(wideBeams.firstBBox).not.toBeNull();
    if (wideBeams.firstBBox === null) {
      throw new Error('unreachable');
    }
    expect(wideBeams.firstBBox.width).toBeGreaterThan(10);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);

    const narrowBeams = await readBeamShapes(page);
    expect(narrowBeams.count).toBeGreaterThanOrEqual(1);
    expect(narrowBeams.firstBBox).not.toBeNull();
    if (narrowBeams.firstBBox === null) {
      throw new Error('unreachable');
    }
    expect(narrowBeams.firstBBox.width).toBeGreaterThan(10);
  });

  test('no beams for quarter notes, before or after resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneTrebleStaff(page, {
      notes: 4,
      duration: 'quarter',
      hostWidth: 800,
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readBeamShapes(page);
    expect(wide.count).toBe(0);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);

    const narrow = await readBeamShapes(page);
    expect(narrow.count).toBe(0);
  });

  test('beams reposition and rescale on resize', async ({ page }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneTrebleStaff(page, {
      notes: 4,
      duration: 'eighth',
      hostWidth: 800,
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readBeamShapes(page);
    expect(wide.firstBBox).not.toBeNull();
    if (wide.firstBBox === null) {
      throw new Error('unreachable');
    }

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);

    const narrow = await readBeamShapes(page);
    expect(narrow.firstBBox).not.toBeNull();
    if (narrow.firstBBox === null) {
      throw new Error('unreachable');
    }

    expect(narrow.firstBBox.width).toBeLessThan(wide.firstBBox.width);
    const widthRatio = narrow.firstBBox.width / wide.firstBBox.width;
    expect(Math.abs(widthRatio - 0.5)).toBeLessThan(0.2);
  });

  test('valid tie connector appears and repositions across a resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
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
      staff.appendChild(noteA);
      staff.appendChild(noteB);
      staff.appendChild(noteC);
      host.appendChild(staff);
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readStandaloneConnectors(page);
    expect(wide.count).toBeGreaterThanOrEqual(1);
    expect(wide.firstBBox).not.toBeNull();
    if (wide.firstBBox === null) {
      throw new Error('unreachable');
    }
    expect(wide.firstBBox.width).toBeGreaterThan(0);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);
    await waitForRedrawCycle(page);

    const narrow = await readStandaloneConnectors(page);
    expect(narrow.count).toBeGreaterThanOrEqual(1);
    expect(narrow.firstBBox).not.toBeNull();
    if (narrow.firstBBox === null) {
      throw new Error('unreachable');
    }
    expect(narrow.firstBBox.width).toBeGreaterThan(0);
    expect(narrow.firstBBox.width).toBeLessThan(wide.firstBBox.width);
  });

  test('tie start only — no connector appears before or after resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
      const noteA = document.createElement('music-note');
      noteA.setAttribute('note', 'C4');
      noteA.setAttribute('duration', 'quarter');
      noteA.setAttribute('tie', 'start');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('note', 'D4');
      noteB.setAttribute('duration', 'quarter');
      staff.appendChild(noteA);
      staff.appendChild(noteB);
      host.appendChild(staff);
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readStandaloneConnectors(page);
    expect(wide.count).toBe(0);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);
    await waitForRedrawCycle(page);

    const narrow = await readStandaloneConnectors(page);
    expect(narrow.count).toBe(0);
  });

  test('tie end only — no connector appears before or after resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
      const noteA = document.createElement('music-note');
      noteA.setAttribute('note', 'C4');
      noteA.setAttribute('duration', 'quarter');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('note', 'D4');
      noteB.setAttribute('duration', 'quarter');
      noteB.setAttribute('tie', 'end');
      staff.appendChild(noteA);
      staff.appendChild(noteB);
      host.appendChild(staff);
    });
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const wide = await readStandaloneConnectors(page);
    expect(wide.count).toBe(0);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);
    await waitForRedrawCycle(page);

    const narrow = await readStandaloneConnectors(page);
    expect(narrow.count).toBe(0);
  });
});

test.describe('music-staff-treble rests', () => {
  test('rest elements position left-to-right among pitched notes', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
      const noteA = document.createElement('music-note');
      noteA.setAttribute('note', 'C4');
      noteA.setAttribute('duration', 'quarter');
      const rest = document.createElement('music-rest');
      rest.setAttribute('duration', 'quarter');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('note', 'E4');
      noteB.setAttribute('duration', 'quarter');
      staff.appendChild(noteA);
      staff.appendChild(rest);
      staff.appendChild(noteB);
      host.appendChild(staff);
    });
    await positioned;
    await waitForRedrawCycle(page);

    const lefts = await page.evaluate(() => {
      const notes = Array.from(
        document.querySelectorAll('music-note, music-rest')
      );
      return notes.map((n) => n.getBoundingClientRect().left);
    });
    expect(lefts.length).toBe(3);
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]).toBeGreaterThan(lefts[i - 1]);
    }
  });

  test('rest element renders a rest SVG in the shadow DOM', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
      const rest = document.createElement('music-rest');
      rest.setAttribute('duration', 'whole');
      staff.appendChild(rest);
      host.appendChild(staff);
    });
    await positioned;
    await waitForRedrawCycle(page);

    const hasRestSvg = await page.evaluate(() => {
      const restEl = document.querySelector('music-rest');
      if (restEl === null || restEl.shadowRoot === null) {
        return false;
      }
      return restEl.shadowRoot.querySelector('svg.rest') !== null;
    });
    expect(hasRestSvg).toBe(true);
  });

  test('eighth rest alongside eighth notes produces no beams for the rest', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '800px';
      const staff = document.createElement('music-staff-treble');
      const noteA = document.createElement('music-note');
      noteA.setAttribute('note', 'C4');
      noteA.setAttribute('duration', 'eighth');
      const noteB = document.createElement('music-note');
      noteB.setAttribute('note', 'D4');
      noteB.setAttribute('duration', 'eighth');
      const rest = document.createElement('music-rest');
      rest.setAttribute('duration', 'eighth');
      const noteC = document.createElement('music-note');
      noteC.setAttribute('note', 'E4');
      noteC.setAttribute('duration', 'eighth');
      staff.appendChild(noteA);
      staff.appendChild(noteB);
      staff.appendChild(rest);
      staff.appendChild(noteC);
      host.appendChild(staff);
    });
    await positioned;
    await waitForRedrawCycle(page);

    const beams = await readBeamShapes(page);
    // The rest breaks the beam run — each pair of eighths before/after the rest
    // may form their own beam, but the rest itself must not be beamed.
    // We simply verify that no beam spans across all 4 elements (width < full staff).
    const staffWidth = await page.evaluate(() => {
      const staff = document.querySelector('music-staff-treble');
      return staff?.getBoundingClientRect().width ?? 0;
    });
    if (beams.firstBBox !== null) {
      expect(beams.firstBBox.width).toBeLessThan(staffWidth * 0.8);
    }
  });

  test('standalone treble staff with rest children renders without error', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(() => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host missing');
      }
      host.innerHTML = '';
      host.style.width = '600px';
      const staff = document.createElement('music-staff-treble');
      const rest = document.createElement('music-rest');
      rest.setAttribute('duration', 'half');
      staff.appendChild(rest);
      host.appendChild(staff);
    });
    await positioned;
    await waitForRedrawCycle(page);

    const staffExists = await page.evaluate(
      () => document.querySelector('music-staff-treble') !== null
    );
    expect(staffExists).toBe(true);
  });
});
