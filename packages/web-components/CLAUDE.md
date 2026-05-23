# Music Notation — Project Context

## Overview

`@one-step-at-a-time/web-components` is a Web Components library for rendering music notation in the browser. All musical elements are custom HTML elements built with TypeScript and SVG. There are no framework dependencies — it runs natively in any browser or framework (React types are declared for JSX compatibility).

## Composable and Standalone Elements

Elements are designed to be used **in isolation or composed together**. You do not need the full hierarchy to use any given element:

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
│           │   └── beamRules.ts
│           │   ├── staffWidth.ts         # Measure min-width calculation
│           ├── types/
│           │   ├── theory.ts  # Core music theory types
│           │   └── elements.ts
│           └── utils/
│               ├── consts.ts             # Custom element tag/event name constants
│               ├── notationDimensions.ts # Pixel sizing and spacing constants
│               ├── theoryConsts.ts       # Duration/semitone lookup maps
│               ├── theoryHelpers.ts      # Chord/note computation
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

## Key Utility Maps (`utils/theoryConsts.ts`)

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
- **Standalone degraded features**: Some capabilities (minimum-width-driven flex layout, attribute inheritance) require a parent `<music-measure>` or `<music-composition>` and will be silently absent when elements are used in isolation

## Build & Test

- Package name: `@one-step-at-a-time/web-components`
- Module type: ESM (`"type": "module"`)
- Test runner: Jest via Nx (`@nx/jest`)
- Run tests: `npx nx test web-components`

## Conventions

- Use TypeScript `#` private fields for custom element internals
- Guard all custom element registration with `typeof window !== 'undefined'`
- Use `SVG_NS = 'http://www.w3.org/2000/svg'` with `createElementNS()` for all SVG creation
- CSS custom properties: `--flex-staff-basis`, `--flex-staff-minw` for layout overrides
- `currentColor` used in SVG so staff color inherits from CSS
- **Always run `npx nx format:write` after every batch of file edits or new files** — do not skip this step
- Use full words when defining variables, functions, and classes; no abbreviations or uncommon acronyms
- In test files (both `*.browser-test.ts` and `*.test.ts`), always use strong types from `types/theory.ts` and `types/elements.ts` instead of primitives — e.g. `DurationType` instead of `string` for durations, `LetterOctave` instead of `string` for note+octave values like `'C4'`
