import type { Cents, MemberId } from "../domain/types";

/**
 * Simulated PayNow / PayLah! rail (US-15, US-16).
 * Non-goal for the MVP: no real money moves and no live DBS APIs are called.
 * Every screen that uses this must show "Demo — no real money moved".
 */
export interface PayNowRequest {
  fromId: MemberId;
  toId: MemberId;
  amountCents: Cents;
  source: "paylah" | "bank";
  availableCents: Cents;
}

export type PayNowResult = { ok: true; reference: string } | { ok: false; error: string };

/** Set to a number between 0 and 1 to randomly fail payments when demoing error states. */
export const demoSettings = { failureRate: 0, latencyMs: 900 };

export async function sendPayNow(req: PayNowRequest): Promise<PayNowResult> {
  await new Promise((r) => setTimeout(r, demoSettings.latencyMs));
  if (req.amountCents > req.availableCents) {
    return { ok: false, error: "Not enough balance. You were not charged." };
  }
  if (Math.random() < demoSettings.failureRate) {
    return { ok: false, error: "Payment didn't go through. You were not charged." };
  }
  return { ok: true, reference: `DEMO-${Date.now().toString(36).toUpperCase()}` };
}
