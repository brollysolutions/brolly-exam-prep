from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import CATALOG
from app.models import PracticeAttempt


async def test_entire_catalog_preserves_bilingual_papers_and_keys(client):
    response = await client.get("/v1/tests/catalog")
    assert response.status_code == 200
    assert len(response.json()) == len(CATALOG)
    for meta in response.json():
        entry = CATALOG[meta["id"]]
        assert meta == entry["meta"]
        response = await client.get(f"/v1/tests/{meta['id']}/paper")
        assert response.status_code == 200
        questions = response.json()
        assert len(questions) == meta["pattern"]["totalQuestions"]
        assert len({q["id"] for q in questions}) == len(questions)
        for original, public in zip(entry["paper"], questions, strict=True):
            assert public["text"] == original["text"]
            assert public["options"] == original["options"]
            if meta["kind"] == "full":
                assert "correct" not in public and "explanation" not in public


@pytest.mark.parametrize("test_id", ["si-brolly-01", "si-brolly-02", "pc-constable-01"])
async def test_server_submission_and_review_are_persisted_and_idempotent(client, test_id):
    entry = CATALOG[test_id]
    response = await client.post("/v1/attempts", json={"test_id": test_id})
    assert response.status_code == 200
    attempt = response.json()
    assert (
        datetime.fromisoformat(attempt["ends_at"]) - datetime.fromisoformat(attempt["started_at"])
    ).total_seconds() == (entry["meta"]["pattern"]["durationMinutes"] * 60)
    attempt_id = attempt["id"]
    assert (await client.get(f"/v1/results/{attempt_id}/detail")).status_code == 409
    assert (await client.get(f"/v1/results/{attempt_id}/paper")).status_code == 409
    q1, q2 = entry["paper"][:2]
    body = {
        "answers": [
            {"question_id": q1["id"], "choice": q1["correct"], "seconds": 12},
            {"question_id": q2["id"], "choice": (q2["correct"] + 1) % 4, "seconds": 20},
        ],
        "elapsed_seconds": 40,
    }
    response = await client.post(f"/v1/attempts/{attempt_id}/submit", json=body)
    assert response.status_code == 200
    result_id = response.json()["result_id"]
    # Each GET uses a new SQLAlchemy session: results are not held in the router's memory.
    detail = (await client.get(f"/v1/results/{result_id}/detail")).json()
    assert (detail["correct"], detail["wrong"], detail["skipped"]) == (1, 1, 198)
    assert detail["score"] == 1 and detail["maxScore"] == 200
    assert detail["review"][0]["seconds"] == 12
    assert detail["avgSecondsPerQuestion"] == 20
    reviewed = (await client.get(f"/v1/results/{result_id}/paper")).json()
    assert reviewed == entry["paper"]
    repeated = await client.post(f"/v1/attempts/{attempt_id}/submit", json={"answers": []})
    assert repeated.json()["result_id"] == result_id
    assert (await client.get(f"/v1/results/{result_id}/detail")).json() == detail
    response = await client.patch(f"/v1/attempts/{attempt_id}/answers", json=body["answers"][0])
    assert response.status_code == 409


async def test_invalid_choices_and_cross_paper_answers_are_rejected(client):
    attempt = (await client.post("/v1/attempts", json={"test_id": "si-brolly-02"})).json()
    path = f"/v1/attempts/{attempt['id']}"
    for row in [
        {"question_id": CATALOG["si-brolly-01"]["paper"][0]["id"], "choice": 1},
        {"question_id": CATALOG["si-brolly-02"]["paper"][0]["id"], "choice": 4},
        {"question_id": CATALOG["si-brolly-02"]["paper"][0]["id"], "choice": -1},
    ]:
        assert (await client.patch(path + "/answers", json=row)).status_code == 422
        assert (await client.post(path + "/submit", json={"answers": [row]})).status_code == 422
    assert (await client.get(f"/v1/results/{attempt['id']}/paper")).status_code == 409
    assert (await client.post("/v1/attempts", json={"test_id": "missing"})).status_code == 404
    assert (await client.post("/v1/attempts", json={"test_id": "mock-08"})).status_code == 403


async def test_expired_practice_accepts_one_final_offline_snapshot(client, practice_db):
    attempt = (await client.post("/v1/attempts", json={"test_id": "si-brolly-01"})).json()
    async with AsyncSession(bind=practice_db, join_transaction_mode="create_savepoint") as session:
        record = await session.get(PracticeAttempt, attempt["id"])
        record.ends_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()
    path = f"/v1/attempts/{attempt['id']}"
    question = CATALOG["si-brolly-01"]["paper"][0]
    row = {"question_id": question["id"], "choice": question["correct"]}
    assert (await client.patch(path + "/answers", json=row)).status_code == 409
    assert (await client.post(path + "/submit", json={"answers": [row]})).status_code == 200
    assert (await client.get(path)).json()["status"] == "auto_submitted"
    assert (await client.get(f"/v1/results/{attempt['id']}")).json()["score"] == 1


async def test_attempt_keeps_its_paper_when_catalog_changes(client, monkeypatch):
    from copy import deepcopy

    entry = deepcopy(CATALOG["si-brolly-01"])
    attempt = (await client.post("/v1/attempts", json={"test_id": "si-brolly-01"})).json()
    changed = deepcopy(entry)
    changed["paper"][0]["text"]["en"] = "Updated after this attempt began"
    changed["meta"]["pattern"]["durationMinutes"] = 1
    monkeypatch.setitem(CATALOG, "si-brolly-01", changed)
    path = f"/v1/attempts/{attempt['id']}"
    assert (await client.get(path + "/meta")).json() == entry["meta"]
    assert (await client.get(path + "/paper")).json()[0]["text"] == entry["paper"][0]["text"]
    await client.post(path + "/submit")
    assert (await client.get(f"/v1/results/{attempt['id']}/paper")).json() == entry["paper"]
