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

app.include_router(health.router)
app.include_router(content.router)
app.include_router(auth.router)
app.include_router(tests.router)
app.include_router(attempts.router)
app.include_router(results.router)
