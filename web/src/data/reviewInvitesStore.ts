/**
 * Review sections store (V2) - staff reads, section creation, the shared-link
 * lookup/submit, allowance control, form editing and consent-gated publishing.
 *
 * Staff reads go through RLS (collections + invitations are staff-only rows);
 * creation, submission, allowance and form edits go through database RPCs so
 * the single shared token, the atomic allowance and the question shapes are
 * server-enforced. Publishing flips the EXISTING reviews.status moderation
 * field - the same one Testimonials uses - so there is exactly ONE review
 * system. Open consoles stay fresh through postgres_changes (0044 §13,
 * RLS-filtered per subscriber - the proven CRM pattern).
 */
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";

import { opsKeys, type ReviewRow } from "@/data/bookingOps";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

import type { ReviewQuestion, ReviewSubmitAnswer } from "./reviewForm";
import { parseReviewLinkLookup, type ReviewLinkLookup } from "./reviewInvites";

type Tables = Database["public"]["Tables"];
export type ReviewCollectionRow = Tables["review_collections"]["Row"];
export type ReviewInvitationRow = Tables["review_invitations"]["Row"];
export type { ReviewRow };

export const reviewInviteKeys = {
  collections: ["review-collections"] as const,
  lookup: (token: string) => ["review-link-lookup", token] as const,
};

/* --------------------------------- Staff reads -------------------------------- */

export interface InviteWithReview {
  invite: ReviewInvitationRow;
  /** The submitted review, once this legacy invitation was used. */
  review: ReviewRow | null;
}

export interface CollectionBundle {
  collection: ReviewCollectionRow;
  spellName: string;
  spellLocation: string;
  /** Every story that arrived through this section's links - newest first. */
  reviews: ReviewRow[];
  /** Legacy per-traveller invitations (pre-V2 sections only; empty for new ones). */
  invites: InviteWithReview[];
}

type CollectionJoinRow = ReviewCollectionRow & {
  spells: { name: string; location: string } | null;
};

/** Module-scoped so parallel hook instances never fight over one channel topic. */
let channelSeq = 0;

/**
 * Every section with its stories and (legacy) invitations - one cache shared
 * by the overview list, the section page and the form builder. A realtime
 * channel keeps counters, stories and publish states fresh across open
 * consoles without manual refresh.
 */
export function useReviewCollections(): UseQueryResult<CollectionBundle[]> {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`review-console-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_collections" },
        () => {
          void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => {
          void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
          void queryClient.invalidateQueries({ queryKey: opsKeys.reviews });
          void queryClient.invalidateQueries({ queryKey: opsKeys.badges });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: reviewInviteKeys.collections,
    queryFn: async (): Promise<CollectionBundle[]> => {
      const [collections, invitations, reviews] = await Promise.all([
        supabase
          .from("review_collections")
          .select("*, spells(name, location)")
          .order("created_at", { ascending: false }),
        supabase.from("review_invitations").select("*").order("position", { ascending: true }),
        supabase
          .from("reviews")
          .select("*")
          .not("collection_id", "is", null)
          .order("created_at", { ascending: false }),
      ]);
      if (collections.error) throw collections.error;
      if (invitations.error) throw invitations.error;
      if (reviews.error) throw reviews.error;

      const reviewByInvite = new Map<string, ReviewRow>();
      const reviewsByCollection = new Map<string, ReviewRow[]>();
      for (const review of reviews.data ?? []) {
        if (review.invitation_id !== null) reviewByInvite.set(review.invitation_id, review);
        if (review.collection_id !== null) {
          const list = reviewsByCollection.get(review.collection_id) ?? [];
          list.push(review);
          reviewsByCollection.set(review.collection_id, list);
        }
      }
      const invitesByCollection = new Map<string, InviteWithReview[]>();
      for (const invite of invitations.data ?? []) {
        const list = invitesByCollection.get(invite.collection_id) ?? [];
        list.push({ invite, review: reviewByInvite.get(invite.id) ?? null });
        invitesByCollection.set(invite.collection_id, list);
      }

      return ((collections.data ?? []) as CollectionJoinRow[]).map((row) => {
        const { spells, ...collection } = row;
        return {
          collection,
          spellName: spells?.name ?? "",
          spellLocation: spells?.location ?? "",
          reviews: reviewsByCollection.get(collection.id) ?? [],
          invites: invitesByCollection.get(collection.id) ?? [],
        };
      });
    },
    staleTime: 20_000,
  });
}

/* ------------------------------ Create section -------------------------------- */

export interface CreateCollectionInput {
  spellId: string;
  /** Number of travellers on the spell - the allowance starts at travellers + 1. */
  travellers: number;
  /** ISO timestamp or null for no expiry. */
  expiresAt: string | null;
}

/**
 * Creates the section with its ONE shared link atomically via the staff-only
 * RPC (allowance = travellers + 1, the default five questions seeded).
 * Resolves with the new section id only after the database confirms.
 */
export function useCreateReviewCollection(): UseMutationResult<string, Error, CreateCollectionInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCollectionInput): Promise<string> => {
      const { data, error } = await supabase.rpc("create_review_collection", {
        p_spell_id: input.spellId,
        p_link_count: input.travellers,
        p_expires_at: input.expiresAt ?? undefined,
      });
      if (error) throw new Error(error.message);
      if (typeof data !== "string" || data === "") throw new Error("The review section was not created.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
    },
  });
}

/* ------------------------------- Public lookup -------------------------------- */

/**
 * Token → safe form context (state, spell name, the enabled questions).
 * Works for the shared section link AND legacy traveller links - the server
 * decides everything, including whether the allowance is exhausted.
 */
export function useReviewLinkLookup(token: string): UseQueryResult<ReviewLinkLookup> {
  return useQuery({
    queryKey: reviewInviteKeys.lookup(token),
    queryFn: async (): Promise<ReviewLinkLookup> => {
      const { data, error } = await supabase.rpc("review_link_lookup", { p_token: token });
      if (error) throw new Error(error.message);
      return parseReviewLinkLookup(data);
    },
    enabled: token !== "",
    staleTime: 30_000,
    retry: 1,
  });
}

/* ------------------------------- Public submit -------------------------------- */

export interface SubmitReviewLinkInput {
  token: string;
  answers: ReviewSubmitAnswer[];
}

/**
 * The shared-link submission. The RPC validates every answer against the
 * section's OWN stored questions, checks expiry and allowance under a row
 * lock, writes the review as PENDING and consumes exactly one slot -
 * atomically. Two racing submits on the last slot can never both land.
 */
export function useSubmitReviewLink(): UseMutationResult<void, Error, SubmitReviewLinkInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitReviewLinkInput): Promise<void> => {
      const { data, error } = await supabase.rpc("review_link_submit", {
        p_token: input.token,
        p_answers: input.answers as unknown as Json,
      });
      if (error) throw new Error(error.message);
      const state = typeof data === "object" && data !== null ? (data as { state?: unknown }).state : undefined;
      if (state !== "ok") throw new Error("The submission was not confirmed.");
    },
    onSuccess: (_data, input) => {
      /* A revisit of this link must show its true (possibly exhausted) state. */
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.lookup(input.token) });
    },
  });
}

/* ------------------------------ Allowance control ------------------------------ */

export interface SetAllowanceInput {
  collectionId: string;
  remaining: number;
}

/**
 * Staff-only counter control. The database clamps (0..500) and remains the
 * source of truth: the mutation resolves with the CONFIRMED value, and the
 * realtime channel carries the same change to every other open console.
 */
export function useSetReviewAllowance(): UseMutationResult<number, Error, SetAllowanceInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetAllowanceInput): Promise<number> => {
      const { data, error } = await supabase.rpc("set_review_allowance", {
        p_collection_id: input.collectionId,
        p_remaining: input.remaining,
      });
      if (error) throw new Error(error.message);
      if (typeof data !== "number") throw new Error("The allowance was not confirmed.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
    },
  });
}

/* -------------------------------- Form editing --------------------------------- */

export interface UpdateQuestionsInput {
  collectionId: string;
  questions: ReviewQuestion[];
}

/**
 * Saves the section's review form. The RPC re-validates every question shape
 * server-side (the five core kinds must survive; enabled questions need real
 * titles; choice questions need 2+ options). Historical reviews are untouched
 * - each carries its own answer snapshot.
 */
export function useUpdateReviewQuestions(): UseMutationResult<void, Error, UpdateQuestionsInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateQuestionsInput): Promise<void> => {
      const { error } = await supabase.rpc("update_review_collection_questions", {
        p_collection_id: input.collectionId,
        p_questions: input.questions as unknown as Json,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
    },
  });
}

/* -------------------------------- Publishing ---------------------------------- */

export interface PublishReviewInput {
  reviewId: string;
  /** true → visible on the site (approved) · false → back to private (pending). */
  publish: boolean;
}

/**
 * Staff-only publish toggle on the EXISTING moderation field. The database
 * trigger blocks approving a review whose traveller did not consent - the UI
 * disables the control, the server enforces it. The write is verified: zero
 * affected rows is an error, never a silent success.
 */
export function usePublishReview(): UseMutationResult<void, Error, PublishReviewInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishReviewInput): Promise<void> => {
      const { data, error } = await supabase
        .from("reviews")
        .update({ status: input.publish ? "approved" : "pending" })
        .eq("id", input.reviewId)
        .select("id, status");
      if (error) throw new Error(error.message);
      if ((data ?? []).length !== 1) throw new Error("The review could not be updated - nothing was changed.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
      void queryClient.invalidateQueries({ queryKey: opsKeys.reviews });
      void queryClient.invalidateQueries({ queryKey: opsKeys.badges });
      /* Public archive-page caches ("reviews", previousSpellId) refresh too. */
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
