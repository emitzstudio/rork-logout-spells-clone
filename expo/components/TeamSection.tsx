import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Instagram, Linkedin, Youtube } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import GradientText from "@/components/GradientText";
import MagicDust from "@/components/MagicDust";
import { Colors, Fonts } from "@/constants/theme";
import { teamService } from "@/data/team";
import type { TeamMember } from "@/data/team";
import { hapticLight } from "@/lib/haptics";

/* ------------------------------ Founder card ------------------------------ */

function FounderSpotlight({ member }: { member: TeamMember }) {
  return (
    <View style={styles.founderCard}>
      <LinearGradient
        colors={["rgba(184,150,62,0.16)", "rgba(28,28,26,0.4)", "rgba(10,8,6,0.2)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.founderPhotoWrap}>
        {member.photo !== "" ? (
          <Image source={{ uri: member.photo }} style={styles.founderPhoto} contentFit="cover" transition={400} />
        ) : (
          <View style={[styles.founderPhoto, styles.monogram]}>
            <Text style={styles.monogramText}>{member.initial}</Text>
          </View>
        )}
        <View style={styles.founderChip}>
          <Text style={styles.founderChipText}>✦ {member.department.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.founderBody}>
        <Text style={styles.founderName}>{member.name}</Text>
        <Text style={styles.founderRole}>{member.designation}</Text>
        <Text style={styles.founderIntro}>{member.intro}</Text>
        {member.quote ? <Text style={styles.founderQuote}>“{member.quote}”</Text> : null}
        <View style={styles.socialRow}>
          <PressableScale onPress={() => Linking.openURL(member.socials.instagram)} scaleTo={0.9} style={styles.socialDot}>
            <Instagram size={15} color="rgba(184,150,62,0.8)" />
          </PressableScale>
          <PressableScale onPress={() => Linking.openURL(member.socials.linkedin)} scaleTo={0.9} style={styles.socialDot}>
            <Linkedin size={15} color="rgba(184,150,62,0.8)" />
          </PressableScale>
          <PressableScale onPress={() => Linking.openURL(member.socials.youtube)} scaleTo={0.9} style={styles.socialDot}>
            <Youtube size={15} color="rgba(184,150,62,0.8)" />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------- Flip card ------------------------------- */

function FlipCard({ member, width }: { member: TeamMember; width: number }) {
  const flip = useRef(new Animated.Value(0)).current;
  const flippedRef = useRef<boolean>(false);
  const [dust, setDust] = useState<number>(0);

  const toggle = (): void => {
    hapticLight();
    const next = flippedRef.current ? 0 : 1;
    flippedRef.current = !flippedRef.current;
    setDust((d) => d + 1);
    Animated.timing(flip, {
      toValue: next,
      duration: 640,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5001, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 0.4999, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <Pressable onPress={toggle} testID={`team-card-${member.id}`}>
      <View style={[styles.flipWrap, { width }]}>
        {/* Front — the portrait */}
        <Animated.View
          style={[
            styles.face,
            { opacity: frontOpacity, transform: [{ perspective: 1200 }, { rotateY: frontRotate }] },
          ]}
        >
          {member.photo !== "" ? (
            <Image source={{ uri: member.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.monogram]}>
              <Text style={styles.monogramText}>{member.initial}</Text>
            </View>
          )}
          <LinearGradient
            colors={["rgba(10,8,6,0.05)", "rgba(10,8,6,0.35)", "rgba(10,8,6,0.94)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.frontChip}>
            <Text style={styles.frontChipText}>{member.department.toUpperCase()}</Text>
          </View>
          <View style={styles.frontBody}>
            <Text style={styles.frontName}>{member.name}</Text>
            <Text style={styles.frontRole}>{member.designation}</Text>
            <Text style={styles.tapHint}>✦ Tap to meet</Text>
          </View>
        </Animated.View>

        {/* Back — the story */}
        <Animated.View
          style={[
            styles.face,
            styles.backFace,
            { opacity: backOpacity, transform: [{ perspective: 1200 }, { rotateY: backRotate }] },
          ]}
        >
          <LinearGradient
            colors={["#2a2113", "#171208", "#0a0806"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.backSymbol}>✦</Text>
          <Text style={styles.backName}>{member.name}</Text>
          <Text style={styles.backIntro}>{member.intro}</Text>
          <View style={styles.backDivider} />
          <Text style={styles.backLabel}>WHAT THEY DO</Text>
          <Text style={styles.backBody}>{member.focus}</Text>
          <Text style={[styles.backLabel, styles.backLabelSpaced]}>THEIR MARK ON THE SPELLS</Text>
          <Text style={styles.backBody}>{member.contribution}</Text>
          {member.quote ? <Text style={styles.backQuote}>“{member.quote}”</Text> : null}
        </Animated.View>

        <MagicDust trigger={dust} />
      </View>
    </Pressable>
  );
}

/* -------------------------------- Section --------------------------------- */

/**
 * The people behind the spells — founder spotlight + flip-card carousel with
 * magic dust, mirroring the website's team section on Our Story.
 */
export default function TeamSection() {
  const { width } = useWindowDimensions();
  const members = teamService.list();
  const founder = members.find((m) => m.featured === true);
  const rest = members.filter((m) => m.featured !== true);
  const cardWidth = Math.min(300, width * 0.74);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Eyebrow center>The coven</Eyebrow>
        <View style={styles.titleRow}>
          <Text style={styles.title}>The People Behind </Text>
          <GradientText style={styles.titleItalic}>the Spells</GradientText>
        </View>
        <Text style={styles.sub}>
          Seven people, one shared belief — flip a card, meet a keeper of the magic.
        </Text>
      </View>

      {founder ? (
        <View style={styles.founderWrap}>
          <FounderSpotlight member={founder} />
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 14}
        decelerationRate="fast"
        contentContainerStyle={styles.cardsRow}
      >
        {rest.map((member) => (
          <FlipCard key={member.id} member={member} width={cardWidth} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 24,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.cream,
    textAlign: "center",
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 30,
    lineHeight: 36,
  },
  sub: {
    marginTop: 12,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.5)",
  },
  founderWrap: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  founderCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    overflow: "hidden",
  },
  founderPhotoWrap: {
    height: 300,
  },
  founderPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  founderChip: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  founderChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: Colors.goldLight,
  },
  founderBody: {
    padding: 24,
    gap: 10,
  },
  founderName: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: Colors.cream,
  },
  founderRole: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 2.2,
    color: Colors.gold,
  },
  founderIntro: {
    marginTop: 4,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(245,240,232,0.65)",
  },
  founderQuote: {
    marginTop: 6,
    fontFamily: Fonts.serifItalic,
    fontSize: 19,
    lineHeight: 26,
    color: Colors.goldLight,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  socialDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardsRow: {
    paddingHorizontal: 20,
    gap: 14,
    marginTop: 26,
    paddingBottom: 8,
  },
  flipWrap: {
    height: 430,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  backFace: {
    padding: 22,
  },
  monogram: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#221b0e",
  },
  monogramText: {
    fontFamily: Fonts.serif,
    fontSize: 84,
    color: "rgba(184,150,62,0.55)",
  },
  frontChip: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    backgroundColor: "rgba(10,8,6,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  frontChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.75)",
  },
  frontBody: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    gap: 4,
  },
  frontName: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  frontRole: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: Colors.goldLight,
  },
  tapHint: {
    marginTop: 10,
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: "rgba(245,240,232,0.45)",
  },
  backSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: "rgba(184,150,62,0.6)",
  },
  backName: {
    marginTop: 8,
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  backIntro: {
    marginTop: 8,
    fontFamily: Fonts.serifItalic,
    fontSize: 14.5,
    lineHeight: 21,
    color: "rgba(245,240,232,0.75)",
  },
  backDivider: {
    marginTop: 14,
    height: 1,
    width: 40,
    backgroundColor: "rgba(184,150,62,0.4)",
  },
  backLabel: {
    marginTop: 14,
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
  backLabelSpaced: {
    marginTop: 12,
  },
  backBody: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: "rgba(245,240,232,0.6)",
  },
  backQuote: {
    marginTop: 14,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.goldLight,
  },
});
