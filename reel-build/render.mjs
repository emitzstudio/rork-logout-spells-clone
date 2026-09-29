/**
 * Blinding Nights — Reel v2, cut to "After Hours" (The Weeknd). 1080×1920 / 60 fps.
 * Song section: 2:29 "My darkest hours" → 3:22 (second verse + chorus) = 24 bars at 109 BPM.
 * Every cut sits on a bar downbeat; every headline lands on a beat or a vocal entry.
 * The master is silent: no authorized recording is on hand, so the song is added in
 * Instagram (or embedded later from a user-supplied file) with the vocal "My darkest
 * hours" starting at frame 0.
 * Run from reel-build: node render.mjs check | stills [times] [full] | render [name]
 */
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const W = 1080;
const H = 1920;
const FPS = 60;
const BPM = 109;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
// The lead-in vocal starts about a third of a second before the bar-1 downbeat.
const PICKUP = .30;
const bar = (n) => PICKUP + (n - 1) * BAR;
const at = (n, beats = 0) => bar(n) + beats * BEAT;
// Ends just before the next vocal line ("Never comin' through") so no word is clipped.
const END = 52.5;
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
const progress = (t, from, duration) => clamp((t - from) / duration);
const smooth = (p) => { const x = clamp(p); return x * x * (3 - 2 * x); };
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 4);
const inOut = (p) => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const imagePaths = {
  opening: "../web/public/starboy-weeknd-portrait-v4.jpeg",
  bangkok: "../web/public/starboy-bangkok-night-20260911.jpg",
  museum: "bg/day1.jpg",
  skyline: "bg/day2.jpg",
  concert: "bg/day3.jpg",
  crowd: "../web/public/starboy-concert-20260911.jpg",
  flight: "bg/day4.jpg",
  islands: "bg/day5.jpg",
  atv: "bg/day6.jpg",
  town: "bg/day7.jpg",
  stage: "../web/public/starboy-weeknd-stage-v4.webp",
  mark: "src/logo-mark.png",
};
const images = {};
const LEAKS = { warm: "255,137,62", red: "255,64,58", cool: "150,206,236" };

// Camera values: zoom, normalized horizontal focus, normalized vertical focus, roll.
// Shots run bar-to-bar; the camera keeps moving through the entire hold.
const shot = (from, to, image, cameraA, cameraB, transition = "glide", overlap = .9, leak = null) => ({
  start: from === 1 ? 0 : bar(from), end: to === "end" ? END : bar(to), image, cameraA, cameraB, transition, overlap, leak,
});
const SHOTS = [
  shot(1, 3, "opening", [1.26, .56, .24, -.010], [1.06, .48, .30, .004]),
  shot(3, 5, "bangkok", [1.06, .42, .40, -.006], [1.16, .60, .44, .003], "glide", .95, "warm"),
  shot(5, 7, "museum", [1.03, .34, .56, .003], [1.17, .62, .58, -.004], "push", .80),
  shot(7, 9, "skyline", [1.04, .48, .34, .004], [1.16, .56, .46, -.004], "sweep", .62),
  shot(9, 12, "concert", [1.17, .45, .03, -.008], [1.08, .52, .04, .002], "push", .85, "red"),
  shot(12, 15, "crowd", [1.04, .34, .68, -.009], [1.16, .56, .78, .005], "glide", .90),
  shot(15, 17, "flight", [1.05, .50, .50, .005], [1.18, .63, .42, -.004], "rise", .72),
  shot(17, 19, "islands", [1.06, .42, .47, .003], [1.17, .59, .43, -.004], "push", .85, "cool"),
  shot(19, 21, "atv", [1.03, .60, .55, -.010], [1.17, .69, .47, .006], "sweep", .62),
  shot(21, 23, "town", [1.15, .62, .56, -.003], [1.03, .46, .48, .003], "glide", .90),
  shot(23, "end", "stage", [1.02, .60, .30, .004], [1.12, .57, .26, -.003], "push", 1.0, "warm"),
];

const day = (from, to, number, label, lines, detail, y, extra = {}) => ({
  start: bar(from), end: bar(to), bar: from, type: "day", number, label, lines, detail, y, ...extra,
});
const SEQUENCES = [
  { start: 0, end: bar(3), type: "opening" },
  { start: bar(3), end: bar(5), type: "title" },
  day(5, 7, 1, "SUN 11 OCT · BANGKOK", ["CULTURE BY DAY.", "Chaos by night."], "ART MUSEUM · DRAG SHOW · UNDERGROUND CLUBS", 1180),
  day(7, 9, 2, "MON 12 OCT · BANGKOK", ["SHOP.", "EAT.", "PARTY."], "ICONSIAM · CHINATOWN FOOD CRAWL · ROOFTOP", 1000, { stack: true }),
  day(9, 15, 3, "TUE 13 OCT · CONCERT NIGHT", ["THE WEEKND", "LIVE."], "BANGKOK. ONE UNFORGETTABLE NIGHT.", 390, { hero: true }),
  day(15, 17, 4, "WED 14 OCT · BANGKOK TO PHUKET", ["EXHALE.", "Hello, beaches."], "THAI MASSAGE · FLY TO PHUKET · BEACHSIDE DINNER", 1190),
  day(17, 19, 5, "THU 15 OCT · PHI PHI ISLANDS", ["LESS SIGNAL.", "More paradise."], "ISLAND HOPPING · LONGTAIL BOATS · LUNCH INCLUDED", 1150),
  day(19, 21, 6, "FRI 16 OCT · PHUKET", ["ADVENTURE.", "After-hours."], "ATV · CAFÉ DEL MAR SUNSET · PATONG NIGHT", 1150),
  day(21, 23, 7, "SAT 17 OCT · PHUKET", ["SLOW", "goodbyes."], "OLD TOWN · CAFÉS · ONE LAST WANDER", 1160),
  { start: bar(23), end: END, type: "outro" },
];
const DAYS = SEQUENCES.filter((s) => s.type === "day");

function textWidth(ctx, value, size, font, tracking = 0) {
  ctx.font = `${size}px "${font}"`;
  if (!tracking) return ctx.measureText(value).width;
  return [...value].reduce((w, ch) => w + ctx.measureText(ch).width + tracking, -tracking);
}

function text(ctx, value, x, y, opts = {}) {
  const { font = F.medium, size = 30, tracking = 0, color = C.white, alpha = 1, align = "left", maxWidth = 880, shadow = 0 } = opts;
  if (alpha <= 0) return 0;
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
  if (shadow > 0) {
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = shadow * .25;
  }
  if (finalTracking === 0) ctx.fillText(value, left, y);
  else for (const ch of value) {
    ctx.fillText(ch, left, y);
    left += ctx.measureText(ch).width + finalTracking;
  }
  ctx.restore();
  return width;
}

// Headline reveal: a line mask, a short upward drift and a blur that resolves on the beat.
function titleLine(ctx, value, x, y, t, from, opts = {}) {
  const p = easeOut(progress(t, from, .70));
  if (p <= 0) return;
  const size = opts.size ?? 118;
  ctx.save();
  ctx.beginPath();
  ctx.rect(30, y - size * 1.13, W - 60, size * 1.42);
  ctx.clip();
  if (p < 1) ctx.filter = `blur(${((1 - p) * 7).toFixed(2)}px)`;
  text(ctx, value, x, y + (1 - p) * size * .72, { shadow: 26, ...opts, alpha: p * (opts.alpha ?? 1) });
  ctx.restore();
}

// Small caps label whose letter-spacing settles as it fades in.
function label(ctx, value, x, y, t, from, opts = {}) {
  const p = easeOut(progress(t, from, .55));
  if (p <= 0) return;
  const tracking = opts.tracking ?? 4.5;
  text(ctx, value, x, y, { size: 25, ...opts, tracking: tracking + (1 - p) * 5, alpha: p * (opts.alpha ?? 1) });
}

function shade(ctx, top, bottom, dark, r, g, b, tint) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, `rgba(3,7,10,${top})`);
  gradient.addColorStop(.36, `rgba(3,7,10,${dark})`);
  gradient.addColorStop(.58, `rgba(3,7,10,${Math.max(dark, bottom * .12)})`);
  gradient.addColorStop(.86, `rgba(3,7,10,${bottom})`);
  gradient.addColorStop(1, `rgba(3,7,10,${Math.min(.96, bottom + .10)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  if (tint > .002) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${tint})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function drawPhoto(ctx, img, zoom, fx, fy, roll = 0, panX = 0, panY = 0) {
  const base = Math.max(W / img.width, H / img.height);
  const scale = base * Math.max(1.025, zoom);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (W - width) * clamp(fx) + panX;
  const y = (H - height) * clamp(fy) + panY;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(roll);
  ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}

// A soft zoom kick on beats one and three, so the whole frame breathes with the track.
function pulse(t) {
  const beats = (t - PICKUP) / BEAT;
  if (beats < 0) return 0;
  const index = Math.floor(beats);
  const strength = index % 4 === 0 ? .009 : index % 4 === 2 ? .0045 : 0;
  const phase = (beats - index) * BEAT;
  return strength * Math.min(1, phase / .05) * Math.exp(-phase * 6.5);
}

const sceneA = createCanvas(W, H);
const sceneB = createCanvas(W, H);
const sceneAX = sceneA.getContext("2d");
const sceneBX = sceneB.getContext("2d");

function drawShot(ctx, current, t, extraZoom = 0, panX = 0, panY = 0) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = "#090B0C";
  ctx.fillRect(0, 0, W, H);
  const raw = clamp((t - current.start + .45) / (current.end - current.start + .9));
  // Linear drift under an eased move prevents the camera stopping at every cut.
  const p = .60 * raw + .40 * smooth(raw);
  const camera = current.cameraA.map((v, i) => lerp(v, current.cameraB[i], p));
  drawPhoto(ctx, images[current.image], camera[0] + extraZoom + pulse(t), camera[1], camera[2], camera[3], panX, panY);
  ctx.fillStyle = "rgba(18,8,2,0.035)";
  ctx.fillRect(0, 0, W, H);
}

function composite(ctx, canvas, alpha, blur = 0) {
  if (alpha < .001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur > .3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  const border = blur * 1.6;
  ctx.drawImage(canvas, -border, -border, W + border * 2, H + border * 2);
  ctx.restore();
}

function lightLeak(ctx, p, rgb) {
  const envelope = Math.pow(Math.sin(Math.PI * clamp(p)), 4) * .17;
  if (envelope < .001) return;
  const x = W * lerp(-.30, 1.30, p);
  const gradient = ctx.createRadialGradient(x, H * .38, 2, x, H * .38, 770);
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
    const rise = incoming.transition === "rise";
    const magnify = push ? .13 * inOut(p) : sweep || rise ? .07 * arc : .012 * arc;
    const dx = sweep ? 34 : 0;
    const dy = rise ? 48 : 0;
    drawShot(sceneAX, outgoing, t, magnify, -dx * inOut(p), -dy * inOut(p));
    drawShot(sceneBX, incoming, t, push ? .13 * (1 - inOut(p)) : sweep || rise ? .07 * arc : 0, dx * (1 - inOut(p)), dy * (1 - inOut(p)));
    const blur = (sweep || rise ? 9 : push ? 5 : 1.2) * arc * arc;
    composite(ctx, sceneA, 1, blur);
    composite(ctx, sceneB, mix, blur);
    if (incoming.leak) lightLeak(ctx, p, LEAKS[incoming.leak]);
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

// Persistent day counter: the numeral rolls like an odometer on every day change.
function dayCounter(ctx, t) {
  const first = DAYS[0];
  const last = DAYS.at(-1);
  const alpha = smooth(progress(t, first.start - .40, .40)) * (1 - smooth(progress(t, last.end - .34, .34)));
  if (alpha <= 0) return;
  let index = DAYS.findIndex((s) => t < s.end);
  if (index < 0) index = DAYS.length - 1;
  // The roll starts just ahead of the downbeat so the new number is legible on the beat.
  const roll = inOut(progress(t, DAYS[index].start - .18, .50));
  const right = W - 80;
  const baseline = 322;
  const travel = 104;
  const numeral = (i) => String(DAYS[i].number).padStart(2, "0");
  ctx.save();
  ctx.globalAlpha *= alpha;
  text(ctx, "DAY", right - 2, 228, { size: 20, tracking: 6, color: C.gold, align: "right" });
  ctx.beginPath();
  ctx.rect(right - 220, baseline - 96, 232, 116);
  ctx.clip();
  if (index > 0 && roll < 1) {
    text(ctx, numeral(index - 1), right, baseline - roll * travel, { font: F.bold, size: 88, align: "right", alpha: 1 - roll });
  }
  text(ctx, numeral(index), right, baseline + (1 - roll) * travel, { font: F.bold, size: 88, align: "right", alpha: roll });
  ctx.restore();
}

function opening(ctx, t) {
  brand(ctx, .92);
  const alpha = 1 - smooth(progress(t, bar(3) - .32, .32));
  ctx.save();
  ctx.globalAlpha = alpha;
  label(ctx, "THIS OCTOBER,", 80, 1203, t, at(1), { size: 26, tracking: 7, color: C.gold });
  titleLine(ctx, "THE WEEKND.", 74, 1333, t, at(1), { font: F.bold, size: 116, maxWidth: 880 });
  titleLine(ctx, "You. Bangkok.", 79, 1453, t, at(2), { font: F.serif, size: 118, maxWidth: 865 });
  ctx.restore();
}

function mainTitle(ctx, t) {
  brand(ctx);
  label(ctx, "NOT JUST A CONCERT. A WHOLE SPELL.", 80, 954, t, at(3), { size: 22, tracking: 5, color: C.gold });
  titleLine(ctx, "BLINDING", 73, 1090, t, at(3), { font: F.bold, size: 161, maxWidth: 880 });
  titleLine(ctx, "Nights.", 74, 1258, t, at(3, 2), { font: F.serif, size: 204, maxWidth: 890 });
  label(ctx, "BANGKOK  /  PHUKET", 80, 1370, t, at(4), { size: 30, tracking: 6 });
  label(ctx, "7 DAYS. 2 CITIES. 1 CONCERT.", 80, 1422, t, at(4, 2), { size: 22, tracking: 4, color: C.muted });
}

function dayTypography(ctx, s, t) {
  const out = 1 - smooth(progress(t, s.end - .32, .30));
  brand(ctx, s.hero ? .82 : .78);
  ctx.save();
  ctx.globalAlpha = out;
  const b = s.bar;
  if (s.stack) {
    label(ctx, s.label, 80, s.y - 78, t, at(b));
    s.lines.forEach((line, i) => titleLine(ctx, line, 73, s.y + i * 146, t, at(b, i), {
      font: i === 2 ? F.serif : F.bold, size: i === 2 ? 184 : 157, color: i === 2 ? C.orange : C.white,
    }));
    label(ctx, s.detail, 80, s.y + 372, t, at(b + 1), { size: 23, tracking: 3.1 });
  } else if (s.hero) {
    const second = bar(12);
    const firstOut = 1 - smooth(progress(t, second - .34, .30));
    ctx.save();
    ctx.globalAlpha *= firstOut;
    label(ctx, s.label, 80, 325, t, at(b), { color: C.gold });
    titleLine(ctx, s.lines[0], 72, 449, t, at(b), { font: F.bold, size: 124, maxWidth: 880 });
    titleLine(ctx, s.lines[1], 76, 586, t, at(b, 1), { font: F.serif, size: 166, color: C.gold });
    label(ctx, s.detail, 81, 649, t, at(b + 1), { size: 22, tracking: 4 });
    ctx.restore();
    titleLine(ctx, "ONE NIGHT.", 78, 1224, t, at(12), { font: F.bold, size: 118 });
    titleLine(ctx, "All the feels.", 80, 1350, t, at(12, 2), { font: F.serif, size: 146 });
    label(ctx, "SING EVERY WORD. WITH YOUR PEOPLE.", 81, 1422, t, at(14), { size: 22, tracking: 4, color: C.muted });
  } else {
    label(ctx, s.label, 80, s.y - 78, t, at(b));
    titleLine(ctx, s.lines[0], 76, s.y + 24, t, at(b), { font: F.bold, size: 111, maxWidth: 870 });
    titleLine(ctx, s.lines[1], 78, s.y + 146, t, at(b + 1), { font: F.serif, size: 139, maxWidth: 870 });
    label(ctx, s.detail, 81, s.y + 222, t, at(b, 3), { size: 24, tracking: 2.5, color: C.muted, maxWidth: 870 });
  }
  ctx.restore();
}

function outro(ctx, t) {
  const show = easeOut(progress(t, at(23) - .10, .60));
  ctx.save();
  ctx.globalAlpha = show;
  ctx.drawImage(images.mark, 448, 354, 184, 184);
  text(ctx, "Logout", 540, 603, { font: F.serif, size: 92, align: "center" });
  text(ctx, "S P E L L S", 543, 645, { size: 22, tracking: 4, align: "center" });
  titleLine(ctx, "BLINDING", 540, 910, t, at(23), { font: F.bold, size: 151, align: "center", maxWidth: 865 });
  titleLine(ctx, "Nights.", 540, 1086, t, at(23, 1), { font: F.serif, size: 208, align: "center" });
  label(ctx, "11–17 OCTOBER 2026", 540, 1181, t, at(23, 2), { size: 32, tracking: 5, align: "center", color: C.gold });
  label(ctx, "BANGKOK  /  PHUKET", 540, 1235, t, at(23, 3), { size: 27, tracking: 5, align: "center" });
  titleLine(ctx, "MAKE THIS YOUR WEEK.", 540, 1380, t, at(24), { font: F.bold, size: 39, tracking: 2, align: "center" });
  label(ctx, "logoutspells.com", 540, 1455, t, at(24, 1), { size: 32, tracking: 2, align: "center", color: C.muted });
  ctx.restore();
}

// Grade per sequence: top, bottom and mid darkness plus a soft-light tint (r, g, b, alpha).
function grade(seq) {
  if (seq.type === "opening") return [.40, .78, .02, 150, 20, 40, .16];
  if (seq.type === "title") return [.42, .80, .16, 150, 20, 40, .16];
  if (seq.type === "outro") return [.70, .86, .55, 150, 20, 40, .22];
  if (seq.hero) return [.62, .32, .02, 170, 20, 30, .14];
  if (seq.number === 4 || seq.number === 5) return [.26, .84, .0, 150, 20, 40, 0];
  if (seq.number >= 6) return [.26, .84, .0, 200, 90, 30, .10];
  return [.26, .84, .0, 150, 20, 40, .08];
}

function renderGrade(ctx, t) {
  const boundary = SEQUENCES.findIndex((s, i) => i > 0 && Math.abs(t - s.start) < .40);
  if (boundary > 0) {
    const p = smooth(progress(t, SEQUENCES[boundary].start - .40, .80));
    const a = grade(SEQUENCES[boundary - 1]);
    const b = grade(SEQUENCES[boundary]);
    shade(ctx, ...a.map((v, i) => lerp(v, b[i], p)));
  } else shade(ctx, ...grade(SEQUENCES.find((s) => t >= s.start && t < s.end) ?? SEQUENCES.at(-1)));
}

// Pre-rendered film grain tiles; cycling them costs one blended draw per frame.
const GRAIN = Array.from({ length: 5 }, () => {
  const canvas = createCanvas(W, H);
  const context = canvas.getContext("2d");
  const data = context.createImageData(W, H);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    px[i] = v; px[i + 1] = v; px[i + 2] = v; px[i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  return canvas;
});

function renderFrame(ctx, t, frame = Math.round(t * FPS)) {
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
  else if (seq.type === "title") {
    ctx.save();
    ctx.globalAlpha = smooth(progress(t, seq.start - .01, .25)) * (1 - smooth(progress(t, seq.end - .30, .30)));
    mainTitle(ctx, t);
    ctx.restore();
  } else outro(ctx, t);
  dayCounter(ctx, t);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = .075;
  ctx.drawImage(GRAIN[frame % GRAIN.length], 0, 0);
  ctx.restore();
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
      if (i > 0 && item.image) assert(Math.abs(((item.start - PICKUP) / BAR) % 1) < 1e-9, "Cuts must sit on bar downbeats");
      if (item.image) {
        assert(images[item.image], `Missing image ${item.image}`);
        assert(item.overlap < item.end - item.start);
        assert(item.cameraA[0] >= 1 && item.cameraB[0] >= 1);
        if (item.leak) assert(LEAKS[item.leak]);
      }
    }
  }
  assert.notEqual(SHOTS[0].image, SHOTS.find((s) => s.start === bar(9)).image);
  assert.equal(DAYS.length, 7);
  assert.deepEqual(DAYS.map((s) => s.number), [1, 2, 3, 4, 5, 6, 7]);
  assert(bar(25) > END && bar(24) < END, "Video must end inside the final bar");
  assert.equal(Math.round(END * FPS), END * FPS, "Duration must be a whole number of frames");
  console.log(`Validated gapless ${END.toFixed(3)}s / ${SHOTS.length} shots / ${DAYS.length} days / ${BPM} BPM grid, bar 1 at ${PICKUP}s / silent master`);
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
    const times = (process.argv[3] ?? "0.2,1.7,3.3,4.7,6.2,8.3,9.4,10.9,12.6,13.7,15.4,17.9,19.2,21.6,24.6,27.0,29.6,31.4,33.9,35.6,38.0,40.3,42.7,44.7,47.1,49.0,51.1,52.3")
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
  const name = process.argv[3] ?? "Logout-Spells-Blinding-Nights-Reel-v2-After-Hours-Silent";
  assert(/^[a-zA-Z0-9_-]+$/.test(name), "Invalid output name");
  const path = `out/${name}.mp4`;
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
    "-map", "0:v", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
    "-x264-params", "keyint=120:min-keyint=30", "-movflags", "+faststart",
    "-metadata", "title=Blinding Nights - Reel v2 (After Hours cut, silent visual master)",
    "-metadata", `comment=Cut to The Weeknd - After Hours 2:29-3:22 on a ${BPM} BPM grid; start the song at the vocal 'My darkest hours' on frame 0. No recording embedded.`,
    "-t", String(END), path,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const exited = once(ff, "close");
  let inputError = null;
  ff.stdin.on("error", (err) => { inputError = err; });
  const frames = Math.round(END * FPS);
  const started = Date.now();
  for (let frame = 0; frame < frames; frame++) {
    if (inputError) throw inputError;
    renderFrame(ctx, frame / FPS, frame);
    const rgba = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength))) await once(ff.stdin, "drain");
    if (frame % 300 === 0) console.log(`Rendered ${frame}/${frames} frames (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
  ff.stdin.end();
  const [code] = await exited;
  if (code !== 0) throw new Error(`Encoder exited with ${code}`);
  console.log(`DONE ${path}: ${frames} frames, ${END.toFixed(3)} seconds, ${((Date.now() - started) / 1000).toFixed(1)}s rendering time`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
