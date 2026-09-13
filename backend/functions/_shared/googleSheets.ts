/**
 * 0087 · Minimal Google Sheets v4 client for Edge Functions.
 *
 * Authenticates as a service account (the founder shares each sheet with its
 * email, exactly like sharing with a colleague): a short-lived RS256 JWT is
 * exchanged for an OAuth access token, cached until it nears expiry. No
 * third-party dependency — WebCrypto signs the assertion.
 *
 * The key arrives through the GOOGLE_SERVICE_ACCOUNT_JSON secret (the JSON
 * file Google Cloud downloads, pasted verbatim or base64-encoded).
 */

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";

const parseAccount = (raw: string): ServiceAccount | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        ...(typeof parsed.project_id === "string" ? { project_id: parsed.project_id } : {}),
      };
    }
  } catch {
    /* fall through - maybe base64 */
  }
  return null;
};

/** The configured service account, or null when the secret is absent/unreadable. */
export const loadServiceAccount = (): ServiceAccount | null => {
  const raw = (Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "").trim();
  if (raw === "") return null;
  const direct = parseAccount(raw);
  if (direct) return direct;
  try {
    const decoded = parseAccount(atob(raw));
    if (decoded) return decoded;
  } catch {
    /* not base64 either */
  }
  console.error("[googleSheets] GOOGLE_SERVICE_ACCOUNT_JSON is set but is not a valid service-account JSON");
  return null;
};

/* -------------------------------- Signing --------------------------------- */

const encoder = new TextEncoder();

const base64url = (input: ArrayBuffer | Uint8Array | string): string => {
  const bytes =
    typeof input === "string"
      ? encoder.encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const pemToDer = (pem: string): ArrayBuffer => {
  const body = pem.replace(/-----(BEGIN|END)[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
};

let cachedToken: { email: string; token: string; expiresAt: number } | null = null;

export class SheetsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "SheetsApiError";
    this.status = status;
  }
}

/** OAuth access token for the service account - cached until ~1 minute before expiry. */
export const getAccessToken = async (account: ServiceAccount): Promise<string> => {
  if (cachedToken && cachedToken.email === account.client_email && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const unsigned = `${header}.${claims}`;

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(account.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch (error) {
    console.error("[googleSheets] private key import failed:", error);
    throw new SheetsApiError(401, "The service account's private key could not be read.");
  }
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || typeof payload.access_token !== "string") {
    console.error("[googleSheets] token exchange failed:", response.status, payload.error ?? "");
    throw new SheetsApiError(
      401,
      `Google rejected the service account key (${payload.error ?? response.status}). ${payload.error_description ?? ""}`.trim(),
    );
  }
  cachedToken = {
    email: account.client_email,
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
  return payload.access_token;
};

/* ------------------------------ Sheets calls ------------------------------ */

const sheetsFetch = async <T>(
  account: ServiceAccount,
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const token = await getAccessToken(account);
  const response = await fetch(`${SHEETS_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  const body = text !== "" ? (JSON.parse(text) as T & { error?: { message?: string; status?: string } }) : ({} as T);
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    throw new SheetsApiError(response.status, message);
  }
  return body;
};

export interface SheetTab {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    gridProperties?: { rowCount?: number; columnCount?: number };
  };
}

export interface SpreadsheetMeta {
  properties: { title: string };
  sheets: SheetTab[];
}

export const getSpreadsheet = (account: ServiceAccount, spreadsheetId: string): Promise<SpreadsheetMeta> =>
  sheetsFetch<SpreadsheetMeta>(
    account,
    `/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent(
      "properties.title,sheets.properties(sheetId,title,index,gridProperties(rowCount,columnCount))",
    )}`,
  );

/** `'Tab name'!A1:C1` with the tab quoted the way the API expects. */
export const rangeA1 = (sheetTitle: string, cells: string): string =>
  `'${sheetTitle.replace(/'/g, "''")}'!${cells}`;

export const getValues = async (
  account: ServiceAccount,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> => {
  const data = await sheetsFetch<{ values?: unknown[][] }>(
    account,
    `/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
  );
  return (data.values ?? []).map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))));
};

/** RAW input: nothing a traveller typed can ever become a formula. */
export const updateValues = (
  account: ServiceAccount,
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<unknown> =>
  sheetsFetch(
    account,
    `/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ range, majorDimension: "ROWS", values }) },
  );

export const appendValues = (
  account: ServiceAccount,
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<unknown> =>
  sheetsFetch(
    account,
    `/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ majorDimension: "ROWS", values }) },
  );

export const batchUpdate = (
  account: ServiceAccount,
  spreadsheetId: string,
  requests: Record<string, unknown>[],
): Promise<unknown> =>
  sheetsFetch(account, `/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });

/** Founder-facing wording for the errors Google returns most. */
export const describeSheetsError = (error: unknown, serviceEmail: string): string => {
  if (error instanceof SheetsApiError) {
    if (error.status === 403 && /not been used|disabled|accessNotConfigured/i.test(error.message)) {
      return "The Google Sheets API isn't enabled for the service account's Google Cloud project yet.";
    }
    if (error.status === 403) {
      return `Google can't open this sheet yet - share it with ${serviceEmail} as an Editor, then try again.`;
    }
    if (error.status === 404) return "That spreadsheet couldn't be found - check the link.";
    if (error.status === 429) return "Google is rate-limiting requests right now - the next sweep retries automatically.";
    if (error.status === 401) return error.message;
    return `Google Sheets replied ${error.status}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

/** HTTP status the console should see for a Google-side failure. */
export const statusForSheetsError = (error: unknown): number => {
  if (error instanceof SheetsApiError) {
    if (error.status === 403 || error.status === 404 || error.status === 401) return error.status;
    if (error.status === 429) return 429;
  }
  return 502;
};
