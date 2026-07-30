import { useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  Gift,
  Images,
  Sparkles,
  Wallet,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { timeAgo } from "@/data/account/derive";
import type { AppNotification, NotificationKind } from "@/data/account/models";
import { useAccount } from "@/providers/AccountProvider";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  trip: CalendarDays,
  payment: Wallet,
  memory: Images,
  offer: Sparkles,
  referral: Gift,
  system: Bell,
};

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const Icon = KIND_ICON[item.kind];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.row, !item.read ? styles.rowUnread : null]}
      testID={`notification-${item.id}`}
    >
      <View style={[styles.icon, !item.read ? styles.iconUnread : null]}>
        <Icon size={15} color={!item.read ? Colors.goldLight : "rgba(245,240,232,0.45)"} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, !item.read ? styles.titleUnread : null]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{timeAgo(item.time)}</Text>
      </View>
      {!item.read ? <View style={styles.dot} /> : null}
    </PressableScale>
  );
}

/** Notifications — everything that moved, newest first. */
export default function NotificationsScreen() {
  const router = useRouter();
  const { data, unreadCount, markNotificationRead, markAllNotificationsRead } = useAccount();

  const notifications = useMemo(() => data?.notifications ?? [], [data]);

  const open = (item: AppNotification): void => {
    if (!item.read) void markNotificationRead(item.id);
    if (item.link) router.push(item.link as never);
  };

  return (
    <SpaceShell title="Notifications">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>The pulse</Text>
          <Text style={styles.sub}>
            {unreadCount > 0
              ? `${unreadCount} unread — the circle has been busy.`
              : "All caught up. Quiet, in the best way."}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <PressableScale
            onPress={() => void markAllNotificationsRead()}
            scaleTo={0.94}
            style={styles.markAll}
            testID="notifications-mark-all"
          >
            <Text style={styles.markAllText}>MARK ALL READ</Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.list}>
        {notifications.map((n) => (
          <NotificationRow key={n.id} item={n} onPress={() => open(n)} />
        ))}
        {notifications.length === 0 ? (
          <Text style={styles.empty}>Nothing yet — book a spell and this room wakes up ✦</Text>
        ) : null}
      </View>
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  sub: {
    marginTop: 4,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.5)",
  },
  markAll: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.4,
    color: Colors.goldLight,
  },
  list: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.02)",
    padding: 14,
  },
  rowUnread: {
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.05)",
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnread: {
    borderColor: "rgba(184,150,62,0.4)",
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 19,
    color: "rgba(245,240,232,0.75)",
  },
  titleUnread: {
    color: Colors.cream,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(245,240,232,0.5)",
  },
  time: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.35)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.goldLight,
    marginTop: 4,
  },
  empty: {
    textAlign: "center",
    paddingVertical: 30,
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.4)",
  },
});
