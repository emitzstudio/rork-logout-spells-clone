import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { PDFDocument } from "pdf-lib";
import { createEmptyDraft } from "@/data/builder";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";

const originalFetch = globalThis.fetch.bind(globalThis);
afterEach(() => vi.restoreAllMocks());

function captureDownload() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    if (blob instanceof Blob) blobs.push(blob);
    return "blob:automatic-brochure-test";
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
  return { blobs, names };
}

test("a new spell downloads a real PDF, then uses the latest edited content on the next click", async () => {
  const captured = captureDownload();
  const draft = { ...createEmptyDraft(), name: "The Test Spell", slug: "the-test-spell", itinerary: [], price: "14000" };
  const screen = await render(<SpellBrochureAction draft={draft} />);
  await screen.getByRole("button", { name: "Download brochure (PDF)" }).click();
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeEnabled();
  expect(captured.blobs).toHaveLength(1);
  expect(captured.blobs[0].type).toBe("application/pdf");
  expect(captured.names).toEqual(["Logout-Spells-the-test-spell-Brochure.pdf"]);
  expect((await PDFDocument.load(await captured.blobs[0].arrayBuffer())).getTitle()).toBe("The Test Spell — Brochure");
  expect(document.querySelector('a[download]')).toBeNull();

  await screen.rerender(<SpellBrochureAction draft={{ ...draft, name: "Edited Spell" }} />);
  await screen.getByRole("button", { name: "Download brochure (PDF)" }).click();
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeEnabled();
  expect(captured.blobs).toHaveLength(2);
  expect((await PDFDocument.load(await captured.blobs[1].arrayBuffer())).getTitle()).toBe("Edited Spell — Brochure");
});

test("font failures show a recoverable error and retry produces a PDF", async () => {
  const captured = captureDownload();
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (String(input).includes("brochure-noto-")) return new Response("Unavailable", { status: 503 });
    return originalFetch(input, init);
  });
  const screen = await render(<SpellBrochureAction draft={createEmptyDraft()} />);
  await screen.getByRole("button", { name: "Download brochure (PDF)" }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  expect(captured.blobs).toHaveLength(0);
  fetchSpy.mockImplementation(originalFetch);
  await screen.getByRole("button", { name: "Retry brochure download" }).click();
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeEnabled();
  expect(captured.blobs).toHaveLength(1);
});

test("unavailable optional images do not block generation and all asset requests are read-only", async () => {
  const captured = captureDownload();
  const methods: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    methods.push(init?.method ?? "GET");
    if (String(input).includes("unavailable-photo")) return new Response("Missing", { status: 404 });
    return originalFetch(input, init);
  });
  const draft = { ...createEmptyDraft(), hero: { id: "photo", url: "/unavailable-photo.jpg", isLocal: false, name: "Photo" } };
  const screen = await render(<SpellBrochureAction draft={draft} />);
  await screen.getByRole("button", { name: "Download brochure (PDF)" }).click();
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeEnabled();
  expect(captured.blobs).toHaveLength(1);
  expect(methods.length).toBeGreaterThanOrEqual(3);
  expect(methods.every((method) => method === "GET")).toBe(true);
});

test("custom brochures stay normal PDF links with no automatic generation", async () => {
  const captured = captureDownload();
  const draft = { ...createEmptyDraft(), pricing: { tiers: [], brochureUrl: "/brochures/custom.pdf", taxNote: "", remainingNote: "", note: "" } };
  const screen = await render(<SpellBrochureAction draft={draft} />);
  await expect.element(screen.getByRole("link", { name: "Download brochure (PDF)" })).toHaveAttribute("href", "/brochures/custom.pdf");
  expect(screen.getByRole("button").all()).toHaveLength(0);
  expect(captured.blobs).toHaveLength(0);
});
