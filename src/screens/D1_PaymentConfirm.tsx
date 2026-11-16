import { AlertTriangle, CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Money, Screen } from "../components/ui";
import { formatSGD } from "../domain/money";
import type { Payment, Transfer } from "../domain/types";
import { useGroupView, useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

type Phase = "review" | "token" | "paying" | "done";

/**
 * Screen D1 — One-tap payment confirmation (US-15, US-16, US-17).
 * One payee (?to=&amount=) or everyone I owe in the group (?all=1), always
 * with one confirmation and one authentication. Masked payee names, no phone
 * or account field, first-time payee warning, source of funds, simulated
 * digital token, then a receipt with PayNow references.
 */
export function PaymentConfirm() {
  const { groupId = "" } = useParams();
  const [params] = useSearchParams();
  const { id: me, account } = useMe();
  const view = useGroupView(groupId);
  const members = useAppStore((s) => s.members);
  const known = useAppStore((s) => s.knownPayees[me]);
  const lastSource = useAppStore((s) => s.lastSource[me]);
  const pay = useAppStore((s) => s.pay);
  const settleAll = useAppStore((s) => s.settleAll);
  const [source, setSource] = useState<"paylah" | "bank">(lastSource ?? "bank");
  const [phase, setPhase] = useState<Phase>("review");
  const [results, setResults] = useState<Payment[]>([]);

  const all = params.get("all") === "1";
  // Freeze the plan when the screen opens so it doesn't change under the user while paying.
  const plan = useMemo<Transfer[]>(() => {
    if (all) return view?.transfers.filter((t) => t.fromId === me) ?? [];
    const toId = params.get("to") ?? "";
    const amountCents = Number(params.get("amount") ?? 0);
    return toId && amountCents ? [{ fromId: me, toId, amountCents }] : [];
  }, []);

  if (plan.length === 0 || plan.some((t) => !members[t.toId])) {
    return (
      <Screen title="Pay" back>
        <Banner tone="error">Payment details missing.</Banner>
      </Screen>
    );
  }

  const total = plan.reduce((a, t) => a + t.amountCents, 0);
  const available = source === "paylah" ? account.paylahCents : account.bankCents;
  const shortfall = total - available;
  const firstTimers = plan.filter((t) => !(known ?? []).includes(t.toId));

  const confirm = async () => {
    setPhase("paying");
    if (all) {
      const r = await settleAll(groupId, source);
      setResults(r.ok ? r.value : []);
    } else {
      const t = plan[0];
      await pay(groupId, t.toId, t.amountCents, source);
      setResults([useAppStore.getState().payments.at(-1)!]);
    }
    setPhase("done");
  };

  if (phase === "done") return <PaymentReceipt groupId={groupId} results={results} onRetry={() => setPhase("review")} />;

  return (
    <Screen title={all ? "Settle everything" : "Confirm payment"} back>
      {plan.length === 1 ? (
        <Card className="flex flex-col items-center gap-2 py-6 text-center">
          <Avatar member={members[plan[0].toId]} size={56} />
          <p className="text-xs text-muted">Paying</p>
          <p className="font-mono text-lg font-semibold tracking-wide">{members[plan[0].toId].maskedName}</p>
          <Money cents={total} className="text-3xl font-bold" />
          <p className="text-xs text-muted">via PayNow · amount set by SmartSplit</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="text-center">
            <p className="text-xs text-muted">
              {plan.length} payments · one approval
            </p>
            <Money cents={total} className="text-3xl font-bold" />
          </div>
          {plan.map((t) => (
            <div key={t.toId} className="flex items-center gap-3 text-sm">
              <Avatar member={members[t.toId]} size={32} />
              <span className="flex-1 font-mono font-semibold tracking-wide">{members[t.toId].maskedName}</span>
              <Money cents={t.amountCents} className="font-semibold" />
            </div>
          ))}
          <p className="text-center text-xs text-muted">via PayNow · amounts set by SmartSplit</p>
        </Card>
      )}

      {firstTimers.length > 0 && (
        <Banner tone="warn">
          <AlertTriangle size={16} className="mr-1 inline" />
          You haven't paid {firstTimers.map((t) => members[t.toId].maskedName).join(" or ")} before. Check the name matches the friend you're settling
          with. DBS will never ask you to pay through a link.
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
      {shortfall > 0 && (
        <Banner tone={all ? "warn" : "error"}>
          You're {formatSGD(shortfall)} short in this account.{" "}
          {all ? "Payments that don't fit will fail and stay open; you won't be charged for them." : "Choose another source."}
        </Banner>
      )}

      {phase === "token" ? (
        <Card className="flex flex-col items-center gap-3 py-5 text-center">
          <Fingerprint size={40} className="text-brand" />
          <p className="text-sm font-semibold">Approve {formatSGD(total)} with your digital token</p>
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
        <Button disabled={(!all && shortfall > 0) || phase === "paying"} onClick={() => setPhase("token")}>
          {phase === "paying" ? <Loader2 className="animate-spin" size={18} /> : null}
          {phase === "paying" ? (plan.length > 1 ? `Paying ${plan.length} people…` : "Paying…") : `Pay ${formatSGD(total)}`}
        </Button>
      )}
    </Screen>
  );
}

/** Receipt after paying: reference and time for each success; failed ones flagged and left open. */
function PaymentReceipt({ groupId, results, onRetry }: { groupId: string; results: Payment[]; onRetry: () => void }) {
  const navigate = useNavigate();
  const members = useAppStore((s) => s.members);
  const paid = results.filter((p) => p.status === "success");
  const failed = results.filter((p) => p.status === "failed");
  const allOk = failed.length === 0;
  const title = allOk ? "Paid" : paid.length === 0 ? "Payment failed" : "Partly paid";

  return (
    <Screen title={title}>
      <Card className="flex flex-col items-center gap-2 py-6 text-center">
        {allOk ? <CheckCircle2 size={48} className="text-owed" /> : <XCircle size={48} className="text-brand" />}
        <p className="text-lg font-semibold">
          {allOk
            ? `${formatSGD(paid.reduce((a, p) => a + p.amountCents, 0))} sent`
            : paid.length === 0
              ? failed[0]?.error ?? "Payment didn't go through."
              : `${paid.length} of ${results.length} payments went through`}
        </p>
        <p className="text-sm text-muted">{allOk ? "Marked as settled for both sides." : "Failed payments stay open in your group. You were not charged for them."}</p>
      </Card>

      {results.map((p) => (
        <Card key={p.id} className={`text-sm ${p.status === "failed" ? "ring-2 ring-brand/40" : ""}`}>
          <div className="flex items-center gap-3">
            <Avatar member={members[p.toId]} size={28} />
            <span className="flex-1 font-mono font-semibold">{members[p.toId].maskedName}</span>
            <Money cents={p.amountCents} className="font-semibold" />
          </div>
          <p className="mt-1 text-xs text-muted">
            {p.status === "success"
              ? `Ref ${p.reference} · ${new Date(p.createdAt).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })} · ${p.source === "bank" ? "Savings account" : "PayLah!"}`
              : `Not paid · ${p.error}`}
          </p>
        </Card>
      ))}

      <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to group</Button>
      {!allOk && (
        <Button variant="secondary" onClick={() => (paid.length === 0 ? onRetry() : navigate(`/groups/${groupId}/settle`))}>
          {paid.length === 0 ? "Try again" : "Settle what's left"}
        </Button>
      )}
    </Screen>
  );
}
