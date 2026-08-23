import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileJson,
  FileX,
  FolderOpen,
  ImagePlus,
  PenLine,
  RefreshCcw,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent } from "react";
import { useNavigate } from "react-router-dom";

import { downloadSampleSpell, parseSpellFile } from "@/data/spellImport";
import type { SpellImportResult } from "@/data/spellImport";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Stage = "upload" | "parsing" | "summary" | "error";

const STEPS = ["Upload file", "Review import", "Build & publish"] as const;

const PARSE_STEPS = [
  "Reading the file",
  "Mapping sections onto the builder",
  "Preparing your Spell",
] as const;

const HOW_IT_WORKS: { icon: typeof FileJson; title: string; copy: string }[] = [
  {
    icon: FileJson,
    title: "Upload your file",
    copy: "One .json written by you - or by ChatGPT, Gemini, any LLM.",
  },
  {
    icon: Wand2,
    title: "Review the import",
    copy: "Every section is mapped automatically. Gaps become gentle warnings.",
  },
  {
    icon: ImagePlus,
    title: "Add images & publish",
    copy: "Images are never imported - drop yours into the ready-made slots.",
  },
];

const ORBITERS: { symbol: string; className: string; delay: number }[] = [
  { symbol: "✦", className: "-right-2 top-4 text-[17px]", delay: 0 },
  { symbol: "☾", className: "-left-4 top-12 text-[20px]", delay: 1.4 },
  { symbol: "✳", className: "bottom-0 right-2 text-[13px]", delay: 2.4 },
];

/**
 * Import Spell - upload one Logout Spell file, review what was mapped, then
 * land in the Spell Builder with every text field already filled.
 * Everything happens in the browser: no upload, no API, no backend.
 */
export default function SpellImport() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  const [stage, setStage] = useState<Stage>("upload");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [parseTick, setParseTick] = useState<number>(0);
  const [result, setResult] = useState<SpellImportResult | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const schedule = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* ------------------------------ File intake ------------------------------ */

  const handleFile = (file: File): void => {
    setFileName(file.name);
    const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    if (!isJson) {
      setError("Only .json files are supported - export your Spell as JSON and try again.");
      setStage("error");
      return;
    }
    setStage("parsing");
    setParseTick(0);
    schedule(() => setParseTick(1), 420);
    schedule(() => setParseTick(2), 880);
    void file
      .text()
      .then((text) => {
        const outcome = parseSpellFile(text);
        schedule(() => setParseTick(3), 1340);
        if (outcome.ok) {
          const parsed = outcome.result;
          schedule(() => {
            setResult(parsed);
            setStage("summary");
          }, 1720);
        }
        if (outcome.ok === false) {
          const message = outcome.error;
          schedule(() => {
            setError(message);
            setStage("error");
          }, 1720);
        }
      })
      .catch(() => {
        schedule(() => {
          setError("The file couldn't be read from disk. Try choosing it again.");
          setStage("error");
        }, 700);
      });
  };

  const onBrowse = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrag = (e: DragEvent<HTMLDivElement>, active: boolean): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = (): void => {
    setStage("upload");
    setResult(null);
    setError("");
    setFileName("");
    setParseTick(0);
  };

  const continueToBuilder = (): void => {
    if (!result) return;
    navigate("/dashboard/spells/new", {
      state: { imported: result.draft, importedFile: fileName },
    });
  };

  const stepIndex = stage === "summary" ? 1 : 0;

  /* --------------------------------- Render -------------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={onBrowse}
        aria-label="Choose a Spell file"
        className="hidden"
      />

      <button
        type="button"
        onClick={() => navigate("/dashboard/spells")}
        className="group flex h-10 items-center gap-2 rounded-lg border border-cream/[0.08] bg-cream/[0.03] px-3 font-sans text-[12px] text-cream/60 transition-all duration-200 hover:border-cream/25 hover:text-cream active:scale-[0.97]"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Back to Spells
      </button>

      <div className="mx-auto mt-8 w-full max-w-[780px] pb-10">
        {/* Header */}
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="eyebrow"
          >
            Import Spell ✨
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
            className="mt-2 font-serif text-[32px] font-medium leading-[1.06] text-cream md:text-[40px]"
          >
            A whole Spell, <span className="italic text-gold-gradient">in minutes</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="mx-auto mt-3 max-w-md font-sans text-[13px] leading-relaxed text-cream/45"
          >
            Import a Logout Spell file to automatically populate the entire Spell Builder - then
            review, add images and publish.
          </motion.p>
        </div>

        {/* Steps rail */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
          className="mt-7 flex items-center justify-center"
          aria-label={`Step ${stepIndex + 1} of 3`}
        >
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2.5 h-px w-6 transition-colors duration-500 sm:w-12",
                    i <= stepIndex ? "bg-gold/50" : "bg-cream/10",
                  )}
                />
              )}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border font-sans text-[10.5px] transition-all duration-500",
                    i < stepIndex
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : i === stepIndex
                        ? "border-gold bg-gold font-semibold text-charcoal-deep shadow-[0_0_20px_rgba(184,150,62,0.35)]"
                        : "border-cream/15 text-cream/35",
                  )}
                >
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "font-sans text-[11px] transition-colors duration-500",
                    i === stepIndex ? "text-cream" : "text-cream/35",
                    i > 0 && "hidden sm:inline",
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Stage content */}
        <div className="mt-7">
          <AnimatePresence mode="wait">
            {/* ------------------------------ Upload ------------------------------ */}
            {stage === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div
                  onDragEnter={(e) => onDrag(e, true)}
                  onDragOver={(e) => onDrag(e, true)}
                  onDragLeave={(e) => onDrag(e, false)}
                  onDrop={onDrop}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 md:py-14",
                    dragActive
                      ? "border-gold/70 bg-gold/[0.05] shadow-[0_0_90px_rgba(184,150,62,0.12)]"
                      : "border-cream/[0.12] bg-cream/[0.015] hover:border-cream/25",
                  )}
                >
                  {/* Illustration */}
                  <div className="pointer-events-none relative mx-auto h-28 w-28">
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-gold/25"
                    />
                    <span aria-hidden className="absolute inset-4 rounded-full bg-gold/[0.06] blur-md" />
                    <motion.span
                      animate={dragActive ? { scale: 1.1, rotate: 4 } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/30 bg-gold/[0.08] text-gold shadow-[0_0_46px_rgba(184,150,62,0.25)]"
                    >
                      <FileJson className="h-7 w-7" />
                    </motion.span>
                    {ORBITERS.map((o) => (
                      <span
                        key={o.symbol}
                        aria-hidden
                        className={`fx-float absolute font-serif text-gold/40 ${o.className}`}
                        style={
                          {
                            "--amp": "5.5px",
                            "--lo": "0.35",
                            "--hi": "0.8",
                            "--dur": "5s",
                            "--delay": `${-o.delay}s`,
                          } as CSSProperties
                        }
                      >
                        {o.symbol}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-6 font-serif text-[24px] font-medium text-cream">
                    {dragActive ? "Drop it right here" : "Drag & drop your Spell file"}
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/45">
                    One file fills all fourteen sections of the builder. Read locally - nothing
                    leaves this device.
                  </p>

                  <div className="mt-6 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="btn-gold !px-6 !py-3 !text-[13px]"
                    >
                      <FolderOpen className="h-4 w-4" /> Browse file
                    </button>
                  </div>

                  <p className="mt-5 font-sans text-[10.5px] uppercase tracking-[0.2em] text-cream/30">
                    Supported format · JSON (.json)
                  </p>
                </div>

                {/* Sample file */}
                <div className="mt-4 rounded-xl border border-cream/[0.06] bg-cream/[0.015] px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center font-sans text-[12px] text-cream/45">
                    <span>Need the format?</span>
                    <button
                      type="button"
                      onClick={downloadSampleSpell}
                      className="inline-flex items-center gap-1.5 font-medium text-gold-light underline decoration-gold/40 underline-offset-4 transition-colors duration-200 hover:text-gold"
                    >
                      <Download className="h-3.5 w-3.5" /> Download the sample file
                    </button>
                    <span>then hand it to ChatGPT or Gemini and ask for your trip in the same shape.</span>
                  </div>
                </div>

                {/* How it works */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {HOW_IT_WORKS.map(({ icon: Icon, title, copy }, i) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: EASE }}
                      className="rounded-xl border border-cream/[0.07] bg-charcoal-soft/65 p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream/10 bg-cream/[0.03] text-gold/80">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-cream/35">
                          Step {i + 1}
                        </span>
                      </div>
                      <p className="mt-3 font-serif text-[15px] font-medium text-cream">{title}</p>
                      <p className="mt-1 font-sans text-[11.5px] leading-relaxed text-cream/45">{copy}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ----------------------------- Parsing ------------------------------ */}
            {stage === "parsing" && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-2xl border border-cream/[0.07] bg-charcoal-soft/75 px-6 py-12 text-center"
              >
                <span className="fx-wiggle mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/30 bg-gold/[0.08] text-gold shadow-[0_0_50px_rgba(184,150,62,0.28)]">
                  <Wand2 className="h-7 w-7" />
                </span>
                <h2 className="mt-5 font-serif text-[24px] font-medium text-cream">
                  Casting the import…
                </h2>
                <p className="mt-1 font-sans text-[12px] text-cream/40">{fileName}</p>

                <div className="mx-auto mt-7 max-w-[300px] space-y-3 text-left">
                  {PARSE_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={cn(
                        "flex items-center gap-3 font-sans text-[12.5px] transition-colors duration-300",
                        parseTick > i ? "text-cream" : parseTick === i ? "text-cream/70" : "text-cream/25",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-300",
                          parseTick > i
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                            : "border-cream/15",
                        )}
                      >
                        {parseTick > i ? (
                          <Check className="h-3 w-3" />
                        ) : parseTick === i ? (
                          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold" />
                        ) : null}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ----------------------------- Summary ------------------------------ */}
            {stage === "summary" && result && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <div className="overflow-hidden rounded-2xl border border-cream/[0.07] bg-charcoal-soft/75">
                  {/* Hero */}
                  <div className="relative border-b border-cream/[0.06] px-6 py-7 text-center">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                    />
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                      className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_44px_rgba(52,211,153,0.18)]"
                    >
                      <Check className="h-6 w-6" />
                    </motion.span>
                    <p className="eyebrow mt-4">Import complete</p>
                    <h2 className="mt-2 font-serif text-[26px] font-medium leading-tight text-cream md:text-[30px]">
                      <span className="italic text-gold-gradient">“{result.spellName}”</span> is ready
                      to build
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-1 font-sans text-[11px] text-cream/55">
                        <FileJson className="h-3 w-3 text-gold/70" /> {fileName}
                      </span>
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2.5 py-1 font-sans text-[11px] text-emerald-300/90">
                        {result.importedCount} of {result.sections.length} sections imported
                      </span>
                      <span className="rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-1 font-sans text-[11px] text-cream/55">
                        {result.dayCount} journey days
                      </span>
                      {result.missing.length > 0 && (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-1 font-sans text-[11px] text-amber-300/90">
                          {result.missing.length} details missing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section results */}
                  <div className="grid gap-x-8 gap-y-0.5 px-6 py-5 sm:grid-cols-2">
                    {result.sections.map((section, i) => (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.2 + i * 0.045, ease: EASE }}
                        className="flex items-center gap-2.5 py-[7px]"
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                            section.imported
                              ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                              : "border-amber-400/30 bg-amber-400/[0.07] text-amber-300",
                          )}
                        >
                          {section.imported ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-sans text-[12.5px] text-cream/85">
                          {section.label}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-sans text-[10.5px]",
                            section.imported ? "text-cream/40" : "text-amber-300/70",
                          )}
                        >
                          {section.detail}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Missing details */}
                  {result.missing.length > 0 && (
                    <div className="border-t border-cream/[0.06] px-6 py-4">
                      <p className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                        <AlertTriangle className="h-3.5 w-3.5" /> Missing from the file
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {result.missing.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-1 font-sans text-[11px] text-amber-200/80"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2.5 font-sans text-[11px] text-cream/35">
                        Everything else was imported - these fields were simply left blank for you to
                        fill in the builder.
                      </p>
                    </div>
                  )}

                  {/* Images to upload */}
                  <div className="border-t border-cream/[0.06] px-6 py-4">
                    <p className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.22em] text-gold/80">
                      <ImagePlus className="h-3.5 w-3.5" /> Images to upload
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {result.images.map((slot) => (
                        <span
                          key={slot}
                          className="flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/[0.05] px-2.5 py-1 font-sans text-[11px] text-gold-light/90"
                        >
                          <ImagePlus className="h-3 w-3 text-gold/60" /> {slot}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2.5 font-sans text-[11px] text-cream/35">
                      Images are never imported - every slot is waiting as an upload placeholder in
                      the builder.
                      {result.ignoredImageLinks && " Image links found in the file were ignored."}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={continueToBuilder}
                    autoFocus
                    className="btn-gold !px-7 !py-3.5 !text-[13px]"
                  >
                    Continue to Spell Builder <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="btn-ghost-gold !px-5 !py-3 !text-[12px]"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> Import a different file
                  </button>
                </div>
              </motion.div>
            )}

            {/* ------------------------------ Error ------------------------------- */}
            {stage === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-2xl border border-red-400/15 bg-red-400/[0.03] px-6 py-12 text-center"
              >
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-red-400/[0.08] text-red-300 shadow-[0_0_40px_rgba(248,113,113,0.12)]">
                  <FileX className="h-6 w-6" />
                </span>
                <h2 className="mt-5 font-serif text-[24px] font-medium text-cream">
                  We couldn’t read that file
                </h2>
                {fileName !== "" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cream/12 bg-cream/[0.03] px-2.5 py-1 font-sans text-[11px] text-cream/55">
                    <FileJson className="h-3 w-3 text-cream/40" /> {fileName}
                  </p>
                )}
                <p className="mx-auto mt-3 max-w-sm font-sans text-[12.5px] leading-relaxed text-cream/50">
                  {error}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn-gold !px-6 !py-3 !text-[13px]"
                  >
                    <FolderOpen className="h-4 w-4" /> Try another file
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleSpell}
                    className="btn-ghost-gold !px-5 !py-3 !text-[12px]"
                  >
                    <Download className="h-3.5 w-3.5" /> Download the sample file
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manual escape hatch */}
        <AnimatePresence>
          {(stage === "upload" || stage === "error") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-6 text-center"
            >
              <button
                type="button"
                onClick={() => navigate("/dashboard/spells/new")}
                className="group inline-flex items-center gap-1.5 font-sans text-[11.5px] text-cream/35 transition-colors duration-200 hover:text-cream/70"
              >
                <PenLine className="h-3 w-3" />
                Rather start from scratch? Create the Spell manually
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
