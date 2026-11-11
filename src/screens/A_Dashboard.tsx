import { Plus, Users, PiggyBank as VaultIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, PositionLabel, Screen, SectionTitle } from "../components/ui";
import { netBalances } from "../domain/settlement";
import { vaultTotal } from "../domain/vault";
import { useMe, useMyGroups } from "../store/selectors";
import { acceptedMemberIds, useAppStore } from "../store/useAppStore";

/**
 * Screen A — Group dashboard (US-01 to US-03, US-19).
 * Reference implementation: other screens should follow this structure.
 */
export function Dashboard() {
  const navigate = useNavigate();
  const { id: me, member, account } = useMe();
  const groups = useMyGroups();
  const members = useAppStore((s) => s.members);
  const expenses = useAppStore((s) => s.expenses);
  const payments = useAppStore((s) => s.payments);
  const vaults = useAppStore((s) => s.vaults);
  const respond = useAppStore((s) => s.respondToInvite);

  const invites = groups.filter((g) => g.members[me]?.status === "pending");
  const joined = groups.filter((g) => g.members[me]?.status === "accepted");

  return (
    <Screen title="SmartSplit">
      <Card className="bg-gradient-to-br from-brand to-brand-dark text-white">
        <p className="text-sm opacity-90">Hi {member.displayName.split(" ")[0]}</p>
        <p className="mt-2 text-xs opacity-80">Available in savings account</p>
        <Money cents={account.bankCents} className="text-2xl font-bold" />
        <p className="mt-1 text-xs opacity-80">
          PayLah! wallet <Money cents={account.paylahCents} />
        </p>
      </Card>

      {invites.length > 0 && <SectionTitle>Invitations</SectionTitle>}
      {invites.map((g) => (
        <Card key={g.id}>
          <p className="font-semibold">{g.name}</p>
          <p className="text-sm text-muted">
            {members[g.createdBy].displayName} invited you. You won't be added to any split until you accept.
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => respond(g.id, true)}>
              Accept
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => respond(g.id, false)}>
              Decline
            </Button>
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <SectionTitle>Your groups</SectionTitle>
        <Button variant="ghost" className="px-2 py-1" onClick={() => navigate("/groups/new")}>
          <Plus size={16} /> New group
        </Button>
      </div>

      {joined.length === 0 && (
        <Banner>
          <Users size={16} className="mr-1 inline" /> No groups yet. Create one to start splitting.
        </Banner>
      )}

      {joined.map((g) => {
        const ids = acceptedMemberIds(g);
        const balance =
          netBalances(
            ids,
            expenses.filter((e) => e.groupId === g.id),
            payments.filter((p) => p.groupId === g.id),
          )[me] ?? 0;
        const vault = vaults.find((v) => v.groupId === g.id && v.status === "open");
        return (
          <Card key={g.id} onClick={() => navigate(`/groups/${g.id}`)}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{g.name}</p>
              <div className="flex -space-x-2">
                {ids.slice(0, 4).map((id) => (
                  <Avatar key={id} member={members[id]} size={26} />
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <PositionLabel balance={balance} />
              {vault && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <VaultIcon size={14} /> <Money cents={vaultTotal(vault)} /> reserved
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </Screen>
  );
}
