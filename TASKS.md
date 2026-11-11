# Prototype task split

The brief says commit history will be checked for a fair workload. Every member owns one screen area **and** one cross-cutting task, works on their own branch, and commits their own changes. Owner numbers match page 1 of the report.

## Day 0 — set up the repo (#1, 30 min)

1. #1 creates a GitHub repo (`smartsplit-groupvault`), unzips this scaffold, and pushes it as the first commit:
   ```bash
   git init && git add . && git commit -m "chore: scaffold app, domain logic and tests"
   git branch -M main && git remote add origin <repo-url> && git push -u origin main
   ```
2. Add everyone as collaborators. Turn on branch protection for `main` (require 1 review + passing CI).
3. Everyone clones, runs `npm install && npm run dev`, and checks the three demo flows work.
4. Each member makes sure `git config user.name` / `user.email` match their GitHub account, or their commits won't be attributed to them.

## Who owns what

### #1 MVP Engineer & UI — Settlement (D, D1), shell, release
Branch prefix `feat/d-` · Report Section 6
- [ ] US-17 *Settle everything*: one confirmation and one authentication when I owe several people (`store.settleAll` is ready); flag a failed payment while the others complete
- [ ] D1 progress and receipt state (reference number, time), failure demo via `demoSettings.failureRate`
- [ ] Animate "6 debts → 2 payments" on screen D for the video
- [ ] Deploy to GitHub Pages or Vercel; put the live link in the README and report
- [ ] Write Section 6.1–6.3 and 6.6 from README "Architecture" and "Key design choices"

### #2 Product Manager — Dashboard (A), groups, inbox, acceptance testing
Branch prefix `feat/a-` · Report Sections 5 and 6.5
- [ ] A2 Create group: contact-sync consent sheet (Section 7.5), search, disable non-DBS contacts with an explanation (US-01, US-02)
- [ ] Inbox: group by day, inline "Settle" on reminders, toast for new notifications (US-13, US-19)
- [ ] `docs/acceptance.md`: one row per user story (US-01–21) → where it is in the app → which test covers it → pass/fail
- [ ] Add missing store tests for any story without one (e.g. US-02 decline returns shares to payer)

### #3 Discovery Lead — Add expense (B), usability testing
Branch prefix `feat/b-` · Report Sections 3 and 6.5
- [ ] Camera viewfinder UI with framing guide; manual-entry button without a photo (US-04)
- [ ] Card import: confirm sheet + choose who's included before an equal split (US-07)
- [ ] Run 5–8 usability tests on the three flows; record task success, time-to-settle and SUS (PRD targets: ≥ 80 %, < 2 min, SUS ≥ 70)
- [ ] Commit the test script and anonymised results as `docs/usability.md`

### #4 Strategy & Research Lead — Itemised assigner (C), OCR, metrics
Branch prefix `feat/c-` · Report Sections 2 and 4
- [ ] US-06: toggle service charge / GST off for hawker receipts (`computeReceiptSplit` already accepts rates)
- [ ] "Split equally among everyone" per item; show each person's items in the summary
- [ ] Optional: a real OCR parser class in `services/receiptParser.ts` (vision LLM or Tesseract.js) behind the existing interface; cite Xu et al. 2020 / Kim et al. 2022
- [ ] Analytics event log (`services/analytics.ts`) for the North Star and HEART metrics: `expense_added`, `debt_settled`, `vault_reserved`, `spend_approved`; a small metrics view showing weekly settled splits

### #5 GTM & Governance Lead — GroupVault (E, E1), privacy and consent
Branch prefix `feat/e-` · Report Section 7
- [ ] One-time debit-authorisation consent sheet before a member's first reservation (replaces the checkbox; Section 7.3)
- [ ] E1 *Claim back a card payment* tab: amount + receipt → `requestSpend({ kind: "claim" })` (US-21)
- [ ] Edit approval tiers and strict mode, with all members notified (US-12)
- [ ] "Running low" and inactivity banners (US-13, US-14); cooling-off message (US-20)
- [ ] Marketing opt-in toggle separate from feature consent (US-18); receipt-retention note in settings

## Everyone

- [ ] Replace the purple TODO panel on your screen once done
- [ ] Match your screens to the team Figma file (same colours and components from `components/ui.tsx`)
- [ ] Take annotated screenshots of your screens for report Section 6.4, labelled with story numbers
- [ ] Present your part in the video and demo it live

## Suggested timeline

| When | Milestone |
|---|---|
| Day 1 | Repo live, everyone has run it and pushed one small change |
| Days 2–5 | Screen tasks on branches, PRs reviewed by another member |
| Day 6 | Usability tests (#3) on the integrated build; fix top issues |
| Day 7 | Freeze: deploy, screenshots for Section 6, record demo |

## Commit message style

`type(area): what changed (story)` — for example:

```
feat(E): one-time debit consent sheet before first reservation (US-10)
fix(C): block save when an item price is $0 (US-05)
test(store): decline invite returns share to payer (US-02)
docs: usability results, 6 participants, SUS 74
```
