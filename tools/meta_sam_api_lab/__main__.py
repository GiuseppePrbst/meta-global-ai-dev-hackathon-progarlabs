import argparse
import asyncio
import json
from pathlib import Path

from bosque_ai.meta import MetaResponsesClient

from tools.meta_sam_api_lab.lab import (
    cleanup_remote,
    config_from_private,
    run_experiment,
    write_json,
)
from tools.meta_sam_api_lab.media import extract, inventory, prepare_clip, private_path


def main():
    parser = argparse.ArgumentParser(description="Private hosted SAM 3.1 visual lab")
    parser.add_argument(
        "action", choices=["inventory", "prepare", "image", "video", "serve", "cleanup"]
    )
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--concept", default="tree")
    parser.add_argument(
        "--box", type=float, nargs=4, metavar=("LEFT", "TOP", "RIGHT", "BOTTOM")
    )
    parser.add_argument("--authorize-meta", action="store_true")
    parser.add_argument("--start", type=float, default=5)
    parser.add_argument("--port", type=int, default=8876)
    args = parser.parse_args()
    try:
        if args.action == "serve":
            import uvicorn

            from tools.meta_sam_api_lab.viewer import create_viewer

            uvicorn.run(
                create_viewer(args.output, args.config, args.port),
                host="127.0.0.1",
                port=args.port,
                access_log=False,
            )
        elif args.action == "cleanup":
            manifest_path = private_path(args.output) / "result.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            config = config_from_private(args.config)
            client = MetaResponsesClient(
                config.model_api_key, config.meta_timeout_seconds
            )
            manifest["cleanup"] = asyncio.run(cleanup_remote(client, manifest))
            write_json(manifest_path, manifest)
            print(json.dumps({"cleanup": manifest["cleanup"]}))
        elif args.action in {"inventory", "prepare"}:
            output = private_path(args.output)
            output.mkdir(parents=True, exist_ok=True)
            data = inventory(args.source)
            write_json(output / "inventory.json", data)
            if args.action == "prepare":
                index = next(
                    row["index"]
                    for row in data["entries"]
                    if Path(row["name"]).suffix.lower() == ".mp4"
                )
                source = extract(args.source, output / "source", index)
                prepare_clip(source, output / "clip", start=args.start)
            print(json.dumps({"status": "prepared", "entries": len(data["entries"])}))
        else:
            result = asyncio.run(
                run_experiment(
                    config_from_private(args.config),
                    args.source,
                    args.output,
                    args.concept,
                    video=args.action == "video",
                    authorized=args.authorize_meta,
                    object_box=args.box,
                )
            )
            print(
                json.dumps({"status": result["status"], "cleanup": result["cleanup"]})
            )
    except Exception:  # noqa: BLE001 - sanitize all private CLI failures
        # Full media/credential exception context must never enter public terminal output.
        parser.exit(
            1, "Lab operation failed; inspect private result.json and configuration.\n"
        )


if __name__ == "__main__":
    main()
