"""Read-only historical import; incomplete experiment identities remain unknown."""

import json
import re
from collections import Counter
from pathlib import Path

from tools.meta_sam_api_lab.media import digest, private_path


def import_history(queue, root, campaign_id):
    root = private_path(Path(root))
    counts = Counter()
    with queue.connect() as conn:
        for directory in sorted(root.glob("v2*")):
            if not directory.is_dir() or not re.fullmatch(
                r"[A-Za-z0-9_-]{1,200}", directory.name
            ):
                continue
            result_file = directory / "result.json"
            if not result_file.is_file():
                counts["missing_result"] += 1
                continue
            data = json.loads(result_file.read_text(encoding="utf-8"))
            if data.get("status") not in ("completed", "no_matches"):
                counts["nonterminal"] += 1
                continue
            counts["terminal_files"] += 1
            evidence_hash = digest(result_file)
            row = conn.execute(
                """INSERT INTO sam_historical_results
                (evidence_sha256,historical_id,campaign_id,media_sha256,model,prompt,result_status,created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING RETURNING historical_id""",
                (
                    evidence_hash,
                    directory.name,
                    campaign_id,
                    data.get("source_sha256"),
                    data.get("model"),
                    data.get("prompt"),
                    data["status"],
                    data.get("created_at"),
                ),
            ).fetchone()
            if row:
                counts["inserted"] += 1
            else:
                previous = conn.execute(
                    "SELECT evidence_sha256 FROM sam_historical_results WHERE campaign_id=%s AND historical_id=%s",
                    (campaign_id, directory.name),
                ).fetchone()
                counts[
                    "existing"
                    if previous and previous["evidence_sha256"] == evidence_hash
                    else "conflict"
                ] += 1
    return dict(counts)
