import { CONFIG } from "./config";
import { addInto, allocateProportional, roundCents, splitEqually, sum } from "./money";
import type { Cents, MemberId, ReceiptItem } from "./types";

export interface SplitOptions {
  serviceChargeRate?: number;
  gstRate?: number;
}

export interface ReceiptSplitResult {
  subtotalCents: Cents;
  serviceChargeCents: Cents;
  gstCents: Cents;
  totalCents: Cents;
  /** What each member had before charges. */
  itemSharesCents: Record<MemberId, Cents>;
  /** Final amount per member, including their proportional SC and GST. Sums to totalCents. */
  sharesCents: Record<MemberId, Cents>;
  unassignedItemIds: string[];
}

/**
 * US-05 + US-06.
 * - An item with one assignee is charged in full to them; with several it is split equally.
 * - Service charge = subtotal x SC rate. GST = (subtotal + SC) x GST rate (Singapore practice).
 * - SC and GST are shared in proportion to what each person ordered.
 * - Any rounding gap goes to the largest share, so shares sum exactly to the total.
 */
export function computeReceiptSplit(
  items: ReceiptItem[],
  { serviceChargeRate = CONFIG.serviceChargeRate, gstRate = CONFIG.gstRate }: SplitOptions = {},
): ReceiptSplitResult {
  const subtotalCents = sum(items.map((i) => i.priceCents));
  const serviceChargeCents = roundCents(subtotalCents * serviceChargeRate);
  const gstCents = roundCents((subtotalCents + serviceChargeCents) * gstRate);
  const totalCents = subtotalCents + serviceChargeCents + gstCents;

  const itemSharesCents: Record<MemberId, Cents> = {};
  const unassignedItemIds: string[] = [];
  for (const item of items) {
    if (item.assignees.length === 0) {
      unassignedItemIds.push(item.id);
      continue;
    }
    addInto(itemSharesCents, splitEqually(item.priceCents, item.assignees));
  }

  const sharesCents =
    unassignedItemIds.length === 0 ? allocateProportional(totalCents, itemSharesCents) : {};

  return {
    subtotalCents,
    serviceChargeCents,
    gstCents,
    totalCents,
    itemSharesCents,
    sharesCents,
    unassignedItemIds,
  };
}

export interface ReconcileResult {
  ok: boolean;
  differenceCents: Cents;
}

/** US-04: items plus charges must equal the total printed on the receipt. */
export function reconcileWithReceipt(computedTotal: Cents, detectedTotal: Cents): ReconcileResult {
  const differenceCents = computedTotal - detectedTotal;
  return { ok: differenceCents === 0, differenceCents };
}

/** Card-import shortcut (Flow 1 alt): split a charge equally, skipping screen C. */
export function equalSplit(totalCents: Cents, memberIds: MemberId[]): Record<MemberId, Cents> {
  return splitEqually(totalCents, memberIds);
}
