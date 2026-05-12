# Changelog

All notable changes to this project are documented in this file.

## [2.0.2] - 2026-05-12

### Added
- Editing forms now preselect the dataset automatically when a statistic has exactly one dataset.

### Changed
- Frontend app version in `frontend/stats-app/src/app/app.html` updated to `v2.0.2`.
- Backend project version in `backend/build.gradle` updated to `2.0.2-SNAPSHOT`.

## [2.0.1] - 2026-05-12

### Added
- Rename support for dataset labels.
- Rename support for X-axis and Y-axis names.

### Changed
- Frontend app version was incremented to `v2.0.1`.
- Backend project version was incremented to `2.0.1-SNAPSHOT`.

## [2.0.0] - 2026-05-11

### Added
- Multi-dataset statistics support (multiple lines per chart).
- Dataset management (create/delete datasets) in the editor UI.

### Changed
- Data model changed from a single `dataPoints` list to `datasets` with labeled series.
- Backend loading was made compatible with older JSON files during the migration window.

