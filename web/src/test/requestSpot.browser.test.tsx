import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import SpellPage from "@/pages/SpellPage";
import { draftFromSpell } from "@/data/builder";
import type { LogoutForm } from "@/data/forms";
import type { ManagedSpell } from "@/data/spells";

const mocks = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getFormById: vi.fn(),
  retry: vi.fn(),
  addResponse: vi.fn().mockResolvedValue(undefined),
  recordSpellView: vi.fn(),
  ready: true,
  failed: false,
}));
vi.mock("@/components/site/Layout", () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/data/account/AccountProvider", () => ({ useAccount: () => ({ recordSpellView: mocks.recordSpellView }) }));
vi.mock("@/integrations/supabase/client", () => ({ isUuid: () => false, supabase: { rpc: vi.fn() } }));
vi.mock("@/data/spellStore", () => ({
  useSpellStore: () => ({ getBySlug: mocks.getBySlug, ready: true, failed: false, retry: vi.fn() }),
  isPublic: (spell: ManagedSpell) => spell.status === "published" || spell.status === "soldout",
}));
vi.mock("@/data/formStore", () => ({ useFormStore: () => ({
  getFormById: mocks.getFormById, ready: mocks.ready, failed: mocks.failed,
  retry: mocks.retry, addResponse: mocks.addResponse,
}) }));

const savedForm: LogoutForm = {
  id: "saved-form", title: "The saved trip form", slug: "saved-trip-form", description: "The founder’s original questions.",
  style: "traditional", status: "published", isEnquiry: true,
  questions: [{ id: "name", title: "Your name", type: "short_text", helper: "", placeholder: "", required: true, core: true, enabled: true, options: [], ratingStyle: "star5" }],
  successMessage: "Received", redirectUrl: "", submitLabel: "Send request", createdAt: "2026-09-12", updatedAt: "2026-09-12",
};
const baseSpell: ManagedSpell = {
  id: "test-spell", slug: "the-bir-spell", name: "The Bir Spell", type: "Celebration", hook: "A trip together.",
  category: "celebration", location: "Bir", region: "India", durationDays: 3, dates: "18–21 September 2026",
  price: 13000, seatsTotal: 15, seatsBooked: 0, status: "published", urgency: "new", host: { name: "", initial: "", role: "" },
  image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E", gradient: "", symbol: "", createdAt: "2026-09-12", updatedAt: "2026-09-12", views: 0, revenue: 0, wishlists: 0,
  inclusions: [], changes: [], formId: savedForm.id,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ready = true;
  mocks.failed = false;
  mocks.getFormById.mockImplementation((id: string) => id === savedForm.id ? savedForm : undefined);
});

function page(spell: ManagedSpell) {
  const draft = draftFromSpell(spell);
  draft.pricing = { tiers: [], note: "", taxNote: "", remainingNote: "", brochureUrl: "/brochures/test.pdf" };
  mocks.getBySlug.mockReturnValue({ ...spell, draft });
  return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[`/live/${spell.slug}`]}><Routes><Route path="/live/:slug" element={<SpellPage />} /></Routes></MemoryRouter>;
}

for (const variant of [
  { name: "priced", spell: baseSpell, count: 4 },
  { name: "TBA", spell: { ...baseSpell, price: 0, seatsTotal: 0 }, count: 4 },
  { name: "sold-out", spell: { ...baseSpell, status: "soldout" as const, seatsBooked: 15 }, count: 4 },
  { name: "Starboy", spell: { ...baseSpell, slug: "the-starboy-spell", name: "The Starboy Spell" }, count: 3 },
]) {
  test(`${variant.name}: every Request your spot CTA opens the saved form with no choice screen`, async () => {
    const screen = await render(page(variant.spell));
    const buttons = screen.getByRole("button", { name: "Request your spot", exact: true });
    expect(buttons.all()).toHaveLength(variant.count);
    expect(screen.getByRole("button", { name: /Join this spell|Inquire|Book Now/i }).all()).toHaveLength(0);
    for (const button of buttons.all()) {
      await button.click();
      await expect.element(screen.getByRole("dialog", { name: `Request your spot · ${variant.spell.name}` })).toBeVisible();
      await expect.element(screen.getByRole("textbox", { name: "Your name" })).toBeVisible();
      expect(screen.getByText("Two ways in").all()).toHaveLength(0);
      expect(screen.getByRole("button", { name: /Book Now|Inquire|Join the Waitlist/ }).all()).toHaveLength(0);
      await screen.getByRole("button", { name: "Close form" }).click();
      await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    }
    expect(mocks.addResponse).not.toHaveBeenCalled();
  });
}

test("an early tap waits for forms and opens the attached form automatically", async () => {
  mocks.ready = false;
  mocks.getFormById.mockReturnValue(undefined);
  const screen = await render(page(baseSpell));
  await screen.getByRole("button", { name: "Request your spot", exact: true }).first().click();
  await expect.element(screen.getByRole("status", { name: "Loading form" })).toBeInTheDocument();
  await expect.element(screen.getByText("Opening this spell’s form…")).toBeVisible();
  mocks.ready = true;
  mocks.getFormById.mockReturnValue(savedForm);
  await screen.rerender(page(baseSpell));
  await expect.element(screen.getByRole("textbox", { name: "Your name" })).toBeVisible();
  expect(mocks.addResponse).not.toHaveBeenCalled();
});

test("a failed form lookup offers retry, not the booking chooser", async () => {
  mocks.failed = true;
  mocks.getFormById.mockReturnValue(undefined);
  const screen = await render(page(baseSpell));
  await screen.getByRole("button", { name: "Request your spot", exact: true }).first().click();
  await screen.getByRole("button", { name: "Try again" }).click();
  expect(mocks.retry).toHaveBeenCalledOnce();
  mocks.failed = false;
  mocks.getFormById.mockReturnValue(savedForm);
  await screen.rerender(page(baseSpell));
  await expect.element(screen.getByRole("textbox", { name: "Your name" })).toBeVisible();
});

for (const missing of ["unattached", "unpublished", "deleted"]) {
  test(`${missing} forms never open a different form or the old booking screen`, async () => {
    mocks.getFormById.mockReturnValue(missing === "unpublished" ? { ...savedForm, status: "draft" } : undefined);
    const screen = await render(page({ ...baseSpell, formId: missing === "unattached" ? null : savedForm.id }));
    await screen.getByRole("button", { name: "Request your spot", exact: true }).first().click();
    await expect.element(screen.getByText("Requests for this spell aren’t available yet. Please check back soon.")).toBeVisible();
    expect(screen.getByRole("textbox").all()).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Book Now|Inquire/ }).all()).toHaveLength(0);
    await screen.getByRole("button", { name: "Back to the spell" }).click();
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.addResponse).not.toHaveBeenCalled();
  });
}

test("saved form submissions retain spell attribution through the existing response handler", async () => {
  const screen = await render(page(baseSpell));
  await screen.getByRole("button", { name: "Request your spot", exact: true }).first().click();
  await screen.getByRole("textbox", { name: "Your name" }).fill("Test traveller");
  await screen.getByRole("button", { name: "Send request" }).click();
  await vi.waitFor(() => expect(mocks.addResponse).toHaveBeenCalledWith(expect.objectContaining({
    form: savedForm, spellId: baseSpell.id, spellName: baseSpell.name,
  })));
});
