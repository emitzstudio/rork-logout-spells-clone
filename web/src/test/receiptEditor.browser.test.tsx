/**
 * 0089 - the receipt console as the founder uses it: the balance and status
 * follow the amounts live (₹12,000 − ₹3,600 = ₹8,400), overrides have a way
 * back, a Spell pre-fills the trip, validation guards Generate, the
 * "Receipt created" moment offers the PDF, editing keeps the number, and the
 * list downloads a stored receipt.
 */
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { receiptWritePayload } from "@/data/receipts";
import type { Receipt, ReceiptDraft } from "@/data/receipts";
import type { ManagedSpell } from "@/data/spells";
import ReceiptEditor from "@/pages/dashboard/ReceiptEditor";
import Receipts from "@/pages/dashboard/Receipts";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  saveBytesAsFile: vi.fn(),
  receiptPdfBytes: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
  spells: [] as ManagedSpell[],
  receipts: [] as Receipt[],
}));

vi.mock("@/data/receiptStore", () => ({
  useSaveReceipt: () => ({ mutate: mocks.mutate, isPending: false }),
  useRegenerateReceiptPdf: () => ({ mutate: vi.fn(), isPending: false }),
  useReceipts: () => ({ data: mocks.receipts, isPending: false, isError: false, refetch: vi.fn() }),
  useReceipt: (id?: string) => ({
    receipt: id ? (mocks.receipts.find((entry) => entry.id === id) ?? null) : null,
    query: { isPending: false, isError: false, refetch: vi.fn() },
  }),
  useReceiptBrand: () => ({
    name: "Logout Spells",
    tagline: "Belonging > Bookings",
    email: "vidushi@logoutspells.com",
    phone: "",
    website: "logoutspells.com",
    siteUrl: "https://logoutspells.com",
  }),
  receiptPdfBytes: mocks.receiptPdfBytes,
  saveBytesAsFile: mocks.saveBytesAsFile,
  openBytesInTab: vi.fn(),
  ReceiptPdfError: class ReceiptPdfError extends Error {
    receipt: Receipt;
    constructor(message: string, receipt: Receipt) {
      super(message);
      this.receipt = receipt;
    }
  },
}));
vi.mock("@/data/spellStore", () => ({ useSpellStore: () => ({ spells: mocks.spells }) }));

const SPELL_ID = "44444444-4444-4444-a444-444444444444";

const spell: ManagedSpell = {
  id: SPELL_ID, slug: "jibhi-with-kavya", name: "Jibhi with Kavya", type: "Wandering", hook: "", category: "wandering",
  location: "Jibhi, Himachal Pradesh", region: "Himachal", durationDays: 4, dates: "2–5 October 2026", price: 14000, status: "published",
  urgency: null, seatsBooked: 0, seatsTotal: 12, host: { name: "", initial: "", role: "" }, image: "", gradient: "", symbol: "✦",
  createdAt: "2026-09-01", updatedAt: "2026-09-01", views: 0, revenue: 0, wishlists: 0, inclusions: [], changes: [], formId: null, deletedAt: null,
};

const existing: Receipt = {
  id: "receipt-7", number: "LS-2026-0007", receiptDate: "2026-09-13", spellId: null,
  travellerName: "Vidushi Verma", travellerEmail: "vidushi@logoutspells.com", travellerPhone: "", travellersCount: 2,
  tripName: "Thailand Full Moon", travelDates: "23–28 September 2026", destination: "Koh Samui",
  totalMinor: 12_000_000, receivedMinor: 3_600_000, balanceMinor: 8_400_000, paymentStatus: "partially_paid",
  paymentDate: "2026-09-12", balanceDueDate: null, notes: "", spellImageUrl: "",
  pdfPath: "receipt-7/LS-2026-0007-abc.pdf", pdfGeneratedAt: "2026-09-13T04:30:00.000Z",
  createdAt: "2026-09-13T04:00:00.000Z", updatedAt: "2026-09-13T04:30:00.000Z",
};

type MutateCall = [{ draft: ReceiptDraft; existing: Receipt | null }, { onSuccess: (result: { receipt: Receipt; pdf: Uint8Array; filename: string }) => void }];

const app = (path: string) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
    <Routes>
      <Route path="/dashboard/receipts" element={<Receipts />} />
      <Route path="/dashboard/receipts/new" element={<ReceiptEditor />} />
      <Route path="/dashboard/receipts/:id" element={<p>Receipt detail</p>} />
      <Route path="/dashboard/receipts/:id/edit" element={<ReceiptEditor />} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.spells = [spell];
  mocks.receipts = [];
});

test("balance and status follow the amounts, overrides have a way back, a Spell pre-fills, and Generate hands over the PDF", async () => {
  const screen = await render(app("/dashboard/receipts/new"));
  await expect.element(screen.getByText("LS-2026-····")).toBeVisible();

  /* ₹12,000 − ₹3,600 = ₹8,400, formatted the Indian way, status suggested. */
  const total = screen.getByLabelText("Total trip price");
  const received = screen.getByLabelText("Amount received");
  const balance = screen.getByLabelText("Balance amount");
  await total.fill("12000");
  await received.fill("3600");
  await expect.element(total).toHaveValue("12,000");
  await expect.element(balance).toHaveValue("8,400");
  await expect.element(screen.getByRole("button", { name: "Partially Paid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText("₹8,400/-", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Advance received · Balance of ₹8,400/- due before departure")).toBeVisible();

  /* Paying in full settles the balance and flips the status automatically… */
  await received.fill("12000");
  await expect.element(balance).toHaveValue("0");
  await expect.element(screen.getByRole("button", { name: "Paid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await received.fill("3600");

  /* …and the founder can still take either over by hand, then come back. */
  await balance.fill("5000");
  await expect.element(screen.getByText("Manual", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Reset to automatic" }).click();
  await expect.element(balance).toHaveValue("8,400");
  await screen.getByRole("button", { name: "Pending", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Pending", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText("Chosen by hand.")).toBeVisible();
  await screen.getByRole("button", { name: "Reset to automatic" }).click();
  await expect.element(screen.getByRole("button", { name: "Partially Paid", exact: true })).toHaveAttribute("aria-pressed", "true");

  /* Nothing is generated until the traveller and trip are named. */
  await screen.getByRole("button", { name: "Generate Receipt" }).first().click();
  expect(mocks.mutate).not.toHaveBeenCalled();
  await expect.element(screen.getByText("Add the traveller's name")).toBeVisible();

  await screen.getByLabelText("Traveller name").fill("Ananya Sharma");
  await screen.getByLabelText("Email").fill("ananya@example.com");

  /* A Spell pre-fills the trip and offers its price × travellers; the typed total is never overwritten silently. */
  await screen.getByLabelText("Pre-fill from a Spell").selectOptions(SPELL_ID);
  await expect.element(screen.getByLabelText("Spell / Trip name")).toHaveValue("Jibhi with Kavya");
  await expect.element(screen.getByLabelText("Destination")).toHaveValue("Jibhi, Himachal Pradesh");
  await expect.element(screen.getByLabelText("Travel dates")).toHaveValue("2–5 October 2026");
  await expect.element(total).toHaveValue("12,000");
  await screen.getByRole("button", { name: "Use ₹14,000 × 1" }).click();
  await expect.element(total).toHaveValue("14,000");
  await expect.element(balance).toHaveValue("10,400");

  await screen.getByRole("button", { name: "Generate Receipt" }).first().click();
  expect(mocks.mutate).toHaveBeenCalledTimes(1);
  const [input, options] = mocks.mutate.mock.calls[0] as MutateCall;
  expect(input.existing).toBeNull();
  expect(receiptWritePayload(input.draft)).toMatchObject({
    traveller_name: "Ananya Sharma",
    traveller_email: "ananya@example.com",
    trip_name: "Jibhi with Kavya",
    destination: "Jibhi, Himachal Pradesh",
    spell_id: SPELL_ID,
    total_minor: 1_400_000,
    received_minor: 360_000,
    balance_minor: 1_040_000,
    payment_status: "partially_paid",
  });

  /* The server numbers it; the console celebrates and offers the PDF at once. */
  const created: Receipt = {
    ...existing,
    id: "receipt-1",
    number: "LS-2026-0001",
    travellerName: "Ananya Sharma",
    tripName: "Jibhi with Kavya",
    totalMinor: 1_400_000,
    receivedMinor: 360_000,
    balanceMinor: 1_040_000,
    pdfPath: "receipt-1/LS-2026-0001-abc.pdf",
  };
  await act(async () => {
    options.onSuccess({ receipt: created, pdf: new Uint8Array([1, 2, 3]), filename: "Logout-Spells-Receipt-LS-2026-0001-Ananya-Sharma.pdf" });
  });
  const dialog = screen.getByRole("dialog", { name: "Receipt created" });
  await expect.element(dialog).toBeVisible();
  await expect.element(dialog.getByRole("heading", { name: "LS-2026-0001" })).toBeVisible();
  await dialog.getByRole("button", { name: "Download PDF" }).click();
  expect(mocks.saveBytesAsFile).toHaveBeenCalledWith(expect.any(Uint8Array), "Logout-Spells-Receipt-LS-2026-0001-Ananya-Sharma.pdf");

  /* "Create another" starts clean - the saved receipt is not touched again. */
  await dialog.getByRole("button", { name: "Create another" }).click();
  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
  await expect.element(screen.getByLabelText("Traveller name")).toHaveValue("");
  await expect.element(screen.getByText("LS-2026-····")).toBeVisible();
});

test("editing an existing receipt opens its saved figures and regenerates the same number", async () => {
  mocks.receipts = [existing];
  const screen = await render(app(`/dashboard/receipts/${existing.id}/edit`));
  await expect.element(screen.getByText("Receipts · Editing LS-2026-0007")).toBeVisible();
  await expect.element(screen.getByLabelText("Total trip price")).toHaveValue("1,20,000");
  await expect.element(screen.getByLabelText("Amount received")).toHaveValue("36,000");
  await expect.element(screen.getByLabelText("Balance amount")).toHaveValue("84,000");

  await screen.getByLabelText("Amount received").fill("120000");
  await expect.element(screen.getByLabelText("Balance amount")).toHaveValue("0");
  await expect.element(screen.getByRole("button", { name: "Paid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText("Payment received in full · Your seat is confirmed")).toBeVisible();

  await screen.getByRole("button", { name: "Save & regenerate PDF" }).first().click();
  expect(mocks.mutate).toHaveBeenCalledTimes(1);
  const [input] = mocks.mutate.mock.calls[0] as MutateCall;
  expect(input.existing?.id).toBe("receipt-7");
  expect(input.existing?.number).toBe("LS-2026-0007");
  expect(receiptWritePayload(input.draft)).toMatchObject({ received_minor: 12_000_000, balance_minor: 0, payment_status: "paid" });
});

test("the Receipts list shows each receipt's number, money and status, and downloads the stored PDF", async () => {
  mocks.receipts = [existing];
  const screen = await render(app("/dashboard/receipts"));
  await expect.element(screen.getByRole("heading", { name: "Receipts", exact: true })).toBeVisible();
  await expect.element(screen.getByText("LS-2026-0007")).toBeVisible();
  await expect.element(screen.getByText("Vidushi Verma")).toBeVisible();
  await expect.element(screen.getByText("₹84,000/- due", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("table").getByText("Partially Paid", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Download PDF" }).click();
  await vi.waitFor(() => {
    expect(mocks.receiptPdfBytes).toHaveBeenCalledTimes(1);
    expect(mocks.saveBytesAsFile).toHaveBeenCalledWith(expect.any(Uint8Array), "Logout-Spells-Receipt-LS-2026-0007-Vidushi-Verma.pdf");
  });
});
