/*
Beams in music notation – concise reference
==========================================

1. Basic idea
-------------
- A beam is one or more horizontal/diagonal lines that connect note stems.
- Beams show rhythmic grouping for notes shorter than a quarter note.
- A single isolated short note uses a flag; 2+ consecutive short notes usually use beams instead.

2. Durations that can be beamed
-------------------------------
- Eighth notes (quavers): 1 beam (replaces 1 flag).
- Sixteenth notes (semiquavers): 2 beams.
- Thirty-second notes: 3 beams.
- Sixty-fourth notes: 4 beams.
- In general: any value shorter than a quarter note can be beamed; the number of beams = number of flags.

3. When to use beams
--------------------
- Use beams to:
  - Make the beat and meter visually clear (group notes by beats/sub-beats).
  - Simplify reading of rhythms (especially dense or syncopated passages).
  - Indicate that a run of notes belongs together rhythmically.
- In instrumental music, beams are preferred for short values instead of individual flags whenever notes are consecutive.

4. When NOT to use beams
------------------------
- Do not beam across bar lines (measures).
- Do not beam across major metric divisions:
  - Example: in 4/4, avoid a beam that spans from beat 2 into beat 3.
  - Instead, break beams at the middle of the bar so beats 1–2 and 3–4 are visually separated (if appropriate).
- Avoid beaming together notes that are not a rhythmic group (e.g., if you want visual separation for phrasing or articulation).
- In traditional vocal notation, short notes are often written with flags rather than beams on syllable changes (modern practice varies).

5. Grouping by time signature
-----------------------------
- Beams reflect the underlying meter:
  - 4/4:
    - Eighths usually beamed in groups of 2 or 4 within the beat structure.
    - Common: (1& 2&)(3& 4&) or per quarter-note beat.
  - 3/4:
    - Group by each quarter-note beat (three groups per bar).
  - 2/4:
    - Group by each quarter-note beat (two groups per bar).
  - 6/8 (compound):
    - Two main beats per bar; each beat = dotted quarter (3 eighths).
    - Beams usually group eighths into two groups of three: (1-2-3)(4-5-6).
  - 9/8, 12/8, etc.:
    - Group eighths into sets of three per main beat according to the compound meter.
- General rule:
  - Keep beam groups aligned with the perceived pulses and sub-pulses of the meter.
  - Break beams where the meter has strong internal accents unless there is a clear reason not to.

6. Mixed durations within a beam
--------------------------------
- You can beam together different short values as long as they are consecutive:
  - Example: eighth–two sixteenths, sixteenth–eighth–sixteenth, etc.
- The outermost (primary) beam connects the whole group at the level of the fastest “shared” value.
- Inner (secondary/tertiary) beams can be broken to show subdivisions:
  - Example: eight 16ths in 4/4 might use a continuous primary beam with secondary beams broken after the 4th note to show 4+4.

7. Beaming over rests
---------------------
- Traditional rule: do not beam over rests; break the beam at the rest.
- Modern engraving sometimes allows beams over short rests to clarify rhythmic grouping, especially in complex rhythms.
- If used, ensure that the beamed grouping is unambiguous and still respects the meter.

8. Stem direction with beams
----------------------------
- All notes in a beamed group share the same stem direction.
- Decide direction by the average pitch of the group:
  - Average below the middle line of the staff: stems up, beam above.
  - Average above the middle line: stems down, beam below.
- In polyphonic textures on one staff, different voices can have independent beaming and stem directions.

9. Beam slant – when and how
----------------------------
- Beams may be horizontal or slanted.
- Horizontal beam:
  - Use when the first and last notes are at the same pitch.
  - Use for repeated notes or patterns whose contour begins and ends on the same line/space.
- Slanted beam:
  - Use when the first and last notes differ in pitch.
  - If the group generally ascends, the beam usually ascends.
  - If the group generally descends, the beam usually descends.
- Practical limits:
  - Do not over-slant; keep the slant modest (roughly within about one staff space between ends).
  - The slant should follow the general contour, not every small jump.

10. Positioning and spacing of beams
------------------------------------
- The beam is positioned such that:
  - All stems are roughly the same length within a group.
  - There is enough space between noteheads and the beam for legibility.
- For very large pitch intervals within a group:
  - The beam may be nearly horizontal with some stems longer/shorter, or
  - The group may be split if readability is compromised.

11. Primary vs secondary beams
------------------------------
- Primary beam:
  - The outermost beam connecting the group (for the “base” short value).
  - Usually continuous across the whole group.
- Secondary (and further) beams:
  - Inner beams that can be broken to show sub-groupings.
  - Example: in a run of 16ths, you might keep the primary beam continuous but break secondary beams at beat boundaries to show 2+2 or 4+4.

12. Tuplets and beams
---------------------
- Tuplets (e.g., triplets, quintuplets) of short notes are often beamed.
- The beam groups the tuplet notes; a tuplet number/ratio is written above or below.
- The tuplet beam should still respect meter clarity where possible, but may override standard grouping to show the tuplet as a unit.

13. Style differences: instrumental vs vocal
--------------------------------------------
- Instrumental writing:
  - Strong preference for beams on short notes whenever grouped.
  - Visual rhythm clarity is the primary concern.
- Vocal writing:
  - Traditional: flags per note, especially when syllables change on each note.
  - Modern editions increasingly use beams for clarity, but often still break beams at syllable boundaries.

14. Common do’s
---------------
- Do beam notes:
  - That belong in the same rhythmic group within a bar.
  - To show subdivisions of a beat clearly (e.g., 3+3, 2+2+2, etc.).
  - In a way that mirrors how you would count the rhythm.
- Do adjust beams:
  - To avoid ambiguity and to match the perceived pulse, even if this means deviating slightly from strict mechanical grouping.

15. Common don’ts
-----------------
- Don’t beam:
  - Across barlines.
  - Across the main internal division of the bar (e.g., between beats 2 and 3 in 4/4) unless there is a strong and clear rhythmic reason.
  - Together notes from different voices on the same staff.
- Don’t let beams:
  - Obscure accidentals, articulations, or lyrics.
  - Become so slanted that stems look wildly unequal.

*/

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
  fractionalBeamDirection?: 'left' | 'right';
}

class _BeamCreator {
  static #thickness = 8;
  static #gap = 4;
  static #fractionalBeamWidth = 6;

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
            // Single isolated note — draw a fractional beam toward the nearest neighbor
            const goLeft = runStart > 0;
            segments.push({
              noteIndex1: runStart,
              noteIndex2: runStart,
              beamIndex,
              fractionalBeamDirection: goLeft ? 'left' : 'right',
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
  setNoteBeamY(index: number, y: number) {
    this.#noteBeams[index].y = y + NOTE_STEM_TIP_Y_OFFSET;
  }

  // x is in #notesContainer's coordinate space (1:1 with CSS px). Call on every spacing/resize.
  setNoteBeamX(index: number, x: number) {
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
        seg.fractionalBeamDirection === 'left'
          ? noteX1 - _BeamCreator.#fractionalBeamWidth
          : noteX1;
      const x2 =
        seg.fractionalBeamDirection === 'right'
          ? noteX2 + _BeamCreator.#fractionalBeamWidth
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
