import { IVoiceElement, NoteChordOrRestElementType } from '../types/elements';
import {
  MUSIC_ARPEGGIO_NODE,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE,
  MUSIC_VOICE_NODE,
  NOTE_EVENTS,
} from '../utils/consts';
// A <music-clef> is a valid <music-voice> child (see #applyDefaults below) —
// only meaningfully honored inside the *first* <music-voice> sibling
// (voice 1), since a clef change is staff-wide and voice 1 is the canonical
// timeline every other voice's beat-offsets are compared against. This
// element can't know its own sibling position, so it can't enforce that
// restriction itself — flattenStaffSlotElements() does, at the staff level.
import { flattenSlotElements } from '../utils/slotElements';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * Groups one contrapuntal voice's entire ordered note/chord/rest/tuplet/
   * arpeggio subtree within a `<music-staff>`. A staff either has zero
   * `<music-voice>` children (a single, implicit voice — today's behavior,
   * unchanged) or two-or-three, wrapping every one of its active voices in
   * sibling order: the 1st `<music-voice>` is voice 1 (always stems up), the
   * 2nd is voice 2 (always stems down), the 3rd is voice 3 (contextual
   * direction). Voice number is never authored on the element itself — it is
   * resolved by the staff from sibling position, see utils/slotElements.ts.
   *
   * The wrapper is layout-only (no shadow DOM, no attributes); the staff
   * reads each voice's `flatElements` independently.
   *
   * @customElement music-voice
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-voice>
   *     <music-note note="C" octave="5" duration="quarter"></music-note>
   *     <music-note note="D" octave="5" duration="quarter"></music-note>
   *   </music-voice>
   *   <music-voice>
   *     <music-note note="C" octave="4" duration="half"></music-note>
   *   </music-voice>
   * </music-staff>
   */
  class VoiceElement extends HTMLElement implements IVoiceElement {
    static get observedAttributes(): string[] {
      return [];
    }

    #childObserver: MutationObserver | null = null;
    #applyingDefaults = false;

    get flatElements(): NoteChordOrRestElementType[] {
      return flattenSlotElements(Array.from(this.children)).flatElements;
    }

    connectedCallback(): void {
      this.#applyDefaults();
      this.#childObserver = new MutationObserver(() => this.#onChildChange());
      this.#childObserver.observe(this, { childList: true });
      this.#notify();
    }

    disconnectedCallback(): void {
      this.#childObserver?.disconnect();
      this.#childObserver = null;
    }

    #elementChildren(): HTMLElement[] {
      return Array.from(this.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement
      );
    }

    #onChildChange(): void {
      if (this.#applyingDefaults) {
        return;
      }
      this.#applyDefaults();
      this.#notify();
    }

    // Validate the structure: voices don't nest. <music-clef> is allowed
    // structurally (a clef change is staff-wide, but voice 1 is its
    // canonical anchor point — see the class-level comment above); only the
    // staff itself (flattenStaffSlotElements) can tell whether this
    // <music-voice> is actually voice 1, so it enforces that part.
    #applyDefaults(): void {
      this.#applyingDefaults = true;
      try {
        for (const child of this.#elementChildren()) {
          if (child.nodeName === MUSIC_VOICE_NODE) {
            console.warn(
              '[music-voice] <music-voice> cannot nest inside another <music-voice>'
            );
          } else if (
            child.nodeName !== MUSIC_NOTE_NODE &&
            child.nodeName !== MUSIC_CHORD_NODE &&
            child.nodeName !== MUSIC_REST_NODE &&
            child.nodeName !== MUSIC_TUPLET_NODE &&
            child.nodeName !== MUSIC_ARPEGGIO_NODE &&
            child.nodeName !== MUSIC_CLEF_NODE
          ) {
            console.warn(
              `[music-voice] <${child.nodeName.toLowerCase()}> is not allowed inside <music-voice>`
            );
          }
        }
      } finally {
        this.#applyingDefaults = false;
      }
    }

    #notify(): void {
      this.dispatchEvent(
        new CustomEvent(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  if (!customElements.get(MUSIC_VOICE)) {
    customElements.define(MUSIC_VOICE, VoiceElement);
  }
}
