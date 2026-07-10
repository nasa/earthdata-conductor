This is a ChatGPT/MCP app built with Skybridge. ALWAYS use the `skybridge` skill when planning or updating the codebase.
Always update SPEC.md with design decisions, architecture changes, and updates as we evolve the codebase.
Always write comprehensive unit and component tests (using Vitest) for all new code, helpers, and components. Run the test suite (`npm run test`) to verify all tests pass as part of the verification cycle.
Always create a new feature branch when doing feature changes and follow a Pull Request model, using the pull request template in `.github/pull_request_template.md`. Do not commit directly to `main`.
Componentize and do not make incredibly large components for an MCP UI.
Always run the linter and formatter (using `npm run lint` or `npm run lint:fix`) to ensure there are no styling or static analysis errors.
Never change biome.json, actually fix the issues.