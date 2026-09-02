from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import attempts, health, otp, results, tests

app = FastAPI(title="TSLPRB API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(otp.router)
app.include_router(tests.router)
app.include_router(attempts.router)
app.include_router(results.router)
