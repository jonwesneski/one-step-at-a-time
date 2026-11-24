import { ChordElement } from '../chord/chord';
import {
  DRUM_CHORD_ATTRIBUTES,
  PITCH_ONLY_CHORD_ATTRIBUTES,
  unsupportedDrumAttributes,
} from '../rules/percussionRules';
import { MUSIC_DRUM_CHORD, MUSIC_DRUM_NOTE, MUSIC_NOTE } from '../utils/consts';

const SUPPORTED = new Set(DRUM_CHORD_ATTRIBUTES);

/**
 * Drums struck together on one stem, e.g. hi-hat and snare. Stacks its
 * `<music-drum-note>` children; any other child is ignored with a warning.
 * Like `<music-drum-note>`, it takes only notation that doesn't depend on
 * pitch.
 *
 * @customElement music-drum-chord
 * @attr {DurationType} duration - Note value for every stroke, optionally dotted. Defaults to `quarter`.
 * @attr {NoteheadType} notehead - Notehead for every stroke that doesn't take one from its instrument or set its own.
 * @attr {'start' | 'end' | 'laissez-vibrer'} tie - Start or end of a tie, or `laissez-vibrer` (alias `lv`) for a "let ring" tie.
 * @attr {boolean} lv-label - Adds an "l.v." label to a `laissez-vibrer` tie.
 * @attr {TieStyle} tie-style - `dotted` draws the tie this chord starts as a dotted line. Defaults to `solid`.
 * @attr {SlurStyle} slur-style - `dotted` draws the slur this chord starts as a dotted line, to mark phrase structure apart from a legato slur. Defaults to `solid`.
 * @attr {'start' | 'end'} slur - Start or end of a slur.
 * @attr {string} slur-group - Joins this chord to the other members of one slur phrase that crosses staves.
 * @attr {string} for - `id` of the matching start element, to disambiguate interleaved ties/slurs.
 * @attr {DynamicMarking} dynamic - Dynamic marking under the chord.
 * @attr {boolean} swell - A `< >` swell under this chord: louder to the middle of its duration, then softer. A hairpin starting, ending or running over the chord wins.
 * @attr {boolean} dynamic-shared - Marks `dynamic`, and any hairpin this chord starts, as applying to both staves of a pair.
 * @attr {boolean} dynamic-reminder - Draws `dynamic` in brackets as a reminder.
 * @attr {'start' | 'end'} crescendo - Start or end of a crescendo hairpin.
 * @attr {'start' | 'end'} decrescendo - Start or end of a decrescendo hairpin.
 * @attr {'start' | 'end'} diminuendo - Alias of `decrescendo`.
 * @attr {ArticulationType} articulation - Articulation or accent, e.g. `accent`, `marcato`, `staccato`.
 * @attr {boolean} articulation-repeat - Repeats the articulation's length mark once per measured-tremolo repetition.
 * @attr {'stressed' | 'unstressed'} stress - Stress mark.
 * @attr {StemDirection} stem-direction - Forces this chord's stem direction (`up`/`down`).
 * @attr {string} beam-group - Joins this chord to a double-stemmed beam shared with an adjacent staff.
 * @attr {string} shared-stem-for - `id` of an element on an adjacent staff this chord shares one stem with.
 * @attr {TremoloValue} tremolo - Single-chord tremolo (a roll): `1`–`4` strokes through the stem, or `unmeasured`.
 * @attr {number} tremolo-tuplet - Tuplet numeral for a measured tremolo.
 * @attr {TremoloLabel} tremolo-label - `trem` / `non-trem` label above the stave.
 *
 * @example
 * <music-drum-chord duration="eighth">
 *   <music-drum-note instrument="hi-hat"></music-drum-note>
 *   <music-drum-note instrument="snare"></music-drum-note>
 * </music-drum-chord>
 */
export class DrumChordElement extends ChordElement {
  static override get observedAttributes(): string[] {
    return [...DRUM_CHORD_ATTRIBUTES];
  }

  #lastUnsupportedWarning: string | null = null;

  protected override get childNoteTag(): string {
    return MUSIC_DRUM_NOTE;
  }

  protected override readAttribute(name: string): string | null {
    return SUPPORTED.has(name) ? this.getAttribute(name) : null;
  }

  protected override readsAttribute(name: string): boolean {
    return SUPPORTED.has(name) && this.hasAttribute(name);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const ignored = unsupportedDrumAttributes(
      this.getAttributeNames(),
      PITCH_ONLY_CHORD_ATTRIBUTES
    );
    const pitchedChildren = this.querySelectorAll(MUSIC_NOTE).length;
    const problems = [
      ...(ignored.length > 0
        ? [
            `ignoring ${ignored.join(
              ', '
            )}: drum chords take no pitch-dependent notation`,
          ]
        : []),
      ...(pitchedChildren > 0
        ? [
            `ignoring ${pitchedChildren} <${MUSIC_NOTE}> child(ren): use <${MUSIC_DRUM_NOTE}>`,
          ]
        : []),
    ];
    const warning =
      problems.length === 0
        ? null
        : `[${MUSIC_DRUM_CHORD}] ${problems.join('; ')}`;
    if (warning !== null && warning !== this.#lastUnsupportedWarning) {
      console.warn(warning);
    }
    this.#lastUnsupportedWarning = warning;
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get(MUSIC_DRUM_CHORD)) {
    customElements.define(MUSIC_DRUM_CHORD, DrumChordElement);
  }
}
