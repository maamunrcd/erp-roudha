# API Standards

- Keep API calls out of UI components.
- Add API integrations in `src/app/common/api-services/` or feature `api/` modules.
- Keep endpoint constants/config centralized in app config files.
- Type all request and response contracts.
- Use async/await with clear error handling.
- Normalize API errors into predictable UI-facing shapes.
- Keep data transformation logic outside presentational components.
- Ensure loading/error/empty states are represented in consuming UI.
- Preserve existing auth and token refresh behavior unless explicitly requested.
