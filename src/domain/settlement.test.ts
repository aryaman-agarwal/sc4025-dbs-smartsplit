import { describe, expect, it } from "vitest";
import { sum } from "./money";
import { netBalances, rawDebtCount, simplifyDebts } from "./settlement";
import type { Cents, Expense, Payment } from "./types";

let n = 0;
const expense = (payerId: string, shares: Record<string, Cents>, source: Expense["source"] = "manual"): Expense => ({
  id: `e${++n}`,
  groupId: "g",
  title: "t",
  payerId,
  totalCents: sum(Object.values(shares)),
  shares,
  source,
  createdAt: "2026-11-01T00:00:00Z",
});

/** Apply transfers to balances and return what's left. */
function settle(balances: Record<string, Cents>, transfers: ReturnType<typeof simplifyDebts>) {
  const b = { ...balances };
  for (const t of transfers) {
    b[t.fromId] += t.amountCents;
    b[t.toId] -= t.amountCents;
  }
  return b;
}

describe("netBalances", () => {
  it("matches the Bali worked example (PRD 5.3)", () => {
    const ids = ["amy", "ben", "cal"];
    const exps = [
      expense("amy", { amy: 10000, ben: 10000, cal: 10000 }), // villa $300
      expense("ben", { amy: 3000, ben: 3000, cal: 3000 }), // dinner $90
    ];
    expect(netBalances(ids, exps, [])).toEqual({ amy: 17000, ben: -4000, cal: -13000 });
  });

  it("ignores vault-funded expenses and failed payments", () => {
    const exps = [expense("amy", { amy: 100, ben: 100 }, "vault")];
    const failed: Payment = {
      id: "p",
      groupId: "g",
      fromId: "ben",
      toId: "amy",
      amountCents: 500,
      status: "failed",
      source: "bank",
      createdAt: "",
    };
    expect(netBalances(["amy", "ben"], exps, [failed])).toEqual({ amy: 0, ben: 0 });
  });

  it("treats a successful payment as settling the debt", () => {
    const exps = [expense("amy", { amy: 1000, ben: 1000 })];
    const paid: Payment = {
      id: "p",
      groupId: "g",
      fromId: "ben",
      toId: "amy",
      amountCents: 1000,
      status: "success",
      source: "paylah",
      createdAt: "",
    };
    expect(netBalances(["amy", "ben"], exps, [paid])).toEqual({ amy: 0, ben: 0 });
  });
});

describe("US-08: net debt minimisation", () => {
  it("collapses a chain: A owes B $20 and B owes C $20 -> one payment A -> C", () => {
    const transfers = simplifyDebts({ a: -2000, b: 0, c: 2000 });
    expect(transfers).toEqual([{ fromId: "a", toId: "c", amountCents: 2000 }]);
  });

  it("matches the Bali example: two payments", () => {
    const t = simplifyDebts({ amy: 17000, ben: -4000, cal: -13000 });
    expect(t).toEqual([
      { fromId: "cal", toId: "amy", amountCents: 13000 },
      { fromId: "ben", toId: "amy", amountCents: 4000 },
    ]);
  });

  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it("never needs more than n - 1 payments and zeroes every balance (randomised)", () => {
    for (let trial = 0; trial < 200; trial++) {
      const size = 2 + (trial % 19);
      const ids = Array.from({ length: size }, (_, i) => `m${i}`);
      const exps = Array.from({ length: 10 }, () => {
        const payer = ids[Math.floor(Math.random() * size)];
        const shares: Record<string, Cents> = {};
        for (const id of ids) if (Math.random() < 0.6) shares[id] = Math.floor(Math.random() * 10000);
        return expense(payer, shares);
      });
      const balances = netBalances(ids, exps, []);
      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(size - 1);
      expect(Object.values(settle(balances, transfers)).every((v) => v === 0)).toBe(true);
      expect(transfers.every((t) => t.amountCents > 0)).toBe(true);
    }
  });

  it("handles 20 members and 200 expenses in under 1 second", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `m${i}`);
    const exps = Array.from({ length: 200 }, (_, k) => {
      const shares: Record<string, Cents> = {};
      for (const id of ids) shares[id] = (k * 37 + id.length * 13) % 5000;
      return expense(ids[k % 20], shares);
    });
    const start = performance.now();
    const transfers = simplifyDebts(netBalances(ids, exps, []));
    const elapsed = performance.now() - start;
    expect(transfers.length).toBeLessThanOrEqual(19);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("rawDebtCount", () => {
  it("counts distinct who-owes-whom pairs before simplification", () => {
    const exps = [expense("amy", { amy: 1, ben: 1, cal: 1 }), expense("ben", { amy: 1, ben: 1, cal: 1 })];
    expect(rawDebtCount(exps)).toBe(4);
  });
});
