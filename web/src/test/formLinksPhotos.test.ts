/**
 * 0088 - Link + Photos question types: URL normalisation, photo limits,
 * stored-value helpers, and how both types travel into the CRM columns and
 * the Excel exports (clickable HYPERLINK cells, one photo URL per line).
 */
import { describe, expect, it } from "vitest";

import { crmQuestionColumns, leadAnswerRecord } from "@/data/crm";
import type { CrmLead } from "@/data/crm";
import { buildCrmTable } from "@/data/crmExport";
import {
  answerPreview,
  createEmptyForm,
  createQuestion,
  DEFAULT_PHOTO_LIMIT,
  isHttpUrl,
  joinPhotoUrls,
  MAX_PHOTO_LIMIT,
  normalizeLink,
  photoLimit,
  photoUrls,
  QUESTION_TYPE_IDS,
  QUESTION_TYPE_META,
} from "@/data/forms";
import type { FormResponse, LogoutForm } from "@/data/forms";
import { answerCell, buildInboxWorkbook, buildResponsesTable, hyperlinkFormula, toSheetData } from "@/data/responsesExport";
import { REVIEW_QUESTION_TYPES } from "@/data/reviewForm";

/* ------------------------------- Question types ------------------------------ */

describe("question type catalogue", () => {
  it("offers Link and Photos in the Form Builder, after the original nine", () => {
    expect(QUESTION_TYPE_IDS.slice(-2)).toEqual(["link", "photos"]);
    expect(QUESTION_TYPE_META.link.label).toBe("Link");
    expect(QUESTION_TYPE_META.photos.label).toBe("Photos");
    expect(QUESTION_TYPE_META.link.hasPlaceholder).toBe(true);
    expect(QUESTION_TYPE_META.photos.hasOptions).toBe(false);
  });

  it("keeps them out of the review builder, whose renderer has no controls for them", () => {
    expect(REVIEW_QUESTION_TYPES).not.toContain("link");
    expect(REVIEW_QUESTION_TYPES).not.toContain("photos");
    expect(REVIEW_QUESTION_TYPES).toContain("rating");
  });

  it("a new Photos question starts at the default limit; other types carry none", () => {
    expect(createQuestion("photos").maxPhotos).toBe(DEFAULT_PHOTO_LIMIT);
    expect(createQuestion("link").maxPhotos).toBeUndefined();
  });
});

/* --------------------------------- Links ----------------------------------- */

describe("normalizeLink", () => {
  it("stores the complete URL, adding https:// to bare domains", () => {
    expect(normalizeLink("https://www.instagram.com/example")).toBe("https://www.instagram.com/example");
    expect(normalizeLink("instagram.com/example")).toBe("https://instagram.com/example");
    expect(normalizeLink("  www.behance.net/someone  ")).toBe("https://www.behance.net/someone");
    expect(normalizeLink("http://example.org/path?x=1#frag")).toBe("http://example.org/path?x=1#frag");
    /* A port is not a scheme. */
    expect(normalizeLink("www.example.com:8080/x")).toBe("https://www.example.com:8080/x");
  });

  it("refuses things that aren't web links", () => {
    expect(normalizeLink("")).toBeNull();
    expect(normalizeLink("not a link")).toBeNull();
    expect(normalizeLink("justaword")).toBeNull();
    expect(normalizeLink("mailto:someone@example.com")).toBeNull();
    expect(normalizeLink("javascript:alert(1)")).toBeNull();
    expect(normalizeLink("ftp://files.example.com")).toBeNull();
    expect(normalizeLink('https://evil.com/"),1)')).toBeNull();
  });
});

describe("isHttpUrl", () => {
  it("accepts complete http(s) URLs and nothing that could break a formula literal", () => {
    expect(isHttpUrl("https://www.instagram.com/example")).toBe(true);
    expect(isHttpUrl("instagram.com/example")).toBe(false);
    expect(isHttpUrl('https://x.y/"z')).toBe(false);
    expect(isHttpUrl("https://x.y/a b")).toBe(false);
    expect(isHttpUrl("https://<x>.y")).toBe(false);
  });
});

/* --------------------------------- Photos ---------------------------------- */

describe("photoLimit", () => {
  it("clamps to 1…MAX and defaults records without the field", () => {
    expect(photoLimit({ maxPhotos: 5 })).toBe(5);
    expect(photoLimit({ maxPhotos: 1 })).toBe(1);
    expect(photoLimit({ maxPhotos: 0 })).toBe(1);
    expect(photoLimit({ maxPhotos: 99 })).toBe(MAX_PHOTO_LIMIT);
    expect(photoLimit({ maxPhotos: 2.6 })).toBe(3);
    expect(photoLimit({})).toBe(DEFAULT_PHOTO_LIMIT);
    expect(photoLimit({ maxPhotos: Number.NaN })).toBe(DEFAULT_PHOTO_LIMIT);
  });
});

describe("photo answer helpers", () => {
  const urls = [
    "https://x.supabase.co/storage/v1/object/public/form-uploads/responses/f/s/a.jpg",
    "https://x.supabase.co/storage/v1/object/public/form-uploads/responses/f/s/b.jpg",
  ];

  it("round-trips one URL per line and ignores anything that isn't a URL", () => {
    const stored = joinPhotoUrls(urls);
    expect(stored).toBe(`${urls[0]}\n${urls[1]}`);
    expect(photoUrls(stored)).toEqual(urls);
    expect(photoUrls(`${urls[0]}\n not-a-url \n`)).toEqual([urls[0]]);
    expect(photoUrls("")).toEqual([]);
  });

  it("previews photos as a count and leaves other answers verbatim", () => {
    expect(answerPreview({ type: "photos", value: joinPhotoUrls(urls) })).toBe("2 photos");
    expect(answerPreview({ type: "photos", value: urls[0] })).toBe("1 photo");
    expect(answerPreview({ type: "photos", value: "" })).toBe("");
    expect(answerPreview({ type: "link", value: urls[0] })).toBe(urls[0]);
    expect(answerPreview({ type: "short_text", value: "Mumbai" })).toBe("Mumbai");
  });
});

/* ------------------------------ Exports + CRM ------------------------------ */

const linkQ = { ...createQuestion("link"), id: "q-ig", title: "Share your Instagram profile" };
const photosQ = { ...createQuestion("photos"), id: "q-pics", title: "Send us some inspiration", maxPhotos: 5 };
const nameQ = { ...createQuestion("short_text"), id: "q-name", title: "Name" };
const form: LogoutForm = { ...createEmptyForm(), title: "Inspiration Form", slug: "inspiration", questions: [nameQ, linkQ, photosQ] };

const photoA = "https://x.supabase.co/storage/v1/object/public/form-uploads/responses/f/s/a.jpg";
const photoB = "https://x.supabase.co/storage/v1/object/public/form-uploads/responses/f/s/b.jpg";

const response: FormResponse = {
  id: "r-1",
  formId: form.id,
  formTitle: form.title,
  spellId: null,
  spellName: null,
  respondentName: "Asha",
  respondentPhone: "+91 98765 43210",
  submittedAt: "2026-09-13T10:00:00Z",
  status: "new",
  answers: [
    { questionId: "q-name", questionTitle: "Name", type: "short_text", value: "Asha" },
    { questionId: "q-ig", questionTitle: "Share your Instagram profile", type: "link", value: "https://www.instagram.com/example" },
    { questionId: "q-pics", questionTitle: "Send us some inspiration", type: "photos", value: joinPhotoUrls([photoA, photoB]) },
  ],
};

describe("answerCell", () => {
  it("writes real URLs as link cells, photos as wrapped text, everything else as text", () => {
    expect(answerCell({ type: "link" }, response.answers[1], false)).toEqual({ kind: "link", value: "https://www.instagram.com/example" });
    expect(answerCell({ type: "photos" }, response.answers[2], false)).toEqual({ kind: "text", value: `${photoA}\n${photoB}`, wrap: true });
    expect(answerCell({ type: "short_text" }, response.answers[0], false)).toEqual({ kind: "text", value: "Asha", wrap: false });
    expect(answerCell({ type: "link" }, undefined, false)).toEqual({ kind: "text", value: "", wrap: false });
  });

  it("falls back to plain text when a link answer isn't a real URL, or is too long for a formula literal", () => {
    expect(answerCell({ type: "link" }, { type: "link", value: "instagram.com/x" }, false)).toEqual({ kind: "text", value: "instagram.com/x", wrap: false });
    const long = `https://example.com/${"a".repeat(260)}`;
    expect(answerCell({ type: "link" }, { type: "link", value: long }, false)).toEqual({ kind: "text", value: long, wrap: false });
  });
});

describe("Excel exports keep links clickable and photos readable", () => {
  it("per-form sheet: the link column is a HYPERLINK formula, the photo column wraps", () => {
    const table = buildResponsesTable(form, [response]);
    expect(table.columns.map((c) => c.header)).toEqual([
      "Submission ID", "Submitted At", "Name", "Share your Instagram profile", "Send us some inspiration",
    ]);
    expect(table.columns[4].wrap).toBe(true);
    expect(table.rows[0][3]).toEqual({ kind: "link", value: "https://www.instagram.com/example" });

    const [, row] = toSheetData(table.columns, table.rows);
    expect(row[3]).toMatchObject({
      type: "Formula",
      value: 'HYPERLINK("https://www.instagram.com/example","https://www.instagram.com/example")',
    });
    expect(row[4]).toMatchObject({ type: String, value: `${photoA}\n${photoB}`, wrap: true });
  });

  it("inbox workbook: same treatment after the six metadata columns", () => {
    const [sheet] = buildInboxWorkbook([form], [response]);
    const META = 6;
    expect(sheet.rows[0][META + 1]).toEqual({ kind: "link", value: "https://www.instagram.com/example" });
    expect(sheet.columns[META + 1].width).toBe(34);
    expect(sheet.columns[META + 2].width).toBe(56);
  });

  it("hyperlinkFormula shows the complete URL as the visible text", () => {
    expect(hyperlinkFormula("https://a.b/c")).toBe('HYPERLINK("https://a.b/c","https://a.b/c")');
  });
});

describe("CRM columns and export", () => {
  const lead: CrmLead = {
    id: "lead-1", formId: form.id, respondentName: "Asha", respondentPhone: "", submittedAt: "2026-09-13T10:00:00Z",
    answers: response.answers, source: null, sourceCreator: "", latestResponse: "", leadType: null,
    handledBy: null, handledByName: "", callDate: null, crmTouchedAt: null,
  };

  it("columns carry the question type so cells can render links and thumbnails", () => {
    const columns = crmQuestionColumns(form, [lead]);
    expect(columns.map((c) => [c.id, c.type, c.wide])).toEqual([
      ["q-name", "short_text", false],
      ["q-ig", "link", false],
      ["q-pics", "photos", true],
    ]);
    expect(leadAnswerRecord(lead, "q-ig")?.value).toBe("https://www.instagram.com/example");
    expect(leadAnswerRecord(lead, "q-missing")).toBeUndefined();
  });

  it("the CRM export writes the link as a clickable cell", () => {
    const { columns, rows } = buildCrmTable(form, [lead]);
    const linkIndex = columns.findIndex((c) => c.header === "Share your Instagram profile");
    expect(rows[0][linkIndex]).toEqual({ kind: "link", value: "https://www.instagram.com/example" });
    const photosIndex = columns.findIndex((c) => c.header === "Send us some inspiration");
    expect(rows[0][photosIndex]).toEqual({ kind: "text", value: `${photoA}\n${photoB}`, wrap: true });
  });
});
