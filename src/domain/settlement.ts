import type { Cents, Expense, MemberId, Payment, Transfer } from "./types";

/**
 * Net position of each member in a group.
 * Positive = the group owes them ("You are owed"); negative = they owe ("You owe").
 * Balances always sum to zero.
 *
 * Vault-funded expenses are excluded: money drawn pro rata from reserves
 * already settles them, so nobody owes anyone (worked example, PRD 5.3).
 */
export function netBalances(
  memberIds: MemberId[],
  expenses: Expense[],
  payments: Payment[],
): Record<MemberId, Cents> {
  const balance: Record<MemberId, Cents> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const bump = (id: MemberId, delta: Cents) => {
    balance[id] = (balance[id] ?? 0) + delta;
  };

  for (const e of expenses) {
    if (e.source === "vault") continue;
    bump(e.payerId, e.totalCents);
    for (const [id, share] of Object.entries(e.shares)) bump(id, -share);
  }
  for (const p of payments) {
    if (p.status !== "success") continue;
    bump(p.fromId, p.amountCents);
    bump(p.toId, -p.amountCents);
  }
  return balance;
}

/**
 * US-08: greedy debt simplification.
 *
 * Repeatedly match the largest creditor with the largest debtor and transfer
 * the smaller of the two amounts. Each transfer brings at least one member to
 * zero, so the plan never needs more than n - 1 payments. Finding the true
 * minimum number of transfers is NP-hard (Verhoeff, 2004), so the MVP
 * guarantees the n - 1 bound instead.
 *
 * Complexity: O(n log n) per transfer with sorting; trivially < 1 s for 20 members.
 * Ties are broken by member id so the plan is deterministic (stable demos and tests).
 */
export function simplifyDebts(balances: Record<MemberId, Cents>): Transfer[] {
  const byAmountThenId = (a: [MemberId, Cents], b: [MemberId, Cents]) =>
    b[1] - a[1] || a[0].localeCompare(b[0]);

  const creditors = Object.entries(balances).filter(([, v]) => v > 0).sort(byAmountThenId);
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => [id, -v] as [MemberId, Cents])
    .sort(byAmountThenId);

  const transfers: Transfer[] = [];
  while (creditors.length && debtors.length) {
    const [cId, cAmt] = creditors[0];
    const [dId, dAmt] = debtors[0];
    const amount = Math.min(cAmt, dAmt);
    transfers.push({ fromId: dId, toId: cId, amountCents: amount });

    creditors[0] = [cId, cAmt - amount];
    debtors[0] = [dId, dAmt - amount];
    if (creditors[0][1] === 0) creditors.shift();
    if (debtors[0][1] === 0) debtors.shift();
    creditors.sort(byAmountThenId);
    debtors.sort(byAmountThenId);
  }
  return transfers;
}

/** Convenience: transfers that involve one member, split into pay and receive. */
export function transfersFor(transfers: Transfer[], memberId: MemberId) {
  return {
    toPay: transfers.filter((t) => t.fromId === memberId),
    toReceive: transfers.filter((t) => t.toId === memberId),
  };
}

/** Count of raw pairwise debts before simplification, for the "6 debts → 2 payments" label (screen D). */
export function rawDebtCount(expenses: Expense[]): number {
  const pairs = new Set<string>();
  for (const e of expenses) {
    if (e.source === "vault") continue;
    for (const [id, share] of Object.entries(e.shares)) {
      if (id !== e.payerId && share > 0) pairs.add(`${id}->${e.payerId}`);
    }
  }
  return pairs.size;
}
