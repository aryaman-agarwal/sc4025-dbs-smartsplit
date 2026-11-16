# Usability test plan and results

Owner: #3 Discovery Lead · Report Section 6.5 · PRD targets (Section 5.2): task success ≥ 80 %, median time to settle < 2 min, SUS ≥ 70.

> **Status: not run yet.** The results tables below are empty on purpose. Fill them in from real sessions only.

## Setup

- 5–8 participants from the launch segment (Singapore university students who split costs at least monthly). Record year of study and how often they split; no names.
- Run on the deployed build or `npm run dev`. Click **Reset** in the demo bar before each session.
- Think-aloud. The facilitator doesn't help unless the participant is stuck for 60 seconds (that task counts as a fail).
- Time each task from the first tap to the success state.

## Tasks

| # | Task (read to participant) | Start | Success state | Stories |
|---|---|---|---|---|
| T1 | "You're Amy. Split the seafood dinner receipt: Ben and Cal shared the fries, everything else is yours." | Viewing as Amy, dashboard | Expense saved; Bali Trip balances update | US-04–06 |
| T2 | "You're Cal. Pay back whoever you owe for the Bali trip." | Viewing as Cal, dashboard | "Paid" receipt with reference | US-08, US-15–16 |
| T3 | "You're Amy. Set up a $1,500 trip fund for Bali and put in your $500." | Viewing as Amy, Bali Trip | Vault shows $500 reserved | US-09–10 |
| T4 | "You're Ben. Pay the boat tour ($150) from the trip fund." | Viewing as Ben, after T3 with Ben and Cal reserved | Request sent for approval | US-12, US-20 |
| T5 | "You're Cal. Ben's asked to pay for something from the fund. Deal with it." | Viewing as Cal | Spend approved and executed | US-11–13 |

Time to settle (PRD 5.2) = T1 start to T2 success for the same participant, if run back to back.

## SUS questionnaire

Ask after all tasks, 1 (strongly disagree) to 5 (strongly agree) (Brooke, 1996):

1. I think that I would like to use this feature frequently.
2. I found it unnecessarily complex.
3. I thought it was easy to use.
4. I think that I would need the support of a technical person to be able to use it.
5. I found the various functions well integrated.
6. I thought there was too much inconsistency.
7. I would imagine that most people would learn to use it very quickly.
8. I found it very cumbersome to use.
9. I felt very confident using it.
10. I needed to learn a lot of things before I could get going with it.

Score: odd items (score − 1), even items (5 − score), sum × 2.5.

## Results (to fill in)

| Participant | Profile | T1 | T2 | T3 | T4 | T5 | Time to settle | SUS |
|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | |
| P2 | | | | | | | | |
| P3 | | | | | | | | |
| P4 | | | | | | | | |
| P5 | | | | | | | | |

Mark each task ✓ (unaided), A (assisted, counts as fail) or ✗. Record time in seconds.

| Measure | Target | Result |
|---|---|---|
| Task success (unaided, all tasks) | ≥ 80 % | |
| Median time to settle | < 2 min | |
| Mean SUS | ≥ 70 | |

## Issues found

| # | Issue | Participants affected | Severity (1–4) | Fix / commit |
|---|---|---|---|---|
| | | | | |
