import { Instagram, Linkedin, Mail, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

import { CONTACT_EMAIL, SOCIALS } from "@/data/site";

export default function Footer() {
  return (
    <footer aria-label="Footer" className="border-t border-cream/[0.06] bg-charcoal-deep/60">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div>
            <div className="font-sans text-lg font-semibold tracking-[0.42em] text-cream">LOGOUT</div>
            <div className="font-serif text-3xl italic text-gold">Spells</div>
            <p className="mt-4 font-serif text-lg italic text-cream/50">
              Belonging &gt; Bookings
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={SOCIALS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light"
              >
                <Instagram size={17} />
              </a>
              <a
                href={SOCIALS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light"
              >
                <Linkedin size={17} />
              </a>
              <a
                href={SOCIALS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light"
              >
                <Youtube size={17} />
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label="Email"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 text-gold/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 hover:text-gold-light"
              >
                <Mail size={17} />
              </a>
            </div>
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
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-gold-light">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-cream/[0.06] pt-8 sm:flex-row sm:items-center">
          <p className="font-sans text-xs text-cream/35">
            © {new Date().getFullYear()} Logout Spells. All rights reserved.
          </p>
          <p className="font-serif text-sm italic text-gold/60">
            A private invitation. A quiet movement.
          </p>
        </div>
      </div>
    </footer>
  );
}
