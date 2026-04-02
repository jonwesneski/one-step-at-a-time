// ─── Notation Dimensions ──────────────────────────────────────────────────────
//
// Single source of truth for all layout and sizing constants in the notation
// rendering system. Most values derive from STAFF_LINE_SPACING — changing that
// one constant rescales the entire staff.
//
// Two independent axes exist:
//   1. Vertical / sizing  — everything here, rooted at STAFF_LINE_SPACING
//   2. Horizontal / timing — note x-spacing is driven by duration factors
//      (durationToFactor in consts.ts) and available container width, which is
//      dynamic and cannot be derived from a fixed base.
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
