"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Frame = "compose" | "translate" | "refine";

const CHAPTERS: { id: Frame; eyebrow: string; title: string; body: string }[] = [
  {
    id: "compose",
    eyebrow: "01 · Compose",
    title: "Quiet by default.",
    body:
      "Paste a passage on the left — a chapter, an essay, a poem. Vertor stays out of the way until you ask it to work. No toolbars whispering, no AI nudging. Just the page.",
  },
  {
    id: "translate",
    eyebrow: "02 · Translate",
    title: "Streamed, sentence by sentence.",
    body:
      "Pick a target language, choose your model — Gemini, Claude, or GPT — and Vertor renders the passage live, preserving paragraph breaks, register, and voice. Auto-detect handles the source.",
  },
  {
    id: "refine",
    eyebrow: "03 · Refine",
    title: "Three renderings of every word.",
    body:
      "Click any word — or highlight a phrase, a sentence, a whole paragraph — and Vertor offers three alternatives, each with its own register: literal, natural, lyrical. Or write a custom instruction and re-translate the document.",
  },
];

export function Showcase() {
  const [frame, setFrame] = React.useState<Frame>("compose");
  const sectionRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let raf = 0;
    let last: Frame = "compose";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      const start = -r.top;
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.max(0, Math.min(1, start / total));
      // Hysteresis — separate "advance" and "retreat" thresholds so the
      // frame doesn't flicker right at the boundary. Each frame also gets a
      // wider scroll band, which gives the eye time to read the caption
      // before the next state advances.
      let next: Frame = last;
      if (last === "compose" && p > 0.32) next = "translate";
      else if (last === "translate" && p < 0.26) next = "compose";
      else if (last === "translate" && p > 0.66) next = "refine";
      else if (last === "refine" && p < 0.60) next = "translate";
      if (next !== last) {
        last = next;
        setFrame(next);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative"
      style={{ minHeight: "420vh" }}
    >
      {/* Sticky stage fills the viewport */}
      <div className="sticky top-0 z-0 flex h-dvh w-full flex-col items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-[1500px]">
          <MockupFrame frame={frame} />
        </div>

        {/* Caption — single fading row anchored under the mockup */}
        <div className="relative mt-8 hidden h-[120px] w-full max-w-[1500px] md:block">
          {CHAPTERS.map((c) => (
            <div
              key={c.id}
              aria-hidden={frame !== c.id}
              className={cn(
                "absolute inset-0 grid grid-cols-[140px_1fr_auto] items-baseline gap-10 transition-opacity duration-500",
                frame === c.id ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <div className="small-caps text-ink">{c.eyebrow}</div>
              <div>
                <h3 className="display text-[30px] italic leading-[1.05] md:text-[36px]">
                  {c.title}
                </h3>
                <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-end">
                {CHAPTERS.map((d) => (
                  <span
                    key={d.id}
                    className={cn(
                      "h-1 transition-all duration-500",
                      d.id === frame ? "w-10 bg-foreground" : "w-3 bg-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile chapters (one viewport-tall per chapter for natural scrolling) */}
      <div className="relative z-10 md:hidden">
        {CHAPTERS.map((c) => (
          <div key={c.id} className="flex min-h-dvh items-center px-6">
            <div className="mx-auto max-w-md text-center">
              <div className="small-caps mb-3 text-ink">{c.eyebrow}</div>
              <h3 className="display text-[28px] italic leading-[1.1]">{c.title}</h3>
              <p className="mt-4 text-[14px] text-muted-foreground">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop scroll spacers — drive the section height. Wider bands
          (140vh each) give the eye time to settle on each frame before the
          next state advances. Compose gets a slightly shorter band so the
          mockup gets to the streaming phase quickly. */}
      <div className="hidden md:block" aria-hidden>
        <div style={{ height: "120vh" }} />
        <div style={{ height: "140vh" }} />
        <div style={{ height: "140vh" }} />
      </div>
    </section>
  );
}

/* ---------------- Mockup ----------------
 *
 * Source: opening of "Cien años de soledad" — Gabriel García Márquez, 1967.
 * Translation: after Gregory Rabassa's canonical English rendering.
 * The highlighted word ("distant" / "remota") is a real translator's choice —
 * Rabassa picked "distant"; a literal rendering would be "remote"; a lyrical
 * one, "far-off". Exactly the kind of decision Vertor's variations are for.
 */

const SOURCE_LINE_1 =
  "Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía";
const SOURCE_LINE_2 =
  " había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.";
const SOURCE_PARA_2 =
  "El mundo era tan reciente, que muchas cosas carecían de nombre, y para mencionarlas había que señalarlas con el dedo.";

const TRANS_LINE_1_HEAD =
  "Many years later, as he faced the firing squad, Colonel Aureliano Buendía was to remember that ";
const TRANS_LINE_1_TAIL = " afternoon when his father took him to discover ice.";
const TRANS_PARA_2 =
  "The world was so recent that many things lacked names, and to mention them you had to point.";

function MockupFrame({ frame }: { frame: Frame }) {
  const isCompose = frame === "compose";
  const isTranslate = frame === "translate";
  const isRefine = frame === "refine";
  const isTranslateOrRefine = isTranslate || isRefine;

  // Dynamically anchor the variations popover to the actual rendered position
  // of the highlighted word in the translation pane. This way the popover
  // always points at "distant" regardless of pane width or text reflow.
  const transPaneRef = React.useRef<HTMLDivElement>(null);
  const wordRef = React.useRef<HTMLSpanElement>(null);
  const [popPos, setPopPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!isTranslateOrRefine) {
      setPopPos(null);
      return;
    }
    const measure = () => {
      const word = wordRef.current;
      const pane = transPaneRef.current;
      if (!word || !pane) return;
      const wr = word.getBoundingClientRect();
      const pr = pane.getBoundingClientRect();
      const paneWidth = pr.width;
      const popWidth = 320;
      // Try to keep the popover roughly under the word, but never overflow
      // the right edge of the pane.
      const left = Math.min(
        Math.max(16, wr.left - pr.left - 12),
        paneWidth - popWidth - 16,
      );
      setPopPos({ top: wr.bottom - pr.top + 8, left });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isTranslateOrRefine, isRefine]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-hairline bg-background shadow-[0_50px_120px_-40px_rgb(0_0_0/0.35)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-hairline bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-foreground/15" />
          <span className="h-3 w-3 rounded-full bg-foreground/12" />
          <span className="h-3 w-3 rounded-full bg-foreground/10" />
        </div>
        <div className="rounded-sm border border-hairline px-4 py-0.5 font-mono text-[11px] text-muted-foreground">
          vertor.vercel.app/app
        </div>
        <span className="w-16" />
      </div>

      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-6 py-3 text-[12.5px]">
        <span className="text-muted-foreground">‹</span>
        <span className="display italic text-[16px]">Cien años de soledad</span>

        {/* Language tuple — auto-detect resolves to "Spanish" once detection runs */}
        <div className="ml-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span>auto</span>
            <span
              aria-hidden
              className={cn(
                "inline-flex items-center gap-1 overflow-hidden whitespace-nowrap transition-all duration-700",
                isCompose ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100",
              )}
            >
              <span>·</span>
              <span className="text-foreground">Spanish</span>
            </span>
          </span>
          <span className="font-mono text-muted-foreground">→</span>
          <span className="text-foreground">English</span>
        </div>

        {/* Translate button — state-aware */}
        <span
          className={cn(
            "ml-2 inline-flex items-center gap-2 rounded-sm border border-foreground bg-foreground px-3 py-1 font-medium text-background shadow-[2px_2px_0_var(--ink)] transition-all duration-500",
            isTranslate && "scale-[1.02]",
          )}
        >
          <span
            className={cn(
              "h-1 w-1 rounded-full transition-colors duration-300",
              isTranslate ? "bg-background caret" : "bg-ink",
            )}
          />
          <span className={isTranslate ? "shiny" : ""}>
            {isTranslate ? "Translating" : "Translate"}
          </span>
          {!isTranslate && <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>}
        </span>

        {/* Model badge — appears once translation begins (echoes the real app's
            inline model display in Advanced mode) */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border border-hairline px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground transition-all duration-500",
            isTranslateOrRefine ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 pointer-events-none",
          )}
        >
          <span className="inline-block h-1 w-1 rounded-full bg-ink" />
          gemini-3.1-flash-lite
        </span>

        <span className="text-muted-foreground">Export</span>

        {/* Mode toggle */}
        <div className="ml-auto inline-flex items-center rounded-sm border border-hairline p-0.5 text-[11.5px]">
          <span className="rounded-[3px] bg-ink/10 px-2.5 py-0.5 text-foreground">Simple</span>
          <span className="px-2.5 py-0.5 text-muted-foreground">Advanced</span>
        </div>
      </div>

      {/* Two-pane editor */}
      <div className="grid grid-cols-2 gap-px bg-hairline">
        {/* SOURCE PANE */}
        <div className="relative bg-background px-8 py-7 min-h-[480px]">
          <div className="flex items-baseline justify-between border-b border-hairline pb-2 mb-5">
            <span className="small-caps">Source</span>
            <span className="font-mono text-[10.5px] text-muted-foreground transition-colors">
              {isCompose ? "auto" : "es"} · {isCompose ? "12" : "48"} words
            </span>
          </div>
          <div className="space-y-4 font-serif text-[15px] leading-[1.7]">
            {/* Compose: only line 1 is in the DOM, caret sits right after it. */}
            {isCompose ? (
              <p>
                {SOURCE_LINE_1}
                <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-foreground/60 align-text-bottom" />
              </p>
            ) : (
              <>
                <p>
                  {SOURCE_LINE_1}
                  <span className="stream-in inline">{SOURCE_LINE_2}</span>
                </p>
                <p className="stream-in stream-in-delay">{SOURCE_PARA_2}</p>
              </>
            )}
          </div>
        </div>

        {/* TRANSLATION PANE */}
        <div ref={transPaneRef} className="relative bg-background px-8 py-7 min-h-[480px]">
          <div className="flex items-baseline justify-between border-b border-hairline pb-2 mb-5">
            <span className="small-caps">Translation</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              en · {isCompose ? "0" : isTranslate ? "26" : "44"} words
            </span>
          </div>

          {/* Empty-state quote (cross-fades out as soon as we leave compose) */}
          <div
            className={cn(
              "cross-fade absolute inset-x-8 top-1/2 -translate-y-1/2 text-center",
              isCompose && "is-visible",
            )}
          >
            <p className="display mx-auto max-w-[28ch] text-[19px] italic text-muted-foreground">
              &ldquo;The original is unfaithful to the translation.&rdquo;
            </p>
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
              Jorge Luis Borges
            </p>
          </div>

          {/* Translation content — only mounted when leaving compose, so the
              caret can sit at the true end of the streamed text. */}
          {!isCompose && (
            <div className="cross-fade is-visible space-y-4 font-serif text-[15px] leading-[1.7]">
              <p className="stream-in">
                {TRANS_LINE_1_HEAD}
                <span ref={wordRef} className={cn("word-highlight", isRefine && "is-active")}>
                  distant
                </span>
                {TRANS_LINE_1_TAIL}
                {isTranslate && (
                  <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-ink align-text-bottom" />
                )}
              </p>
              {isRefine && (
                <p className="stream-in">{TRANS_PARA_2}</p>
              )}
            </div>
          )}

          {/* Variations popover — anchored under "distant" via measured rect.
              Mirrors the real popover: header → instruction textarea →
              suggest-three button → three variations. */}
          <div
            className={cn(
              "slide-in absolute z-20 w-[320px] origin-top overflow-hidden rounded-md border border-foreground/20 bg-background text-[12px] shadow-[0_22px_50px_-14px_rgb(0_0_0/0.38)]",
              isRefine && popPos && "is-visible",
            )}
            style={popPos ? { top: popPos.top, left: popPos.left } : undefined}
          >
            {/* Header */}
            <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-3.5 py-2">
              <span className="small-caps">word</span>
              <span className="font-serif text-[12px] italic text-muted-foreground">
                &ldquo;distant&rdquo; — from <span className="not-italic">remota</span>
              </span>
            </div>

            {/* Custom instruction input (real feature) */}
            <div className="space-y-2.5 px-3.5 py-2.5">
              <div className="border-b border-hairline pb-1.5">
                <p className="font-serif text-[12px] italic text-muted-foreground">
                  Optional — make it more lyrical, more literal…
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
                  <span className="font-mono text-[11px]">→</span>
                  Suggest three
                </span>
                <span className="text-[10.5px] italic text-muted-foreground underline decoration-hairline underline-offset-[5px]">
                  apply across the whole doc
                </span>
              </div>
            </div>

            {/* Variations list */}
            <div className="border-t border-hairline">
              {[
                { word: "distant", note: "natural" },
                { word: "far-off", note: "lyrical" },
                { word: "remote", note: "literal" },
              ].map((v, i) => (
                <div
                  key={v.word}
                  className={cn(
                    "flex items-baseline gap-2.5 px-3.5 py-2 transition-colors",
                    i > 0 && "border-t border-hairline",
                    i === 1 && "bg-[color-mix(in_oklch,var(--ink)_8%,transparent)]",
                  )}
                >
                  <span className="font-mono text-[9.5px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-serif text-[13px] text-foreground">
                    {v.word}
                  </span>
                  <span className="font-mono text-[9.5px] italic text-muted-foreground">
                    {v.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer strip (echoes the real app) */}
      <div className="flex items-baseline justify-between border-t border-hairline px-6 py-2 text-[10.5px] italic text-muted-foreground">
        <span>
          {isCompose && "Tip: paste a passage on the left to begin."}
          {isTranslate && "Streaming…"}
          {isRefine && "Click any word — or highlight a phrase — for three alternatives."}
        </span>
        <span className="flex items-baseline gap-2 uppercase not-italic tracking-[0.2em]">
          <span
            className={cn(
              "inline-block h-[6px] w-[6px] rounded-full transition-colors",
              isTranslate ? "bg-ink caret" : "bg-muted-foreground/50",
            )}
          />
          {isTranslate ? "Live" : "Idle"}
        </span>
      </div>
    </div>
  );
}
