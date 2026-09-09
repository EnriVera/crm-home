# Pre-proposal state — backend-auth

> Orchestrator-owned gate state (not a native status field). Phase explore: done.

## Product decisions — CONFIRMED by product owner (2026-09-08)

1. **Research lane**: UNSELECTED — skip sdd-research, go straight to proposal.
2. **Email provider**: `EmailSender` port + console/log adapter in dev; real provider plugs in later without touching domain.
3. **Seed user default currency**: ARS.

## Open design flags (for sdd-design, not blocking proposal)

- Migration tooling (none exists; first migration mechanism).
- RPC client in web (none exists; verifier adapter must capture `?email=`).
- Login-form `requestOtp` wiring.
- Token hashing, verification timing, cookie secure/sameSite on local http.
- Test strategy against postgres (docker-compose exists).

## Risks carried from explore

- size: likely >400 changed lines → ask-on-risk delivery decision at tasks/apply.
- baseline: web-auth-ui canonical spec requires OtpVerifier port/Verdict contract and UI intact.
