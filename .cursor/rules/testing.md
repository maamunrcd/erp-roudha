# Testing Standards

- Add tests for new behavior and bug fixes when practical.
- Prioritize user-facing behavior over implementation details.
- Cover loading, error, and empty states for async UI.
- Keep tests deterministic and avoid unnecessary mocking depth.
- Place shared test utilities in reusable helpers.
- Use clear arrange-act-assert structure.
- Prefer small focused tests over large brittle scenarios.
- Do not merge changes that introduce new type or lint errors in touched areas.
