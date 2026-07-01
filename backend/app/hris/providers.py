from __future__ import annotations

from pydantic import BaseModel


class HrisProvider(BaseModel):
    id: str
    name: str
    finch_provider: str
    description: str


SUPPORTED_HRIS_PROVIDERS: list[HrisProvider] = [
    HrisProvider(
        id="workday",
        name="Workday",
        finch_provider="workday",
        description="Connect your Workday HCM tenant to import employee and compensation data.",
    ),
    HrisProvider(
        id="ukg",
        name="UKG Pro",
        finch_provider="ukg_pro",
        description="Connect UKG Pro to pull employee directory and pay data.",
    ),
    HrisProvider(
        id="adp",
        name="ADP Workforce Now",
        finch_provider="adp_workforce_now",
        description="Connect ADP Workforce Now for employee and payroll records.",
    ),
    HrisProvider(
        id="bamboohr",
        name="BambooHR",
        finch_provider="bamboohr",
        description="Connect BambooHR to import employee profiles and compensation.",
    ),
    HrisProvider(
        id="paylocity",
        name="Paylocity",
        finch_provider="paylocity",
        description="Connect Paylocity to sync employee and pay information.",
    ),
]


def get_provider(provider_id: str) -> HrisProvider | None:
    for provider in SUPPORTED_HRIS_PROVIDERS:
        if provider.id == provider_id:
            return provider
    return None
