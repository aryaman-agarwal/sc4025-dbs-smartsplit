import { ChevronLeft, Bell } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatSGD } from "../domain/money";
import type { Cents, Member } from "../domain/types";
import { useMyNotifications } from "../store/selectors";

/**
 * Shared UI building blocks. Keep screens consistent by using these rather
 * than restyling buttons and cards in each screen.
 */

export function Screen({ title, back, children, action }: { title: string; back?: string | boolean; children: ReactNode; action?: ReactNode }) {
  const navigate = useNavigate();
  const unread = useMyNotifications().filter((n) => !n.read).length;
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/95 px-3 pt-4 pb-3 backdrop-blur">
        {back ? (
          <button
            aria-label="Back"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className="-ml-1 rounded-full p-1 hover:bg-neutral-100"
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}
        <h1 className="flex-1 truncate text-[17px] font-semibold">{title}</h1>
        {action}
        <button aria-label="Notifications" onClick={() => navigate("/inbox")} className="relative rounded-full p-1.5 hover:bg-neutral-100">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-3 p-4">{children}</main>
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-neutral-300",
    secondary: "bg-white text-ink border border-line hover:bg-neutral-50 disabled:text-neutral-400",
    ghost: "text-brand hover:bg-brand-soft disabled:text-neutral-400",
    danger: "bg-white text-brand border border-brand/30 hover:bg-brand-soft",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm ${onClick ? "hover:bg-neutral-50" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function Avatar({ member, size = 32 }: { member?: Member; size?: number }) {
  const initials = (member?.displayName ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: member?.avatarColor ?? "#9ca3af", fontSize: size * 0.38 }}
      aria-label={member?.displayName}
    >
      {initials}
    </span>
  );
}

export function Money({ cents, className = "" }: { cents: Cents; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatSGD(cents)}</span>;
}

/**
 * "You owe $X" / "You are owed $X" / "Settled" (US-03).
 * Colour is never the only signal: the words carry the meaning (PRD 5.7 accessibility).
 */
export function PositionLabel({ balance }: { balance: Cents }) {
  if (balance === 0) return <span className="text-sm font-medium text-muted">Settled</span>;
  if (balance < 0) return <span className="text-sm font-semibold text-owe">You owe {formatSGD(-balance)}</span>;
  return <span className="text-sm font-semibold text-owed">You are owed {formatSGD(balance)}</span>;
}

export function Banner({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const styles = {
    info: "bg-sky-50 text-sky-900 border-sky-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
    error: "bg-red-50 text-red-900 border-red-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  };
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${styles[tone]}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">{children}</h2>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

/**
 * Marks a screen or section that a teammate still needs to build.
 * Lists the user stories and what's left, so the gap is obvious in demos.
 * Delete it once the work is done.
 */
export function TodoPanel({ owner, stories, items }: { owner: string; stories: string; items: string[] }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-xs text-violet-900">
      <p className="font-semibold">
        TODO · {owner} · {stories}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
