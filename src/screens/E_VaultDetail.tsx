import { AlertTriangle, Lock, QrCode, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Banner, Button, Card, Field, Money, Screen, SectionTitle, Sheet, ToggleRow, inputClass } from "../components/ui";
import { CONFIG } from "../domain/config";
import { formatSGD, toCents } from "../domain/money";
import type { TierConfig, Vault, VaultSpend } from "../domain/types";
import { useGroupView, useMe, useVaultSpends } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/**
 * Screen E — Vault detail (US-09 to US-14).
 * Each member's money stays reserved in their own account until the group
 * approves a spend; spends are drawn pro rata from every reserve.
 */
export function VaultDetail() {
  const { groupId = "" } = useParams();
  const view = useGroupView(groupId);
  if (!view) return null;
  if (!view.vault || view.vault.status === "closed") return <CreateVault groupId={groupId} closedName={view.vault?.name} />;
  return <OpenVault groupId={groupId} />;
}

function CreateVault({ groupId, closedName }: { groupId: string; closedName?: string }) {
  const createVault = useAppStore((s) => s.createVault);
  const [name, setName] = useState("Bali Trip 2026");
  const [target, setTarget] = useState("1500");
  const [end, setEnd] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [error, setError] = useState<string>();

  const submit = () => {
    try {
      const r = createVault({ groupId, name, targetCents: toCents(target), endDate: new Date(`${end}T23:59:59`).toISOString() });
      if (!r.ok) setError(r.error);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen title="Create a vault" back={`/groups/${groupId}`}>
      {closedName && <Banner>{closedName} is closed and all unspent money was released.</Banner>}
      <Banner tone="info">
        <ShieldCheck size={16} className="mr-1 inline" />
        No joint account needed. Everyone's share stays in their own account until the group spends it.
      </Banner>
      <Field label="Vault name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Target (S$)">
        <input className={inputClass} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <Field label="End date">
        <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      {error && <Banner tone="error">{error}</Banner>}
      <Button onClick={submit}>Create vault</Button>
    </Screen>
  );
}

function OpenVault({ groupId }: { groupId: string }) {
  const navigate = useNavigate();
  const { id: me, account } = useMe();
  const view = useGroupView(groupId)!;
  const vault = view.vault!;
  const spends = useVaultSpends(vault.id);
  const members = useAppStore((s) => s.members);
  const reserve = useAppStore((s) => s.reserve);
  const approve = useAppStore((s) => s.approveSpend);
  const reject = useAppStore((s) => s.rejectSpend);
  const closeVault = useAppStore((s) => s.closeVault);
  const extendVault = useAppStore((s) => s.extendVault);
  const consentedAt = useAppStore((s) => s.debitConsent[me]);
  const giveDebitConsent = useAppStore((s) => s.giveDebitConsent);
  const [amount, setAmount] = useState("500");
  const [sheet, setSheet] = useState<"consent" | "rules">();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string }>();

  const total = view.vaultTotalCents;
  const pct = Math.min(100, Math.round((total / vault.targetCents) * 100));
  const myReserve = vault.reservations[me] ?? 0;
  const pending = spends.filter((s) => s.status === "pending");
  const history = spends.filter((s) => s.status !== "pending");
  const first = (id: string) => (id === me ? "You" : members[id].displayName.split(" ")[0]);

  const doReserve = () => {
    // US-10: the one-time debit authorisation comes before the first reservation.
    if (!consentedAt) return setSheet("consent");
    try {
      const r = reserve(vault.id, toCents(amount));
      setMessage(r.ok ? { tone: "success", text: `${formatSGD(toCents(amount))} reserved. It stays in your account.` } : { tone: "error", text: r.error });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  };

  return (
    <Screen title={vault.name} back={`/groups/${groupId}`}>
      <Card>
        <p className="text-xs text-muted">Reserved by the group</p>
        <p className="text-2xl font-bold">
          <Money cents={total} /> <span className="text-sm font-normal text-muted">of <Money cents={vault.targetCents} /></span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Admin: {first(vault.adminId)} · ends {new Date(vault.endDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </Card>

      {vault.inactivityNoticeAt && (
        <Banner tone="warn">
          <AlertTriangle size={16} className="mr-1 inline" />
          No activity for {CONFIG.vaultInactiveDays} days. Unspent reserves go back to everyone on{" "}
          {new Date(Date.parse(vault.inactivityNoticeAt) + CONFIG.vaultReleaseNoticeDays * 86_400_000).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} unless
          someone keeps the vault open.
          <Button variant="secondary" className="mt-2 w-full py-2" onClick={() => extendVault(vault.id)}>
            Keep vault open
          </Button>
        </Banner>
      )}
      {vault.lowAlertSent && total < vault.targetCents * CONFIG.lowVaultThreshold && (
        <Banner tone="warn">
          Running low: <Money cents={total} /> left, under {Math.round(CONFIG.lowVaultThreshold * 100)}% of the target. Reserve more before the next spend.
        </Banner>
      )}

      <SectionTitle>Reserves</SectionTitle>
      <Card className="flex flex-col gap-2">
        {view.memberIds.map((id) => (
          <div key={id} className="flex items-center gap-2 text-sm">
            <Avatar member={members[id]} size={24} />
            <span className="flex-1">{first(id)}</span>
            <Money cents={vault.reservations[id] ?? 0} className="font-semibold" />
          </div>
        ))}
        <p className="flex items-center gap-1 text-xs text-muted">
          <Lock size={12} /> Each reserve stays in its owner's DBS/POSB account.
        </p>
      </Card>

      <Card>
        <p className="text-sm font-semibold">Reserve my share</p>
        <p className="text-xs text-muted">
          You've reserved <Money cents={myReserve} />. Available: <Money cents={account.bankCents} />
        </p>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to reserve" />
          <Button onClick={doReserve}>Reserve</Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {consentedAt
            ? "Debit authorisation given. DBS debits your reserve only for spends the group approves."
            : "First time? We'll ask you to authorise group-approved debits once."}
        </p>
        {message && <div className="mt-2"><Banner tone={message.tone}>{message.text}</Banner></div>}
      </Card>

      <Button onClick={() => navigate(`/groups/${groupId}/vault/spend`)}>
        <QrCode size={18} /> Pay or claim from vault
      </Button>

      {pending.length > 0 && <SectionTitle>Waiting for approval</SectionTitle>}
      {pending.map((s) => (
        <PendingSpend
          key={s.id}
          spend={s}
          requester={first(s.requesterId)}
          canAct={s.requesterId !== me && !s.approvedBy.includes(me) && !s.rejectedBy.includes(me)}
          onApprove={() => {
            const r = approve(s.id);
            if (!r.ok) setMessage({ tone: "error", text: r.error });
          }}
          onReject={() => reject(s.id)}
        />
      ))}

      <SectionTitle>Activity</SectionTitle>
      {history.length === 0 && <p className="px-1 text-sm text-muted">No spends yet.</p>}
      {history.map((s) => (
        <Card key={s.id} className="text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{s.merchant}</span>
            <Money cents={s.amountCents} className={s.status === "executed" ? "font-semibold" : "text-muted line-through"} />
          </div>
          <p className="text-xs text-muted">
            {first(s.requesterId)} · {s.kind === "pay" ? "paid" : "claimed"} ·{" "}
            {s.status === "executed"
              ? Object.entries(s.draws ?? {}).map(([id, c]) => `${first(id)} ${formatSGD(c)}`).join(", ")
              : s.status}
          </p>
        </Card>
      ))}

      <Card className="text-xs text-muted">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Approval rules</p>
          {vault.adminId === me && (
            <button className="flex items-center gap-1 font-semibold text-brand" onClick={() => setSheet("rules")}>
              <SlidersHorizontal size={14} /> Edit
            </button>
          )}
        </div>
        {vault.tiers.strictMode ? (
          <p>Strict mode: every member approves every spend.</p>
        ) : (
          <>
            <p>Under {formatSGD(vault.tiers.smallMaxCents)}: instant, everyone alerted.</p>
            <p>
              {formatSGD(vault.tiers.smallMaxCents)}–{formatSGD(vault.tiers.mediumMaxCents)}: one other member approves.
            </p>
            <p>
              Over {formatSGD(vault.tiers.mediumMaxCents)} or {Math.round(vault.tiers.largeShareOfVault * 100)}% of the vault: majority.
            </p>
          </>
        )}
      </Card>

      {vault.adminId === me && (
        <Button variant="danger" onClick={() => closeVault(vault.id)}>
          Close vault and release money
        </Button>
      )}

      <p className="px-1 text-center text-xs text-muted">
        Offers based on your vaults are off unless you opt in.{" "}
        <button className="font-semibold text-brand" onClick={() => navigate("/privacy")}>
          Privacy settings
        </button>
      </p>

      {sheet === "consent" && (
        <DebitConsentSheet
          vaultName={vault.name}
          onCancel={() => setSheet(undefined)}
          onAgree={() => {
            giveDebitConsent();
            setSheet(undefined);
            const r = reserve(vault.id, toCents(amount));
            setMessage(r.ok ? { tone: "success", text: `${formatSGD(toCents(amount))} reserved. It stays in your account.` } : { tone: "error", text: r.error });
          }}
        />
      )}
      {sheet === "rules" && <RulesSheet vault={vault} onClose={() => setSheet(undefined)} />}
    </Screen>
  );
}

function PendingSpend({
  spend,
  requester,
  canAct,
  onApprove,
  onReject,
}: {
  spend: VaultSpend;
  requester: string;
  canAct: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="ring-2 ring-amber-300">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{spend.merchant}</span>
        <Money cents={spend.amountCents} className="font-semibold" />
      </div>
      <p className="text-xs text-muted">
        {requester} · {spend.tier} spend · {spend.approvedBy.length}/{spend.approvalsRequired} approvals · expires 24h after request
      </p>
      {canAct && (
        <div className="mt-2 flex gap-2">
          <Button className="flex-1 py-2" onClick={onApprove}>
            Approve
          </Button>
          <Button variant="secondary" className="flex-1 py-2" onClick={onReject}>
            Decline
          </Button>
        </div>
      )}
    </Card>
  );
}

/** US-10 / Section 7.3: one-time debit authorisation, shown before a member's first reservation. */
function DebitConsentSheet({ vaultName, onAgree, onCancel }: { vaultName: string; onAgree: () => void; onCancel: () => void }) {
  return (
    <Sheet title="Authorise group-approved debits" onClose={onCancel}>
      <p className="text-sm text-muted">You only need to do this once for GroupVault.</p>
      <ul className="flex flex-col gap-2 text-sm">
        <li>
          <span className="font-medium">Your money stays in your own account.</span> Reserving moves it from available to reserved in your DBS/POSB
          account. Nobody else holds it, including the vault admin.
        </li>
        <li>
          <span className="font-medium">DBS debits it only for spends your group approves,</span> such as {vaultName} payments, following the
          vault's approval rules. You're alerted every time.
        </li>
        <li>
          <span className="font-medium">Unspent money comes back.</span> When the vault closes, or after it's inactive for {CONFIG.vaultInactiveDays} days and
          nobody keeps it open, your remaining reserve is released.
        </li>
        <li>
          <span className="font-medium">You can withdraw this consent</span> by leaving the group's vaults. Reserves come from your bank account, not your
          PayLah! wallet.
        </li>
      </ul>
      <p className="text-xs text-muted">This doesn't sign you up for marketing. That's a separate choice in Privacy settings.</p>
      <Button onClick={onAgree}>I agree, reserve my share</Button>
      <Button variant="secondary" onClick={onCancel}>
        Not now
      </Button>
    </Sheet>
  );
}

/** US-12: admin edits approval tiers or turns on strict mode; every member is notified. */
function RulesSheet({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const update = useAppStore((s) => s.updateVaultTiers);
  const [small, setSmall] = useState((vault.tiers.smallMaxCents / 100).toString());
  const [medium, setMedium] = useState((vault.tiers.mediumMaxCents / 100).toString());
  const [share, setShare] = useState(Math.round(vault.tiers.largeShareOfVault * 100).toString());
  const [strict, setStrict] = useState(vault.tiers.strictMode);
  const [error, setError] = useState<string>();

  const save = () => {
    try {
      const tiers: TierConfig = { smallMaxCents: toCents(small), mediumMaxCents: toCents(medium), largeShareOfVault: Number(share) / 100, strictMode: strict };
      const r = update(vault.id, tiers);
      if (!r.ok) return setError(r.error);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Sheet title="Approval rules" onClose={onClose}>
      <ToggleRow label="Strict mode" hint="Every member approves every spend, whatever the amount." checked={strict} onChange={setStrict} />
      <fieldset disabled={strict} className="flex flex-col gap-3 disabled:opacity-50">
        <Field label="Instant below (S$)" hint="No approval needed; everyone is alerted.">
          <input className={inputClass} inputMode="decimal" value={small} onChange={(e) => setSmall(e.target.value)} />
        </Field>
        <Field label="One approval up to (S$)">
          <input className={inputClass} inputMode="decimal" value={medium} onChange={(e) => setMedium(e.target.value)} />
        </Field>
        <Field label="Majority above this share of the vault (%)">
          <input className={inputClass} inputMode="numeric" value={share} onChange={(e) => setShare(e.target.value)} />
        </Field>
      </fieldset>
      <p className="text-xs text-muted">Every member is notified when the rules change.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <Button onClick={save}>Save rules</Button>
    </Sheet>
  );
}
