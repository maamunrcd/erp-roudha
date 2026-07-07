# TypeScript Standards

- Keep TypeScript `strict` mode enabled.
- Do not use `any`; use explicit interfaces, types, or generics.
- Prefer interfaces for object contracts shared across modules.
- Keep shared domain types in `src/types` or `src/features/<feature>/types`.
- Type API request/response payloads explicitly.
- Avoid broad type assertions; narrow safely with guards.
- Prefer `unknown` over `any` when handling untrusted input.
- Keep function signatures small, explicit, and predictable.
- Reuse utility types instead of duplicating similar type definitions.
- Avoid exporting internal-only types unless needed by consumers.
