/**
 * Resolves the time-of-day greeting from the visitor's local clock.
 * Bands: 5:00–11:59 Morning · 12:00–16:59 Afternoon · 17:00–20:59 Evening ·
 * 21:00–4:59 Night. Computed fresh on every call — never cached, never mocked —
 * so a refresh at a different hour always greets correctly.
 */
export function timeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}
