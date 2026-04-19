# Ties, Slurs & Tab Connectors for Music Notation Web Components

## Context

The `@one-step-at-a-time/web-components` library renders music notation via custom HTML elements. It currently supports notes, chords, beams, key signatures, and time signatures across treble/bass/vocal staves (guitar-tab is stubbed). It does **not** support the curved-line connectors that engravers use to tie, slur, or articulate notes.

The user wants to add support for:

- **Ties** — curved line between two notes of the **same pitch**; extends duration, not re-articulated.
- **Slurs** — curved line spanning notes of **different pitches**; indicates legato phrasing.
- **Guitar-tab connectors** — hammer-on, pull-off, slide, bend (same curve family, different semantics and labels).

"Sustain" is **not** the right umbrella term — in music, "sustain" refers to the piano pedal (tracked separately under TODO §12, "Pedal Markings"). The correct industry terms are tie and slur. Your TODO.md at [packages/web-components/TODO.md:183,196-197](packages/web-components/TODO.md#L183) already lists them as distinct items.

The hard constraint is **layout**: the composition uses flexbox wrap (`max-width: 900px`, up to ~3 measures per row). A tie/slur whose start and end fall on different rows must break at the row boundary and resume on the next row — standard engraving practice (visible in the user's first uploaded image).

## Decisions (confirmed with user)

1. **Authoring**: attributes on `<music-note>`, not wrapper elements. Required because HTML nesting can't span `<music-measure>` boundaries, and ties routinely cross them.
2. **Pairing**: implicit next-match using a **LIFO stack** (one stack per connector kind). On `start`, push the note onto that kind's stack; on `end`, pop the top and pair them. This gives proper nesting: `start start end end` → inner pair closes first, outer pair wraps it (phrase-slur over shorter slurs). `start end start end` is unambiguous and produces two non-overlapping pairs. True non-nested overlap (A-start, B-start, A-end, B-end) is extremely rare in engraving; when it's needed, see the ID escape hatch below. Ties never physically overlap at the same pitch, so the rule is academic for them — applied uniformly for code simplicity.
3. **Attribute shape**: `tie` and `slur` stay separate (same curve SVG, different semantics — enables validation, future MIDI, accessibility). An ID escape hatch (`id="X"` on the start note, `for="X"` on the end note — mirroring HTML `<label for="…">`) wins over the implicit stack when present — covers rare non-nested overlap.
4. **Tab**: new `<music-guitar-note>` element (distinct from `<music-note>`) carrying `fret`, `string`, `duration`, plus dedicated attributes per technique — `hammer-on`, `pull-off`, `slide`, `bend` — each renders curve + standard letter label. `<music-guitar-note>` also supports `tie` and `slur` (let-ring and tab phrasing).

## API Shape

```html
<!-- Tie (same pitch) -->
<music-note value="C4" duration="quarter" tie="start"></music-note>
<music-note value="C4" duration="half" tie="end"></music-note>

<!-- Slur (any pitches) -->
<music-note value="C4" duration="eighth" slur="start"></music-note>
<music-note value="E4" duration="eighth"></music-note>
<music-note value="G4" duration="eighth" slur="end"></music-note>

<!-- Tie across measure/row boundary — no special syntax -->
<music-measure>
  <music-staff-treble>
    <music-note value="C4" tie="start"></music-note>
  </music-staff-treble>
</music-measure>
<music-measure>
  <music-staff-treble>
    <music-note value="C4" tie="end"></music-note>
  </music-staff-treble>
</music-measure>

<!-- Chord-to-chord tie: mark individual inner notes -->
<music-chord duration="quarter">
  <music-note value="C4" tie="start"></music-note>
  <music-note value="E4" tie="start"></music-note>
</music-chord>
<music-chord duration="half">
  <music-note value="C4" tie="end"></music-note>
  <music-note value="E4" tie="end"></music-note>
</music-chord>

<!-- Guitar tab (once tab note rendering lands) -->
<!-- Dedicated element: <music-guitar-note> with fret/string, not pitch/octave -->
<music-guitar-note fret="5" string="3" hammer-on="start"></music-guitar-note>
<music-guitar-note fret="7" string="3" hammer-on="end"></music-guitar-note>

<!-- Tie / slur attributes also live on <music-guitar-note> -->
<music-guitar-note fret="7" string="2" tie="start"></music-guitar-note>
<music-guitar-note fret="7" string="2" tie="end"></music-guitar-note>
```

### Pairing semantics (worked examples)

**Nested (default LIFO)**

```
<music-note slur="start">  (A)
  <music-note slur="start">  (B)
    <music-note>
  <music-note slur="end">   → pairs with B (inner)
<music-note slur="end">     → pairs with A (outer)
```

**Consecutive, non-overlapping**

```
<music-note slur="start">  (A)
<music-note slur="end">    → pairs with A
<music-note slur="start">  (B)
<music-note slur="end">    → pairs with B
```

**Overlap (rare) — use explicit IDs**

```
<music-note id="phrase" slur="start">  (A)
<music-note slur="start">              (B)
<music-note for="phrase" slur="end">   → explicit for → pairs with A
<music-note slur="end">                → stack has B left → pairs with B
```

### Semantic validation (console warnings, non-blocking)

- `tie`: start and end notes must share pitch (letter + octave). Log warning if mismatched; still render curve.
- `tie`/`slur`/tab-connectors: unbalanced start (stack not empty at end of composition) or orphan end (pop from empty stack) → log warning, ignore orphan.
- `for` points to a missing / non-start `id` → log warning and fall back to the implicit stack (pop top) so the note is still paired if possible.
- Each attribute kind has its own independent stack — a note can carry both `tie="end"` and `slur="start"` without interference.

## Architecture

The core challenge is that curves often span measures, staves, and rows — no single staff element sees both endpoints. Resolution: **composition-level overlay** that draws all connectors in a single absolutely-positioned SVG layer above the grid.

### 1. Curve SVG primitive — new file [packages/web-components/src/utils/svgCreator/curve.ts](packages/web-components/src/utils/svgCreator/curve.ts)

`createCurveSvg({ from, to, bulge, label?, style?, split? }) → SVGPathElement`

- Quadratic Bézier `<path d="M x1 y1 Q cx cy x2 y2">`, `fill="none"`, `stroke="currentColor"`.
- `bulge: 'above' | 'below'` — control-point offset perpendicular to the chord midpoint; direction is "away from the stem" (stems up → bulge above; stems down → bulge below; notes without stems → above by default).
- `label?: string` — optional `<text>` centered on the curve midpoint, for tab techniques ("H", "P", "S").
- `style?: 'smooth' | 'straight'` — smooth (bezier) for tie/slur/hammer-on/pull-off; straight for slide.
- `split?: 'open-right' | 'open-left'` — for cross-row halves: draw a half-curve that tapers off at the row edge.

Export from [packages/web-components/src/utils/svgCreator/index.ts](packages/web-components/src/utils/svgCreator/index.ts).

### 2. Note element changes — [packages/web-components/src/note/note.ts](packages/web-components/src/note/note.ts)

- Extend `observedAttributes` with `tie` and `slur` only (classical connectors). Tab-specific techniques live on `<music-guitar-note>`, see §2b.
- Add getters/setters mirroring `duration`/`value` pattern at [packages/web-components/src/note/note.ts:23-38](packages/web-components/src/note/note.ts#L23-L38).
- **Do not draw the curve inside the note**. The note only advertises intent via attributes; drawing is a composition-level concern. This keeps the note's bounding box unchanged (critical — curves overflow notehead bounds).
- Update `INoteElement` in [packages/web-components/src/types/elements.ts](packages/web-components/src/types/elements.ts) to surface these as typed getters.

### 2b. New `<music-guitar-note>` element — new file [packages/web-components/src/guitarNote/guitarNote.ts](packages/web-components/src/guitarNote/guitarNote.ts)

- New custom element, registered under tag `music-guitar-note`, mirroring the folder/story/test layout used by `note/`.
- `observedAttributes`: `fret`, `string`, `duration`, `tie`, `slur`, `hammer-on`, `pull-off`, `slide`, `bend`.
- Typed getters/setters for each; `fret` accepts `number | 'x'` (muted), `string` is the string index (1–6 by standard tab convention), `duration` reuses the existing `DurationType`.
- Self-renders a simple SVG containing the fret number as text centered on the correct string line. Coordinates come from the parent `<music-staff-guitar-tab>` via an inherited API (mirrors how `<music-note>` gets its Y from the classical staff). Staff-side wiring is out of scope for this milestone — only the element, attributes, and event surface ship now. Coordinator picks up connectors as soon as the tab staff renders positions.
- New `IGuitarNoteElement` interface in [packages/web-components/src/types/elements.ts](packages/web-components/src/types/elements.ts) with a `GuitarNoteElementType` alias; include it in a new `NoteLikeElementType = NoteElementType | GuitarNoteElementType` union for the coordinator's traversal.
- Register guard and `customElements.define('music-guitar-note', …)` identical to the [note.ts:5,166-168](packages/web-components/src/note/note.ts#L5) pattern.
- Import in [packages/web-components/src/index.ts](packages/web-components/src/index.ts) (import-order-matters).

### 3. Connector coordinator — new file [packages/web-components/src/utils/connectorsBuilder.ts](packages/web-components/src/utils/connectorsBuilder.ts)

Pure, stateless builder invoked by the composition after layout settles. Responsibilities:

1. **Walk** all `<music-note>` and `<music-guitar-note>` descendants of the composition in document order (flatten across measures/staves/chords). Treat them polymorphically via `NoteLikeElementType`.
2. **Pair** notes per connector kind (`tie`, `slur`, `hammer-on`, `pull-off`, `slide`) using one LIFO stack per kind. On `start`, push the note onto that kind's stack (record its `id` if present). On `end`: if the note has `for="X"`, find and remove the matching `id="X"` entry anywhere in the stack (explicit link wins); otherwise pop the top. Emit a `ConnectorPair { kind, startNote, endNote, warnings }`. Leftover stack entries at walk-end → "unbalanced start" warning. Empty-stack pop → "orphan end" warning.
3. **Validate** ties (same pitch) — attach warning messages, do not throw.
4. **Resolve anchor points** per pair. For each endpoint note:
   - Determine stem direction (read from the note's already-rendered SVG or from the staff's stem-direction pass).
   - Compute anchor `{x, y}` in composition-overlay coordinates using `getBoundingClientRect()` relative to the composition's bounding rect.
   - Anchor is the notehead edge opposite the stem.
5. **Split across rows** when `startNote.top !== endNote.top` (tolerance 5px, matching the existing row detection at [packages/web-components/src/measure/measure.ts:171-172](packages/web-components/src/measure/measure.ts#L171-L172)):
   - Partial A: from `startNote` anchor to the right edge of the composition on the start row (`split: 'open-right'`).
   - Partial B: from the left edge of the composition on the end row to `endNote` anchor (`split: 'open-left'`).
   - Also handle stacks of more than two rows (rare; still splits per row).
6. **Emit** SVG path elements ready for insertion.

### 4. Composition overlay — [packages/web-components/src/composition/composition.ts](packages/web-components/src/composition/composition.ts)

Add a full-size absolutely-positioned `<svg class="connectors-overlay">` sibling to `.composition-grid` inside the shadow DOM (pointer-events: none, overflow: visible, currentColor stroke). Modify `render()` at [packages/web-components/src/composition/composition.ts:65-88](packages/web-components/src/composition/composition.ts#L65-L88).

Wire three triggers that call `#redrawConnectors()`:

- **slotchange** on the composition's slot (notes added/removed).
- **ResizeObserver** on the composition host (row-wrap changes).
- Custom event **`staff-notes-positioned`** dispatched by each staff after its `#renderNotes` completes at [packages/web-components/src/staffClassicalBase.ts:611-617](packages/web-components/src/staffClassicalBase.ts#L611-L617). Allows the overlay to redraw when notes reflow inside a staff without a resize event.

`#redrawConnectors()` flow:

1. Instantiate `ConnectorsBuilder` with `this` as the root.
2. Call `builder.build()` → array of path elements.
3. Clear and repopulate `.connectors-overlay`.

### 5. Staff hook — [packages/web-components/src/staffClassicalBase.ts](packages/web-components/src/staffClassicalBase.ts)

One additive change: at the tail of `#renderNotes` ([packages/web-components/src/staffClassicalBase.ts:611-617](packages/web-components/src/staffClassicalBase.ts#L611-L617)) and `#spaceElements`, dispatch a `staff-notes-positioned` CustomEvent (bubbles, composed). No other staff logic changes — the staff neither knows nor cares about connectors.

### 6. Tab connectors — [packages/web-components/src/staffGuitarTab/staffGuitarTab.ts](packages/web-components/src/staffGuitarTab/staffGuitarTab.ts)

Tab uses the new `<music-guitar-note>` element (§2b) rather than `<music-note>`. The coordinator's anchor-point logic is position-based (via `getBoundingClientRect`), so it works identically for guitar notes once the tab staff renders them into position. **No staff-side tab rendering work in this milestone** — it's tracked separately. Once tab note positioning lands, `tie` / `slur` / `hammer-on` / `pull-off` / `slide` / `bend` on `<music-guitar-note>` activate automatically through the same composition overlay.

## Files to Create / Modify

**New**

- [packages/web-components/src/utils/svgCreator/curve.ts](packages/web-components/src/utils/svgCreator/curve.ts) — curve SVG builder
- [packages/web-components/src/utils/connectorsBuilder.ts](packages/web-components/src/utils/connectorsBuilder.ts) — pairing + anchor resolution
- [packages/web-components/src/guitarNote/guitarNote.ts](packages/web-components/src/guitarNote/guitarNote.ts) — new `<music-guitar-note>` element
- [packages/web-components/src/guitarNote/index.ts](packages/web-components/src/guitarNote/index.ts) — barrel
- [packages/web-components/src/guitarNote/guitarNote.stories.ts](packages/web-components/src/guitarNote/guitarNote.stories.ts)
- [packages/web-components/src/guitarNote/guitarNote.test.ts](packages/web-components/src/guitarNote/guitarNote.test.ts)
- [packages/web-components/src/utils/svgCreator/curve.test.ts](packages/web-components/src/utils/svgCreator/curve.test.ts)
- [packages/web-components/src/utils/connectorsBuilder.test.ts](packages/web-components/src/utils/connectorsBuilder.test.ts)
- Storybook stories: tie, slur, chord-ties, cross-measure tie, cross-row tie, `<music-guitar-note>` with hammer-on (placeholder until tab staff renders)

**Modify**

- [packages/web-components/src/note/note.ts](packages/web-components/src/note/note.ts) — new observed attributes (`tie`, `slur`) + getters/setters
- [packages/web-components/src/types/elements.ts](packages/web-components/src/types/elements.ts) — extend `INoteElement`; add `IGuitarNoteElement`, `GuitarNoteElementType`, `NoteLikeElementType`
- [packages/web-components/src/index.ts](packages/web-components/src/index.ts) — import `<music-guitar-note>` registration (import order matters)
- [packages/web-components/src/types.d.ts](packages/web-components/src/types.d.ts) — React JSX declaration for `music-guitar-note`
- [packages/web-components/src/composition/composition.ts](packages/web-components/src/composition/composition.ts) — overlay SVG, observers, `#redrawConnectors`
- [packages/web-components/src/staffClassicalBase.ts](packages/web-components/src/staffClassicalBase.ts) — dispatch `staff-notes-positioned`
- [packages/web-components/src/utils/svgCreator/index.ts](packages/web-components/src/utils/svgCreator/index.ts) — re-export `createCurveSvg`
- [packages/web-components/TODO.md](packages/web-components/TODO.md) — check off tie + slur rows (§9, §10)

## Reused Existing Pieces

- `SVG_NS` constant and `createElementNS` pattern (project convention).
- `getBoundingClientRect()` comparison for row detection — pattern already used in [packages/web-components/src/measure/measure.ts:167-173](packages/web-components/src/measure/measure.ts#L167-L173) for the staff connector.
- `ResizeObserver` lifecycle pattern — mirror [packages/web-components/src/measure/measure.ts:20-22,70-72](packages/web-components/src/measure/measure.ts#L20-L22) (construct, disconnect on `disconnectedCallback`).
- `batchUpdate` pattern on notes for attribute changes without render thrash.
- `.composition-grid` already uses `position: relative`, so the overlay can be absolutely positioned to cover it.

## Why This Design

- **Attributes on notes** keeps data colocated with the note and composes naturally with chords (per-inner-note ties), unlike a wrapper element that can't cross measures.
- **Composition-level overlay** is the only place that sees all positions across measures/staves/rows. It leverages `getBoundingClientRect()` — reliable because it reflects real post-wrap geometry without re-implementing flex layout math.
- **Implicit next-match** matches how engravers write and how MusicXML's unmatched tie elements work in practice.
- **Shared curve primitive** means tab connectors come almost for free once the tab staff renders notes.

## Verification

Run `npx nx test web-components` after each change set. Specific checks:

1. **Unit: curve SVG** — `curve.test.ts` asserts path `d` attribute shape, control-point bulge direction, label rendering for tab, split variants.
2. **Unit: coordinator** — `connectorsBuilder.test.ts` covers: within-measure pairing, cross-measure pairing, chord→chord per-note pairing, pitch-mismatch warning for ties, unbalanced-start warning, orphan-end warning, **nested LIFO pairing** (`start start end end` → inner+outer), **consecutive non-overlapping** (`start end start end` → A,B), **explicit `for` overrides stack** (overlap case), invalid `for` warning, row-split detection against mocked bounding rects.
3. **Integration**: extend [packages/web-components/src/composition/composition.test.ts](packages/web-components/src/composition/composition.test.ts) to assert overlay SVG contains expected number of `<path>` elements for a multi-measure composition with ties.
4. **Visual (Storybook)**:
   - Start `npx nx storybook web-components`.
   - New stories in `composition.stories.ts`: `WithTies`, `WithSlurs`, `WithChordTies`, `WithCrossMeasureTie`, `WithCrossRowTie` (force narrow container to trigger wrap).
   - Confirm each renders visually matching the reference images (clean curve, correct side, clean row-split).
5. **Resize test**: in Storybook, drag the container width across the wrap threshold — curves should re-flow live (ResizeObserver → `#redrawConnectors`).
6. **Console**: no warnings for valid usage; one warning each for (a) mismatched-pitch tie, (b) unbalanced start/end.
7. **Format**: `npx nx format:write` after the edit batch (project convention).
