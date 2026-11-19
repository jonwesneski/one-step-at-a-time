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
- A run also breaks where notes change between tremolo and plain, so a
  change of technique reads from the beaming.
- A `<music-tremolo>`'s members never join a run; the group is beamed as a
  unit of its own (TremoloGroupRenderer), sharing one stem direction.
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
import { durationToFlagCountMap } from '../../rules/theoryConsts';
import {
  resolveBetweenTremoloBeams,
  resolveTremoloGroupLayout,
  type TremoloBeamSegment,
  tremoloBeamCounts,
} from '../../rules/tremoloRules';
import type { NoteChordOrRestElementType } from '../../types/elements';
import type {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  TremoloBeamAttach,
} from '../../types/theory';
import { MUSIC_NOTE_NODE, MUSIC_REST_NODE, SVG_NS } from '../consts';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_ESTIMATE_NOTE_SPACING_PX,
  BEAM_THICKNESS_PX,
  STAFF_Y_PADDING,
  STEM_OVERLAP_PX,
} from '../notationDimensions';
import { parseNotehead, parseTremolo } from '../parsers';
import {
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  NOTEHEAD_WIDTH_PX,
} from './note';

/** Y-position data for a single beamed note, passed to BeamsBuilder.buildRenderer(). */
export type NoteYPosition = {
  stemUp: boolean;
  /** Highest and lowest head in the note Y map; equal for a single note. */
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
  /** See BeamPlacementNote.minimumStemPx. */
  minimumStemPx?: number;
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
  minimumStemPx?: number;
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

// Top of a beamed note's SVG in the beams container, then its stem tip at
// the base length, measured from the head nearest the beam (beamed notes
// render noFlags, so no per-tail extension applies).
function baseStemTipY(position: NoteYPosition): number {
  const { stemUp, highestHeadStaffY, lowestHeadStaffY } = position;
  const y =
    STAFF_Y_PADDING +
    (stemUp ? lowestHeadStaffY : highestHeadStaffY) -
    (stemUp ? NOTE_Y_HEAD_OFFSET_STEM_UP : NOTE_Y_HEAD_OFFSET_STEM_DOWN);
  const tipOffset = stemUp
    ? NOTE_STEM_TIP_Y_OFFSET
    : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
  const spread = lowestHeadStaffY - highestHeadStaffY;
  return y + tipOffset + (stemUp ? -spread : spread);
}

// Offset from the note Y map to the beams container, read off a stem tip so
// stem lengths come out exact.
function staffYToContainerY(note: {
  stemUp: boolean;
  tipY: number;
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
}): number {
  return note.stemUp
    ? note.tipY + BASE_STEM_LENGTH_PX - note.highestHeadStaffY
    : note.tipY - BASE_STEM_LENGTH_PX - note.lowestHeadStaffY;
}

// What BeamRenderer needs from each group it owns: a beam group or a
// tremolo group.
interface GroupRenderer {
  readonly svgGroup: SVGGElement;
  stemExtension(globalIndex: number): number | null;
  beamStackEdgeYForIndex(globalIndex: number, above: boolean): number | null;
  setX(globalIndex: number, x: number): void;
  setObstacles(obstacles: readonly BeamObstacle[]): void;
  repositionBeams(): void;
}

function chordSpread(note: NoteData): number {
  return note.lowestHeadStaffY - note.highestHeadStaffY;
}

// Handles SVG drawing and X-repositioning for one beam group. The placement is
// (re)derived from the current note positions — an estimated spacing before
// setX, the true x after. Created by BeamGroup.buildRenderer().
class BeamGroupRenderer implements GroupRenderer {
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
    const toContainerY = staffYToContainerY(this.#notes[0]);
    const toContainer = (placement: BeamPlacement): BeamPlacement => ({
      primaryTopAtFirst: placement.primaryTopAtFirst + toContainerY,
      primaryTopAtLast: placement.primaryTopAtLast + toContainerY,
      levelOffset: placement.levelOffset,
    });
    const obstacles = this.#obstacles.map((obstacle) => ({
      ...obstacle,
      top: obstacle.top - toContainerY,
      bottom: obstacle.bottom - toContainerY,
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
            minimumStemPx: note.minimumStemPx,
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

/** A `<music-tremolo>` the builder beams as a unit of its own. */
export type TremoloBeamGroupSpec = {
  memberIndices: readonly number[];
  duration: DurationType;
  strokes: number;
  beamAttach: TremoloBeamAttach | null;
  // Beams between the heads; the members keep their own stems.
  between: boolean;
};

type TremoloMember = NoteYPosition & {
  // Left edge of the note's SVG and its stem (or notional stem), once spaced.
  noteX: number;
  stemX: number;
  tipY: number;
};

// Draws one two-note (or multi-note) tremolo's beams and gives its members
// their stem lengths. Placed from estimated spacing first, then from the true
// x, like BeamGroupRenderer.
class TremoloGroupRenderer implements GroupRenderer {
  #members: TremoloMember[];
  #globalIndices: readonly number[];
  #spec: TremoloBeamGroupSpec;
  #attached: number;
  #total: number;
  #primaryTops: number[] = [];
  #levelOffset = 0;
  #beams: TremoloBeamSegment[] = [];
  readonly svgGroup: SVGGElement;

  constructor(spec: TremoloBeamGroupSpec, positions: readonly NoteYPosition[]) {
    this.#spec = spec;
    this.#globalIndices = spec.memberIndices;
    this.#members = positions.map((position) => ({
      ...position,
      noteX: NaN,
      stemX: NaN,
      tipY: baseStemTipY(position),
    }));
    const { attached, total } = tremoloBeamCounts(
      spec.duration,
      spec.strokes,
      spec.beamAttach
    );
    this.#attached = spec.between ? 0 : attached;
    this.#total = spec.between ? spec.strokes : total;
    this.svgGroup = document.createElementNS(SVG_NS, 'g');
    this.svgGroup.classList.add('tremolo-beams');
    for (let i = 0; i < this.#total; i++) {
      const beam = document.createElementNS(SVG_NS, 'polygon');
      beam.classList.add('tremolo-beam');
      beam.setAttribute('fill', 'currentColor');
      this.svgGroup.appendChild(beam);
    }
    this.#recomputePlacement();
  }

  #placed(): boolean {
    return this.#members.every((member) => Number.isFinite(member.noteX));
  }

  #noteXs(): number[] {
    return this.#members.map((member, i) =>
      this.#placed() ? member.noteX : i * BEAM_ESTIMATE_NOTE_SPACING_PX
    );
  }

  #stemXs(): number[] {
    const noteXs = this.#noteXs();
    return this.#members.map(
      (member, i) =>
        noteXs[i] +
        (member.stemUp ? NOTE_STEM_X_OFFSET : NOTE_STEM_X_OFFSET_STEM_DOWN)
    );
  }

  #recomputePlacement(): void {
    const toContainerY = staffYToContainerY(this.#members[0]);
    if (this.#spec.between) {
      this.#beams = this.#betweenBeams(toContainerY);
      return;
    }
    const stemUp = this.#members[0].stemUp;
    const layout = resolveTremoloGroupLayout({
      members: this.#members.map((member, i) => ({
        stemX: this.#stemXs()[i],
        nearestHeadY: stemUp
          ? member.highestHeadStaffY
          : member.lowestHeadStaffY,
      })),
      stemUp,
      attached: this.#attached,
      total: this.#total,
    });
    this.#beams = layout.beams.map((beam) => ({
      ...beam,
      top1: beam.top1 + toContainerY,
      top2: beam.top2 + toContainerY,
    }));
    this.#primaryTops = layout.primaryTops.map((top) => top + toContainerY);
    this.#levelOffset = layout.levelOffset;
  }

  // Each note's head nearest the other, its centre and its edge facing it.
  #betweenBeams(toContainerY: number): TremoloBeamSegment[] {
    const [first, second] = this.#members;
    const noteXs = this.#noteXs();
    const firstIsLower =
      first.highestHeadStaffY + first.lowestHeadStaffY >
      second.highestHeadStaffY + second.lowestHeadStaffY;
    const headCenterX = (member: TremoloMember, noteX: number): number =>
      noteX +
      (member.stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX);
    return resolveBetweenTremoloBeams({
      from: {
        edgeX: headCenterX(first, noteXs[0]) + NOTE_HEAD_RADIUS_PX,
        centerY:
          (firstIsLower ? first.highestHeadStaffY : first.lowestHeadStaffY) +
          toContainerY,
      },
      to: {
        edgeX: headCenterX(second, noteXs[1]) - NOTE_HEAD_RADIUS_PX,
        centerY:
          (firstIsLower ? second.lowestHeadStaffY : second.highestHeadStaffY) +
          toContainerY,
      },
      strokes: this.#total,
    });
  }

  stemExtension(globalIndex: number): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1 || this.#spec.between) {
      return null;
    }
    const member = this.#members[localIndex];
    const top = this.#primaryTops[localIndex];
    const edge = member.stemUp ? top : top + BEAM_THICKNESS_PX;
    // An attached beam takes the tip STEM_OVERLAP_PX inside it, like any
    // beam; detached beams leave the stem level with the outermost one.
    const overlap = this.#attached > 0 ? STEM_OVERLAP_PX : 0;
    const extension = member.stemUp
      ? member.tipY - (edge + overlap)
      : edge - overlap - member.tipY;
    return extension + (member.lowestHeadStaffY - member.highestHeadStaffY);
  }

  beamStackEdgeYForIndex(globalIndex: number, above: boolean): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1 || this.#spec.between) {
      return null;
    }
    const top = this.#primaryTops[localIndex];
    const deepestLevelOffset = (this.#total - 1) * this.#levelOffset;
    return above
      ? top + Math.min(0, deepestLevelOffset)
      : top + BEAM_THICKNESS_PX + Math.max(0, deepestLevelOffset);
  }

  setX(globalIndex: number, x: number): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex !== -1) {
      this.#members[localIndex].noteX = x;
    }
  }

  setObstacles(): void {
    // Tremolo beams sit between their own notes, clear of a clef change.
  }

  repositionBeams(): void {
    this.#recomputePlacement();
    const polygons = this.svgGroup.querySelectorAll('polygon');
    this.#beams.forEach((beam, i) => {
      polygons[i].setAttribute(
        'points',
        [
          [beam.x1, beam.top1],
          [beam.x2, beam.top2],
          [beam.x2, beam.top2 + BEAM_THICKNESS_PX],
          [beam.x1, beam.top1 + BEAM_THICKNESS_PX],
        ]
          .map(([x, y]) => `${x},${y}`)
          .join(' ')
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
    const { stemUp, highestHeadStaffY, lowestHeadStaffY, minimumStemPx } =
      position;
    const note = this.#notes[localIndex];
    note.tipY = baseStemTipY(position);
    note.highestHeadStaffY = highestHeadStaffY;
    note.lowestHeadStaffY = lowestHeadStaffY;
    note.stemUp = stemUp;
    note.minimumStemPx = minimumStemPx;
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
  #groupRenderers: GroupRenderer[];
  readonly svgGroups: readonly SVGGElement[];

  constructor(groupRenderers: GroupRenderer[]) {
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
  #tremoloSpecs: readonly TremoloBeamGroupSpec[];
  #tremoloSpecByMember = new Map<number, TremoloBeamGroupSpec>();

  constructor(
    elements: NoteChordOrRestElementType[],
    time: [BeatsInMeasure, BeatTypeInMeasure],
    // Whole-note-fraction offset at which each element starts (tuplet-scaled;
    // sparse for the auto-combine track — see rules/voiceCombineRules.ts).
    beatOffsets: readonly number[],
    // Indices already joined to a cross-staff double-stemmed beam group
    // (rules/doubleStemmedBeamRules.ts) — never join or extend a same-staff
    // run here, exactly like a rest already breaks one, but still report as
    // isBeamed() so the note/chord still suppresses its own flag.
    externallyBeamedIndices: ReadonlySet<number> = new Set(),
    // `<music-tremolo>` groups: their members never join a run and are
    // beamed as a group of their own.
    tremoloSpecs: readonly TremoloBeamGroupSpec[] = []
  ) {
    for (const spec of tremoloSpecs) {
      for (const index of spec.memberIndices) {
        this.#tremoloSpecByMember.set(index, spec);
      }
    }
    const { groups, beamedIndices } = BeamsBuilder.#scan(
      elements,
      time,
      beatOffsets,
      new Set([...externallyBeamedIndices, ...this.#tremoloSpecByMember.keys()])
    );
    this.#groups = groups;
    this.#beamedIndices = beamedIndices;
    this.#externallyBeamedIndices = externallyBeamedIndices;
    this.#tremoloSpecs = tremoloSpecs;
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
    elementOffsets: readonly number[],
    externallyBeamedIndices: ReadonlySet<number>
  ): { groups: BeamGroup[]; beamedIndices: Set<number> } {
    const [beats, beatType] = time;
    const measureDuration = beats / beatType;
    const beatWindowSize = BeamsBuilder.#beamGroupWindowDuration(
      beats,
      beatType
    );
    const groups: BeamGroup[] = [];
    const beamedIndices = new Set<number>();

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
      let pendingHasTremolo = false;

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
          const hasTremolo =
            parseTremolo(elements[i].getAttribute('tremolo')) !== null;
          // A non-adjacent index means a non-beamable note broke the run.
          if (
            pendingNoteIndices.length > 0 &&
            (pendingNoteIndices[pendingNoteIndices.length - 1] !== i - 1 ||
              hasTremolo !== pendingHasTremolo)
          ) {
            flushRun(pendingFlagCounts, pendingNoteIndices);
            pendingFlagCounts = [];
            pendingNoteIndices = [];
          }
          pendingFlagCounts.push(flagCount);
          pendingNoteIndices.push(i);
          pendingHasTremolo = hasTremolo;
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
    const tremolo = this.#tremoloSpecByMember.get(noteIndex);
    return (
      this.#beamedIndices.has(noteIndex) ||
      this.#externallyBeamedIndices.has(noteIndex) ||
      (tremolo !== undefined && !tremolo.between)
    );
  }

  /** True for a `<music-tremolo>` member, whatever its beam placement. */
  isTremoloMember(noteIndex: number): boolean {
    return this.#tremoloSpecByMember.has(noteIndex);
  }

  /** True when a note needs its Y position for a beam or tremolo group. */
  needsYPosition(noteIndex: number): boolean {
    return this.isBeamed(noteIndex) || this.isTremoloMember(noteIndex);
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
    const tremolo = this.#tremoloSpecByMember.get(noteIndex);
    if (tremolo !== undefined && !tremolo.between) {
      return tremolo.memberIndices;
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
    const groupRenderers: GroupRenderer[] = this.#groups.map((g) =>
      g.buildRenderer()
    );
    for (const spec of this.#tremoloSpecs) {
      const positions = spec.memberIndices.map((i) => noteYPositions[i]);
      if (positions.every((position) => position != null)) {
        groupRenderers.push(
          new TremoloGroupRenderer(spec, positions as NoteYPosition[])
        );
      }
    }
    return new BeamRenderer(groupRenderers);
  }
}
