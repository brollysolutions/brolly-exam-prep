"""The external proxy may strip /api or preserve it; both must use the same API."""

import pytest

from app.catalog import CATALOG


@pytest.mark.parametrize(
    "path",
    [
        "/health",
        "/v1/content",
        "/v1/tests",
        "/v1/tests/catalog",
        "/v1/tests/si-brolly-03",
        "/v1/tests/si-brolly-03/meta",
        "/v1/tests/si-brolly-03/paper",
    ],
)
async def test_api_prefix_serves_same_content(client, path):
    direct = await client.get(path)
    public = await client.get("/api" + path)
    assert direct.status_code == public.status_code == 200
    assert direct.json() == public.json()


async def test_public_schema_keeps_canonical_paths(client):
    direct = (await client.get("/openapi.json")).json()
    response = await client.get("/api/openapi.json")
    assert response.status_code == 200
    public = response.json()
    assert public["paths"] == direct["paths"]
    assert public["servers"] == [{"url": "/api"}]
    assert not any(path.startswith("/api") for path in public["paths"])
    assert (await client.get("/api")).json() == {"status": "ok"}


async def test_prefix_preserves_validation_and_missing_resource_errors(client):
    for prefix in ("", "/api"):
        assert (await client.get(prefix + "/v1/tests/missing")).status_code == 404
        assert (await client.get(prefix + "/v1/not-a-route")).status_code == 404
        response = await client.post(prefix + "/v1/attempts", json={})
        assert response.status_code == 422
        response = await client.post(prefix + "/v1/auth/phone", json={"phone": "invalid"})
        assert response.status_code == 422


async def test_prefixed_attempt_shares_state_and_submission_rules(client):
    response = await client.post("/api/v1/attempts", json={"test_id": "si-brolly-03"})
    assert response.status_code == 200
    attempt_id = response.json()["id"]
    for suffix in ("", "/paper", "/meta"):
        path = f"/v1/attempts/{attempt_id}{suffix}"
        direct = await client.get(path)
        public = await client.get("/api" + path)
        assert direct.status_code == public.status_code == 200
        assert direct.json() == public.json()
    for prefix in ("", "/api"):
        for suffix in ("/detail", "/paper"):
            response = await client.get(f"{prefix}/v1/results/{attempt_id}{suffix}")
            assert response.status_code == 409

    question = CATALOG["si-brolly-03"]["paper"][0]
    answer = {"question_id": question["id"], "choice": question["correct"], "seconds": 12}
    response = await client.patch(f"/api/v1/attempts/{attempt_id}/answers", json=answer)
    assert response.status_code == 200
    response = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        json={"answers": [answer], "elapsed_seconds": 12},
    )
    assert response.status_code == 200
    result_id = response.json()["result_id"]
    for suffix in ("", "/detail", "/paper"):
        path = f"/v1/results/{result_id}{suffix}"
        direct = await client.get(path)
        public = await client.get("/api" + path)
        assert direct.status_code == public.status_code == 200
        assert direct.json() == public.json()
    repeated = await client.post(f"/v1/attempts/{attempt_id}/submit", json={"answers": []})
    assert repeated.status_code == 200
    assert repeated.json()["result_id"] == result_id
    for prefix in ("", "/api"):
        response = await client.patch(f"{prefix}/v1/attempts/{attempt_id}/answers", json=answer)
        assert response.status_code == 409
