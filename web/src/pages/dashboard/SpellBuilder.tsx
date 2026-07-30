import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Check, Eye, Save, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import BuilderSection from "@/components/dashboard/builder/BuilderSection";
import RemoveDaysDialog from "@/components/dashboard/builder/RemoveDaysDialog";
import AboutSection from "@/components/dashboard/builder/sections/AboutSection";
import AudienceSection from "@/components/dashboard/builder/sections/AudienceSection";
import BasicInfoSection from "@/components/dashboard/builder/sections/BasicInfoSection";
import FaqSection from "@/components/dashboard/builder/sections/FaqSection";
import HeroImagesSection from "@/components/dashboard/builder/sections/HeroImagesSection";
import HostSection from "@/components/dashboard/builder/sections/HostSection";
import InclusionsSection from "@/components/dashboard/builder/sections/InclusionsSection";
import ItinerarySection from "@/components/dashboard/builder/sections/ItinerarySection";
import type { ItineraryApi } from "@/components/dashboard/builder/sections/ItinerarySection";
import QuickInfoSection from "@/components/dashboard/builder/sections/QuickInfoSection";
import StaySection from "@/components/dashboard/builder/sections/StaySection";
import TripHighlightsSection from "@/components/dashboard/builder/sections/TripHighlightsSection";
import PublishOverlay from "@/components/dashboard/builder/PublishOverlay";
import SpellPreview, { DeviceToggle } from "@/components/dashboard/builder/SpellPreview";
import { SpellStatusBadge } from "@/components/dashboard/spells/SpellBadges";
import {
  BUILDER_SECTION_META,
  cloneWithId,
  createAudienceCard,
  createEmptyDraft,
  createFaq,
  createHighlight,
  createItineraryDay,
  createListItem,
  createTripHighlight,
  dayHasContent,
  draftFromSpell,
  duplicateItineraryDay,
  joinDayLabels,
  makeId,
  sectionStates,
} from "@/data/builder";
import type {
  AboutBlock,
  BuilderSectionId,
  DayHighlight,
  DraftImage,
  HeroSlotId,
  HostBlock,
  ItineraryDay,
  ListApi,
  PreviewDevice,
  QuickInfoCard,
  QuickInfoId,
  SpellDraft,
  StayBlock,
} from "@/data/builder";
import {
  draftSlugBase,
  incompleteSections,
  inlineDraftImages,
  spellFromDraft,
} from "@/data/publish";
import type { ManagedSpell, ManagedStatus } from "@/data/spells";
import { isPublic, useSpellStore } from "@/data/spellStore";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const SECTION_ORDER: BuilderSectionId[] = [
  "basic",
  "hero",
  "quick",
  "about",
  "itinerary",
  "host",
  "stay",
  "included",
  "notIncluded",
  "audience",
  "tripHighlights",
  "faqs",
];

interface ToastState {
  id: number;
  message: string;
}

/** Days queued for removal, awaiting the founder’s confirmation. */
interface RemovePlan {
  ids: string[];
  labels: string[];
  titles: string[];
  losesContent: boolean;
}

/** The publish ritual in flight — done flips once the CMS holds the record. */
interface PublishState {
  slug: string;
  done: boolean;
  recordId: string | null;
}

/**
 * The Spell Builder — every section of the public Spell page, editable from
 * one place: split editor (left) + sticky live preview (right). Local state
 * only; publishing and persistence arrive with the backend phase.
 */
export default function SpellBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { getById, saveSpell, uniqueSlug } = useSpellStore();

  /**
   * The spell being edited comes from the local CMS (route state as fallback)
   * — and an imported file arrives as a ready-made draft.
   */
  const routeState = location.state as {
    spell?: ManagedSpell;
    imported?: SpellDraft;
    importedFile?: string;
  } | null;
  const imported: SpellDraft | null = routeState?.imported ?? null;
  const storeSpell: ManagedSpell | undefined = id ? getById(id) : undefined;
  const source: ManagedSpell | null = storeSpell ?? routeState?.spell ?? null;
  const isEdit = source !== null;

  const [draft, setDraft] = useState<SpellDraft>(() =>
    imported ??
    (source
      ? source.draft
        ? structuredClone(source.draft)
        : draftFromSpell(source)
      : createEmptyDraft()),
  );
  const [open, setOpen] = useState<Record<BuilderSectionId, boolean>>({
    basic: true,
    hero: false,
    quick: false,
    about: false,
    itinerary: false,
    host: false,
    stay: false,
    included: false,
    notIncluded: false,
    audience: false,
    tripHighlights: false,
    faqs: false,
  });
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(imported !== null);
  /** Imported spells greet the founder with a next-steps toast. */
  const [toast, setToast] = useState<ToastState | null>(() =>
    imported
      ? {
          id: Date.now(),
          message: `Imported from ${routeState?.importedFile ?? "file"} — review each section and upload the images`,
        }
      : null,
  );
  /** Expanded day cards — lives here so it survives collapsing section 05. */
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(() =>
    draft.itinerary.length > 0 ? { [draft.itinerary[0].id]: true } : {},
  );
  const [removePlan, setRemovePlan] = useState<RemovePlan | null>(null);
  /** Publish was attempted — incomplete sections stay flagged until fixed. */
  const [publishAttempted, setPublishAttempted] = useState<boolean>(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  /** The CMS id this builder session writes to — set on first save/publish. */
  const savedIdRef = useRef<string | null>(source?.id ?? null);

  /* --------------------------- Local image URLs --------------------------- */

  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const makeImage = (file: File): DraftImage => {
    const url = URL.createObjectURL(file);
    objectUrls.current.add(url);
    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      name: file.name,
      isLocal: true,
    };
  };

  const releaseImage = (image: DraftImage | null): void => {
    if (image?.isLocal) {
      URL.revokeObjectURL(image.url);
      objectUrls.current.delete(image.url);
    }
  };

  /* ------------------------------- Mutations ------------------------------ */

  const patch = (partial: Partial<SpellDraft>): void => {
    setDraft((d) => ({ ...d, ...partial }));
    setDirty(true);
  };

  const patchAbout = (partial: Partial<AboutBlock>): void => {
    setDraft((d) => ({ ...d, about: { ...d.about, ...partial } }));
    setDirty(true);
  };

  const pickSlot = (slot: HeroSlotId, file: File): void => {
    releaseImage(draft[slot]);
    const image = makeImage(file);
    setDraft((d) => ({ ...d, [slot]: image }));
    setDirty(true);
  };

  const clearSlot = (slot: HeroSlotId): void => {
    releaseImage(draft[slot]);
    setDraft((d) => ({ ...d, [slot]: null }));
    setDirty(true);
  };

  const addGallery = (files: File[]): void => {
    const images = files.map(makeImage);
    setDraft((d) => ({ ...d, gallery: [...d.gallery, ...images] }));
    setDirty(true);
  };

  const removeGallery = (imageId: string): void => {
    releaseImage(draft.gallery.find((g) => g.id === imageId) ?? null);
    setDraft((d) => ({ ...d, gallery: d.gallery.filter((g) => g.id !== imageId) }));
    setDirty(true);
  };

  const moveGallery = (imageId: string, dir: -1 | 1): void => {
    setDraft((d) => {
      const index = d.gallery.findIndex((g) => g.id === imageId);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= d.gallery.length) return d;
      const next = [...d.gallery];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, gallery: next };
    });
    setDirty(true);
  };

  const updateQuickCard = (
    cardId: QuickInfoId,
    partial: Partial<Omit<QuickInfoCard, "id">>,
  ): void => {
    setDraft((d) => ({
      ...d,
      quickInfo: d.quickInfo.map((card) => (card.id === cardId ? { ...card, ...partial } : card)),
    }));
    setDirty(true);
  };

  const pickAboutImage = (file: File): void => {
    releaseImage(draft.about.image);
    const image = makeImage(file);
    setDraft((d) => ({ ...d, about: { ...d.about, image } }));
    setDirty(true);
  };

  const clearAboutImage = (): void => {
    releaseImage(draft.about.image);
    setDraft((d) => ({ ...d, about: { ...d.about, image: null } }));
    setDirty(true);
  };

  /* --------------------------- Itinerary mutations -------------------------- */

  const setItinerary = (updater: (days: ItineraryDay[]) => ItineraryDay[]): void => {
    setDraft((d) => ({ ...d, itinerary: updater(d.itinerary) }));
    setDirty(true);
  };

  const expandDays = (ids: string[]): void => {
    setOpenDays((current) => {
      const next = { ...current };
      ids.forEach((dayId) => {
        next[dayId] = true;
      });
      return next;
    });
  };

  const toggleDay = (dayId: string): void =>
    setOpenDays((current) => ({ ...current, [dayId]: !(current[dayId] === true) }));

  const updateDay = (dayId: string, partial: Partial<ItineraryDay>): void =>
    setItinerary((days) => days.map((day) => (day.id === dayId ? { ...day, ...partial } : day)));

  /** Grow instantly, auto-expanding the new days; shrinking always asks first. */
  const requestDayCount = (count: number): void => {
    const current = draft.itinerary.length;
    if (count === current) return;
    if (count > current) {
      const created = Array.from({ length: count - current }, () => createItineraryDay());
      setItinerary((days) => [...days, ...created]);
      expandDays(created.map((day) => day.id));
      const labels = created.map((_, i) => `Day ${current + i + 1}`);
      showToast(labels.length === 1 ? `${labels[0]} added` : `Added ${joinDayLabels(labels)}`);
      return;
    }
    openRemovePlan(draft.itinerary.slice(count));
  };

  const openRemovePlan = (days: ItineraryDay[]): void => {
    if (days.length === 0) return;
    setRemovePlan({
      ids: days.map((day) => day.id),
      labels: days.map(
        (day) => `Day ${draft.itinerary.findIndex((d) => d.id === day.id) + 1}`,
      ),
      titles: days.map((day) => day.title.trim()).filter((title) => title !== ""),
      losesContent: days.some(dayHasContent),
    });
  };

  const confirmRemovePlan = (): void => {
    if (!removePlan) return;
    setItinerary((days) => days.filter((day) => !removePlan.ids.includes(day.id)));
    showToast(
      removePlan.labels.length === 1
        ? `${removePlan.labels[0]} removed`
        : `Removed ${joinDayLabels(removePlan.labels)}`,
    );
    setRemovePlan(null);
  };

  /** Pristine days vanish instantly; anything with content asks first. */
  const requestRemoveDay = (dayId: string): void => {
    const index = draft.itinerary.findIndex((day) => day.id === dayId);
    const day = draft.itinerary[index];
    if (!day) return;
    if (!dayHasContent(day)) {
      setItinerary((days) => days.filter((d) => d.id !== dayId));
      showToast(`Day ${index + 1} removed`);
      return;
    }
    openRemovePlan([day]);
  };

  const duplicateDay = (dayId: string): void => {
    const index = draft.itinerary.findIndex((day) => day.id === dayId);
    const source = draft.itinerary[index];
    if (!source) return;
    const copy = duplicateItineraryDay(source, `Day ${index + 1}`);
    setItinerary((days) => {
      const next = [...days];
      next.splice(index + 1, 0, copy);
      return next;
    });
    expandDays([copy.id]);
    showToast(`Day ${index + 1} duplicated`);
  };

  const moveDay = (dayId: string, dir: -1 | 1): void =>
    setItinerary((days) => {
      const index = days.findIndex((day) => day.id === dayId);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= days.length) return days;
      const next = [...days];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const reorderDays = (next: ItineraryDay[]): void => setItinerary(() => next);

  const addCustomDay = (): void => {
    const day = createItineraryDay(true);
    setItinerary((days) => [...days, day]);
    expandDays([day.id]);
    showToast(`Custom day added — Day ${draft.itinerary.length + 1}`);
  };

  const addFirstDay = (): void => {
    const day = createItineraryDay();
    setItinerary((days) => [...days, day]);
    expandDays([day.id]);
    showToast("Day 1 created — the journey begins");
  };

  /**
   * Day images skip eager URL revocation — duplicated days may share the same
   * object URL, so everything is released together on unmount.
   */
  const pickDayImage = (dayId: string, file: File): void => {
    const image = makeImage(file);
    updateDay(dayId, { image });
  };

  const clearDayImage = (dayId: string): void => updateDay(dayId, { image: null });

  const addHighlight = (dayId: string): void =>
    setItinerary((days) =>
      days.map((day) =>
        day.id === dayId ? { ...day, highlights: [...day.highlights, createHighlight()] } : day,
      ),
    );

  const updateHighlight = (
    dayId: string,
    highlightId: string,
    partial: Partial<Omit<DayHighlight, "id">>,
  ): void =>
    setItinerary((days) =>
      days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              highlights: day.highlights.map((h) =>
                h.id === highlightId ? { ...h, ...partial } : h,
              ),
            }
          : day,
      ),
    );

  const removeHighlight = (dayId: string, highlightId: string): void =>
    setItinerary((days) =>
      days.map((day) =>
        day.id === dayId
          ? { ...day, highlights: day.highlights.filter((h) => h.id !== highlightId) }
          : day,
      ),
    );

  const duplicateHighlight = (dayId: string, highlightId: string): void =>
    setItinerary((days) =>
      days.map((day) => {
        if (day.id !== dayId) return day;
        const index = day.highlights.findIndex((h) => h.id === highlightId);
        const source = day.highlights[index];
        if (!source) return day;
        const next = [...day.highlights];
        next.splice(index + 1, 0, { ...source, id: makeId("hl") });
        return { ...day, highlights: next };
      }),
    );

  const reorderHighlights = (dayId: string, next: DayHighlight[]): void =>
    setItinerary((days) =>
      days.map((day) => (day.id === dayId ? { ...day, highlights: next } : day)),
    );

  const itineraryApi: ItineraryApi = {
    requestDayCount,
    addCustomDay,
    addFirstDay,
    reorderDays,
    updateDay,
    duplicateDay,
    requestRemoveDay,
    moveDay,
    pickDayImage,
    clearDayImage,
    addHighlight,
    updateHighlight,
    removeHighlight,
    duplicateHighlight,
    reorderHighlights,
  };

  /* ------------------ Host / CTA / Stay / Final CTA mutations ------------------ */

  const patchHost = (partial: Partial<HostBlock>): void => {
    setDraft((d) => ({ ...d, host: { ...d.host, ...partial } }));
    setDirty(true);
  };

  const pickHostImage = (file: File): void => {
    releaseImage(draft.host.image);
    const image = makeImage(file);
    setDraft((d) => ({ ...d, host: { ...d.host, image } }));
    setDirty(true);
  };

  const clearHostImage = (): void => {
    releaseImage(draft.host.image);
    setDraft((d) => ({ ...d, host: { ...d.host, image: null } }));
    setDirty(true);
  };

  const patchStay = (partial: Partial<StayBlock>): void => {
    setDraft((d) => ({ ...d, stay: { ...d.stay, ...partial } }));
    setDirty(true);
  };

  const addStayImages = (files: File[]): void => {
    const images = files.map(makeImage);
    setDraft((d) => ({ ...d, stay: { ...d.stay, images: [...d.stay.images, ...images] } }));
    setDirty(true);
  };

  const removeStayImage = (imageId: string): void => {
    releaseImage(draft.stay.images.find((img) => img.id === imageId) ?? null);
    setDraft((d) => ({
      ...d,
      stay: { ...d.stay, images: d.stay.images.filter((img) => img.id !== imageId) },
    }));
    setDirty(true);
  };

  const moveStayImage = (imageId: string, dir: -1 | 1): void => {
    setDraft((d) => {
      const index = d.stay.images.findIndex((img) => img.id === imageId);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= d.stay.images.length) return d;
      const next = [...d.stay.images];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, stay: { ...d.stay, images: next } };
    });
    setDirty(true);
  };

  /* -------------------------------- List APIs ------------------------------- */

  /** Builds the shared list surface — add, update, remove, duplicate, reorder. */
  const makeListApi = <T extends { id: string }>(
    read: (d: SpellDraft) => T[],
    apply: (d: SpellDraft, items: T[]) => SpellDraft,
    create: () => T,
    idPrefix: string,
  ): ListApi<T> => {
    const commit = (updater: (items: T[]) => T[]): void => {
      setDraft((d) => apply(d, updater(read(d))));
      setDirty(true);
    };
    return {
      add: () => commit((items) => [...items, create()]),
      update: (id, partial) =>
        commit((items) => items.map((item) => (item.id === id ? { ...item, ...partial } : item))),
      remove: (id) => commit((items) => items.filter((item) => item.id !== id)),
      duplicate: (id) =>
        commit((items) => {
          const index = items.findIndex((item) => item.id === id);
          if (index < 0) return items;
          const next = [...items];
          next.splice(index + 1, 0, cloneWithId(items[index], idPrefix));
          return next;
        }),
      reorder: (next) => commit(() => next),
    };
  };

  const includedApi = makeListApi(
    (d) => d.included,
    (d, items) => ({ ...d, included: items }),
    () => createListItem("sparkles"),
    "li",
  );
  const notIncludedApi = makeListApi(
    (d) => d.notIncluded,
    (d, items) => ({ ...d, notIncluded: items }),
    () => createListItem("compass"),
    "li",
  );
  const amenitiesApi = makeListApi(
    (d) => d.stay.amenities,
    (d, items) => ({ ...d, stay: { ...d.stay, amenities: items } }),
    () => createListItem("coffee"),
    "li",
  );
  const stayHighlightsApi = makeListApi(
    (d) => d.stay.highlights,
    (d, items) => ({ ...d, stay: { ...d.stay, highlights: items } }),
    () => createListItem("sparkles"),
    "li",
  );
  const audienceApi = makeListApi(
    (d) => d.audience,
    (d, items) => ({ ...d, audience: items }),
    createAudienceCard,
    "aud",
  );
  const tripHighlightsApi = makeListApi(
    (d) => d.tripHighlights,
    (d, items) => ({ ...d, tripHighlights: items }),
    createTripHighlight,
    "th",
  );
  const faqsApi = makeListApi(
    (d) => d.faqs,
    (d, items) => ({ ...d, faqs: items }),
    createFaq,
    "faq",
  );

  /* -------------------------------- Overlays ------------------------------ */

  useEffect(() => {
    if (!previewOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewOpen]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string): void => setToast({ id: Date.now(), message });

  /* -------------------------------- Actions ------------------------------- */

  const states = sectionStates(draft);
  const readyCount = SECTION_ORDER.filter((sectionId) => states[sectionId].complete).length;
  /** Sections still blocking publish — "Not Included" is optional by design. */
  const missingSections = incompleteSections(draft);
  const flaggedSections = new Set<BuilderSectionId>(publishAttempted ? missingSections : []);

  /* Once every flagged section is completed, celebrate and clear the flags. */
  useEffect(() => {
    if (publishAttempted && missingSections.length === 0) {
      setPublishAttempted(false);
      showToast("Every required section is ready — publish when you are ✦");
    }
  }, [publishAttempted, missingSections.length]);

  const jumpToSection = (sectionId: BuilderSectionId): void => {
    setOpen((current) => ({ ...current, [sectionId]: true }));
    window.setTimeout(() => {
      document
        .getElementById(`builder-section-${sectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  /**
   * Save — writes the spell into the local CMS with the chosen Visibility.
   * Setting a live spell back to Draft here is what unpublishes it.
   */
  const handleSaveDraft = (): void => {
    if (saving || publishState !== null) return;
    setSaving(true);
    const existing = savedIdRef.current ? (getById(savedIdRef.current) ?? null) : null;
    const slug = uniqueSlug(draftSlugBase(draft), existing?.id);
    const wasPublic = existing !== null && isPublic(existing);
    const keepLive = draft.status === "published";
    const status: ManagedStatus = keepLive
      ? existing?.status === "soldout"
        ? "soldout"
        : "published"
      : "draft";
    void (async () => {
      try {
        const prepared = await inlineDraftImages(draft);
        const record = spellFromDraft({ draft: prepared, slug, status, existing });
        saveSpell(record);
        savedIdRef.current = record.id;
        setDraft((d) => ({ ...d, slug }));
        setDirty(false);
        showToast(
          keepLive
            ? "Saved — your live page is updated"
            : wasPublic
              ? "Moved to drafts — removed from the live site"
              : "Draft saved to your Spells",
        );
      } catch (error) {
        console.error("[builder] Save failed:", error);
        showToast("Could not save — please try again");
      } finally {
        setSaving(false);
      }
    })();
  };

  /** Publish — validate everything, run the ritual, land in the local CMS. */
  const handlePublish = (): void => {
    if (publishState !== null) return;
    if (missingSections.length > 0) {
      setPublishAttempted(true);
      jumpToSection(missingSections[0]);
      return;
    }
    const existing = savedIdRef.current ? (getById(savedIdRef.current) ?? null) : null;
    const slug = uniqueSlug(draftSlugBase(draft), existing?.id);
    const status: ManagedStatus = existing?.status === "soldout" ? "soldout" : "published";
    setPublishState({ slug, done: false, recordId: null });
    void (async () => {
      try {
        const prepared = await inlineDraftImages(draft);
        const record = spellFromDraft({ draft: prepared, slug, status, existing });
        saveSpell(record);
        savedIdRef.current = record.id;
        setDraft((d) => ({ ...d, slug, status: "published" }));
        setDirty(false);
        setPublishState({ slug, done: true, recordId: record.id });
      } catch (error) {
        console.error("[builder] Publish failed:", error);
        setPublishState(null);
        showToast("Something interrupted the ritual — please try publishing again");
      }
    })();
  };

  const finishToSpells = (): void => {
    navigate("/dashboard/spells", {
      state: publishState?.recordId
        ? {
            freshId: publishState.recordId,
            notice: `“${draft.name.trim() !== "" ? draft.name : "Untitled Spell"}” is live on the site ✦`,
          }
        : undefined,
    });
  };

  const finishToLivePage = (): void => {
    if (publishState) navigate(`/live/${publishState.slug}`);
  };

  const toggleSection = (sectionId: BuilderSectionId): void =>
    setOpen((current) => ({ ...current, [sectionId]: !current[sectionId] }));

  /* --------------------------------- Render ------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {/* Builder navigation — sticky under the console topbar */}
      <div className="sticky top-16 z-40 -mx-4 border-b border-cream/[0.05] bg-charcoal/95 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/spells")}
            className="group flex h-10 shrink-0 items-center gap-2 rounded-lg border border-cream/[0.08] bg-cream/[0.03] px-3 font-sans text-[12px] text-cream/60 transition-all duration-200 hover:border-cream/25 hover:text-cream active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Spells</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-sans text-[8.5px] uppercase tracking-[0.3em] text-gold/70">
              Spell Builder · {imported ? "Imported ✨" : isEdit ? "Editing" : "New Spell"}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="truncate font-serif text-[17px] leading-tight text-cream">
                {draft.name.trim() !== "" ? draft.name : "Untitled Spell"}
              </h1>
              <SpellStatusBadge status={draft.status} className="hidden shrink-0 md:inline-flex" />
              <AnimatePresence>
                {dirty && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-amber-300/90 sm:flex"
                  >
                    <span aria-hidden className="h-1 w-1 animate-pulse-dot rounded-full bg-amber-300" />
                    Unsaved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Section progress ticks */}
          <div
            className="hidden items-center gap-2 lg:flex"
            aria-label={`${readyCount} of ${SECTION_ORDER.length} sections ready`}
          >
            <div className="flex items-center gap-1">
              {SECTION_ORDER.map((sectionId) => (
                <span
                  key={sectionId}
                  title={BUILDER_SECTION_META[sectionId].title}
                  className={cn(
                    "h-1.5 w-2 rounded-full transition-colors duration-300",
                    states[sectionId].complete ? "bg-emerald-400/80" : "bg-cream/10",
                  )}
                />
              ))}
            </div>
            <span className="font-sans text-[10.5px] tabular-nums text-cream/40">
              {readyCount}/{SECTION_ORDER.length} ready
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn-ghost-gold !px-3.5 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-60"
            >
              <Save className={cn("h-3.5 w-3.5", saving && "animate-pulse")} />
              <span className="hidden md:inline">
                {saving ? "Saving…" : draft.status === "published" ? "Save" : "Save Draft"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="btn-ghost-gold !px-3.5 !py-2.5 !text-[12px]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishState !== null}
              className="btn-gold !px-4 !py-2.5 !text-[12px] disabled:pointer-events-none disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Publish validation — which sections still need attention */}
      <AnimatePresence>
        {publishAttempted && missingSections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[0.04] p-4 md:p-5">
              <div className="flex items-start gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[18px] font-medium leading-tight text-cream">
                    Almost ready — {missingSections.length} section
                    {missingSections.length > 1 ? "s" : ""} need{missingSections.length === 1 ? "s" : ""} attention
                  </p>
                  <p className="mt-1 font-sans text-[12px] text-cream/45">
                    Your spell can go live the moment these are complete — tap one to jump straight to it.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingSections.map((sectionId) => (
                      <button
                        key={sectionId}
                        type="button"
                        onClick={() => jumpToSection(sectionId)}
                        className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/[0.06] py-1.5 pl-3 pr-3.5 font-sans text-[11.5px] text-rose-100/90 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-400/[0.12] active:scale-95"
                      >
                        <span aria-hidden className="font-serif text-[11px] italic text-rose-300/80">
                          {String(SECTION_ORDER.indexOf(sectionId) + 1).padStart(2, "0")}
                        </span>
                        {BUILDER_SECTION_META[sectionId].title}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPublishAttempted(false)}
                  aria-label="Dismiss publish checklist"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream/10 text-cream/50 transition-all duration-200 hover:border-cream/30 hover:text-cream active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split layout: editor left, sticky live preview right */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_432px]">
        <div className="min-w-0 space-y-4">
          <BuilderSection
            index={1}
            title={BUILDER_SECTION_META.basic.title}
            description={BUILDER_SECTION_META.basic.description}
            state={states.basic}
            open={open.basic}
            onToggle={() => toggleSection("basic")}
            flagged={flaggedSections.has("basic")}
            htmlId="builder-section-basic"
          >
            <BasicInfoSection draft={draft} patch={patch} />
          </BuilderSection>

          <BuilderSection
            index={2}
            title={BUILDER_SECTION_META.hero.title}
            description={BUILDER_SECTION_META.hero.description}
            state={states.hero}
            open={open.hero}
            onToggle={() => toggleSection("hero")}
            flagged={flaggedSections.has("hero")}
            htmlId="builder-section-hero"
          >
            <HeroImagesSection
              draft={draft}
              onPick={pickSlot}
              onClear={clearSlot}
              onAddGallery={addGallery}
              onRemoveGallery={removeGallery}
              onMoveGallery={moveGallery}
              onHeroAsCover={(on) => patch({ heroAsCover: on })}
            />
          </BuilderSection>

          <BuilderSection
            index={3}
            title={BUILDER_SECTION_META.quick.title}
            description={BUILDER_SECTION_META.quick.description}
            state={states.quick}
            open={open.quick}
            onToggle={() => toggleSection("quick")}
            flagged={flaggedSections.has("quick")}
            htmlId="builder-section-quick"
          >
            <QuickInfoSection draft={draft} onCard={updateQuickCard} />
          </BuilderSection>

          <BuilderSection
            index={4}
            title={BUILDER_SECTION_META.about.title}
            description={BUILDER_SECTION_META.about.description}
            state={states.about}
            open={open.about}
            onToggle={() => toggleSection("about")}
            flagged={flaggedSections.has("about")}
            htmlId="builder-section-about"
          >
            <AboutSection
              draft={draft}
              patchAbout={patchAbout}
              onPickImage={pickAboutImage}
              onClearImage={clearAboutImage}
            />
          </BuilderSection>

          <BuilderSection
            index={5}
            title={BUILDER_SECTION_META.itinerary.title}
            description={BUILDER_SECTION_META.itinerary.description}
            state={states.itinerary}
            open={open.itinerary}
            onToggle={() => toggleSection("itinerary")}
            flagged={flaggedSections.has("itinerary")}
            htmlId="builder-section-itinerary"
          >
            <ItinerarySection
              draft={draft}
              api={itineraryApi}
              openDays={openDays}
              onToggleDay={toggleDay}
            />
          </BuilderSection>

          <BuilderSection
            index={6}
            title={BUILDER_SECTION_META.host.title}
            description={BUILDER_SECTION_META.host.description}
            state={states.host}
            open={open.host}
            onToggle={() => toggleSection("host")}
            flagged={flaggedSections.has("host")}
            htmlId="builder-section-host"
          >
            <HostSection
              draft={draft}
              patchHost={patchHost}
              onPickImage={pickHostImage}
              onClearImage={clearHostImage}
            />
          </BuilderSection>

          <BuilderSection
            index={7}
            title={BUILDER_SECTION_META.stay.title}
            description={BUILDER_SECTION_META.stay.description}
            state={states.stay}
            open={open.stay}
            onToggle={() => toggleSection("stay")}
            flagged={flaggedSections.has("stay")}
            htmlId="builder-section-stay"
          >
            <StaySection
              draft={draft}
              patchStay={patchStay}
              amenitiesApi={amenitiesApi}
              highlightsApi={stayHighlightsApi}
              onAddImages={addStayImages}
              onRemoveImage={removeStayImage}
              onMoveImage={moveStayImage}
            />
          </BuilderSection>

          <BuilderSection
            index={8}
            title={BUILDER_SECTION_META.included.title}
            description={BUILDER_SECTION_META.included.description}
            state={states.included}
            open={open.included}
            onToggle={() => toggleSection("included")}
            flagged={flaggedSections.has("included")}
            htmlId="builder-section-included"
          >
            <InclusionsSection kind="included" items={draft.included} api={includedApi} />
          </BuilderSection>

          <BuilderSection
            index={9}
            title={BUILDER_SECTION_META.notIncluded.title}
            description={BUILDER_SECTION_META.notIncluded.description}
            state={states.notIncluded}
            open={open.notIncluded}
            onToggle={() => toggleSection("notIncluded")}
            flagged={flaggedSections.has("notIncluded")}
            htmlId="builder-section-notIncluded"
          >
            <InclusionsSection kind="notIncluded" items={draft.notIncluded} api={notIncludedApi} />
          </BuilderSection>

          <BuilderSection
            index={10}
            title={BUILDER_SECTION_META.audience.title}
            description={BUILDER_SECTION_META.audience.description}
            state={states.audience}
            open={open.audience}
            onToggle={() => toggleSection("audience")}
            flagged={flaggedSections.has("audience")}
            htmlId="builder-section-audience"
          >
            <AudienceSection cards={draft.audience} api={audienceApi} />
          </BuilderSection>

          <BuilderSection
            index={11}
            title={BUILDER_SECTION_META.tripHighlights.title}
            description={BUILDER_SECTION_META.tripHighlights.description}
            state={states.tripHighlights}
            open={open.tripHighlights}
            onToggle={() => toggleSection("tripHighlights")}
            flagged={flaggedSections.has("tripHighlights")}
            htmlId="builder-section-tripHighlights"
          >
            <TripHighlightsSection highlights={draft.tripHighlights} api={tripHighlightsApi} />
          </BuilderSection>

          <BuilderSection
            index={12}
            title={BUILDER_SECTION_META.faqs.title}
            description={BUILDER_SECTION_META.faqs.description}
            state={states.faqs}
            open={open.faqs}
            onToggle={() => toggleSection("faqs")}
            flagged={flaggedSections.has("faqs")}
            htmlId="builder-section-faqs"
          >
            <FaqSection faqs={draft.faqs} api={faqsApi} />
          </BuilderSection>
        </div>

        {/* Sticky live preview rail */}
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-[148px]">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
              className="overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75"
            >
              <div className="flex items-center justify-between gap-3 border-b border-cream/[0.06] px-4 py-3">
                <p className="flex items-center gap-2 font-sans text-[9.5px] uppercase tracking-[0.28em] text-cream/45">
                  <span aria-hidden className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  </span>
                  Live preview
                </p>
                <DeviceToggle device={device} onDevice={setDevice} />
              </div>
              <div className="no-scrollbar max-h-[calc(100vh-260px)] overflow-y-auto p-4">
                <SpellPreview draft={draft} device={device} />
              </div>
            </motion.div>
            <p className="mt-2.5 text-center font-sans text-[10.5px] text-cream/30">
              Updates as you type — exactly how guests will see it.
            </p>
          </div>
        </aside>
      </div>

      {/* Full preview overlay (Preview button / mobile) */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPreviewOpen(false)}
            role="presentation"
            className="fixed inset-0 z-[97] overflow-y-auto bg-charcoal-deep/85 p-4 backdrop-blur-md sm:p-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.45, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Spell preview"
              className="mx-auto w-full max-w-[560px]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.3em] text-cream/50">
                  <Eye className="h-3.5 w-3.5 text-gold/70" /> Live preview
                </p>
                <div className="flex items-center gap-2">
                  <DeviceToggle device={device} onDevice={setDevice} />
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="Close preview"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-cream/15 bg-charcoal-deep/70 text-cream/60 transition-all duration-200 hover:border-cream/40 hover:text-cream active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <SpellPreview draft={draft} device={device} />
              <p className="mt-3 pb-4 text-center font-sans text-[10.5px] text-cream/35">
                Press Esc or tap outside to return to the editor.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The publishing ritual */}
      <AnimatePresence>
        {publishState && (
          <PublishOverlay
            name={draft.name.trim() !== "" ? draft.name : "Untitled Spell"}
            slug={publishState.slug}
            done={publishState.done}
            onViewLive={finishToLivePage}
            onBackToSpells={finishToSpells}
          />
        )}
      </AnimatePresence>

      {/* Remove-days confirmation */}
      <AnimatePresence>
        {removePlan && (
          <RemoveDaysDialog
            labels={removePlan.labels}
            titles={removePlan.titles}
            losesContent={removePlan.losesContent}
            onCancel={() => setRemovePlan(null)}
            onConfirm={confirmRemovePlan}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
          >
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-gold/25 bg-[#14130F]/95 py-2.5 pl-3 pr-5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                <Check className="h-3.5 w-3.5" />
              </span>
              <p className="font-sans text-[12.5px] text-cream">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
