import {
  IArpeggioElement,
  NoteChordOrRestElementType,
  NoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import { DurationType } from '../types/theory';
import {
  ARPEGGIO_RUN_DEFAULT_DURATION,
  ARPEGGIO_UNMATCHED_MODES,
  MUSIC_ARPEGGIO,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  NOTE_EVENTS,
} from '../utils/consts';
import { flattenSlotElements } from '../utils/slotElements';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * The written-out arpeggiated chord ("chord notated as consecutive pitches"):
   * a beamed run of `<music-note>`s followed by the target `<music-chord>` (or a
   * lone `<music-note>`). Each run note is tied to its matching-pitch chord tone;
   * the run does not consume beat duration.
   *
   * This is the consecutive-pitch form. For the **wavy vertical line** use the
   * `arpeggio` attribute on `<music-note>` / `<music-chord>` instead.
   *
   * The wrapper is layout-only (no shadow DOM); the staff reads the group and
   * draws the ties. Run notes with no `duration` are given `run-duration`.
   *
   * @customElement music-arpeggio
   * @attr {DurationType} run-duration - Note value drawn for run notes that set no `duration` of their own. Defaults to `thirtysecond`.
   * @attr {'lv' | 'skip'} unmatched - A run note whose pitch is not in the target chord becomes a laissez-vibrer tie (`lv`, default) or is dropped (`skip`).
   * @attr {boolean} lv-label - Draw an `l.v.` label on the laissez-vibrer ties this group produces.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-arpeggio>
   *     <music-note note="C" octave="4"></music-note>
   *     <music-note note="E" octave="4"></music-note>
   *     <music-note note="G" octave="4"></music-note>
   *     <music-chord chord="Cmaj" duration="quarter"></music-chord>
   *   </music-arpeggio>
   * </music-staff>
   */
  class ArpeggioElement extends HTMLElement implements IArpeggioElement {
    static get observedAttributes(): string[] {
      return ['run-duration', 'unmatched', 'lv-label'];
    }

    #childObserver: MutationObserver | null = null;
    #applyingDefaults = false;
    // Run notes whose `duration` the wrapper wrote (vs. author-set) — re-applied
    // when `run-duration` changes.
    #ownedDurations = new WeakSet<Element>();

    get runDuration(): DurationType {
      return (
        (this.getAttribute('run-duration') as DurationType | null) ??
        ARPEGGIO_RUN_DEFAULT_DURATION
      );
    }
    set runDuration(value: DurationType) {
      this.setAttribute('run-duration', value);
    }

    get unmatched(): 'lv' | 'skip' {
      const raw = this.getAttribute('unmatched');
      return (ARPEGGIO_UNMATCHED_MODES as readonly string[]).includes(raw ?? '')
        ? (raw as 'lv' | 'skip')
        : 'lv';
    }
    set unmatched(value: 'lv' | 'skip') {
      this.setAttribute('unmatched', value);
    }

    get lvLabel(): boolean {
      return this.hasAttribute('lv-label');
    }
    set lvLabel(value: boolean) {
      if (value) {
        this.setAttribute('lv-label', '');
      } else {
        this.removeAttribute('lv-label');
      }
    }

    get flatElements(): NoteChordOrRestElementType[] {
      return flattenSlotElements(Array.from(this.children)).flatElements;
    }

    get runElements(): NoteElementType[] {
      const elementChildren = this.#elementChildren();
      return elementChildren
        .slice(0, -1)
        .filter(
          (child): child is NoteElementType =>
            child.nodeName === MUSIC_NOTE_NODE
        );
    }

    get targetElement(): NoteOrChordElementType | null {
      const elementChildren = this.#elementChildren();
      const last = elementChildren[elementChildren.length - 1];
      if (
        last &&
        (last.nodeName === MUSIC_NOTE_NODE ||
          last.nodeName === MUSIC_CHORD_NODE)
      ) {
        return last as NoteOrChordElementType;
      }
      return null;
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

    attributeChangedCallback(
      _name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue || !this.isConnected) {
        return;
      }
      this.#applyDefaults();
      this.#notify();
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

    // Give each run note a drawn value and a marker; validate the structure.
    #applyDefaults(): void {
      this.#applyingDefaults = true;
      try {
        const elementChildren = this.#elementChildren();
        if (elementChildren.length < 2) {
          console.warn(
            '[music-arpeggio] needs at least a run note and a target chord/note'
          );
          return;
        }
        const target = elementChildren[elementChildren.length - 1];
        if (
          target.nodeName !== MUSIC_NOTE_NODE &&
          target.nodeName !== MUSIC_CHORD_NODE
        ) {
          console.warn(
            '[music-arpeggio] the last child must be a <music-chord> or <music-note>'
          );
        }
        for (const child of elementChildren.slice(0, -1)) {
          if (child.nodeName === MUSIC_NOTE_NODE) {
            if (
              !child.hasAttribute('duration') ||
              this.#ownedDurations.has(child)
            ) {
              child.setAttribute('duration', this.runDuration);
              this.#ownedDurations.add(child);
            }
            child.setAttribute('data-arpeggio-run', '');
          } else if (
            child.nodeName === MUSIC_ARPEGGIO_NODE ||
            child.nodeName === MUSIC_TUPLET_NODE ||
            child.nodeName === MUSIC_CLEF_NODE ||
            child.nodeName === MUSIC_REST_NODE
          ) {
            console.warn(
              `[music-arpeggio] <${child.nodeName.toLowerCase()}> is not allowed inside <music-arpeggio>`
            );
          }
        }
        target.setAttribute('data-arpeggio-target', '');
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

  if (!customElements.get(MUSIC_ARPEGGIO)) {
    customElements.define(MUSIC_ARPEGGIO, ArpeggioElement);
  }
}
