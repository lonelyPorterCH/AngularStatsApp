#!/bin/sh
set -eu

deploy_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TEST_DIR=$(mktemp -d)
export TEST_DIR
trap 'rm -f "$TEST_DIR/docker" "$TEST_DIR/calls" "$TEST_DIR/output"; rmdir "$TEST_DIR"' EXIT
cp "$deploy_dir/tests/docker" "$TEST_DIR/docker"
chmod +x "$TEST_DIR/docker"
export PATH="$TEST_DIR:$PATH"

run_case() {
    name=$1
    input=$2
    expected=$3
    : > "$TEST_DIR/calls"
    status=0
    printf '%b' "$input" | CASE="$name" sh "$deploy_dir/remote-deploy.sh" /tmp/image.tar > "$TEST_DIR/output" 2>&1 || status=$?
    if [ "$status" -ne "$expected" ]; then
        echo "$name: expected exit $expected, got $status"
        cat "$TEST_DIR/output"
        exit 1
    fi
}

run_case original 'DEPLOY\nSTART\n' 0
grep -q '^stop stats-app$' "$TEST_DIR/calls"
grep -q '^rename stats-app stats-app-pre-compose$' "$TEST_DIR/calls"
grep -q 'up -d --no-build' "$TEST_DIR/calls"

run_case original 'cancel\n' 1
if grep -q '^stop ' "$TEST_DIR/calls"; then exit 1; fi

run_case bad-mount 'DEPLOY\nSTART\n' 1
if grep -q '^stop ' "$TEST_DIR/calls"; then exit 1; fi

run_case backup-conflict 'DEPLOY\nSTART\n' 1
if grep -q '^stop ' "$TEST_DIR/calls"; then exit 1; fi

run_case load-failure 'DEPLOY\nSTART\n' 1
if grep -q '^stop ' "$TEST_DIR/calls"; then exit 1; fi

run_case managed 'DEPLOY\ncancel\n' 1
grep -q ' stop$' "$TEST_DIR/calls"
if grep -q 'up -d --no-build' "$TEST_DIR/calls"; then exit 1; fi

run_case pending 'DEPLOY\nSTART\n' 0
grep -q 'up -d --no-build' "$TEST_DIR/calls"
echo 'Deployment flow checks passed'
