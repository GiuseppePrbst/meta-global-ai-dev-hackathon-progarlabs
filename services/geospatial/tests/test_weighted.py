import hashlib

import pytest

rasterio = pytest.importorskip("rasterio")
np = pytest.importorskip("numpy")
pytest.importorskip("pyproj")
from bosque_geo.context import ContextAreaRequest, projected
from bosque_geo.raster import LocalCanopyProvider, RasterSpec
from bosque_geo.weighted import weighted_statistics
from rasterio.transform import from_origin
from shapely.geometry import box, mapping


def provider(tmp_path, values, **options):
    path = tmp_path / "synthetic.tif"
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=len(values[0]),
        height=len(values),
        count=1,
        crs="EPSG:32718",
        transform=from_origin(740000, 5490000, 10, 10),
        dtype="float32",
        nodata=-9999,
    ) as dst:
        dst.write(np.array(values, dtype="float32"), 1)
    spec = RasterSpec(
        path=path,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_id="synthetic",
        version="fixture",
        period="synthetic",
        source_url="synthetic",
        license="test",
        attribution="test",
        scale=2,
        offset=1,
        zero_policy="exclude_ambiguous",
        validated=True,
        **options,
    )
    return LocalCanopyProvider(spec)


def area(bounds):
    return ContextAreaRequest(area=mapping(projected(box(*bounds), inverse=True)))


def test_partial_pixel_weighting_is_analytic(tmp_path):
    source = provider(tmp_path, [[10, 20]])
    stats = weighted_statistics(source, area((740000, 5489990, 740015, 5490000)))
    assert stats.valid_pixels == 2
    assert stats.mean_height_m == pytest.approx((21 * 100 + 41 * 50) / 150, abs=0.001)
    assert stats.valid_area_m2 == pytest.approx(150, abs=0.001)
    assert stats.coverage_fraction <= 1


def test_ambiguous_zero_is_not_true_zero_and_empty_mean_is_null(tmp_path):
    source = provider(tmp_path, [[0, -9999]])
    stats = weighted_statistics(source, area((740000, 5489990, 740020, 5490000)))
    assert stats.status == "no_valid_data"
    assert stats.mean_height_m is None and stats.valid_area_m2 == 0
    assert stats.ambiguous_fraction == pytest.approx(0.5, abs=0.001)
    assert stats.nodata_area_m2 == pytest.approx(100, abs=0.001)


def test_weighted_no_intersection_and_pixel_limit(tmp_path):
    source = provider(tmp_path, [[10]])
    assert (
        weighted_statistics(source, area((740100, 5490100, 740110, 5490110))).status
        == "no_coverage"
    )
    large = provider(tmp_path, [[10] * 101] * 101)
    thin_ring = box(740000, 5488990, 741010, 5490000).difference(
        box(740001, 5488991, 741009, 5489999)
    )
    request = ContextAreaRequest(area=mapping(projected(thin_ring, inverse=True)))
    with pytest.raises(ValueError, match="10000"):
        weighted_statistics(large, request)


def test_weighted_hole_removes_only_its_footprint(tmp_path):
    source = provider(tmp_path, [[10, 20], [30, 40]])
    with_hole = box(740000, 5489980, 740020, 5490000).difference(
        box(740002, 5489992, 740007, 5489997)
    )
    request = ContextAreaRequest(area=mapping(projected(with_hole, inverse=True)))
    stats = weighted_statistics(source, request)
    assert stats.valid_area_m2 == pytest.approx(375, abs=0.001)
    assert stats.mean_height_m == pytest.approx(53, abs=0.001)


def test_acquisition_dates_are_separate_from_release_and_required_as_pair(tmp_path):
    source = provider(
        tmp_path,
        [[10]],
        source_acquisition_start="2013-09-16",
        source_acquisition_end="2018-09-15",
    )
    result = weighted_statistics(source, area((740000, 5489990, 740010, 5490000)))
    assert result.source_acquisition_start.isoformat() == "2013-09-16"
    assert result.acquisition_reason is None
    with pytest.raises(ValueError):
        RasterSpec.model_validate(
            {**source.spec.model_dump(), "source_acquisition_end": None}
        )
