import { ITremoloElement, NoteChordOrRestElementType } from '../types/elements';
import type {
  TremoloBeamAttach,
  TremoloBeamPosition,
  TremoloStrokeCount,
} from '../types/theory';
import { MUSIC_TREMOLO, TREMOLO_EVENTS } from '../utils/consts';
import {
  parseTremoloBeamAttach,
  parseTremoloBeamPosition,
  parseTremoloStrokes,
} from '../utils/parsers';
import { flattenSlotElements } from '../utils/slotElements';

const DEFAULT_STROKES: TremoloStrokeCount = 3;

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A two-note (or multi-note) tremolo: wraps two or more `<music-note>` /
   * `<music-chord>` children, each written at the tremolo's full duration,
   * that alternate for that duration once between them. Each member takes an
   * equal share of the bar (the second of two sits halfway through), and the
   * staff joins them with tremolo beams. The wrapper itself is layout-only.
   *
   * @customElement music-tremolo
   * @attr {TremoloStrokeCount} strokes - Number of tremolo beams between the notes (`1`–`4`), on top of the notes' own beams (a quaver tremolo keeps its quaver beam). Defaults to `3`.
   * @attr {TremoloBeamAttach} beam-attach - For a minim tremolo, which beams join the stems: `all` or only the `outer` one. Unset leaves every beam detached, as for every other value. Ignored, with a warning, on other note values.
   * @attr {TremoloBeamPosition} beam-position - `between` places the beams between the noteheads, each note keeping its own stem direction, for two notes an octave or more apart. Ignored, with a warning, otherwise.
   * @attr {string} tremolo-group - `id` shared by one `<music-tremolo>` on each of a measure's two adjacent grand-staff staves, joining them into one tremolo between the hands. Each wrapper holds its own staff's notes plus `<music-rest hidden>` for the other hand's. Requires a `<music-measure>` ancestor; standalone, each wrapper renders as an ordinary tremolo.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-tremolo strokes="3">
   *     <music-note note="F" octave="4" duration="half"></music-note>
   *     <music-note note="A" octave="4" duration="half"></music-note>
   *   </music-tremolo>
   * </music-staff>
   */
  class TremoloElement extends HTMLElement implements ITremoloElement {
    #childObserver: MutationObserver | null = null;

    static get observedAttributes(): string[] {
      return ['strokes', 'beam-attach', 'beam-position', 'tremolo-group'];
    }

    get strokes(): TremoloStrokeCount {
      return (
        parseTremoloStrokes(this.getAttribute('strokes')) ?? DEFAULT_STROKES
      );
    }

    set strokes(value: TremoloStrokeCount) {
      this.setAttribute('strokes', String(value));
    }

    get beamAttach(): TremoloBeamAttach | null {
      return parseTremoloBeamAttach(this.getAttribute('beam-attach'));
    }

    set beamAttach(value: TremoloBeamAttach | null) {
      if (value === null) {
        this.removeAttribute('beam-attach');
      } else {
        this.setAttribute('beam-attach', value);
      }
    }

    get beamPosition(): TremoloBeamPosition | null {
      return parseTremoloBeamPosition(this.getAttribute('beam-position'));
    }

    set beamPosition(value: TremoloBeamPosition | null) {
      if (value === null) {
        this.removeAttribute('beam-position');
      } else {
        this.setAttribute('beam-position', value);
      }
    }

    get tremoloGroup(): string | null {
      return this.getAttribute('tremolo-group');
    }

    set tremoloGroup(value: string | null) {
      if (value === null) {
        this.removeAttribute('tremolo-group');
      } else {
        this.setAttribute('tremolo-group', value);
      }
    }

    get flatElements(): NoteChordOrRestElementType[] {
      return flattenSlotElements([this]).flatElements;
    }

    // A change to the wrapper's children doesn't fire the staff's slotchange,
    // so the wrapper reports it. Initial insertion is covered by slotchange.
    connectedCallback(): void {
      this.#childObserver = new MutationObserver(() => this.#notify());
      this.#childObserver.observe(this, { childList: true });
    }

    disconnectedCallback(): void {
      this.#childObserver?.disconnect();
      this.#childObserver = null;
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue) {
        return;
      }
      if (newValue !== null) {
        const parsed =
          name === 'strokes'
            ? parseTremoloStrokes(newValue)
            : name === 'beam-attach'
            ? parseTremoloBeamAttach(newValue)
            : name === 'beam-position'
            ? parseTremoloBeamPosition(newValue)
            : newValue;
        if (parsed === null) {
          console.warn(
            `[${MUSIC_TREMOLO}] ${name}="${newValue}" is not a valid value; ignoring it`
          );
        }
      }
      if (!this.isConnected) {
        return;
      }
      this.#notify();
    }

    // The wrapper renders nothing itself: the staff redraws its beams.
    #notify(): void {
      this.dispatchEvent(
        new CustomEvent(TREMOLO_EVENTS.ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  if (!customElements.get(MUSIC_TREMOLO)) {
    customElements.define(MUSIC_TREMOLO, TremoloElement);
  }
}
