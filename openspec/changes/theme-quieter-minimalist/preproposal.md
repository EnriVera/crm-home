# Pre-proposal state — theme-quieter-minimalist

> Orchestrator-owned gate state. Phase explore: done.

## Product decisions — CONFIRMED by product owner (2026-09-10)

1. **Research lane**: UNSELECTED — no sdd-research (no evidence capability; explore covered repo+user facts).
2. **Skill in use**: impeccable `quieter` mode (Operate) — neutral dominance + 10% rule (color as accent).
3. **Closed list of green uses**: ONLY primary CTA button (fill), active nav state, focus ring, success state indicators, inline links.
4. **No green anywhere else**: backgrounds, borders, secondary text, inactive icons, headings, generic badges, ghost buttons, nav-group headers, OTP caret, skip-link fill.
5. **Dark theme palette**: PURE neutrals (no green tint). User-verbatim: bg `#0a0a0a`, surface `#141414`, border `#262626`, text-primary `#fafafa`, text-secondary `#a3a3a3`.
6. **Light theme palette**: pure neutrals (white bg, near-black text, near-black border, gray secondary text). Specific values to be picked in design phase.
7. **Audit included**: parent decision — produce per-file counts of `*-primary` usage; explore already did it.

## Audit findings (from explore)

- 5 files contain green: tokens.css (palette), button.tsrx, skip-link.tsrx, status-message.tsrx, nav-item.tsrx, nav-group.tsrx, otp-input.tsrx (4 over-uses to fix).
- 4 closed-list violations: ghost button text, nav-group header when active, OTP caret, skip-link focus fill.
- 5 DESIGN.md contradictions: §1 (missing "links inline" as canonical), §2.2 (dark tints), §2.3 (over-permissive text contrast), §6 (ghost button green), §8 (missing bans).
- Estimated: ~80–120 lines changed (1 PR, well under 400 budget).

## Design flags for sdd-design (not blocking proposal)

- D1: Exact light theme palette values (proposal mentions neutral-900/500/200; design will pin exact hex).
- D2: Discoverability tradeoff for skip-link without green fill (focus:bg-text-primary + focus:text-background + green focus ring).
- D3: Hierarchy for nav-group "Finance" header when a child is active — weight instead of color (text-text-primary + font-medium).
- D4: Caret-color browser support caveat (documented, no action needed).
- D5: Tests asserting token values (explore says none — confirm in apply).

## Risks carried

- Visual character preservation: 10% rule + Operate frame → accent stays, neutrals gain depth.
- DESIGN.md rewrite ≠ world replacement: only the prose that contradicts the world gets corrected.
- Snapshot/golden visual tests (if any) may need updating; explore found none.
