/**
 * Publishes only the finished MP4 to a dedicated Supabase Storage bucket.
 * Does not build, deploy, or modify the website or mobile app.
 * Usage: node publish.mjs inspect | upload [name] [expectedDurationSeconds]
 * Requires the CLI's short-lived SUPABASE_ACCESS_TOKEN, provided by Rork.
 * API keys are consumed in memory only; never written to disk or printed.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const ref = "ultwonqxcgoadthneqqn";
const origin = `https://${ref}.supabase.co`;
const bucket = "reel-exports";
const name = process.argv[3] ?? "Logout-Spells-Blinding-Nights-Reel-v2-After-Hours-Silent";
assert(/^[a-zA-Z0-9_-]+$/.test(name), "Invalid export name");
const expectedDuration = Number(process.argv[4] ?? 52.5);
assert(Number.isFinite(expectedDuration) && expectedDuration > 5, "Invalid expected duration");
const filename = `${name}.mp4`;
const object = `blinding-nights/${filename}`;
const hash = (data) => createHash("sha256").update(data).digest("hex");

async function main() {
  const mode = process.argv[2] ?? "inspect";
  assert(["inspect", "upload"].includes(mode), "Use inspect or upload");
  let keys;
  try {
    const response = execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "--output", "json"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1024 * 1024,
    });
    keys = JSON.parse(response);
  } catch {
    throw new Error("Unable to obtain publishing credentials. Refresh the Supabase CLI token.");
  }
  const key = keys.find((row) => row.name === "service_role")?.api_key;
  assert(typeof key === "string" && key.length > 20, "Storage admin credential unavailable");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const storage = async (path, opts = {}) => {
    const response = await fetch(`${origin}/storage/v1${path}`, {
      ...opts, headers: { ...headers, ...opts.headers }, signal: AbortSignal.timeout(50000),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const code = error.statusCode ?? response.status;
      throw new Error(`Storage request failed (${code}); inspect state before retrying.`);
    }
    return response.json();
  };
  const buckets = await storage("/bucket");
  console.log("Storage configurations:", JSON.stringify(buckets.map((b) => ({
    name: b.name, public: b.public, fileSizeLimit: b.file_size_limit, mimeTypes: b.allowed_mime_types,
  }))));
  if (mode === "inspect") return;

  const video = readFileSync(`out/${filename}`);
  assert(video.length > 1024 * 1024 && video.length < 50 * 1024 * 1024, "Unexpected video size");
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", `out/${filename}`], { encoding: "utf8" }));
  const stream = metadata.streams.find((s) => s.codec_type === "video");
  assert.equal(stream?.width, 1080);
  assert.equal(stream?.height, 1920);
  assert.equal(stream?.r_frame_rate, "60/1");
  assert.equal(metadata.streams.filter((s) => s.codec_type === "audio").length, 0);
  assert(Math.abs(Number(metadata.format.duration) - expectedDuration) < .05);

  const existing = buckets.find((b) => b.id === bucket);
  if (!existing) {
    await storage("/bucket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      id: bucket, name: bucket, public: true, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: ["video/mp4"],
    }) });
    console.log("Created dedicated public video bucket; no public write policies added.");
  } else {
    assert.equal(existing.public, true, "Existing bucket is private; refusing to change its access");
    assert(existing.allowed_mime_types?.includes("video/mp4"), "Existing bucket does not permit MP4; refusing to change it");
  }

  const url = `${origin}/storage/v1/object/public/${bucket}/${object}`;
  const before = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
  if (before.ok) {
    const remote = await fetch(url, { signal: AbortSignal.timeout(50000) });
    assert(remote.ok);
    assert.equal(hash(Buffer.from(await remote.arrayBuffer())), hash(video), "Object exists with different content; use a new filename");
    console.log("Identical export already hosted; skipped upload.");
  } else {
    await storage(`/object/${bucket}/${object}`, { method: "POST", headers: {
      "Content-Type": "video/mp4", "Cache-Control": "max-age=31536000", "x-upsert": "false",
    }, body: video });
    console.log(`Uploaded ${video.length} bytes.`);
  }
  const verified = await fetch(url, { signal: AbortSignal.timeout(50000) });
  assert.equal(verified.status, 200);
  assert(verified.headers.get("content-type")?.includes("video/mp4"));
  const remoteHash = hash(Buffer.from(await verified.arrayBuffer()));
  assert.equal(remoteHash, hash(video), "Uploaded file integrity mismatch");
  console.log(JSON.stringify({ download: `${url}?download=${filename}`, bytes: video.length, sha256: remoteHash, verified: true }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
