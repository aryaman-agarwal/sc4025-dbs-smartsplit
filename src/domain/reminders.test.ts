import { describe, expect, it } from "vitest";
import { isReminderDue } from "./reminders";

const base = { debtSince: "2026-11-01T00:00:00Z", remindersSent: 0, optedOut: false };

describe("US-19: friendly payment reminders", () => {
  it("waits 48 hours before the first reminder", () => {
    expect(isReminderDue(base, "2026-11-02T23:00:00Z")).toBe(false);
    expect(isReminderDue(base, "2026-11-03T00:00:00Z")).toBe(true);
  });

  it("sends at most one every 3 days", () => {
    const s = { ...base, remindersSent: 1, lastReminderAt: "2026-11-03T00:00:00Z" };
    expect(isReminderDue(s, "2026-11-05T23:00:00Z")).toBe(false);
    expect(isReminderDue(s, "2026-11-06T00:00:00Z")).toBe(true);
  });

  it("stops after three reminders or when switched off", () => {
    expect(isReminderDue({ ...base, remindersSent: 3 }, "2026-12-01T00:00:00Z")).toBe(false);
    expect(isReminderDue({ ...base, optedOut: true }, "2026-12-01T00:00:00Z")).toBe(false);
  });
});
