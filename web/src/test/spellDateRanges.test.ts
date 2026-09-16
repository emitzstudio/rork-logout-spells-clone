import { describe, expect, it } from "vitest";
import { formatSpellDateRange, parseSpellDates } from "@/data/account/derive";

describe("explicit cross-year spell departures", () => {
  it("keeps the Europe dates fixed rather than rolling into a later year", () => {
    expect(parseSpellDates("20 December 2026 - 2 January 2027")).toEqual({ start: new Date(2026, 11, 20, 8), end: new Date(2027, 0, 2, 18) });
    expect(parseSpellDates("20 December 2025 – 2 January 2026")?.start.getFullYear()).toBe(2025);
  });
  it.each([
    [new Date(2026, 11, 20), new Date(2027, 0, 2)],
    [new Date(2026, 8, 29), new Date(2026, 9, 2)],
    [new Date(2027, 10, 18), new Date(2027, 10, 24)],
    [new Date(2026, 11, 20), new Date(2026, 11, 20)],
  ])("round-trips date-picker selections without dropping years", (start, end) => {
    const parsed = parseSpellDates(formatSpellDateRange(start, end));
    expect(parsed?.start).toEqual(new Date(start.getFullYear(), start.getMonth(), start.getDate(), 8));
    expect(parsed?.end).toEqual(new Date(end.getFullYear(), end.getMonth(), end.getDate(), 18));
  });
  it.each(["31 February 2026 - 2 March 2026", "20 December 2026 - 2 January 2026", "0 December 2026 - 2 January 2027", "20 Nope 2026 - 2 January 2027", "20 December 2026 - 32 January 2027", "Dates TBC"])("rejects invalid range %s without normalizing into a different trip", (label) => {
    expect(parseSpellDates(label)).toBeNull();
  });
  it("preserves existing same-month published and legacy labels", () => {
    expect(parseSpellDates("18-24 November 2026")).toEqual({ start: new Date(2026, 10, 18, 8), end: new Date(2026, 10, 24, 18) });
    expect(parseSpellDates("Oct 2-5")?.start.getMonth()).toBe(9);
  });
});
