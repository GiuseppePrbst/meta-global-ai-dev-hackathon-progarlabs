import json
from pathlib import Path

import pytest
from bosque_geo.contracts import Point, Polygon
from pydantic import ValidationError


@pytest.mark.parametrize(
    "ring",
    [
        [[0, 0], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [0, 1]],
        [[0, 0], [1, 1], [2, 2], [0, 0]],
        [[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]],
        [[0, 0], [181, 0], [0, 1], [0, 0]],
    ],
)
def test_invalid_polygons_are_rejected(ring):
    with pytest.raises(ValidationError):
        Polygon(coordinates=[ring])


def test_synthetic_geojson_is_valid_and_explicit():
    path = Path(__file__).parents[3] / "data/synthetic/observations.geojson"
    features = json.loads(path.read_text(encoding="utf-8"))["features"]
    assert len(features) == 1
    assert features[0]["properties"]["synthetic"] is True
    assert Point.model_validate(features[0]["geometry"]).coordinates == (0, 0)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_nonfinite_coordinates_are_rejected(value):
    with pytest.raises(ValidationError):
        Point(coordinates=(value, 0))
