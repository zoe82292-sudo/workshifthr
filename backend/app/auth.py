from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
security = HTTPBearer(auto_error=False)

_CREDENTIALS_CACHE: tuple[dict[str, "_OrgCredential"], dict[str, "_OrgCredential"]] | None = None
_CREDENTIALS_CACHE_MTIME: float = -1.0


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str
    organization: str


class RecoverAccessRequest(BaseModel):
    email: EmailStr


class RecoverAccessResponse(BaseModel):
    message: str


class AuthContext(BaseModel):
    email: str
    organization: str


class AuthUser(BaseModel):
    email: str
    password_hash: bytes
    organization: str

    model_config = {"arbitrary_types_allowed": True}


@dataclass(frozen=True)
class _OrgCredential:
    organization: str
    password_hash: bytes


def invalidate_credentials_cache() -> None:
    global _CREDENTIALS_CACHE, _CREDENTIALS_CACHE_MTIME
    _CREDENTIALS_CACHE = None
    _CREDENTIALS_CACHE_MTIME = -1.0


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is required when authentication is enabled.")
    return secret


def auth_enabled() -> bool:
    if os.getenv("AUTH_USERS", "").strip():
        return True
    from app.provisioning import has_orgs

    return has_orgs()


def _hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def _normalize_password_hash(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        return value
    return value.encode("utf-8")


def _organization_name(entry: dict, fallback_email: str) -> str:
    explicit = str(entry.get("organization") or entry.get("org") or "").strip()
    if explicit:
        return explicit
    if "@" in fallback_email:
        domain = fallback_email.split("@", 1)[1]
        return domain.split(".", 1)[0].replace("-", " ").title()
    return "Organization"


def _parse_env_auth_users() -> tuple[dict[str, _OrgCredential], dict[str, _OrgCredential]]:
    """Return direct email logins and domain-wide shared org logins from AUTH_USERS."""
    raw = os.getenv("AUTH_USERS", "").strip()
    email_users: dict[str, _OrgCredential] = {}
    domain_users: dict[str, _OrgCredential] = {}

    if not raw:
        return email_users, domain_users

    if raw.startswith("["):
        entries = json.loads(raw)
        for entry in entries:
            if "emails" in entry or "allow_domain" in entry or "organization" in entry or "org" in entry:
                password_hash = (
                    _normalize_password_hash(entry["password_hash"])
                    if "password_hash" in entry
                    else _hash_password(str(entry["password"]))
                )
                emails = [str(value).strip().lower() for value in entry.get("emails", []) if str(value).strip()]
                if "email" in entry:
                    emails.append(str(entry["email"]).strip().lower())
                emails = list(dict.fromkeys(emails))
                organization = _organization_name(entry, emails[0] if emails else "")
                credential = _OrgCredential(organization=organization, password_hash=password_hash)

                for email in emails:
                    email_users[email] = credential

                allow_domain = str(entry.get("allow_domain") or "").strip().lower()
                if allow_domain:
                    domain_users[allow_domain] = credential
                continue

            email = str(entry["email"]).strip().lower()
            password_hash = (
                _normalize_password_hash(entry["password_hash"])
                if "password_hash" in entry
                else _hash_password(str(entry["password"]))
            )
            email_users[email] = _OrgCredential(
                organization=_organization_name(entry, email),
                password_hash=password_hash,
            )
        return email_users, domain_users

    for chunk in raw.split(","):
        piece = chunk.strip()
        if not piece:
            continue
        email, password = piece.split(":", 1)
        normalized_email = email.strip().lower()
        email_users[normalized_email] = _OrgCredential(
            organization=_organization_name({}, normalized_email),
            password_hash=_hash_password(password.strip()),
        )

    return email_users, domain_users


def _get_credentials() -> tuple[dict[str, _OrgCredential], dict[str, _OrgCredential]]:
    global _CREDENTIALS_CACHE, _CREDENTIALS_CACHE_MTIME

    from app.provisioning import load_credentials, store_mtime

    mtime = store_mtime()
    if _CREDENTIALS_CACHE is not None and _CREDENTIALS_CACHE_MTIME == mtime:
        return _CREDENTIALS_CACHE

    email_users, domain_users = _parse_env_auth_users()
    prov_email, prov_domain = load_credentials()
    email_users = {**email_users, **prov_email}
    domain_users = {**domain_users, **prov_domain}
    _CREDENTIALS_CACHE = (email_users, domain_users)
    _CREDENTIALS_CACHE_MTIME = mtime
    return email_users, domain_users


def _credential_for_email(email: str) -> _OrgCredential | None:
    normalized = email.strip().lower()
    email_users, domain_users = _get_credentials()
    direct = email_users.get(normalized)
    if direct is not None:
        return direct

    if "@" not in normalized:
        return None

    domain = normalized.split("@", 1)[1]
    return domain_users.get(domain)


def _session_allowed(email: str) -> bool:
    from app.provisioning import org_access_expired

    if org_access_expired(email):
        return False
    return _credential_for_email(email) is not None


def authenticate_user(email: str, password: str) -> AuthUser | None:
    from app.provisioning import org_access_expired

    normalized = email.strip().lower()
    if org_access_expired(normalized):
        return None

    credential = _credential_for_email(normalized)
    if credential is None:
        return None
    if not bcrypt.checkpw(password.encode("utf-8"), credential.password_hash):
        return None
    return AuthUser(
        email=normalized,
        password_hash=credential.password_hash,
        organization=credential.organization,
    )


def create_access_token(email: str, organization: str) -> str:
    expires = datetime.now(UTC) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": email.strip().lower(), "org": organization, "exp": expires}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_auth_context(token: str) -> AuthContext:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        ) from exc

    email = payload.get("sub")
    if not isinstance(email, str) or not _session_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        )

    organization = payload.get("org")
    if not isinstance(organization, str) or not organization.strip():
        credential = _credential_for_email(email)
        organization = credential.organization if credential else "Organization"

    return AuthContext(email=email.strip().lower(), organization=organization.strip())


def decode_access_token(token: str) -> str:
    return decode_auth_context(token).email


def require_auth_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthContext:
    if not auth_enabled():
        return AuthContext(email="anonymous", organization="Anonymous")

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    context = decode_auth_context(credentials.credentials)

    from app.provisioning import org_access_expired

    if org_access_expired(context.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your plan has expired. Renew at shiftworkshr.com/#pricing or email hello@shiftworkshr.com.",
        )

    return context


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    return require_auth_user(credentials).email
