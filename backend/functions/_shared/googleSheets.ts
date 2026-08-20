/**
 * M12 · Google Sheets writer — service-account auth + the four Sheets v4 calls
 * the sync needs. Status: DEPLOYED with sheets-sync.
 *
 * ONE service account serves the whole system, configured once via two
 * server-only secrets (GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY).
 * Each form merely stores the spreadsheet id the founder pasted; the founder
 * shares their sheet with the service-account email like any collaborator.
 * Nothing here ever reaches a browser.
 */

export interface GoogleCredentials {
  clientEmail: string;
  privateKeyPem: string;
}

export type SheetsErrorCode =
  | "not_configured"
  | "invalid_key"
  | "no_access"
  | "not_found"
  | "api_error";

/** Typed failure — the caller records `message` on the response row. */
export class SheetsError extends Error {
  readonly code: SheetsErrorCode;
  constructor(code: SheetsErrorCode, message: string) {
    super(message);
    this.name = "SheetsError";
    this.code = code;
  }
}

/** Google spreadsheet ids — the same format the builder validates client-side. */
export const SHEET_ID_RE = /^[A-Za-z0-9_-]{20,120}$/;

/**
 * Reads + normalizes the service-account secrets; null when not configured.
 * Forgiving on purpose: accepts the raw private_key value (with literal \n
 * escapes), a quoted paste, or even the entire downloaded JSON key file.
 */
export const getGoogleCredentials = (): GoogleCredentials | null => {
  let email = (Deno.env.get("GOOGLE_SHEETS_CLIENT_EMAIL") ?? "").trim();
  let key = (Deno.env.get("GOOGLE_SHEETS_PRIVATE_KEY") ?? "").trim();
  if (key.startsWith("{")) {
    try {
      const parsed = JSON.parse(key) as { client_email?: string; private_key?: string };
      if (typeof parsed.private_key === "string") key = parsed.private_key;
      if (email === "" && typeof parsed.client_email === "string") email = parsed.client_email;
    } catch {
      /* not JSON after all — treat as PEM below */
    }
  }
  key = key.replace(/^["']+|["']+$/g, "").replace(/\\n/g, "\n").trim();
  email = email.replace(/^["']+|["']+$/g, "");
  if (email === "" || key === "") return null;
  return { clientEmail: email, privateKeyPem: key };
};

/* --------------------------------- JWT/RS256 -------------------------------- */

const base64UrlEncode = (data: Uint8Array | string): string => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToPkcs8 = (pem: string): Uint8Array => {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** Module-scope token cache — edge isolates are reused between invocations. */
let cachedToken: { token: string; expiresAt: number } | null = null;

/** Mints (or reuses) a Sheets-scoped access token for the service account. */
export const mintAccessToken = async (creds: GoogleCredentials): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken !== null && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemToPkcs8(creds.privateKeyPem).buffer as ArrayBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new SheetsError(
      "invalid_key",
      "The Google service-account private key could not be read — re-check the GOOGLE_SHEETS_PRIVATE_KEY secret.",
    );
  }

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new SheetsError(
      "invalid_key",
      `Google rejected the service-account credentials (HTTP ${res.status}) — re-check the configured secrets.`,
    );
  }
  const parsed = (await res.json()) as { access_token?: string; expires_in?: number };
  if (typeof parsed.access_token !== "string" || parsed.access_token === "") {
    throw new SheetsError("api_error", "Google token exchange returned no access token.");
  }
  cachedToken = { token: parsed.access_token, expiresAt: now + (parsed.expires_in ?? 3600) };
  return parsed.access_token;
};

/* -------------------------------- Sheets API -------------------------------- */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const sheetsFetch = (token: string, path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${SHEETS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

/** Maps Google's HTTP failures onto founder-actionable messages. */
const raiseSheetsError = async (res: Response, saEmail: string): Promise<never> => {
  if (res.status === 404) {
    throw new SheetsError(
      "not_found",
      "That Google Sheet can't be found — it may have been deleted, or the URL is wrong.",
    );
  }
  if (res.status === 403) {
    throw new SheetsError(
      "no_access",
      `No access to that Google Sheet — open it in Google Sheets, press Share, and add ${saEmail} as an Editor.`,
    );
  }
  const detail = (await res.text()).slice(0, 180);
  throw new SheetsError("api_error", `Google Sheets API error ${res.status}: ${detail}`);
};

/** A1 range on a named tab, quoted and URL-encoded. */
const tabRange = (tab: string, ref: string): string =>
  encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${ref}`);

export interface SpreadsheetMeta {
  title: string;
  firstTabTitle: string;
}

/** Validates access + resolves the spreadsheet title and its first tab. */
export const getSpreadsheetMeta = async (
  token: string,
  sheetId: string,
  saEmail: string,
): Promise<SpreadsheetMeta> => {
  const res = await sheetsFetch(
    token,
    `/${sheetId}?fields=properties.title,sheets(properties(title,index))`,
  );
  if (!res.ok) await raiseSheetsError(res, saEmail);
  const doc = (await res.json()) as {
    properties?: { title?: string };
    sheets?: { properties?: { title?: string; index?: number } }[];
  };
  const tabs = (doc.sheets ?? [])
    .map((sheet) => sheet.properties ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return {
    title: doc.properties?.title ?? "Untitled spreadsheet",
    firstTabTitle: tabs[0]?.title ?? "Sheet1",
  };
};

/** Row 1 of the tab — [] when the sheet is still empty. */
export const getHeaderRow = async (
  token: string,
  sheetId: string,
  tab: string,
  saEmail: string,
): Promise<string[]> => {
  const res = await sheetsFetch(
    token,
    `/${sheetId}/values/${tabRange(tab, "1:1")}?majorDimension=ROWS`,
  );
  if (!res.ok) await raiseSheetsError(res, saEmail);
  const doc = (await res.json()) as { values?: unknown[][] };
  return (doc.values?.[0] ?? []).map((value) => String(value ?? ""));
};

/**
 * (Re)writes row 1 only — used to initialize headers on an empty sheet or to
 * extend them with new columns. Data rows are never touched.
 */
export const writeHeaderRow = async (
  token: string,
  sheetId: string,
  tab: string,
  headers: string[],
  saEmail: string,
): Promise<void> => {
  const res = await sheetsFetch(
    token,
    `/${sheetId}/values/${tabRange(tab, "1:1")}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [headers] }) },
  );
  if (!res.ok) await raiseSheetsError(res, saEmail);
};

/** Appends one row after the last data row — never overwrites existing rows. */
export const appendRow = async (
  token: string,
  sheetId: string,
  tab: string,
  row: string[],
  saEmail: string,
): Promise<void> => {
  const res = await sheetsFetch(
    token,
    `/${sheetId}/values/${tabRange(tab, "A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
  if (!res.ok) await raiseSheetsError(res, saEmail);
};
