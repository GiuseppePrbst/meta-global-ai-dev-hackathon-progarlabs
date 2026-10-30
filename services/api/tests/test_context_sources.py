import runpy
from pathlib import Path
from zipfile import ZipFile

import pytest

pytest.importorskip("fiona")
pa = pytest.importorskip("pyarrow")
pq = pytest.importorskip("pyarrow.parquet")


@pytest.fixture
def scripts(monkeypatch):
    root = Path(__file__).parents[3]
    monkeypatch.syspath_prepend(str(root))
    return (
        runpy.run_path(str(root / "evaluations/forest_sources.py")),
        runpy.run_path(str(root / "evaluations/chmv2_temporal.py")),
    )


@pytest.mark.parametrize("name", ["../escape.shp", "C:/escape.shp", "folder/../../escape.shp"])
def test_archive_traversal_is_rejected_before_extraction(tmp_path, scripts, name):
    archive = tmp_path / "unsafe.zip"
    with ZipFile(archive, "w") as output:
        output.writestr(name, b"synthetic")
    with pytest.raises(ValueError, match="inseguro"):
        scripts[0]["extract_zip"](archive, tmp_path / "extracted")
    assert not (tmp_path / "extracted").exists()


def test_zip_valid_components_and_duplicate_names(tmp_path, scripts):
    archive = tmp_path / "valid.zip"
    with ZipFile(archive, "w") as output:
        output.writestr("synthetic.prj", "synthetic")
    result = scripts[0]["extract_zip"](archive, tmp_path / "extracted")
    assert len(result) == 1 and len(result[0]["sha256"]) == 64
    with ZipFile(tmp_path / "duplicate.zip", "w") as output:
        output.writestr("one.shp", "synthetic")
        output.writestr("ONE.shp", "synthetic")
    with pytest.raises(ValueError):
        scripts[0]["extract_zip"](tmp_path / "duplicate.zip", tmp_path / "other")


def test_downloader_rejects_private_or_authenticated_url_without_network(tmp_path, scripts):
    for url in [
        "https://localhost/private",
        "http://www.bcn.cl/file",
        "https://user:password@www.bcn.cl/file",
    ]:
        with pytest.raises(ValueError, match="URL"):
            scripts[0]["download"](url, tmp_path / "file", 100)


def test_profile_quarantines_invalid_geometry_and_preserves_blanks(scripts):
    from shapely.geometry import Polygon, box, mapping

    features = [
        {
            "id": "valid",
            "geometry": mapping(box(-72.084, -40.684, -72.082, -40.682)),
            "properties": {"especi1_ci": " ", "other": None},
        },
        {
            "id": "invalid",
            "geometry": mapping(
                Polygon(
                    [
                        (-72.084, -40.684),
                        (-72.082, -40.682),
                        (-72.084, -40.682),
                        (-72.082, -40.684),
                        (-72.084, -40.684),
                    ]
                )
            ),
            "properties": {},
        },
    ]
    result, qa = scripts[0]["profile"](
        features,
        "EPSG:4326",
        box(-72.085, -40.685, -72.081, -40.681),
        {"especi1_ci": "string", "other": "string"},
    )
    assert len(result["features"]) == 1
    assert qa["quarantined_pilot"] == ["invalid"]
    assert qa["blank_counts"]["especi1_ci"] == 1
    assert qa["null_counts"]["other"] == 1


def indexes(tmp_path, starts, keys=None):
    keys = keys or ["2102332230"]
    pq.write_table(
        pa.table(
            {
                "quadkey": keys,
                "acq_start": starts,
                "acq_end": ["2018-09-15"] * len(keys),
                "acq_n": [6] * len(keys),
            }
        ),
        tmp_path / "acq_dates.parquet",
    )
    pq.write_table(
        pa.table({"quadkey": ["2102332230"], "cog_url": ["synthetic"], "tile_size_bytes": [1]}),
        tmp_path / "tiles.parquet",
    )


def test_acquisition_joins_one_to_one_and_missing_dates_remain_null(tmp_path, scripts):
    indexes(tmp_path, ["2013-09-16"])
    result = scripts[1]["acquisition"](tmp_path, "2102332230")
    assert result["source_acquisition_start"] == "2013-09-16"
    assert result["acquisition_reason"] is None
    indexes(tmp_path, [None])
    result = scripts[1]["acquisition"](tmp_path, "2102332230")
    assert result["source_acquisition_start"] is None
    assert result["source_acquisition_end"] is None
    assert result["acquisition_reason"]
    empty = pq.read_table(tmp_path / "acq_dates.parquet").slice(0, 0)
    pq.write_table(empty, tmp_path / "acq_dates.parquet")
    result = scripts[1]["acquisition"](tmp_path, "2102332230")
    assert result["source_acquisition_start"] is None
    assert result["tiles_without_date_rows"] == 1


def test_acquisition_rejects_duplicate_or_unrelated_keys(tmp_path, scripts):
    indexes(tmp_path, ["2013-09-16", "2013-09-16"], ["2102332230", "2102332230"])
    with pytest.raises(ValueError, match="duplicada"):
        scripts[1]["acquisition"](tmp_path, "2102332230")
    indexes(tmp_path, ["2013-09-16"], ["other"])
    with pytest.raises(ValueError, match="uno a uno"):
        scripts[1]["acquisition"](tmp_path, "2102332230")
