import { expect, type Page, test } from '@playwright/test';
import {
  buildStandaloneStaff,
  resizeHost,
  waitForRedrawCycle,
  waitForStaffNotesPositioned,
} from '../../test-fixtures/helpers';
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
