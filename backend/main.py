from decimal import Decimal
from datetime import datetime
import hashlib
import secrets


from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware

from database import get_db, engine, Base

from admin_auth import (
    admin_login,
    admin_logout,
    require_admin,
)

from models import (
    User,
    Category,
    Question,
    QuestionOption,
    Answer,
    QuestionStatistics,
    OptionStatistics,
)

Base.metadata.create_all(bind=engine)
# =========================
# FastAPI
# =========================

app = FastAPI(title="平均値 API")


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://heikinchi-web.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# パスワード関連
# ==================================================

def hash_password(password: str) -> str:
    """
    パスワードを安全にハッシュ化する。
    DBには元のパスワードを保存しない。
    """

    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        310000
    )

    return (
        salt.hex()
        + ":"
        + password_hash.hex()
    )


def verify_password(
    password: str,
    stored_hash: str
) -> bool:
    """
    入力されたパスワードと
    DBに保存されたハッシュを比較する。
    """

    try:
        salt_hex, hash_hex = stored_hash.split(":")

        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            310000
        )

        return secrets.compare_digest(
            actual_hash,
            expected_hash
        )

    except Exception:
        return False


# ==================================================
# 多数派・平均度合い
# ==================================================
def get_majority_degree(
    majority_rate: float | None
):
    """
    ユーザー自身の回答が、
    どれくらい多数派・少数派に寄っているかを判定する。

    例：

    50%付近
        どっちつかず

    50%より高い
        多数派

    50%より低い
        少数派

    偏りの大きさによって、

    ±10%以内
        どっちつかず

    ±20%以内
        やや

    ±30%以内
        そこそこ

    ±30%超
        THE
    """

    if majority_rate is None:
        return {
            "label": None,
            "distance_from_center": None
        }

    rate = float(majority_rate)

    distance = abs(rate - 50.0)

    # 50%付近
    if distance <= 10:
        label = "どっちつかず"

    else:
        if distance <= 20:
            degree = "やや"

        elif distance <= 30:
            degree = "そこそこ"

        else:
            degree = "THE"

        # ユーザーが多数派側か少数派側か
        if rate > 50:
            label = f"{degree}多数派"
        else:
            label = f"{degree}少数派"

    return {
        "label": label,
        "distance_from_center": round(
            distance,
            2
        )
    }

def get_average_degree(
    average_score: float | None
):
    """
    平均値度合いを判定する。

    average_score は、

    100%
        完全に平均

    0%
        平均からかなり離れている

    という意味。

    100%に近いほど平均的。
    """

    if average_score is None:
        return {
            "label": None
        }

    score = max(
        0.0,
        min(
            100.0,
            average_score
        )
    )

    # --------------------------------------------------
    # 平均度合い
    # --------------------------------------------------

    if score >= 90:
        label = "THE平均"

    elif score >= 80:
        label = "かなり平均"

    elif score >= 70:
        label = "ほぼ平均"

    elif score >= 60:
        label = "そこそこ平均？"

    elif score >= 50:
        label = "じゃっかん平均"

    elif score >= 40:
        label = "異端"

    elif score >= 30:
        label = "アウトライヤー"

    else:
        label = "規格外"

    return {
        "label": label
    }


def get_overall_evaluation(
    majority_rate: float | None,
    average_score: float | None
):
    """
    多数派・少数派度合いと
    平均度合いから総合評価を決定する。
    """

    # ==================================================
    # データ不足
    # ==================================================

    if (
        majority_rate is None
        and average_score is None
    ):
        return {
            "title": "まだわからない",
            "description": "もう少し回答すると、あなたの傾向がわかります。",
            "majority_degree": None,
            "average_degree": None
        }

    # ==================================================
    # 多数派度合い
    # ==================================================

    majority_info = get_majority_degree(
        majority_rate
    )

    majority_label = (
        majority_info["label"]
        if majority_info
        else None
    )

    # ==================================================
    # 平均度合い
    # ==================================================

    average_info = get_average_degree(
        average_score
    )

    average_label = (
        average_info["label"]
        if average_info
        else None
    )

    # ==================================================
    # 多数派・平均度合いの判定
    # ==================================================

    majority_distance = (
        majority_info["distance_from_center"]
        if majority_info
        else None
    )

    # ==================================================
    # 多数派の化身
    #
    # 多数派への偏りがかなり強く、
    # なおかつ平均からも大きく離れていない
    # ==================================================

    if (
        majority_distance is not None
        and majority_distance > 30
        and average_score is not None
        and average_score >= 70
    ):
        title = "マジョリティの化身"
        description = (
            "みんなと同じ方向に進みながら、"
            "全体的にもかなり平均的なタイプです。"
        )

    # ==================================================
    # THE 少数派
    #
    # 多数派から大きく外れ、
    # 平均からもかなり離れている
    # ==================================================

    elif (
        majority_distance is not None
        and majority_distance > 30
        and average_score is not None
        and average_score < 50
    ):
        title = "THE 少数派"
        description = (
            "多数派からも平均からもかなり離れています。"
            "自分の感覚をしっかり持っているタイプです。"
        )

    # ==================================================
    # 少数派の片鱗
    # ==================================================

    elif (
        majority_distance is not None
        and majority_distance > 20
        and average_score is not None
        and average_score < 60
    ):
        title = "少数派の片鱗"
        description = (
            "平均や多数派とは少し違う感覚を持っています。"
        )

    # ==================================================
    # 平均の申し子
    # ==================================================

    elif (
        average_score is not None
        and average_score >= 90
    ):
        title = "平均の申し子"
        description = (
            "とにかく平均に近い、"
            "驚異の平均感覚を持っています。"
        )

    # ==================================================
    # ほぼ一般人
    # ==================================================

    elif (
        average_score is not None
        and average_score >= 70
    ):
        title = "ほぼ一般人"
        description = (
            "全体の感覚から大きく外れない、"
            "かなり平均的なタイプです。"
        )

    # ==================================================
    # ちょいズレ人間
    # ==================================================

    elif (
        average_score is not None
        and average_score >= 50
    ):
        title = "ちょいズレ人間"
        description = (
            "基本は平均的ですが、"
            "ところどころ独特な感覚があります。"
        )

    # ==================================================
    # だいぶ独特
    # ==================================================

    elif (
        average_score is not None
        and average_score >= 30
    ):
        title = "だいぶ独特"
        description = (
            "一般的な感覚とは少し違う方向に寄っています。"
        )

    # ==================================================
    # 異端の申し子
    # ==================================================

    else:
        title = "異端の申し子"
        description = (
            "平均からかなり離れた独自の感覚を持っています。"
        )

    return {
        "title": title,
        "description": description,
        "majority_degree": majority_label,
        "average_degree": average_label
    }


# =========================
# リクエストモデル
# =========================

class UserCreate(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class AdminLogin(BaseModel):
    username: str
    password: str


class AnswerCreate(BaseModel):
    user_id: int
    question_id: int
    selected_option_id: int | None = None
    numeric_value: float | None = None
    text_value: str | None = None


# ==================================================
# 管理者認証
# ==================================================

@app.post("/admin/login")
def login_admin(
    login_data: AdminLogin
):
    token = admin_login(
        login_data.username.strip(),
        login_data.password
    )

    return {
        "message": "管理者ログインしました",
        "token": token
    }


@app.post("/admin/logout")
def logout_admin(
    authorization: str | None = Header(default=None)
):
    if not authorization:
        return {
            "message": "ログアウトしました"
        }

    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        admin_logout(token)

    return {
        "message": "ログアウトしました"
    }


# =========================
# 基本
# =========================

@app.get("/")
def root():
    return {
        "app": "平均値",
        "message": "API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# ==================================================
# ユーザー登録
# ==================================================

@app.post("/users/register")
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    username = user_data.username.strip()
    password = user_data.password

    # -------------------------
    # ユーザー名チェック
    # -------------------------

    if not username:
        raise HTTPException(
            status_code=400,
            detail="ユーザー名を入力してください"
        )

    if len(username) < 3:
        raise HTTPException(
            status_code=400,
            detail="ユーザー名は3文字以上で入力してください"
        )

    if len(username) > 100:
        raise HTTPException(
            status_code=400,
            detail="ユーザー名は100文字以内で入力してください"
        )

    # -------------------------
    # パスワードチェック
    # -------------------------

    if not password:
        raise HTTPException(
            status_code=400,
            detail="パスワードを入力してください"
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="パスワードは8文字以上で入力してください"
        )

    if len(password) > 200:
        raise HTTPException(
            status_code=400,
            detail="パスワードが長すぎます"
        )

    # -------------------------
    # ユーザー名重複チェック
    # -------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=400,
            detail="このユーザー名はすでに使用されています"
        )

    # -------------------------
    # ユーザー作成
    # -------------------------

    password_hash = hash_password(password)

    user = User(
        username=username,
        password_hash=password_hash
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="このユーザー名はすでに使用されています"
        )

    return {
        "message": "ユーザー登録が完了しました",
        "id": user.id,
        "username": user.username,
        "created_at": user.created_at
    }


# ==================================================
# ログイン
# ==================================================

@app.post("/users/login")
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    username = user_data.username.strip()
    password = user_data.password

    if not username:
        raise HTTPException(
            status_code=400,
            detail="ユーザー名を入力してください"
        )

    if not password:
        raise HTTPException(
            status_code=400,
            detail="パスワードを入力してください"
        )

    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="ユーザー名またはパスワードが間違っています"
        )

    if not verify_password(
        password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="ユーザー名またはパスワードが間違っています"
        )

    return {
        "message": "ログインしました",
        "id": user.id,
        "username": user.username,
        "created_at": user.created_at
    }


# ==================================================
# ユーザー取得
# ==================================================

@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "username": user.username,
        "created_at": user.created_at
    }


# ==================================================
# ユーザーの回答履歴
# ==================================================

@app.get("/users/{user_id}/answers")
def get_user_answers(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    answers = (
        db.query(Answer)
        .filter(
            Answer.user_id == user_id
        )
        .order_by(Answer.id)
        .all()
    )

    return [
        {
            "id": answer.id,
            "user_id": answer.user_id,
            "question_id": answer.question_id,
            "selected_option_id":
                answer.selected_option_id,
            "numeric_value": (
                float(answer.numeric_value)
                if answer.numeric_value is not None
                else None
            ),
            "text_value": answer.text_value
        }
        for answer in answers
    ]


# =========================
# 回答登録
# =========================

@app.post("/answers")
def create_answer(
    answer_data: AnswerCreate,
    db: Session = Depends(get_db)
):
    try:

        # ==================================================
        # ユーザー確認
        # ==================================================

        user = (
            db.query(User)
            .filter(
                User.id == answer_data.user_id
            )
            .first()
        )

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # ==================================================
        # 質問確認
        # ==================================================

        question = (
            db.query(Question)
            .filter(
                Question.id == answer_data.question_id,
                Question.is_published == True
            )
            .first()
        )

        if question is None:
            raise HTTPException(
                status_code=404,
                detail="Question not found"
            )

        # ==================================================
        # 二重回答チェック
        # ==================================================

        existing_answer = (
            db.query(Answer)
            .filter(
                Answer.user_id == answer_data.user_id,
                Answer.question_id == answer_data.question_id
            )
            .first()
        )

        if existing_answer is not None:
            raise HTTPException(
                status_code=400,
                detail="この質問にはすでに回答しています"
            )

        # ==================================================
        # 回答形式チェック
        # ==================================================

        answer_type = question.answer_type

        # --------------------------------------------------
        # 選択式
        # --------------------------------------------------

        if answer_type == "choice":

            if answer_data.selected_option_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="選択肢を選択してください"
                )

            if answer_data.numeric_value is not None:
                raise HTTPException(
                    status_code=400,
                    detail="この質問は数値回答には対応していません"
                )

            selected_option = (
                db.query(QuestionOption)
                .filter(
                    QuestionOption.id
                    == answer_data.selected_option_id,
                    QuestionOption.question_id
                    == answer_data.question_id
                )
                .first()
            )

            if selected_option is None:
                raise HTTPException(
                    status_code=400,
                    detail="選択肢がこの質問に存在しません"
                )

        # --------------------------------------------------
        # 数値式
        # --------------------------------------------------

        elif answer_type == "numeric":

            if answer_data.numeric_value is None:
                raise HTTPException(
                    status_code=400,
                    detail="数値を入力してください"
                )

            if answer_data.selected_option_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail="この質問は選択式ではありません"
                )

            selected_option = None

        # --------------------------------------------------
        # 時刻式
        # --------------------------------------------------

        elif answer_type == "time":

            if answer_data.numeric_value is None:
                raise HTTPException(
                    status_code=400,
                    detail="時刻を入力してください"
                )

            if answer_data.selected_option_id is not None:
                raise HTTPException(
                    status_code=400,
                    detail="この質問は選択式ではありません"
                )

            selected_option = None

        # --------------------------------------------------
        # 文章式
        # --------------------------------------------------

        elif answer_type == "text":

            if not answer_data.text_value:
                raise HTTPException(
                    status_code=400,
                    detail="回答を入力してください"
                )

            selected_option = None

        # --------------------------------------------------
        # 未対応
        # --------------------------------------------------

        else:
            raise HTTPException(
                status_code=400,
                detail=f"未対応の回答形式です: {answer_type}"
            )

        # ==================================================
        # 回答作成
        # ==================================================

        answer = Answer(
            user_id=answer_data.user_id,
            question_id=answer_data.question_id,
            selected_option_id=(
                answer_data.selected_option_id
                if answer_type == "choice"
                else None
            ),
            numeric_value=(
                answer_data.numeric_value
                if answer_type in ["numeric", "time"]
                else None
            ),
            text_value=(
                answer_data.text_value
                if answer_type == "text"
                else None
            )
        )

        db.add(answer)

        # ==================================================
        # 質問統計
        # ==================================================

        question_stat = (
            db.query(QuestionStatistics)
            .filter(
                QuestionStatistics.question_id
                == question.id
            )
            .first()
        )

        if question_stat is None:

            question_stat = QuestionStatistics(
                question_id=question.id,
                total_answers=0,
                numeric_sum=0,
                numeric_average=None
            )

            db.add(question_stat)

        # ==================================================
        # 全回答数
        # ==================================================

        question_stat.total_answers += 1

        # ==================================================
        # 選択式の統計
        # ==================================================

        if answer_type == "choice":

            options = (
                db.query(QuestionOption)
                .filter(
                    QuestionOption.question_id
                    == question.id
                )
                .order_by(
                    QuestionOption.sort_order,
                    QuestionOption.id
                )
                .all()
            )

            for option in options:

                option_stat = (
                    db.query(OptionStatistics)
                    .filter(
                        OptionStatistics.option_id
                        == option.id
                    )
                    .first()
                )

                if option_stat is None:

                    option_stat = OptionStatistics(
                        option_id=option.id,
                        answer_count=0,
                        percentage=0
                    )

                    db.add(option_stat)

                if option.id == selected_option.id:

                    option_stat.answer_count += 1

            db.flush()

            # ----------------------------------------------
            # 割合再計算
            # ----------------------------------------------

            for option in options:

                option_stat = (
                    db.query(OptionStatistics)
                    .filter(
                        OptionStatistics.option_id
                        == option.id
                    )
                    .first()
                )

                if option_stat is None:
                    continue

                if question_stat.total_answers > 0:

                    option_stat.percentage = (
                        Decimal(
                            option_stat.answer_count
                        )
                        / Decimal(
                            question_stat.total_answers
                        )
                        * Decimal("100")
                    )

        # ==================================================
        # 数値・時刻の統計
        # ==================================================

        if answer_type in ["numeric", "time"]:

            db.flush()

            numeric_answers = (
                db.query(Answer.numeric_value)
                .filter(
                    Answer.question_id == question.id,
                    Answer.numeric_value.isnot(None)
                )
                .all()
            )

            numeric_values = [
                Decimal(str(row[0]))
                for row in numeric_answers
                if row[0] is not None
            ]

            numeric_answer_count = len(
                numeric_values
            )

            if numeric_answer_count > 0:

                numeric_sum = sum(
                    numeric_values,
                    Decimal("0")
                )

                question_stat.numeric_sum = (
                    numeric_sum
                )

                question_stat.numeric_average = (
                    numeric_sum
                    / Decimal(numeric_answer_count)
                )

            else:

                question_stat.numeric_sum = Decimal("0")

                question_stat.numeric_average = None

        # ==================================================
        # DB保存
        # ==================================================

        db.commit()

        db.refresh(answer)
        db.refresh(question_stat)

        # ==================================================
        # 選択式統計取得
        # ==================================================

        statistics = []

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id
                == question.id
            )
            .order_by(
                QuestionOption.sort_order,
                QuestionOption.id
            )
            .all()
        )

        for option in options:

            option_stat = (
                db.query(OptionStatistics)
                .filter(
                    OptionStatistics.option_id
                    == option.id
                )
                .first()
            )

            statistics.append({
                "option_id":
                    option.id,

                "option_key":
                    option.option_key,

                "option_text":
                    option.option_text,

                "count":
                    option_stat.answer_count
                    if option_stat
                    else 0,

                "percentage":
                    float(
                        option_stat.percentage
                    )
                    if option_stat
                    else 0
            })

        # ==================================================
        # レスポンス
        # ==================================================

        return {
            "message":
                "回答を保存しました",

            "answer_id":
                answer.id,

            "question_id":
                question.id,

            "answer_type":
                question.answer_type,

            "question_type":
                question.question_type,

            "selected_option_id":
                answer.selected_option_id,

            "numeric_value": (
                float(answer.numeric_value)
                if answer.numeric_value is not None
                else None
            ),

            "total_answers":
                question_stat.total_answers,

            "numeric_average": (
                float(
                    question_stat.numeric_average
                )
                if question_stat.numeric_average is not None
                else None
            ),

            "statistics":
                statistics
        }

    except HTTPException:
        raise

    except Exception as e:

        import traceback

        traceback.print_exc()

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"{type(e).__name__}: {str(e)}"
        )


# =========================
# 質問の統計情報
# =========================

@app.get("/questions/{question_id}/statistics")
def get_question_statistics(
    question_id: int,
    db: Session = Depends(get_db)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id,
            Question.is_published == True
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    question_stat = (
        db.query(QuestionStatistics)
        .filter(
            QuestionStatistics.question_id
            == question_id
        )
        .first()
    )

    total_answers = (
        question_stat.total_answers
        if question_stat
        else 0
    )

    options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id
            == question_id
        )
        .order_by(
            QuestionOption.sort_order
        )
        .all()
    )

    statistics = []

    for option in options:

        option_stat = (
            db.query(OptionStatistics)
            .filter(
                OptionStatistics.option_id
                == option.id
            )
            .first()
        )

        statistics.append({
            "option_id": option.id,
            "option_key":
                option.option_key,
            "option_text":
                option.option_text,
            "count":
                option_stat.answer_count
                if option_stat
                else 0,
            "percentage":
                float(option_stat.percentage)
                if option_stat
                else 0
        })

    return {
        "question_id":
            question.id,
        "title":
            question.title,
        "question_type":
            question.question_type,
        "total_answers":
            total_answers,
        "statistics":
            statistics
    }


# =========================
# 自分と全体の比較結果
# =========================

@app.get("/questions/{question_id}/result")
def get_question_result(
    question_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    # ==================================================
    # ユーザー確認
    # ==================================================

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ==================================================
    # 質問確認
    # ==================================================

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id,
            Question.is_published == True
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    # ==================================================
    # 自分の回答
    # ==================================================

    answer = (
        db.query(Answer)
        .filter(
            Answer.user_id == user_id,
            Answer.question_id == question_id
        )
        .first()
    )

    if answer is None:
        raise HTTPException(
            status_code=404,
            detail="まだ回答していません"
        )

    # ==================================================
    # 全体の回答数
    # ==================================================

    total_answers = (
        db.query(Answer)
        .filter(
            Answer.question_id == question_id
        )
        .count()
    )

    # ==================================================
    # 選択式
    # ==================================================

    if question.answer_type == "choice":

        selected_option = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.id
                == answer.selected_option_id,

                QuestionOption.question_id
                == question_id
            )
            .first()
        )

        if selected_option is None:
            raise HTTPException(
                status_code=404,
                detail="選択肢が見つかりません"
            )

        # --------------------------------------------------
        # 全選択肢の統計
        # --------------------------------------------------

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id
                == question_id
            )
            .order_by(
                QuestionOption.sort_order,
                QuestionOption.id
            )
            .all()
        )

        option_results = []

        for option in options:

            option_count = (
                db.query(Answer)
                .filter(
                    Answer.question_id
                    == question_id,

                    Answer.selected_option_id
                    == option.id
                )
                .count()
            )

            percentage = 0.0

            if total_answers > 0:
                percentage = (
                    option_count
                    / total_answers
                    * 100
                )

            option_results.append({
                "option_id":
                    option.id,

                "option_key":
                    option.option_key,

                "option_text":
                    option.option_text,

                "count":
                    option_count,

                "percentage":
                    round(
                        percentage,
                        2
                    )
            })

        # --------------------------------------------------
        # 多数派を決定
        # --------------------------------------------------

        majority_option = None

        if option_results:

            majority_option = max(
                option_results,
                key=lambda item:
                    item["count"]
            )

        # --------------------------------------------------
        # 自分と同じ回答をした割合
        # --------------------------------------------------

        selected_result = next(
            (
                item
                for item in option_results
                if item["option_id"]
                == answer.selected_option_id
            ),
            None
        )

        same_answer_percentage = (
            selected_result["percentage"]
            if selected_result
            else 0.0
        )

        # --------------------------------------------------
        # 多数派 / 少数派
        # --------------------------------------------------

        is_majority = (
            majority_option is not None
            and answer.selected_option_id
            == majority_option["option_id"]
        )

        majority_rate = (
            100.0
            if is_majority
            else 0.0
        )

        minority_rate = (
            0.0
            if is_majority
            else 100.0
        )

        return {
            "question_id":
                question.id,

            "title":
                question.title,

            "answer_type":
                question.answer_type,

            "question_type":
                question.question_type,

            "your_answer": {
                "option_id":
                    selected_option.id,

                "key":
                    selected_option.option_key,

                "text":
                    selected_option.option_text
            },

            "same_answer_percentage":
                same_answer_percentage,

            "majority":
                (
                    {
                        "option_id":
                            majority_option["option_id"],

                        "key":
                            majority_option["option_key"],

                        "text":
                            majority_option["option_text"],

                        "percentage":
                            majority_option["percentage"],

                        "count":
                            majority_option["count"]
                    }
                    if majority_option
                    else None
                ),

            "is_majority":
                is_majority,

            "majority_rate":
                majority_rate,

            "minority_rate":
                minority_rate,

            "total_answers":
                total_answers,

            "options":
                option_results
        }

    # ==================================================
    # 数値・時刻
    # ==================================================

    if question.answer_type in [
        "numeric",
        "time"
    ]:

        your_value = (
            float(answer.numeric_value)
            if answer.numeric_value is not None
            else None
        )

        numeric_answers = (
            db.query(Answer.numeric_value)
            .filter(
                Answer.question_id
                == question_id,

                Answer.numeric_value.isnot(None)
            )
            .all()
        )

        numeric_values = [
            Decimal(str(row[0]))
            for row in numeric_answers
            if row[0] is not None
        ]

        overall_average = None

        if numeric_values:

            numeric_sum = sum(
                numeric_values,
                Decimal("0")
            )

            overall_average = (
                numeric_sum
                / Decimal(len(numeric_values))
            )

        overall_average_float = (
            float(overall_average)
            if overall_average is not None
            else None
        )

        difference = None

        if (
            your_value is not None
            and overall_average_float is not None
        ):
            difference = (
                your_value
                - overall_average_float
            )

        distance_percentage = None

        if (
            your_value is not None
            and overall_average_float is not None
            and overall_average_float != 0
        ):
            distance_percentage = (
                abs(
                    your_value
                    - overall_average_float
                )
                / abs(overall_average_float)
                * 100
            )

        # --------------------------------------------------
        # 平均度合い
        # --------------------------------------------------

        average_score = None

        if distance_percentage is not None:

            average_score = max(
                0.0,
                min(
                    100.0,
                    100.0 - distance_percentage
                )
            )

        average_degree = get_average_degree(
            average_score
        )

        return {
            "question_id":
                question.id,

            "title":
                question.title,

            "answer_type":
                question.answer_type,

            "question_type":
                question.question_type,

            "your_answer": {
                "numeric_value":
                    your_value
            },

            "overall_average":
                (
                    round(
                        overall_average_float,
                        2
                    )
                    if overall_average_float
                    is not None
                    else None
                ),

            "numeric_average":
                (
                    round(
                        overall_average_float,
                        2
                    )
                    if overall_average_float
                    is not None
                    else None
                ),

            "difference":
                (
                    round(
                        difference,
                        2
                    )
                    if difference is not None
                    else None
                ),

            "distance_percentage":
                (
                    round(
                        distance_percentage,
                        2
                    )
                    if distance_percentage
                    is not None
                    else None
                ),

            "average_score":
                (
                    round(
                        average_score,
                        2
                    )
                    if average_score is not None
                    else None
                ),

            "average_degree":
                average_degree["label"],

            "total_answers":
                total_answers
        }

    # ==================================================
    # 文章式
    # ==================================================

    return {
        "question_id":
            question.id,

        "title":
            question.title,

        "answer_type":
            question.answer_type,

        "question_type":
            question.question_type,

        "your_answer": {
            "text":
                answer.text_value
        },

        "total_answers":
            total_answers
    }


# =========================
# ユーザーの回答傾向
# =========================

@app.get("/users/{user_id}/average")
def get_user_average(
    user_id: int,
    db: Session = Depends(get_db)
):
    # ==================================================
    # ユーザー確認
    # ==================================================

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ==================================================
    # 回答取得
    # ==================================================

    answers = (
        db.query(Answer)
        .join(
            Question,
            Answer.question_id
            == Question.id
        )
        .filter(
            Answer.user_id == user_id,
            Question.is_published == True
        )
        .order_by(
            Answer.id
        )
        .all()
    )

    # ==================================================
    # 回答なし
    # ==================================================

    if not answers:

        overall_evaluation = (
            get_overall_evaluation(
                None,
                None
            )
        )

        return {
            "user_id":
                user_id,

            "answered_questions":
                0,

            "choice_summary": {
                "answered_questions":
                    0,

                "majority_count":
                    0,

                "minority_count":
                    0,

                "majority_rate":
                    None,

                "minority_rate":
                    None,

                "majority_degree":
                    None
            },

            "numeric_summary": {
                "answered_questions":
                    0,

                "average_distance_percentage":
                    None,

                "average_score":
                    None,

                "average_degree":
                    None
            },

            "overall_evaluation":
                overall_evaluation,

            "details":
                []
        }

    # ==================================================
    # 集計用
    # ==================================================

    choice_details = []
    numeric_details = []
    text_details = []

    majority_count = 0
    minority_count = 0

    numeric_distance_percentages = []

    # ==================================================
    # 回答ごとに処理
    # ==================================================

    for answer in answers:

        question = (
            db.query(Question)
            .filter(
                Question.id
                == answer.question_id
            )
            .first()
        )

        if question is None:
            continue

        # ==================================================
        # 選択式
        # ==================================================

        if question.answer_type == "choice":

            selected_option = (
                db.query(QuestionOption)
                .filter(
                    QuestionOption.id
                    == answer.selected_option_id,

                    QuestionOption.question_id
                    == question.id
                )
                .first()
            )

            if selected_option is None:
                continue

            total_answers = (
                db.query(Answer)
                .filter(
                    Answer.question_id
                    == question.id
                )
                .count()
            )

            options = (
                db.query(QuestionOption)
                .filter(
                    QuestionOption.question_id
                    == question.id
                )
                .order_by(
                    QuestionOption.sort_order,
                    QuestionOption.id
                )
                .all()
            )

            option_results = []

            for option in options:

                count = (
                    db.query(Answer)
                    .filter(
                        Answer.question_id
                        == question.id,

                        Answer.selected_option_id
                        == option.id
                    )
                    .count()
                )

                percentage = 0.0

                if total_answers > 0:

                    percentage = (
                        count
                        / total_answers
                        * 100
                    )

                option_results.append({
                    "option_id":
                        option.id,

                    "option_key":
                        option.option_key,

                    "option_text":
                        option.option_text,

                    "count":
                        count,

                    "percentage":
                        round(
                            percentage,
                            2
                        )
                })

            # ----------------------------------------------
            # 多数派
            # ----------------------------------------------

            majority_option = None

            if option_results:

                majority_option = max(
                    option_results,
                    key=lambda item:
                        item["count"]
                )

            # ----------------------------------------------
            # 自分の回答割合
            # ----------------------------------------------

            selected_result = next(
                (
                    item
                    for item in option_results
                    if item["option_id"]
                    == answer.selected_option_id
                ),
                None
            )

            same_answer_percentage = (
                selected_result["percentage"]
                if selected_result
                else 0.0
            )

            # ----------------------------------------------
            # 多数派 / 少数派
            # ----------------------------------------------

            is_majority = (
                majority_option is not None
                and answer.selected_option_id
                == majority_option["option_id"]
            )

            if is_majority:
                majority_count += 1
            else:
                minority_count += 1

            choice_details.append({
                "question_id":
                    question.id,

                "title":
                    question.title,

                "question_type":
                    question.question_type,

                "answer_type":
                    question.answer_type,

                "your_answer": {
                    "option_id":
                        selected_option.id,

                    "key":
                        selected_option.option_key,

                    "text":
                        selected_option.option_text
                },

                "same_answer_percentage":
                    round(
                        same_answer_percentage,
                        2
                    ),

                "is_majority":
                    is_majority,

                "majority":
                    (
                        {
                            "option_id":
                                majority_option["option_id"],

                            "key":
                                majority_option["option_key"],

                            "text":
                                majority_option["option_text"],

                            "percentage":
                                majority_option["percentage"],

                            "count":
                                majority_option["count"]
                        }
                        if majority_option
                        else None
                    ),

                "total_answers":
                    total_answers
            })

        # ==================================================
        # 数値・時刻
        # ==================================================

        elif question.answer_type in [
            "numeric",
            "time"
        ]:

            if answer.numeric_value is None:
                continue

            your_value = float(
                answer.numeric_value
            )

            numeric_answers = (
                db.query(Answer.numeric_value)
                .filter(
                    Answer.question_id
                    == question.id,

                    Answer.numeric_value.isnot(None)
                )
                .all()
            )

            numeric_values = [
                Decimal(str(row[0]))
                for row in numeric_answers
                if row[0] is not None
            ]

            if not numeric_values:
                continue

            numeric_sum = sum(
                numeric_values,
                Decimal("0")
            )

            overall_average = (
                numeric_sum
                / Decimal(len(numeric_values))
            )

            overall_average_float = float(
                overall_average
            )

            difference = (
                your_value
                - overall_average_float
            )

            distance_percentage = None

            if overall_average_float != 0:

                distance_percentage = (
                    abs(difference)
                    / abs(overall_average_float)
                    * 100
                )

                numeric_distance_percentages.append(
                    distance_percentage
                )

            # ----------------------------------------------
            # この回答の平均度合い
            # ----------------------------------------------

            average_score = None

            if distance_percentage is not None:

                average_score = max(
                    0.0,
                    min(
                        100.0,
                        100.0 - distance_percentage
                    )
                )

            average_degree = get_average_degree(
                average_score
            )

            numeric_details.append({
                "question_id":
                    question.id,

                "title":
                    question.title,

                "question_type":
                    question.question_type,

                "answer_type":
                    question.answer_type,

                "your_value":
                    round(
                        your_value,
                        2
                    ),

                "overall_average":
                    round(
                        overall_average_float,
                        2
                    ),

                "difference":
                    round(
                        difference,
                        2
                    ),

                "distance_percentage":
                    (
                        round(
                            distance_percentage,
                            2
                        )
                        if distance_percentage
                        is not None
                        else None
                    ),

                "average_score":
                    (
                        round(
                            average_score,
                            2
                        )
                        if average_score is not None
                        else None
                    ),

                "average_degree":
                    average_degree["label"],

                "total_answers":
                    len(numeric_values)
            })

        # ==================================================
        # 文章式
        # ==================================================

        elif question.answer_type == "text":

            text_details.append({
                "question_id":
                    question.id,

                "title":
                    question.title,

                "question_type":
                    question.question_type,

                "answer_type":
                    question.answer_type,

                "your_answer":
                    answer.text_value
            })

    # ==================================================
    # 選択式の総合結果
    # ==================================================

    choice_answered_count = (
        len(choice_details)
    )

    choice_majority_rate = None
    choice_minority_rate = None

    if choice_answered_count > 0:

        choice_majority_rate = (
            majority_count
            / choice_answered_count
            * 100
        )

        choice_minority_rate = (
            minority_count
            / choice_answered_count
            * 100
        )

    # ==================================================
    # 多数派度合い
    # ==================================================

    majority_degree = get_majority_degree(
        choice_majority_rate
    )

    # ==================================================
    # 数値式の総合結果
    # ==================================================

    numeric_answered_count = (
        len(numeric_details)
    )

    average_distance_percentage = None

    if numeric_distance_percentages:

        average_distance_percentage = (
            sum(
                numeric_distance_percentages
            )
            / len(
                numeric_distance_percentages
            )
        )

    # ==================================================
    # 平均値度合い
    #
    # 平均からの距離を
    # 100 - 距離
    # にする。
    #
    # 例
    #
    # 平均から0%離れている
    # → 平均度合い100%
    #
    # 平均から20%離れている
    # → 平均度合い80%
    # ==================================================

    average_score = None

    if average_distance_percentage is not None:

        average_score = max(
            0.0,
            min(
                100.0,
                100.0
                - average_distance_percentage
            )
        )

    average_degree = get_average_degree(
        average_score
    )

    # ==================================================
    # 総合評価
    # ==================================================

    overall_evaluation = get_overall_evaluation(
        choice_majority_rate,
        average_score
    )

    # ==================================================
    # 詳細をまとめる
    # ==================================================

    details = (
        choice_details
        + numeric_details
        + text_details
    )

    # ==================================================
    # 結果
    # ==================================================

    return {
        "user_id":
            user_id,

        "answered_questions":
            len(details),

        # ==================================================
        # 選択式
        # ==================================================

        "choice_summary": {

            "answered_questions":
                choice_answered_count,

            "majority_count":
                majority_count,

            "minority_count":
                minority_count,

            "majority_rate":
                (
                    round(
                        choice_majority_rate,
                        2
                    )
                    if choice_majority_rate
                    is not None
                    else None
                ),

            "minority_rate":
                (
                    round(
                        choice_minority_rate,
                        2
                    )
                    if choice_minority_rate
                    is not None
                    else None
                ),

            "majority_degree":
                (
                    majority_degree["label"]
                    if majority_degree
                    else None
                ),

            "majority_distance_from_center":
                (
                    majority_degree[
                        "distance_from_center"
                    ]
                    if majority_degree
                    else None
                )
        },

        # ==================================================
        # 数値式
        # ==================================================

        "numeric_summary": {

            "answered_questions":
                numeric_answered_count,

            "average_distance_percentage":
                (
                    round(
                        average_distance_percentage,
                        2
                    )
                    if average_distance_percentage
                    is not None
                    else None
                ),

            "average_score":
                (
                    round(
                        average_score,
                        2
                    )
                    if average_score is not None
                    else None
                ),

            "average_degree":
                (
                    average_degree["label"]
                    if average_degree
                    else None
                )
        },

        # ==================================================
        # 総合評価
        # ==================================================

        "overall_evaluation": {

            "title":
                overall_evaluation["title"],

            "description":
                overall_evaluation["description"],

            "majority_degree":
                overall_evaluation["majority_degree"],

            "average_degree":
                overall_evaluation["average_degree"]
        },

        # ==================================================
        # 詳細
        # ==================================================

        "details":
            details
    }


# =========================
# 質問1件取得
# =========================

@app.get("/questions/{question_id}")
def get_question(
    question_id: int,
    db: Session = Depends(get_db)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id,
            Question.is_published == True
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id
            == question_id
        )
        .order_by(
            QuestionOption.sort_order,
            QuestionOption.id
        )
        .all()
    )

    return {
        "id":
            question.id,

        "category_id":
            question.category_id,

        "title":
            question.title,

        "question_text":
            question.question_text,

        "answer_type":
            question.answer_type,

        "aggregation_type":
            question.aggregation_type,

        "question_type":
            question.question_type,

        "is_published":
            question.is_published,

        "sort_order":
            question.sort_order,

        "options": [
            {
                "id":
                    option.id,

                "option_key":
                    option.option_key,

                "option_text":
                    option.option_text,

                "sort_order":
                    option.sort_order
            }
            for option in options
        ]
    }


# =========================
# 管理者用・質問一覧取得
# 公開・非公開をすべて取得
# =========================

@app.get("/admin/questions")
def get_admin_questions(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    query = db.query(Question)

    if category_id is not None:
        query = query.filter(
            Question.category_id == category_id
        )

    questions = (
        query
        .order_by(
            Question.sort_order,
            Question.id
        )
        .all()
    )

    result = []

    for question in questions:

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id
                == question.id
            )
            .order_by(
                QuestionOption.sort_order,
                QuestionOption.id
            )
            .all()
        )

        result.append({
            "id": question.id,
            "category_id": question.category_id,
            "title": question.title,
            "question_text": question.question_text,
            "answer_type": question.answer_type,
            "aggregation_type": question.aggregation_type,
            "question_type": question.question_type,
            "is_published": question.is_published,
            "sort_order": question.sort_order,
            "options": [
                {
                    "id": option.id,
                    "option_key": option.option_key,
                    "option_text": option.option_text,
                    "sort_order": option.sort_order
                }
                for option in options
            ]
        })

    return result


# =========================
# 公開質問一覧
# =========================

@app.get("/questions")
def get_questions(
    category_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(Question)
        .filter(
            Question.is_published == True
        )
    )

    if category_id is not None:
        query = query.filter(
            Question.category_id == category_id
        )

    questions = (
        query
        .order_by(
            Question.sort_order,
            Question.id
        )
        .all()
    )

    result = []

    for question in questions:

        options = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id
                == question.id
            )
            .order_by(
                QuestionOption.sort_order,
                QuestionOption.id
            )
            .all()
        )

        result.append({
            "id":
                question.id,

            "category_id":
                question.category_id,

            "title":
                question.title,

            "question_text":
                question.question_text,

            "answer_type":
                question.answer_type,

            "aggregation_type":
                question.aggregation_type,

            "question_type":
                question.question_type,

            "is_published":
                question.is_published,

            "sort_order":
                question.sort_order,

            "options": [
                {
                    "id":
                        option.id,

                    "option_key":
                        option.option_key,

                    "option_text":
                        option.option_text,

                    "sort_order":
                        option.sort_order
                }
                for option in options
            ]
        })

    return result


# =========================
# 質問追加
# =========================

class QuestionOptionCreate(BaseModel):
    option_key: str
    option_text: str
    sort_order: int = 0


class QuestionCreate(BaseModel):
    category_id: int
    title: str
    question_text: str
    answer_type: str
    aggregation_type: str

    # ORDINARY / EXTRA
    question_type: str = "ORDINARY"

    is_published: bool = False
    sort_order: int = 0
    options: list[QuestionOptionCreate] = []


@app.post("/questions")
def create_question(
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    # ==================================================
    # 問題タイプチェック
    # ==================================================

    if question_data.question_type not in [
        "ORDINARY",
        "EXTRA"
    ]:
        raise HTTPException(
            status_code=400,
            detail="問題タイプはORDINARYまたはEXTRAを指定してください"
        )

    category = (
        db.query(Category)
        .filter(
            Category.id
            == question_data.category_id,
            Category.is_active == True
        )
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    question = Question(
        category_id=
            question_data.category_id,

        title=
            question_data.title,

        question_text=
            question_data.question_text,

        answer_type=
            question_data.answer_type,

        aggregation_type=
            question_data.aggregation_type,

        question_type=
            question_data.question_type,

        is_published=
            question_data.is_published,

        sort_order=
            question_data.sort_order
    )

    db.add(question)
    db.flush()

    created_options = []

    for option_data in question_data.options:

        option = QuestionOption(
            question_id=
                question.id,

            option_key=
                option_data.option_key,

            option_text=
                option_data.option_text,

            sort_order=
                option_data.sort_order
        )

        db.add(option)
        created_options.append(option)

    db.commit()
    db.refresh(question)

    return {
        "message":
            "質問を作成しました",

        "question": {
            "id":
                question.id,

            "title":
                question.title,

            "question_text":
                question.question_text,

            "category_id":
                question.category_id,

            "answer_type":
                question.answer_type,

            "aggregation_type":
                question.aggregation_type,

            "question_type":
                question.question_type,

            "is_published":
                question.is_published,

            "sort_order":
                question.sort_order
        },

        "options": [
            {
                "id":
                    option.id,

                "key":
                    option.option_key,

                "text":
                    option.option_text,

                "sort_order":
                    option.sort_order
            }
            for option in created_options
        ]
    }


# =========================
# 質問編集
# =========================

class QuestionUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = None
    question_text: str | None = None
    answer_type: str | None = None
    aggregation_type: str | None = None

    # ORDINARY / EXTRA
    question_type: str | None = None

    is_published: bool | None = None
    sort_order: int | None = None


@app.put("/questions/{question_id}")
def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    if question_data.category_id is not None:

        category = (
            db.query(Category)
            .filter(
                Category.id
                == question_data.category_id,

                Category.is_active == True
            )
            .first()
        )

        if category is None:
            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

        question.category_id = (
            question_data.category_id
        )

    if question_data.title is not None:
        question.title = (
            question_data.title
        )

    if question_data.question_text is not None:
        question.question_text = (
            question_data.question_text
        )

    if question_data.answer_type is not None:
        question.answer_type = (
            question_data.answer_type
        )

    if question_data.aggregation_type is not None:
        question.aggregation_type = (
            question_data.aggregation_type
        )

    if question_data.question_type is not None:

        if question_data.question_type not in [
            "ORDINARY",
            "EXTRA"
        ]:
            raise HTTPException(
                status_code=400,
                detail="問題タイプはORDINARYまたはEXTRAを指定してください"
            )

        question.question_type = (
            question_data.question_type
        )

    if question_data.is_published is not None:
        question.is_published = (
            question_data.is_published
        )

    if question_data.sort_order is not None:
        question.sort_order = (
            question_data.sort_order
        )

    db.commit()
    db.refresh(question)

    return {
        "message":
            "質問を更新しました",

        "question": {
            "id":
                question.id,

            "title":
                question.title,

            "question_text":
                question.question_text,

            "category_id":
                question.category_id,

            "answer_type":
                question.answer_type,

            "aggregation_type":
                question.aggregation_type,

            "question_type":
                question.question_type,

            "is_published":
                question.is_published,

            "sort_order":
                question.sort_order
        }
    }


# =========================
# 質問公開 / 非公開
# =========================

@app.patch("/questions/{question_id}/publish")
def toggle_question_publish(
    question_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    question.is_published = (
        not question.is_published
    )

    db.commit()
    db.refresh(question)

    return {
        "message":
            "公開状態を変更しました",

        "question_id":
            question.id,

        "is_published":
            question.is_published
    }


# =========================
# 質問削除
# =========================

@app.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    db.delete(question)
    db.commit()

    return {
        "message":
            "質問を削除しました",

        "question_id":
            question_id
    }


# =========================
# カテゴリー追加
# =========================

class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None
    sort_order: int = 0
    is_active: bool = True


@app.get("/categories")
def get_categories(
    db: Session = Depends(get_db)
):
    categories = (
        db.query(Category)
        .order_by(
            Category.sort_order,
            Category.id
        )
        .all()
    )

    return [
        {
            "id": category.id,
            "name": category.name,
            "parent_id": category.parent_id,
            "sort_order": category.sort_order,
            "is_active": category.is_active
        }
        for category in categories
    ]


@app.post("/categories")
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    if category_data.parent_id is not None:

        parent = (
            db.query(Category)
            .filter(
                Category.id
                == category_data.parent_id
            )
            .first()
        )

        if parent is None:
            raise HTTPException(
                status_code=404,
                detail="Parent category not found"
            )

    category = Category(
        name=category_data.name,

        parent_id=
            category_data.parent_id,

        sort_order=
            category_data.sort_order,

        is_active=
            category_data.is_active
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "message":
            "カテゴリーを作成しました",

        "category": {
            "id":
                category.id,

            "name":
                category.name,

            "parent_id":
                category.parent_id,

            "sort_order":
                category.sort_order,

            "is_active":
                category.is_active
        }
    }


# =========================
# カテゴリー編集
# =========================

class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


@app.put("/categories/{category_id}")
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    if category_data.parent_id is not None:

        if (
            category_data.parent_id
            == category_id
        ):
            raise HTTPException(
                status_code=400,
                detail=
                    "自分自身を親カテゴリーにはできません"
            )

        parent = (
            db.query(Category)
            .filter(
                Category.id
                == category_data.parent_id
            )
            .first()
        )

        if parent is None:
            raise HTTPException(
                status_code=404,
                detail="Parent category not found"
            )

        category.parent_id = (
            category_data.parent_id
        )

    if category_data.name is not None:
        category.name = (
            category_data.name
        )

    if category_data.sort_order is not None:
        category.sort_order = (
            category_data.sort_order
        )

    if category_data.is_active is not None:
        category.is_active = (
            category_data.is_active
        )

    db.commit()
    db.refresh(category)

    return {
        "message":
            "カテゴリーを更新しました",

        "category": {
            "id":
                category.id,

            "name":
                category.name,

            "parent_id":
                category.parent_id,

            "sort_order":
                category.sort_order,

            "is_active":
                category.is_active
        }
    }


# =========================
# カテゴリー有効 / 無効
# =========================

@app.patch("/categories/{category_id}/active")
def toggle_category_active(
    category_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    category.is_active = (
        not category.is_active
    )

    db.commit()
    db.refresh(category)

    return {
        "message":
            "カテゴリーの有効状態を変更しました",

        "category_id":
            category.id,

        "is_active":
            category.is_active
    }


# =========================
# カテゴリー削除
# =========================

@app.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    children = (
        db.query(Category)
        .filter(
            Category.parent_id
            == category_id
        )
        .count()
    )

    if children > 0:
        raise HTTPException(
            status_code=400,
            detail=
                "子カテゴリーが存在するため削除できません"
        )

    questions = (
        db.query(Question)
        .filter(
            Question.category_id
            == category_id
        )
        .count()
    )

    if questions > 0:
        raise HTTPException(
            status_code=400,
            detail=
                "質問が存在するため削除できません"
        )

    db.delete(category)
    db.commit()

    return {
        "message":
            "カテゴリーを削除しました",

        "category_id":
            category_id
    }


# =========================
# 選択肢追加
# =========================

class OptionCreate(BaseModel):
    option_key: str
    option_text: str
    sort_order: int = 0


@app.get("/questions/{question_id}/options")
def get_options(
    question_id: int,
    db: Session = Depends(get_db)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    options = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id
            == question_id
        )
        .order_by(
            QuestionOption.sort_order
        )
        .all()
    )

    return [
        {
            "id": option.id,
            "question_id": option.question_id,
            "option_key": option.option_key,
            "option_text": option.option_text,
            "sort_order": option.sort_order
        }
        for option in options
    ]


@app.post("/questions/{question_id}/options")
def create_option(
    question_id: int,
    option_data: OptionCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    question = (
        db.query(Question)
        .filter(
            Question.id == question_id
        )
        .first()
    )

    if question is None:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    existing = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.question_id
            == question_id,

            QuestionOption.option_key
            == option_data.option_key
        )
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail=
                "同じ選択肢キーがすでに存在します"
        )

    option = QuestionOption(
        question_id=question_id,

        option_key=
            option_data.option_key,

        option_text=
            option_data.option_text,

        sort_order=
            option_data.sort_order
    )

    db.add(option)
    db.commit()
    db.refresh(option)

    return {
        "message":
            "選択肢を作成しました",

        "option": {
            "id":
                option.id,

            "question_id":
                option.question_id,

            "key":
                option.option_key,

            "text":
                option.option_text,

            "sort_order":
                option.sort_order
        }
    }


# =========================
# 選択肢編集
# =========================

class OptionUpdate(BaseModel):
    option_key: str | None = None
    option_text: str | None = None
    sort_order: int | None = None


@app.put(
    "/questions/{question_id}/options/{option_id}"
)
def update_option(
    question_id: int,
    option_id: int,
    option_data: OptionUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    option = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.id
            == option_id,

            QuestionOption.question_id
            == question_id
        )
        .first()
    )

    if option is None:
        raise HTTPException(
            status_code=404,
            detail="Option not found"
        )

    if option_data.option_key is not None:

        existing = (
            db.query(QuestionOption)
            .filter(
                QuestionOption.question_id
                == question_id,

                QuestionOption.option_key
                == option_data.option_key,

                QuestionOption.id
                != option_id
            )
            .first()
        )

        if existing is not None:
            raise HTTPException(
                status_code=400,
                detail=
                    "同じ選択肢キーがすでに存在します"
            )

        option.option_key = (
            option_data.option_key
        )

    if option_data.option_text is not None:
        option.option_text = (
            option_data.option_text
        )

    if option_data.sort_order is not None:
        option.sort_order = (
            option_data.sort_order
        )

    db.commit()
    db.refresh(option)

    return {
        "message":
            "選択肢を更新しました",

        "option": {
            "id":
                option.id,

            "question_id":
                option.question_id,

            "key":
                option.option_key,

            "text":
                option.option_text,

            "sort_order":
                option.sort_order
        }
    }


# =========================
# 選択肢削除
# =========================

@app.delete(
    "/questions/{question_id}/options/{option_id}"
)
def delete_option(
    question_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    option = (
        db.query(QuestionOption)
        .filter(
            QuestionOption.id
            == option_id,

            QuestionOption.question_id
            == question_id
        )
        .first()
    )

    if option is None:
        raise HTTPException(
            status_code=404,
            detail="Option not found"
        )

    answer_count = (
        db.query(Answer)
        .filter(
            Answer.selected_option_id
            == option_id
        )
        .count()
    )

    if answer_count > 0:
        raise HTTPException(
            status_code=400,
            detail=
                "この選択肢には回答が存在するため削除できません"
        )

    db.delete(option)
    db.commit()

    return {
        "message":
            "選択肢を削除しました",

        "option_id":
            option_id
    }