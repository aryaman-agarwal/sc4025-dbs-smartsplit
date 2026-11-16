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
      store().giveDebitConsent();
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

describe("GroupVault governance", () => {
  const openVault = () => {
    as("amy");
    const r = store().createVault({ groupId: "g-bali", name: "Bali Trip 2026", targetCents: 150000, endDate: "2099-01-01T00:00:00Z" });
    return r.ok ? r.value : "";
  };
  const vaultOf = (id: string) => store().vaults.find((v) => v.id === id)!;

  it("needs the one-time debit authorisation before the first reserve (US-10)", () => {
    const id = openVault();
    as("ben");
    const r = store().reserve(id, 10000);
    expect(r.ok).toBe(false);
    expect(store().accounts.ben.bankCents).toBe(180000);
    store().giveDebitConsent();
    expect(store().reserve(id, 10000).ok).toBe(true);
    expect(store().reserve(id, 10000).ok).toBe(true); // asked only once
  });

  it("keeps marketing opt-in off by default and separate per member (US-18)", () => {
    as("cal");
    expect(store().marketingOptIn.cal).toBeFalsy();
    store().giveDebitConsent();
    expect(store().marketingOptIn.cal).toBeFalsy(); // feature consent doesn't opt you in
    store().setMarketingOptIn(true);
    expect(store().marketingOptIn).toEqual({ cal: true });
  });

  it("lets only the admin change tiers and tells every member (US-12)", () => {
    const id = openVault();
    const tiers = { smallMaxCents: 2000, mediumMaxCents: 10000, largeShareOfVault: 0.25, strictMode: true };
    as("ben");
    expect(store().updateVaultTiers(id, tiers).ok).toBe(false);
    as("amy");
    expect(store().updateVaultTiers(id, tiers).ok).toBe(true);
    expect(vaultOf(id).tiers.strictMode).toBe(true);
    const told = store().notifications.filter((n) => n.title.endsWith("approval rules changed")).map((n) => n.toId);
    expect(told.sort()).toEqual(["amy", "ben", "cal"]);
  });

  it("warns about an inactive vault, then releases reserves unless extended (US-14)", () => {
    const id = openVault();
    as("cal");
    store().giveDebitConsent();
    store().reserve(id, 20000);
    expect(store().accounts.cal.bankCents).toBe(75000);

    store().advanceClock(14 * 24);
    expect(vaultOf(id).inactivityNoticeAt).toBeDefined();
    store().extendVault(id);
    expect(vaultOf(id).inactivityNoticeAt).toBeUndefined();

    store().advanceClock(14 * 24); // idle again -> notice
    store().advanceClock(3 * 24); // notice runs out -> released
    expect(vaultOf(id).status).toBe("closed");
    expect(store().accounts.cal.bankCents).toBe(95000);
  });
});

describe("US-21: claim from vault", () => {
  it("pays the claimant back pro rata from every reserve, including their own", () => {
    as("amy");
    const v = store().createVault({ groupId: "g-bali", name: "Bali", targetCents: 30000, endDate: "2099-01-01T00:00:00Z" });
    const vaultId = v.ok ? v.value : "";
    for (const id of ["amy", "ben", "cal"]) {
      as(id);
      store().giveDebitConsent();
      store().reserve(vaultId, 10000);
    }
    as("ben");
    const before = store().accounts.ben.bankCents;
    const r = store().requestSpend(vaultId, { kind: "claim", merchant: "Klook tickets", amountCents: 3000 });
    expect(r.ok && r.value.tier).toBe("small");
    expect(store().accounts.ben.bankCents).toBe(before + 3000);
    expect(store().vaults.find((x) => x.id === vaultId)!.reservations).toEqual({ amy: 9000, ben: 9000, cal: 9000 });
  });
});

describe("US-17: settle everything at once", () => {
  const owesTwo = () => {
    // Ben pays $100 for Cal, so after netting Cal owes Amy $170 and Ben $60.
    as("ben");
    store().addExpense({ groupId: "g-bali", title: "Scooter rental", totalCents: 10000, shares: { cal: 10000 }, source: "manual" });
    as("cal");
  };

  it("pays every creditor in one go and returns references", async () => {
    owesTwo();
    const r = await store().settleAll("g-bali", "bank");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((p) => p.status)).toEqual(["success", "success"]);
    expect(r.value.every((p) => p.reference?.startsWith("DEMO-"))).toBe(true);
    expect(bali().cal).toBe(0);
  });

  it("keeps going when one payment fails and flags it", async () => {
    owesTwo();
    // $70 in PayLah!: enough for Ben's $60, not Amy's $170.
    useAppStore.setState({ accounts: { ...store().accounts, cal: { ...store().accounts.cal, paylahCents: 7000 } } });
    const r = await store().settleAll("g-bali", "paylah");
    if (!r.ok) throw new Error(r.error);
    const failed = r.value.filter((p) => p.status === "failed");
    const paid = r.value.filter((p) => p.status === "success");
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toMatch(/not charged/);
    expect(paid).toHaveLength(1);
  });
});
