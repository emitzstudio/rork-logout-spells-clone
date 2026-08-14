import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Plus, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { effectiveStatus, fmtRange } from "@/data/account/derive";
import { AccountError } from "@/data/account/models";
import type { TripBooking, TripMemory } from "@/data/account/models";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

const friendly = (error: unknown, fallback: string): string =>
  error instanceof AccountError || error instanceof Error ? error.message : fallback;

function MemoryAlbum({ memory }: { memory: TripMemory }) {
  const { addMemoryPhotos, removeMemoryPhoto, setMemoryCover, deleteMemory } = useAccount();
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
        quality: 1,
      });
      if (result.canceled) return;
      setBusy(true);
      // Local URIs only — the upload pipeline resizes to ≤1440px JPEG and the
      // re-encode strips EXIF/GPS before anything leaves the device.
      const sources = result.assets
        .map((a) => a.uri)
        .filter((s): s is string => typeof s === "string" && s !== "");
      if (sources.length > 0) {
        await addMemoryPhotos(memory.id, sources);
        hapticSuccess();
      }
    } catch (error) {
      Alert.alert("Couldn't keep that photo", friendly(error, "Try a different image."));
    } finally {
      setBusy(false);
    }
  };

  const photoOptions = (photoId: string): void => {
    const isCover = memory.coverPhotoId === photoId;
    Alert.alert("This keepsake", undefined, [
      { text: "Cancel", style: "cancel" },
      isCover
        ? {
            text: "Un-crown as cover",
            onPress: () => {
              setMemoryCover(memory.id, null).catch((error: unknown) => {
                Alert.alert("Couldn't change the cover", friendly(error, "Try again."));
              });
            },
          }
        : {
            text: "Crown as cover ✦",
            onPress: () => {
              setMemoryCover(memory.id, photoId)
                .then(() => hapticSuccess())
                .catch((error: unknown) => {
                  Alert.alert("Couldn't change the cover", friendly(error, "Try again."));
                });
            },
          },
      {
        text: "Remove from album",
        style: "destructive",
        onPress: () => {
          removeMemoryPhoto(memory.id, photoId).catch((error: unknown) => {
            Alert.alert("Couldn't remove it", friendly(error, "Try again."));
          });
        },
      },
    ]);
  };

  const confirmRemove = (photoId: string): void => {
    Alert.alert("Remove this keepsake?", "It leaves the album, not your camera roll.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeMemoryPhoto(memory.id, photoId).catch((error: unknown) => {
            Alert.alert("Couldn't remove it", friendly(error, "Try again."));
          });
        },
      },
    ]);
  };

  const letGo = (): void => {
    Alert.alert(
      "Let this album go?",
      "Its keepsakes, note and little moments all fade with it. There's no undo.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Let it go",
          style: "destructive",
          onPress: () => {
            deleteMemory(memory.id).catch((error: unknown) => {
              Alert.alert("Couldn't let it go", friendly(error, "Try again."));
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.album}>
      <View style={styles.albumHeader}>
        {memory.cover !== "" ? (
          <Image source={{ uri: memory.cover }} style={styles.albumCover} contentFit="cover" transition={300} />
        ) : null}
        <LinearGradient
          colors={["rgba(10,8,6,0.2)", "rgba(10,8,6,0.65)", "rgba(10,8,6,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.albumHeaderBody}>
          <Text style={styles.albumTitle}>{memory.title}</Text>
          <Text style={styles.albumMeta}>
            {memory.location}
            {memory.start !== "" ? ` · ${fmtRange(memory.start, memory.end)}` : ""}
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
            <PressableScale
              onPress={() => photoOptions(photo.id)}
              scaleTo={0.96}
              testID={`memory-photo-${photo.id}`}
            >
              <Image
                source={{ uri: photo.src }}
                style={[
                  styles.photo,
                  memory.coverPhotoId === photo.id ? styles.photoCover : null,
                ]}
                contentFit="cover"
                transition={300}
              />
              {memory.coverPhotoId === photo.id ? (
                <View style={styles.coverStar}>
                  <Text style={styles.coverStarText}>✦</Text>
                </View>
              ) : null}
            </PressableScale>
            <PressableScale
              onPress={() => confirmRemove(photo.id)}
              scaleTo={0.85}
              style={styles.photoRemove}
              testID={`memory-remove-${photo.id}`}
            >
              <X size={11} color="rgba(245,240,232,0.85)" />
            </PressableScale>
          </View>
        ))}
        <PressableScale
          onPress={() => void pickPhotos()}
          scaleTo={0.94}
          style={styles.addTile}
          testID={`memory-add-${memory.id}`}
        >
          {busy ? (
            <ActivityIndicator color={Colors.goldLight} />
          ) : (
            <ImagePlus size={20} color={Colors.goldLight} />
          )}
          <Text style={styles.addTileText}>
            {busy ? "Keeping…" : room > 0 ? `Add · ${room} left` : "Full"}
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

      <PressableScale onPress={letGo} scaleTo={0.97} testID={`memory-letgo-${memory.id}`}>
        <Text style={styles.letGo}>Let this album go</Text>
      </PressableScale>
    </View>
  );
}

/** A finished trip that hasn't opened its album yet — one tap begins it. */
function BeginAlbumCard({ booking }: { booking: TripBooking }) {
  const { beginAlbum } = useAccount();
  const [busy, setBusy] = useState<boolean>(false);

  const begin = async (): Promise<void> => {
    setBusy(true);
    try {
      await beginAlbum(booking.id);
      hapticSuccess();
    } catch (error) {
      Alert.alert("The album couldn't begin", friendly(error, "Try again in a moment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PressableScale
      onPress={() => void begin()}
      scaleTo={0.98}
      style={styles.beginCard}
      testID={`begin-album-${booking.id}`}
    >
      {booking.spell.image !== "" ? (
        <Image source={{ uri: booking.spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      ) : null}
      <LinearGradient
        colors={["rgba(10,8,6,0.55)", "rgba(10,8,6,0.92)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.beginBody}>
        <View style={styles.beginIcon}>
          {busy ? (
            <ActivityIndicator color={Colors.goldLight} />
          ) : (
            <Plus size={16} color={Colors.goldLight} />
          )}
        </View>
        <View style={styles.beginText}>
          <Text style={styles.beginTitle}>{booking.spell.name}</Text>
          <Text style={styles.beginSub}>The trip is over — begin its album ✦</Text>
        </View>
      </View>
    </PressableScale>
  );
}

/** Memories — kept photographs, trip by trip, with honest little quotas. */
export default function MemoriesScreen() {
  const { data } = useAccount();
  const memories = useMemo(() => data?.memories ?? [], [data]);

  /** Finished trips still waiting for their album (decision O). */
  const awaiting = useMemo(() => {
    if (!data) return [];
    const withAlbums = new Set(data.memories.map((m) => m.bookingId));
    return data.bookings.filter(
      (b) => effectiveStatus(b) === "completed" && !withAlbums.has(b.id),
    );
  }, [data]);

  return (
    <SpaceShell title="Memories">
      <View style={styles.header}>
        <Text style={styles.title}>What you kept</Text>
        <Text style={styles.sub}>
          One small album per journey — a few photographs, chosen slowly.
        </Text>
      </View>

      {awaiting.length > 0 ? (
        <View style={styles.beginList}>
          {awaiting.map((b) => (
            <BeginAlbumCard key={b.id} booking={b} />
          ))}
        </View>
      ) : null}

      <View style={styles.albums}>
        {memories.map((m) => (
          <MemoryAlbum key={m.id} memory={m} />
        ))}
        {memories.length === 0 && awaiting.length === 0 ? (
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
  beginList: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  beginCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    overflow: "hidden",
  },
  beginBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 16,
  },
  beginIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(184,150,62,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  beginText: {
    flex: 1,
  },
  beginTitle: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    color: Colors.cream,
  },
  beginSub: {
    marginTop: 2,
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.6)",
  },
  albums: {
    marginTop: 20,
    gap: 34,
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
    backgroundColor: "rgba(245,240,232,0.03)",
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
  photoCover: {
    borderWidth: 1.5,
    borderColor: "rgba(207,168,90,0.85)",
  },
  coverStar: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(10,8,6,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverStarText: {
    fontFamily: Fonts.serif,
    fontSize: 11,
    color: Colors.goldHi,
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
  letGo: {
    textAlign: "center",
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: "rgba(201,111,90,0.75)",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 30,
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.4)",
  },
});
