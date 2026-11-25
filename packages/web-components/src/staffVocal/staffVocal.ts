import { ClefRenderData, getClefRenderData } from '../rules/clefRules';
import type { KeySignatureState } from '../rules/keySignatureChangeRules';
import {
  calculateStaffVocalMinWidth,
  calculateStaffVocalNaturalWidth,
} from '../rules/staffWidth';
import {
  generateKeySignatureYCoordinates,
  generateMinorKeySignatureYCoordinates,
  generateYCoordinates,
} from '../rules/theoryHelpers';
import { StaffNotationElementBase } from '../staffNotationBase';
import type {
  LyricSyllablePosition,
  LyricsElementType,
  NoteOrChordElementType,
  YCoordinates,
} from '../types/elements';
import type { Octave, VocalType } from '../types/theory';
import {
  CHORD_TAGS,
  LYRICS_EVENTS,
  MUSIC_LYRICS,
  MUSIC_STAFF_VOCAL,
  MUSIC_VOICE,
  NOTE_TAGS,
} from '../utils/consts';
import {
  LYRICS_INK_GAP_PX,
  LYRICS_ROW_EPSILON_PX,
  LYRICS_VERSE_SPACING_PX,
  LYRICS_WRAPPER_OVERLAP_PX,
} from '../utils/notationDimensions';
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

const LYRICS_SPACE_SOURCE = 'lyrics';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
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
  class StaffVocalElement extends StaffNotationElementBase {
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

    protected override get lyricsBelow(): boolean {
      return true;
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

    // A vocal staff's clef follows its voice type, so `clef` is ignored.
    public getKeyYCoordinatesFor(state: KeySignatureState): {
      useSharps: boolean;
      coordinates: number[];
    } {
      const tables: KeySignatureTables =
        this.voice === 'tenor'
          ? StaffVocalElement.#tenorKeyTables
          : this.voice === 'baritone' || this.voice === 'bass'
          ? StaffVocalElement.#bass
          : StaffVocalElement.#treble;
      const [sharps, flats] =
        state.mode === 'major'
          ? [tables.majorSharpYCoordinates, tables.majorFlatYCoordinates]
          : [tables.minorSharpYCoordinates, tables.minorFlatYCoordinates];
      return {
        useSharps: !!sharps[state.keySig],
        coordinates: sharps[state.keySig] ?? flats[state.keySig] ?? [],
      };
    }

    protected override onNotesLaidOut(): void {
      this.#positionLyricsIfPresent();
    }

    #boundPositionLyrics = () => this.#positionLyricsIfPresent();

    protected override onConnectedCallback(): void {
      super.onConnectedCallback();
      this.addEventListener(LYRICS_EVENTS.CHANGE, this.#boundPositionLyrics);
    }

    protected override onDisconnectedCallback(): void {
      super.onDisconnectedCallback();
      this.removeEventListener(LYRICS_EVENTS.CHANGE, this.#boundPositionLyrics);
      this.#alignedLyricsRowY = null;
    }

    // Where the first verse's tops stand (px below the staff's top edge): as
    // this staff's own music needs, null without lyrics, and for the whole
    // system.
    #ownLyricsRowY: number | null = null;
    #alignedLyricsRowY: number | null = null;

    /** The lyric line this staff's own music needs; null without lyrics. */
    get ownLyricsRowY(): number | null {
      return this.#ownLyricsRowY;
    }

    /**
     * Set by the ancestor `<music-composition>` so every bar of a system has
     * its lyrics on one line. Returns whether this staff's line moved.
     */
    alignLyricsRow(y: number | null): boolean {
      const before = this.#lyricsRowY;
      this.#alignedLyricsRowY = y;
      const moved =
        before !== null &&
        Math.abs((this.#lyricsRowY ?? before) - before) >=
          LYRICS_ROW_EPSILON_PX;
      if (moved) {
        this.#positionLyricsIfPresent();
      }
      return moved;
    }

    get #lyricsRowY(): number | null {
      return this.#ownLyricsRowY === null
        ? null
        : Math.max(this.#ownLyricsRowY, this.#alignedLyricsRowY ?? -Infinity);
    }

    // The usual distance below the stave, or further down to clear what the
    // staff draws there. Lyrics keep one line, so the lowest ink decides.
    #computeOwnLyricsRowY(wrapperBottom: number): number {
      const usual = wrapperBottom - LYRICS_WRAPPER_OVERLAP_PX;
      const inkBelow = this.inkBelowBottomLine;
      const bottomLineY =
        this.staffContainer.getBoundingClientRect().bottom -
        this.getBoundingClientRect().top;
      const connectorsBottom = this.connectorsBottomY;
      return Math.max(
        usual,
        inkBelow > 0 ? bottomLineY + inkBelow + LYRICS_INK_GAP_PX : -Infinity,
        connectorsBottom === null
          ? -Infinity
          : connectorsBottom + LYRICS_INK_GAP_PX
      );
    }

    // Lyrics hang past the staff's box, so each verse takes page space.
    #reserveLyricsSpace(verseCount: number, wrapperHeight: number): void {
      const rowY = this.#lyricsRowY;
      this.reserveVerticalSpace(LYRICS_SPACE_SOURCE, {
        top: 0,
        bottom:
          rowY === null
            ? 0
            : Math.max(
                0,
                Math.ceil(
                  rowY + verseCount * LYRICS_VERSE_SPACING_PX - wrapperHeight
                )
              ),
      });
    }

    // Each verse's syllables-vs-notes mismatch, so a resize doesn't repeat it.
    #lastLyricWarnings = new Set<string>();

    // A syllable sits under each sung entry: chord tones share their chord's
    // syllable, and a tie continuation carries the previous one on. Of several
    // voices, the first with notes carries the words.
    #sungEntries(): NoteOrChordElementType[] {
      const entries = Array.from(
        (this as unknown as ParentNode).querySelectorAll<
          HTMLElement & NoteOrChordElementType
        >(`${NOTE_TAGS}, ${CHORD_TAGS}`)
      ).filter((entry) => entry.parentElement?.closest(CHORD_TAGS) === null);
      const voice = entries[0]?.closest(MUSIC_VOICE) ?? null;
      return entries.filter(
        (entry) =>
          entry.closest(MUSIC_VOICE) === voice &&
          entry.getAttribute('tie') !== 'end'
      );
    }

    // Verses stack by their `verse` number; equal or invalid numbers keep
    // document order.
    #lyricsInVerseOrder(): MusicLyricsElement[] {
      const lyrics = Array.from(
        this.querySelectorAll(MUSIC_LYRICS)
      ) as MusicLyricsElement[];
      // A verse's own change event can arrive before later verses upgrade.
      for (const lyric of lyrics) {
        customElements.upgrade(lyric);
      }
      const verseNumber = (lyric: MusicLyricsElement) => {
        const parsed = parseInt(lyric.verse, 10);
        return Number.isNaN(parsed) ? Infinity : parsed;
      };
      return lyrics
        .map((lyric, index) => ({ lyric, index }))
        .sort(
          (a, b) =>
            verseNumber(a.lyric) - verseNumber(b.lyric) || a.index - b.index
        )
        .map(({ lyric }) => lyric);
    }

    #positionLyricsIfPresent(): void {
      const lyricsElements = this.#lyricsInVerseOrder();
      const noteElements = this.#sungEntries();
      if (lyricsElements.length === 0 || noteElements.length === 0) {
        this.#ownLyricsRowY = null;
        this.#reserveLyricsSpace(0, 0);
        for (const lyricEl of lyricsElements) {
          (lyricEl as LyricsElementType).updatePositions([]);
        }
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
      const wrapperBottom = transcribeRect.bottom - staffRect.top;
      this.#ownLyricsRowY = this.#computeOwnLyricsRowY(wrapperBottom);
      const rowY = this.#lyricsRowY ?? this.#ownLyricsRowY;
      this.#reserveLyricsSpace(lyricsElements.length, wrapperBottom);

      const warnings = new Set<string>();
      let verseIndex = 0;
      for (const lyricEl of lyricsElements) {
        const syllables = this.#parseLyricsText(lyricEl.textContent ?? '');
        if (syllables.length > noteElements.length) {
          warnings.add(
            `[${MUSIC_STAFF_VOCAL}] verse ${lyricEl.verse} has more syllables (${syllables.length}) than notes (${noteElements.length})`
          );
        }
        const lyricY = rowY + verseIndex * LYRICS_VERSE_SPACING_PX;
        const positions: LyricSyllablePosition[] = syllables
          .slice(0, noteElements.length)
          .map((syllable, sylIndex) => {
            const noteRect = this.drawnEntryOf(
              noteElements[sylIndex]
            ).getBoundingClientRect();
            return {
              text: syllable.text,
              x: noteRect.left - staffRect.left + noteRect.width / 2,
              y: lyricY,
              isMelisma: syllable.isMelisma,
              isHyphenated: syllable.isHyphenated,
            };
          });

        (lyricEl as LyricsElementType).updatePositions(positions);
        verseIndex++;
      }
      for (const warning of warnings) {
        if (!this.#lastLyricWarnings.has(warning)) {
          console.warn(warning);
        }
      }
      this.#lastLyricWarnings = warnings;

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
        const {
          noteCount,
          leftwardWidth,
          rightwardWidth,
          endWarningWidth,
          totalSlackWeight,
          requiredWidth,
          uncrowdedWidth,
        } = strutInputs;
        const minWidth = Math.max(
          requiredWidth,
          calculateStaffVocalMinWidth(
            this.describeEndX,
            noteCount,
            maxLyricChars,
            leftwardWidth,
            rightwardWidth,
            endWarningWidth
          )
        );
        const naturalWidth = Math.max(
          requiredWidth,
          uncrowdedWidth,
          calculateStaffVocalNaturalWidth(
            this.describeEndX,
            noteCount,
            maxLyricChars,
            totalSlackWeight,
            leftwardWidth,
            rightwardWidth,
            endWarningWidth
          )
        );
        this.reportStaffWidths({ minWidth, naturalWidth, uncrowdedWidth });
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
        if (!word) {
          continue;
        }
        const parts = word.split('-');

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) {
            continue;
          }

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

  if (!customElements.get(MUSIC_STAFF_VOCAL)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define(MUSIC_STAFF_VOCAL, StaffVocalElement as any);
  }
}
