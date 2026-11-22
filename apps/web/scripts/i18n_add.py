"""Merge UI strings into src/i18n/{en,hi,cg}.json.  Usage: python scripts/i18n_add.py <module.py>
A module file defines S = {"key": ("English", "Hindi", "Chhattisgarhi"), ...}. Chhattisgarhi strings are working translations (see docs/TESTING.md)."""
import json, runpy, sys
from pathlib import Path
base = Path(__file__).resolve().parent.parent / "src" / "i18n"
S = runpy.run_path(sys.argv[1])["S"]
for i, lang in enumerate(("en", "hi", "cg")):
    p = base / f"{lang}.json"
    d = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    for k, v in S.items():
        d[k] = v[i]
    p.write_text(json.dumps(dict(sorted(d.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"merged {len(S)} keys")
