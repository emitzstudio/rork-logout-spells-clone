import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "vitest-browser-react";
import { vi } from "vitest";

import BasicInfoSection from "@/components/dashboard/builder/sections/BasicInfoSection";
import { PreviewPricing } from "@/components/dashboard/builder/PreviewSections";
import { createEmptyDraft, pricingTiers, type SpellDraft } from "@/data/builder";

vi.mock("@/data/formStore", () => ({
  useFormStore: () => ({ publishedForms: [], binnedForms: [], getFormById: () => undefined }),
}));

function Harness({ initial = { ...createEmptyDraft(), price: "42000" } }: { initial?: SpellDraft }) {
  const [draft, setDraft] = useState<SpellDraft>(initial);
  return <MemoryRouter>
    <BasicInfoSection draft={draft} patch={(partial) => setDraft((current) => ({ ...current, ...partial }))} />
    <PreviewPricing draft={draft} tiers={pricingTiers(draft)} isMobile />
  </MemoryRouter>;
}

test("Price offers TBA, disables the amount, updates preview and restores the amount when turned off", async () => {
  const screen = await render(<Harness />);
  const field = screen.getByRole("textbox", { name: "Price", exact: true });
  const toggle = screen.getByRole("button", { name: "TBA", exact: true });
  await expect.element(field).toHaveValue("42,000");
  await expect.element(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect.element(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.element(field).toBeDisabled();
  await expect.element(field).toHaveValue("TBA");
  await expect.element(screen.getByText("Prices TBA", { exact: true })).toBeVisible();
  await toggle.click();
  await expect.element(field).toBeEnabled();
  await expect.element(field).toHaveValue("42,000");
  await field.fill("24999");
  await expect.element(field).toHaveValue("24,999");
  await expect.element(screen.getByText("₹24,999 per person", { exact: true })).toBeVisible();
  await toggle.click();
  await toggle.click();
  await expect.element(field).toHaveValue("24,999");
});

test("a saved TBA opens selected and can be changed to a numeric price", async () => {
  const screen = await render(<Harness initial={{ ...createEmptyDraft(), priceTba: true }} />);
  const field = screen.getByRole("textbox", { name: "Price", exact: true });
  const toggle = screen.getByRole("button", { name: "TBA", exact: true });
  await expect.element(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.element(field).toBeDisabled();
  await toggle.click();
  await expect.element(field).toHaveValue("");
  await field.fill("85000");
  await expect.element(field).toHaveValue("85,000");
  await expect.element(screen.getByText("₹85,000 per person", { exact: true })).toBeVisible();
});
