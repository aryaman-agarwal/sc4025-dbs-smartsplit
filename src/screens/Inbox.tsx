import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Banner, Button, Card, Screen, SectionTitle } from "../components/ui";
import type { Notification } from "../domain/types";
import { useMyNotifications } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/** Today / Yesterday / "12 Nov", measured against the demo clock. */
function dayLabel(iso: string, nowIso: string): string {
  const day = (d: string) => new Date(d).toLocaleDateString("en-SG");
  const now = new Date(nowIso);
  if (day(iso) === day(nowIso)) return "Today";
  if (day(iso) === day(new Date(now.getTime() - 86_400_000).toISOString())) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: now.getFullYear() === new Date(iso).getFullYear() ? undefined : "numeric" });
}

const isReminder = (n: Notification) => n.route?.endsWith("/settle") ?? false;

/**
 * Notification inbox: invites, payments, vault alerts and reminders (US-13, US-19).
 * Grouped by day. Reminders carry a one-tap Settle button.
 * Every notification links inside the app only; never to an external URL.
 */
export function Inbox() {
  const navigate = useNavigate();
  const items = useMyNotifications();
  const markAllRead = useAppStore((s) => s.markAllRead);
  const now = useAppStore((s) => s.now);

  useEffect(() => {
    return () => markAllRead();
  }, [markAllRead]);

  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of sorted) {
    const label = dayLabel(n.createdAt, now());
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1)!.items.push(n);
  }

  return (
    <Screen title="Notifications" back>
      {items.length === 0 && <Banner>You're all caught up.</Banner>}
      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-2">
          <SectionTitle>{g.label}</SectionTitle>
          {g.items.map((n) => (
            <Card key={n.id} onClick={n.route && !isReminder(n) ? () => navigate(n.route!) : undefined} className={n.read ? "opacity-70" : "border-l-4 border-brand"}>
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-muted">{n.body}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted">{new Date(n.createdAt).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit" })}</p>
                {isReminder(n) && (
                  <Button className="px-4 py-1.5 text-xs" onClick={() => navigate(n.route!)}>
                    Settle
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </section>
      ))}
    </Screen>
  );
}
