/**
 * Domain types for SmartSplit & GroupVault.
 *
 * Rule (PRD 5.7 "Money accuracy"): every amount is an integer number of
 * cents. Never store dollars as floats. Use helpers in money.ts to convert.
 */

export type Cents = number;
export type MemberId = string;
export type ISODate = string;

export interface Member {
  id: MemberId;
  displayName: string;
  /** Shown on payment confirmation, e.g. "AMY T** L**" (US-15). */
  maskedName: string;
  /** MVP: only DBS/POSB customers can join (US-01). */
  isDbsCustomer: boolean;
  avatarColor: string;
}

export type InviteStatus = "pending" | "accepted";

export interface Group {
  id: string;
  name: string;
  createdBy: MemberId;
  createdAt: ISODate;
  /** Includes the creator. Pending members cannot receive splits (US-02). */
  members: Record<MemberId, { status: InviteStatus; joinedAt?: ISODate }>;
}

export type ExpenseSource = "receipt" | "card" | "manual" | "vault";

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  payerId: MemberId;
  totalCents: Cents;
  /** What each member consumed. Sums exactly to totalCents. */
  shares: Record<MemberId, Cents>;
  source: ExpenseSource;
  createdAt: ISODate;
  cardTxnId?: string;
  /** Kept when OCR fails so the photo is still available (US-04). */
  receiptImageUrl?: string;
}

export type PaymentStatus = "success" | "failed";

/** A settlement payment between two members (One-Tap Settlement). */
export interface Payment {
  id: string;
  groupId: string;
  fromId: MemberId;
  toId: MemberId;
  amountCents: Cents;
  status: PaymentStatus;
  source: "paylah" | "bank";
  createdAt: ISODate;
}

/** A suggested transfer produced by the netting engine (US-08). */
export interface Transfer {
  fromId: MemberId;
  toId: MemberId;
  amountCents: Cents;
}

/* ------------------------------ GroupVault ------------------------------ */

export type SpendTier = "small" | "medium" | "large" | "strict";

export interface TierConfig {
  /** Spends below this need no approval (alert only). Default $50. */
  smallMaxCents: Cents;
  /** Spends up to this need one other member. Default $300. */
  mediumMaxCents: Cents;
  /** Spends above this share of the vault are "large". Default 0.25. */
  largeShareOfVault: number;
  /** Strict mode: every member must approve every spend. */
  strictMode: boolean;
}

export type VaultStatus = "open" | "closed";

export interface Vault {
  id: string;
  groupId: string;
  name: string;
  targetCents: Cents;
  endDate: ISODate;
  /** Admin manages the vault but never owns members' money (US-09). */
  adminId: MemberId;
  status: VaultStatus;
  /** Amount still reserved in each member's OWN account (US-10). */
  reservations: Record<MemberId, Cents>;
  /** Total each member has ever reserved, for reporting. */
  contributed: Record<MemberId, Cents>;
  tiers: TierConfig;
  createdAt: ISODate;
  lowAlertSent: boolean;
}

export type SpendKind = "pay" | "claim";
export type SpendStatus = "pending" | "executed" | "rejected" | "expired";

export interface VaultSpend {
  id: string;
  vaultId: string;
  kind: SpendKind;
  requesterId: MemberId;
  merchant: string;
  amountCents: Cents;
  tier: SpendTier;
  /** Approvals required from members OTHER than the requester. */
  approvalsRequired: number;
  approvedBy: MemberId[];
  rejectedBy: MemberId[];
  status: SpendStatus;
  createdAt: ISODate;
  /** Filled when executed: how much came from each member's reserve (US-11). */
  draws?: Record<MemberId, Cents>;
}

/* ------------------------------ Receipts ------------------------------ */

export interface ReceiptItem {
  id: string;
  name: string;
  priceCents: Cents;
  /** Members who shared this item. Empty = unassigned (blocks save, US-05). */
  assignees: MemberId[];
}

export interface ParsedReceipt {
  merchant: string;
  items: Omit<ReceiptItem, "assignees">[];
  serviceChargeCents: Cents;
  gstCents: Cents;
  /** Total printed on the receipt; used for reconciliation (US-04). */
  detectedTotalCents: Cents;
  /** 0..1 model confidence; low values should prompt a manual check. */
  confidence: number;
}

/* ------------------------------ Mock bank ------------------------------ */

export interface CardTransaction {
  id: string;
  ownerId: MemberId;
  merchant: string;
  amountCents: Cents;
  date: ISODate;
  cardLabel: string;
}

export interface Notification {
  id: string;
  toId: MemberId;
  title: string;
  body: string;
  createdAt: ISODate;
  read: boolean;
  /** Deep link inside the app only. Never an external URL (US-19). */
  route?: string;
}
