# ADR-001: Self-Rendering Notes with Staff-Controlled Positioning

## Status

Accepted

## Date

2026-03-22

## Context

Currently, `<music-note>` and `<music-chord>` elements are invisible when inside a staff. The staff reads their data via `slotchange`, creates entirely new SVGs in an internal `#notesContainer`, and appends those. The original slotted elements serve only as data sources.

This architecture blocks:

- **Event handling**: Framework event listeners (click, drag, pointer events) on `<music-note>` do nothing because the visible SVG is a different element inside the staff's shadow DOM.
- **Drag-and-drop reordering**: Users cannot drag the element they see.
- **Inline editing**: Clicking a note to change pitch requires the click target to be the semantic element.

## Decision

Refactor so that each `<music-note>` and `<music-chord>` renders its own SVG in its shadow DOM, even when inside a staff. The staff computes layout parameters and communicates them to child elements via **JS properties** (not HTML attributes), then positions the elements via inline styles.

### Key design choices:

1. **JS properties (not HTML attributes)** for staff-to-note communication (`stemUp`, `stemExtension`, `noFlags`, `staffYCoordinates`). This keeps the public HTML API clean -- users only write `value` and `duration`. The staff has direct references to slotted elements and sets properties programmatically.

2. **`requestAnimationFrame` debounce** in property setters. The staff sets 3-4 properties in sequence per note; the debounce coalesces these into a single re-render per frame.

3. **Beam overlay stays in staff shadow DOM**. Beams span multiple notes and require centralized coordinate computation. They remain as SVG polygons in a `#beamsContainer` SVG element, replacing the old `#notesContainer`.

4. **Slotted element positioning via inline styles**. The staff sets `element.style.position = 'absolute'`, `element.style.left`, and `element.style.top` on each slotted note/chord. Shadow DOM `::slotted` CSS sets `position: absolute` as a base.

5. **Custom events with `composed: true`**. Notes dispatch `note-click`, `note-pointerdown`, `note-pointerup` events that cross shadow DOM boundaries, enabling framework integration.

## Consequences

### Positive

- Native DOM events (click, pointer, drag) land directly on `<music-note>` elements
- Framework event handlers (React `onClick`, Vue `@click`, etc.) work naturally
- Enables drag-and-drop reordering and inline pitch editing
- Public HTML API unchanged -- no new attributes leak into markup
- `onStaffResize()` only updates positions (no re-render of note SVGs)

### Negative

- Staff must set properties on light DOM elements it doesn't own (cross-component coupling)
- Two render paths in `<music-chord>`: standalone (slot-based) vs in-staff (`staffYCoordinates`-driven)
- Note re-renders are async (rAF) -- staff cannot read rendered SVG dimensions synchronously after setting properties

### Neutral

- Beam rendering logic unchanged
- `BeamsBuilder` / `BeamRenderer` API unchanged
- Stem direction computation unchanged

## Files Affected

| File                           | Change                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `src/utils/svgCreator/note.ts` | Extract `computeYHeadOffset`, export `STAFF_Y_PADDING`               |
| `src/note/note.ts`             | Self-rendering with staff-controlled JS properties, custom events    |
| `src/chord/chord.ts`           | Self-rendering with `staffYCoordinates` property, custom events      |
| `src/staffBase.ts`             | Add `::slotted` positioning styles                                   |
| `src/staffClassicalBase.ts`    | Core refactor: JS properties + inline styles instead of SVG creation |
| `src/types/elements.ts`        | Updated interfaces with staff-internal properties                    |
| `src/types.d.ts`               | React JSX declarations with event handler types                      |
