"""Pydantic v2 request/response models.

Every model here has a matching zod schema in packages/api-contracts/src/index.ts
-- keep the two in sync (see .claude/rules/api.md).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Lang = Literal["en", "te"]
Post = Literal["pc", "si"]
Category = Literal["OC", "EWS", "BC", "SC", "ST", "ExS"]


class LocalizedText(BaseModel):
    en: str
    te: str


class LocalizedOptions(BaseModel):
    en: list[str]
    te: list[str]


# ------------------------------------------------------------ Sign-in ----


class PhoneSignInIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=16, pattern=r"^\+?[0-9]{10,15}$")


class UserOut(BaseModel):
    id: str
    phone: str


class PhoneSignInOut(BaseModel):
    token: str
    user: UserOut


# --------------------------------------------------------------- Tests ----


class QuestionOut(BaseModel):
    """Public question shape -- no correct_index / explanation."""

    id: str
    section_id: str
    order_index: int
    text: LocalizedText
    options: LocalizedOptions


class SectionOut(BaseModel):
    id: str
    name: LocalizedText
    order_index: int
    questions: list[QuestionOut]


class TestSummary(BaseModel):
    id: str
    slug: str
    title: str
    post: Post
    duration_minutes: int
    total_marks: float
    section_count: int
    question_count: int


class TestDetail(TestSummary):
    sections: list[SectionOut]


# ------------------------------------------------------------ Attempts ----


class AttemptCreateIn(BaseModel):
    test_id: str


class AttemptOut(BaseModel):
    id: str
    test_id: str
    started_at: datetime
    ends_at: datetime
    status: Literal["in_progress", "submitted", "auto_submitted"]


class AnswerPatchIn(BaseModel):
    question_id: str
    choice: int | None = Field(default=None, strict=True, ge=0, le=3)
    marked: bool = False
    seconds: float = Field(default=0, ge=0, allow_inf_nan=False)


class OkOut(BaseModel):
    ok: bool = True


class SubmitOut(BaseModel):
    result_id: str


# ------------------------------------------------------------- Results ----


class SectionScore(BaseModel):
    section_id: str
    name: LocalizedText
    correct: int
    wrong: int
    skipped: int
    marks: float


class WrongAnswer(BaseModel):
    question_id: str
    text: LocalizedText
    options: LocalizedOptions
    your_choice: int | None
    correct_choice: int
    explanation: LocalizedText


class ResultOut(BaseModel):
    id: str
    test_id: str
    attempt_id: str | None = None
    score: float
    max_score: float
    cutoff: float
    qualified: bool
    rank: int | None
    accuracy: float
    per_section: list[SectionScore]
    wrong: list[WrongAnswer]


SectionId = Literal["arithmetic", "reasoning", "gs", "telangana", "english"]


class PatternSection(BaseModel):
    id: SectionId
    labelKey: str
    questions: int
    unlockAfter: SectionId | None = None


class ExamPatternOut(BaseModel):
    id: str
    post: Post
    totalQuestions: int
    durationMinutes: int
    marksPerCorrect: float
    negativePerWrong: float
    qualifyingOnly: bool
    sections: list[PatternSection]
    verified: bool
    source: str


class TestMetaOut(BaseModel):
    id: str
    kind: Literal["full", "previous"]
    title: LocalizedText
    pattern: ExamPatternOut
    free: bool
    demo: bool | None = None
    fullMocksOnly: bool | None = None
    listed: bool | None = None


class PaperQuestionOut(BaseModel):
    id: str
    section: SectionId
    text: LocalizedText
    options: LocalizedOptions
    avgSeconds: float
    correct: int | None = None
    explanation: LocalizedText | None = None


class ReviewPaperQuestionOut(PaperQuestionOut):
    correct: int
    explanation: LocalizedText


class SubmitIn(BaseModel):
    # Offline practice snapshot; saved atomically with the result. Retrying is idempotent.
    answers: list[AnswerPatchIn] | None = Field(default=None, max_length=1000)
    elapsed_seconds: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class ReviewRowOut(BaseModel):
    questionNo: int
    your: int | None
    seconds: float


class ResultActionOut(BaseModel):
    id: str
    title: LocalizedText
    sub: LocalizedText


class ResultDetailOut(BaseModel):
    id: str
    testTitleN: int
    title: LocalizedText
    score: float
    maxScore: float
    cutoffPct: float
    qualified: bool
    accuracyPct: float
    avgSecondsPerQuestion: float
    negativeMarks: float
    correct: int
    wrong: int
    skipped: int
    actions: list[ResultActionOut]
    review: list[ReviewRowOut]


class StudyTextBlock(BaseModel):
    kind: Literal["heading", "para", "formula", "example", "tip"]
    text: LocalizedText


class StudyBulletsBlock(BaseModel):
    kind: Literal["bullets"]
    items: list[LocalizedText]


class StudyTopicOut(BaseModel):
    id: str
    section: SectionId
    title: LocalizedText
    minutes: float
    blocks: list[StudyTextBlock | StudyBulletsBlock]


class StudySectionOut(BaseModel):
    id: SectionId
    labelKey: str
    topics: list[StudyTopicOut]


class NoticeOut(BaseModel):
    id: str
    kind: Literal["notification", "admitCard", "examDate", "result", "pet"]
    date: str
    title: LocalizedText
    body: LocalizedText
    link: str | None = None


class AffairOut(BaseModel):
    id: str
    date: str
    category: Literal["india", "telangana", "world", "sports", "awards"]
    headline: LocalizedText
    summary: LocalizedText


class ExamInfoOut(BaseModel):
    pwtDate: str
    label: LocalizedText


class CategoryOut(BaseModel):
    id: Literal["oc", "ews", "bc", "sc", "st", "exs"]
    labelKey: str
    qualifyingPct: float


class PatternsOut(BaseModel):
    pc: ExamPatternOut
    si: ExamPatternOut
    short: ExamPatternOut


class StandardOut(BaseModel):
    value: float
    dir: Literal["min", "max"]
    verified: bool


class ChestOut(BaseModel):
    unexpanded: StandardOut
    expansion: StandardOut


class PhysicalStandardsOut(BaseModel):
    post: Post
    gender: Literal["male", "female"]
    group: Literal["general", "st"]
    height: StandardOut
    chest: ChestOut | None = None
    run1600m: StandardOut | None = None
    run800m: StandardOut | None = None
    run100m: StandardOut | None = None
    longJump: StandardOut
    shotPut: StandardOut
    shotKg: float


class GroupStandardsOut(BaseModel):
    general: PhysicalStandardsOut
    st: PhysicalStandardsOut


class GenderStandardsOut(BaseModel):
    male: GroupStandardsOut
    female: GroupStandardsOut


class PostStandardsOut(BaseModel):
    pc: GenderStandardsOut
    si: GenderStandardsOut


class CostRowsOut(BaseModel):
    en: list[list[str]]
    te: list[list[str]]


class AppContentOut(BaseModel):
    studySections: list[StudySectionOut]
    notices: list[NoticeOut]
    affairs: list[AffairOut]
    examInfo: ExamInfoOut
    categories: list[CategoryOut]
    patterns: PatternsOut
    physicalStandards: PostStandardsOut
    standardsNotificationYear: int
    costRows: CostRowsOut
