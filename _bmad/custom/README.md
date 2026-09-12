# BMad customisation

BMad v6 lets you override any installed skill or agent without editing the installed files:
overrides live under `_bmad/custom/` as TOML, and the `bmad-customize` skill writes and
verifies them for you. **Do not hand-write the TOML** — the schema belongs to BMad and it
changes; describe the change in plain language and let `bmad-customize` produce it.

Run these four, once, right after `npx bmad-method install`. Copy the text verbatim.

---

**1 — Make the spec skill enforce our standards**

```
bmad-customize

Customise bmad-spec for this project. Every spec it produces must additionally contain:
(a) the tenant-isolation impact, (b) the authorisation predicate per new operation,
(c) the performance budget for any new list or page, (d) which French BTP rules from
docs/domain/btp-rules.md apply and whether each is CONFIRMED, and (e) an explicit
"out of scope" section. A spec missing any of these is incomplete and must not be handed
to build.
```

**2 — Make the build skill route to our experts**

```
bmad-customize

Customise bmad-build for this project. Before implementing, it must delegate the design
pass to the project subagents listed in CLAUDE.md: btp-domain-expert for any domain
concept, security-architect for anything touching auth, permissions, personal data,
uploads or money, data-modeler for anything persisted, api-architect for the server
contract, and design-system-guardian for any UI. After implementing, it must run
code-reviewer, security-reviewer, and accessibility-auditor when UI changed, and resolve
every BLOCKING finding before reporting done. It must never hand-edit components/ui/**.
```

**3 — Add our lenses to the review skill**

```
bmad-customize

Add three review lenses to bmad-review for this project: a "design system" lens checking
shadcn token compliance and registry-component usage, a "tenancy" lens checking that every
data access is org-scoped from the session with a negative test, and a "BTP domain" lens
checking that every business rule used appears as CONFIRMED in docs/domain/btp-rules.md.
```

**4 — Make the architecture skill start from our baseline**

```
bmad-customize

Customise bmad-architecture to read docs/standards/10-architecture.md as the existing
baseline and to record every deviation as an ADR in docs/adr/ using the template in
docs/adr/0000-template.md.
```

---

## Verify

After each one, `bmad-customize` reports the merged result. Read it. Then run a throwaway
`bmad-spec` on a small change and check the extra sections actually appear. An override that
was written but never triggered is worse than no override — it creates false confidence.
