# Music Notation — Project Context

## Overview

`@one-step-at-a-time/web-components` is a Web Components library for rendering music notation in the browser. All musical elements are custom HTML elements built with TypeScript and SVG. There are no framework dependencies — it runs natively in any browser or framework (React types are declared for JSX compatibility).

## Composable and Standalone Elements

Elements are designed to be used **in isolation or composed together**. You do not need the full hierarchy to use any given element. **"Standalone" means an element is used without its usual parent element** — e.g. a staff without a `<music-composition>`, or a note without a staff:

- `<music-note>` and `<music-chord>` can be used standalone, outside any staff, measure, or composition
- `<music-staff>`, `<music-staff-guitar-tab>`, and `<music-staff-vocal>` can be used without a `<music-measure>` or `<music-composition>`
- `<music-clef>` can be used standalone (renders just its glyph) or inside a `<music-staff>`'s note stream to mark a mid-piece clef change
- `<music-measure>` can be used without a `<music-composition>`

Some features may be unavailable or degraded when elements are used outside their normal parent context (for example, attribute inheritance from parent elements won't apply, and layout-driven sizing from minimum-width events requires a `<music-measure>` parent). The goal is to keep that list of exceptions small.

## Custom Element Hierarchy

```
<music-composition>          — composition.ts
  └─ <music-measure>         — measure/measure.ts
      ├─ <music-staff clef="treble"|"bass">   — staff/staff.ts
      │   ├─ <music-voice>        — voice/voice.ts (optional: one contrapuntal voice's own note/chord/rest/tuplet/arpeggio/clef subtree; a staff with only one voice omits it — see Voices below)
      │   ├─ <music-note>        — note/note.ts
      │   ├─ <music-chord>       — chord/chord.ts
      │   │   └─ <music-note>    (children)
      │   ├─ <music-tuplet>      — tuplet/tuplet.ts (wraps notes/chords/rests as a tuplet)
      │   ├─ <music-arpeggio>    — arpeggio/arpeggio.ts (written-out arpeggio: a run of notes tied into a final chord; run consumes no beat time. NOT the `arpeggio` wavy-line attribute)
      │   └─ <music-clef>        — clef/clef.ts (mid-stream clef change; zero beat-duration)
      ├─ <music-staff-guitar-tab>  — staffGuitarTab/staffGuitarTab.ts
      └─ <music-staff-vocal>  — staffVocal/staffVocal.ts
          └─ <music-lyrics>    — staffVocal/lyrics.ts
```

Attributes flow **down**: Composition → Measure → Staff → Note. Each level can override parent settings.

## Folder Structure

```
one-step-at-a-time/
├── packages/
│   └── web-components/
│       └── src/               # All source code
│           ├── index.ts       # Entry point (import order matters)
│           ├── react.d.ts     # React JSX declarations — published as the `/react` subpath
│           ├── staffBase.ts          # Minimal abstract base (shadow DOM + lifecycle)
│           ├── staffClassicalBase.ts # Thin orchestrator — wires rules + SVG + spacing
│           ├── composition/
│           ├── measure/
│           ├── note/
│           ├── chord/
│           ├── guitarNote/
│           ├── staff/            # Clef-driven staff (`clef` attribute: treble/bass) — merged former staffTreble/staffBass
│           ├── clef/             # <music-clef> — mid-stream clef change marker (standalone or in a staff)
│           ├── staffGuitarTab/   # Incomplete — Y-coords not yet mapped
│           ├── staffVocal/
│           ├── rules/            # Music theory / domain computation (pure functions)
│           │   ├── accidentalRules.ts
│           │   ├── beamRules.ts
│           │   ├── clefRules.ts           # Per-clef Y-coord/octave/key-sig data + SVG glyph (CLEF_DEFINITIONS, getClefRenderData)
│           │   ├── staffGroupRules.ts     # Brace/bracket pairing + validation (resolveStaffGroupPairs) — pure, unit-testable
│           │   ├── spacingRules.ts        # Horizontal entry spacing — fixed beat-proportional advance per entry
│           │   ├── staffWidth.ts          # Measure strut-min + duration-weighted natural width; flex value
│           │   ├── theoryConsts.ts        # Duration/semitone lookup maps
│           │   ├── theoryHelpers.ts       # Chord/note computation
│           │   └── …                      # also beatRules, chordRules, restRules, staffHeightRules, staffNoteRules, tupletRules, dynamicsRules
│           ├── types/
│           │   ├── theory.ts  # Core music theory types
│           │   └── elements.ts
│           └── utils/
│               ├── consts.ts             # Custom element tag/event name constants
│               ├── notationDimensions.ts # Pixel sizing and spacing constants
│               ├── parsers.ts            # Set-backed attribute value validators, parseX → value | null
│               ├── connectorsBuilder.ts  # Bar-line connector SVG
│               ├── index.ts
│               └── svgCreator/           # One file per rendered symbol/feature
│                   ├── index.ts
│                   ├── note.ts
│                   ├── chord.ts
│                   ├── beams.ts
│                   ├── clefs.ts
│                   ├── timeSignature.ts
│                   ├── sharp.ts
│                   ├── flat.ts
│                   ├── natural.ts
│                   ├── doubleSharp.ts
│                   ├── doubleFlat.ts
│                   ├── curve.ts
│                   ├── trill.ts             # sign, wavy extension line, end-notch
│                   └── arpeggio.ts          # …also articulations, dynamics, graceNotes, ledgerLines, rest, staffGroup, tuplet
├── scripts/
│   └── extract-glyphs.mjs   # author-time-only: extract engraved glyph outlines → paste PATH_D consts into svgCreator/*
├── jest.config.js   # Nx-based Jest config
└── tsconfig.base.json
```

## Code Organization Pattern

Each notation feature follows a three-layer pattern. `staffClassicalBase.ts` is a thin orchestrator — it wires these layers together but contains no domain logic itself.

| Layer         | Location                            | Purpose                                                   |
| ------------- | ----------------------------------- | --------------------------------------------------------- |
| Domain rules  | `src/rules/<feature>Rules.ts`       | Pure functions — music theory computation, no DOM/SVG     |
| SVG rendering | `src/utils/svgCreator/<feature>.ts` | Builds SVG elements from computed data                    |
| Orchestration | `staffClassicalBase.ts`             | Calls rules + SVG, sets element properties, positions DOM |

**Existing examples:**

- Accidentals: rules in `rules/accidentalRules.ts` (key sig lookup, per-note resolution, per-measure orchestration), SVG in `svgCreator/sharp.ts`, `flat.ts`, `natural.ts`, `doubleSharp.ts`, `doubleFlat.ts`
- Beams: rules in `rules/beamRules.ts` (stem directions, beam Y positions), SVG in `svgCreator/beams.ts`

**When adding a new feature** (e.g. ledger lines, ornaments, dynamics):

1. Low-level music theory logic → `src/rules/<feature>Rules.ts`
2. SVG drawing → `src/utils/svgCreator/<feature>.ts`
3. Wire-up only in `staffClassicalBase.ts` — call the rule functions and pass results to SVG creators

Rule functions take explicit parameters (keySig, timeSig, a `noteToYCoordinate` callback, etc.) instead of `this`, making them independently testable.

## Adding a Feature

Use this as a **menu, not a mandatory sequence** — most features skip several steps. A typical
Type A feature touches ~8 of these; a boolean or type-reusing attribute far fewer. Each step
below leads with its **when-trigger**; the ones marked **(near-universal)** apply to virtually
every note/chord attribute, everything else fires only on its trigger. The goal is to add the
feature _and leave the surrounding code at least as clean_ — so watch for refactor
opportunities as you go (step 17).

Features land in one of two shapes; steps are tagged accordingly:

- **`[A]` note/chord attribute** (e.g. articulations, accent, fermata): element-local, drawn
  inside the note/chord SVG. Does **not** touch `src/rules/`, the staff base classes,
  `notationDimensions.ts`, or `src/index.ts`.
- **`[B]` staff-orchestrated span** (e.g. dynamics, hairpins): needs cross-note layout, so it
  adds a rules file, a `notationDimensions.ts` block, an event constant, and wiring in
  `staffClassicalBase.ts`; the element dispatches an event instead of only re-rendering.

1. `[A][B]` **Standalone vs in-parent support** — _when: always; decide before writing code._
   Decide whether the feature should work when the element is used **standalone** (without its
   usual parent — see "Composable and Standalone Elements" above) as well as inside the full
   hierarchy. Supporting both is the ideal, but it doesn't always make sense — some features
   inherently depend on a parent (attribute inheritance, measure-driven min-width layout). At
   minimum _consider_ it: if the feature degrades or is absent standalone, make that a
   deliberate choice and add it to the "Standalone degraded features" bullet in Known
   Incomplete Areas.
2. `[A][B]` **Domain type** — _when: the feature adds a new enumerated value set; skip for a
   boolean attribute or one that reuses an existing type._ Add the value union to
   `src/types/theory.ts`. Ref: `DynamicMarking`, `ArticulationType`, `StressType`.
3. `[A][B]` **Runtime options / event const** — _when: value is enumerated → options array;
   Type B or cross-element notify → event key._ Add the options array to `src/utils/consts.ts`
   (`DYNAMICS`, `ARTICULATIONS`, `STRESSES`). Type B only: add a key to `NOTE_EVENTS` (e.g.
   `DYNAMIC_ATTRIBUTE_CHANGE`).
4. `[A][B]` **Getter validation** — _parser optional; a judgment call._ Three styles coexist,
   in increasing weight: plain cast with a default (`get duration`), inline validation
   (`get octave` checks `OCTAVES.includes`), or a shared `parseX` helper in
   `src/utils/parsers.ts` (`get articulation`). **Add a `parseX` function only when you both
   want to reject invalid values _and_ the same check is used in ≥2 places (note + chord).**
   For a simple cast-with-default used in one spot, inline it — a parser file is overkill.
5. `[A][B]` **Element interface** — _when: it's a consumer-facing note/chord property; skip for
   staff-only or purely-internal features._ Add the `| null` field to `INoteElement` /
   `IChordElement` in `src/types/elements.ts` (enforced via `implements`).
6. `[A][B]` **Element wiring (near-universal for note/chord attrs)** — in `src/note/note.ts`
   and `src/chord/chord.ts`: add to `observedAttributes` (lowercase), add getter/setter
   (attribute-backed via `parseX`, or `#field`-backed), handle in `attributeChangedCallback`.
   Type A: pass into the svgCreator call. Type B: dispatch the event from
   `attributeChangedCallback`. Note which elements apply — some features are note-only or
   chord-only. Ref: the `tie` / `dynamic` / `articulation` get/set blocks in `note.ts`.
7. `[A][B]` **Check React JSX decls + element JSDoc** — check whether `src/react.d.ts` needs
   updating; if the feature adds a consumer-facing prop, add the optional prop to the
   `'music-note'` and `'music-chord'` declarations (+ import the type). This file is _not_
   enforced by `implements`, so it silently drifts — check it explicitly. In the same pass,
   update the element class's `@attr` JSDoc line (the `@customElement` block above the class
   in `note.ts` / `chord.ts` / etc.) — kept in sync with `react.d.ts` and the source of the
   generated `custom-elements.json`. For a new consumer-facing **event**, add a row to the
   events table in `src/guides/FrameworkIntegration.mdx`.
8. `[A]` **SVG (note-local)** — new `src/utils/svgCreator/<feature>.ts`, re-export from
   `svgCreator/index.ts`, and accept the prop in `svgCreator/note.ts` + `svgCreator/chord.ts`.
   Ref: `svgCreator/articulations.ts`.
9. `[B]` **Rules** — _when: there's real cross-note theory/layout computation; a trivial span
   may skip this._ New `src/rules/<feature>Rules.ts` with pure functions (explicit params, no
   `this`). Ref: `rules/dynamicsRules.ts`.
10. `[B]` **SVG (staff-drawn)** — new `svgCreator/<feature>.ts` + re-export. Ref:
    `svgCreator/dynamics.ts`.
11. `[A][B]` **Pixel constants** — _when: new rendering needs new sizing/offsets; skip if it
    reuses existing dimensions._ Add a section to `src/utils/notationDimensions.ts`. Ref: the
    "Dynamics" block.
12. `[B]` **Orchestration** — in `src/staffClassicalBase.ts`: add a container, register the
    event listener in `connectedCallback` / remove in `disconnectedCallback`, add `#renderX()`
    and wire it into the render pass. Ref: `#renderDynamics`.
13. **Inherited-attr variant** — if the feature is instead an _inherited staff attribute_, the
    wiring differs: add to `COMMON_ATTRIBUTES`, to `observedAttributes` (a static, per-concrete-class
    member — there's no shared list), add an `#effectiveX` field + `resolveInheritedValue()` calls
    (see Staff Class Hierarchy below), and the descendant push loop in `composition.ts`. Two
    variants: `key-sig`/`mode` are **classical-only** inherited attrs, still wired on
    `StaffClassicalElementBase` exactly as before. `time` is different — it's inherited by
    **every** staff type via `StaffElementBase` (see below), so a new attribute that should apply
    universally (not just to classical staves) belongs there instead, following `time`'s pattern:
    `StaffGuitarTabElement` adds its own `observedAttributes`/`attributeChangedCallback` override
    that re-resolves the inherited base field, since each concrete class declares its own
    `observedAttributes`.
14. `[A][B]` **Stories (near-universal)** — one `.stories.ts` = one sidebar leaf (see Storybook
    Stories below). A note/chord attribute that renders standalone extends `note.stories.ts` /
    `chord.stories.ts`; a staff/composition-rendered feature gets its own
    `Universal Notations/<Feature>` file (colocated with its `rules`/`svgCreator` code), added
    to the `storySort` order in `.storybook/preview.ts` — **not** appended to `staff` /
    `composition`. Use option arrays from `../utils` and strong types from `../types/theory`.
    Prefer extending an existing story in the right leaf over adding a new one.
15. `[A][B]` **Tests (near-universal; tiers are conditional)** — Type A: `note.test.ts` +
    `chord.test.ts`. Type B: new `rules/<feature>Rules.test.ts` + `staffClassicalBase.test.ts`.
    Add a `*.browser-test.ts` **only when** layout/geometry/resize is involved.
16. `[A][B]` **Tick TODO.md (near-universal)** — check whether the feature completes any row(s)
    in `TODO.md` (the master notation-features tracker) and flip that row's checkbox from
    `&#x2610;` to `&#x2611;`. A feature often satisfies several rows across sections (e.g. an
    articulation ticks a base row _and_ its combination forms).
17. `[A][B]` **Refactor pass (do this, don't skip)** — look for consolidation the feature
    exposed: near-duplicate get/set blocks across `note.ts`/`chord.ts` that could share a
    helper; a `parseX` duplicating an existing parser shape; an svgCreator glyph overlapping an
    existing one (new articulation glyphs belong in the existing `svgCreator/articulations.ts`,
    not a new file — as `accent`/`fermata` did); repeated pixel math that should be a named
    constant in `notationDimensions.ts`; and any place the new code copies a rule instead of
    calling the existing pure function in `src/rules/`. Prefer extending an existing file over
    adding a parallel one.
18. `[A][B]` **Regenerate the manifest** — run `npx nx run web-components:analyze` and commit
    the updated `custom-elements.json` (CI fails if it is stale). This is what feeds the
    Storybook attribute tables and editor autocomplete.
19. `[A][B]` **Format & test** — run `npx nx format:write`, then `npx nx test web-components`.

**Common trap:** a plain new note/chord attribute does **not** touch `src/index.ts` or the
staff base classes (`staffBase.ts`) — don't go looking for wiring there.

## Key Architecture Concepts

### Shadow DOM

All components use shadow DOM (`attachShadow({ mode: 'open' })`). Style encapsulation is intentional. Slots connect light DOM notes/chords to shadow DOM staff renderers.

### SVG Coordinate System

- Y-coordinates are looked up from static maps keyed by note name + octave (e.g., `'C4'`, `'G5'`)
- Each staff subclass defines its own `noteYCoordinateMap` for its clef range
- X-spacing: an entry's x is its cumulative beat-offset (tuplet-ratio-scaled,
  arpeggio-run-note zeroed — `durationContribution` in `rules/beatRules.ts`,
  shared with bar-fit and beam-grouping) as a **fraction of the measure's
  fixed beat capacity** (`beatsInMeasure / beatType` from the staff's
  effective time signature — a constant, independent of how many entries
  currently exist), scaled by the staff's real available width
  (`rules/spacingRules.ts`'s `computeMeasureProportionalOffsets`). This is
  what makes a full measure fill the staff at any width, what makes resizing
  reflow every entry together (like conventional notation software), and
  what keeps appending an entry from ever moving an already-placed one:
  neither the capacity nor the available width it's scaled against depends
  on entry count. A `MIN_NOTE_WIDTH` floor is layered on top against only the
  _previous_ entry (never looking ahead, so append-only still holds) since
  the proportional formula has no built-in per-entry minimum. Same-beat
  entries naturally align across sibling staves with no explicit
  coordination code, since every staff runs the identical formula. A
  tupleted entry's _true_ (ratio-compressed) beat-time drives where whatever
  follows it lands; no special-casing is needed for how the tuplet's own
  notes space out _within_ that compressed span — they fall out evenly by
  the same formula. `computeSpacingWeights`/`PIXELS_PER_BEAT` (also in
  `rules/spacingRules.ts`) are a **separate** concern — they feed only the
  measure's sizing _preference_ (see Measure Width below), not entry
  position.
- SVG rendering lives entirely in `utils/svgCreator/` (a directory, not a single file)

### Semitone System

Notes are mapped to semitones 0–11 (A=0, Bb=1, B=2, C=3, …, Ab=11). Chord formulas are stored as semitone interval arrays from root (e.g., major = `[4, 7]`). This enables enharmonic equivalents and chord note computation.

### Measure Width

Each staff reports **two** widths, both computed in `rules/staffWidth.ts`:

- **strut min width** — the collision floor:
  `describeEndX + LEADING_NOTE_GAP_PX + noteCount × MIN_NOTE_WIDTH + leftward-overhangs + clefChangeWidth`
  (vocal takes `max(noteCount × MIN_NOTE_WIDTH, lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)`).
- **natural width** — the strut plus the total beat-proportional spacing
  slack the entries want beyond it (`Σ` of `computeSpacingWeights` from
  `rules/spacingRules.ts`).

`describeEndX` is the x-offset where the clef/key-signature/time-signature area ends (stored as `#describeEndX`, updated every `#spaceElements()` run).

**`leftward-overhangs`** — everything painted left of an entry's own SVG left edge
(accidental / accidental column, grace-note run, arpeggio sign, arpeggio dynamic-change
hairpin + its `-from`/`-to` letters, a cluster chord's displaced head, a cross-staff
arpeggio span's overlay-drawn wave/hairpin) — is summed in one place:
`StaffClassicalElementBase#entryLeftwardExtent(element)`. Both the strut min-width in
`#renderNotes()` and the "barline constraint" (`x ≥ describeEndX + NOTES_AREA_LEFT_MARGIN +
extent`) in `#spaceElements()` call it. **Add any new left-of-entry decoration there**, not at
the call sites.

Both are dispatched upward on one `STAFF_EVENTS.STAFF_MIN_WIDTH` event, `detail: { minWidth, naturalWidth }`. `<music-measure>` keeps the per-staff max of each and sets:

- `this.style.flex = "${maxNatural} 1 ${maxNatural}px"` — grow **and** basis equal the natural width;
- `this.style.minWidth = "${max(maxMin, MEASURE_MIN_WIDTH_PX)}px"` — the strut, floored.

Because grow == basis, the measures on a row end up distributed as `naturalWidth_i ÷ Σ naturalWidth × rowWidth` — width proportional to musical content: one measure alone fills the row, equal-content measures split it evenly, a sparse measure beside a dense one splits it proportionally. `min-width` is a real CSS property, kept apart from the basis so a crowded measure can shrink toward its strut before the row wraps.

### Responsive Layout

`<music-composition>` uses CSS flexbox with `flex-wrap: wrap`, so measures reflow into rows automatically as the container width changes. A row holds as many measures as their natural widths sum to fit under `.composition-wrapper`, then they stretch uniformly to fill it — there is no fixed measures-per-row cap. `<music-composition>` takes a `max-width` attribute (a px number or `none`, default `COMPOSITION_MAX_WIDTH_PX` = 900) that caps `.composition-wrapper`; the flex math is self-scaling, so nothing else consumes that value. All layout-sensitive rendering reacts to resizes via a `ResizeObserver` on the composition element, which schedules a redraw via `#scheduleRedraw()` (debounced to one `requestAnimationFrame`).

On each redraw cycle the following happen in order:

1. **Note x-spacing** — each staff's `StaffResizeObserver` (on the staff container element) calls `onStaffResize()`, which re-runs `#spaceElements()` and re-emits `STAFF_EVENTS.NOTES_POSITIONED`. Since spacing is proportional to the staff's real available width (see SVG Coordinate System above), a resize reflows every entry together — the same way conventional notation software fills whatever width it's given.
2. **Beams** — redrawn as part of `#renderNotes()` / `onStaffResize()` inside each staff.
3. **Connectors** — `#redrawConnectors()` in `composition.ts` redraws the vertical bar lines that group staves in a measure.
4. **Describe (clef/key/time) visibility** — `#updateDescribeVisibility()` in `composition.ts` runs in the **same `requestAnimationFrame`** as connectors, immediately after. It groups measures into visual rows (`#computeMeasureRows()`, tolerance 5 px on `getBoundingClientRect().top`, snapshotted in one pass before any DOM writes) and sets `showDescribe` (a JS property, not an HTML attribute) on each child staff — `true` for the first measure in each row, `false` otherwise. Connectors are absolutely-positioned SVG and do not affect document flow, so no layout settling is needed between the two operations. Staves default to `showDescribe = true`, so standalone staves always show the clef.
5. **Clef continuity at measure boundaries** — `#updateClefContinuity()` runs right after, reusing the same `#computeMeasureRows()` output. It compares every pair of **adjacent measures** (not just row-boundary pairs — a measure-boundary clef change is just two neighboring `<music-staff>` instances with different `clef` attributes, and can happen mid-row) via each staff's `effectiveStartClef`/`effectiveEndClef` getters (derived from `StaffClassicalElementBase`'s clef-segment machinery — the same one that resolves mid-stream `<music-clef>` markers). When a pair differs: the incoming staff's `clefChangeAtBoundary` property is set so its clef glyph still renders even though `showDescribe` is false (mirrors the existing mid-composition time-signature-change precedent); if the pair also happens to fall exactly at a row wrap, a small courtesy clef preview (scaled by `COURTESY_CLEF_SCALE`) is additionally drawn near the right edge of the outgoing staff, in a separate `.courtesy-clef-overlay` SVG.

**Why `:host { display: block; width: 100% }` on `<music-composition>` matters**: `display: block` alone is not sufficient when the element is placed inside a flex or grid container (e.g. `justify-content: center`). Without an explicit `width`, the element sizes to its max-content as a flex item. For a `flex-wrap: wrap` flex container, browsers compute max-content as the width of the widest single child — so the composition becomes only as wide as its widest measure, causing all other measures to wrap to separate rows. `width: 100%` ensures the composition fills the full parent width in all layout contexts (block, flex, grid), so the `ResizeObserver` fires reliably and measures can share rows as intended. The `.composition-wrapper` inside the shadow DOM has `margin: 0 auto` to center its content when the host is wider than the `max-width` cap (default 900px; see Responsive Layout above).

**Invariant to maintain**: any change that affects which measure is "first in a row" (resize, dynamic measure insertion/removal) must eventually trigger `#scheduleRedraw()` so `#updateDescribeVisibility()` and `#updateClefContinuity()` re-run.

#### Responsive Layout Rules

- When adding or changing this code, make sure the `*.browser-test.ts` files still pass. And add new ones when adding new logic

## Important Types (`types/theory.ts`)

```ts
type DurationType =
  | 'double-whole'
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'thirtysecond'
  | 'sixtyfourth'
  | 'hundredtwentyeighth';
type Note =
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab';
type Mode = 'major' | 'minor';
type BeatsInMeasure = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 12;
type VocalType = 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';
```

`Chord` is a discriminated union of `NormalChord` and slash chords.

## Key Utility Maps (`rules/theoryConsts.ts`)

| Map                       | Purpose                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `durationToFlagCountMap`  | Duration → flag count (eighth=1, sixteenth=2, …)                                                                                                                                               |
| `noteSemitoneMap`         | Note name → semitone (0–11)                                                                                                                                                                    |
| `semitoneNoteMap`         | Semitone → note name array (handles enharmonics)                                                                                                                                               |
| `ChordSemitoneMap`        | Chord type string → interval array                                                                                                                                                             |
| `ChordSemitoneMapAliases` | Alias normalization (`'m'` → `'min'`, `''` → `'maj'`)                                                                                                                                          |
| `durationToFactor`        | Duration → linear whole-note fraction. Shared by bar-fit (`measureRules`), beam grouping (`beams.ts`), and note spacing (`spacingRules.ts`) via `durationContribution` in `rules/beatRules.ts` |

Horizontal note **position** (`rules/spacingRules.ts`'s `computeMeasureProportionalOffsets`, fed by `computeBeatOffsets` in `rules/beatRules.ts`) is an entry's cumulative beat-offset as a fraction of the measure's fixed beat capacity (from the time signature), scaled by the staff's available width — see SVG Coordinate System above. A separate function in the same file, `computeSpacingWeights` (`durationToFactor[duration] × PIXELS_PER_BEAT`, floored at `MIN_NOTE_WIDTH`, tuplet-scaled via `computeTupletScaleByIndex`), feeds only the measure's sizing _preference_ (see Measure Width) — not position.

`utils/consts.ts` holds custom element tag name constants and event name constants (e.g., `STAFF_EVENTS`).

## Staff Class Hierarchy

```
StaffElementBase              (staffBase.ts)         — shadow DOM, staff lines, resize observer, template method lifecycle, group/groupId, time (value + inheritance)
├── StaffClassicalElementBase (staffClassicalBase.ts) — key sig, time sig glyph rendering, note Y-coords, beam/note rendering, clef-segment resolution
│   ├── StaffElement          (staff/staff.ts)              — `clef` attribute (treble/bass), data from rules/clefRules.ts
│   └── StaffVocalElement     (staffVocal/staffVocal.ts)     — vocal clef, 6 vocal types, lyrics integration
└── StaffGuitarTabElement     (staffGuitarTab/staffGuitarTab.ts) — 6-line tab staff, no music theory, but does have a real `time` (inherited via StaffElementBase; never rendered as a glyph)
```

`StaffTrebleElement`/`StaffBassElement` (formerly separate classes) were merged into `StaffElement` — treble/bass are now just two values of the `clef` attribute, both backed by `rules/clefRules.ts`'s `CLEF_DEFINITIONS`/`getClefRenderData()`. A `<music-clef>` element (`clef/clef.ts`) placed in a staff's slotted content marks a mid-stream clef change: `StaffClassicalElementBase` tracks these as `#clefMarkers` (parallel to `#tupletsByIndex`, never merged into the note/chord/rest array) and resolves the active clef per note index via `#renderDataForIndex()` / `#activeClefAt()`. The marker occupies horizontal space (`CLEF_CHANGE_RESERVED_WIDTH_PX`) but no beat duration.

`StaffElementBase` — abstract base that owns the shadow DOM, staff line construction, `staffContainer` (div), `transcribeContainer` (SVG), and `staffResizeObserver`. All three are `protected readonly` so subclasses can access them. Implements `connectedCallback` (builds staff lines, appends containers, wires `slotchange`, starts resize observer) and `disconnectedCallback`. Also implements `IStaffElementBase` (`types/elements.ts`) — `group`/`groupId` (structural, non-rendering brace/bracket-connector attributes, see Grand Staff below) and `time` (beats/measure — a real, attribute-backed, inheriting value on **every** staff type, not just classical). `time` is backed by `protected effectiveTimeSig: [BeatsInMeasure, BeatTypeInMeasure]`, `protected resolveInheritedValue(attributeName, defaultValue)` (own attribute → closest `<music-measure>` → closest `<music-composition>` → default), and `protected convertTotimeInts(time)`. These use TypeScript's `protected` keyword (no `#`) rather than `#private` specifically so subclasses can access them directly — see the `#` vs `protected` note under Conventions. Rendering a time-signature _glyph_ is still classical-only (see `StaffClassicalElementBase` below); `StaffGuitarTabElement` has the value but never draws it. Uses a template method pattern — subclasses implement:

- `get staffLineCount(): number` — number of staff lines (e.g. 5 for classical)
- `onConnectedCallback()` — called after containers are appended; add clef/key/time SVG here
- `onHandleSlotChange(event)` — called when slotted notes/chords change
- `onStaffResize()` — called when staff container width changes
- `onDisconnectedCallback()` — cleanup (e.g. disconnect mutation observers)

`StaffClassicalElementBase` — thin orchestrator on top of `StaffElementBase`. Wires together the rules layer (`rules/accidentalRules.ts`, `rules/beamRules.ts`) and the SVG layer (`utils/svgCreator/`) to produce rendered staves. Owns key signature rendering, time signature **glyph** rendering (`#appendTimeSignatureSvgIfNecessary`, `timeChangeAtBoundary` — the _value_ itself is inherited from `StaffElementBase`), note Y-coordinate lookup, and resize-aware note spacing. Abstract methods subclasses must implement:

- `get yCoordinates(): YCoordinates` — map of note+octave string to pixel Y
- `get octaves(): Octave[]` — octave search order when no octave is specified
- `getKeyYCoordinates(): { useSharps, coordinates }` — Y positions for key sig accidentals
- `get clefSvg(): string` — raw SVG string for the clef symbol

Rendering flow (classical staves):

1. `render()` (in `StaffElementBase`) sets shadow DOM HTML: wrapper div, slot, CSS
2. `connectedCallback()` (in `StaffElementBase`) builds staff lines, appends `staffContainer` and `transcribeContainer`, wires `slotchange`, starts `staffResizeObserver`
3. `onConnectedCallback()` (in `StaffClassicalElementBase`) calls `#buildDescribe()`: injects clef SVG, key signature, and time signature into `transcribeContainer`
4. `slotchange` fires → `onHandleSlotChange()` → `#renderNotes()` converts notes/chords to SVG
5. Each entry is positioned at its cumulative beat-offset as a fraction of the measure's fixed beat capacity, scaled by the staff's available width — floored at `MIN_NOTE_WIDTH` against the previous entry (`rules/spacingRules.ts`)
6. `BeamCreator` connects beamed note groups (eighths, sixteenths, etc.)
7. Staff dispatches a `STAFF_EVENTS.STAFF_MIN_WIDTH` event after each render with `detail: { minWidth, naturalWidth }` — the collision-floor width and the duration-weighted preferred width (see Measure Width above)

## Note Editing — Out of Scope

This library **renders** notation and reports interaction (`note-click`,
`note-pointerdown`/`note-pointerup`, layout events); it does **not** implement
drag-to-repitch or drag-to-reorder. A host app owns editing and drives it from
the pointer/click events plus `noteToYCoordinate(note, octave?, elementIndex?)`
(public on the staff element — clef-segment aware via `#renderDataForIndex`).
`apps/ui`'s `compositionForm/useEntryDrag.ts` + `entryDragHelpers.ts` +
`reorderHelpers.ts` are the reference implementation. (Drag was previously built
in as `editable`/`managed` staves + `pitchDragHandler.ts`/`noteTimingDragHandler.ts`
dispatching `note-pitch-change`/`note-reorder`; all removed.)

### SVG Hit Zones

Each note SVG includes a transparent `head-hit-zone` ellipse (1.5× the notehead
size) rendered behind the visible `.head` ellipse, rendered unconditionally. This
enlarged invisible target makes noteheads easier to grab; a host app tells
notehead from stem/flag/body by checking `e.composedPath()` for the `.head` /
`.head-hit-zone` classes. `svgCreator/graceNotes.ts` strips the hit zone and
renames `.head` → `.grace-head` on grace notes so they are not drag targets.

## Grand Staff / Part Connectors

A grand staff (piano/harp: two staves, one instrument) is just two `<music-staff>` siblings inside one `<music-measure>` — no dedicated wrapper component, matching this library's composable-elements philosophy. `<music-measure>` already draws a plain vertical barline (`.staff-connector`) through every staff it contains, unconditionally, regardless of instrument grouping — that part is untouched.

A brace or bracket is an **additional** decoration, drawn further left, spanning only a subset of staves:

- `StaffElementBase#group` (getter/setter, values `'grand' | 'bracket'`, backed by the `group` attribute) marks a staff as wanting a connector. `group="grand"` membership is always **implicit**: a grand staff pairs with its immediate next sibling — no shared identifier needed, and therefore always joins exactly two staves (matches the piano/harp use case it exists for). `group="bracket"` supports two ways to declare membership — see `StaffElementBase#groupId` below.
- `StaffElementBase#groupId` (getter/setter, plain string, backed by the `group-id` attribute) is an optional shared identifier for `group="bracket"` staves that lets a bracket span more than two staves (e.g. a 4-staff SATB choir): every staff carrying the same `group-id` value joins one bracket, however many that is. Staves sharing a `group-id` must be contiguous siblings. Leave `group-id` unset for a plain 2-staff bracket — it falls back to the same implicit pair-with-next-sibling behavior as `group="grand"`. Meaningless on `group="grand"` staves (ignored).
- `rules/staffGroupRules.ts`'s `resolveStaffGroups(entries: { group, groupId }[])` is the pure resolution/validation function — kept separate from `measure.ts` specifically so it's unit-testable, since jsdom's `ResizeObserver` polyfill (`jest.setup.ts`) is a no-op that never fires, meaning `measure.ts`'s actual rendering path only ever runs in real-browser `*.browser-test.ts` tests. It warns and skips (without cascading past the offending span) when: a grouped staff has no next sibling, its next sibling also declares its own `group`, a `group-id` matches only one staff, or a `group-id` reappears in a second, non-contiguous run.
- `measure.ts`'s `#renderGroupConnectors()` turns each resolved span into a positioned `createBraceSvg()`/`createBracketSvg()` glyph (`utils/svgCreator/staffGroup.ts`) in a `.group-connectors` overlay, re-run alongside the existing resize-driven `#updateConnectorVisibility()` pass (same trigger as the plain barline). A span's height scales with however many staves it covers (`STAFF_SLOT_HEIGHT_PX * count + STAFF_SLOT_GAP_PX * (count - 1)`), so both glyph renderers must support an arbitrary span, not just a fixed 2-staff gap. A brace/bracket is a system-start decoration, like the clef/key/time signature (see `showDescribe` under Responsive Layout above): `#renderGroupConnectors()` only draws for the first measure of each visual row (`#isFirstInRow()`, the same 5px top-diff comparison `#updateConnectorVisibility()` already used for the plain barline), clearing any glyph on every other measure in the row even if their own staves also declare `group`.
- Since the brace/bracket glyph is drawn with a negative `left` (poking out past the measure's own box, see above), `measure.ts`'s `#renderGroupConnectors()` also toggles a `.has-group-connector` class on the `<music-measure>` host itself whenever it resolves at least one group for the current (first-in-row) measure. A `:host(.has-group-connector)` rule reserves that space via `margin-left` (the same `max(BRACE_WIDTH_PX + BRACE_STAFF_GAP_PX, BRACKET_WIDTH_PX)` sizing). Because this lives on the measure rather than on `composition.ts`, it applies identically whether or not a `<music-composition>` ancestor is present — a standalone `<music-measure>` with a grouped staff reserves its own space, and a composition gets it for free per-row rather than needing its own separate, whole-composition-wide reservation.
- **Reactivity**: `group`/`group-id` changes on an already-connected staff are picked up immediately, not just on resize. Each concrete staff subclass observes `group`/`group-id` and, on change, calls `StaffElementBase#dispatchGroupAttributeChange()` (`staffBase.ts`), which dispatches a bubbling/composed `STAFF_EVENTS.GROUP_ATTRIBUTE_CHANGE` custom event (same dispatch shape as `CLEF_EVENTS.ATTRIBUTE_CHANGE`/`NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE`). `measure.ts` listens for it directly to re-run `#updateConnectorVisibility()`/`#renderGroupConnectors()` (which also re-toggles `.has-group-connector`); `composition.ts` listens for it in `#observeForRedraws()` to re-run `#scheduleRedraw()`, whose downstream row/describe recalculation lets each measure's own reservation take effect. The staff's own shadow DOM still never renders differently based on `group`/`group-id` — this is purely a notify-ancestors path.

## Measure Numbers

`<music-measure>`'s `number` attribute is plain data (the bar's own sequential number) — whether it actually renders is a separate, whole-composition policy: `<music-composition>`'s `measure-numbers` attribute (`'none'` default | `'all'` | `'row-start'` | `'row-end'` | `'odd'` | `'even'`). `row-start`/`row-end` are inherently whole-piece concerns (they describe how measures wrap into rows across the _entire_ composition), so this attribute lives only on `<music-composition>`, never on `<music-measure>` itself — a standalone `<music-measure>` has no ancestor to hold that policy and simply never shows its number (see Known Incomplete Areas).

- **Resolution is read live, not pushed down.** Unlike `number` (actively written onto every child measure by `composition.ts`'s `#renumberMeasures()`), a measure resolves its effective `measure-numbers` mode by reading `this.closest(MUSIC_COMPOSITION)?.getAttribute('measure-numbers')` fresh every time it redraws (`measure.ts#renderMeasureNumber`), the same live-read approach `key-sig`/`mode`/`time` use at construction — except this one re-reads on every redraw rather than once, so it stays correct as rows reflow. When the composition's own attribute changes after the fact, its `attributeChangedCallback` duck-type-calls a `refreshMeasureNumberDisplay()` method on every descendant measure (mirroring the `refreshInheritedAttrs?.()` broadcast used for staves) to force that re-read immediately rather than waiting for the next resize.
- **`row-start`/`row-end` reuse the existing row-detection shape.** `measure.ts#isFirstInRow()` (already used by the brace/bracket and staff-label system-start decorations) is mirrored by a new `#isLastInRow()` — same >5px top-diff `getBoundingClientRect()` comparison, just against the _next_ sibling measure instead of the previous one.
- **Rendering is absolutely positioned, never inline flow — deliberately, learned from a real regression.** An earlier, incomplete version of this feature rendered `number` as `<span>${this.number}</span>` directly in the template, sharing normal document flow with the slotted staves below it. That span's presence (or even just non-empty vs. empty content) changed how much vertical space it occupied, which shifted where the staves themselves rendered — throwing off the brace/bracket's own fixed-pixel position (`position: absolute`, anchored to `:host`, structurally unaffected by flow) relative to the now-shifted staff. The real implementation avoids this entire class of bug by construction: `.measure-numbers` is a `position: absolute` overlay exactly like `.group-connectors`/`.staff-labels`, so it can never affect `:host`'s flow height regardless of content. Fixing this also exposed that `CONNECTOR_TOP_PX` (measure.ts) had been silently calibrated against the old span's ~18px of accidental flow height the whole time — it was recalibrated (51 → 33) and reverified against the full browser-test suite once the flow-height artifact was removed.

## Voices

A `<music-voice>` (`voice/voice.ts`) groups one contrapuntal voice's entire ordered note/chord/rest/tuplet/arpeggio subtree within a `<music-staff>` — independent, simultaneously-sounding melodic lines sharing one staff (e.g. SATB reduced onto one stave), not to be confused with `VocalType` (`types/theory.ts`) above, the unrelated soprano/alto/tenor/bass **range** selector on `<music-staff-vocal>`.

- **Implicit vs. explicit voices.** A staff has either zero `<music-voice>` children (a single implicit voice — unchanged legacy behavior) or two-or-three, wrapping every active voice in sibling order. Voice number is never authored on the element itself; it's derived purely from sibling position among `<music-voice>` children (`utils/slotElements.ts`). Max 3 voices.
- **Stem direction is policy-driven for voices 1 and 2, contextual for voice 3.** Voice 1 (1st `<music-voice>` sibling) always stems up, voice 2 always stems down — unconditionally, not pitch-driven, unlike the single-voice logic in `staffNoteRules.ts#determineStemDirections` (still used whenever only one voice is active). Voice 3 (only reachable alongside both 1 and 2) is contextual: `rules/voiceRules.ts#resolveMiddleVoiceDirection` finds, for each of voice 3's own elements, the concurrently-sounding voice-1 and voice-2 element (nearest by beat-offset) and leans voice 3's stem away from whichever neighbor it sits closer to (crowds voice 1 above → stems down; crowds voice 2 below → stems up), majority-voted across the measure, ties breaking toward `'down'`.
- **Beat-offset is the shared coordinate space for cross-voice comparison.** Since each voice keeps its own independent `entryIds`/element array, array position alone can't tell you which elements from two different voices sound at the same moment. `computeBeatOffsets` (whole-note-fraction units, `rules/beatRules.ts`) gives every element a position in one shared "physical time" coordinate, which is what `resolveMiddleVoiceDirection`'s neighbor-finding and the staff's own mid-stream clef resolution (below) both key off.
- **A mid-stream `<music-clef>` lives only in voice 1.** A clef change is staff-wide, and voice 1 is the canonical timeline every other voice's position is judged against — `<music-clef>` is a valid `<music-voice>` child, but only meaningfully honored as a direct child of the _first_ `<music-voice>` sibling; `utils/slotElements.ts` warns and hides a clef found in voice 2/3 or as a bare top-level staff child once multi-voice is active.
- **Auto-combine and rest-sparseness are separate, orthogonal voice features**, both pre-existing: `rules/voiceCombineRules.ts` merges two voices' rhythmically-identical (same duration/articulation/dynamic, pitch-agnostic) simultaneous notes onto one shared stem when they'd otherwise render as a redundant unison pair; `rules/voiceRestRules.ts` suppresses/displaces a voice's own rest to avoid visually colliding with a concurrently-sounding voice's notehead/stem. Neither depends on the stem-direction or clef machinery above.
- **Two overlapping identical figures do not auto-merge across repeats** — see Known Incomplete Areas below.

## Keyboard / Cross-Staff Notation

Grand-staff/keyboard writing needs a few decorations that reach across two sibling staves — a slur, tie, or dynamic marking authored on one staff's note but meaningfully spanning to (or centered against) the other hand's staff. This section covers the mechanisms specific to that; the existing brace/bracket connector (Grand Staff / Part Connectors above) and the cross-staff arpeggio span (`arpeggio-for`) are the two precedents these all follow.

- **Connector drawing escalates from staff → measure → composition, and each level fully supersedes the one below it.** A `slur`/`tie` pair (or any `ConnectorKind` — see below) is paired via the same root-parameterized functions (`utils/connectorsBuilder.ts`'s `collectNoteLikeElements`/`partitionByVoice`/`pairConnectors`/`buildConnectorSvgs`) at whichever level owns the responsibility: a lone `<music-staff>` draws its own (`staffBase.ts#drawConnectorsWhenStandalone`), _unless_ it has a `<music-measure>` or `<music-composition>` ancestor, in which case that ancestor draws for all of its staves at once (`measure.ts#redrawConnectors`/`composition.ts`'s own version) — this is what makes a slur from one hand's staff to the other's render correctly: the measure/composition can see both staves, a lone staff cannot. Each level bails out cleanly when a higher one is present, so exactly one level ever draws a given pair.
- **`glissando` is a `ConnectorKind`, not a separate feature.** `utils/connectorsBuilder.ts`'s `ConnectorKind` union (`tie`/`slur`/`hammer-on`/`pull-off`/`slide`/`glissando`) already had a straight-line style (`slide`, guitar-tab-only) before glissando was added — glissando reuses the exact same pairing/rendering pipeline with `style: 'straight'`, on `<music-note>`/`<music-chord>` this time. An optional `glissando-hint="white-key"|"black-key"` on the start element resolves into that pair's `label` (the same field `l.v.` already used, previously only populated for laissez-vibrer ties), rendered by the existing `createCurveSvg`'s label path — no new SVG code.
- **A `dynamic-shared` marking is drawn once, by the measure, never by either staff.** `dynamic-shared` on a note/chord that also carries `dynamic` suppresses that staff's own local rendering (`staffClassicalBase.ts#renderDynamics`) and instead is drawn by `measure.ts#redrawSharedDynamics()`, centered in the real vertical gap between that staff and its nearest sibling staff (via `getBoundingClientRect()`, reusing the same `#headRects()` primitive `#redrawArpeggios()` established). Unlike the connector escalation above, this has no composition-level equivalent — a measure's own staves are always the right unit for "the gap between two staves," so this pass runs regardless of a `<music-composition>` ancestor.
- **A plain attribute change and a full re-layout dispatch different events — both matter for a measure-level pass to stay live.** `STAFF_EVENTS.STAFF_MIN_WIDTH` fires only when a staff actually re-lays-out its notes; toggling `tie`/`slur`/`glissando` (no geometry change) instead dispatches `NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE`, and toggling `dynamic`/`dynamic-shared` dispatches `NOTE_EVENTS.DYNAMIC_ATTRIBUTE_CHANGE` — a measure-level pass needs to listen for whichever event(s) can trigger it, not just `STAFF_MIN_WIDTH`, or an attribute-only change won't redraw until the next unrelated resize.
- **`label`** (`StaffElementBase`, every staff type) renders short margin text to the left of a staff — e.g. `label="r.h."`/`label="l.h."` for hand distribution, or an instrument name. Generic free text, not a controlled vocabulary. First-in-row-only, mirroring the brace/bracket's own system-start-decoration rule (`measure.ts#renderStaffLabels`), reserving margin via a `.has-staff-label` class parallel to `.has-group-connector`'s. Reactivity mirrors `group`/`group-id` exactly: `dispatchLabelAttributeChange()` → `STAFF_EVENTS.LABEL_ATTRIBUTE_CHANGE`, listened for by both `measure.ts` and `composition.ts`. `group-id` already supports more than 2 contiguous staves (the SATB-choir precedent), which is what makes a 3-4 stave single-instrument keyboard layout with per-staff hand-distribution labels possible today without new grouping code.
- **`beam-group` (double-stemmed beams) resolves in two passes, both driven by `measure.ts#redrawDoubleStemmedBeams()`.** `beam-group` is a plain string shared by every note/chord/rest across two adjacent staves that should join one shared beam (modeled on `group-id`'s N:M shared-key shape, not `arpeggio-for`'s 1:1 back-reference — a beam group is several notes per staff). `rules/doubleStemmedBeamRules.ts#resolveDoubleStemmedBeamGroups` (pure, mirrors `resolveStaffGroups`) resolves it from every staff's own top-level element stream; a group must span exactly two immediately-adjacent staves with ≥2 non-rest members or it's warned and dropped, the same failure shape an unmatched `arpeggio-for` has today. Pass 1 pushes the correct stem direction (top staff always down, bottom staff always up — a static policy, not pitch-driven, mirroring voice 1/2's own) onto each staff via a settable JS property, `StaffClassicalElementBase#crossStaffBeamStemOverrides`, dirty-checked by content (not reference — the map is rebuilt fresh every call, so a reference check would re-render, and hence re-dispatch `STAFF_MIN_WIDTH`, forever); each staff's own `BeamsBuilder` (`utils/svgCreator/beams.ts`) excludes these indices from same-staff grouping via a new `externallyBeamedIndices` param (breaks a run exactly like a rest, but still reports `isBeamed()` true so the note still suppresses its own flag). Pass 2 (synchronous, right after — a staff's own property-setter-triggered re-render is synchronous, so real `getBoundingClientRect()` geometry read immediately after already reflects the new stem direction) measures each member's own real, current stem-tip position via a new `#stemRect()` (parallels `#headRects()`), resolves the shared beam's `Y = f(X)` line (`rules/doubleStemmedBeamRules.ts#resolveDoubleStemmedBeamLine` — net-contour + internal-consistency classification, angle-clamped the same [-0.15, 0.15] `rules/tupletRules.ts` already uses, horizontal fallback clamped into the real inter-staff gap), and writes each member's real `stemExtension` directly (a note-local write, not a further staff relayout) before drawing the shared beam polygon into a new `.double-stemmed-beams-overlay`. Two correctness traps this had to solve: (1) `staffClassicalBase.ts`'s own `#buildVoiceRenderState` and its `#spaceElements()` beam-reconciliation pass both unconditionally rewrite `stemExtension` from the staff's own (always-0-for-cross-staff) `beamRenderer` on every re-render for _any_ reason — both must skip indices in the new `VoiceRenderState.externallyBeamedIndices` field, or a staff's own next unrelated resize silently wipes out the cross-staff bridging; (2) re-running the bridging computation must not re-measure its own previous output as if it were fresh input — each pass reads the member's _currently-applied_ `stemExtension` back out and un-shifts the freshly-measured tip to its zero-extension baseline before feeding it to the line-resolution algorithm, or repeated invocations (it fires on every `STAFF_MIN_WIDTH` and resize, not once) never converge to a stable target.

## Known Incomplete Areas

- **`staffGuitarTab.ts`**: `onDisconnectedCallback` is still an empty stub
- **Chord value parsing**: Parsing a chord name from the `value` attribute into constituent notes is partially implemented
- **Standalone degraded features**: Some capabilities (minimum-width-driven flex layout, attribute inheritance) require a parent `<music-measure>` or `<music-composition>` and will be silently absent when elements are used in isolation. A `<music-measure>`'s `number` attribute still works as plain data outside a `<music-composition>`, but its display policy (`measure-numbers`) lives only on the composition, so a standalone measure never renders its number — see Measure Numbers above. Ledger lines (both main-note and grace-note) require a staff-provided Y position, and grace-note accidentals fall back to suffix-driven rendering (no key-signature suppression) outside a staff. An arpeggio sign renders standalone but reserves no leftward layout space (like grace notes); the `sempre arpeggiando` passage instruction renders its own text next to a standalone element but does not propagate implied signs to the elements that follow it. The `arpeggio-hairpin` vertical dynamic-change hairpin (wedge + both `-from` / `-to` letters) renders element-local on a standalone `<music-chord>`, like the sign; its continuous cross-staff form still needs a `<music-measure>` ancestor, and on a lone `<music-note>` the letters stay at the wedge ends rather than being pushed clear of a staff. Inside a measure the hairpin's leftward footprint (wedge + the estimated letter width) is reserved on **both** ends of a cross-staff span — the `arpeggio-for` end resolves it from its partner in `#entryLeftwardExtent` — so it never lands on the clef/key/time area of the first entry. A `<music-arpeggio>` (written-out arpeggio) used with no `<music-staff>` renders its run notes and target chord as plain elements — no auto-beam, no synthesized ties, no bar-fit exemption; inside a bare staff it is fully supported. A `tie="laissez-vibrer"` renders its notehead standalone but the l.v. curve is only drawn by a staff/composition connector pass. **Trills are staff-only, deliberately, not degraded-standalone**: `trill` renders nothing at all on a standalone note/chord (no sign, no line) — unlike arpeggio/grace notes, there is no meaningful partial rendering with no staff to draw the wavy line's sibling-spanning span into, so the feature is absent rather than degraded outside a staff. The trill line's own-measure span resolution (`rules/trillRules.ts`) is staff-local (used by the standalone case and by each staff's own same-measure render pass); cross-measure and system-break continuation is a separate, additive pass in `composition.ts#redrawTrills()`, which concatenates one staff-track's elements across every measure it spans (via `flattenSlotElements`) and reuses the same tie-chain walk transparently across that concatenation, splitting the result into one segment per measure with real per-measure geometry (`rules/trillRules.ts#resolveTrillContinuationSegments`) — so it is absent, not degraded, outside a `<music-composition>` ancestor (no measure boundaries to cross). At an ordinary same-row barline the line resumes with no restated sign; at a system break it additionally restates the sign in parentheses by default, controlled by `trill-continuation` (`'bracketed'` | `'line-only'`) on the trill-starting element. Staff tracks are matched by ordinal position across measures (same assumption `#updateClefContinuity` already makes for adjacent pairs, extended into full chains), so an inconsistent staff count across measures is not supported. Within-measure multi-voice trill placement is supported — each voice renders its own trill sign/line/notch/written-note/finish-slur using that voice's own geometry (see Voices above) — but a second voice's trill decoration is not checked against a sibling voice's notehead/stem for visual collision, and `composition.ts#redrawTrills()`'s cross-measure continuation pass is not yet voice-aware (both elaborated in their own entries below). A trilling-note accidental override (`trill-accidental`) is always drawn above the sign — the horizontal-priority layout (accidental beside the sign, chosen by available space) is not implemented. A full pitch override (`trill-note`) renders as a small parenthesized notehead after the main note — the first feature in this library to reserve **rightward** layout space (`StaffClassicalElementBase#computeWrittenTrillFootprints()`, pushing the next entry over, mirroring the leftward `#entryLeftwardExtent` every other decoration uses) — and the tie-start anchor in `connectorsBuilder.ts` nudges past it so a tie visibly begins clear of the parentheses. When the main note is a short value, the written notehead's anchor defers to the second note of its tie chain (`writtenNoteAnchorIndex` in `trillRules.ts`) rather than cramping it against the first — an approximation of the reference engraving rule, not a full solution for arbitrarily short chains. `grace-type="trill"` is a plain unslashed leading grace note (distinct from `acciaccatura`'s slash) — a trill's _starting_ pitch; a _finishing_ figure uses the separate `trill-finish`/`trill-finish-octave`/`trill-finish-slur` attributes instead (grace note(s) placed after the main note, always plain/unslashed, no `grace-type` equivalent of their own). Rendering reuses `svgCreator/graceNotes.ts`'s shared `renderOrnamentNoteGroup()` (heads/stems/beams/ledger lines, factored out of the original leading-grace-only `createGraceNotesSvg` specifically so this could reuse it) but a _simpler_ slur than the leading grace's own `buildGraceSlur`: `createOrnamentConnectorSlur()` always bulges below, always notehead-to-notehead, with no accidental-clearance flip and no descending-group flip — documented v1 simplifications, not silently dropped. `trill-finish-slur="to-main"` (default) draws its slur locally inside the note/chord's own render (self-contained, back to the main note); `"to-next"`/`"both"` need the _following_ element's real position, which only the staff has, so that half is drawn separately by `StaffClassicalElementBase#drawTrillFinishSlurs()` in the trill-lines overlay, independently recomputing the same local layout math (mirroring `#computeWrittenTrillFootprints`/`#drawWrittenTrillNote`'s "recompute, don't read back from DOM" pattern) rather than sharing state with the note's own render. The finishing group is this library's second rightward-reserving decoration (`StaffClassicalElementBase#computeTrillFinishFootprints()`, combined with the written-trilling-notehead footprint via `#rightwardFootprint()`), and the tie-start nudge in `connectorsBuilder.ts` accounts for it too — though only against the notehead itself, not a single (non-group) finishing note's own stem, which can extend a couple of px further right than the reserved footprint; a tie starting there may graze the thin stem line, a minor cosmetic gap not pursued further. `trill-note` and `trill-finish` are not designed to combine on one element (they represent two different notations for the same idea — a named static auxiliary pitch vs. a finishing turn figure) — both render, but their rightward layout footprints and starting anchors overlap rather than stacking. TODO: chord double-trill (two tones of one chord trilling independently, each with its own sign spread to opposite sides of the stem) was implemented once and then reverted — revisit when picked back up. A first attempt spread the signs horizontally and had every trilling tone's line start after the group's rightmost sign so no line crossed a sibling tone's sign; a vertical-stacking alternative was also tried and rejected, since it needs more headroom above the staff than a typical page reserves there (the above-staff budget mechanism grows the staff's own internal SVG, but nothing grows the host element's own margin to match, so a tall reservation would render above the visible page with nothing to scroll to).
- **Clef support**: only `treble` and `bass` have data in `rules/clefRules.ts`'s `CLEF_DEFINITIONS` today (`ClefType` is intentionally kept to those two rather than a wider, partially-backed union — see the `// TODO` above its declaration in `types/theory.ts`). Adding alto/tenor is a two-part change: a `ClefDefinition` entry plus a new clef glyph in `utils/svgCreator/clefs.ts`.
- **SMuFL glyph extraction (transition in progress)**: the repo carries SMuFL infrastructure for deriving notation glyphs from a real engraving font instead of hand-computing bezier shapes — the "Drawing / SMuFL glyphs" section of `README.md`, `download-smufl-font.sh`, and the downloaded `smufl/Bravura.otf` + `smufl/bravura_metadata.json` assets. The brace and bracket glyphs (`createBraceSvg()` / `createBracketSvg()` in `utils/svgCreator/staffGroup.ts`) were pulled by hand via a discarded one-off script; the arpeggio wiggle (`utils/svgCreator/arpeggio.ts`) was the first glyph extracted through the now-checked-in `scripts/extract-glyphs.mjs` (a generic, argument-driven extractor — `pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- <glyphName>[:rotate90] ...`). That script is author-time-only — never run by the build, tests, CI, or the bundle; `opentype.js` is a dev-only dependency; the committed `*_PATH_D` string constants in `svgCreator/` are the source of truth and the only thing that ships. Every other `svgCreator/` glyph (clefs, accidentals, noteheads, etc.) is still hand-drawn. Prefer extracting via `scripts/extract-glyphs.mjs` over hand-computing new glyphs going forward, adding the glyph's codepoint to that script's table. Note: the checked-in `bravura_metadata.json` has drifted from the checked-in `.otf` (bounding boxes no longer match), so the extractor reads geometry from the font outline directly. Per convention, `svgCreator/` source comments deliberately avoid naming SMuFL/Bravura — this entry is the canonical place for that context.
- **Repeating-pattern shared unison notehead**: a unison between two voices always renders as two side-by-side noteheads — correct for a single instance, per the reference engraving rule. Merging a _recurring_ unison pattern into one shared notehead has no crisp specification to implement against (no defined threshold for how many repeats count, no defined equivalence for "the same figuration," high risk of a wrong merge reading as an editing bug rather than a deliberate notation choice) — follow-up only if a concrete, narrow rule emerges from real usage.
- **Voice 3 has no manual stem-direction override**: its direction is always the `resolveMiddleVoiceDirection` heuristic (see Voices above) — v1 ships no attribute anywhere in the design that would let an author force it either way. Follow-up only if real usage shows the heuristic picking the wrong side often enough to matter.
- **Cross-measure trill continuation is not voice-aware, and this is a real bug, not just a gap.** `composition.ts#redrawTrills()` concatenates one "staff track" across measures via the plain `flattenSlotElements`, which cannot recurse into a `<music-voice>` wrapper at all — so it silently mis-flattens (drops or garbles) any staff that uses `<music-voice>`, even a staff with only one explicit voice. Within-measure multi-voice trills (Voices above) close the modeling gap this depended on; fixing `redrawTrills()` itself is mechanical (swap in the voice-aware `flattenStaffSlotElements`, loop the per-track span/sign/line resolution once per voice number) but is separate, not-yet-done work.
- **A second voice's trill sign does not avoid colliding with another voice's notehead/stem.** Each voice's trill sign/line/notch/written-note/finish-slur renders correctly using that voice's own geometry (a trill in voice 2 alone renders correctly with nothing in voice 1), but there is no vertical-collision detection between two voices' trill decorations. Follow-up only if real usage shows it happening often enough to matter.
- **Cross-voice arpeggio spans within one staff are not supported** (e.g. voice 1's chord rolling into voice 2's chord on the same staff). `rules/arpeggioRules.ts#resolveArpeggioSpans` deliberately rejects same-`staffIndex` pairings by design — it only expresses grand-staff/cross-staff arpeggio spans. A within-staff, cross-voice span is a genuinely new feature this function was never built for.
- **Cross-staff slurs ship a plain curve, not the full reference engraving rulebook for keyboard slur placement.** A slur spanning two staves (see Keyboard / Cross-Staff Notation above) uses the same `createCurveSvg()` shape every other slur does — it does not implement: placing the slur on the side of a double-stemmed group with the majority of notes, never letting a slur intersect a beam, anchoring at the stem end (rather than the notehead) when needed for a slur to visibly include all its notes, or the "avoid entirely, or place notehead-to-stem" guidance for a slur on a double-stemmed inner voice. These are real, nuanced placement judgment calls from the reference engraving material — a v1 simplification, not silently dropped; revisit if a real passage's default rendering looks wrong often enough to matter.
- **A measure with both a brace/bracket group connector and a staff `label` reserves margin space additively, not jointly tuned.** `:host(.has-group-connector.has-staff-label)`'s `margin-left` (`measure.ts`) is the sum of the two individual reservations, and `#renderStaffLabels()` positions the label past the bracket's own width in that case so the two don't overlap — functionally correct, but the exact gap sizes (`STAFF_LABEL_LEFT_MARGIN_PX` etc.) are starting values, not visually optimized the way a real engraver would tighten the combined layout. Revisit if this combination looks noticeably loose in practice.
- **Note clusters (Cowell-style black-key/white-key/chromatic notation) are not implemented.** A general-purpose notation, not keyboard-specific, that appears frequently in keyboard writing — tracked as its own unstarted row in `TODO.md` §13 "Special / Extended Techniques". (Octave signs, 8va/15ma/loco, used to be listed here too — they're now fully implemented; see `rules/octaveRules.ts`.)
- **Hairpins do not angle through the stave to avoid a double-stemmed beam.** The reference engraving material shows a hairpin obstructed by a double-stemmed beam angling to route around it, with at least one end extending outside the stave — today's hairpin always renders straight using its existing geometry inputs (`svgCreator/dynamics.ts#createHairpinSvg`), regardless of what beams fall in its path. A v1 simplification, not silently dropped; revisit if a real passage's default placement looks wrong often enough to matter.
- **Double-stemmed beams (`beam-group`) draw the primary beam, secondary/fractional beams, and rest placement; a shared single stem and beyond are not yet implemented.** A grand-staff beam group spanning both staves resolves its cross-staff stem direction (top staff always down, bottom staff always up — `measure.ts#redrawDoubleStemmedBeams()`, mirroring voice 1/2's own static policy) and its real shared beam line (`rules/doubleStemmedBeamRules.ts#resolveDoubleStemmedBeamLine` — contour-classified slope, clamped, with a horizontal fallback that stays clear of both staves), drawn in a new `.double-stemmed-beams-overlay`. A cross-staff member's real `stemExtension` is resolved and written directly by the ancestor `<music-measure>` from both-staves geometry the staff itself can't see — `staffClassicalBase.ts` deliberately skips overwriting it for these indices on its own subsequent re-renders (`VoiceRenderState.externallyBeamedIndices`), or it would silently reset to the unbeamed fallback (0) on the next unrelated resize. Mixed durations within a group reuse the same pure level-by-level run detection a same-staff beam already uses (`rules/beamStructureRules.ts#computeBeamLevelStructure`, fed the group's own non-rest members' flag counts in beat order) to find secondary/fractional segments, then a cross-staff-only question the single-staff model never has to answer — which staff's side a given segment stacks toward — is resolved per segment (`rules/doubleStemmedBeamRules.ts#resolveSecondaryBeamVerticalSide`: same-staff segment → that side; mixed-but-same-outer-notes → the outer side; a genuine outer-direction conflict → the opposite of the first note's side at the very start of the group, matching it everywhere else) and then forced onto one shared majority side for the whole group (`#resolveGroupSecondaryBeamSide`, tie-broken toward the primary beam's own slope). A rest that's a member of the group (`restStaffSide` on `<music-rest>`, mirroring `beamGroup`'s attribute shape) is placed just above/below the shared beam itself — not a position within either staff's own line system — or, explicitly, centered at the real vertical midpoint of the inter-staff gap; unset auto-classifies to a side from adjacency in the group's own member order (`rules/doubleStemmedBeamRules.ts#classifyAutoRestStaffSide`, a documented v1 approximation of the reference engraving rule, since no beat-subdivision machinery exists anywhere in this codebase), never persisted back onto the rest itself (re-derived fresh every redraw — unlike the stem-extension bridging above, a rest's target Y has no history-dependence to un-shift, so there's no equivalent convergence risk). `staffClassicalBase.ts` mirrors the same `externallyBeamedIndices` skip pattern for these rests (`VoiceRenderState.externallyPositionedRestIndices`). Not yet implemented: a shared single stem for a same-beat unison between the hands, cross-staff tuplet numerals/brackets, and the cross-staff slur/hairpin/octave-sign awareness the two bullets above and below already flag.

## Build & Test

- Package name: `@one-step-at-a-time/web-components`
- Module type: ESM (`"type": "module"`)
- Test runner: Jest via Nx (`@nx/jest`)
- Run tests: `npx nx test web-components`

## Storybook Stories

Story files are colocated with the code they exercise (`src/note/note.stories.ts`,
`src/utils/svgCreator/beams.stories.ts`). **One `.stories.ts` file = one `title` = one sidebar
leaf.** The sidebar tree is entirely the `/`-delimited `title` path plus the `storySort` order
in `.storybook/preview.ts` — there is no `Components/` wrapper. A feature is organised by _what
it is_, not by which element renders it in the example: a feature that only draws inside a
staff/composition pass (ties, slurs, dynamics, hairpins, beams, tuplet brackets, arpeggio
signs, grace notes, clef changes) lives under `Universal Notations/…` in its own file; a
feature that renders standalone on a note/chord (articulations, stress, fermata, single
accidentals) stays in that element's file.

**Sidebar leaves → files** (this is also the `storySort` order):

| Leaf                                                                         | File                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Note`                                                                       | `src/note/note.stories.ts`                                                                                                                                                                                                                                                    |
| `Chord`                                                                      | `src/chord/chord.stories.ts`                                                                                                                                                                                                                                                  |
| `Rest`                                                                       | `src/rest/rest.stories.ts`                                                                                                                                                                                                                                                    |
| `Clef`                                                                       | `src/clef/clef.stories.ts` (standalone glyph)                                                                                                                                                                                                                                 |
| `Staff`                                                                      | `src/staff/staff.stories.ts` (staff basics, ledger lines, key-sig accidentals)                                                                                                                                                                                                |
| `Measure`                                                                    | `src/measure/measure.stories.ts`                                                                                                                                                                                                                                              |
| `Composition`                                                                | `src/composition/composition.stories.ts` (multi-measure layout, grand staff / brace / bracket, plus the row/system-break stories — kept a flat leaf, no `Composition/…` sub-path; the cross-system stories cluster via a `Cross System - ` name prefix, not a hierarchy node) |
| `Universal Notations/Ties`                                                   | `src/utils/svgCreator/ties.stories.ts`                                                                                                                                                                                                                                        |
| `Universal Notations/Slurs`                                                  | `src/utils/svgCreator/slurs.stories.ts`                                                                                                                                                                                                                                       |
| `Universal Notations/Dynamics & Hairpins`                                    | `src/utils/svgCreator/dynamics.stories.ts`                                                                                                                                                                                                                                    |
| `Universal Notations/Tuplets`                                                | `src/tuplet/tuplet.stories.ts`                                                                                                                                                                                                                                                |
| `Universal Notations/Arpeggio`                                               | `src/arpeggio/arpeggio.stories.ts` (`<music-arpeggio>` **and** the `arpeggio`/`arpeggiate` attribute, incl. cross-staff)                                                                                                                                                      |
| `Universal Notations/Grace Notes`                                            | `src/utils/svgCreator/graceNotes.stories.ts`                                                                                                                                                                                                                                  |
| `Universal Notations/Trills`                                                 | `src/utils/svgCreator/trill.stories.ts`                                                                                                                                                                                                                                       |
| `Universal Notations/Clef Changes`                                           | `src/clef/clefChanges.stories.ts`                                                                                                                                                                                                                                             |
| `Universal Notations/Beams`                                                  | `src/utils/svgCreator/beams.stories.ts`                                                                                                                                                                                                                                       |
| `Instruments/Voice`                                                          | `src/staffVocal/staffVocal.stories.ts`                                                                                                                                                                                                                                        |
| `Instruments/Guitar`                                                         | `src/staffGuitarTab/staffGuitarTab.stories.ts`                                                                                                                                                                                                                                |
| `Instruments/Keyboard`                                                       | `src/keyboard.stories.ts` — cross-staff slurs, glissando, shared/per-voice dynamics, hand-distribution labels, double-stemmed beams (see Keyboard / Cross-Staff Notation above); a `Planned` story notes pedal marks and note clusters as not yet implemented                 |
| `Instruments/Strings`, `Instruments/Winds & Brass`, `Instruments/Percussion` | `src/{strings,windsBrass,percussionKeyboard}.stories.ts` — placeholders (`tags: ['!autodocs']`, one `Planned` story) until the notations land                                                                                                                                 |

**Standard imports:**

```ts
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../index'; // registers all custom elements
import { DURATIONS, NOTES, OCTAVES } from '../utils'; // for control option arrays
```

**Meta shape:** nested `title` path (e.g. `'Universal Notations/Ties'`), `component:
'<tag-name>'` where one element dominates (links the Docs tab to the `custom-elements.json`
attribute table), `tags: ['autodocs']`, optional global `render`/`argTypes`/`args`.

**Consumer guides** are MDX under `src/*.mdx` / `src/guides/*.mdx` (`Introduction`,
`Getting Started`, `Framework Integration`, `Concepts`). `.storybook/preview.ts` loads the
manifest via `setCustomElementsManifest`. The whole Storybook is deployed to GitHub Pages by
`.github/workflows/docs.yml`.

**Story naming conventions:** `Standalone`, `InStaff`, key-signature variants (`CMajor`, `GMajor`, …), feature combos (`WithChords`, `WithAccidentals`, `NoteToNote`, etc.).

**No decorators or play functions** — stories are self-contained `render` functions using Lit `html` tag.

**Always use existing constants and types** — import `DURATIONS`, `NOTES`, `OCTAVES` from `'../utils'` for `options` arrays; use `DurationType`, `Note`, `Octave`, `TimeSignature` from `'../types/theory'` for typed values rather than raw strings.

**Discovery:** `.storybook/main.ts` globs `../src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))`; Vite + `@storybook/web-components-vite`.

---

## Test Organization

Three tiers — choose based on what you're testing:

| Tier             | File suffix                     | Runner                | When to use                                                                                                |
| ---------------- | ------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Standalone unit  | `*.test.ts` in component folder | Jest + jsdom          | Single-element behavior: registration, default props, shadow DOM structure, attribute handling             |
| Integration      | `staffClassicalBase.test.ts`    | Jest + jsdom          | Parent-staff ↔ child coordination: slot mechanics, Y-positioning, error handling across hierarchy          |
| Browser / layout | `*.browser-test.ts`             | Playwright + Chromium | Responsive layout, ResizeObserver, CSS flex sizing, pixel-accurate positioning, multi-measure coordination |

### Standalone unit tests

- `@jest-environment jsdom` directive at the top of every test file
- Import component's `index.ts`, create element with `document.createElement(TAG_CONST)`, append to `document.body`
- Access `el.shadowRoot` for shadow DOM assertions; query with `.querySelector()`
- `afterEach(() => { document.body.innerHTML = ''; })` cleanup in every file
- Files live next to their component: `src/note/note.test.ts`, `src/rest/rest.test.ts`, etc.
- **Always use existing constants and types**: tag name constants (`MUSIC_NOTE`, `MUSIC_REST`, etc.) from `utils/consts`; strong types (`DurationType`, `Note`, `Octave`, `TimeSignature`, `Chord`) from `types/theory.ts` and `types/elements.ts` — never raw strings like `'music-note'` or `'quarter'`

### Integration tests

Integration tests for notes, chords, and rests live in their **component's own test file** under a `describe('staff integration', ...)` block:

| File                  | Integration describe block | What to test here                                                                    |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `note/note.test.ts`   | `'staff integration'`      | Y-repositioning on note/octave change, stem direction, flag/beam state, double-whole |
| `chord/chord.test.ts` | `'staff integration'`      | Chord top position, stem direction, staff Y coordinates                              |
| `rest/rest.test.ts`   | `'staff integration'`      | Rest Y positioning per duration, double-whole overflow                               |

- Pattern: import `'../staff/index'` to register the staff, create staff → set `TIME_SIG` → `slot.assignedElements = () => [...]` → `slot.dispatchEvent(new Event('slotchange'))`
- Use `jest.spyOn(console, 'warn')` to assert overflow/validation conditions (the library uses `console.warn` exclusively for non-fatal validation issues)

`staffClassicalBase.test.ts` retains only **cross-cutting** `StaffClassicalElementBase` behaviour that doesn't belong to a single element type (currently: measure overflow/validation).

**Per-staff test scope** — each staff's own `*.test.ts` file is intentionally narrow:

| File                            | What to test here                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staff/staff.test.ts`           | Clef glyph present per `clef` value; note Y-coordinates match the active clef's table; mid-stream `<music-clef>` behavior (`'clef changes'` describe block) |
| `staffVocal/staffVocal.test.ts` | Vocal clef / vocal-type variants; lyrics rendering and positioning                                                                                          |
| `rules/clefRules.test.ts`       | `getClefRenderData()` reproduces the exact Y-coordinate/key-signature tables per clef (regression-locks against silent pitch shifts)                        |

### Browser tests

- Runner: Playwright (`@playwright/test`), completely separate from Jest
- Config: `playwright.config.ts` matches `*.browser-test.ts`; starts Vite dev server on port 5179
- Existing files: `measure/measure.browser-test.ts`, `staff/staff.browser-test.ts`, `composition/composition.browser-test.ts`
- **Add a browser test when the feature involves**: responsive resizing, CSS `style.flex` values, `getBoundingClientRect()` / `getBBox()` geometry, multi-measure coordination, or `ResizeObserver`-driven layout changes
- Helpers in `test-fixtures/helpers.ts`: `waitForRedrawCycle`, `waitForStaffNotesPositioned`, `buildStandaloneStaff`, `buildComposition`, `resizeHost`
- All DOM interaction via `page.evaluate()` (runs in real browser); all assertions are async

---

## Conventions

- Use TypeScript `#` private fields for custom element internals. **Exception**: state a subclass needs direct access to must use plain TypeScript `protected` (no `#`) instead — ECMAScript `#private` fields are not inheritable at all, only accessible within the exact class body that declares them. `staffBase.ts` mixes both: `#lastStaffWidth`/`#standaloneConnectorsOverlay` are `#`-private (base-only), while `staffContainer`/`transcribeContainer`/`staffResizeObserver`/`effectiveTimeSig`/`resolveInheritedValue`/`convertTotimeInts` are `protected` (subclasses read/call them directly). When moving state from a subclass onto a shared base specifically so other subclasses can use it, drop the `#` — keeping it silently breaks the subclass that used to own it.
- Guard all custom element registration with `typeof window !== 'undefined'`
- Use `SVG_NS` in `src/utils/consts.ts` with `createElementNS()` for all SVG creation
- CSS custom properties: `--flex-staff-basis`, `--flex-staff-minw` for layout overrides
- `currentColor` used in SVG so staff color inherits from CSS
- **Always run `npx nx format:write` after every batch of file edits or new files** — do not skip this step
- **Whenever a custom element's attributes change — added, renamed, removed, or retyped, on any element, not just note/chord — update `src/react.d.ts` AND the element's `@attr` JSDoc block in the same change, then run `nx run web-components:analyze`.** Neither is enforced by `implements` like `IXxxElement` in `types/elements.ts`, so they drift silently otherwise; CI's stale-manifest check catches a missed `analyze` but not a missed `react.d.ts`.
- Use full words when defining variables, functions, and classes; no abbreviations or uncommon acronyms
- In test files (both `*.browser-test.ts` and `*.test.ts`), always use strong types from `types/theory.ts` and `types/elements.ts` instead of primitives — e.g. `DurationType` instead of `string` for durations, `Note` instead of `string` for note values like `'C'`
