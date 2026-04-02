import { StaffClassicalElementBase } from '../staffClassicalBase';
import {
  KeySignatureYCoordinates,
  LyricSyllablePosition,
  LyricsElementType,
  YCoordinates,
} from '../types/elements';
import { LetterOctave, Octave, VoiceType } from '../types/theory';
import {
  createBassClefSvg,
  createTreble8ClefSvg,
  createTrebleClefSvg,
} from '../utils/svgCreator/clefs';
import { generateYCoordinates } from '../utils/theoryHelpers';
import { MusicLyricsElement } from './lyrics';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  const LYRICS_BASELINE_OFFSET = -25; // px below staff to first verse
  const LYRICS_VERSE_SPACING = 15; // px between verse lines

  class StaffVocalElement extends StaffClassicalElementBase {
    static #sopranoYCoordinates = generateYCoordinates('C6', 'C4');
    static #mezzoYCoordinates = generateYCoordinates('C6', 'A3');
    static #altoYCoordinates = generateYCoordinates('A5', 'F3');
    static #tenorYCoordinates = generateYCoordinates('C5', 'C3');
    static #baritoneYCoordinates = generateYCoordinates('E4', 'E2');
    static #bassYCoordinates = generateYCoordinates('E4', 'E2');

    // soprano, mezzo, alto (treble-based)
    static #trebleSharps: LetterOctave[] = [
      'F5',
      'C5',
      'G5',
      'D5',
      'A4',
      'E5',
      'B4',
    ];
    static #trebleFlats: LetterOctave[] = [
      'B4',
      'E5',
      'A4',
      'D5',
      'G4',
      'C5',
      'F4',
    ];

    static #trebleMajorSharpYCoordinates: KeySignatureYCoordinates = {
      G: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      D: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      A: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      E: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      B: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      ['F#']: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      ['C#']: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #trebleMajorFlatYCoordinates: KeySignatureYCoordinates = {
      F: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Bb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Eb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Ab: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Db: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Gb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
      Cb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#sopranoYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #trebleMinorSharpYCoordinates: KeySignatureYCoordinates = {
      E: StaffVocalElement.#trebleMajorSharpYCoordinates.G,
      B: StaffVocalElement.#trebleMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#trebleMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#trebleMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#trebleMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#trebleMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#trebleMajorSharpYCoordinates['C#'],
    };

    static #trebleMinorFlatYCoordinates: KeySignatureYCoordinates = {
      D: StaffVocalElement.#trebleMajorFlatYCoordinates.F,
      G: StaffVocalElement.#trebleMajorFlatYCoordinates.Bb,
      C: StaffVocalElement.#trebleMajorFlatYCoordinates.Eb,
      F: StaffVocalElement.#trebleMajorFlatYCoordinates.Ab,
      Bb: StaffVocalElement.#trebleMajorFlatYCoordinates.Db,
      Eb: StaffVocalElement.#trebleMajorFlatYCoordinates.Gb,
      Ab: StaffVocalElement.#trebleMajorFlatYCoordinates.Cb,
    };

    static #tenorSharps: LetterOctave[] = [
      'F4',
      'C4',
      'G4',
      'D4',
      'A3',
      'E4',
      'B3',
    ];
    static #tenorFlats: LetterOctave[] = [
      'B3',
      'E4',
      'A3',
      'D4',
      'G3',
      'C4',
      'F3',
    ];

    static #tenorMajorSharpYCoordinates: KeySignatureYCoordinates = {
      G: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      D: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      A: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      E: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      B: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      ['F#']: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      ['C#']: StaffVocalElement.#tenorSharps
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #tenorMajorFlatYCoordinates: KeySignatureYCoordinates = {
      F: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Bb: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Eb: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Ab: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Db: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Gb: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
      Cb: StaffVocalElement.#tenorFlats
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#tenorYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #tenorMinorSharpYCoordinates: KeySignatureYCoordinates = {
      E: StaffVocalElement.#tenorMajorSharpYCoordinates.G,
      B: StaffVocalElement.#tenorMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#tenorMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#tenorMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#tenorMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#tenorMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#tenorMajorSharpYCoordinates['C#'],
    };

    static #tenorMinorFlatYCoordinates: KeySignatureYCoordinates = {
      D: StaffVocalElement.#tenorMajorFlatYCoordinates.F,
      G: StaffVocalElement.#tenorMajorFlatYCoordinates.Bb,
      C: StaffVocalElement.#tenorMajorFlatYCoordinates.Eb,
      F: StaffVocalElement.#tenorMajorFlatYCoordinates.Ab,
      Bb: StaffVocalElement.#tenorMajorFlatYCoordinates.Db,
      Eb: StaffVocalElement.#tenorMajorFlatYCoordinates.Gb,
      Ab: StaffVocalElement.#tenorMajorFlatYCoordinates.Cb,
    };

    // baritone, bass (bass-based)
    static #bassSharps: LetterOctave[] = [
      'F3',
      'C3',
      'G3',
      'D3',
      'A2',
      'E3',
      'B2',
    ];
    static #bassFlats: LetterOctave[] = [
      'B2',
      'E3',
      'A2',
      'D3',
      'G2',
      'C3',
      'F2',
    ];

    static #bassMajorSharpYCoordinates: KeySignatureYCoordinates = {
      G: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      D: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      A: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      E: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      B: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      ['F#']: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      ['C#']: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #bassMajorFlatYCoordinates: KeySignatureYCoordinates = {
      F: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Bb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Eb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Ab: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Db: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Gb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
      Cb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#baritoneYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #bassMinorSharpYCoordinates: KeySignatureYCoordinates = {
      E: StaffVocalElement.#bassMajorSharpYCoordinates.G,
      B: StaffVocalElement.#bassMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#bassMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#bassMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#bassMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#bassMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#bassMajorSharpYCoordinates['C#'],
    };

    static #bassMinorFlatYCoordinates: KeySignatureYCoordinates = {
      D: StaffVocalElement.#bassMajorFlatYCoordinates.F,
      G: StaffVocalElement.#bassMajorFlatYCoordinates.Bb,
      C: StaffVocalElement.#bassMajorFlatYCoordinates.Eb,
      F: StaffVocalElement.#bassMajorFlatYCoordinates.Ab,
      Bb: StaffVocalElement.#bassMajorFlatYCoordinates.Db,
      Eb: StaffVocalElement.#bassMajorFlatYCoordinates.Gb,
      Ab: StaffVocalElement.#bassMajorFlatYCoordinates.Cb,
    };

    static override get observedAttributes(): string[] {
      return [...super.observedAttributes, 'voice'];
    }

    get voice(): VoiceType {
      return (this.getAttribute('voice') as VoiceType) ?? 'soprano';
    }

    set voice(value: VoiceType) {
      this.setAttribute('voice', value);
    }

    get yCoordinates(): YCoordinates {
      switch (this.voice) {
        case 'soprano':
          return StaffVocalElement.#sopranoYCoordinates;
        case 'mezzo':
          return StaffVocalElement.#mezzoYCoordinates;
        case 'alto':
          return StaffVocalElement.#altoYCoordinates;
        case 'tenor':
          return StaffVocalElement.#tenorYCoordinates;
        case 'baritone':
          return StaffVocalElement.#baritoneYCoordinates;
        case 'bass':
          return StaffVocalElement.#bassYCoordinates;
      }
    }

    get octaves(): Octave[] {
      switch (this.voice) {
        case 'soprano':
          return [4, 5, 6];
        case 'mezzo':
          return [3, 4, 5, 6];
        case 'alto':
          return [3, 4, 5];
        case 'tenor':
          return [3, 4, 5];
        case 'baritone':
          return [2, 3, 4];
        case 'bass':
          return [2, 3, 4];
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
      const answer: { useSharps: boolean; coordinates: number[] } = {
        useSharps: false,
        coordinates: [],
      };

      if (this.voice === 'tenor') {
        if (this.mode === 'major') {
          answer.useSharps =
            !!StaffVocalElement.#tenorMajorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#tenorMajorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#tenorMajorFlatYCoordinates[this.keySig] ??
            [];
        } else {
          answer.useSharps =
            !!StaffVocalElement.#tenorMinorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#tenorMinorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#tenorMinorFlatYCoordinates[this.keySig] ??
            [];
        }
      } else if (this.voice === 'baritone' || this.voice === 'bass') {
        if (this.mode === 'major') {
          answer.useSharps =
            !!StaffVocalElement.#bassMajorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#bassMajorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#bassMajorFlatYCoordinates[this.keySig] ??
            [];
        } else {
          answer.useSharps =
            !!StaffVocalElement.#bassMinorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#bassMinorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#bassMinorFlatYCoordinates[this.keySig] ??
            [];
        }
      } else {
        // soprano, mezzo, alto (treble-based)
        if (this.mode === 'major') {
          answer.useSharps =
            !!StaffVocalElement.#trebleMajorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#trebleMajorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#trebleMajorFlatYCoordinates[this.keySig] ??
            [];
        } else {
          answer.useSharps =
            !!StaffVocalElement.#trebleMinorSharpYCoordinates[this.keySig];
          answer.coordinates =
            StaffVocalElement.#trebleMinorSharpYCoordinates[this.keySig] ??
            StaffVocalElement.#trebleMinorFlatYCoordinates[this.keySig] ??
            [];
        }
      }

      return answer;
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
        // Get syllables from the lyrics element
        const syllablesText = lyricEl.textContent ?? '';
        const syllables = this.#parseLyricsText(syllablesText);
        const positions: LyricSyllablePosition[] = [];

        // Position each syllable below its corresponding note
        syllables.forEach((syllable, sylIndex) => {
          if (sylIndex >= noteElements.length) {
            console.error(
              `Lyric verse has more syllables (${syllables.length}) than notes (${noteElements.length})`
            );
            return;
          }

          const noteEl = noteElements[sylIndex];
          const noteRect = noteEl.getBoundingClientRect();
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

        (lyricEl as LyricsElementType).syllables = positions;
        verseIndex++;
      }

      // Trigger lyrics elements to re-render
      for (const lyricEl of lyricsElements) {
        lyricEl.updatePositions();
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
