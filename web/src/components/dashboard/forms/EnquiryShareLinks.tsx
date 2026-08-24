import { Check, Copy, Megaphone, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { creatorLink, creatorSlug, isValidCreatorSlug, logoutSpellsLink } from "@/data/crm";

/**
 * CRM V1 - the two tracked share links of an enquiry form.
 *
 * Both open the EXACT same public form; only the source attribution in the
 * query string differs. The creator link is minted per creator: type their
 * name, the slug is derived, and the copied link carries it so the lead
 * stays attributable (commission tracking later, nothing calculated now).
 */
export default function EnquiryShareLinks({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<"ls" | "creator" | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");

  const origin = window.location.origin;
  const lsUrl = logoutSpellsLink(origin, slug);
  const slugged = useMemo(() => creatorSlug(creatorName), [creatorName]);
  const creatorReady = isValidCreatorSlug(slugged);
  const creatorUrl = creatorReady ? creatorLink(origin, slug, slugged) : "";

  const copy = (key: "ls" | "creator", url: string): void => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
    });
  };

  const copyButton = (key: "ls" | "creator", url: string, disabled: boolean) => (
    <button
      type="button"
      onClick={() => copy(key, url)}
      disabled={disabled}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-cream/12 px-2.5 py-1.5 font-sans text-[10.5px] uppercase tracking-[0.12em] text-cream/60 transition-all duration-200 hover:border-gold/45 hover:text-gold-light active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied === key ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
      {copied === key ? "Copied" : "Copy"}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Logout Spells link */}
      <div className="rounded-xl border border-cream/10 bg-charcoal-deep/50 p-3.5">
        <p className="flex items-center gap-1.5 font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold/70">
          <Sparkles className="h-3 w-3" /> Logout Spells link
        </p>
        <p className="mt-1 font-sans text-[11px] leading-snug text-cream/40">
          Shared by the team with our own audience. Every submission lands in the CRM as
          Source: Logout Spells.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-cream/70">{lsUrl}</span>
          {copyButton("ls", lsUrl, false)}
        </div>
      </div>

      {/* Creator link */}
      <div className="rounded-xl border border-cream/10 bg-charcoal-deep/50 p-3.5">
        <p className="flex items-center gap-1.5 font-sans text-[10.5px] font-medium uppercase tracking-[0.2em] text-gold/70">
          <Megaphone className="h-3 w-3" /> Creator link
        </p>
        <p className="mt-1 font-sans text-[11px] leading-snug text-cream/40">
          Minted per creator so every lead remembers who sent it. Same form, tracked source.
        </p>
        <input
          type="text"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          placeholder="Creator name or handle, e.g. Vidushi"
          className="mt-2.5 h-9 w-full rounded-lg border border-cream/12 bg-cream/[0.03] px-3 font-sans text-[12.5px] text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-gold/50"
        />
        {creatorReady ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-cream/70">{creatorUrl}</span>
            {copyButton("creator", creatorUrl, false)}
          </div>
        ) : (
          <p className="mt-2 font-sans text-[11px] italic text-cream/30">
            {creatorName.trim() === ""
              ? "Type a creator name to mint their link."
              : "That name can't form a link yet. Use letters or numbers."}
          </p>
        )}
      </div>
    </div>
  );
}
