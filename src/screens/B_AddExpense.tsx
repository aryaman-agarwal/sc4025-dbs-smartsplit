import { Camera, CreditCard, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, Screen, SectionTitle, Sheet, TodoPanel } from "../components/ui";
import { SAMPLE_RECEIPTS } from "../data/sampleReceipts";
import { equalSplit } from "../domain/receiptSplit";
import { receiptParser } from "../services/receiptParser";
import { useGroupView, useImportableCardTxns } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";
import { useDraftStore } from "../store/useDraftStore";

/**
 * Screen B — Add expense (US-04, US-07).
 * Two entry paths: scan a receipt (then screen C) or import a DBS card charge
 * (split equally, skipping C — Flow 1 shortcut).
 */
export function AddExpense() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const view = useGroupView(groupId);
  const txns = useImportableCardTxns();
  const addExpense = useAppStore((s) => s.addExpense);
  const startFromReceipt = useDraftStore((s) => s.startFromReceipt);
  const startManual = useDraftStore((s) => s.startManual);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>();
  const [importing, setImporting] = useState<{ txnId: string; included: string[] }>();
  const members = useAppStore((s) => s.members);
  const me = useAppStore((s) => s.currentUserId);

  if (!view) return null;

  const scanSample = async (sampleId: string) => {
    setScanning(true);
    setError(undefined);
    try {
      startFromReceipt(groupId, await receiptParser.parseSample(sampleId));
      navigate(`/groups/${groupId}/assign`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const scanFile = async (file: File) => {
    setScanning(true);
    setError(undefined);
    const imageUrl = URL.createObjectURL(file);
    try {
      startFromReceipt(groupId, await receiptParser.parseImage(file), imageUrl);
    } catch {
      // US-04: OCR failed -> manual entry, photo kept for reference.
      startManual(groupId, imageUrl);
    } finally {
      setScanning(false);
      navigate(`/groups/${groupId}/assign`);
    }
  };

  // US-07: confirm merchant, date and amount, and choose who's included, before an equal split.
  const importTxn = (txnId: string, included: string[]) => {
    const t = txns.find((x) => x.id === txnId)!;
    const r = addExpense({
      groupId,
      title: t.merchant,
      totalCents: t.amountCents,
      shares: equalSplit(t.amountCents, included),
      source: "card",
      cardTxnId: t.id,
    });
    setImporting(undefined);
    if (!r.ok) return setError(r.error);
    navigate(`/groups/${groupId}`);
  };
  const pending = importing && txns.find((x) => x.id === importing.txnId);
  const preview = pending && importing.included.length > 0 ? equalSplit(pending.amountCents, importing.included) : {};

  return (
    <Screen title="Add expense" back={`/groups/${groupId}`}>
      <SectionTitle>Scan a receipt</SectionTitle>
      <Card>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand">
            {scanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">{scanning ? "Reading receipt…" : "Take or upload a photo"}</span>
            <span className="text-xs text-muted">Items, service charge and GST fill in for you</span>
          </span>
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={scanning} onChange={(e) => e.target.files?.[0] && scanFile(e.target.files[0])} />
        </label>
        <p className="mt-3 text-xs text-muted">Demo receipts:</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {SAMPLE_RECEIPTS.map((s) => (
            <button key={s.id} disabled={scanning} onClick={() => scanSample(s.id)} className="rounded-full bg-surface px-3 py-1 text-xs hover:bg-neutral-200">
              {s.label}
            </button>
          ))}
        </div>
      </Card>
      <Button
        variant="secondary"
        onClick={() => {
          startManual(groupId);
          navigate(`/groups/${groupId}/assign`);
        }}
      >
        <PenLine size={16} /> No receipt? Enter items by hand
      </Button>

      {error && <Banner tone="error">{error}</Banner>}

      <SectionTitle>Or import a card payment</SectionTitle>
      {txns.length === 0 && <Banner>No DBS card payments in the last 30 days.</Banner>}
      {txns.map((t) => (
        <Card key={t.id} onClick={t.alreadyAddedOn ? undefined : () => setImporting({ txnId: t.id, included: view.memberIds })} className={t.alreadyAddedOn ? "opacity-60" : ""}>
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.merchant}</p>
              <p className="text-xs text-muted">
                {t.alreadyAddedOn
                  ? `Already added on ${new Date(t.alreadyAddedOn).toLocaleDateString("en-SG")}`
                  : `${new Date(t.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} · ${t.cardLabel}`}
              </p>
            </div>
            <Money cents={t.amountCents} className="text-sm font-semibold" />
          </div>
        </Card>
      ))}

      <TodoPanel
        owner="#3 Discovery Lead"
        stories="US-04, US-07"
        items={[
          "Camera viewfinder UI with framing guide (mobile); today the photo button opens the phone's own camera",
          "Optional: plug a real OCR model into services/receiptParser.ts",
        ]}
      />

      {pending && importing && (
        <Sheet title="Split this card payment?" onClose={() => setImporting(undefined)}>
          <Card className="bg-surface">
            <p className="font-semibold">{pending.merchant}</p>
            <p className="text-xs text-muted">
              {new Date(pending.date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })} · {pending.cardLabel}
            </p>
            <Money cents={pending.amountCents} className="mt-1 block text-2xl font-bold" />
          </Card>
          <p className="text-sm font-medium">Who's included? Split equally</p>
          {view.memberIds.map((id) => {
            const on = importing.included.includes(id);
            return (
              <label key={id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand"
                  checked={on}
                  onChange={() =>
                    setImporting({ ...importing, included: on ? importing.included.filter((x) => x !== id) : [...importing.included, id] })
                  }
                />
                <Avatar member={members[id]} size={26} />
                <span className="flex-1">{id === me ? "You" : members[id].displayName.split(" ")[0]}</span>
                {on && <Money cents={preview[id] ?? 0} className="font-semibold" />}
              </label>
            );
          })}
          <p className="text-xs text-muted">Your group sees only the merchant, date and amount, never your card number.</p>
          <Button disabled={importing.included.length === 0} onClick={() => importTxn(importing.txnId, importing.included)}>
            Add to {view.group.name}
          </Button>
        </Sheet>
      )}
    </Screen>
  );
}
