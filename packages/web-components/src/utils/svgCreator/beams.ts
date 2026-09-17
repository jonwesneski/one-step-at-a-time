/*
Beam grouping implemented here:
- Beam count per note = flag count (eighth=1, sixteenth=2, thirtysecond=3, …),
  from durationToFlagCountMap.
- Groups are scanned per beat window (#beamGroupWindowDuration): compound
  time (beatType 8, beats a multiple of 3) windows on the dotted quarter;
  plain 4/4 windows on the half-measure; every other time signature windows
  on a single beat. Runs never cross a window boundary, which also means
  they never cross a measure (the builder is invoked once per staff's note
  stream).
- A rest always breaks the current run (no beaming over rests).
- Notes in one beam group share a single stem direction, resolved from the
  group's Y extremes (determineStemDirections in staffNoteRules.ts) — not
  per-note.
- The beam is linearly interpolated between the group's first and last note
  Y, so it's horizontal when they match and slanted otherwise.
- Mixed durations produce a primary beam across the whole group plus
  secondary/fractional (partial-stub) beams for the faster subdivisions,
  built in BeamGroup#computeBeamStructure.
- Tuplet-scaled elements use their scaled duration (via parseTupletRatio) so
  they land in the correct beat window alongside non-tuplet notes.
*/

import {
  durationToFactor,
  durationToFlagCountMap,
} from '../../rules/theoryConsts';
import type { NoteChordOrRestElementType } from '../../types/elements';
import type {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../../types/theory';
import { MUSIC_REST_NODE, SVG_NS } from '../consts';
import {
  BEAM_GAP_PX,
  BEAM_THICKNESS_PX,
  FRACTIONAL_BEAM_WIDTH_PX,
  MAX_STEM_SHORTENING_PX,
  STEM_OVERLAP_PX,
} from '../notationDimensions';
import {
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
} from './note';

/** Y-position data for a single beamed note, passed to BeamsBuilder.buildRenderer(). */
export type NoteYPosition = {
  y: number;
  stemUp: boolean;
  /**
   * Only needed for chords: the Y limit that prevents the outermost beam from
   * overlapping non-extremal noteheads. For stem-up groups the beam outer edge
   * must be ≤ this value; for stem-down it must be ≥ this value.
   */
  chordClearanceY?: number;
};

interface NoteData {
  x: number;
  y: number;
  /** Number of beams on this note (= flag count): 1 = eighth, 2 = sixteenth, etc. */
  beamCount: number;
}

// A single beam line drawn across two stems (or as a fractional beam stub).
// beamLevel 0 = primary beam (outermost), 1 = secondary (first inner), 2 = tertiary, …
// Fractional beams (also called partial or stub beams) have fractionalBeamSide set.
class BeamLine {
  constructor(
    readonly fromNoteIndex: number,
    readonly toNoteIndex: number,
    readonly beamLevel: number,
    readonly fractionalBeamSide?: 'left' | 'right'
  ) {}
}

// Handles SVG drawing and X-repositioning for one beam group. The beam vertical
// offset and per-note stem extensions are (re)derived from the current note
// positions — an index-fraction estimate before setX, the true-X value after.
// Created by BeamGroup.buildRenderer().
class BeamGroupRenderer {
  #notes: NoteData[];
  #beamLines: BeamLine[];
  #stemUp: boolean;
  #chordClearanceY: ReadonlyArray<number | null>;
  #beamVerticalOffset = 0;
  #globalIndices: readonly number[];
  readonly svgGroup: SVGGElement;

  constructor(
    notes: NoteData[],
    beamLines: BeamLine[],
    stemUp: boolean,
    chordClearanceY: ReadonlyArray<number | null>,
    globalIndices: readonly number[],
    svgGroup: SVGGElement
  ) {
    this.#notes = notes;
    this.#beamLines = beamLines;
    this.#stemUp = stemUp;
    this.#chordClearanceY = chordClearanceY;
    this.#globalIndices = globalIndices;
    this.svgGroup = svgGroup;
  }

  // Progress (0 at the first note, 1 at the last) used to interpolate the primary
  // beam Y at note `localIndex`. Falls back to the index fraction before setX has
  // run (note x is NaN) or when the group has no horizontal span; otherwise uses
  // the true-X fraction — the same value repositionBeams() draws the polygon at.
  #beamProgressAt(localIndex: number): number {
    const first = this.#notes[0];
    const last = this.#notes[this.#notes.length - 1];
    const noteX = this.#notes[localIndex].x;
    if (Number.isNaN(noteX) || first.x === last.x) {
      return localIndex / (this.#notes.length - 1);
    }
    return (noteX - first.x) / (last.x - first.x);
  }

  #primaryBeamYAtNote(localIndex: number): number {
    const first = this.#notes[0];
    const last = this.#notes[this.#notes.length - 1];
    return (
      first.y +
      (last.y - first.y) * this.#beamProgressAt(localIndex) +
      this.#beamVerticalOffset
    );
  }

  /**
   * Recomputes the vertical offset that shifts the whole beam line so that:
   *   1. The stem to the innermost beam is never shorter than
   *      MIN_BEAM_STEM_LENGTH_PX. Inner beams stack toward the noteheads, so a
   *      multi-beam group needs a longer stem to the primary beam than a single
   *      beam does — innerStackDepth accounts for that.
   *   2. The beam outer edge does not overlap non-extremal chord noteheads.
   * Both constraints push the beam away from the noteheads, so the more
   * restrictive wins. Runs once from buildRenderer() (index-fraction estimate)
   * and again from repositionBeams() once true X positions are known.
   */
  recomputeVerticalOffset(): void {
    if (this.#notes.length <= 1) {
      this.#beamVerticalOffset = 0;
      return;
    }
    const first = this.#notes[0];
    const last = this.#notes[this.#notes.length - 1];
    const unshiftedBeamYAt = (i: number) =>
      first.y + (last.y - first.y) * this.#beamProgressAt(i);

    // Constraint 1: minimum stem length, measured to the innermost beam.
    // STEM_OVERLAP_PX is subtracted inside stemExtension(), so both the trigger
    // and magnitude must account for it to guarantee the shortest stem to the
    // innermost beam is exactly MIN_BEAM_STEM_LENGTH_PX in the worst case.
    let shortestStemExtension = Infinity;
    for (let i = 0; i < this.#notes.length; i++) {
      const rawExtension = this.#stemUp
        ? this.#notes[i].y - unshiftedBeamYAt(i)
        : unshiftedBeamYAt(i) - this.#notes[i].y;
      shortestStemExtension = Math.min(shortestStemExtension, rawExtension);
    }
    const maxBeamCount = Math.max(...this.#notes.map((n) => n.beamCount));
    const innerStackDepth =
      (maxBeamCount - 1) * (BEAM_THICKNESS_PX + BEAM_GAP_PX);
    const adjustedMaxShortening = MAX_STEM_SHORTENING_PX - STEM_OVERLAP_PX;
    const minRequiredExtension = innerStackDepth - adjustedMaxShortening;
    let verticalOffset = 0;
    if (shortestStemExtension < minRequiredExtension) {
      const shortage = minRequiredExtension - shortestStemExtension;
      verticalOffset = this.#stemUp ? -shortage : shortage;
    }

    // Constraint 2: chord non-extremal notehead clearance.
    for (let i = 0; i < this.#notes.length; i++) {
      const clearanceY = this.#chordClearanceY[i];
      if (clearanceY === null || clearanceY === undefined) continue;
      const beamYUnshifted = unshiftedBeamYAt(i);
      if (this.#stemUp) {
        verticalOffset = Math.min(verticalOffset, clearanceY - beamYUnshifted);
      } else {
        verticalOffset = Math.max(verticalOffset, clearanceY - beamYUnshifted);
      }
    }

    this.#beamVerticalOffset = verticalOffset;
  }

  /**
   * Returns how many px the stem tip must move toward the beam to reach the
   * primary beam at this note's position. Returns null if the note is not in
   * this group.
   */
  stemExtension(globalIndex: number): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) return null;
    if (this.#notes.length <= 1) return 0;

    const delta =
      this.#notes[localIndex].y - this.#primaryBeamYAtNote(localIndex);
    // Subtract STEM_OVERLAP_PX so the tip sits slightly inside the beam polygon
    // rather than exactly at its edge, preventing sub-pixel rendering gaps.
    return (this.#stemUp ? delta : -delta) - STEM_OVERLAP_PX;
  }

  /**
   * The primary (outermost) beam's Y at this note's stem. Null if the note is
   * not in this group. Consumers that need to sit clear of the beam (the tuplet
   * numeral / bracket) read this rather than re-deriving it from staff coords.
   */
  primaryBeamYForIndex(globalIndex: number): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) return null;
    return this.#primaryBeamYAtNote(localIndex);
  }

  setX(globalIndex: number, x: number): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) return;
    const xOffset = this.#stemUp
      ? NOTE_STEM_X_OFFSET
      : NOTE_STEM_X_OFFSET_STEM_DOWN;
    this.#notes[localIndex].x = x + xOffset;
  }

  /** Updates all beam polygon points using the current x/y positions. */
  repositionBeams(): void {
    this.recomputeVerticalOffset();
    const beamPolygons = this.svgGroup.querySelectorAll('polygon');
    // Stem-up: beam layers grow downward (toward noteheads); polygons grow downward.
    // Stem-down: beam layers grow upward (toward noteheads); polygons grow upward.
    const layerDirection = this.#stemUp ? 1 : -1;
    const beamThickness = BEAM_THICKNESS_PX * layerDirection;

    this.#beamLines.forEach((beamLine, i) => {
      const noteX1 = this.#notes[beamLine.fromNoteIndex].x;
      const noteX2 = this.#notes[beamLine.toNoteIndex].x;
      const x1 =
        beamLine.fractionalBeamSide === 'left'
          ? noteX1 - FRACTIONAL_BEAM_WIDTH_PX
          : noteX1;
      const x2 =
        beamLine.fractionalBeamSide === 'right'
          ? noteX2 + FRACTIONAL_BEAM_WIDTH_PX
          : noteX2;
      const levelOffset =
        beamLine.beamLevel * layerDirection * (BEAM_THICKNESS_PX + BEAM_GAP_PX);
      const y1 = this.#primaryBeamYAt(x1) + levelOffset;
      const y2 = this.#primaryBeamYAt(x2) + levelOffset;
      beamPolygons[i].setAttribute(
        'points',
        `${x1},${y1} ${x1},${y1 + beamThickness} ${x2},${
          y2 + beamThickness
        } ${x2},${y2}`
      );
    });
  }

  /**
   * Returns the Y position of the primary beam line at a given X coordinate.
   * Interpolates linearly from the first to the last note's stem tip, then
   * applies the beam's vertical offset.
   */
  #primaryBeamYAt(x: number): number {
    const first = this.#notes[0];
    const last = this.#notes[this.#notes.length - 1];
    if (first.x === last.x) return first.y + this.#beamVerticalOffset;
    return (
      first.y +
      (last.y - first.y) * ((x - first.x) / (last.x - first.x)) +
      this.#beamVerticalOffset
    );
  }
}

// Owns one contiguous beam group (e.g. four consecutive sixteenth notes).
// Indexed by local position (0..n−1 within the group); global-to-local
// mapping is handled via #globalIndices.
class BeamGroup {
  #notes: NoteData[];
  // The single outermost beam connecting all notes in the group.
  #primaryBeam: BeamLine;
  // Full-span beams at level 1+ for consecutive runs of faster notes.
  #secondaryBeams: BeamLine[];
  // Fractional (partial/stub) beams for isolated faster notes at any level.
  #fractionalBeams: BeamLine[];
  #globalIndices: number[];
  #stemUp = true;
  #chordClearanceY: Array<number | null>;

  constructor(flagCounts: number[], globalIndices: number[]) {
    this.#notes = flagCounts.map((beamCount) => ({
      x: NaN,
      y: NaN,
      beamCount,
    }));
    this.#globalIndices = globalIndices;
    this.#chordClearanceY = new Array(flagCounts.length).fill(null);
    // Beam structure is derived only from flag counts and computed once at
    // construction. Only x/y coordinates change at render/resize time.
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      this.#computeBeamStructure();
    this.#primaryBeam = primaryBeam;
    this.#secondaryBeams = secondaryBeams;
    this.#fractionalBeams = fractionalBeams;
  }

  containsNote(globalIndex: number): boolean {
    return this.#globalIndices.includes(globalIndex);
  }

  get globalIndices(): readonly number[] {
    return this.#globalIndices;
  }

  /** Records the Y stem-tip position for the note at globalIndex. */
  setY(
    globalIndex: number,
    y: number,
    stemUp: boolean,
    chordClearanceY?: number
  ): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) return;
    this.#stemUp = stemUp;
    // Beamed notes always render noFlags, so they never draw the per-flag stem
    // extension an unbeamed note would — the tip is the base stem length.
    const tipOffset = stemUp
      ? NOTE_STEM_TIP_Y_OFFSET
      : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    this.#notes[localIndex].y = y + tipOffset;
    if (chordClearanceY !== undefined) {
      this.#chordClearanceY[localIndex] = chordClearanceY;
    }
  }

  /**
   * Builds the SVG <g> element and returns a BeamGroupRenderer, seeded with an
   * index-fraction vertical offset. repositionBeams() recomputes it from true X.
   */
  buildRenderer(): BeamGroupRenderer {
    // Rendering order: primary first, then secondary, then fractional.
    const beamLines = [
      this.#primaryBeam,
      ...this.#secondaryBeams,
      ...this.#fractionalBeams,
    ];
    const svgGroup = this.#buildSvgGroup(beamLines.length);
    const renderer = new BeamGroupRenderer(
      this.#notes,
      beamLines,
      this.#stemUp,
      this.#chordClearanceY,
      this.#globalIndices,
      svgGroup
    );
    renderer.recomputeVerticalOffset();
    return renderer;
  }

  // Derives the beam structure from the flag counts of each note.
  // Level 0 always produces exactly one full-span primary beam.
  // Level 1+ produces either full-span secondary beams (for consecutive runs)
  // or fractional (partial/stub) beams for isolated notes at that level.
  #computeBeamStructure(): {
    primaryBeam: BeamLine;
    secondaryBeams: BeamLine[];
    fractionalBeams: BeamLine[];
  } {
    let primaryBeam: BeamLine | undefined;
    const secondaryBeams: BeamLine[] = [];
    const fractionalBeams: BeamLine[] = [];
    const maxBeamCount = Math.max(...this.#notes.map((n) => n.beamCount));

    for (let level = 0; level < maxBeamCount; level++) {
      let beamRunStart = -1;
      for (let i = 0; i <= this.#notes.length; i++) {
        const participatesAtLevel =
          i < this.#notes.length && this.#notes[i].beamCount > level;

        if (participatesAtLevel && beamRunStart === -1) {
          beamRunStart = i;
        } else if (!participatesAtLevel && beamRunStart !== -1) {
          const runEnd = i - 1;
          if (runEnd > beamRunStart) {
            // Multiple notes — full beam run at this level.
            const beamLine = new BeamLine(beamRunStart, runEnd, level);
            if (level === 0) {
              primaryBeam = beamLine;
            } else {
              secondaryBeams.push(beamLine);
            }
          } else {
            // Single isolated note — fractional (partial/stub) beam toward the nearest neighbor.
            const fractionalBeamSide = beamRunStart > 0 ? 'left' : 'right';
            fractionalBeams.push(
              new BeamLine(
                beamRunStart,
                beamRunStart,
                level,
                fractionalBeamSide
              )
            );
          }
          beamRunStart = -1;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- BeamGroup only exists for ≥2 beamable notes, so a full-span primary beam is always built above
    return { primaryBeam: primaryBeam!, secondaryBeams, fractionalBeams };
  }

  /** Creates the <g> element with one <polygon> per beam line. */
  #buildSvgGroup(beamLineCount: number): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('beam-group');
    for (let i = 0; i < beamLineCount; i++) {
      const beam = document.createElementNS(SVG_NS, 'polygon');
      beam.classList.add('beam');
      beam.setAttribute('fill', 'currentColor');
      g.appendChild(beam);
    }
    return g;
  }
}

// Returned by BeamsBuilder.buildRenderer(). Owns the live SVG groups and
// handles X positioning and beam polygon updates for a complete measure.
class BeamRenderer {
  #groupRenderers: BeamGroupRenderer[];
  readonly svgGroups: readonly SVGGElement[];

  constructor(groupRenderers: BeamGroupRenderer[]) {
    this.#groupRenderers = groupRenderers;
    this.svgGroups = groupRenderers.map((r) => r.svgGroup);
  }

  /** Returns the stem extension (px) for the note at noteIndex, or 0 if not beamed. */
  stemExtension(noteIndex: number): number {
    for (const renderer of this.#groupRenderers) {
      const ext = renderer.stemExtension(noteIndex);
      if (ext !== null) return ext;
    }
    return 0;
  }

  /**
   * The primary-beam Y at the note's stem, or null if the note is not beamed.
   * Valid after spaceAll() (uses true-X interpolation and the final offset).
   */
  primaryBeamYForIndex(noteIndex: number): number | null {
    for (const renderer of this.#groupRenderers) {
      const y = renderer.primaryBeamYForIndex(noteIndex);
      if (y !== null) return y;
    }
    return null;
  }

  setX(noteIndex: number, x: number): void {
    for (const renderer of this.#groupRenderers) {
      renderer.setX(noteIndex, x);
    }
  }

  /** Updates all beam polygon points using the current x/y positions. */
  spaceAll(): void {
    for (const renderer of this.#groupRenderers) {
      renderer.repositionBeams();
    }
  }
}

// Analyzes a measure's note elements at construction, determines beam groups,
// and drives rendering through a two-phase API:
//   Phase 1 (analysis): isBeamed, beamGroupFor — available immediately after construction.
//   Phase 2 (render):   buildRenderer(noteYPositions) → BeamRenderer for setX / spaceAll.
export class BeamsBuilder {
  #groups: BeamGroup[];
  #beamedIndices: Set<number>;

  constructor(
    elements: NoteChordOrRestElementType[],
    time: [BeatsInMeasure, BeatTypeInMeasure],
    elementDurationFactors?: number[],
    elementBeatOffsets?: number[]
  ) {
    const { groups, beamedIndices } = BeamsBuilder.#scan(
      elements,
      time,
      elementDurationFactors,
      elementBeatOffsets
    );
    this.#groups = groups;
    this.#beamedIndices = beamedIndices;
  }

  // Returns the duration (as a whole-note fraction) of each beam-grouping window
  // for the given time signature. This is the single place to extend grouping policy.
  static #beamGroupWindowDuration(
    beats: BeatsInMeasure,
    beatType: BeatTypeInMeasure
  ): number {
    // Compound time (6/8, 9/8, 12/8, …): group per dotted quarter (3 eighths).
    if (beatType === 8 && beats % 3 === 0) return 3 / 8;
    // 4/4: group by half-measure — (beats 1–2) and (beats 3–4).
    if (beats === 4 && beatType === 4) return 2 / 4;
    // All other simple time: one group per beat.
    return 1 / beatType;
  }

  static #scan(
    elements: NoteChordOrRestElementType[],
    time: [BeatsInMeasure, BeatTypeInMeasure],
    elementDurationFactors?: number[],
    elementBeatOffsets?: number[]
  ): { groups: BeamGroup[]; beamedIndices: Set<number> } {
    const [beats, beatType] = time;
    const measureDuration = beats / beatType;
    const beatWindowSize = BeamsBuilder.#beamGroupWindowDuration(
      beats,
      beatType
    );
    const groups: BeamGroup[] = [];
    const beamedIndices = new Set<number>();

    // Whole-note-fraction offset at which each element starts. When
    // elementBeatOffsets is supplied (the v1-scoped auto-combine track's
    // sparse, non-contiguous beat positions — see rules/voiceCombineRules.ts),
    // it's used directly instead of accumulating sequentially: a combined
    // track's own array indices are still 0..N-1, but its real beat-time
    // gaps between entries can be wider than its own durations would sum to
    // (other voices' non-combined material occupies the space between).
    // Otherwise elementDurationFactors, when provided, supplies tuplet-scaled
    // durations so notes inside a tuplet are assigned to the correct window.
    const elementOffsets: number[] =
      elementBeatOffsets ??
      (() => {
        const offsets: number[] = [];
        let offset = 0;
        for (let i = 0; i < elements.length; i++) {
          offsets.push(offset);
          const dur = (elements[i].dataset.duration ??
            elements[i].getAttribute('duration')) as DurationType;
          offset += elementDurationFactors?.[i] ?? durationToFactor[dur] ?? 0;
        }
        return offsets;
      })();

    // Flushes a completed consecutive run; creates a BeamGroup only when the run
    // has ≥ 2 notes (lone beamable notes fall back to flags).
    const flushRun = (
      pendingFlagCounts: number[],
      pendingNoteIndices: number[]
    ) => {
      if (pendingNoteIndices.length >= 2) {
        groups.push(new BeamGroup(pendingFlagCounts, pendingNoteIndices));
        pendingNoteIndices.forEach((i) => beamedIndices.add(i));
      }
    };

    for (
      let beatWindowStart = 0;
      beatWindowStart < measureDuration - 1e-9;
      beatWindowStart += beatWindowSize
    ) {
      const beatWindowEnd = beatWindowStart + beatWindowSize;
      let pendingFlagCounts: number[] = [];
      let pendingNoteIndices: number[] = [];

      for (let i = 0; i < elements.length; i++) {
        const elOffset = elementOffsets[i];
        if (
          elOffset < beatWindowStart - 1e-9 ||
          elOffset >= beatWindowEnd - 1e-9
        )
          continue;

        const dur = (elements[i].dataset.duration ??
          elements[i].getAttribute('duration')) as DurationType;
        const flagCount =
          elements[i].nodeName === MUSIC_REST_NODE
            ? undefined
            : durationToFlagCountMap.get(dur);

        if (flagCount !== undefined) {
          // A non-adjacent index means a non-beamable note broke the run.
          if (
            pendingNoteIndices.length > 0 &&
            pendingNoteIndices[pendingNoteIndices.length - 1] !== i - 1
          ) {
            flushRun(pendingFlagCounts, pendingNoteIndices);
            pendingFlagCounts = [];
            pendingNoteIndices = [];
          }
          pendingFlagCounts.push(flagCount);
          pendingNoteIndices.push(i);
        } else {
          flushRun(pendingFlagCounts, pendingNoteIndices);
          pendingFlagCounts = [];
          pendingNoteIndices = [];
        }
      }

      flushRun(pendingFlagCounts, pendingNoteIndices); // flush any open run at window end
    }

    return { groups, beamedIndices };
  }

  /** Returns true if the note at noteIndex belongs to a beam group (and should suppress its flag). */
  isBeamed(noteIndex: number): boolean {
    return this.#beamedIndices.has(noteIndex);
  }

  /**
   * Returns the global indices of all notes sharing the same beam group as noteIndex,
   * or null if the note is not beamed. Use this to assign a consistent stem direction
   * to the entire group before Y positions are known.
   */
  beamGroupFor(noteIndex: number): readonly number[] | null {
    for (const group of this.#groups) {
      if (group.containsNote(noteIndex)) return group.globalIndices;
    }
    return null;
  }

  /**
   * Phase 2 entry point. Applies Y positions to all beam groups, finalizes each
   * group's beam slant and vertical offset, builds SVG elements, and returns a
   * BeamRenderer ready for X positioning (setX / spaceAll).
   *
   * noteYPositions must be indexed by the same global note index used everywhere
   * else. Pass null for non-beamed notes — they are ignored.
   */
  buildRenderer(noteYPositions: (NoteYPosition | null)[]): BeamRenderer {
    for (let i = 0; i < noteYPositions.length; i++) {
      const pos = noteYPositions[i];
      if (pos === null) continue;
      for (const group of this.#groups) {
        group.setY(i, pos.y, pos.stemUp, pos.chordClearanceY);
      }
    }
    const groupRenderers = this.#groups.map((g) => g.buildRenderer());
    return new BeamRenderer(groupRenderers);
  }
}
