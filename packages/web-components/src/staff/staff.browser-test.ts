import { expect, type Page, test } from '@playwright/test';
import {
  buildStandaloneStaff,
  resizeHost,
  waitForRedrawCycle,
  waitForStaffNotesPositioned,
} from '../../test-fixtures/helpers';
import type { DurationType } from '../types/theory';
import {
  MUSIC_CLEF,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_STAFF,
  MUSIC_TUPLET,
} from '../utils/consts';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function readNoteLefts(page: Page): Promise<number[]> {
  return page.evaluate((noteTag) => {
    const notes = Array.from(document.querySelectorAll(noteTag));
    return notes.map((n) => n.getBoundingClientRect().left);
  }, MUSIC_NOTE);
}

async function readBeamShapes(
  page: Page
): Promise<{ count: number; firstBBox: { x: number; width: number } | null }> {
  return page.evaluate((staffTag) => {
    const staff = document.querySelector(staffTag);
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
  }, MUSIC_STAFF);
}

async function readStandaloneConnectors(
  page: Page
): Promise<{ count: number; firstBBox: { x: number; width: number } | null }> {
  return page.evaluate((staffTag) => {
    const staff = document.querySelector(staffTag);
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
  }, MUSIC_STAFF);
}

async function readSlurGeometry(page: Page): Promise<{
  pathCount: number;
  pathRects: { left: number; right: number; width: number }[];
  noteCenters: number[];
  staffLeft: number;
  staffRight: number;
}> {
  return page.evaluate(
    ({ staffTag, noteTag }) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        throw new Error('staff not ready');
      }
      const overlay = staff.shadowRoot.querySelector(
        '.standalone-connectors-overlay'
      );
      if (overlay === null) {
        throw new Error('standalone connectors overlay missing');
      }
      const paths = Array.from(
        overlay.querySelectorAll('path')
      ) as SVGPathElement[];
      const staffRect = staff.getBoundingClientRect();
      return {
        pathCount: paths.length,
        pathRects: paths.map((path) => {
          const rect = path.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }),
        noteCenters: (
          Array.from(staff.querySelectorAll(noteTag)) as HTMLElement[]
        ).map((note) => {
          const rect = note.getBoundingClientRect();
          return rect.left + rect.width / 2;
        }),
        staffLeft: staffRect.left,
        staffRight: staffRect.right,
      };
    },
    { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
  );
}

test.describe(`${MUSIC_STAFF} responsive layout`, () => {
  test('note left-edges remain strictly monotonic across a resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneStaff(page, {
      notes: 8,
      duration: 'eighth',
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
    await buildStandaloneStaff(page, {
      notes: 8,
      duration: 'eighth',
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

    // 8 eighth notes exactly fill a 4/4 measure, so resizing the staff
    // reflows every entry together by the same proportional ratio (this is
    // what makes a full measure fill the staff at any width)
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
    await buildStandaloneStaff(page, {
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

  // Max px any beamed note's stem beam-end misses the primary beam's edge at
  // that note's x (screen space, via getScreenCTM). Non-uniform durations give
  // the group non-uniform x-spacing, which is where index-fraction stem
  // extension diverges from the true-X drawn beam.
  async function worstStemToBeamGap(page: Page): Promise<number> {
    return page.evaluate(() => {
      const staff = document.querySelector('music-staff')!;
      const container = staff.shadowRoot!.querySelector(
        '.beams-container'
      ) as SVGSVGElement;
      const primary = container.querySelector(
        'polygon.beam'
      ) as SVGPolygonElement;
      const ctm = container.getScreenCTM()!;
      const toScreen = (p: { x: number; y: number }) => {
        const q = container.createSVGPoint();
        q.x = p.x;
        q.y = p.y;
        return q.matrixTransform(ctm);
      };
      // points[0]→points[3] is the outer edge (toward the stem tips).
      const a = toScreen(primary.points[0]);
      const b = toScreen(primary.points[3]);
      const edgeYAt = (x: number) =>
        a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);

      let worst = 0;
      for (const note of Array.from(staff.querySelectorAll('music-note'))) {
        const stem = note.shadowRoot?.querySelector('.stem') as SVGLineElement;
        if (!stem) continue;
        const r = stem.getBoundingClientRect();
        const tipX = r.left + r.width / 2;
        const stemUp = note.shadowRoot!.querySelector('svg')!.dataset.stemUp;
        const tipY = stemUp === 'true' ? r.top : r.bottom;
        worst = Math.max(worst, Math.abs(tipY - edgeYAt(tipX)));
      }
      return worst;
    });
  }

  test('interior stems track the beam through a resize (non-uniform spacing)', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host')!;
        host.innerHTML = '';
        host.style.width = '900px';
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');
        staff.setAttribute('time', '4/4');
        // Steep slant + mixed durations → the interior notes sit well off the
        // even x-grid, so index-fraction stem extension diverges visibly from
        // the true-X drawn beam.
        const spec: [string, string][] = [
          ['C4', 'eighth'],
          ['E5', 'thirtysecond'],
          ['G5', 'thirtysecond'],
          ['B5', 'eighth'],
        ];
        for (const [value, duration] of spec) {
          const n = document.createElement(noteTag);
          n.setAttribute('note', value);
          n.setAttribute('duration', duration);
          staff.appendChild(n);
        }
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await positioned;
    await waitForRedrawCycle(page);

    // 2px tolerance plus a hair of floating-point slop from the
    // beat-proportional division (x = beatOffset/measureCapacity*width)
    expect(await worstStemToBeamGap(page)).toBeLessThan(2.001);

    const repositioned = waitForStaffNotesPositioned(page);
    await resizeHost(page, 480);
    await repositioned.catch(() => undefined);
    await waitForRedrawCycle(page);

    expect(await worstStemToBeamGap(page)).toBeLessThan(2.001);
  });

  test('no beams for quarter notes, before or after resize', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await buildStandaloneStaff(page, {
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
    await buildStandaloneStaff(page, {
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
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
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
        staff.appendChild(noteA);
        staff.appendChild(noteB);
        staff.appendChild(noteC);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
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
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C4');
        noteA.setAttribute('duration', 'quarter');
        noteA.setAttribute('tie', 'start');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'D4');
        noteB.setAttribute('duration', 'quarter');
        staff.appendChild(noteA);
        staff.appendChild(noteB);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
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
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C4');
        noteA.setAttribute('duration', 'quarter');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'D4');
        noteB.setAttribute('duration', 'quarter');
        noteB.setAttribute('tie', 'end');
        staff.appendChild(noteA);
        staff.appendChild(noteB);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
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

  test('slur across a pitch interval connects the two notes, not the staff edges', async ({
    page,
  }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const pitches = ['C5', 'D5', 'E5', 'F5'];
        pitches.forEach((pitch, index) => {
          const note = document.createElement(noteTag);
          note.setAttribute('note', pitch);
          note.setAttribute('duration', 'eighth');
          if (index === 0) {
            note.setAttribute('slur', 'start');
          }
          if (index === pitches.length - 1) {
            note.setAttribute('slur', 'end');
          }
          staff.appendChild(note);
        });
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const geometry = await readSlurGeometry(page);

    expect(geometry.pathCount).toBe(1);
    const [slur] = geometry.pathRects;
    const firstNoteCenter = geometry.noteCenters[0];
    const lastNoteCenter =
      geometry.noteCenters[geometry.noteCenters.length - 1];

    expect(Math.abs(slur.left - firstNoteCenter)).toBeLessThan(20);
    expect(Math.abs(slur.right - lastNoteCenter)).toBeLessThan(20);
    // The cross-row split bug would run one half to the staff's right edge.
    expect(geometry.staffRight - slur.right).toBeGreaterThan(40);
  });

  test('nested slurs each render as a single curve', async ({ page }) => {
    const positionedAtStart = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const pitches = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];
        const slurRoles: Record<number, string> = {
          0: 'start',
          1: 'start',
          3: 'end',
          7: 'end',
        };
        pitches.forEach((pitch, index) => {
          const note = document.createElement(noteTag);
          note.setAttribute('note', pitch);
          note.setAttribute('duration', 'eighth');
          if (slurRoles[index] !== undefined) {
            note.setAttribute('slur', slurRoles[index]);
          }
          staff.appendChild(note);
        });
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await positionedAtStart;
    await waitForRedrawCycle(page);

    const geometry = await readSlurGeometry(page);

    expect(geometry.pathCount).toBe(2);
    for (const slur of geometry.pathRects) {
      expect(geometry.staffRight - slur.right).toBeGreaterThan(40);
      expect(slur.left - geometry.staffLeft).toBeGreaterThan(40);
    }
    const widths = geometry.pathRects
      .map((rect) => rect.width)
      .sort((a, b) => a - b);
    expect(widths[1]).toBeGreaterThan(widths[0]);
  });
});

test.describe(`${MUSIC_STAFF} rests`, () => {
  test('rest elements position left-to-right among pitched notes', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, restTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C4');
        noteA.setAttribute('duration', 'quarter');
        const rest = document.createElement(restTag);
        rest.setAttribute('duration', 'quarter');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'E4');
        noteB.setAttribute('duration', 'quarter');
        staff.appendChild(noteA);
        staff.appendChild(rest);
        staff.appendChild(noteB);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE, restTag: MUSIC_REST }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const lefts = await page.evaluate(
      ({ noteTag, restTag }) => {
        const notes = Array.from(
          document.querySelectorAll(`${noteTag}, ${restTag}`)
        );
        return notes.map((n) => n.getBoundingClientRect().left);
      },
      { noteTag: MUSIC_NOTE, restTag: MUSIC_REST }
    );
    expect(lefts.length).toBe(3);
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]).toBeGreaterThan(lefts[i - 1]);
    }
  });

  test('rest element renders a rest SVG in the shadow DOM', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, restTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const rest = document.createElement(restTag);
        rest.setAttribute('duration', 'whole');
        staff.appendChild(rest);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, restTag: MUSIC_REST }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const hasRestSvg = await page.evaluate((restTag) => {
      const restEl = document.querySelector(restTag);
      if (restEl === null || restEl.shadowRoot === null) {
        return false;
      }
      return restEl.shadowRoot.querySelector('svg.rest') !== null;
    }, MUSIC_REST);
    expect(hasRestSvg).toBe(true);
  });

  test('eighth rest alongside eighth notes produces no beams for the rest', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, restTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C4');
        noteA.setAttribute('duration', 'eighth');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'D4');
        noteB.setAttribute('duration', 'eighth');
        const rest = document.createElement(restTag);
        rest.setAttribute('duration', 'eighth');
        const noteC = document.createElement(noteTag);
        noteC.setAttribute('note', 'E4');
        noteC.setAttribute('duration', 'eighth');
        staff.appendChild(noteA);
        staff.appendChild(noteB);
        staff.appendChild(rest);
        staff.appendChild(noteC);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE, restTag: MUSIC_REST }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const beams = await readBeamShapes(page);
    // The rest breaks the beam run — each pair of eighths before/after the rest
    // may form their own beam, but the rest itself must not be beamed.
    // We simply verify that no beam spans across all 4 elements (width < full staff).
    const staffWidth = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      return staff?.getBoundingClientRect().width ?? 0;
    }, MUSIC_STAFF);
    if (beams.firstBBox !== null) {
      expect(beams.firstBBox.width).toBeLessThan(staffWidth * 0.8);
    }
  });

  test('standalone treble staff with rest children renders without error', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, restTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '600px';
        const staff = document.createElement(staffTag);
        const rest = document.createElement(restTag);
        rest.setAttribute('duration', 'half');
        staff.appendChild(rest);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, restTag: MUSIC_REST }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const staffExists = await page.evaluate(
      (staffTag) => document.querySelector(staffTag) !== null,
      MUSIC_STAFF
    );
    expect(staffExists).toBe(true);
  });
});

test.describe(`${MUSIC_STAFF} tuplets`, () => {
  test('triplet renders a numeral "3" in the tuplets container', async ({
    page,
  }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, tupletTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const tuplet = document.createElement(tupletTag);
        tuplet.setAttribute('ratio', '3');
        for (let i = 0; i < 3; i++) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'E4');
          note.setAttribute('duration', 'eighth');
          tuplet.appendChild(note);
        }
        staff.appendChild(tuplet);
        host.appendChild(staff);
      },
      {
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        tupletTag: MUSIC_TUPLET,
      }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const numeralText = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        return null;
      }
      return (
        staff.shadowRoot.querySelector('.tuplet-numeral')?.textContent ?? null
      );
    }, MUSIC_STAFF);
    expect(numeralText).toBe('3');
  });

  test('quintuplet renders numeral "5:4"', async ({ page }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, tupletTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const tuplet = document.createElement(tupletTag);
        tuplet.setAttribute('ratio', '5:4');
        for (let i = 0; i < 5; i++) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'C5');
          note.setAttribute('duration', 'sixteenth');
          tuplet.appendChild(note);
        }
        staff.appendChild(tuplet);
        host.appendChild(staff);
      },
      {
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        tupletTag: MUSIC_TUPLET,
      }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const numeralText = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        return null;
      }
      return (
        staff.shadowRoot.querySelector('.tuplet-numeral')?.textContent ?? null
      );
    }, MUSIC_STAFF);
    expect(numeralText).toBe('5:4');
  });

  test('tuplet bracket repositions on resize', async ({ page }) => {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, tupletTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        const tuplet = document.createElement(tupletTag);
        tuplet.setAttribute('ratio', '3');
        for (let i = 0; i < 3; i++) {
          const note = document.createElement(noteTag);
          note.setAttribute('note', 'E4');
          note.setAttribute('duration', 'quarter');
          tuplet.appendChild(note);
        }
        staff.appendChild(tuplet);
        host.appendChild(staff);
      },
      {
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        tupletTag: MUSIC_TUPLET,
      }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const wideBBox = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        return null;
      }
      const group = staff.shadowRoot.querySelector(
        '.tuplet-group'
      ) as SVGGraphicsElement | null;
      if (group === null) {
        return null;
      }
      const bbox = group.getBBox();
      return { x: bbox.x, width: bbox.width };
    }, MUSIC_STAFF);
    expect(wideBBox).not.toBeNull();
    if (wideBBox === null) {
      throw new Error('unreachable');
    }
    expect(wideBBox.width).toBeGreaterThan(0);

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);
    await waitForRedrawCycle(page);

    const narrowBBox = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        return null;
      }
      const group = staff.shadowRoot.querySelector(
        '.tuplet-group'
      ) as SVGGraphicsElement | null;
      if (group === null) {
        return null;
      }
      const bbox = group.getBBox();
      return { x: bbox.x, width: bbox.width };
    }, MUSIC_STAFF);
    expect(narrowBBox).not.toBeNull();
    if (narrowBBox === null) {
      throw new Error('unreachable');
    }
    expect(narrowBBox.width).toBeLessThan(wideBBox.width);
  });

  test('nested tuplet renders two .tuplet-group elements at different Y positions', async ({
    page,
  }) => {
    // Listener and DOM construction must be in the same page.evaluate so the
    // listener is attached before host.appendChild(staff) triggers connectedCallback.
    await page.evaluate(
      ({ staffTag, noteTag, tupletTag }) =>
        new Promise<void>((resolve, reject) => {
          const host = document.getElementById('host');
          if (host === null) {
            throw new Error('host missing');
          }
          const timeoutId = window.setTimeout(
            () => reject(new Error('staff-notes-positioned timeout')),
            2000
          );
          host.addEventListener(
            'staff-notes-positioned',
            () => {
              window.clearTimeout(timeoutId);
              resolve();
            },
            { once: true }
          );
          host.innerHTML = '';
          host.style.width = '800px';
          const staff = document.createElement(staffTag);
          const outer = document.createElement(tupletTag);
          outer.setAttribute('ratio', '5:4');
          const noteA = document.createElement(noteTag);
          noteA.setAttribute('note', 'C5');
          noteA.setAttribute('duration', 'sixteenth');
          const noteB = document.createElement(noteTag);
          noteB.setAttribute('note', 'D5');
          noteB.setAttribute('duration', 'sixteenth');
          const inner = document.createElement(tupletTag);
          inner.setAttribute('ratio', '3');
          for (let i = 0; i < 3; i++) {
            const note = document.createElement(noteTag);
            note.setAttribute('note', 'E5');
            note.setAttribute('duration', 'thirtysecond');
            inner.appendChild(note);
          }
          const noteC = document.createElement(noteTag);
          noteC.setAttribute('note', 'F5');
          noteC.setAttribute('duration', 'sixteenth');
          const noteD = document.createElement(noteTag);
          noteD.setAttribute('note', 'G5');
          noteD.setAttribute('duration', 'sixteenth');
          outer.appendChild(noteA);
          outer.appendChild(noteB);
          outer.appendChild(inner);
          outer.appendChild(noteC);
          outer.appendChild(noteD);
          staff.appendChild(outer);
          host.appendChild(staff);
        }),
      {
        staffTag: MUSIC_STAFF,
        noteTag: MUSIC_NOTE,
        tupletTag: MUSIC_TUPLET,
      }
    );
    await waitForRedrawCycle(page);

    const groupYPositions = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        return [];
      }
      const groups = Array.from(
        staff.shadowRoot.querySelectorAll('.tuplet-group')
      ) as SVGGraphicsElement[];
      return groups.map((g) => g.getBBox().y);
    }, MUSIC_STAFF);

    expect(groupYPositions.length).toBe(2);
    expect(groupYPositions[0]).not.toBe(groupYPositions[1]);
  });
});

test.describe(`${MUSIC_STAFF} mid-stream clef changes`, () => {
  async function buildStaffWithClefChange(page: Page): Promise<void> {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, clefTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');

        const noteA = document.createElement(noteTag);
        noteA.setAttribute('note', 'C');
        noteA.setAttribute('octave', '5');
        noteA.setAttribute('duration', 'quarter');
        const noteB = document.createElement(noteTag);
        noteB.setAttribute('note', 'E');
        noteB.setAttribute('octave', '5');
        noteB.setAttribute('duration', 'quarter');
        const clef = document.createElement(clefTag);
        clef.setAttribute('clef', 'bass');
        const noteC = document.createElement(noteTag);
        noteC.setAttribute('note', 'C');
        noteC.setAttribute('octave', '3');
        noteC.setAttribute('duration', 'quarter');
        const noteD = document.createElement(noteTag);
        noteD.setAttribute('note', 'E');
        noteD.setAttribute('octave', '3');
        noteD.setAttribute('duration', 'quarter');

        staff.appendChild(noteA);
        staff.appendChild(noteB);
        staff.appendChild(clef);
        staff.appendChild(noteC);
        staff.appendChild(noteD);
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE, clefTag: MUSIC_CLEF }
    );
    await positioned;
    await waitForRedrawCycle(page);
  }

  test('mid-stream clef marker renders and reserves horizontal space between notes', async ({
    page,
  }) => {
    await buildStaffWithClefChange(page);

    const lefts = await page.evaluate(
      ({ noteTag, clefTag }) => {
        const elements = Array.from(
          document.querySelectorAll(`${noteTag}, ${clefTag}`)
        );
        return elements.map((el) => ({
          tag: el.tagName,
          left: el.getBoundingClientRect().left,
        }));
      },
      { noteTag: MUSIC_NOTE, clefTag: MUSIC_CLEF }
    );

    // note, note, clef, note, note — strictly left-to-right, clef included
    expect(lefts.length).toBe(5);
    expect(lefts[2].tag).toBe(MUSIC_CLEF.toUpperCase());
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i].left).toBeGreaterThan(lefts[i - 1].left);
    }
  });

  test('notes before and after a mid-stream clef change use different clef Y positions', async ({
    page,
  }) => {
    await buildStaffWithClefChange(page);

    const tops = await page.evaluate((noteTag) => {
      const notes = Array.from(document.querySelectorAll(noteTag));
      return notes.map((n) => (n as HTMLElement).style.top);
    }, MUSIC_NOTE);

    expect(tops.length).toBe(4);
    // C5/E5 (treble) sit well above C3/E3 (bass) in the shared staff
    // coordinate space, so their computed top offsets must differ.
    expect(tops[0]).not.toBe(tops[2]);
    expect(tops[1]).not.toBe(tops[3]);
  });

  test('mid-stream clef change respaces correctly on resize', async ({
    page,
  }) => {
    await buildStaffWithClefChange(page);

    const wideLefts = await page.evaluate(
      ({ noteTag, clefTag }) =>
        Array.from(document.querySelectorAll(`${noteTag}, ${clefTag}`)).map(
          (el) => el.getBoundingClientRect().left
        ),
      { noteTag: MUSIC_NOTE, clefTag: MUSIC_CLEF }
    );

    const positionedAfter = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await positionedAfter.catch(() => undefined);
    await waitForRedrawCycle(page);

    const narrowLefts = await page.evaluate(
      ({ noteTag, clefTag }) =>
        Array.from(document.querySelectorAll(`${noteTag}, ${clefTag}`)).map(
          (el) => el.getBoundingClientRect().left
        ),
      { noteTag: MUSIC_NOTE, clefTag: MUSIC_CLEF }
    );

    expect(narrowLefts.length).toBe(wideLefts.length);
    for (let i = 1; i < narrowLefts.length; i++) {
      expect(narrowLefts[i]).toBeGreaterThan(narrowLefts[i - 1]);
    }
  });
});

test.describe('staves authored as parsed HTML markup', () => {
  test('render without console or page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto('./parsed-markup.html');

    // The initial render is driven by a deferred (microtask) slotchange, so it
    // may already have fired by the time this listener could attach — poll the
    // rendered output instead of racing the staff-notes-positioned event.
    await page.waitForFunction(() => {
      const notes = Array.from(document.querySelectorAll('music-note'));
      return (
        notes.length > 0 &&
        notes.every((note) => note.shadowRoot?.querySelector('svg') != null)
      );
    });
    await waitForRedrawCycle(page);

    const rendered = await page.evaluate(() => {
      const svgCount = (selector: string) =>
        Array.from(document.querySelectorAll(selector)).filter(
          (element) => element.shadowRoot?.querySelector('svg') != null
        ).length;
      return {
        notesRendered: svgCount('music-note'),
        totalNotes: document.querySelectorAll('music-note').length,
        guitarTabRendered:
          document
            .querySelector('music-staff-guitar-tab')
            ?.shadowRoot?.querySelector('svg') != null,
        vocalRendered:
          document.querySelector('music-staff-vocal')?.shadowRoot != null,
      };
    });

    expect(errors).toEqual([]);
    expect(rendered.notesRendered).toBe(rendered.totalNotes);
    expect(rendered.guitarTabRendered).toBe(true);
    expect(rendered.vocalRendered).toBe(true);
  });
});

test.describe(`${MUSIC_STAFF} beat-proportional spacing`, () => {
  async function buildStaffWithDurations(
    page: Page,
    durations: DurationType[]
  ): Promise<void> {
    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ staffTag, noteTag, durations }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '800px';
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');
        const pitches = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        durations.forEach((duration, i) => {
          const note = document.createElement(noteTag);
          note.setAttribute('note', pitches[i % pitches.length]);
          note.setAttribute('octave', '4');
          note.setAttribute('duration', duration);
          staff.appendChild(note);
        });
        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE, durations }
    );
    await positioned;
    await waitForRedrawCycle(page);
  }

  async function readNotesAreaBounds(
    page: Page
  ): Promise<{ left: number; right: number }> {
    return page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag) as
        | (Element & { describeEndX: number })
        | null;
      if (staff === null) {
        throw new Error('staff not found');
      }
      const rect = staff.getBoundingClientRect();
      return { left: rect.left + staff.describeEndX, right: rect.right };
    }, MUSIC_STAFF);
  }

  test('an underfull bar leaves trailing space rather than spreading its notes', async ({
    page,
  }) => {
    // two quarter notes in a nominal 4/4 bar — rhythmically half-full.
    // Position is the entry's beat-offset as a fraction of the measure's
    // FIXED capacity (4 beats), not a fraction of "however many entries
    // exist" — note 2 starts at beat 1 of 4, i.e. 25% of the notes area,
    // not 50% (the original bug: stretching to fill regardless of how much
    // of the measure is actually used).
    await buildStaffWithDurations(page, ['quarter', 'quarter']);

    const lefts = await readNoteLefts(page);
    const { left, right } = await readNotesAreaBounds(page);
    const notesAreaWidth = right - left;

    expect((lefts[1] - left) / notesAreaWidth).toBeCloseTo(0.25, 1);
    // genuine blank staff after the last note, not stretched to fill 100%
    expect(right - lefts[1]).toBeGreaterThan(notesAreaWidth * 0.5);
  });

  test('a full measure spreads its entries across the entire available width', async ({
    page,
  }) => {
    // 4 quarter notes exactly fill a 4/4 measure: beats 0, 1, 2, 3 of 4 ->
    // 0%, 25%, 50%, 75% of the notes area — the direct regression case for
    // "4 quarter notes bunch near the start of a wide staff instead of
    // filling it."
    await buildStaffWithDurations(page, [
      'quarter',
      'quarter',
      'quarter',
      'quarter',
    ]);

    const lefts = await readNoteLefts(page);
    const { left, right } = await readNotesAreaBounds(page);
    const notesAreaWidth = right - left;
    const fractions = lefts.map((x) => (x - left) / notesAreaWidth);

    expect(fractions[0]).toBeCloseTo(0, 1);
    expect(fractions[1]).toBeCloseTo(0.25, 1);
    expect(fractions[2]).toBeCloseTo(0.5, 1);
    expect(fractions[3]).toBeCloseTo(0.75, 1);
  });

  test("the last entry's own duration does not affect its position — only the entries before it do", async ({
    page,
  }) => {
    // Beat-proportional, append-only spacing means an entry's x depends only
    // on what comes before it, never on its own duration or what (if
    // anything) follows — the last note's x here should be identical whether
    // it is a half note or an eighth note.
    await buildStaffWithDurations(page, ['quarter', 'quarter', 'half']);
    let lefts = await readNoteLefts(page);
    const lastXWithHalf = lefts[lefts.length - 1];

    await buildStaffWithDurations(page, ['quarter', 'quarter', 'eighth']);
    lefts = await readNoteLefts(page);
    const lastXWithEighth = lefts[lefts.length - 1];

    expect(lastXWithEighth).toBeCloseTo(lastXWithHalf, 0);
  });

  test('resizing reflows an underfull measure proportionally too', async ({
    page,
  }) => {
    await buildStaffWithDurations(page, ['quarter', 'quarter', 'eighth']);
    const wideLefts = await readNoteLefts(page);
    const { left: wideLeft } = await readNotesAreaBounds(page);
    const wideFractions = wideLefts.map((x) => x - wideLeft);

    const repositioned = waitForStaffNotesPositioned(page);
    await resizeHost(page, 400);
    await repositioned;
    await waitForRedrawCycle(page);

    const narrowLefts = await readNoteLefts(page);
    const { left: narrowLeft } = await readNotesAreaBounds(page);
    const narrowFractions = narrowLefts.map((x) => x - narrowLeft);

    // same beat-offsets, same fixed 4/4 capacity, smaller available width ->
    // every entry (after the first, which is always 0) scales down together
    for (let i = 1; i < wideFractions.length; i++) {
      expect(narrowFractions[i]).toBeLessThan(wideFractions[i]);
    }
  });

  test('appending a new entry never moves an already-positioned entry', async ({
    page,
  }) => {
    await buildStaffWithDurations(page, ['quarter']);
    const firstNoteLeftBefore = (await readNoteLefts(page))[0];

    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ noteTag }) => {
        const staff = document.querySelector('music-staff');
        if (staff === null) {
          throw new Error('staff not found');
        }
        const note = document.createElement(noteTag);
        note.setAttribute('note', 'D');
        note.setAttribute('octave', '4');
        note.setAttribute('duration', 'quarter');
        staff.appendChild(note);
      },
      { noteTag: MUSIC_NOTE }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const [firstNoteLeftAfter] = await readNoteLefts(page);
    expect(firstNoteLeftAfter).toBe(firstNoteLeftBefore);
  });

  test('appending notes one at a time never moves earlier ones (direct regression for the reported bug)', async ({
    page,
  }) => {
    await buildStaffWithDurations(page, ['quarter', 'quarter']);
    const lefts1And2 = await readNoteLefts(page);

    const positioned = waitForStaffNotesPositioned(page);
    await page.evaluate(
      ({ noteTag }) => {
        const staff = document.querySelector('music-staff');
        if (staff === null) {
          throw new Error('staff not found');
        }
        const note = document.createElement(noteTag);
        note.setAttribute('note', 'E');
        note.setAttribute('octave', '4');
        note.setAttribute('duration', 'quarter');
        staff.appendChild(note);
      },
      { noteTag: MUSIC_NOTE }
    );
    await positioned;
    await waitForRedrawCycle(page);

    const leftsAfterThird = await readNoteLefts(page);
    expect(leftsAfterThird[0]).toBe(lefts1And2[0]);
    expect(leftsAfterThird[1]).toBe(lefts1And2[1]);
  });
});

test.describe(`${MUSIC_STAFF} glissando`, () => {
  test('renders a straight diagonal line between the two notes, with the hint text near it', async ({
    page,
  }) => {
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '400px';
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');

        const start = document.createElement(noteTag);
        start.setAttribute('note', 'C');
        start.setAttribute('octave', '4');
        start.setAttribute('duration', 'half');
        start.setAttribute('glissando', 'start');
        start.setAttribute('glissando-hint', 'white-key');
        staff.appendChild(start);

        const end = document.createElement(noteTag);
        end.setAttribute('note', 'C');
        end.setAttribute('octave', '6');
        end.setAttribute('duration', 'half');
        end.setAttribute('glissando', 'end');
        staff.appendChild(end);

        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await waitForRedrawCycle(page);

    const result = await page.evaluate(
      ({ staffTag, noteTag }) => {
        const staff = document.querySelector(staffTag);
        if (staff === null || staff.shadowRoot === null) {
          throw new Error('staff not ready');
        }
        const overlay = staff.shadowRoot.querySelector(
          '.standalone-connectors-overlay'
        );
        const path = overlay?.querySelector('path') ?? null;
        const text = overlay?.querySelector('text') ?? null;
        const notes = Array.from(staff.querySelectorAll(noteTag));
        return {
          d: path?.getAttribute('d') ?? null,
          textContent: text?.textContent ?? null,
          startRect: notes[0]?.getBoundingClientRect() ?? null,
          endRect: notes[1]?.getBoundingClientRect() ?? null,
        };
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );

    expect(result.d).not.toBeNull();
    // A glissando is a straight line ("M x y L x y"), never a curve ("Q").
    expect(result.d).not.toContain('Q');
    expect(result.d).toMatch(/^M \S+ \S+ L \S+ \S+$/);
    expect(result.textContent).toBe('white-note gliss.');
    expect(result.startRect).not.toBeNull();
    expect(result.endRect).not.toBeNull();
    if (result.startRect === null || result.endRect === null) {
      throw new Error('unreachable');
    }
    // The end note is a 6th above the start note — the line must slope
    // upward (end notehead's top is well above the start's).
    expect(result.endRect.top).toBeLessThan(result.startRect.top - 10);
  });

  test('the hint label clears the line across its own width, not just at its center', async ({
    page,
  }) => {
    await page.evaluate(
      ({ staffTag, noteTag }) => {
        const host = document.getElementById('host');
        if (host === null) {
          throw new Error('host missing');
        }
        host.innerHTML = '';
        host.style.width = '400px';
        const staff = document.createElement(staffTag);
        staff.setAttribute('clef', 'treble');

        const start = document.createElement(noteTag);
        start.setAttribute('note', 'C');
        start.setAttribute('octave', '4');
        start.setAttribute('duration', 'half');
        start.setAttribute('glissando', 'start');
        start.setAttribute('glissando-hint', 'black-key');
        staff.appendChild(start);

        const end = document.createElement(noteTag);
        end.setAttribute('note', 'C');
        end.setAttribute('octave', '6');
        end.setAttribute('duration', 'half');
        end.setAttribute('glissando', 'end');
        staff.appendChild(end);

        host.appendChild(staff);
      },
      { staffTag: MUSIC_STAFF, noteTag: MUSIC_NOTE }
    );
    await waitForRedrawCycle(page);

    const result = await page.evaluate((staffTag) => {
      const staff = document.querySelector(staffTag);
      if (staff === null || staff.shadowRoot === null) {
        throw new Error('staff not ready');
      }
      const overlay = staff.shadowRoot.querySelector(
        '.standalone-connectors-overlay'
      );
      const path = overlay?.querySelector('path');
      const text = overlay?.querySelector('text');
      if (!path || !text) {
        throw new Error('connector not rendered');
      }
      const match = /^M (\S+) (\S+) L (\S+) (\S+)$/.exec(
        path.getAttribute('d') ?? ''
      );
      if (!match) {
        throw new Error('unexpected path shape');
      }
      const [, x1, y1, x2, y2] = match.map(Number);
      const textBBox = (text as unknown as SVGGraphicsElement).getBBox();
      const lineYAt = (x: number) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      return {
        textBottom: textBBox.y + textBBox.height,
        lineYAtTextLeft: lineYAt(textBBox.x),
        lineYAtTextRight: lineYAt(textBBox.x + textBBox.width),
      };
    }, MUSIC_STAFF);

    // Label sits above the line ("above" = smaller y) — its bottom edge
    // must clear the line's y at BOTH ends of its own horizontal span, not
    // just at the line's overall midpoint.
    expect(result.textBottom).toBeLessThan(result.lineYAtTextLeft);
    expect(result.textBottom).toBeLessThan(result.lineYAtTextRight);
  });
});
