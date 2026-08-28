import type { ReactNode } from "react";

import Page from "@/components/site/Layout";
import { Reveal } from "@/components/site/Reveal";

/**
 * Shared shell for the official policy pages (/refund-policy, /terms,
 * /privacy). One quiet reading column in the site's charcoal/gold language:
 * eyebrow, serif title, italic lead, then evenly-spaced sections. Kept
 * deliberately restrained - these pages exist to be read, not to perform.
 */

interface PolicyShellProps {
  /** Plain title for the document <title> (Page appends the site suffix). */
  title: string;
  /** Styled heading - may carry the gradient italic word. */
  heading: ReactNode;
  /** Unique meta description for search snippets. */
  description: string;
  /** Canonical route, e.g. "/terms". */
  path: string;
  /** Intro block rendered under the heading. */
  intro: ReactNode;
  children: ReactNode;
}

export function PolicyShell({ title, heading, description, path, intro, children }: PolicyShellProps) {
  return (
    <Page
      title={title}
      description={description}
      canonicalPath={path}
      back={{ container: "max-w-3xl", gutters: "px-5 md:px-8" }}
    >
      <section className="relative overflow-hidden px-5 pb-24 pt-32 md:px-8 md:pb-32 md:pt-44">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(184,150,62,0.1), transparent 70%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-3xl">
          <Reveal>
            <p className="eyebrow">The fine print</p>
            <h1 className="heading-serif mt-4 text-4xl text-cream sm:text-5xl md:text-6xl">
              {heading}
            </h1>
            <div className="mt-7 space-y-4">{intro}</div>
            <span aria-hidden className="gold-line mt-12 block" />
          </Reveal>
          {children}
        </div>
      </section>
    </Page>
  );
}

interface PolicySectionProps {
  /** Two-digit marker for numbered documents ("01"); omit for named sections. */
  number?: string;
  title: string;
  children: ReactNode;
}

/** One heading + its body copy, spaced to breathe on a long read. */
export function PolicySection({ number, title, children }: PolicySectionProps) {
  return (
    <section className="mt-12 md:mt-14">
      <div className="flex items-baseline gap-3.5">
        {number !== undefined && (
          <span aria-hidden className="font-serif text-lg italic text-gold/60">
            {number}
          </span>
        )}
        <h2 className="heading-serif text-[26px] leading-tight text-cream md:text-[30px]">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

/** Large italic serif opening line - the page's first breath. */
export function PolicyLead({ children }: { children: ReactNode }) {
  return (
    <p className="font-serif text-xl italic leading-snug text-cream/65 md:text-2xl">{children}</p>
  );
}

/** Body paragraph - the single text recipe every policy uses. */
export function PolicyText({ children }: { children: ReactNode }) {
  return <p className="font-sans text-[15px] leading-[1.85] text-cream/70">{children}</p>;
}

/** Gold-dotted bullet list; items may carry inline emphasis or links. */
export function PolicyList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={`policy-item-${index}`}
          className="flex gap-3 font-sans text-[15px] leading-[1.75] text-cream/70"
        >
          <span aria-hidden className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-gold/80" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Italic serif sub-heading + its bullets (grouped lists, e.g. privacy §1). */
export function PolicyGroup({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <div>
      <h3 className="font-serif text-lg italic text-gold-light/90">{title}</h3>
      <div className="mt-2.5">
        <PolicyList items={items} />
      </div>
    </div>
  );
}
