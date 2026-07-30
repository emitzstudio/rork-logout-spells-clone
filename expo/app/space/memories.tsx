import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { fmtRange } from "@/data/account/derive";
import type { TripMemory } from "@/data/account/models";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

function MemoryAlbum({ memory }: { memory: TripMemory }) {
  const { addMemoryPhotos, removeMemoryPhoto } = useAccount();
  const [busy, setBusy] = useState<boolean>(false);
  const room = memory.photoLimit - memory.photos.length;

  const pickPhotos = async (): Promise<void> => {
    if (room <= 0) {
      Alert.alert(
        "Album is full",
        `This album keeps ${memory.photoLimit} keepsakes — remove one to add another.`,
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: room,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      setBusy(true);
      const sources = result.assets
        .map((a) => (a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri))
        .filter((s): s is string => typeof s === "string" && s !== "");
      if (sources.length > 0) {
        await addMemoryPhotos(memory.id, sources);
        hapticSuccess();
      }
    } catch (error) {
      console.warn("[memories] Could not add photos:", error);
      Alert.alert("Couldn't add that photo", "Try a different image.");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (photoId: string): void => {
    Alert.alert("Remove this keepsake?", "It leaves the album, not your camera roll.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void removeMemoryPhoto(memory.id, photoId),
      },
    ]);
  };

  return (
    <View style={styles.album}>
      <View style={styles.albumHeader}>
        <Image source={{ uri: memory.cover }} style={styles.albumCover} contentFit="cover" transition={300} />
        <LinearGradient
          colors={["rgba(10,8,6,0.2)", "rgba(10,8,6,0.65)", "rgba(10,8,6,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.albumHeaderBody}>
          <Text style={styles.albumTitle}>{memory.title}</Text>
          <Text style={styles.albumMeta}>
            {memory.location} · {fmtRange(memory.start, memory.end)}
          </Text>
        </View>
      </View>

      {memory.note !== "" ? <Text style={styles.albumNote}>“{memory.note}”</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoRow}
      >
        {memory.photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrap}>
            <Image source={{ uri: photo.src }} style={styles.photo} contentFit="cover" transition={300} />
            {photo.own ? (
              <PressableScale
                onPress={() => confirmRemove(photo.id)}
                scaleTo={0.85}
                style={styles.photoRemove}
                testID={`memory-remove-${photo.id}`}
              >
                <X size={11} color="rgba(245,240,232,0.85)" />
              </PressableScale>
            ) : null}
          </View>
        ))}
        <PressableScale
          onPress={() => void pickPhotos()}
          scaleTo={0.94}
          style={styles.addTile}
          testID={`memory-add-${memory.id}`}
        >
          <ImagePlus size={20} color={busy ? "rgba(245,240,232,0.3)" : Colors.goldLight} />
          <Text style={styles.addTileText}>
            {room > 0 ? `Add · ${room} left` : "Full"}
          </Text>
        </PressableScale>
      </ScrollView>

      {memory.highlights.length > 0 ? (
        <View style={styles.highlights}>
          {memory.highlights.map((h) => (
            <View key={h} style={styles.highlight}>
              <Text style={styles.highlightText}>✦ {h}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Memories — kept photographs, trip by trip, with honest little quotas. */
export default function MemoriesScreen() {
  const { data } = useAccount();
  const memories = useMemo(() => data?.memories ?? [], [data]);

  return (
    <SpaceShell title="Memories">
      <View style={styles.header}>
        <Text style={styles.title}>What you kept</Text>
        <Text style={styles.sub}>
          One small album per journey — a few photographs, chosen slowly.
        </Text>
      </View>
      <View style={styles.albums}>
        {memories.map((m) => (
          <MemoryAlbum key={m.id} memory={m} />
        ))}
        {memories.length === 0 ? (
          <Text style={styles.empty}>Complete a spell and its album appears here ✦</Text>
        ) : null}
      </View>
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  sub: {
    marginTop: 5,
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: "rgba(245,240,232,0.5)",
  },
  albums: {
    marginTop: 20,
    gap: 30,
  },
  album: {
    gap: 14,
  },
  albumHeader: {
    marginHorizontal: 20,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.09)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  albumCover: {
    ...StyleSheet.absoluteFillObject,
  },
  albumHeaderBody: {
    padding: 16,
    gap: 3,
  },
  albumTitle: {
    fontFamily: Fonts.serif,
    fontSize: 23,
    color: Colors.cream,
  },
  albumMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.65)",
  },
  albumNote: {
    paddingHorizontal: 20,
    fontFamily: Fonts.serifItalic,
    fontSize: 14.5,
    lineHeight: 21,
    color: "rgba(245,240,232,0.6)",
  },
  photoRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  photoWrap: {
    width: 110,
    height: 110,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
  },
  photoRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(10,8,6,0.8)",
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(184,150,62,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addTileText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.55)",
  },
  highlights: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  highlight: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  highlightText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.6)",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 30,
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.4)",
  },
});
