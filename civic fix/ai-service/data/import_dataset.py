"""Register manually acquired datasets without downloading or altering source data."""
import argparse
import hashlib
import json
from pathlib import Path


def register(name: str, source: Path, output: Path, label_kind: str) -> dict:
    images = [path for path in source.rglob("*") if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    if not images:
        raise ValueError("No supported images found; source was not imported.")
    manifest = {"name": name, "source": str(source.resolve()), "image_count": len(images), "label_kind": label_kind, "downloaded_by_pipeline": False}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2))
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("name")
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("manifests/import.json"))
    parser.add_argument("--label-kind", choices=["real", "weak", "synthetic"], required=True)
    args = parser.parse_args()
    print(json.dumps(register(args.name, args.source, args.output, args.label_kind), indent=2))
