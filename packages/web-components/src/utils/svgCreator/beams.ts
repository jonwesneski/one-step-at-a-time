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
  whole group (determineStemDirections in stemRules.ts), except a kneed
  group, whose stems point both ways (rules/beamRules.ts).
- The beam's height and slope come from rules/beamPlacementRules.ts: beams
  inside the stave attach to stave lines, stems stay near 3½ spaces, and the
  slope follows the outer interval within its limits. A kneed group's beam
  sits between the noteheads.
- Mixed durations produce a primary beam across the whole group plus
  secondary/fractional (partial-stub) beams for the faster subdivisions,
  built in BeamGroup#computeBeamStructure.
- Tuplet-scaled elements use their scaled duration (via parseTupletRatio) so
  they land in the correct beat window alongside non-tuplet notes.
*/

import {
  type BeamObstacle,
  type BeamPlacement,
  resolveBeamPlacement,
  resolveKneedBeamPlacement,
} from '../../rules/beamPlacementRules';
import {
  BeamLineDescriptor,
  computeBeamLevelStructure,
} from '../../rules/beamStructureRules';
import { isTriangle } from '../../rules/noteheadRules';
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
import { MUSIC_NOTE_NODE, MUSIC_REST_NODE, SVG_NS } from '../consts';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_ESTIMATE_NOTE_SPACING_PX,
  BEAM_THICKNESS_PX,
  STEM_OVERLAP_PX,
} from '../notationDimensions';
import { parseNotehead } from '../parsers';
import {
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  NOTEHEAD_WIDTH_PX,
} from './note';

/** Y-position data for a single beamed note, passed to BeamsBuilder.buildRenderer(). */
export type NoteYPosition = {
  /** Top of the note's SVG in the beams container. */
  y: number;
  stemUp: boolean;
  /** Highest and lowest head in the note Y map; equal for a single note. */
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
};

interface NoteData {
  x: number;
  // Stem tip at the base stem length, measured from the head nearest the beam.
  tipY: number;
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
  /** Number of beams on this note (= flag count): 1 = eighth, 2 = sixteenth, etc. */
  beamCount: number;
  stemUp: boolean;
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

function chordSpread(note: NoteData): number {
  return note.lowestHeadStaffY - note.highestHeadStaffY;
}

// Handles SVG drawing and X-repositioning for one beam group. The placement is
// (re)derived from the current note positions — an estimated spacing before
// setX, the true x after. Created by BeamGroup.buildRenderer().
class BeamGroupRenderer {
  #notes: NoteData[];
  #beamLines: BeamLine[];
  #globalIndices: readonly number[];
  #obstacles: readonly BeamObstacle[] = [];
  #placement: BeamPlacement = {
    primaryTopAtFirst: 0,
    primaryTopAtLast: 0,
    levelOffset: 0,
  };
  #hasFittingPlacement = false;
  #placementFirstX = 0;
  #placementLastX = 0;
  readonly svgGroup: SVGGElement;

  constructor(
    notes: NoteData[],
    beamLines: BeamLine[],
    globalIndices: readonly number[],
    svgGroup: SVGGElement
  ) {
    this.#notes = notes;
    this.#beamLines = beamLines;
    this.#globalIndices = globalIndices;
    this.svgGroup = svgGroup;
  }

  #isKneed(): boolean {
    return this.#notes.some((note) => note.stemUp !== this.#notes[0].stemUp);
  }

  #stemXs(): number[] {
    const allPlaced = this.#notes.every((note) => Number.isFinite(note.x));
    return this.#notes.map((note, i) =>
      allPlaced ? note.x : i * BEAM_ESTIMATE_NOTE_SPACING_PX
    );
  }

  setObstacles(obstacles: readonly BeamObstacle[]): void {
    this.#obstacles = obstacles;
  }

  /**
   * Re-places the beam from the current stem positions. Runs once from
   * buildRenderer() (estimated spacing) and again from repositionBeams() once
   * the true x positions are known.
   */
  recomputePlacement(): void {
    const xs = this.#stemXs();
    const last = this.#notes.length - 1;
    // Offset from the note Y map to the beams container, read off a stem tip
    // so stem lengths come out exact.
    const first = this.#notes[0];
    const staffYToContainerY = first.stemUp
      ? first.tipY + BASE_STEM_LENGTH_PX - first.highestHeadStaffY
      : first.tipY - BASE_STEM_LENGTH_PX - first.lowestHeadStaffY;
    const toContainer = (placement: BeamPlacement): BeamPlacement => ({
      primaryTopAtFirst: placement.primaryTopAtFirst + staffYToContainerY,
      primaryTopAtLast: placement.primaryTopAtLast + staffYToContainerY,
      levelOffset: placement.levelOffset,
    });
    const obstacles = this.#obstacles.map((obstacle) => ({
      ...obstacle,
      top: obstacle.top - staffYToContainerY,
      bottom: obstacle.bottom - staffYToContainerY,
    }));
    if (this.#isKneed()) {
      const { placement, fits } = resolveKneedBeamPlacement(
        this.#notes.map((note, i) => ({
          x: xs[i],
          highestHeadY: note.highestHeadStaffY,
          lowestHeadY: note.lowestHeadStaffY,
          beamCount: note.beamCount,
        })),
        this.#notes.map((note) => note.stemUp),
        { obstacles }
      );
      // A knee is only chosen when it fits at any spacing and spans no clef
      // change (rules/beamRules.ts), so this always fits; should it not, the
      // last fitting beam stays, stretched to the new stem positions.
      if (fits || !this.#hasFittingPlacement) {
        this.#placement = toContainer(placement);
        this.#hasFittingPlacement = fits;
      }
    } else {
      const stemUp = this.#notes[0].stemUp;
      this.#placement = toContainer(
        resolveBeamPlacement({
          notes: this.#notes.map((note, i) => ({
            x: xs[i],
            nearestHeadY: stemUp
              ? note.highestHeadStaffY
              : note.lowestHeadStaffY,
            beamCount: note.beamCount,
          })),
          stemUp,
          obstacles,
        })
      );
      this.#hasFittingPlacement = true;
    }
    this.#placementFirstX = xs[0];
    this.#placementLastX = xs[last];
  }

  #primaryTopAt(x: number): number {
    const { primaryTopAtFirst, primaryTopAtLast } = this.#placement;
    const span = this.#placementLastX - this.#placementFirstX;
    if (span === 0) {
      return primaryTopAtFirst;
    }
    return (
      primaryTopAtFirst +
      (primaryTopAtLast - primaryTopAtFirst) *
        ((x - this.#placementFirstX) / span)
    );
  }

  // The beam edge a stem ends at: past every beam the note carries, on the far
  // side from its head.
  #stemEndEdgeY(localIndex: number): number {
    const note = this.#notes[localIndex];
    const top = this.#primaryTopAt(this.#stemXs()[localIndex]);
    const deepestLevelOffset =
      (note.beamCount - 1) * this.#placement.levelOffset;
    return note.stemUp
      ? top + Math.min(0, deepestLevelOffset)
      : top + BEAM_THICKNESS_PX + Math.max(0, deepestLevelOffset);
  }

  /**
   * Returns how many px the stem tip must move toward the beam to reach the
   * beam at this note's position. Returns null if the note is not in this
   * group.
   */
  stemExtension(globalIndex: number): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) {
      return null;
    }
    const note = this.#notes[localIndex];
    const edge = this.#stemEndEdgeY(localIndex);
    // The tip sits STEM_OVERLAP_PX inside the beam so no sub-pixel gap shows.
    // A chord's tip was fitted from its head nearest the beam, but its stem
    // extends from the head that owns it, so the spread is added back.
    const extension = note.stemUp
      ? note.tipY - (edge + STEM_OVERLAP_PX)
      : edge - STEM_OVERLAP_PX - note.tipY;
    return extension + chordSpread(note);
  }

  /**
   * The outer edge, on the `above` side, of the whole beam stack at this
   * note's stem. Null if the note is not in this group. Consumers that need to
   * sit clear of the beams (the tuplet numeral / bracket) read this rather
   * than re-deriving it from staff coords.
   */
  beamStackEdgeYForIndex(globalIndex: number, above: boolean): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) {
      return null;
    }
    const top = this.#primaryTopAt(this.#stemXs()[localIndex]);
    const maxBeamCount = Math.max(...this.#notes.map((note) => note.beamCount));
    const deepestLevelOffset = (maxBeamCount - 1) * this.#placement.levelOffset;
    return above
      ? top + Math.min(0, deepestLevelOffset)
      : top + BEAM_THICKNESS_PX + Math.max(0, deepestLevelOffset);
  }

  setX(globalIndex: number, x: number): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) {
      return;
    }
    const xOffset = this.#notes[localIndex].stemUp
      ? NOTE_STEM_X_OFFSET
      : NOTE_STEM_X_OFFSET_STEM_DOWN;
    this.#notes[localIndex].x = x + xOffset;
  }

  /** Updates all beam polygon points using the current x/y positions. */
  repositionBeams(): void {
    this.recomputePlacement();
    const beamPolygons = this.svgGroup.querySelectorAll('polygon');
    const xs = this.#stemXs();
    const { levelOffset } = this.#placement;
    // Corners run outer-left, inner-left, inner-right, outer-right, where the
    // outer edge faces away from the direction the beams stack in.
    const outerIsTop = levelOffset > 0;

    this.#beamLines.forEach((beamLine, i) => {
      const noteX1 = xs[beamLine.fromNoteIndex];
      const noteX2 = xs[beamLine.toNoteIndex];
      const x1 =
        beamLine.fractionalBeamSide === 'left'
          ? noteX1 - NOTEHEAD_WIDTH_PX
          : noteX1;
      const x2 =
        beamLine.fractionalBeamSide === 'right'
          ? noteX2 + NOTEHEAD_WIDTH_PX
          : noteX2;
      const levelShift = beamLine.beamLevel * levelOffset;
      const top1 = this.#primaryTopAt(x1) + levelShift;
      const top2 = this.#primaryTopAt(x2) + levelShift;
      const [outer1, inner1, inner2, outer2] = outerIsTop
        ? [top1, top1 + BEAM_THICKNESS_PX, top2 + BEAM_THICKNESS_PX, top2]
        : [top1 + BEAM_THICKNESS_PX, top1, top2, top2 + BEAM_THICKNESS_PX];
      beamPolygons[i].setAttribute(
        'points',
        `${x1},${outer1} ${x1},${inner1} ${x2},${inner2} ${x2},${outer2}`
      );
    });
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

  constructor(flagCounts: number[], globalIndices: number[]) {
    this.#notes = flagCounts.map((beamCount) => ({
      x: NaN,
      tipY: NaN,
      highestHeadStaffY: NaN,
      lowestHeadStaffY: NaN,
      beamCount,
      stemUp: true,
    }));
    this.#globalIndices = globalIndices;
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

  /** Records the Y data for the note at globalIndex. */
  setY(globalIndex: number, position: NoteYPosition): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) {
      return;
    }
    const { y, stemUp, highestHeadStaffY, lowestHeadStaffY } = position;
    // Beamed notes always render noFlags, so they never draw the per-flag stem
    // extension an unbeamed note would — the tip is the base stem length.
    const tipOffset = stemUp
      ? NOTE_STEM_TIP_Y_OFFSET
      : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const spread = lowestHeadStaffY - highestHeadStaffY;
    const note = this.#notes[localIndex];
    note.tipY = y + tipOffset + (stemUp ? -spread : spread);
    note.highestHeadStaffY = highestHeadStaffY;
    note.lowestHeadStaffY = lowestHeadStaffY;
    note.stemUp = stemUp;
  }

  /**
   * Builds the SVG <g> element and returns a BeamGroupRenderer, placed from an
   * estimated spacing. repositionBeams() re-places it from the true x.
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
      this.#globalIndices,
      svgGroup
    );
    renderer.recomputePlacement();
    return renderer;
  }

  // Derives the beam structure from the flag counts of each note — the pure
  // level-by-level run detection lives in rules/beamStructureRules.ts (shared
  // with double-stemmed beams' own cross-staff structure); this wraps its
  // plain descriptors back into BeamLine instances for the renderer below.
  #computeBeamStructure(): {
    primaryBeam: BeamLine;
    secondaryBeams: BeamLine[];
    fractionalBeams: BeamLine[];
  } {
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure(this.#notes.map((n) => n.beamCount));
    const toBeamLine = (d: BeamLineDescriptor): BeamLine =>
      new BeamLine(
        d.fromNoteIndex,
        d.toNoteIndex,
        d.beamLevel,
        d.fractionalBeamSide
      );

    return {
      primaryBeam: toBeamLine(primaryBeam),
      secondaryBeams: secondaryBeams.map(toBeamLine),
      fractionalBeams: fractionalBeams.map(toBeamLine),
    };
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
   * The outer edge, on the `above` side, of the beam stack at the note's stem,
   * or null if the note is not beamed. Valid after spaceAll() (uses the true x).
   */
  beamStackEdgeYForIndex(noteIndex: number, above: boolean): number | null {
    for (const renderer of this.#groupRenderers) {
      const y = renderer.beamStackEdgeYForIndex(noteIndex, above);
      if (y !== null) {
        return y;
      }
    }
    return null;
  }

  setX(noteIndex: number, x: number): void {
    for (const renderer of this.#groupRenderers) {
      renderer.setX(noteIndex, x);
    }
  }

  /**
   * Rects (beams-container px) the beams must stay clear of, such as a clef
   * change; applied on the next spaceAll().
   */
  setObstacles(obstacles: readonly BeamObstacle[]): void {
    for (const renderer of this.#groupRenderers) {
      renderer.setObstacles(obstacles);
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
  #externallyBeamedIndices: ReadonlySet<number>;

  constructor(
    elements: NoteChordOrRestElementType[],
    time: [BeatsInMeasure, BeatTypeInMeasure],
    elementDurationFactors?: number[],
    elementBeatOffsets?: number[],
    // Indices already joined to a cross-staff double-stemmed beam group
    // (rules/doubleStemmedBeamRules.ts) — never join or extend a same-staff
    // run here, exactly like a rest already breaks one, but still report as
    // isBeamed() so the note/chord still suppresses its own flag.
    externallyBeamedIndices: ReadonlySet<number> = new Set()
  ) {
    const { groups, beamedIndices } = BeamsBuilder.#scan(
      elements,
      time,
      elementDurationFactors,
      elementBeatOffsets,
      externallyBeamedIndices
    );
    this.#groups = groups;
    this.#beamedIndices = beamedIndices;
    this.#externallyBeamedIndices = externallyBeamedIndices;
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
    elementBeatOffsets?: number[],
    externallyBeamedIndices: ReadonlySet<number> = new Set()
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

        if (externallyBeamedIndices.has(i)) {
          // Already joined to a cross-staff beam group — breaks a same-staff
          // run exactly like a rest does, but isBeamed() reports it true
          // separately (see the constructor's own field), so its flag still
          // suppresses correctly.
          flushRun(pendingFlagCounts, pendingNoteIndices);
          pendingFlagCounts = [];
          pendingNoteIndices = [];
          continue;
        }

        const dur = (elements[i].dataset.duration ??
          elements[i].getAttribute('duration')) as DurationType;
        // A triangle (undefined extreme pitch) always stands alone with its
        // own flag. A chord can't be one: its triangle value falls back to
        // normal heads.
        const flagCount =
          elements[i].nodeName === MUSIC_REST_NODE ||
          (elements[i].nodeName === MUSIC_NOTE_NODE &&
            isTriangle(parseNotehead(elements[i].getAttribute('notehead'))))
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

  /**
   * Returns true if the note at noteIndex belongs to a same-staff beam group
   * OR a cross-staff double-stemmed one (and should suppress its flag either
   * way) — see the constructor's externallyBeamedIndices param.
   */
  isBeamed(noteIndex: number): boolean {
    return (
      this.#beamedIndices.has(noteIndex) ||
      this.#externallyBeamedIndices.has(noteIndex)
    );
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
   * Phase 2 entry point. Applies Y positions to all beam groups, places each
   * group's beam, builds SVG elements, and returns a
   * BeamRenderer ready for X positioning (setX / spaceAll).
   *
   * noteYPositions must be indexed by the same global note index used everywhere
   * else. Pass null for non-beamed notes — they are ignored.
   */
  buildRenderer(noteYPositions: (NoteYPosition | null)[]): BeamRenderer {
    for (let i = 0; i < noteYPositions.length; i++) {
      const position = noteYPositions[i];
      if (position === null) {
        continue;
      }
      for (const group of this.#groups) {
        group.setY(i, position);
      }
    }
    const groupRenderers = this.#groups.map((g) => g.buildRenderer());
    return new BeamRenderer(groupRenderers);
  }
}
