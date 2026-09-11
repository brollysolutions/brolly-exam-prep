from __future__ import annotations

from typing import Any


async def auth_headers(client, phone: str) -> dict[str, str]:
    response = await client.post("/v1/auth/phone", json={"phone": phone})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def assert_no_answer_key(value: Any) -> None:
    forbidden = {"correct", "correct_index", "correct_choice", "explanation"}
    if isinstance(value, dict):
        assert forbidden.isdisjoint(value)
        for child in value.values():
            assert_no_answer_key(child)
    elif isinstance(value, list):
        for child in value:
            assert_no_answer_key(child)


async def create_attempt(client, headers: dict[str, str]) -> dict:
    response = await client.post(
        "/v1/attempts", json={"test_id": "test-pwt-07"}, headers=headers
    )
    assert response.status_code == 200
    return response.json()


async def submit_attempt(client, attempt_id: str, headers: dict[str, str]) -> str:
    response = await client.post(f"/v1/attempts/{attempt_id}/submit", headers=headers)
    assert response.status_code == 200
    return response.json()["result_id"]


async def test_create_attempt_accepts_the_canonical_test_id(client):
    headers = await auth_headers(client, "9000012121")
    response = await client.post(
        "/v1/attempts", json={"test_id": "test-pwt-07"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["test_id"] == "test-pwt-07"
    assert response.json()["status"] == "in_progress"


async def test_create_attempt_is_idempotent_for_a_client_key(client):
    """A retried create with the same client_attempt_id returns the same server attempt,
    so an offline-created attempt can be backfilled without duplicating it on a crash/retry."""
    headers = await auth_headers(client, "9000013131")
    first = await client.post(
        "/v1/attempts",
        json={"test_id": "test-pwt-07", "client_attempt_id": "local-abc-1"},
        headers=headers,
    )
    second = await client.post(
        "/v1/attempts",
        json={"test_id": "test-pwt-07", "client_attempt_id": "local-abc-1"},
        headers=headers,
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


async def test_create_attempt_client_key_is_scoped_per_user(client):
    """The same client key from two different users must not collide onto one attempt."""
    one = await auth_headers(client, "9000014141")
    two = await auth_headers(client, "9000015151")
    a = await client.post(
        "/v1/attempts",
        json={"test_id": "test-pwt-07", "client_attempt_id": "shared-key"},
        headers=one,
    )
    b = await client.post(
        "/v1/attempts",
        json={"test_id": "test-pwt-07", "client_attempt_id": "shared-key"},
        headers=two,
    )
    assert a.json()["id"] != b.json()["id"]


async def test_create_attempt_without_client_key_creates_distinct_attempts(client):
    headers = await auth_headers(client, "9000016161")
    a = await client.post("/v1/attempts", json={"test_id": "test-pwt-07"}, headers=headers)
    b = await client.post("/v1/attempts", json={"test_id": "test-pwt-07"}, headers=headers)
    assert a.json()["id"] != b.json()["id"]


async def test_content_returns_all_non_test_feeds(client):
    response = await client.get("/v1/content")
    assert response.status_code == 200
    body = response.json()
    assert body["version"]
    assert body["notices"]
    assert body["affairs"]
    assert body["study_sections"]
    assert body["categories"]
    assert body["physical_standards"]
    assert "tests" not in body


async def test_catalog_meta_and_public_paper(client):
    catalog = await client.get("/v1/tests/catalog")
    meta = await client.get("/v1/tests/test-pwt-07/meta")
    paper = await client.get("/v1/tests/test-pwt-07/paper")
    assert catalog.status_code == meta.status_code == paper.status_code == 200
    assert catalog.json()[0]["id"] == "test-pwt-07"
    assert meta.json()["pattern"]["total_questions"] == 5
    assert len(paper.json()) == 5
    assert_no_answer_key(catalog.json())
    assert_no_answer_key(meta.json())
    assert_no_answer_key(paper.json())


async def test_attempt_reads_require_owner_and_never_leak_keys(client):
    owner = await auth_headers(client, "9000055555")
    stranger = await auth_headers(client, "9000066666")
    attempt = await create_attempt(client, owner)

    assert (await client.get(f"/v1/attempts/{attempt['id']}")).status_code == 401
    assert (
        await client.get(f"/v1/attempts/{attempt['id']}", headers=stranger)
    ).status_code == 404

    detail = await client.get(f"/v1/attempts/{attempt['id']}", headers=owner)
    paper = await client.get(f"/v1/attempts/{attempt['id']}/paper", headers=owner)
    meta = await client.get(f"/v1/attempts/{attempt['id']}/meta", headers=owner)
    assert detail.status_code == paper.status_code == meta.status_code == 200
    assert detail.json()["id"] == attempt["id"]
    assert_no_answer_key(paper.json())
    assert_no_answer_key(meta.json())


async def test_result_and_review_are_owner_only_after_submission(client):
    owner = await auth_headers(client, "9000077777")
    stranger = await auth_headers(client, "9000088888")
    attempt = await create_attempt(client, owner)
    patch = await client.patch(
        f"/v1/attempts/{attempt['id']}/answers",
        json={"question_id": "q-arith-train-speed", "choice": 1, "marked": True},
        headers=owner,
    )
    assert patch.status_code == 200
    result_id = await submit_attempt(client, attempt["id"], owner)

    for suffix in ("", "/detail", "/paper"):
        path = f"/v1/results/{result_id}{suffix}"
        assert (await client.get(path)).status_code == 401
        assert (await client.get(path, headers=stranger)).status_code == 404
        assert (await client.get(path, headers=owner)).status_code == 200

    review = (await client.get(f"/v1/results/{result_id}/paper", headers=owner)).json()
    assert review[0]["correct_choice"] == 2
    assert review[0]["your_choice"] == 1
    assert review[0]["marked"] is True
    assert review[0]["explanation"]["en"]


async def test_canned_demo_result_remains_available_only_after_sign_in(client):
    path = "/v1/results/result-sample-01"
    assert (await client.get(path)).status_code == 401
    headers = await auth_headers(client, "9000077000")
    assert (await client.get(path, headers=headers)).status_code == 200


async def test_all_new_id_routes_return_404(client):
    headers = await auth_headers(client, "9000099999")
    public_paths = (
        "/v1/tests/missing/meta",
        "/v1/tests/missing/paper",
    )
    protected_paths = (
        "/v1/attempts/missing",
        "/v1/attempts/missing/paper",
        "/v1/attempts/missing/meta",
        "/v1/results/missing/detail",
        "/v1/results/missing/paper",
    )
    for path in public_paths:
        assert (await client.get(path)).status_code == 404
    for path in protected_paths:
        assert (await client.get(path, headers=headers)).status_code == 404


async def test_openapi_lists_all_requested_routes(client):
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    requested = {
        "/v1/content",
        "/v1/tests/catalog",
        "/v1/tests/{test_id}/meta",
        "/v1/tests/{test_id}/paper",
        "/v1/attempts/{attempt_id}",
        "/v1/attempts/{attempt_id}/paper",
        "/v1/attempts/{attempt_id}/meta",
        "/v1/results/{result_id}/detail",
        "/v1/results/{result_id}/paper",
    }
    assert requested <= set(paths)
    assert response.json()["info"]["version"] == "0.2.0"
