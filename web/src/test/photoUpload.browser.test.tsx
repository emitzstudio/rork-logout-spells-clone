/**
 * 0088 - the public form with a Link and a Photos question, exactly as a
 * respondent uses it: URL validation + normalisation, photo previews, the
 * configured maximum (never exceeded), removing before submit, and the
 * stored answer shape (complete URL · one uploaded photo URL per line).
 */
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import FormRenderer from "@/components/dashboard/forms/FormRenderer";
import { createEmptyForm, createQuestion } from "@/data/forms";
import type { LogoutForm, ResponseAnswer } from "@/data/forms";

const linkQ = { ...createQuestion("link"), id: "q-ig", title: "Share your Instagram profile", required: true };
const photosQ = { ...createQuestion("photos"), id: "q-pics", title: "Send us some inspiration", maxPhotos: 2 };

const form: LogoutForm = {
  ...createEmptyForm(),
  id: "form-1",
  title: "Inspiration Form",
  slug: "inspiration",
  style: "traditional",
  status: "published",
  questions: [linkQ, photosQ],
};

/* A 1×1 PNG - enough for the browser to treat it as an image. */
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);
const png = (name: string): File => new File([PNG], name, { type: "image/png" });

test("link answers are validated and stored as complete URLs; photos preview, cap at the maximum and can be removed", async () => {
  const submitted: ResponseAnswer[][] = [];
  const uploadPhoto = vi.fn(async (file: File) => `https://cdn.test/${file.name}`);

  const screen = await render(
    <FormRenderer form={form} onSubmit={(answers) => void submitted.push(answers)} uploadPhoto={uploadPhoto} />,
  );

  /* The limit is announced before anything is added. */
  await expect.element(screen.getByText("Up to 2 photos")).toBeVisible();
  await expect.element(screen.getByText("0 / 2")).toBeVisible();

  /* An invalid link is refused at submit… */
  const link = screen.getByLabelText("Share your Instagram profile");
  await link.fill("not a link");
  await screen.getByRole("button", { name: /Submit/ }).click();
  await expect.element(screen.getByText(/doesn't look like a web link/)).toBeVisible();
  expect(submitted).toHaveLength(0);

  /* …a bare handle is completed to a full https:// URL and previewed as such. */
  await link.fill("instagram.com/example");
  await expect.element(screen.getByText("https://instagram.com/example")).toBeVisible();

  /* Photos: the hidden input is what the tile opens - upload straight into it. */
  const input = screen.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("photo input missing");
  expect(input.multiple).toBe(true);

  await userEvent.upload(input, png("a.png"));
  await expect.element(screen.getByRole("img", { name: "a.png" })).toBeVisible();
  await expect.element(screen.getByText("1 / 2")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Add another photo" })).toBeVisible();

  /* Two more offered with one slot left - exactly one is accepted, the respondent is told. */
  await userEvent.upload(input, [png("b.png"), png("c.png")]);
  await expect.element(screen.getByText("2 / 2")).toBeVisible();
  await expect.element(screen.getByRole("img", { name: "b.png" })).toBeVisible();
  expect(screen.getByRole("img", { name: "c.png" }).all()).toHaveLength(0);
  await expect.element(screen.getByText(/Only 1 more photo fit/)).toBeVisible();
  expect(screen.getByRole("button", { name: /Add (photos|another photo)/ }).all()).toHaveLength(0);
  await expect.element(screen.getByText(/Maximum reached/)).toBeVisible();

  /* Removing one reopens a slot (the thumbnail animates out, so poll for it). */
  await screen.getByRole("button", { name: "Remove b.png" }).click();
  await expect.element(screen.getByText("1 / 2")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Add another photo" })).toBeVisible();
  await expect.poll(() => screen.getByRole("img", { name: "b.png" }).all().length).toBe(0);

  /* Submit: the link is the complete URL, the photos answer is the uploaded URL. */
  await screen.getByRole("button", { name: /Submit/ }).click();
  await expect.element(screen.getByText(/^Sent/)).toBeVisible();
  expect(uploadPhoto).toHaveBeenCalledTimes(2);
  expect(submitted).toHaveLength(1);
  const byId = new Map(submitted[0].map((answer) => [answer.questionId, answer]));
  expect(byId.get("q-ig")).toMatchObject({ type: "link", value: "https://instagram.com/example" });
  expect(byId.get("q-pics")).toMatchObject({ type: "photos", value: "https://cdn.test/a.png" });
});

test("preview mode keeps photos in the browser - nothing is uploaded and the answer stays empty", async () => {
  const screen = await render(<FormRenderer form={{ ...form, questions: [photosQ] }} />);
  const input = screen.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("photo input missing");
  await userEvent.upload(input, png("local.png"));
  await expect.element(screen.getByRole("img", { name: "local.png" })).toBeVisible();
  await expect.element(screen.getByText("1 / 2")).toBeVisible();
  await screen.getByRole("button", { name: /Submit/ }).click();
  await expect.element(screen.getByText(/Preview only/)).toBeVisible();
});
