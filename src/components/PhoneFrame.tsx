import type { ReactNode } from "react";

/** A phone-sized frame on desktop; full screen on a real phone. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[844px] max-h-[calc(100vh-7rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-surface shadow-2xl max-sm:h-[calc(100vh-7rem)] max-sm:rounded-2xl max-sm:border-4">
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
