import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  /** 0-5, halves rendered as partially-filled. */
  value: number;
  size?: number;
  className?: string;
  /** Accessible label override, e.g. "Rated 4.8 out of 5". */
  label?: string;
}

/** The gold five-star row used on memory cards, review lists and summaries. */
export function RatingStars({ value, size = 14, className, label }: RatingStarsProps) {
  return (
    <span
      role="img"
      aria-label={label ?? `Rated ${value} out of 5`}
      className={cn("inline-flex items-center gap-[3px]", className)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} aria-hidden className="relative inline-flex">
            <Star size={size} className="text-cream/20" fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="text-gold-light" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

interface StarPickerProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Interactive star input for the review form. */
export function StarPicker({ value, onChange, size = 26 }: StarPickerProps) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          className="rounded-md p-0.5 transition-transform duration-200 hover:scale-110 active:scale-95"
        >
          <Star
            size={size}
            className={cn(
              "transition-colors duration-200",
              star <= value ? "text-gold-light" : "text-cream/25",
            )}
            fill={star <= value ? "currentColor" : "transparent"}
            strokeWidth={star <= value ? 0 : 1.4}
          />
        </button>
      ))}
    </div>
  );
}
