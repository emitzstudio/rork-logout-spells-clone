import { useState } from "react";
import { render } from "vitest-browser-react";
import BrochureField from "@/components/dashboard/builder/BrochureField";
import { PreviewPricing } from "@/components/dashboard/builder/PreviewSections";
import type { PricingBlock } from "@/data/builder";

function Harness() {
  const [pricing, setPricing] = useState<PricingBlock | undefined>(undefined);
  return <><BrochureField pricing={pricing} onChange={setPricing} />{pricing && <PreviewPricing pricing={pricing} tiers={[]} price={85000} isMobile />}</>;
}

test("brochure field adds, validates, previews, replaces and removes the PDF", async () => {
  const screen = await render(<Harness />);
  const field = screen.getByRole("textbox", { name: "Brochure PDF link" });
  await field.fill("/brochures/Starboy-v5.pdf");
  await expect.element(screen.getByRole("link", { name: "Open current PDF" })).toHaveAttribute("href", "/brochures/Starboy-v5.pdf");
  await expect.element(screen.getByRole("link", { name: "Download brochure (PDF)" })).toHaveAttribute("href", "/brochures/Starboy-v5.pdf");
  await field.fill("javascript:alert(1)");
  await expect.element(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByRole("link").all()).toHaveLength(0);
  await field.fill("https://example.com/updated.pdf");
  await expect.element(screen.getByRole("link", { name: "Open current PDF" })).toHaveAttribute("href", "https://example.com/updated.pdf");
  await field.fill("");
  expect(screen.getByRole("link").all()).toHaveLength(0);
  expect(screen.getByRole("alert").all()).toHaveLength(0);
});
