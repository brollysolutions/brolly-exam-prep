"""Refresh the checked-in schema without a running API or database connection."""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from app.main import app  # noqa: E402

target = root / "openapi.json"
target.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", "utf-8")
print(f"Exported {len(app.openapi()['paths'])} API paths to {target.name}")
