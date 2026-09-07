"""Phone sign-in tests -- run entirely without a database (users and tokens
live in process-local dicts, see app/routers/auth.py).

The OTP step was removed on 2026-09-07: there is no code to request, none to
verify, and no dev code. What is left is one call that turns a number into a
session, and these tests pin exactly that, including what it deliberately does
NOT check.
"""

from __future__ import annotations


async def test_phone_sign_in_returns_a_token_and_the_user(client):
    resp = await client.post("/v1/auth/phone", json={"phone": "9876543210"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["user"]["phone"] == "9876543210"
    assert body["user"]["id"]


async def test_the_same_number_comes_back_to_the_same_account(client):
    """First sight of a number creates the account; every sight after signs in.

    The candidate is never asked which of the two they meant, which is the
    point of removing the code screen.
    """
    first = await client.post("/v1/auth/phone", json={"phone": "9000011111"})
    second = await client.post("/v1/auth/phone", json={"phone": "9000011111"})

    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    # A fresh session each time, so signing in again does not resurrect an old token.
    assert first.json()["token"] != second.json()["token"]


async def test_different_numbers_are_different_accounts(client):
    one = await client.post("/v1/auth/phone", json={"phone": "9000022222"})
    two = await client.post("/v1/auth/phone", json={"phone": "9000033333"})
    assert one.json()["user"]["id"] != two.json()["user"]["id"]


async def test_a_number_alone_is_enough_and_nothing_proves_it_is_yours(client):
    """The security posture, written down so a change to it is a failing test.

    Nobody proves possession of the number: a second person typing the same
    digits is handed the same account. That is the accepted trade-off for this
    phase, and the reason nothing behind this gate may be private.
    """
    stranger = await client.post("/v1/auth/phone", json={"phone": "9876543210"})
    assert stranger.status_code == 200
    assert stranger.json()["user"]["phone"] == "9876543210"


async def test_a_short_number_is_rejected(client):
    resp = await client.post("/v1/auth/phone", json={"phone": "12345"})
    assert resp.status_code == 422


async def test_the_old_otp_endpoints_are_gone(client):
    """They were public, so their absence is worth pinning: a stale client or a
    stray call must 404 rather than find a second way in."""
    request = await client.post("/v1/otp/request", json={"phone": "9876543210"})
    verify = await client.post("/v1/otp/verify", json={"request_id": "x", "code": "123456"})
    assert request.status_code == 404
    assert verify.status_code == 404


async def test_full_attempt_flow_still_works_alongside_sign_in(client):
    """Sanity check that the attempt/submit/result flow (fixtures, not DB)
    works end to end -- exercises the whole scaffold."""
    attempt_resp = await client.post("/v1/attempts", json={"test_id": "test-pwt-07"})
    assert attempt_resp.status_code == 200
    attempt = attempt_resp.json()

    patch_resp = await client.patch(
        f"/v1/attempts/{attempt['id']}/answers",
        json={"question_id": "q-arith-train-speed", "choice": 2, "marked": False},
    )
    assert patch_resp.status_code == 200

    submit_resp = await client.post(f"/v1/attempts/{attempt['id']}/submit")
    assert submit_resp.status_code == 200
    result_id = submit_resp.json()["result_id"]

    result_resp = await client.get(f"/v1/results/{result_id}")
    assert result_resp.status_code == 200
    result = result_resp.json()
    assert result["score"] >= 1.0  # got the one answered question correct
