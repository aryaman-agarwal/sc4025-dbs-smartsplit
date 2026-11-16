import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_RECEIPTS } from "../data/sampleReceipts";
import { computeReceiptSplit } from "../domain/receiptSplit";
import { netBalances } from "../domain/settlement";
import { vaultTotal } from "../domain/vault";
import { demoSettings } from "../services/payNow";
import { useAppStore } from "./useAppStore";

/**
 * End-to-end checks of the three demo flows (PRD 5.6) through the store,
 * using the Sarah/Ben/Marcus seed data. These mirror what the video shows.
 */
const store = () => useAppStore.getState();
const as = (id: string) => store().switchUser(id);
const bali = () => netBalances(["sarah", "ben", "marcus"], store().expenses.filter((e) => e.groupId === "g-bali"), store().payments);

beforeEach(() => {
  demoSettings.latencyMs = 0;
  demoSettings.failureRate = 0;
  store().resetDemo();
});

describe("seed data", () => {
  it("starts with the PRD worked example balances", () => {
    expect(bali()).toEqual({ sarah: 17000, ben: -4000, marcus: -13000 });
  });

  it("ships demo receipts whose totals reconcile (except the mismatch demo)", () => {
    for (const r of SAMPLE_RECEIPTS) {
      const split = computeReceiptSplit(r.parsed.items.map((i) => ({ ...i, assignees: ["sarah"] })));
      const matches = split.totalCents === r.parsed.detectedTotalCents;
      expect(matches).toBe(r.id !== "smudged-receipt");
    }
  });
});

describe("Flow 1: split a bill", () => {
  it("adds an itemised expense and updates every balance", () => {
    as("sarah");
    const r = store().addExpense({ groupId: "g-bali", title: "Seafood", totalCents: 3000, shares: { sarah: 1000, ben: 1000, marcus: 1000 }, source: "receipt" });
    expect(r.ok).toBe(true);
    expect(bali()).toEqual({ sarah: 19000, ben: -5000, marcus: -14000 });
  });

  it("blocks a duplicate card import (US-07)", () => {
    as("sarah");
    const r = store().addExpense({ groupId: "g-bali", title: "Villa", totalCents: 30000, shares: { sarah: 30000 }, source: "card", cardTxnId: "t-sarah-villa" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Already added on/);
  });

  it("refuses non-DBS invitees (US-01)", () => {
    const r = store().createGroup("Test", ["eve"]);
    expect(r).toEqual({ ok: false, error: "Only DBS/POSB customers can join in this version." });
  });
});

describe("Flow 2: settle up", () => {
  it("Marcus pays Sarah in one tap and both see settled", async () => {
    as("marcus");
    const r = await store().pay("g-bali", "sarah", 13000, "bank");
    expect(r.ok).toBe(true);
    expect(bali().marcus).toBe(0);
    expect(store().knownPayees.marcus).toContain("sarah");
  });

  it("fails cleanly when funds are short: 'You were not charged'", async () => {
    as("marcus");
    const r = await store().pay("g-bali", "sarah", 13000, "paylah"); // Marcus has $40 in PayLah!
    expect(r).toEqual({ ok: false, error: "Not enough balance. You were not charged." });
    expect(bali().marcus).toBe(-13000);
  });
});

describe("Flow 3: pre-fund a trip", () => {
  it("creates a $1,500 vault, reserves, approves a $150 boat and releases the rest", () => {
    as("sarah");
    const created = store().createVault({ groupId: "g-bali", name: "Bali Trip 2026", targetCents: 150000, endDate: "2099-01-01T00:00:00Z" });
    expect(created.ok).toBe(true);
    const vaultId = created.ok ? created.value : "";

    for (const id of ["sarah", "ben", "marcus"]) {
      as(id);
      store().giveDebitConsent();
      expect(store().reserve(vaultId, 50000).ok).toBe(true);
    }
    expect(store().accounts.marcus.bankCents).toBe(45000); // 95,000 - 50,000

    as("ben");
    const req = store().requestSpend(vaultId, { kind: "pay", merchant: "Boat operator", amountCents: 15000 });
    expect(req.ok && req.value.tier).toBe("medium");
    const spendId = req.ok ? req.value.id : "";

    as("marcus");
    const approved = store().approveSpend(spendId);
    expect(approved.ok && approved.value.status).toBe("executed");
    const vault = store().vaults.find((v) => v.id === vaultId)!;
    expect(vault.reservations).toEqual({ sarah: 45000, ben: 45000, marcus: 45000 });
    expect(bali()).toEqual({ sarah: 17000, ben: -4000, marcus: -13000 }); // vault spends create no debts

    as("sarah");
    expect(store().closeVault(vaultId).ok).toBe(true);
    expect(vaultTotal(store().vaults.find((v) => v.id === vaultId)!)).toBe(0);
    expect(store().accounts.marcus.bankCents).toBe(90000); // 45,000 + 45,000 released
  });

  it("sends app reminders after 48 hours, never more than three (US-19)", () => {
    store().runReminders(); // seed debts are 3-4 days old
    const count = () => store().notifications.filter((n) => n.title === "Friendly reminder from DBS").length;
    expect(count()).toBe(2); // Ben and Marcus each owe Sarah
    store().runReminders();
    expect(count()).toBe(2); // rate-limited
    for (let i = 0; i < 5; i++) store().advanceClock(72);
    // 3 debts (Ben→Sarah, Marcus→Sarah, and Marcus→Dee in Flat 07-12) × 3 reminders each, then stop
    expect(count()).toBe(9);
  });
});

describe("GroupVault governance", () => {
  const openVault = () => {
    as("sarah");
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
    as("marcus");
    expect(store().marketingOptIn.marcus).toBeFalsy();
    store().giveDebitConsent();
    expect(store().marketingOptIn.marcus).toBeFalsy(); // feature consent doesn't opt you in
    store().setMarketingOptIn(true);
    expect(store().marketingOptIn).toEqual({ marcus: true });
  });

  it("lets only the admin change tiers and tells every member (US-12)", () => {
    const id = openVault();
    const tiers = { smallMaxCents: 2000, mediumMaxCents: 10000, largeShareOfVault: 0.25, strictMode: true };
    as("ben");
    expect(store().updateVaultTiers(id, tiers).ok).toBe(false);
    as("sarah");
    expect(store().updateVaultTiers(id, tiers).ok).toBe(true);
    expect(vaultOf(id).tiers.strictMode).toBe(true);
    const told = store().notifications.filter((n) => n.title.endsWith("approval rules changed")).map((n) => n.toId);
    expect(told.sort()).toEqual(["ben", "marcus", "sarah"]);
  });

  it("warns about an inactive vault, then releases reserves unless extended (US-14)", () => {
    const id = openVault();
    as("marcus");
    store().giveDebitConsent();
    store().reserve(id, 20000);
    expect(store().accounts.marcus.bankCents).toBe(75000);

    store().advanceClock(14 * 24);
    expect(vaultOf(id).inactivityNoticeAt).toBeDefined();
    store().extendVault(id);
    expect(vaultOf(id).inactivityNoticeAt).toBeUndefined();

    store().advanceClock(14 * 24); // idle again -> notice
    store().advanceClock(3 * 24); // notice runs out -> released
    expect(vaultOf(id).status).toBe("closed");
    expect(store().accounts.marcus.bankCents).toBe(95000);
  });
});

describe("US-21: claim from vault", () => {
  it("pays the claimant back pro rata from every reserve, including their own", () => {
    as("sarah");
    const v = store().createVault({ groupId: "g-bali", name: "Bali", targetCents: 30000, endDate: "2099-01-01T00:00:00Z" });
    const vaultId = v.ok ? v.value : "";
    for (const id of ["sarah", "ben", "marcus"]) {
      as(id);
      store().giveDebitConsent();
      store().reserve(vaultId, 10000);
    }
    as("ben");
    const before = store().accounts.ben.bankCents;
    const r = store().requestSpend(vaultId, { kind: "claim", merchant: "Klook tickets", amountCents: 3000 });
    expect(r.ok && r.value.tier).toBe("small");
    expect(store().accounts.ben.bankCents).toBe(before + 3000);
    expect(store().vaults.find((x) => x.id === vaultId)!.reservations).toEqual({ sarah: 9000, ben: 9000, marcus: 9000 });
  });
});

describe("US-17: settle everything at once", () => {
  const owesTwo = () => {
    // Ben pays $100 for Marcus, so after netting Marcus owes Sarah $170 and Ben $60.
    as("ben");
    store().addExpense({ groupId: "g-bali", title: "Scooter rental", totalCents: 10000, shares: { marcus: 10000 }, source: "manual" });
    as("marcus");
  };

  it("pays every creditor in one go and returns references", async () => {
    owesTwo();
    const r = await store().settleAll("g-bali", "bank");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((p) => p.status)).toEqual(["success", "success"]);
    expect(r.value.every((p) => p.reference?.startsWith("DEMO-"))).toBe(true);
    expect(bali().marcus).toBe(0);
  });

  it("keeps going when one payment fails and flags it", async () => {
    owesTwo();
    // $70 in PayLah!: enough for Ben's $60, not Sarah's $170.
    useAppStore.setState({ accounts: { ...store().accounts, marcus: { ...store().accounts.marcus, paylahCents: 7000 } } });
    const r = await store().settleAll("g-bali", "paylah");
    if (!r.ok) throw new Error(r.error);
    const failed = r.value.filter((p) => p.status === "failed");
    const paid = r.value.filter((p) => p.status === "success");
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toMatch(/not charged/);
    expect(paid).toHaveLength(1);
  });
});

describe("US-02: consent to join", () => {
  const newGroup = () => {
    as("sarah");
    const r = store().createGroup("Hall supper", ["ben", "dee"]);
    return r.ok ? r.value : "";
  };

  it("keeps invitees pending and out of splits until they accept", () => {
    const id = newGroup();
    const r = store().addExpense({ groupId: id, title: "Supper", totalCents: 3000, shares: { sarah: 1000, ben: 1000, dee: 1000 }, source: "manual" });
    expect(r).toEqual({ ok: false, error: "Splits can only include members who have joined." });
  });

  it("sends no vault request to someone who hasn't accepted", () => {
    const id = newGroup();
    store().createVault({ groupId: id, name: "Supper fund", targetCents: 10000, endDate: "2099-01-01T00:00:00Z" });
    expect(store().notifications.some((n) => n.toId === "ben" && n.title.includes("created Supper fund"))).toBe(false);
  });

  it("removes a member who declines, with no shares left behind", () => {
    const id = newGroup();
    as("ben");
    store().respondToInvite(id, false);
    const g = store().groups.find((x) => x.id === id)!;
    expect(g.members.ben).toBeUndefined();
    expect(store().expenses.some((e) => e.groupId === id && e.shares.ben)).toBe(false);
  });

  it("lets an accepted member be split with", () => {
    const id = newGroup();
    as("ben");
    store().respondToInvite(id, true);
    as("sarah");
    const r = store().addExpense({ groupId: id, title: "Supper", totalCents: 2000, shares: { sarah: 1000, ben: 1000 }, source: "manual" });
    expect(r.ok).toBe(true);
  });
});
