import "@/index.css";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PDFDocument } from "pdf-lib";
import { createEmptyDraft } from "@/data/builder";
import { packageCardsSchema } from "@/data/packageCards";
import packagesJson from "@/data/starboyPackages.json";
import { STARBOY_PACKAGE_BROCHURES } from "@/data/starboyPackageBrochures";
import { STARBOY_BROCHURE_URL } from "@/data/starboyBrochure";
import SpellBrochureAction from "@/components/spell/SpellBrochureAction";
import StarboyPackages from "@/components/spell/StarboyPackages";

const packages = packageCardsSchema.parse(packagesJson);
const draft = { ...createEmptyDraft(), slug: "the-starboy-spell", pricing: { tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: STARBOY_BROCHURE_URL, packages } };

test("keyboard and pointer choose among three real PDFs rather than opening the old shared PDF", async () => {
  const screen = await render(<SpellBrochureAction draft={draft} />);
  const trigger = screen.getByRole("button", { name: "Download brochure (PDF)" });
  await trigger.click();
  await expect.element(page.getByRole("menu")).toBeVisible();
  for (const pack of packages) {
    const path = STARBOY_PACKAGE_BROCHURES[pack.id as keyof typeof STARBOY_PACKAGE_BROCHURES];
    const item = page.getByRole("menuitem", { name: `Download ${pack.name} Grimoire (PDF)` });
    await expect.element(item).toHaveAttribute("href", path);
    await expect.element(item).toHaveAttribute("target", "_blank");
    const response = await fetch(path);
    expect(response.ok).toBe(true);
    const pdf = await PDFDocument.load(await response.arrayBuffer());
    expect(pdf.getPageCount()).toBe(pack.id === "xo" ? 7 : 10);
    expect(pdf.getTitle()).toContain(`${pack.name} Grimoire`);
  }
  await userEvent.keyboard("{Escape}");
  await expect.element(trigger).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(page.getByRole("menuitem", { name: "Download XO Grimoire (PDF)" })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(page.getByRole("menuitem", { name: "Download STARBOY Grimoire (PDF)" })).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(trigger).toHaveFocus();
});

for (const width of [390, 1440]) test(`package downloads are visible, independent and fit at ${width}px`, async () => {
  await page.viewport(width, 900);
  const screen = await render(<div className="starboy-experience bg-[#090909] text-cream"><StarboyPackages packages={packages} draft={draft} onBook={() => {}} /></div>);
  for (const pack of packages) {
    const link = screen.getByRole("link", { name: `Download ${pack.name} Grimoire (PDF)` });
    await expect.element(link).toBeInTheDocument();
    expect(link.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const article = link.element().closest("article")!;
    expect(article.dataset.package).toBe(pack.id);
    expect(link.element().getBoundingClientRect().right).toBeLessThanOrEqual(width);
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
});
