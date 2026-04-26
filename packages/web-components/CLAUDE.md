# Music Notation — Project Context

## Overview

`@one-step-at-a-time/web-components` is a Web Components library for rendering music notation in the browser. All musical elements are custom HTML elements built with TypeScript and SVG. There are no framework dependencies — it runs natively in any browser or framework (React types are declared for JSX compatibility).

## Composable and Standalone Elements

Elements are designed to be used **in isolation or composed together**. You do not need the full hierarchy to use any given element:

- `<music-note>` and `<music-chord>` can be used standalone, outside any staff, measure, or composition
- `<music-staff-treble>`, `<music-staff-bass>`, `<music-staff-guitar-tab>`, and `<music-staff-vocal>` can be used without a `<music-measure>` or `<music-composition>`
- `<music-measure>` can be used without a `<music-composition>`

Some features may be unavailable or degraded when elements are used outside their normal parent context (for example, attribute inheritance from parent elements won't apply, and layout-driven sizing from busyness scores requires a `<music-measure>` parent). The goal is to keep that list of exceptions small.

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

### Busyness Score

Each staff calculates a **busyness score** — a numeric measure of how many notes (and their relative durations) are in the staff. The score is dispatched upward via a `STAFF_EVENTS.BUSYNESS_SCORE` custom event. `<music-measure>` listens for these events from its child staves and maps the score to CSS `flex` properties (`flex: <score> 1 <basis>`), so busier measures naturally take up more horizontal space in a composition layout. The score calculation logic lives in `utils/busynessScore.ts`.

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
type LetterNote =
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

`StaffClassicalElementBase` — implements classical notation logic on top of `StaffElementBase`: key/time signature rendering, note Y-coordinate lookup, note/chord SVG rendering with beams, resize-aware note spacing. Abstract methods subclasses must implement:

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
7. Staff dispatches a `STAFF_EVENTS.BUSYNESS_SCORE` event after each render

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
- **Standalone degraded features**: Some capabilities (busyness-driven flex layout, attribute inheritance) require a parent `<music-measure>` or `<music-composition>` and will be silently absent when elements are used in isolation

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
- In test files, always use strong types from `types/theory.ts` and `types/elements.ts` instead of primitives — e.g. `DurationType` instead of `string` for durations, `LetterOctave` instead of `string` for note+octave values like `'C4'`
