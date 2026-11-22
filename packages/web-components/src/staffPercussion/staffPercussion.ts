import { getClefRenderData } from '../rules/clefRules';
import { StaffNotationElementBase } from '../staffNotationBase';
import type { YCoordinates } from '../types/elements';
import type { Octave } from '../types/theory';
import { MUSIC_STAFF_PERCUSSION } from '../utils/consts';
import { createPercussionClefSvg } from '../utils/svgCreator/clefs';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A five-line drumset staff with a neutral clef. Staff positions stand for
   * instruments, not pitches: set `instrument` on each `<music-note>` (or
   * `note`/`octave`, read as treble-clef positions). It draws no key signature
   * or accidentals, even when a parent measure/composition sets `key-sig`, and
   * ignores `<music-clef>` changes. Usable inside a `<music-measure>` /
   * `<music-composition>` or on its own.
   *
   * @customElement music-staff-percussion
   * @attr {TimeSignature} time - Beats per measure (e.g. `4/4`, `6/8`). Inherited from a parent measure/composition when unset.
   * @attr {'grand' | 'bracket'} group - Joins this staff to its next sibling under a brace or bracket connector.
   * @attr {string} group-id - Shared identifier letting a `group="bracket"` connector span more than two contiguous staves.
   * @attr {string} label - Short margin text to the left of the staff (e.g. an instrument name). Only drawn on the first measure of each visual row.
   * @attr {string} part - Names the part this staff carries.
   *
   * @example
   * <music-staff-percussion time="4/4">
   *   <music-chord duration="quarter">
   *     <music-note instrument="hi-hat"></music-note>
   *     <music-note instrument="kick"></music-note>
   *   </music-chord>
   *   <music-note instrument="snare" duration="quarter"></music-note>
   * </music-staff-percussion>
   */
  class StaffPercussionElement extends StaffNotationElementBase {
    static #positions = getClefRenderData('treble');

    protected override get isPitched(): boolean {
      return false;
    }

    get yCoordinates(): YCoordinates {
      return StaffPercussionElement.#positions.yCoordinates;
    }

    get octaves(): Octave[] {
      return StaffPercussionElement.#positions.octaves;
    }

    public getKeyYCoordinatesFor(): {
      useSharps: boolean;
      coordinates: number[];
    } {
      return { useSharps: false, coordinates: [] };
    }

    protected get clefSvg(): string {
      return createPercussionClefSvg();
    }
  }

  if (!customElements.get(MUSIC_STAFF_PERCUSSION)) {
    customElements.define(
      MUSIC_STAFF_PERCUSSION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
      StaffPercussionElement as any
    );
  }
}
