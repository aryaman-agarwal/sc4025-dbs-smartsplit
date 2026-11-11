import { ArrowRightLeft, Plus, Receipt, PiggyBank as VaultIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, PositionLabel, Screen, SectionTitle } from "../components/ui";
import { useGroupView, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/** Group home: position, members, actions and the shared ledger (US-03, US-19). */
export function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { id: me } = useMe();
  const view = useGroupView(groupId);
  const members = useAppStore((s) => s.members);
  const optedOut = useAppStore((s) => !!s.reminderOptOut[`${groupId}:${me}`]);
  const setOptOut = useAppStore((s) => s.setReminderOptOut);

  if (!view) return <Screen title="Group" back="/"><Banner tone="error">Group not found.</Banner></Screen>;
  const { group, memberIds, pendingIds, myBalance, expenses, vault, vaultTotalCents } = view;

  return (
    <Screen title={group.name} back="/">
      <Card>
        <PositionLabel balance={myBalance} />
        <div className="mt-3 flex flex-wrap gap-2">
          {memberIds.map((id) => (
            <span key={id} className="flex items-center gap-1.5 rounded-full bg-surface py-0.5 pr-2.5 pl-0.5 text-xs">
              <Avatar member={members[id]} size={22} />
              {id === me ? "You" : members[id].displayName.split(" ")[0]}
            </span>
          ))}
          {pendingIds.map((id) => (
            <span key={id} className="flex items-center gap-1.5 rounded-full border border-dashed border-line py-0.5 pr-2.5 pl-0.5 text-xs text-muted">
              <Avatar member={members[id]} size={22} />
              {members[id].displayName.split(" ")[0]} · Pending
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" className="flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/groups/${group.id}/add`)}>
          <Plus size={18} /> Add
        </Button>
        <Button variant="secondary" className="flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/groups/${group.id}/settle`)}>
          <ArrowRightLeft size={18} /> Settle up
        </Button>
        <Button variant="secondary" className="flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/groups/${group.id}/vault`)}>
          <VaultIcon size={18} /> Vault
        </Button>
      </div>

      {vault && vault.status === "open" && (
        <Card onClick={() => navigate(`/groups/${group.id}/vault`)}>
          <p className="text-xs text-muted">{vault.name}</p>
          <p className="font-semibold">
            <Money cents={vaultTotalCents} /> <span className="font-normal text-muted">of <Money cents={vault.targetCents} /> reserved</span>
          </p>
        </Card>
      )}

      <SectionTitle>Activity</SectionTitle>
      {expenses.length === 0 && <Banner>No expenses yet. Tap Add to split your first bill.</Banner>}
      {expenses.map((e) => (
        <Card key={e.id} className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface">
            {e.source === "vault" ? <VaultIcon size={18} /> : <Receipt size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{e.title}</p>
            <p className="text-xs text-muted">
              {e.payerId === me ? "You" : members[e.payerId].displayName.split(" ")[0]} paid <Money cents={e.totalCents} /> ·{" "}
              {new Date(e.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="text-muted">Your share</p>
            <Money cents={e.shares[me] ?? 0} className="font-semibold" />
          </div>
        </Card>
      ))}

      <label className="mt-2 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
        <span>
          Payment reminders for me
          <span className="block text-xs text-muted">Sent in-app only. Never by SMS or with links.</span>
        </span>
        <input type="checkbox" className="h-5 w-5 accent-brand" checked={!optedOut} onChange={(ev) => setOptOut(group.id, !ev.target.checked)} />
      </label>
    </Screen>
  );
}
