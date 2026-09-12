from __future__ import annotations


async def test_health_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_list_tests(client):
    resp = await client.get("/v1/tests")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 10
    assert {
        "si-brolly-01",
        "si-brolly-02",
        "si-brolly-03",
        "pc-constable-01",
        "pc-constable-02",
        "pc-constable-03",
    } <= {t["id"] for t in body}


async def test_get_test_detail_has_no_correct_answers(client):
    resp = await client.get("/v1/tests/si-brolly-01")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["sections"]) == 3
    all_questions = [q for sec in body["sections"] for q in sec["questions"]]
    assert len(all_questions) == 200
    for q in all_questions:
        assert "correct_index" not in q
        assert "explanation" not in q


async def test_get_test_not_found(client):
    resp = await client.get("/v1/tests/does-not-exist")
    assert resp.status_code == 404
