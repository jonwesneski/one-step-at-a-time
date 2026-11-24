import { NoteElement } from '../note/note';
import {
  DRUM_NOTE_ATTRIBUTES,
  parsePercussionInstrument,
  PERCUSSION_INSTRUMENT_MAP,
  PITCH_ONLY_NOTE_ATTRIBUTES,
  unsupportedDrumAttributes,
} from '../rules/percussionRules';
import type { IDrumNoteElement, StaffPosition } from '../types/elements';
import type { PercussionInstrument } from '../types/theory';
import { MUSIC_DRUM_NOTE } from '../utils/consts';

const SUPPORTED = new Set(DRUM_NOTE_ATTRIBUTES);

/**
 * A drumset note for `<music-staff-percussion>`. Its staff position and
 * notehead come from `instrument`. It takes only notation that doesn't depend
 * on pitch, so it has no `note`, `octave`, accidentals, trills, arpeggios,
 * glissandi, octave signs or grace notes; those attributes are ignored with a
 * warning.
 *
 * @customElement music-drum-note
 * @attr {PercussionInstrument} instrument - Drumset instrument: `kick`, `snare`, `hi-hat`, `ride`, `crash`, `floor-tom`, `mid-tom`, `high-tom` or `hi-hat-pedal`. Sets the staff position and notehead (x for cymbals).
 * @attr {DurationType} duration - Note value, optionally dotted (`dotted-quarter`). Defaults to `quarter`.
 * @attr {NoteheadType} notehead - Overrides the instrument's notehead, e.g. `x` on the snare for a cross-stick.
 * @attr {'start' | 'end' | 'laissez-vibrer'} tie - Start or end of a tie, or `laissez-vibrer` (alias `lv`) for a "let ring" tie, as on a crash.
 * @attr {boolean} lv-label - Adds an "l.v." label to a `laissez-vibrer` tie.
 * @attr {TieStyle} tie-style - `dotted` draws the tie this note starts as a dotted line. Defaults to `solid`.
 * @attr {SlurStyle} slur-style - `dotted` draws the slur this note starts as a dotted line, to mark phrase structure apart from a legato slur. Defaults to `solid`.
 * @attr {'start' | 'end'} slur - Start or end of a slur.
 * @attr {string} slur-group - Joins this note to the other members of one slur phrase that crosses staves.
 * @attr {string} for - `id` of the matching start element, to disambiguate interleaved ties/slurs.
 * @attr {DynamicMarking} dynamic - Dynamic marking under the note (`p`, `mf`, `ff`, `sfz`, …).
 * @attr {boolean} swell - A `< >` swell under this note: louder to the middle of its duration, then softer. A hairpin starting, ending or running over the note wins.
 * @attr {boolean} dynamic-shared - Marks `dynamic`, and any hairpin this note starts, as applying to both staves of a pair.
 * @attr {boolean} dynamic-reminder - Draws `dynamic` in brackets as a reminder.
 * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin.
 * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
 * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
 * @attr {ArticulationType} articulation - Articulation or accent, e.g. `accent`, `marcato`, `staccato`.
 * @attr {boolean} articulation-repeat - Repeats the articulation's length mark once per measured-tremolo repetition.
 * @attr {'stressed' | 'unstressed'} stress - Stress mark.
 * @attr {StemDirection} stem-direction - Forces this note's stem direction (`up`/`down`).
 * @attr {string} beam-group - Joins this note to a double-stemmed beam shared with an adjacent staff.
 * @attr {string} shared-stem-for - `id` of an element on an adjacent staff this note shares one stem with.
 * @attr {TremoloValue} tremolo - Single-note tremolo, the usual way to write a roll: `1`–`4` strokes through the stem, or `unmeasured`.
 * @attr {number} tremolo-tuplet - Tuplet numeral for a measured tremolo.
 * @attr {TremoloLabel} tremolo-label - `trem` / `non-trem`, flutter-tongue `flz` / `flt` / `frull`, or `ord` / `nat` / `norm` label above the stave.
 *
 * @example
 * <music-staff-percussion time="4/4">
 *   <music-drum-note instrument="kick" duration="quarter"></music-drum-note>
 *   <music-drum-note instrument="snare" duration="quarter" articulation="accent"></music-drum-note>
 * </music-staff-percussion>
 */
export class DrumNoteElement extends NoteElement implements IDrumNoteElement {
  static override get observedAttributes(): string[] {
    return [...DRUM_NOTE_ATTRIBUTES];
  }

  #lastUnsupportedWarning: string | null = null;

  get instrument(): PercussionInstrument | null {
    return parsePercussionInstrument(this.getAttribute('instrument'));
  }

  set instrument(value: PercussionInstrument | null | undefined) {
    if (value === null || value === undefined) {
      this.removeAttribute('instrument');
    } else {
      this.setAttribute('instrument', value);
    }
  }

  protected override readAttribute(name: string): string | null {
    return SUPPORTED.has(name) ? this.getAttribute(name) : null;
  }

  protected override readsAttribute(name: string): boolean {
    return SUPPORTED.has(name) && this.hasAttribute(name);
  }

  protected override get staffPosition(): StaffPosition | null {
    const instrument = this.instrument;
    return instrument === null ? null : PERCUSSION_INSTRUMENT_MAP[instrument];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const ignored = unsupportedDrumAttributes(
      this.getAttributeNames(),
      PITCH_ONLY_NOTE_ATTRIBUTES
    );
    const warning =
      ignored.length === 0
        ? null
        : `[${MUSIC_DRUM_NOTE}] ignoring ${ignored.join(
            ', '
          )}: drum notes take no pitch-dependent notation`;
    if (warning !== null && warning !== this.#lastUnsupportedWarning) {
      console.warn(warning);
    }
    this.#lastUnsupportedWarning = warning;
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get(MUSIC_DRUM_NOTE)) {
    customElements.define(MUSIC_DRUM_NOTE, DrumNoteElement);
  }
}
