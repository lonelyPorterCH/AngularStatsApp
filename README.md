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

### 3. Copy the tar to your NAS
```bash
scp statsapp.tar user@your-nas-ip:/volume1/docker/
```

### 4. Import the image on the NAS
SSH into NAS and run:
```bash
ssh user@nas-ip
docker load -i /volume1/docker/statsapp.tar
```

### 5. Run the container
```bash
docker run -d \
  --name statsapp \
  -p 8081:8081 \
  -v /volume1/docker/statsapp/data:/data \
  --restart unless-stopped \
  statsapp
```

Or via `docker compose` — place a `docker-compose.yml` at `/volume1/docker/statsapp/`:
```yaml
services:
  statsapp:
    image: statsapp
    ports:
      - "8081:8081"
    volumes:
      - /volume1/docker/statsapp/data:/data
    restart: unless-stopped
```

Then run:
```bash
docker compose up -d
```

### 6. Update to a new version
```bash
# locally
docker build -t statsapp .
docker save statsapp -o statsapp.tar
scp statsapp.tar user@nas-ip:/volume1/docker/

# on the NAS
docker load -i /volume1/docker/statsapp.tar
docker compose up -d   # picks up the new image automatically
```

---

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