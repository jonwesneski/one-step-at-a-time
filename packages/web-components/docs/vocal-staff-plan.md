# Vocal Staff Implementation Plan

## Overview

Add a single configurable `<music-staff-vocal>` custom element that supports all six standard voice types via a `voice` attribute. The component extends `StaffClassicalElementBase` and adds lyrics rendering support unique to vocal notation.

```html
<music-staff-vocal voice="tenor" keySig="G" mode="major" time="4/4" editable>
  <music-note value="C4" duration="quarter"></music-note>
  <music-note value="D4" duration="quarter"></music-note>
</music-staff-vocal>
```

---

## Voice Types & Configurations

| Voice         | Attribute Value     | Clef     | Written Range | Clef Reuse                                                         |
| ------------- | ------------------- | -------- | ------------- | ------------------------------------------------------------------ |
| Soprano       | `soprano` (default) | Treble   | C4–C6         | Identical to treble staff                                          |
| Mezzo-Soprano | `mezzo`             | Treble   | A3–C6         | Treble + 2 lower ledger lines                                      |
| Alto          | `alto`              | Treble   | F3–A5         | Treble + 4 lower ledger lines                                      |
| Tenor         | `tenor`             | Treble-8 | C3–C5         | New clef; same pixel layout as treble, notes shifted down 1 octave |
| Baritone      | `baritone`          | Bass     | A2–A4         | Identical to bass staff                                            |
| Bass          | `bass`              | Bass     | E2–E4         | Identical to bass staff                                            |

### Y-Coordinate Maps

Each voice type gets its own Y-coordinate map. The coordinate system follows the existing pattern: 5px per staff position, staff lines at Y=30 (top) to Y=70 (bottom), middle line at Y=50.

#### Soprano (Treble Clef)

```
C6: 10, B5: 15, A5: 20, G5: 25,
F5: 30, E5: 35, D5: 40, C5: 45, B4: 50, A4: 55, G4: 60, F4: 65, E4: 70,
D4: 75, C4: 80
```

Octaves: `[4, 5, 6]`

#### Mezzo-Soprano (Treble Clef, Extended Low)

```
C6: 10, B5: 15, A5: 20, G5: 25,
F5: 30, E5: 35, D5: 40, C5: 45, B4: 50, A4: 55, G4: 60, F4: 65, E4: 70,
D4: 75, C4: 80, B3: 85, A3: 90
```

Octaves: `[3, 4, 5, 6]`

#### Alto (Treble Clef, Extended Low)

```
A5: 20, G5: 25,
F5: 30, E5: 35, D5: 40, C5: 45, B4: 50, A4: 55, G4: 60, F4: 65, E4: 70,
D4: 75, C4: 80, B3: 85, A3: 90, G3: 95, F3: 100
```

Octaves: `[3, 4, 5]`

#### Tenor (Treble-8 Clef — Octave Transposing)

Same pixel positions as treble, but note names are one octave lower. A note visually on the second line from bottom reads as G3 (not G4).

```
C5: 10, B4: 15, A4: 20, G4: 25,
F4: 30, E4: 35, D4: 40, C4: 45, B3: 50, A3: 55, G3: 60, F3: 65, E3: 70,
D3: 75, C3: 80
```

Octaves: `[3, 4, 5]`

#### Baritone (Bass Clef)

```
E4: 10, D4: 15, C4: 20, B3: 25,
A3: 30, G3: 35, F3: 40, E3: 45, D3: 50, C3: 55, B2: 60, A2: 65, G2: 70,
F2: 75, E2: 80
```

Octaves: `[2, 3, 4]`

#### Bass (Bass Clef)

```
E4: 10, D4: 15, C4: 20, B3: 25,
A3: 30, G3: 35, F3: 40, E3: 45, D3: 50, C3: 55, B2: 60, A2: 65, G2: 70,
F2: 75, E2: 80
```

Octaves: `[2, 3, 4]`

### Key Signature Arrays

Key signature accidental positions follow the same transposition pattern as the Y-coordinate maps.

**Treble-based voices (soprano, mezzo, alto):**

- Sharps: `['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4']`
- Flats: `['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4']`

**Tenor (treble-8 — shifted down 1 octave):**

- Sharps: `['F4', 'C4', 'G4', 'D4', 'A3', 'E4', 'B3']`
- Flats: `['B3', 'E4', 'A3', 'D4', 'G3', 'C4', 'F3']`

**Bass-based voices (baritone, bass):**

- Sharps: `['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2']`
- Flats: `['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2']`

### Clef SVGs

- **Soprano, Mezzo, Alto**: Reuse the existing treble clef SVG path from `staffTreble.ts`
- **Tenor (Treble-8)**: Same treble clef SVG path with an added `<text>8</text>` element positioned below the clef. The container height increases from 60px to ~72px to accommodate the "8".
- **Baritone, Bass**: Reuse the existing bass clef SVG path from `staffBass.ts`

---

## Phase 1 — Core Vocal Staff Component

### Files to Create

- `src/staffVocal/staffVocal.ts` — The `StaffVocalElement` class

### Files to Modify

- `src/index.ts` — Add `import './staffVocal/staffVocal'`
- `src/types.d.ts` — Add `music-staff-vocal` JSX declaration
- `src/types/elements.ts` — Add `StaffVocalElementType` if needed for type references

### Implementation Details

#### `StaffVocalElement` class

```
class StaffVocalElement extends StaffClassicalElementBase
```

**Attributes:**

- `voice` — `'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass'` (default: `'soprano'`)
- Inherits: `keysig`, `mode`, `time`, `editable`, `managed`

**Static data** (all `static #private`):

- Six Y-coordinate map objects (one per voice type)
- Six octave arrays
- Treble clef SVG string (reused for soprano/mezzo/alto)
- Treble-8 clef SVG string (tenor)
- Bass clef SVG string (reused for baritone/bass)
- Key signature sharp/flat arrays for treble-based, tenor, and bass-based voices

**Abstract method implementations:**

1. `get yCoordinates()` — Switch on `this.voice` to return the correct map
2. `get octaves()` — Switch on `this.voice` to return the correct array
3. `get clefSvg()` — Switch on `this.voice` to return treble, treble-8, or bass SVG
4. `getKeyYCoordinates()` — Switch on voice type category (treble-based / tenor / bass-based) to select the correct sharp/flat arrays, then apply the same major/minor key logic from treble/bass staves

**`observedAttributes`:**

Override to add `'voice'` to the list from the parent class. When `voice` changes, trigger a full re-render (clef, key sig, time sig, and all notes need to update).

**Custom element registration:**

```typescript
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get('music-staff-vocal')) {
    customElements.define('music-staff-vocal', StaffVocalElement as any);
  }
}
```

### Tasks

- [x] Create `src/staffVocal/staffVocal.ts` with the `StaffVocalElement` class
- [x] Implement all six Y-coordinate maps
- [x] Implement all six octave arrays
- [x] Create the treble-8 clef SVG (treble path + "8" text element)
- [x] Implement `getKeyYCoordinates()` with all three key sig array sets
- [x] Handle `voice` attribute changes (re-render on change)
- [x] Register `<music-staff-vocal>` custom element
- [x] Add import to `src/index.ts`
- [x] Add `music-staff-vocal` to `src/types.d.ts` JSX declarations
- [x] Run `npx nx format:write`
- [x] Run `npx nx test web-components`

---

## Phase 2 — Lyrics Support

Lyrics are the primary feature that distinguishes a vocal staff from an instrumental one. Syllables are horizontally aligned with their corresponding notes, placed below the staff.

### Notation Conventions

- Each **syllable** is centered horizontally under its note
- **Hyphens** (`-`) connect syllables of multi-syllable words (e.g., "beau - ti - ful")
- **Extender lines** (underscore/horizontal line) indicate a syllable held across multiple notes (melisma)
- **Multiple verses** stack vertically below the staff: verse 1 closest, verse 2 below, etc.
- When two voices share a staff, lyrics for the upper voice go above and lower voice below

### Proposed API

#### Option A — Lyrics as attribute(s)

```html
<music-staff-vocal voice="soprano" lyrics="Hap-py birth-day to_ you">
  <music-note value="C5" duration="eighth"></music-note>
  <music-note value="C5" duration="eighth"></music-note>
  <music-note value="D5" duration="quarter"></music-note>
  <music-note value="C5" duration="quarter"></music-note>
  <music-note value="F5" duration="quarter"></music-note>
  <music-note value="E5" duration="half"></music-note>
</music-staff-vocal>
```

Convention: `-` separates syllables within a word, spaces separate words, `_` indicates extender/melisma. Multiple verses via `lyrics-2`, `lyrics-3` attributes or a JSON array.

#### Option B — Lyrics as child elements

```html
<music-staff-vocal voice="soprano">
  <music-note value="C5" duration="eighth" lyric="Hap"></music-note>
  <music-note value="C5" duration="eighth" lyric="-py"></music-note>
  <music-note value="D5" duration="quarter" lyric="birth"></music-note>
  ...
</music-staff-vocal>
```

Each note carries its own lyric syllable. Hyphens and extenders are derived from syllable relationships.

#### Option C — Separate `<music-lyrics>` element

```html
<music-staff-vocal voice="soprano">
  <music-note value="C5" duration="eighth"></music-note>
  <music-note value="C5" duration="eighth"></music-note>
  ...
  <music-lyrics verse="1">Hap-py birth-day to_ you</music-lyrics>
  <music-lyrics verse="2">Hap-py birth-day dear_ friend</music-lyrics>
</music-staff-vocal>
```

**Recommendation**: Option C offers the cleanest separation of concerns — notes and lyrics are independent, multi-verse is natural, and it follows the existing slot pattern. The `<music-lyrics>` element could use a named slot (`<slot name="lyrics">`).

### Rendering Logic

1. Parse lyric text into syllables (split on `-` and spaces, interpret `_` as extender)
2. Map syllables 1:1 to note elements by index
3. Render each syllable as an SVG `<text>` element positioned below the staff
4. X-position: centered on the corresponding note's X-position (from `#spaceElements()`)
5. Y-position: below the staff bottom line + padding (~Y=90 for verse 1, +15px per additional verse)
6. Draw hyphens between syllables that are part of the same word
7. Draw extender lines under held syllables

### Layout Impact

- Staff bottom margin increases from 30px to ~60px (1 verse) or more (multi-verse)
- The `transcribeContainer` SVG viewBox height may need to grow
- `#spaceElements()` needs to also position lyric text elements

### Tasks

- [x] Create `src/staffVocal/lyrics.ts` — `MusicLyricsElement` custom element (or lyrics rendering utility)
- [x] Design lyric syllable parsing logic (hyphen splitting, extender detection)
- [x] Add a named `<slot name="lyrics">` to the vocal staff shadow DOM
- [x] Implement horizontal alignment of syllables to note X-positions
- [x] Render hyphens between syllables of multi-syllable words
- [x] Render extender lines for melisma syllables
- [x] Support multi-verse stacking (verse 1, 2, 3... with increasing Y offset)
- [x] Adjust staff bottom margin/viewBox to accommodate lyrics
- [x] Register `<music-lyrics>` custom element (if using Option C)
- [x] Add `music-lyrics` to `src/types.d.ts` JSX declarations
- [x] Write tests for lyric parsing and alignment

---

## Phase 3 — Vocal-Specific Markings (Future)

These are not in scope for the initial implementation but are documented here for planning.

### Breath Marks

- Comma-like symbol or tick mark placed above the staff between notes
- Indicates where the singer should breathe
- Could be an attribute on a note (`breath-after`) or a standalone element

### Dynamics Placement

- Dynamics (p, f, mf, etc.) go below the staff but above the lyrics
- This creates a vertical ordering: expression marks > staff > dynamics > lyrics
- May require a dedicated rendering layer between staff and lyrics

### Melisma Slurs

- Curved line over a group of notes sung to one syllable
- Visually identical to instrumental slurs but semantically tied to lyrics
- Would connect notes that share a single lyric syllable

### Recitative Notation

- Speech-like singing with flexible rhythm
- Sometimes notated with stemless noteheads or "x" noteheads
- Could be a `style="recitative"` attribute on the staff or individual notes

### Tasks

- [ ] Implement breath mark rendering (comma symbol or tick above staff)
- [ ] Add `breath-after` attribute or `<music-breath>` element
- [ ] Design vertical layout ordering (staff > dynamics > lyrics)
- [ ] Create dynamics layer rendering (p, f, mf, ff, etc. below staff)
- [ ] Implement melisma slur drawing (curved lines over multi-note syllables)
- [ ] Add slur styling that ties to lyric data
- [ ] Add recitative mode to staff (`recitative` attribute)
- [ ] Implement stemless notehead rendering for recitative
- [ ] Add recitative styling/behavior to note elements
- [ ] Write tests for breath marks, dynamics, slurs, and recitative

---

## Architecture Summary

```
StaffElementBase                    (staffBase.ts)
├── StaffClassicalElementBase       (staffClassicalBase.ts)
│   ├── StaffTrebleElement          (staffTreble/staffTreble.ts)      — existing
│   ├── StaffBassElement            (staffBass/staffBass.ts)          — existing
│   └── StaffVocalElement           (staffVocal/staffVocal.ts)        — NEW
│       ├── voice="soprano"         → treble clef, C4–C6
│       ├── voice="mezzo"           → treble clef, A3–C6
│       ├── voice="alto"            → treble clef, F3–A5
│       ├── voice="tenor"           → treble-8 clef, C3–C5
│       ├── voice="baritone"        → bass clef, A2–A4
│       └── voice="bass"            → bass clef, E2–E4
└── StaffGuitarTabElement           (staffGuitarTab/staffGuitarTab.ts) — existing (incomplete)

MusicLyricsElement                  (staffVocal/lyrics.ts)            — NEW (Phase 2)
```

### New Files

| File                           | Phase | Purpose                                                   |
| ------------------------------ | ----- | --------------------------------------------------------- |
| `src/staffVocal/staffVocal.ts` | 1     | `StaffVocalElement` class and custom element registration |
| `src/staffVocal/lyrics.ts`     | 2     | `MusicLyricsElement` class or lyrics rendering utility    |

### Modified Files

| File                    | Phase | Change                                                          |
| ----------------------- | ----- | --------------------------------------------------------------- |
| `src/index.ts`          | 1     | Add vocal staff import                                          |
| `src/types.d.ts`        | 1, 2  | Add JSX declarations for `music-staff-vocal` and `music-lyrics` |
| `src/types/elements.ts` | 1     | Add `StaffVocalElementType` if needed                           |
