# Changelog

All notable changes to this project are documented in this file.

## [2.5.15] - 2026-11-09

### Added

- Off-by-default single-player "Highlight top 10" (by PP) toggle below "Highlight NF scores"; checking it fetches the current top ten and highlights them green.
- Live top-ten ScoreSaber requests using `page=1&limit=10&sort=top`, with request/response caching disabled and no PP persistence.

### Changed

- Only exact top-ten plays already displayed at the selected date are highlighted, matching song, difficulty, timestamp and accuracy.
- Selected-song colors take precedence over top-ten green, which takes precedence over NF orange. Comparison and previews remain unchanged.
- Top-ten results are fetched anew when enabled, reloading scores or changing players; stale requests are cancelled and errors are shown without hiding the chart (re-check the option to retry).

## [2.5.14] - 2026-11-09

### Changed

- Comparison hover tooltips list the higher-accuracy player first, regardless of which player's dot is hovered; ties retain player order.

## [2.5.13] - 2026-11-09

### Added

- Hovering a score in Beat Saber comparison highlights the same song/difficulty for both players with colored rings and a connecting line.
- Comparison tooltips show both player names and accuracies, or indicate when the other player has no matching score at the selected date.

### Changed

- Hover matching uses the filtered, date-eligible scores and excludes hidden datasets; single-player selection and compact previews remain unchanged.

## [2.5.12] - 2026-11-09

### Added

- Off-by-default "Only shared songs (same difficulty)" filter in Beat Saber comparison mode, matching both song hash and leaderboard.

### Changed

- Shared-song comparisons include only difficulties both players have played by the selected slider date, retaining each player's latest eligible score and original color.

## [2.5.11] - 2026-11-09

### Added

- Off-by-default "Highlight NF scores" toggle in single-player Beat Saber charts: NF dots turn orange without creating song selections.
- Per-play No Fail status in score storage and responses, sourced from ScoreSaber's `mods` array.
- Non-destructive Python enrichment for existing player files, with explicit reporting of historical plays whose modifiers cannot be recovered.

### Changed

- Selected dots retain their selection colors over NF highlighting; deselecting restores orange when NF highlighting is enabled.
- Comparison and compact previews keep their existing player colors. Old scores with unavailable NF status remain readable and keep their normal color without displaying a migration notice.

## [2.5.10] - 2026-11-09

### Added

- Dedicated Manage data page for datasets and adding, editing or deleting data points, with chart-click point selection.
- Navigation between the chart, chart settings and data management pages.
- Back to chart navigation from the edit page to the normal view of the same chart.

### Changed

- Moved chart type, value format, Dots + trend, smoothing, stacking and optional Y-axis bounds from the normal chart
  view to the edit page, keeping save behavior and live chart previews.
- The Edit page now focuses on the chart title and display settings; data management tabs live on the separate page.
- Simplified axis field labels across chart creation, settings and data management: required fields use the standard
  asterisk, while optional fields have no asterisk or "(optional)" suffix.

### Fixed

- Docker image could package a stale local backend JAR without the frontend, causing 404 errors on every page.
  Local build output is now excluded from the build context and the boot JAR has a fixed name.

## [2.5.9] - 2026-11-09

### Added

- Optional, saved Y-axis minimum and maximum values for new and existing charts, with finite-number and range
  validation.

### Changed

- Replaced the zero-baseline control with axis-bound inputs. Either bound can be left blank for automatic scaling;
  clearing both restores automatic scaling.
- Removed the old zero-baseline setting and API; saved zero-baseline preferences are no longer supported. Pace chart
  bounds use seconds; custom bounds apply to line, bar, stacked, reversed and Dots + trend charts.

## [2.5.8] - 2026-11-08

### Added

- Saved Dots + trend toggle for line charts: unconnected recorded dots with a separate centered 7-measurement
  moving-average trend per dataset.
- Opt-in Pace (min/km) value format that interprets m:ss and legacy M.SS values, calculates averages in seconds, and
  formats chart axes and tooltips as m:ss.

### Changed

- Dots + trend temporarily bypasses smoothing, stacking and fill while preserving their saved preferences and the
  original dot size and translucent fill; clicking dots still selects original measurements for editing.
- Legacy charts retain numeric values and their existing rendering until the new settings are enabled.

## [2.5.7] - 2026-11-06

### Added

- Click-to-toggle song/difficulty selection in the single-player Beat Saber scatterplot, with stable per-selection
  colors and removable detail cards in a scrollable panel.
- Export selected maps and difficulties as a Beat Saber `.bplist` playlist, combining difficulties belonging to the same
  song hash.
- Resumable, non-destructive Python enrichment of existing leaderboard metadata with playlist difficulty names and
  characteristics.

### Changed

- ScoreSaber imports and regular metadata refreshes now retain difficulty information and expose it in score responses;
  older files remain readable.
- Selections follow the date slider's latest eligible score, and selections no longer visible after date or player
  changes are removed. Comparison and compact previews remain non-selectable.

## [2.5.6] - 2026-11-06

### Added

- Saved Line/Bar chart selection for new and existing statistics, including stacked bars with per-date totals.
- New bar charts default to stacking and a zero baseline, reusing existing datasets, colors and datapoint editing.

### Changed

- Bar charts show exact recorded values without smoothing and align sparse datasets by date or numeric X value.
- Line-only smoothing and fill controls are hidden for bar charts; existing line charts retain their settings.
- Bar charts reject duplicate X values within a dataset with validation feedback instead of silently hiding
  measurements.

## [2.5.5] - 2026-11-06

### Added

- Separate update actions for score history only or score history plus leaderboard star refresh.
- Show per-player score counts and changed/checked leaderboard star counts in the completion popup.

### Changed

- Leaderboard refresh scans paginated player score histories at a paced request interval instead of requesting each
  leaderboard individually.

## [2.5.3] - 2026-11-05

### Added

- Separated ScoreSaber score-event history from shared leaderboard metadata, with a non-destructive migration tool.

### Changed

- Score reads compose the existing API response from score events and the current leaderboard cache.

## [2.5.2] - 2026-11-02

### Added

- Saved "Include zero on Y axis" option for all statistics charts, including independent and stacked lines, with
  automatic scaling retained when off.

### Changed

- Chart display settings use smaller switches, shorter labels and a spaced, wrapping row while retaining accessible
  names and touch targets.

## [2.5.1] - 2026-11-02

### Added

- Saved stacked-line chart option for new charts and existing charts with at least two datasets.
- Stacked charts show cumulative dataset heights and a combined total in tooltips without changing recorded
  measurements.

## [2.5.0] - 2026-10-30

### Added

- Score history charts now show the most recent score for each song as of the selected date.

### Changed

- JSON-backed repositories now use staged writes to avoid leaving partially written data files.
- Score and player file loading now fails startup when stored data cannot be read, preventing later overwrites from
  incomplete state.
- Score persistence now safely handles concurrent updates and rolls back in-memory changes if a write fails.
- Dataset mutations now report missing dataset labels instead of silently succeeding.
- Simplified storage error responses and removed redundant sorting from harvest totals calculation.

## [2.4.5] - 2026-10-30

### Added

- Graph-title renaming on the edit page, preserving graph IDs, URLs, datasets and settings.
- Blank-title validation and save feedback for graph renaming.

## [2.4.4] - 2026-10-30

### Changed

- Smoothed graphs now show only the curve, without normal or hover dots, while retaining tooltips and point selection.

## [2.4.3] - 2026-10-30

### Added

- Saved per-graph smooth-trend toggle using a trailing average of up to seven measurements per dataset.
- Recorded-value tooltips on smoothed charts; original data and point editing remain unchanged.

## [2.4.2] - 2026-10-30

### Added

- CSV import page with selectable measurement columns and combined or separate new graphs.
- Import preview with date-only measurements, skipped-value diagnostics and editable graph details.
- Per-graph save results and explicit verification of uncertain saves before retrying.

### Changed

- Creating a graph now rejects existing, unsafe and reserved IDs instead of overwriting existing graphs.

## [2.4.1] - 2026-10-27

### Added

- Add tracked ScoreSaber players by their numeric player ID, importing their profile and scores.
- Player ID validation and feedback for duplicate players and failed lookups.

### Changed

- Empty player lists now show the empty state instead of remaining in the loading state.

## [2.4.0] - 2026-10-26

### Added

- Seasonal Harvest Tracker with named plants, dated harvest quantities, cumulative charts, and year switching.
- File-backed harvest storage under the configured statistics storage path.

### Changed

- Production deployment continues to use the existing storage environment variables; no Harvest-specific container
  variable is required.

## [2.3.0] - 2026-10-25

### Added

- Beat Saber score tracking and player comparison in the StatsApp container.

### Changed

- Added ScoreSaber persistence, API integration, and chart-based score comparison.
- Updated the Beat Saber interface to use the shared StatsApp chart palette and Material styling.

## [2.2.1] - 2026-07-20

### Added

- Optional units for numeric x-axis scales, shown in axis labels and tooltips.

## [2.2.0] - 2026-07-20

### Added

- Numeric x-axis line charts for comparing measurements such as elevation against distance.
- Numeric x-axis selection and non-negative decimal validation for chart data points.

### Changed

- Existing charts remain date-based, while chart points are sorted according to their selected x-axis scale.

## [2.1.7] - 2026-07-02

### Added

- Archive storage for statistics, with archived graphs moved into a separate folder next to the active JSON files.
- A dedicated Archive page and archive/unarchive actions in the statistics UI.

### Changed

- Backend now exposes archive-aware APIs for listing archived statistics and checking/toggling archive state.
- Create and edit flows now reject ids that are archived, and archived statistics can no longer be edited from the UI.

## [2.1.6] - 2026-07-02

### Added

- Statistic-level `index` support in backend JSON so each stored statistic has an explicit presentation order.

### Changed

- Backend now assigns an index to newly created statistics and persists missing indices for older JSON files.
- Statistics returned by the backend are sorted by their statistic `index` before being presented.

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
