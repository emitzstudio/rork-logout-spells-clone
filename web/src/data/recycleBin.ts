/**
 * Recycle Bin (0088) - the pure model shared by the stores and the console.
 *
 * A record is "binned" while `deletedAt` is set. Normal Delete stamps it,
 * Restore clears it, and only a binned record may be permanently deleted.
 * The stores split their collections with {@link splitBinned} so every list,
 * count, search and picker reads the ACTIVE half by default and only the
 * Recycle Bin page ever sees the other half.
 */

export interface Binnable {
  deletedAt?: string | null;
}

/** True while the record sits in the Recycle Bin. */
export const isBinned = (record: Binnable): boolean =>
  typeof record.deletedAt === "string" && record.deletedAt !== "";

export interface BinSplit<T extends Binnable> {
  /** What every normal list shows. */
  active: T[];
  /** Newest deletion first - the Recycle Bin's order. */
  binned: T[];
}

/** Partitions a collection into active and binned halves (order preserved for active). */
export const splitBinned = <T extends Binnable>(records: readonly T[]): BinSplit<T> => {
  const active: T[] = [];
  const binned: T[] = [];
  for (const record of records) (isBinned(record) ? binned : active).push(record);
  binned.sort((a, b) => Date.parse(b.deletedAt ?? "") - Date.parse(a.deletedAt ?? ""));
  return { active, binned };
};

export interface SpellDeleteBlockers {
  bookings: number;
  reviewCollections: number;
}

/**
 * Why a binned spell can't be permanently deleted yet - mirrors the database
 * policy exactly (bookings and review collections keep their spell). Empty
 * when the delete is allowed.
 */
export const permanentDeleteBlockers = (counts: SpellDeleteBlockers): string[] => {
  const reasons: string[] = [];
  if (counts.bookings > 0) {
    reasons.push(`${counts.bookings} booking${counts.bookings === 1 ? "" : "s"} still belong to it`);
  }
  if (counts.reviewCollections > 0) {
    reasons.push(
      `${counts.reviewCollections} review collection${counts.reviewCollections === 1 ? "" : "s"} still point at it`,
    );
  }
  return reasons;
};

/** "Deleted 3d ago" style copy - a bin entry's age line. */
export const binnedAgo = (deletedAt: string | null | undefined, now: number = Date.now()): string => {
  if (typeof deletedAt !== "string" || deletedAt === "") return "Deleted";
  const stamp = Date.parse(deletedAt);
  if (Number.isNaN(stamp)) return "Deleted";
  const minutes = Math.floor((now - stamp) / 60_000);
  if (minutes < 1) return "Deleted just now";
  if (minutes < 60) return `Deleted ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Deleted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Deleted ${days}d ago`;
  return `Deleted ${new Date(stamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
};
