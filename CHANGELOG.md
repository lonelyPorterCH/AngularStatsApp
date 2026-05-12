# Changelog

All notable changes to this project are documented in this file.

## [2.0.3] - 2026-05-12

### Fixed
- Page refresh on production no longer returns a Spring Boot 404 "Whitelabel Error Page".
  `SpaController` now forwards all non-asset GET requests (single- and multi-segment paths)
  to `index.html` so Angular's client-side router can handle them correctly.
- Improved mobile responsiveness: reduced padding on content wrapper, stats grid, and cards for small screens.
- Removed card box shadows on mobile; cards now use a subtle bottom border for separation.
- Fixed horizontal scrollbar on mobile by constraining card widths and preventing overflow.
- Switched stats overview layout from flexbox to CSS Grid so cards fill available space equally on desktop.

### Changed
- Frontend app version in `frontend/stats-app/src/app/app.html` updated to `v2.0.3`.
- Backend project version in `backend/build.gradle` updated to `2.0.3-SNAPSHOT`.

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

