# StatsApp

A personal statistics tracking app built with Angular 21 and Spring Boot.

## Project Structure

```
StatsApp/
├── Dockerfile
├── deploy/             ← deployment scripts and Compose configuration
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

The deployment uses [deploy.ps1](../deploy/deploy.ps1) on Windows and
[Docker Compose](../deploy/compose.yaml) on the NAS. Docker Desktop, SSH and SCP must be available locally;
the NAS needs Docker Compose and an SSH account that can run Docker with `sudo`.
Passwords are entered interactively and are not stored by the script.

### Deploy

Back up `/volume1/docker/StatsApp`, then run from the repository root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1
```

The script:

1. Checks that the version in `frontend/stats-app/src/app/app.html` matches the version in
   `backend/build.gradle` (without `-SNAPSHOT`). It builds `statsapp:latest` for `linux/amd64` and saves
   `statsapp-angular-<version>.tar` in the repository root. An existing archive requires confirmation before replacement.
2. Uses SSH and legacy SCP to upload the archive to `/volume1/docker/images` and the Compose file and remote
   script to `/volume1/docker/images/statsapp-deploy`. SSH and `sudo` may prompt for passwords.
3. Validates the Compose configuration and loads the image. Type `DEPLOY` to confirm stopping the container.
   On the first deployment, the original container is preserved as the stopped `stats-app-pre-compose` rollback copy.
4. Pauses while the app is stopped so migrated data can be copied manually, if needed. Type `START` to start the
   Compose-managed container. Any other input leaves it stopped and prints a command to restart the previous container.

The Compose service is named `stats-app` in project `statsapp`. It maps port 8081 and mounts
`/volume1/docker/StatsApp` at `/data`; statistics are stored under `/data/statistics` and scores under
`/data/scores`. Auto-restart is disabled. After deployment, open `http://192.168.0.23:8081` and check the app.
The deployment checks that the container is running, but does not check application health.

### Parameters

- `-RemoteHost user@hostname`: SSH destination; defaults to `fabio@192.168.0.23`. This changes only the
  SSH destination, not the NAS paths or container settings in the Compose configuration.
- `-SkipBuild`: reuse the existing non-empty archive for the current version rather than building and saving
  an image. Use this to retry an upload only if the archive still contains the desired build; the script does
  not verify that it matches the current source.

For example:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\deploy.ps1 -SkipBuild
```

### Checking container status

In an SSH session on the NAS, check both the active container and the preserved original:

```sh
sudo docker ps -a --filter 'name=stats-app'
```

Container Manager may not automatically display a Compose project created over SSH. The Docker status command
above shows the containers even if the UI has not refreshed.