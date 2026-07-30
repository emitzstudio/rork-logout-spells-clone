import { Copy, Gift, Share2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { fmtDay } from "@/data/account/derive";
import type { Referral, ReferralStatus } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

const STATUS_COPY: Record<ReferralStatus, { label: string; color: string }> = {
  invited: { label: "Invited", color: "rgba(245,240,232,0.5)" },
  joined: { label: "Joined the circle", color: Colors.goldLight },
  booked: { label: "Booked a spell", color: "#6EE7B7" },
};

function ReferralRow({ referral }: { referral: Referral }) {
  const status = STATUS_COPY[referral.status];
  return (
    <View style={styles.row} testID={`referral-${referral.id}`}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowInitial}>{referral.name.charAt(0)}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{referral.name}</Text>
        <Text style={[styles.rowStatus, { color: status.color }]}>
          {status.label}
          {referral.bookedSpell ? ` · ${referral.bookedSpell}` : ""}
        </Text>
        <Text style={styles.rowDate}>Invited {fmtDay(referral.invitedAt)}</Text>
      </View>
      <Text style={[styles.rowReward, referral.reward > 0 ? styles.rowRewardEarned : null]}>
        {referral.reward > 0 ? `+${formatINR(referral.reward)}` : "—"}
      </Text>
    </View>
  );
}

/** Referrals — share the code, grow the circle, earn travel credit. */
export default function ReferralsScreen() {
  const { data } = useAccount();
  const [copied, setCopied] = useState<boolean>(false);

  const referrals = useMemo(() => data?.referrals ?? [], [data]);
  const earned = useMemo(
    () => referrals.reduce((sum, r) => sum + r.reward, 0),
    [referrals],
  );
  const code = data?.profile.referralCode ?? "";

  const shareCode = async (): Promise<void> => {
    try {
      await Share.share({
        message: `Come log out with me ✦ Use my code ${code} on Logout Spells and we both earn travel credit. logoutspells.com`,
      });
    } catch {
      /* user dismissed the sheet */
    }
  };

  const copyCode = (): void => {
    hapticSuccess();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SpaceShell title="Referrals">
      {/* Code card */}
      <View style={styles.codeCard}>
        <Gift size={22} color={Colors.goldLight} />
        <Text style={styles.codeTitle}>Bring someone with you</Text>
        <Text style={styles.codeSub}>
          They join with your code, you earn {formatINR(2000)} of travel credit the day they book
          their first spell.
        </Text>
        <PressableScale onPress={copyCode} scaleTo={0.97} style={styles.codeBox} testID="referral-code">
          <Text style={styles.code}>{code}</Text>
          <Copy size={15} color={copied ? "#6EE7B7" : "rgba(184,150,62,0.8)"} />
        </PressableScale>
        {copied ? <Text style={styles.copiedNote}>Held in mind — share it anywhere ✦</Text> : null}
        <PressableScale onPress={() => void shareCode()} haptic="medium" style={styles.shareBtn} testID="referral-share">
          <View style={styles.shareRow}>
            <Share2 size={15} color={Colors.charcoalDeep} />
            <Text style={styles.shareText}>SHARE YOUR CODE</Text>
          </View>
        </PressableScale>
      </View>

      {/* Earnings */}
      <View style={styles.earnRow}>
        <View style={styles.earnCell}>
          <Text style={styles.earnNum}>{referrals.length}</Text>
          <Text style={styles.earnLabel}>INVITED</Text>
        </View>
        <View style={styles.earnCell}>
          <Text style={styles.earnNum}>
            {referrals.filter((r) => r.status === "booked").length}
          </Text>
          <Text style={styles.earnLabel}>BOOKED</Text>
        </View>
        <View style={styles.earnCell}>
          <Text style={[styles.earnNum, styles.earnGold]}>{formatINR(earned)}</Text>
          <Text style={styles.earnLabel}>EARNED</Text>
        </View>
      </View>

      {/* List */}
      <View style={styles.list}>
        <Text style={styles.listTitle}>Your circle so far</Text>
        {referrals.map((r) => (
          <ReferralRow key={r.id} referral={r} />
        ))}
        {referrals.length === 0 ? (
          <Text style={styles.empty}>No invites yet — magic spreads by word of mouth ✦</Text>
        ) : null}
      </View>
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.07)",
    padding: 22,
    alignItems: "center",
  },
  codeTitle: {
    marginTop: 12,
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
    textAlign: "center",
  },
  codeSub: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(245,240,232,0.6)",
  },
  codeBox: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(184,150,62,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  code: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    letterSpacing: 2,
    color: Colors.goldHi,
  },
  copiedNote: {
    marginTop: 10,
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "#6EE7B7",
  },
  shareBtn: {
    marginTop: 16,
    alignSelf: "stretch",
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  shareText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.charcoalDeep,
  },
  earnRow: {
    marginHorizontal: 20,
    marginTop: 14,
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    paddingVertical: 16,
  },
  earnCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  earnNum: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  earnGold: {
    color: Colors.goldLight,
  },
  earnLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.45)",
  },
  list: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.025)",
    padding: 14,
    marginBottom: 10,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#221b0e",
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowInitial: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.goldLight,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.cream,
  },
  rowStatus: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  rowDate: {
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.35)",
  },
  rowReward: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.35)",
  },
  rowRewardEarned: {
    color: "#6EE7B7",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 24,
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.4)",
  },
});
