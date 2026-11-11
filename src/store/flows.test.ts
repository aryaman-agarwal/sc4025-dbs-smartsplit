import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_RECEIPTS } from "../data/sampleReceipts";
import { computeReceiptSplit } from "../domain/receiptSplit";
import { netBalances } from "../domain/settlement";
import { vaultTotal } from "../domain/vault";
import { demoSettings } from "../services/payNow";
import { useAppStore } from "./useAppStore";

/**
 * End-to-end checks of the three demo flows (PRD 5.6) through the store,
 * using the Amy/Ben/Cal seed data. These mirror what the video shows.
 */
const store = () => useAppStore.getState();
const as = (id: string) => store().switchUser(id);
const bali = () => netBalances(["amy", "ben", "cal"], store().expenses.filter((e) => e.groupId === "g-bali"), store().payments);

beforeEach(() => {
  demoSettings.latencyMs = 0;
  demoSettings.failureRate = 0;
  store().resetDemo();
});

describe("seed data", () => {
  it("starts with the PRD worked example balances", () => {
    expect(bali()).toEqual({ amy: 17000, ben: -4000, cal: -13000 });
  });

  it("ships demo receipts whose totals reconcile (except the mismatch demo)", () => {
    for (const r of SAMPLE_RECEIPTS) {
      const split = computeReceiptSplit(r.parsed.items.map((i) => ({ ...i, assignees: ["amy"] })));
      const matches = split.totalCents === r.parsed.detectedTotalCents;
      expect(matches).toBe(r.id !== "smudged-receipt");
    }
  });
});

describe("Flow 1: split a bill", () => {
  it("adds an itemised expense and updates every balance", () => {
    as("amy");
    const r = store().addExpense({ groupId: "g-bali", title: "Seafood", totalCents: 3000, shares: { amy: 1000, ben: 1000, cal: 1000 }, source: "receipt" });
    expect(r.ok).toBe(true);
    expect(bali()).toEqual({ amy: 19000, ben: -5000, cal: -14000 });
  });

  it("blocks a duplicate card import (US-07)", () => {
    as("amy");
    const r = store().addExpense({ groupId: "g-bali", title: "Villa", totalCents: 30000, shares: { amy: 30000 }, source: "card", cardTxnId: "t-amy-villa" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Already added on/);
  });

  it("refuses non-DBS invitees (US-01)", () => {
    const r = store().createGroup("Test", ["eve"]);
    expect(r).toEqual({ ok: false, error: "Only DBS/POSB customers can join in this version." });
  });
});

describe("Flow 2: settle up", () => {
  it("Cal pays Amy in one tap and both see settled", async () => {
    as("cal");
    const r = await store().pay("g-bali", "amy", 13000, "bank");
    expect(r.ok).toBe(true);
    expect(bali().cal).toBe(0);
    expect(store().knownPayees.cal).toContain("amy");
  });

  it("fails cleanly when funds are short: 'You were not charged'", async () => {
    as("cal");
    const r = await store().pay("g-bali", "amy", 13000, "paylah"); // Cal has $40 in PayLah!
    expect(r).toEqual({ ok: false, error: "Not enough balance. You were not charged." });
    expect(bali().cal).toBe(-13000);
  });
});

describe("Flow 3: pre-fund a trip", () => {
  it("creates a $1,500 vault, reserves, approves a $150 boat and releases the rest", () => {
    as("amy");
    const created = store().createVault({ groupId: "g-bali", name: "Bali Trip 2026", targetCents: 150000, endDate: "2099-01-01T00:00:00Z" });
    expect(created.ok).toBe(true);
    const vaultId = created.ok ? created.value : "";

    for (const id of ["amy", "ben", "cal"]) {
      as(id);
      expect(store().reserve(vaultId, 50000).ok).toBe(true);
    }
    expect(store().accounts.cal.bankCents).toBe(45000); // 95,000 - 50,000

    as("ben");
    const req = store().requestSpend(vaultId, { kind: "pay", merchant: "Boat operator", amountCents: 15000 });
    expect(req.ok && req.value.tier).toBe("medium");
    const spendId = req.ok ? req.value.id : "";

    as("cal");
    const approved = store().approveSpend(spendId);
    expect(approved.ok && approved.value.status).toBe("executed");
    const vault = store().vaults.find((v) => v.id === vaultId)!;
    expect(vault.reservations).toEqual({ amy: 45000, ben: 45000, cal: 45000 });
    expect(bali()).toEqual({ amy: 17000, ben: -4000, cal: -13000 }); // vault spends create no debts

    as("amy");
    expect(store().closeVault(vaultId).ok).toBe(true);
    expect(vaultTotal(store().vaults.find((v) => v.id === vaultId)!)).toBe(0);
    expect(store().accounts.cal.bankCents).toBe(90000); // 45,000 + 45,000 released
  });

  it("sends app reminders after 48 hours, never more than three (US-19)", () => {
    store().runReminders(); // seed debts are 3-4 days old
    const count = () => store().notifications.filter((n) => n.title === "Friendly reminder from DBS").length;
    expect(count()).toBe(2); // Ben and Cal each owe Amy
    store().runReminders();
    expect(count()).toBe(2); // rate-limited
    for (let i = 0; i < 5; i++) store().advanceClock(72);
    // 3 debts (Ben→Amy, Cal→Amy, and Cal→Dee in Flat 07-12) × 3 reminders each, then stop
    expect(count()).toBe(9);
  });
});
