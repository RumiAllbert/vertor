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
      "Paste an article on the left. Vertor stays out of the way until you ask it to work — no toolbars, no chrome, no AI assistants whispering. Just type.",
  },
  {
    id: "translate",
    eyebrow: "02 · Translate",
    title: "Streamed in any tongue.",
    body:
      "Pick a target language and hit Translate. The output streams in word by word, preserving the original's paragraph breaks, idioms, and voice. Gemini, Claude, or GPT — your choice.",
  },
  {
    id: "refine",
    eyebrow: "03 · Refine",
    title: "Three alternatives, one click.",
    body:
      "Click any word — or highlight a phrase, a sentence, a whole paragraph — and Vertor returns three different renderings. Pick one. Or write your own instruction and re-translate the whole document.",
  },
];

export function Showcase() {
  const [frame, setFrame] = React.useState<Frame>("compose");
  const sectionRef = React.useRef<HTMLDivElement>(null);

  // RAF-based scroll tracking — bypasses scroll-event throttling/quirks and
  // keeps the active frame in sync with the section's bounding rect.
  React.useEffect(() => {
    let raf = 0;
    let lastFrame: Frame = "compose";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      const start = -r.top;
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.max(0, Math.min(1, start / total));
      const next: Frame = p < 0.34 ? "compose" : p < 0.67 ? "translate" : "refine";
      if (next !== lastFrame) {
        lastFrame = next;
        setFrame(next);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id="showcase" ref={sectionRef} className="relative" style={{ minHeight: "300vh" }}>
      {/* Sticky mockup pinned to the viewport while the chapters scroll past */}
      <div className="sticky top-0 z-0 flex h-dvh w-full items-center justify-center">
        <div className="grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1fr_360px] lg:gap-16 lg:px-12">
          <MockupFrame frame={frame} />
          <div className="relative hidden lg:block">
            {CHAPTERS.map((c) => (
              <div
                key={c.id}
                aria-hidden={frame !== c.id}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  frame === c.id ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <div className="small-caps mb-3 text-ink">{c.eyebrow}</div>
                <h3 className="display text-[36px] italic leading-[1.05] md:text-[44px]">
                  {c.title}
                </h3>
                <p className="mt-6 max-w-[34ch] text-[15.5px] leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
                <div className="mt-10 flex items-center gap-1.5">
                  {CHAPTERS.map((d) => (
                    <span
                      key={d.id}
                      className={cn(
                        "h-1 transition-all",
                        d.id === frame ? "w-8 bg-foreground" : "w-3 bg-foreground/20",
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Reserve space — the tallest chapter sets the column height */}
            <div className="invisible" aria-hidden>
              <div className="small-caps mb-3">00 · X</div>
              <h3 className="display text-[36px] italic leading-[1.05] md:text-[44px]">
                Three alternatives, one click.
              </h3>
              <p className="mt-6 max-w-[34ch] text-[15.5px] leading-relaxed">
                {CHAPTERS[2].body}
              </p>
              <div className="mt-10 h-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll trackers — divs that drive frame switching via IntersectionObserver */}
      <div className="relative z-10">
        {CHAPTERS.map((c) => (
          <div
            key={c.id}
            data-frame={c.id}
            data-track="mobile"
            className="flex min-h-dvh items-center px-6 lg:hidden"
          >
            <div className="mx-auto max-w-md text-center">
              <div className="small-caps mb-3 text-ink">{c.eyebrow}</div>
              <h3 className="display text-[28px] italic leading-[1.1]">{c.title}</h3>
              <p className="mt-4 text-[14px] text-muted-foreground">{c.body}</p>
            </div>
          </div>
        ))}
        {/* Desktop trackers — invisible spacers that drive the sticky mockup */}
        {CHAPTERS.map((c) => (
          <div
            key={`d-${c.id}`}
            data-frame={c.id}
            data-track="desktop"
            className="hidden min-h-dvh lg:block"
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Mockup ---------------- */

function MockupFrame({ frame }: { frame: Frame }) {
  return (
    <div className="relative w-full overflow-hidden rounded-md border border-hairline bg-background shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-hairline bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        </div>
        <div className="rounded-sm border border-hairline px-3 py-0.5 font-mono text-[10px] text-muted-foreground">
          vertor.vercel.app/app
        </div>
        <span className="w-12" />
      </div>

      {/* Topbar */}
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-2 text-[11px]">
        <span className="text-muted-foreground">‹</span>
        <span className="display italic text-[14px]">Le souffle d&apos;une voix</span>
        <span className="ml-2 text-muted-foreground">Auto-detect</span>
        <span className="font-mono text-muted-foreground">→</span>
        <span className="text-foreground">English</span>
        <span className="ml-3 inline-flex items-center gap-1.5 rounded-sm border border-foreground bg-foreground px-2 py-0.5 font-medium text-background shadow-[2px_2px_0_var(--ink)]">
          <span className={cn("h-1 w-1 rounded-full", frame === "translate" ? "bg-background caret" : "bg-ink")} />
          {frame === "translate" ? "Translating" : "Translate"}
        </span>
        <span className="text-muted-foreground">Export</span>
        <div className="ml-auto inline-flex items-center rounded-sm border border-hairline p-0.5">
          <span className="rounded-[3px] bg-ink/10 px-2 py-0.5 text-foreground">Simple</span>
          <span className="px-2 py-0.5 text-muted-foreground">Advanced</span>
        </div>
      </div>

      {/* Two-pane editor */}
      <div className="grid grid-cols-2 gap-px bg-hairline">
        <div className="bg-background px-5 py-4">
          <div className="small-caps mb-3">Source</div>
          <SourceContent frame={frame} />
        </div>
        <div className="relative bg-background px-5 py-4">
          <div className="small-caps mb-3">Translation</div>
          <TranslationContent frame={frame} />
          {frame === "refine" && <VariationsPopover />}
        </div>
      </div>
    </div>
  );
}

const SOURCE_SENTENCES = [
  "Le traducteur est un écrivain qui écrit dans la langue d'autrui.",
  "Il habite, le temps d'un livre, le souffle d'une voix qui n'est pas la sienne, et la rend audible.",
  "C'est un art discret, presque effacé, et pourtant rien ne s'écrit sans lui.",
];

function SourceContent({ frame }: { frame: Frame }) {
  if (frame === "compose") {
    return (
      <div className="font-serif text-[14px] leading-relaxed">
        <span className="text-foreground">{SOURCE_SENTENCES[0]}</span>
        <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-foreground/60 align-text-bottom" />
      </div>
    );
  }
  return (
    <div className="space-y-3 font-serif text-[14px] leading-relaxed text-foreground">
      <p>{SOURCE_SENTENCES[0]} {SOURCE_SENTENCES[1]}</p>
      <p>{SOURCE_SENTENCES[2]}</p>
    </div>
  );
}

function TranslationContent({ frame }: { frame: Frame }) {
  if (frame === "compose") {
    return (
      <div className="flex h-32 items-center justify-center text-center">
        <p className="display max-w-[24ch] text-[16px] italic text-muted-foreground">
          “Translation is that which transforms everything so that nothing changes.”
        </p>
      </div>
    );
  }
  if (frame === "translate") {
    return (
      <div className="space-y-3 font-serif text-[14px] leading-relaxed">
        <p>
          A translator is a writer who writes in the language of another. They inhabit, for the length
          of a book, the breath of a voice that is not their own, and make it
        </p>
        <p className="text-muted-foreground/70">
          audible.
          <span className="caret ml-0.5 inline-block h-[1em] w-[2px] bg-ink align-text-bottom" />
        </p>
      </div>
    );
  }
  // refine
  return (
    <div className="space-y-3 font-serif text-[14px] leading-relaxed">
      <p>
        A translator is a writer who writes in the language of another. They inhabit, for the length
        of a book, the <span className="bg-ink/15 px-0.5">breath</span> of a voice that is not
        their own, and make it audible.
      </p>
      <p>It is a quiet art, almost effaced — and yet nothing is written without it.</p>
    </div>
  );
}

function VariationsPopover() {
  return (
    <div className="absolute right-6 top-24 w-[260px] rounded-md border border-foreground/15 bg-background p-0 text-[12px] shadow-[0_12px_36px_-12px_rgb(0_0_0/0.3)]">
      <div className="flex items-baseline justify-between border-b border-hairline px-3 py-2">
        <span className="small-caps">word</span>
        <span className="font-serif text-[11px] italic text-muted-foreground">
          “breath”
        </span>
      </div>
      <div className="px-3 py-2 text-[11px] italic text-muted-foreground">
        Three alternatives, in context.
      </div>
      <div className="border-t border-hairline">
        {["breath", "pulse", "cadence"].map((v, i) => (
          <div
            key={v}
            className={cn(
              "flex items-baseline gap-2 px-3 py-1.5",
              i > 0 && "border-t border-hairline",
              i === 1 && "bg-ink/10",
            )}
          >
            <span className="font-mono text-[9px] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-serif text-[12.5px] text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
