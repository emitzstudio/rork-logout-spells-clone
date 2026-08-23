import { useState } from "react";
import { toast } from "sonner";

import {
  DormantChip,
  SaveBar,
  SettingsCard,
  TextField,
  useDraft,
  useSavedFlash,
} from "@/components/dashboard/settings/bits";
import {
  emailFieldError,
  type ContactSettings,
  type RoutingSettings,
  type SiteSettings,
} from "@/data/siteSettings";
import { useSaveSettingsSection } from "@/data/siteSettingsStore";

/** §2 - Contact channels + internal routing recipients (dormant until email delivery). */
export default function ContactCard({ settings }: { settings: SiteSettings }) {
  const contact = useDraft(settings.contact);
  const routing = useDraft(settings.routing);
  const saveContact = useSaveSettingsSection("contact");
  const saveRouting = useSaveSettingsSection("routing");
  const { justSaved, flash } = useSavedFlash();
  const [error, setError] = useState<string | null>(null);

  const dirty = contact.dirty || routing.dirty;
  const saving = saveContact.isPending || saveRouting.isPending;

  const emailErrors = {
    contactEmail: emailFieldError(contact.value.contactEmail.trim()),
    supportEmail: emailFieldError(contact.value.supportEmail.trim()),
    generalRecipient: emailFieldError(routing.value.generalRecipient.trim()),
    bookingRecipient: emailFieldError(routing.value.bookingRecipient.trim()),
    formRecipient: emailFieldError(routing.value.formRecipient.trim()),
  };
  const hasFieldError = Object.values(emailErrors).some((e) => e !== null);

  const onSave = async (): Promise<void> => {
    if (saving) return;
    if (hasFieldError) {
      setError("Fix the highlighted fields first.");
      return;
    }
    setError(null);
    const contactPayload: ContactSettings = {
      contactEmail: contact.value.contactEmail.trim(),
      supportEmail: contact.value.supportEmail.trim(),
      phone: contact.value.phone.trim(),
      whatsapp: contact.value.whatsapp.trim(),
    };
    const routingPayload: RoutingSettings = {
      generalRecipient: routing.value.generalRecipient.trim(),
      bookingRecipient: routing.value.bookingRecipient.trim(),
      formRecipient: routing.value.formRecipient.trim(),
    };
    try {
      if (contact.dirty) await saveContact.mutateAsync(contactPayload);
      if (routing.dirty) await saveRouting.mutateAsync(routingPayload);
      contact.reset();
      routing.reset();
      flash();
      toast("Contact information saved ✦");
    } catch (e) {
      setError(e instanceof Error && e.message !== "" ? e.message : "That didn't save - try again.");
    }
  };

  return (
    <SettingsCard
      eyebrow="Reach"
      title="Contact Information"
      intro="Where travellers and partners reach you. Empty fields simply stay off the site - nothing is invented."
      delay={0.05}
    >
      <div className="space-y-4">
        <TextField
          label="General contact email"
          type="email"
          value={contact.value.contactEmail}
          onChange={(v) => contact.patch({ contactEmail: v })}
          placeholder="hello@…"
          error={emailErrors.contactEmail}
          hint="Used by the footer, support page and apply-to-host flow."
        />
        <TextField
          label="Support email"
          type="email"
          value={contact.value.supportEmail}
          onChange={(v) => contact.patch({ supportEmail: v })}
          placeholder="support@…"
          error={emailErrors.supportEmail}
          hint="Empty means support uses the general contact email."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            type="tel"
            value={contact.value.phone}
            onChange={(v) => contact.patch({ phone: v })}
            placeholder="+91 …"
          />
          <TextField
            label="WhatsApp number"
            type="tel"
            value={contact.value.whatsapp}
            onChange={(v) => contact.patch({ whatsapp: v })}
            placeholder="+91 …"
            hint="Shown on the traveller support page when set."
          />
        </div>

        <div className="rounded-lg border border-cream/[0.07] bg-cream/[0.015] p-4">
          <p className="flex flex-wrap items-center gap-2 font-sans text-[10px] uppercase tracking-[0.24em] text-cream/45">
            Internal routing <DormantChip>Dormant</DormantChip>
          </p>
          <p className="mt-1.5 font-sans text-[11.5px] leading-relaxed text-cream/40">
            Stored now, used when email delivery is connected - no emails are sent yet.
          </p>
          <div className="mt-3 space-y-3.5">
            <TextField
              label="General enquiry recipient"
              type="email"
              value={routing.value.generalRecipient}
              onChange={(v) => routing.patch({ generalRecipient: v })}
              placeholder="Empty - not configured"
              error={emailErrors.generalRecipient}
            />
            <TextField
              label="Booking enquiry recipient"
              type="email"
              value={routing.value.bookingRecipient}
              onChange={(v) => routing.patch({ bookingRecipient: v })}
              placeholder="Empty - not configured"
              error={emailErrors.bookingRecipient}
            />
            <TextField
              label="Form response recipient"
              type="email"
              value={routing.value.formRecipient}
              onChange={(v) => routing.patch({ formRecipient: v })}
              placeholder="Empty - not configured"
              error={emailErrors.formRecipient}
            />
          </div>
        </div>
      </div>
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={error}
        justSaved={justSaved}
        onSave={() => void onSave()}
      />
    </SettingsCard>
  );
}
