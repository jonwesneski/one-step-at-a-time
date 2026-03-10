## Monorepo Structure

```
music-notation/
├── packages/
│   └── design-system/
│       └── src/               # All source code
│           ├── index.ts       # Entry point (import order matters)
│           ├── types.d.ts     # React JSX declarations for custom elements
│           ├── composition.ts
│           ├── measure.ts
│           ├── staffBase.ts   # Abstract base for all staff types
│           ├── staffTreble.ts
│           ├── staffBass.ts
│           ├── staffGuitarTab.ts  # Incomplete — Y-coords not yet mapped
│           ├── note.ts
│           ├── chord.ts
│           ├── types/
│           │   ├── theory.ts  # Core music theory types
│           │   └── elements.ts
│           └── utils/
│               ├── consts.ts        # Lookup maps and constants
│               ├── theoryHelpers.ts # Chord/note computation
│               ├── svgCreator.ts    # All SVG rendering
│               └── index.ts
├── jest.config.js   # Nx-based Jest config
└── tsconfig.base.json
```

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:

- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool
