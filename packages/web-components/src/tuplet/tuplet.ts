import { ITupletElement, NoteChordOrRestElementType } from '../types/elements';
import { TupletRatio } from '../types/theory';
import {
  MUSIC_CHORD_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET,
  MUSIC_TUPLET_NODE,
} from '../utils/consts';

function collectTupletChildren(
  element: HTMLElement
): NoteChordOrRestElementType[] {
  const result: NoteChordOrRestElementType[] = [];
  for (const child of element.children) {
    const tag = child.nodeName;
    if (
      tag === MUSIC_NOTE_NODE ||
      tag === MUSIC_CHORD_NODE ||
      tag === MUSIC_REST_NODE
    ) {
      result.push(child as NoteChordOrRestElementType);
    } else if (tag === MUSIC_TUPLET_NODE) {
      result.push(...collectTupletChildren(child as HTMLElement));
    }
  }
  return result;
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class TupletElement extends HTMLElement implements ITupletElement {
    static get observedAttributes(): string[] {
      return ['ratio'];
    }

    constructor() {
      super();
      // todo: I may want to revisit this if I do standalone mode
      // this.attachShadow({ mode: 'open' });
      // this.shadowRoot!.innerHTML = '<slot></slot>';
    }

    get ratio(): TupletRatio {
      return (this.getAttribute('ratio') ?? '3') as TupletRatio;
    }

    set ratio(value: TupletRatio) {
      this.setAttribute('ratio', value);
    }

    get flatElements(): NoteChordOrRestElementType[] {
      return collectTupletChildren(this);
    }
  }

  customElements.define(MUSIC_TUPLET, TupletElement);
}
