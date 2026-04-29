# StatsApp

A personal statistics tracking app built with Angular 19 and Spring Boot.

## Project Structure

```
StatsApp/
├── Dockerfile
├── frontend/
│   └── stats-app/      ← Angular 19
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
docker save statsapp -o statsapp.tar
```

### 3. Upload to Synology

1. Upload tar file to docker (or any other folder)
2. Open Container Manager
3. Images: select statsapp, then Action > Import > Add From File > From this DSM
4. Container: select statsapp, stop, reset, start

## Configuration

| Property | Default | Description |
|---|---|---|
| `app.stats.storage-path` | `/data/statistics` | Path where JSON stat files are stored |
| `server.port` | `8081` | Port the backend listens on |

Override via environment variable in `docker-compose.yml`:
```yaml
environment:
  - APP_STATS_STORAGE_PATH=/data/statistics
  - SERVER_PORT=8081
```

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