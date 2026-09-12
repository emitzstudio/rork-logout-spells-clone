import { useState } from "react";
import { render } from "vitest-browser-react";
import BrochureField from "@/components/dashboard/builder/BrochureField";
import { PreviewPricing } from "@/components/dashboard/builder/PreviewSections";
import { createEmptyDraft, type PricingBlock } from "@/data/builder";
import { SUPERSEDED_STARBOY_BROCHURE_PATHS, STARBOY_BROCHURE_PATH } from "@/data/starboyBrochure";

function Harness() {
  const [pricing, setPricing] = useState<PricingBlock | undefined>(undefined);
  return <><BrochureField pricing={pricing} onChange={setPricing} /><PreviewPricing draft={{ ...createEmptyDraft(), price: "85000", pricing }} tiers={[]} isMobile /></>;
}

test("brochure field adds, validates, replaces custom PDFs and returns to automatic mode when cleared", async () => {
  const screen = await render(<Harness />);
  const field = screen.getByRole("textbox", { name: "Brochure PDF link" });
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeVisible();
  await field.fill(STARBOY_BROCHURE_PATH);
  await expect.element(screen.getByRole("link", { name: "Open current PDF" })).toHaveAttribute("href", STARBOY_BROCHURE_PATH);
  await expect.element(screen.getByRole("link", { name: "Download brochure (PDF)" })).toHaveAttribute("href", STARBOY_BROCHURE_PATH);
  await field.fill("javascript:alert(1)");
  await expect.element(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByRole("link").all()).toHaveLength(0);
  await field.fill("https://example.com/updated.pdf");
  await expect.element(screen.getByRole("link", { name: "Open current PDF" })).toHaveAttribute("href", "https://example.com/updated.pdf");
  await field.fill("");
  expect(screen.getByRole("link").all()).toHaveLength(0);
  expect(screen.getByRole("alert").all()).toHaveLength(0);
  await expect.element(screen.getByRole("button", { name: "Download brochure (PDF)" })).toBeVisible();
});

test("superseded Starboy links use the approved Grimoire in the editor and preview", async () => {
  const screen = await render(<Harness />);
  const field = screen.getByRole("textbox", { name: "Brochure PDF link" });
  for (const retired of SUPERSEDED_STARBOY_BROCHURE_PATHS) {
    await field.fill(retired);
    await expect.element(field).toHaveValue(STARBOY_BROCHURE_PATH);
    await expect.element(screen.getByRole("link", { name: "Open current PDF" })).toHaveAttribute("href", STARBOY_BROCHURE_PATH);
    await expect.element(screen.getByRole("link", { name: "Download brochure (PDF)" })).toHaveAttribute("href", STARBOY_BROCHURE_PATH);
  }
});
