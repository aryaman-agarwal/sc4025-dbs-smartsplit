import { CONFIG } from "./config";
import type { ISODate } from "./types";

export interface ReminderState {
  /** When the debt first appeared (the expense was added). */
  debtSince: ISODate;
  remindersSent: number;
  lastReminderAt?: ISODate;
  /** The payer can switch reminders off per group (US-19). */
  optedOut: boolean;
}

const HOUR = 3_600_000;

/**
 * US-19: app-sent reminders, never by the person who is owed.
 * - First reminder once a debt is 48 hours old.
 * - At most one every 3 days, three in total.
 * - Delivered in-app/push only, never by SMS or with external links.
 */
export function isReminderDue(state: ReminderState, now: ISODate): boolean {
  if (state.optedOut || state.remindersSent >= CONFIG.reminderMaxCount) return false;
  const ageHours = (Date.parse(now) - Date.parse(state.debtSince)) / HOUR;
  if (ageHours < CONFIG.reminderFirstAfterHours) return false;
  if (!state.lastReminderAt) return true;
  const sinceLast = (Date.parse(now) - Date.parse(state.lastReminderAt)) / HOUR;
  return sinceLast >= CONFIG.reminderMinGapHours;
}
