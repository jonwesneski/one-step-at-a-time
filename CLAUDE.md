## Monorepo Structure

Nx-managed monorepo with two apps and one shared library.

```
one-step-at-a-time/
├── apps/
│   └── ui/              # Vite + TanStack Router app — primary UI consuming web-components
├── packages/
│   └── web-components/  # Framework-agnostic Web Components library for SVG music notation
├── tools/               # debugging/experimental utilities
├── jest.config.js
└── tsconfig.base.json
```

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# Code Style

- Always use curly braces around conditional branches (`if`, `else`, `else if`), even for single-line bodies

# Code Comments

- **Default: no comments.** Delete anything that restates what the code already says.
- **Never point-in-time.** No references to refactors, migrations, "used to be X", ticket/PR/issue numbers, or author names/initials — that belongs in commit messages, not source.
- **Design-decision comments are allowed**, phrased differently depending on scope:
  - **Single-file rationale** (a non-obvious constraint, derivation, or workaround local to one file): state the constraint tersely, with brief rationale if needed. No discussion of alternatives rejected. `packages/web-components/src/utils/notationDimensions.ts`'s per-constant JSDoc (value + one-line derivation) is the model to match.
  - **Cross-file design decisions** (mechanisms that coordinate across multiple files — batching, event dispatch/orchestration, redraw/trigger sequencing): rationale **and** a brief note of alternatives rejected are allowed, since maintainers touching any one of the files need the full picture.
  - **Polymorphic/OOP-shape comments** (interfaces, abstract/base classes, inheritance hierarchies explaining why a shape exists): always terse — state the constraint only, never alternatives rejected, even when the hierarchy spans multiple files.
- **"This may change" / forward-looking design notes are fine** — flagging that a decision is provisional and may be revisited is not point-in-time in the disallowed sense.
- **Verified-true but undiagnosed constraints are allowed if flagged honestly** — e.g. "import order matters here; root cause not diagnosed" is acceptable when the constraint is real and load-bearing. Don't silently omit it, and don't fabricate a false explanation.
- **JSDoc comment blocks with `@param`/`@returns`** are only expected on symbols that are part of a package's actual public npm surface (e.g. `packages/web-components`'s custom elements, exported types, `types.d.ts` JSX declarations) — not on internal-only exports. Elsewhere, treat JSDoc under the same "only if non-obvious" rule as regular comments — no boilerplate `@param` restating the type/name.
- **TODO comments are allowed only if they describe a real future constraint/trigger** (e.g. "revisit when X ships Y"). Vague deferrals ("may revisit this", "todo: fix later") are not allowed.
- **No verbosity for its own sake** — keep comments as short as the point requires; 1-2 concise sentences. Length is fine when the subject is genuinely complex, not otherwise.
- **eslint-disable justification comments follow the same bar** — state the actual reason the rule doesn't apply, not a content-free assertion (`-- it's okay`).

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:

- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool
