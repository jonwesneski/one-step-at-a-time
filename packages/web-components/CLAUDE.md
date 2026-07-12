# Music Notation — Project Context

## Overview

`@one-step-at-a-time/web-components` is a Web Components library for rendering music notation in the browser. All musical elements are custom HTML elements built with TypeScript and SVG. There are no framework dependencies — it runs natively in any browser or framework (React types are declared for JSX compatibility).

## Composable and Standalone Elements

Elements are designed to be used **in isolation or composed together**. You do not need the full hierarchy to use any given element. **"Standalone" means an element is used without its usual parent element** — e.g. a staff without a `<music-composition>`, or a note without a staff:

- `<music-note>` and `<music-chord>` can be used standalone, outside any staff, measure, or composition
- `<music-staff-treble>`, `<music-staff-bass>`, `<music-staff-guitar-tab>`, and `<music-staff-vocal>` can be used without a `<music-measure>` or `<music-composition>`
- `<music-measure>` can be used without a `<music-composition>`

Some features may be unavailable or degraded when elements are used outside their normal parent context (for example, attribute inheritance from parent elements won't apply, and layout-driven sizing from minimum-width events requires a `<music-measure>` parent). The goal is to keep that list of exceptions small.

## Custom Element Hierarchy

```
<music-composition>          — composition.ts
  └─ <music-measure>         — measure/measure.ts
      ├─ <music-staff-treble>   — staffTreble/staffTreble.ts
      ├─ <music-staff-bass>     — staffBass/staffBass.ts
      │   ├─ <music-note>        — note/note.ts
      │   └─ <music-chord>       — chord/chord.ts
      │       └─ <music-note>    (children)
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
│           ├── types.d.ts     # React JSX declarations for custom elements
│           ├── staffBase.ts          # Minimal abstract base (shadow DOM + lifecycle)
│           ├── staffClassicalBase.ts # Thin orchestrator — wires rules + SVG + spacing
│           ├── composition/
│           ├── measure/
│           ├── note/
│           ├── chord/
│           ├── guitarNote/
│           ├── staffTreble/
│           ├── staffBass/
│           ├── staffGuitarTab/   # Incomplete — Y-coords not yet mapped
│           ├── staffVocal/
│           ├── rules/            # Music theory / domain computation (pure functions)
│           │   ├── accidentalRules.ts
│           │   ├── beamRules.ts
│           │   ├── staffWidth.ts          # Measure min-width calculation
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
│               ├── noteTimingDragHandler.ts
│               ├── pitchDragHandler.ts
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
│                   └── curve.ts
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
7. `[A][B]` **Check React JSX decls** — check whether `src/types.d.ts` needs updating; if the
   feature adds a consumer-facing prop, add the optional prop to the `'music-note'` and
   `'music-chord'` declarations (+ import the type). This file is _not_ enforced by
   `implements`, so it silently drifts — check it explicitly.
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
13. **Inherited-attr variant** — if the feature is instead an _inherited staff attribute_ (like
    `keysig`/`mode`/`time`), the wiring differs: add to `COMMON_ATTRIBUTES`, to
    `observedAttributes` in composition/measure/staffClassicalBase, add `#effectiveX` +
    `#resolveInheritedValue` calls, and the descendant push loop in `composition.ts`.
14. `[A][B]` **Stories (near-universal)** — add/extend colocated `<component>.stories.ts`
    (Type A → `note.stories.ts`; Type B → `staffTreble` / `composition` stories), using option
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
18. `[A][B]` **Format & test** — run `npx nx format:write`, then `npx nx test web-components`.

**Common trap:** a plain new note/chord attribute does **not** touch `src/index.ts` or the
staff base classes (`staffBase.ts`) — don't go looking for wiring there.

## Key Architecture Concepts

### Shadow DOM

All components use shadow DOM (`attachShadow({ mode: 'open' })`). Style encapsulation is intentional. Slots connect light DOM notes/chords to shadow DOM staff renderers.

### SVG Coordinate System

- Y-coordinates are looked up from static maps keyed by note name + octave (e.g., `'C4'`, `'G5'`)
- Each staff subclass defines its own `noteYCoordinateMap` for its clef range
- X-spacing is derived from `durationToFactor`: whole=1.0, half=0.5, quarter=0.25, etc.
- SVG rendering lives entirely in `utils/svgCreator/` (a directory, not a single file)

### Semitone System

Notes are mapped to semitones 0–11 (A=0, Bb=1, B=2, C=3, …, Ab=11). Chord formulas are stored as semitone interval arrays from root (e.g., major = `[4, 7]`). This enables enharmonic equivalents and chord note computation.

### Measure Minimum Width

Each staff calculates a `minWidth` — the minimum pixel width required to render its notes without overlap. Formulas:

- **Classical/guitar tab**: `describeEndX + noteCount × MIN_NOTE_WIDTH`
- **Vocal**: `describeEndX + max(noteCount × MIN_NOTE_WIDTH, lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)`

where `describeEndX` is the x-offset where the clef/key-signature/time-signature area ends (stored as `#describeEndX` and updated every time `#spaceElements()` runs).

The `minWidth` is dispatched upward via a `STAFF_EVENTS.STAFF_MIN_WIDTH` custom event with `detail: { minWidth: number }`. `<music-measure>` listens for these events, takes the maximum `minWidth` across all child staves, and sets `this.style.flex = "${flexGrow} 1 ${maxMinWidth}px"`. Using `minWidth` directly as the flex-basis guarantees the measure is always wide enough for notes not to bleed into adjacent measures. The calculation logic lives in `rules/staffWidth.ts`.

### Responsive Layout

`<music-composition>` uses CSS flexbox with `flex-wrap: wrap`, so measures reflow into rows automatically as the container width changes. All layout-sensitive rendering reacts to this via a `ResizeObserver` on the composition element, which schedules a redraw via `#scheduleRedraw()` (debounced to one `requestAnimationFrame`).

On each redraw cycle the following happen in order:

1. **Note x-spacing** — each staff's `StaffResizeObserver` (on the staff container element) calls `onStaffResize()`, which re-spaces notes proportionally to the new container width and re-emits `STAFF_EVENTS.NOTES_POSITIONED`.
2. **Beams** — redrawn as part of `#renderNotes()` / `onStaffResize()` inside each staff.
3. **Connectors** — `#redrawConnectors()` in `composition.ts` redraws the vertical bar lines that group staves in a measure.
4. **Clef visibility** — `#updateClefVisibility()` in `composition.ts` runs in the **same `requestAnimationFrame`** as connectors, immediately after. It snapshots all measure `getBoundingClientRect().top` values in one pass (before any DOM writes), then compares each to the previous to determine which measure is first in its row (tolerance 5 px), and sets `showClef` (a JS property, not an HTML attribute) on each child staff accordingly. Connectors are absolutely-positioned SVG and do not affect document flow, so no layout settling is needed between the two operations. Staves default to `showClef = true`, so standalone staves always show the clef.

**Why `:host { display: block; width: 100% }` on `<music-composition>` matters**: `display: block` alone is not sufficient when the element is placed inside a flex or grid container (e.g. `justify-content: center`). Without an explicit `width`, the element sizes to its max-content as a flex item. For a `flex-wrap: wrap` flex container, browsers compute max-content as the width of the widest single child — so the composition becomes only as wide as its widest measure, causing all other measures to wrap to separate rows. `width: 100%` ensures the composition fills the full parent width in all layout contexts (block, flex, grid), so the `ResizeObserver` fires reliably and measures can share rows as intended. The `.composition-wrapper` inside the shadow DOM has `margin: 0 auto` to center its 900px-capped content when the host is wider than 900px.

**Invariant to maintain**: any change that affects which measure is "first in a row" (resize, dynamic measure insertion/removal) must eventually trigger `#scheduleRedraw()` so `#updateClefVisibility()` re-runs.

#### Responsive Layout Rules

- When adding or changing this code, make sure the `*.browser-test.ts` files still pass. And add new ones when adding new logic

## Important Types (`types/theory.ts`)

```ts
type DurationType =
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

| Map                       | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `durationToFlagCountMap`  | Duration → flag count (eighth=1, sixteenth=2, …)      |
| `noteSemitoneMap`         | Note name → semitone (0–11)                           |
| `semitoneNoteMap`         | Semitone → note name array (handles enharmonics)      |
| `ChordSemitoneMap`        | Chord type string → interval array                    |
| `ChordSemitoneMapAliases` | Alias normalization (`'m'` → `'min'`, `''` → `'maj'`) |
| `durationToFactor`        | Duration → relative x-spacing factor                  |

`utils/consts.ts` holds custom element tag name constants and event name constants (e.g., `STAFF_EVENTS`).

## Staff Class Hierarchy

```
StaffElementBase              (staffBase.ts)         — shadow DOM, staff lines, resize observer, template method lifecycle
├── StaffClassicalElementBase (staffClassicalBase.ts) — key sig, time sig, note Y-coords, beam/note rendering
│   ├── StaffTrebleElement    (staffTreble/staffTreble.ts)   — treble clef, Y-coord map, key sig Y-coords
│   ├── StaffBassElement      (staffBass/staffBass.ts)       — bass clef, Y-coord map, key sig Y-coords
│   └── StaffVocalElement     (staffVocal/staffVocal.ts)     — vocal clef, 6 voice types, lyrics integration
└── StaffGuitarTabElement     (staffGuitarTab/staffGuitarTab.ts) — 6-line tab staff, no music theory
```

`StaffElementBase` — abstract base that owns the shadow DOM, staff line construction, `staffContainer` (div), `transcribeContainer` (SVG), and `staffResizeObserver`. All three are `protected readonly` so subclasses can access them. Implements `connectedCallback` (builds staff lines, appends containers, wires `slotchange`, starts resize observer) and `disconnectedCallback`. Uses a template method pattern — subclasses implement:

- `get staffLineCount(): number` — number of staff lines (e.g. 5 for classical)
- `onConnectedCallback()` — called after containers are appended; add clef/key/time SVG here
- `onHandleSlotChange(event)` — called when slotted notes/chords change
- `onStaffResize()` — called when staff container width changes
- `onDisconnectedCallback()` — cleanup (e.g. disconnect mutation observers)

`StaffClassicalElementBase` — thin orchestrator on top of `StaffElementBase`. Wires together the rules layer (`rules/accidentalRules.ts`, `rules/beamRules.ts`) and the SVG layer (`utils/svgCreator/`) to produce rendered staves. Owns key/time signature rendering, note Y-coordinate lookup, and resize-aware note spacing. Abstract methods subclasses must implement:

- `get yCoordinates(): YCoordinates` — map of note+octave string to pixel Y
- `get octaves(): Octave[]` — octave search order when no octave is specified
- `getKeyYCoordinates(): { useSharps, coordinates }` — Y positions for key sig accidentals
- `get clefSvg(): string` — raw SVG string for the clef symbol

Rendering flow (classical staves):

1. `render()` (in `StaffElementBase`) sets shadow DOM HTML: wrapper div, slot, CSS
2. `connectedCallback()` (in `StaffElementBase`) builds staff lines, appends `staffContainer` and `transcribeContainer`, wires `slotchange`, starts `staffResizeObserver`
3. `onConnectedCallback()` (in `StaffClassicalElementBase`) calls `#buildDescribe()`: injects clef SVG, key signature, and time signature into `transcribeContainer`
4. `slotchange` fires → `onHandleSlotChange()` → `#renderNotes()` converts notes/chords to SVG
5. Notes spaced by duration factor
6. `BeamCreator` connects beamed note groups (eighths, sixteenths, etc.)
7. Staff dispatches a `STAFF_EVENTS.STAFF_MIN_WIDTH` event after each render with `detail: { minWidth }` — the minimum pixel width needed for the measure to render without note overlap

## Drag Handlers (`utils/`)

Editable staves (`<music-staff-treble editable>`) support two drag interactions, coordinated by a single `pointerdown` listener in `StaffClassicalElementBase`. The listener uses `e.composedPath()[0]` to hit-test the SVG target:

- **Notehead hit** (`.head` or `.head-hit-zone` class) → **PitchDragHandler** (vertical)
- **Everything else** (stem, flag, body) → **NoteTimingDragHandler** (horizontal)

### NoteTimingDragHandler (`noteTimingDragHandler.ts`)

Horizontal drag-and-drop to reorder notes/chords in time. Creates a fixed-position clone that follows the pointer and a dashed drop indicator between elements. Two modes controlled by the `managed` attribute:

- **Unmanaged**: reorders light DOM children directly on drop.
- **Managed**: only dispatches `note-reorder` event with `{ fromIndex, toIndex }` — the framework (e.g. React) updates state.

Events: `note-drag-start` (cancelable), `note-reorder`, `note-drag-end`.

### PitchDragHandler (`pitchDragHandler.ts`)

Vertical drag on noteheads to change pitch. Snaps to valid staff Y positions from the staff's `yCoordinates` map. Shows a tooltip with the note transition (e.g. "D4 → F4"). For chords, drags a single notehead and prevents snapping to a pitch already occupied by another note in the chord.

During drag, calls a live preview callback that updates the element's `value` attribute and triggers a full `#renderNotes()` re-render (stem direction, beams, Y positioning all recalculate). On drop, dispatches `note-pitch-change` with `PitchChangeDetail: { element, elementIndex, chordNoteIndex, fromNote, toNote }` where notes are `LetterOctave` (e.g. "F5").

**Important**: note values must include the octave digit (e.g. "C6" not "C") so that `noteToYCoordinate` resolves to the correct staff position. Without the octave, it falls back to the octave search order and may pick the wrong octave.

### SVG Hit Zones

Each note SVG includes a transparent `head-hit-zone` ellipse (1.5× the notehead size) rendered behind the visible `.head` ellipse. This enlarged invisible target makes noteheads easier to click for pitch dragging. Both classes are checked by `PitchDragHandler.isNoteheadTarget()`.

## Known Incomplete Areas

- **`staffGuitarTab.ts`**: `onDisconnectedCallback` is still an empty stub
- **Chord value parsing**: Parsing a chord name from the `value` attribute into constituent notes is partially implemented
- **Accidentals during pitch drag**: Pitch drag snaps to natural staff positions only; accidental changes (sharp/flat) need a separate mechanism
- **Standalone degraded features**: Some capabilities (minimum-width-driven flex layout, attribute inheritance) require a parent `<music-measure>` or `<music-composition>` and will be silently absent when elements are used in isolation. Ledger lines (both main-note and grace-note) require a staff-provided Y position, and grace-note accidentals fall back to suffix-driven rendering (no key-signature suppression) outside a staff

## Build & Test

- Package name: `@one-step-at-a-time/web-components`
- Module type: ESM (`"type": "module"`)
- Test runner: Jest via Nx (`@nx/jest`)
- Run tests: `npx nx test web-components`

## Storybook Stories

Story files are colocated with their component using the `<component>.stories.ts` naming convention (e.g. `src/note/note.stories.ts`). The exception is feature-level utilities: `src/utils/svgCreator/beams.stories.ts`.

**Existing story files:**
`chord`, `composition`, `measure`, `note`, `rest`, `staffBass`, `staffGuitarTab`, `staffTreble`, `staffVocal`, `utils/svgCreator/beams`

**Standard imports:**

```ts
import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../index'; // registers all custom elements
import { DURATIONS, NOTES, OCTAVES } from '../utils'; // for control option arrays
```

**Meta shape:** `title: 'Components/...'`, `tags: ['autodocs']`, optional global `render`/`argTypes`/`args`.

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

- Pattern: import `'../staffTreble/index'` to register the staff, create staff → set `TIME_SIG` → `slot.assignedElements = () => [...]` → `slot.dispatchEvent(new Event('slotchange'))`
- Use `jest.spyOn(console, 'warn')` to assert overflow/validation conditions (the library uses `console.warn` exclusively for non-fatal validation issues)

`staffClassicalBase.test.ts` retains only **cross-cutting** `StaffClassicalElementBase` behaviour that doesn't belong to a single element type (currently: measure overflow/validation).

**Per-staff test scope** — each staff's own `*.test.ts` file is intentionally narrow:

| File                              | What to test here                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `staffTreble/staffTreble.test.ts` | Treble clef present in shadow DOM; note Y-coordinates match treble `yCoordinates` map |
| `staffBass/staffBass.test.ts`     | Bass clef present; note Y-coordinates match bass `yCoordinates` map                   |
| `staffVocal/staffVocal.test.ts`   | Vocal clef / voice-type variants; lyrics rendering and positioning                    |

### Browser tests

- Runner: Playwright (`@playwright/test`), completely separate from Jest
- Config: `playwright.config.ts` matches `*.browser-test.ts`; starts Vite dev server on port 5179
- Existing files: `measure/measure.browser-test.ts`, `staffTreble/staffTreble.browser-test.ts`, `composition/composition.browser-test.ts`
- **Add a browser test when the feature involves**: responsive resizing, CSS `style.flex` values, `getBoundingClientRect()` / `getBBox()` geometry, multi-measure coordination, or `ResizeObserver`-driven layout changes
- Helpers in `test-fixtures/helpers.ts`: `waitForRedrawCycle`, `waitForStaffNotesPositioned`, `buildStandaloneTrebleStaff`, `buildComposition`, `resizeHost`
- All DOM interaction via `page.evaluate()` (runs in real browser); all assertions are async

---

## Conventions

- Use TypeScript `#` private fields for custom element internals
- Guard all custom element registration with `typeof window !== 'undefined'`
- Use `SVG_NS` in `src/utils/consts.ts` with `createElementNS()` for all SVG creation
- CSS custom properties: `--flex-staff-basis`, `--flex-staff-minw` for layout overrides
- `currentColor` used in SVG so staff color inherits from CSS
- **Always run `npx nx format:write` after every batch of file edits or new files** — do not skip this step
- Use full words when defining variables, functions, and classes; no abbreviations or uncommon acronyms
- In test files (both `*.browser-test.ts` and `*.test.ts`), always use strong types from `types/theory.ts` and `types/elements.ts` instead of primitives — e.g. `DurationType` instead of `string` for durations, `Note` instead of `string` for note values like `'C'`
