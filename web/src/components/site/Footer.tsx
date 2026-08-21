import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import {
  SOCIAL_LABELS,
  visibleSocials,
  type SocialLinkSettings,
} from "@/data/siteSettings";
import { useSiteSettings } from "@/data/siteSettingsStore";

const SOCIAL_ICONS: Record<keyof SocialLinkSettings, LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

const CIRCLE_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light";

/**
 * M12: contact email, social links, tagline and site name read from the
 * central settings source — only configured links render (no dead buttons).
 */
export default function Footer() {
  const { site, contact, socials } = useSiteSettings();
  const links = visibleSocials(socials);
  const email = contact.contactEmail;

  return (
    <footer aria-label="Footer" className="border-t border-cream/[0.06] bg-charcoal-deep/60">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div>
            <div className="font-sans text-lg font-semibold tracking-[0.42em] text-cream">LOGOUT</div>
            <div className="font-serif text-3xl italic text-gold">Spells</div>
            {site.tagline !== "" && (
              <p className="mt-4 font-serif text-lg italic text-cream/50">{site.tagline}</p>
            )}
            {(links.length > 0 || email !== "") && (
              <div className="mt-6 flex flex-wrap gap-3">
                {links.map(({ id, url }) => {
                  const Icon = SOCIAL_ICONS[id];
                  return (
                    <a
                      key={id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_LABELS[id]}
                      className={CIRCLE_CLASS}
                    >
                      <Icon size={17} />
                    </a>
                  );
                })}
                {email !== "" && (
                  <a href={`mailto:${email}`} aria-label="Email" className={CIRCLE_CLASS}>
                    <Mail size={17} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-12 sm:gap-20">
            <div>
              <h4 className="eyebrow mb-5">Explore</h4>
              <ul className="space-y-3 font-sans text-sm text-cream/55">
                <li>
                  <Link to="/#spells" className="transition-colors hover:text-gold-light">
                    All Spells
                  </Link>
                </li>
                <li>
                  <Link to="/our-story" className="transition-colors hover:text-gold-light">
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link to="/creators" className="transition-colors hover:text-gold-light">
                    Become a Spellcaster
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="transition-colors hover:text-gold-light">
                    The Journal
                  </Link>
                </li>
                <li>
                  <Link to="/live-spells/previous" className="transition-colors hover:text-gold-light">
                    Previous Spells
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="eyebrow mb-5">Connect</h4>
              <ul className="space-y-3 font-sans text-sm text-cream/55">
                <li>
                  <Link to="/discover" className="transition-colors hover:text-gold-light">
                    Discover Your Spell
                  </Link>
                </li>
                <li>
                  <Link to="/live" className="transition-colors hover:text-gold-light">
                    Live Spells
                  </Link>
                </li>
                {email !== "" && (
                  <li>
                    <a href={`mailto:${email}`} className="transition-colors hover:text-gold-light">
                      Contact
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-cream/[0.06] pt-8 sm:flex-row sm:items-center">
          <p className="font-sans text-xs text-cream/35">
            © {new Date().getFullYear()} {site.siteName}. All rights reserved.
          </p>
          <p className="font-serif text-sm italic text-gold/60">
            A private invitation. A quiet movement.
          </p>
        </div>
      </div>
    </footer>
  );
}
