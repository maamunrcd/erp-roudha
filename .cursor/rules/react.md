# React Standards

- Use functional components only.
- Prefer hooks-first architecture and composition over inheritance.
- Keep components focused and single responsibility.
- Keep component files under 200 lines when practical.
- Keep custom hooks under 150 lines when practical.
- Avoid unnecessary `useEffect`; derive state when possible.
- Use early returns for conditional branches in render logic.
- Avoid nested ternaries in JSX.
- Keep JSX clean by extracting repeated blocks into reusable components.
- Avoid prop drilling by lifting state thoughtfully or using context/store where appropriate.
- Memoize only when profiling or clear rerender risks justify it.
- Always handle loading, error, and empty UI states.
