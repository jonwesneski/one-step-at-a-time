import { ClefRenderData, getClefRenderData } from '../rules/clefRules';
import {
  calculateStaffVocalMinWidth,
  calculateStaffVocalNaturalWidth,
} from '../rules/staffWidth';
import {
  generateKeySignatureYCoordinates,
  generateMinorKeySignatureYCoordinates,
  generateYCoordinates,
} from '../rules/theoryHelpers';
import { StaffClassicalElementBase } from '../staffClassicalBase';
import {
  LyricSyllablePosition,
  LyricsElementType,
  YCoordinates,
} from '../types/elements';
import { Octave, VocalType } from '../types/theory';
import { STAFF_EVENTS } from '../utils/consts';
import {
  createBassClefSvg,
  createTreble8ClefSvg,
  createTrebleClefSvg,
} from '../utils/svgCreator/clefs';
import type { MusicLyricsElement } from './lyrics';

type KeySignatureTables = Pick<
  ClefRenderData,
  | 'majorSharpYCoordinates'
  | 'majorFlatYCoordinates'
  | 'minorSharpYCoordinates'
  | 'minorFlatYCoordinates'
>;

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  const LYRICS_BASELINE_OFFSET = -25; // px below staff to first verse
  const LYRICS_VERSE_SPACING = 15; // px between verse lines

  /**
   * A vocal staff for one of the six standard vocal types. Behaves like
   * `<music-staff>` (notes, beams, accidentals, key/time signatures) and
   * additionally lays out slotted `<music-lyrics>` syllables beneath the notes.
   * Usable inside a `<music-measure>` / `<music-composition>` or on its own.
   *
   * @customElement music-staff-vocal
   * @attr {'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass'} voice - Vocal type, which selects the clef and range. Defaults to `soprano`.
   * @attr {Note} key-sig - Key-signature tonic. Inherited from a parent measure/composition when unset.
   * @attr {'major' | 'minor'} mode - Key-signature mode. Inherited when unset. Defaults to `major`.
   * @attr {TimeSignature} time - Beats per measure. Inherited when unset.
   * @attr {'grand' | 'bracket'} group - Joins this staff to its next sibling under a brace or bracket connector.
   * @attr {string} group-id - Shared identifier letting a `group="bracket"` connector span more than two contiguous staves.
   * @attr {string} label - Short margin text to the left of the staff (e.g. `r.h.`/`l.h.` hand distribution, an instrument name). Only drawn on the first measure of each visual row.
   * @attr {string} part - Names the part this staff carries (e.g. `guitar`), so a `<music-staff-guitar-tab>` in the same measure can mirror it with `tab-for`.
   *
   * @example
   * <music-staff-vocal voice="tenor" key-sig="G" mode="major" time="4/4">
   *   <music-note note="G" octave="4" duration="quarter"></music-note>
   *   <music-note note="A" octave="4" duration="quarter"></music-note>
   *   <music-lyrics verse="1">A-men</music-lyrics>
   * </music-staff-vocal>
   */
  class StaffVocalElement extends StaffClassicalElementBase {
    static #treble = getClefRenderData('treble');
    static #bass = getClefRenderData('bass');
    static #mezzoYCoordinates = generateYCoordinates('C6', 'A3');
    static #altoYCoordinates = generateYCoordinates('A5', 'F3');
    static #tenorYCoordinates = generateYCoordinates('C5', 'C3');

    // Tenor reads an octave lower than treble, so its key signature sits on
    // its own (treble-8vb) positions.
    static #tenorKeyTables: KeySignatureTables = (() => {
      const majorSharpYCoordinates = generateKeySignatureYCoordinates(
        { G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7 },
        ['F4', 'C4', 'G4', 'D4', 'A3', 'E4', 'B3'],
        StaffVocalElement.#tenorYCoordinates
      );
      const majorFlatYCoordinates = generateKeySignatureYCoordinates(
        { F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5, Gb: 6, Cb: 7 },
        ['B3', 'E4', 'A3', 'D4', 'G3', 'C4', 'F3'],
        StaffVocalElement.#tenorYCoordinates
      );
      return {
        majorSharpYCoordinates,
        majorFlatYCoordinates,
        minorSharpYCoordinates: generateMinorKeySignatureYCoordinates(
          majorSharpYCoordinates
        ),
        minorFlatYCoordinates: generateMinorKeySignatureYCoordinates(
          majorFlatYCoordinates
        ),
      };
    })();

    static override get observedAttributes(): string[] {
      return [...super.observedAttributes, 'voice'];
    }

    get voice(): VocalType {
      return (this.getAttribute('voice') as VocalType) ?? 'soprano';
    }

    set voice(value: VocalType) {
      this.setAttribute('voice', value);
    }

    get yCoordinates(): YCoordinates {
      switch (this.voice) {
        case 'soprano':
          return StaffVocalElement.#treble.yCoordinates;
        case 'mezzo':
          return StaffVocalElement.#mezzoYCoordinates;
        case 'alto':
          return StaffVocalElement.#altoYCoordinates;
        case 'tenor':
          return StaffVocalElement.#tenorYCoordinates;
        case 'baritone':
        case 'bass':
          return StaffVocalElement.#bass.yCoordinates;
      }
    }

    get octaves(): Octave[] {
      switch (this.voice) {
        case 'soprano':
          return StaffVocalElement.#treble.octaves;
        case 'mezzo':
          return [3, 4, 5, 6];
        case 'alto':
          return [3, 4, 5];
        case 'tenor':
          return [3, 4, 5];
        case 'baritone':
        case 'bass':
          return StaffVocalElement.#bass.octaves;
      }
    }

    protected get clefSvg(): string {
      switch (this.voice) {
        case 'soprano':
        case 'mezzo':
        case 'alto':
          return createTrebleClefSvg();
        case 'tenor':
          return createTreble8ClefSvg();
        case 'baritone':
        case 'bass':
          return createBassClefSvg();
      }
    }

    public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
      const tables: KeySignatureTables =
        this.voice === 'tenor'
          ? StaffVocalElement.#tenorKeyTables
          : this.voice === 'baritone' || this.voice === 'bass'
          ? StaffVocalElement.#bass
          : StaffVocalElement.#treble;
      const [sharps, flats] =
        this.mode === 'major'
          ? [tables.majorSharpYCoordinates, tables.majorFlatYCoordinates]
          : [tables.minorSharpYCoordinates, tables.minorFlatYCoordinates];
      return {
        useSharps: !!sharps[this.keySig],
        coordinates: sharps[this.keySig] ?? flats[this.keySig] ?? [],
      };
    }

    override onStaffResize(): void {
      super.onStaffResize();
      this.#positionLyricsIfPresent();
    }

    #positionLyricsIfPresent(): void {
      const lyricsElements = this.querySelectorAll(
        'music-lyrics'
      ) as MusicLyricsElement[];
      if (lyricsElements.length === 0) {
        return;
      }

      const noteElements = Array.from(
        this.querySelectorAll('music-note, music-chord')
      ) as HTMLElement[];
      if (noteElements.length === 0) {
        return;
      }

      const staffRect = this.getBoundingClientRect();
      const transcribeContainer = this.shadowRoot?.querySelector(
        '.staff-wrapper'
      ) as HTMLElement | null;
      if (!transcribeContainer) {
        return;
      }

      const transcribeRect = transcribeContainer.getBoundingClientRect();
      const baselineY = transcribeRect.bottom - staffRect.top;

      // Render each lyrics verse
      let verseIndex = 1;
      for (const lyricEl of lyricsElements) {
        const syllablesText = lyricEl.textContent ?? '';
        const syllables = this.#parseLyricsText(syllablesText);
        const positions: LyricSyllablePosition[] = [];

        // Position each syllable below its corresponding note
        syllables.forEach((syllable, sylIndex) => {
          if (sylIndex >= noteElements.length) {
            console.warn(
              `Lyric verse has more syllables (${syllables.length}) than notes (${noteElements.length})`
            );
            return;
          }

          const noteElement = noteElements[sylIndex];
          const noteRect = noteElement.getBoundingClientRect();
          const noteX = noteRect.left - staffRect.left + noteRect.width / 2;
          const lyricY =
            baselineY +
            LYRICS_BASELINE_OFFSET +
            verseIndex * LYRICS_VERSE_SPACING;

          positions[sylIndex] = {
            text: syllable.text,
            x: noteX,
            y: lyricY,
            isMelisma: syllable.isMelisma,
            isHyphenated: syllable.isHyphenated,
          };
        });

        (lyricEl as LyricsElementType).updatePositions(positions);
        verseIndex++;
      }

      // Re-score with lyrics included — overwrites the lyrics-unaware score from super.
      // Use the widest single verse (max), not the sum of all verses, because verses
      // render as stacked rows under the notes and only the widest verse drives horizontal space.
      let maxLyricChars = 0;
      for (const lyricEl of lyricsElements) {
        let verseChars = 0;
        const syllables = this.#parseLyricsText(lyricEl.textContent ?? '');
        for (const syllable of syllables) {
          verseChars += syllable.text.length;
        }
        maxLyricChars = Math.max(maxLyricChars, verseChars);
      }
      const strutInputs = this.currentStrutInputs;
      if (strutInputs !== null) {
        const { noteCount, leftwardWidth, rightwardWidth, totalSlackWeight } =
          strutInputs;
        const minWidth = calculateStaffVocalMinWidth(
          this.describeEndX,
          noteCount,
          maxLyricChars,
          leftwardWidth,
          rightwardWidth
        );
        const naturalWidth = calculateStaffVocalNaturalWidth(
          this.describeEndX,
          noteCount,
          maxLyricChars,
          totalSlackWeight,
          leftwardWidth,
          rightwardWidth
        );
        this.dispatchEvent(
          new CustomEvent(STAFF_EVENTS.STAFF_MIN_WIDTH, {
            bubbles: true,
            composed: false,
            detail: { minWidth, naturalWidth },
          })
        );
      }
    }

    #parseLyricsText(text: string): Array<{
      text: string;
      isMelisma: boolean;
      isHyphenated: boolean;
    }> {
      const syllables: Array<{
        text: string;
        isMelisma: boolean;
        isHyphenated: boolean;
      }> = [];
      const words = text.split(/\s+/);

      for (const word of words) {
        if (!word) continue;
        const parts = word.split('-');

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue;

          const isMelisma = part.endsWith('_');
          const sylText = isMelisma ? part.slice(0, -1) : part;
          const isHyphenated = i < parts.length - 1;

          if (sylText) {
            syllables.push({
              text: sylText,
              isMelisma,
              isHyphenated,
            });
          }
        }
      }

      return syllables;
    }
  }

  if (!customElements.get('music-staff-vocal')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-vocal', StaffVocalElement as any);
  }
}
