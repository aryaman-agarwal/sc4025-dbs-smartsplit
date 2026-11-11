import { CONFIG } from "./config";
import { allocateProportional, sum } from "./money";
import type { Cents, ISODate, MemberId, SpendKind, SpendTier, TierConfig, Vault, VaultSpend } from "./types";

/**
 * GroupVault engine (US-09 to US-14, US-20, US-21).
 *
 * The earmarked-contribution model: money never leaves a member's own
 * DBS/POSB account until the group approves a spend. `reservations` is the
 * amount still held in each member's account for this vault.
 *
 * All functions are pure: they return new objects and never mutate input.
 * Errors are returned as { ok: false, error } so the UI can show the exact
 * message from the acceptance criteria.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

const HOUR = 3_600_000;
const hoursBetween = (from: ISODate, to: ISODate) => (Date.parse(to) - Date.parse(from)) / HOUR;

export function vaultTotal(vault: Vault): Cents {
  return sum(Object.values(vault.reservations));
}

export interface CreateVaultInput {
  id: string;
  groupId: string;
  name: string;
  targetCents: Cents;
  endDate: ISODate;
  adminId: MemberId;
  now: ISODate;
  tiers?: Partial<TierConfig>;
}

/** US-09: name, target and end date. No joint account; admin is not owner. */
export function createVault(input: CreateVaultInput): Result<Vault> {
  if (!input.name.trim()) return fail("Give your vault a name.");
  if (input.targetCents <= 0) return fail("Target must be more than $0.");
  if (Date.parse(input.endDate) <= Date.parse(input.now)) return fail("End date must be in the future.");
  return ok({
    id: input.id,
    groupId: input.groupId,
    name: input.name.trim(),
    targetCents: input.targetCents,
    endDate: input.endDate,
    adminId: input.adminId,
    status: "open",
    reservations: {},
    contributed: {},
    tiers: { ...CONFIG.defaultTiers, ...input.tiers },
    createdAt: input.now,
    lowAlertSent: false,
  });
}

/**
 * US-10: reserve a share in the member's own account.
 * The caller is responsible for reducing the member's available balance by
 * the same amount (see store). Insufficient funds -> "Nothing was held".
 */
export function reserve(vault: Vault, memberId: MemberId, amount: Cents, availableCents: Cents): Result<Vault> {
  if (vault.status !== "open") return fail("This vault is closed.");
  if (amount <= 0) return fail("Enter an amount above $0.");
  if (amount > availableCents) return fail("Not enough available balance. Nothing was held.");
  return ok({
    ...vault,
    reservations: { ...vault.reservations, [memberId]: (vault.reservations[memberId] ?? 0) + amount },
    contributed: { ...vault.contributed, [memberId]: (vault.contributed[memberId] ?? 0) + amount },
    lowAlertSent: false,
  });
}

/**
 * US-12: approval tier for a spend.
 * Order of checks: strict mode, then large (> medium max OR > 25% of vault),
 * then small (< small max), else medium. "Large" is checked before "small" so
 * a $40 spend from a $100 vault still needs a majority.
 *
 * approvalsRequired counts members OTHER than the requester.
 * Majority = more than half of all members, with the requester counting as one.
 */
export function classifySpend(
  vault: Vault,
  amount: Cents,
  memberCount: number,
): { tier: SpendTier; approvalsRequired: number } {
  const others = Math.max(0, memberCount - 1);
  const t = vault.tiers;
  if (t.strictMode) return { tier: "strict", approvalsRequired: others };
  if (amount > t.mediumMaxCents || amount > vaultTotal(vault) * t.largeShareOfVault) {
    const majority = Math.floor(memberCount / 2) + 1;
    return { tier: "large", approvalsRequired: Math.min(others, majority - 1) };
  }
  if (amount < t.smallMaxCents) return { tier: "small", approvalsRequired: 0 };
  return { tier: "medium", approvalsRequired: Math.min(others, 1) };
}

/** US-20: members in their first 12 hours after joining cannot initiate vault spends. */
export function coolingOffRemainingHours(joinedAt: ISODate, now: ISODate): number {
  return Math.max(0, CONFIG.newMemberCoolingOffHours - hoursBetween(joinedAt, now));
}

export interface SpendRequestInput {
  id: string;
  kind: SpendKind;
  requesterId: MemberId;
  requesterJoinedAt: ISODate;
  merchant: string;
  amount: Cents;
  memberCount: number;
  now: ISODate;
}

/** US-20 / US-21: create a spend request. Small spends are approved immediately. */
export function requestSpend(vault: Vault, input: SpendRequestInput): Result<VaultSpend> {
  if (vault.status !== "open") return fail("This vault is closed.");
  if (input.amount <= 0) return fail("Enter an amount above $0.");
  if (input.amount > vaultTotal(vault)) return fail("Not enough money reserved in the vault.");
  const wait = coolingOffRemainingHours(input.requesterJoinedAt, input.now);
  if (wait > 0) return fail(`New members can request vault spends after ${Math.ceil(wait)} more hour(s).`);

  const { tier, approvalsRequired } = classifySpend(vault, input.amount, input.memberCount);
  return ok({
    id: input.id,
    vaultId: vault.id,
    kind: input.kind,
    requesterId: input.requesterId,
    merchant: input.merchant.trim() || "Vault spend",
    amountCents: input.amount,
    tier,
    approvalsRequired,
    approvedBy: [],
    rejectedBy: [],
    status: "pending",
    createdAt: input.now,
  });
}

export function isApproved(spend: VaultSpend): boolean {
  return spend.approvedBy.length >= spend.approvalsRequired;
}

/** Add an approval. The requester cannot approve their own spend. */
export function approveSpend(spend: VaultSpend, approverId: MemberId): Result<VaultSpend> {
  if (spend.status !== "pending") return fail("This request is no longer pending.");
  if (approverId === spend.requesterId) return fail("You can't approve your own request.");
  if (spend.approvedBy.includes(approverId)) return fail("You've already approved this.");
  return ok({ ...spend, approvedBy: [...spend.approvedBy, approverId] });
}

/**
 * Add a rejection. The spend is rejected once enough members have said no
 * that the required approvals can no longer be reached.
 */
export function rejectSpend(spend: VaultSpend, rejecterId: MemberId, memberCount: number): Result<VaultSpend> {
  if (spend.status !== "pending") return fail("This request is no longer pending.");
  if (rejecterId === spend.requesterId) return fail("Cancel your own request instead.");
  const rejectedBy = [...new Set([...spend.rejectedBy, rejecterId])];
  const stillPossible = memberCount - 1 - rejectedBy.length;
  const needed = spend.approvalsRequired - spend.approvedBy.length;
  return ok({ ...spend, rejectedBy, status: stillPossible < needed ? "rejected" : "pending" });
}

/** US-12: not approved within 24 hours -> cancelled. */
export function expireIfStale(spend: VaultSpend, now: ISODate): VaultSpend {
  if (spend.status === "pending" && hoursBetween(spend.createdAt, now) >= CONFIG.approvalExpiryHours) {
    return { ...spend, status: "expired" };
  }
  return spend;
}

/**
 * US-11: draw `amount` from reserves in proportion to what each member still
 * has reserved. Reserves of $200 and $100 carry $60 and $30 of a $90 spend.
 * Guarantees: sums exactly to amount; no member is drawn beyond their reserve.
 */
export function proRataDraw(reservations: Record<MemberId, Cents>, amount: Cents): Result<Record<MemberId, Cents>> {
  const total = sum(Object.values(reservations));
  if (amount > total) return fail("Not enough money reserved in the vault.");
  const draws = allocateProportional(amount, reservations);

  // Safety net: the rounding gap must never push someone past their reserve.
  let overflow = 0;
  for (const id of Object.keys(draws)) {
    const excess = draws[id] - reservations[id];
    if (excess > 0) {
      draws[id] -= excess;
      overflow += excess;
    }
  }
  for (const id of Object.keys(reservations)) {
    if (overflow === 0) break;
    const room = reservations[id] - (draws[id] ?? 0);
    const take = Math.min(room, overflow);
    if (take > 0) {
      draws[id] = (draws[id] ?? 0) + take;
      overflow -= take;
    }
  }
  return ok(draws);
}

/** Execute an approved spend: draw from reserves and return the updated vault. */
export function executeSpend(vault: Vault, spend: VaultSpend): Result<{ vault: Vault; spend: VaultSpend }> {
  if (spend.status !== "pending" || !isApproved(spend)) return fail("This spend isn't approved yet.");
  const drawn = proRataDraw(vault.reservations, spend.amountCents);
  if (!drawn.ok) return drawn;

  const reservations = { ...vault.reservations };
  for (const [id, d] of Object.entries(drawn.value)) reservations[id] -= d;
  return ok({
    vault: { ...vault, reservations },
    spend: { ...spend, status: "executed", draws: drawn.value },
  });
}

/** US-13: true once when the vault drops below 20% of target. */
export function shouldSendLowAlert(vault: Vault): boolean {
  return !vault.lowAlertSent && vaultTotal(vault) < vault.targetCents * CONFIG.lowVaultThreshold;
}

/** US-14: close the vault; every unspent reservation is released to its owner. */
export function closeVault(vault: Vault): { vault: Vault; released: Record<MemberId, Cents> } {
  const released = Object.fromEntries(Object.entries(vault.reservations).filter(([, v]) => v > 0));
  return { vault: { ...vault, status: "closed", reservations: {} }, released };
}
