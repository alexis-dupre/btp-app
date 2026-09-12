#!/usr/bin/env python3
"""Read-only helpers for the autonomous loop.

The loop never infers success from what an agent said in chat. It reads the machine state
that bmad-build-auto writes into the story file's frontmatter.

Usage:
  story_state.py ids <spec-folder>                 -> one story id per line, in manifest order
  story_state.py status <spec-folder> <story-id>   -> status|blocking_condition|baseline_revision
  story_state.py deferred <spec-folder>            -> markdown bullets of every deferred finding
"""
import sys, glob, os, re, json

def _yaml():
    try:
        import yaml
        return yaml
    except ImportError:
        sys.exit("PyYAML required: pip install pyyaml (or: uv tool install pyyaml)")

def frontmatter(path):
    txt = open(path, encoding="utf-8").read()
    if not txt.startswith("---"):
        return {}
    end = txt.find("\n---", 3)
    if end == -1:
        return {}
    return _yaml().safe_load(txt[3:end]) or {}

def story_file(folder, sid):
    hits = sorted(glob.glob(os.path.join(folder, "stories", f"{sid}-*.md")))
    if len(hits) != 1:
        return None
    return hits[0]

def cmd_ids(folder):
    data = _yaml().safe_load(open(os.path.join(folder, "stories.yaml"), encoding="utf-8"))
    items = data.get("stories", data) if isinstance(data, dict) else data
    for it in items:
        print(it["id"] if isinstance(it, dict) else it)

def cmd_status(folder, sid):
    f = story_file(folder, sid)
    if not f:
        print("missing||"); return
    fm = frontmatter(f)
    print("|".join([
        str(fm.get("status", "unknown")),
        str(fm.get("blocking_condition", fm.get("blocking condition", ""))),
        str(fm.get("baseline_revision", "")),
    ]))

def cmd_deferred(folder):
    for f in sorted(glob.glob(os.path.join(folder, "stories", "*.md"))):
        fm = frontmatter(f)
        for d in fm.get("deferred", []) or []:
            if isinstance(d, dict):
                print(f"- [{d.get('severity','?')}] {d.get('summary','')} "
                      f"({d.get('location','n/a')}) — from {os.path.basename(f)}")
            else:
                print(f"- {d} — from {os.path.basename(f)}")

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    {"ids": cmd_ids, "status": cmd_status, "deferred": cmd_deferred}[sys.argv[1]](*sys.argv[2:])
