from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import attempts, auth, content, health, results, tests

app = FastAPI(title="TSLPRB API", version="0.1.0")


@app.exception_handler(RequestValidationError)
async def invalid_request(_request, error: RequestValidationError):
    # Do not echo invalid payloads: e.g. an overflowing JSON number cannot itself
    # be serialized into a valid JSON error response.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [{key: row[key] for key in ("loc", "msg", "type")} for row in error.errors()]
        },
    )


_cors_origins = settings.cors_origin_list
# Never combine a wildcard origin with allow_credentials=True: Starlette's
# CORSMiddleware reflects any request Origin back verbatim with "*", so
# pairing it with credentials would let any site read credentialed
# responses. Only enable credentials when the origin list is an explicit
# allowlist.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    health.router,
    content.router,
    auth.router,
    tests.router,
    attempts.router,
    results.router,
):
    app.include_router(router)
    # Next.js strips /api; some existing public proxies forward it to FastAPI intact.
    # Reuse the same routes/dependencies so both deployments preserve validation and marking.
    # Keep only canonical paths in OpenAPI to avoid clients producing /api/api URLs.
    app.include_router(router, prefix="/api", include_in_schema=False)

app.add_api_route("/api", health.health, include_in_schema=False)


@app.get("/api/openapi.json", include_in_schema=False)
async def public_openapi():
    return {**app.openapi(), "servers": [{"url": "/api"}]}
