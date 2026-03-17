import { NoteOrChordElementType } from '../../types/elements';
import { SVG_NS } from '../consts';
import { NOTE_STEM_TIP_Y_OFFSET, NOTE_STEM_X_OFFSET } from './note';

export class BeamCreator {
  static #thickness = 8;
  x1: number;
  x2: number;
  y1: number;
  y2: number;

  constructor() {
    this.x1 = NaN;
    this.x2 = NaN;
    this.y1 = NaN;
    this.y2 = NaN;
  }

  static ifNecessary(
    elements: NoteOrChordElementType[] | SVGElement[]
  ): BeamCreator | null {
    const consecutives: number[] = [];
    let beamCreator: BeamCreator | null = null;
    for (let i = 0; i < elements.length; i++) {
      const duration =
        elements[i].nodeName === 'MUSIC-NOTE' ||
        elements[i].nodeName === 'MUSIC-CHORD'
          ? elements[i].getAttribute('duration')
          : elements[i].dataset.duration;
      if (
        duration === 'eighth' ||
        duration === 'sixteenth' ||
        duration === 'thirtysecond'
      ) {
        if (consecutives.length === 0) {
          consecutives.push(i);
        } else if (consecutives[i - 1] !== undefined) {
          consecutives.push(i);
        }
      }
    }
    if (consecutives.length && consecutives.length % 2 === 0) {
      beamCreator = new BeamCreator();
    }
    return beamCreator;
  }

  // x, y are in #notesContainer's coordinate space (1:1 with CSS px).
  // Call with 'start' for the first beamed note and 'end' for the last.
  updateBeamCoordinates(x: number, y: number, which: 'start' | 'end') {
    // todo: i probably need to account for stemdown
    if (which === 'start') {
      this.x1 = x + NOTE_STEM_X_OFFSET;
      this.y1 = y + NOTE_STEM_TIP_Y_OFFSET;
    } else {
      this.x2 = x + NOTE_STEM_X_OFFSET;
      this.y2 = y + NOTE_STEM_TIP_Y_OFFSET;
    }
  }

  buildBeams(): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('beam-group');

    const leftTop = `${this.x1},${this.y1}`;
    const leftBottom = `${this.x1},${this.y1 + BeamCreator.#thickness}`;
    const rightBottom = `${this.x2},${this.y2 + BeamCreator.#thickness}`;
    const rightTop = `${this.x2},${this.y2}`;

    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('fill', 'currentColor');
    polygon.setAttribute(
      'points',
      `${leftTop} ${leftBottom} ${rightBottom} ${rightTop}`
    );
    g.appendChild(polygon);
    return g;
  }

  respaceBeam(beamGroup: SVGGElement) {
    const polygon = beamGroup.querySelector('polygon');
    if (!polygon) return;

    polygon.setAttribute(
      'points',
      `${this.x1},${this.y1} ${this.x1},${this.y1 + BeamCreator.#thickness} ${
        this.x2
      },${this.y2 + BeamCreator.#thickness} ${this.x2},${this.y2}`
    );
  }
}
