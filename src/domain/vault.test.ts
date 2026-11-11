import { describe, expect, it } from "vitest";
import { sum } from "./money";
import {
  approveSpend,
  classifySpend,
  closeVault,
  createVault,
  executeSpend,
  expireIfStale,
  proRataDraw,
  rejectSpend,
  requestSpend,
  reserve,
  shouldSendLowAlert,
  vaultTotal,
  type Result,
} from "./vault";
import type { Vault } from "./types";

const NOW = "2026-11-12T10:00:00Z";
const LONG_AGO = "2026-11-01T00:00:00Z";

function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

function baliVault(): Vault {
  let v = unwrap(
    createVault({
      id: "v1",
      groupId: "g1",
      name: "Bali Trip 2026",
      targetCents: 150000,
      endDate: "2026-12-31T00:00:00Z",
      adminId: "amy",
      now: NOW,
    }),
  );
  for (const id of ["amy", "ben", "cal"]) v = unwrap(reserve(v, id, 50000, 100000));
  return v;
}

const spendInput = (amount: number, requesterId = "ben") => ({
  id: "s1",
  kind: "pay" as const,
  requesterId,
  requesterJoinedAt: LONG_AGO,
  merchant: "Boat operator",
  amount,
  memberCount: 3,
  now: NOW,
});

describe("US-09 / US-10: create and reserve", () => {
  it("creates an open vault with the organiser as admin", () => {
    const v = baliVault();
    expect(v.status).toBe("open");
    expect(v.adminId).toBe("amy");
    expect(vaultTotal(v)).toBe(150000);
  });

  it("rejects bad input", () => {
    expect(createVault({ id: "v", groupId: "g", name: " ", targetCents: 1, endDate: "2027-01-01", adminId: "a", now: NOW }).ok).toBe(false);
    expect(createVault({ id: "v", groupId: "g", name: "x", targetCents: 1, endDate: "2020-01-01", adminId: "a", now: NOW }).ok).toBe(false);
  });

  it("holds nothing when funds are insufficient", () => {
    const r = reserve(baliVault(), "cal", 20000, 10000);
    expect(r).toEqual({ ok: false, error: "Not enough available balance. Nothing was held." });
  });
});

describe("US-12: tiered approvals", () => {
  const v = baliVault(); // $1,500 reserved, 3 members

  it("small spends need no approval", () => {
    expect(classifySpend(v, 4999, 3)).toEqual({ tier: "small", approvalsRequired: 0 });
  });

  it("medium spends need one other member (Flow 3: $150 boat)", () => {
    expect(classifySpend(v, 15000, 3)).toEqual({ tier: "medium", approvalsRequired: 1 });
  });

  it("large spends need a majority", () => {
    expect(classifySpend(v, 30001, 3).tier).toBe("large");
    expect(classifySpend(v, 30001, 5)).toEqual({ tier: "large", approvalsRequired: 2 });
  });

  it("anything over 25% of the vault is large, even below $300", () => {
    const small = { ...v, reservations: { amy: 10000 } };
    expect(classifySpend(small, 4000, 3).tier).toBe("large");
  });

  it("strict mode needs everyone", () => {
    const strict = { ...v, tiers: { ...v.tiers, strictMode: true } };
    expect(classifySpend(strict, 100, 4)).toEqual({ tier: "strict", approvalsRequired: 3 });
  });
});

describe("US-11 / US-20: pay from vault", () => {
  it("runs Flow 3 end to end: $150 boat, Cal approves, $50 from each reserve", () => {
    const v = baliVault();
    let spend = unwrap(requestSpend(v, spendInput(15000)));
    expect(spend.status).toBe("pending");
    expect(executeSpend(v, spend).ok).toBe(false); // not approved yet

    spend = unwrap(approveSpend(spend, "cal"));
    const { vault, spend: done } = unwrap(executeSpend(v, spend));
    expect(done.status).toBe("executed");
    expect(done.draws).toEqual({ amy: 5000, ben: 5000, cal: 5000 });
    expect(vaultTotal(vault)).toBe(135000);
  });

  it("draws pro rata: reserves of $200 and $100 carry $60 and $30 of $90", () => {
    expect(unwrap(proRataDraw({ a: 20000, b: 10000 }, 9000))).toEqual({ a: 6000, b: 3000 });
  });

  it("never draws more than a member has reserved", () => {
    const res = { a: 1, b: 1, c: 99998 };
    const draws = unwrap(proRataDraw(res, 99999));
    expect(sum(Object.values(draws))).toBe(99999);
    for (const id of Object.keys(draws)) expect(draws[id]).toBeLessThanOrEqual(res[id as keyof typeof res]);
  });

  it("blocks spends from new members during the 12-hour cooling-off", () => {
    const r = requestSpend(baliVault(), { ...spendInput(1000), requesterJoinedAt: "2026-11-12T05:00:00Z" });
    expect(r.ok).toBe(false);
  });

  it("does not let the requester approve their own spend", () => {
    const spend = unwrap(requestSpend(baliVault(), spendInput(15000)));
    expect(approveSpend(spend, "ben").ok).toBe(false);
  });

  it("rejects once the approval can no longer be reached", () => {
    const v = baliVault();
    const spend = unwrap(requestSpend(v, spendInput(15000)));
    const once = unwrap(rejectSpend(spend, "cal", 3));
    expect(once.status).toBe("pending"); // Amy could still approve
    expect(unwrap(rejectSpend(once, "amy", 3)).status).toBe("rejected");
  });

  it("expires after 24 hours", () => {
    const spend = unwrap(requestSpend(baliVault(), spendInput(15000)));
    expect(expireIfStale(spend, "2026-11-13T09:59:00Z").status).toBe("pending");
    expect(expireIfStale(spend, "2026-11-13T10:00:00Z").status).toBe("expired");
  });

  it("refuses spends larger than the vault", () => {
    expect(requestSpend(baliVault(), spendInput(150001)).ok).toBe(false);
  });
});

describe("US-13 / US-14: alerts and close", () => {
  it("sends one running-low alert below 20% of target", () => {
    const v = { ...baliVault(), reservations: { amy: 29999 } };
    expect(shouldSendLowAlert(v)).toBe(true);
    expect(shouldSendLowAlert({ ...v, lowAlertSent: true })).toBe(false);
  });

  it("releases every unspent reservation on close", () => {
    const v = { ...baliVault(), reservations: { amy: 37000, ben: 37000, cal: 37000 } };
    const { vault, released } = closeVault(v);
    expect(vault.status).toBe("closed");
    expect(vaultTotal(vault)).toBe(0);
    expect(released).toEqual({ amy: 37000, ben: 37000, cal: 37000 });
  });
});
