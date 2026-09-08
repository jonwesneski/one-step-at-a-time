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
│           │   ├── spacingRules.ts        # Horizontal entry spacing — logarithmic duration weight + slack distribution
│           │   ├── staffWidth.ts          # Measure strut-min + duration-weighted natural width; flex value
│           │   ├── theoryConsts.ts        # Duration/semitone lookup maps
│           │   ├── theoryHelpers.ts       # Chord/note computation
│           │   └── …                      # also chordRules, restRules, staffHeightRules, staffNoteRules, tupletRules, dynamicsRules
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
14. `[A][B]` **Stories (near-universal)** — add/extend colocated `<component>.stories.ts`
    (Type A → `note.stories.ts`; Type B → `staff` / `composition` stories), using option
    arrays from `../utils` and strong types from `../types/theory`. For both Type A and Type B see if you can extend an existing story rather than making more new stories. If the feature is small like adding 1 or 2 attributes and their total number of possible values are small consider extending existing stories; otherwise you can plan for new stories
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
- X-spacing: entries are justified to fill the measure width. Beyond a fixed
  `MIN_NOTE_WIDTH` collision strut per entry, spare width is shared out by a
  **logarithmic** function of duration — halving a note's value costs roughly a
  quarter of its space, not half — so long notes are not over-spaced and short
  notes are not starved. The math is `rules/spacingRules.ts`
  (`spacingSlackWeight` / `computeSpacingWeights` / `distributeSlack`).
  `durationToFactor` is a **separate** linear map used only for bar-fit and
  beam-grouping, never for spacing.
- SVG rendering lives entirely in `utils/svgCreator/` (a directory, not a single file)

### Semitone System

Notes are mapped to semitones 0–11 (A=0, Bb=1, B=2, C=3, …, Ab=11). Chord formulas are stored as semitone interval arrays from root (e.g., major = `[4, 7]`). This enables enharmonic equivalents and chord note computation.

### Measure Width

Each staff reports **two** widths, both computed in `rules/staffWidth.ts`:

- **strut min width** — the collision floor:
  `describeEndX + LEADING_NOTE_GAP_PX + noteCount × MIN_NOTE_WIDTH + leftward-overhangs + clefChangeWidth`
  (vocal takes `max(noteCount × MIN_NOTE_WIDTH, lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)`).
- **natural width** — the strut plus the total logarithmic spacing slack the
  entries want beyond it (`Σ` of `computeSpacingWeights` from `rules/spacingRules.ts`).

`describeEndX` is the x-offset where the clef/key-signature/time-signature area ends (stored as `#describeEndX`, updated every `#spaceElements()` run).

Both are dispatched upward on one `STAFF_EVENTS.STAFF_MIN_WIDTH` event, `detail: { minWidth, naturalWidth }`. `<music-measure>` keeps the per-staff max of each and sets:

- `this.style.flex = "${maxNatural} 1 ${maxNatural}px"` — grow **and** basis equal the natural width;
- `this.style.minWidth = "${max(maxMin, MEASURE_MIN_WIDTH_PX)}px"` — the strut, floored.

Because grow == basis, the measures on a row end up distributed as `naturalWidth_i ÷ Σ naturalWidth × rowWidth` — width proportional to musical content: one measure alone fills the row, equal-content measures split it evenly, a sparse measure beside a dense one splits it proportionally. `min-width` is a real CSS property, kept apart from the basis so a crowded measure can shrink toward its strut before the row wraps.

### Responsive Layout

`<music-composition>` uses CSS flexbox with `flex-wrap: wrap`, so measures reflow into rows automatically as the container width changes. A row holds as many measures as their natural widths sum to fit under `.composition-wrapper`, then they stretch uniformly to fill it — there is no fixed measures-per-row cap. `<music-composition>` takes a `max-width` attribute (a px number or `none`, default `COMPOSITION_MAX_WIDTH_PX` = 900) that caps `.composition-wrapper`; the flex math is self-scaling, so nothing else consumes that value. All layout-sensitive rendering reacts to resizes via a `ResizeObserver` on the composition element, which schedules a redraw via `#scheduleRedraw()` (debounced to one `requestAnimationFrame`).

On each redraw cycle the following happen in order:

1. **Note x-spacing** — each staff's `StaffResizeObserver` (on the staff container element) calls `onStaffResize()`, which re-justifies the entries across the new container width (logarithmic duration weight, see SVG Coordinate System above) and re-emits `STAFF_EVENTS.NOTES_POSITIONED`.
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
type VoiceType = 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass';
```

`Chord` is a discriminated union of `NormalChord` and slash chords.

## Key Utility Maps (`rules/theoryConsts.ts`)

| Map                       | Purpose                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `durationToFlagCountMap`  | Duration → flag count (eighth=1, sixteenth=2, …)                                                                           |
| `noteSemitoneMap`         | Note name → semitone (0–11)                                                                                                |
| `semitoneNoteMap`         | Semitone → note name array (handles enharmonics)                                                                           |
| `ChordSemitoneMap`        | Chord type string → interval array                                                                                         |
| `ChordSemitoneMapAliases` | Alias normalization (`'m'` → `'min'`, `''` → `'maj'`)                                                                      |
| `durationToFactor`        | Duration → linear whole-note fraction. Bar-fit (`measureRules`) and beam grouping (`beams.ts`) only — **not** note spacing |

Horizontal note spacing uses `rules/spacingRules.ts` (`spacingSlackWeight`, `computeSpacingWeights`, `distributeSlack`), a logarithmic curve, not `durationToFactor`.

`utils/consts.ts` holds custom element tag name constants and event name constants (e.g., `STAFF_EVENTS`).

## Staff Class Hierarchy

```
StaffElementBase              (staffBase.ts)         — shadow DOM, staff lines, resize observer, template method lifecycle, group/groupId, time (value + inheritance)
├── StaffClassicalElementBase (staffClassicalBase.ts) — key sig, time sig glyph rendering, note Y-coords, beam/note rendering, clef-segment resolution
│   ├── StaffElement          (staff/staff.ts)              — `clef` attribute (treble/bass), data from rules/clefRules.ts
│   └── StaffVocalElement     (staffVocal/staffVocal.ts)     — vocal clef, 6 voice types, lyrics integration
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
5. Entries justified to fill the measure; each entry's share of the free space is a logarithmic function of its duration (`rules/spacingRules.ts`)
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

## Known Incomplete Areas

- **`staffGuitarTab.ts`**: `onDisconnectedCallback` is still an empty stub
- **Chord value parsing**: Parsing a chord name from the `value` attribute into constituent notes is partially implemented
- **Standalone degraded features**: Some capabilities (minimum-width-driven flex layout, attribute inheritance) require a parent `<music-measure>` or `<music-composition>` and will be silently absent when elements are used in isolation. Ledger lines (both main-note and grace-note) require a staff-provided Y position, and grace-note accidentals fall back to suffix-driven rendering (no key-signature suppression) outside a staff. An arpeggio sign renders standalone but reserves no leftward layout space (like grace notes); the `sempre arpeggiando` passage instruction renders its own text next to a standalone element but does not propagate implied signs to the elements that follow it
- **Clef support**: only `treble` and `bass` have data in `rules/clefRules.ts`'s `CLEF_DEFINITIONS` today (`ClefType` is intentionally kept to those two rather than a wider, partially-backed union — see the `// TODO` above its declaration in `types/theory.ts`). Adding alto/tenor is a two-part change: a `ClefDefinition` entry plus a new clef glyph in `utils/svgCreator/clefs.ts`.
- **SMuFL glyph extraction (transition in progress)**: the repo carries SMuFL infrastructure for deriving notation glyphs from a real engraving font instead of hand-computing bezier shapes — the "Drawing / SMuFL glyphs" section of `README.md`, `download-smufl-font.sh`, and the downloaded `smufl/Bravura.otf` + `smufl/bravura_metadata.json` assets. The brace and bracket glyphs (`createBraceSvg()` / `createBracketSvg()` in `utils/svgCreator/staffGroup.ts`) were pulled by hand via a discarded one-off script; the arpeggio wiggle (`utils/svgCreator/arpeggio.ts`) was the first glyph extracted through the now-checked-in `scripts/extract-glyphs.mjs` (a generic, argument-driven extractor — `pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- <glyphName>[:rotate90] ...`). That script is author-time-only — never run by the build, tests, CI, or the bundle; `opentype.js` is a dev-only dependency; the committed `*_PATH_D` string constants in `svgCreator/` are the source of truth and the only thing that ships. Every other `svgCreator/` glyph (clefs, accidentals, noteheads, etc.) is still hand-drawn. Prefer extracting via `scripts/extract-glyphs.mjs` over hand-computing new glyphs going forward, adding the glyph's codepoint to that script's table. Note: the checked-in `bravura_metadata.json` has drifted from the checked-in `.otf` (bounding boxes no longer match), so the extractor reads geometry from the font outline directly. Per convention, `svgCreator/` source comments deliberately avoid naming SMuFL/Bravura — this entry is the canonical place for that context.

## Build & Test

- Package name: `@one-step-at-a-time/web-components`
- Module type: ESM (`"type": "module"`)
- Test runner: Jest via Nx (`@nx/jest`)
- Run tests: `npx nx test web-components`

## Storybook Stories

Story files are colocated with their component using the `<component>.stories.ts` naming convention (e.g. `src/note/note.stories.ts`). The exception is feature-level utilities: `src/utils/svgCreator/beams.stories.ts`.

**Existing story files:**
`chord`, `clef`, `composition`, `measure`, `note`, `rest`, `staff`, `staffGuitarTab`, `staffVocal`, `utils/svgCreator/beams`

**Standard imports:**

```ts
import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index'; // registers all custom elements
import { DURATIONS, NOTES, OCTAVES } from '../utils'; // for control option arrays
```

**Meta shape:** `title: 'Components/...'`, `component: '<tag-name>'` (e.g. `'music-note'` —
links the story to its `custom-elements.json` entry so the Docs tab renders the attribute
table), `tags: ['autodocs']`, optional global `render`/`argTypes`/`args`.

**Consumer guides** are MDX under `src/*.mdx` / `src/guides/*.mdx` (`Introduction`,
`Getting Started`, `Framework Integration`, `Concepts`). `.storybook/preview.ts` loads the
manifest via `setCustomElementsManifest`. The whole Storybook is deployed to GitHub Pages by
`.github/workflows/docs.yml`.

**Story naming conventions:** `Standalone`, `InStaff`, key-signature variants (`CMajor`, `GMajor`, …), feature combos (`WithChords`, `WithAccidentals`, `WithTies`, etc.).

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
| `staffVocal/staffVocal.test.ts` | Vocal clef / voice-type variants; lyrics rendering and positioning                                                                                          |
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
