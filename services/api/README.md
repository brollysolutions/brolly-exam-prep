# Brolly Exam Prep API

FastAPI, Pydantic v2, SQLAlchemy 2 async and PostgreSQL. The complete bilingual
catalogue, papers, study notes and eligibility content are served from published
JSON in `app/content`. Practice attempts, final answers and results are stored in
PostgreSQL. Phone-only sign-in remains an in-memory compatibility endpoint.

See [all endpoints, contracts, offline behavior and deployment](../../docs/SERVER_API.md).

## Local stack

```sh
docker compose up -d --build
curl --fail http://localhost:3201/api/health
```

Compose applies Alembic migrations before starting the API. Open Swagger at
http://localhost:8200/docs. The website forwards `/api` to the API service.

## Checks

```sh
docker compose exec -T api pytest -q
docker compose exec -T api ruff check .
```

Tests use real PostgreSQL transactions with rollback. The schema must be migrated
first. To work without Docker, run PostgreSQL, configure `DATABASE_URL`, then:

```sh
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8200
uv run pytest -q
```

## Contract generation

After editing `app/schemas.py`, update the matching Zod schemas, then from the root:

```sh
python services/api/scripts/export_openapi.py
pnpm contracts:gen
```

Run the Python command inside the API virtual environment. It reads the app's
route/schema definitions without connecting to PostgreSQL. Keep the generated
OpenAPI JSON and TypeScript types with the change.
