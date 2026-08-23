import type { LucideIcon } from "lucide-react";
import {
  Code2,
  Compass,
  Handshake,
  Instagram,
  Linkedin,
  Megaphone,
  RotateCcw,
  Sparkles,
  Youtube,
} from "lucide-react";
import { useState } from "react";

import { MagicDust } from "@/components/site/MagicDust";
import { Reveal } from "@/components/site/Reveal";
import { useTeamMembers } from "@/data/team";
import type { TeamDepartment, TeamMember } from "@/data/team";
import { cn } from "@/lib/utils";

const DEPARTMENT_ICONS: Record<TeamDepartment, LucideIcon> = {
  Founder: Sparkles,
  Technology: Code2,
  Sales: Handshake,
  "Social Media": Megaphone,
  Operations: Compass,
};

/** Tiny department pill - worn on the front of every card. */
function DepartmentChip({ department }: { department: TeamDepartment }) {
  const Icon = DEPARTMENT_ICONS[department];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-charcoal-deep/80 px-3 py-1.5 font-sans text-[9px] uppercase tracking-[0.22em] text-gold-light">
      <Icon size={10} aria-hidden />
      {department}
    </span>
  );
}

/** The socials row - identical treatment on spotlight and card backs. */
function SocialLinks({ member, tabbable }: { member: TeamMember; tabbable: boolean }) {
  const socials = [
    { label: "Instagram", href: member.socials.instagram, Icon: Instagram },
    { label: "LinkedIn", href: member.socials.linkedin, Icon: Linkedin },
    { label: "YouTube", href: member.socials.youtube, Icon: Youtube },
  ];
  return (
    <>
      {socials.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on ${label}`}
          tabIndex={tabbable ? 0 : -1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light"
        >
          <Icon size={14} />
        </a>
      ))}
    </>
  );
}

/** Portrait art - studio cutout on black with a candlelit gold aura. */
function Portrait({
  member,
  className,
  eager = false,
}: {
  member: TeamMember;
  className?: string;
  eager?: boolean;
}) {
  if (member.photo === "") {
    return (
      <div
        className={cn(
          "grid place-items-center bg-gradient-to-br from-[#2a2113] via-[#1a1409] to-[#0f0c07]",
          className,
        )}
      >
        <span className="heading-serif text-[130px] italic text-gold-gradient" aria-hidden>
          {member.initial}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(184,150,62,0.14), transparent 68%)",
        }}
      />
      <img
        src={member.photo}
        alt={`Portrait of ${member.name}`}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        style={{ objectPosition: "50% 22%" }}
      />
    </div>
  );
}

/* ------------------------- Founder spotlight card ------------------------- */

/**
 * Vidushi's wide editorial card - no flip, everything on display: the
 * portrait melting into black, the story, the quote and the seal.
 */
function FounderSpotlight({ member }: { member: TeamMember }) {
  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-gold/20 bg-[#0d0b08]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/[0.07] blur-[80px]"
      />
      <div className="grid md:grid-cols-[0.85fr_1.15fr]">
        {/* Portrait side */}
        <div className="relative aspect-[4/5] sm:aspect-[16/12] md:aspect-auto md:min-h-[540px]">
          <Portrait member={member} className="absolute inset-0" eager />
          {/* Melt the portrait into the card body */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0d0b08] to-transparent md:hidden"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 hidden w-36 bg-gradient-to-l from-[#0d0b08] to-transparent md:block"
          />
          <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-charcoal-deep/80 px-3.5 py-1.5 font-sans text-[9.5px] uppercase tracking-[0.24em] text-gold-light">
            <Sparkles size={10} aria-hidden /> Founder
          </span>
        </div>

        {/* Story side */}
        <div className="relative flex flex-col justify-center p-7 pt-2 md:p-12 md:pt-12 lg:p-14">
          <p className="eyebrow !text-[10px]">{member.designation}</p>
          <h3 className="heading-serif mt-3 text-4xl text-cream md:text-5xl">{member.name}</h3>
          <p className="mt-4 font-serif text-xl italic leading-snug text-cream/85 md:text-[22px]">
            {member.intro}
          </p>

          <div className="mt-7 grid gap-6 border-t border-cream/[0.07] pt-7 sm:grid-cols-2">
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">
                What she does
              </p>
              <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-cream/60">
                {member.focus}
              </p>
            </div>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">
                Her contribution
              </p>
              <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-cream/60">
                {member.contribution}
              </p>
            </div>
          </div>

          {member.quote && (
            <p className="mt-7 border-l-2 border-gold/40 pl-4 font-hand text-2xl leading-snug text-gold/80">
              “{member.quote}”
            </p>
          )}

          <div className="mt-8 flex items-center gap-2.5">
            <SocialLinks member={member} tabbable />
            <span className="ml-auto hidden font-sans text-[9px] uppercase tracking-[0.2em] text-cream/30 sm:block">
              ✦ Logout Spells
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Flip cards ------------------------------- */

/**
 * One rotatable team card - Spellcaster-card energy: photo front, story back.
 * The front is a button (tap/Enter flips); the back offers a flip-back
 * control plus real links, so nothing interactive ever nests illegally.
 */
function TeamCard({ member }: { member: TeamMember }) {
  const [flipped, setFlipped] = useState<boolean>(false);
  /* Each flip - either direction - releases a whisper of stardust. */
  const [dust, setDust] = useState<number>(0);

  return (
    <div className="perspective-1200 relative h-[480px] w-full">
      <div
        className="preserve-3d relative h-full w-full transition-transform duration-700 ease-out-expo motion-reduce:transition-none"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* ------------------------------ FRONT ------------------------------ */}
        <button
          type="button"
          onClick={() => {
            setFlipped(true);
            setDust((d) => d + 1);
          }}
          aria-pressed={flipped}
          aria-label={`Meet ${member.name}, ${member.designation}`}
          tabIndex={flipped ? -1 : 0}
          className="backface-hidden group absolute inset-0 flex flex-col justify-end overflow-hidden rounded-[16px] border border-cream/[0.08] bg-black text-left transition-colors duration-500 hover:border-gold/40"
        >
          <Portrait member={member} className="absolute inset-0" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#0a0806]/95 via-[#0a0806]/30 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(ellipse 80% 55% at 50% 15%, rgba(184,150,62,0.16), transparent 70%)",
            }}
          />

          <span className="absolute left-4 top-4">
            <DepartmentChip department={member.department} />
          </span>
          <span className="absolute right-4 top-4 rounded-full border border-cream/15 bg-charcoal-deep/75 px-3 py-1.5 font-sans text-[9px] uppercase tracking-[0.22em] text-cream/60 transition-colors duration-300 group-hover:border-gold/40 group-hover:text-gold-light">
            Tap ✦
          </span>

          <div className="relative p-6">
            <p className="eyebrow !text-[9.5px]">{member.designation}</p>
            <h3 className="heading-serif mt-2 text-3xl text-cream">{member.name}</h3>
          </div>
        </button>

        {/* ------------------------------- BACK ------------------------------- */}
        <div
          aria-hidden={!flipped}
          className="backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[16px] border border-gold/25 bg-[#15130e] p-6"
          style={{ transform: "rotateY(180deg)" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-gold/[0.08] blur-[52px]"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow !text-[9px]">{member.designation}</p>
              <h3 className="mt-1.5 font-serif text-2xl font-medium text-cream">{member.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setDust((d) => d + 1);
              }}
              aria-label={`Flip ${member.name}'s card back`}
              tabIndex={flipped ? 0 : -1}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cream/15 text-cream/55 transition-all duration-300 hover:border-gold/50 hover:text-gold-light active:scale-95"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="relative mt-4 flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
            <p className="font-serif text-[17px] italic leading-snug text-cream/85">
              {member.intro}
            </p>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">
                What they do
              </p>
              <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-cream/60">
                {member.focus}
              </p>
            </div>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.26em] text-gold/70">
                Their contribution
              </p>
              <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-cream/60">
                {member.contribution}
              </p>
            </div>
            {member.quote && (
              <p className="border-l-2 border-gold/40 pl-3 font-hand text-lg leading-snug text-gold/75">
                “{member.quote}”
              </p>
            )}
          </div>

          <div className="relative mt-4 flex items-center gap-2.5 border-t border-cream/[0.07] pt-4">
            <SocialLinks member={member} tabbable={flipped} />
            <span className="ml-auto font-sans text-[9px] uppercase tracking-[0.2em] text-cream/30">
              ✦ Logout Spells
            </span>
          </div>
        </div>
      </div>
      <MagicDust burst={dust} />
    </div>
  );
}

/* --------------------------------- Layout --------------------------------- */

/**
 * The coven - founder spotlight up top, then the circle as rotatable cards.
 * Desktop: grid. Mobile: swipe carousel (snap scrolling). Members come from
 * `teamService`, so the future CMS can add unlimited people without touching
 * this component.
 */
export default function TeamCards() {
  const members = useTeamMembers();
  const founder = members.find((m) => m.featured === true);
  const circle = members.filter((m) => m.id !== founder?.id);

  return (
    <div>
      {founder && (
        <Reveal delay={0.06}>
          <FounderSpotlight member={founder} />
        </Reveal>
      )}

      <div
        className={cn(
          "-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 no-scrollbar",
          "md:mx-0 md:mt-6 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3",
        )}
      >
        {circle.map((member, i) => (
          <Reveal
            key={member.id}
            delay={0.06 + i * 0.07}
            className="w-[82%] min-w-[82%] snap-center sm:w-[340px] sm:min-w-[340px] md:w-auto md:min-w-0"
          >
            <TeamCard member={member} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
