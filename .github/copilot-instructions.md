# GitHub Copilot Instructions — StatsApp

These instructions apply to every Copilot session in this repository.

## Project Structure

- **Frontend**: Angular (standalone components, Angular Material, Chart.js) under `frontend/stats-app/`
- **Backend**: Spring Boot (Java 21, Lombok, Jackson) under `backend/`
- **Data model**: `Statistic` has a `datasets: List<Dataset>` field; each `Dataset` has a `label` and `dataPoints: List<DataPoint>`.
- **Storage**: JSON files on disk, managed by `StatisticRepository`.

## Versioning Rule — ALWAYS apply when implementing a new feature

Whenever a new feature is implemented, **all three of the following must be done in the same change**:

1. **Bump the patch version** in `frontend/stats-app/src/app/app.html`:
   ```html
   <span class="version">vX.Y.Z</span>
   ```

2. **Bump the patch version** in `backend/build.gradle`:
   ```groovy
   version = 'X.Y.Z-SNAPSHOT'
   ```

3. **Add a new entry** to `CHANGELOG.md` at the repository root, following this format:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - Description of the feature.

   ### Changed
   - Any related changes to version strings or configuration.
   ```

> Bug fixes do not require a version bump unless they change observable behaviour.

## CORS

Allowed HTTP methods in `WebConfig.java` are `GET, POST, PUT, DELETE, PATCH`.  
If a new HTTP method is introduced, add it to the `allowedMethods` list.

## Code style

- Use Angular standalone components (no `NgModule`).
- Prefer `signal()` and `computed()` for reactive local state.
- Use `FormBuilder` with `{updateOn: 'blur'}` for forms.
- Backend: use Lombok (`@Getter`, `@Setter`, `@RequiredArgsConstructor`, etc.) — avoid boilerplate.
- Backend endpoints live under `/api/stats/**`.

