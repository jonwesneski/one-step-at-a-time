import type { Page } from '@playwright/test';
import type { DurationType, LetterOctave } from '../src/types/theory';

export type StaffType =
  | 'music-staff-treble'
  | 'music-staff-bass'
  | 'music-staff-vocal';

export interface BuildCompositionOptions {
  measureCount: number;
  notesPerMeasure: number;
  duration: DurationType;
  hostWidth: number;
  staffType?: StaffType;
}

const PITCH_CYCLE: LetterOctave[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];

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
      pitchCycle,
    }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.innerHTML = '';
      host.style.width = `${hostWidth}px`;

      const composition = document.createElement('music-composition');
      const tag = staffType ?? 'music-staff-treble';

      for (let m = 0; m < measureCount; m++) {
        const measure = document.createElement('music-measure');
        const staff = document.createElement(tag);
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
      staffType: options.staffType ?? 'music-staff-treble',
      pitchCycle: PITCH_CYCLE,
    }
  );
}

export async function buildStandaloneTrebleStaff(
  page: Page,
  options: {
    notes: number;
    duration: DurationType;
    hostWidth: number;
  }
): Promise<void> {
  await page.evaluate(
    ({ notes, duration, hostWidth, pitchCycle }) => {
      const host = document.getElementById('host');
      if (host === null) {
        throw new Error('host element missing');
      }
      host.innerHTML = '';
      host.style.width = `${hostWidth}px`;

      const staff = document.createElement('music-staff-treble');
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
