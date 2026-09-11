import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { vi } from "vitest";
import BookingFlow from "@/components/spell/BookingFlow";
import type { ManagedSpell } from "@/data/spells";

vi.mock("@/data/account/AccountProvider", () => ({ useAccount: () => ({ session: null, data: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ isUuid: () => false, supabase: { rpc: vi.fn() } }));
const spell: ManagedSpell = {
  id: "test-starboy", slug: "the-starboy-spell", name: "The Starboy Spell", type: "Celebration", hook: "Bangkok nights.",
  category: "celebration", location: "Bangkok & Phuket", region: "Thailand", durationDays: 7, dates: "9-15 October 2026",
  price: 0, seatsTotal: 0, seatsBooked: 0, status: "published", urgency: "new", host: { name: "", initial: "", role: "" },
  image: "", gradient: "", symbol: "", createdAt: "2026-09-11", updatedAt: "2026-09-11", views: 0, revenue: 0, wishlists: 0,
  inclusions: [], changes: [],
};

test("TBA trips only expose a real inquiry and no invented payment or capacity", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = await render(<QueryClientProvider client={client}><BookingFlow open spell={spell} onClose={() => {}} onInquireViaForm={null} /></QueryClientProvider>);
  await expect.element(screen.getByText("Prices TBA · Inquiries open", { exact: true })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Book Now|Join the Waitlist/ }).all()).toHaveLength(0);
  await screen.getByRole("button", { name: /^Inquire/ }).click();
  await expect.element(screen.getByRole("button", { name: "Send Inquiry" })).toBeInTheDocument();
  await expect.element(screen.getByText(/no seat is reserved/)).toBeInTheDocument();
  await screen.getByRole("button", { name: "Send Inquiry" }).click();
  await expect.element(screen.getByText("A reachable phone number, please.")).toBeInTheDocument();
  await screen.getByRole("button", { name: "Go back" }).click();
  expect(screen.getByRole("button", { name: /Book Now|Join the Waitlist/ }).all()).toHaveLength(0);
});

test("priced trips retain their existing reserve-request door", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const priced = { ...spell, price: 13000, seatsTotal: 15 };
  const screen = await render(<QueryClientProvider client={client}><BookingFlow open spell={priced} onClose={() => {}} onInquireViaForm={null} /></QueryClientProvider>);
  await expect.element(screen.getByRole("button", { name: /Book Now/ })).toBeInTheDocument();
  await screen.getByRole("button", { name: /Book Now/ }).click();
  await expect.element(screen.getByRole("button", { name: "One seat more" })).toBeInTheDocument();
});
