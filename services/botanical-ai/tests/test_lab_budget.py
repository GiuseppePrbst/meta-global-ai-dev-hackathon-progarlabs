"""Research campaign ceiling, phase caps and cost view: synthetic, no network or DB."""

import json
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).parents[3]))
from tools.meta_sam_api_lab import costs, lab

CAPS = {"A": 3, "B": 7, "C": 15, "D": 14, "E": 10}


def write_config(tmp_path, budget, campaign=None):
    key = tmp_path / "key.txt"
    key.write_text("k" * 48)
    data = {
        "database_url": "postgresql://synthetic/none",
        "key_file": str(key),
        "budget_usd": budget,
        "rights_confirmed": True,
        "external_processing_authorized": True,
    }
    if campaign is not None:
        data["research_campaign"] = campaign
    path = tmp_path / "config.json"
    path.write_text(json.dumps(data))
    return path


def campaign(**overrides):
    return {
        "authorized_usd": 50,
        "authorization_date": "2026-10-30",
        "phase_caps_usd": CAPS,
        "daily_requests": 150,
        "reservation_usd": 0.05,
        "historical_reserved_usd": 1,
    } | overrides


def test_legacy_ceiling_stays_one_dollar_without_explicit_campaign(tmp_path):
    assert (
        lab.config_from_private(write_config(tmp_path, 1)).budget_lifetime_units
        == 1_000_000
    )
    with pytest.raises(ValueError, match="USD 50"):
        lab.config_from_private(write_config(tmp_path, 50))


def test_campaign_lifts_cumulative_cap_to_fifty_with_conservative_quotas(tmp_path):
    config = lab.config_from_private(write_config(tmp_path, 50, campaign()))
    assert config.budget_lifetime_units == 50_000_000  # history counts inside it
    assert config.budget_units == 50_000_000
    assert config.meta_reservation_units == 50_000
    assert config.budget_requests == config.budget_requests_per_identity == 150
    assert config.budget_concurrency == 1


@pytest.mark.parametrize(
    ("budget", "overrides", "message"),
    [
        (51, {"authorized_usd": 51}, "less than or equal"),
        (50, {"phase_caps_usd": {**CAPS, "E": 11}}, "exceed"),
        (40, {}, "must equal"),
        (50, {"daily_requests": 500}, "less than or equal"),
        (50, {"reservation_usd": 0.5}, "less than or equal"),
        (50, {"unlimited": True}, "Extra inputs"),
    ],
)
def test_campaign_rejects_overruns_and_unknown_fields(
    tmp_path, budget, overrides, message
):
    with pytest.raises(ValueError, match=message):
        lab.config_from_private(write_config(tmp_path, budget, campaign(**overrides)))


class FakeConnection:
    def __init__(self, used):
        self.used = used
        self.params = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        self.params = params
        return self

    def fetchone(self):
        return (self.used,)


def test_phase_admission_uses_its_own_identity_and_fails_closed(tmp_path, monkeypatch):
    import psycopg

    config = lab.config_from_private(write_config(tmp_path, 50, campaign()))
    connection = FakeConnection(used=2_950_000)
    monkeypatch.setattr(psycopg, "connect", lambda *a, **k: connection)
    assert lab.admit_phase(config, "A", 3) == "sam-api-lab:A"
    assert connection.params == ("sam-api-lab:A",)
    connection.used = 2_960_000  # next 0.05 reservation would exceed USD 3
    with pytest.raises(HTTPException) as error:
        lab.admit_phase(config, "A", 3)
    assert error.value.status_code == 429
    assert lab.admit_phase(config, None, None) == "sam-api-lab"  # historical identity
    with pytest.raises(ValueError):
        lab.admit_phase(config, "Z", 1)
    with pytest.raises(ValueError):
        lab.admit_phase(config, "B", None)


def test_cost_view_keeps_authorization_reservation_usage_and_estimate_apart():
    rows = [
        {
            "identity_id": "sam-api-lab",
            "reserved_units": 120_000,
            "status": "completed",
            "reported_usage": {
                "model": "sam-3.1",
                "usage": {"video_frames_processed": 50},
            },
        },
        {
            "identity_id": "sam-api-lab",
            "reserved_units": 880_000,
            "status": "provider_error",
            "reported_usage": {"model": "muse-spark-1.3", "usage": {}},
        },
        {
            "identity_id": "sam-api-lab:A",
            "reserved_units": 50_000,
            "status": "completed",
            "reported_usage": {"model": "sam-3.1", "usage": {"images_processed": 1}},
        },
        {
            "identity_id": "sam-api-lab:C",
            "reserved_units": 50_000,
            "status": "completed",
            "reported_usage": {
                "model": "muse-spark-1.3",
                "usage": {"prompt_tokens": 1000, "completion_tokens": 1000},
            },
        },
        {
            "identity_id": "sam-api-lab:D",
            "reserved_units": 50_000,
            "status": "completed",
            "reported_usage": {"model": "unpriced-model", "usage": {"input_tokens": 5}},
        },
    ]
    report = costs.summarize_rows(rows, 50, "sam-api-lab")
    assert report["reserved_usd"]["historical"] == 1.0
    assert report["reserved_usd"]["new"] == pytest.approx(0.15)
    assert report["remaining_reservation_capacity_usd"] == pytest.approx(48.85)
    assert report["estimated_usd"]["by_identity"]["sam-api-lab"] == pytest.approx(0.01)
    assert report["estimated_usd"]["by_identity"]["sam-api-lab:C"] == pytest.approx(
        0.0055
    )
    assert report["estimated_usd"]["rows_without_tariff"] == 1
    assert report["requests"]["by_status"] == {"completed": 4, "provider_error": 1}
    assert report["billing_verified_usd"] is None
    assert costs.estimate("sam-3.1", {"video_frames_processed": 10}) == pytest.approx(
        0.01
    )
    combined = {"images_processed": 1, "prompt_tokens": 1000, "completion_tokens": 0}
    assert costs.estimate("sam-3.1+muse-spark-1.3", combined) == pytest.approx(0.00375)


def test_remote_files_counts_only_recorded_deletes(tmp_path):
    for name, data in {
        "a": {"file_id": "file-x", "cleanup": "deleted"},
        "b": {"file_id": "file-y", "cleanup": "pending"},
        "c": {"file_id": None, "cleanup": "not_uploaded"},
    }.items():
        (tmp_path / "outputs" / name).mkdir(parents=True)
        (tmp_path / "outputs" / name / "result.json").write_text(json.dumps(data))
    assert costs.remote_files(tmp_path) == {"uploaded": 2, "deleted": 1, "pending": 1}
