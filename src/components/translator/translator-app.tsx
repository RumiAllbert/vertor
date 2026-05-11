"use client";
import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelPicker } from "./model-picker";
import { LangPicker } from "./lang-picker";
import { ExportMenu } from "./export-menu";
import { HistorySidebar } from "./sidebar";
import { UserMenu, type SessionInfo } from "./user-menu";
import { VariationsPopover } from "./variations-popover";
import { ModeToggle, useMode } from "./mode-toggle";
import { SIMPLE_MODE_MODEL_ID } from "@/lib/models";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteLocalDoc,
  deriveTitle,
  listLocalDocs,
  newLocalDoc,
  saveLocalDoc,
  type LocalDoc,
} from "@/lib/storage";
import { languageName } from "@/lib/languages";
import type { VariationKind } from "@/lib/prompts";
import { cn } from "@/lib/utils";

type SelectionInfo = {
  text: string;
  start: number;
  end: number;
  kind: VariationKind;
  rect: DOMRect;
};

const CONTEXT_RADIUS = 240;

function classifySelection(translation: string, start: number, end: number): VariationKind {
  const text = translation.slice(start, end).trim();
  if (!text) return "phrase";
  if (!/\s/.test(text)) return "word";
  const before = translation.slice(0, start);
  const after = translation.slice(end);
  const beforeBoundary = !before || /\n\s*\n\s*$/.test(before) || start === 0;
  const afterBoundary = !after || /^\s*\n\s*\n/.test(after) || end === translation.length;
  if (beforeBoundary && afterBoundary && text.length > 40) return "paragraph";
  return "phrase";
}

function neighborhood(text: string, start: number, end: number, radius = CONTEXT_RADIUS) {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  return text.slice(from, to);
}

export function TranslatorApp({ session }: { session: SessionInfo }) {
  const [docs, setDocs] = React.useState<LocalDoc[]>([]);
  const [doc, setDoc] = React.useState<LocalDoc>(() => newLocalDoc());
  const [mode, setMode] = useMode();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [translating, setTranslating] = React.useState(false);
  const [detectedLang, setDetectedLang] = React.useState<string | null>(null);
  const [globalInstruction, setGlobalInstruction] = React.useState("");
  const [showInstruction, setShowInstruction] = React.useState(false);

  const [selection, setSelection] = React.useState<SelectionInfo | null>(null);
  const [popoverAnchor, setPopoverAnchor] = React.useState<{ top: number; left: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const translationRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setDocs(listLocalDocs());
  }, []);

  React.useEffect(() => {
    if (!doc.sourceText.trim() && !doc.translatedText.trim()) return;
    const t = setTimeout(() => {
      const updated: LocalDoc = {
        ...doc,
        title: doc.title === "Untitled" && doc.sourceText ? deriveTitle(doc.sourceText) : doc.title,
        updatedAt: Date.now(),
      };
      saveLocalDoc(updated);
      setDocs(listLocalDocs());
    }, 600);
    return () => clearTimeout(t);
  }, [doc]);

  React.useEffect(() => {
    const all = listLocalDocs();
    if (all.length > 0 && !doc.sourceText && !doc.translatedText) {
      setDoc(all[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDoc = React.useCallback((patch: Partial<LocalDoc>) => {
    setDoc((d) => ({ ...d, ...patch, updatedAt: Date.now() }));
  }, []);

  // In Simple mode, the document's model always tracks the simple-mode default.
  React.useEffect(() => {
    if (mode === "simple" && doc.modelId !== SIMPLE_MODE_MODEL_ID) {
      setDoc((d) => ({ ...d, modelId: SIMPLE_MODE_MODEL_ID }));
    }
  }, [mode, doc.modelId]);

  const effectiveModelId = mode === "simple" ? SIMPLE_MODE_MODEL_ID : doc.modelId;

  const newDocument = () => {
    const fresh = newLocalDoc({
      targetLang: doc.targetLang,
      sourceLang: doc.sourceLang,
      modelId: doc.modelId,
    });
    setDoc(fresh);
    setDetectedLang(null);
    setGlobalInstruction("");
  };

  const openDocument = (id: string) => {
    const found = docs.find((d) => d.id === id);
    if (found) {
      setDoc(found);
      setDetectedLang(null);
      setSelection(null);
      setPopoverOpen(false);
    }
  };

  const removeDocument = (id: string) => {
    deleteLocalDoc(id);
    setDocs(listLocalDocs());
    if (doc.id === id) newDocument();
  };

  const translate = React.useCallback(
    async (overrideInstruction?: string) => {
      if (!doc.sourceText.trim()) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setTranslating(true);
      setDoc((d) => ({ ...d, translatedText: "" }));
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            text: doc.sourceText,
            sourceLang: doc.sourceLang,
            targetLang: doc.targetLang,
            modelId: effectiveModelId,
            instruction: overrideInstruction ?? globalInstruction,
          }),
        });
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setDoc((d) => ({ ...d, translatedText: acc }));
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      } finally {
        setTranslating(false);
        abortRef.current = null;
      }
    },
    [doc.sourceText, doc.sourceLang, doc.targetLang, effectiveModelId, globalInstruction],
  );

  const detectLanguage = React.useCallback(async () => {
    if (!doc.sourceText.trim() || doc.sourceText.trim().length < 8) return;
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: doc.sourceText }),
      });
      if (res.ok) {
        const { lang } = (await res.json()) as { lang: string };
        setDetectedLang(lang);
      }
    } catch {}
  }, [doc.sourceText]);

  React.useEffect(() => {
    if (doc.sourceLang !== "auto") {
      setDetectedLang(null);
      return;
    }
    const t = setTimeout(() => detectLanguage(), 800);
    return () => clearTimeout(t);
  }, [doc.sourceText, doc.sourceLang, detectLanguage]);

  const onTranslationMouseUp = (e: React.MouseEvent) => {
    const node = translationRef.current;
    if (!node) return;
    const sel = window.getSelection();
    if (!sel) return;

    if (sel.isCollapsed) {
      const range = caretRangeFromPoint(e.clientX, e.clientY);
      if (!range || !node.contains(range.startContainer)) {
        setSelection(null);
        return;
      }
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        const s = sel as Selection & { modify?: (alter: string, dir: string, gran: string) => void };
        if (typeof s.modify === "function") {
          s.modify("move", "backward", "word");
          s.modify("extend", "forward", "word");
        } else {
          expandSelectionToWord(sel);
        }
      } catch {
        expandSelectionToWord(sel);
      }
    }

    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!node.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }
    const { start, end } = absoluteOffsets(node, range);
    const kind = classifySelection(doc.translatedText, start, end);
    const rect = range.getBoundingClientRect();

    setSelection({ text, start, end, kind, rect });
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setPopoverAnchor({
        top: rect.bottom - containerRect.top + 4,
        left: rect.left - containerRect.left,
      });
    }
  };

  const showVariations = () => {
    if (!selection) return;
    setPopoverOpen(true);
  };

  const applyReplacement = (replacement: string) => {
    if (!selection) return;
    const { start, end } = selection;
    setDoc((d) => ({
      ...d,
      translatedText: d.translatedText.slice(0, start) + replacement + d.translatedText.slice(end),
    }));
    setPopoverOpen(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const sourceContext = selection ? neighborhood(doc.sourceText, 0, doc.sourceText.length, 1200) : "";
  const translationContext = selection
    ? neighborhood(doc.translatedText, selection.start, selection.end)
    : "";

  const sourceLangBadge =
    doc.sourceLang === "auto"
      ? detectedLang
        ? `auto · ${detectedLang}`
        : "auto"
      : doc.sourceLang;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <HistorySidebar
          docs={docs}
          currentId={doc.id}
          onSelect={openDocument}
          onNew={newDocument}
          onDelete={removeDocument}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — typographic, hairline-divided */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-6 py-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
            title={sidebarOpen ? "Hide" : "Show history"}
          >
            {sidebarOpen ? "‹" : "›"}
          </button>

          <input
            value={doc.title}
            onChange={(e) => updateDoc({ title: e.target.value })}
            className="display min-w-0 flex-1 bg-transparent px-1 text-[20px] leading-none outline-none placeholder:italic placeholder:text-muted-foreground"
            placeholder="Untitled"
          />

          {/* Language tuple */}
          <div className="flex items-center gap-1.5 text-[12px]">
            <LangPicker
              value={doc.sourceLang}
              onChange={(c) => updateDoc({ sourceLang: c })}
              includeAuto
              ariaLabel="Source language"
              className="h-7 w-auto min-w-[110px] border-0 px-1.5 shadow-none hover:bg-accent/50"
            />
            <span className="font-mono text-[13px] text-muted-foreground">→</span>
            <LangPicker
              value={doc.targetLang}
              onChange={(c) => updateDoc({ targetLang: c })}
              ariaLabel="Target language"
              className="h-7 w-auto min-w-[110px] border-0 px-1.5 shadow-none hover:bg-accent/50"
            />
          </div>

          {mode === "advanced" && (
            <ModelPicker
              value={doc.modelId}
              onChange={(id) => updateDoc({ modelId: id })}
              className="h-7 w-auto min-w-[180px] border-0 px-1.5 text-[12px] shadow-none hover:bg-accent/50"
            />
          )}

          {/* Vertical hairline */}
          <span className="h-5 w-px bg-hairline" />

          <button
            onClick={() => translate()}
            disabled={!doc.sourceText.trim() || translating}
            className={cn(
              "group inline-flex h-8 items-center gap-2 rounded-sm border border-foreground bg-foreground px-3.5 text-[12.5px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all",
              "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]",
              "active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]",
              "disabled:cursor-not-allowed disabled:border-hairline disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1 w-1 rounded-full transition-colors",
                translating ? "bg-background" : "bg-ink",
              )}
            />
            <span className={translating ? "shiny" : ""}>
              {translating ? "Translating" : "Translate"}
            </span>
            {!translating && (
              <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
            )}
          </button>

          <ExportMenu
            title={doc.title}
            source={doc.sourceText}
            translation={doc.translatedText}
            sourceLang={doc.sourceLang === "auto" ? detectedLang ?? "" : doc.sourceLang}
            targetLang={doc.targetLang}
            disabled={!doc.translatedText.trim()}
          />

          <button
            onClick={() => setShowInstruction((s) => !s)}
            className={cn(
              "h-8 text-[12px] italic transition-colors",
              showInstruction ? "text-ink" : "text-muted-foreground hover:text-foreground",
            )}
          >
            instruction
          </button>

          <ModeToggle mode={mode} onChange={setMode} />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu session={session} />
          </div>
        </header>

        {showInstruction && (
          <div className="border-b border-hairline bg-[color-mix(in_oklch,var(--ink)_4%,var(--background))] px-6 py-3">
            <div className="flex items-baseline gap-3">
              <span className="small-caps shrink-0">Instruction</span>
              <Textarea
                value={globalInstruction}
                onChange={(e) => setGlobalInstruction(e.target.value)}
                placeholder='e.g. "Use British spelling. Keep tone casual. Translate place names but keep proper nouns."'
                rows={1}
                className="resize-none border-0 bg-transparent px-0 py-0 text-[13px] italic shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        )}

        {/* Two-pane editor */}
        <div ref={containerRef} className="relative grid min-h-0 flex-1 grid-cols-2">
          {/* Source */}
          <section className="flex min-w-0 flex-col">
            <div className="flex items-baseline justify-between border-b border-hairline px-10 py-3">
              <span className="small-caps">Source</span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {sourceLangBadge} · {wordCount(doc.sourceText)} {wordCount(doc.sourceText) === 1 ? "word" : "words"}
              </span>
            </div>
            <Textarea
              value={doc.sourceText}
              onChange={(e) => updateDoc({ sourceText: e.target.value })}
              placeholder="Paste or write the original here. The translation streams on the right."
              className="editor-surface min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-10 pt-7 pb-10 shadow-none focus-visible:ring-0"
            />
          </section>

          {/* Hairline divider */}
          <span aria-hidden className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-hairline" />

          {/* Translation */}
          <section className="flex min-w-0 flex-col">
            <div className="flex items-baseline justify-between border-b border-hairline px-10 py-3">
              <span className="small-caps">Translation</span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {doc.targetLang} · {wordCount(doc.translatedText)} {wordCount(doc.translatedText) === 1 ? "word" : "words"}
              </span>
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {!doc.translatedText && !translating && (
                <div className="flex h-full items-center justify-center px-12">
                  <figure className="max-w-[28ch] text-center">
                    <blockquote
                      className="display blur-up text-[28px] leading-[1.2] text-foreground/80"
                      style={{ animationDelay: "60ms" }}
                    >
                      “Translation is that which transforms everything so that nothing changes.”
                    </blockquote>
                    <figcaption
                      className="blur-up mt-4 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground"
                      style={{ animationDelay: "260ms" }}
                    >
                      Günter Grass
                    </figcaption>
                    <p
                      className="blur-up mt-8 text-[12px] italic text-muted-foreground"
                      style={{ animationDelay: "420ms" }}
                    >
                      Click <span className="not-italic font-medium text-foreground">Translate</span> when ready. Then click any word — or highlight a phrase — for three alternatives.
                    </p>
                  </figure>
                </div>
              )}
              <div
                ref={translationRef}
                onMouseUp={onTranslationMouseUp}
                className="editor-surface select-text whitespace-pre-wrap px-10 pt-7 pb-10 outline-none"
              >
                {doc.translatedText}
                {translating && (
                  <span className="caret ml-0.5 inline-block h-[0.95em] w-[2px] bg-ink align-text-bottom" />
                )}
              </div>

              {selection && !popoverOpen && (
                <button
                  onClick={showVariations}
                  className="absolute z-10 inline-flex items-center gap-1.5 border border-foreground bg-background px-2.5 py-1 text-[11px] tracking-tight text-foreground shadow-[2px_2px_0_var(--ink)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  style={{
                    top: (popoverAnchor?.top ?? 0) + 4,
                    left: popoverAnchor?.left ?? 0,
                  }}
                >
                  <span className="font-mono text-[10px] text-ink">+3</span>
                  <span>alternatives</span>
                  <span className="text-[10px] italic text-muted-foreground">{selection.kind}</span>
                </button>
              )}

              <VariationsPopover
                open={popoverOpen}
                anchor={popoverAnchor}
                selection={selection?.text ?? ""}
                kind={selection?.kind ?? "phrase"}
                sourceContext={sourceContext}
                translationContext={translationContext}
                sourceLang={doc.sourceLang === "auto" ? detectedLang ?? "auto" : doc.sourceLang}
                targetLang={doc.targetLang}
                modelId={doc.modelId}
                onOpenChange={(o) => {
                  setPopoverOpen(o);
                  if (!o) setSelection(null);
                }}
                onApply={applyReplacement}
                onApplyToWhole={(instruction) => {
                  setGlobalInstruction(instruction);
                  setShowInstruction(true);
                  setPopoverOpen(false);
                  setSelection(null);
                  translate(instruction);
                }}
              />
            </div>
          </section>
        </div>

        <footer className="flex items-baseline justify-between gap-2 border-t border-hairline px-6 py-2">
          <span className="text-[10.5px] italic text-muted-foreground">
            {translating
              ? "Streaming…"
              : doc.translatedText
                ? "Click any word — or highlight a phrase — for three alternatives."
                : "Tip: highlight text on the right to refine word-by-word."}
          </span>
          <span className="flex items-baseline gap-2 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className={cn("inline-block h-[6px] w-[6px] rounded-full", translating ? "bg-ink caret" : "bg-muted-foreground/50")} />
            {translating ? "Live" : "Idle"}
          </span>
        </footer>
      </main>
    </div>
  );
}

/* helpers */

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function caretRangeFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === "function") return doc.caretRangeFromPoint(x, y);
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const r = document.createRange();
    r.setStart(pos.offsetNode, pos.offset);
    r.setEnd(pos.offsetNode, pos.offset);
    return r;
  }
  return null;
}

function absoluteOffsets(root: HTMLElement, range: Range): { start: number; end: number } {
  const start = offsetWithin(root, range.startContainer, range.startOffset);
  const end = offsetWithin(root, range.endContainer, range.endOffset);
  return start <= end ? { start, end } : { start: end, end: start };
}

function offsetWithin(root: Node, node: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current === node) return acc + offset;
    acc += current.nodeValue?.length ?? 0;
    current = walker.nextNode();
  }
  return acc;
}

function expandSelectionToWord(sel: Selection) {
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node.nodeValue ?? "";
  const i = range.startOffset;
  let start = i;
  let end = i;
  while (start > 0 && /\S/.test(text[start - 1] ?? "")) start--;
  while (end < text.length && /\S/.test(text[end] ?? "")) end++;
  if (start === end) return;
  const next = document.createRange();
  next.setStart(node, start);
  next.setEnd(node, end);
  sel.removeAllRanges();
  sel.addRange(next);
}
