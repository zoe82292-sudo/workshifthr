from __future__ import annotations

import pandas as pd

from app.columns import REQUIRED_FIELDS, detect_column_mapping, mapping_has_required, normalize_upload_dataframe


def test_detect_column_mapping_standard_headers() -> None:
    frame = pd.DataFrame(
        {
            "Employee ID": ["E001", "E002"],
            "Base Salary": [80000, 95000],
            "Range Min": [70000, 85000],
            "Range Max": [100000, 120000],
            "Department": ["Finance", "Engineering"],
        }
    )

    mapping = detect_column_mapping(list(frame.columns), frame)

    assert mapping["employee_id"] == "Employee ID"
    assert mapping["salary"] == "Base Salary"
    assert mapping["range_min"] == "Range Min"
    assert mapping["range_max"] == "Range Max"
    assert mapping["department"] == "Department"


def test_detect_column_mapping_missing_required() -> None:
    frame = pd.DataFrame(
        {
            "EE Name": ["Alex", "Jordan"],
            "Pay": [80000, 95000],
        }
    )

    mapping = detect_column_mapping(list(frame.columns), frame)

    assert mapping.get("employee_name") == "EE Name"
    assert mapping.get("salary") == "Pay"
    for field in REQUIRED_FIELDS:
        if field == "salary":
            continue
        assert not mapping.get(field)
