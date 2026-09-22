import { getClefRenderData } from '../rules/clefRules';
import { StaffClassicalElementBase } from '../staffClassicalBase';
import type { YCoordinates } from '../types/elements';
import { ClefType, Octave } from '../types/theory';
import { MUSIC_STAFF } from '../utils/consts';
import { parseClef } from '../utils/parsers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A five-line classical staff. Reads slotted `<music-note>`, `<music-chord>`,
   * `<music-rest>`, `<music-tuplet>` and `<music-clef>` children and engraves them
   * with beams, accidentals, ledger lines and spacing. Usable inside a
   * `<music-measure>` / `<music-composition>` or on its own.
   *
   * @customElement music-staff
   * @attr {'treble' | 'bass'} clef - Clef for the staff. Defaults to `treble`.
   * @attr {Note} key-sig - Key-signature tonic (e.g. `C`, `F#`, `Bb`). Inherited from a parent measure/composition when unset.
   * @attr {'major' | 'minor'} mode - Key-signature mode. Inherited when unset. Defaults to `major`.
   * @attr {TimeSignature} time - Beats per measure (e.g. `4/4`, `6/8`). Inherited when unset.
   * @attr {'grand' | 'bracket'} group - Joins this staff to its next sibling under a brace or bracket connector.
   * @attr {string} group-id - Shared identifier letting a `group="bracket"` connector span more than two contiguous staves.
   * @attr {string} label - Short margin text to the left of the staff (e.g. `r.h.`/`l.h.` hand distribution, an instrument name). Only drawn on the first measure of each visual row.
   *
   * @example
   * <music-staff clef="treble" key-sig="G" mode="major" time="4/4">
   *   <music-note note="G" octave="4" duration="quarter"></music-note>
   *   <music-note note="B" octave="4" duration="quarter"></music-note>
   * </music-staff>
   */
  class StaffElement extends StaffClassicalElementBase {
    static override get observedAttributes(): string[] {
      return [...super.observedAttributes, 'clef'];
    }

    get clef(): ClefType {
      return parseClef(this.getAttribute('clef')) ?? 'treble';
    }

    set clef(value: ClefType) {
      this.setAttribute('clef', value);
    }

    protected override get ownClef(): ClefType {
      return this.clef;
    }

    get yCoordinates(): YCoordinates {
      return getClefRenderData(this.clef).yCoordinates;
    }

    get octaves(): Octave[] {
      return getClefRenderData(this.clef).octaves;
    }

    public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
      const {
        majorSharpYCoordinates,
        minorSharpYCoordinates,
        majorFlatYCoordinates,
        minorFlatYCoordinates,
      } = getClefRenderData(this.clef);
      const _key = this.keySig;
      const answer: { useSharps: boolean; coordinates: number[] } = {
        useSharps: false,
        coordinates: [],
      };
      if (this.mode === 'major') {
        answer.useSharps = !!majorSharpYCoordinates[_key];
        answer.coordinates =
          majorSharpYCoordinates[_key] ?? majorFlatYCoordinates[_key] ?? [];
      } else {
        answer.useSharps = !!minorSharpYCoordinates[_key];
        answer.coordinates =
          minorSharpYCoordinates[_key] ?? minorFlatYCoordinates[_key] ?? [];
      }
      return answer;
    }

    protected get clefSvg(): string {
      return getClefRenderData(this.clef).clefSvg;
    }
  }

  if (!customElements.get(MUSIC_STAFF)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define(MUSIC_STAFF, StaffElement as any);
  }
}
