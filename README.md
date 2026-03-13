# music-notation

Music notation creator.
app names: one at a time, rest in time, walk in time, walk in the park

## Packages

| Package                       | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `@rest-in-time/design-system` | Web Components library for rendering music notation (SVG-based) |
| `my-app` (`apps/ui`)          | Next.js app consuming the design system                         |

## Development

### Install dependencies

```bash
pnpm install
```

### Start the UI dev server

```bash
nx run apps/ui:dev
```

OR

```bash
nx run my-app:dev
```

Uses Turbopack and resolves `@rest-in-time/design-system` directly from source via tsconfig paths — no pre-build of the design system needed.

## Commands

All commands run from the **monorepo root**.

### Build

```bash
# Build all projects
nx run-many -t build

# Build a specific project
nx run @rest-in-time/design-system:build
nx run my-app:build
```

OR

```bash
nx run packages/design-system:build
nx run apps/ui:build
```

### Lint

```bash
# Lint all projects
nx run-many -t lint

# Lint a specific project
nx run @rest-in-time/design-system:lint
nx run my-app:lint
```

OR

```bash
nx run packages/design-system:lint
nx run apps/ui:lint
```

### Test

```bash
# Test all projects
nx run-many -t test

# Test a specific project
nx run @rest-in-time/design-system:test
```

OR

```bash
nx run packages/design-system:test
```

### Type check

```bash
# Type check all projects
nx run-many -t typecheck

# Type check a specific project
nx run @rest-in-time/design-system:typecheck
```

### Affected only (useful in CI)

```bash
nx affected -t build lint test
```

## Watching design-system during development

The default dev setup (Turbopack + tsconfig paths) resolves design-system source directly so no watch process is needed.

If you ever need to run the TypeScript compiler in watch mode instead (e.g. to validate the compiled `dist/` output continuously):

```bash
# Terminal 1
nx run @rest-in-time/design-system:watch-deps

# Terminal 2
nx run my-app:dev
```

Or directly with tsc:

```bash
cd packages/design-system
pnpm exec tsc --build tsconfig.lib.json --watch
```

## Hot reload limitation with Web Components

`@rest-in-time/design-system` uses the browser's [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) API (`customElements.define()`). This has a known incompatibility with hot module replacement (HMR):

> The browser does not allow a custom element tag name to be registered more than once. Calling `customElements.define('music-note', ...)` a second time throws a `NotSupportedError`.

When you edit a design-system source file:

1. Turbopack detects the change and recompiles (~13ms) ✓
2. The updated module is sent to the browser ✓
3. HMR silently fails — the custom element is already registered ✗
4. **A manual refresh (Cmd+R / Ctrl+R) is required to see the change**

This is a fundamental Web Components constraint, not a tooling issue. The fast compile time keeps the friction low.
