import { ArrowDownLeft, ArrowUpRight, Gift } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import {
  deriveTransactions,
  deriveWalletSummary,
  fmtDayYear,
} from "@/data/account/derive";
import type { WalletTransaction } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { useAccount } from "@/providers/AccountProvider";

function TxnRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.kind === "credit";
  const isRefund = txn.kind === "refund";
  const Icon = isCredit ? Gift : isRefund ? ArrowDownLeft : ArrowUpRight;
  const tint = isCredit || isRefund ? "#6EE7B7" : Colors.goldLight;
  const sign = isCredit || isRefund ? "+" : "−";

  return (
    <View style={styles.txn} testID={`txn-${txn.id}`}>
      <View style={[styles.txnIcon, { borderColor: `${tint}55` }]}>
        <Icon size={15} color={tint} />
      </View>
      <View style={styles.txnText}>
        <Text style={styles.txnTitle} numberOfLines={1}>
          {txn.title}
        </Text>
        <Text style={styles.txnSub} numberOfLines={1}>
          {txn.subtitle}
        </Text>
        <Text style={styles.txnMeta}>
          {fmtDayYear(txn.date)} · {txn.method}
        </Text>
      </View>
      <Text style={[styles.txnAmount, { color: tint }]}>
        {sign}{formatINR(txn.amount)}
      </Text>
    </View>
  );
}

/** Wallet — travel credit, invested-in-journeys and the full ledger. */
export default function WalletScreen() {
  const { data } = useAccount();

  const txns = useMemo(() => (data ? deriveTransactions(data) : []), [data]);
  const summary = useMemo(() => deriveWalletSummary(txns), [txns]);

  return (
    <SpaceShell title="Wallet">
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryGold]}>
          <Text style={styles.summaryLabel}>TRAVEL CREDIT</Text>
          <Text style={styles.summaryValueGold}>{formatINR(summary.credits)}</Text>
          <Text style={styles.summaryNote}>Applied to your next booking</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>INVESTED IN JOURNEYS</Text>
          <Text style={styles.summaryValue}>{formatINR(summary.invested)}</Text>
          <Text style={styles.summaryNote}>
            across {summary.tripsPaid} booking{summary.tripsPaid === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <View style={styles.ledger}>
        <Text style={styles.ledgerTitle}>Every rupee, accounted</Text>
        <Text style={styles.ledgerSub}>Payments, refunds and rewards — newest first.</Text>
        <View style={styles.txns}>
          {txns.map((t) => (
            <TxnRow key={t.id} txn={t} />
          ))}
          {txns.length === 0 ? (
            <Text style={styles.empty}>No transactions yet — your first spell awaits ✦</Text>
          ) : null}
        </View>
      </View>
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.09)",
    backgroundColor: "rgba(245,240,232,0.03)",
    padding: 16,
    gap: 6,
  },
  summaryGold: {
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  summaryLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.5)",
  },
  summaryValueGold: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    color: Colors.goldHi,
  },
  summaryValue: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    color: Colors.cream,
  },
  summaryNote: {
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.45)",
  },
  ledger: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  ledgerTitle: {
    fontFamily: Fonts.serif,
    fontSize: 25,
    color: Colors.cream,
  },
  ledgerSub: {
    marginTop: 3,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.5)",
  },
  txns: {
    marginTop: 16,
    gap: 10,
  },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.025)",
    padding: 14,
  },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  txnText: {
    flex: 1,
    gap: 2,
  },
  txnTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.cream,
  },
  txnSub: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.55)",
  },
  txnMeta: {
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.35)",
  },
  txnAmount: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14.5,
  },
  empty: {
    textAlign: "center",
    paddingVertical: 30,
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.4)",
  },
});
