import { Clock, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { Avatar } from "./ui";

/**
 * Presenter controls that sit OUTSIDE the phone frame:
 * - switch between Amy, Ben, Cal and Dee to show both sides of a payment or approval
 * - move the demo clock forward to show reminders, expiry and cooling-off
 * - reset all demo data
 */
export function DemoToolbar() {
  const navigate = useNavigate();
  const members = useAppStore((s) => s.members);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const switchUser = useAppStore((s) => s.switchUser);
  const advanceClock = useAppStore((s) => s.advanceClock);
  const offset = useAppStore((s) => s.clockOffsetHours);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const demoIds = ["amy", "ben", "cal", "dee"];

  return (
    <div className="flex w-full max-w-[640px] flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <span className="font-semibold text-muted">Viewing as</span>
      {demoIds.map((id) => (
        <button
          key={id}
          onClick={() => {
            switchUser(id);
            navigate("/");
          }}
          className={`flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-0.5 ${currentUserId === id ? "bg-ink text-white" : "hover:bg-neutral-100"}`}
        >
          <Avatar member={members[id]} size={22} />
          {members[id].displayName.split(" ")[0]}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-line" />
      <button onClick={() => advanceClock(24)} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-neutral-100" title="Move the demo clock forward">
        <Clock size={14} /> +24h{offset ? ` (now +${offset}h)` : ""}
      </button>
      <button
        onClick={() => {
          resetDemo();
          navigate("/");
        }}
        className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-neutral-100"
      >
        <RotateCcw size={14} /> Reset
      </button>
      <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800">Demo — no real money moved</span>
    </div>
  );
}
