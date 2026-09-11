import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronDown, Instagram, MapPin, RefreshCw, Star, X } from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PressableScale } from "@/components/Buttons";
import RichBody from "@/components/RichBody";
import {
  BUILDER_ICONS,
  CATEGORY_FAMILY,
  FINAL_CTA,
  dayHasContent,
  hostHasContent,
  quickEffectiveValue,
  stayHasContent,
} from "@/data/builder";
import type { HostBlock, ItineraryDay, SpellDraft } from "@/data/builder";
import { CATEGORY_META, URGENCY_META, formatINR } from "@/data/spells";
import { Colors, Fonts } from "@/constants/theme";
import { hapticLight } from "@/lib/haptics";

const cream = (o: number): string => `rgba(245,240,232,${o})`;
const gold = (o: number): string => `rgba(184,150,62,${o})`;

/* ------------------------------ Section shell ----------------------------- */

function SectionEyebrow({ z, children }: { z: number; children: string }) {
  return (
    <Text
      style={{
        fontFamily: Fonts.sans,
        fontSize: 7.5 * z,
        letterSpacing: 2.1 * z,
        textTransform: "uppercase",
        color: cream(0.3),
      }}
    >
      {children}
    </Text>
  );
}

function GoldLine({ z }: { z: number }) {
  return (
    <LinearGradient
      colors={[Colors.gold, "rgba(184,150,62,0)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ marginTop: 6 * z, height: 1, width: 40 * z }}
    />
  );
}

/* ------------------------------ Host flip card ---------------------------- */

function HostCard({ host, z }: { host: HostBlock; z: number }) {
  const [flipped, setFlipped] = useState<boolean>(false);
  const flip = useRef(new Animated.Value(0)).current;

  const title = host.title.trim() !== "" ? host.title : "Your Host";
  const name = host.name.trim() !== "" ? host.name : "Your Spellcaster";
  const initial = (host.name.trim() !== "" ? host.name.trim() : "S").charAt(0).toUpperCase();

  const toggle = (): void => {
    hapticLight();
    const next = !flipped;
    setFlipped(next);
    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: 750,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
      <SectionEyebrow z={z}>Meet your Spellcaster</SectionEyebrow>
      <Pressable onPress={toggle} accessibilityRole="button" style={{ marginTop: 12 * z, height: 310 * z }}>
        {/* Front — portrait + title */}
        <Animated.View
          style={[
            styles.flipFace,
            {
              borderColor: cream(0.1),
              transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            },
          ]}
        >
          {host.image ? (
            <Image source={{ uri: host.image.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={["#2b2113", "#1a1510", "#0a0806"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.centered]}
            >
              <View
                style={{
                  width: 64 * z,
                  height: 64 * z,
                  borderRadius: 32 * z,
                  borderWidth: 1,
                  borderColor: gold(0.3),
                  backgroundColor: gold(0.07),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: Fonts.serifItalic, fontSize: 26 * z, color: gold(0.7) }}>
                  {initial}
                </Text>
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(10,8,6,0)", "rgba(10,8,6,0.15)", "rgba(10,8,6,0.9)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14 * z }}>
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 7.5 * z,
                letterSpacing: 2.1 * z,
                textTransform: "uppercase",
                color: "rgba(207,168,90,0.85)",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 4 * z,
                fontFamily: Fonts.serif,
                fontSize: 21 * z,
                lineHeight: 25 * z,
                color: Colors.cream,
              }}
            >
              {name}
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              right: 10 * z,
              top: 10 * z,
              flexDirection: "row",
              alignItems: "center",
              gap: 4 * z,
              backgroundColor: "rgba(10,8,6,0.7)",
              borderRadius: 999,
              paddingHorizontal: 8 * z,
              paddingVertical: 4 * z,
            }}
          >
            <RefreshCw size={10 * z} color={cream(0.6)} />
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 7.5 * z,
                letterSpacing: 1.2 * z,
                textTransform: "uppercase",
                color: cream(0.6),
              }}
            >
              Flip
            </Text>
          </View>
        </Animated.View>

        {/* Back — story, socials, quote, tags */}
        <Animated.View
          style={[
            styles.flipFace,
            {
              backgroundColor: "#18160F",
              borderColor: gold(0.25),
              transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 * z }}
            nestedScrollEnabled
          >
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 7.5 * z,
                letterSpacing: 2.1 * z,
                textTransform: "uppercase",
                color: "rgba(207,168,90,0.85)",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 2 * z,
                fontFamily: Fonts.serif,
                fontSize: 17 * z,
                lineHeight: 21 * z,
                color: Colors.cream,
              }}
            >
              {name}
            </Text>
            <View style={{ marginTop: 8 * z }}>
              {host.about.trim() !== "" ? (
                <RichBody
                  body={host.about}
                  z={z}
                  pStyle={{ fontSize: 10 * z, lineHeight: 15.5 * z, color: cream(0.6) }}
                />
              ) : null}
            </View>
            {host.quote.trim() !== "" ? (
              <View
                style={{
                  marginTop: 10 * z,
                  borderLeftWidth: 2,
                  borderLeftColor: gold(0.5),
                  paddingLeft: 10 * z,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.serifItalic,
                    fontSize: 11 * z,
                    lineHeight: 15 * z,
                    color: cream(0.8),
                  }}
                >
                  “{host.quote}”
                </Text>
              </View>
            ) : null}
            {host.instagram.trim() !== "" ? (
              <View style={{ marginTop: 10 * z, flexDirection: "row", alignItems: "center", gap: 6 * z }}>
                <Instagram size={10 * z} color={Colors.goldLight} />
                <Text style={{ fontFamily: Fonts.sans, fontSize: 9.5 * z, color: Colors.goldLight }}>
                  @{host.instagram}
                </Text>
              </View>
            ) : null}
            {host.tags.length > 0 ? (
              <View style={{ marginTop: 10 * z, flexDirection: "row", flexWrap: "wrap", gap: 4 * z }}>
                {host.tags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      borderWidth: 1,
                      borderColor: cream(0.12),
                      borderRadius: 999,
                      paddingHorizontal: 6 * z,
                      paddingVertical: 2 * z,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Fonts.sans,
                        fontSize: 7.5 * z,
                        letterSpacing: 1 * z,
                        textTransform: "uppercase",
                        color: cream(0.5),
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Pressable>
      <Text
        style={{
          marginTop: 6 * z,
          textAlign: "center",
          fontFamily: Fonts.sans,
          fontSize: 8 * z,
          letterSpacing: 1.6 * z,
          textTransform: "uppercase",
          color: cream(0.25),
        }}
      >
        Tap the card to flip it
      </Text>
    </View>
  );
}

/* ----------------------------- Itinerary day ------------------------------ */

function DayBlock({ day, index, z, symbol }: { day: ItineraryDay; index: number; z: number; symbol: string }) {
  const number = index + 1;
  const highlights = day.highlights.filter((h) => h.text.trim() !== "");

  return (
    <View style={{ gap: 12 * z }}>
      {day.image ? (
        <View
          style={{
            aspectRatio: 4 / 3,
            borderRadius: 8 * z,
            borderWidth: 1,
            borderColor: cream(0.08),
            overflow: "hidden",
          }}
        >
          <Image source={{ uri: day.image.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      ) : null}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 * z }}>
          <Text style={{ fontFamily: Fonts.serifItalic, fontSize: 11 * z, color: gold(0.8) }}>
            Day {String(number).padStart(2, "0")}
          </Text>
          {day.locationTag.trim() !== "" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3 * z,
                borderWidth: 1,
                borderColor: cream(0.1),
                borderRadius: 999,
                paddingHorizontal: 6 * z,
                paddingVertical: 1.5 * z,
              }}
            >
              <MapPin size={8 * z} color={gold(0.6)} />
              <Text
                style={{
                  fontFamily: Fonts.sans,
                  fontSize: 7 * z,
                  letterSpacing: 1.1 * z,
                  textTransform: "uppercase",
                  color: cream(0.45),
                }}
              >
                {day.locationTag}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            marginTop: 6 * z,
            fontFamily: Fonts.serif,
            fontSize: 15.5 * z,
            lineHeight: 20 * z,
            color: day.title.trim() !== "" ? Colors.cream : cream(0.3),
          }}
        >
          {day.title.trim() !== "" ? day.title : `Day ${number}`}
        </Text>
        {day.subtitle.trim() !== "" ? (
          <Text
            style={{
              marginTop: 4 * z,
              fontFamily: Fonts.serifItalic,
              fontSize: 11 * z,
              lineHeight: 14.5 * z,
              color: cream(0.55),
            }}
          >
            {day.subtitle}
          </Text>
        ) : null}
        <LinearGradient
          colors={[gold(0.6), "rgba(184,150,62,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ marginTop: 10 * z, height: 1, width: 32 * z }}
        />
        <View style={{ marginTop: 10 * z }}>
          <RichBody body={day.body} z={z} />
        </View>
        {highlights.length > 0 ? (
          <View
            style={{
              marginTop: 12 * z,
              gap: 6 * z,
              borderWidth: 1,
              borderColor: cream(0.06),
              backgroundColor: cream(0.02),
              borderRadius: 8 * z,
              padding: 10 * z,
            }}
          >
            {highlights.map((highlight) => (
              <View key={highlight.id} style={{ flexDirection: "row", gap: 6 * z }}>
                <Text style={{ fontSize: 9 * z, lineHeight: 15 * z }}>
                  {highlight.emoji !== "" ? highlight.emoji : "✦"}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: Fonts.sans,
                    fontSize: 10 * z,
                    lineHeight: 15 * z,
                    color: cream(0.7),
                  }}
                >
                  {highlight.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* --------------------------------- The body -------------------------------- */

interface SpellPageBodyProps {
  draft: SpellDraft;
  /** Rendered width — the renderer is authored at 330 and zoomed like the web. */
  width: number;
  onBook: () => void;
}

/**
 * The generated Spell page — hero to final CTA. A native port of the web
 * SpellPageBody (mobile device, live mode): what the founder publishes in
 * the website's Spell Builder is exactly what renders here.
 */
export default function SpellPageBody({ draft, width, onBook }: SpellPageBodyProps) {
  const z = Math.min(1.45, Math.max(1, width / 330));

  const heroImage = draft.mobileHero ?? draft.hero;
  const symbol = draft.category ? CATEGORY_META[draft.category].symbol : "✦";
  const family = draft.category ? CATEGORY_FAMILY[draft.category] : "A Logout Spell";
  const priceNumber = Number(draft.price);
  const spellName = draft.name.trim() !== "" ? draft.name : "Untitled Spell";
  const hasAbout =
    [draft.about.heading, draft.about.body, draft.about.quote].some((v) => v.trim() !== "") ||
    draft.about.image !== null;
  const showInclusions =
    draft.included.some((i) => i.text.trim() !== "") ||
    draft.notIncluded.some((i) => i.text.trim() !== "");
  const showAudience = draft.audience.some((c) => c.title.trim() !== "" || c.description.trim() !== "");
  const showTripHighlights = draft.tripHighlights.some(
    (h) => h.title.trim() !== "" || h.description.trim() !== "",
  );
  const showFaqs = draft.faqs.some((f) => f.question.trim() !== "");
  const journeyDays = useMemo(() => draft.itinerary.filter(dayHasContent), [draft.itinerary]);
  const quickCards = useMemo(
    () => draft.quickInfo.filter((card) => quickEffectiveValue(card, draft) !== ""),
    [draft],
  );

  const inc = draft.included.filter((i) => i.text.trim() !== "");
  const exc = draft.notIncluded.filter((i) => i.text.trim() !== "");
  const audienceCards = draft.audience.filter((c) => c.title.trim() !== "" || c.description.trim() !== "");
  const tripHighlights = draft.tripHighlights.filter(
    (h) => h.title.trim() !== "" || h.description.trim() !== "",
  );
  const faqs = draft.faqs.filter((f) => f.question.trim() !== "");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const urgency = draft.urgency ? URGENCY_META[draft.urgency] : null;
  const UrgencyIcon = urgency?.icon ?? null;

  return (
    <View>
      {/* Hero */}
      <View style={{ aspectRatio: 4 / 5, overflow: "hidden" }}>
        {heroImage ? (
          <Image source={{ uri: heroImage.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        ) : (
          <LinearGradient
            colors={["#2b2113", "#1a1510", "#0a0806"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          >
            <Text
              style={{
                position: "absolute",
                alignSelf: "center",
                top: "28%",
                fontFamily: Fonts.serif,
                fontSize: 64 * z,
                color: gold(0.2),
              }}
            >
              {symbol}
            </Text>
          </LinearGradient>
        )}
        <LinearGradient
          colors={["rgba(28,28,26,0)", "rgba(28,28,26,0.25)", Colors.charcoal]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        {(urgency !== null || draft.featured) && (
          <View style={{ position: "absolute", left: 12 * z, top: 12 * z, flexDirection: "row", gap: 6 * z }}>
            {draft.featured ? (
              <View style={[styles.badge, { borderColor: gold(0.4), backgroundColor: "rgba(35,26,8,0.85)" }]}>
                <Star size={9 * z} color={Colors.goldLight} fill={Colors.goldLight} />
                <Text style={[styles.badgeText, { fontSize: 8 * z, color: Colors.goldLight }]}>FEATURED</Text>
              </View>
            ) : null}
            {urgency && UrgencyIcon ? (
              <View style={[styles.badge, { borderColor: urgency.border, backgroundColor: urgency.background }]}>
                <UrgencyIcon size={9 * z} color={urgency.text} />
                <Text style={[styles.badgeText, { fontSize: 8 * z, color: urgency.text }]}>
                  {urgency.label.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16 * z }}>
          <Text
            style={{
              fontFamily: Fonts.sans,
              fontSize: 8 * z,
              letterSpacing: 2.4 * z,
              textTransform: "uppercase",
              color: "rgba(207,168,90,0.85)",
            }}
          >
            {family}
          </Text>
          <Text
            style={{
              marginTop: 4 * z,
              fontFamily: Fonts.serif,
              fontSize: 23 * z,
              lineHeight: 24 * z,
              color: Colors.cream,
            }}
          >
            {spellName}
          </Text>
          {draft.hook.trim() !== "" ? (
            <Text
              style={{
                marginTop: 6 * z,
                fontFamily: Fonts.serifItalic,
                fontSize: 12 * z,
                lineHeight: 15 * z,
                color: cream(0.65),
              }}
            >
              “{draft.hook}”
            </Text>
          ) : null}
        </View>
      </View>

      {/* Booking bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12 * z,
          borderBottomWidth: 1,
          borderBottomColor: cream(0.05),
          paddingHorizontal: 14 * z,
          paddingVertical: 12 * z,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: Fonts.sans, fontSize: 9.5 * z, color: cream(0.45) }}>
            {draft.dates.trim() !== "" ? draft.dates : "Dates TBC"}{draft.maxSeats > 0 ? ` · ${draft.maxSeats} seats` : ""}
            {draft.location.trim() !== "" ? ` · ${draft.location}` : ""}
          </Text>
          <Text style={{ marginTop: 3 * z, fontFamily: Fonts.serif, fontSize: 16 * z, color: Colors.goldLight }}>
            {priceNumber > 0 ? formatINR(priceNumber) : "Prices TBA"}{" "}
            <Text
              style={{
                fontFamily: Fonts.sans,
                fontSize: 8 * z,
                letterSpacing: 1.1 * z,
                textTransform: "uppercase",
                color: cream(0.35),
              }}
            >
              {priceNumber > 0 ? "per seat" : ""}
            </Text>
          </Text>
        </View>
        <PressableScale
          onPress={onBook}
          haptic="medium"
          scaleTo={0.95}
          style={{
            backgroundColor: Colors.gold,
            borderRadius: 6 * z,
            paddingHorizontal: 12 * z,
            paddingVertical: 7 * z,
          }}
          testID="booking-bar-cta"
        >
          <Text
            style={{
              fontFamily: Fonts.sansMedium,
              fontSize: 9 * z,
              letterSpacing: 0.7 * z,
              color: Colors.charcoalDeep,
            }}
          >
            {FINAL_CTA.button}
          </Text>
        </PressableScale>
      </View>

      {/* About the Spell */}
      {hasAbout ? (
        <View style={{ paddingHorizontal: 20 * z, paddingVertical: 24 * z }}>
          <Text
            style={{
              fontFamily: Fonts.serif,
              fontSize: 17 * z,
              lineHeight: 21 * z,
              color: draft.about.heading.trim() !== "" ? Colors.cream : cream(0.3),
            }}
          >
            {draft.about.heading.trim() !== "" ? draft.about.heading : "About this Spell"}
          </Text>
          <GoldLine z={z} />
          <View style={{ marginTop: 16 * z, gap: 16 * z }}>
            {draft.about.image ? (
              <View
                style={{
                  aspectRatio: 16 / 9,
                  borderRadius: 8 * z,
                  borderWidth: 1,
                  borderColor: cream(0.08),
                  overflow: "hidden",
                }}
              >
                <Image source={{ uri: draft.about.image.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            ) : null}
            <View>
              {draft.about.body.trim() !== "" ? <RichBody body={draft.about.body} z={z} /> : null}
              {draft.about.quote.trim() !== "" ? (
                <View
                  style={{
                    marginTop: 12 * z,
                    borderLeftWidth: 2,
                    borderLeftColor: gold(0.5),
                    paddingLeft: 10 * z,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.serifItalic,
                      fontSize: 11.5 * z,
                      lineHeight: 15 * z,
                      color: cream(0.8),
                    }}
                  >
                    {draft.about.quote}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Quick info cards */}
      {quickCards.length > 0 ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
          <SectionEyebrow z={z}>At a glance</SectionEyebrow>
          <View style={{ marginTop: 10 * z, flexDirection: "row", flexWrap: "wrap", gap: 8 * z }}>
            {quickCards.map((card) => {
              const Icon = BUILDER_ICONS[card.icon].icon;
              const value = quickEffectiveValue(card, draft);
              return (
                <View
                  key={card.id}
                  style={{
                    width: (width - 40 * z - 8 * z) / 2,
                    borderWidth: 1,
                    borderColor: cream(0.06),
                    backgroundColor: cream(0.02),
                    borderRadius: 8 * z,
                    padding: 8 * z,
                  }}
                >
                  <Icon size={12 * z} color={gold(0.8)} />
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 4 * z,
                      fontFamily: Fonts.sans,
                      fontSize: 7 * z,
                      letterSpacing: 1.4 * z,
                      textTransform: "uppercase",
                      color: cream(0.35),
                    }}
                  >
                    {card.label.trim() !== "" ? card.label : "Label"}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ marginTop: 2 * z, fontFamily: Fonts.sans, fontSize: 10 * z, color: cream(0.85) }}
                  >
                    {value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Meet your Spellcaster */}
      {hostHasContent(draft) ? <HostCard host={draft.host} z={z} /> : null}

      {/* Itinerary */}
      {journeyDays.length > 0 ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 28 * z }]}>
          <SectionEyebrow z={z}>
            {`The journey · ${journeyDays.length} ${journeyDays.length === 1 ? "day" : "days"}`}
          </SectionEyebrow>
          <Text
            style={{
              marginTop: 6 * z,
              fontFamily: Fonts.serif,
              fontSize: 17 * z,
              lineHeight: 21 * z,
              color: Colors.cream,
            }}
          >
            Day by day
          </Text>
          <GoldLine z={z} />
          <View style={{ marginTop: 20 * z, gap: 24 * z }}>
            {journeyDays.map((day, index) => (
              <React.Fragment key={day.id}>
                {index > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 * z }}>
                    <LinearGradient
                      colors={["rgba(184,150,62,0)", gold(0.25)]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ height: 1, width: 32 * z }}
                    />
                    <Text style={{ fontFamily: Fonts.serif, fontSize: 10 * z, color: gold(0.4) }}>✦</Text>
                    <LinearGradient
                      colors={[gold(0.25), "rgba(184,150,62,0)"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ height: 1, width: 32 * z }}
                    />
                  </View>
                ) : null}
                <DayBlock day={day} index={index} z={z} symbol={symbol} />
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : null}

      {/* Gallery strip */}
      {draft.gallery.length > 0 ? (
        <View style={[styles.block, { paddingVertical: 24 * z }]}>
          <View style={{ paddingHorizontal: 20 * z }}>
            <SectionEyebrow z={z}>Gallery</SectionEyebrow>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 * z, gap: 8 * z, marginTop: 10 * z }}
          >
            {draft.gallery.map((image) => (
              <View
                key={image.id}
                style={{
                  width: 112 * z,
                  height: 80 * z,
                  borderRadius: 6 * z,
                  borderWidth: 1,
                  borderColor: cream(0.08),
                  overflow: "hidden",
                }}
              >
                <Image source={{ uri: image.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Trip highlights */}
      {showTripHighlights ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
          <SectionEyebrow z={z}>Trip highlights</SectionEyebrow>
          <View style={{ marginTop: 12 * z, gap: 8 * z }}>
            {tripHighlights.map((highlight) => (
              <View
                key={highlight.id}
                style={{
                  borderWidth: 1,
                  borderRadius: 8 * z,
                  padding: 10 * z,
                  borderColor: highlight.accent ? gold(0.35) : cream(0.07),
                  backgroundColor: highlight.accent ? gold(0.05) : cream(0.02),
                }}
              >
                <Text style={{ fontSize: 14 * z, lineHeight: 16 * z }}>
                  {highlight.emoji !== "" ? highlight.emoji : "✦"}
                </Text>
                <Text
                  style={{
                    marginTop: 6 * z,
                    fontFamily: Fonts.serif,
                    fontSize: 11.5 * z,
                    lineHeight: 15 * z,
                    color: highlight.title.trim() !== "" ? Colors.cream : cream(0.3),
                  }}
                >
                  {highlight.title.trim() !== "" ? highlight.title : "Untitled"}
                </Text>
                {highlight.description.trim() !== "" ? (
                  <Text
                    style={{
                      marginTop: 4 * z,
                      fontFamily: Fonts.sans,
                      fontSize: 9 * z,
                      lineHeight: 14 * z,
                      color: cream(0.5),
                    }}
                  >
                    {highlight.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Where we'll stay */}
      {stayHasContent(draft) ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
          <SectionEyebrow z={z}>Where we&apos;ll stay</SectionEyebrow>
          <View
            style={{
              marginTop: 12 * z,
              borderWidth: 1,
              borderColor: cream(0.08),
              backgroundColor: cream(0.015),
              borderRadius: 12 * z,
              overflow: "hidden",
            }}
          >
            <View style={{ aspectRatio: 16 / 9 }}>
              {draft.stay.images[0] ? (
                <Image
                  source={{ uri: draft.stay.images[0].url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.centered, { backgroundColor: cream(0.015) }]}>
                  <Text style={{ fontFamily: Fonts.serif, fontSize: 22 * z, color: gold(0.2) }}>{symbol}</Text>
                </View>
              )}
              {draft.stay.rating > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    right: 8 * z,
                    top: 8 * z,
                    flexDirection: "row",
                    gap: 2 * z,
                    backgroundColor: "rgba(10,8,6,0.75)",
                    borderRadius: 999,
                    paddingHorizontal: 8 * z,
                    paddingVertical: 4 * z,
                  }}
                >
                  {Array.from({ length: draft.stay.rating }, (_, i) => (
                    <Star key={i} size={8 * z} color={Colors.gold} fill={Colors.gold} />
                  ))}
                </View>
              ) : null}
            </View>
            {draft.stay.images.length > 1 ? (
              <View style={{ flexDirection: "row", gap: 1 }}>
                {draft.stay.images.slice(1, 4).map((image) => (
                  <View key={image.id} style={{ flex: 1, aspectRatio: 4 / 3 }}>
                    <Image source={{ uri: image.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ padding: 16 * z }}>
              <Text
                style={{
                  fontFamily: Fonts.serif,
                  fontSize: 15.5 * z,
                  lineHeight: 19 * z,
                  color: draft.stay.name.trim() !== "" ? Colors.cream : cream(0.3),
                }}
              >
                {draft.stay.name.trim() !== "" ? draft.stay.name : "The place we call home"}
              </Text>
              {draft.stay.mapLabel.trim() !== "" ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 6 * z,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4 * z,
                    borderWidth: 1,
                    borderColor: cream(0.1),
                    borderRadius: 999,
                    paddingHorizontal: 6 * z,
                    paddingVertical: 2 * z,
                  }}
                >
                  <MapPin size={8 * z} color={gold(0.6)} />
                  <Text
                    style={{
                      fontFamily: Fonts.sans,
                      fontSize: 7.5 * z,
                      letterSpacing: 1.2 * z,
                      textTransform: "uppercase",
                      color: cream(0.45),
                    }}
                  >
                    {draft.stay.mapLabel}
                  </Text>
                </View>
              ) : null}
              {draft.stay.shortDescription.trim() !== "" ? (
                <Text
                  style={{
                    marginTop: 6 * z,
                    fontFamily: Fonts.serifItalic,
                    fontSize: 10.5 * z,
                    lineHeight: 14 * z,
                    color: cream(0.6),
                  }}
                >
                  {draft.stay.shortDescription}
                </Text>
              ) : null}
              {draft.stay.longDescription.trim() !== "" ? (
                <View style={{ marginTop: 8 * z }}>
                  <RichBody body={draft.stay.longDescription} z={z} />
                </View>
              ) : null}
              {draft.stay.amenities.filter((a) => a.text.trim() !== "").length > 0 ? (
                <View style={{ marginTop: 12 * z }}>
                  <SectionEyebrow z={z}>Amenities</SectionEyebrow>
                  <View style={{ marginTop: 6 * z, flexDirection: "row", flexWrap: "wrap", gap: 4 * z }}>
                    {draft.stay.amenities
                      .filter((a) => a.text.trim() !== "")
                      .map((item) => {
                        const Icon = BUILDER_ICONS[item.icon].icon;
                        return (
                          <View
                            key={item.id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4 * z,
                              borderWidth: 1,
                              borderColor: cream(0.1),
                              backgroundColor: cream(0.02),
                              borderRadius: 999,
                              paddingHorizontal: 6 * z,
                              paddingVertical: 2 * z,
                            }}
                          >
                            <Icon size={10 * z} color={gold(0.7)} />
                            <Text style={{ fontFamily: Fonts.sans, fontSize: 8.5 * z, color: cream(0.6) }}>
                              {item.text}
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              ) : null}
              {draft.stay.highlights.filter((h) => h.text.trim() !== "").length > 0 ? (
                <View style={{ marginTop: 12 * z, gap: 4 * z }}>
                  {draft.stay.highlights
                    .filter((h) => h.text.trim() !== "")
                    .map((item) => (
                      <View key={item.id} style={{ flexDirection: "row", gap: 6 * z }}>
                        <Text style={{ fontSize: 8 * z, lineHeight: 14 * z, color: gold(0.6) }}>✦</Text>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: Fonts.sans,
                            fontSize: 9.5 * z,
                            lineHeight: 14 * z,
                            color: cream(0.7),
                          }}
                        >
                          {item.text}
                        </Text>
                      </View>
                    ))}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* What's included / not included */}
      {showInclusions ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z, gap: 20 * z }]}>
          {inc.length > 0 ? (
            <View>
              <SectionEyebrow z={z}>What&apos;s included</SectionEyebrow>
              <View style={{ marginTop: 8 * z, gap: 6 * z }}>
                {inc.map((item) => (
                  <View key={item.id} style={{ flexDirection: "row", gap: 6 * z }}>
                    <View
                      style={{
                        marginTop: 1,
                        width: 14 * z,
                        height: 14 * z,
                        borderRadius: 7 * z,
                        backgroundColor: gold(0.15),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={8 * z} color={Colors.gold} strokeWidth={3.5} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: Fonts.sans,
                        fontSize: 9.5 * z,
                        lineHeight: 14 * z,
                        color: cream(0.75),
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {exc.length > 0 ? (
            <View>
              <SectionEyebrow z={z}>Not included</SectionEyebrow>
              <View style={{ marginTop: 8 * z, gap: 6 * z }}>
                {exc.map((item) => (
                  <View key={item.id} style={{ flexDirection: "row", gap: 6 * z }}>
                    <View
                      style={{
                        marginTop: 1,
                        width: 14 * z,
                        height: 14 * z,
                        borderRadius: 7 * z,
                        backgroundColor: cream(0.06),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={8 * z} color={cream(0.4)} strokeWidth={3} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: Fonts.sans,
                        fontSize: 9.5 * z,
                        lineHeight: 14 * z,
                        color: cream(0.45),
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Who this Spell is for */}
      {showAudience ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
          <SectionEyebrow z={z}>Who this Spell is for</SectionEyebrow>
          <View style={{ marginTop: 12 * z, gap: 8 * z }}>
            {audienceCards.map((card) => {
              const Icon = card.icon ? BUILDER_ICONS[card.icon].icon : null;
              return (
                <View
                  key={card.id}
                  style={{
                    borderWidth: 1,
                    borderColor: cream(0.07),
                    backgroundColor: cream(0.02),
                    borderRadius: 8 * z,
                    padding: 10 * z,
                  }}
                >
                  {Icon ? (
                    <Icon size={14 * z} color={gold(0.8)} />
                  ) : (
                    <Text style={{ fontFamily: Fonts.serif, fontSize: 11 * z, color: gold(0.6) }}>✦</Text>
                  )}
                  <Text
                    style={{
                      marginTop: 6 * z,
                      fontFamily: Fonts.serif,
                      fontSize: 11.5 * z,
                      lineHeight: 15 * z,
                      color: card.title.trim() !== "" ? Colors.cream : cream(0.3),
                    }}
                  >
                    {card.title.trim() !== "" ? card.title : "Untitled"}
                  </Text>
                  {card.description.trim() !== "" ? (
                    <Text
                      style={{
                        marginTop: 4 * z,
                        fontFamily: Fonts.sans,
                        fontSize: 9 * z,
                        lineHeight: 14 * z,
                        color: cream(0.5),
                      }}
                    >
                      {card.description}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* FAQs */}
      {showFaqs ? (
        <View style={[styles.block, { paddingHorizontal: 20 * z, paddingVertical: 24 * z }]}>
          <SectionEyebrow z={z}>Questions, answered</SectionEyebrow>
          <View style={{ marginTop: 12 * z, gap: 8 * z }}>
            {faqs.map((faq) => {
              const open = openFaqId === faq.id;
              return (
                <View
                  key={faq.id}
                  style={{
                    borderWidth: 1,
                    borderRadius: 8 * z,
                    overflow: "hidden",
                    borderColor: open ? gold(0.3) : cream(0.07),
                    backgroundColor: open ? gold(0.03) : cream(0.015),
                  }}
                >
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setOpenFaqId(open ? null : faq.id);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8 * z,
                      paddingHorizontal: 10 * z,
                      paddingVertical: 8 * z,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: Fonts.serif,
                        fontSize: 10.5 * z,
                        lineHeight: 14 * z,
                        color: Colors.cream,
                      }}
                    >
                      {faq.question}
                    </Text>
                    <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
                      <ChevronDown size={12 * z} color={gold(0.6)} />
                    </View>
                  </Pressable>
                  {open ? (
                    <Text
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: cream(0.05),
                        paddingHorizontal: 10 * z,
                        paddingVertical: 8 * z,
                        fontFamily: Fonts.sans,
                        fontSize: 9.5 * z,
                        lineHeight: 14.5 * z,
                        color: cream(0.6),
                      }}
                    >
                      {faq.answer.trim() !== "" ? faq.answer : "Answer coming soon…"}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Final CTA */}
      <View style={[styles.block, styles.centered, { paddingVertical: 40 * z, paddingHorizontal: 20 * z }]}>
        <Text style={{ fontFamily: Fonts.serif, fontSize: 24 * z, color: gold(0.7) }}>✦</Text>
        <Text
          style={{
            marginTop: 8 * z,
            maxWidth: 300 * z,
            textAlign: "center",
            fontFamily: Fonts.serif,
            fontSize: 21 * z,
            lineHeight: 22 * z,
            color: Colors.cream,
          }}
        >
          {FINAL_CTA.heading}
        </Text>
        <PressableScale
          onPress={onBook}
          haptic="medium"
          scaleTo={0.95}
          style={{
            marginTop: 16 * z,
            backgroundColor: Colors.gold,
            borderRadius: 6 * z,
            paddingHorizontal: 16 * z,
            paddingVertical: 8 * z,
          }}
          testID="final-cta"
        >
          <Text
            style={{
              fontFamily: Fonts.sansMedium,
              fontSize: 10 * z,
              letterSpacing: 0.8 * z,
              color: Colors.charcoalDeep,
            }}
          >
            {FINAL_CTA.button}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.05)",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  flipFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: Fonts.sansSemi,
    letterSpacing: 1,
  },
});
