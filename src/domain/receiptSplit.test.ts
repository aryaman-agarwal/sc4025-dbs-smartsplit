import { describe, expect, it } from "vitest";
import { sum } from "./money";
import { computeReceiptSplit, reconcileWithReceipt } from "./receiptSplit";
import type { ReceiptItem } from "./types";

const item = (id: string, priceCents: number, assignees: string[]): ReceiptItem => ({
  id,
  name: id,
  priceCents,
  assignees,
});

describe("US-06: service charge and GST shared fairly", () => {
  it("matches the PRD example: $100 subtotal -> $119.90", () => {
    const r = computeReceiptSplit([item("set", 10000, ["amy"])]);
    expect(r.subtotalCents).toBe(10000);
    expect(r.serviceChargeCents).toBe(1000);
    expect(r.gstCents).toBe(990);
    expect(r.totalCents).toBe(11990);
    expect(r.sharesCents).toEqual({ amy: 11990 });
  });

  it("shares charges in proportion to what each person ordered", () => {
    const r = computeReceiptSplit([item("steak", 6000, ["amy"]), item("salad", 2000, ["ben"])]);
    // Amy ordered 75%, Ben 25% of a $95.92 total
    expect(r.totalCents).toBe(9592);
    expect(r.sharesCents.amy).toBe(7194);
    expect(r.sharesCents.ben).toBe(2398);
    expect(sum(Object.values(r.sharesCents))).toBe(r.totalCents);
  });

  it("supports receipts with no service charge (e.g. hawker)", () => {
    const r = computeReceiptSplit([item("rice", 500, ["amy"])], { serviceChargeRate: 0, gstRate: 0 });
    expect(r.totalCents).toBe(500);
  });
});

describe("US-05: assign receipt items", () => {
  it("splits a shared item equally (shared fries between Ben and Cal)", () => {
    const r = computeReceiptSplit([item("fries", 901, ["ben", "cal"])], { serviceChargeRate: 0, gstRate: 0 });
    expect(r.itemSharesCents).toEqual({ ben: 451, cal: 450 });
  });

  it("blocks saving when any item is unassigned", () => {
    const r = computeReceiptSplit([item("a", 1000, ["amy"]), item("b", 500, [])]);
    expect(r.unassignedItemIds).toEqual(["b"]);
    expect(r.sharesCents).toEqual({});
  });

  it("always sums exactly to the total for awkward amounts", () => {
    const items = [item("x", 333, ["a", "b", "c"]), item("y", 1001, ["b"]), item("z", 7, ["c", "a"])];
    const r = computeReceiptSplit(items);
    expect(sum(Object.values(r.sharesCents))).toBe(r.totalCents);
  });
});

describe("US-04: reconcile with the receipt total", () => {
  it("flags a mismatch", () => {
    expect(reconcileWithReceipt(11990, 11990)).toEqual({ ok: true, differenceCents: 0 });
    expect(reconcileWithReceipt(11990, 12000)).toEqual({ ok: false, differenceCents: -10 });
  });
});
