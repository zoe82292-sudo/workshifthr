from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str


class AuthUser(BaseModel):
    email: str
    password_hash: bytes


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is required when authentication is enabled.")
    return secret


def auth_enabled() -> bool:
    return bool(os.getenv("AUTH_USERS", "").strip())


def _hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def _parse_auth_users() -> dict[str, bytes]:
    raw = os.getenv("AUTH_USERS", "").strip()
    if not raw:
        return {}

    users: dict[str, bytes] = {}

    if raw.startswith("["):
        entries = json.loads(raw)
        for entry in entries:
            email = str(entry["email"]).strip().lower()
            if "password_hash" in entry:
                users[email] = entry["password_hash"].encode("utf-8")
            else:
                users[email] = _hash_password(str(entry["password"]))
        return users

    for chunk in raw.split(","):
        piece = chunk.strip()
        if not piece:
            continue
        email, password = piece.split(":", 1)
        users[email.strip().lower()] = _hash_password(password.strip())

    return users


_USERS = _parse_auth_users()


def authenticate_user(email: str, password: str) -> AuthUser | None:
    password_hash = _USERS.get(email.strip().lower())
    if not password_hash:
        return None
    if not bcrypt.checkpw(password.encode("utf-8"), password_hash):
        return None
    return AuthUser(email=email.strip().lower(), password_hash=password_hash)


def create_access_token(email: str) -> str:
    expires = datetime.now(UTC) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": email, "exp": expires}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        ) from exc

    email = payload.get("sub")
    if not isinstance(email, str) or email not in _USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        )
    return email


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not auth_enabled():
        return "anonymous"

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decode_access_token(credentials.credentials)
