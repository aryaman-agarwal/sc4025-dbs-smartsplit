import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { DemoToolbar } from "./components/DemoToolbar";
import { PhoneFrame } from "./components/PhoneFrame";
import { useAppStore } from "./store/useAppStore";
import { Dashboard } from "./screens/A_Dashboard";
import { CreateGroup } from "./screens/A2_CreateGroup";
import { GroupDetail } from "./screens/A1_GroupDetail";
import { AddExpense } from "./screens/B_AddExpense";
import { AssignItems } from "./screens/C_AssignItems";
import { Settlement } from "./screens/D_Settlement";
import { PaymentConfirm } from "./screens/D1_PaymentConfirm";
import { VaultDetail } from "./screens/E_VaultDetail";
import { VaultSpend } from "./screens/E1_VaultSpend";
import { Inbox } from "./screens/Inbox";

/**
 * Route map. Screen letters match the PRD (Section 5.6, Table 20):
 * A dashboard · B add expense · C itemised assigner · D settlement ·
 * D1 payment confirmation · E vault detail · E1 pay or claim from vault.
 */
export default function App() {
  const runReminders = useAppStore((s) => s.runReminders);
  const expireStaleSpends = useAppStore((s) => s.expireStaleSpends);
  const currentUserId = useAppStore((s) => s.currentUserId);

  // Background jobs a real backend would run on a schedule.
  useEffect(() => {
    runReminders();
    expireStaleSpends();
  }, [runReminders, expireStaleSpends, currentUserId]);

  return (
    <div className="flex min-h-full flex-col items-center gap-4 px-4 py-6">
      <DemoToolbar />
      <PhoneFrame>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/groups/new" element={<CreateGroup />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/add" element={<AddExpense />} />
          <Route path="/groups/:groupId/assign" element={<AssignItems />} />
          <Route path="/groups/:groupId/settle" element={<Settlement />} />
          <Route path="/groups/:groupId/settle/confirm" element={<PaymentConfirm />} />
          <Route path="/groups/:groupId/vault" element={<VaultDetail />} />
          <Route path="/groups/:groupId/vault/spend" element={<VaultSpend />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </PhoneFrame>
    </div>
  );
}
