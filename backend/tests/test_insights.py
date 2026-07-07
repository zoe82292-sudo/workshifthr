from __future__ import annotations

from pathlib import Path

from app.analyzer import analyze_file
from app.insights import empty_insights

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = ROOT / "sample-data" / "compensation-sample.csv"


def test_merit_scenario_uses_file_average_when_available() -> None:
    content = SAMPLE_FILE.read_bytes()
    result = analyze_file(content, SAMPLE_FILE.name)
    scenario = result.insights.merit_scenario

    assert scenario.payroll_base > 0
    assert scenario.reference_merit_percent > 0
    assert scenario.reference_merit_pool > 0
    assert scenario.total_exposure == round(
        scenario.cost_to_minimum + scenario.reference_merit_pool, 2
    )
    assert len(scenario.scenarios) >= 1
    assert scenario.scenarios[1].merit_percent == scenario.reference_merit_percent


def test_empty_insights_includes_merit_scenario() -> None:
    insights = empty_insights()
    assert insights.merit_scenario.reference_merit_percent == 3.5
    assert insights.merit_scenario.total_exposure == 0
