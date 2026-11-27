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
- A rest breaks the current run, unless it is a `beam-over` rest shorter
  than a crotchet: then it joins the run (several in a row must all have
  it). A beam reaches toward a rest at either end of its run, runs through
  one inside it, and a lone note beside one takes stubs instead of a tail.
- A run also breaks where notes change between tremolo and plain, so a
  change of technique reads from the beaming, except where a flutter-tongued
  note meets a plain one.
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
- A tuplet is beamed on its own: a run breaks where the innermost tuplet
  changes, and every member of a tuplet counts as being in the window its
  outermost tuplet starts in, so a tuplet longer than a window stays one
  beam.
*/

import {
  type BeamObstacle,
  type BeamPlacement,
  resolveBeamPlacement,
  resolveKneedBeamPlacement,
} from '../../rules/beamPlacementRules';
import {
  type BeamLineDescriptor,
  beamReachOverRest,
  computeBeamLinesOverRests,
} from '../../rules/beamStructureRules';
import { isTriangle } from '../../rules/noteheadRules';
import { durationToFlagCountMap } from '../../rules/theoryConsts';
import {
  resolveBetweenTremoloBeams,
  resolveTremoloGroupLayout,
  tremoloBeamCounts,
  type TremoloBeamSegment,
} from '../../rules/tremoloRules';
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  RestElementType,
} from '../../types/elements';
import type {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  TremoloBeamAttach,
} from '../../types/theory';
import {
  isNoteNodeName,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  SVG_NS,
} from '../consts';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_ESTIMATE_NOTE_SPACING_PX,
  BEAM_THICKNESS_PX,
  STAFF_Y_PADDING,
  STEM_OVERLAP_PX,
} from '../notationDimensions';
import { parseDuration, parseTremolo } from '../parsers';
import {
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  NOTE_SVG_WIDTH,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  NOTEHEAD_WIDTH_PX,
  stemTipPosition,
} from './note';
import { tremoloBeamPoints } from './tremolo';

/** Y-position data for a single beamed note, passed to BeamsBuilder.buildRenderer(). */
export type NoteYPosition = {
  stemUp: boolean;
  /** Highest and lowest head in the note Y map; equal for a single note. */
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
  /** See BeamPlacementNote.minimumStemPx. */
  minimumStemPx?: number;
  /** A cue note's size; a beam group is all one size. */
  scale?: number;
};

interface NoteData {
  // A `beam-over` rest: no stem; x is its centre.
  rest: boolean;
  x: number;
  // Stem tip at the base stem length, measured from the head nearest the beam.
  tipY: number;
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
  /** Number of beams on this note (= flag count): 1 = eighth, 2 = sixteenth, etc. */
  beamCount: number;
  stemUp: boolean;
  scale: number;
  minimumStemPx?: number;
}

// A single beam line drawn across two stems (or as a fractional beam stub).
// beamLevel 0 = primary beam (outermost), 1 = secondary (first inner), 2 = tertiary, …
// Fractional beams (also called partial or stub beams) have fractionalBeamSide set.
type BeamLine = BeamLineDescriptor;

// Top of a beamed note's SVG in the beams container, then its stem tip at
// the base length, measured from the head nearest the beam (beamed notes
// render noFlags, so no per-tail extension applies).
function baseStemTipY(position: NoteYPosition): number {
  const { stemUp, highestHeadStaffY, lowestHeadStaffY, scale = 1 } = position;
  const y =
    STAFF_Y_PADDING +
    (stemUp ? lowestHeadStaffY : highestHeadStaffY) -
    (stemUp ? NOTE_Y_HEAD_OFFSET_STEM_UP : NOTE_Y_HEAD_OFFSET_STEM_DOWN);
  const tipOffset = stemUp
    ? NOTE_STEM_TIP_Y_OFFSET
    : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
  const spread = lowestHeadStaffY - highestHeadStaffY;
  const shortening = (1 - scale) * BASE_STEM_LENGTH_PX;
  return y + tipOffset + (stemUp ? shortening - spread : spread - shortening);
}

// Offset from the note Y map to the beams container, read off a stem tip so
// stem lengths come out exact.
function staffYToContainerY(note: {
  stemUp: boolean;
  tipY: number;
  highestHeadStaffY: number;
  lowestHeadStaffY: number;
  scale?: number;
}): number {
  const base = (note.scale ?? 1) * BASE_STEM_LENGTH_PX;
  return note.stemUp
    ? note.tipY + base - note.highestHeadStaffY
    : note.tipY - base - note.lowestHeadStaffY;
}

// The stem's x in a note's box (px).
function stemXInBox(stemUp: boolean, scale: number): number {
  return scale === 1
    ? stemUp
      ? NOTE_STEM_X_OFFSET
      : NOTE_STEM_X_OFFSET_STEM_DOWN
    : stemTipPosition(stemUp, 'eighth', true, 0, scale).x * NOTE_SCALE;
}

/** The beam stack (beams-container px) over a rest it runs through. */
export type BeamOverRest = { top: number; bottom: number; above: boolean };

// What BeamRenderer needs from each group it owns: a beam group or a
// tremolo group.
interface GroupRenderer {
  readonly svgGroup: SVGGElement;
  stemExtension(globalIndex: number): number | null;
  beamStackEdgeYForIndex(globalIndex: number, above: boolean): number | null;
  beamOverRest(globalIndex: number): BeamOverRest | null;
  setX(globalIndex: number, x: number): void;
  setObstacles(obstacles: readonly BeamObstacle[]): void;
  repositionBeams(): void;
}

function chordSpread(note: NoteData): number {
  return note.lowestHeadStaffY - note.highestHeadStaffY;
}

// Handles SVG drawing and X-repositioning for one beam group. The placement is
// (re)derived from the current note positions — an estimated spacing before
// setX, the true x after. Created by BeamGroup.buildRenderer(). Members are
// the group's notes and any `beam-over` rests; only notes place the beam.
class BeamGroupRenderer implements GroupRenderer {
  #members: NoteData[];
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
    members: NoteData[],
    beamLines: BeamLine[],
    globalIndices: readonly number[],
    svgGroup: SVGGElement
  ) {
    this.#members = members;
    this.#beamLines = beamLines;
    this.#globalIndices = globalIndices;
    this.svgGroup = svgGroup;
  }

  #notes(): NoteData[] {
    return this.#members.filter((member) => !member.rest);
  }

  #isKneed(): boolean {
    const notes = this.#notes();
    return notes.some((note) => note.stemUp !== notes[0].stemUp);
  }

  #scale(): number {
    return this.#notes()[0].scale;
  }

  #thickness(): number {
    return this.#scale() * BEAM_THICKNESS_PX;
  }

  // Stem x per member (a rest's centre), estimated until every one is placed.
  #memberXs(): number[] {
    const allPlaced = this.#members.every((member) =>
      Number.isFinite(member.x)
    );
    return this.#members.map((member, i) =>
      allPlaced ? member.x : i * BEAM_ESTIMATE_NOTE_SPACING_PX
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
    const memberXs = this.#memberXs();
    const notes = this.#notes();
    const xs = this.#members.flatMap((member, i) =>
      member.rest ? [] : [memberXs[i]]
    );
    const last = notes.length - 1;
    // Offset from the note Y map to the beams container, read off a stem tip
    // so stem lengths come out exact.
    const toContainerY = staffYToContainerY(notes[0]);
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
        notes.map((note, i) => ({
          x: xs[i],
          highestHeadY: note.highestHeadStaffY,
          lowestHeadY: note.lowestHeadStaffY,
          beamCount: note.beamCount,
        })),
        notes.map((note) => note.stemUp),
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
      const stemUp = notes[0].stemUp;
      this.#placement = toContainer(
        resolveBeamPlacement({
          notes: notes.map((note, i) => ({
            x: xs[i],
            nearestHeadY: stemUp
              ? note.highestHeadStaffY
              : note.lowestHeadStaffY,
            beamCount: note.beamCount,
            minimumStemPx: note.minimumStemPx,
          })),
          stemUp,
          obstacles,
          scale: this.#scale(),
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
    const note = this.#members[localIndex];
    const top = this.#primaryTopAt(this.#memberXs()[localIndex]);
    const deepestLevelOffset =
      (note.beamCount - 1) * this.#placement.levelOffset;
    return note.stemUp
      ? top + Math.min(0, deepestLevelOffset)
      : top + this.#thickness() + Math.max(0, deepestLevelOffset);
  }

  #noteLocalIndex(globalIndex: number): number {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    return localIndex === -1 || this.#members[localIndex].rest
      ? -1
      : localIndex;
  }

  /**
   * Returns how many px the stem tip must move toward the beam to reach the
   * beam at this note's position. Returns null if the note is not in this
   * group.
   */
  stemExtension(globalIndex: number): number | null {
    const localIndex = this.#noteLocalIndex(globalIndex);
    if (localIndex === -1) {
      return null;
    }
    const note = this.#members[localIndex];
    const edge = this.#stemEndEdgeY(localIndex);
    // The tip sits STEM_OVERLAP_PX inside the beam so no sub-pixel gap shows.
    // A chord's tip was fitted from its head nearest the beam, but its stem
    // extends from the head that owns it, so the spread is added back.
    const extension = note.stemUp
      ? note.tipY - (edge + STEM_OVERLAP_PX)
      : edge - STEM_OVERLAP_PX - note.tipY;
    return extension + chordSpread(note);
  }

  #stackEdgesAt(x: number): { top: number; bottom: number } {
    const top = this.#primaryTopAt(x);
    const maxBeamCount = Math.max(
      ...this.#notes().map((note) => note.beamCount)
    );
    const deepestLevelOffset = (maxBeamCount - 1) * this.#placement.levelOffset;
    return {
      top: top + Math.min(0, deepestLevelOffset),
      bottom: top + this.#thickness() + Math.max(0, deepestLevelOffset),
    };
  }

  /**
   * The outer edge, on the `above` side, of the whole beam stack at this
   * note's stem. Null if the note is not in this group.
   */
  beamStackEdgeYForIndex(globalIndex: number, above: boolean): number | null {
    const localIndex = this.#noteLocalIndex(globalIndex);
    if (localIndex === -1) {
      return null;
    }
    const edges = this.#stackEdgesAt(this.#memberXs()[localIndex]);
    return above ? edges.top : edges.bottom;
  }

  /**
   * The beam stack over a rest the beam runs through, and whether it lies
   * above it; null for any other index.
   */
  beamOverRest(globalIndex: number): BeamOverRest | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1 || !this.#members[localIndex].rest) {
      return null;
    }
    const inside =
      this.#members.slice(0, localIndex).some((member) => !member.rest) &&
      this.#members.slice(localIndex + 1).some((member) => !member.rest);
    if (!inside || this.#isKneed()) {
      return null;
    }
    return {
      ...this.#stackEdgesAt(this.#memberXs()[localIndex]),
      above: this.#notes()[0].stemUp,
    };
  }

  setX(globalIndex: number, x: number): void {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1) {
      return;
    }
    const member = this.#members[localIndex];
    member.x = member.rest
      ? x + NOTE_SVG_WIDTH / 2
      : x + stemXInBox(member.stemUp, member.scale);
  }

  /** Updates all beam polygon points using the current x/y positions. */
  repositionBeams(): void {
    this.recomputePlacement();
    const beamPolygons = this.svgGroup.querySelectorAll('polygon');
    const xs = this.#memberXs();
    const { levelOffset } = this.#placement;
    // Corners run outer-left, inner-left, inner-right, outer-right, where the
    // outer edge faces away from the direction the beams stack in.
    const outerIsTop = levelOffset > 0;
    const thickness = this.#thickness();
    const fractionalLength = this.#scale() * NOTEHEAD_WIDTH_PX;

    this.#beamLines.forEach((beamLine, i) => {
      const from = beamLine.fromNoteIndex;
      const to = beamLine.toNoteIndex;
      const noteX1 = xs[from];
      const noteX2 = xs[to];
      let x1 = noteX1;
      let x2 = noteX2;
      if (beamLine.reachesLeft) {
        x1 = noteX1 - beamReachOverRest(noteX1, xs[from - 1]);
      } else if (beamLine.fractionalBeamSide === 'left') {
        x1 = noteX1 - fractionalLength;
      }
      if (beamLine.reachesRight) {
        x2 = noteX2 + beamReachOverRest(noteX2, xs[to + 1]);
      } else if (beamLine.fractionalBeamSide === 'right') {
        x2 = noteX2 + fractionalLength;
      }
      const levelShift = beamLine.beamLevel * levelOffset;
      const top1 = this.#primaryTopAt(x1) + levelShift;
      const top2 = this.#primaryTopAt(x2) + levelShift;
      const [outer1, inner1, inner2, outer2] = outerIsTop
        ? [top1, top1 + thickness, top2 + thickness, top2]
        : [top1 + thickness, top1, top2, top2 + thickness];
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

  #scale(): number {
    return this.#members[0].scale ?? 1;
  }

  #stemXs(): number[] {
    const noteXs = this.#noteXs();
    return this.#members.map(
      (member, i) => noteXs[i] + stemXInBox(member.stemUp, this.#scale())
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
      scale: this.#scale(),
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
    const scale = this.#scale();
    const radius = scale * NOTE_HEAD_RADIUS_PX;
    // A cue head keeps its left edge.
    const headCenterX = (member: TremoloMember, noteX: number): number =>
      noteX +
      (member.stemUp ? NOTE_HEAD_CX_STEM_UP_PX : NOTE_HEAD_CX_STEM_DOWN_PX) -
      (NOTE_HEAD_RADIUS_PX - radius);
    return resolveBetweenTremoloBeams({
      from: {
        edgeX: headCenterX(first, noteXs[0]) + radius,
        centerY:
          (firstIsLower ? first.highestHeadStaffY : first.lowestHeadStaffY) +
          toContainerY,
      },
      to: {
        edgeX: headCenterX(second, noteXs[1]) - radius,
        centerY:
          (firstIsLower ? second.lowestHeadStaffY : second.highestHeadStaffY) +
          toContainerY,
      },
      strokes: this.#total,
      scale,
    });
  }

  stemExtension(globalIndex: number): number | null {
    const localIndex = this.#globalIndices.indexOf(globalIndex);
    if (localIndex === -1 || this.#spec.between) {
      return null;
    }
    const member = this.#members[localIndex];
    const top = this.#primaryTops[localIndex];
    const edge = member.stemUp ? top : top + this.#scale() * BEAM_THICKNESS_PX;
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
      : top +
          this.#scale() * BEAM_THICKNESS_PX +
          Math.max(0, deepestLevelOffset);
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

  beamOverRest(): null {
    return null;
  }

  repositionBeams(): void {
    this.#recomputePlacement();
    const polygons = this.svgGroup.querySelectorAll('polygon');
    this.#beams.forEach((beam, i) => {
      polygons[i].setAttribute(
        'points',
        tremoloBeamPoints(beam, this.#scale() * BEAM_THICKNESS_PX)
      );
    });
  }
}

type BeamGroupMember = {
  globalIndex: number;
  beamCount: number;
  rest: boolean;
};

// Owns one contiguous beam group (e.g. four consecutive sixteenth notes),
// with any `beam-over` rests it reaches over. Indexed by local position
// (0..n−1 within the group); global-to-local mapping is handled via
// #memberIndices.
class BeamGroup {
  #members: NoteData[];
  #beamLines: BeamLine[];
  #memberIndices: number[];
  #noteIndices: number[];

  constructor(members: readonly BeamGroupMember[]) {
    this.#members = members.map(({ beamCount, rest }) => ({
      rest,
      x: NaN,
      tipY: NaN,
      highestHeadStaffY: NaN,
      lowestHeadStaffY: NaN,
      beamCount,
      stemUp: true,
      scale: 1,
    }));
    this.#memberIndices = members.map((member) => member.globalIndex);
    this.#noteIndices = members
      .filter((member) => !member.rest)
      .map((member) => member.globalIndex);
    // Beam structure is derived only from beam counts and computed once at
    // construction. Only x/y coordinates change at render/resize time.
    // Rendering order: primary first, then secondary, then fractional.
    this.#beamLines = computeBeamLinesOverRests(members);
  }

  containsNote(globalIndex: number): boolean {
    return this.#noteIndices.includes(globalIndex);
  }

  /** The group's notes (not its rests). */
  get globalIndices(): readonly number[] {
    return this.#noteIndices;
  }

  get restIndices(): readonly number[] {
    return this.#memberIndices.filter(
      (index) => !this.#noteIndices.includes(index)
    );
  }

  /** Records the Y data for the note at globalIndex. */
  setY(globalIndex: number, position: NoteYPosition): void {
    if (!this.containsNote(globalIndex)) {
      return;
    }
    const { stemUp, highestHeadStaffY, lowestHeadStaffY, minimumStemPx } =
      position;
    const note = this.#members[this.#memberIndices.indexOf(globalIndex)];
    note.scale = position.scale ?? 1;
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
    const svgGroup = this.#buildSvgGroup(this.#beamLines.length);
    const renderer = new BeamGroupRenderer(
      this.#members,
      this.#beamLines,
      this.#memberIndices,
      svgGroup
    );
    renderer.recomputePlacement();
    return renderer;
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
      if (ext !== null) {
        return ext;
      }
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

  /**
   * The beam stack over a `beam-over` rest inside a run, or null. Valid
   * after spaceAll().
   */
  beamOverRest(restIndex: number): BeamOverRest | null {
    for (const renderer of this.#groupRenderers) {
      const over = renderer.beamOverRest(restIndex);
      if (over !== null) {
        return over;
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

// Each element's innermost <music-tuplet> (null outside one), and the offset
// that picks its beam window: its outermost tuplet's start, else its own.
function tupletBeamWindows(
  elements: readonly NoteChordOrRestElementType[],
  elementOffsets: readonly number[]
): { innermostTuplets: (Element | null)[]; windowOffsets: number[] } {
  const innermostTuplets: (Element | null)[] = [];
  const outermostTuplets: (Element | null)[] = [];
  for (const element of elements) {
    let innermost: Element | null = null;
    let outermost: Element | null = null;
    for (
      let ancestor = element.parentElement;
      ancestor !== null;
      ancestor = ancestor.parentElement
    ) {
      if (ancestor.nodeName === MUSIC_TUPLET_NODE) {
        innermost ??= ancestor;
        outermost = ancestor;
      }
    }
    innermostTuplets.push(innermost);
    outermostTuplets.push(outermost);
  }
  const tupletStarts = new Map<Element, number>();
  outermostTuplets.forEach((tuplet, i) => {
    if (tuplet !== null && !tupletStarts.has(tuplet)) {
      tupletStarts.set(tuplet, elementOffsets[i]);
    }
  });
  return {
    innermostTuplets,
    windowOffsets: elementOffsets.map((offset, i) => {
      const tuplet = outermostTuplets[i];
      return tuplet === null ? offset : tupletStarts.get(tuplet) ?? offset;
    }),
  };
}

// A `beam-over` rest's beam count, or null when it doesn't join a beam: a
// crotchet or longer, or one in a cross-staff beam group.
function beamOverRestCount(
  rest: RestElementType,
  duration: DurationType
): number | null {
  if (!rest.beamOver || rest.beamGroup !== null) {
    return null;
  }
  const count = durationToFlagCountMap.get(duration) ?? 0;
  return count > 0 ? count : null;
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
    tremoloSpecs: readonly TremoloBeamGroupSpec[] = [],
    // Beats of mid-bar barlines: a beam never crosses a barline.
    breakBeats: readonly number[] = [],
    // Flutter-tongued tremolo entries: flutter-tonguing is a sound, not a
    // rhythm, so they beam with plain notes.
    flutterTonguedIndices: ReadonlySet<number> = new Set()
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
      new Set([
        ...externallyBeamedIndices,
        ...this.#tremoloSpecByMember.keys(),
      ]),
      breakBeats,
      flutterTonguedIndices
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
    if (beatType === 8 && beats % 3 === 0) {
      return 3 / 8;
    }
    // 4/4: group by half-measure — (beats 1–2) and (beats 3–4).
    if (beats === 4 && beatType === 4) {
      return 2 / 4;
    }
    // All other simple time: one group per beat.
    return 1 / beatType;
  }

  static #scan(
    elements: NoteChordOrRestElementType[],
    time: [BeatsInMeasure, BeatTypeInMeasure],
    elementOffsets: readonly number[],
    externallyBeamedIndices: ReadonlySet<number>,
    breakBeats: readonly number[],
    flutterTonguedIndices: ReadonlySet<number>
  ): { groups: BeamGroup[]; beamedIndices: Set<number> } {
    const barlineBetween = (previous: number, next: number): boolean =>
      breakBeats.some(
        (beat) =>
          beat > elementOffsets[previous] + 1e-9 &&
          beat <= elementOffsets[next] + 1e-9
      );
    const [beats, beatType] = time;
    const measureDuration = beats / beatType;
    const beatWindowSize = BeamsBuilder.#beamGroupWindowDuration(
      beats,
      beatType
    );
    const groups: BeamGroup[] = [];
    const beamedIndices = new Set<number>();
    const { innermostTuplets, windowOffsets } = tupletBeamWindows(
      elements,
      elementOffsets
    );

    // Flushes a completed run: a group needs two notes, or one beside a
    // `beam-over` rest; a lone note keeps its flags.
    const flushRun = (pending: BeamGroupMember[]) => {
      const notes = pending.filter((member) => !member.rest);
      if (notes.length >= 2 || (notes.length === 1 && pending.length > 1)) {
        groups.push(new BeamGroup(pending));
        notes.forEach((member) => beamedIndices.add(member.globalIndex));
      }
    };

    for (
      let beatWindowStart = 0;
      beatWindowStart < measureDuration - 1e-9;
      beatWindowStart += beatWindowSize
    ) {
      const beatWindowEnd = beatWindowStart + beatWindowSize;
      let pending: BeamGroupMember[] = [];
      let pendingHasTremolo = false;
      let pendingCue = false;
      const lastPendingIndex = () =>
        pending.length > 0 ? pending[pending.length - 1].globalIndex : -1;
      const hasPendingNote = () => pending.some((member) => !member.rest);
      const flush = () => {
        flushRun(pending);
        pending = [];
      };

      for (let i = 0; i < elements.length; i++) {
        const elOffset = windowOffsets[i];
        if (
          elOffset < beatWindowStart - 1e-9 ||
          elOffset >= beatWindowEnd - 1e-9
        ) {
          continue;
        }

        if (externallyBeamedIndices.has(i)) {
          // Already joined to a cross-staff beam group — breaks a same-staff
          // run exactly like a rest does, but isBeamed() reports it true
          // separately (see the constructor's own field), so its flag still
          // suppresses correctly.
          flush();
          continue;
        }

        const dur =
          parseDuration(
            elements[i].dataset.duration ?? elements[i].getAttribute('duration')
          ) ?? 'quarter';
        const breaksFromPending =
          lastPendingIndex() !== i - 1 ||
          barlineBetween(i - 1, i) ||
          innermostTuplets[i] !== innermostTuplets[i - 1];

        if (elements[i].nodeName === MUSIC_REST_NODE) {
          const restBeamCount = beamOverRestCount(
            elements[i] as RestElementType,
            dur
          );
          if (restBeamCount === null) {
            flush();
            continue;
          }
          if (pending.length > 0 && breaksFromPending) {
            flush();
          }
          pending.push({
            globalIndex: i,
            beamCount: restBeamCount,
            rest: true,
          });
          continue;
        }

        // A triangle (undefined extreme pitch) always stands alone with its
        // own flag. A chord can't be one: its triangle value falls back to
        // normal heads.
        const flagCount =
          isNoteNodeName(elements[i].nodeName) &&
          isTriangle((elements[i] as NoteElementType).notehead)
            ? undefined
            : durationToFlagCountMap.get(dur);

        if (flagCount !== undefined) {
          const hasTremolo =
            parseTremolo(elements[i].getAttribute('tremolo')) !== null;
          const cue =
            (elements[i] as NoteElementType | ChordElementType).size === 'cue';
          // A non-adjacent index means a non-beamable note broke the run.
          if (
            pending.length > 0 &&
            (breaksFromPending ||
              (hasPendingNote() &&
                ((hasTremolo !== pendingHasTremolo &&
                  !flutterTonguedIndices.has(hasTremolo ? i : i - 1)) ||
                  cue !== pendingCue)))
          ) {
            flush();
          }
          pending.push({ globalIndex: i, beamCount: flagCount, rest: false });
          pendingHasTremolo = hasTremolo;
          pendingCue = cue;
        } else {
          flush();
        }
      }

      flush(); // flush any open run at window end
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

  /** The `beam-over` rests in the note's beam group. */
  beamOverRestsFor(noteIndex: number): readonly number[] {
    return (
      this.#groups.find((group) => group.containsNote(noteIndex))
        ?.restIndices ?? []
    );
  }

  /**
   * Returns the global indices of all notes sharing the same beam group as noteIndex,
   * or null if the note is not beamed. Use this to assign a consistent stem direction
   * to the entire group before Y positions are known.
   */
  beamGroupFor(noteIndex: number): readonly number[] | null {
    for (const group of this.#groups) {
      if (group.containsNote(noteIndex)) {
        return group.globalIndices;
      }
    }
    const tremolo = this.#tremoloSpecByMember.get(noteIndex);
    if (tremolo !== undefined && !tremolo.between) {
      return tremolo.memberIndices;
    }
    return null;
  }

  /**
   * Phase 2: places each group's beam from `noteYPositions` (global note
   * index; null for unbeamed notes) and returns a BeamRenderer for setX /
   * spaceAll.
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
