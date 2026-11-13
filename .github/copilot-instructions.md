# GitHub Copilot Instructions — StatsApp

These instructions apply to every Copilot session in this repository.

## Project Structure

- **Frontend**: Angular (standalone components, Angular Material, Chart.js) under `frontend/stats-app/`
- **Backend**: Spring Boot (Java 21, Lombok, Jackson) under `backend/`
- **Data model**: `Statistic` has a `datasets: List<Dataset>` field; each `Dataset` has a `label` and
  `dataPoints: List<DataPoint>`.
- **Storage**: JSON files on disk, managed by `StatisticRepository`.

## Versioning Rule — ALWAYS apply when implementing a new feature

Whenever a new feature is implemented, **all three of the following must be done in the same change**:

**Version per change set, not per prompt.** Related follow-up requests, refinements, and
UI adjustments to the same unreleased feature share one patch version and one changelog
entry. If that change set already has a version bump, keep the version and update its
existing changelog entry instead of bumping again. Start a new patch version for a
separate feature/change set, a change after release, or when explicitly requested.

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
   - Any related changes.
   ```

> Bug fixes do not require a version bump unless they change observable behaviour.

Do not touch other md files like README.md or SCORESABER-DATA-FLOW.md or create new ones unless told to.

## CORS

Allowed HTTP methods in `WebConfig.java` are `GET, POST, PUT, DELETE, PATCH`.  
If a new HTTP method is introduced, add it to the `allowedMethods` list.

## Code style

- Use Angular standalone components (no `NgModule`).
- Prefer `signal()` and `computed()` for reactive local state.
- Use `FormBuilder` with `{updateOn: 'blur'}` for forms.
- Backend: use Lombok (`@Getter`, `@Setter`, `@RequiredArgsConstructor`, etc.) — avoid boilerplate.
- Backend endpoints live under `/api/stats/**`.

## Architecture

Backend is managed in Domain Driven Design.

- ch.lonelyporter.statsapp.domain: Domain Classes
- ch.lonelyporter.statsapp.exception: Exceptions
- ch.lonelyporter.statsapp.integration: Connections to outside services, like the scoresaber API
- ch.lonelyporter.statsapp.persistence: Storing and Loading Data
- ch.lonelyporter.statsapp.service: Services
- ch.lonelyporter.statsapp.web: APIs for frontend

## Tools

For One-off Tools like Migration Scripts you should use the tools folder. The Tools Folder is not version controlled and
should never be. Don't add new scripts in there and remove them from gitignore, tools are always ignored.

## Naming Conventions

Test should all follow the following concept: 