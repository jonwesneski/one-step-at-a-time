// ─── Notation Dimensions ──────────────────────────────────────────────────────
//
// Single source of truth for all layout and sizing constants in the notation
// rendering system. Most values derive from STAFF_LINE_SPACING — changing that
// one constant rescales the entire staff.
//
// Entry x-position is not derived from anything here (see
// rules/spacingRules.ts); PIXELS_PER_BEAT only feeds the measure's sizing
// preference. Note SVG internals (COORD_WIDTH, NOTE_SCALE, …) live in
// svgCreator/note.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Base unit ────────────────────────────────────────────────────────────────

/** Distance (px) between two adjacent staff lines; the root value. */
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
 * Fixed height (px) of the SVG area shared by the transcribe container, beams
 * container and chord SVGs, which must agree. An SVG coordinate budget,
 * separate from the HTML STAFF_WRAPPER_MIN_HEIGHT.
 */
export const STAFF_TRANSCRIPTION_HEIGHT = 100;

// ─── Note positioning ─────────────────────────────────────────────────────────

/**
 * Padding (px) from the top of the transcribe SVG to the first staff line. A
 * layout constant: it follows the staff wrapper's CSS.
 * = 0.8 × STAFF_LINE_SPACING
 */
export const STAFF_Y_PADDING = STAFF_LINE_SPACING * 0.8;

/**
 * Y of the middle staff line in the note Y-coordinate map (treble B4), not
 * derived from STAFF_LINE_SPACING.
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

/**
 * Blank (px) kept before the end barline: no beat's share of the bar reaches
 * into it, and the last entry's ink stops before it. = 0.5 × STAFF_LINE_SPACING
 */
export const LAST_ENTRY_GAP_PX = STAFF_LINE_SPACING * 0.5;

// ─── Voices ───────────────────────────────────────────────────────────────────

/** Half the width (px) of a rest's ink, about its box's centre. = 0.5 × STAFF_LINE_SPACING */
export const REST_HALF_WIDTH_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Vertical displacement (px) applied to a rest's normal duration-keyed Y
 * position when it belongs to one of 2-3 independent voices sharing a
 * staff — voice 1's rests shift up, voice 2's shift down, clearly avoiding
 * the other voice's notes. = STAFF_LINE_SPACING (one full line-space).
 */
export const VOICE_REST_DISPLACEMENT_PX = STAFF_LINE_SPACING;

// ─── Augmentation dots ───────────────────────────────────────────────────────

/**
 * Diameter (px) of a duration dot.
 * = 0.4 × STAFF_LINE_SPACING, the engraving font's dot; about 1.7× a staccato dot.
 */
export const AUGMENTATION_DOT_DIAMETER_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Gap (px) from a notehead's right edge to its first dot.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const AUGMENTATION_DOT_NOTEHEAD_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Ink gap (px) between consecutive dots of a double or triple dot.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const AUGMENTATION_DOT_SPACING_GAP_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Gap (px) from an up-stem tail's right edge to a dot moved clear of it.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const AUGMENTATION_DOT_TAIL_GAP_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Vertical clearance (px) a dot keeps from an up-stem tail's lowest ink before
 * it must move right of the tail.
 * = 0.15 × STAFF_LINE_SPACING
 */
export const AUGMENTATION_DOT_TAIL_CLEARANCE_PX = STAFF_LINE_SPACING * 0.15;

/**
 * Clearance (px) between crossed voices: an up-stem part's stem and the
 * down-stem part's head or dots it passes.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const CROSSED_VOICE_CLEARANCE_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Gap (px) between the two heads of an unshared unison, so the left part's
 * stem never meets the right head and a semibreve never looks joined to a stem.
 * A drawn head is about 2px wider than its layout box, so this leaves a visible
 * sliver of about 3px.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const UNISON_STEM_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Height (px) of the square bracket over a stemless cluster, above its topmost head.
 * = 1 × STAFF_LINE_SPACING
 */
export const CLUSTER_BRACKET_RISE_PX = STAFF_LINE_SPACING;

/**
 * Length (px) of a stemless cluster bracket's end hooks.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const CLUSTER_BRACKET_HOOK_PX = STAFF_LINE_SPACING * 0.5;

// ─── Beams ────────────────────────────────────────────────────────────────────

/**
 * Vertical thickness (px) of each beam.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const BEAM_THICKNESS_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Vertical gap (px) between stacked beams.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const BEAM_GAP_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Distance (px) from one beam to the next in a stack, so a stack of beams
 * alternates between hanging from, sitting on and straddling stave lines.
 * = BEAM_THICKNESS_PX + BEAM_GAP_PX
 */
export const BEAM_STEP_PX = BEAM_THICKNESS_PX + BEAM_GAP_PX;

/**
 * Beam-to-beam distance (px) for four or more beams inside the stave: spread
 * slightly so that each of four beams touches a stave line across 3 spaces.
 * = (3 − 0.5) / 3 × STAFF_LINE_SPACING
 */
export const WIDE_BEAM_STEP_PX = ((3 - 0.5) / 3) * STAFF_LINE_SPACING;

/**
 * Thickness (px) of every stave line and ledger line.
 */
export const STAFF_LINE_THICKNESS_PX = 1;

/**
 * Stroke width (px) of a stem: thinner than a stave line, but not so thin that
 * it reproduces faintly.
 * = 0.9 × STAFF_LINE_THICKNESS_PX
 */
export const STEM_STROKE_WIDTH_PX = STAFF_LINE_THICKNESS_PX * 0.9;

/**
 * Standard stem length (px): one octave from the centre of the notehead.
 * note.ts derives its drawing-unit stem length from this.
 * = 3.5 × STAFF_LINE_SPACING
 */
export const BASE_STEM_LENGTH_PX = STAFF_LINE_SPACING * 3.5;

/**
 * Shortest allowed stem (px): a sixth. No stem is drawn shorter, whether it
 * points out of the stave or is shortened to fit a beam slope.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const MIN_STEM_LENGTH_PX = STAFF_LINE_SPACING * 2.5;

/**
 * Length (px) of a stem pointing away from the stave whose head sits on the
 * middle line. Each further step outward shortens it.
 * = 3.25 × STAFF_LINE_SPACING
 */
export const OUTWARD_STEM_LENGTH_AT_MIDDLE_PX = STAFF_LINE_SPACING * 3.25;

/**
 * Shortening (px) per diatonic step for a stem pointing away from the stave.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const OUTWARD_STEM_SHORTENING_PER_STEP_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Stem lengthening (px) for each tail beyond what the stem has room for; also
 * the spacing between stacked tails, a little less than a stave-space.
 * = 0.875 × STAFF_LINE_SPACING
 */
export const FLAG_STEM_STEP_PX = STAFF_LINE_SPACING * 0.875;

/**
 * Length (px) of a lone tail: on a 3½-space stem it ends level with the
 * notehead's near edge. A shorter stem takes a shorter tail.
 * = 3 × STAFF_LINE_SPACING
 */
export const QUAVER_TAIL_LENGTH_PX = STAFF_LINE_SPACING * 3;

/**
 * Stem length (px) left free of tails on a down-stem, from the head's centre to
 * its lower edge. Keeps a standard stem's lone tail at its full length.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const DOWN_TAIL_HEAD_ROOM_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Combined length (px) of two stacked tails, a little longer than a lone tail.
 * Also the shortest stem that can carry them.
 * = 3.25 × STAFF_LINE_SPACING
 */
export const TWO_TAILS_LENGTH_PX = STAFF_LINE_SPACING * 3.25;

/**
 * Length (px) of each tail in a stack, so that the stack nests inside the shape
 * of a lone tail.
 * = TWO_TAILS_LENGTH_PX − FLAG_STEM_STEP_PX
 */
export const STACKED_TAIL_LENGTH_PX = TWO_TAILS_LENGTH_PX - FLAG_STEM_STEP_PX;

/**
 * Gap (px) kept between a tail's end and the first ledger line, on a stem
 * running from a ledger-line note back into the stave.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const LEDGER_TAIL_CLEARANCE_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Advance (px) added to MIN_NOTE_WIDTH for a note or chord straight after an
 * up-stem tail, so the tail doesn't crowd its notehead.
 * = 0.35 × STAFF_LINE_SPACING
 */
export const NOTE_AFTER_UP_TAIL_EXTRA_ADVANCE_PX = STAFF_LINE_SPACING * 0.35;

/**
 * Advance (px) added to MIN_NOTE_WIDTH for a rest straight after an up-stem
 * tail, so the tail clears the rest, down to the widest rest glyph.
 * = 1.2 × STAFF_LINE_SPACING
 */
export const REST_AFTER_UP_TAIL_EXTRA_ADVANCE_PX = STAFF_LINE_SPACING * 1.2;

/**
 * The same for a rest after a down-stem tail, which reaches less far right, so
 * that a rest sits the same distance from a tail in either direction.
 * = 0.75 × STAFF_LINE_SPACING
 */
export const REST_AFTER_DOWN_TAIL_EXTRA_ADVANCE_PX = STAFF_LINE_SPACING * 0.75;

/**
 * Stem-to-stem distance (px) a beam assumes before its notes are spaced; wide
 * enough not to count as closely spaced.
 * = 4 × STAFF_LINE_SPACING
 */
export const BEAM_ESTIMATE_NOTE_SPACING_PX = STAFF_LINE_SPACING * 4;

/**
 * Shortest beamed stem (px) for a head inside the stave. A head outside the
 * stave may go down to MIN_STEM_LENGTH_PX.
 * = 3 × STAFF_LINE_SPACING
 */
export const BEAMED_STEM_MIN_IN_STAVE_PX = STAFF_LINE_SPACING * 3;

/**
 * Beam slope (px) per space of interval between the outer notes, before the
 * caps below: a 2nd slopes ¼ space, a 3rd ½, a 5th a whole space.
 */
export const BEAM_SLOPE_PER_INTERVAL = 0.5;

/**
 * Steepest slope (px) for a group of two or three notes: it crosses no more
 * than one stave line.
 * = STAFF_LINE_SPACING
 */
export const MAX_BEAM_SLOPE_SHORT_GROUP_PX = STAFF_LINE_SPACING;

/**
 * Steepest slope (px) for a group of four or more notes.
 * = 2 × STAFF_LINE_SPACING
 */
export const MAX_BEAM_SLOPE_LONG_GROUP_PX = STAFF_LINE_SPACING * 2;

/**
 * Average distance (px) between adjacent stems below which a group counts as
 * closely spaced and takes only a slight slope.
 * = 3 × STAFF_LINE_SPACING
 */
export const CLOSE_BEAMED_NOTES_SPACING_PX = STAFF_LINE_SPACING * 3;

/**
 * Steepest slope (px) for a closely spaced group, and for a group whose notes
 * all lie past the first ledger line.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const MAX_BEAM_SLOPE_SLIGHT_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Slope (px) of a closely spaced or all-ledger-line group whose outer notes
 * are a 2nd apart.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const BEAM_SLOPE_SECOND_SLIGHT_PX = STAFF_LINE_SPACING * 0.25;

/**
 * How much further (px) from the middle line the minority of a beamed group
 * must reach before it, rather than the majority, sets the stem direction:
 * a few short stems the 'wrong' way read better than many long ones.
 * = STAFF_LINE_SPACING
 */
export const BEAM_MINORITY_FAR_THRESHOLD_PX = STAFF_LINE_SPACING;

/**
 * Longest stem (px) a one-direction beam may need before a wide-interval
 * group takes a beam between the noteheads with stems both ways.
 * = 5 × STAFF_LINE_SPACING
 */
export const KNEED_BEAM_TRIGGER_STEM_PX = STAFF_LINE_SPACING * 5;

/**
 * Extra pixels the stem tip extends inside the beam polygon to prevent
 * sub-pixel rendering gaps between stem and beam.
 * = 0.2 × STAFF_LINE_SPACING
 */
export const STEM_OVERLAP_PX = STAFF_LINE_SPACING * 0.2;

/**
 * Preferred clearance (px) between a rest's glyph and a double-stemmed beam
 * it's placed against; reduced when a notehead beyond leaves less room (see
 * MIN_REST_NOTE_CLEARANCE_PX).
 * = 1.5 × STAFF_LINE_SPACING
 */
export const REST_BEAM_CLEARANCE_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Minimum gap (px) between a double-stemmed member's notehead and the beam
 * level nearest it; the beam moves to keep it, and past that the gap widens.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const DOUBLE_STEMMED_BEAM_MIN_STEM_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Minimum clearance (px) between a cross-staff rest's glyph and the nearest
 * notehead on an adjacent staff.
 * = STAFF_LINE_SPACING
 */
export const MIN_REST_NOTE_CLEARANCE_PX = STAFF_LINE_SPACING;

/**
 * X distance (px) within which a cross-staff rest counts as on its nearest
 * member's beat, and is nudged off that member's stem. Same-beat centres
 * still differ by about a space, and a tighter value flickers between passes.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const REST_STEM_AVOIDANCE_THRESHOLD_PX = STAFF_LINE_SPACING * 2.5;

/**
 * Leftward nudge (px) moving a cross-staff rest off a same-beat stem; left,
 * since a rest belongs to the note it precedes.
 * = 1.2 × STAFF_LINE_SPACING
 */
export const REST_STEM_AVOIDANCE_NUDGE_PX = STAFF_LINE_SPACING * 1.2;

/**
 * Stroke width (px) of a `shared-stem-for` stem: the same as a normal stem.
 */
export const SHARED_STEM_WIDTH_PX = STEM_STROKE_WIDTH_PX;

/**
 * X distance (px) beyond which a `shared-stem-for` pair isn't on one beat and
 * warns: same-beat entries on sibling staves share an x by construction.
 * = STAFF_LINE_SPACING
 */
export const SHARED_STEM_MISALIGNMENT_WARN_PX = STAFF_LINE_SPACING;

/**
 * Tolerance (px) for treating two `crossStaffTupletBeamY` values as unchanged:
 * re-measured each redraw, sub-pixel jitter would otherwise re-render forever.
 * Below STEM_OVERLAP_PX (2px), above layout jitter.
 */
export const CROSS_STAFF_TUPLET_BEAM_Y_EPSILON_PX = 0.5;

/**
 * Pull-back (px) from a stem-end slur anchor toward the notehead, since the
 * bare tip touches the beam.
 * = 0.9 × STAFF_LINE_SPACING
 */
export const SLUR_STEM_END_CLEARANCE_PX = STAFF_LINE_SPACING * 0.9;

/**
 * Minimum curve height (as a fraction of a slur's own real horizontal span)
 * for a cross-staff slur — a fixed DEFAULT_BULGE_HEIGHT reads as a
 * near-straight diagonal once the span reaches the width of a whole
 * grand-staff hand-crossing passage.
 */
export const CROSS_STAFF_SLUR_BULGE_SPAN_RATIO = 0.1;

/**
 * Clearance (px) past a note's own real stem tip, on the far side from the
 * notehead, for a cross-staff slur endpoint whose stem points toward the
 * slur's side (connectorsBuilder.ts#computeBeyondBeamAnchor); clear of the
 * beam or flag.
 * = 1.2 × STAFF_LINE_SPACING
 */
export const SLUR_BEYOND_BEAM_CLEARANCE_PX = STAFF_LINE_SPACING * 1.2;

/**
 * Minimum gap (px) a cross-staff slur keeps from every other entry's glyphs
 * (noteheads, stems, flags, rests, ledger lines, beams) so it visibly does
 * not touch them.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const SLUR_OBSTACLE_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Upper bound of a cross-staff slur's control heights, as a fraction of its
 * own real horizontal span; a slur that can't clear everything within it tries
 * its other side.
 */
export const SLUR_CONTROL_HEIGHT_MAX_RATIO = 0.6;

/**
 * Width (px) of the vertical slices a beam polygon is cut into for slur
 * obstacle tests, so a sloped beam keeps its real outline instead of
 * collapsing to its bounding box.
 */
export const SLUR_BEAM_SLICE_WIDTH_PX = 3;

/**
 * Offset (px) of a slur's end from its notehead centre, so the arc visibly
 * leaves the head without touching it.
 * = 0.9 × STAFF_LINE_SPACING
 */
export const SLUR_NOTEHEAD_OFFSET_PX = STAFF_LINE_SPACING * 0.9;

/** How far (px) a tie reaches past its anchors. = half of curve.ts's DEFAULT_BULGE_HEIGHT (0.9 × STAFF_LINE_SPACING) */
export const TIE_REACH_PX = STAFF_LINE_SPACING * 0.45;

/** Gap (px) between a head, or the stem beside it, and the end of a tie on its voice's side. = 0.3 × STAFF_LINE_SPACING */
export const TIE_BESIDE_HEAD_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Gap (px) between the clef/key/time area and the start of a tie or slur
 * continued from the previous system.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const CONTINUED_CONNECTOR_LEAD_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Gap (px) a slur keeps from the articulation marks it encloses, at its ends
 * and over the notes between them.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const SLUR_ARTICULATION_CLEARANCE_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Gap (px) an outer slur keeps from a slur nested inside it, along the arc.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const SLUR_NESTED_CLEARANCE_PX = STAFF_LINE_SPACING * 0.3;

/**
 * How far (px) beside a stem, and short of its end, a slur's own end sits on
 * the stem side of a note.
 * = 0.6 and 0.5 × STAFF_LINE_SPACING
 */
export const SLUR_BESIDE_STEM_GAP_PX = STAFF_LINE_SPACING * 0.6;
export const SLUR_BESIDE_STEM_INSET_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Clearance (px) between a slur and the heads and accidentals it passes.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const SLUR_NOTE_CLEARANCE_PX = STAFF_LINE_SPACING * 0.3;

/**
 * How much further (px) than usual a slur's symmetric arc bows around what it
 * spans before a lopsided one takes over.
 * = 6.6 × STAFF_LINE_SPACING
 */
export const SLUR_MAX_EXTRA_BULGE_PX = STAFF_LINE_SPACING * 6.6;

/**
 * Gap (px) kept between content drawn past its host's or row's edge and that
 * edge, once the host grows its margin to make room.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const VERTICAL_OVERFLOW_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

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
 * Vertical y-offset (px) applied to flat accidentals in the key signature,
 * which puts the bowl, not the glyph's middle, on the pitch.
 * = −0.55 × STAFF_LINE_SPACING
 */
export const KEY_SIG_FLAT_Y_OFFSET = STAFF_LINE_SPACING * -0.55;

/**
 * Y translation (px) applied to the time signature SVG within the describe
 * container. Positions the numerals to straddle the middle staff lines.
 * = 3 × STAFF_LINE_SPACING
 */
export const TIME_SIG_Y_TRANSLATE = STAFF_LINE_SPACING * 3;

/**
 * Horizontal centre (px) of the time-signature numerals within their SVG.
 * = 2 × STAFF_LINE_SPACING
 */
export const TIME_SIG_GLYPH_CENTER_X_PX = STAFF_LINE_SPACING * 2;

/**
 * Width (px) of one time-signature digit (bold, font-size 28).
 * = 1.7 × STAFF_LINE_SPACING
 */
export const TIME_SIG_DIGIT_WIDTH_PX = STAFF_LINE_SPACING * 1.7;

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
 * How far (px) above the staff box's bottom edge the first verse's tops stand,
 * two spaces below the stave.
 * = STAFF_LINE_SPACING
 */
export const LYRICS_WRAPPER_OVERLAP_PX = STAFF_LINE_SPACING;

/** Distance (px) between the lines of two verses. = 1.5 × STAFF_LINE_SPACING */
export const LYRICS_VERSE_SPACING_PX = STAFF_LINE_SPACING * 1.5;

/** Gap (px) between lyrics and what stands above them. = 0.5 × STAFF_LINE_SPACING */
export const LYRICS_INK_GAP_PX = STAFF_LINE_SPACING * 0.5;

/** Sub-pixel drift (px) that doesn't count as a move of the lyric line. */
export const LYRICS_ROW_EPSILON_PX = 0.5;

/**
 * Minimum pixel gap between the left edge of the staff's notes area and the
 * first notehead. Guards against accidentals bleeding into the left barline
 * in non-first measures where describeEndX ≈ 0.
 */
export const NOTES_AREA_LEFT_MARGIN = 2;

/**
 * Estimated width (px) per character of a connector's italic label: 0.65 ×
 * curve.ts's LABEL_FONT_SIZE (STAFF_LINE_SPACING × 1.1, kept in sync by hand).
 */
export const CONNECTOR_LABEL_CHAR_WIDTH_PX = STAFF_LINE_SPACING * 1.1 * 0.65;

// ─── Note spacing — sizing preference (horizontal) ────────────────────────────
//
// Feeds only computeSpacingWeights: how wide a measure would like to be, not
// where entries sit. Starting value — tune visually in Storybook.

/**
 * Slack (px) per whole-note's worth of duration, beyond the MIN_NOTE_WIDTH
 * strut, for the sizing-preference calculation. A quarter note's slack is
 * PIXELS_PER_BEAT × 0.25; an eighth note's is PIXELS_PER_BEAT × 0.125.
 * = 16 × STAFF_LINE_SPACING
 */
export const PIXELS_PER_BEAT = STAFF_LINE_SPACING * 16;

/**
 * Gap (px) between the end of the clef/key/time area and the first entry, so a
 * lone whole note is not jammed against the clef. Part of the collision floor.
 * = 1 × STAFF_LINE_SPACING
 */
export const LEADING_NOTE_GAP_PX = STAFF_LINE_SPACING;

// ─── Accidental symbol dimensions ────────────────────────────────────────────

import type { ConventionalAccidentalType, QuarterTone } from '../types/theory';

/**
 * Rendered pixel width of each accidental symbol type.
 * Used for collision detection and column layout when stacking accidentals on chords.
 */
export const ACCIDENTAL_SYMBOL_WIDTH: Record<
  ConventionalAccidentalType,
  number
> = {
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

/**
 * Width (px) of each parenthesis around a reminder accidental.
 * = 0.35 × STAFF_LINE_SPACING
 */
export const ACCIDENTAL_REMINDER_PAREN_WIDTH_PX = STAFF_LINE_SPACING * 0.35;

/** How far (px) a quarter-tone arrow reaches past its stroke. = 0.75 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_OVERSHOOT_PX = STAFF_LINE_SPACING * 0.75;

/** Width (px) of a quarter-tone arrow's head. = 0.85 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_HEAD_WIDTH_PX = STAFF_LINE_SPACING * 0.85;

/** Height (px) of a quarter-tone arrow's head. = 0.6 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_HEAD_HEIGHT_PX = STAFF_LINE_SPACING * 0.6;

/** Stroke width (px) of a quarter-tone arrow's head. = 0.13 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_HEAD_STROKE_PX = STAFF_LINE_SPACING * 0.13;

/** Clearance (px) a beam keeps from a quarter-tone arrow's tip. = 0.2 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_BEAM_GAP_PX = STAFF_LINE_SPACING * 0.2;

/** Gap (px) between a quarter-tone arrow and a reminder's parenthesis. = 0.15 × STAFF_LINE_SPACING */
export const ACCIDENTAL_ARROW_PAREN_GAP_PX = STAFF_LINE_SPACING * 0.15;

/**
 * The stroke each accidental's arrow extends, in px of its glyph: the stroke's
 * x, the end the arrow grows from, its width, and for a glyph with no stroke
 * how far inside that end (px) the shaft starts. A glyph scaled into a taller
 * or narrower box than its viewBox is centred, so its left edge is inset.
 */
export const ACCIDENTAL_ARROW_STROKES: Record<
  ConventionalAccidentalType,
  Record<
    QuarterTone,
    { x: number; endY: number; width: number; startInset?: number }
  >
> = {
  flat: {
    up: { x: 0.83, endY: 0, width: 2 },
    down: { x: 0.83, endY: 25, width: 2 },
  },
  'double-flat': {
    up: { x: 1.5, endY: 0, width: 2 },
    down: { x: 1.5, endY: 25, width: 2 },
  },
  natural: {
    up: { x: 2.5, endY: 0, width: 1.67 },
    down: { x: 7.5, endY: 25, width: 1.67 },
  },
  sharp: {
    up: { x: 7, endY: 0, width: 1.5 },
    down: { x: 3, endY: 30, width: 1.5 },
  },
  'double-sharp': {
    up: { x: 5, endY: 0, width: 1.5, startInset: 3.5 },
    down: { x: 5, endY: 10, width: 1.5, startInset: 3.5 },
  },
};

// ─── Dynamics ─────────────────────────────────────────────────────────────────

/**
 * Y position (px, in note-coordinate space) of the dynamics baseline below the
 * staff. Dynamics text and hairpin center-lines are drawn at this Y value.
 * = STAFF_BOTTOM_LINE_Y + 2 × STAFF_LINE_SPACING  (= 70 + 20 = 90)
 */
export const DYNAMICS_BASELINE_Y = STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING * 2;

/**
 * Y position (px, in note-coordinate space) of the dynamics baseline above the
 * staff, for a multi-voice staff's up-stem voice.
 * = STAFF_TOP_LINE_Y - 2 × STAFF_LINE_SPACING  (= 30 - 20 = 10)
 */
export const DYNAMICS_ABOVE_BASELINE_Y =
  STAFF_TOP_LINE_Y - STAFF_LINE_SPACING * 2;

/**
 * Full spread (px) of the open end of a hairpin wedge — one staff space.
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
 * Estimated width (px) of each upright bracket around a reminder dynamic.
 * = 0.35 × DYNAMICS_FONT_SIZE
 */
export const DYNAMIC_REMINDER_BRACKET_WIDTH_PX = DYNAMICS_FONT_SIZE * 0.35;

/**
 * Minimum horizontal gap (px) between a dynamic marking's estimated edge and
 * an adjacent hairpin's start/end point.
 */
export const HAIRPIN_DYNAMIC_GAP_PX = 4;

/**
 * Gap (px) between two hairpins that meet on one note (a crescendo into a
 * diminuendo): each stops short of the note's centre by half of it.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const HAIRPIN_JOINT_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Shortest gap (px) between the two open ends of a `< >` swell; a longer swell
 * leaves a sixth of its length (SWELL_MID_GAP_SHARE).
 * = 1 × STAFF_LINE_SPACING
 */
export const SWELL_MID_GAP_PX = STAFF_LINE_SPACING;

/**
 * Share of a swell's length left open between its wedges (figures: 10–25%).
 * = 1/6
 */
export const SWELL_MID_GAP_SHARE = 1 / 6;

/**
 * Gap (px) from a `dynamic-end`'s right edge to the next entry's ink, or to
 * the next entry's own dynamic.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const DYNAMIC_END_NEXT_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) from a `dynamic-end`'s right edge to the barline.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const DYNAMIC_END_BARLINE_GAP_PX = STAFF_LINE_SPACING * 1.5;

/**
 * How far (px) a hairpin's axis on a dynamics row sits above the row's
 * baseline, level with the middle of the letters standing on it.
 * = 0.3 × DYNAMICS_FONT_SIZE
 */
export const HAIRPIN_AXIS_RISE_PX = DYNAMICS_FONT_SIZE * 0.3;

/**
 * Shortest wedge (px) a swell draws; shorter reads as a mark, not a hairpin.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const SWELL_MIN_WEDGE_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Room (px) a swell needs from its note's start: two shortest wedges and the
 * gap between them.
 * = 2 × SWELL_MIN_WEDGE_PX + SWELL_MID_GAP_PX
 */
export const SWELL_MIN_SPAN_PX = 2 * SWELL_MIN_WEDGE_PX + SWELL_MID_GAP_PX;

/**
 * Share of DYNAMICS_FONT_SIZE a dynamic glyph reaches above / below its
 * baseline, for estimating its box. Bold italic dynamics have tall ascenders
 * and almost no descent.
 */
export const DYNAMICS_TEXT_ASCENT_RATIO = 0.75;
export const DYNAMICS_TEXT_DESCENT_RATIO = 0.25;

/** Gap (px) between a row of dynamics and the notes it clears. = 1 × STAFF_LINE_SPACING */
export const DYNAMICS_ROW_INK_GAP_PX = STAFF_LINE_SPACING;

/**
 * Gap (px) between a row of dynamics and the slurs, ties and brackets it clears.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const DYNAMICS_ROW_CURVE_GAP_PX = STAFF_LINE_SPACING * 0.5;

/** Sub-pixel drift (px) that doesn't count as a change of dynamics row. */
export const DYNAMICS_ROW_EPSILON_PX = 0.5;

/**
 * Shallowest slant (radians) an angled hairpin may take — 10°, enough to read
 * as distinct from the horizontal staff lines it crosses even over a widely
 * spaced passage.
 */
export const HAIRPIN_MIN_ROUTE_SLANT_RADIANS = Math.PI / 18;

/** Steepest slant (radians) an angled hairpin may take — 45°. */
export const HAIRPIN_MAX_ROUTE_SLANT_RADIANS = Math.PI / 4;

/**
 * Slant (radians) an angled hairpin aims for among valid routes — 30°, close
 * to the conventional engraved example of one angled through a stave.
 */
export const HAIRPIN_PREFERRED_ROUTE_SLANT_RADIANS = Math.PI / 6;

/**
 * Minimum gap (px) between a hairpin (or its endpoint dynamic) and any beam.
 * = 0.5 × STAFF_LINE_SPACING  (= 5, same as SLUR_OBSTACLE_CLEARANCE_PX)
 */
export const HAIRPIN_BEAM_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Minimum gap (px) between a hairpin and a notehead or other non-stem glyph.
 * = 0.3 × STAFF_LINE_SPACING  (= 3)
 */
export const HAIRPIN_NOTE_CLEARANCE_PX = STAFF_LINE_SPACING * 0.3;

/**
 * How far (px) an angled hairpin's outside end sits past the stave's far
 * line, beyond its own half-opening.
 * = 1.5 × STAFF_LINE_SPACING  (= 15)
 */
export const HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Step (px) between candidate hairpin Ys when searching for a clear placement.
 * = 0.5 × STAFF_LINE_SPACING  (= 5)
 */
export const HAIRPIN_ROUTE_SEARCH_STEP_PX = STAFF_LINE_SPACING * 0.5;

/** Outward steps tried for an angled hairpin's outside end before giving up. */
export const HAIRPIN_ROUTE_MAX_SEARCH_STEPS = 6;

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
export const ACCIDENTAL_SYMBOL_HEIGHT: Record<
  ConventionalAccidentalType,
  number
> = {
  'double-sharp': 10,
  sharp: 30,
  natural: 25,
  flat: 25,
  'double-flat': 25,
};

/**
 * Where each accidental's pitch falls, as a fraction of its height from the
 * top: a flat's is the centre of its bowl, the others' their own middle.
 */
export const ACCIDENTAL_PITCH_RATIO: Record<
  ConventionalAccidentalType,
  number
> = {
  'double-sharp': 0.5,
  sharp: 0.5,
  natural: 0.5,
  flat: 0.75,
  'double-flat': 0.75,
};

/**
 * How much higher (px) a natural's left stroke ends than its right one, in
 * the column a flat's stem rises into.
 */
export const NATURAL_LEFT_STROKE_INSET_PX = STAFF_LINE_SPACING / 3;

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

/** Gap (px) between a grace head and the accidental of the grace note after it. = 0.3 × STAFF_LINE_SPACING */
export const GRACE_ACCIDENTAL_LEAD_GAP_PX = STAFF_LINE_SPACING * 0.3;

/** Clearance (px) an ornament's slur keeps from the heads and accidentals it passes. = 0.2 × STAFF_LINE_SPACING */
export const ORNAMENT_SLUR_CLEARANCE_PX = STAFF_LINE_SPACING * 0.2;

/** Bulge height (px) past which an ornament's slur lifts off its notes instead. = 3 × STAFF_LINE_SPACING */
export const ORNAMENT_SLUR_MAX_BULGE_PX = STAFF_LINE_SPACING * 3;

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
 * Height (px) of a mid-stream clef's drawing box.
 * = 8.4 × STAFF_LINE_SPACING
 */
export const MID_STREAM_CLEF_SVG_HEIGHT_PX = STAFF_LINE_SPACING * 8.4;

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
 * Width (px) of a courtesy clef: the clef glyph box at courtesy scale.
 * = MID_STREAM_CLEF_WIDTH_PX × COURTESY_CLEF_SCALE
 */
export const COURTESY_CLEF_WIDTH_PX =
  MID_STREAM_CLEF_WIDTH_PX * COURTESY_CLEF_SCALE;

// ─── Barlines ──────────────────────────────────────────────────────────────────

/**
 * Width (px) of a barline's thin line, the same as the plain barline.
 * = STAFF_LINE_THICKNESS_PX
 */
export const BARLINE_THIN_PX = STAFF_LINE_THICKNESS_PX;

/**
 * Width (px) of the thick line of a final or repeat barline: beam weight.
 * = BEAM_THICKNESS_PX
 */
export const BARLINE_THICK_PX = BEAM_THICKNESS_PX;

/**
 * Gap (px) between the two lines of a double, final or repeat barline.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const BARLINE_LINE_GAP_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Radius (px) of a repeat barline's dot: half a space across.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const REPEAT_DOT_RADIUS_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Gap (px) from a repeat barline's thin line to the near edge of its dots.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const REPEAT_DOT_GAP_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Gap (px) from the clef/key/time glyphs to the thick line of a start repeat
 * that follows them.
 * = 0.6 × STAFF_LINE_SPACING
 */
export const REPEAT_START_LEAD_PX = STAFF_LINE_SPACING * 0.6;

/**
 * Clear space (px) on each side of a mid-bar barline's slot.
 * = 0.8 × STAFF_LINE_SPACING
 */
export const MID_BAR_BARLINE_PADDING_PX = STAFF_LINE_SPACING * 0.8;

// ─── Key-signature changes & reminders ─────────────────────────────────────────

/**
 * Horizontal step (px) of each cancellation natural; a natural is as narrow
 * as a flat.
 * = 0.8 × STAFF_LINE_SPACING
 */
export const KEY_SIG_NATURAL_WIDTH = STAFF_LINE_SPACING * 0.8;

/**
 * Vertical offset (px) of a cancellation natural against the key-signature
 * coordinates: a natural's centre sits 2px higher in its box than a sharp's.
 * = 0.2 × STAFF_LINE_SPACING
 */
export const KEY_SIG_NATURAL_Y_OFFSET = STAFF_LINE_SPACING * 0.2;

/**
 * Gap (px) between the cancellation naturals and the new key signature.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const KEY_SIG_CANCEL_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) between a barline and the clef/key/time group beside it, and
 * between those groups.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const END_WARNING_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Width (px) of each parenthesis around a bracketed clef/key/time reminder.
 * = 0.6 × STAFF_LINE_SPACING
 */
export const REMINDER_PAREN_WIDTH_PX = STAFF_LINE_SPACING * 0.6;

/**
 * Gap (px) between a reminder's parenthesis and what it encloses.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const REMINDER_PAREN_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * How far (px) a reminder's parentheses reach past the outer stave lines.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const REMINDER_PAREN_OVERHANG_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Extra room (px) a mid-bar barline's slot takes for a warning clef before
 * it: the courtesy clef and a gap.
 * = COURTESY_CLEF_WIDTH_PX + END_WARNING_GAP_PX
 */
export const MID_BAR_WARNING_CLEF_WIDTH_PX =
  COURTESY_CLEF_WIDTH_PX + END_WARNING_GAP_PX;

// ─── Endings ───────────────────────────────────────────────────────────────────

/**
 * Thickness (px) of an ending bracket, the weight of a stave line.
 * = STAFF_LINE_THICKNESS_PX
 */
export const ENDING_LINE_THICKNESS_PX = STAFF_LINE_THICKNESS_PX;

/**
 * Distance (px) of an ending bracket's line below its measure's top. Fixed,
 * like the measure number's spot, so the brackets of a row stay level and
 * the label sits above the number.
 * = STAFF_LINE_THICKNESS_PX
 */
export const ENDING_LINE_Y_PX = STAFF_LINE_THICKNESS_PX;

/**
 * Length (px) of an ending bracket's hooks.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const ENDING_HOOK_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Gap (px) between an ending bracket's hook and the barline, so brackets
 * meeting at a barline stay apart.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const ENDING_INSET_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Font size (px) of an ending's label: the time-signature numerals' font and
 * weight at the height the reference draws them.
 * = 1.4 × STAFF_LINE_SPACING
 */
export const ENDING_LABEL_FONT_SIZE = STAFF_LINE_SPACING * 1.4;

/**
 * Gap (px) between an ending's left hook and its label.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const ENDING_LABEL_INSET_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Height (px) the label hangs below the bracket line, to its baseline: a gap,
 * then the numerals' cap height (about 0.7 of the font size).
 * = 0.2 × STAFF_LINE_SPACING + 0.7 × ENDING_LABEL_FONT_SIZE
 */
export const ENDING_LABEL_HEIGHT_PX =
  STAFF_LINE_SPACING * 0.2 + ENDING_LABEL_FONT_SIZE * 0.7;

/**
 * Least distance (px) from an ending bracket's line down to the top stave
 * line, over an empty bar.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const ENDING_MIN_ABOVE_STAFF_PX = STAFF_LINE_SPACING * 2.5;

/**
 * Gap (px) kept between an ending bracket, or a bar number under it, and the
 * highest ink of the bar's top staff (a fermata over a high note).
 * = 0.8 × STAFF_LINE_SPACING
 */
export const ENDING_CONTENT_CLEARANCE_PX = STAFF_LINE_SPACING * 0.8;

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
 * How far (px) a bracket's stem runs past the outer staff lines, at each end
 * equally — so its hooks curl clearly clear of the staves it groups rather
 * than blending into the top/bottom line. Braces sit flush. Starting value —
 * tune visually in Storybook.
 */
export const BRACKET_LINE_OVERHANG_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Thickness (px) of a bracket connector's straight stem, drawn as a plain
 * filled rectangle between its top and bottom hook glyphs: 0.5 staff-spaces.
 */
export const BRACKET_STEM_THICKNESS_PX = STAFF_LINE_SPACING * 0.5;

// ─── Staff label (r.h./l.h. hand-distribution, instrument names) ──────────────

/**
 * Font size (px) for a staff's `label` attribute text (e.g. "r.h."/"l.h.").
 * Matches DYNAMICS_FONT_SIZE's italic-marking scale — both are short margin
 * annotations, not full notation glyphs.
 */
export const STAFF_LABEL_FONT_SIZE = STAFF_LINE_SPACING * 1.1;

/**
 * Horizontal gap (px) reserved to the left of a staff label's own text, so
 * it doesn't sit flush against the container/page edge (or, when combined
 * with a brace/bracket, against that glyph). Starting value — tune visually
 * in Storybook.
 */
export const STAFF_LABEL_LEFT_MARGIN_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Width (px) reserved for a staff label, not measured: enough for "r.h." or
 * "Piano I". Starting value — tune visually in Storybook.
 */
export const STAFF_LABEL_WIDTH_PX = STAFF_LINE_SPACING * 5;

// ─── Measure number ─────────────────────────────────────────────────────────

/**
 * Font size (px) for a measure's own `number` display — smaller than
 * STAFF_LABEL_FONT_SIZE: a running counter the reader glances at, not a
 * primary annotation like a hand-distribution label.
 */
export const MEASURE_NUMBER_FONT_SIZE = STAFF_LINE_SPACING * 0.9;

/**
 * Vertical gap (px) between a measure number's own baseline and
 * MEASURE_NUMBER_TOP_PX (measure.ts) — keeps it clear of the staff itself.
 * Starting value — tune visually in Storybook.
 */
export const MEASURE_NUMBER_BOTTOM_MARGIN_PX = STAFF_LINE_SPACING * 0.5;

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

// ─── Arpeggio dynamic-change hairpin ─────────────────────────────────────────
// A vertical crescendo/diminuendo wedge drawn just left of the arpeggio sign,
// spanning the chord's vertical extent, with a dynamic letter outside the staff
// at each end. Starting values — tune in Storybook.

/** Gap (px) between the arpeggio wave's left edge and the hairpin's right edge. */
export const ARPEGGIO_HAIRPIN_GAP_PX = STAFF_LINE_SPACING * 0.4;

/** Horizontal spread (px) at the open end of the vertical hairpin wedge. */
export const ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX = STAFF_LINE_SPACING * 0.9;

/** How far (px) the wedge runs past the outer noteheads, top and bottom. */
export const ARPEGGIO_HAIRPIN_VERTICAL_OVERSHOOT_PX = STAFF_LINE_SPACING * 0.5;

/** Gap (px) between a wedge end and the dynamic letter placed beyond it. */
export const ARPEGGIO_HAIRPIN_DYNAMIC_GAP_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Leftward footprint (px) of the hairpin *wedge*, stacked in front of the
 * arpeggio sign's own footprint. The centred `-from` / `-to` dynamic letters
 * spill further left than this; `computeArpeggioHairpinFootprintWidth` adds that
 * letter term on top (estimated per character, not measured).
 */
export const ARPEGGIO_HAIRPIN_FOOTPRINT_PX =
  ARPEGGIO_HAIRPIN_GAP_PX + ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX;

/**
 * Vertical distance (px) above the staff top line at which the upper dynamic
 * letter of a vertical hairpin sits — feeds the above-staff budget estimate.
 */
export const ARPEGGIO_HAIRPIN_DYNAMIC_ABOVE_STAFF_PX = STAFF_LINE_SPACING * 2.4;

// ─── Written-out arpeggio (`<music-arpeggio>`: run notes tied into a chord) ───
// Ties and their divided/open forms. Starting values — tune in Storybook.

/** Length (px) of each half of a divided tie (a short hook off one notehead). */
export const ARPEGGIO_RUN_TIE_STUB_LENGTH_PX = STAFF_LINE_SPACING * 1.1;

/** Half the centre gap (px) left where a divided tie's two stubs stop short. */
export const ARPEGGIO_RUN_DIVIDED_TIE_GAP_HALF_PX = STAFF_LINE_SPACING * 0.6;

/**
 * A tie is divided when another notehead's centre lies within this vertical
 * distance (px) of the tie curve along the run.
 */
export const ARPEGGIO_RUN_TIE_OBSCURE_CLEARANCE_PX = STAFF_LINE_SPACING * 0.7;

/** Length (px) of an open-ended (laissez vibrer) tie curve. */
export const LAISSEZ_VIBRER_CURVE_LENGTH_PX = STAFF_LINE_SPACING * 1.6;

// ─── Trills ───────────────────────────────────────────────────────────────────
// The sign is built from an engraved glyph outline (see
// utils/svgCreator/trill.ts); the wavy extension line tiles a second engraved
// segment horizontally, the same stretch-to-fit approach as the arpeggio wave
// (see utils/svgCreator/arpeggio.ts) but running left-to-right instead of
// top-to-bottom. Starting values — tune in Storybook.

/** Rendered height (px) of the trill sign. */
export const TRILL_SIGN_HEIGHT_PX = STAFF_LINE_SPACING * 1.4;

/** Gap (px) between the sign's own bottom edge and the staff top line. */
export const TRILL_ABOVE_STAFF_GAP_PX = STAFF_LINE_SPACING * 0.6;

/** Rendered peak-to-peak vertical height (px) of the wavy line. */
export const TRILL_WAVE_HEIGHT_PX = STAFF_LINE_SPACING * 0.9;

/** Gap (px) between the sign's right edge and the wavy line's start. */
export const TRILL_SIGN_LINE_GAP_PX = STAFF_LINE_SPACING * 0.3;

/** Gap (px) the wavy line stops short of a following (non-trilling) notehead. */
export const TRILL_LINE_END_GAP_PX = STAFF_LINE_SPACING * 0.4;

/** Height (px) of the vertical notch that marks an explicit `trill-stop`. */
export const TRILL_NOTCH_HEIGHT_PX = STAFF_LINE_SPACING * 0.9;

/**
 * Scale applied to a trilling-note accidental drawn above the trill sign —
 * smaller than a full notehead accidental, matching the sign's own reduced
 * scale relative to a normal notehead.
 */
export const TRILL_ACCIDENTAL_SCALE = 0.7;

/** Gap (px) between the trilling-note accidental's bottom edge and the sign's top edge. */
export const TRILL_ACCIDENTAL_GAP_PX = STAFF_LINE_SPACING * 0.2;

/**
 * Scale applied to a written trilling notehead (`trill-note`) — a cue-note
 * size (¾ scale), matching GRACE_SCALE's own note on cue-note sizing but
 * slightly larger than a grace note, since it stands alone rather than
 * grouped in a run.
 */
export const TRILL_WRITTEN_NOTE_SCALE = 0.75;

/** Gap (px) between the anchor notehead's right edge and the written trilling notehead's left parenthesis. */
export const TRILL_WRITTEN_NOTE_GAP_PX = STAFF_LINE_SPACING * 0.5;

/** Gap (px) between each parenthesis and the notehead it encloses. */
export const TRILL_PARENTHESIS_NOTE_GAP_PX = STAFF_LINE_SPACING * 0.15;

/** Stroke width (px) of each parenthesis around a written trilling notehead. */
export const TRILL_PARENTHESIS_STROKE_WIDTH = 1.2;

/**
 * How far (px) each parenthesis extends past the notehead's own vertical
 * extent, top and bottom.
 */
export const TRILL_PARENTHESIS_OVERSHOOT_PX = STAFF_LINE_SPACING * 0.25;

/** Horizontal bow depth (px) of each parenthesis curve. */
export const TRILL_PARENTHESIS_BOW_PX = STAFF_LINE_SPACING * 0.3;

// ─── Octave signs ───────────────────────────────────────────────────────────
// A numeral + optional va/ma suffix, a dashed extension line and a corner
// terminator. Starting values — tune visually in Storybook.

/** Rendered height (px) of the octave-sign numeral — 1.5 staff-spaces tall. */
export const OCTAVE_SIGN_FONT_SIZE_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Scale applied to the va/ma suffix relative to the numeral — a smaller
 * superscript-style companion glyph, not a second full-size numeral.
 */
export const OCTAVE_SIGN_SUFFIX_SCALE = 0.6;

/**
 * Estimated width (px) per numeral character (italic serif); positions the
 * va/ma suffix flush after the numeral.
 */
export const OCTAVE_SIGN_CHAR_WIDTH_PX = OCTAVE_SIGN_FONT_SIZE_PX * 0.65;

/**
 * Fixed nominal Y position (px, note-coordinate space) for a pitch-raising
 * (sopra) span's numeral/line. One half-space further from the staff than
 * DYNAMICS_ABOVE_BASELINE_Y, so the two don't share a row by default.
 * = STAFF_TOP_LINE_Y − 2.5 × STAFF_LINE_SPACING
 */
export const OCTAVE_SIGN_ABOVE_STAFF_Y =
  STAFF_TOP_LINE_Y - STAFF_LINE_SPACING * 2.5;

/**
 * Fixed nominal Y position (px, note-coordinate space) for a pitch-lowering
 * (bassa) span's numeral/line — mirrors OCTAVE_SIGN_ABOVE_STAFF_Y below the
 * staff.
 * = STAFF_BOTTOM_LINE_Y + 2.5 × STAFF_LINE_SPACING
 */
export const OCTAVE_SIGN_BELOW_STAFF_Y =
  STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING * 2.5;

/** Gap (px) between the octave sign's own right edge and the first affected note's left edge. */
export const OCTAVE_SIGN_LEADING_GAP_PX = STAFF_LINE_SPACING;

/** Gap (px) between the last affected note's own right edge and the corner terminator. */
export const OCTAVE_SIGN_TRAILING_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Size (px) of each stroke in the corner terminator — mirrors
 * TRILL_NOTCH_HEIGHT_PX's scale for a small end-of-span glyph.
 */
export const OCTAVE_SIGN_CORNER_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Gap (px) between an octave sign's row and a notehead it clears, on top of
 * NOTE_HEAD_RADIUS_PX.
 */
export const OCTAVE_SIGN_NOTEHEAD_CLEARANCE_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Font size (px) of octave-sign prose: the `col` label ("col 8va bassa") and
 * `loco`. Smaller than the numeral.
 */
export const OCTAVE_SIGN_PROSE_FONT_SIZE_PX = STAFF_LINE_SPACING * 0.9;

/** Gap (px) between the corner terminator and a `loco`-closed span's label. */
export const OCTAVE_LOCO_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Estimated width (px) per character of octave-sign prose text (italic
 * serif, about half an em).
 * = 0.5 × OCTAVE_SIGN_PROSE_FONT_SIZE_PX
 */
export const OCTAVE_SIGN_PROSE_CHAR_WIDTH_PX =
  OCTAVE_SIGN_PROSE_FONT_SIZE_PX * 0.5;

/**
 * Estimated width (px) of the standalone "(loco)" label.
 * = 6 × OCTAVE_SIGN_PROSE_CHAR_WIDTH_PX
 */
export const OCTAVE_LOCO_ESTIMATED_WIDTH_PX =
  OCTAVE_SIGN_PROSE_CHAR_WIDTH_PX * 6;

/**
 * Clearance (px) kept between a gap-side octave sign and a double-stemmed
 * beam (or anything hanging off it), and between that sign and other
 * mid-system decorations stepping around it.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const OCTAVE_SIGN_BEAM_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

// ─── Octave signs: cross-measure/system-break continuation ─────────────────

/**
 * Gap (px) between a row-wrap restated octave-sign numeral and the resumed
 * extension line — mirrors TRILL_SIGN_LINE_GAP_PX's role for trill's own
 * restated sign.
 */
export const OCTAVE_SIGN_LINE_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Stroke width (px) of the row-wrap continuation sign's wrapping
 * parentheses; fixed, like TRILL_PARENTHESIS_STROKE_WIDTH.
 */
export const OCTAVE_CONTINUATION_PARENTHESIS_STROKE_WIDTH = 1.2;

/** Horizontal gap (px) between a continuation-sign parenthesis and the numeral/label it wraps. */
export const OCTAVE_CONTINUATION_PARENTHESIS_GAP_PX = STAFF_LINE_SPACING * 0.15;

/** Extra vertical reach (px) of each continuation-sign parenthesis stroke past the numeral's own top/bottom edge. */
export const OCTAVE_CONTINUATION_PARENTHESIS_OVERSHOOT_PX =
  STAFF_LINE_SPACING * 0.25;

/** Horizontal bow depth (px) of each continuation-sign parenthesis curve. */
export const OCTAVE_CONTINUATION_PARENTHESIS_BOW_PX = STAFF_LINE_SPACING * 0.3;

// ─── Noteheads ──────────────────────────────────────────────────────────────

/**
 * Height (px) of a diamond notehead. Its top and bottom corners poke slightly
 * past both stave lines when it sits in a space, so it reads apart from a
 * minim.
 * = 1.25 × STAFF_LINE_SPACING
 */
export const DIAMOND_HEAD_HEIGHT_PX = STAFF_LINE_SPACING * 1.25;

/**
 * Height (px) of a crossed (`x`) notehead — the cross fills one stave-space.
 * = 1 × STAFF_LINE_SPACING
 */
export const X_HEAD_HEIGHT_PX = STAFF_LINE_SPACING;

/**
 * Height (px) of the circled-cross notehead used for half and longer `x`
 * notes (same shape for minim and semibreve).
 * = 1 × STAFF_LINE_SPACING
 */
export const CIRCLE_X_HEAD_HEIGHT_PX = STAFF_LINE_SPACING;

/**
 * Height (px) of a triangular notehead — a little larger than a minim head.
 * = 1.2 × STAFF_LINE_SPACING
 */
export const TRIANGLE_HEAD_HEIGHT_PX = STAFF_LINE_SPACING * 1.2;

/**
 * Distance (px) from the outer stave line to an isolated triangle's head
 * centre — above the top line for `triangle-up`, below the bottom line for
 * `triangle-down`.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const TRIANGLE_OUTSIDE_STAFF_PX = STAFF_LINE_SPACING * 2.5;

/**
 * Distance (px) a triangle's head centre is placed beyond the furthest
 * extent (heads and same-direction stem tips) of the run of notes it follows.
 * = 2.5 × STAFF_LINE_SPACING
 */
export const TRIANGLE_RUN_CLEARANCE_PX = STAFF_LINE_SPACING * 2.5;

// ─── Tremolos ─────────────────────────────────────────────────────────────────

/**
 * Thickness (px) of a tremolo stroke: a little thinner than a beam, so the
 * gaps between strokes stay open against stave lines.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const TREMOLO_STROKE_THICKNESS_PX = STAFF_LINE_SPACING * 0.4;

/**
 * Width (px) of a tremolo stroke: about a black notehead's drawn width, the
 * same for every note value.
 * = 1 × STAFF_LINE_SPACING
 */
export const TREMOLO_STROKE_WIDTH_PX = STAFF_LINE_SPACING;

/**
 * How much higher (px) a stroke's right end sits than its left end.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const TREMOLO_STROKE_RISE_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Centre-to-centre distance (px) between stacked strokes: the beam step.
 * = BEAM_STEP_PX
 */
export const TREMOLO_STROKE_STEP_PX = BEAM_STEP_PX;

/**
 * Distance (px) from the notehead's centre to the nearest edge of two or more
 * strokes, and to the centre of a single stroke.
 * = 1 × STAFF_LINE_SPACING
 */
export const TREMOLO_STROKE_HEAD_CLEARANCE_PX = STAFF_LINE_SPACING;

/**
 * Stem length (px) taken by the root of a tail, where it still runs beside
 * the stem; strokes stay clear of it. Each further tail adds FLAG_STEM_STEP_PX.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const TREMOLO_TAIL_ROOM_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Gap (px) kept between the outermost stroke and a beam.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const TREMOLO_STROKE_END_CLEARANCE_PX = STAFF_LINE_SPACING * 0.5;

/** Height and width (px) of a stem's `cross`. = 0.9 × STAFF_LINE_SPACING */
export const STEM_CROSS_SIZE_PX = STAFF_LINE_SPACING * 0.9;

/** Stroke width (px) of a stem cross's arms. = 0.1 × STAFF_LINE_SPACING */
export const STEM_CROSS_STROKE_WIDTH_PX = STAFF_LINE_SPACING * 0.1;

/** How far (px) in from a plain stem's end a cross is centred. = 1 × STAFF_LINE_SPACING */
export const STEM_CROSS_END_INSET_PX = STAFF_LINE_SPACING;

/** Least gap (px) between a stem cross and its notehead. = 0.5 × STAFF_LINE_SPACING */
export const STEM_CROSS_HEAD_GAP_PX = STAFF_LINE_SPACING * 0.5;

/** Gap (px) between a stem cross and the tremolo stroke beyond it. = 0.3 × STAFF_LINE_SPACING */
export const STEM_CROSS_STROKE_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Length (px) of plain stem left past the outermost stroke.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const TREMOLO_STEM_OVERSHOOT_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) between a stem's end (or the outermost stroke on a stemless head)
 * and the tremolo tuplet numeral beyond it.
 * = 0.4 × STAFF_LINE_SPACING
 */
export const TREMOLO_NUMERAL_GAP_PX = STAFF_LINE_SPACING * 0.4;

/** Font size (px) of the technique labels above the stave: `trem.`, `flz.`, `quasi gliss.`, … */
export const TECHNIQUE_LABEL_FONT_SIZE_PX = STAFF_LINE_SPACING * 1.1;

/**
 * Estimated width (px) of one label character, for stacking labels that
 * would overlap; the usual estimate-don't-measure ratio (× 0.55).
 * = TECHNIQUE_LABEL_FONT_SIZE_PX × 0.55
 */
export const TECHNIQUE_LABEL_CHAR_WIDTH_PX =
  TECHNIQUE_LABEL_FONT_SIZE_PX * 0.55;

/** Baseline to baseline (px) in a label of several lines. = 1.1 × TECHNIQUE_LABEL_FONT_SIZE_PX */
export const TECHNIQUE_LABEL_LINE_HEIGHT_PX =
  TECHNIQUE_LABEL_FONT_SIZE_PX * 1.1;

/**
 * Gap (px) between a technique label's baseline and whatever it
 * sits above: the stave, its note, a tuplet bracket, a trill or another label.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const TECHNIQUE_LABEL_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) a run-on technique text leaves before the next technique text of
 * its staff. = 1 sp
 */
export const TECHNIQUE_TEXT_NEXT_GAP_PX = STAFF_LINE_SPACING;

/**
 * Clearance (px) of technique text below the stave: from the stave and the
 * ink under it, and from its own entry's stem, tail or ledger lines it ends
 * before. = 1 sp
 */
export const TECHNIQUE_TEXT_BELOW_GAP_PX = STAFF_LINE_SPACING;

/** Font size (px) of a `dynamic-text`: the technique label size. = 1.1 sp */
export const DYNAMIC_TEXT_FONT_SIZE_PX = STAFF_LINE_SPACING * 1.1;

/** Gap (px) between a dynamic's letters and its `dynamic-text`. = 0.3 sp */
export const DYNAMIC_TEXT_GAP_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Gap (px) before a `dynamic-text` opening with a comma or bracket, which
 * carries its own space. = 0.1 sp
 */
export const DYNAMIC_TEXT_PUNCTUATION_GAP_PX = STAFF_LINE_SPACING * 0.1;

// ─── Breath marks ─────────────────────────────────────────────────────────────

/**
 * Drawn height (px) of a ✓ breath mark: about 1½ spaces, as engraved over a
 * woodwind phrase.
 * = 1.5 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_TICK_HEIGHT_PX = STAFF_LINE_SPACING * 1.5;

/**
 * Drawn height (px) of a comma breath mark, its glyph's own size.
 * = 1 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_COMMA_HEIGHT_PX = STAFF_LINE_SPACING;

/**
 * Gap (px) between a breath mark's bottom and the top stave line; the mark
 * sits just above the stave.
 * = 0.25 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_STAFF_GAP_PX = STAFF_LINE_SPACING * 0.25;

/**
 * Gap (px) a breath mark keeps above ink beneath it: a high note, a beam
 * across the gap, a label or a bracket.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_INK_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Room (px) kept on each side of a breath mark in the gap after its note,
 * part of the width the entry reserves to its right.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_SIDE_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Gap (px) between a standalone note's right edge (head, dots or tail) and its
 * breath mark.
 * = 0.5 × STAFF_LINE_SPACING
 */
export const BREATH_MARK_STANDALONE_GAP_PX = STAFF_LINE_SPACING * 0.5;

// ─── Dotted ties and slurs ────────────────────────────────────────────────────

/**
 * Dash length (px) of a dotted tie or slur.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const TIE_DASH_PX = STAFF_LINE_SPACING * 0.3;

/**
 * Gap (px) between a dotted tie's or slur's dashes.
 * = 0.3 × STAFF_LINE_SPACING
 */
export const TIE_DASH_GAP_PX = STAFF_LINE_SPACING * 0.3;

// ─── Two-note tremolos ────────────────────────────────────────────────────────

/**
 * Gap (px) a detached tremolo beam stops short of each stem (or where a
 * semibreve's stem would be).
 * = 0.5 × STAFF_LINE_SPACING
 */
export const TREMOLO_BEAM_STEM_GAP_PX = STAFF_LINE_SPACING * 0.5;

/**
 * Longest (px) a detached tremolo beam is drawn; widely spaced notes take a
 * shorter, centred beam rather than a long one.
 * = 6 × STAFF_LINE_SPACING
 */
export const TREMOLO_BEAM_MAX_LENGTH_PX = STAFF_LINE_SPACING * 6;

/**
 * Shortest (px) a detached tremolo beam is drawn; between stems closer than
 * that it may come nearer them than TREMOLO_BEAM_STEM_GAP_PX.
 * = 1 × STAFF_LINE_SPACING
 */
export const TREMOLO_BEAM_MIN_LENGTH_PX = STAFF_LINE_SPACING;

/**
 * Shortest distance (px) between two notes' heads for `beam-position="between"`:
 * an octave.
 * = 7 × STAFF_Y_STEP
 */
export const TREMOLO_BETWEEN_MIN_INTERVAL_PX = 7 * STAFF_Y_STEP;

// ─── Glissandos ───────────────────────────────────────────────────────────────

/** Gap (px) between a glissando line and the ink at each end. = 0.5 × STAFF_LINE_SPACING */
export const GLISSANDO_GAP_PX = STAFF_LINE_SPACING * 0.5;

/** The gap a line too short for GLISSANDO_GAP_PX closes to. = 0.2 × STAFF_LINE_SPACING */
export const GLISSANDO_MIN_GAP_PX = STAFF_LINE_SPACING * 0.2;

/** Line length (px) a glissando's start reserves room for. = 2 × STAFF_LINE_SPACING */
export const GLISSANDO_MIN_LENGTH_PX = STAFF_LINE_SPACING * 2;

/** Shortest line (px) worth drawing. = 1 × STAFF_LINE_SPACING */
export const GLISSANDO_MIN_DRAWN_PX = STAFF_LINE_SPACING;

/** Stroke width (px) of a glissando line. = STAFF_LINE_THICKNESS_PX */
export const GLISSANDO_LINE_THICKNESS_PX = STAFF_LINE_THICKNESS_PX;

/** How far (px) a sloped line keeps off the stave line its head is on. = 0.2 × STAFF_LINE_SPACING */
export const GLISSANDO_OFF_LINE_PX = STAFF_LINE_SPACING * 0.2;

/** How far (px) a level line or a wave moves off that line, into the space. = 0.5 × STAFF_LINE_SPACING */
export const GLISSANDO_LEVEL_LIFT_PX = STAFF_LINE_SPACING * 0.5;

/** Width and depth (px) of a glissando's dip. = 4 and 0.4 × STAFF_LINE_SPACING */
export const GLISSANDO_DIP_WIDTH_PX = STAFF_LINE_SPACING * 4;
export const GLISSANDO_DIP_DEPTH_PX = STAFF_LINE_SPACING * 0.4;

/** Wavelength and amplitude (px) of a wavy glissando. = 2.65 and 0.435 × STAFF_LINE_SPACING */
export const GLISSANDO_WAVELENGTH_PX = STAFF_LINE_SPACING * 2.65;
export const GLISSANDO_WAVE_AMPLITUDE_PX = STAFF_LINE_SPACING * 0.435;

/** Vertical clearance (px) a glissando line keeps from its notes' other ink. = 0.1 × STAFF_LINE_SPACING */
export const GLISSANDO_INK_CLEARANCE_PX = STAFF_LINE_SPACING * 0.1;

/** How far (px) a free straight bend moves, up to 5 spaces long. = 0.7 × STAFF_LINE_SPACING */
export const BEND_FREE_TRAVEL_PX = STAFF_LINE_SPACING * 0.7;

/** The slope a longer one keeps, and the most (px) it moves. = 0.7 / 5 and 2 × STAFF_LINE_SPACING */
export const BEND_FREE_SLOPE = 0.14;
export const BEND_FREE_MAX_TRAVEL_PX = STAFF_LINE_SPACING * 2;

/** Tilt (px) of a bend toward a pitch on its own staff position. = 0.25 × STAFF_LINE_SPACING */
export const BEND_SAME_POSITION_TILT_PX = STAFF_LINE_SPACING * 0.25;

/** Room (px) a bend leaves before a barline when it can. = 1.5 × STAFF_LINE_SPACING */
export const BEND_BARLINE_GAP_PX = STAFF_LINE_SPACING * 1.5;

/** Length (px) of a standalone note's bend. = 5 × STAFF_LINE_SPACING */
export const BEND_STANDALONE_LENGTH_PX = STAFF_LINE_SPACING * 5;

/**
 * Length (px) a `bend-contour` reserves per pitch, beyond the shortest bend.
 * = 1.2 × STAFF_LINE_SPACING
 */
export const BEND_CONTOUR_POINT_PX = STAFF_LINE_SPACING * 1.2;

/**
 * Stroke width (px) of a `bend-contour`: a stave line's weight.
 * = STAFF_LINE_THICKNESS_PX
 */
export const BEND_CONTOUR_THICKNESS_PX = STAFF_LINE_THICKNESS_PX;

/** Size of a bend's target notehead and its accidental, against full-size ones. */
export const BEND_TARGET_SCALE = 0.75;

/** Width (px) of each parenthesis around a bend's target. = 0.6 × STAFF_LINE_SPACING */
export const BEND_TARGET_PARENTHESIS_WIDTH_PX = STAFF_LINE_SPACING * 0.6;

/** Half-height (px) of those parentheses. = 1 × STAFF_LINE_SPACING */
export const BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX = STAFF_LINE_SPACING;

/** Gap (px) between the parentheses, the accidental and the head they enclose. = 0.15 × STAFF_LINE_SPACING */
export const BEND_TARGET_GAP_PX = STAFF_LINE_SPACING * 0.15;

/** How far (px) a bend target's ledger lines reach past its head. = 0.3 × STAFF_LINE_SPACING */
export const BEND_TARGET_LEDGER_OVERHANG_PX = STAFF_LINE_SPACING * 0.3;
