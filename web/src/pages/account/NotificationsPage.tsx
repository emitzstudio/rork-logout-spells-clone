import { CheckCheck } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AccountPage, EmptyState, NOTIF_META } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { timeAgo } from "@/data/account/derive";
import type { AppNotification } from "@/data/account/models";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

interface Group {
  label: string;
  items: AppNotification[];
}

/** Notification center — whispers from your trips, wallet and circle. */
export default function NotificationsPage() {
  const { data, unreadCount, markNotificationRead, markAllNotificationsRead } = useAccount();
  const navigate = useNavigate();

  const groups = useMemo<Group[]>(() => {
    if (!data) return [];
    const now = Date.now();
    const today: AppNotification[] = [];
    const week: AppNotification[] = [];
    const earlier: AppNotification[] = [];
    const sorted = [...data.notifications].sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    for (const n of sorted) {
      const age = now - Date.parse(n.time);
      if (age < DAY) today.push(n);
      else if (age < 7 * DAY) week.push(n);
      else earlier.push(n);
    }
    return [
      { label: "Today", items: today },
      { label: "This week", items: week },
      { label: "Earlier", items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [data]);

  if (!data) return null;

  return (
    <AccountPage
      title="Notifications"
      eyebrow="Notifications"
      heading={
        <>
          Quiet <span className="italic text-gold-gradient">whispers.</span>
        </>
      }
      sub="Only the things worth telling you — trips, payments, memories and your circle."
      actions={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={() =>
              void markAllNotificationsRead().then(() => toast("All caught up ✦"))
            }
            className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        ) : undefined
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          symbol="☾"
          title="Perfect silence."
          line="No notifications — the world will whisper when it needs you."
        />
      ) : (
        <div className="space-y-9">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <p className="eyebrow !text-[10px]">{group.label}</p>
              <div className="mt-3.5 space-y-2">
                {group.items.map((n) => {
                  const meta = NOTIF_META[n.kind];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        void markNotificationRead(n.id);
                        if (n.link !== undefined) navigate(n.link);
                      }}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:border-gold/30 md:px-5",
                        n.read
                          ? "border-cream/[0.07] bg-charcoal-soft/30"
                          : "border-gold/20 bg-gold/[0.04]",
                      )}
                    >
                      <span className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border", meta.tint)}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-sans text-[13.5px]", n.read ? "text-cream/65" : "text-cream")}>
                          {n.title}
                        </span>
                        <span className="mt-1 block font-sans text-[12px] leading-relaxed text-cream/40">
                          {n.body}
                        </span>
                        <span className="mt-1.5 block font-sans text-[10px] uppercase tracking-[0.18em] text-cream/30">
                          {timeAgo(n.time)}
                        </span>
                      </span>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(184,150,62,0.7)]" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </AccountPage>
  );
}
