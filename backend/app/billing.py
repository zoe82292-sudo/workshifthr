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

PRICE_ENV_VARS: dict[PlanId, str] = {
    "cycle": "STRIPE_PRICE_CYCLE",
    "annual": "STRIPE_PRICE_ANNUAL",
    "monthly": "STRIPE_PRICE_MONTHLY",
}


class CheckoutRequest(BaseModel):
    plan_id: PlanId


class CheckoutResponse(BaseModel):
    url: str


class BillingConfigStatus(BaseModel):
    secret_key: bool
    webhook_secret: bool
    price_cycle: bool
    price_annual: bool
    price_monthly: bool
    public_app_url: str


class BillingStatusResponse(BaseModel):
    enabled: bool
    plans: list[PlanId]
    config: BillingConfigStatus
    missing: list[str]


class CheckoutSessionResponse(BaseModel):
    email: str | None
    plan_id: PlanId | None
    plan_name: str | None
    status: str
    organization: str | None = None
    password: str | None = None


def _env(name: str) -> str:
    """Read env var and strip whitespace / accidental quotes from Render copy-paste."""
    return os.getenv(name, "").strip().strip('"').strip("'")


def _stripe_secret_key() -> str:
    return _env("STRIPE_SECRET_KEY")


def _stripe_webhook_secret() -> str:
    return _env("STRIPE_WEBHOOK_SECRET")


def _public_app_url() -> str:
    return _env("PUBLIC_APP_URL") or "http://localhost:5173"


def _plan_price_id(plan_id: PlanId) -> str | None:
    value = _env(PRICE_ENV_VARS[plan_id])
    return value or None


def _configured_plans() -> list[PlanId]:
    if not _stripe_secret_key():
        return []
    return [plan_id for plan_id in PLAN_LABELS if _plan_price_id(plan_id)]


def configured_plans() -> list[PlanId]:
    return _configured_plans()


def billing_enabled() -> bool:
    return bool(_configured_plans())


def billing_config_status() -> BillingConfigStatus:
    return BillingConfigStatus(
        secret_key=bool(_stripe_secret_key()),
        webhook_secret=bool(_stripe_webhook_secret()),
        price_cycle=bool(_plan_price_id("cycle")),
        price_annual=bool(_plan_price_id("annual")),
        price_monthly=bool(_plan_price_id("monthly")),
        public_app_url=_public_app_url().rstrip("/"),
    )


def billing_missing_config() -> list[str]:
    missing: list[str] = []
    if not _stripe_secret_key():
        missing.append("STRIPE_SECRET_KEY")
    for plan_id, env_name in PRICE_ENV_VARS.items():
        if not _plan_price_id(plan_id):
            missing.append(env_name)
    if not _stripe_webhook_secret():
        missing.append("STRIPE_WEBHOOK_SECRET")
    if _public_app_url() in {"http://localhost:5173", "http://127.0.0.1:5173"}:
        missing.append("PUBLIC_APP_URL")
    return missing


def billing_status_response() -> BillingStatusResponse:
    plans = configured_plans()
    return BillingStatusResponse(
        enabled=bool(plans),
        plans=plans,
        config=billing_config_status(),
        missing=billing_missing_config(),
    )


def _configure_stripe() -> None:
    secret = _stripe_secret_key()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Online checkout is not configured yet. Add STRIPE_SECRET_KEY on the server.",
        )
    if not secret.startswith(("sk_test_", "sk_live_", "rk_test_", "rk_live_")):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="STRIPE_SECRET_KEY looks invalid. Use a standard or restricted Stripe secret key.",
        )
    stripe.api_key = secret


def create_checkout_session(plan_id: PlanId) -> CheckoutResponse:
    _configure_stripe()
    price_id = _plan_price_id(plan_id)
    if not price_id:
        env_name = PRICE_ENV_VARS[plan_id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{env_name} is not set for the {PLAN_LABELS[plan_id]} plan.",
        )

    mode: Literal["payment", "subscription"] = "payment" if plan_id == "cycle" else "subscription"
    base_url = _public_app_url().rstrip("/")

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
        user_message = getattr(exc, "user_message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {user_message}",
        ) from exc

    if not session.url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to start checkout. Please try again or email hello@shiftworkshr.com.",
        )

    return CheckoutResponse(url=session.url)


def get_checkout_session(session_id: str) -> CheckoutSessionResponse:
    from app.provisioning import credentials_for_session, provision_from_stripe_session

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

    organization = None
    password = None
    if session.status in {"complete", "paid"}:
        provision_from_stripe_session(session)
        creds = credentials_for_session(session_id)
        if creds:
            email = creds.get("email") or email
            organization = creds.get("organization")
            password = creds.get("password")

    return CheckoutSessionResponse(
        email=email,
        plan_id=typed_plan_id,
        plan_name=PLAN_LABELS.get(typed_plan_id) if typed_plan_id else None,
        status=session.status or "unknown",
        organization=organization,
        password=password,
    )


def _plan_id_for_price(price_id: str | None) -> PlanId | None:
    if not price_id:
        return None
    for plan_id, env_name in PRICE_ENV_VARS.items():
        if _plan_price_id(plan_id) == price_id:
            return plan_id
    return None


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
        from app.provisioning import provision_from_stripe_session

        session = event.data.object
        plan_id = session.get("metadata", {}).get("plan_id", "unknown")
        customer_email = session.get("customer_details", {}).get("email", "unknown")
        provisioned = provision_from_stripe_session(session)
        logger.info(
            "Stripe checkout completed: plan=%s email=%s session=%s provisioned=%s",
            plan_id,
            customer_email,
            session.get("id"),
            bool(provisioned),
        )

    if event.type == "invoice.paid":
        from app.provisioning import renew_org_access

        invoice = event.data.object
        customer_id = str(invoice.get("customer") or "")
        subscription_id = str(invoice.get("subscription") or "")
        billing_reason = str(invoice.get("billing_reason") or "")
        if billing_reason in {"subscription_cycle", "subscription_create"} and customer_id:
            price_id = None
            lines = invoice.get("lines", {}).get("data", [])
            if lines:
                price_id = lines[0].get("price", {}).get("id")
            plan_id = _plan_id_for_price(price_id)
            renewed = renew_org_access(
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id or None,
                plan_id=plan_id,
            )
            logger.info(
                "Stripe invoice.paid: customer=%s subscription=%s renewed=%s",
                customer_id,
                subscription_id,
                renewed,
            )

    if event.type == "customer.subscription.updated":
        from app.provisioning import renew_org_access, revoke_org_access

        subscription = event.data.object
        status_value = str(subscription.get("status") or "")
        customer_id = str(subscription.get("customer") or "")
        subscription_id = str(subscription.get("id") or "")
        if status_value in {"active", "trialing"} and customer_id:
            price_id = None
            items = subscription.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")
            plan_id = _plan_id_for_price(price_id)
            renewed = renew_org_access(
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                plan_id=plan_id,
            )
            logger.info(
                "Stripe subscription.updated: customer=%s status=%s renewed=%s",
                customer_id,
                status_value,
                renewed,
            )
        elif status_value in {"canceled", "unpaid", "incomplete_expired"} and customer_id:
            revoked = revoke_org_access(
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
            )
            logger.info(
                "Stripe subscription.updated: customer=%s status=%s revoked=%s",
                customer_id,
                status_value,
                revoked,
            )

    if event.type == "customer.subscription.deleted":
        from app.provisioning import revoke_org_access

        subscription = event.data.object
        customer_id = str(subscription.get("customer") or "")
        subscription_id = str(subscription.get("id") or "")
        if customer_id:
            revoked = revoke_org_access(
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
            )
            logger.info(
                "Stripe subscription.deleted: customer=%s revoked=%s",
                customer_id,
                revoked,
            )

    return {"received": True}
