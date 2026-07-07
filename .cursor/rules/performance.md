# Performance Standards

- Minimize rerenders by keeping state local to where it is needed.
- Split large UI trees into smaller reusable components.
- Use memoization (`useMemo`, `useCallback`, `React.memo`) only when beneficial.
- Prefer lazy loading for heavy, route-level, or rarely used modules.
- Debounce expensive or high-frequency user inputs.
- Keep derived values computed, not duplicated in state.
- Avoid expensive computations in render paths.
- Use stable keys for list rendering; never use random keys.
- Consider virtualization for very large lists/tables.
- Profile before and after optimization for non-trivial changes.
