"""Published bilingual catalogue. Question banks are shipped only with the API."""

import json
from pathlib import Path

from fastapi import HTTPException

CATALOG = {
    row["meta"]["id"]: row
    for row in json.loads((Path(__file__).parent / "content/catalog.json").read_text("utf-8"))
}
SECTION_NAMES = {
    "arithmetic": {"en": "Arithmetic", "te": "అంకగణితం"},
    "reasoning": {"en": "Reasoning", "te": "రీజనింగ్"},
    "gs": {"en": "General Studies", "te": "జనరల్ స్టడీస్"},
    "telangana": {"en": "Telangana", "te": "తెలంగాణ"},
    "english": {"en": "English", "te": "ఇంగ్లీష్"},
}


def get_entry(test_id: str) -> dict:
    if test_id not in CATALOG:
        raise HTTPException(404, "Test not found")
    return CATALOG[test_id]


def public_paper(entry: dict) -> list[dict]:
    if entry["meta"]["kind"] == "previous":
        return entry["paper"]
    return [
        {key: value for key, value in question.items() if key not in {"correct", "explanation"}}
        for question in entry["paper"]
    ]


def summary(entry: dict) -> dict:
    meta = entry["meta"]
    pattern = meta["pattern"]
    return {
        "id": meta["id"],
        "slug": meta["id"],
        "title": meta["title"]["en"],
        "post": pattern["post"],
        "duration_minutes": pattern["durationMinutes"],
        "total_marks": pattern["totalQuestions"] * pattern["marksPerCorrect"],
        "section_count": len(pattern["sections"]),
        "question_count": len(entry["paper"]),
    }


def detail(entry: dict) -> dict:
    return {
        **summary(entry),
        "sections": [
            {
                "id": section["id"],
                "name": SECTION_NAMES[section["id"]],
                "order_index": i,
                "questions": [
                    {
                        "id": q["id"],
                        "section_id": q["section"],
                        "order_index": n,
                        "text": q["text"],
                        "options": q["options"],
                    }
                    for n, q in enumerate(entry["paper"])
                    if q["section"] == section["id"]
                ],
            }
            for i, section in enumerate(entry["meta"]["pattern"]["sections"])
        ],
    }
