"""OTP flow tests -- run entirely without a database (OTP_DEV_MODE=true uses
an in-memory store, see app/routers/otp.py). The dev OTP is always 123456.
"""

from __future__ import annotations


async def test_otp_request_returns_dev_code(client):
    resp = await client.post("/v1/otp/request", json={"phone": "9876543210"})
    assert resp.status_code == 200
    body = resp.json()
    assert "request_id" in body
    assert body["dev_code"] == "123456"


async def test_otp_verify_with_correct_code_succeeds(client):
    req = await client.post("/v1/otp/request", json={"phone": "9876543210"})
    request_id = req.json()["request_id"]

    resp = await client.post("/v1/otp/verify", json={"request_id": request_id, "code": "123456"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["user"]["phone"] == "9876543210"


async def test_otp_verify_with_wrong_code_fails(client):
    req = await client.post("/v1/otp/request", json={"phone": "9998887770"})
    request_id = req.json()["request_id"]

    resp = await client.post("/v1/otp/verify", json={"request_id": request_id, "code": "000000"})
    assert resp.status_code == 400


async def test_otp_verify_unknown_request_id_fails(client):
    resp = await client.post(
        "/v1/otp/verify", json={"request_id": "does-not-exist", "code": "123456"}
    )
    assert resp.status_code == 404


async def test_otp_verify_same_code_twice_fails(client):
    req = await client.post("/v1/otp/request", json={"phone": "9111122223"})
    request_id = req.json()["request_id"]

    first = await client.post("/v1/otp/verify", json={"request_id": request_id, "code": "123456"})
    assert first.status_code == 200

    second = await client.post("/v1/otp/verify", json={"request_id": request_id, "code": "123456"})
    assert second.status_code == 400


async def test_full_attempt_flow_uses_otp_issued_token_free(client):
    """Sanity check that the attempt/submit/result flow (fixtures, not DB)
    works end to end alongside OTP -- exercises the whole scaffold."""
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
