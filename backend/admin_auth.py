import os
import secrets
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

_admin_tokens: set[str] = set()


def admin_login(username: str, password: str) -> str:

    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="Admin credentials are not configured"
        )

    if not secrets.compare_digest(
        username,
        ADMIN_USERNAME
    ):
        raise HTTPException(
            status_code=401,
            detail="管理者IDまたはパスワードが間違っています"
        )

    if not secrets.compare_digest(
        password,
        ADMIN_PASSWORD
    ):
        raise HTTPException(
            status_code=401,
            detail="管理者IDまたはパスワードが間違っています"
        )

    token = secrets.token_urlsafe(32)

    _admin_tokens.add(token)

    return token


def require_admin(
    authorization: str | None = Header(default=None)
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="管理者認証が必要です"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="無効な認証情報です"
        )

    token = authorization[7:].strip()

    if not token or token not in _admin_tokens:
        raise HTTPException(
            status_code=403,
            detail="管理者権限がありません"
        )

    return True


def admin_logout(token: str):

    _admin_tokens.discard(token)