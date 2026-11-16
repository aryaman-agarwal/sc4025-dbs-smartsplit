import { ShieldCheck } from "lucide-react";
import { Banner, Card, Screen, SectionTitle, ToggleRow } from "../components/ui";
import { useMe } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/**
 * Privacy and consent (US-18, Section 7.5).
 * Marketing opt-in is separate from the consent needed to use the feature,
 * and is off until the member switches it on.
 */
export function Privacy() {
  const { id: me } = useMe();
  const marketing = useAppStore((s) => !!s.marketingOptIn[me]);
  const setMarketing = useAppStore((s) => s.setMarketingOptIn);
  const debitConsentAt = useAppStore((s) => s.debitConsent[me]);

  const when = (iso?: string) => (iso ? `Given on ${new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}` : "Not given yet");

  return (
    <Screen title="Privacy" back="/">
      <Banner tone="info">
        <ShieldCheck size={16} className="mr-1 inline" />
        Group members see only your display name and group activity. They never see your account numbers, balances or other transactions.
      </Banner>

      <SectionTitle>Marketing</SectionTitle>
      <ToggleRow
        label="Use my SmartSplit activity for offers"
        hint="Off unless you turn it on. If on, vault names and group spending may be used to suggest offers such as travel insurance or FX. You can still use every feature with this off."
        checked={marketing}
        onChange={setMarketing}
      />

      <SectionTitle>Consents you've given</SectionTitle>
      <Card className="flex flex-col gap-2 text-sm">
        <div>
          <p className="font-medium">GroupVault debit authorisation</p>
          <p className="text-xs text-muted">{when(debitConsentAt)}. Lets DBS debit your reserved amount only for spends your group approves.</p>
        </div>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card className="flex flex-col gap-2 text-xs text-muted">
        <p>
          <span className="font-medium text-ink">Receipt photos</span> are deleted from DBS servers 30 days after you scan them. The items you
          saved stay in your group's history.
        </p>
        <p>
          <span className="font-medium text-ink">Card imports</span> share only the merchant, date and amount with your group.
        </p>
        <p>
          <span className="font-medium text-ink">Itemised purchase data</span> is never sold to third parties.
        </p>
      </Card>
    </Screen>
  );
}
