import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CONFIG } from "../domain/config";
import { isReminderDue } from "../domain/reminders";
import { netBalances, simplifyDebts } from "../domain/settlement";
import type {
  CardTransaction,
  Cents,
  Expense,
  ExpenseSource,
  Group,
  ISODate,
  Member,
  MemberId,
  Notification,
  Payment,
  SpendKind,
  TierConfig,
  Vault,
  VaultSpend,
} from "../domain/types";
import * as V from "../domain/vault";
import { formatSGD } from "../domain/money";
import { MEMBERS, STARTING_BALANCES, buildSeed } from "../data/seed";
import { sendPayNow } from "../services/payNow";

/**
 * Single in-memory "bank" for the demo, persisted to localStorage so a page
 * refresh keeps state. Business rules live in src/domain; this store only
 * wires them together, keeps balances in sync and sends notifications.
 *
 * Actions that can fail return { ok, error } so screens can show the exact
 * acceptance-criteria message.
 */

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): ActionResult<T> => ({ ok: true, value });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

export interface Account {
  bankCents: Cents;
  paylahCents: Cents;
}

interface ReminderLog {
  sent: number;
  lastAt?: ISODate;
}

export interface AppState {
  currentUserId: MemberId;
  /** Demo clock: hours added to real time so we can show reminders, expiry and cooling-off. */
  clockOffsetHours: number;
  members: Record<MemberId, Member>;
  accounts: Record<MemberId, Account>;
  groups: Group[];
  expenses: Expense[];
  payments: Payment[];
  vaults: Vault[];
  spends: VaultSpend[];
  cardTxns: CardTransaction[];
  notifications: Notification[];
  /** key `${groupId}:${fromId}->${toId}` */
  reminderLog: Record<string, ReminderLog>;
  /** key `${groupId}:${memberId}` = true when that member switched reminders off */
  reminderOptOut: Record<string, boolean>;
  /** Payees each member has paid before, for the first-time payee warning (US-15). */
  knownPayees: Record<MemberId, MemberId[]>;

  // demo controls
  now: () => ISODate;
  switchUser: (id: MemberId) => void;
  advanceClock: (hours: number) => void;
  resetDemo: () => void;

  // groups (US-01, US-02)
  createGroup: (name: string, inviteeIds: MemberId[]) => ActionResult<string>;
  respondToInvite: (groupId: string, accept: boolean) => void;

  // expenses (US-04 to US-07)
  addExpense: (input: {
    groupId: string;
    title: string;
    totalCents: Cents;
    shares: Record<MemberId, Cents>;
    source: ExpenseSource;
    cardTxnId?: string;
  }) => ActionResult<string>;

  // settlement (US-15 to US-17)
  pay: (groupId: string, toId: MemberId, amountCents: Cents, source: "paylah" | "bank") => Promise<ActionResult<Payment>>;
  settleAll: (groupId: string, source: "paylah" | "bank") => Promise<ActionResult<Payment[]>>;
  setLastSource: (source: "paylah" | "bank") => void;
  lastSource: Record<MemberId, "paylah" | "bank">;

  // reminders (US-19)
  runReminders: () => void;
  setReminderOptOut: (groupId: string, optedOut: boolean) => void;

  // vault (US-09 to US-14, US-20, US-21)
  createVault: (input: { groupId: string; name: string; targetCents: Cents; endDate: ISODate; tiers?: Partial<TierConfig> }) => ActionResult<string>;
  reserve: (vaultId: string, amountCents: Cents) => ActionResult<undefined>;
  requestSpend: (vaultId: string, input: { kind: SpendKind; merchant: string; amountCents: Cents }) => ActionResult<VaultSpend>;
  approveSpend: (spendId: string) => ActionResult<VaultSpend>;
  rejectSpend: (spendId: string) => ActionResult<VaultSpend>;
  expireStaleSpends: () => void;
  closeVault: (vaultId: string) => ActionResult<undefined>;

  markAllRead: () => void;
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function initialData() {
  const seed = buildSeed();
  return {
    currentUserId: "cal" as MemberId,
    clockOffsetHours: 0,
    members: MEMBERS,
    accounts: structuredClone(STARTING_BALANCES),
    groups: seed.groups,
    expenses: seed.expenses,
    payments: [] as Payment[],
    vaults: [] as Vault[],
    spends: [] as VaultSpend[],
    cardTxns: seed.cardTxns,
    notifications: [] as Notification[],
    reminderLog: {} as Record<string, ReminderLog>,
    reminderOptOut: {} as Record<string, boolean>,
    knownPayees: {} as Record<MemberId, MemberId[]>,
    lastSource: {} as Record<MemberId, "paylah" | "bank">,
  };
}

export const acceptedMemberIds = (g: Group): MemberId[] =>
  Object.entries(g.members).filter(([, m]) => m.status === "accepted").map(([id]) => id);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const notify = (toIds: MemberId[], title: string, body: string, route?: string) => {
        const createdAt = get().now();
        const items: Notification[] = toIds.map((toId) => ({ id: uid("n"), toId, title, body, route, createdAt, read: false }));
        set((s) => ({ notifications: [...items, ...s.notifications] }));
      };
      const groupOf = (id: string) => get().groups.find((g) => g.id === id);
      const vaultOf = (id: string) => get().vaults.find((v) => v.id === id);
      const name = (id: MemberId) => get().members[id]?.displayName.split(" ")[0] ?? id;

      /** Apply an executed spend: update vault, debit reserved money, log it in the ledger. */
      const commitExecutedSpend = (vault: Vault, spend: VaultSpend) => {
        const res = V.executeSpend(vault, spend);
        if (!res.ok) return res;
        const { vault: newVault, spend: done } = res.value;
        const group = groupOf(vault.groupId)!;
        const expense: Expense = {
          id: uid("e"),
          groupId: vault.groupId,
          title: `${done.merchant} (from ${vault.name})`,
          payerId: done.requesterId,
          totalCents: done.amountCents,
          shares: done.draws!,
          source: "vault",
          createdAt: get().now(),
        };
        // Reserved money was already removed from available balance at reserve time,
        // so executing only reduces the reservation. A claim (US-21) pays the
        // requester back for their card payment.
        set((s) => {
          const accounts = { ...s.accounts };
          if (done.kind === "claim") {
            const a = accounts[done.requesterId];
            accounts[done.requesterId] = { ...a, bankCents: a.bankCents + done.amountCents };
          }
          return {
            accounts,
            vaults: s.vaults.map((v) => (v.id === newVault.id ? newVault : v)),
            spends: s.spends.map((x) => (x.id === done.id ? done : x)),
            expenses: [...s.expenses, expense],
          };
        });
        notify(
          acceptedMemberIds(group),
          `${formatSGD(done.amountCents)} spent from ${vault.name}`,
          `${name(done.requesterId)} · ${done.merchant}. Drawn from everyone's reserve in proportion.`,
          `/groups/${vault.groupId}/vault`,
        );
        if (V.shouldSendLowAlert(newVault)) {
          set((s) => ({ vaults: s.vaults.map((v) => (v.id === newVault.id ? { ...v, lowAlertSent: true } : v)) }));
          notify(acceptedMemberIds(group), `${vault.name} is running low`, `Less than 20% of the target is left.`, `/groups/${vault.groupId}/vault`);
        }
        return { ok: true as const, value: done };
      };

      return {
        ...initialData(),

        now: () => new Date(Date.now() + get().clockOffsetHours * 3_600_000).toISOString(),
        switchUser: (id) => set({ currentUserId: id }),
        advanceClock: (hours) => {
          set((s) => ({ clockOffsetHours: s.clockOffsetHours + hours }));
          get().expireStaleSpends();
          get().runReminders();
        },
        resetDemo: () => set(initialData()),

        createGroup: (groupName, inviteeIds) => {
          const me = get().currentUserId;
          const trimmed = groupName.trim();
          if (trimmed.length < 1 || trimmed.length > CONFIG.groupNameMaxLength) {
            return fail(`Group name must be 1–${CONFIG.groupNameMaxLength} characters.`);
          }
          const invitees = inviteeIds.filter((id) => id !== me);
          if (invitees.length === 0) return fail("Add at least one member.");
          if (invitees.some((id) => !get().members[id]?.isDbsCustomer)) {
            return fail("Only DBS/POSB customers can join in this version.");
          }
          if (invitees.length + 1 > CONFIG.maxGroupMembers) return fail(`Groups can have up to ${CONFIG.maxGroupMembers} members.`);
          const id = uid("g");
          const now = get().now();
          const group: Group = {
            id,
            name: trimmed,
            createdBy: me,
            createdAt: now,
            members: {
              [me]: { status: "accepted", joinedAt: now },
              ...Object.fromEntries(invitees.map((i) => [i, { status: "pending" as const }])),
            },
          };
          set((s) => ({ groups: [...s.groups, group] }));
          notify(invitees, `${name(me)} invited you to ${trimmed}`, "Accept to start splitting with the group.", `/groups/${id}`);
          return ok(id);
        },

        respondToInvite: (groupId, accept) => {
          const me = get().currentUserId;
          const now = get().now();
          set((s) => ({
            groups: s.groups.map((g) => {
              if (g.id !== groupId) return g;
              const members = { ...g.members };
              if (accept) members[me] = { status: "accepted", joinedAt: now };
              else delete members[me];
              return { ...g, members };
            }),
          }));
        },

        addExpense: (input) => {
          const me = get().currentUserId;
          const group = groupOf(input.groupId);
          if (!group) return fail("Group not found.");
          if (input.totalCents <= 0) return fail("Amount must be more than $0.");
          if (input.totalCents > CONFIG.maxExpenseCents) return fail(`Expenses are limited to ${formatSGD(CONFIG.maxExpenseCents)} in this version.`);
          const shareSum = Object.values(input.shares).reduce((a, b) => a + b, 0);
          if (shareSum !== input.totalCents) return fail("Shares must add up to the total.");
          const accepted = new Set(acceptedMemberIds(group));
          if (Object.keys(input.shares).some((id) => !accepted.has(id))) return fail("Splits can only include members who have joined.");
          if (input.cardTxnId) {
            const dup = get().expenses.find((e) => e.cardTxnId === input.cardTxnId);
            if (dup) return fail(`Already added on ${new Date(dup.createdAt).toLocaleDateString("en-SG")}.`);
          }
          const expense: Expense = { id: uid("e"), payerId: me, createdAt: get().now(), ...input };
          set((s) => ({ expenses: [...s.expenses, expense] }));
          const others = Object.keys(input.shares).filter((id) => id !== me && input.shares[id] > 0);
          notify(others, `${name(me)} added "${input.title}"`, `Your share is ready to settle in ${group.name}.`, `/groups/${group.id}`);
          return ok(expense.id);
        },

        setLastSource: (source) => set((s) => ({ lastSource: { ...s.lastSource, [s.currentUserId]: source } })),

        pay: async (groupId, toId, amountCents, source) => {
          const me = get().currentUserId;
          const acct = get().accounts[me];
          const available = source === "paylah" ? acct.paylahCents : acct.bankCents;
          const result = await sendPayNow({ fromId: me, toId, amountCents, source, availableCents: available });
          const payment: Payment = {
            id: uid("p"),
            groupId,
            fromId: me,
            toId,
            amountCents,
            source,
            status: result.ok ? "success" : "failed",
            createdAt: get().now(),
          };
          set((s) => ({ payments: [...s.payments, payment], lastSource: { ...s.lastSource, [me]: source } }));
          if (!result.ok) return fail(result.error);

          set((s) => {
            const accounts = { ...s.accounts };
            const from = accounts[me];
            accounts[me] = source === "paylah" ? { ...from, paylahCents: from.paylahCents - amountCents } : { ...from, bankCents: from.bankCents - amountCents };
            accounts[toId] = { ...accounts[toId], bankCents: accounts[toId].bankCents + amountCents };
            const known = new Set(s.knownPayees[me] ?? []);
            known.add(toId);
            return { accounts, knownPayees: { ...s.knownPayees, [me]: [...known] } };
          });
          notify([toId], `${name(me)} paid you ${formatSGD(amountCents)}`, `Settled in ${groupOf(groupId)?.name ?? "your group"}.`, `/groups/${groupId}`);
          return ok(payment);
        },

        settleAll: async (groupId, source) => {
          const me = get().currentUserId;
          const s = get();
          const group = groupOf(groupId);
          if (!group) return fail("Group not found.");
          const ids = acceptedMemberIds(group);
          const transfers = simplifyDebts(
            netBalances(ids, s.expenses.filter((e) => e.groupId === groupId), s.payments.filter((p) => p.groupId === groupId)),
          ).filter((t) => t.fromId === me);
          if (transfers.length === 0) return fail("You don't owe anyone in this group.");
          const done: Payment[] = [];
          // US-17: one failure doesn't stop the others; the open one stays flagged.
          for (const t of transfers) {
            const r = await get().pay(groupId, t.toId, t.amountCents, source);
            if (r.ok) done.push(r.value);
          }
          return ok(done);
        },

        runReminders: () => {
          const s = get();
          const now = s.now();
          const log = { ...s.reminderLog };
          for (const group of s.groups) {
            const ids = acceptedMemberIds(group);
            const exps = s.expenses.filter((e) => e.groupId === group.id && e.source !== "vault");
            if (exps.length === 0) continue;
            const transfers = simplifyDebts(netBalances(ids, exps, s.payments.filter((p) => p.groupId === group.id)));
            for (const t of transfers) {
              const key = `${group.id}:${t.fromId}->${t.toId}`;
              // Debt age: the oldest expense the debtor is part of in this group.
              const since = exps.filter((e) => (e.shares[t.fromId] ?? 0) > 0).map((e) => e.createdAt).sort()[0];
              if (!since) continue;
              const entry = log[key] ?? { sent: 0 };
              const due = isReminderDue(
                { debtSince: since, remindersSent: entry.sent, lastReminderAt: entry.lastAt, optedOut: !!s.reminderOptOut[`${group.id}:${t.fromId}`] },
                now,
              );
              if (!due) continue;
              log[key] = { sent: entry.sent + 1, lastAt: now };
              notify(
                [t.fromId],
                `Friendly reminder from DBS`,
                `You owe ${name(t.toId)} ${formatSGD(t.amountCents)} for ${group.name}. Settle in one tap.`,
                `/groups/${group.id}/settle`,
              );
            }
          }
          set({ reminderLog: log });
        },

        setReminderOptOut: (groupId, optedOut) =>
          set((s) => ({ reminderOptOut: { ...s.reminderOptOut, [`${groupId}:${s.currentUserId}`]: optedOut } })),

        createVault: ({ groupId, name: vaultName, targetCents, endDate, tiers }) => {
          const me = get().currentUserId;
          const group = groupOf(groupId);
          if (!group) return fail("Group not found.");
          if (get().vaults.some((v) => v.groupId === groupId && v.status === "open")) return fail("This group already has an open vault.");
          const r = V.createVault({ id: uid("v"), groupId, name: vaultName, targetCents, endDate, adminId: me, now: get().now(), tiers });
          if (!r.ok) return r;
          set((s) => ({ vaults: [...s.vaults, r.value] }));
          notify(
            acceptedMemberIds(group).filter((id) => id !== me),
            `${name(me)} created ${r.value.name}`,
            `Reserve your share. It stays in your own account until the group spends it.`,
            `/groups/${groupId}/vault`,
          );
          return ok(r.value.id);
        },

        reserve: (vaultId, amountCents) => {
          const me = get().currentUserId;
          const vault = vaultOf(vaultId);
          if (!vault) return fail("Vault not found.");
          const acct = get().accounts[me];
          const r = V.reserve(vault, me, amountCents, acct.bankCents);
          if (!r.ok) return r;
          set((s) => ({
            vaults: s.vaults.map((v) => (v.id === vaultId ? r.value : v)),
            accounts: { ...s.accounts, [me]: { ...acct, bankCents: acct.bankCents - amountCents } },
          }));
          const group = groupOf(vault.groupId)!;
          notify(acceptedMemberIds(group), `${name(me)} reserved ${formatSGD(amountCents)}`, `${vault.name} now has ${formatSGD(V.vaultTotal(r.value))}.`, `/groups/${vault.groupId}/vault`);
          return ok(undefined);
        },

        requestSpend: (vaultId, { kind, merchant, amountCents }) => {
          const me = get().currentUserId;
          const vault = vaultOf(vaultId);
          if (!vault) return fail("Vault not found.");
          const group = groupOf(vault.groupId)!;
          const joinedAt = group.members[me]?.joinedAt;
          if (!joinedAt) return fail("Only group members can spend from the vault.");
          const r = V.requestSpend(vault, {
            id: uid("s"),
            kind,
            requesterId: me,
            requesterJoinedAt: joinedAt,
            merchant,
            amount: amountCents,
            memberCount: acceptedMemberIds(group).length,
            now: get().now(),
          });
          if (!r.ok) return r;
          set((s) => ({ spends: [...s.spends, r.value] }));
          if (V.isApproved(r.value)) return commitExecutedSpend(vault, r.value);
          notify(
            acceptedMemberIds(group).filter((id) => id !== me),
            `Approve ${formatSGD(amountCents)} from ${vault.name}?`,
            `${name(me)} wants to ${kind === "pay" ? "pay" : "claim back"} ${r.value.merchant}. Needs ${r.value.approvalsRequired} approval(s).`,
            `/groups/${vault.groupId}/vault`,
          );
          return ok(r.value);
        },

        approveSpend: (spendId) => {
          const me = get().currentUserId;
          const spend = get().spends.find((x) => x.id === spendId);
          if (!spend) return fail("Request not found.");
          const r = V.approveSpend(V.expireIfStale(spend, get().now()), me);
          if (!r.ok) return r;
          set((s) => ({ spends: s.spends.map((x) => (x.id === spendId ? r.value : x)) }));
          if (V.isApproved(r.value)) return commitExecutedSpend(vaultOf(spend.vaultId)!, r.value);
          return ok(r.value);
        },

        rejectSpend: (spendId) => {
          const me = get().currentUserId;
          const spend = get().spends.find((x) => x.id === spendId);
          if (!spend) return fail("Request not found.");
          const vault = vaultOf(spend.vaultId)!;
          const group = groupOf(vault.groupId)!;
          const r = V.rejectSpend(spend, me, acceptedMemberIds(group).length);
          if (!r.ok) return r;
          set((s) => ({ spends: s.spends.map((x) => (x.id === spendId ? r.value : x)) }));
          if (r.value.status === "rejected") {
            notify([spend.requesterId], `Request declined`, `${formatSGD(spend.amountCents)} for ${spend.merchant} wasn't approved. Nothing was spent.`, `/groups/${vault.groupId}/vault`);
          }
          return ok(r.value);
        },

        expireStaleSpends: () => {
          const now = get().now();
          const before = get().spends;
          const after = before.map((x) => V.expireIfStale(x, now));
          const expired = after.filter((x, i) => x.status === "expired" && before[i].status === "pending");
          if (expired.length === 0) return;
          set({ spends: after });
          for (const x of expired) notify([x.requesterId], "Request expired", `${x.merchant} wasn't approved within 24 hours and was cancelled.`);
        },

        closeVault: (vaultId) => {
          const me = get().currentUserId;
          const vault = vaultOf(vaultId);
          if (!vault) return fail("Vault not found.");
          if (vault.adminId !== me) return fail("Only the vault admin can close it.");
          const { vault: closed, released } = V.closeVault(vault);
          set((s) => {
            const accounts = { ...s.accounts };
            for (const [id, amt] of Object.entries(released)) accounts[id] = { ...accounts[id], bankCents: accounts[id].bankCents + amt };
            return { accounts, vaults: s.vaults.map((v) => (v.id === vaultId ? closed : v)) };
          });
          for (const [id, amt] of Object.entries(released)) {
            notify([id], `${vault.name} closed`, `${formatSGD(amt)} was released back to your available balance.`);
          }
          return ok(undefined);
        },

        markAllRead: () =>
          set((s) => ({ notifications: s.notifications.map((n) => (n.toId === s.currentUserId ? { ...n, read: true } : n)) })),
      };
    },
    {
      name: "smartsplit-demo-v1",
      storage: createJSONStorage(() => localStorage),
      // Persist data only, not functions.
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")),
    },
  ),
);
