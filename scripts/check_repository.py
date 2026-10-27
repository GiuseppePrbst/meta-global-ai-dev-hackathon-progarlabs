"""Check publishable paths and the bootstrap's required deliverables (no extra deps)."""

from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md", "AGENTS.md", "CONTRIBUTING.md", ".env.example", "compose.yaml",
    ".github/workflows/ci.yml", "apps/web/package.json", "services/api/pyproject.toml",
    "services/api/uv.lock", "services/botanical-ai/pyproject.toml",
    "services/geospatial/pyproject.toml", "docs/PROJECT_CHARTER.md",
    "docs/TEAM_AND_GOVERNANCE.md", "docs/PRODUCT_REQUIREMENTS.md", "docs/ARCHITECTURE.md",
    "docs/ROADMAP.md", "docs/BACKLOG.md", "docs/DATA_GOVERNANCE.md",
    "docs/DATASET_LICENSES.md", "docs/AI_EVALUATION.md", "docs/HACKATHON_CONTRIBUTIONS.md",
    "docs/SECURITY.md", "docs/DEPLOYMENT.md", "docs/DEMO_SCRIPT.md", "docs/SOURCES.md",
    "docs/BOOTSTRAP_REPORT.md",
) + tuple(f"docs/product/{name}.md" for name in (
    "PRODUCT_VISION", "PRODUCT_STRATEGY", "PERSONAS", "USER_JOURNEYS",
    "FEATURE_PRIORITIZATION", "DESIGN_PRINCIPLES", "INFORMATION_ARCHITECTURE", "DESIGN_SYSTEM",
))


def forbidden(path: str) -> bool:
    item = PurePosixPath(path.replace("\\", "/"))
    return (
        (item.name == ".env" or item.name.startswith(".env."))
        and not item.name.endswith(".example")
    ) or item.suffix.lower() in {".pem", ".key", ".las", ".laz", ".tif", ".tiff", ".gpkg"} or (
        len(item.parts) > 1 and item.parts[0] == "data" and item.parts[1] in {"restricted", "private"}
    )


def main() -> int:
    files = subprocess.check_output(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT
    ).decode("utf-8").split("\0")
    errors = [f"Missing or empty: {name}" for name in REQUIRED if not (
        (ROOT / name).is_file() and (ROOT / name).stat().st_size
    )]
    errors += [f"Forbidden publishable path: {name}" for name in files if name and forbidden(name)]
    for name in files:
        if not name.endswith(".md") or not (ROOT / name).is_file():
            continue
        contents = (ROOT / name).read_text(encoding="utf-8")
        for link in re.findall(r"\[[^\]]*\]\(([^)]+)\)", contents):
            target = urlsplit(link.strip("<>"))
            if target.scheme or not target.path or target.path.startswith("/"):
                continue
            resolved = (ROOT / name).parent / unquote(target.path)
            if not resolved.exists():
                errors.append(f"Broken link: {name} -> {link}")
    for error in errors:
        print(error, file=sys.stderr)
    if not errors:
        print(f"Repository structure, Markdown paths and publication boundaries OK ({len(REQUIRED)} required files).")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
