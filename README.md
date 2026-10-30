# StatsApp

A personal statistics tracking app built with Angular 21 and Spring Boot.

## Project Structure

```
StatsApp/
├── Dockerfile
├── frontend/
│   └── stats-app/      ← Angular 21
└── backend/            ← Spring Boot
```

## Development

### Backend

```bash
cd backend
./gradlew bootRun
# runs on http://localhost:8081
```

### Frontend

```bash
cd frontend/stats-app
npm install
ng serve
# runs on http://localhost:4200
```

---

## Deployment (Synology NAS)

### 1. Build the Docker image

Run from the **monorepo root**:

```bash
docker build -t statsapp .
```

### 2. Export the image to a tar file

```bash
docker save statsapp -o statsapp-angular-2.4.x.tar
```

### 3. Upload to Synology

1. Upload tar file to docker (or any other folder)
2. Open Container Manager
3. Image: select statsapp, then Action > Import > Add From File > From this DSM
4. Container: select statsapp, stop, reset, start

## Configuration

| Property                  | Default                               | Description                                                                                  |
|---------------------------|---------------------------------------|----------------------------------------------------------------------------------------------|
| `app.stats.storage-path`  | `/data/statistics`                    | Path where JSON stat files are stored                                                        |
| `app.scores.storage-path` | `${user.home}/Documents/rankedScores` | Existing ScoreSaber `players.json` and `{playerId}.json` files; use `/data/scores` in Docker |
| `server.port`             | `8081`                                | Port the backend listens on                                                                  |
| `scoresaber.base-url`     | `https://scoresaber.com`              | ScoreSaber API base URL                                                                      |

Override via environment variable in `docker-compose.yml`:

```yaml
environment:
  - APP_STATS_STORAGE_PATH=/data/statistics
  - APP_SCORES_STORAGE_PATH=/data/scores
  - SCORESABER_BASE_URL=https://scoresaber.com
  - SERVER_PORT=8081
```

## CSV Import

Select **Import CSV** on the statistics overview, or open `/stats/import`.
Choose a CSV file, its date column and the numeric measurement columns to import.
Choose **One Graph** for multiple datasets sharing the same axes, or **Separate Graphs**
for one new graph per measurement. Review the titles, IDs, axis labels and skipped
values before confirming. `/stats/new` remains available for manual creation.

Files must be UTF-8, comma-separated, with a header row. Quoted cells, embedded commas,
multiline comments and Windows line endings are supported. For example:

```csv
Date,"Weight (kg)","Fat mass (kg)",Comments
"2026-10-30 12:11:09",64.00,8.80,
```

Dates use `yyyy-MM-dd` or `yyyy-MM-dd HH:mm:ss` (also `T` in place of the space).
Times are discarded without timezone conversion. Repeated dates are retained, not
averaged. Numeric values use a decimal point, without units or thousands separators;
zero and negative numbers are accepted. Missing or invalid dates skip the entire row;
missing or invalid numeric cells skip only the affected measurement. The preview
lists those omissions before saving. Diagnostic record numbers count CSV records,
including the header, rather than physical lines within quoted multiline cells.

CSV files are parsed locally; only the selected measurements are sent to the server.
Imports create new graphs and never merge into or overwrite existing ones. Multiple
graphs save independently: successful graphs remain saved if another fails. Saved
graphs are not resubmitted on retry. If a save response is lost, use **Check Saved Graph**
before retrying. New graph IDs must start with a letter or number and contain only
letters, numbers, hyphens or underscores (maximum 100 characters); route names and
reserved filesystem names are unavailable. Existing IDs remain usable when editing.

The `/stats/import` route reserves `import` as a graph ID. Before upgrading a legacy
installation that already uses that exact ID, rename that graph and its JSON file
while the application is stopped, or access it through its existing edit route.

## ScoreSaber comparison

StatsApp exposes the migrated Beat Saber feature at `/scores`. The overview contains an
`Additional Stats` section with a scatterplot preview and a `View Details` link for the
full player comparison workflow.

Enter a numeric ScoreSaber player ID in the comparison page's `ScoreSaber player ID`
field and select `Add player` to import and persist their profile and ranked scores.
The new player is selected automatically and remains tracked after restarting StatsApp,
including players who do not yet have ranked scores.

The backend API is grouped under `/api/scores`:

- `GET /api/scores/players/details` lists tracked players.
- `POST /api/scores/players/{playerId}` adds a player and imports their scores (400 for an invalid ID, 404 if not found,
  502 if ScoreSaber is unavailable).
- `GET /api/scores/players/{playerId}/scores` returns a player's ranked scores.
- `GET /api/scores/players/{playerId}/scores/compare/{otherPlayerId}` returns both histories.
- `POST /api/scores/players/{playerId}/scores/update` refreshes scores from ScoreSaber.

The migrated backend reads the existing BSV file layout directly. Mount the old score
directory at `/data/scores` (or set `APP_SCORES_STORAGE_PATH`) when creating the merged
container. The generic statistics directory remains `/data/statistics`.

## Harvest Tracker

StatsApp exposes the seasonal Harvest Tracker at `/harvest`. The overview includes a
read-only donut-chart preview with a `View Details` link. The tracker stores one season
per calendar year, named plants, and harvest entries containing a date and positive
tomato quantity. Plant charts and the global chart show cumulative totals over time;
the donut chart shows each plant's total for the selected year.

Harvest data is stored as JSON under the `harvest` subdirectory of the configured
statistics storage path. Its API is grouped under `/api/harvest`:

- `GET /api/harvest/years` lists years with saved harvest data.
- `GET /api/harvest/{year}` returns the season projection and chart series.
- `POST`, `PATCH`, and `DELETE` plant endpoints manage plants for a year.
- `POST`, `PATCH`, and `DELETE` harvest endpoints manage dated quantity entries.

Harvest Tracker does not require additional container environment variables. It uses
`APP_STATS_STORAGE_PATH`, so preserve the mounted statistics volume during upgrades;
season files such as `harvest/2025.json` and `harvest/2026.json` must remain under
that path.

## Run local

```bash
docker run -d --name statsapp-test -p 8081:8081 -v C:/Users/fast/Documents/Stats:/data statsapp
```

To rebuild & restart:

```bash
docker stop statsapp-test
docker rm statsapp-test
docker build -t statsapp .
docker run -d --name statsapp-test -p 8081:8081 -v C:/Users/fast/Documents/Stats:/data statsapp
```