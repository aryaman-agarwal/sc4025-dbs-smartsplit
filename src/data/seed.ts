import type { CardTransaction, Expense, Group, Member, MemberId } from "../domain/types";

/**
 * Demo data shared by the report, the video and the tests (PRD Table 20):
 * Amy, Ben and Cal on "Bali Trip 2026". Dates are generated relative to
 * "now" so the 30-day card import window and 48-hour reminders always work.
 */

export const MEMBERS: Record<MemberId, Member> = {
  amy: { id: "amy", displayName: "Amy Tan", maskedName: "AMY T** L**", isDbsCustomer: true, avatarColor: "#E11D48" },
  ben: { id: "ben", displayName: "Ben Ong", maskedName: "BEN O** W**", isDbsCustomer: true, avatarColor: "#2563EB" },
  cal: { id: "cal", displayName: "Cal Lim", maskedName: "CAL L** K**", isDbsCustomer: true, avatarColor: "#059669" },
  dee: { id: "dee", displayName: "Dee Kumar", maskedName: "DEE K** R**", isDbsCustomer: true, avatarColor: "#D97706" },
  eve: { id: "eve", displayName: "Eve Chua", maskedName: "EVE C** H**", isDbsCustomer: false, avatarColor: "#7C3AED" },
};

/** People the demo user can invite. Eve is not a DBS customer (US-01 error state). */
export const CONTACTS: MemberId[] = ["amy", "ben", "cal", "dee", "eve"];

export const STARTING_BALANCES: Record<MemberId, { bankCents: number; paylahCents: number }> = {
  amy: { bankCents: 320000, paylahCents: 15000 },
  ben: { bankCents: 180000, paylahCents: 8000 },
  cal: { bankCents: 95000, paylahCents: 4000 },
  dee: { bankCents: 210000, paylahCents: 2000 },
  eve: { bankCents: 0, paylahCents: 0 },
};

const daysAgo = (now: number, d: number, hour = 20) => {
  const t = new Date(now - d * 86_400_000);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

export function buildSeed(now = Date.now()) {
  const groups: Group[] = [
    {
      id: "g-bali",
      name: "Bali Trip 2026",
      createdBy: "amy",
      createdAt: daysAgo(now, 20),
      members: {
        amy: { status: "accepted", joinedAt: daysAgo(now, 20) },
        ben: { status: "accepted", joinedAt: daysAgo(now, 20) },
        cal: { status: "accepted", joinedAt: daysAgo(now, 19) },
      },
    },
    {
      id: "g-flat",
      name: "Flat 07-12",
      createdBy: "cal",
      createdAt: daysAgo(now, 2),
      members: {
        cal: { status: "accepted", joinedAt: daysAgo(now, 2) },
        dee: { status: "accepted", joinedAt: daysAgo(now, 2) },
        ben: { status: "pending" },
      },
    },
  ];

  // PRD 5.3 worked example: Amy pays the villa ($300), Ben pays dinner ($90).
  const expenses: Expense[] = [
    {
      id: "e-villa",
      groupId: "g-bali",
      title: "Villa deposit",
      payerId: "amy",
      totalCents: 30000,
      shares: { amy: 10000, ben: 10000, cal: 10000 },
      source: "card",
      createdAt: daysAgo(now, 4),
      cardTxnId: "t-amy-villa",
    },
    {
      id: "e-dinner",
      groupId: "g-bali",
      title: "Planning dinner",
      payerId: "ben",
      totalCents: 9000,
      shares: { amy: 3000, ben: 3000, cal: 3000 },
      source: "manual",
      createdAt: daysAgo(now, 3),
    },
    {
      id: "e-groceries",
      groupId: "g-flat",
      title: "FairPrice groceries",
      payerId: "dee",
      totalCents: 6420,
      shares: { cal: 3210, dee: 3210 },
      source: "manual",
      createdAt: daysAgo(now, 1),
    },
  ];

  const cardTxns: CardTransaction[] = [
    { id: "t-amy-villa", ownerId: "amy", merchant: "AIRBNB * VILLA UBUD", amountCents: 30000, date: daysAgo(now, 4, 14), cardLabel: "DBS Altitude ··4821" },
    { id: "t-amy-1", ownerId: "amy", merchant: "JUMBO SEAFOOD RIVERSIDE", amountCents: 20503, date: daysAgo(now, 1), cardLabel: "DBS Altitude ··4821" },
    { id: "t-amy-2", ownerId: "amy", merchant: "GRAB *RIDES", amountCents: 2380, date: daysAgo(now, 2, 23), cardLabel: "DBS Live Fresh ··1180" },
    { id: "t-amy-3", ownerId: "amy", merchant: "SCOOT TIGERAIR", amountCents: 64500, date: daysAgo(now, 9, 10), cardLabel: "DBS Altitude ··4821" },
    { id: "t-amy-old", ownerId: "amy", merchant: "UNIQLO ION", amountCents: 8990, date: daysAgo(now, 45, 15), cardLabel: "DBS Live Fresh ··1180" },
    { id: "t-ben-1", ownerId: "ben", merchant: "KLOOK TRAVEL", amountCents: 18600, date: daysAgo(now, 5, 11), cardLabel: "POSB Everyday ··3309" },
    { id: "t-ben-2", ownerId: "ben", merchant: "PRATA HOUSE JURONG", amountCents: 2554, date: daysAgo(now, 0, 1), cardLabel: "POSB Everyday ··3309" },
    { id: "t-cal-1", ownerId: "cal", merchant: "GIANT TAMPINES", amountCents: 7845, date: daysAgo(now, 1, 18), cardLabel: "DBS Visa Debit ··7744" },
    { id: "t-cal-2", ownerId: "cal", merchant: "SP SERVICES", amountCents: 21410, date: daysAgo(now, 6, 9), cardLabel: "DBS Visa Debit ··7744" },
  ];

  return { groups, expenses, cardTxns };
}
