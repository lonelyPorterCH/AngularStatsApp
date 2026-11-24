#!/bin/sh
set -eu

PATH="/usr/local/bin:${PATH:-/usr/bin:/bin}"
export PATH

archive=${1:?Image archive path is required}
compose=/volume1/docker/images/statsapp-deploy/compose.yaml
container=stats-app
backup=stats-app-pre-compose

compose_run() {
    docker compose -p statsapp -f "$compose" "$@"
}

docker info --format '{{.ServerVersion}}'
compose_run config --quiet
docker load -i "$archive"

if docker inspect "$container" >/dev/null 2>&1; then
    project=$(docker inspect -f '{{if .Config.Labels}}{{index .Config.Labels "com.docker.compose.project"}}{{end}}' "$container")
    service=$(docker inspect -f '{{if .Config.Labels}}{{index .Config.Labels "com.docker.compose.service"}}{{end}}' "$container")
    if [ "$project" = statsapp ] && [ "$service" = stats-app ]; then
        mode=compose
    elif { [ -z "$project" ] || [ "$project" = '<no value>' ]; } &&
         { [ -z "$service" ] || [ "$service" = '<no value>' ]; }; then
        mode=original
        if docker inspect "$backup" >/dev/null 2>&1; then
            echo "Cannot preserve the original container: $backup already exists." >&2
            exit 1
        fi
        network=$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$container")
        image=$(docker inspect -f '{{.Config.Image}}' "$container")
        mounts=$(docker inspect -f '{{range .Mounts}}{{.Type}}:{{.Source}}:{{.Destination}}:{{.RW}};{{end}}' "$container")
        restart=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$container")
        ports=$(docker inspect -f '{{range $port, $bindings := .HostConfig.PortBindings}}{{range $bindings}}{{$port}}:{{.HostIp}}:{{.HostPort}};{{end}}{{end}}' "$container")
        if [ "$network" != bridge ] || [ "$image" != statsapp:latest ] ||
           [ "$mounts" != 'bind:/volume1/docker/StatsApp:/data:true;' ] ||
           [ "$restart" != no ] ||
           [ "$ports" != '8081/tcp::8081;' ]; then
            echo 'Container settings differ from the expected configuration; refusing to replace it.' >&2
            exit 1
        fi
    else
        echo "$container belongs to a different Compose project; refusing to replace it." >&2
        exit 1
    fi
elif docker inspect "$backup" >/dev/null 2>&1; then
    mode=pending
else
    echo "Neither $container nor $backup exists; refusing to create a replacement." >&2
    exit 1
fi

echo
echo 'Back up /volume1/docker/StatsApp before proceeding.'
echo 'This will stop StatsApp and pause for any manual data migration.'
printf 'Type DEPLOY to continue: '
read -r confirmation
if [ "$confirmation" != DEPLOY ]; then
    echo 'Deployment cancelled; the existing container was not changed.'
    exit 1
fi

case "$mode" in
    original)
        docker stop "$container"
        docker rename "$container" "$backup"
        ;;
    compose)
        compose_run stop
        ;;
esac

echo
echo 'StatsApp is stopped. Copy migrated data now, if needed.'
echo 'The data directory is /volume1/docker/StatsApp.'
printf 'Type START to start the new version, or anything else to leave it stopped: '
read -r confirmation
if [ "$confirmation" != START ]; then
    echo 'Deployment cancelled with StatsApp stopped.'
    if [ "$mode" = compose ]; then
        echo "To restart the previous container: docker compose -p statsapp -f $compose start"
    else
        echo "To restart the original container: docker start $backup"
    fi
    exit 1
fi

compose_run up -d --no-build
if [ "$(docker inspect -f '{{.State.Running}}' "$container")" != true ]; then
    echo 'The new container is not running. Inspect its logs before retrying.' >&2
    exit 1
fi
echo 'The new container is running. Check the application in your browser.'
