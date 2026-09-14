/**
 * 0092 - drag-and-drop ordering in Dashboard → Spells, driven exactly as a
 * keyboard user would: focus a grip, Space to lift, arrow to move, Space to
 * drop. The dropped order shows at once, the store receives the complete new
 * sequence, temporary sorts put the grips away, and a failed save rolls back.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import type { ManagedSpell } from "@/data/spells";
import Spells from "@/pages/dashboard/Spells";

const mocks = vi.hoisted(() => ({
  reorderSpells: vi.fn(async (_ids: readonly string[]): Promise<void> => {}),
  spells: [] as ManagedSpell[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  isUuid: (value: string) => /^[0-9a-f-]{36}$/i.test(value),
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })) },
}));
vi.mock("@/data/spellStore", () => ({
  useSpellStore: () => ({
    spells: mocks.spells,
    binnedSpells: [],
    ready: true,
    failed: false,
    retry: vi.fn(),
    duplicateSpell: vi.fn(),
    archiveSpell: vi.fn(),
    restoreSpell: vi.fn(),
    binSpell: vi.fn(),
    reorderSpells: mocks.reorderSpells,
    refresh: vi.fn(),
  }),
}));

const spell = (id: string, name: string, sortOrder: number, createdAt: string): ManagedSpell => ({
  id, name, slug: name.toLowerCase(), type: "Wandering", hook: `${name} hook`, category: "wandering",
  location: "Goa", region: "Goa", durationDays: 3, dates: "2–5 October 2026", price: 14000, status: "published",
  urgency: null, seatsBooked: 2, seatsTotal: 12, host: { name: "", initial: "", role: "" }, image: "", gradient: "", symbol: "✦",
  createdAt, updatedAt: createdAt, views: 0, revenue: 0, wishlists: 0, inclusions: [], changes: [], formId: null, deletedAt: null,
  sortOrder,
});

const A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-accc-cccccccccccc";

/* Site order A, B, C even though C is the newest - the manual order wins. */
const collection = (): ManagedSpell[] => [
  spell(A, "Alpha", 0, "2026-09-01"),
  spell(B, "Beta", 1, "2026-09-05"),
  spell(C, "Gamma", 2, "2026-09-11"),
];

const app = () => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/dashboard/spells"]}>
      <Routes>
        <Route path="/dashboard/spells" element={<Spells />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
);

const domOrder = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-spell-id]")).map((el) => el.dataset.spellId ?? "");

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.spells = collection();
  mocks.reorderSpells.mockImplementation(async () => {});
  /* One column, so ArrowDown always means "the next spell". */
  await page.viewport(414, 900);
});

test("lifting Alpha with the keyboard and dropping it one place down saves the complete new site order", async () => {
  window.localStorage.setItem("ls-spells-view", "grid");
  const screen = await render(app());

  await expect.element(screen.getByText("Drag a spell by its grip to set the order the website shows.")).toBeVisible();
  expect(domOrder(screen.container)).toEqual([A, B, C]);
  expect(screen.getByRole("button", { name: /^Drag to reorder / }).all()).toHaveLength(3);

  const grip = screen.getByRole("button", { name: "Drag to reorder Alpha" });
  await grip.click();
  await userEvent.keyboard("[Space]");
  /* The live region settles on the "over itself" line the moment the lift registers. */
  await expect.element(screen.getByText("Alpha is now at position 1 of 3.")).toBeInTheDocument();
  await userEvent.keyboard("[ArrowDown]");
  await expect.element(screen.getByText("Alpha is now at position 2 of 3.")).toBeInTheDocument();
  await userEvent.keyboard("[Space]");

  await vi.waitFor(() => expect(mocks.reorderSpells).toHaveBeenCalledTimes(1));
  expect(mocks.reorderSpells).toHaveBeenCalledWith([B, A, C]);
  await expect.element(screen.getByText("Spell order saved - the website now follows it")).toBeVisible();
  expect(domOrder(screen.container)).toEqual([B, A, C]);

  /* A temporary sort puts the grips away and says so; the saved order is untouched. */
  await screen.getByRole("button", { name: "Site order" }).click();
  await screen.getByRole("button", { name: "Newest first" }).click();
  await expect.element(screen.getByText("Sorted temporarily - switch back to Site order to rearrange spells.")).toBeVisible();
  expect(screen.getByRole("button", { name: /^Drag to reorder / }).all()).toHaveLength(0);
  expect(domOrder(screen.container)).toEqual([C, B, A]);
  expect(mocks.reorderSpells).toHaveBeenCalledTimes(1);
});

test("a failed save in list view rolls the rows back and explains", async () => {
  window.localStorage.setItem("ls-spells-view", "list");
  mocks.reorderSpells.mockRejectedValueOnce(new Error("offline"));
  const screen = await render(app());

  expect(domOrder(screen.container)).toEqual([A, B, C]);
  await screen.getByRole("button", { name: "Drag to reorder Gamma" }).click();
  await userEvent.keyboard("[Space]");
  await expect.element(screen.getByText("Gamma is now at position 3 of 3.")).toBeInTheDocument();
  await userEvent.keyboard("[ArrowUp]");
  await expect.element(screen.getByText("Gamma is now at position 2 of 3.")).toBeInTheDocument();
  await userEvent.keyboard("[Space]");

  await vi.waitFor(() => expect(mocks.reorderSpells).toHaveBeenCalledWith([A, C, B]));
  await expect.element(screen.getByText("Couldn't save the new order - it's back to how it was")).toBeVisible();
  await vi.waitFor(() => expect(domOrder(screen.container)).toEqual([A, B, C]));
});
