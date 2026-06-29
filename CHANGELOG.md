# Changelog

All notable changes to this project are documented in this file.

## [2.1.5] - 2026-06-22

### Added

- Color picker in the "Manage Datasets" form, allowing users to set a custom color for each dataset.

## [2.1.4] - 2026-06-11

### Added

- Support for increment syntax in "Add Data Point" form: entering `+<number>` (e.g., `+10`) now increments the latest
  value by that amount instead of adding an exact value.

### Changed

- Removed separate "Increase Latest Value" tab; functionality is now integrated into "Add Data Point" form.

### UI Improvements

- Consolidated "Add Data Point" and "Increase Latest Value" tabs, reducing visual clutter in the Edit View (now 3 tabs
  instead of 4).
- Added tooltip to value input field explaining the `+<number>` syntax.

## [2.1.3] - 2026-06-11

### Added

- Per-dataset `filled` flag to control whether the chart area under a dataset line is rendered.
- Dataset management UI checkbox to toggle fill on/off per dataset.

### Changed

- Added persistence for dataset `filled` in backend/frontend models with backward compatibility for existing JSON files
  where the field is absent (defaults to `false`).
- Frontend app version in `frontend/stats-app/src/app/app.html` updated to `v2.1.3`.
- Backend project version in `backend/build.gradle` updated to `2.1.3-SNAPSHOT`.

### UI Improvements

- Dataset action buttons (move, rename, delete) are now hidden by default and only appear on hover, reducing visual
  clutter in the dataset list.

## [2.1.2] - 2026-06-10

### Added

- Datapoints are now persisted sorted by date (oldest first, newest last) to keep chart line connections correct after
  point edits.

## [2.1.1] - 2026-06-02

### Added

- Clicking a data point on the chart in the edit view now switches to the "Edit / Delete Point" tab and prefills the
  form with the selected point's dataset, date, and value.

## [2.1.0] - 2026-05-18

### Added

- Dataset ordering via an `index` field. Datasets are now displayed sorted by index.
- Up/down reorder buttons in the dataset management UI to change dataset display order.
- New backend endpoint `PUT /api/stats/{id}/datasets/reorder` to persist dataset order.

### Fixed

- Page refresh on production no longer returns a Spring Boot 404 "Whitelabel Error Page".
  `SpaController` now forwards all non-asset GET requests (single- and multi-segment paths)
  to `index.html` so Angular's client-side router can handle them correctly.
- Improved mobile responsiveness: reduced padding on content wrapper, stats grid, and cards for small screens.
- Removed card box shadows on mobile; cards now use a subtle bottom border for separation.
- Fixed horizontal scrollbar on mobile by constraining card widths and preventing overflow.
- Switched stats overview layout from flexbox to CSS Grid so cards fill available space equally on desktop.
- Fixed `TypeError: can't access property "id", ctx.stat() is undefined` logged on every page load
  by guarding the Edit and Delete buttons in `stat-details.html` with `@if (stat())`.

## [2.0.2] - 2026-05-12

### Added

- Editing forms now preselect the dataset automatically when a statistic has exactly one dataset.

## [2.0.1] - 2026-05-12

### Added

- Rename support for dataset labels.
- Rename support for X-axis and Y-axis names.

## [2.0.0] - 2026-05-11

### Added

- Multi-dataset statistics support (multiple lines per chart).
- Dataset management (create/delete datasets) in the editor UI.

### Changed

- Data model changed from a single `dataPoints` list to `datasets` with labeled series.
- Backend loading was made compatible with older JSON files during the migration window.

