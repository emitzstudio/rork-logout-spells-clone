/**
 * Logout Spells — "Blinding Nights" 7-day reel renderer.
 * Renders 1080x1920 @ 30fps frames with @napi-rs/canvas and pipes them to ffmpeg.
 *
 *   node render.mjs stills 1,3.5,4.4      -> probe/still_*.png + probe/sheet.png
 *   node render.mjs render                -> out/<name>.mp4 (muxed with audio/track_a.mp3)
 */
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const W = 1080;
const H = 1920;
const FPS = 30;
const END = 36.5;
const OUT_NAME = process.argv[3] && process.argv[2] === "render" ? process.argv[3] : "Logout-Spells-Blinding-Nights-Reel";

const F = {
  EB: "PoppinsEB",
  B: "PoppinsB",
  SB: "PoppinsSB",
  M: "PoppinsM",
  L: "PoppinsL",
  XL: "PoppinsXL",
  SERIF: "CormorantSB",
  COND: "BarlowCond",
  SYM: "DejaVu",
};
GlobalFonts.registerFromPath("fonts/Poppins-ExtraBold.ttf", F.EB);
GlobalFonts.registerFromPath("fonts/Poppins-Bold.ttf", F.B);
GlobalFonts.registerFromPath("fonts/Poppins-SemiBold.ttf", F.SB);
GlobalFonts.registerFromPath("fonts/Poppins-Medium.ttf", F.M);
GlobalFonts.registerFromPath("fonts/Poppins-Light.ttf", F.L);
GlobalFonts.registerFromPath("fonts/Poppins-ExtraLight.ttf", F.XL);
GlobalFonts.registerFromPath("fonts/cormorant-garamond-v21-latin_latin-ext-600.ttf", F.SERIF);
GlobalFonts.registerFromPath("fonts/BarlowCondensed-Bold.ttf", F.COND);
GlobalFonts.registerFromPath("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", F.SYM);

const ORANGE = "#E3492F";
const GOLD = "#E8B842";
const LIGHT = "#DADADA";

const INTRO_END = 8.56;
const OUTRO_START = 32.56;

const DAYS = [
  {
    n: 1, start: 8.56, end: 12.56, city: "BANGKOK", accent: ORANGE, dim: 0.34,
    head: [["ARRIVAL", F.EB, "#FFFFFF"], ["ART + NIGHTLIFE", F.XL, LIGHT]],
    sub: ["ART MUSEUM  |  DRAG SHOW  |  UNDERGROUND BANGKOK"],
    chips: ["MUSEUM", "DRAG SHOW", "NIGHTLIFE"],
    foot: ["CULTURE BY DAY", "CHAOS BY NIGHT"],
  },
  {
    n: 2, start: 12.56, end: 16.56, city: "BANGKOK", accent: ORANGE, riser: true,
    head: [["SHOP.", F.EB, "#FFFFFF"], ["EAT.", F.EB, "#FFFFFF"], ["PARTY.", F.XL, ORANGE]],
    sub: ["ICONSIAM  |  CHINATOWN  |  ROOFTOP  |  NIGHTLIFE"],
    chips: ["ICONSIAM", "CHINATOWN FOOD", "ROOFTOP"],
    foot: ["GOOD FOOD", "BEAUTIFUL CITY"],
  },
  {
    n: 3, start: 16.56, end: 20.56, city: "BANGKOK", accent: ORANGE, hero: true,
    head: [["THE WEEKND", F.EB, "#FFFFFF"], ["LIVE", F.XL, ORANGE]],
    sub: ["CONCERT NIGHT.", "BANGKOK"],
    chips: ["THE STAGE", "THE CROWD", "THE WEEKND"],
    foot: ["CONCERT NIGHT", "UNFORGETTABLE"],
  },
  {
    n: 4, start: 20.56, end: 23.56, city: "BANGKOK ✈ PHUKET", accent: ORANGE, dim: 0.2,
    head: [["SPA DAY.", F.EB, "#FFFFFF"], ["HELLO", F.XL, LIGHT], ["BEACHES.", F.XL, LIGHT]],
    sub: ["THAI MASSAGE", "FLY TO PHUKET"],
    chips: ["THAI MASSAGE", "FLY TO PHUKET", "BEACHSIDE DINNER"],
    foot: ["GOOD THINGS", "TRAVEL WITH YOU"],
  },
  {
    n: 5, start: 23.56, end: 26.56, city: "PHI PHI ISLAND", accent: "#F2FBF8", dim: 0.26,
    head: [["PHI PHI", F.EB, "#FFFFFF"], ["ISLAND HOPPING", F.XL, "#E6F4F0"]],
    sub: ["BOAT RIDES", "SWIMMING", "BEACH STOP", "TURQUOISE WATER"],
    chips: ["BOAT RIDES", "SWIMMING", "BEACH STOP"],
    foot: ["CLEARER WATER", "HAPPIER DAYS"],
  },
  {
    n: 6, start: 26.56, end: 29.56, city: "PHUKET", accent: "#CFCFCF", dim: 0.12,
    head: [["ADVENTURE", F.EB, "#FFFFFF"], ["+ CHAOS", F.XL, LIGHT]],
    sub: ["ATV RIDE", "CAFÉ DEL MAR", "SUNSET DRINKS", "PATONG NIGHTLIFE"],
    chips: ["ATV RIDE", "PATONG NIGHTLIFE", "CAFÉ DEL MAR"],
    foot: ["BREATHTAKING", "ATV ADVENTURES"],
  },
  {
    n: 7, start: 29.56, end: 32.56, city: "PHUKET", accent: "#D3E0E6", last: true, dim: 0.34,
    head: [["SLOW", F.EB, "#FFFFFF"], ["GOODBYES.", F.XL, LIGHT]],
    sub: ["OLD TOWN MARKET", "CAFÉS", "SHOPPING", "AIRPORT"],
    chips: ["OLD TOWN MARKET", "CAFÉS", "AIRPORT"],
    foot: ["7 DAYS  |  2 CITIES", "TOO MANY MEMORIES"],
  },
];

// ---------- audio analysis (kicks + loudness envelope) ----------
const ANALYSIS = JSON.parse(readFileSync("audio/track_a.analysis.json", "utf8"));
const KICKS = ANALYSIS.kicks.filter((k) => k.s >= 20);
const ENV_MAX = Math.max(...ANALYSIS.env);
const kickAt = (t) => {
  let v = 0;
  for (const k of KICKS) {
    const dt = t - k.t;
    if (dt < 0 || dt > 0.45) continue;
    v = Math.max(v, Math.min(1, k.s / 190) * Math.exp(-dt / 0.09));
  }
  return v;
};
const envAt = (t) => {
  const i = Math.round(t * 30);
  return Math.min(1, (ANALYSIS.env[i] ?? 0) / ENV_MAX);
};

// ---------- easing ----------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const P = (t, start, dur) => clamp01((t - start) / dur);
const outExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const outCubic = (p) => 1 - Math.pow(1 - p, 3);
const outBack = (p) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const decay = (t, at, life) => (t < at ? 0 : Math.exp(-(t - at) / life));

// ---------- text ----------
const SYMS = new Set(["✈", "→"]);
const setFont = (ctx, fam, size) => {
  ctx.font = `${size}px "${fam}"`;
};
function measureText(ctx, text, fam, size, tracking = 0) {
  if (tracking === 0 && ![...text].some((c) => SYMS.has(c))) {
    setFont(ctx, fam, size);
    return ctx.measureText(text).width;
  }
  let w = 0;
  for (const ch of text) {
    const sym = SYMS.has(ch);
    setFont(ctx, sym ? F.SYM : fam, sym ? size * 0.92 : size);
    w += ctx.measureText(ch).width + tracking;
  }
  return w - tracking;
}
/** Draws text with optional letter tracking; symbol glyphs fall back to DejaVu. Returns width. */
function drawText(ctx, text, x, y, o) {
  const { fam, size, tracking = 0, color = "#FFFFFF", align = "left", alpha = 1, shadow = 0 } = o;
  const w = measureText(ctx, text, fam, size, tracking);
  let cx = align === "left" ? x : align === "right" ? x - w : x - w / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  if (shadow > 0) {
    ctx.shadowColor = `rgba(0,0,0,${shadow})`;
    ctx.shadowBlur = Math.max(10, size * 0.22);
    ctx.shadowOffsetY = Math.max(2, size * 0.04);
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (tracking === 0 && ![...text].some((c) => SYMS.has(c))) {
    setFont(ctx, fam, size);
    ctx.fillText(text, cx, y);
  } else {
    for (const ch of text) {
      const sym = SYMS.has(ch);
      setFont(ctx, sym ? F.SYM : fam, sym ? size * 0.92 : size);
      ctx.fillText(ch, cx, sym ? y - size * 0.02 : y);
      cx += ctx.measureText(ch).width + tracking;
    }
  }
  ctx.restore();
  return w;
}

// ---------- drawing helpers ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawCover(ctx, img, dx, dy, dw, dh, zoom = 1, fx = 0.5, fy = 0.5) {
  const ir = img.width / img.height;
  const r = dw / dh;
  let sw;
  let sh;
  if (ir > r) {
    sh = img.height;
    sw = sh * r;
  } else {
    sw = img.width;
    sh = sw / r;
  }
  sw /= zoom;
  sh /= zoom;
  const sx = (img.width - sw) * fx;
  const sy = (img.height - sh) * fy;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
function fillFlash(ctx, alpha, color = "#FFFFFF") {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function tintWhite(img) {
  const c = createCanvas(img.width, img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = "#FFFFFF";
  x.fillRect(0, 0, img.width, img.height);
  return c;
}
function buildShade() {
  const c = createCanvas(W, H);
  const x = c.getContext("2d");
  const top = x.createLinearGradient(0, 0, 0, 640);
  top.addColorStop(0, "rgba(0,0,0,0.62)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = top;
  x.fillRect(0, 0, W, 640);
  const bot = x.createLinearGradient(0, 880, 0, H);
  bot.addColorStop(0, "rgba(0,0,0,0)");
  bot.addColorStop(0.45, "rgba(0,0,0,0.42)");
  bot.addColorStop(1, "rgba(0,0,0,0.9)");
  x.fillStyle = bot;
  x.fillRect(0, 880, W, H - 880);
  const vig = x.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.38)");
  x.fillStyle = vig;
  x.fillRect(0, 0, W, H);
  return c;
}
function buildGrain(seed) {
  const c = createCanvas(W, H);
  const x = c.getContext("2d");
  const id = x.createImageData(W, H);
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 90 + Math.floor(rnd() * 76);
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  return c;
}

// ---------- assets ----------
const IMG = { bg: [], chips: [], markGold: null, markWhite: null };
let SHADE;
let GRAIN;
async function loadAll() {
  for (const d of DAYS) {
    IMG.bg.push(await loadImage(`bg/day${d.n}.jpg`));
    const row = [];
    for (let i = 1; i <= 3; i++) row.push(await loadImage(`chips/d${d.n}_${i}.png`));
    IMG.chips.push(row);
  }
  IMG.markGold = await loadImage("src/logo-mark.png");
  IMG.markWhite = tintWhite(IMG.markGold);
  SHADE = buildShade();
  GRAIN = [buildGrain(7), buildGrain(99), buildGrain(1234)];
}

// ---------- shared pieces ----------
function drawWordmark(ctx, cx, topY, markSize, serifSize, alpha, gold = true) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const mark = gold ? IMG.markGold : IMG.markWhite;
  ctx.drawImage(mark, cx - markSize / 2, topY, markSize, markSize);
  const y1 = topY + markSize + serifSize * 0.78;
  drawText(ctx, "Logout", cx, y1, { fam: F.SERIF, size: serifSize, align: "center", color: "#FFFFFF" });
  drawText(ctx, "SPELLS", cx + serifSize * 0.06, y1 + serifSize * 0.42, {
    fam: F.M, size: serifSize * 0.27, tracking: serifSize * 0.14, align: "center", color: "#F1F1F1",
  });
  ctx.restore();
}
function drawGrain(ctx, t, alpha = 0.04) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0);
  ctx.restore();
}

// ---------- INTRO 0 → 8.56 ----------
function renderIntro(ctx, t) {
  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, W, H);

  const bgA = 0.6 * outCubic(P(t, 4.05, 0.5));
  if (bgA > 0) {
    ctx.save();
    ctx.globalAlpha = bgA;
    drawCover(ctx, IMG.bg[2], 0, 0, W, H, 1.28 - 0.14 * P(t, 4.05, 4.5) + 0.01 * kickAt(t), 0.5, 0.3);
    ctx.restore();
    ctx.drawImage(SHADE, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, W, H);
  }

  const move = outExpo(P(t, 3.06, 0.6));
  const markS = 300 - 108 * move;
  const markTop = 560 - 210 * move;
  const glowA = 0.42 * outCubic(P(t, 0.35, 1.1)) * (0.6 + 0.9 * envAt(t)) * (1 - 0.45 * move);
  if (glowA > 0) {
    const gcx = W / 2;
    const gcy = markTop + markS / 2;
    const g = ctx.createRadialGradient(gcx, gcy, 10, gcx, gcy, 620 - 200 * move);
    g.addColorStop(0, `rgba(232,184,66,${glowA})`);
    g.addColorStop(0.5, `rgba(232,184,66,${glowA * 0.25})`);
    g.addColorStop(1, "rgba(232,184,66,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const markA = outCubic(P(t, 0.35, 1.0));
  const wordA = outCubic(P(t, 1.62, 0.5));
  if (markA > 0) {
    ctx.save();
    ctx.globalAlpha = markA;
    const pop = 0.9 + 0.1 * outExpo(P(t, 0.35, 1.2));
    const s = markS * pop;
    ctx.drawImage(IMG.markGold, W / 2 - s / 2, markTop + (markS - s) / 2, s, s);
    ctx.restore();
  }
  if (wordA > 0) {
    ctx.save();
    ctx.globalAlpha = wordA;
    const serif = 124 - 40 * move;
    const y1 = markTop + markS + serif * 0.85 + (1 - wordA) * 30;
    drawText(ctx, "Logout", W / 2, y1, { fam: F.SERIF, size: serif, align: "center" });
    drawText(ctx, "SPELLS", W / 2 + 4, y1 + serif * 0.45, {
      fam: F.M, size: serif * 0.27, tracking: serif * 0.16, align: "center", color: "#F1F1F1",
    });
    ctx.restore();
  }

  // Title slams
  const a1 = P(t, 4.05, 0.3);
  if (a1 > 0) {
    const sc = 1.28 - 0.28 * outExpo(a1);
    ctx.save();
    ctx.globalAlpha = outCubic(P(t, 4.05, 0.12));
    ctx.translate(W / 2, 930);
    ctx.scale(sc, sc);
    drawText(ctx, "BLINDING", 0, 0, { fam: F.EB, size: 176, align: "center" });
    ctx.restore();
  }
  const a2 = P(t, 4.33, 0.3);
  if (a2 > 0) {
    const sc = 1.28 - 0.28 * outExpo(a2);
    ctx.save();
    ctx.globalAlpha = outCubic(P(t, 4.33, 0.12));
    ctx.translate(W / 2, 1090);
    ctx.scale(sc, sc);
    drawText(ctx, "NIGHTS", 0, 0, { fam: F.XL, size: 176, align: "center", color: LIGHT });
    ctx.restore();
  }
  const l1 = outExpo(P(t, 5.33, 0.5));
  if (l1 > 0) {
    drawText(ctx, "BANGKOK ✈ PHUKET   ·   9–15 OCT 2026", W / 2, 1200 + (1 - l1) * 40, {
      fam: F.M, size: 31, tracking: 8, align: "center", color: "#F2F2F2", alpha: l1,
    });
  }
  const l2 = outExpo(P(t, 7.07, 0.5));
  if (l2 > 0) {
    drawText(ctx, "7 DAYS   ·   2 CITIES   ·   1 CONCERT", W / 2, 1268 + (1 - l2) * 40, {
      fam: F.SB, size: 31, tracking: 8, align: "center", color: ORANGE, alpha: l2,
    });
  }
  drawGrain(ctx, t, 0.05);
  fillFlash(ctx, 0.55 * decay(t, 4.05, 0.07) + 0.45 * decay(t, 4.33, 0.07));
}

// ---------- DAY CARD ----------
function drawProgress(ctx, idx, frac, alpha) {
  const gap = 8;
  const total = W - 120;
  const segW = (total - gap * 6) / 7;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * (segW + gap);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    rr(ctx, x, 232, segW, 4, 2);
    ctx.fill();
    const f = i < idx ? 1 : i === idx ? frac : 0;
    if (f > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      rr(ctx, x, 232, Math.max(4, segW * f), 4, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function renderDay(ctx, t, d, idx) {
  const lt = t - d.start;
  const dur = d.end - d.start;
  const bg = IMG.bg[idx];
  const kick = kickAt(t);

  const punch = outExpo(P(lt, 0, d.hero ? 0.55 : 0.75));
  let zoom = (d.hero ? 1.22 : 1.13) - (d.hero ? 0.22 : 0.13) * punch + 0.05 * (lt / dur) + 0.014 * kick;
  const riser = d.riser ? outCubic(P(lt, dur - 1.0, 1.0)) : 0;
  zoom += 0.14 * riser;
  const fx = 0.5 + 0.035 * (lt / dur) * (idx % 2 ? -1 : 1);
  drawCover(ctx, bg, 0, 0, W, H, zoom, fx, 0.5);
  ctx.drawImage(SHADE, 0, 0);
  if (d.dim) {
    const dg = ctx.createLinearGradient(0, 0, 0, H);
    dg.addColorStop(0, `rgba(0,0,0,${d.dim})`);
    dg.addColorStop(0.5, `rgba(0,0,0,${d.dim * 0.85})`);
    dg.addColorStop(0.74, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, W, H);
  }
  if (riser > 0) fillFlash(ctx, 0.6 * riser, "#000000");

  const uiA = outCubic(P(lt, 0.05, 0.35));
  drawProgress(ctx, idx, clamp01(lt / dur), uiA);

  // Top-left labels
  const lab = outExpo(P(lt, 0.05, 0.45));
  drawText(ctx, `DAY 0${d.n}`, 60 - (1 - lab) * 24, 300, {
    fam: F.SB, size: 27, tracking: 9, color: d.accent, alpha: lab, shadow: 0.5,
  });
  drawText(ctx, d.city, 60 - (1 - lab) * 24, 348, {
    fam: F.M, size: 33, tracking: 10, color: "#FFFFFF", alpha: lab, shadow: 0.5,
  });

  // Top-right wordmark
  ctx.save();
  ctx.globalAlpha = uiA;
  const serif = 44;
  const ww = measureText(ctx, "Logout", F.SERIF, serif);
  drawText(ctx, "Logout", W - 60, 312, { fam: F.SERIF, size: serif, align: "right" });
  drawText(ctx, "SPELLS", W - 60 - ww / 2 + 2, 340, { fam: F.M, size: 13, tracking: 6, align: "center", color: "#F1F1F1" });
  ctx.drawImage(IMG.markWhite, W - 60 - ww - 78, 268, 66, 66);
  ctx.restore();

  // Headline
  const baseSize = d.head.length <= 2 ? 138 : 118;
  let maxW = 0;
  for (const [txt, fam] of d.head) maxW = Math.max(maxW, measureText(ctx, txt, fam, baseSize));
  const size = Math.min(baseSize, baseSize * (958 / maxW));
  const lineH = size * 1.0;
  const headTop = 432;
  d.head.forEach(([txt, fam, color], i) => {
    const st = i * 0.11;
    const p = P(lt, st, 0.55);
    if (p <= 0) return;
    const y = headTop + size * 0.84 + i * lineH;
    ctx.save();
    ctx.globalAlpha = outCubic(P(lt, st, 0.25));
    if (d.hero) {
      const sc = 1.16 - 0.16 * outExpo(p);
      ctx.translate(60, y);
      ctx.scale(sc, sc);
      drawText(ctx, txt, 0, 0, { fam, size, color, shadow: 0.5 });
    } else {
      drawText(ctx, txt, 60, y + (1 - outExpo(p)) * 72, { fam, size, color, shadow: 0.5 });
    }
    ctx.restore();
  });
  const headBottom = headTop + (d.head.length - 1) * lineH + size * 1.02;

  // Sub lines (auto-fit to the 960px column)
  d.sub.forEach((line, i) => {
    const st = 0.42 + i * 0.09;
    const p = outExpo(P(lt, st, 0.5));
    if (p <= 0) return;
    let subSize = 26;
    let subTrack = 6;
    const lw = measureText(ctx, line, F.M, subSize, subTrack);
    if (lw > 956) {
      const k = 956 / lw;
      subSize = Math.floor(subSize * k * 10) / 10;
      subTrack *= k;
    }
    drawText(ctx, line, 62, headBottom + 62 + i * 42 + (1 - p) * 30, {
      fam: F.M, size: subSize, tracking: subTrack, color: "#ECECEC", alpha: p * 0.95, shadow: 0.6,
    });
  });

  // Chips
  const cy = 1118;
  const ch = 300;
  const gap = 16;
  const cw = (W - 120 - gap * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const ct = 1.0 + i * 0.5;
    const p = P(lt, ct, 0.42);
    if (p <= 0) continue;
    const eb = outBack(p);
    const a = outCubic(P(lt, ct, 0.18));
    const x = 60 + i * (cw + gap);
    const y = cy + (1 - eb) * 56;
    const sc = 0.84 + 0.16 * eb;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x + cw / 2, y + ch / 2);
    ctx.scale(sc, sc);
    ctx.translate(-(x + cw / 2), -(y + ch / 2));
    rr(ctx, x, y, cw, ch, 24);
    ctx.save();
    ctx.clip();
    drawCover(ctx, IMG.chips[idx][i], x, y, cw, ch, 1.0 + 0.06 * clamp01((lt - ct) / 3));
    const g = ctx.createLinearGradient(0, y + ch * 0.45, 0, y + ch);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y + ch * 0.45, cw, ch * 0.55);
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    rr(ctx, x + 1, y + 1, cw - 2, ch - 2, 23);
    ctx.stroke();
    const numW = measureText(ctx, `0${i + 1}`, F.M, 20, 2);
    const avail = cw - 44 - numW - 16;
    let capSize = 20;
    let capTrack = 3.5;
    const capW = measureText(ctx, d.chips[i], F.M, capSize, capTrack);
    if (capW > avail) {
      const k = avail / capW;
      capSize = Math.max(14, Math.floor(capSize * k * 10) / 10);
      capTrack = Math.max(1.2, capTrack * k);
    }
    drawText(ctx, d.chips[i], x + 22, y + ch - 24, { fam: F.M, size: capSize, tracking: capTrack, color: "#FFFFFF" });
    drawText(ctx, `0${i + 1}`, x + cw - 22, y + ch - 24, { fam: F.M, size: 20, tracking: 2, align: "right", color: "#FFFFFF" });
    ctx.restore();
  }

  // Footer caption + rule
  const ft = dur >= 4 ? 2.05 : 1.55;
  const fp = outExpo(P(lt, ft, 0.55));
  if (fp > 0) {
    drawText(ctx, d.foot[0], 60 - (1 - fp) * 50, 1520, { fam: F.M, size: 24, tracking: 8, color: "#F4F4F4", alpha: fp, shadow: 0.5 });
    drawText(ctx, d.foot[1], 60 - (1 - fp) * 50, 1562, { fam: F.M, size: 24, tracking: 8, color: "#F4F4F4", alpha: fp * 0.9, shadow: 0.5 });
    ctx.save();
    ctx.globalAlpha = fp;
    ctx.fillStyle = d.accent;
    ctx.fillRect(610, 1540, 170 * fp, 2);
    ctx.restore();
  }

  // Big number
  const np = outExpo(P(lt, 0.18, 0.6));
  if (np > 0) {
    ctx.save();
    ctx.globalAlpha = outCubic(P(lt, 0.18, 0.3));
    const pulse = 1 + 0.05 * kick;
    ctx.translate(W - 58, 1590);
    ctx.scale(pulse, pulse);
    drawText(ctx, `0${d.n}`, 0, (1 - np) * 90, { fam: F.COND, size: 262, align: "right", color: d.accent });
    ctx.restore();
  }

  drawGrain(ctx, t, 0.04);

  // Kick pulse + cut flash
  fillFlash(ctx, (d.hero ? 0.12 : 0.045) * kick);
  fillFlash(ctx, (d.hero ? 0.95 : 0.5) * decay(lt, 0, 0.07));
  if (d.last) fillFlash(ctx, outCubic(P(lt, dur - 0.4, 0.4)), "#000000");
}

// ---------- OUTRO 32.56 → 36.5 ----------
function renderOutro(ctx, t) {
  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.32;
  drawCover(ctx, IMG.bg[4], 0, 0, W, H, 1.12 + 0.05 * P(t, OUTRO_START, 4), 0.5, 0.45);
  ctx.restore();
  ctx.drawImage(SHADE, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, W, H);

  const glowA = 0.32 * outCubic(P(t, OUTRO_START + 0.1, 1.0)) * (0.7 + 0.6 * envAt(t));
  const g = ctx.createRadialGradient(W / 2, 700, 10, W / 2, 700, 560);
  g.addColorStop(0, `rgba(232,184,66,${glowA})`);
  g.addColorStop(0.5, `rgba(232,184,66,${glowA * 0.22})`);
  g.addColorStop(1, "rgba(232,184,66,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const m = outCubic(P(t, OUTRO_START + 0.15, 0.7));
  drawWordmark(ctx, W / 2, 470 + (1 - m) * 30, 230, 96, m, true);

  const b1 = outExpo(P(t, 33.35, 0.45));
  if (b1 > 0) drawText(ctx, "BLINDING", W / 2, 1010 + (1 - b1) * 50, { fam: F.EB, size: 118, align: "center", alpha: b1 });
  const b2 = outExpo(P(t, 33.5, 0.45));
  if (b2 > 0) drawText(ctx, "NIGHTS", W / 2, 1122 + (1 - b2) * 50, { fam: F.XL, size: 118, align: "center", color: LIGHT, alpha: b2 });
  const l1 = outExpo(P(t, 33.9, 0.5));
  if (l1 > 0) {
    drawText(ctx, "BANGKOK ✈ PHUKET   ·   9–15 OCT 2026", W / 2, 1210 + (1 - l1) * 40, {
      fam: F.M, size: 29, tracking: 8, align: "center", color: "#F2F2F2", alpha: l1,
    });
  }
  const c1 = P(t, 34.3, 0.45);
  if (c1 > 0) {
    const eb = outBack(c1);
    const pw = 560;
    const ph = 96;
    ctx.save();
    ctx.globalAlpha = outCubic(P(t, 34.3, 0.2));
    ctx.translate(W / 2, 1338);
    ctx.scale(0.85 + 0.15 * eb, 0.85 + 0.15 * eb);
    ctx.fillStyle = ORANGE;
    rr(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    ctx.fill();
    drawText(ctx, "BOOK YOUR SPELL", 0, 11, { fam: F.SB, size: 28, tracking: 7, align: "center", color: "#FFFFFF" });
    ctx.restore();
  }
  const l2 = outExpo(P(t, 34.65, 0.5));
  if (l2 > 0) {
    drawText(ctx, "logoutspells.com", W / 2, 1470 + (1 - l2) * 30, {
      fam: F.M, size: 31, tracking: 3, align: "center", color: "#C9C9C9", alpha: l2,
    });
  }
  drawGrain(ctx, t, 0.05);
  fillFlash(ctx, 1 - outCubic(P(t, OUTRO_START, 0.55)), "#000000");
  fillFlash(ctx, P(t, 35.55, 0.85), "#000000");
}

function renderFrame(ctx, t) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (t < INTRO_END) return renderIntro(ctx, t);
  if (t >= OUTRO_START) return renderOutro(ctx, t);
  for (let i = 0; i < DAYS.length; i++) {
    const d = DAYS[i];
    if (t >= d.start && t < d.end) return renderDay(ctx, t, d, i);
  }
  return renderOutro(ctx, t);
}

// ---------- entry ----------
async function main() {
  const mode = process.argv[2] ?? "stills";
  await loadAll();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  if (mode === "stills") {
    const times = (process.argv[3] ?? "1,3.5,4.4,6,8,9.7,11,12.6,14.6,16.4,16.7,17.8,19.5,21.5,23,25,27.5,30.5,32,34,35")
      .split(",").map(Number);
    mkdirSync("probe", { recursive: true });
    const cols = 5;
    const rows = Math.ceil(times.length / cols);
    const tw = 270;
    const th = 480;
    const sheet = createCanvas(cols * tw, rows * th);
    const sx = sheet.getContext("2d");
    sx.fillStyle = "#222";
    sx.fillRect(0, 0, sheet.width, sheet.height);
    times.forEach((t, i) => {
      renderFrame(ctx, t);
      sx.drawImage(canvas, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
      sx.fillStyle = "#0f0";
      sx.font = '18px "PoppinsM"';
      sx.fillText(`${t}s`, (i % cols) * tw + 8, Math.floor(i / cols) * th + 22);
      if (process.argv[4] === "full") writeFileSync(`probe/still_${t}.png`, canvas.toBuffer("image/png"));
    });
    writeFileSync("probe/sheet.png", sheet.toBuffer("image/png"));
    console.log("wrote probe/sheet.png", times.length, "stills");
    return;
  }

  mkdirSync("out", { recursive: true });
  const outPath = `out/${OUT_NAME}.mp4`;
  const args = [
    "-y", "-loglevel", "error", "-stats",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
    "-i", "audio/track_a.mp3",
    "-filter_complex", `[1:a]afade=t=out:st=${END - 1.7}:d=1.7,atrim=0:${END}[a]`,
    "-map", "0:v", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
    "-x264-params", "keyint=60:min-keyint=30",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", String(END), outPath,
  ];
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(END * FPS);
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    renderFrame(ctx, f / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await once(ff.stdin, "drain");
    if (f % 90 === 0) console.log(`frame ${f}/${total} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
  ff.stdin.end();
  const [code] = await once(ff, "close");
  console.log(code === 0 ? `done ${outPath} in ${((Date.now() - started) / 1000).toFixed(1)}s` : `ffmpeg exited ${code}`);
  process.exitCode = code ?? 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
