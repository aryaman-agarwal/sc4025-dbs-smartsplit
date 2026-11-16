import { useMemo } from "react";
import { Banner, Card, Screen, SectionTitle } from "../components/ui";
import { computeMetrics } from "../domain/metrics";
import { useAppStore } from "../store/useAppStore";

/**
 * Product metrics for the demo (report Section 4.5): North Star, leading and
 * lagging indicators, derived from everything that has happened in this demo.
 * Not part of the customer app; opened from the demo bar.
 */
export function Metrics() {
  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const spends = useAppStore((s) => s.spends);
  const notifications = useAppStore((s) => s.notifications);
  const now = useAppStore((s) => s.now);
  const clock = useAppStore((s) => s.clockOffsetHours);

  const m = useMemo(
    () => computeMetrics({ now: now(), expenses, payments, spends, notifications }),
    [expenses, payments, spends, notifications, clock],
  );
  const max = Math.max(1, ...m.weeks.map((w) => w.settledSplits));
  const pct = (a: number, b: number) => (b === 0 ? "—" : `${Math.round((a / b) * 100)}%`);

  return (
    <Screen title="Metrics" back="/">
      <Banner>Demo data only. Counts update as you use the app.</Banner>

      <SectionTitle>North Star · weekly settled splits</SectionTitle>
      <Card className="flex flex-col gap-2">
        {[...m.weeks].reverse().map((w) => (
          <div key={w.label} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 text-xs text-muted">{w.label}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(w.settledSplits / max) * 100}%` }} />
            </span>
            <span className="w-6 text-right font-semibold tabular-nums">{w.settledSplits}</span>
          </div>
        ))}
        <p className="text-xs text-muted">Counted as successful in-app settlement payments.</p>
      </Card>

      <SectionTitle>Leading indicators · this week</SectionTitle>
      <Card className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Expenses added" value={m.weeks[0].expensesAdded.receipt + m.weeks[0].expensesAdded.card + m.weeks[0].expensesAdded.manual} />
        <Stat
          label="By receipt / card / hand"
          value={`${m.weeks[0].expensesAdded.receipt} / ${m.weeks[0].expensesAdded.card} / ${m.weeks[0].expensesAdded.manual}`}
        />
        <Stat label="Reminders → paid in 48 h" value={pct(m.reminders.paidWithin48h, m.reminders.sent)} hint={`${m.reminders.paidWithin48h} of ${m.reminders.sent}`} />
        <Stat label="Vault spends executed" value={m.weeks[0].vaultSpendsExecuted} />
      </Card>

      <SectionTitle>Lagging indicators · all time</SectionTitle>
      <Card className="grid grid-cols-2 gap-3 text-sm">
        <Stat
          label="Median time to settle"
          value={m.medianHoursToSettle === undefined ? "—" : m.medianHoursToSettle < 48 ? `${Math.round(m.medianHoursToSettle)} h` : `${(m.medianHoursToSettle / 24).toFixed(1)} days`}
          hint="Target under 24 h (O1)"
        />
        <Stat
          label="Debts settled in-app ≤ 7 days"
          value={pct(m.settledWithin7Days.settled, m.settledWithin7Days.total)}
          hint={`${m.settledWithin7Days.settled} of ${m.settledWithin7Days.total} · target ≥ 50%`}
        />
      </Card>
    </Screen>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
