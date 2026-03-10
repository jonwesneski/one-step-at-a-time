# Music Notation — Project Context

## Overview

`@rest-in-time/design-system` is a Web Components library for rendering music notation in the browser. All musical elements are custom HTML elements built with TypeScript and SVG. There are no framework dependencies — it runs natively in any browser or framework (React types are declared for JSX compatibility).

## Custom Element Hierarchy

```
<music-composition>          — composition.ts
  └─ <music-measure>         — measure.ts
      ├─ <music-staff-treble>   — staffTreble.ts
      ├─ <music-staff-bass>     — staffBass.ts
      └─ <music-staff-guitar-tab>  — staffGuitarTab.ts
          ├─ <music-note>        — note.ts
          └─ <music-chord>       — chord.ts
              └─ <music-note>    (children)
```

Attributes flow **down**: Composition → Measure → Staff → Note. Each level can override parent settings.

## Key Architecture Concepts

### Shadow DOM

All components use shadow DOM (`attachShadow({ mode: 'open' })`). Style encapsulation is intentional. Slots connect light DOM notes/chords to shadow DOM staff renderers.

### SVG Coordinate System

- Y-coordinates are looked up from static maps keyed by note name + octave (e.g., `'C4'`, `'G5'`)
- Each staff subclass defines its own `noteYCoordinateMap` for its clef range
- X-spacing is derived from `durationToFactor`: whole=1.0, half=0.5, quarter=0.25, etc.
- SVG rendering lives entirely in `utils/svgCreator.ts`

### Semitone System

Notes are mapped to semitones 0–11 (A=0, Bb=1, B=2, C=3, …, Ab=11). Chord formulas are stored as semitone interval arrays from root (e.g., major = `[4, 7]`). This enables enharmonic equivalents and chord note computation.

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
type BeatsInMeasure = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
```

`Chord` is a discriminated union of `NormalChord` and slash chords.

## Key Utility Maps (`utils/consts.ts`)

| Map                       | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `durationToFlagCountMap`  | Duration → flag count (eighth=1, sixteenth=2, …)      |
| `noteSemitoneMap`         | Note name → semitone (0–11)                           |
| `semitoneNoteMap`         | Semitone → note name array (handles enharmonics)      |
| `ChordSemitoneMap`        | Chord type string → interval array                    |
| `ChordSemitoneMapAliases` | Alias normalization (`'m'` → `'min'`, `''` → `'maj'`) |
| `durationToFactor`        | Duration → relative x-spacing factor                  |

## Staff Base Class (`staffBase.ts`)

`StaffElementBase extends HTMLElement` — abstract, never instantiated directly.

Key abstract methods subclasses must implement:

- `getYCoordinate(note: string): number` — pixel Y for a note name
- `getKeyYCoordinates(keySig, mode): { sharps, flats }` — Y positions for key sig accidentals

Rendering flow:

1. `render()` builds staff lines, clef SVG, key signature, time signature
2. `slotchange` event fires when notes/chords are added as children
3. Notes converted to SVG via `createNoteSvg2()` from `svgCreator.ts`
4. Notes spaced by duration factor
5. `BeamCreator` connects beamed note groups (eighths, sixteenths, etc.)

## Known Incomplete Areas

- **`staffGuitarTab.ts`**: 6-line tab staff exists but `getYCoordinate()` is not implemented
- **Stem direction**: Always defaults to stem-up; no automatic stem direction logic yet
- **Chord value parsing**: Parsing a chord name from the `value` attribute into constituent notes is partially implemented
- **Beam re-spacing**: Partial logic exists with a debugger statement left in

## Build & Test

- Package name: `@rest-in-time/design-system`
- Module type: ESM (`"type": "module"`)
- Test runner: Jest via Nx (`@nx/jest`)
- Run tests: `npm test` inside `packages/design-system/` or via root `jest.config.js`
- No test files exist yet (`.spec.ts` files)

## Conventions

- Use TypeScript `#` private fields for custom element internals
- Guard all custom element registration with `typeof window !== 'undefined'`
- Use `SVG_NS = 'http://www.w3.org/2000/svg'` with `createElementNS()` for all SVG creation
- CSS custom properties: `--flex-staff-basis`, `--flex-staff-minw` for layout overrides
- `currentColor` used in SVG so staff color inherits from CSS
- Import order in `index.ts` matters — maintain dependency order
