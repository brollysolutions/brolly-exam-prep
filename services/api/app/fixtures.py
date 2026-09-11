"""In-memory sample/demo data + a tiny in-memory repository.

This phase serves /v1/tests, /v1/attempts and /v1/results entirely from the
structures defined here (no DB round-trip) -- the real schema exists in
app/models.py + the alembic migration for the next phase to wire up.

Question/section text is copied from prototype/extracted/template.html
(lines ~813-839, the QS/SECS arrays) so the API and the prototype agree on
sample content.

Marking scheme (matches the prototype's dashboard copy: "27 wrong answers"
causing "-6.75" negative marks, i.e. 0.25 per wrong answer):
  correct = +1.0, wrong = -0.25, skipped = 0.0
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

MARK_CORRECT = 1.0
MARK_WRONG = -0.25
MARK_SKIP = 0.0

# --------------------------------------------------------------- Sections --

SECTIONS: list[dict[str, Any]] = [
    {
        "id": "sec-arithmetic",
        "order_index": 0,
        "name": {"en": "Arithmetic", "te": "అంకగణితం"},
    },
    {
        "id": "sec-reasoning",
        "order_index": 1,
        "name": {"en": "Reasoning", "te": "రీజనింగ్"},
    },
    {
        "id": "sec-general-studies",
        "order_index": 2,
        "name": {"en": "General Studies", "te": "జనరల్ స్టడీస్"},
    },
    {
        "id": "sec-telangana",
        "order_index": 3,
        "name": {"en": "Telangana", "te": "తెలంగాణ"},
    },
]
SECTIONS_BY_ID = {s["id"]: s for s in SECTIONS}

# --------------------------------------------------------------- Questions -

QUESTIONS: list[dict[str, Any]] = [
    {
        "id": "q-arith-train-speed",
        "section_id": "sec-arithmetic",
        "order_index": 0,
        "text": {
            "en": "A train 180 metres long crosses a pole in 9 seconds. What is its speed in kilometres per hour?",
            "te": "180 మీటర్ల పొడవున్న రైలు ఒక స్తంభాన్ని 9 సెకన్లలో దాటుతుంది. దాని వేగం గంటకు ఎన్ని కిలోమీటర్లు?",
        },
        "options": {
            "en": ["60 km/h", "64 km/h", "72 km/h", "80 km/h"],
            "te": ["60 కి.మీ/గం", "64 కి.మీ/గం", "72 కి.మీ/గం", "80 కి.మీ/గం"],
        },
        "correct_index": 2,
        "explanation": {
            "en": "To cross a pole the train travels its own length. Speed = 180 ÷ 9 = 20 m/s. Convert by multiplying by 18/5: 20 × 18/5 = 72 km/h.",
            "te": "స్తంభాన్ని దాటడానికి రైలు తన పొడవునే ప్రయాణించాలి. వేగం = 180 ÷ 9 = 20 మీ/సె. కి.మీ/గం లోకి మార్చడానికి 18/5 తో గుణించాలి: 20 × 18/5 = 72.",
        },
    },
    {
        "id": "q-arith-cost-price",
        "section_id": "sec-arithmetic",
        "order_index": 1,
        "text": {
            "en": "An article sold at a 15% profit fetches ₹460. What was its cost price?",
            "te": "ఒక వస్తువును 15% లాభంతో అమ్మితే ₹460 వస్తుంది. ఆ వస్తువు కొన్న ధర ఎంత?",
        },
        "options": {
            "en": ["₹380", "₹400", "₹410", "₹425"],
            "te": ["₹380", "₹400", "₹410", "₹425"],
        },
        "correct_index": 1,
        "explanation": {
            "en": "Cost price × 1.15 = 460, so cost price = 460 ÷ 1.15 = ₹400.",
            "te": "కొన్న ధర × 1.15 = 460, కాబట్టి కొన్న ధర = 460 ÷ 1.15 = ₹400.",
        },
    },
    {
        "id": "q-reason-odd-one-out",
        "section_id": "sec-reasoning",
        "order_index": 0,
        "text": {
            "en": "Find the odd one out: 8, 27, 64, 100, 125",
            "te": "క్రింది వాటిలో సరిపోని దానిని గుర్తించండి: 8, 27, 64, 100, 125",
        },
        "options": {
            "en": ["27", "64", "100", "125"],
            "te": ["27", "64", "100", "125"],
        },
        "correct_index": 2,
        "explanation": {
            "en": "Of the numbers given, 8, 27, 64 and 125 are all perfect cubes (2³, 3³, 4³, 5³). 100 is a perfect square (10²), not a cube — so 100 is the odd one.",
            "te": "ఇచ్చిన వాటిలో 8, 27, 64, 125 అన్నీ ఘనాలు (2³, 3³, 4³, 5³). 100 మాత్రం ఒక వర్గం (10²) — ఘనం కాదు. కాబట్టి 100 సరిపోదు.",
        },
    },
    {
        "id": "q-reason-code-language",
        "section_id": "sec-reasoning",
        "order_index": 1,
        "text": {
            "en": "In a code language POLICE is written as QPMJDF. How is GUARD written in the same language?",
            "te": "ఒక సంకేత భాషలో POLICE అనే పదాన్ని QPMJDF అని రాస్తే, అదే భాషలో GUARD అనే పదాన్ని ఎలా రాస్తారు?",
        },
        "options": {
            "en": ["HVBSE", "HVBRE", "HUBSE", "GVBSE"],
            "te": ["HVBSE", "HVBRE", "HUBSE", "GVBSE"],
        },
        "correct_index": 0,
        "explanation": {
            "en": "Each letter moves one step forward in the alphabet: P→Q, O→P, L→M, I→J, C→D, E→F. Applying the same rule, GUARD becomes HVBSE.",
            "te": "ప్రతి అక్షరాన్ని ఇంగ్లిష్ వర్ణమాలలో ఒక స్థానం ముందుకు జరపాలి: P→Q, O→P, L→M, I→J, C→D, E→F. అదే నియమంతో GUARD → HVBSE.",
        },
    },
    {
        "id": "q-telangana-dakshina-ganga",
        "section_id": "sec-telangana",
        "order_index": 0,
        "text": {
            "en": "Which river is known as the Dakshina Ganga?",
            "te": "దక్షిణ గంగా అని పిలువబడే నది ఏది?",
        },
        "options": {
            "en": ["Krishna", "Godavari", "Tungabhadra", "Manjeera"],
            "te": ["కృష్ణా", "గోదావరి", "తుంగభద్ర", "మంజీరా"],
        },
        "correct_index": 1,
        "explanation": {
            "en": "The Godavari is called the Dakshina Ganga. It is the largest river flowing through Telangana.",
            "te": "గోదావరి నదిని దక్షిణ గంగా అని పిలుస్తారు. ఇది తెలంగాణ గుండా ప్రవహించే అతిపెద్ద నది.",
        },
    },
]
QUESTIONS_BY_ID = {q["id"]: q for q in QUESTIONS}

# ------------------------------------------------------------------- Test --

TEST: dict[str, Any] = {
    "id": "test-pwt-07",
    "slug": "pwt-full-mock-07",
    "title": "PWT Full Mock 07",
    "post": "pc",
    "duration_minutes": 150,
    "total_marks": 100.0,
    "cutoff": 40.0,
}
TESTS_BY_ID = {TEST["id"]: TEST}


def question_ids_for_section(section_id: str) -> list[str]:
    return [q["id"] for q in QUESTIONS if q["section_id"] == section_id]


def test_summary(test: dict[str, Any]) -> dict[str, Any]:
    section_count = len(SECTIONS)
    question_count = len(QUESTIONS)
    return {
        "id": test["id"],
        "slug": test["slug"],
        "title": test["title"],
        "post": test["post"],
        "duration_minutes": test["duration_minutes"],
        "total_marks": test["total_marks"],
        "section_count": section_count,
        "question_count": question_count,
    }


def test_detail(test: dict[str, Any]) -> dict[str, Any]:
    summary = test_summary(test)
    sections_out = []
    for sec in SECTIONS:
        qs = [
            {
                "id": q["id"],
                "section_id": q["section_id"],
                "order_index": q["order_index"],
                "text": q["text"],
                "options": q["options"],
            }
            for q in QUESTIONS
            if q["section_id"] == sec["id"]
        ]
        sections_out.append(
            {
                "id": sec["id"],
                "name": sec["name"],
                "order_index": sec["order_index"],
                "questions": qs,
            }
        )
    summary["sections"] = sections_out
    return summary


# ------------------------------------------------------- Attempts/results --
# Simple process-local repositories. Good enough for this phase (fixtures
# in-memory); replaced by real DB-backed repositories in a later phase.

ATTEMPTS: dict[str, dict[str, Any]] = {}
ATTEMPT_ANSWERS: dict[str, dict[str, dict[str, Any]]] = {}
RESULTS: dict[str, dict[str, Any]] = {}
# (user_id, client_attempt_id) -> server attempt id. Makes POST /v1/attempts
# idempotent: a client that retries an ambiguous create with the same key gets
# the same server attempt back instead of a duplicate.
ATTEMPTS_BY_CLIENT_KEY: dict[tuple[str, str], str] = {}


def create_attempt(
    test_id: str, user_id: str, client_attempt_id: str | None = None
) -> dict[str, Any] | None:
    test = TESTS_BY_ID.get(test_id)
    if test is None:
        return None
    if client_attempt_id is not None:
        existing_id = ATTEMPTS_BY_CLIENT_KEY.get((user_id, client_attempt_id))
        existing = ATTEMPTS.get(existing_id) if existing_id else None
        if existing is not None:
            return existing
    attempt_id = str(uuid.uuid4())
    started_at = datetime.now(UTC)
    ends_at = started_at + timedelta(minutes=test["duration_minutes"])
    attempt = {
        "id": attempt_id,
        "test_id": test_id,
        "started_at": started_at,
        "ends_at": ends_at,
        "status": "in_progress",
        "user_id": user_id,
    }
    ATTEMPTS[attempt_id] = attempt
    ATTEMPT_ANSWERS[attempt_id] = {}
    if client_attempt_id is not None:
        ATTEMPTS_BY_CLIENT_KEY[(user_id, client_attempt_id)] = attempt_id
    return attempt


def patch_answer(attempt_id: str, question_id: str, choice: int | None, marked: bool) -> bool:
    attempt = ATTEMPTS.get(attempt_id)
    if attempt is None or attempt["status"] != "in_progress":
        return False
    if question_id not in QUESTIONS_BY_ID:
        return False
    ATTEMPT_ANSWERS[attempt_id][question_id] = {"choice": choice, "marked": marked}
    return True


def submit_attempt(attempt_id: str) -> dict[str, Any] | None:
    """Score the attempt against the fixture answer key and persist a Result."""
    attempt = ATTEMPTS.get(attempt_id)
    if attempt is None:
        return None
    if attempt["status"] == "in_progress":
        attempt["status"] = "submitted"
        attempt["submitted_at"] = datetime.now(UTC)

    answers = ATTEMPT_ANSWERS.get(attempt_id, {})
    per_section: list[dict[str, Any]] = []
    wrong: list[dict[str, Any]] = []
    total_correct = total_wrong = total_skipped = 0
    total_marks = 0.0

    for sec in SECTIONS:
        sec_correct = sec_wrong = sec_skipped = 0
        sec_marks = 0.0
        for q in QUESTIONS:
            if q["section_id"] != sec["id"]:
                continue
            given = answers.get(q["id"])
            choice = given["choice"] if given else None
            if choice is None:
                sec_skipped += 1
                sec_marks += MARK_SKIP
                continue
            if choice == q["correct_index"]:
                sec_correct += 1
                sec_marks += MARK_CORRECT
            else:
                sec_wrong += 1
                sec_marks += MARK_WRONG
                wrong.append(
                    {
                        "question_id": q["id"],
                        "text": q["text"],
                        "options": q["options"],
                        "your_choice": choice,
                        "correct_choice": q["correct_index"],
                        "explanation": q["explanation"],
                    }
                )
        per_section.append(
            {
                "section_id": sec["id"],
                "name": sec["name"],
                "correct": sec_correct,
                "wrong": sec_wrong,
                "skipped": sec_skipped,
                "marks": sec_marks,
            }
        )
        total_correct += sec_correct
        total_wrong += sec_wrong
        total_skipped += sec_skipped
        total_marks += sec_marks

    attempted = total_correct + total_wrong
    accuracy = round((total_correct / attempted) * 100, 2) if attempted else 0.0
    test = TESTS_BY_ID[attempt["test_id"]]

    # The fixture set only has len(QUESTIONS) sample questions (raw marks
    # therefore top out at len(QUESTIONS)), but the test's advertised
    # total_marks is the full-mock value (100). Scale the raw marking-scheme
    # score up to that so `max_score` in the response always equals
    # test["total_marks"] and `score`/`cutoff` are in the same units.
    scale = (test["total_marks"] / len(QUESTIONS)) if QUESTIONS else 1.0
    scaled_score = round(total_marks * scale, 2)
    for sec_score in per_section:
        sec_score["marks"] = round(sec_score["marks"] * scale, 2)

    result_id = str(uuid.uuid4())
    result = {
        "id": result_id,
        "test_id": attempt["test_id"],
        "attempt_id": attempt_id,
        "score": scaled_score,
        "max_score": test["total_marks"],
        "cutoff": test["cutoff"],
        "qualified": scaled_score >= test["cutoff"],
        "rank": None,
        "accuracy": accuracy,
        "per_section": per_section,
        "wrong": wrong,
        "user_id": attempt.get("user_id"),
    }
    RESULTS[result_id] = result
    return result


# ------------------------------------------------ Canned demo result -----
# A full-length (100 question) result matching the prototype's result
# screen copy exactly: score 62.25/100, cutoff 40, and a marking scheme
# (-0.25/wrong) that reproduces the dashboard's "27 wrong -> -6.75" figure
# (69 correct - 27*0.25 = 62.25). Reachable at GET /v1/results/result-sample-01
# without creating an attempt first, for demoing/QA of the results screen.

SAMPLE_RESULT_ID = "result-sample-01"

_SAMPLE_PER_SECTION = [
    {
        "section_id": "sec-arithmetic",
        "name": SECTIONS_BY_ID["sec-arithmetic"]["name"],
        "correct": 18,
        "wrong": 6,
        "skipped": 1,
        "marks": 16.5,
    },
    {
        "section_id": "sec-reasoning",
        "name": SECTIONS_BY_ID["sec-reasoning"]["name"],
        "correct": 17,
        "wrong": 7,
        "skipped": 1,
        "marks": 15.25,
    },
    {
        "section_id": "sec-general-studies",
        "name": SECTIONS_BY_ID["sec-general-studies"]["name"],
        "correct": 20,
        "wrong": 9,
        "skipped": 1,
        "marks": 17.75,
    },
    {
        "section_id": "sec-telangana",
        "name": SECTIONS_BY_ID["sec-telangana"]["name"],
        "correct": 14,
        "wrong": 5,
        "skipped": 1,
        "marks": 12.75,
    },
]

_SAMPLE_WRONG = [
    {
        "question_id": q["id"],
        "text": q["text"],
        "options": q["options"],
        "your_choice": your_choice,
        "correct_choice": q["correct_index"],
        "explanation": q["explanation"],
    }
    for q, your_choice in (
        (QUESTIONS_BY_ID["q-arith-train-speed"], 1),
        (QUESTIONS_BY_ID["q-reason-odd-one-out"], 1),
        (QUESTIONS_BY_ID["q-reason-code-language"], 2),
    )
]

RESULTS[SAMPLE_RESULT_ID] = {
    "id": SAMPLE_RESULT_ID,
    "test_id": TEST["id"],
    "attempt_id": None,
    "score": 62.25,
    "max_score": TEST["total_marks"],
    "cutoff": TEST["cutoff"],
    "qualified": True,
    "rank": 128,
    "accuracy": round((69 / 96) * 100, 2),
    "per_section": _SAMPLE_PER_SECTION,
    "wrong": _SAMPLE_WRONG,
    "user_id": None,
}


# ---------------------------------------------- Extended read projections --

_SECTION_IDS = {
    "sec-arithmetic": "arithmetic",
    "sec-reasoning": "reasoning",
    "sec-general-studies": "gs",
    "sec-telangana": "telangana",
}


def get_test_meta(test_id: str) -> dict[str, Any] | None:
    test = TESTS_BY_ID.get(test_id)
    if test is None:
        return None
    scale = (test["total_marks"] / len(QUESTIONS)) if QUESTIONS else 1.0
    sections = []
    for section in SECTIONS:
        sid = _SECTION_IDS.get(section["id"], section["id"])
        sections.append(
            {
                "id": sid,
                "label_key": f"test.sections.{sid}",
                "questions": len(question_ids_for_section(section["id"])),
                "unlock_after": None,
            }
        )
    return {
        "id": test_id,
        "kind": "full",
        "title": {"en": test["title"], "te": test["title"]},
        "pattern": {
            "id": f"{test_id}-pattern",
            "post": test["post"],
            "total_questions": len(QUESTIONS),
            "duration_minutes": test["duration_minutes"],
            "marks_per_correct": MARK_CORRECT * scale,
            "negative_per_wrong": abs(MARK_WRONG * scale),
            "qualifying_only": True,
            "sections": sections,
            "verified": False,
            "source": "services/api fixture bank",
        },
        "full_mocks_only": True,
        "listed": True,
        "free": True,
        "attempted": None,
    }


def get_public_paper(test_id: str) -> list[dict[str, Any]] | None:
    if test_id not in TESTS_BY_ID:
        return None
    return [
        {
            "id": question["id"],
            "section": _SECTION_IDS.get(question["section_id"], question["section_id"]),
            "text": question["text"],
            "options": question["options"],
            "avg_seconds": 0,
        }
        for question in QUESTIONS
    ]


def get_attempt_detail(attempt_id: str) -> dict[str, Any] | None:
    attempt = ATTEMPTS.get(attempt_id)
    if attempt is None:
        return None
    answers = ATTEMPT_ANSWERS.get(attempt_id, {})
    return {
        **{k: attempt[k] for k in ("id", "test_id", "started_at", "ends_at", "status")},
        "answers": [
            {
                "question_id": question_id,
                "choice": answer.get("choice"),
                "marked": answer.get("marked", False),
            }
            for question_id, answer in answers.items()
        ],
    }


def get_result_detail(result_id: str) -> dict[str, Any] | None:
    result = RESULTS.get(result_id)
    if result is None:
        return None
    per_section = result["per_section"]
    correct = sum(row["correct"] for row in per_section)
    wrong = sum(row["wrong"] for row in per_section)
    skipped = sum(row["skipped"] for row in per_section)
    attempt_id = result.get("attempt_id")
    answers = ATTEMPT_ANSWERS.get(attempt_id, {}) if attempt_id else {}
    paper = get_public_paper(result["test_id"]) or []
    review = [
        {
            "question_no": index,
            "your": answers.get(question["id"], {}).get("choice"),
            "seconds": 0,
        }
        for index, question in enumerate(paper, start=1)
    ]
    match = re.search(r"(\d+)$", TESTS_BY_ID[result["test_id"]]["title"])
    scale = (result["max_score"] / len(QUESTIONS)) if QUESTIONS else 1.0
    return {
        "id": result_id,
        "test_title_n": int(match.group(1)) if match else 0,
        "title": get_test_meta(result["test_id"])["title"],
        "score": result["score"],
        "max_score": result["max_score"],
        "cutoff_pct": (result["cutoff"] / result["max_score"] * 100)
        if result["max_score"]
        else 0,
        "qualified": result["qualified"],
        "rank": result["rank"],
        "total_candidates": None,
        "accuracy_pct": result["accuracy"],
        "avg_seconds_per_question": 0,
        "negative_marks": wrong * MARK_WRONG * scale,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "actions": [],
        "review": review,
    }


def get_review_paper(result_id: str) -> list[dict[str, Any]] | None:
    result = RESULTS.get(result_id)
    if result is None:
        return None
    attempt_id = result.get("attempt_id")
    answers = ATTEMPT_ANSWERS.get(attempt_id, {}) if attempt_id else {}
    public = get_public_paper(result["test_id"]) or []
    by_id = {question["id"]: question for question in QUESTIONS}
    return [
        {
            **question,
            "your_choice": answers.get(question["id"], {}).get("choice"),
            "marked": answers.get(question["id"], {}).get("marked", False),
            "correct_choice": by_id[question["id"]]["correct_index"],
            "explanation": by_id[question["id"]]["explanation"],
            "seconds": 0,
        }
        for question in public
    ]
