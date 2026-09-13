#!/usr/bin/env python3
"""Stream registry for parallel Claude Code sessions.

A "stream" is one Claude Code session, in its own git worktree, on its own branch,
holding a declared set of path claims and exclusive resources.

State lives in the SHARED git directory (`git rev-parse --git-common-dir`), so every
worktree sees the same registry. It is deliberately NOT versioned: it is ephemeral
coordination state, not project content, and committing it would create the very
conflicts it exists to prevent.

Commands:
  start <name> --claim <dir> [--claim <dir>...] [--exclusive <res>...]
  check <repo-relative-path>     exit 2 + reason if another live stream owns it
  heartbeat <name>
  list
  release <name> [--force]
  gc

Exclusive resources (a path maps to one automatically):
  deps        package.json, pnpm-lock.yaml, pnpm-workspace.yaml
  migrations  drizzle/**, migrations/**, lib/db/schema*
  registry    components.json, app/globals.css
"""
import json, os, sys, subprocess, time, argparse
from datetime import datetime, timezone

TTL_HOURS = float(os.environ.get("BTP_STREAM_TTL_HOURS", "6"))

EXCLUSIVE_MAP = [
    ("deps",       ("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml")),
    ("migrations", ("drizzle/", "migrations/", "lib/db/schema")),
    ("registry",   ("components.json", "app/globals.css")),
]


def registry_dir():
    common = subprocess.run(["git", "rev-parse", "--git-common-dir"],
                            capture_output=True, text=True).stdout.strip()
    if not common:
        sys.exit("not inside a git repository")
    d = os.path.join(os.path.abspath(common), "btp-streams")
    os.makedirs(d, exist_ok=True)
    return d


def now():
    return datetime.now(timezone.utc).isoformat()


def load_all():
    d = registry_dir()
    out = []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".json"):
            continue
        try:
            rec = json.load(open(os.path.join(d, f), encoding="utf-8"))
        except Exception:
            continue
        rec["_file"] = os.path.join(d, f)
        out.append(rec)
    return out


def is_live(rec):
    """A stream is live if its worktree still exists and its heartbeat is recent."""
    if not os.path.isdir(rec.get("worktree", "")):
        return False
    try:
        hb = datetime.fromisoformat(rec.get("heartbeat", rec.get("started", "")))
    except Exception:
        return False
    return (datetime.now(timezone.utc) - hb).total_seconds() < TTL_HOURS * 3600


def normalise(p):
    return p.strip().strip("/").replace("\\", "/")


def under(path, claim):
    """True when `path` sits inside the directory `claim` (or is it)."""
    path, claim = normalise(path), normalise(claim)
    return path == claim or path.startswith(claim + "/")


def exclusive_for(path):
    path = normalise(path)
    for res, prefixes in EXCLUSIVE_MAP:
        for pre in prefixes:
            pre = normalise(pre)
            if path == pre or path.startswith(pre):
                return res
    return None


def cmd_start(a):
    d = registry_dir()
    f = os.path.join(d, f"{a.name}.json")
    if os.path.exists(f) and is_live(json.load(open(f, encoding="utf-8"))):
        sys.exit(f"stream '{a.name}' is already live. Use a different name, or release it.")

    claims = [normalise(c) for c in (a.claim or [])]
    if not claims:
        sys.exit("a stream must declare at least one --claim (a directory it owns)")

    # Refuse to start if any claim overlaps a live stream's claim, in either direction.
    for other in load_all():
        if other.get("stream") == a.name or not is_live(other):
            continue
        for mine in claims:
            for theirs in other.get("claims", []):
                if under(mine, theirs) or under(theirs, mine):
                    sys.exit(
                        f"claim '{mine}' overlaps stream '{other['stream']}' which owns "
                        f"'{theirs}' (worktree {other['worktree']}).\n"
                        f"Narrow your claim, or wait for that stream to finish.")
        for res in (a.exclusive or []):
            if res in other.get("exclusive", []):
                sys.exit(f"exclusive resource '{res}' is held by stream '{other['stream']}'.")

    rec = {
        "stream": a.name,
        "branch": a.branch,
        "worktree": os.path.abspath(a.worktree),
        "claims": claims,
        "exclusive": list(a.exclusive or []),
        "started": now(),
        "heartbeat": now(),
    }
    json.dump(rec, open(f, "w", encoding="utf-8"), indent=2)
    print(f"stream '{a.name}' started on {a.branch}")
    print(f"  claims:    {', '.join(claims)}")
    print(f"  exclusive: {', '.join(rec['exclusive']) or '(none)'}")


def cmd_check(a):
    path = normalise(a.path)
    me = a.stream
    for other in load_all():
        if not is_live(other) or other.get("stream") == me:
            continue
        for claim in other.get("claims", []):
            if under(path, claim):
                print(f"'{path}' belongs to stream '{other['stream']}' (claims '{claim}', "
                      f"branch {other.get('branch')}, worktree {other['worktree']}).\n"
                      f"Two sessions editing the same area merge cleanly and still produce "
                      f"a wrong result. Stop, and tell the user which stream should own this.",
                      file=sys.stderr)
                sys.exit(2)

    res = exclusive_for(path)
    if res:
        holder = next((o for o in load_all()
                       if is_live(o) and res in o.get("exclusive", [])), None)
        if holder and holder.get("stream") != me:
            print(f"'{path}' touches the exclusive resource '{res}', held by stream "
                  f"'{holder['stream']}'. Wait, or ask the user to arbitrate.",
                  file=sys.stderr)
            sys.exit(2)
        if not holder and me:
            print(f"'{path}' touches the exclusive resource '{res}' and no stream holds it.\n"
                  f"Claim it first so no other session collides:\n"
                  f"  bash scripts/stream/stream.sh claim {res}",
                  file=sys.stderr)
            sys.exit(2)
    sys.exit(0)


def cmd_claim(a):
    f = os.path.join(registry_dir(), f"{a.stream}.json")
    if not os.path.exists(f):
        sys.exit(f"stream '{a.stream}' is not registered")
    rec = json.load(open(f, encoding="utf-8"))
    for other in load_all():
        if is_live(other) and other["stream"] != a.stream and a.resource in other.get("exclusive", []):
            sys.exit(f"'{a.resource}' is held by stream '{other['stream']}'")
    if a.resource not in rec["exclusive"]:
        rec["exclusive"].append(a.resource)
    rec["heartbeat"] = now()
    json.dump(rec, open(f, "w", encoding="utf-8"), indent=2)
    print(f"stream '{a.stream}' now holds '{a.resource}'")


def cmd_heartbeat(a):
    f = os.path.join(registry_dir(), f"{a.stream}.json")
    if not os.path.exists(f):
        return
    rec = json.load(open(f, encoding="utf-8"))
    rec["heartbeat"] = now()
    json.dump(rec, open(f, "w", encoding="utf-8"), indent=2)


def cmd_list(a):
    recs = load_all()
    if not recs:
        print("no streams registered")
        return
    for r in recs:
        state = "LIVE " if is_live(r) else "stale"
        print(f"[{state}] {r['stream']:<14} {r.get('branch',''):<28} "
              f"claims={','.join(r.get('claims', []))} "
              f"exclusive={','.join(r.get('exclusive', [])) or '-'}")
        print(f"          worktree {r.get('worktree')}  heartbeat {r.get('heartbeat','?')}")


def cmd_release(a):
    f = os.path.join(registry_dir(), f"{a.stream}.json")
    if not os.path.exists(f):
        sys.exit(f"stream '{a.stream}' is not registered")
    rec = json.load(open(f, encoding="utf-8"))
    if is_live(rec) and not a.force:
        print(f"stream '{a.stream}' still looks live (worktree exists, recent heartbeat).")
        print("Release it anyway with --force only if you are certain that session is over.")
        sys.exit(1)
    os.remove(f)
    print(f"released '{a.stream}'")


def cmd_gc(a):
    n = 0
    for r in load_all():
        if not is_live(r):
            os.remove(r["_file"]); n += 1
            print(f"removed stale stream '{r['stream']}'")
    print(f"{n} stale stream(s) removed")


p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sub = p.add_subparsers(dest="cmd", required=True)

s = sub.add_parser("start"); s.add_argument("name"); s.add_argument("--branch", required=True)
s.add_argument("--worktree", required=True); s.add_argument("--claim", action="append")
s.add_argument("--exclusive", action="append"); s.set_defaults(fn=cmd_start)

s = sub.add_parser("check"); s.add_argument("path"); s.add_argument("--stream", default="")
s.set_defaults(fn=cmd_check)

s = sub.add_parser("claim"); s.add_argument("resource"); s.add_argument("--stream", required=True)
s.set_defaults(fn=cmd_claim)

s = sub.add_parser("heartbeat"); s.add_argument("stream"); s.set_defaults(fn=cmd_heartbeat)
s = sub.add_parser("list"); s.set_defaults(fn=cmd_list)
s = sub.add_parser("release"); s.add_argument("stream"); s.add_argument("--force", action="store_true")
s.set_defaults(fn=cmd_release)
s = sub.add_parser("gc"); s.set_defaults(fn=cmd_gc)

a = p.parse_args()
a.fn(a)
