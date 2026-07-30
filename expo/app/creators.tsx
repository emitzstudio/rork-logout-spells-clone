import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GoldButton, PressableScale } from "@/components/Buttons";
import CountUp from "@/components/CountUp";
import Eyebrow from "@/components/Eyebrow";
import FadeInUp from "@/components/FadeInUp";
import Footer from "@/components/Footer";
import GoldSlider from "@/components/GoldSlider";
import GradientText from "@/components/GradientText";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import { BRAND_CATEGORIES, CREATOR_AUDIENCE, CREATOR_TIERS } from "@/data/site";
import type { CreatorTier } from "@/data/site";
import { useApp } from "@/providers/AppProvider";

type Currency = "INR" | "USD" | "EUR";

const CURRENCIES: { code: Currency; symbol: string; rate: number }[] = [
  { code: "INR", symbol: "₹", rate: 1 },
  { code: "USD", symbol: "$", rate: 1 / 83 },
  { code: "EUR", symbol: "€", rate: 1 / 90 },
];

const PROFIT_MIN_INR = 250000;
const PROFIT_MID_INR = 750000;
const PROFIT_MAX_INR = 1500000;
const PROFIT_STEP_INR = 25000;

const PROCESS_STEPS: { num: string; title: string; body: string }[] = [
  {
    num: "01",
    title: "Join",
    body: "Apply and get selected. We review your profile and match you with the right trips for your audience and content style.",
  },
  {
    num: "02",
    title: "Travel",
    body: "Join curated trips with a community of creators. We handle all logistics — you focus on the experience and your content.",
  },
  {
    num: "03",
    title: "Earn",
    body: "Monetize through content, trip bookings, and brand collaborations. Every view, every booking, every deal adds to your income.",
  },
];

const CONTENT_TYPES: string[] = [
  "🎬 Reels & Short-form Video",
  "✍️ Travel Storytelling",
  "📸 Brand Shoots",
  "🌅 Lifestyle Content",
  "🤝 Brand Collaborations",
];

function tierFor(tripsPerYear: number): CreatorTier {
  let current = CREATOR_TIERS[0];
  for (const tier of CREATOR_TIERS) {
    if (tripsPerYear >= tier.minTripsPerYear) current = tier;
  }
  return current;
}

function formatMoney(inr: number, currency: Currency): string {
  const cur = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const value = inr * cur.rate;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${cur.symbol}${Math.round(value).toLocaleString(locale)}`;
}

/** Compact tick label, e.g. ₹2.5L for INR or $3k for USD/EUR. */
function formatCompact(inr: number, currency: Currency): string {
  const cur = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const value = inr * cur.rate;
  if (currency === "INR") {
    const lakhs = value / 100000;
    return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  return `${cur.symbol}${Math.round(value / 1000)}k`;
}

/* ------------------------------- Calculator -------------------------------- */

function Calculator() {
  const { openApply } = useApp();
  const [currency, setCurrency] = useState<Currency>("INR");
  const [tripsPerMonth, setTripsPerMonth] = useState<number>(1);
  const [avgProfitInr, setAvgProfitInr] = useState<number>(PROFIT_MIN_INR);
  const [selectedTierName, setSelectedTierName] = useState<string | null>(null);

  const tripsPerYear = tripsPerMonth * 12;
  const autoTier = useMemo<CreatorTier>(() => tierFor(tripsPerYear), [tripsPerYear]);
  const tier = useMemo<CreatorTier>(
    () => CREATOR_TIERS.find((t) => t.name === selectedTierName) ?? autoTier,
    [selectedTierName, autoTier],
  );
  const yearly = tripsPerYear * avgProfitInr * (tier.share / 100);

  return (
    <Reveal>
      <View style={styles.calcCard}>
        <Eyebrow>Creator Calculator</Eyebrow>
        <View style={styles.calcTitleRow}>
          <Text style={styles.calcTitle}>See What You </Text>
          <GradientText style={styles.calcTitleItalic}>Could Earn</GradientText>
        </View>
        <Text style={styles.calcSub}>Estimate your potential earnings from hosting Spells.</Text>

        {/* Currency toggle */}
        <View style={styles.currencyRow}>
          {CURRENCIES.map((c) => {
            const active = currency === c.code;
            return (
              <PressableScale
                key={c.code}
                onPress={() => setCurrency(c.code)}
                scaleTo={0.94}
                style={[styles.currencyButton, active ? styles.currencyActive : null]}
                testID={`currency-${c.code}`}
              >
                <Text style={[styles.currencyText, active ? styles.currencyTextActive : null]}>
                  {c.symbol} {c.code}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Trips per month */}
        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Trips hosted per month</Text>
            <Text style={styles.sliderValue}>
              {tripsPerMonth} {tripsPerMonth === 1 ? "trip" : "trips"}
            </Text>
          </View>
          <GoldSlider
            min={1}
            max={3}
            step={1}
            value={tripsPerMonth}
            onChange={(v) => {
              setTripsPerMonth(v);
              setSelectedTierName(null);
            }}
            ticks={["1", "2", "3"]}
          />
        </View>

        {/* Avg profit per trip */}
        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Avg. profit per trip</Text>
            <Text style={styles.sliderValue}>{formatMoney(avgProfitInr, currency)}</Text>
          </View>
          <GoldSlider
            min={PROFIT_MIN_INR}
            max={PROFIT_MAX_INR}
            step={PROFIT_STEP_INR}
            value={avgProfitInr}
            onChange={setAvgProfitInr}
            ticks={[
              formatCompact(PROFIT_MIN_INR, currency),
              formatCompact(PROFIT_MID_INR, currency),
              `${formatCompact(PROFIT_MAX_INR, currency)}+`,
            ]}
          />
        </View>

        {/* Tiers */}
        <View style={styles.tierSection}>
          <Eyebrow>Creator Tier</Eyebrow>
          <Text style={styles.tierIntro}>
            Creators start as Wanderers and unlock higher profit shares as they host more trips.
          </Text>
          <View style={styles.tierList}>
            {CREATOR_TIERS.map((t) => {
              const isActive = tier.name === t.name;
              return (
                <PressableScale
                  key={t.name}
                  onPress={() => setSelectedTierName(t.name)}
                  scaleTo={0.98}
                  style={[styles.tierRow, isActive ? styles.tierRowActive : styles.tierRowInactive]}
                  testID={`tier-${t.name}`}
                >
                  <Text style={styles.tierEmoji}>{t.emoji}</Text>
                  <View style={styles.tierBody}>
                    <Text style={styles.tierName}>
                      {t.tier} — <Text style={styles.tierNameItalic}>{t.name}</Text>
                    </Text>
                    <Text style={styles.tierMeta}>
                      {t.trips} · {t.share}% profit share
                    </Text>
                  </View>
                  <Text style={styles.tierShare}>{t.share}%</Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={styles.tierCaption}>HIGHER TIERS UNLOCK HIGHER DIVIDENDS.</Text>
        </View>

        {/* Projection */}
        <View style={styles.projection}>
          <Eyebrow center>Your yearly projection</Eyebrow>
          <View style={styles.projectionMeta}>
            <Text style={styles.projectionMetaText}>
              Trips / month <Text style={styles.projectionMetaStrong}>{tripsPerMonth}</Text>
            </Text>
            <View style={styles.projectionDivider} />
            <Text style={styles.projectionMetaText}>
              Your tier <Text style={styles.projectionMetaGold}>{tier.name}</Text>
            </Text>
          </View>
          <FadeInUp key={`${yearly}-${currency}`}>
            <GradientText style={styles.projectionAmount}>
              {formatMoney(yearly, currency)}
            </GradientText>
          </FadeInUp>
          <Text style={styles.projectionPer}>PER YEAR</Text>
          <Text style={styles.projectionDisclaimer}>
            Estimated based on typical Logout Spells trip economics. Actual earnings may vary.
          </Text>
          <View style={styles.projectionPerks}>
            <Text style={styles.projectionPerk}>✦ Plus fully funded trips worldwide.</Text>
            <Text style={styles.projectionPerk}>✦ We handle logistics. You collect profits.</Text>
          </View>
          <View style={styles.topEarnerBox}>
            <Text style={styles.topEarnerText}>
              Top creators on Logout Spells earn{" "}
              <Text style={styles.topEarnerStrong}>₹1 Cr+</Text> annually.
            </Text>
          </View>
          <GoldButton
            label="Apply to Start Earning"
            onPress={openApply}
            style={styles.projectionCta}
            testID="calc-apply"
          />
        </View>
      </View>
    </Reveal>
  );
}

/* --------------------------------- Screen ---------------------------------- */

export default function CreatorsScreen() {
  const { openApply } = useApp();

  return (
    <View style={styles.flex}>
      <StackHeader title="Become a Spellcaster" />
      <RevealScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        {/* Hero */}
        <View style={[styles.section, styles.centered]}>
          <Reveal style={styles.centered}>
            <Eyebrow center>For Creators</Eyebrow>
            <Text style={styles.heroTitle}>Turn Your Travels</Text>
            <GradientText style={styles.heroTitleItalic}>Into Income</GradientText>
            <Text style={styles.heroTag}>Travel the world. Create content. Get paid.</Text>
            <Text style={styles.heroBody}>
              Logout Spells helps creators turn travel into opportunity — where every trip becomes
              content, and every piece of content becomes income.
            </Text>
            <View style={styles.heroCtas}>
              <GoldButton label="Apply as a Creator →" onPress={openApply} testID="creators-apply" />
              <View style={styles.earnChip}>
                <Text style={styles.earnChipText}>
                  Creators typically earn $2,000–$2,500 per trip
                </Text>
              </View>
            </View>
          </Reveal>
        </View>

        {/* Calculator */}
        <View style={styles.sectionTight}>
          <Calculator />
        </View>

        {/* Process */}
        <View style={[styles.section, styles.sectionDeep]}>
          <Reveal style={styles.centered}>
            <Eyebrow center>The Process</Eyebrow>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>How It </Text>
              <GradientText style={styles.sectionTitleItalic}>Works</GradientText>
            </View>
            <Text style={styles.sectionSub}>Three steps from application to income</Text>
          </Reveal>
          <View style={styles.processList}>
            {PROCESS_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <View style={styles.processCard}>
                  <Text style={styles.processNum}>{step.num}</Text>
                  <Text style={styles.processTitle}>{step.title}</Text>
                  <Text style={styles.processBody}>{step.body}</Text>
                </View>
              </Reveal>
            ))}
          </View>
        </View>

        {/* Content opportunities */}
        <View style={styles.section}>
          <Reveal>
            <Eyebrow>Content Opportunities</Eyebrow>
            <View style={styles.sectionTitleRowLeft}>
              <Text style={styles.contentTitle}>Build your portfolio </Text>
              <GradientText style={styles.contentTitleItalic}>while traveling</GradientText>
            </View>
            <Text style={styles.contentBody}>
              Every trip is a production. Every destination is a set. You&apos;re not just a
              traveler — you&apos;re building a body of work that opens doors.
            </Text>
          </Reveal>
          <Reveal delay={100}>
            <View style={styles.chipWrap}>
              {CONTENT_TYPES.map((c) => (
                <View key={c} style={styles.contentChip}>
                  <Text style={styles.contentChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </Reveal>
        </View>

        {/* Brand collaborations */}
        <View style={[styles.section, styles.sectionDeep]}>
          <Reveal style={styles.centered}>
            <Eyebrow center>Brand Collaborations</Eyebrow>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Collaborate With </Text>
              <GradientText style={styles.sectionTitleItalic}>Amazing Brands</GradientText>
            </View>
            <Text style={[styles.sectionSub, styles.sectionSubWide]}>
              When you host a Logout Spell, you don&apos;t just travel — you build partnerships
              with global lifestyle brands.
            </Text>
          </Reveal>
          <View style={styles.brandList}>
            {BRAND_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.name} delay={Math.min(i * 60, 240)}>
                <View style={styles.brandCard}>
                  <Text style={styles.brandTitle}>
                    <Text style={styles.brandEmoji}>{cat.emoji} </Text>
                    {cat.name}
                  </Text>
                  <View style={styles.brandChips}>
                    {cat.brands.map((b) => (
                      <View key={b} style={styles.brandChip}>
                        <Text style={styles.brandChipText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Reveal>
            ))}
            <Reveal delay={300}>
              <View style={styles.portfolioCard}>
                <Text style={styles.portfolioText}>
                  🤝 Every spell you host builds your creator portfolio — opening doors to brand
                  deals, collaborations, and global recognition.
                </Text>
              </View>
            </Reveal>
          </View>
        </View>

        {/* Who this is for + testimonial + stats */}
        <View style={styles.section}>
          <Reveal style={styles.centered}>
            <Eyebrow center>Who This Is For</Eyebrow>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>This is for </Text>
              <GradientText style={styles.sectionTitleItalic}>you if…</GradientText>
            </View>
          </Reveal>
          <Reveal delay={80}>
            <View style={[styles.chipWrap, styles.chipWrapCenter]}>
              {CREATOR_AUDIENCE.map((a) => (
                <View key={a.label} style={styles.audienceChip}>
                  <Text style={styles.audienceChipText}>
                    {a.emoji} {a.label}
                  </Text>
                </View>
              ))}
            </View>
          </Reveal>

          <Reveal delay={120}>
            <View style={styles.testimonial}>
              <Text style={styles.testimonialQuoteMark}>&quot;</Text>
              <Text style={styles.testimonialQuote}>
                I went on my first Logout Spells trip not knowing what to expect. I came back with
                3 brand deals, 40K new followers, and a reel that hit 2M views. This changed
                everything.
              </Text>
              <Text style={styles.testimonialFooter}>
                — CREATOR, LOGOUT SPELLS · VOYAGER TIER
              </Text>
            </View>
          </Reveal>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <GradientText style={styles.statValue}>₹1Cr+</GradientText>
              <Text style={styles.statLabel}>TOP EARNER / YEAR</Text>
            </View>
            <View style={styles.statCell}>
              <CountUp to={1} suffix="+" style={styles.statValueGold} />
              <Text style={styles.statLabel}>ACTIVE SPELLS</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValueGold}>30–50%</Text>
              <Text style={styles.statLabel}>PROFIT SHARE</Text>
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={[styles.section, styles.sectionDeep, styles.centered]}>
          <Reveal style={styles.centered}>
            <Text style={styles.finalTitle}>This isn&apos;t just a trip.</Text>
            <GradientText style={styles.finalTitleItalic}>
              It&apos;s your income stream.
            </GradientText>
            <Text style={styles.finalSub}>
              Limited creator spots available. Applications reviewed individually.
            </Text>
            <View style={styles.finalCtaRow}>
              <GoldButton label="Apply Now →" onPress={openApply} testID="creators-final-apply" />
            </View>
            <Text style={styles.finalDisclaimer}>
              Your earnings depend on your content, audience, and brand collaborations.
            </Text>
          </Reveal>
        </View>

        <Footer />
      </RevealScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 72,
  },
  sectionTight: {
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  sectionDeep: {
    backgroundColor: "rgba(10,8,6,0.4)",
  },
  centered: {
    alignItems: "center",
  },
  heroTitle: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 47,
    color: Colors.cream,
  },
  heroTitleItalic: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 42,
    lineHeight: 50,
  },
  heroTag: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    color: "rgba(245,240,232,0.65)",
  },
  heroBody: {
    marginTop: 16,
    maxWidth: 360,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(245,240,232,0.55)",
  },
  heroCtas: {
    marginTop: 32,
    alignSelf: "stretch",
    gap: 14,
    alignItems: "center",
  },
  earnChip: {
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  earnChipText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(184,150,62,0.8)",
  },
  calcCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
    padding: 24,
  },
  calcTitleRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calcTitle: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.cream,
  },
  calcTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 32,
    lineHeight: 38,
  },
  calcSub: {
    marginTop: 10,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.5)",
  },
  currencyRow: {
    marginTop: 28,
    flexDirection: "row",
    gap: 8,
  },
  currencyButton: {
    height: 44,
    minWidth: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  currencyActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  currencyText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: "rgba(245,240,232,0.6)",
  },
  currencyTextActive: {
    color: Colors.charcoalDeep,
    fontFamily: Fonts.sansSemi,
  },
  sliderBlock: {
    marginTop: 30,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sliderLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(245,240,232,0.7)",
  },
  sliderValue: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.gold,
  },
  tierSection: {
    marginTop: 34,
  },
  tierIntro: {
    marginTop: 10,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(245,240,232,0.7)",
  },
  tierList: {
    marginTop: 16,
    gap: 10,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  tierRowActive: {
    borderColor: "rgba(184,150,62,0.6)",
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  tierRowInactive: {
    borderColor: "rgba(245,240,232,0.07)",
    opacity: 0.55,
  },
  tierEmoji: {
    fontSize: 20,
  },
  tierBody: {
    flex: 1,
    gap: 2,
  },
  tierName: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(245,240,232,0.9)",
  },
  tierNameItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: Colors.cream,
  },
  tierMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.55)",
  },
  tierShare: {
    fontFamily: Fonts.serifItalic,
    fontSize: 21,
    color: Colors.gold,
  },
  tierCaption: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 2.2,
    color: "rgba(245,240,232,0.35)",
  },
  projection: {
    marginTop: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    backgroundColor: "rgba(10,8,6,0.7)",
    padding: 26,
    alignItems: "center",
  },
  projectionMeta: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  projectionMetaText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.55)",
  },
  projectionMetaStrong: {
    fontFamily: Fonts.sansSemi,
    color: Colors.cream,
  },
  projectionMetaGold: {
    fontFamily: Fonts.sansSemi,
    color: Colors.goldLight,
  },
  projectionDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(245,240,232,0.2)",
  },
  projectionAmount: {
    marginTop: 22,
    fontFamily: Fonts.serif,
    fontSize: 46,
    lineHeight: 52,
  },
  projectionPer: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 12,
    letterSpacing: 2.4,
    color: "rgba(245,240,232,0.45)",
  },
  projectionDisclaimer: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 17,
    color: "rgba(245,240,232,0.4)",
  },
  projectionPerks: {
    marginTop: 20,
    gap: 6,
    alignItems: "center",
  },
  projectionPerk: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: "rgba(245,240,232,0.7)",
  },
  topEarnerBox: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.06)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topEarnerText: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.goldLight,
  },
  topEarnerStrong: {
    fontFamily: Fonts.sansSemi,
  },
  projectionCta: {
    marginTop: 28,
    alignSelf: "stretch",
  },
  sectionTitleRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  sectionTitleRowLeft: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sectionTitle: {
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
  },
  sectionTitleItalic: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 36,
    lineHeight: 42,
  },
  sectionSub: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(245,240,232,0.5)",
  },
  sectionSubWide: {
    maxWidth: 340,
    lineHeight: 20,
  },
  processList: {
    marginTop: 44,
    gap: 18,
  },
  processCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
    padding: 28,
  },
  processNum: {
    fontFamily: Fonts.serif,
    fontSize: 52,
    color: "rgba(184,150,62,0.3)",
  },
  processTitle: {
    marginTop: 16,
    fontFamily: Fonts.serifItalic,
    fontSize: 27,
    color: Colors.cream,
  },
  processBody: {
    marginTop: 14,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(245,240,232,0.55)",
  },
  contentTitle: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.cream,
  },
  contentTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 34,
    lineHeight: 40,
  },
  contentBody: {
    marginTop: 18,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(245,240,232,0.55)",
  },
  chipWrap: {
    marginTop: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chipWrapCenter: {
    justifyContent: "center",
  },
  contentChip: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contentChipText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(245,240,232,0.75)",
  },
  brandList: {
    marginTop: 44,
    gap: 18,
  },
  brandCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
    padding: 24,
  },
  brandTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 23,
    color: Colors.cream,
  },
  brandEmoji: {
    fontStyle: "normal",
  },
  brandChips: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  brandChip: {
    backgroundColor: "rgba(245,240,232,0.05)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  brandChipText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.6)",
  },
  portfolioCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.06)",
    padding: 24,
  },
  portfolioText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 17,
    lineHeight: 26,
    color: "rgba(245,240,232,0.85)",
  },
  audienceChip: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  audienceChipText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(245,240,232,0.7)",
  },
  testimonial: {
    marginTop: 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
    padding: 30,
    alignItems: "center",
  },
  testimonialQuoteMark: {
    fontFamily: Fonts.serif,
    fontSize: 46,
    color: "rgba(184,150,62,0.6)",
  },
  testimonialQuote: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 21,
    lineHeight: 31,
    color: "rgba(245,240,232,0.9)",
  },
  testimonialFooter: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 2.2,
    color: "rgba(184,150,62,0.8)",
  },
  statsRow: {
    marginTop: 56,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.08)",
    paddingTop: 36,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontFamily: Fonts.serif,
    fontSize: 32,
  },
  statValueGold: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    color: Colors.gold,
  },
  statLabel: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 15,
    color: "rgba(245,240,232,0.45)",
  },
  finalTitle: {
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
  },
  finalTitleItalic: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 36,
    lineHeight: 44,
  },
  finalSub: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(245,240,232,0.5)",
  },
  finalCtaRow: {
    marginTop: 32,
    alignSelf: "stretch",
  },
  finalDisclaimer: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.35)",
  },
});
