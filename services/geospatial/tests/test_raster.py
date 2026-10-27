import hashlib

import pytest

rasterio = pytest.importorskip("rasterio")
np = pytest.importorskip("numpy")
pytest.importorskip("pyproj")
from bosque_geo.contracts import Polygon
from bosque_geo.raster import LocalCanopyProvider, RasterSpec
from rasterio.transform import from_origin
from rasterio.warp import transform_geom


@pytest.fixture
def provider(tmp_path):
    path = tmp_path / "synthetic.tif"
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=2,
        height=2,
        count=1,
        dtype="float32",
        crs="EPSG:3857",
        transform=from_origin(0, 20, 10, 10),
        nodata=-9999,
    ) as dst:
        dst.write(np.array([[0, 10], [20, -9999]], dtype="float32"), 1)
    spec = RasterSpec(
        path=path,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_id="synthetic",
        version="fixture-1",
        period="synthetic",
        source_url="synthetic",
        license="LicenseRef-ProGarLabs-Pending",
        attribution="ProGarLabs synthetic",
        scale=1,
        offset=0,
        zero_policy="valid",
        validated=True,
    )
    return LocalCanopyProvider(spec)


def polygon(coords):
    return Polygon.model_validate(
        transform_geom(
            "EPSG:3857", "EPSG:4326", {"type": "Polygon", "coordinates": [coords]}
        )
    )


def test_synthetic_transformation_nodata_and_true_zero(provider):
    area = polygon([[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]])
    stats = provider.analyze(area)
    assert stats.valid_pixels == 3
    assert (stats.min_height_m, stats.max_height_m, stats.mean_height_m) == (0, 20, 10)
    assert stats.source_crs == "EPSG:3857"
    assert 297 < stats.coverage_area_m2 < 302
    assert 395 < stats.queried_area_m2 < 402


def test_crop_excludes_neighbor_pixels(provider):
    area = polygon([[0, 10], [10, 10], [10, 20], [0, 20], [0, 10]])
    assert provider.analyze(area).valid_pixels == 1


@pytest.mark.parametrize(
    "coords,match",
    [
        ([[100, 100], [110, 100], [110, 110], [100, 110], [100, 100]], "intersección"),
        ([[10, 0], [20, 0], [20, 10], [10, 10], [10, 0]], "válidos"),
        ([[0, 0], [2000, 0], [2000, 2000], [0, 2000], [0, 0]], "máxima"),
    ],
)
def test_invalid_windows(provider, coords, match):
    with pytest.raises(ValueError, match=match):
        provider.analyze(polygon(coords))


def test_manifest_hash_is_checked(provider):
    with pytest.raises(ValueError, match="manifiesto"):
        LocalCanopyProvider(provider.spec.model_copy(update={"sha256": "0" * 64}))
