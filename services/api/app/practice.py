"""Server marking for anonymous, offline-capable practice (not a proctored exam)."""

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog import SECTION_NAMES
from app.models import PracticeAttempt
from app.schemas import AnswerPatchIn


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


async def load(session: AsyncSession, attempt_id: str, lock: bool = False) -> PracticeAttempt:
    query = select(PracticeAttempt).where(PracticeAttempt.id == attempt_id)
    if lock:
        query = query.with_for_update()
    attempt = (await session.execute(query)).scalar_one_or_none()
    if attempt is None:
        raise HTTPException(404, "Attempt not found")
    return attempt


def validate_answers(attempt: PracticeAttempt, rows: list[AnswerPatchIn]) -> dict:
    questions = {q["id"]: q for q in attempt.snapshot["paper"]}
    answers = {}
    for row in rows:
        q = questions.get(row.question_id)
        if q is None or (row.choice is not None and not 0 <= row.choice < len(q["options"]["en"])):
            raise HTTPException(422, "Question or choice does not belong to this paper")
        if row.question_id in answers:
            raise HTTPException(422, "Duplicate answer")
        answers[row.question_id] = row.model_dump()
    return answers


def mark(attempt: PracticeAttempt, elapsed_seconds: float | None) -> dict:
    meta = attempt.snapshot["meta"]
    pattern = meta["pattern"]
    paper = attempt.snapshot["paper"]
    per_section, wrong_rows, review = [], [], []
    total_correct = total_wrong = total_skipped = 0
    score = 0
    for section in pattern["sections"]:
        correct = wrong = skipped = 0
        for n, q in enumerate(paper, 1):
            if q["section"] != section["id"]:
                continue
            answer = attempt.answers.get(q["id"], {})
            choice = answer.get("choice")
            review.append({"questionNo": n, "your": choice, "seconds": answer.get("seconds", 0)})
            if choice is None:
                skipped += 1
            elif choice == q["correct"]:
                correct += 1
            else:
                wrong += 1
            if choice != q["correct"]:
                wrong_rows.append(
                    {
                        "question_id": q["id"],
                        "text": q["text"],
                        "options": q["options"],
                        "your_choice": choice,
                        "correct_choice": q["correct"],
                        "explanation": q["explanation"],
                    }
                )
        marks = correct * pattern["marksPerCorrect"] - wrong * pattern["negativePerWrong"]
        per_section.append(
            {
                "section_id": section["id"],
                "name": SECTION_NAMES[section["id"]],
                "correct": correct,
                "wrong": wrong,
                "skipped": skipped,
                "marks": round(marks, 2),
            }
        )
        score += marks
        total_correct += correct
        total_wrong += wrong
        total_skipped += skipped
    answered = total_correct + total_wrong
    maximum = len(paper) * pattern["marksPerCorrect"]
    elapsed = elapsed_seconds
    if elapsed is None:
        elapsed = (datetime.now(UTC) - utc(attempt.started_at)).total_seconds()
    elapsed = min(max(0, elapsed), pattern["durationMinutes"] * 60)
    accuracy = round(total_correct / answered * 100, 2) if answered else 0
    result_id = attempt.id
    return {
        "summary": {
            "id": result_id,
            "test_id": attempt.test_id,
            "attempt_id": attempt.id,
            "score": round(score, 2),
            "max_score": maximum,
            "cutoff": maximum * 0.4,
            "qualified": maximum > 0 and score >= maximum * 0.4,
            "rank": None,
            "accuracy": accuracy,
            "per_section": per_section,
            "wrong": wrong_rows,
        },
        "detail": {
            "id": result_id,
            "testTitleN": 1,
            "title": meta["title"],
            "score": round(score, 2),
            "maxScore": maximum,
            "cutoffPct": 40,
            "qualified": maximum > 0 and score >= maximum * 0.4,
            "accuracyPct": accuracy,
            "avgSecondsPerQuestion": elapsed / answered if answered else 0,
            "negativeMarks": -round(total_wrong * pattern["negativePerWrong"], 2) or 0,
            "correct": total_correct,
            "wrong": total_wrong,
            "skipped": total_skipped,
            "actions": [],
            "review": sorted(review, key=lambda row: row["questionNo"]),
        },
    }
