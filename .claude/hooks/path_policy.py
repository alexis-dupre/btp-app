#!/usr/bin/env python3
"""Single path policy, shared by the Edit guard and the Bash guard.

The point: a rule that only applies to the Edit tool is not a rule. `cat > file`,
`sed -i`, `tee`, `cp` and `mv` all write files through Bash and would otherwise walk
straight past every path guard. One policy, two entry points.

  policy <repo-relative-path>   exit 2 + reason when the path is protected
  targets <shell-command>       print every path that command would write to
"""
import re, sys, os

PROTECTED = [
    (r"(^|/)components/ui/",
     "components/ui/** is owned by the shadcn registry.\n"
     "Regenerate with 'pnpm dlx shadcn@latest add <component> --overwrite', or wrap the\n"
     "primitive in components/<feature>/. See docs/standards/20-design-system.md."),
    (r"(^|/)\.env($|\.)",
     "environment files are never written by an agent. Ask the user to set the variable\n"
     "and document it in .env.example."),
    (r"(^|/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$",
     "lockfiles are generated. Run the package manager instead."),
    (r"(^|/)(node_modules|\.next|dist|build)/",
     "generated or vendored directory."),
    (r"^\.claude/(settings\.json|hooks/|agents/|skills/(?!shadcn))",
     "part of the quality gate. An agent does not change the rules it is measured by."),
    (r"^\.github/workflows/",
     "part of the quality gate. An agent does not change the rules it is measured by."),
    (r"^scripts/(verify\.sh|check-bundle-budget\.mjs|loop/|stream/)",
     "part of the quality gate. An agent does not change the rules it is measured by."),
    (r"^(tsconfig\.json|eslint\.config\..*|\.eslintrc.*|vitest\.config\..*|"
     r"vitest\.integration\..*|playwright\.config\..*)$",
     "part of the quality gate. An agent does not change the rules it is measured by."),
    (r"^docs/standards/",
     "part of the quality gate. An agent does not change the rules it is measured by."),
]

# Applied migrations are immutable: only block when the file already exists.
MIGRATION = r"(^|/)(drizzle|migrations)/.*\.sql$"


def norm(p):
    p = p.strip().strip("'\"")
    root = os.environ.get("BTP_REPO_ROOT", os.getcwd())
    if p.startswith(root + "/"):
        p = p[len(root) + 1:]
    while p.startswith("./"):
        p = p[2:]
    return p.lstrip("/")


def policy(path):
    p = norm(path)
    if os.environ.get("BTP_ALLOW_GATE_EDIT") == "1":
        gate = "part of the quality gate"
    else:
        gate = None
    for rx, reason in PROTECTED:
        if re.search(rx, p):
            if gate and "quality gate" in reason:
                continue
            return f"'{p}': {reason}"
    if re.search(MIGRATION, p) and os.path.exists(p):
        return (f"'{p}' already exists. Applied migrations are immutable.\n"
                "Create a new migration that fixes forward. "
                "See docs/standards/70-data-and-migrations.md.")
    return None


FLAG = re.compile(r"^-")


def targets(cmd):
    """Best-effort extraction of paths a shell command would write to."""
    out = []
    # redirections:  > file   >> file   2> file
    out += re.findall(r"(?:^|[\s;&|(])\d?>>?\s*([^\s;&|<>()]+)", cmd)
    # tee [-a] file...
    for m in re.finditer(r"\btee\b((?:\s+-\S+)*)((?:\s+[^\s;&|<>]+)+)", cmd):
        out += [t for t in m.group(2).split() if not FLAG.match(t)]
    # sed -i ... file  (take every non-flag operand; a stray s/// expression is harmless
    # because policy() simply will not match it)
    for m in re.finditer(r"\bsed\b(?=[^;&|]*\s-i)([^;&|]*)", cmd):
        out += [t for t in m.group(1).split()
                if not FLAG.match(t) and not t.lstrip("'\"").startswith(("s/", "s|"))]
    # cp / mv / install / rsync -> destination is the last operand
    for m in re.finditer(r"\b(?:cp|mv|install|rsync)\b([^;&|]*)", cmd):
        parts = [t for t in m.group(1).split() if not FLAG.match(t)]
        if len(parts) >= 2:
            out.append(parts[-1])
    # rm -> every operand
    for m in re.finditer(r"\brm\b([^;&|]*)", cmd):
        out += [t for t in m.group(1).split() if not FLAG.match(t)]
    # dd of=, truncate
    out += re.findall(r"\bof=([^\s;&|]+)", cmd)
    for m in re.finditer(r"\btruncate\b([^;&|]*)", cmd):
        parts = [t for t in m.group(1).split() if not FLAG.match(t)]
        out += parts
    seen, res = set(), []
    for t in out:
        t = t.strip()
        if t and t not in seen and not t.startswith("/dev/"):
            seen.add(t); res.append(t)
    return res


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    mode, arg = sys.argv[1], sys.argv[2]
    if mode == "policy":
        r = policy(arg)
        if r:
            print(r, file=sys.stderr); sys.exit(2)
        sys.exit(0)
    if mode == "targets":
        print("\n".join(targets(arg)))
        sys.exit(0)
    sys.exit(f"unknown mode {mode}")
