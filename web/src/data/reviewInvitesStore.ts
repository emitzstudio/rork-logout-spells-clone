/**
 * Review collections store (M13) — staff reads, collection creation, the
 * public token lookup/submit, and consent-gated publishing.
 *
 * Staff reads go through RLS (collections + invitations are staff-only rows);
 * creation and traveller submission go through the database RPCs so the exact
 * link count, one-time tokens and spell association are server-enforced.
 * Publishing flips the EXISTING reviews.status moderation field — the same
 * one Testimonials uses — so there is exactly ONE review system.
 */
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { opsKeys, type ReviewRow } from "@/data/bookingOps";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { parseInviteLookup, type InviteLookup } from "./reviewInvites";

type Tables = Database["public"]["Tables"];
export type ReviewCollectionRow = Tables["review_collections"]["Row"];
export type ReviewInvitationRow = Tables["review_invitations"]["Row"];
export type { ReviewRow };

export const reviewInviteKeys = {
  collections: ["review-collections"] as const,
  lookup: (token: string) => ["review-invite-lookup", token] as const,
};

/* --------------------------------- Staff reads -------------------------------- */

export interface InviteWithReview {
  invite: ReviewInvitationRow;
  /** The submitted review, once this invitation was used. */
  review: ReviewRow | null;
}

export interface CollectionBundle {
  collection: ReviewCollectionRow;
  spellName: string;
  spellLocation: string;
  invites: InviteWithReview[];
}

type CollectionJoinRow = ReviewCollectionRow & {
  spells: { name: string; location: string } | null;
};

/**
 * Every collection with its invitations and their submitted reviews — one
 * cache shared by the overview list and the collection detail page.
 */
export function useReviewCollections(): UseQueryResult<CollectionBundle[]> {
  return useQuery({
    queryKey: reviewInviteKeys.collections,
    queryFn: async (): Promise<CollectionBundle[]> => {
      const [collections, invitations, reviews] = await Promise.all([
        supabase
          .from("review_collections")
          .select("*, spells(name, location)")
          .order("created_at", { ascending: false }),
        supabase.from("review_invitations").select("*").order("position", { ascending: true }),
        supabase.from("reviews").select("*").not("invitation_id", "is", null),
      ]);
      if (collections.error) throw collections.error;
      if (invitations.error) throw invitations.error;
      if (reviews.error) throw reviews.error;

      const reviewByInvite = new Map<string, ReviewRow>();
      for (const review of reviews.data ?? []) {
        if (review.invitation_id !== null) reviewByInvite.set(review.invitation_id, review);
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
          invites: invitesByCollection.get(collection.id) ?? [],
        };
      });
    },
    staleTime: 20_000,
  });
}

/* ------------------------------ Create collection ----------------------------- */

export interface CreateCollectionInput {
  spellId: string;
  linkCount: number;
  /** ISO timestamp or null for no expiry. */
  expiresAt: string | null;
}

/**
 * Creates the collection + EXACTLY linkCount one-time invitations atomically
 * via the staff-only RPC. Resolves with the new collection id only after the
 * database confirms — no optimistic success.
 */
export function useCreateReviewCollection(): UseMutationResult<string, Error, CreateCollectionInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCollectionInput): Promise<string> => {
      const { data, error } = await supabase.rpc("create_review_collection", {
        p_spell_id: input.spellId,
        p_link_count: input.linkCount,
        p_expires_at: input.expiresAt ?? undefined,
      });
      if (error) throw new Error(error.message);
      if (typeof data !== "string" || data === "") throw new Error("The collection was not created.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.collections });
    },
  });
}

/* ------------------------------- Public lookup -------------------------------- */

/** Token → safe form context (state + spell name only). Server decides everything. */
export function useInviteLookup(token: string): UseQueryResult<InviteLookup> {
  return useQuery({
    queryKey: reviewInviteKeys.lookup(token),
    queryFn: async (): Promise<InviteLookup> => {
      const { data, error } = await supabase.rpc("review_invite_lookup", { p_token: token });
      if (error) throw new Error(error.message);
      return parseInviteLookup(data);
    },
    enabled: token !== "",
    staleTime: 30_000,
    retry: 1,
  });
}

/* ------------------------------- Public submit -------------------------------- */

export interface SubmitInviteInput {
  token: string;
  name: string;
  rating: number;
  summary: string;
  experience: string;
  consent: boolean;
}

/**
 * The one-time submission. The RPC validates the token (unused + unexpired),
 * writes the review as PENDING and burns the invitation — atomically.
 */
export function useSubmitInviteReview(): UseMutationResult<void, Error, SubmitInviteInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitInviteInput): Promise<void> => {
      const { data, error } = await supabase.rpc("review_invite_submit", {
        p_token: input.token,
        p_name: input.name,
        p_rating: input.rating,
        p_summary: input.summary,
        p_experience: input.experience,
        p_consent: input.consent,
      });
      if (error) throw new Error(error.message);
      const state = typeof data === "object" && data !== null ? (data as { state?: unknown }).state : undefined;
      if (state !== "ok") throw new Error("The submission was not confirmed.");
    },
    onSuccess: (_data, input) => {
      /* A revisit of this link must show its true (used) state. */
      void queryClient.invalidateQueries({ queryKey: reviewInviteKeys.lookup(input.token) });
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
 * trigger blocks approving a review whose traveller did not consent — the UI
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
      if ((data ?? []).length !== 1) throw new Error("The review could not be updated — nothing was changed.");
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
