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
      "Paste an article on the left. Vertor stays out of the way until you ask it to work — no toolbars whispering, no AI assistants nudging. Just type.",
  },
  {
    id: "translate",
    eyebrow: "02 · Translate",
    title: "Streamed in any tongue.",
    body:
      "Pick a target language and hit Translate. The output streams word by word, preserving the original's paragraph breaks, idioms, and voice. Gemini, Claude, or GPT — your choice.",
  },
  {
    id: "refine",
    eyebrow: "03 · Refine",
    title: "Three alternatives, one click.",
    body:
      "Click any word — or highlight a phrase, a sentence, a whole paragraph — and Vertor returns three different renderings. Pick one. Or write your own instruction and re-translate the document.",
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
      const next: Frame = p < 0.34 ? "compose" : p < 0.67 ? "translate" : "refine";
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
      style={{ minHeight: "360vh" }}
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

      {/* Desktop scroll spacers — drive the section height */}
      <div className="hidden md:block" aria-hidden>
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
      </div>
    </section>
  );
}

/* ---------------- Mockup ---------------- */

const SOURCE_LINE_1 =
  "Le traducteur est un écrivain qui écrit dans la langue d'autrui.";
const SOURCE_LINE_2 =
  " Il habite, le temps d'un livre, le souffle d'une voix qui n'est pas la sienne, et la rend audible.";
const SOURCE_PARA_2 =
  "C'est un art discret, presque effacé, et pourtant rien ne s'écrit sans lui.";

const TRANS_LINE_1_HEAD =
  "A translator is a writer who writes in the language of another. They inhabit, for the length of a book, the ";
const TRANS_LINE_1_TAIL = " of a voice that is not their own, and make it audible.";
const TRANS_PARA_2 = "It is a quiet art, almost effaced — and yet nothing is written without it.";

function MockupFrame({ frame }: { frame: Frame }) {
  const isCompose = frame === "compose";
  const isTranslateOrLater = frame === "translate" || frame === "refine";
  const isTranslate = frame === "translate";
  const isRefine = frame === "refine";

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
      <div className="flex items-center gap-3 border-b border-hairline px-6 py-3 text-[12.5px]">
        <span className="text-muted-foreground">‹</span>
        <span className="display italic text-[16px]">Le souffle d&apos;une voix</span>
        <span className="ml-3 text-muted-foreground">Auto-detect</span>
        <span className="font-mono text-muted-foreground">→</span>
        <span className="text-foreground">English</span>
        <span
          className={cn(
            "ml-4 inline-flex items-center gap-2 rounded-sm border border-foreground bg-foreground px-3 py-1 font-medium text-background shadow-[2px_2px_0_var(--ink)] transition-transform duration-500",
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
        </span>
        <span className="text-muted-foreground">Export</span>
        <div className="ml-auto inline-flex items-center rounded-sm border border-hairline p-0.5 text-[11.5px]">
          <span className="rounded-[3px] bg-ink/10 px-2.5 py-0.5 text-foreground">Simple</span>
          <span className="px-2.5 py-0.5 text-muted-foreground">Advanced</span>
        </div>
      </div>

      {/* Two-pane editor */}
      <div className="grid grid-cols-2 gap-px bg-hairline">
        {/* SOURCE PANE */}
        <div className="relative bg-background px-8 py-7 min-h-[460px]">
          <div className="flex items-baseline justify-between border-b border-hairline pb-2 mb-5">
            <span className="small-caps">Source</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              auto · {isCompose ? "12" : "39"} words
            </span>
          </div>
          <div className="space-y-4 font-serif text-[15px] leading-[1.7]">
            <p>
              <span className={cn("reveal-text inline is-revealed")}>{SOURCE_LINE_1}</span>
              <span className={cn("reveal-text inline", !isCompose && "is-revealed")}>
                {SOURCE_LINE_2}
              </span>
              {isCompose && (
                <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-foreground/60 align-text-bottom" />
              )}
            </p>
            <p className={cn("reveal-text", !isCompose && "is-revealed")}>
              {SOURCE_PARA_2}
            </p>
          </div>
        </div>

        {/* TRANSLATION PANE */}
        <div className="relative bg-background px-8 py-7 min-h-[460px]">
          <div className="flex items-baseline justify-between border-b border-hairline pb-2 mb-5">
            <span className="small-caps">Translation</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              en · {isCompose ? "0" : isTranslate ? "26" : "37"} words
            </span>
          </div>

          {/* Empty-state quote (cross-fades out as soon as we leave compose) */}
          <div
            className={cn(
              "cross-fade absolute inset-x-8 top-1/2 -translate-y-1/2 text-center",
              isCompose && "is-visible",
            )}
          >
            <p className="display mx-auto max-w-[26ch] text-[19px] italic text-muted-foreground">
              &ldquo;Translation is that which transforms everything so that nothing changes.&rdquo;
            </p>
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
              Günter Grass
            </p>
          </div>

          {/* Translation content (cross-fades in over the quote) */}
          <div
            className={cn(
              "cross-fade space-y-4 font-serif text-[15px] leading-[1.7]",
              isTranslateOrLater && "is-visible",
            )}
          >
            <p>
              <span className={cn("reveal-text inline", isTranslateOrLater && "is-revealed")}>
                {TRANS_LINE_1_HEAD}
                <span className={cn("word-highlight", isRefine && "is-active")}>breath</span>
                {TRANS_LINE_1_TAIL}
              </span>
              {isTranslate && (
                <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-ink align-text-bottom" />
              )}
            </p>
            <p className={cn("reveal-text", isRefine && "is-revealed")}>
              {TRANS_PARA_2}
            </p>
          </div>

          {/* Variations popover (slides in on refine, positioned near the highlighted word) */}
          <div
            className={cn(
              "slide-in absolute left-8 top-[200px] w-[300px] origin-top rounded-md border border-foreground/15 bg-background text-[12px] shadow-[0_18px_42px_-12px_rgb(0_0_0/0.32)]",
              isRefine && "is-visible",
            )}
          >
            <div className="flex items-baseline justify-between border-b border-hairline px-3 py-2">
              <span className="small-caps">Word</span>
              <span className="font-serif text-[11.5px] italic text-muted-foreground">
                &ldquo;breath&rdquo;
              </span>
            </div>
            <div className="px-3 py-2 text-[11.5px] italic text-muted-foreground">
              Three alternatives, in context.
            </div>
            <div className="border-t border-hairline">
              {[
                { word: "breath", note: "literal" },
                { word: "pulse", note: "rhythmic" },
                { word: "cadence", note: "lyrical" },
              ].map((v, i) => (
                <div
                  key={v.word}
                  className={cn(
                    "flex items-baseline gap-2 px-3 py-2 transition-colors",
                    i > 0 && "border-t border-hairline",
                    i === 1 && "bg-ink/10",
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
          {isCompose && "Tip: paste an article on the left to begin."}
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
