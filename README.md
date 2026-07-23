# One Step at a Time

Music notation creator.
app names: one at a time, rest in time, walk in time, walk in the park

## Packages

| Package                              | Description                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| `@one-step-at-a-time/web-components` | Web Components library for rendering music notation (SVG-based) |
| `apps/ui`                            | Vite + TanStack Router app consuming the design system          |

## Development

### Install dependencies

```bash
pnpm install
```

### Start the UI dev server

```bash
nx run ui:dev
```

## Commands

All commands run from the **monorepo root**.

### Build

```bash
# Build all projects
nx run-many -t build

# Build a specific project
nx run @one-step-at-a-time/web-components:build
nx run @one-step-at-a-time/ui:build
```

### Lint

```bash
# Lint all projects
nx run-many -t lint

# Lint a specific project
nx run @one-step-at-a-time/web-components:lint
nx run @one-step-at-a-time/ui:lint
```

### Test

```bash
# Test all projects
nx run-many -t test

# Test a specific project
nx run @one-step-at-a-time/web-components:test

# responsive testing tests
npx nx run web-components:browser-test
```

OR

```bash
nx run packages/web-components:test
```

### Format

```bash
# Format all files in the repo
npx nx format:write

# Format only files you've changed (affected by current branch vs main)
npx nx format:write --base=main

# Format only uncommitted changes
npx nx format:write --uncommitted
```

### Type check

```bash
# Type check all projects
nx run-many -t typecheck

# Type check a specific project
nx run @one-step-at-a-time/web-components:typecheck
```

### Affected only (useful in CI)

```bash
nx affected -t build lint test
```

## Hot reload limitation with Web Components

`@one-step-at-a-time/web-components` uses the browser's [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) API (`customElements.define()`). This has a known incompatibility with hot module replacement (HMR):

> The browser does not allow a custom element tag name to be registered more than once. Calling `customElements.define('music-note', ...)` a second time throws a `NotSupportedError`.

When you edit a web-components source file:

1. Vite detects the change and recompiles ✓
2. The updated module is sent to the browser ✓
3. HMR silently fails — the custom element is already registered ✗
4. **A manual refresh (Cmd+R / Ctrl+R) is required to see the change**

This is a fundamental Web Components constraint, not a tooling issue.
