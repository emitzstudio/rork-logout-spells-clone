/** Calendar helpers for brochure and page copy; ISO dates in, house wording out. */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parts = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Invalid date ${iso}`);
  return { year, day, month: MONTHS[month - 1]!, weekday: WEEKDAYS[date.getUTCDay()]! };
};

/** "Sunday 25 October 2026". */
export const longDay = (iso: string): string => {
  const p = parts(iso);
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
};

/** "25 October" - the day and month only, for eyebrows and short labels. */
export const dayMonth = (iso: string): string => {
  const p = parts(iso);
  return `${p.day} ${p.month}`;
};

/** "Sunday". */
export const weekday = (iso: string): string => parts(iso).weekday;

/** Days between two ISO dates, inclusive of both ends. */
export const inclusiveDays = (start: string, end: string): number => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
