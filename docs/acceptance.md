# Acceptance checklist: user stories → app → tests

Owner: #2 Product Manager · Report Sections 5.4 and 6.5. One row per user story in the PRD (Table 17).

**How each story was checked**
- **Unit**: `src/domain/*.test.ts` (pure business rules).
- **Flow**: `src/store/flows.test.ts` (end to end through the app store, using the Sarah/Ben/Marcus seed).
- **Browser**: clicked through in Chromium on 16 Nov 2026 against `npm run dev`: consent sheet, approval rules, claim, mock QR scan, card import sheet, settle everything, failed payment, contact consent and search, inbox, manual entry with SC/GST off, metrics, privacy. No console errors.

Run `npm test` to re-check every Unit and Flow row (75 tests).

| Story | Priority | Where in the app | Checked by | Status |
|---|---|---|---|---|
| US-01 Create a group | M | A2 Create group | Flow: *refuses non-DBS invitees*; Browser: non-DBS contact shown but not selectable | Pass |
| US-02 Consent to join | M | Dashboard invitations (Accept / Decline) | Flow: *US-02: consent to join* (pending kept out of splits and vaults; decline removes) | Pass |
| US-03 See my position | M | A Dashboard, A1 Group | Flow: balances after each action; Browser | Pass |
| US-04 Scan a receipt | M | B Add expense → C | Unit: *reconcile with the receipt total*; Browser: manual entry without a photo | Pass (OCR is a mock; real model optional) |
| US-05 Assign receipt items | M | C Who had what? | Unit: *US-05* (shared item, unassigned blocks save); Browser: "Everyone" button | Pass |
| US-06 SC and GST shared fairly | M | C (SC/GST switches) | Unit: *$100 → $119.90*, proportional charges, hawker receipts | Pass |
| US-07 Import a card transaction | M | B card list → confirm sheet | Flow: *blocks a duplicate card import*; Browser: confirm sheet, choose who's included | Pass |
| US-08 Net debt minimisation | M | D Settle up | Unit: chain collapse, ≤ n − 1 (randomised), 20 × 200 under 1 s | Pass |
| US-09 Create a vault | M | E Create a vault | Unit: *creates an open vault with the organiser as admin* | Pass |
| US-10 Reserve my share | M | E Reserve → one-time debit consent sheet | Unit: *holds nothing when funds are insufficient*; Flow: *needs the one-time debit authorisation*; Browser | Pass |
| US-11 Track drawdowns live | M | E Activity | Unit: pro-rata draws ($200/$100 carry $60/$30) | Pass |
| US-12 Tiered approvals | M | E1 tier preview, E approvals, E rules editor | Unit: tiers, 24 h expiry, editing tiers, strict mode; Flow: only admin edits, all notified; Browser | Pass |
| US-13 Instant alerts | M | Inbox, toast, E running-low banner | Unit: *one running-low alert below 20%*; Browser: toast | Pass (in-app; real push needs the DBS app) |
| US-14 Close and release | S | E Close vault; inactivity banner + Keep open | Unit: release on close, inactivity rules; Flow: notice → extend → auto-release | Pass |
| US-15 Settle in one tap | M | D → D1 | Flow: *Marcus pays Sarah in one tap*, *fails cleanly: 'You were not charged'*; Browser: masked names, first-time payee warning, reference | Pass |
| US-16 Choose source of funds | M | D1 source picker | Flow: PayLah! shortfall fails cleanly; Browser: shortfall banner | Pass |
| US-17 Settle everything at once | S | D "Settle everything" → D1 | Flow: *US-17* (all paid with references; one fails, other completes); Browser | Pass |
| US-18 Keep my banking data private | M | Privacy screen (shield icon on dashboard) | Flow: marketing opt-in off by default and separate from feature consent; Browser | Pass |
| US-19 Friendly reminders | S | Inbox (Settle button), A1 switch | Unit: 48 h / 3 days / max 3; Flow: *sends app reminders after 48 hours, never more than three* | Pass |
| US-20 Pay from vault | M | E1 Pay a merchant (mock QR scanner) | Unit: Flow 3 end to end, 12 h cooling-off; Browser: scan fills merchant and amount | Pass |
| US-21 Claim from vault | S | E1 Claim back a card payment | Flow: *US-21* (claimant repaid pro rata incl. own reserve); Browser | Pass |

## Known limits (by design for the MVP)

- No real money moves and no live DBS, PayNow or push APIs are called (PRD non-goal). Every screen shows "Demo — no real money moved".
- Receipt OCR uses demo receipts (`services/receiptParser.ts`); a real model can be added behind the same interface.
- Usability results (task success, time to settle, SUS) are not in yet: see [usability.md](usability.md).
