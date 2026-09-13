---
name: preflight
description: Verify the development infrastructure itself is correctly installed and wired. Use after cloning, after changing .claude config, or when an agent behaves unexpectedly.
allowed-tools: Bash, Read, Glob
disable-model-invocation: true
---

# Preflight

Check the factory before blaming the workers.

```bash
node --version                     # 20.12+ required by BMad
python3 --version                  # 3.10+ required by BMad
pnpm --version
command -v jq  || echo "jq missing (hooks fall back to python3)"
claude --version
ls .claude/agents/**/*.md | wc -l  # expect 13 experts
ls .claude/skills                  # expect BMad skills + ours
ls _bmad 2>/dev/null || echo "BMad not installed — run: npx bmad-method install"
cat components.json 2>/dev/null | head -20 || echo "shadcn not initialised"
pnpm dlx shadcn@latest info
```

Then verify:

- `claude plugin validate .claude/agents` parses every agent file.
- Each hook script is executable and exits 0 on a benign input:
  `echo '{"tool_input":{"command":"pnpm test"}}' | bash .claude/hooks/guard-bash.sh; echo $?`
- Each hook script blocks on a hostile input:
  `echo '{"tool_input":{"command":"npm install x"}}' | bash .claude/hooks/guard-bash.sh; echo $?`
  (expect 2)
- **The Bash bypass is closed.** A path rule that only covers the Edit tool is not a rule.
  Each of these must exit 2 — run them, do not assume:
  - `cat > .claude/settings.json <<EOF`
  - `sed -i '' 's/a/b/' tsconfig.json`
  - `cp /tmp/x components/ui/button.tsx`
  - `tee -a .github/workflows/quality-gate.yml`
  - `python3 -c "open('.claude/settings.json','w')"`
  - `git worktree add -b x ../y` (streams must be registered, see 95-parallel-streams.md)
    And each of these must exit 0 — a false positive is worse than a missing rule:
  - `cat > lib/domain/tva.ts <<EOF`
  - `pnpm test 2> /dev/null`
  - `pnpm dlx shadcn@latest add badge`
- **The stdin escape is closed** (ADR-0004, amendment b). An interpreter reads its program
  from a flag _or_ from stdin; both are unparseable. Each of these must exit 2, with a
  protected path such as `docs/standards/10-architecture.md` named anywhere in the command:
  - `python3 - <<'P'` … `P` (bare `-` operand)
  - `python3 <<'P'` … `P` (heredoc, no operand)
  - `python3 <<< '…'` (herestring)
  - `python3 < /tmp/w.py` (redirect)
  - `cat /tmp/w.py | python3 -` and `cat /tmp/w.py | python3` (pipe tail)
    And each of these must exit 0 — the program is a file the path guards already see, and
    whatever is on stdin is data:
  - `node scripts/check-spec.mjs docs/standards/10-architecture.md`
  - `cat docs/standards/10-architecture.md | node scripts/check-spec.mjs`
  - `python3 <<'P'` … `P` with **no** protected path named
- `pnpm verify:fast` runs and the scripts it references exist in `package.json`.

Report a table of `check | result | fix`. Never report a green check you did not run.
