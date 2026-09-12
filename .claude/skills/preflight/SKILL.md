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
- `pnpm verify:fast` runs and the scripts it references exist in `package.json`.

Report a table of `check | result | fix`. Never report a green check you did not run.
