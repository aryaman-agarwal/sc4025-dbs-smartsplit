import { QrCode } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banner, Button, Card, Field, Screen, TodoPanel, inputClass } from "../components/ui";
import { formatSGD, toCents } from "../domain/money";
import { classifySpend } from "../domain/vault";
import { useGroupView } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/** Demo SGQR codes to "scan" (a real build would open the camera). */
const DEMO_QR = [
  { merchant: "Bali Blue Boat Tours", amount: "150" },
  { merchant: "Warung Made", amount: "42.80" },
  { merchant: "Ubud Monkey Forest", amount: "36" },
];

/**
 * Screen E1 — Pay or claim from vault (US-20, US-21).
 * Shows the approval tier BEFORE the member submits.
 */
export function VaultSpend() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const view = useGroupView(groupId);
  const requestSpend = useAppStore((s) => s.requestSpend);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();

  if (!view?.vault) return null;
  const vault = view.vault;

  let cents = 0;
  try {
    cents = amount ? toCents(amount) : 0;
  } catch {
    cents = 0;
  }
  const preview = cents > 0 ? classifySpend(vault, cents, view.memberIds.length) : undefined;

  const submit = () => {
    const r = requestSpend(vault.id, { kind: "pay", merchant, amountCents: cents });
    if (!r.ok) return setError(r.error);
    navigate(`/groups/${groupId}/vault`);
  };

  return (
    <Screen title="Pay from vault" back={`/groups/${groupId}/vault`}>
      <Card>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <QrCode size={18} /> Scan a PayNow / SGQR code
        </p>
        <p className="mt-1 text-xs text-muted">Demo codes:</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {DEMO_QR.map((q) => (
            <button
              key={q.merchant}
              className="rounded-full bg-surface px-3 py-1 text-xs hover:bg-neutral-200"
              onClick={() => {
                setMerchant(q.merchant);
                setAmount(q.amount);
              }}
            >
              {q.merchant}
            </button>
          ))}
        </div>
      </Card>

      <Field label="Merchant">
        <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </Field>
      <Field label="Amount (S$)">
        <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>

      {preview && (
        <Banner tone={preview.approvalsRequired === 0 ? "success" : "warn"}>
          {preview.approvalsRequired === 0
            ? `${formatSGD(cents)} is a small spend: it goes through now and everyone is alerted.`
            : `${formatSGD(cents)} is a ${preview.tier} spend: needs ${preview.approvalsRequired} other member${preview.approvalsRequired > 1 ? "s" : ""} to approve.`}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <Button disabled={!cents || !merchant.trim()} onClick={submit}>
        {preview?.approvalsRequired ? "Send for approval" : "Pay now"}
      </Button>

      <TodoPanel
        owner="#5 GTM & Governance Lead"
        stories="US-20, US-21"
        items={[
          "'Claim back a card payment' tab: amount + receipt photo (reuse receiptParser), then requestSpend with kind 'claim'",
          "Camera QR scanner UI (mock is fine) instead of demo chips",
          "Cooling-off message for members who joined less than 12 hours ago (error already returned by the store)",
        ]}
      />
    </Screen>
  );
}
