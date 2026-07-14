import type { Page } from '@playwright/test';
import { NoteLetterOctave } from '../src/types/elements';
import type { ClefType, DurationType } from '../src/types/theory';

export type StaffType = 'music-staff' | 'music-staff-vocal';

export interface BuildCompositionOptions {
  measureCount: number;
  notesPerMeasure: number;
  duration: DurationType;
  hostWidth: number;
  staffType?: StaffType;
  clef?: ClefType;
}

const PITCH_CYCLE: NoteLetterOctave[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
];

export async function waitForRedrawCycle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            queueMicrotask(() => resolve());
          });
        });
      })
  );
}

export async function waitForStaffNotesPositioned(
  page: Page,
  hostSelector = '#host'
): Promise<void> {
  await page.evaluate(
    (selector) =>
      new Promise<void>((resolve, reject) => {
        const host = document.querySelector(selector);
        if (host === null) {
          reject(new Error(`host ${selector} not found`));
          return;
        }
        const timeoutId = window.setTimeout(() => {
          reject(new Error('staff-notes-positioned timeout'));
        }, 2000);
        host.addEventListener(
          'staff-notes-positioned',
          () => {
            window.clearTimeout(timeoutId);
            resolve();
          },
          { once: true }
        );
      }),
    hostSelector
  );
}

export async function buildComposition(
  page: Page,
  options: BuildCompositionOptions
): Promise<void> {
  await page.evaluate(
    ({
      measureCount,
      notesPerMeasure,
      duration,
      hostWidth,
      staffType,
      clef,
      pitchCycle,
    }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.innerHTML = '';
      host.style.width = `${hostWidth}px`;

      const composition = document.createElement('music-composition');
      const tag = staffType ?? 'music-staff';

      for (let m = 0; m < measureCount; m++) {
        const measure = document.createElement('music-measure');
        const staff = document.createElement(tag);
        if (tag === 'music-staff') {
          staff.setAttribute('clef', clef ?? 'treble');
        }
        for (let n = 0; n < notesPerMeasure; n++) {
          const note = document.createElement('music-note');
          const pitchIndex = (m * notesPerMeasure + n) % pitchCycle.length;
          note.setAttribute('value', pitchCycle[pitchIndex]);
          note.setAttribute('duration', duration);
          staff.appendChild(note);
        }
        measure.appendChild(staff);
        composition.appendChild(measure);
      }
      host.appendChild(composition);
    },
    {
      measureCount: options.measureCount,
      notesPerMeasure: options.notesPerMeasure,
      duration: options.duration,
      hostWidth: options.hostWidth,
      staffType: options.staffType ?? 'music-staff',
      clef: options.clef ?? 'treble',
      pitchCycle: PITCH_CYCLE,
    }
  );
}

export async function buildStandaloneStaff(
  page: Page,
  options: {
    notes: number;
    duration: DurationType;
    hostWidth: number;
    clef?: ClefType;
  }
): Promise<void> {
  await page.evaluate(
    ({ notes, duration, hostWidth, clef, pitchCycle }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.innerHTML = '';
      host.style.width = `${hostWidth}px`;

      const staff = document.createElement('music-staff');
      staff.setAttribute('clef', clef);
      for (let n = 0; n < notes; n++) {
        const note = document.createElement('music-note');
        note.setAttribute('value', pitchCycle[n % pitchCycle.length]);
        note.setAttribute('duration', duration);
        staff.appendChild(note);
      }
      host.appendChild(staff);
    },
    {
      notes: options.notes,
      duration: options.duration,
      hostWidth: options.hostWidth,
      clef: options.clef ?? 'treble',
      pitchCycle: PITCH_CYCLE,
    }
  );
}

export async function resizeHost(page: Page, width: number): Promise<void> {
  await page.evaluate((w) => {
    const host = document.getElementById('host');
    if (host === null) {
      throw new Error('host element missing');
    }
    host.style.width = `${w}px`;
  }, width);
  await waitForRedrawCycle(page);
}
