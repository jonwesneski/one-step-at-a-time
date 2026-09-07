// ─── Notation Dimensions ──────────────────────────────────────────────────────
//
// Single source of truth for all layout and sizing constants in the notation
// rendering system. Most values derive from STAFF_LINE_SPACING — changing that
// one constant rescales the entire staff.
//
// Two independent axes exist:
//   1. Vertical / sizing  — everything here, rooted at STAFF_LINE_SPACING
//   2. Horizontal / spacing — entry x-spacing is driven by a logarithmic duration
//      weight (rules/spacingRules.ts) distributed across the available container
//      width, which is dynamic and cannot be derived from a fixed base.
//
// Note SVG internals (COORD_WIDTH, NOTE_SCALE, etc.) live in svgCreator/note.ts
// because they belong to that rendering subsystem's coordinate math, not to the
// staff layout layer.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Base unit ────────────────────────────────────────────────────────────────

/**
 * The distance in pixels between two adjacent staff lines.
 * This is the single root value — all other vertical dimensions derive from it.
 * Changing this value rescales the entire staff rendering system.
 */
export const STAFF_LINE_SPACING = 10;

// ─── Staff geometry ───────────────────────────────────────────────────────────

/**
 * Number of staff lines drawn for classical notation staves (treble, bass).
 * Defined here rather than as an abstract getter so staff geometry constants
 * that depend on it (e.g. STAFF_HEIGHT) can be computed statically.
 */
export const CLASSICAL_STAFF_LINE_COUNT = 5;

/**
 * Pixel height of the staff container — spans from the top line to the bottom
 * line (4 spaces for a 5-line staff).
 * = STAFF_LINE_SPACING × (CLASSICAL_STAFF_LINE_COUNT − 1)
 */
export const STAFF_HEIGHT =
  STAFF_LINE_SPACING * (CLASSICAL_STAFF_LINE_COUNT - 1);

/**
 * Top margin (px) above the staff container inside the staff wrapper.
 * Provides visual headroom for notes that extend above the top staff line
 * (e.g. high notes on ledger lines, clef symbols).
 * = 2.8 × STAFF_LINE_SPACING  (≈ 3 staff spaces)
 */
export const STAFF_LINE_START = STAFF_LINE_SPACING * 2.8;

/**
 * Bottom margin (px) below the staff container.
 * Provides visual clearance for notes that extend below the bottom staff line.
 * = 3 × STAFF_LINE_SPACING
 */
export const STAFF_BOTTOM_MARGIN = STAFF_LINE_SPACING * 3;

/**
 * Minimum pixel height of the staff wrapper element.
 * Must be tall enough to contain STAFF_LINE_START + STAFF_HEIGHT + STAFF_BOTTOM_MARGIN.
 */
export const STAFF_WRAPPER_MIN_HEIGHT =
  STAFF_LINE_START + STAFF_HEIGHT + STAFF_BOTTOM_MARGIN;

/**
 * Fixed pixel height of the SVG rendering area shared by the transcribe
 * container, beams container, and chord SVGs. All three must agree on this
 * value so that notes, beams, and chords render at consistent vertical positions.
 *
 * Intentionally a separate constant from STAFF_WRAPPER_MIN_HEIGHT (≈98px) —
 * the wrapper is an HTML layout constraint while this is an SVG coordinate budget.
 * The two are close in value by design but can drift independently if layout
 * or dimension requirements change.
 */
export const STAFF_TRANSCRIPTION_HEIGHT = 100;

// ─── Note positioning ─────────────────────────────────────────────────────────

/**
 * Padding (px) from the top of the transcribe SVG container to the first staff
 * line. Used when converting a note's staff Y-coordinate to an absolute pixel
 * position within the SVG.
 *
 * This is a DOM/CSS layout-layer constant rather than a pure engraving value —
 * it compensates for the gap between the transcribe container's top edge and
 * where staff line 1 actually sits. If the staff wrapper layout changes, this
 * value may need adjustment.
 *
 * = 0.8 × STAFF_LINE_SPACING
 */
export const STAFF_Y_PADDING = STAFF_LINE_SPACING * 0.8;

/**
 * Y-coordinate of the middle (3rd) staff line in the note Y-coordinate map.
 * Used to determine stem direction: notes below this line (larger Y) get stem-up,
 * notes on or above get stem-down.
 *
 * This is NOT derived from STAFF_LINE_SPACING — it is a fixed value in the
 * coordinate space of the yCoordinates maps defined by each staff subclass
 * (staffTreble, staffBass, etc.), where lines are spaced 5px apart starting
 * from the top line. The 3rd line (index 2) sits at Y = 4 × 5 = 40px from the
 * top of the map's origin, but the maps are offset so B4 (treble mid-line) = 50.
 */
export const MIDDLE_STAFF_Y = 50;

/**
 * Y-coordinate of the top staff line in the note Y-coordinate map.
 * Notes with Y < STAFF_TOP_LINE_Y are above the staff and may need ledger lines.
 */
export const STAFF_TOP_LINE_Y = 30;

/**
 * Y-coordinate of the bottom staff line in the note Y-coordinate map.
 * Notes with Y > STAFF_BOTTOM_LINE_Y are below the staff and may need ledger lines.
 */
export const STAFF_BOTTOM_LINE_Y = 70;

/**
 * Vertical distance (px) between adjacent diatonic steps in the note Y-coordinate map.
 * One line-to-adjacent-space interval = half of STAFF_LINE_SPACING.
 */
export const STAFF_Y_STEP = STAFF_LINE_SPACING / 2; // = 5

/**
 * Minimum horizontal space (px) reserved per note to prevent notehead overlap
 * regardless of available width. Applied before proportional duration spacing.
 * = 2 × STAFF_LINE_SPACING
 */
export const MIN_NOTE_WIDTH = STAFF_LINE_SPACING * 2;

// ─── Beams ────────────────────────────────────────────────────────────────────

/**
 * Vertical thickness (px) of each beam rectangle.
 * = 0.8 × STAFF_LINE_SPACING
 */
export const BEAM_THICKNESS_PX = STAFF_LINE_SPACING * 0.8;

/**
 * Vertical gap (px) between stacked beam layers (primary, secondary, etc.).
 * = 0.4 × STAFF_LINE_SPACING
 */
export const BEAM_GAP_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Horizontal width (px) of a fractional (stub/partial) beam — used when a
 * single fast note cannot connect to a full beam run.
 * = 0.6 × STAFF_LINE_SPACING
 */
export const FRACTIONAL_BEAM_WIDTH_PX = STAFF_LINE_SPACING * 0.6;

/**
 * Default beamed stem length (px). Matches BASE_STEM_LENGTH × NOTE_SCALE in
 * note.ts (600 × 32/600 = 32 px). Kept in sync manually — if NOTE_SCALE
 * changes, update this value.
 * ≈ 3.2 × STAFF_LINE_SPACING
 */
export const BASE_STEM_LENGTH_PX = STAFF_LINE_SPACING * 3.2;

/**
 * Minimum stem length (px) when a stem is shortened to accommodate beam slope.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const MIN_BEAM_STEM_LENGTH_PX = STAFF_LINE_SPACING * 2.5;

/**
 * Maximum amount (px) a beamed stem may be shortened before hitting the minimum.
 * = BASE_STEM_LENGTH_PX − MIN_BEAM_STEM_LENGTH_PX
 */
export const MAX_STEM_SHORTENING_PX =
  BASE_STEM_LENGTH_PX - MIN_BEAM_STEM_LENGTH_PX;

/**
 * Extra pixels the stem tip extends inside the beam polygon to prevent
 * sub-pixel rendering gaps between stem and beam.
 * = 0.2 × STAFF_LINE_SPACING
 */
export const STEM_OVERLAP_PX = STAFF_LINE_SPACING * 0.2;

// ─── Describe area (clef, key signature, time signature) ─────────────────────

/**
 * Horizontal x-offset (px) of the clef SVG within the describe container.
 * Leaves a small left margin before the clef symbol begins.
 * = 1.4 × STAFF_LINE_SPACING
 */
export const CLEF_X_OFFSET = STAFF_LINE_SPACING * 1.4;

/**
 * Horizontal width (px) of each sharp accidental in the key signature.
 * Controls the spacing between consecutive sharps.
 * = 1 × STAFF_LINE_SPACING
 */
export const KEY_SIG_SHARP_WIDTH = STAFF_LINE_SPACING;

/**
 * Horizontal width (px) of each flat accidental in the key signature.
 * Flats are slightly narrower than sharps.
 * = 0.8 × STAFF_LINE_SPACING
 */
export const KEY_SIG_FLAT_WIDTH = STAFF_LINE_SPACING * 0.8;

/**
 * Vertical y-offset (px) applied to flat accidentals in the key signature.
 * Flats render taller than their bounding box, so a negative offset shifts
 * them up to align with the staff lines.
 * = −1.8 × STAFF_LINE_SPACING
 */
export const KEY_SIG_FLAT_Y_OFFSET = STAFF_LINE_SPACING * -1.8;

/**
 * Y translation (px) applied to the time signature SVG within the describe
 * container. Positions the numerals to straddle the middle staff lines.
 * = 3 × STAFF_LINE_SPACING
 */
export const TIME_SIG_Y_TRANSLATE = STAFF_LINE_SPACING * 3;

// ─── Measure layout ───────────────────────────────────────────────────────────

/**
 * Default cap (px) for a composition's rendered width, overridable per element
 * via the <music-composition max-width> attribute. Measures still fill and share
 * whatever width the wrapper ends up with — this only bounds how wide that is on
 * a large container so long horizontal scans stay readable.
 */
export const COMPOSITION_MAX_WIDTH_PX = 900;

/**
 * flex-basis (and flex-grow) for a measure with no scored staves yet, so ~3 empty
 * measures fill one row at the default max-width.
 */
export const EMPTY_MEASURE_FLEX_BASIS_PX = COMPOSITION_MAX_WIDTH_PX / 3;

/**
 * Absolute lower bound (px) on a measure's rendered width. The per-staff
 * collision strut overrides this upward for a busy measure; a sparse one never
 * shrinks below it, so a row can't pack in an unreadable number of measures.
 */
export const MEASURE_MIN_WIDTH_PX = 100;

/**
 * Approximate pixel width per lyric character in vocal staves.
 * Used by calculateStaffVocalMinWidth to ensure the measure is wide enough
 * to display lyric syllables without overlap.
 */
export const AVG_LYRIC_CHAR_WIDTH_PX = STAFF_LINE_SPACING * 0.9;

/**
 * Minimum pixel gap between the left edge of the staff's notes area and the
 * first notehead. Guards against accidentals bleeding into the left barline
 * in non-first measures where describeEndX ≈ 0.
 */
export const NOTES_AREA_LEFT_MARGIN = 2;

// ─── Note spacing (horizontal) ────────────────────────────────────────────────
//
// Entries are justified to fill the measure. Beyond a fixed MIN_NOTE_WIDTH strut
// per entry, spare width is shared out by a logarithmic function of duration:
// halving a note's value costs roughly a quarter of its space, not half, so long
// notes are not over-spaced and short notes are not starved. Starting values —
// tune visually in Storybook.

/**
 * Slack (px) beyond the MIN_NOTE_WIDTH strut given to the measure's shortest
 * entry when there is room to spare — the floor of the logarithmic curve.
 * = 2 × STAFF_LINE_SPACING
 */
export const SPACING_SHORTEST_SLACK_PX = STAFF_LINE_SPACING * 2;

/**
 * Additional slack (px) per doubling of an entry's duration relative to the
 * measure's shortest entry.
 * = 1.4 × STAFF_LINE_SPACING
 */
export const SPACING_LOG_INCREMENT_PX = STAFF_LINE_SPACING * 1.4;

/**
 * Gap (px) between the end of the clef/key/time area and the first entry, so a
 * lone whole note is not jammed against the clef. Part of the collision floor.
 * = 1 × STAFF_LINE_SPACING
 */
export const LEADING_NOTE_GAP_PX = STAFF_LINE_SPACING;

// ─── Accidental symbol dimensions ────────────────────────────────────────────

import { AccidentalType } from '../types/theory';

/**
 * Rendered pixel width of each accidental symbol type.
 * Used for collision detection and column layout when stacking accidentals on chords.
 */
export const ACCIDENTAL_SYMBOL_WIDTH: Record<AccidentalType, number> = {
  'double-flat': 18,
  flat: 10,
  natural: 10,
  sharp: 10,
  'double-sharp': 10,
};

/**
 * Gap (px) between an accidental symbol and its notehead (negative = overlap).
 */
export const ACCIDENTAL_NOTE_GAP = -7;

// ─── Dynamics ─────────────────────────────────────────────────────────────────

/**
 * Y position (px, in note-coordinate space) of the dynamics baseline below the
 * staff. Dynamics text and hairpin center-lines are drawn at this Y value.
 * = STAFF_BOTTOM_LINE_Y + 2 × STAFF_LINE_SPACING  (= 70 + 20 = 90)
 */
export const DYNAMICS_BASELINE_Y = STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING * 2;

/**
 * Half-height (px) of the open end of a hairpin wedge.
 * The full open span is 2 × HAIRPIN_OPEN_HEIGHT, matching 2 staff spaces (20 px).
 * = STAFF_LINE_SPACING  (= 10)
 */
export const HAIRPIN_OPEN_HEIGHT = STAFF_LINE_SPACING;

/**
 * Stroke width (px) for hairpin wedge lines.
 */
export const HAIRPIN_STROKE_WIDTH = 1.2;

/**
 * Font size (px) for dynamic text markings (pp, mf, sfz, etc.).
 * = 1.4 × STAFF_LINE_SPACING  (= 14)
 */
export const DYNAMICS_FONT_SIZE = STAFF_LINE_SPACING * 1.4;

/**
 * Estimated width (px) per character of dynamic text (italic serif). Used to
 * reserve a gap so hairpins don't run under dynamic text at their start/end.
 * Mirrors AVG_LYRIC_CHAR_WIDTH_PX's estimate-don't-measure approach.
 */
export const DYNAMICS_CHAR_WIDTH_PX = DYNAMICS_FONT_SIZE * 0.65;

/**
 * Minimum horizontal gap (px) between a dynamic marking's estimated edge and
 * an adjacent hairpin's start/end point.
 */
export const HAIRPIN_DYNAMIC_GAP_PX = 4;

// ─── Tuplets ──────────────────────────────────────────────────────────────────

/** Vertical length (px) of the hook at each end of the tuplet bracket. */
export const TUPLET_HOOK_LENGTH_PX = STAFF_LINE_SPACING * 0.8;

/** Horizontal gap (px) in the bracket line where the numeral sits. */
export const TUPLET_NUMERAL_GAP_PX = STAFF_LINE_SPACING * 2.5;

/** Vertical offset (px) between nesting levels of tuplet brackets. */
export const TUPLET_BRACKET_LEVEL_OFFSET_PX = STAFF_LINE_SPACING * 0.8;

/** Font size (px) for the tuplet numeral. */
export const TUPLET_NUMERAL_FONT_SIZE = STAFF_LINE_SPACING * 1.2;

/** Stroke width (px) for the tuplet bracket lines. */
export const TUPLET_BRACKET_STROKE_WIDTH = 1.2;

/** Gap (px) between the beam surface and the tuplet numeral when the bracket is omitted. */
export const TUPLET_NUMERAL_BEAM_GAP_PX = STAFF_LINE_SPACING * 0.3;

/** Vertical clearance (px) between the bracket line and the nearest staff line. */
export const TUPLET_STAFF_CLEARANCE_PX = STAFF_LINE_SPACING * 0.6;

/**
 * Rendered pixel height of each accidental symbol type.
 * Used to compute vertical clearance when stacking accidentals on chords.
 */
export const ACCIDENTAL_SYMBOL_HEIGHT: Record<AccidentalType, number> = {
  'double-sharp': 10,
  sharp: 30,
  natural: 30,
  flat: 25,
  'double-flat': 25,
};

// ─── Grace notes ──────────────────────────────────────────────────────────────

/**
 * Uniform scale applied to grace-note heads, stems, flags, beams, and
 * accidentals. Grace notes are slightly smaller than a cue note (¾ size).
 */
export const GRACE_SCALE = 0.6;

/**
 * Stem length (px) for grace notes in a beamed group — about 2¼ staff spaces,
 * shorter than a full-size stem.
 */
export const GRACE_STEM_LENGTH_PX = STAFF_LINE_SPACING * 2.25;

/**
 * Minimum grace stem length (px) when the group's beam line is raised to keep
 * every stem long enough.
 */
export const GRACE_MIN_STEM_LENGTH_PX = STAFF_LINE_SPACING * 1.75;

/**
 * Horizontal advance (px) between consecutive grace-note head columns.
 */
export const GRACE_NOTE_ADVANCE_PX = STAFF_LINE_SPACING;

/**
 * Gap (px) between the right edge of the grace group and the main note's
 * accidental (or notehead area when there is no accidental).
 */
export const GRACE_MAIN_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Default number of beams joining a grace-note group when no written duration
 * is specified. Two beams give the least cluttered appearance regardless of
 * group size.
 */
export const GRACE_BEAM_COUNT = 2;

/**
 * Beam thickness (px) for grace-note groups — full-size beam scaled down.
 */
export const GRACE_BEAM_THICKNESS_PX = BEAM_THICKNESS_PX * GRACE_SCALE;

/**
 * Vertical gap (px) between stacked grace beams.
 */
export const GRACE_BEAM_GAP_PX = BEAM_GAP_PX * GRACE_SCALE;

/**
 * Horizontal half-extent (px) of the acciaccatura slash from its crossing
 * point. The slash rises left-to-right and must intersect the flag or beam
 * without touching the notehead. Starting value — tune visually in Storybook.
 */
export const GRACE_SLASH_HALF_WIDTH_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Vertical half-extent (px) of the acciaccatura slash from its crossing point.
 * Starting value — tune visually in Storybook.
 */
export const GRACE_SLASH_HALF_HEIGHT_PX = STAFF_LINE_SPACING * 0.6;

/**
 * Stroke width (px) of the acciaccatura slash.
 */
export const GRACE_SLASH_STROKE_WIDTH = 1.1;

/**
 * Vertical inset (px) of a single grace note's slash crossing point below the
 * stem tip — keeps the diagonal off the very top of the stem/flag so white
 * space shows above it, per standard engraving practice.
 */
export const GRACE_SLASH_TIP_INSET_PX = STAFF_LINE_SPACING * 0.5;

// ─── Clef changes ─────────────────────────────────────────────────────────────

/**
 * Horizontal width (px) reserved for a mid-stream <music-clef> glyph.
 * Starting value — tune visually in Storybook.
 */
export const MID_STREAM_CLEF_WIDTH_PX = STAFF_LINE_SPACING * 3;

/**
 * Horizontal gap (px) on either side of a mid-stream clef glyph, separating
 * it from the surrounding notes.
 */
export const MID_STREAM_CLEF_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Total horizontal space (px) a mid-stream clef change reserves in the note
 * stream — the glyph plus a gap on each side.
 */
export const CLEF_CHANGE_RESERVED_WIDTH_PX =
  MID_STREAM_CLEF_WIDTH_PX + MID_STREAM_CLEF_GAP_PX * 2;

/**
 * Vertical offset (px) of a mid-stream clef glyph from the top of the
 * transcribe container. Starting value — tune visually in Storybook.
 */
export const MID_STREAM_CLEF_Y_OFFSET = STAFF_LINE_SPACING * 2;

/**
 * Uniform scale applied to a courtesy clef (the small clef preview drawn at
 * the end of a line/measure when the next line changes clef).
 */
export const COURTESY_CLEF_SCALE = 0.7;

/**
 * Horizontal gap (px) between a courtesy clef and the right edge of the staff
 * it's drawn on.
 */
export const COURTESY_CLEF_MARGIN_RIGHT_PX = STAFF_LINE_SPACING * 0.5;

// ─── Grand staff / part connectors ─────────────────────────────────────────────

/**
 * Horizontal depth (px) a brace connector's curve extends left of the
 * staves it joins. Starting value — tune visually in Storybook.
 */
export const BRACE_WIDTH_PX = STAFF_LINE_SPACING * 2.2;

/**
 * Horizontal gap (px) between the brace's right edge and the staff barline
 * it connects to. Starting value — tune visually in Storybook.
 */
export const BRACE_STAFF_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Horizontal overlap (px) the bracket's hook tip is pulled past the staff
 * barline it connects to (i.e. a negative gap) — the hook's own curl already
 * holds its stem well clear of the staff, so pulling the tip slightly past
 * the barline brings the visually-dominant stem closer without touching the
 * hook glyph's own shape. Starting value — tune visually in Storybook.
 */
export const BRACKET_STAFF_GAP_PX = STAFF_LINE_SPACING * 1;

/**
 * Horizontal gap (px) reserved to the left of a bracket connector's stem,
 * so it doesn't sit flush against the container/page edge. Starting value —
 * tune visually in Storybook.
 */
export const BRACKET_LEFT_MARGIN_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Horizontal depth (px) a bracket connector extends left of the staves it
 * joins: the natural width of the engraved hook glyphs it's built from (see
 * `utils/svgCreator/brace.ts`) plus `BRACKET_LEFT_MARGIN_PX`. Combined with
 * `BRACKET_STAFF_GAP_PX` (see `measure.ts`'s `#renderGroupConnectors`), the
 * hook's outermost tip lands slightly past the staves' plain barline
 * connector, while the stem gets breathing room on its other side.
 */
export const BRACKET_WIDTH_PX =
  STAFF_LINE_SPACING * 1.876 + BRACKET_LEFT_MARGIN_PX;

/**
 * Additional upward shift (px) applied to a bracket connector's top (and,
 * since its height is unchanged, its bottom follows automatically) beyond
 * the shared CONNECTOR_TOP_PX baseline used by the barline/brace — a
 * bracket's hook needs to curl clearly above/below the staves it groups,
 * not just blend into the top/bottom staff line. Brace-only connectors are
 * unaffected. Starting value — tune visually in Storybook.
 */
export const BRACKET_TOP_OFFSET_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Extra height (px) added to a bracket connector's overall span, split
 * evenly between the top and bottom shift — on top of BRACKET_TOP_OFFSET_PX
 * — so both hooks clear their staff lines by a bit more margin. Brace-only
 * connectors are unaffected. Starting value — tune visually in Storybook.
 */
export const BRACKET_EXTRA_HEIGHT_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Thickness (px) of a bracket connector's straight stem, drawn as a plain
 * filled rectangle between its top and bottom hook glyphs. Sourced from the
 * reference engraving font's bracket stem thickness (0.5 staff-spaces).
 */
export const BRACKET_STEM_THICKNESS_PX = STAFF_LINE_SPACING * 0.5;

// ─── Arpeggiation ─────────────────────────────────────────────────────────────
//
// The wavy line is built by tiling one engraved wiggle segment vertically (see
// utils/svgCreator/arpeggio.ts, which also holds the per-tile repeat pitch).
// Every value here is a starting point — tune visually in Storybook.

/** Rendered peak-to-peak horizontal width (px) of the wavy line. */
export const ARPEGGIO_WAVE_WIDTH_PX = STAFF_LINE_SPACING * 0.9;

/** How far (px) the sign extends past the outer notehead centers, top and bottom. */
export const ARPEGGIO_VERTICAL_OVERSHOOT_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) between the wave's right edge and the accidental-column left edge
 * (or the notehead left edge when there is no accidental).
 */
export const ARPEGGIO_CHORD_GAP_PX = STAFF_LINE_SPACING * 0.35;

/** Stroke width (px) of the non-arpeggiate bracket. */
export const ARPEGGIO_STROKE_WIDTH = 1.4;

/** Length (px) of each horizontal lip on the non-arpeggiate square bracket. */
export const ARPEGGIO_BRACKET_LIP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Approximate distance (px) from a note/chord SVG's left edge to the left edge
 * of its noteheads — the arpeggio sign sits just outside this when the element
 * has no accidental, so only the part of the sign past the SVG's own left edge
 * needs reserving.
 */
export const ARPEGGIO_NOTEHEAD_INSET_PX = STAFF_LINE_SPACING * 1.1;

/**
 * Leftward footprint (px) an arpeggio sign reserves when the element also shows
 * an accidental: the sign clears the accidental column entirely, so this is
 * added on top of the separately-computed accidental footprint. The arrowhead
 * extends only vertically, so it adds nothing here.
 */
export const ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX =
  ARPEGGIO_CHORD_GAP_PX + ARPEGGIO_WAVE_WIDTH_PX;

/**
 * Leftward footprint (px) an arpeggio sign reserves with no accidental — the
 * sign starts just left of the noteheads, which are already inset from the
 * SVG's left edge, so most of it fits without extra room.
 */
export const ARPEGGIO_FOOTPRINT_PX = Math.max(
  0,
  ARPEGGIO_CHORD_GAP_PX + ARPEGGIO_WAVE_WIDTH_PX - ARPEGGIO_NOTEHEAD_INSET_PX
);

/** Font size (px) of the `sempre arpeggiando` passage instruction text. */
export const ARPEGGIO_TEXT_FONT_SIZE = STAFF_LINE_SPACING * 1.1;

/**
 * Vertical distance (px) above the staff top line at which the `sempre
 * arpeggiando` text baseline sits.
 */
export const ARPEGGIO_TEXT_ABOVE_STAFF_PX = STAFF_LINE_SPACING * 2.4;
