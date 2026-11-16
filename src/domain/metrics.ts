import type { Expense, ISODate, Notification, Payment, VaultSpend } from "./types";

/**
 * Product metrics (report Section 4.5), derived from what the app already
 * records so they always match the demo state.
 *
 * North Star: weekly settled splits. The MVP counts a settled split as a
 * successful in-app settlement payment. Netting merges several expenses into
 * one payment, so this is a proxy for "group expenses fully settled"; a
 * production build would attribute each payment back to the expenses it clears.
 */

const DAY = 86_400_000;
export const REMINDER_TITLE = "Friendly reminder from DBS";

export interface MetricsInput {
  now: ISODate;
  expenses: Expense[];
  payments: Payment[];
  spends: VaultSpend[];
  notifications: Notification[];
}

export interface WeekMetrics {
  /** "This week", "1 week ago", … (rolling 7-day windows ending now). */
  label: string;
  start: ISODate;
  end: ISODate;
  settledSplits: number;
  expensesAdded: { receipt: number; card: number; manual: number };
  vaultSpendsExecuted: number;
  failedPayments: number;
}

export interface MetricsSummary {
  weeks: WeekMetrics[];
  /** Leading indicator (Table 9): reminders followed by a payment from that person in that group within 48 hours. */
  reminders: { sent: number; paidWithin48h: number };
  /** Lagging indicator (Table 9): median hours from expense to the payer's next in-app settlement, where one exists. */
  medianHoursToSettle?: number;
  /** HEART adoption/engagement inputs: share of debts settled in-app within 7 days. */
  settledWithin7Days: { settled: number; total: number };
}

const inRange = (iso: string, start: number, end: number) => {
  const t = Date.parse(iso);
  return t > start && t <= end;
};

const groupFromRoute = (route?: string) => route?.match(/^\/groups\/([^/]+)\/settle$/)?.[1];

function median(xs: number[]): number | undefined {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeMetrics(input: MetricsInput, weekCount = 4): MetricsSummary {
  const now = Date.parse(input.now);
  const ok = input.payments.filter((p) => p.status === "success");

  const weeks: WeekMetrics[] = [];
  for (let w = 0; w < weekCount; w++) {
    const end = now - w * 7 * DAY;
    const start = end - 7 * DAY;
    const added = input.expenses.filter((e) => e.source !== "vault" && inRange(e.createdAt, start, end));
    weeks.push({
      label: w === 0 ? "This week" : `${w} week${w > 1 ? "s" : ""} ago`,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      settledSplits: ok.filter((p) => inRange(p.createdAt, start, end)).length,
      expensesAdded: {
        receipt: added.filter((e) => e.source === "receipt").length,
        card: added.filter((e) => e.source === "card").length,
        manual: added.filter((e) => e.source === "manual").length,
      },
      vaultSpendsExecuted: input.spends.filter((s) => s.status === "executed" && inRange(s.createdAt, start, end)).length,
      failedPayments: input.payments.filter((p) => p.status === "failed" && inRange(p.createdAt, start, end)).length,
    });
  }

  const reminders = input.notifications.filter((n) => n.title === REMINDER_TITLE);
  const paidWithin48h = reminders.filter((n) => {
    const groupId = groupFromRoute(n.route);
    const t = Date.parse(n.createdAt);
    return ok.some((p) => p.fromId === n.toId && p.groupId === groupId && Date.parse(p.createdAt) >= t && Date.parse(p.createdAt) - t <= 2 * DAY);
  }).length;

  // For each member's share of each (non-vault) expense they didn't pay, find their next payment in that group.
  const debts = input.expenses
    .filter((e) => e.source !== "vault")
    .flatMap((e) => Object.entries(e.shares).filter(([id, c]) => id !== e.payerId && c > 0).map(([id]) => ({ id, groupId: e.groupId, at: Date.parse(e.createdAt) })));
  const lags = debts
    .map((d) => {
      const next = ok.filter((p) => p.fromId === d.id && p.groupId === d.groupId && Date.parse(p.createdAt) >= d.at).map((p) => Date.parse(p.createdAt)).sort((a, b) => a - b)[0];
      return next === undefined ? undefined : (next - d.at) / 3_600_000;
    })
    .filter((x): x is number => x !== undefined);

  return {
    weeks,
    reminders: { sent: reminders.length, paidWithin48h },
    medianHoursToSettle: median(lags),
    settledWithin7Days: { settled: lags.filter((h) => h <= 7 * 24).length, total: debts.length },
  };
}
