import { isTupletRatio, parseTupletNoteValue } from '../rules/tupletRules';
import { ITupletElement, NoteChordOrRestElementType } from '../types/elements';
import type {
  DurationType,
  TupletBracket,
  TupletPlacement,
  TupletRatio,
} from '../types/theory';
import {
  MUSIC_TUPLET,
  TUPLET_EVENTS,
  TUPLET_PLACEMENTS,
} from '../utils/consts';
import { parseTupletBracket } from '../utils/parsers';
import { flattenSlotElements } from '../utils/slotElements';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * Wraps slotted `<music-note>` / `<music-chord>` / `<music-rest>` children as a
   * tuplet (triplet, quintuplet, …). The staff reads the group and draws the
   * bracket and numeral; the wrapper itself is layout-only.
   *
   * @customElement music-tuplet
   * @attr {TupletRatio} ratio - Tuplet ratio: a bare count like `3` or a full `actual:normal` form like `3:2`. Defaults to `3`.
   * @attr {TupletPlacement} placement - Forces the bracket/numeral `above` or `below` the notes. Unset = the stems' majority vote (or, for a `tuplet-group`, the side nearest its outer notes; on a vocal staff with one voice, above).
   * @attr {DurationType} note-value - Shows the ratio as a note value: `note-value="quarter"` on a quintuplet draws `5=♩`, the numeral, `=` and a small upright note of that value (dotted or undotted, down to a sixty-fourth). Unset = the numeral alone.
   * @attr {TupletBracket} bracket - `always` draws the bracket on a fully beamed group too, along the beam, where `auto` (the default) shows the numeral alone.
   * @attr {string} tuplet-group - `id` shared by one `<music-tuplet>` on each of a measure's two adjacent grand-staff staves, joining them into one tuplet that spans both hands (single-line passage-work with no shared beam). Each wrapper holds its own staff's share of the tuplet's time — use `<music-rest hidden>` for the beats the other hand plays. Requires a `<music-measure>` ancestor; standalone, each wrapper renders as an ordinary tuplet.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-tuplet ratio="3">
   *     <music-note note="C" octave="5" duration="eighth"></music-note>
   *     <music-note note="D" octave="5" duration="eighth"></music-note>
   *     <music-note note="E" octave="5" duration="eighth"></music-note>
   *   </music-tuplet>
   * </music-staff>
   */
  class TupletElement extends HTMLElement implements ITupletElement {
    static get observedAttributes(): string[] {
      return ['ratio', 'tuplet-group', 'placement', 'note-value', 'bracket'];
    }

    // TODO: a standalone <music-tuplet> would need a shadow root with a
    // <slot> to render its children.

    get ratio(): TupletRatio {
      const value = this.getAttribute('ratio');
      return isTupletRatio(value) ? value : '3';
    }

    set ratio(value: TupletRatio) {
      this.setAttribute('ratio', value);
    }

    get tupletGroup(): string | null {
      return this.getAttribute('tuplet-group');
    }

    set tupletGroup(value: string | null) {
      if (value === null) {
        this.removeAttribute('tuplet-group');
      } else {
        this.setAttribute('tuplet-group', value);
      }
    }

    get placement(): TupletPlacement | null {
      const value = this.getAttribute('placement');
      return TUPLET_PLACEMENTS.includes(value as TupletPlacement)
        ? (value as TupletPlacement)
        : null;
    }

    set placement(value: TupletPlacement | null) {
      if (value === null) {
        this.removeAttribute('placement');
      } else {
        this.setAttribute('placement', value);
      }
    }

    get noteValue(): DurationType | null {
      return parseTupletNoteValue(this.getAttribute('note-value'));
    }

    set noteValue(value: DurationType | null) {
      if (value === null) {
        this.removeAttribute('note-value');
      } else {
        this.setAttribute('note-value', value);
      }
    }

    get bracket(): TupletBracket {
      return parseTupletBracket(this.getAttribute('bracket')) ?? 'auto';
    }

    set bracket(value: TupletBracket) {
      this.setAttribute('bracket', value);
    }

    get flatElements(): NoteChordOrRestElementType[] {
      return flattenSlotElements(Array.from(this.children)).flatElements;
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      if (name === 'ratio' && newValue !== null && !isTupletRatio(newValue)) {
        console.warn(
          `[${MUSIC_TUPLET}] ratio="${newValue}" isn't a count like "3" or "actual:normal" like "3:2"; drawing a triplet`
        );
      }
      if (
        name === 'note-value' &&
        newValue !== null &&
        parseTupletNoteValue(newValue) === null
      ) {
        console.warn(
          `[${MUSIC_TUPLET}] note-value="${newValue}" isn't a note value from a double-whole to a sixty-fourth; showing the numeral alone`
        );
      }
      if (
        name === 'bracket' &&
        newValue !== null &&
        parseTupletBracket(newValue) === null
      ) {
        console.warn(
          `[${MUSIC_TUPLET}] bracket="${newValue}" isn't "auto" or "always"; using auto`
        );
      }
      if (!this.isConnected) {
        return;
      }
      // The wrapper renders nothing itself: the staff redraws its bracket
      // and the ancestor measure re-resolves cross-staff tuplet groups.
      this.dispatchEvent(
        new CustomEvent(TUPLET_EVENTS.ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  if (!customElements.get(MUSIC_TUPLET)) {
    customElements.define(MUSIC_TUPLET, TupletElement);
  }
}
