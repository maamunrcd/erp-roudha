# Styling Standards

- Prefer the existing project styling approach first (currently CSS Modules and styled-components).
- If Tailwind is added later, use it consistently and avoid mixed ad-hoc patterns.
- Avoid inline styles unless dynamic values cannot be expressed cleanly.
- Build reusable UI primitives in `src/components/ui`.
- Keep spacing, typography, and sizing consistent with existing design tokens/patterns.
- Use mobile-first responsive styles.
- Maintain high contrast and accessible focus states.
- Avoid deeply nested style overrides.
- Keep styling colocated with components unless shared globally by design.
- Do not mix conflicting styling approaches in the same component.
