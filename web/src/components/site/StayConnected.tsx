import { STAY_CONNECTED } from "@/data/stayConnected";
import { cn } from "@/lib/utils";

interface StayConnectedProps {
  /**
   * `block` - the full sign-off at the end of a form page (question page and
   * thank-you page). `inline` - the same words on one wrapping line, for the
   * conversational form's narrow footer bar.
   */
  variant?: "block" | "inline";
  className?: string;
}

/**
 * The founder's "stay connected" sign-off, word for word: Instagram and the
 * WhatsApp community. Rendered at the end of every public form by default
 * (see FormRenderer) - one place to change the links for every form.
 */
export default function StayConnected({ variant = "block", className }: StayConnectedProps) {
  const links = [STAY_CONNECTED.instagram, STAY_CONNECTED.whatsapp];

  if (variant === "inline") {
    return (
      <p
        data-stay-connected
        className={cn("font-sans text-[11px] leading-relaxed text-cream/45", className)}
      >
        <span className="text-gold/80">{STAY_CONNECTED.heading}</span>{" "}
        {links.map((link, index) => (
          <span key={link.url}>
            {index > 0 && <span aria-hidden className="mx-1.5 text-gold/40">·</span>}
            {link.label}{" "}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream/75 underline decoration-gold/40 underline-offset-2 transition-colors hover:text-gold-light"
            >
              {link.display}
            </a>
          </span>
        ))}
      </p>
    );
  }

  return (
    <div
      data-stay-connected
      className={cn(
        "rounded-xl border border-gold/20 bg-gold/[0.05] px-5 py-4 text-left font-sans text-[13px] leading-relaxed text-cream/70",
        className,
      )}
    >
      <p className="font-medium text-gold-light">{STAY_CONNECTED.heading}</p>
      <ul className="mt-2.5 space-y-2">
        {links.map((link) => (
          <li key={link.url}>
            <span className="text-cream/80">{link.label}</span>{" "}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-gold-light underline decoration-gold/40 underline-offset-2 transition-colors hover:text-[#F0DFAE]"
            >
              {link.display}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
