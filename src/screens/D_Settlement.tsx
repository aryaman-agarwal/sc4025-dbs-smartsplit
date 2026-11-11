import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, Screen, SectionTitle, TodoPanel } from "../components/ui";
import { useGroupView, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/**
 * Screen D — Settlement plan (US-08, US-15, US-17).
 * Shows the fewest payments that clear the group ("6 debts → 2 payments").
 */
export function Settlement() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { id: me } = useMe();
  const view = useGroupView(groupId);
  const members = useAppStore((s) => s.members);
  if (!view) return null;

  const { transfers, rawDebts } = view;
  const first = (id: string) => (id === me ? "You" : members[id].displayName.split(" ")[0]);

  return (
    <Screen title="Settle up" back={`/groups/${groupId}`}>
      {transfers.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 size={40} className="text-owed" />
          <p className="font-semibold">Everyone is settled</p>
        </Card>
      ) : (
        <Banner>
          {rawDebts} {rawDebts === 1 ? "debt" : "debts"} → <strong>{transfers.length} {transfers.length === 1 ? "payment" : "payments"}</strong>. We netted
          everything so money doesn't move in circles.
        </Banner>
      )}

      {transfers.length > 0 && <SectionTitle>Payments</SectionTitle>}
      {transfers.map((t) => {
        const mine = t.fromId === me;
        return (
          <Card key={`${t.fromId}-${t.toId}`} className={mine ? "ring-2 ring-brand/40" : ""}>
            <div className="flex items-center gap-2">
              <Avatar member={members[t.fromId]} size={28} />
              <span className="text-sm">{first(t.fromId)}</span>
              <ArrowRight size={16} className="text-muted" />
              <Avatar member={members[t.toId]} size={28} />
              <span className="flex-1 text-sm">{first(t.toId)}</span>
              <Money cents={t.amountCents} className="font-semibold" />
            </div>
            {mine && (
              <Button
                className="mt-3 w-full"
                onClick={() => navigate(`/groups/${groupId}/settle/confirm?to=${t.toId}&amount=${t.amountCents}`)}
              >
                Pay {first(t.toId)} <Money cents={t.amountCents} />
              </Button>
            )}
          </Card>
        );
      })}

      <TodoPanel
        owner="#1 MVP Engineer"
        stories="US-17"
        items={[
          "'Settle everything' button when I owe several people: one confirmation, one authentication (store.settleAll is ready)",
          "Flag any payment that fails while the others complete",
          "Animate the netting ('6 debts → 2 payments') for the video",
        ]}
      />
    </Screen>
  );
}
