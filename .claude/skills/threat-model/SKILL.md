---
name: threat-model
description: Produce a short STRIDE threat model for a feature before it is built. Use when a story touches auth, permissions, personal data, uploads, payments or external integrations.
disable-model-invocation: false
---

# Threat model

Feature: $ARGUMENTS

Delegate to `security-architect` and require this exact shape, in under 400 words:

1. **Assets** — what an attacker actually wants here (another company's prices, employee
   geolocation, the ability to alter an issued invoice).
2. **Entry points** — every route, action, webhook, upload and background job the feature adds.
3. **Trust boundaries** — where data crosses from untrusted to trusted, and what validates it.
4. **Top threats** — the five most exploitable, in STRIDE terms, ranked by
   exploitability × impact. Skip the theatrical ones.
5. **Controls** — one per threat, specific to this codebase, not a principle.
6. **Tests** — the test that proves each control, named and assigned to `test-engineer`.
7. **Accepted risks** — what we are consciously not mitigating, and who accepts it.

Append the result to `docs/standards/30-security.md` under the feature's name, and record it
in `security-architect`'s project memory.
