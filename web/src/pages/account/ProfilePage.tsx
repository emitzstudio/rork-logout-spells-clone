import { AnimatePresence, motion } from "framer-motion";
import { Camera, PenLine, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AccountPage, EASE } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { fmtDayYear } from "@/data/account/derive";
import type { TravellerProfile } from "@/data/account/models";
import { fileToKeepsake } from "@/data/account/service";
import { CATEGORY_META } from "@/data/spells";
import type { SpellCategoryId } from "@/data/spells";
import { cn } from "@/lib/utils";

const ALL_INTERESTS = Object.keys(CATEGORY_META) as SpellCategoryId[];

/** Profile — the traveller's own page, and the source of every pre-filled form. */
export default function ProfilePage() {
  const { data, updateProfile } = useAccount();
  const [editing, setEditing] = useState<boolean>(false);

  if (!data) return null;
  const p = data.profile;

  const toggleInterest = (cat: SpellCategoryId): void => {
    const next = p.interests.includes(cat)
      ? p.interests.filter((c) => c !== cat)
      : [...p.interests, cat];
    void updateProfile({ interests: next }).then(() =>
      toast("Leanings updated — recommendations will follow ✦"),
    );
  };

  return (
    <AccountPage
      title="Profile"
      eyebrow="Profile"
      heading={
        <>
          The person behind <span className="italic text-gold-gradient">the journeys.</span>
        </>
      }
      sub="Everything here quietly pre-fills your bookings — dietary needs, emergency contact, the lot. Answer once, wander forever."
      actions={
        <button type="button" onClick={() => setEditing(true)} className="btn-gold !px-5 !py-2.5 !text-[12px]">
          <PenLine size={13} /> Edit profile
        </button>
      }
    >
      {/* Identity card */}
      <section className="relative overflow-hidden rounded-3xl border border-cream/[0.09]">
        <div className="relative h-44 md:h-56">
          <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#14130f] via-[#14130f]/40 to-transparent" />
        </div>
        <div className="relative bg-[#14130f] px-6 pb-6 md:px-9 md:pb-8">
          <div className="flex flex-wrap items-end gap-5">
            <img
              src={p.avatar}
              alt={`${p.firstName}'s portrait`}
              className="-mt-12 h-24 w-24 rounded-full border-4 border-[#14130f] object-cover shadow-[0_0_30px_rgba(184,150,62,0.25)] md:-mt-14 md:h-28 md:w-28"
            />
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="heading-serif text-3xl text-cream md:text-4xl">
                {p.firstName} {p.lastName}
              </h2>
              <p className="mt-1 font-sans text-[12.5px] text-cream/45">
                {p.city} · In the circle since {fmtDayYear(p.joinedAt)}
              </p>
            </div>
            <p className="hidden pb-1 font-hand text-2xl text-gold/60 md:block">— {p.instagram}</p>
          </div>
          <p className="mt-5 max-w-2xl font-serif text-[17px] italic leading-relaxed text-cream/65">
            “{p.bio}”
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="card-glass rounded-2xl p-6 lg:col-span-2">
          <p className="eyebrow !text-[10px]">The essentials</p>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              { label: "Email", value: p.email },
              { label: "Phone", value: p.phone },
              { label: "Birthday", value: fmtDayYear(p.birthday) },
              { label: "Languages", value: p.languages.join(", ") },
              { label: "Dietary", value: p.dietary },
              { label: "Instagram", value: p.instagram },
            ].map((row) => (
              <div key={row.label}>
                <dt className="font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">{row.label}</dt>
                <dd className="mt-1 truncate font-sans text-[13.5px] text-cream/80">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-cream/[0.07] pt-5">
            <p className="font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">Emergency contact</p>
            <p className="mt-1.5 font-sans text-[13.5px] text-cream/80">
              {p.emergency.name} ({p.emergency.relation}) · {p.emergency.phone}
            </p>
            <p className="mt-1 font-sans text-[11px] text-cream/35">
              Travels with you on every booking — hosts have it before you arrive.
            </p>
          </div>
        </div>

        {/* Identity + autofill note */}
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">How you travel</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {p.travelStyles.map((style) => (
                <span
                  key={style}
                  className="rounded-full border border-cream/12 bg-cream/[0.04] px-3 py-1.5 font-sans text-[11.5px] text-cream/65"
                >
                  {style}
                </span>
              ))}
            </div>
            <p className="mt-5 font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">
              Spells you lean toward
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ALL_INTERESTS.map((cat) => {
                const active = p.interests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleInterest(cat)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-sans text-[11.5px] transition-all duration-300 active:scale-95",
                      active
                        ? "border-gold/50 bg-gold/10 text-gold-light"
                        : "border-cream/12 text-cream/45 hover:border-cream/30 hover:text-cream",
                    )}
                  >
                    {CATEGORY_META[cat].symbol} {CATEGORY_META[cat].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-sans text-[10.5px] text-cream/35">
              These shape your recommendations everywhere.
            </p>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/30 bg-charcoal-deep/50 text-gold">
              <Sparkles size={15} />
            </span>
            <p className="mt-3.5 font-serif text-[18px] leading-snug text-cream">
              Answer once, wander forever.
            </p>
            <p className="mt-2 font-sans text-[12px] leading-relaxed text-cream/50">
              Booking forms pull your name, contact, dietary needs and emergency details from here —
              you'll never type them twice.
            </p>
          </div>
        </div>
      </div>

      <EditProfileDialog open={editing} profile={p} onClose={() => setEditing(false)} />
    </AccountPage>
  );
}

/* ------------------------------- Edit dialog ------------------------------- */

interface EditProfileDialogProps {
  open: boolean;
  profile: TravellerProfile;
  onClose: () => void;
}

function EditProfileDialog({ open, profile, onClose }: EditProfileDialogProps) {
  const { updateProfile } = useAccount();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<TravellerProfile>(profile);

  // Re-sync the form each time the dialog opens (abandoned edits shouldn't linger).
  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  const set = <K extends keyof TravellerProfile>(key: K, value: TravellerProfile[K]): void =>
    setForm((f) => ({ ...f, [key]: value }));

  const onAvatarPick = async (files: FileList | null): Promise<void> => {
    const file = files?.[0];
    if (!file) return;
    try {
      const src = await fileToKeepsake(file);
      set("avatar", src);
    } catch {
      toast("That photo couldn't be read.");
    }
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setSaving(true);
    void updateProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      bio: form.bio,
      city: form.city,
      phone: form.phone,
      instagram: form.instagram,
      dietary: form.dietary,
      languages: form.languages,
      birthday: form.birthday,
      avatar: form.avatar,
      emergency: form.emergency,
    })
      .then(() => {
        toast("Profile updated ✦");
        onClose();
      })
      .finally(() => setSaving(false));
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-cream/15 bg-charcoal-soft/60 px-3.5 py-2.5 font-sans text-[13.5px] text-cream placeholder:text-cream/25 focus:border-gold/60 focus:outline-none";
  const label = "font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="presentation"
          className="fixed inset-0 z-[97] grid place-items-center overflow-y-auto bg-charcoal-deep/85 px-4 py-8 backdrop-blur-md"
        >
          <motion.form
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gold/25 bg-[#14130f] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-center justify-between border-b border-cream/[0.07] p-5 md:px-6">
              <h3 className="font-serif text-2xl text-cream">Edit profile</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all hover:border-cream/40 hover:text-cream active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[62vh] space-y-4 overflow-y-auto p-5 md:p-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <img src={form.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-gold/40 object-cover" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost-gold !px-4 !py-2 !text-[11.5px]"
                >
                  <Camera size={13} /> Change photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-hidden
                  onChange={(e) => void onAvatarPick(e.target.files)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>First name</span>
                  <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Last name</span>
                  <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={field} />
                </label>
              </div>

              <label className="block">
                <span className={label}>Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  rows={3}
                  className={cn(field, "resize-none")}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>City</span>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Phone</span>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Birthday</span>
                  <input
                    type="date"
                    value={form.birthday.slice(0, 10)}
                    onChange={(e) => set("birthday", e.target.value)}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Instagram</span>
                  <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Dietary</span>
                  <input value={form.dietary} onChange={(e) => set("dietary", e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Languages (comma-separated)</span>
                  <input
                    value={form.languages.join(", ")}
                    onChange={(e) =>
                      set(
                        "languages",
                        e.target.value.split(",").map((s) => s.trim()).filter((s) => s !== ""),
                      )
                    }
                    className={field}
                  />
                </label>
              </div>

              <div>
                <p className={label}>Emergency contact</p>
                <div className="mt-1.5 grid grid-cols-3 gap-3">
                  <input
                    value={form.emergency.name}
                    onChange={(e) => set("emergency", { ...form.emergency, name: e.target.value })}
                    placeholder="Name"
                    aria-label="Emergency contact name"
                    className={cn(field, "!mt-0")}
                  />
                  <input
                    value={form.emergency.relation}
                    onChange={(e) => set("emergency", { ...form.emergency, relation: e.target.value })}
                    placeholder="Relation"
                    aria-label="Emergency contact relation"
                    className={cn(field, "!mt-0")}
                  />
                  <input
                    value={form.emergency.phone}
                    onChange={(e) => set("emergency", { ...form.emergency, phone: e.target.value })}
                    placeholder="Phone"
                    aria-label="Emergency contact phone"
                    className={cn(field, "!mt-0")}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-cream/[0.07] p-5 md:px-6">
              <button type="button" onClick={onClose} className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-gold !px-6 !py-2.5 !text-[12px] disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
