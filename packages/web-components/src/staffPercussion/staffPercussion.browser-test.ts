import { expect, test } from '@playwright/test';
import { waitForStaffNotesPositioned } from '../../test-fixtures/helpers';
import { MUSIC_DRUM_NOTE, MUSIC_STAFF_PERCUSSION } from '../utils/consts';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('changing a note instrument moves it and swaps its notehead', async ({
  page,
}) => {
  const positioned = waitForStaffNotesPositioned(page);
  await page.evaluate(
    ({ staffTag, noteTag }) => {
      const host = document.getElementById('host')!;
      host.style.width = '600px';
      host.innerHTML = `<${staffTag} time="4/4">
        <${noteTag} instrument="snare" duration="half"></${noteTag}>
        <${noteTag} instrument="kick" duration="half"></${noteTag}>
      </${staffTag}>`;
    },
    { staffTag: MUSIC_STAFF_PERCUSSION, noteTag: MUSIC_DRUM_NOTE }
  );
  await positioned;

  const readFirstNote = () =>
    page.evaluate(
      ({ staffTag, noteTag }) => {
        const staff = document.querySelector(staffTag) as HTMLElement & {
          noteToYCoordinate(note: string, octave: number): number;
        };
        const note = staff.querySelector(noteTag) as HTMLElement & {
          staffY: number | null;
        };
        return {
          staffY: note.staffY,
          snareY: staff.noteToYCoordinate('C', 5),
          crashY: staff.noteToYCoordinate('A', 5),
          headTag: note.shadowRoot?.querySelector('.head')?.tagName ?? null,
        };
      },
      { staffTag: MUSIC_STAFF_PERCUSSION, noteTag: MUSIC_DRUM_NOTE }
    );

  const before = await readFirstNote();
  expect(before.staffY).toBe(before.snareY);
  expect(before.headTag).toBe('ellipse');

  await page.evaluate((noteTag) => {
    document.querySelector(noteTag)!.setAttribute('instrument', 'crash');
  }, MUSIC_DRUM_NOTE);

  await expect
    .poll(async () => (await readFirstNote()).staffY)
    .toBe(before.crashY);
  expect((await readFirstNote()).headTag).toBe('path');
});
