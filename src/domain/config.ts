import type { TierConfig } from "./types";

/**
 * Business rules in one place so they can change without touching logic.
 * Values follow the PRD (Section 5) and are flagged there as MVP values.
 */
export const CONFIG = {
  /** US-06: GST rate is read from config, not hard-coded in the maths. */
  gstRate: 0.09,
  serviceChargeRate: 0.1,

  /** PRD 5.7 limits. */
  maxGroupMembers: 20,
  maxExpenseCents: 1_000_000,
  groupNameMaxLength: 30,

  /** US-07: card import window. */
  cardImportDays: 30,

  /** US-12: approval tiers. */
  defaultTiers: {
    smallMaxCents: 5_000,
    mediumMaxCents: 30_000,
    largeShareOfVault: 0.25,
    strictMode: false,
  } satisfies TierConfig,
  /** US-12: unapproved spends are cancelled after 24 hours. */
  approvalExpiryHours: 24,
  /** US-20 / Section 7.4: new members wait 12 hours before initiating spends. */
  newMemberCoolingOffHours: 12,
  /** US-13: one "running low" alert when total falls below 20% of target. */
  lowVaultThreshold: 0.2,

  /** US-19: reminders. */
  reminderFirstAfterHours: 48,
  reminderMinGapHours: 72,
  reminderMaxCount: 3,
} as const;
