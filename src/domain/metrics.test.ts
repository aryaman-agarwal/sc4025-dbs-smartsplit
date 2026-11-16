import { describe, expect, it } from "vitest";
import { REMINDER_TITLE, computeMetrics } from "./metrics";
import type { Expense, Notification, Payment } from "./types";

const NOW = "2026-11-16T12:00:00Z";
const ago = (h: number) => new Date(Date.parse(NOW) - h * 3_600_000).toISOString();

const expense = (id: string, hoursAgo: number, source: Expense["source"] = "receipt"): Expense => ({
  id,
  groupId: "g",
  title: id,
  payerId: "sarah",
  totalCents: 3000,
  shares: { sarah: 1000, ben: 1000, marcus: 1000 },
  source,
  createdAt: ago(hoursAgo),
});
const payment = (fromId: string, hoursAgo: number, status: Payment["status"] = "success"): Payment => ({
  id: `${fromId}${hoursAgo}`,
  groupId: "g",
  fromId,
  toId: "sarah",
  amountCents: 1000,
  status,
  source: "bank",
  createdAt: ago(hoursAgo),
});
const reminder = (toId: string, hoursAgo: number): Notification => ({
  id: `r${toId}${hoursAgo}`,
  toId,
  title: REMINDER_TITLE,
  body: "",
  route: "/groups/g/settle",
  createdAt: ago(hoursAgo),
  read: false,
});

describe("computeMetrics", () => {
  it("counts settled splits (North Star) and added expenses per rolling week", () => {
    const m = computeMetrics({
      now: NOW,
      expenses: [expense("a", 10), expense("b", 30, "card"), expense("c", 200, "manual"), expense("v", 5, "vault")],
      payments: [payment("ben", 2), payment("marcus", 3), payment("marcus", 190), payment("ben", 1, "failed")],
      spends: [],
      notifications: [],
    });
    expect(m.weeks[0]).toMatchObject({ label: "This week", settledSplits: 2, failedPayments: 1, expensesAdded: { receipt: 1, card: 1, manual: 0 } });
    expect(m.weeks[1]).toMatchObject({ settledSplits: 1, expensesAdded: { receipt: 0, card: 0, manual: 1 } });
  });

  it("measures reminder-to-payment conversion within 48 hours", () => {
    const m = computeMetrics({
      now: NOW,
      expenses: [],
      payments: [payment("ben", 40)], // 20 h after Ben's reminder
      spends: [],
      notifications: [reminder("ben", 60), reminder("marcus", 60)],
    });
    expect(m.reminders).toEqual({ sent: 2, paidWithin48h: 1 });
  });

  it("reports median time to settle and the share settled within 7 days", () => {
    const m = computeMetrics({
      now: NOW,
      expenses: [expense("a", 100)],
      payments: [payment("ben", 90), payment("marcus", 80)], // 10 h and 20 h later
      spends: [],
      notifications: [],
    });
    expect(m.medianHoursToSettle).toBe(15);
    expect(m.settledWithin7Days).toEqual({ settled: 2, total: 2 });
  });
});
