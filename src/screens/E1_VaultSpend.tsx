import { Camera, Clock, QrCode, Receipt, ScanLine } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banner, Button, Card, Field, Screen, inputClass } from "../components/ui";
import { formatSGD, toCents } from "../domain/money";
import { classifySpend, coolingOffRemainingHours } from "../domain/vault";
import { useGroupView, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/** Demo SGQR codes the mock scanner can "read" (a real build would use the camera). */
const DEMO_QR = [
  { merchant: "Bali Blue Boat Tours", amount: "150" },
  { merchant: "Warung Made", amount: "42.80" },
  { merchant: "Ubud Monkey Forest", amount: "36" },
];

type Mode = "pay" | "claim";

/**
 * Screen E1 — Pay or claim from vault (US-20, US-21).
 * Pay: scan a merchant's PayNow/SGQR code. Claim: get a card payment back with a receipt.
 * Shows the approval tier BEFORE the member submits, and the cooling-off wait for new members.
 */
export function VaultSpend() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { id: me } = useMe();
  const view = useGroupView(groupId);
  const requestSpend = useAppStore((s) => s.requestSpend);
  const now = useAppStore((s) => s.now);
  useAppStore((s) => s.clockOffsetHours); // re-render when the demo clock moves
  const [mode, setMode] = useState<Mode>("pay");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const [receipt, setReceipt] = useState<{ name: string; url: string }>();
  const [error, setError] = useState<string>();

  if (!view?.vault) return null;
  const vault = view.vault;
  const joinedAt = view.group.members[me]?.joinedAt;
  const wait = joinedAt ? Math.ceil(coolingOffRemainingHours(joinedAt, now())) : 0;

  let cents = 0;
  try {
    cents = amount ? toCents(amount) : 0;
  } catch {
    cents = 0;
  }
  const preview = cents > 0 ? classifySpend(vault, cents, view.memberIds.length) : undefined;

  const switchMode = (m: Mode) => {
    setMode(m);
    setMerchant("");
    setAmount("");
    setReceipt(undefined);
    setError(undefined);
  };

  const scan = (code: (typeof DEMO_QR)[number]) => {
    setScanning(true);
    setTimeout(() => {
      setMerchant(code.merchant);
      setAmount(code.amount);
      setScanning(false);
    }, 600);
  };

  const submit = () => {
    const r = requestSpend(vault.id, { kind: mode, merchant, amountCents: cents });
    if (!r.ok) return setError(r.error);
    navigate(`/groups/${groupId}/vault`);
  };

  const canSubmit = cents > 0 && merchant.trim() && wait === 0 && (mode === "pay" || receipt);

  return (
    <Screen title={mode === "pay" ? "Pay from vault" : "Claim from vault"} back={`/groups/${groupId}/vault`}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 text-sm font-semibold" role="tablist">
        {(["pay", "claim"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-lg py-2 ${mode === m ? "bg-ink text-white" : "text-muted"}`}
          >
            {m === "pay" ? "Pay a merchant" : "Claim back a card payment"}
          </button>
        ))}
      </div>

      {wait > 0 && (
        <Banner tone="warn">
          <Clock size={16} className="mr-1 inline" />
          You joined recently. To protect the group, new members can pay or claim from the vault after {wait} more hour{wait === 1 ? "" : "s"}.
        </Banner>
      )}

      {mode === "pay" ? (
        <Card>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <QrCode size={18} /> Scan a PayNow / SGQR code
          </p>
          <div className="relative mt-3 grid aspect-square place-items-center overflow-hidden rounded-2xl bg-neutral-900 text-white">
            <div className="absolute inset-8 rounded-2xl border-2 border-dashed border-white/60" aria-hidden />
            {scanning ? (
              <ScanLine size={40} className="animate-pulse" />
            ) : merchant ? (
              <p className="px-6 text-center text-sm">
                Read <span className="font-semibold">{merchant}</span>
              </p>
            ) : (
              <p className="px-10 text-center text-xs opacity-80">Point your camera at the merchant's QR code</p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Demo: tap a code to simulate scanning it.</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {DEMO_QR.map((q) => (
              <button key={q.merchant} className="rounded-full bg-surface px-3 py-1 text-xs hover:bg-neutral-200" onClick={() => scan(q)} disabled={scanning}>
                {q.merchant}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Receipt size={18} /> Paid by card for the group?
          </p>
          <p className="mt-1 text-xs text-muted">
            Add the receipt and amount. Once approved, you're paid back from everyone's reserve in proportion, including your own.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
              <Camera size={18} />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium">{receipt ? receipt.name : "Add receipt photo"}</span>
              <span className="text-xs text-muted">Required for claims · deleted after 30 days</span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setReceipt({ name: f.name, url: URL.createObjectURL(f) });
              }}
            />
          </label>
          <button className="mt-2 text-xs font-semibold text-brand" onClick={() => setReceipt({ name: "Klook booking receipt (demo)", url: "" })}>
            Use a demo receipt
          </button>
          {receipt?.url && <img src={receipt.url} alt="Receipt" className="mt-2 max-h-32 rounded-lg object-contain" />}
        </Card>
      )}

      <Field label={mode === "pay" ? "Merchant" : "What was it for?"}>
        <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder={mode === "claim" ? "e.g. Klook snorkelling tickets" : undefined} />
      </Field>
      <Field label="Amount (S$)">
        <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>

      {preview && (
        <Banner tone={preview.approvalsRequired === 0 ? "success" : "warn"}>
          {preview.approvalsRequired === 0
            ? `${formatSGD(cents)} is a small ${mode === "pay" ? "spend" : "claim"}: it goes through now and everyone is alerted.`
            : `${formatSGD(cents)} is a ${preview.tier} ${mode === "pay" ? "spend" : "claim"}: needs ${preview.approvalsRequired} other member${preview.approvalsRequired > 1 ? "s" : ""} to approve.`}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <Button disabled={!canSubmit} onClick={submit}>
        {preview?.approvalsRequired ? "Send for approval" : mode === "pay" ? "Pay now" : "Claim now"}
      </Button>
    </Screen>
  );
}
