"""SQLAlchemy 2.0 async ORM models for the real (Postgres-backed) schema.

These are not yet wired up to the routers -- endpoints in this phase serve
tests/attempts/results from in-memory fixtures (see app/fixtures.py) and OTP
from an in-memory store (see app/routers/otp.py). The models + migration
below define the target schema for the next phase.

Question/section text and options are stored as JSONB keyed by language code
("en" | "te"), e.g. {"en": "...", "te": "..."}.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    phone: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    post: Mapped[str | None] = mapped_column(String(8), nullable=True)  # 'pc' | 'si'
    category: Mapped[str | None] = mapped_column(String(8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attempts: Mapped[list[Attempt]] = relationship(back_populates="user")


class OtpCode(Base):
    """Persisted OTP audit trail. Not read at request time in this phase
    (OTP verification uses the in-memory store in app/routers/otp.py) but
    kept so a future phase can persist + audit sent codes."""

    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(15), index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[uuid.UUID] = _uuid_pk()
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    post: Mapped[str] = mapped_column(String(8), nullable=False, default="pc")  # 'pc' | 'si'
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    cutoff: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sections: Mapped[list[Section]] = relationship(
        back_populates="test", order_by="Section.order_index", cascade="all, delete-orphan"
    )
    attempts: Mapped[list[Attempt]] = relationship(back_populates="test")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = _uuid_pk()
    test_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"en":..,"te":..}
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    test: Mapped[Test] = relationship(back_populates="sections")
    questions: Mapped[list[Question]] = relationship(
        back_populates="section", order_by="Question.order_index", cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    test_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sections.id", ondelete="CASCADE"), index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    text: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"en":..,"te":..}
    options: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"en":[..],"te":[..]}
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    section: Mapped[Section] = relationship(back_populates="questions")
    answers: Mapped[list[Answer]] = relationship(back_populates="question")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = _uuid_pk()
    test_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    test: Mapped[Test] = relationship(back_populates="attempts")
    user: Mapped[User | None] = relationship(back_populates="attempts")
    answers: Mapped[list[Answer]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )
    result: Mapped[Result | None] = relationship(back_populates="attempt", uselist=False)


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    choice: Mapped[int | None] = mapped_column(Integer, nullable=True)
    marked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    attempt: Mapped[Attempt] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship(back_populates="answers")


class Result(Base):
    __tablename__ = "results"

    id: Mapped[uuid.UUID] = _uuid_pk()
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), unique=True, index=True
    )
    test_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    cutoff: Mapped[float] = mapped_column(Float, nullable=False)
    qualified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    per_section: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    wrong: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attempt: Mapped[Attempt] = relationship(back_populates="result")
