from __future__ import annotations

import logging

from pydantic import BaseModel, EmailStr

from app.provisioning import find_org_for_authorized_email
from app.provisioning import _file_lock, _find_org_by_email, _read_store, _write_store

logger = logging.getLogger(__name__)


class OrgMemberSummary(BaseModel):
    email: str
    is_self: bool


class OrgMembersResponse(BaseModel):
    organization: str
    company_domain: str
    members: list[OrgMemberSummary]
    can_manage: bool


class AddOrgMemberRequest(BaseModel):
    email: EmailStr


class AddOrgMemberResponse(BaseModel):
    email: str
    members: list[str]
    invited: bool


def org_members_for_user(email: str) -> OrgMembersResponse | None:
    org = find_org_for_authorized_email(email)
    if org is None:
        return None

    normalized = email.strip().lower()
    members = sorted(str(value).lower() for value in org.get("authorized_emails", []) if str(value).strip())
    return OrgMembersResponse(
        organization=str(org.get("organization", "")),
        company_domain=str(org.get("company_domain", "")),
        members=[
            OrgMemberSummary(email=member, is_self=member == normalized)
            for member in members
        ],
        can_manage=True,
    )


def _same_company_domain(org: dict, candidate_email: str) -> bool:
    company_domain = str(org.get("company_domain", "")).lower()
    if not company_domain or "@" not in candidate_email:
        return False
    return candidate_email.split("@", 1)[1].lower() == company_domain


def add_org_member(actor_email: str, new_email: str) -> AddOrgMemberResponse:
    actor = actor_email.strip().lower()
    candidate = new_email.strip().lower()
    if "@" not in candidate:
        raise ValueError("Enter a valid work email address.")

    org = find_org_for_authorized_email(actor)
    if org is None:
        raise PermissionError("Only signed-in organization members can add teammates.")

    if not _same_company_domain(org, candidate):
        company_domain = str(org.get("company_domain", ""))
        raise ValueError(f"Teammates must use your organization domain (@{company_domain}).")

    with _file_lock:
        store = _read_store()
        locked_org = _find_org_by_email(store, actor)
        if locked_org is None:
            raise PermissionError("Only signed-in organization members can add teammates.")

        emails = [str(value).lower() for value in locked_org.get("authorized_emails", []) if str(value).strip()]
        if candidate in emails:
            raise ValueError("That teammate already has access.")

        emails.append(candidate)
        locked_org["authorized_emails"] = list(dict.fromkeys(emails))
        _write_store(store)
        organization = str(locked_org.get("organization", ""))

    from app.auth import invalidate_credentials_cache

    invalidate_credentials_cache()

    invited = False
    from app.email_delivery import email_delivery_configured, send_teammate_invite_email

    if email_delivery_configured():
        invited = send_teammate_invite_email(organization=organization, email=candidate)

    logger.info("Added teammate %s to org %s by %s", candidate, organization, actor)
    return AddOrgMemberResponse(email=candidate, members=sorted(emails), invited=invited)


def remove_org_member(actor_email: str, target_email: str) -> list[str]:
    actor = actor_email.strip().lower()
    candidate = target_email.strip().lower()

    if find_org_for_authorized_email(actor) is None:
        raise PermissionError("Only signed-in organization members can remove teammates.")

    with _file_lock:
        store = _read_store()
        org = _find_org_by_email(store, actor)
        if org is None:
            raise PermissionError("Only signed-in organization members can remove teammates.")

        emails = [str(value).lower() for value in org.get("authorized_emails", []) if str(value).strip()]
        if candidate not in emails:
            raise ValueError("That teammate is not on your access list.")

        if len(emails) <= 1:
            raise ValueError("Your organization must keep at least one authorized teammate.")

        emails = [value for value in emails if value != candidate]
        org["authorized_emails"] = emails
        _write_store(store)
        organization = str(org.get("organization", ""))

    from app.auth import invalidate_credentials_cache

    invalidate_credentials_cache()
    logger.info("Removed teammate %s from org %s by %s", candidate, organization, actor)
    return sorted(emails)
