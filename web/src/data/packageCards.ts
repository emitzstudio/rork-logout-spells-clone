import { z } from "zod";

const packageItemSchema = z.object({
  title: z.string().trim().min(1),
  detail: z.string().optional(),
});

/** Saved package-specific terms; distinct from payment/deposit price tiers. */
export const packageCardsSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  earlyBird: z.number().int().positive(),
  regular: z.number().int().positive(),
  dates: z.string().min(1),
  duration: z.string().min(1),
  location: z.string().min(1),
  included: z.array(packageItemSchema).min(1),
  excludedHeading: z.enum(["NOT INCLUDED / OPTIONAL", "NOT INCLUDED"]),
  excluded: z.array(packageItemSchema),
})).min(1).refine((cards) => new Set(cards.map((card) => card.id)).size === cards.length);

/** One complete, independently understandable travel package. */
export type PackageCard = z.infer<typeof packageCardsSchema>[number];
