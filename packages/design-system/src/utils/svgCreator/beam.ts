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
  noteIndex1: number;
  noteIndex2: number;
  beamIndex: number;
  stubDirection?: 'left' | 'right';
}

class _BeamCreator {
  static #thickness = 8;
  static #gap = 4;
  static #stubWidth = 6;

  #noteBeams: NoteData[];
  #segments: BeamSegment[];

  constructor(beamCounts: number[]) {
    this.#noteBeams = beamCounts.map((beamCount) => ({
      x: NaN,
      y: NaN,
      beamCount,
    }));
    this.#segments = this.#computeSegments();
  }

  #computeSegments(): BeamSegment[] {
    const segments: BeamSegment[] = [];
    const maxBeamCount = Math.max(...this.#noteBeams.map((n) => n.beamCount));

    for (let beamIndex = 0; beamIndex < maxBeamCount; beamIndex++) {
      let runStart = -1;
      for (let i = 0; i <= this.#noteBeams.length; i++) {
        const needsThisBeam =
          i < this.#noteBeams.length &&
          this.#noteBeams[i].beamCount > beamIndex;

        if (needsThisBeam && runStart === -1) {
          runStart = i;
        } else if (!needsThisBeam && runStart !== -1) {
          const runEnd = i - 1;
          if (runEnd > runStart) {
            // Multiple notes in the run — full beam across the span
            segments.push({
              noteIndex1: runStart,
              noteIndex2: runEnd,
              beamIndex,
            });
          } else {
            // Single isolated note — draw a stub toward the nearest neighbor
            const goLeft = runStart > 0;
            segments.push({
              noteIndex1: runStart,
              noteIndex2: runStart,
              beamIndex,
              stubDirection: goLeft ? 'left' : 'right',
            });
          }
          runStart = -1;
        }
      }
    }

    return segments;
  }

  // y is the note SVG's top-left y (beamY for chords). Call once per render.
  // todo: account for stem-down
  setNoteY(index: number, y: number) {
    this.#noteBeams[index].y = y + NOTE_STEM_TIP_Y_OFFSET;
  }

  // x is in #notesContainer's coordinate space (1:1 with CSS px). Call on every spacing/resize.
  setNoteX(index: number, x: number) {
    this.#noteBeams[index].x = x + NOTE_STEM_X_OFFSET;
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

  spaceBeam(beamGroup: SVGGElement) {
    const polygons = beamGroup.querySelectorAll('polygon');
    this.#segments.forEach((seg, i) => {
      const noteX1 = this.#noteBeams[seg.noteIndex1].x;
      const noteX2 = this.#noteBeams[seg.noteIndex2].x;
      const x1 =
        seg.stubDirection === 'left'
          ? noteX1 - _BeamCreator.#stubWidth
          : noteX1;
      const x2 =
        seg.stubDirection === 'right'
          ? noteX2 + _BeamCreator.#stubWidth
          : noteX2;
      const yOffset =
        seg.beamIndex * (_BeamCreator.#thickness + _BeamCreator.#gap);
      const y1 = this.#yAtX(x1) + yOffset;
      const y2 = this.#yAtX(x2) + yOffset;
      polygons[i].setAttribute(
        'points',
        `${x1},${y1} ${x1},${y1 + _BeamCreator.#thickness} ${x2},${
          y2 + _BeamCreator.#thickness
        } ${x2},${y2}`
      );
    });
  }

  #yAtX(x: number): number {
    const first = this.#noteBeams[0];
    const last = this.#noteBeams[this.#noteBeams.length - 1];
    if (first.x === last.x) return first.y;
    return first.y + (last.y - first.y) * ((x - first.x) / (last.x - first.x));
  }
}

export type BeamCreator = _BeamCreator;

export const createBeamCreators = (
  elements: NoteOrChordElementType[]
): BeamCreator[] => {
  const beamCreators: BeamCreator[] = [];
  const consecutives: number[] = [];
  for (let i = 0; i < elements.length; i++) {
    const duration =
      elements[i].dataset.duration ?? elements[i].getAttribute('duration');
    if (duration !== 'quarter' && duration !== 'half' && duration !== 'whole') {
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
    // todo: need to properly handle more than 1
    beamCreators.push(new _BeamCreator(beamCounts));
  }
  return beamCreators;
};
