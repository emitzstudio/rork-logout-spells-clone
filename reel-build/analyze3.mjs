import { readFileSync, writeFileSync } from "node:fs";
const SR = 22050;
const buf = readFileSync("audio/track_a.pcm"); const n = buf.length / 2;
const s = new Float32Array(n); for (let i = 0; i < n; i++) s[i] = buf.readInt16LE(i * 2) / 32768;
const K = 40; const lp = new Float32Array(n); let acc = 0; for (let i = 0; i < n; i++) { acc += s[i]; if (i >= K) acc -= s[i - K]; lp[i] = acc / K; }
const hop = 110.25, win = 441; const frames = Math.floor((n - win) / hop); // 5ms hop
const low = new Float32Array(frames), rms = new Float32Array(frames);
for (let f = 0; f < frames; f++) { const st = Math.floor(f * hop); let e = 0, el = 0; for (let i = 0; i < win; i++) { const v = s[st + i]; e += v * v; const w = lp[st + i]; el += w * w; } rms[f] = Math.sqrt(e / win); low[f] = Math.sqrt(el / win); }
const onset = new Float32Array(frames); for (let f = 2; f < frames; f++) onset[f] = Math.max(0, low[f] - low[f - 2]);
const broad = new Float32Array(frames); for (let f = 2; f < frames; f++) broad[f] = Math.max(0, rms[f] - rms[f - 2]);
// adaptive peak picking: local max over +-8 frames (40ms), above 1.8x local mean of +-1s
const pick = (arr, minGap) => { const out = []; let last = -1e9; for (let f = 10; f < frames - 10; f++) { let mx = true; for (let i = -8; i <= 8; i++) if (arr[f + i] > arr[f]) { mx = false; break; } if (!mx) continue; let m = 0, c = 0; for (let i = -200; i <= 200; i++) { const v = arr[f + i]; if (v !== undefined) { m += v; c++; } } m /= c; if (arr[f] > Math.max(1.8 * m, 0.004) && f - last >= minGap) { out.push({ t: +(f * 0.005).toFixed(3), s: +(arr[f] * 1000).toFixed(1) }); last = f; } } return out; };
const kicks = pick(onset, 20); const hits = pick(broad, 20);
console.log("kicks:", kicks.length); console.log(kicks.map((k) => `${k.t}:${k.s}`).join(" "));
console.log("broad hits (top 20 by strength):", hits.sort((a, b) => b.s - a.s).slice(0, 20).sort((a, b) => a.t - b.t).map((k) => `${k.t}:${k.s}`).join(" "));
// intervals between consecutive kicks after 16s
const late = kicks.filter((k) => k.t > 16 && k.t < 30); const iv = late.slice(1).map((k, i) => +(k.t - late[i].t).toFixed(3)); console.log("late intervals:", iv.join(" "));
// rms envelope per frame (30fps) for reactive glow
const env = []; for (let i = 0; i < Math.ceil((n / SR) * 30); i++) { const f = Math.round((i / 30) / 0.005); let m = 0, c = 0; for (let j = -3; j <= 3; j++) { const v = rms[f + j]; if (v !== undefined) { m += v; c++; } } env.push(+(m / c).toFixed(4)); }
writeFileSync("audio/track_a.analysis.json", JSON.stringify({ duration: n / SR, kicks, hits: hits.sort((a, b) => a.t - b.t), env }, null, 0));
console.log("env max:", Math.max(...env), "written");
