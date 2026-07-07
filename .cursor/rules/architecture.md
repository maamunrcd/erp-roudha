# Architecture Standards

- Use feature-oriented organization for new modules:
  - `src/features/<feature>/components`
  - `src/features/<feature>/hooks`
  - `src/features/<feature>/api`
  - `src/features/<feature>/types`
  - `src/features/<feature>/utils`
  - `src/features/<feature>/pages`
  - `src/features/<feature>/store`
- Keep existing `src/app` behavior intact; migrate incrementally, not by rewrite.
- Keep cross-feature primitives in shared locations (`src/components/ui`, `src/hooks`, `src/utils`, `src/types`, `src/lib`, `src/services`, `src/store`).
- Maintain clear separation of concerns: UI, state, API, and utilities.
- Prefer predictable naming and file structure to reduce AI context overhead.
- Avoid duplicate modules and parallel implementations.
- Keep files focused and cohesive for easier maintenance and generation.
