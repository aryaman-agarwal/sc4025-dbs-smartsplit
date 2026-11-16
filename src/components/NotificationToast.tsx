import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Notification } from "../domain/types";
import { useMyNotifications } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

/**
 * Push-style banner at the top of the phone when a new notification arrives
 * for the person viewing (US-13 vault alerts, US-19 reminders). Tapping it
 * opens the notification's in-app link. Switching demo user doesn't replay
 * old notifications.
 */
export function NotificationToast() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const me = useAppStore((s) => s.currentUserId);
  const items = useMyNotifications();
  const seen = useRef<{ user: string; ids: Set<string> }>({ user: me, ids: new Set(items.map((n) => n.id)) });
  const [shown, setShown] = useState<Notification>();

  useEffect(() => {
    if (seen.current.user !== me) {
      seen.current = { user: me, ids: new Set(items.map((n) => n.id)) };
      setShown(undefined);
      return;
    }
    const fresh = items.filter((n) => !seen.current.ids.has(n.id));
    fresh.forEach((n) => seen.current.ids.add(n.id));
    if (fresh.length > 0 && pathname !== "/inbox") setShown(fresh[0]);
  }, [items, me, pathname]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(undefined), 4000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  return (
    <button
      role="status"
      onClick={() => {
        setShown(undefined);
        navigate(shown.route ?? "/inbox");
      }}
      className="absolute top-3 right-3 left-3 z-40 flex items-start gap-3 rounded-2xl bg-ink/95 p-3 text-left text-white shadow-lg"
    >
      <Bell size={18} className="mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{shown.title}</span>
        <span className="line-clamp-2 text-xs opacity-80">{shown.body}</span>
      </span>
    </button>
  );
}
