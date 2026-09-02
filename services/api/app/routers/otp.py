"""OTP request/verify.

Deliberately DB-free: dev OTP is always settings.otp_dev_code when
OTP_DEV_MODE is true, and there is no SMS provider in this phase (see
.claude/rules/api.md). State lives in process-local dicts so the whole flow
works in tests without a database or Redis.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import OtpRequestIn, OtpRequestOut, OtpVerifyIn, OtpVerifyOut, UserOut

router = APIRouter(prefix="/v1/otp", tags=["otp"])

# request_id -> {phone, code, expires_at, consumed}
_OTP_STORE: dict[str, dict] = {}
# phone -> user dict {id, phone}
_USERS_BY_PHONE: dict[str, dict] = {}
# opaque session token -> user dict
_TOKENS: dict[str, dict] = {}


def _get_or_create_user(phone: str) -> dict:
    user = _USERS_BY_PHONE.get(phone)
    if user is None:
        user = {"id": str(uuid.uuid4()), "phone": phone}
        _USERS_BY_PHONE[phone] = user
    return user


@router.post("/request", response_model=OtpRequestOut)
async def request_otp(body: OtpRequestIn) -> OtpRequestOut:
    request_id = str(uuid.uuid4())
    code = settings.otp_dev_code if settings.otp_dev_mode else f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.otp_ttl_seconds)
    _OTP_STORE[request_id] = {
        "phone": body.phone,
        "code": code,
        "expires_at": expires_at,
        "consumed": False,
    }
    # In dev mode we hand the code back directly (no SMS provider exists yet).
    return OtpRequestOut(request_id=request_id, dev_code=code if settings.otp_dev_mode else None)


@router.post("/verify", response_model=OtpVerifyOut)
async def verify_otp(body: OtpVerifyIn) -> OtpVerifyOut:
    entry = _OTP_STORE.get(body.request_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown request_id")
    if entry["consumed"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code already used")
    if datetime.now(UTC) > entry["expires_at"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code expired")
    if entry["code"] != body.code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code")

    entry["consumed"] = True
    user = _get_or_create_user(entry["phone"])
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = user
    return OtpVerifyOut(token=token, user=UserOut(**user))
