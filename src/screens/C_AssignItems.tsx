import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, Screen, SectionTitle, TodoPanel, inputClass } from "../components/ui";
import { formatSGD, toCents } from "../domain/money";
import { computeReceiptSplit, reconcileWithReceipt } from "../domain/receiptSplit";
import { useGroupView, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";
import { useDraftStore } from "../store/useDraftStore";

/**
 * Screen C — Itemised assigner (US-04 reconciliation, US-05, US-06).
 * Tap avatars to say who had each item. Service charge and GST are shared in
 * proportion. Saving is blocked while items are unassigned or totals don't match.
 */
export function AssignItems() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { id: me } = useMe();
  const view = useGroupView(groupId);
  const members = useAppStore((s) => s.members);
  const addExpense = useAppStore((s) => s.addExpense);
  const draft = useDraftStore();
  const [title, setTitle] = useState(draft.merchant);
  const [error, setError] = useState<string>();

  const split = useMemo(() => computeReceiptSplit(draft.items), [draft.items]);
  const reconcile = draft.detectedTotalCents !== undefined ? reconcileWithReceipt(split.totalCents, draft.detectedTotalCents) : undefined;

  if (!view) return null;
  if (draft.groupId !== groupId) {
    return (
      <Screen title="Assign items" back={`/groups/${groupId}/add`}>
        <Banner>Start by scanning a receipt.</Banner>
      </Screen>
    );
  }

  const updateItem = (id: string, patch: Partial<(typeof draft.items)[number]>) =>
    draft.setItems(draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const toggle = (itemId: string, memberId: string) => {
    const item = draft.items.find((i) => i.id === itemId)!;
    const assignees = item.assignees.includes(memberId) ? item.assignees.filter((x) => x !== memberId) : [...item.assignees, memberId];
    updateItem(itemId, { assignees });
  };

  const canSave = draft.items.length > 0 && split.unassignedItemIds.length === 0 && (reconcile?.ok ?? true) && title.trim().length > 0;

  const save = () => {
    const r = addExpense({
      groupId,
      title: title.trim(),
      totalCents: split.totalCents,
      shares: split.sharesCents,
      source: draft.manual ? "manual" : "receipt",
    });
    if (!r.ok) return setError(r.error);
    draft.clear();
    navigate(`/groups/${groupId}`);
  };

  return (
    <Screen title="Who had what?" back={`/groups/${groupId}/add`}>
      {draft.manual && <Banner tone="warn">We couldn't read this receipt. Enter the items manually; your photo is kept for reference.</Banner>}
      {draft.receiptImageUrl && <img src={draft.receiptImageUrl} alt="Receipt" className="max-h-40 rounded-xl object-contain" />}
      {draft.confidence !== undefined && draft.confidence < 0.6 && (
        <Banner tone="warn">This receipt was hard to read ({Math.round(draft.confidence * 100)}% confidence). Check each line.</Banner>
      )}

      <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What was it for?" />

      <SectionTitle>Items</SectionTitle>
      {draft.items.map((item) => (
        <Card key={item.id} className={split.unassignedItemIds.includes(item.id) ? "ring-2 ring-amber-300" : ""}>
          <div className="flex items-center gap-2">
            <input className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
            <input
              className="w-20 rounded-lg bg-surface px-2 py-1 text-right text-sm tabular-nums outline-none"
              defaultValue={(item.priceCents / 100).toFixed(2)}
              onBlur={(e) => {
                try {
                  updateItem(item.id, { priceCents: toCents(e.target.value) });
                } catch {
                  e.target.value = (item.priceCents / 100).toFixed(2);
                }
              }}
              aria-label={`Price of ${item.name}`}
            />
            <button aria-label="Remove item" className="text-muted" onClick={() => draft.setItems(draft.items.filter((i) => i.id !== item.id))}>
              <Trash2 size={16} />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {view.memberIds.map((id) => (
              <button
                key={id}
                onClick={() => toggle(item.id, id)}
                className={`rounded-full p-0.5 transition ${item.assignees.includes(id) ? "ring-2 ring-brand" : "opacity-35 grayscale"}`}
                aria-pressed={item.assignees.includes(id)}
                aria-label={members[id].displayName}
              >
                <Avatar member={members[id]} size={30} />
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Button
        variant="ghost"
        onClick={() => draft.setItems([...draft.items, { id: `m${Date.now()}`, name: "New item", priceCents: 0, assignees: [] }])}
      >
        <Plus size={16} /> Add item
      </Button>

      <Card>
        <Row label="Subtotal" cents={split.subtotalCents} />
        <Row label="Service charge (10%)" cents={split.serviceChargeCents} />
        <Row label="GST (9%)" cents={split.gstCents} />
        <div className="my-2 h-px bg-line" />
        <Row label="Total" cents={split.totalCents} bold />
        {view.memberIds.filter((id) => split.sharesCents[id]).map((id) => (
          <div key={id} className="mt-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Avatar member={members[id]} size={20} /> {id === me ? "You" : members[id].displayName.split(" ")[0]}
            </span>
            <Money cents={split.sharesCents[id]} className="font-semibold" />
          </div>
        ))}
      </Card>

      {split.unassignedItemIds.length > 0 && <Banner tone="warn">Assign every item before saving ({split.unassignedItemIds.length} left).</Banner>}
      {reconcile && !reconcile.ok && (
        <Banner tone="error">
          Items and charges add up to {formatSGD(split.totalCents)}, but the receipt says {formatSGD(draft.detectedTotalCents!)}. Fix the items to continue.
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <Button disabled={!canSave} onClick={save}>
        Save split
      </Button>

      <TodoPanel
        owner="#4 Strategy & Research Lead"
        stories="US-05, US-06"
        items={[
          "Toggle service charge / GST off for hawker or no-charge receipts (computeReceiptSplit accepts rates)",
          "'Split equally among everyone' shortcut per item",
          "Show each person's item list in the summary, not only totals",
          "Usability: test tap-to-assign with 5 users and record time-on-task",
        ]}
      />
    </Screen>
  );
}

function Row({ label, cents, bold }: { label: string; cents: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : "text-muted"}`}>
      <span>{label}</span>
      <Money cents={cents} />
    </div>
  );
}
