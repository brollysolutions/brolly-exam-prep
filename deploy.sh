#!/bin/sh
set -eu

# Run from this checkout even when invoked from a different working directory.
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
git pull --ff-only origin main

# Recreate changed services without taking the whole site/database down first.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for the API inside its container, independent of host port overrides.
docker compose exec -T api python - <<'PY'
import json
import time
from urllib.request import urlopen

for attempt in range(15):
    try:
        for path in ("/v1/content", "/api/v1/content", "/api/v1/tests/catalog"):
            with urlopen("http://127.0.0.1:8000" + path, timeout=5) as response:
                json.load(response)
        break
    except Exception:
        if attempt == 14:
            raise
        time.sleep(2)
print("Backend content and catalogue checks passed")
PY

public_api=${PUBLIC_API_BASE_URL:-https://mocktest.brollyexamprep.com/api}
for path in /health /v1/content /v1/tests/catalog /openapi.json; do
    if ! curl --fail --silent --show-error --max-time 30 --retry 3 --retry-delay 2 \
        --output /dev/null "${public_api%/}$path"; then
        printf 'Public API check failed: %s%s\nInspect the live Nginx API upstream; see docs/SERVER_API.md.\n' "${public_api%/}" "$path" >&2
        exit 1
    fi
done
printf 'Deployment and public API checks passed.\n'
