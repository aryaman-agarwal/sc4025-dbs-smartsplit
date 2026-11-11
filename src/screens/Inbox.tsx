import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Banner, Card, Screen, TodoPanel } from "../components/ui";
import { useMyNotifications } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/**
 * Notification inbox: invites, payments, vault alerts and reminders (US-13, US-19).
 * Every notification links inside the app only; never to an external URL.
 */
export function Inbox() {
  const navigate = useNavigate();
  const items = useMyNotifications();
  const markAllRead = useAppStore((s) => s.markAllRead);

  useEffect(() => {
    return () => markAllRead();
  }, [markAllRead]);

  return (
    <Screen title="Notifications" back>
      {items.length === 0 && <Banner>You're all caught up.</Banner>}
      {items.map((n) => (
        <Card key={n.id} onClick={n.route ? () => navigate(n.route!) : undefined} className={n.read ? "opacity-70" : "border-l-4 border-brand"}>
          <p className="text-sm font-semibold">{n.title}</p>
          <p className="text-xs text-muted">{n.body}</p>
          <p className="mt-1 text-[11px] text-muted">{new Date(n.createdAt).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" })}</p>
        </Card>
      ))}
      <TodoPanel
        owner="#2 PM"
        stories="US-13, US-19"
        items={["Group notifications by day", "Inline 'Settle' button on reminder notifications", "Push-style toast when a new notification arrives"]}
      />
    </Screen>
  );
}
