import { NoteOrChordElementType } from '../../types/elements';
import { DurationType } from '../../types/theory';
import { SVG_NS, durationToFlagCountMap } from '../consts';
import { NOTE_STEM_TIP_Y_OFFSET, NOTE_STEM_X_OFFSET } from './note';

interface NoteData {
  x: number;
  y: number;
  beamCount: number;
}

interface BeamSegment {
  x1: number;
  x2: number;
  beamIndex: number;
}

export class BeamCreator {
  static #thickness = 8;
  static #gap = 4;
  static #stubWidth = 6;

  #notes: NoteData[];
  #segments: BeamSegment[];

  constructor(beamCounts: number[]) {
    this.#notes = beamCounts.map((beamCount) => ({
      x: NaN,
      y: NaN,
      beamCount,
    }));
    this.#segments = this.#computeSegments();
  }

  static ifNecessary(
    elements: NoteOrChordElementType[] | SVGElement[]
  ): BeamCreator | null {
    const consecutives: number[] = [];
    for (let i = 0; i < elements.length; i++) {
      const duration =
        elements[i].dataset.duration ?? elements[i].getAttribute('duration');
      if (
        duration !== 'quarter' &&
        duration !== 'half' &&
        duration !== 'whole'
      ) {
        if (consecutives.length === 0) {
          consecutives.push(i);
        } else if (consecutives[i - 1] !== undefined) {
          consecutives.push(i);
        }
      }
    }
    if (consecutives.length && consecutives.length % 2 === 0) {
      const beamCounts = consecutives.map((idx) => {
        const duration = (elements[idx].dataset.duration ??
          elements[idx].getAttribute('duration')) as DurationType;
        return durationToFlagCountMap.get(duration) ?? 1;
      });
      return new BeamCreator(beamCounts);
    }
    return null;
  }

  // x, y are in #notesContainer's coordinate space (1:1 with CSS px).
  // Call once per note as it is spaced; y is the note SVG's top-left y
  // (beamY for chords). Stem offsets are applied internally.
  // todo: account for stem-down
  setNotePosition(index: number, x: number, y: number) {
    this.#notes[index].x = x + NOTE_STEM_X_OFFSET;
    this.#notes[index].y = y + NOTE_STEM_TIP_Y_OFFSET;
  }

  buildBeams(): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('beam-group');
    for (let i = 0; i < this.#segments.length; i++) {
      const polygon = document.createElementNS(SVG_NS, 'polygon');
      polygon.setAttribute('fill', 'currentColor');
      g.appendChild(polygon);
    }
    return g;
  }

  respaceBeam(beamGroup: SVGGElement) {
    this.#segments = this.#computeSegments();
    const polygons = beamGroup.querySelectorAll('polygon');
    this.#segments.forEach((seg, i) => {
      const yOffset =
        seg.beamIndex * (BeamCreator.#thickness + BeamCreator.#gap);
      const y1 = this.#yAtX(seg.x1) + yOffset;
      const y2 = this.#yAtX(seg.x2) + yOffset;
      polygons[i].setAttribute(
        'points',
        `${seg.x1},${y1} ${seg.x1},${y1 + BeamCreator.#thickness} ${seg.x2},${
          y2 + BeamCreator.#thickness
        } ${seg.x2},${y2}`
      );
    });
  }

  #yAtX(x: number): number {
    const first = this.#notes[0];
    const last = this.#notes[this.#notes.length - 1];
    if (first.x === last.x) return first.y;
    return first.y + (last.y - first.y) * ((x - first.x) / (last.x - first.x));
  }

  #computeSegments(): BeamSegment[] {
    const segments: BeamSegment[] = [];
    const maxBeamCount = Math.max(...this.#notes.map((n) => n.beamCount));

    for (let beamIndex = 0; beamIndex < maxBeamCount; beamIndex++) {
      let runStart = -1;
      for (let i = 0; i <= this.#notes.length; i++) {
        const needsThisBeam =
          i < this.#notes.length && this.#notes[i].beamCount > beamIndex;

        if (needsThisBeam && runStart === -1) {
          runStart = i;
        } else if (!needsThisBeam && runStart !== -1) {
          const runEnd = i - 1;
          if (runEnd > runStart) {
            // Multiple notes in the run — full beam across the span
            segments.push({
              x1: this.#notes[runStart].x,
              x2: this.#notes[runEnd].x,
              beamIndex,
            });
          } else {
            // Single isolated note — draw a stub toward the nearest neighbor
            const goLeft = runStart > 0;
            segments.push({
              x1: goLeft
                ? this.#notes[runStart].x - BeamCreator.#stubWidth
                : this.#notes[runStart].x,
              x2: goLeft
                ? this.#notes[runStart].x
                : this.#notes[runStart].x + BeamCreator.#stubWidth,
              beamIndex,
            });
          }
          runStart = -1;
        }
      }
    }

    return segments;
  }
}
