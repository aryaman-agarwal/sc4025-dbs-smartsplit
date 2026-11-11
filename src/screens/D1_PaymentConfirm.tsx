import { AlertTriangle, CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, Screen, TodoPanel } from "../components/ui";
import { formatSGD } from "../domain/money";
import { useIsFirstTimePayee, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

type Phase = "review" | "token" | "paying" | "success" | "failed";

/**
 * Screen D1 — One-tap payment confirmation (US-15, US-16).
 * Masked payee name, no phone or account field, first-time payee warning,
 * source of funds, simulated digital-token authentication.
 */
export function PaymentConfirm() {
  const { groupId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toId = params.get("to") ?? "";
  const amount = Number(params.get("amount") ?? 0);
  const { id: me, account } = useMe();
  const payee = useAppStore((s) => s.members[toId]);
  const lastSource = useAppStore((s) => s.lastSource[me]);
  const pay = useAppStore((s) => s.pay);
  const firstTime = useIsFirstTimePayee(toId);
  const [source, setSource] = useState<"paylah" | "bank">(lastSource ?? "bank");
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string>();

  if (!payee || !amount) return <Screen title="Pay" back><Banner tone="error">Payment details missing.</Banner></Screen>;

  const available = source === "paylah" ? account.paylahCents : account.bankCents;
  const shortfall = amount - available;

  const confirm = async () => {
    setPhase("paying");
    const r = await pay(groupId, toId, amount, source);
    if (r.ok) setPhase("success");
    else {
      setError(r.error);
      setPhase("failed");
    }
  };

  if (phase === "success" || phase === "failed") {
    const okay = phase === "success";
    return (
      <Screen title={okay ? "Paid" : "Payment failed"}>
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          {okay ? <CheckCircle2 size={48} className="text-owed" /> : <XCircle size={48} className="text-brand" />}
          <p className="text-lg font-semibold">{okay ? `${formatSGD(amount)} sent to ${payee.maskedName}` : error}</p>
          <p className="text-sm text-muted">{okay ? "Marked as settled for both of you." : "Nothing changed in your ledger."}</p>
        </Card>
        <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to group</Button>
        {!okay && (
          <Button variant="secondary" onClick={() => setPhase("review")}>
            Try again
          </Button>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Confirm payment" back>
      <Card className="flex flex-col items-center gap-2 py-6 text-center">
        <Avatar member={payee} size={56} />
        <p className="text-xs text-muted">Paying</p>
        <p className="font-mono text-lg font-semibold tracking-wide">{payee.maskedName}</p>
        <Money cents={amount} className="text-3xl font-bold" />
        <p className="text-xs text-muted">via PayNow · amount set by SmartSplit</p>
      </Card>

      {firstTime && (
        <Banner tone="warn">
          <AlertTriangle size={16} className="mr-1 inline" />
          You haven't paid this person before. Check the name matches the friend you're settling with. DBS will never ask you to pay through a link.
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["bank", "paylah"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`rounded-xl border bg-white p-3 text-left text-sm ${source === s ? "border-brand ring-2 ring-brand/20" : "border-line"}`}
          >
            <p className="font-semibold">{s === "bank" ? "Savings account" : "PayLah! wallet"}</p>
            <Money cents={s === "bank" ? account.bankCents : account.paylahCents} className="text-xs text-muted" />
          </button>
        ))}
      </div>
      {shortfall > 0 && <Banner tone="error">You're {formatSGD(shortfall)} short in this account. Choose another source.</Banner>}

      {phase === "token" ? (
        <Card className="flex flex-col items-center gap-3 py-5 text-center">
          <Fingerprint size={40} className="text-brand" />
          <p className="text-sm font-semibold">Approve with your digital token</p>
          <p className="text-xs text-muted">Simulated for the demo</p>
          <div className="flex w-full gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPhase("review")}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={confirm}>
              Approve
            </Button>
          </div>
        </Card>
      ) : (
        <Button disabled={shortfall > 0 || phase === "paying"} onClick={() => setPhase("token")}>
          {phase === "paying" ? <Loader2 className="animate-spin" size={18} /> : null}
          {phase === "paying" ? "Paying…" : `Pay ${formatSGD(amount)}`}
        </Button>
      )}

      <TodoPanel
        owner="#1 MVP Engineer"
        stories="US-15, US-16"
        items={[
          "Success within 3 seconds: show a progress state, then the receipt with reference number",
          "Demo the failure state ('You were not charged') via demoSettings.failureRate in services/payNow.ts",
          "Match the digibank payment-confirmation layout in Figma",
        ]}
      />
    </Screen>
  );
}
