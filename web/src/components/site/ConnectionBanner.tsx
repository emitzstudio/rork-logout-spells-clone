import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ConnectionState = "online" | "offline" | "restored";

/**
 * A quiet connection indicator (M10): appears only when the browser loses
 * its network, flips to a brief "back online" note on recovery, and nudges
 * React Query to refetch everything the outage may have broken.
 */
export default function ConnectionBanner() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>("online");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const goOffline = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setState("offline");
    };
    const goOnline = () => {
      setState("restored");
      // Failed reads heal immediately instead of waiting for a focus refetch.
      void queryClient.invalidateQueries();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setState("online"), 2600);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (!navigator.onLine) setState("offline");
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [queryClient]);

  if (state === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[200] flex justify-center px-5"
    >
      <span
        className={
          state === "offline"
            ? "flex items-center gap-2.5 rounded-full border border-cream/15 bg-charcoal-deep/95 px-5 py-2.5 font-sans text-xs tracking-[0.08em] text-cream/80 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "flex items-center gap-2.5 rounded-full border border-gold/35 bg-charcoal-deep/95 px-5 py-2.5 font-sans text-xs tracking-[0.08em] text-gold-light shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        }
      >
        {state === "offline" ? (
          <>
            <WifiOff size={13} aria-hidden />
            You're offline — some things may not load
          </>
        ) : (
          <>
            <Wifi size={13} aria-hidden />
            Back online
          </>
        )}
      </span>
    </div>
  );
}
