import { ChevronDown, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PackageCard } from "@/data/packageCards";
import { starboyPackageBrochure } from "@/data/starboyPackageBrochures";

/** All general download actions offer an explicit package choice, never a stale shared PDF. */
export default function StarboyBrochureMenu({ packages, className, label }: {
  packages: PackageCard[];
  className?: string;
  label: string;
}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className={className}><Download size={16} aria-hidden /> {label} <ChevronDown size={14} aria-hidden /></button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" sideOffset={8} className="z-[100] w-72 max-w-[calc(100vw-2rem)] border-gold/25 bg-[#161310] p-2 text-cream shadow-xl">
      <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gold-light">Choose your Grimoire</DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gold/15" />
      {packages.map((pack) => {
        const href = starboyPackageBrochure(pack.id);
        if (!href) return null;
        return <DropdownMenuItem key={pack.id} asChild className="min-h-16 cursor-pointer px-3 py-3 focus:bg-gold/10 focus:text-cream">
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Download ${pack.name} Grimoire (PDF)`}>
            <span className="flex-1"><span className="block text-sm font-semibold tracking-wide">{pack.name}</span><span className="mt-1 block text-xs text-cream/60">{pack.dates} · {pack.location}</span></span>
            <Download size={16} className="ml-3 shrink-0 text-gold-light" aria-hidden />
          </a>
        </DropdownMenuItem>;
      })}
    </DropdownMenuContent>
  </DropdownMenu>;
}
