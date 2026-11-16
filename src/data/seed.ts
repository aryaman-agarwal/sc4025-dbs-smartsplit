import type { CardTransaction, Expense, Group, Member, MemberId } from "../domain/types";

/**
 * Demo data shared by the report, the video and the tests (PRD Table 20):
 * Sarah, Ben and Marcus on "Bali Trip 2026". Dates are generated relative to
 * "now" so the 30-day card import window and 48-hour reminders always work.
 */

export const MEMBERS: Record<MemberId, Member> = {
  sarah: { id: "sarah", displayName: "Sarah Tan", maskedName: "SARAH T** L**", isDbsCustomer: true, avatarColor: "#E11D48" },
  ben: { id: "ben", displayName: "Ben Ong", maskedName: "BEN O** W**", isDbsCustomer: true, avatarColor: "#2563EB" },
  marcus: { id: "marcus", displayName: "Marcus Lim", maskedName: "MARCUS L** K**", isDbsCustomer: true, avatarColor: "#047857" },
  dee: { id: "dee", displayName: "Dee Kumar", maskedName: "DEE K** R**", isDbsCustomer: true, avatarColor: "#B45309" },
  eve: { id: "eve", displayName: "Eve Chua", maskedName: "EVE C** H**", isDbsCustomer: false, avatarColor: "#7C3AED" },
};

/** People the demo user can invite. Eve is not a DBS customer (US-01 error state). */
export const CONTACTS: MemberId[] = ["sarah", "ben", "marcus", "dee", "eve"];

export const STARTING_BALANCES: Record<MemberId, { bankCents: number; paylahCents: number }> = {
  sarah: { bankCents: 320000, paylahCents: 15000 },
  ben: { bankCents: 180000, paylahCents: 8000 },
  marcus: { bankCents: 95000, paylahCents: 4000 },
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
      createdBy: "sarah",
      createdAt: daysAgo(now, 20),
      members: {
        sarah: { status: "accepted", joinedAt: daysAgo(now, 20) },
        ben: { status: "accepted", joinedAt: daysAgo(now, 20) },
        marcus: { status: "accepted", joinedAt: daysAgo(now, 19) },
      },
    },
    {
      id: "g-flat",
      name: "Flat 07-12",
      createdBy: "marcus",
      createdAt: daysAgo(now, 2),
      members: {
        marcus: { status: "accepted", joinedAt: daysAgo(now, 2) },
        dee: { status: "accepted", joinedAt: daysAgo(now, 2) },
        ben: { status: "pending" },
      },
    },
  ];

  // PRD 5.3 worked example: Sarah pays the villa ($300), Ben pays dinner ($90).
  const expenses: Expense[] = [
    {
      id: "e-villa",
      groupId: "g-bali",
      title: "Villa deposit",
      payerId: "sarah",
      totalCents: 30000,
      shares: { sarah: 10000, ben: 10000, marcus: 10000 },
      source: "card",
      createdAt: daysAgo(now, 4),
      cardTxnId: "t-sarah-villa",
    },
    {
      id: "e-dinner",
      groupId: "g-bali",
      title: "Planning dinner",
      payerId: "ben",
      totalCents: 9000,
      shares: { sarah: 3000, ben: 3000, marcus: 3000 },
      source: "manual",
      createdAt: daysAgo(now, 3),
    },
    {
      id: "e-groceries",
      groupId: "g-flat",
      title: "FairPrice groceries",
      payerId: "dee",
      totalCents: 6420,
      shares: { marcus: 3210, dee: 3210 },
      source: "manual",
      createdAt: daysAgo(now, 1),
    },
  ];

  const cardTxns: CardTransaction[] = [
    { id: "t-sarah-villa", ownerId: "sarah", merchant: "AIRBNB * VILLA UBUD", amountCents: 30000, date: daysAgo(now, 4, 14), cardLabel: "DBS Altitude ··4821" },
    { id: "t-sarah-1", ownerId: "sarah", merchant: "JUMBO SEAFOOD RIVERSIDE", amountCents: 20503, date: daysAgo(now, 1), cardLabel: "DBS Altitude ··4821" },
    { id: "t-sarah-2", ownerId: "sarah", merchant: "GRAB *RIDES", amountCents: 2380, date: daysAgo(now, 2, 23), cardLabel: "DBS Live Fresh ··1180" },
    { id: "t-sarah-3", ownerId: "sarah", merchant: "SCOOT TIGERAIR", amountCents: 64500, date: daysAgo(now, 9, 10), cardLabel: "DBS Altitude ··4821" },
    { id: "t-sarah-old", ownerId: "sarah", merchant: "UNIQLO ION", amountCents: 8990, date: daysAgo(now, 45, 15), cardLabel: "DBS Live Fresh ··1180" },
    { id: "t-ben-1", ownerId: "ben", merchant: "KLOOK TRAVEL", amountCents: 18600, date: daysAgo(now, 5, 11), cardLabel: "POSB Everyday ··3309" },
    { id: "t-ben-2", ownerId: "ben", merchant: "PRATA HOUSE JURONG", amountCents: 2554, date: daysAgo(now, 0, 1), cardLabel: "POSB Everyday ··3309" },
    { id: "t-marcus-1", ownerId: "marcus", merchant: "GIANT TAMPINES", amountCents: 7845, date: daysAgo(now, 1, 18), cardLabel: "DBS Visa Debit ··7744" },
    { id: "t-marcus-2", ownerId: "marcus", merchant: "SP SERVICES", amountCents: 21410, date: daysAgo(now, 6, 9), cardLabel: "DBS Visa Debit ··7744" },
  ];

  return { groups, expenses, cardTxns };
}
