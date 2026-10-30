import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location("repository", Path(__file__).parents[1] / "check_repository.py")
repository = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repository)


class PublicationBoundaryTest(unittest.TestCase):
    def test_private_paths_are_rejected_without_blocking_examples(self):
        for path in (".env", "apps/web/.env.local", "data/restricted/photo.jpg", "data/private/points.json", "tile.TIF", "cloud.laz", "private.pem"):
            with self.subTest(path=path):
                self.assertTrue(repository.forbidden(path))
        for path in (".env.example", "apps/web/.env.example", "data/synthetic/area.geojson", "docs/DATA_GOVERNANCE.md"):
            with self.subTest(path=path):
                self.assertFalse(repository.forbidden(path))

    def test_lab_media_and_weights_cannot_enter_staging(self):
        for path in ("outputs/video.mp4", "source/flight.LRF", "clip.srt", "model.pt",
                     "model.safetensors", "archive.zip", "restricted-data/manifest.json",
                     "samples/hepta/photo.jpg", "meta-api-lab/result.json"):
            with self.subTest(path=path):
                self.assertTrue(repository.forbidden(path))
        self.assertFalse(repository.forbidden("tools/meta_sam_api_lab/viewer.js"))
