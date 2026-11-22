# PR feedback analysis: percussion staff (`feat/percussion`)

Two review comments. I checked both against the code and both are correct. I recommend implementing both.

| #   | File                   | Issue                                                      | Decision      |
| --- | ---------------------- | ---------------------------------------------------------- | ------------- |
| 1   | `note/note.ts`         | A standalone note doesn't redraw when `instrument` changes | **Implement** |
| 2   | `staffNotationBase.ts` | Trill accidentals still draw on a percussion staff         | **Implement** |

---

## 1. A standalone note doesn't redraw when `instrument` changes

> Changing instrument on a connected standalone note dispatches NOTE_Y_CHANGE and returns without rendering. With no staff listening, changing snare to crash updates the getter to an x notehead but leaves the visible ellipse unchanged; removing the instrument has the same problem. Render standalone notes here, as the later notehead-change branch already does.

### Decision: implement

### Why

- **The bug is real.** In `attributeChangedCallback`, the branch for `note` / `octave` / `instrument` / `stem-direction` dispatches `NOTE_Y_CHANGE` and returns without calling `render()`. On a staff, that's fine: the staff catches the event and redraws the note. A standalone note has no staff, so nothing redraws it.
- **Other branches already handle this.** The layout branch further down (the one that handles `notehead`) ends with `if (!this.closest(STAFF_TAGS)) { this.render(); }`. My change put `instrument` in the branch that doesn't do this.
- **It affects something visible.** `instrument` sets the notehead, and a standalone note does draw its notehead. Switching snare → crash, or removing the instrument, should swap the ellipse and the x head, but the old head stays.
- **The repo cares about standalone use.** The package `CLAUDE.md` says elements should work standalone wherever that makes sense.
- **`note` and `octave` have the same gap, and it's older than this PR.** A standalone note shows the accidental from its own spelling (`note="F#"` draws a sharp). Changing `note` from `F` to `F#` on a standalone note leaves the drawing stale for the same reason. Fixing the shared branch fixes this too, at no extra cost.

### Implementation plan

- In `packages/web-components/src/note/note.ts`, in the `note` / `octave` / `instrument` / `stem-direction` branch of `attributeChangedCallback`, add the same standalone render the layout branch has, between the dispatch and the `return`:

  ```ts
  if (!this.closest(STAFF_TAGS)) {
    this.render();
  }
  ```

  Do it in the branch itself, not by moving `instrument` into the layout branch, so `note`/`octave` get fixed too. On a staff nothing changes, because the staff still redraws the note through `batchUpdate()`.

- Chords need no change. A chord's `MutationObserver` already watches each child note's `instrument` attribute, and the chord redraws itself.
- Tests in `packages/web-components/src/note/note.test.ts`, in the existing `instrument` block:
  - A standalone note with `instrument="snare"` draws an `ellipse` head. After switching to `crash` it draws a `path` (x) head. After removing `instrument` it draws an ellipse again.
  - A standalone note changing `note="F"` → `note="F#"` gains a sharp in its shadow DOM. This covers the older `note` gap.

---

## 2. Trill accidentals still draw on a percussion staff

> withoutAccidentals() does not cover resolvedTrillPitch: percussion notes and chords with trill-accidental="sharp" still draw a sharp above the trill sign, and trill-note="F#" still draws one beside the auxiliary note. Clear the resolved trill pitch's accidental on unpitched staves in both resolution paths, before rendering and footprint calculation.

### Decision: implement

### Why

- **The bug is real.** On a percussion staff, the forced C-major key only removes accidentals that come from the key. `resolveTrillPitch` (`rules/trillRules.ts`) also returns:

  - the `trill-accidental` value unchanged, when the attribute is set
  - the accidental spelled in `trill-note` (`F#` → sharp)

  Neither goes through `computeNoteAccidentals`, so `withoutAccidentals()` never sees them.

- **It breaks a promise the PR makes.** `isPitched = false` is documented in the class comment and in `CLAUDE.md` as "hides every accidental". At the moment that's true for noteheads, grace notes and trill-finish notes, but not for trills.
- **Both paths need it, and the order matters.** Notes (`#buildVoiceRenderState`, around L2263) and chords (`#resolveChordTrillPitch`, around L4981) each set `resolvedTrillPitch`. That value is then read by:

  - the note/chord when drawing the accidental above the sign
  - `#computeWrittenTrillFootprints`, whose width comes from `computeWrittenTrillNoteWidth(accidental)`
  - the written auxiliary notehead, around L5264–5290

  If the accidental is cleared where `resolvedTrillPitch` is assigned, all of these see the cleared value. The footprint is computed after the assignment, so spacing will no longer leave room for a sharp that isn't drawn.

- **It's small and fits the existing pattern.** One pure helper and two call sites, the same shape as `withoutAccidentals`. A trill on a drum part is unusual, but the alternative is a staff that hides some accidentals and not others.

### Implementation plan

1. **Pure helper**, in `packages/web-components/src/rules/trillRules.ts`, next to `resolveTrillPitch`:

   ```ts
   export function withoutTrillAccidental(
     pitch: ResolvedTrillPitch | null
   ): ResolvedTrillPitch | null {
     return pitch === null ? null : { ...pitch, accidental: null };
   }
   ```

   It keeps `letter`, `written` and `octave`, so a `trill-note` is still drawn as a written notehead at its staff position, just without the sharp or flat.

2. **One place where the staff applies it**, in `packages/web-components/src/staffNotationBase.ts`:
   - Add a private `#trillPitchForStaff(pitch)` that returns `this.isPitched ? pitch : withoutTrillAccidental(pitch)`.
   - Wrap both assignments in it: `noteElement.resolvedTrillPitch = …` (note path) and the chord path, by applying it to the return of `#resolveChordTrillPitch`.
   - Both run before `#computeWrittenTrillFootprints` and before the note/chord renders, so no other ordering change is needed.
3. **Optional:** when `trill-accidental` is set on a note in a percussion staff, warn once that it's ignored there. This matches the `<music-clef>` warning. It's only worth doing if we want authors told about it; the review doesn't ask for it.
4. **Tests**:
   - `packages/web-components/src/rules/trillRules.test.ts`: `withoutTrillAccidental` clears the accidental, keeps `letter`/`written`/`octave`, and passes `null` through.
   - `packages/web-components/src/staffPercussion/staffPercussion.test.ts`, each paired with a `<music-staff>` control as the existing tests are:
     - a note with `trill trill-accidental="sharp"` → `resolvedTrillPitch.accidental` is `null` (the control keeps `'sharp'`)
     - a note with `trill trill-note="F#"` → `written: true` and `accidental: null`
     - a chord with `trill trill-accidental="flat"` → `accidental: null`
5. **Docs**: in the `isPitched` paragraph of `packages/web-components/CLAUDE.md`, add trill accidentals to the list of accidentals it hides.

### Files affected

- `packages/web-components/src/rules/trillRules.ts` (+ test)
- `packages/web-components/src/staffNotationBase.ts`
- `packages/web-components/src/staffPercussion/staffPercussion.test.ts`
- `packages/web-components/CLAUDE.md`
