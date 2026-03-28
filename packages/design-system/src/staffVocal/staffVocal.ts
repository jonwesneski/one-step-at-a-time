import { StaffClassicalElementBase } from '../staffClassicalBase';
import { YCoordinates } from '../types/elements';
import { LetterOctave, Octave, VoiceType } from '../types/theory';
import {
  createBassClefSvg,
  createTreble8ClefSvg,
  createTrebleClefSvg,
} from '../utils/svgCreator/clefs';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  // Lyrics positioning constants
  const LYRICS_BASELINE_OFFSET = -25; // px below staff to first verse
  const LYRICS_VERSE_SPACING = 15; // px between verse lines

  class StaffVocalElement extends StaffClassicalElementBase {
    // Soprano (Treble Clef)
    static #sopYCoordinates: YCoordinates = {
      C6: 10,
      B5: 15,
      A5: 20,
      G5: 25,
      F5: 30,
      E5: 35,
      D5: 40,
      C5: 45,
      B4: 50,
      A4: 55,
      G4: 60,
      F4: 65,
      E4: 70,
      D4: 75,
      C4: 80,
    };

    // Mezzo-Soprano (Treble Clef, Extended Low)
    static #mezzoYCoordinates: YCoordinates = {
      C6: 10,
      B5: 15,
      A5: 20,
      G5: 25,
      F5: 30,
      E5: 35,
      D5: 40,
      C5: 45,
      B4: 50,
      A4: 55,
      G4: 60,
      F4: 65,
      E4: 70,
      D4: 75,
      C4: 80,
      B3: 85,
      A3: 90,
    };

    // Alto (Treble Clef, Extended Low)
    static #altoYCoordinates: YCoordinates = {
      A5: 20,
      G5: 25,
      F5: 30,
      E5: 35,
      D5: 40,
      C5: 45,
      B4: 50,
      A4: 55,
      G4: 60,
      F4: 65,
      E4: 70,
      D4: 75,
      C4: 80,
      B3: 85,
      A3: 90,
      G3: 95,
      F3: 100,
    };

    // Tenor (Treble-8 Clef - same pixel layout as treble, notes shifted down 1 octave)
    static #tenorYCoordinates: YCoordinates = {
      C5: 10,
      B4: 15,
      A4: 20,
      G4: 25,
      F4: 30,
      E4: 35,
      D4: 40,
      C4: 45,
      B3: 50,
      A3: 55,
      G3: 60,
      F3: 65,
      E3: 70,
      D3: 75,
      C3: 80,
    };

    // Baritone (Bass Clef)
    static #bariYCoordinates: YCoordinates = {
      E4: 10,
      D4: 15,
      C4: 20,
      B3: 25,
      A3: 30,
      G3: 35,
      F3: 40,
      E3: 45,
      D3: 50,
      C3: 55,
      B2: 60,
      A2: 65,
      G2: 70,
      F2: 75,
      E2: 80,
    };

    // Bass (Bass Clef)
    static #bassYCoordinates: YCoordinates = {
      E4: 10,
      D4: 15,
      C4: 20,
      B3: 25,
      A3: 30,
      G3: 35,
      F3: 40,
      E3: 45,
      D3: 50,
      C3: 55,
      B2: 60,
      A2: 65,
      G2: 70,
      F2: 75,
      E2: 80,
    };

    // Key signature arrays
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

    static #trebleMajorSharpYCoordinates: { [key: string]: number[] } = {
      G: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      D: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      A: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      E: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      B: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      ['F#']: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      ['C#']: StaffVocalElement.#trebleSharps
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #trebleMajorFlatYCoordinates: { [key: string]: number[] } = {
      F: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Bb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Eb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Ab: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Db: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Gb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
      Cb: StaffVocalElement.#trebleFlats
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#sopYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #trebleMinorSharpYCoordinates: { [key: string]: number[] } = {
      E: StaffVocalElement.#trebleMajorSharpYCoordinates.G,
      B: StaffVocalElement.#trebleMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#trebleMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#trebleMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#trebleMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#trebleMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#trebleMajorSharpYCoordinates['C#'],
    };

    static #trebleMinorFlatYCoordinates: { [key: string]: number[] } = {
      D: StaffVocalElement.#trebleMajorFlatYCoordinates.F,
      G: StaffVocalElement.#trebleMajorFlatYCoordinates.Bb,
      C: StaffVocalElement.#trebleMajorFlatYCoordinates.Eb,
      F: StaffVocalElement.#trebleMajorFlatYCoordinates.Ab,
      Bb: StaffVocalElement.#trebleMajorFlatYCoordinates.Db,
      Eb: StaffVocalElement.#trebleMajorFlatYCoordinates.Gb,
      Ab: StaffVocalElement.#trebleMajorFlatYCoordinates.Cb,
    };

    static #tenorMajorSharpYCoordinates: { [key: string]: number[] } = {
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

    static #tenorMajorFlatYCoordinates: { [key: string]: number[] } = {
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

    static #tenorMinorSharpYCoordinates: { [key: string]: number[] } = {
      E: StaffVocalElement.#tenorMajorSharpYCoordinates.G,
      B: StaffVocalElement.#tenorMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#tenorMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#tenorMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#tenorMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#tenorMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#tenorMajorSharpYCoordinates['C#'],
    };

    static #tenorMinorFlatYCoordinates: { [key: string]: number[] } = {
      D: StaffVocalElement.#tenorMajorFlatYCoordinates.F,
      G: StaffVocalElement.#tenorMajorFlatYCoordinates.Bb,
      C: StaffVocalElement.#tenorMajorFlatYCoordinates.Eb,
      F: StaffVocalElement.#tenorMajorFlatYCoordinates.Ab,
      Bb: StaffVocalElement.#tenorMajorFlatYCoordinates.Db,
      Eb: StaffVocalElement.#tenorMajorFlatYCoordinates.Gb,
      Ab: StaffVocalElement.#tenorMajorFlatYCoordinates.Cb,
    };

    static #bassMajorSharpYCoordinates: { [key: string]: number[] } = {
      G: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      D: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      A: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      E: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      B: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      ['F#']: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      ['C#']: StaffVocalElement.#bassSharps
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #bassMajorFlatYCoordinates: { [key: string]: number[] } = {
      F: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 1)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Bb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 2)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Eb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 3)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Ab: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 4)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Db: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 5)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Gb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 6)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
      Cb: StaffVocalElement.#bassFlats
        .filter((_, i) => i < 7)
        .map(
          (note) =>
            StaffVocalElement.#bariYCoordinates[note as LetterOctave] ?? 0
        ),
    };

    static #bassMinorSharpYCoordinates: { [key: string]: number[] } = {
      E: StaffVocalElement.#bassMajorSharpYCoordinates.G,
      B: StaffVocalElement.#bassMajorSharpYCoordinates.D,
      ['F#']: StaffVocalElement.#bassMajorSharpYCoordinates.A,
      ['C#']: StaffVocalElement.#bassMajorSharpYCoordinates.E,
      ['G#']: StaffVocalElement.#bassMajorSharpYCoordinates.B,
      ['D#']: StaffVocalElement.#bassMajorSharpYCoordinates['F#'],
      ['A#']: StaffVocalElement.#bassMajorSharpYCoordinates['C#'],
    };

    static #bassMinorFlatYCoordinates: { [key: string]: number[] } = {
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
          return StaffVocalElement.#sopYCoordinates;
        case 'mezzo':
          return StaffVocalElement.#mezzoYCoordinates;
        case 'alto':
          return StaffVocalElement.#altoYCoordinates;
        case 'tenor':
          return StaffVocalElement.#tenorYCoordinates;
        case 'baritone':
          return StaffVocalElement.#bariYCoordinates;
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

    override attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (name === 'voice' && oldValue !== newValue) {
        // Voice change triggers full re-render
        super.attributeChangedCallback('mode', oldValue, newValue);
      } else {
        super.attributeChangedCallback(name, oldValue, newValue);
      }
    }

    /**
     * Position lyrics syllables below the staff, aligned with note X-positions.
     * Called by onStaffResize after notes are spaced.
     */
    #positionLyricsIfPresent(): void {
      const lyricsElements = this.querySelectorAll('music-lyrics');
      if (lyricsElements.length === 0) return;

      const noteElements = Array.from(
        this.querySelectorAll('music-note, music-chord')
      ) as HTMLElement[];
      if (noteElements.length === 0) return;

      const staffRect = this.getBoundingClientRect();
      const transcribeContainer = this.shadowRoot?.querySelector(
        '.staff-wrapper'
      ) as HTMLElement | null;
      if (!transcribeContainer) return;

      const transcribeRect = transcribeContainer.getBoundingClientRect();
      const baselineY = transcribeRect.bottom - staffRect.top;

      // Render each lyrics verse
      let verseIndex = 1;
      for (const lyricEl of lyricsElements) {
        // Get syllables from the lyrics element
        const syllablesText = lyricEl.textContent ?? '';
        const syllables = this.#parseLyricsText(syllablesText);

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

          // Store syllable data on the lyrics element for rendering
          if (!lyricEl.dataset.syllables) {
            lyricEl.dataset.syllables = JSON.stringify([]);
          }

          const stored = JSON.parse(lyricEl.dataset.syllables || '[]');
          stored[sylIndex] = {
            text: syllable.text,
            x: noteX,
            y: lyricY,
            isMelisma: syllable.isMelisma,
            isHyphenated: syllable.isHyphenated,
          };
          lyricEl.dataset.syllables = JSON.stringify(stored);
        });

        verseIndex++;
      }

      // Trigger lyrics elements to re-render
      for (const lyricEl of lyricsElements) {
        if (lyricEl instanceof MusicLyricsElement) {
          lyricEl.updatePositions();
        }
      }
    }

    override onStaffResize(): void {
      super.onStaffResize();
      this.#positionLyricsIfPresent();
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

  /**
   * MusicLyricsElement — displays lyrics below the vocal staff
   */
  class MusicLyricsElement extends HTMLElement {
    #syllablePositions: Array<{
      text: string;
      x: number;
      y: number;
      isMelisma: boolean;
      isHyphenated: boolean;
    }> = [];

    #svgContainer: SVGSVGElement | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      if (!this.shadowRoot) return;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            pointer-events: none;
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          svg {
            width: 100%;
            height: 100%;
            overflow: visible;
          }
          text {
            font-family: serif;
            font-size: 12px;
            fill: currentColor;
            user-select: none;
          }
          .hyphen {
            font-size: 10px;
          }
        </style>
        <svg></svg>
      `;

      this.#svgContainer = this.shadowRoot.querySelector(
        'svg'
      ) as SVGSVGElement;
    }

    get verse(): string {
      return this.getAttribute('verse') ?? '1';
    }

    set verse(value: string) {
      this.setAttribute('verse', value);
    }

    updatePositions() {
      if (!this.#svgContainer) return;

      const stored = this.dataset.syllables;
      if (!stored) return;

      try {
        const positions = JSON.parse(stored);
        this.#syllablePositions = positions;
        this.#render();
      } catch {
        // Invalid JSON, skip
      }
    }

    #render() {
      if (!this.#svgContainer) {
        return;
      }

      // Clear previous rendering
      this.#svgContainer.innerHTML = '';

      // Set SVG to use pixel coordinate system (no viewBox scaling)
      this.#svgContainer.removeAttribute('viewBox');
      this.#svgContainer.style.width = '100%';
      this.#svgContainer.style.height = '100%';

      for (let i = 0; i < this.#syllablePositions.length; i++) {
        const syl = this.#syllablePositions[i];

        // Render syllable text
        const text = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        text.setAttribute('x', syl.x.toString());
        text.setAttribute('y', syl.y.toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'hanging');
        text.setAttribute('font-size', '12');
        text.textContent = syl.text;
        this.#svgContainer.appendChild(text);

        // Render hyphen if needed
        if (syl.isHyphenated && i < this.#syllablePositions.length - 1) {
          const nextSyl = this.#syllablePositions[i + 1];
          const hyphenX = (syl.x + nextSyl.x) / 2;
          const hyphen = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'text'
          );
          hyphen.setAttribute('x', hyphenX.toString());
          hyphen.setAttribute('y', syl.y.toString());
          hyphen.setAttribute('text-anchor', 'middle');
          hyphen.setAttribute('dominant-baseline', 'hanging');
          hyphen.setAttribute('class', 'hyphen');
          hyphen.textContent = '-';
          this.#svgContainer.appendChild(hyphen);
        }

        // Render extender line if melisma
        if (syl.isMelisma && i < this.#syllablePositions.length - 1) {
          const nextSyl = this.#syllablePositions[i + 1];
          const line = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'line'
          );
          line.setAttribute('x1', (syl.x + 8).toString());
          line.setAttribute('y1', (syl.y + 6).toString());
          line.setAttribute('x2', (nextSyl.x - 8).toString());
          line.setAttribute('y2', (syl.y + 6).toString());
          line.setAttribute('stroke', 'currentColor');
          line.setAttribute('stroke-width', '0.5');
          this.#svgContainer.appendChild(line);
        }
      }
    }
  }

  if (!customElements.get('music-staff-vocal')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-vocal', StaffVocalElement as any);
  }

  if (!customElements.get('music-lyrics')) {
    customElements.define('music-lyrics', MusicLyricsElement);
  }
}
