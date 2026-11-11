# DBS SmartSplit & GroupVault — Functional MVP

SC4025 Digital Product Management · Group Project · [Group number]

A clickable, working prototype of SmartSplit & GroupVault: split a bill, settle it in one tap, and pool money for a trip without anyone holding anyone else's money — all inside a digibank / PayLah!-style app.

> **Demo only — no real money moves.** PayNow, card data, digital token and OCR are simulated. This project is not affiliated with DBS Bank.

## Run it

Needs Node.js 20 or later.

```bash
npm install
npm run dev        # open the URL it prints (usually http://localhost:5173)
npm test           # unit + flow tests
npm run build      # production build in dist/
```

## What works today

| Flow (PRD 5.6) | Screens | Stories |
|---|---|---|
| 1. Split a bill: scan a demo receipt, tap who had what, SC + GST shared in proportion; or import a DBS card charge and split equally | B → C | US-04 to US-07 |
| 2. Settle up: fewest payments (≤ n − 1), masked name, first-time payee warning, choose PayLah! or bank, simulated digital token | D → D1 | US-08, US-15, US-16 |
| 3. Pre-fund a trip: create a vault, each member reserves in their own account, tiered approvals, pro-rata drawdown, close and release | E → E1 | US-09 to US-14, US-20 |
| Groups, invites, dashboard, app-sent reminders, notifications | A, Inbox | US-01 to US-03, US-19 |

Purple **TODO** panels on each screen list what's left for its owner. Delete a panel once that work is done.

### Demo controls (above the phone)

- **Viewing as** — switch between Amy, Ben, Cal and Dee to show both sides of a payment or an approval.
- **+24h** — move the demo clock forward to trigger reminders (48 h), approval expiry (24 h) and the new-member cooling-off (12 h).
- **Reset** — restore the seed data. State is saved in the browser between refreshes.

### Video script (matches the report's demo data)

1. *Viewing as Cal.* Bali Trip 2026 → **You owe $130.00**. Settle up → "4 debts → 2 payments" → Pay Amy → first-time payee warning → Approve → Settled.
2. Add → *Seafood dinner* receipt → tap avatars → SC and GST shared → Save. Show *Smudged receipt* to demo the mismatch block.
3. *Viewing as Amy.* Vault → Create "Bali Trip 2026", $1,500 → reserve $500. Switch to Ben and Cal and reserve $500 each.
4. *Viewing as Ben.* Pay or claim → Bali Blue Boat Tours $150 → "medium spend, needs 1 approval" → Send.
5. *Viewing as Cal.* Approve → $50 drawn from each reserve, everyone alerted.
6. *Viewing as Amy.* Close vault → $450 released to each member.

## Architecture

```
src/
  domain/        Pure business logic, no React. Fully unit-tested.
    money.ts         Integer cents, formatting, proportional and equal splits
    receiptSplit.ts  Item assignment, service charge + GST, reconciliation   (US-04–06)
    settlement.ts    Net balances + greedy debt simplification, ≤ n − 1     (US-08)
    vault.ts         Reserve, approval tiers, pro-rata draw, expiry, close  (US-09–14, 20, 21)
    reminders.ts     48 h / every 3 days / max 3 reminder rule              (US-19)
    config.ts        All business rules and limits in one place
    types.ts         Data model
  services/      Simulated external systems (swap for real ones later)
    receiptParser.ts ReceiptParser interface + MockReceiptParser
    payNow.ts        Simulated PayNow rail (latency, failure rate)
  data/          Seed data (Amy, Ben, Cal, Dee, Eve) and demo receipts
  store/         Zustand store wiring domain logic to the UI; selectors; flow tests
  components/    Phone frame, demo toolbar, shared UI kit (Button, Card, Money, …)
  screens/       One file per screen; letters match PRD Table 20
```

**Key design choices (report Section 6):**

- **Money in integer cents** everywhere (PRD 5.7). Shares always sum exactly to the bill; the rounding gap goes to the largest share (US-06).
- **Greedy netting** matches the largest creditor with the largest debtor. Each transfer zeroes at least one person, so a group of *n* never needs more than *n − 1* payments. The true minimum is NP-hard (Verhoeff, 2004). Tested on 20 members × 200 expenses in well under 1 second.
- **Earmarked vault model.** Reserving moves money from *available* to *reserved* inside the member's own account; a spend draws from every reserve pro rata; closing releases what's left. The vault never holds a pooled balance.
- **Approval tiers** (US-12): < $50 instant; $50–$300 one other member; > $300 or > 25 % of the vault a majority; optional strict mode. Large is checked before small. Requests expire after 24 h; new members wait 12 h.
- **Pluggable OCR.** Screens call the `ReceiptParser` interface. The mock returns demo receipts; a real model (vision LLM, Donut, LayoutLM) can be added as a new class without touching the UI.
- **Scam-aware settlement.** Masked payee names, no phone or account field, first-time payee warning, reminders only in-app with no external links.

## Tests

`npm test` runs 52 tests:

- `domain/*.test.ts` — every acceptance-criterion example from the PRD (e.g. $100 → $119.90; A→B→C chain collapses to one payment; $200/$100 reserves carry $60/$30 of a $90 spend), a randomised n − 1 property test, and the 20 × 200 performance test.
- `store/flows.test.ts` — Flows 1–3 end to end through the store, plus reminder rate limits.

## Team workflow

See [TASKS.md](TASKS.md) for who owns what. Short version:

1. Branch per task: `git checkout -b feat/c-assigner-sc-toggle`
2. Small commits with clear messages: `feat(C): toggle service charge off for hawker receipts (US-06)`
3. Push and open a pull request; another member reviews and merges.
4. Run `npm test` before pushing. CI runs tests and a build on every PR.
