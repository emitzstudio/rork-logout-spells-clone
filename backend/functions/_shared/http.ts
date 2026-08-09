/**
 * M7 · Shared HTTP helpers for Edge Functions.
 * Status: DRAFT — NOT DEPLOYED. Ships in phase 7B after founder approval.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** JSON response with CORS attached. */
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/** Typed error body — { error: { code, message } } per house convention. */
export const fail = (status: number, code: string, message: string): Response =>
  json({ error: { code, message } }, status);

/** CORS preflight short-circuit; returns null for real requests. */
export const preflight = (req: Request): Response | null =>
  req.method === "OPTIONS" ? new Response("ok", { headers: CORS_HEADERS }) : null;
