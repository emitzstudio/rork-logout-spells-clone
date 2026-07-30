import { useEffect, useRef, useState } from "react";

/**
 * The wand cursor — a slim, dark-wood wand with gold fittings whose tip
 * rides exactly on the pointer. A faint golden dust trail follows movement,
 * a tiny star blinks every few seconds, and hovering anything interactive
 * makes the tip pulse once. All canvas work happens in one rAF loop;
 * everything else is transform-only. Renders nothing on touch devices.
 */

type Kind = "dot" | "star" | "ring";

interface Mote {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  born: number;
  ttl: number;
  color: string;
  rot: number;
  rotV: number;
}

const GOLDS = ["#CFA85A", "#E8CE8C", "#B8963E", "#F0DFAE"];
/** Distance from the wand box's top-left corner to the wand tip, px. */
const TIP = 9.6;
const WAND_SIZE = 44;
const MAX_MOTES = 110;

function drawStar(ctx: CanvasRenderingContext2D, s: number): void {
  const c = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(c, -c, s, 0);
  ctx.quadraticCurveTo(c, c, 0, s);
  ctx.quadraticCurveTo(-c, c, -s, 0);
  ctx.quadraticCurveTo(-c, -c, 0, -s);
  ctx.closePath();
  ctx.fill();
}

export default function Cursor() {
  const [enabled] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches,
  );
  const wandRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const wand = wandRef.current;
    const glow = glowRef.current;
    const canvas = canvasRef.current;
    if (!wand || !glow || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.add("wand-cursor");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let mx = -120;
    let my = -120;
    let lastX = -120;
    let lastY = -120;
    let smoothVx = 0;
    let tilt = 0;
    let scale = 1;
    let targetScale = 1;
    let travelled = 0;
    let hovering = false;
    let visible = false;
    let nextStarAt = performance.now() + 2800;
    let raf = 0;
    const motes: Mote[] = [];

    const spawn = (m: Partial<Mote> & { x: number; y: number; kind: Kind }): void => {
      if (motes.length >= MAX_MOTES) return;
      motes.push({
        vx: 0,
        vy: 0,
        size: 1.2,
        born: performance.now(),
        ttl: 700,
        color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
        rot: Math.random() * Math.PI,
        rotV: (Math.random() - 0.5) * 0.06,
        ...m,
      });
    };

    /** A restrained flourish at the tip — used on hover-enter and click. */
    const pulse = (strong: boolean): void => {
      if (reduced) return;
      spawn({ kind: "ring", x: mx, y: my, size: strong ? 17 : 12, ttl: strong ? 500 : 420 });
      const stars = strong ? 2 : 1;
      for (let i = 0; i < stars; i++) {
        spawn({
          kind: "star",
          x: mx + (Math.random() - 0.5) * 22,
          y: my + (Math.random() - 0.5) * 22,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2 - Math.random() * 0.3,
          size: 2.6 + Math.random() * 2,
          ttl: 650 + Math.random() * 250,
        });
      }
      for (let i = 0; i < 2; i++) {
        spawn({
          kind: "dot",
          x: mx + (Math.random() - 0.5) * 10,
          y: my + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.25 - Math.random() * 0.4,
          size: 0.8 + Math.random() * 1.2,
          ttl: 550 + Math.random() * 300,
        });
      }
    };

    const onMove = (e: MouseEvent): void => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      mx = e.clientX;
      my = e.clientY;

      if (!visible) {
        visible = true;
        wand.style.opacity = "1";
        glow.style.opacity = hovering ? "0.8" : "0.4";
        lastX = mx;
        lastY = my;
        return;
      }

      smoothVx += (dx - smoothVx) * 0.16;
      wand.style.transform = `translate3d(${mx - TIP}px, ${my - TIP}px, 0) rotate(${tilt}deg) scale(${scale})`;
      glow.style.transform = `translate3d(${mx - 15}px, ${my - 15}px, 0)`;

      // Golden dust shed along the path — one mote every ~7px of travel.
      if (!reduced) {
        travelled += Math.hypot(dx, dy);
        const speed = Math.hypot(dx, dy);
        while (travelled >= 7) {
          travelled -= 7;
          spawn({
            kind: "dot",
            x: mx + (Math.random() - 0.5) * 5,
            y: my + (Math.random() - 0.5) * 5,
            vx: -dx * 0.014 + (Math.random() - 0.5) * 0.24,
            vy: -dy * 0.014 + (Math.random() - 0.5) * 0.24 + 0.06,
            size: 0.6 + Math.random() * (speed > 24 ? 1.5 : 1.1),
            ttl: 480 + Math.random() * 420,
          });
        }
      }
      lastX = mx;
      lastY = my;
    };

    const onOver = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null;
      const now = Boolean(
        target?.closest(
          "a, button, [role='button'], input, select, textarea, label, [data-cursor]",
        ),
      );
      if (now && !hovering) pulse(true);
      hovering = now;
      glow.style.opacity = visible ? (now ? "0.8" : "0.4") : "0";
    };

    const onDown = (): void => {
      targetScale = 0.9;
      pulse(false);
    };
    const onUp = (): void => {
      targetScale = 1;
    };
    const onLeave = (): void => {
      visible = false;
      wand.style.opacity = "0";
      glow.style.opacity = "0";
    };

    const loop = (now: number) => {
      // Wand life: gentle tilt from horizontal motion + press scale.
      tilt += (Math.max(-9, Math.min(9, smoothVx * 1.05)) - tilt) * 0.14;
      smoothVx *= 0.92;
      scale += (targetScale - scale) * 0.28;
      wand.style.transform = `translate3d(${mx - TIP}px, ${my - TIP}px, 0) rotate(${tilt}deg) scale(${scale})`;

      // The occasional idle star — a wand never quite sleeps.
      if (!reduced && visible && now >= nextStarAt) {
        nextStarAt = now + 2600 + Math.random() * 1800;
        spawn({
          kind: "star",
          x: mx + (Math.random() - 0.5) * 16,
          y: my + (Math.random() - 0.5) * 16,
          vy: -0.15,
          size: 2 + Math.random() * 1.6,
          ttl: 800,
        });
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        const t = (now - m.born) / m.ttl;
        if (t >= 1) {
          motes.splice(i, 1);
          continue;
        }
        m.x += m.vx;
        m.y += m.vy;
        m.vy += 0.004;
        m.rot += m.rotV;

        if (m.kind === "dot") {
          ctx.globalAlpha = Math.pow(1 - t, 1.5) * 0.75;
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (m.kind === "star") {
          const wave = Math.sin(Math.PI * t);
          ctx.globalAlpha = wave * 0.9;
          ctx.fillStyle = "#F2E2AC";
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.rot);
          drawStar(ctx, m.size * (0.5 + wave * 0.7));
          ctx.restore();
        } else {
          ctx.globalAlpha = (1 - t) * 0.55;
          ctx.strokeStyle = "#E8CE8C";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 3 + m.size * t, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      document.body.classList.remove("wand-cursor");
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Dust + sparkles live on one canvas beneath the wand. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 2147483600 }}
      />

      {/* Soft aura at the tip — brightens over interactive elements. */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-[30px] w-[30px] rounded-full opacity-0 transition-opacity duration-300"
        style={{
          zIndex: 2147483601,
          background:
            "radial-gradient(circle, rgba(240,223,174,0.65) 0%, rgba(207,168,90,0.24) 45%, transparent 70%)",
        }}
      />

      {/* The wand itself — tip precisely on the pointer. */}
      <div
        ref={wandRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 opacity-0 transition-opacity duration-200"
        style={{
          zIndex: 2147483601,
          width: WAND_SIZE,
          height: WAND_SIZE,
          transformOrigin: `${TIP}px ${TIP}px`,
        }}
      >
        <svg
          viewBox="0 0 40 40"
          width={WAND_SIZE}
          height={WAND_SIZE}
          style={{
            filter:
              "drop-shadow(0 0 4px rgba(240,223,174,0.55)) drop-shadow(0 0 12px rgba(184,150,62,0.35))",
          }}
        >
          <defs>
            <linearGradient id="wandWood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8A6B3F" />
              <stop offset="0.5" stopColor="#4E3A22" />
              <stop offset="1" stopColor="#2B2114" />
            </linearGradient>
            <linearGradient id="wandGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F0DFAE" />
              <stop offset="1" stopColor="#B8963E" />
            </linearGradient>
          </defs>

          <g transform="rotate(-45 20 20)">
            {/* Ember at the tip */}
            <circle cx="20" cy="4.4" r="1.9" fill="#F0DFAE" opacity="0.45" />
            <circle cx="20" cy="4.4" r="0.95" fill="#FAF2D8" />

            {/* Tapered shaft — warm dark wood with a gold rim-light */}
            <path
              d="M 19.35 5.2 L 20.65 5.2 L 21.85 29.4 L 18.15 29.4 Z"
              fill="url(#wandWood)"
              stroke="#E8CE8C"
              strokeWidth="0.45"
              strokeOpacity="0.6"
            />
            {/* Sheen along the lit edge */}
            <path d="M 19.55 6 L 20 6 L 19.35 28.8 L 18.75 28.8 Z" fill="#F0DFAE" opacity="0.35" />

            {/* Gold collar between shaft and grip */}
            <rect x="17.9" y="29.5" width="4.2" height="1.1" rx="0.55" fill="url(#wandGold)" />

            {/* Grip — matte espresso, gold-edged */}
            <path
              d="M 18.05 31 L 21.95 31 L 22.2 35.9 Q 22.2 36.9 21.2 36.9 L 18.8 36.9 Q 17.8 36.9 17.8 35.9 Z"
              fill="#241C12"
              stroke="#CFA85A"
              strokeWidth="0.4"
              strokeOpacity="0.55"
            />
            <rect x="18.15" y="32.9" width="3.7" height="0.5" rx="0.25" fill="url(#wandGold)" opacity="0.8" />

            {/* Pommel */}
            <circle cx="20" cy="37.7" r="0.95" fill="url(#wandGold)" />
          </g>
        </svg>
      </div>
    </>
  );
}
