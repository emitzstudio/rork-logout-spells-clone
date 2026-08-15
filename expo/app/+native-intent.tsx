import { toAppPath } from "@/lib/links";

/** Shared links open the screen they point at instead of always landing Home. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return toAppPath(path);
  } catch {
    return "/";
  }
}
