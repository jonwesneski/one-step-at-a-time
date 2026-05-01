# Plan: Playwright responsive-layout browser tests for `@one-step-at-a-time/web-components`

## Context

The web-components package implements responsive music notation rendering with four interlocking layout concerns, all triggered by a debounced redraw cycle in `composition.ts:154-165`:

1. **Note x-spacing on resize** — `onStaffResize()` → `#spaceElements()` in [staffClassicalBase.ts:853-920](packages/web-components/src/staffClassicalBase.ts), driven by per-staff `StaffResizeObserver`.
2. **Beams** — redrawn inside `#renderNotes()` / `onStaffResize()`.
3. **Connectors** — `#redrawConnectors()` in [composition.ts:167-202](packages/web-components/src/composition/composition.ts), runs in the first `requestAnimationFrame`.
4. **Clef visibility** — `#updateClefVisibility()` in [composition.ts:220-239](packages/web-components/src/composition/composition.ts), runs in the **second nested rAF** after measure `getBoundingClientRect().top` values settle, so it can detect row boundaries via 5px tolerance and toggle each staff's `showClef` JS property.

Existing Jest tests run in jsdom with a no-op `ResizeObserver` mock ([jest.setup.ts](packages/web-components/jest.setup.ts)) — they cannot exercise real layout, ResizeObserver, or `getBoundingClientRect`. The four concerns above need a **real browser** to verify.

The intended outcome: a Playwright test suite, one file per element/concern colocated next to the element source, running against a Vite-served fixture that loads `src/index.ts` to register all custom elements. Tests use numeric assertions on bounding rects and JS properties (no screenshots). Wired as a separate Nx `browser-test` target so the existing fast Jest run is untouched.

## Files to add

```
packages/web-components/
├── playwright.config.ts                NEW — Playwright config (chromium only, baseURL=localhost:5179)
├── vite.config.ts                      NEW — minimal Vite config used by the test fixture server
├── project.json                        NEW — defines the `browser-test` Nx target
├── test-fixtures/
│   ├── index.html                      NEW — host page; imports ../src/index.ts to register elements
│   └── helpers.ts                      NEW — waitForRedrawCycle, waitForStaffNotesPositioned, buildComposition, resizeHost
└── src/
    ├── composition/composition.browser-test.ts   NEW — concerns 3 + 4 + debounce
    └── staffTreble/staffTreble.browser-test.ts   NEW — concerns 1 + 2
```

No files modified. `jest.config.cjs` is untouched (Jest's default `testMatch` does not pick up `*.browser-test.ts`). `nx.json` is untouched (project-level `project.json` extends the inferred targets).

### Strict separation between Jest and Playwright

Jest and Playwright are **separate Nx targets that never run together**:

- `nx test web-components` — runs Jest only. Picks up `*.test.ts` / `*.spec.ts` (Jest default `testMatch`). Does **not** pick up `*.browser-test.ts`.
- `nx browser-test web-components` — runs Playwright only. Picks up `*.browser-test.ts` (explicit `testMatch: /.*\.browser-test\.ts$/` in `playwright.config.ts`). Does **not** pick up `*.test.ts`.
- Neither target depends on the other. `nx run-many -t test` does not trigger `browser-test`, and vice versa.
- Files colocate in `src/` per your rule, but each runner sees only its own glob.

## Infrastructure details

### `test-fixtures/index.html`

Empty body with a `#host` div. The only meaningful content is `<script type="module" src="../src/index.ts"></script>`, which Vite transpiles on the fly and triggers every `customElements.define(...)` side-effect import.

### `vite.config.ts`

Minimal — only sets `server.port = 5179`, `strictPort: true`. Vite's project root is `packages/web-components/test-fixtures/` (passed via `vite serve test-fixtures` in the Playwright `webServer.command`). Default `server.fs.allow` includes the workspace, so `../src/index.ts` resolves.

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.browser-test\.ts$/,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5179', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite serve test-fixtures --port 5179 --strictPort',
    url: 'http://localhost:5179/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: __dirname,
  },
});
```

### `test-fixtures/helpers.ts`

Three helpers:

- **`waitForRedrawCycle(page)`** — `page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => queueMicrotask(r)))))`. Use after every resize / DOM mutation that goes through `#scheduleRedraw()`.
- **`waitForStaffNotesPositioned(page, hostSelector='#host')`** — listens for the bubbling+composed `staff-notes-positioned` event on `#host`, 2s timeout. Tighter than rAF for staff-level changes.
- **`buildComposition(page, { measureCount, notesPerMeasure, duration, hostWidth, staffType })`** — clears `#host`, sets its width, builds `music-composition > music-measure × N > music-staff-* > music-note × M` with cycling pitches.
- **`resizeHost(page, width)`** — sets `#host` width and awaits `waitForRedrawCycle`.

Tests run `page.goto('/')` once per spec (custom elements register), then build their own DOM via `page.evaluate()`. `setContent()` would discard the registry — avoided.

## Nx target wiring

Add `packages/web-components/project.json`:

```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "@one-step-at-a-time/web-components",
  "sourceRoot": "packages/web-components/src",
  "projectType": "library",
  "targets": {
    "browser-test": {
      "executor": "nx:run-commands",
      "cache": true,
      "inputs": [
        "default",
        "^default",
        "{projectRoot}/playwright.config.ts",
        "{projectRoot}/vite.config.ts",
        "{projectRoot}/test-fixtures/**/*"
      ],
      "outputs": [
        "{projectRoot}/playwright-report",
        "{projectRoot}/test-results"
      ],
      "options": {
        "command": "playwright test",
        "cwd": "packages/web-components"
      },
      "dependsOn": ["typecheck"]
    }
  }
}
```

`dependsOn: ["typecheck"]` — Vite serves `src/` directly, so no `^build` is needed; we just want TS errors to fail the run. Existing inferred `test`, `build`, `typecheck`, `lint`, `storybook`, `build-storybook` targets continue to work — Nx merges inferred + explicit.

## Test files

### `src/composition/composition.browser-test.ts` — concerns 3, 4, debounce

References [composition.ts:154-239](packages/web-components/src/composition/composition.ts).

**Every test follows the resize-then-assert pattern**: build at width A → wait → capture baseline → `resizeHost(page, widthB)` → wait → capture again → assert what changed.

1. **Connectors stay anchored to staves across a resize** — one measure with treble + bass + 2 quarter notes each. Capture baseline at 800px: `.connectors-overlay` `<path>` bbox top ≈ treble top, bbox bottom ≈ bass bottom (within 4px). Resize to 500px. Re-capture: connector path bbox `x` position has shifted (notes-area moved), but bbox top/bottom still align with the staves' new top/bottom within tolerance.
2. **Connectors redraw when a third staff is added** — start at 800px with treble + bass. Capture baseline connector bbox height. In `page.evaluate()`, append `music-staff-vocal` to the measure. `waitForRedrawCycle`. Assert new bbox height > baseline. Then resize to 500px and reassert the height-anchoring invariant from case 1.
3. **Clef visibility flips across a width-driven row reflow** — 6 measures × 1 treble × 4 quarters. Start at 1600px (one row): capture each staff's `showClef`; assert only staff[0] is true. Resize to 400px (multi-row): `waitForRedrawCycle`; group measures by `getBoundingClientRect().top` (5px tolerance); assert each row's first staff is true and the rest false.
4. **Clef visibility flips back on widening** — continue from case 3 at 400px. Resize to 1600px. Reassert only staff[0] is true. This is the round-trip of case 3.
5. **`#scheduleRedraw()` debounces a burst of resizes into one redraw** — start at 800px, settle. Inside `page.evaluate()`, install a `MutationObserver` on `.connectors-overlay` and reset its count. Fire 5 synchronous width changes (`#host.style.width = ...`) in a tight loop. `waitForRedrawCycle` once. Assert mutation cycles ≤ 2 (one clear + one append batch), proving 5 resizes collapsed into 1 redraw.

### `src/staffTreble/staffTreble.browser-test.ts` — concerns 1, 2

References [staffClassicalBase.ts:853-922](packages/web-components/src/staffClassicalBase.ts) and [staffBase.ts:43-49](packages/web-components/src/staffBase.ts).

**Every test follows the resize-then-assert pattern**: build at width A → wait → capture baseline → `resizeHost(page, widthB)` → wait → capture again → assert.

1. **Note left-edges remain strictly monotonic across a resize** — standalone treble + 8 quarter notes. Capture `getBoundingClientRect().left` for each `music-note` at 800px; assert strictly increasing. Resize to 400px. Re-capture; assert still strictly increasing.
2. **Note spacing scales down proportionally on 800 → 400px** — same setup; record per-pair deltas `d[i] = left[i+1] - left[i]` at 800px; resize to 400px and record `d_small[i]`. Assert `d_small[i] < d[i]` for all `i` AND ratios `d_small[i] / d[i]` are consistent across pairs (±15%; absolute ratio is not 0.5 because `MIN_NOTE_WIDTH` adds a fixed component — see `staffClassicalBase.ts:874-882`).
3. **Beams persist across a resize for eighth notes** — 4 eighth notes. At 800px: query the staff's shadow root for the beams container SVG; assert ≥ 1 `<path>` with `getBBox().width > 10`. Resize to 400px. Reassert ≥ 1 `<path>` still exists with width > 10 (beams didn't disappear).
4. **No beams for quarter notes, before or after resize** — 4 quarter notes. Assert beams container has 0 `<path>` children at 800px. Resize to 400px. Assert still 0 `<path>` children.
5. **Beams reposition and rescale on resize** — 4 eighth notes. Capture beam path 0's `getBBox()` at 800px. Resize to 400px. Assert new bbox `x` differs from baseline by > 1px AND bbox `width` ratio (new/old) matches container ratio (400/800 = 0.5) within 20%.

### Why no separate `staffBass` / `staffVocal` / `staffGuitarTab` files (yet)

Bass/vocal share `StaffClassicalElementBase` verbatim — concerns 1 and 2 are tested once via treble (the canonical case). `staffGuitarTab` is incomplete per [CLAUDE.md](packages/web-components/CLAUDE.md) (Y-coords not mapped, `onDisconnectedCallback` is a stub) — defer until that lands. Add per-staff browser-test files later only if a staff develops responsive behavior unique to it.

## Reused existing utilities

- [src/index.ts](packages/web-components/src/index.ts) — single import target for the fixture; registers all custom elements.
- [STAFF_EVENTS.NOTES_POSITIONED](packages/web-components/src/utils/consts.ts) (`'staff-notes-positioned'`, bubbles+composed) — used by `waitForStaffNotesPositioned`.
- Existing Jest test pattern of `document.createElement('music-composition')` + `appendChild` — reused inside `page.evaluate()` for `buildComposition`.

## Verification

One-time setup:

```
pnpm add -D -F @one-step-at-a-time/web-components @playwright/test
pnpm exec playwright install chromium
```

Run:

```
npx nx run web-components:browser-test
```

Debug:

```
npx nx run web-components:browser-test --skip-nx-cache -- --ui
npx nx run web-components:browser-test -- --debug
npx playwright show-trace packages/web-components/test-results/<…>/trace.zip
```

Validate Jest is unaffected (test count should match prior baseline):

```
npx nx test web-components
```

After every batch of file edits, per [packages/web-components/CLAUDE.md](packages/web-components/CLAUDE.md): `npx nx format:write`.

Expected first-run result: 10 passing tests across two files in chromium, plus a `playwright-report/` directory.

## Risks

- **`flex-basis: 280px` may not always force 2 rows at 400px** — tests that need a specific row count should set `--flex-staff-basis` explicitly on `#host` rather than assume a row count, or assert against the row layout actually observed via `getBoundingClientRect().top` grouping.
- **`MIN_NOTE_WIDTH` fixed offset** — already accounted for: case 2 of staffTreble asserts pair-ratio consistency, not an absolute ratio.
- **Vite resolving `../src/index.ts` from `test-fixtures/`** — default `server.fs.allow` includes the workspace; if a future Vite version tightens this, add `server: { fs: { allow: ['..'] } }` to `vite.config.ts`.
- **Chromium-only initially** — Firefox/WebKit `ResizeObserver` timing differs; add other engines after the suite is stable.
