#!/usr/bin/env bash
# Picks free ports and runs the Playwright smoke against the fixture server (one heavy job at a time).
set -euo pipefail
cd "$(dirname "$0")/.."
free_port() { python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])"; }
export E2E_WEB_PORT="${E2E_WEB_PORT:-$(free_port)}"
export FIXTURE_PORT="${FIXTURE_PORT:-$(free_port)}"
LOCK="$(cd ../.. && pwd)/.heavy.flock"
exec flock "$LOCK" ./node_modules/.bin/playwright test "$@"
