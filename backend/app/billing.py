from __future__ import annotations

import logging
import os
from typing import Literal

import stripe
from fastapi import HTTPException, Request, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)

PlanId = Literal["cycle", "annual", "monthly"]

PLAN_LABELS: dict[PlanId, str] = {
    "cycle": "Cycle Pass",
    "annual": "Annual",
    "monthly": "Monthly",
}


class CheckoutRequest(BaseModel):
    plan_id: PlanId


class CheckoutResponse(BaseModel):
    url: str


class BillingStatusResponse(BaseModel):
    enabled: bool
    plans: list[PlanId]


class CheckoutSessionResponse(BaseModel):
    email: str | None
    plan_id: PlanId | None
    plan_name: str | None
    status: str


def _stripe_secret_key() -> str:
    return os.getenv("STRIPE_SECRET_KEY", "").strip()


def _stripe_webhook_secret() -> str:
    return os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()


def _public_app_url() -> str:
    return os.getenv("PUBLIC_APP_URL", "http://localhost:5173").rstrip("/")


def _plan_price_id(plan_id: PlanId) -> str | None:
    env_names: dict[PlanId, str] = {
        "cycle": "STRIPE_PRICE_CYCLE",
        "annual": "STRIPE_PRICE_ANNUAL",
        "monthly": "STRIPE_PRICE_MONTHLY",
    }
    return os.getenv(env_names[plan_id], "").strip() or None


def billing_enabled() -> bool:
    if not _stripe_secret_key():
        return False
    return all(_plan_price_id(plan_id) for plan_id in PLAN_LABELS)


def _configured_plans() -> list[PlanId]:
    return [plan_id for plan_id in PLAN_LABELS if _plan_price_id(plan_id)]


def configured_plans() -> list[PlanId]:
    return _configured_plans()


def _configure_stripe() -> None:
    secret = _stripe_secret_key()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Online checkout is not configured yet.",
        )
    stripe.api_key = secret


def create_checkout_session(plan_id: PlanId) -> CheckoutResponse:
    _configure_stripe()
    price_id = _plan_price_id(plan_id)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The {PLAN_LABELS[plan_id]} plan is not available for checkout yet.",
        )

    mode: Literal["payment", "subscription"] = "payment" if plan_id == "cycle" else "subscription"
    base_url = _public_app_url()

    try:
        session = stripe.checkout.Session.create(
            mode=mode,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{base_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base_url}/checkout/canceled",
            metadata={"plan_id": plan_id},
            allow_promotion_codes=True,
            billing_address_collection="auto",
        )
    except stripe.StripeError as exc:
        logger.exception("Stripe checkout session failed for plan %s", plan_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to start checkout. Please try again or email hello@shiftworkshr.com.",
        ) from exc

    if not session.url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to start checkout. Please try again or email hello@shiftworkshr.com.",
        )

    return CheckoutResponse(url=session.url)


def get_checkout_session(session_id: str) -> CheckoutSessionResponse:
    _configure_stripe()
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checkout session not found.",
        ) from exc

    plan_id = session.metadata.get("plan_id") if session.metadata else None
    typed_plan_id = plan_id if plan_id in PLAN_LABELS else None
    email = None
    if session.customer_details and session.customer_details.email:
        email = session.customer_details.email

    return CheckoutSessionResponse(
        email=email,
        plan_id=typed_plan_id,
        plan_name=PLAN_LABELS.get(typed_plan_id) if typed_plan_id else None,
        status=session.status or "unknown",
    )


async def handle_stripe_webhook(request: Request) -> dict[str, bool]:
    webhook_secret = _stripe_webhook_secret()
    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook is not configured.",
        )

    _configure_stripe()
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe signature.")

    try:
        event = stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload.") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature.") from exc

    if event.type == "checkout.session.completed":
        session = event.data.object
        plan_id = session.get("metadata", {}).get("plan_id", "unknown")
        customer_email = session.get("customer_details", {}).get("email", "unknown")
        logger.info(
            "Stripe checkout completed: plan=%s email=%s session=%s",
            plan_id,
            customer_email,
            session.get("id"),
        )

    return {"received": True}
