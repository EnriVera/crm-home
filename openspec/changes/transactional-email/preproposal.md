# Pre-proposal state — transactional-email

> Orchestrator-owned gate state (not a native status field). Phase explore: done.

## Product decisions — CONFIRMED by product owner (2026-09-09)

1. **Research lane**: UNSELECTED — no sdd-research (no evidence capability; explore covered repo+npm facts).
2. **Templates location**: NEW shared package `packages/email`.
3. **Adapter chain**: auto-switch by env — SMTP (Mailpit) when SMTP config present, console adapter otherwise.
4. **Dev SMTP**: Mailpit service in docker-compose (SMTP :1025, web UI :8025).
5. **First template**: OTP auth email.

## Design flags for sdd-design (from explore, not blocking proposal)

- D1: .tsrx consumption under nitro v3 — `octane/compiler/register` at runtime vs precompiled/exported HTML (early spike recommended in apply).
- D2: npm verification of @octanejs/email@0.0.3 + @octanejs/email-cli vs octane@0.2.3 peer deps (BLOCKING per workspace spec before committing package.json).
- D3: EmailSender port signature `send({from,to,subject,body})` is fixed by canonical api-auth req 7 — adding html support requires MODIFIED delta.
- D4: render at enqueue-time via new renderer port injected into RequestOtp (email_sending stores composed body only).
- D5: SMTP client lib — nodemailer candidate (pure JS); smoke test under bun 1.4/nitro v3.
- D6: adapter selection plugs into the nitro drain task (builds its own sender outside composition root).

## Risks carried

- size near/over 400-line budget → ask-on-risk delivery decision at tasks/apply.
- Canonical api-auth req 7 touch (MODIFIED delta).
- Bindings are beta (0.0.3) — ReactCompat fallback if they fail.
