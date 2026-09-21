/**
 * Blinding Nights — cinematic revision, 1080×1920 / 60 fps.
 * Run from reel-build: node render.mjs stills [times] [full]
 *                     node render.mjs render [name]
 *                     node render.mjs check
 * The visual master is deliberately silent. The editorial grid is 171 BPM;
 * actual recording alignment is pending a user-supplied authorized audio file.
 */
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const W = 1080;
const H = 1920;
const FPS = 60;
const BPM = 171;
const beat = (n) => n * 60 / BPM;
const END = beat(104);
const C = { white: "#FFF9EF", muted: "#E4DCD0", orange: "#F17549", gold: "#E8BD71" };
const F = { bold: "PoppinsEB", medium: "PoppinsM", light: "PoppinsL", serif: "CormorantSB", condensed: "BarlowCond" };
for (const [path, family] of [
  ["Poppins-ExtraBold.ttf", F.bold], ["Poppins-Medium.ttf", F.medium],
  ["Poppins-Light.ttf", F.light], ["cormorant-garamond-v21-latin_latin-ext-600.ttf", F.serif],
  ["BarlowCondensed-Bold.ttf", F.condensed],
]) {
  if (!GlobalFonts.registerFromPath(`fonts/${path}`, family)) throw new Error(`Font unavailable: ${path}`);
}

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const lerp = (a, b, p) => a + (b - a) * p;
const progress = (t, at, duration) => clamp((t - at) / duration);
const smooth = (p) => { const x = clamp(p); return x * x * (3 - 2 * x); };
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 4);
const inOut = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const imagePaths = {
  opening: "../web/public/starboy-weeknd-portrait-v4.jpeg",
  bangkok: "../web/public/starboy-bangkok-night-20260911.jpg",
  river: "../web/public/starboy-skyline-20260911.jpg",
  museum: "bg/day1.jpg",
  concert: "bg/day3.jpg",
  crowd: "../web/public/starboy-concert-20260911.jpg",
  flight: "bg/day4.jpg",
  beach: "../web/public/starboy-phuket-beach-20260911.jpg",
  islands: "bg/day5.jpg",
  atv: "bg/day6.jpg",
  town: "bg/day7.jpg",
  mark: "src/logo-mark.png",
};
const images = {};

// Camera values: zoom, normalized horizontal focus, normalized vertical focus,
// roll in radians. Every shot moves throughout its entire hold, not just on entry.
const shot = (from, to, image, cameraA, cameraB, transition = "glide", overlap = 0.52) => ({
  start: beat(from), end: beat(to), image, cameraA, cameraB, transition, overlap,
});
const SHOTS = [
  shot(0, 8, "opening", [1.24, .54, .26, -.010], [1.04, .46, .30, .004], "glide"),
  shot(8, 16, "bangkok", [1.08, .45, .38, -.006], [1.18, .61, .43, .003], "push", .58),
  shot(16, 24, "museum", [1.03, .34, .56, .003], [1.18, .64, .58, -.004], "glide", .62),
  shot(24, 30, "river", [1.04, .72, .48, .003], [1.12, .58, .49, -.004], "sweep", .46),
  shot(30, 36, "bangkok", [1.24, .67, .56, -.004], [1.08, .39, .51, .003], "sweep", .42),
  shot(36, 46, "concert", [1.17, .45, .03, -.008], [1.09, .51, .03, .002], "push", .56),
  shot(46, 52, "crowd", [1.04, .35, .68, -.009], [1.15, .55, .77, .005], "sweep", .38),
  shot(52, 57, "flight", [1.04, .51, .48, .005], [1.18, .64, .43, -.004], "glide", .70),
  shot(57, 60, "beach", [1.16, .41, .41, -.004], [1.07, .57, .53, .002], "glide", .40),
  shot(60, 68, "islands", [1.07, .42, .47, .003], [1.18, .59, .43, -.004], "glide", .60),
  shot(68, 72, "islands", [1.38, .71, .79, -.004], [1.29, .55, .78, .004], "push", .40),
  shot(72, 80, "atv", [1.02, .61, .54, -.012], [1.17, .69, .47, .007], "sweep", .46),
  shot(80, 84, "beach", [1.20, .63, .43, .005], [1.07, .48, .52, -.002], "glide", .52),
  shot(84, 92, "town", [1.14, .63, .57, -.003], [1.025, .45, .48, .003], "glide", .62),
  shot(92, 104, "islands", [1.06, .48, .52, .003], [1.18, .55, .57, -.003], "glide", .76),
];

const SEQUENCES = [
  { start: beat(0), end: beat(8), type: "opening" },
  { start: beat(8), end: beat(16), type: "title" },
  { start: beat(16), end: beat(24), type: "day", day: 1, label: "09 OCT / BANGKOK", y: 1180,
    lines: ["CULTURE BY DAY.", "Chaos by night."], detail: "ART MUSEUM · DRAG SHOW · UNDERGROUND BANGKOK" },
  { start: beat(24), end: beat(36), type: "day", day: 2, label: "10 OCT / BANGKOK", y: 1000,
    lines: ["SHOP.", "EAT.", "PARTY."], detail: "ICONSIAM · CHINATOWN · ROOFTOPS", stack: true },
  { start: beat(36), end: beat(52), type: "day", day: 3, label: "11 OCT / CONCERT NIGHT", y: 390,
    lines: ["THE WEEKND", "LIVE."], detail: "BANGKOK. ONE UNFORGETTABLE NIGHT.", hero: true },
  { start: beat(52), end: beat(60), type: "day", day: 4, label: "12 OCT / BANGKOK TO PHUKET", y: 1190,
    lines: ["EXHALE.", "Hello, beaches."], detail: "THAI MASSAGE · FLY TO PHUKET · BEACHSIDE DINNER" },
  { start: beat(60), end: beat(72), type: "day", day: 5, label: "13 OCT / PHI PHI ISLANDS", y: 1150,
    lines: ["LESS SIGNAL.", "More paradise."], detail: "ISLAND HOPPING · BOAT RIDES · SWIMMING" },
  { start: beat(72), end: beat(84), type: "day", day: 6, label: "14 OCT / PHUKET", y: 1150,
    lines: ["ADVENTURE.", "After-hours."], detail: "ATV · CAFÉ DEL MAR · PATONG NIGHTLIFE" },
  { start: beat(84), end: beat(92), type: "day", day: 7, label: "15 OCT / PHUKET", y: 1160,
    lines: ["SLOW", "goodbyes."], detail: "OLD TOWN · CAFÉS · ONE LAST WANDER" },
  { start: beat(92), end: beat(104), type: "outro" },
];

function textWidth(ctx, text, size, font, tracking = 0) {
  ctx.font = `${size}px "${font}"`;
  if (!tracking) return ctx.measureText(text).width;
  return [...text].reduce((w, ch) => w + ctx.measureText(ch).width + tracking, -tracking);
}

function text(ctx, value, x, y, opts = {}) {
  const { font = F.medium, size = 30, tracking = 0, color = C.white, alpha = 1, align = "left", maxWidth = 880 } = opts;
  ctx.save();
  const initialWidth = textWidth(ctx, value, size, font, tracking);
  const fit = Math.min(1, maxWidth / initialWidth);
  const finalSize = size * fit;
  const finalTracking = tracking * fit;
  const width = textWidth(ctx, value, finalSize, font, finalTracking);
  let left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  ctx.globalAlpha *= clamp(alpha);
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  if (finalTracking === 0) ctx.fillText(value, left, y);
  else for (const ch of value) {
    ctx.fillText(ch, left, y);
    left += ctx.measureText(ch).width + finalTracking;
  }
  ctx.restore();
  return width;
}

function titleLine(ctx, value, x, y, local, delay, opts = {}) {
  const p = easeOut(progress(local, delay, .72));
  if (p <= 0) return;
  const size = opts.size ?? 118;
  ctx.save();
  // A line-reveal mask, rather than a bouncing card or hard text slam.
  ctx.beginPath();
  ctx.rect(36, y - size * 1.13, W - 72, size * 1.39);
  ctx.clip();
  text(ctx, value, x, y + (1 - p) * size * .8, { ...opts, alpha: p });
  ctx.restore();
}

function shade(ctx, top, bottom, dark = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(3,7,10,${top})`);
  g.addColorStop(.36, `rgba(3,7,10,${dark})`);
  g.addColorStop(.58, `rgba(3,7,10,${Math.max(dark, bottom * .12)})`);
  g.addColorStop(.86, `rgba(3,7,10,${bottom})`);
  g.addColorStop(1, `rgba(3,7,10,${Math.min(.96, bottom + .10)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawPhoto(ctx, img, zoom, fx, fy, roll = 0, pan = 0) {
  const base = Math.max(W / img.width, H / img.height);
  const scale = base * Math.max(1.025, zoom);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (W - width) * clamp(fx) + pan;
  const y = (H - height) * clamp(fy);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(roll);
  ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}

const sceneA = createCanvas(W, H);
const sceneB = createCanvas(W, H);
const sceneAX = sceneA.getContext("2d");
const sceneBX = sceneB.getContext("2d");

function drawShot(ctx, current, t, extraZoom = 0, extraPan = 0) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#090B0C";
  ctx.fillRect(0, 0, W, H);
  const raw = clamp((t - current.start + .4) / (current.end - current.start + .8));
  // Linear drift under an eased move prevents the camera stopping at every cut.
  const p = .60 * raw + .40 * smooth(raw);
  const camera = current.cameraA.map((v, i) => lerp(v, current.cameraB[i], p));
  drawPhoto(ctx, images[current.image], camera[0] + extraZoom, camera[1], camera[2], camera[3], extraPan);
  ctx.fillStyle = "rgba(18,8,2,0.035)";
  ctx.fillRect(0, 0, W, H);
}

function composite(ctx, canvas, alpha, blur = 0) {
  if (alpha < .001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur > .3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  // Overscan hides filtered edge transparency.
  const border = blur * 1.6;
  ctx.drawImage(canvas, -border, -border, W + border * 2, H + border * 2);
  ctx.restore();
}

function lightLeak(ctx, p, warm = true) {
  const envelope = Math.pow(Math.sin(Math.PI * clamp(p)), 4) * .17;
  if (envelope < .001) return;
  const x = W * lerp(-.30, 1.30, p);
  const gradient = ctx.createRadialGradient(x, H * .38, 2, x, H * .38, 770);
  const rgb = warm ? "255,137,62" : "130,206,234";
  gradient.addColorStop(0, `rgba(${rgb},${envelope})`);
  gradient.addColorStop(.40, `rgba(${rgb},${envelope * .45})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function renderPhotography(ctx, t) {
  const boundary = SHOTS.findIndex((s, i) => i > 0 && Math.abs(t - s.start) < s.overlap / 2);
  if (boundary > 0) {
    const incoming = SHOTS[boundary];
    const outgoing = SHOTS[boundary - 1];
    const p = progress(t, incoming.start - incoming.overlap / 2, incoming.overlap);
    const mix = smooth(p);
    const arc = Math.sin(p * Math.PI);
    const push = incoming.transition === "push";
    const sweep = incoming.transition === "sweep";
    const magnify = push ? .13 * inOut(p) : sweep ? .07 * arc : .012 * arc;
    drawShot(sceneAX, outgoing, t, magnify, sweep ? -32 * inOut(p) : 0);
    drawShot(sceneBX, incoming, t, push ? .13 * (1 - inOut(p)) : sweep ? .07 * arc : 0, sweep ? 32 * (1 - inOut(p)) : 0);
    const blur = (sweep ? 9 : push ? 5 : 1.2) * arc * arc;
    composite(ctx, sceneA, 1, blur);
    composite(ctx, sceneB, mix, blur);
    if ([1, 5, 7, 14].includes(boundary)) lightLeak(ctx, p, boundary !== 7);
    return;
  }
  const current = SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS.at(-1);
  drawShot(ctx, current, t);
}

function brand(ctx, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(images.mark, 73, 196, 77, 77);
  text(ctx, "Logout", 164, 240, { font: F.serif, size: 48, maxWidth: 280 });
  text(ctx, "S P E L L S", 165, 263, { size: 13, tracking: 1.5, maxWidth: 280 });
  ctx.restore();
}

function opening(ctx, t) {
  brand(ctx, .92);
  const alpha = 1 - smooth(progress(t, beat(8) - .30, .30));
  ctx.save();
  ctx.globalAlpha = alpha;
  text(ctx, "THIS OCTOBER,", 80, 1203, { size: 26, tracking: 7, color: C.gold, alpha: easeOut(progress(t, .05, .4)) });
  titleLine(ctx, "THE WEEKND.", 74, 1333, t, .06, { font: F.bold, size: 116, maxWidth: 880 });
  titleLine(ctx, "You. Bangkok.", 79, 1453, t, .25, { font: F.serif, size: 118, color: C.white, maxWidth: 865 });
  ctx.restore();
}

function mainTitle(ctx, local) {
  brand(ctx);
  text(ctx, "NOT JUST A CONCERT. A WHOLE SPELL.", 80, 954, { size: 22, tracking: 5, color: C.gold, alpha: easeOut(progress(local, .10, .45)) });
  titleLine(ctx, "BLINDING", 73, 1090, local, .06, { font: F.bold, size: 161, maxWidth: 880 });
  titleLine(ctx, "Nights.", 74, 1258, local, .22, { font: F.serif, size: 204, maxWidth: 890 });
  text(ctx, "BANGKOK  /  PHUKET", 80, 1370, { size: 30, tracking: 6, alpha: easeOut(progress(local, .60, .48)) });
  text(ctx, "7 DAYS. 2 CITIES. 1 CONCERT.", 80, 1422, { size: 22, tracking: 4, color: C.muted, alpha: easeOut(progress(local, .76, .48)) });
}

function dayTypography(ctx, s, t) {
  const local = t - s.start;
  const length = s.end - s.start;
  const out = 1 - smooth(progress(local, length - .30, .28));
  brand(ctx, s.hero ? .82 : .78);
  ctx.save();
  ctx.globalAlpha = out;
  const labelY = s.hero ? 325 : s.y - 78;
  text(ctx, s.label, 80, labelY, { size: 25, tracking: 4.5, color: s.hero ? C.gold : C.white, alpha: easeOut(progress(local, .05, .40)) });
  if (s.stack) {
    s.lines.forEach((line, i) => titleLine(ctx, line, 73, s.y + i * 146, local, .06 + i * beat(1), {
      font: i === 2 ? F.serif : F.bold, size: i === 2 ? 184 : 157, color: i === 2 ? C.orange : C.white,
    }));
    text(ctx, s.detail, 80, s.y + 372, { size: 23, tracking: 3.1, alpha: easeOut(progress(local, 1.02, .5)) });
  } else if (s.hero) {
    titleLine(ctx, s.lines[0], 72, 449, local, .04, { font: F.bold, size: 124, maxWidth: 880 });
    titleLine(ctx, s.lines[1], 76, 586, local, .20, { font: F.serif, size: 166, color: C.gold });
    text(ctx, s.detail, 81, 649, { size: 22, tracking: 4, alpha: easeOut(progress(local, .62, .48)) });
    const second = easeOut(progress(local, beat(10) + .15, .7));
    text(ctx, "ONE NIGHT.", 78, 1224, { font: F.bold, size: 118, alpha: second });
    text(ctx, "All the feels.", 80, 1350, { font: F.serif, size: 146, alpha: second });
  } else {
    titleLine(ctx, s.lines[0], 76, s.y + 24, local, .05, { font: F.bold, size: 111, maxWidth: 870 });
    titleLine(ctx, s.lines[1], 78, s.y + 146, local, .20, { font: F.serif, size: 139, maxWidth: 870 });
    text(ctx, s.detail, 81, s.y + 222, { size: 24, tracking: 2.5, color: C.muted, alpha: easeOut(progress(local, .64, .48)), maxWidth: 870 });
  }
  ctx.restore();
}

function outro(ctx, local) {
  const show = easeOut(progress(local, .05, .65));
  ctx.save();
  ctx.globalAlpha = show;
  ctx.drawImage(images.mark, 448, 354, 184, 184);
  text(ctx, "Logout", 540, 603, { font: F.serif, size: 92, align: "center" });
  text(ctx, "S P E L L S", 543, 645, { size: 22, tracking: 4, align: "center" });
  titleLine(ctx, "BLINDING", 540, 910, local, .13, { font: F.bold, size: 151, align: "center", maxWidth: 865 });
  titleLine(ctx, "Nights.", 540, 1086, local, .26, { font: F.serif, size: 208, align: "center" });
  text(ctx, "9–15 OCTOBER 2026", 540, 1181, { size: 32, tracking: 5, align: "center", color: C.gold, alpha: easeOut(progress(local, .45, .55)) });
  text(ctx, "BANGKOK  /  PHUKET", 540, 1235, { size: 27, tracking: 5, align: "center", alpha: easeOut(progress(local, .55, .5)) });
  text(ctx, "MAKE THIS YOUR WEEK.", 540, 1380, { font: F.bold, size: 39, tracking: 2, align: "center", alpha: easeOut(progress(local, .9, .55)) });
  text(ctx, "logoutspells.com", 540, 1455, { size: 32, tracking: 2, align: "center", color: C.muted, alpha: easeOut(progress(local, 1.05, .55)) });
  ctx.restore();
}

function renderGrade(ctx, t) {
  const grade = (seq) => seq.type === "opening" ? [.42, .78, .03]
    : seq.type === "title" ? [.44, .80, .18]
      : seq.type === "outro" ? [.68, .86, .52]
        : seq.hero ? [.62, .32, .03] : [.27, .84, .01];
  const boundary = SEQUENCES.findIndex((s, i) => i > 0 && Math.abs(t - s.start) < .38);
  if (boundary > 0) {
    const p = smooth(progress(t, SEQUENCES[boundary].start - .38, .76));
    const a = grade(SEQUENCES[boundary - 1]);
    const b = grade(SEQUENCES[boundary]);
    shade(ctx, ...a.map((v, i) => lerp(v, b[i], p)));
  } else shade(ctx, ...grade(SEQUENCES.find((s) => t >= s.start && t < s.end) ?? SEQUENCES.at(-1)));
}

function renderFrame(ctx, t) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = "#090B0C";
  ctx.fillRect(0, 0, W, H);
  renderPhotography(ctx, t);
  renderGrade(ctx, t);
  const seq = SEQUENCES.find((s) => t >= s.start && t < s.end) ?? SEQUENCES.at(-1);
  if (seq.type === "opening") opening(ctx, t);
  else if (seq.type === "day") dayTypography(ctx, seq, t);
  else {
    ctx.save();
    if (seq.type === "title") {
      const opacity = smooth(progress(t, seq.start - .01, .25)) * (1 - smooth(progress(t, seq.end - .28, .28)));
      ctx.globalAlpha = opacity;
      mainTitle(ctx, t - seq.start);
    } else outro(ctx, t - seq.start);
    ctx.restore();
  }
  // Gentle continuous vignette. No flashes, progress indicator, or blackout cuts.
  const vig = ctx.createRadialGradient(W / 2, H * .48, W * .34, W / 2, H * .48, H * .78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

async function loadAssets() {
  await Promise.all(Object.entries(imagePaths).map(async ([key, path]) => { images[key] = await loadImage(path); }));
}

function validateTimeline() {
  for (const timeline of [SHOTS, SEQUENCES]) {
    assert.equal(timeline[0].start, 0);
    assert.equal(timeline.at(-1).end, END);
    for (let i = 0; i < timeline.length; i++) {
      const item = timeline[i];
      assert(item.end > item.start);
      if (i > 0) assert.equal(timeline[i - 1].end, item.start, "Timeline must be gapless");
      if (item.image) {
        assert(images[item.image], `Missing image ${item.image}`);
        assert(item.overlap < item.end - item.start);
        assert(item.cameraA[0] >= 1 && item.cameraB[0] >= 1);
      }
    }
  }
  assert.notEqual(SHOTS[0].image, SHOTS.find((s) => s.start === beat(36)).image);
  assert.equal(SEQUENCES.filter((s) => s.type === "day").length, 7);
  console.log(`Validated gapless ${END.toFixed(3)}s / ${SHOTS.length} shots / seven days / silent master`);
}

async function main() {
  const mode = process.argv[2] ?? "stills";
  if (!["render", "stills", "check"].includes(mode)) throw new Error("Use render, stills, or check");
  await loadAssets();
  validateTimeline();
  if (mode === "check") return;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  if (mode === "stills") {
    const times = (process.argv[3] ?? "0.5,1.9,3.8,6.7,9.4,11.6,13.8,15.6,17.4,19.2,20.6,22.3,24.5,26.6,28.6,30.8,33.5,35.8")
      .split(",").map(Number);
    assert(times.every((t) => Number.isFinite(t) && t >= 0 && t < END));
    mkdirSync("probe", { recursive: true });
    const cols = 4;
    const tw = 270;
    const th = 480;
    const sheet = createCanvas(cols * tw, Math.ceil(times.length / cols) * (th + 32));
    const c = sheet.getContext("2d");
    c.fillStyle = "#202020";
    c.fillRect(0, 0, sheet.width, sheet.height);
    for (const [i, t] of times.entries()) {
      renderFrame(ctx, t);
      const x = i % cols * tw;
      const y = Math.floor(i / cols) * (th + 32);
      c.drawImage(canvas, x, y, tw, th);
      text(c, `${t.toFixed(2)}s`, x + 8, y + th + 23, { size: 16 });
      if (process.argv[4] === "full") writeFileSync(`probe/still_${t}.png`, canvas.toBuffer("image/png"));
    }
    writeFileSync("probe/sheet.png", sheet.toBuffer("image/png"));
    console.log(`Wrote ${times.length} reviewed stills to probe/sheet.png`);
    return;
  }
  mkdirSync("out", { recursive: true });
  const name = process.argv[3] ?? "Logout-Spells-Blinding-Nights-Cinematic-v2-Silent";
  assert(/^[a-zA-Z0-9_-]+$/.test(name), "Invalid output name");
  const path = `out/${name}.mp4`;
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
    "-map", "0:v", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
    "-x264-params", "keyint=120:min-keyint=30", "-movflags", "+faststart",
    "-metadata", "title=Blinding Nights - Cinematic v2 (silent visual master)",
    "-metadata", "comment=171 BPM editorial grid; no recording embedded; audio synchronization pending.",
    "-t", String(END), path,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const exited = once(ff, "close");
  let inputError = null;
  ff.stdin.on("error", (err) => { inputError = err; });
  const frames = Math.ceil(END * FPS);
  const started = Date.now();
  for (let frame = 0; frame < frames; frame++) {
    if (inputError) throw inputError;
    renderFrame(ctx, frame / FPS);
    const rgba = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength))) await once(ff.stdin, "drain");
    if (frame % 180 === 0) console.log(`Rendered ${frame}/${frames} frames (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
  ff.stdin.end();
  const [code] = await exited;
  if (code !== 0) throw new Error(`Encoder exited with ${code}`);
  console.log(`DONE ${path}: ${frames} frames, ${END.toFixed(3)} seconds, ${((Date.now() - started) / 1000).toFixed(1)}s rendering time`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
