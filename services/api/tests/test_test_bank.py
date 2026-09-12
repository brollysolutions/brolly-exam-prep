from datetime import datetime

import pytest

from app.test_bank import PAPERS, BankPaper
from tests.test_extended_api import assert_no_answer_key, auth_headers


@pytest.mark.parametrize("test_id", ["si-brolly-01", "si-brolly-02", "pc-constable-01"])
async def test_full_paper_lifecycle(client, test_id):
    bank = PAPERS[test_id]
    headers = await auth_headers(client, "9000010101")
    meta = (await client.get(f"/v1/tests/{test_id}/meta")).json()
    paper = (await client.get(f"/v1/tests/{test_id}/paper")).json()
    assert meta == bank["meta"]
    assert len(paper) == 200
    assert [q["id"] for q in paper] == [q["id"] for q in bank["questions"]]
    assert_no_answer_key(paper)
    detail = (await client.get(f"/v1/tests/{test_id}")).json()
    assert sum(len(s["questions"]) for s in detail["sections"]) == 200
    assert_no_answer_key(detail)

    response = await client.post("/v1/attempts", json={"test_id": test_id}, headers=headers)
    assert response.status_code == 200
    attempt = response.json()
    duration = datetime.fromisoformat(attempt["ends_at"]) - datetime.fromisoformat(
        attempt["started_at"]
    )
    assert duration.total_seconds() == meta["pattern"]["duration_minutes"] * 60
    base = f"/v1/attempts/{attempt['id']}"
    owned_paper = await client.get(f"{base}/paper", headers=headers)
    assert owned_paper.json() == paper
    for q in bank["questions"]:
        response = await client.patch(
            f"{base}/answers",
            json={"question_id": q["id"], "choice": q["correct_choice"], "marked": False},
            headers=headers,
        )
        assert response.status_code == 200
    submitted = await client.post(f"{base}/submit", headers=headers)
    assert submitted.status_code == 200
    result_id = submitted.json()["result_id"]
    result = (await client.get(f"/v1/results/{result_id}/detail", headers=headers)).json()
    assert result["score"] == result["max_score"] == 200
    assert result["correct"] == 200
    assert result["wrong"] == result["skipped"] == result["negative_marks"] == 0
    assert result["title"] == meta["title"]
    review = (await client.get(f"/v1/results/{result_id}/paper", headers=headers)).json()
    assert len(review) == 200
    for actual, expected in zip(review, bank["questions"], strict=True):
        assert actual["correct_choice"] == actual["your_choice"] == expected["correct_choice"]
        assert actual["explanation"] == expected["explanation"]
        assert actual["text"] == expected["text"]
    stranger = await auth_headers(client, "9000010102")
    assert (await client.get(f"/v1/results/{result_id}/paper", headers=stranger)).status_code == 404


async def test_answers_are_scoped_to_the_paper_and_zero_penalty_is_preserved(client):
    headers = await auth_headers(client, "9000010103")
    attempt = (
        await client.post("/v1/attempts", json={"test_id": "pc-constable-01"}, headers=headers)
    ).json()
    base = f"/v1/attempts/{attempt['id']}"
    foreign = PAPERS["si-brolly-01"]["questions"][0]
    response = await client.patch(
        f"{base}/answers", json={"question_id": foreign["id"], "choice": 0}, headers=headers
    )
    assert response.status_code == 400
    first, second = PAPERS["pc-constable-01"]["questions"][:2]
    for bad_choice in (-1, 4):
        response = await client.patch(
            f"{base}/answers",
            json={"question_id": first["id"], "choice": bad_choice},
            headers=headers,
        )
        assert response.status_code == 400
    for q, choice in [
        (first, first["correct_choice"]),
        (second, (second["correct_choice"] + 1) % 4),
    ]:
        response = await client.patch(
            f"{base}/answers", json={"question_id": q["id"], "choice": choice}, headers=headers
        )
        assert response.status_code == 200
    result_id = (await client.post(f"{base}/submit", headers=headers)).json()["result_id"]
    result = (await client.get(f"/v1/results/{result_id}/detail", headers=headers)).json()
    assert result["score"] == 1
    assert (result["correct"], result["wrong"], result["skipped"]) == (1, 1, 198)
    assert result["negative_marks"] == 0


def test_bank_rejects_section_order_drift():
    import copy

    bank = copy.deepcopy(PAPERS["pc-constable-01"])
    bank["questions"].reverse()
    with pytest.raises(ValueError, match="order/section"):
        BankPaper.model_validate(bank)
