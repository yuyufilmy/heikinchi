from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
    Numeric,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    username: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp()
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("categories.id"),
        nullable=True
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    category_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("categories.id")
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    answer_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    aggregation_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    # ORDINARY / EXTRA
    question_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ORDINARY",
        server_default="ORDINARY"
    )

    is_published: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id")
    )

    option_key: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    option_text: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0
    )


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id")
    )

    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id")
    )

    selected_option_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("question_options.id"),
        nullable=True
    )

    numeric_value: Mapped[float | None] = mapped_column(
        Numeric(15, 4),
        nullable=True
    )

    text_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )


class QuestionStatistics(Base):
    __tablename__ = "question_statistics"

    question_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("questions.id"),
        primary_key=True
    )

    total_answers: Mapped[int] = mapped_column(
        BigInteger,
        default=0
    )

    numeric_sum: Mapped[float] = mapped_column(
        Numeric(20, 4),
        default=0
    )

    numeric_average: Mapped[float | None] = mapped_column(
        Numeric(20, 4),
        nullable=True
    )


class OptionStatistics(Base):
    __tablename__ = "option_statistics"

    option_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("question_options.id"),
        primary_key=True
    )

    answer_count: Mapped[int] = mapped_column(
        BigInteger,
        default=0
    )

    percentage: Mapped[float] = mapped_column(
        Numeric(7, 4),
        default=0
    )