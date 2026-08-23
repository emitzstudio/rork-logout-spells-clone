/**
 * Core-question visibility - per-form inclusion of the six core questions.
 *
 * The rules under test:
 *  · every factory-made question starts switched ON;
 *  · `visibleQuestions` is the single filter the renderer/export/counters use;
 *  · records saved before the toggle existed (no `enabled` in the stored
 *    jsonb) map to ON - existing forms keep asking what they always asked;
 *  · switched-off questions can never block publish, but a form must ask at
 *    least one question to publish.
 */
import { describe, expect, it } from "vitest";

import {
  createDefaultQuestions,
  createEmptyForm,
  createQuestion,
  duplicateQuestion,
  formIssues,
  visibleQuestions,
} from "@/data/forms";
import type { LogoutForm } from "@/data/forms";
import { mapForm } from "@/integrations/supabase/mappers";
import type { FormRow } from "@/integrations/supabase/mappers";
import type { Json } from "@/integrations/supabase/types";

describe("visibleQuestions", () => {
  it("every factory question starts switched on", () => {
    const cores = createDefaultQuestions();
    expect(cores).toHaveLength(6);
    expect(cores.every((q) => q.core && q.enabled)).toBe(true);
    expect(createQuestion("short_text").enabled).toBe(true);
  });

  it("filters out switched-off questions only", () => {
    const questions = createDefaultQuestions();
    questions[2] = { ...questions[2], enabled: false };
    questions[4] = { ...questions[4], enabled: false };
    const visible = visibleQuestions(questions);
    expect(visible).toHaveLength(4);
    expect(visible.some((q) => q.id === questions[2].id)).toBe(false);
    expect(visible.some((q) => q.id === questions[4].id)).toBe(false);
  });

  it("duplicating a switched-off core yields a fresh, switched-on, deletable copy", () => {
    const off = { ...createDefaultQuestions()[0], enabled: false };
    const copy = duplicateQuestion(off);
    expect(copy.enabled).toBe(true);
    expect(copy.core).toBe(false);
    expect(copy.id).not.toBe(off.id);
  });
});

describe("mapForm backward compatibility", () => {
  it("questions stored before the toggle existed default to ON; explicit OFF is preserved", () => {
    /* Exactly what pre-toggle rows look like: no `enabled` key in the jsonb. */
    const legacyQuestion = {
      id: "q-legacy-name",
      type: "short_text",
      title: "What should we call you?",
      helper: "",
      placeholder: "",
      required: true,
      core: true,
      options: [],
      ratingStyle: "star5",
    };
    const switchedOff = { ...legacyQuestion, id: "q-off-city", title: "Which city?", enabled: false };

    const row: FormRow = {
      created_at: "2026-08-20T00:00:00.000Z",
      created_by: null,
      description: "",
      id: "11111111-1111-4111-a111-111111111111",
      questions: { version: 1, questions: [legacyQuestion, switchedOff] } as unknown as Json,
      redirect_url: "",
      slug: "legacy-form",
      status: "published",
      style: "conversational",
      submit_label: "Submit",
      success_message: "",
      title: "Legacy Form",
      updated_at: "2026-08-20T00:00:00.000Z",
    };

    const mapped = mapForm(row);
    expect(mapped.questions).toHaveLength(2);
    expect(mapped.questions[0].enabled).toBe(true);
    expect(mapped.questions[1].enabled).toBe(false);
  });
});

describe("formIssues with switched-off questions", () => {
  const titled = (): LogoutForm => ({ ...createEmptyForm(), title: "Test Form" });

  it("a switched-off invalid question cannot block publish", () => {
    const badButOff = { ...createQuestion("single_choice"), enabled: false };
    const form: LogoutForm = { ...titled(), questions: [...titled().questions, badButOff] };
    expect(formIssues(form)).toEqual([]);
  });

  it("the same invalid question blocks publish while switched on", () => {
    const bad = createQuestion("single_choice");
    const form: LogoutForm = { ...titled(), questions: [...titled().questions, bad] };
    expect(formIssues(form).length).toBeGreaterThan(0);
  });

  it("a form must ask at least one question to publish", () => {
    const allOff: LogoutForm = {
      ...titled(),
      questions: titled().questions.map((q) => ({ ...q, enabled: false })),
    };
    expect(formIssues(allOff)).toContain("Switch on at least one question");
  });
});
