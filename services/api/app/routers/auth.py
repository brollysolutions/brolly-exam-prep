"""Phone sign-in.

The number is the whole credential. The OTP step was removed on the product
owner's instruction (2026-09-07), so nothing here proves possession of the
number: whoever types the digits gets that account, and two people typing the
same digits get the same one.

That is a deliberate product decision for this phase, not an oversight, and it
holds only while the app carries nothing worth taking -- there is no payment,
no personal document, and no result on a server. Before this app holds anything
of the sort, sign-in needs a real second factor (an SMS code, a password, or a
provider), and this module is where it goes.

Deliberately DB-free, like the OTP flow it replaces: state lives in
process-local dicts so the whole flow works in tests without a database or
Redis, and a restart signs everyone out. Persisting users and tokens is part of
wiring up the database (see .claude/rules/api.md).
"""

from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter

from app.schemas import PhoneSignInIn, PhoneSignInOut, UserOut

router = APIRouter(prefix="/v1/auth", tags=["auth"])

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


@router.post("/phone", response_model=PhoneSignInOut)
async def sign_in_with_phone(body: PhoneSignInIn) -> PhoneSignInOut:
    """Sign in, creating the account on first sight of a number.

    One endpoint rather than a create/sign-in pair: to the candidate there is
    no difference, and asking an app to know which one it needs would put the
    question back on screen that removing the OTP step took off it.
    """
    user = _get_or_create_user(body.phone)
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = user
    return PhoneSignInOut(token=token, user=UserOut(**user))
