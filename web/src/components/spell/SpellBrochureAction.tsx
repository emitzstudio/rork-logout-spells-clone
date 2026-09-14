import { Download, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { SpellDraft } from "@/data/builder";
import { brochureLink } from "@/data/publishedPricing";
import { cn } from "@/lib/utils";
import StarboyBrochureMenu from "@/components/spell/StarboyBrochureMenu";
import { starboyPackageBrochure } from "@/data/starboyPackageBrochures";

/** Prefer an existing custom PDF; otherwise generate a fresh download from this spell's details. */
export default function SpellBrochureAction({ draft, className, label = "Download brochure (PDF)" }: {
  draft: SpellDraft;
  className?: string;
  label?: string;
}) {
  const link = brochureLink(draft.pricing);
  const [status, setStatus] = useState<"idle" | "preparing" | "error">("idle");
  const inFlight = useRef<boolean>(false);
  const classes = cn("inline-flex min-h-11 items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-wait disabled:opacity-65", className);

  const download = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("preparing");
    try {
      const { downloadSpellBrochure } = await import("@/lib/spellPdf");
      await downloadSpellBrochure(draft);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  };

  const packages = draft.slug === "the-starboy-spell" ? draft.pricing?.packages?.filter((pack) => starboyPackageBrochure(pack.id)) : undefined;
  if (packages?.length) return <StarboyBrochureMenu packages={packages} className={classes} label={label} />;
  if (link) return <a href={link} target="_blank" rel="noopener noreferrer" className={classes}><Download size={16} aria-hidden /> {label}</a>;
  return <div className="flex max-w-full flex-col items-center gap-2">
    <button type="button" onClick={() => void download()} disabled={status === "preparing"} aria-busy={status === "preparing"} className={classes}>
      {status === "preparing" ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Download size={16} aria-hidden />}
      <span aria-live="polite">{status === "preparing" ? "Preparing PDF…" : status === "error" ? "Retry brochure download" : label}</span>
    </button>
    {status === "error" && <p role="alert" className="max-w-72 text-center text-xs normal-case leading-relaxed tracking-normal text-red-300">We couldn’t prepare your brochure. Check your connection and try again.</p>}
  </div>;
}
