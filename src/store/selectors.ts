import { useMemo } from "react";
import { CONFIG } from "../domain/config";
import { rawDebtCount, netBalances, simplifyDebts } from "../domain/settlement";
import { vaultTotal } from "../domain/vault";
import { acceptedMemberIds, useAppStore } from "./useAppStore";

/**
 * Read-only hooks for screens. Each picks raw slices from the store (stable
 * references) and derives values with useMemo. Don't return new objects from
 * a zustand selector directly: it re-renders forever in zustand v5.
 */

export function useMe() {
  const id = useAppStore((s) => s.currentUserId);
  const member = useAppStore((s) => s.members[id]);
  const account = useAppStore((s) => s.accounts[id]);
  return { id, member, account };
}

export function useMyGroups() {
  const me = useAppStore((s) => s.currentUserId);
  const groups = useAppStore((s) => s.groups);
  return useMemo(() => groups.filter((g) => g.members[me]), [groups, me]);
}

export function useGroupView(groupId: string | undefined) {
  const me = useAppStore((s) => s.currentUserId);
  const groups = useAppStore((s) => s.groups);
  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const vaults = useAppStore((s) => s.vaults);

  return useMemo(() => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return undefined;
    const memberIds = acceptedMemberIds(group);
    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    const groupPayments = payments.filter((p) => p.groupId === group.id);
    const balances = netBalances(memberIds, groupExpenses, groupPayments);
    const transfers = simplifyDebts(balances);
    const vault = vaults.find((v) => v.groupId === group.id && v.status === "open") ?? vaults.filter((v) => v.groupId === group.id).at(-1);
    return {
      group,
      memberIds,
      pendingIds: Object.keys(group.members).filter((id) => group.members[id].status === "pending"),
      myStatus: group.members[me]?.status,
      expenses: [...groupExpenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      payments: groupPayments,
      /** Positive = I am owed; negative = I owe. */
      myBalance: balances[me] ?? 0,
      balances,
      transfers,
      rawDebts: rawDebtCount(groupExpenses),
      vault,
      vaultTotalCents: vault ? vaultTotal(vault) : 0,
    };
  }, [groups, expenses, payments, vaults, groupId, me]);
}

export function useVaultSpends(vaultId: string | undefined) {
  const spends = useAppStore((s) => s.spends);
  return useMemo(
    () => spends.filter((x) => x.vaultId === vaultId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [spends, vaultId],
  );
}

/** US-07: the current user's DBS card transactions from the last 30 days, newest first. */
export function useImportableCardTxns() {
  const me = useAppStore((s) => s.currentUserId);
  const txns = useAppStore((s) => s.cardTxns);
  const expenses = useAppStore((s) => s.expenses);
  const nowFn = useAppStore((s) => s.now);
  return useMemo(() => {
    const cutoff = Date.parse(nowFn()) - CONFIG.cardImportDays * 86_400_000;
    const added = new Map(expenses.filter((e) => e.cardTxnId).map((e) => [e.cardTxnId!, e.createdAt]));
    return txns
      .filter((t) => t.ownerId === me && Date.parse(t.date) >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({ ...t, alreadyAddedOn: added.get(t.id) }));
  }, [me, txns, expenses, nowFn]);
}

export function useMyNotifications() {
  const me = useAppStore((s) => s.currentUserId);
  const all = useAppStore((s) => s.notifications);
  return useMemo(() => all.filter((n) => n.toId === me), [all, me]);
}

export function useIsFirstTimePayee(payeeId: string) {
  const me = useAppStore((s) => s.currentUserId);
  const known = useAppStore((s) => s.knownPayees[me]);
  return !(known ?? []).includes(payeeId);
}
