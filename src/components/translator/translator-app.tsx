"use client";
import * as React from "react";
import TurndownService from "turndown";
import { gfm as turndownGfm } from "turndown-plugin-gfm";
import { Eye, EyeOff } from "lucide-react";
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
  newLocalDoc,
  type LocalDoc,
  LocalDocStore,
  type DocStore,
} from "@/lib/doc-store";
import { CloudDocStore } from "@/lib/cloud-doc-store";
import {
  LocalInstructionStore,
  CloudInstructionStore,
  type InstructionStore,
} from "@/lib/instruction-store";
import type { UserPreset } from "@/lib/db/schema";
import { InstructionBar } from "./instruction-bar";
import { MigrateBanner } from "./migrate-banner";
import { languageName } from "@/lib/languages";
import type { VariationKind } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { Check, Copy, History, LayoutGrid } from "lucide-react";
import { captureRevision, listRevisions, restoreRevision, truncate } from "@/lib/revisions";
import type { Revision } from "@/lib/db/schema";
import { HistoryPanel } from "./history-panel";
import { DiffView } from "./diff-view";
import { MarkdownView } from "./markdown-view";
import { AlignmentOverlay } from "./alignment-overlay";
import {
  splitParagraphs,
  findParagraphIndex,
  alignCacheKey,
  getCachedAlignment,
  setCachedAlignment,
  type AlignDirection,
  type AlignmentResult,
} from "@/lib/alignment";

type ViewMode = "edit" | "read";

type SelectionInfo = {
  text: string;
  start: number;
  end: number;
  kind: VariationKind;
  // Plain rect snapshot in viewport coordinates so it survives state updates
  // and can be used with position: fixed anywhere in the DOM.
  rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
};

// Cross-pane alignment state. paragraph* is filled instantly on selection
// using paragraph-index mapping; tight* is filled when /api/align returns and
// shrinks the highlight to the precise corresponding span. Both can be null
// independently — paragraph alignment is best-effort (no-op on paragraph
// count mismatch), tight is best-effort (no-op when the model can't find a
// match).
type Alignment = {
  origin: "source" | "translation";
  paragraphSource: AlignmentResult | null;
  paragraphTranslation: AlignmentResult | null;
  tightSource: AlignmentResult | null;
  tightTranslation: AlignmentResult | null;
};

// Skip the LLM tightening pass for very long selections — they're almost
// always full-paragraph or larger, where the instant paragraph highlight is
// already correct and an LLM round-trip just adds latency and cost.
const ALIGN_MAX_SELECTION = 1500;

const CONTEXT_RADIUS = 240;

// Scripts that don't separate words with whitespace: CJK ideographs, hiragana,
// katakana, Thai, Lao, Khmer, Myanmar. For these, whitespace tells us nothing
// about word boundaries, so classification must fall back to length and the
// presence of paragraph breaks / sentence terminators instead.
const SCRIPTLESS_WS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

function classifySelection(translation: string, start: number, end: number): VariationKind {
  const text = translation.slice(start, end).trim();
  if (!text) return "phrase";
  const before = translation.slice(0, start);
  const after = translation.slice(end);
  const beforeBoundary = !before || /\n\s*\n\s*$/.test(before) || start === 0;
  const afterBoundary = !after || /^\s*\n\s*\n/.test(after) || end === translation.length;

  // Paragraph: selection spans a whole block and is long enough.
  if (beforeBoundary && afterBoundary) {
    const len = [...text].length;
    if (SCRIPTLESS_WS.test(text)) {
      if (len > 12) return "paragraph";
    } else if (text.length > 40) {
      return "paragraph";
    }
  }

  // For CJK / Thai / etc.: no whitespace ≠ "single word". Use Unicode
  // codepoint count — 1 ideograph is a word, anything longer is a phrase.
  if (SCRIPTLESS_WS.test(text)) {
    const len = [...text].length;
    return len <= 1 ? "word" : "phrase";
  }

  if (!/\s/.test(text)) return "word";
  return "phrase";
}

function neighborhood(text: string, start: number, end: number, radius = CONTEXT_RADIUS) {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  return text.slice(from, to);
}

// Word and Google Docs HTML often serialize empty paragraphs as <p><br></p> or
// <p>&nbsp;</p>, which Turndown turns into three or four consecutive newlines.
// Rendered markdown collapses those to a single paragraph break, but the
// contentEditable + textarea show every \n at full line-height — so the edit
// view looks airier than the read view. Standard markdown treats any run of
// blank lines between paragraphs identically, so collapsing here is lossless.
function normalizePastedMarkdown(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
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
  const [userPresets, setUserPresets] = React.useState<UserPreset[]>([]);
  // True once we've finished hydrating from the store. Until then we don't
  // debounce-write back, otherwise the initial "" would clobber the saved
  // value before we read it.
  const [instructionHydrated, setInstructionHydrated] = React.useState(false);

  const [selection, setSelection] = React.useState<SelectionInfo | null>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copyTranslation = React.useCallback(async () => {
    if (!doc.translatedText) return;
    try {
      await navigator.clipboard.writeText(doc.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [doc.translatedText]);

  // Floating "switch to Edit to edit" hint shown when the user clicks or types
  // inside a Read-mode pane. Cleared on a timer.
  const [readHint, setReadHint] = React.useState<{ top: number; left: number; pane: "source" | "translation" } | null>(null);
  const readHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showReadHint = React.useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, pane: "source" | "translation") => {
      const top = "clientY" in e ? (e as React.MouseEvent).clientY + 12 : 0;
      const left = "clientX" in e ? (e as React.MouseEvent).clientX + 12 : 0;
      setReadHint({ top, left, pane });
      if (readHintTimerRef.current) clearTimeout(readHintTimerRef.current);
      readHintTimerRef.current = setTimeout(() => setReadHint(null), 2200);
    },
    [],
  );
  React.useEffect(
    () => () => {
      if (readHintTimerRef.current) clearTimeout(readHintTimerRef.current);
    },
    [],
  );

  const [alignment, setAlignment] = React.useState<Alignment | null>(null);
  const alignAbortRef = React.useRef<AbortController | null>(null);

  // Per-pane Edit/Read toggle. The editors hold raw markdown either way; Read
  // mode swaps them for a rendered MarkdownView (headings, lists, clickable
  // links). UI-only state — never persisted on LocalDoc.
  const [sourceViewMode, setSourceViewMode] = React.useState<ViewMode>("edit");
  const [translationViewMode, setTranslationViewMode] = React.useState<ViewMode>("edit");

  // HTML → Markdown converter for paste events. Memoized so we don't rebuild
  // it (and re-attach the GFM rules) on every render.
  const turndown = React.useMemo(() => {
    const td = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
    });
    td.use(turndownGfm);
    return td;
  }, []);

  // Revision history state
  const [revisions, setRevisions] = React.useState<Revision[]>([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selectedRevision, setSelectedRevision] = React.useState<Revision | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const lastEditCaptureRef = React.useRef<{ ts: number; text: string } | null>(null);
  const loadedFromHistoryRef = React.useRef(false);

  const translationRef = React.useRef<HTMLDivElement>(null);
  const sourceTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  // True when the title was either set by the user (typed into the input) or
  // loaded from history (an intentional title from a previous session). When
  // true, auto-title generation is skipped.
  const titleLockedRef = React.useRef(false);
  const titleAbortRef = React.useRef<AbortController | null>(null);

  const store: DocStore = React.useMemo(
    () => (session.user ? new CloudDocStore() : new LocalDocStore()),
    [session.user],
  );

  const instructionStore: InstructionStore = React.useMemo(
    () => (session.user ? new CloudInstructionStore() : new LocalInstructionStore()),
    [session.user],
  );

  React.useEffect(() => {
    store.list().then(setDocs);
  }, [store]);

  // Hydrate the instruction bar (current text + user presets) once per
  // session/store change. Marking `instructionHydrated` after this lands
  // gates the debounced write-back below so the empty initial state doesn't
  // overwrite the saved value.
  React.useEffect(() => {
    let cancelled = false;
    setInstructionHydrated(false);
    instructionStore.get().then((value) => {
      if (cancelled) return;
      setGlobalInstruction(value.current);
      setUserPresets(value.presets);
      setInstructionHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [instructionStore]);

  // Debounced write of the current instruction text. Same 600ms cadence as
  // the doc save below so the patterns feel identical.
  React.useEffect(() => {
    if (!instructionHydrated) return;
    const t = setTimeout(() => {
      instructionStore.setCurrent(globalInstruction).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [globalInstruction, instructionHydrated, instructionStore]);

  const onSavePreset = React.useCallback(
    (preset: UserPreset) => {
      setUserPresets((prev) => {
        const next = [preset, ...prev];
        instructionStore.setPresets(next).catch(() => {});
        return next;
      });
    },
    [instructionStore],
  );

  const onDeletePreset = React.useCallback(
    (id: string) => {
      setUserPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        instructionStore.setPresets(next).catch(() => {});
        return next;
      });
    },
    [instructionStore],
  );

  // Auto-save status — surfaces the existing 600ms-debounced save in the UI
  // so the user can see their work is being persisted.
  type SaveState = "idle" | "pending" | "saved" | "error";
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const lastSavedAtRef = React.useRef<number | null>(null);
  const [, forceRerender] = React.useState(0);

  React.useEffect(() => {
    if (!doc.sourceText.trim() && !doc.translatedText.trim()) return;
    setSaveState("pending");
    const t = setTimeout(async () => {
      try {
        await store.save({ ...doc, updatedAt: Date.now() });
        setDocs(await store.list());
        lastSavedAtRef.current = Date.now();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [doc, store]);

  // Tick once a minute so the "Saved 3 min ago" label refreshes itself.
  React.useEffect(() => {
    const interval = setInterval(() => forceRerender((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Load revisions for the current doc (cloud-only) and reset on doc change.
  React.useEffect(() => {
    if (!session.user || !doc.id) {
      setRevisions([]);
      return;
    }
    let cancelled = false;
    listRevisions(doc.id).then((rs) => {
      if (!cancelled) setRevisions(rs);
    });
    return () => {
      cancelled = true;
    };
  }, [doc.id, session.user]);

  React.useEffect(() => {
    store.list().then((all) => {
      if (all.length > 0 && !doc.sourceText && !doc.translatedText) {
        setDoc(all[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const updateDoc = React.useCallback((patch: Partial<LocalDoc>) => {
    setDoc((d) => ({ ...d, ...patch, updatedAt: Date.now() }));
  }, []);

  // Clear cross-pane alignment whenever the underlying ground truth changes
  // (different doc, view mode flipped to Read, popover opens, translation
  // starts streaming). The alignment math is bound to specific char offsets
  // that are no longer meaningful after any of these transitions.
  React.useEffect(() => {
    setAlignment(null);
    alignAbortRef.current?.abort();
  }, [doc.id, sourceViewMode, translationViewMode, translating, popoverOpen]);

  // Esc clears any active alignment highlight.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAlignment(null);
        alignAbortRef.current?.abort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // In Simple mode, the document's model always tracks the simple-mode default.
  React.useEffect(() => {
    if (mode === "simple" && doc.modelId !== SIMPLE_MODE_MODEL_ID) {
      setDoc((d) => ({ ...d, modelId: SIMPLE_MODE_MODEL_ID }));
    }
  }, [mode, doc.modelId]);

  const effectiveModelId = mode === "simple" ? SIMPLE_MODE_MODEL_ID : doc.modelId;

  // Auto-title — after the source text settles, ask Flash Lite for a short
  // title in the source language. Skip if the user has touched the title.
  React.useEffect(() => {
    if (titleLockedRef.current) return;
    const text = doc.sourceText.trim();
    if (text.length < 40) return;

    const t = setTimeout(async () => {
      titleAbortRef.current?.abort();
      const controller = new AbortController();
      titleAbortRef.current = controller;
      try {
        const res = await fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ source: doc.sourceText }),
        });
        if (!res.ok) return;
        const { title } = (await res.json()) as { title: string };
        if (!title || titleLockedRef.current) return;
        setDoc((d) => (d.id !== doc.id ? d : { ...d, title, updatedAt: Date.now() }));
      } catch {
        // Aborted or network error — silently drop; title stays "Untitled".
      }
    }, 2500);

    return () => clearTimeout(t);
  }, [doc.sourceText, doc.id]);

  // Migration: when signed in, check for local docs to offer moving to the cloud.
  const [pendingLocalDocs, setPendingLocalDocs] = React.useState<LocalDoc[]>([]);

  React.useEffect(() => {
    if (!session.user) {
      setPendingLocalDocs([]);
      return;
    }
    const local = new LocalDocStore();
    local.list().then((locals) => {
      if (locals.length > 0) setPendingLocalDocs(locals);
    });
  }, [session.user]);

  const migrateLocalDocs = React.useCallback(async () => {
    const res = await fetch("/api/documents/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docs: pendingLocalDocs }),
    });
    if (!res.ok) throw new Error(await res.text());
    const local = new LocalDocStore();
    for (const d of pendingLocalDocs) await local.remove(d.id);
    setPendingLocalDocs([]);
    setDocs(await store.list());
  }, [pendingLocalDocs, store]);

  const newDocument = () => {
    const fresh = newLocalDoc({
      targetLang: doc.targetLang,
      sourceLang: doc.sourceLang,
      modelId: doc.modelId,
    });
    titleLockedRef.current = false;
    loadedFromHistoryRef.current = true; // suppress an accidental edit-capture
    setDoc(fresh);
    setDetectedLang(null);
    setSelectedRevision(null);
  };

  const openDocument = (id: string) => {
    const found = docs.find((d) => d.id === id);
    if (found) {
      // Existing docs have intentional titles — don't auto-overwrite them.
      titleLockedRef.current = true;
      loadedFromHistoryRef.current = true; // suppress an accidental edit-capture
      setDoc(found);
      setDetectedLang(null);
      setSelection(null);
      setPopoverOpen(false);
      setSelectedRevision(null);
    }
  };

  const removeDocument = async (id: string) => {
    await store.remove(id);
    setDocs(await store.list());
    if (doc.id === id) newDocument();
  };

  // Captures a new revision and prepends it to local state. No-ops in local
  // mode (session.user absent). Failures degrade silently per captureRevision's
  // contract — we don't want a flaky revision insert to break the user's flow.
  const capture = React.useCallback(
    async (opts: {
      kind: "translated" | "variation" | "edit" | "restored";
      modelId?: string;
      summary?: string;
    }) => {
      if (!session.user) return;
      const rev = await captureRevision(doc.id, {
        kind: opts.kind,
        modelId: opts.modelId,
        summary: opts.summary,
        sourceText: doc.sourceText,
        translatedText: doc.translatedText,
      });
      if (rev) setRevisions((prev) => [rev, ...prev]);
      lastEditCaptureRef.current = { ts: Date.now(), text: doc.translatedText };
    },
    [doc.id, doc.sourceText, doc.translatedText, session.user],
  );

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
        // Capture the completed translation as a revision milestone. Skip if
        // the request aborted mid-flight (translation is partial).
        if (!controller.signal.aborted && acc.length > 0) {
          // Defer so doc state has flushed before capture reads it.
          setTimeout(() => capture({ kind: "translated", modelId: effectiveModelId }), 0);
        }
      // Edit-settle revision capture lives after `capture` is defined; see
      // the effect below this callback.
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      } finally {
        setTranslating(false);
        abortRef.current = null;
      }
    },
    [doc.sourceText, doc.sourceLang, doc.targetLang, effectiveModelId, globalInstruction, capture],
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

  // Edit-settle revision capture: 15s after the last translatedText change,
  // capture an "edit" revision IF the content actually differs from the last
  // captured snapshot and the change wasn't from a doc-open or restore.
  React.useEffect(() => {
    if (!session.user) return;
    if (translating || popoverOpen) return;
    if (loadedFromHistoryRef.current) {
      loadedFromHistoryRef.current = false;
      return;
    }
    if (!doc.translatedText.trim()) return;
    const last = lastEditCaptureRef.current;
    if (last && last.text === doc.translatedText) return;

    const t = setTimeout(() => {
      // Re-check inside the timer in case state changed since we scheduled.
      const prev = lastEditCaptureRef.current;
      if (prev && prev.text === doc.translatedText) return;
      capture({ kind: "edit" });
    }, 15_000);
    return () => clearTimeout(t);
  }, [doc.translatedText, session.user, translating, popoverOpen, capture]);

  const onTranslationMouseUp = () => {
    if (translationViewMode !== "edit") return;
    const node = translationRef.current;
    if (!node) return;
    const sel = window.getSelection();
    if (!sel) return;

    // A plain single click leaves the selection collapsed (no range). We
    // only act on real selections — either a double-click word selection
    // (native browser behavior) or a click-drag range. Single clicks just
    // place the caret and clear any existing variation state.
    if (sel.isCollapsed) {
      setSelection(null);
      // Only clear cross-pane alignment when the existing alignment came
      // from THIS pane — a source-originated alignment shouldn't vanish
      // because the user dropped a caret on the translation side.
      setAlignment((prev) => (prev?.origin === "translation" ? null : prev));
      return;
    }

    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!node.contains(range.commonAncestorContainer)) {
      setSelection(null);
      setAlignment((prev) => (prev?.origin === "translation" ? null : prev));
      return;
    }
    const text = sel.toString().trim();
    // Reject empty, whitespace-only, or punctuation-only selections. A
    // valid selection must contain at least one letter or digit (any
    // script). Stops clicks on " ", ",", "—", etc. from triggering the chip.
    if (!text || !/[\p{L}\p{N}]/u.test(text)) {
      setSelection(null);
      setAlignment((prev) => (prev?.origin === "translation" ? null : prev));
      return;
    }
    const { start, end } = absoluteOffsets(node, range);
    const kind = classifySelection(doc.translatedText, start, end);

    // Take a viewport-space snapshot of the selection so the chip and the
    // popover trigger can live anywhere in the DOM tree — we'll render them
    // with position: fixed against the viewport.
    const r = range.getBoundingClientRect();
    const rect = {
      top: r.top,
      left: r.left,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    };

    setSelection({ text, start, end, kind, rect });
    triggerAlignment({ origin: "translation", start, end });
  };

  const triggerAlignment = React.useCallback(
    ({ origin, start, end }: { origin: "source" | "translation"; start: number; end: number }) => {
      // No alignment while a translation is streaming — both sides are
      // volatile, and any LLM result will be wrong by the time it lands.
      if (translating) return;
      if (!doc.translatedText.trim()) return;

      const srcParas = splitParagraphs(doc.sourceText);
      const tgtParas = splitParagraphs(doc.translatedText);
      const originParas = origin === "source" ? srcParas : tgtParas;
      const otherParas = origin === "source" ? tgtParas : srcParas;
      const paraIdx = findParagraphIndex(start, originParas);
      const originPara = paraIdx >= 0 ? originParas[paraIdx] : null;
      const otherPara = paraIdx >= 0 ? otherParas[paraIdx] ?? null : null;

      // Show paragraph-level highlight on both sides immediately — origin gets
      // its containing paragraph, other side gets the index-matched paragraph
      // (best-effort: undefined if paragraph counts diverge).
      const paragraphSource = origin === "source"
        ? originPara ? { start: originPara.start, end: originPara.end } : null
        : otherPara ? { start: otherPara.start, end: otherPara.end } : null;
      const paragraphTranslation = origin === "translation"
        ? originPara ? { start: originPara.start, end: originPara.end } : null
        : otherPara ? { start: otherPara.start, end: otherPara.end } : null;

      setAlignment({
        origin,
        paragraphSource,
        paragraphTranslation,
        // Origin pane's tight highlight is the user's literal selection — no
        // round-trip needed.
        tightSource: origin === "source" ? { start, end } : null,
        tightTranslation: origin === "translation" ? { start, end } : null,
      });

      const direction: AlignDirection =
        origin === "source" ? "source-to-translation" : "translation-to-source";
      const originText = origin === "source" ? doc.sourceText : doc.translatedText;
      const selectionText = originText.slice(start, end);

      // Don't ping the LLM for paragraph-sized or larger selections — the
      // instant paragraph highlight is already the right answer.
      if (selectionText.length > ALIGN_MAX_SELECTION) return;

      const cacheKey = alignCacheKey({
        direction,
        selection: selectionText,
        selectionStart: start,
        source: doc.sourceText,
        translation: doc.translatedText,
      });
      const cached = getCachedAlignment(cacheKey);
      if (cached !== undefined) {
        // Apply cached result, but only if the origin side's literal selection
        // is still the one this request was fired for — guards against a race
        // where a new selection was made between this synchronous cache lookup
        // and the (already-scheduled) state update.
        setAlignment((prev) => {
          if (!prev || prev.origin !== origin) return prev;
          const originTight =
            origin === "source" ? prev.tightSource : prev.tightTranslation;
          if (originTight?.start !== start || originTight?.end !== end) return prev;
          return origin === "source"
            ? { ...prev, tightTranslation: cached }
            : { ...prev, tightSource: cached };
        });
        return;
      }

      alignAbortRef.current?.abort();
      const controller = new AbortController();
      alignAbortRef.current = controller;

      (async () => {
        try {
          const res = await fetch("/api/align", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              source: doc.sourceText,
              translation: doc.translatedText,
              selection: selectionText,
              selectionStart: start,
              selectionEnd: end,
              direction,
              sourceLang: doc.sourceLang === "auto" ? detectedLang ?? "auto" : doc.sourceLang,
              targetLang: doc.targetLang,
            }),
          });
          if (!res.ok) return;
          const payload = (await res.json()) as
            | { start: number; end: number }
            | { start: null };
          const tight =
            "end" in payload && typeof payload.start === "number"
              ? { start: payload.start, end: payload.end }
              : null;
          setCachedAlignment(cacheKey, tight);
          // Same staleness guard as the cached-path above — if the user has
          // moved on to a different selection, drop this result rather than
          // overwrite the newer highlight.
          setAlignment((prev) => {
            if (!prev || prev.origin !== origin) return prev;
            const originTight =
              origin === "source" ? prev.tightSource : prev.tightTranslation;
            if (originTight?.start !== start || originTight?.end !== end) return prev;
            return origin === "source"
              ? { ...prev, tightTranslation: tight }
              : { ...prev, tightSource: tight };
          });
        } catch (err) {
          if ((err as Error).name !== "AbortError") console.error(err);
        }
      })();
    },
    [
      doc.sourceText,
      doc.translatedText,
      doc.sourceLang,
      doc.targetLang,
      detectedLang,
      translating,
    ],
  );

  const onSourceSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (sourceViewMode !== "edit") return;
    if (translating) return;
    const ta = e.currentTarget;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start === end) {
      // Collapsed caret — only clear if the alignment came from this pane,
      // otherwise leave the translation→source alignment visible.
      setAlignment((prev) => (prev?.origin === "source" ? null : prev));
      return;
    }
    const text = doc.sourceText.slice(start, end);
    if (!text.trim() || !/[\p{L}\p{N}]/u.test(text)) return;
    triggerAlignment({ origin: "source", start, end });
  };

  const showVariations = () => {
    if (!selection) return;
    setPopoverOpen(true);
  };

  const applyReplacement = (replacement: string) => {
    if (!selection) return;
    const { start, end } = selection;
    const oldText = selection.text;
    setDoc((d) => ({
      ...d,
      translatedText: d.translatedText.slice(0, start) + replacement + d.translatedText.slice(end),
    }));
    setPopoverOpen(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    // Capture the variation as a revision (background; failures swallowed).
    setTimeout(
      () =>
        capture({
          kind: "variation",
          modelId: effectiveModelId,
          summary: `Replaced "${truncate(oldText, 30)}" with "${truncate(replacement, 30)}"`,
        }),
      0,
    );
  };

  const restoreSelected = React.useCallback(async () => {
    if (!selectedRevision) return;
    setRestoring(true);
    try {
      const out = await restoreRevision(doc.id, selectedRevision.id);
      if (out) {
        // Mark this as a non-user mutation so the edit-settle effect doesn't
        // re-capture immediately after the restore lands.
        loadedFromHistoryRef.current = true;
        setDoc((d) => ({
          ...d,
          sourceText: out.document.sourceText,
          translatedText: out.document.translatedText,
          updatedAt: Date.now(),
        }));
        setRevisions((prev) => [out.revision, ...prev]);
        setSelectedRevision(null);
      }
    } finally {
      setRestoring(false);
    }
  }, [selectedRevision, doc.id]);

  const sourceContext = selection ? neighborhood(doc.sourceText, 0, doc.sourceText.length, 1200) : "";
  const translationContext = selection
    ? neighborhood(doc.translatedText, selection.start, selection.end)
    : "";

  // Editable translation pane. We imperatively sync state -> DOM only when
  // an EXTERNAL change diverges from the DOM (streaming, variation applied,
  // doc opened) so the user's caret doesn't jump on every render.
  //
  // We use textContent (not innerText/innerHTML) so the editable surface is
  // always a single text node — that's what makes selection offsets line up
  // with doc.translatedText string indexing (which is what applyReplacement
  // uses to splice). Combined with onKeyDown intercepting Enter to insert a
  // literal '\n', the contentEditable never accumulates <br>/<div> wrappers
  // that would throw offsets off.
  React.useEffect(() => {
    const el = translationRef.current;
    if (!el) return;
    if (el.textContent !== doc.translatedText) {
      el.textContent = doc.translatedText;
    }
  }, [doc.translatedText]);

  const onTranslationInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (popoverOpen) return;
    const next = e.currentTarget.textContent ?? "";
    setDoc((d) => ({ ...d, translatedText: next, updatedAt: Date.now() }));
  };

  const onTranslationKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Force Enter to insert a literal '\n' character instead of the browser's
    // default block-level wrapping. Keeps the content a single text node.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const newline = document.createTextNode("\n");
      range.insertNode(newline);
      range.setStartAfter(newline);
      range.setEndAfter(newline);
      sel.removeAllRanges();
      sel.addRange(range);
      e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const onTranslationPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Convert pasted HTML (Word, Google Docs, web pages) into markdown so
    // structure survives. Fall back to plain text otherwise. Either way we
    // insert as a single text node — the variations feature relies on the
    // contentEditable holding exactly one text node so DOM offsets line up
    // with string indexing into doc.translatedText.
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    const text = normalizePastedMarkdown(html ? turndown.turndown(html) : plain);
    if (!text) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const onSourcePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    if (!html && !plain) return;
    e.preventDefault();
    const md = normalizePastedMarkdown(html ? turndown.turndown(html) : plain);
    const ta = e.currentTarget;
    const start = ta.selectionStart ?? doc.sourceText.length;
    const end = ta.selectionEnd ?? doc.sourceText.length;
    const next = doc.sourceText.slice(0, start) + md + doc.sourceText.slice(end);
    updateDoc({ sourceText: next });
    // The textarea hasn't re-rendered yet; restore the caret after React commits.
    requestAnimationFrame(() => {
      const caret = start + md.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const sourceLangBadge =
    doc.sourceLang === "auto"
      ? detectedLang
        ? `auto · ${detectedLang}`
        : "auto"
      : doc.sourceLang;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div className="flex h-full w-[252px] shrink-0 flex-col border-r border-hairline bg-muted/40">
          {session.user && pendingLocalDocs.length > 0 && (
            <MigrateBanner
              localDocs={pendingLocalDocs}
              userKey={session.user.email ?? "user"}
              onMigrate={migrateLocalDocs}
              onDismiss={() => setPendingLocalDocs([])}
            />
          )}
          <HistorySidebar
            docs={docs}
            currentId={doc.id}
            onSelect={openDocument}
            onNew={newDocument}
            onDelete={removeDocument}
            hideOuterShell
          />
          {session.user && (
            <a
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 border-t border-hairline px-5 py-3 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </a>
          )}
        </div>
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
            onChange={(e) => {
              titleLockedRef.current = true;
              updateDoc({ title: e.target.value });
            }}
            className="display min-w-0 flex-1 bg-transparent px-1 text-[20px] leading-none outline-none placeholder:italic placeholder:text-muted-foreground"
            placeholder="Untitled"
            aria-label="Document title"
          />

          {/* Auto-save indicator — tiny, italic, sits beside the title */}
          <SaveStatus
            state={saveState}
            lastSavedAt={lastSavedAtRef.current}
            hasContent={Boolean(doc.sourceText.trim() || doc.translatedText.trim())}
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
          <InstructionBar
            value={globalInstruction}
            onChange={setGlobalInstruction}
            presets={userPresets}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
          />
        )}

        {/* Two-pane editor */}
        <div ref={containerRef} className="relative grid min-h-0 flex-1 grid-cols-2">
          {/* Source */}
          <section className="flex min-w-0 min-h-0 flex-col">
            <div className="flex items-baseline justify-between border-b border-hairline px-10 py-3">
              <span className="small-caps">Source</span>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  {sourceLangBadge} · {wordCount(doc.sourceText)} {wordCount(doc.sourceText) === 1 ? "word" : "words"}
                </span>
                <ViewToggle
                  mode={sourceViewMode}
                  onToggle={() => setSourceViewMode((m) => (m === "edit" ? "read" : "edit"))}
                />
              </div>
            </div>
            {sourceViewMode === "edit" ? (
              <Textarea
                ref={sourceTextareaRef}
                value={doc.sourceText}
                onChange={(e) => updateDoc({ sourceText: e.target.value })}
                onPaste={onSourcePaste}
                onSelect={onSourceSelect}
                placeholder="Paste or write the original here. The translation streams on the right."
                className="editor-surface min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-10 pt-7 pb-10 shadow-none focus-visible:ring-0"
              />
            ) : (
              <div
                role="region"
                tabIndex={0}
                onClick={(e) => showReadHint(e, "source")}
                onKeyDown={(e) => {
                  if (
                    e.key.length === 1 ||
                    e.key === "Backspace" ||
                    e.key === "Delete" ||
                    e.key === "Enter"
                  ) {
                    e.preventDefault();
                    showReadHint(e, "source");
                  }
                }}
                className="min-h-0 flex-1 overflow-y-auto px-10 pt-7 pb-10 outline-none"
              >
                <MarkdownView source={doc.sourceText} />
              </div>
            )}
          </section>

          {/* Hairline divider */}
          <span aria-hidden className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-hairline" />

          {/* Translation */}
          <section className="flex min-w-0 min-h-0 flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-10 py-3">
              <span className="small-caps">Translation</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  {doc.targetLang} · {wordCount(doc.translatedText)} {wordCount(doc.translatedText) === 1 ? "word" : "words"}
                </span>
                <button
                  type="button"
                  onClick={copyTranslation}
                  disabled={!doc.translatedText.trim()}
                  aria-label={copied ? "Copied" : "Copy translation"}
                  title={copied ? "Copied" : "Copy translation"}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[11px] transition-colors",
                    copied
                      ? "text-ink"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span className="italic">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen((o) => !o)}
                  disabled={!session.user}
                  aria-label="Revision history"
                  title={session.user ? "Revision history" : "Sign in to enable history"}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[11px] transition-colors",
                    historyOpen ? "text-ink bg-ink/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                  )}
                >
                  <History className="h-3 w-3" />
                  <span>History</span>
                </button>
                <ViewToggle
                  mode={translationViewMode}
                  onToggle={() => setTranslationViewMode((m) => (m === "edit" ? "read" : "edit"))}
                  disabled={translating || !doc.translatedText}
                />
              </div>
            </div>
            {selectedRevision ? (
              <DiffView
                revision={selectedRevision}
                currentText={doc.translatedText}
                restoring={restoring}
                onRestore={restoreSelected}
                onBack={() => setSelectedRevision(null)}
              />
            ) : (
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
              {translationViewMode === "edit" ? (
                <>
                  <div
                    ref={translationRef}
                    contentEditable={!translating && !popoverOpen && Boolean(doc.translatedText)}
                    suppressContentEditableWarning
                    spellCheck
                    onMouseUp={onTranslationMouseUp}
                    onInput={onTranslationInput}
                    onKeyDown={onTranslationKeyDown}
                    onPaste={onTranslationPaste}
                    className="editor-surface select-text whitespace-pre-wrap px-10 pt-7 pb-10 outline-none"
                  />

                  {selection && !popoverOpen && (
                    <button
                      onClick={showVariations}
                      className="fixed z-50 inline-flex items-center gap-1.5 border border-foreground bg-background px-2.5 py-1 text-[11px] tracking-tight text-foreground shadow-[2px_2px_0_var(--ink)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]"
                      style={{
                        top: Math.max(8, selection.rect.bottom + 6),
                        left: Math.max(8, selection.rect.left),
                      }}
                    >
                      <span className="font-mono text-[10px] text-ink">+3</span>
                      <span>alternatives</span>
                      <span className="text-[10px] italic text-muted-foreground">{selection.kind}</span>
                    </button>
                  )}

                  <VariationsPopover
                    open={popoverOpen}
                    anchor={
                      selection
                        ? { top: selection.rect.bottom, left: selection.rect.left }
                        : null
                    }
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
                </>
              ) : (
                doc.translatedText && (
                  <div
                    role="region"
                    tabIndex={0}
                    onClick={(e) => showReadHint(e, "translation")}
                    onKeyDown={(e) => {
                      if (
                        e.key.length === 1 ||
                        e.key === "Backspace" ||
                        e.key === "Delete" ||
                        e.key === "Enter"
                      ) {
                        e.preventDefault();
                        showReadHint(e, "translation");
                      }
                    }}
                    className="px-10 pt-7 pb-10 outline-none"
                  >
                    <MarkdownView source={doc.translatedText} />
                  </div>
                )
              )}
            </div>
            )}
          </section>
        </div>

        {alignment && sourceViewMode === "edit" && (alignment.tightSource ?? alignment.paragraphSource) && (
          <AlignmentOverlay
            targetRef={sourceTextareaRef}
            kind="textarea"
            text={doc.sourceText}
            start={(alignment.tightSource ?? alignment.paragraphSource)!.start}
            end={(alignment.tightSource ?? alignment.paragraphSource)!.end}
            variant={alignment.tightSource ? "tight" : "paragraph"}
          />
        )}

        {alignment && translationViewMode === "edit" && !selectedRevision && (alignment.tightTranslation ?? alignment.paragraphTranslation) && (
          <AlignmentOverlay
            targetRef={translationRef}
            kind="contentEditable"
            text={doc.translatedText}
            start={(alignment.tightTranslation ?? alignment.paragraphTranslation)!.start}
            end={(alignment.tightTranslation ?? alignment.paragraphTranslation)!.end}
            variant={alignment.tightTranslation ? "tight" : "paragraph"}
          />
        )}

        <footer className="flex shrink-0 items-baseline justify-between gap-2 border-t border-hairline bg-background px-6 py-2">
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

      {readHint && (
        <div
          role="status"
          className="fade-up fixed z-50 max-w-[260px] border border-foreground bg-background px-3 py-2 text-[11.5px] leading-snug text-foreground shadow-[2px_2px_0_var(--ink)]"
          style={{ top: readHint.top, left: readHint.left }}
        >
          <div className="small-caps mb-1">Read mode</div>
          <div className="italic text-muted-foreground">
            To edit this {readHint.pane}, switch the toggle to{" "}
            <span className="not-italic font-medium text-foreground">Edit</span>.
          </div>
        </div>
      )}

      {historyOpen && session.user && (
        <HistoryPanel
          revisions={revisions}
          selectedRevisionId={selectedRevision?.id ?? null}
          onSelect={setSelectedRevision}
          onClose={() => {
            setHistoryOpen(false);
            setSelectedRevision(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- SaveStatus ---------------- */

type SaveStateValue = "idle" | "pending" | "saved" | "error";

function SaveStatus({
  state,
  lastSavedAt,
  hasContent,
}: {
  state: SaveStateValue;
  lastSavedAt: number | null;
  hasContent: boolean;
}) {
  if (!hasContent) return null;

  if (state === "pending") {
    return (
      <span className="shrink-0 text-[11px] italic text-muted-foreground">
        Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="shrink-0 text-[11px] italic text-destructive">
        Couldn’t save
      </span>
    );
  }
  if (state === "saved" && lastSavedAt) {
    return (
      <span
        className="shrink-0 text-[11px] italic text-muted-foreground"
        title={new Date(lastSavedAt).toLocaleString()}
      >
        Saved {timeAgo(lastSavedAt)}
      </span>
    );
  }
  return null;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------- ViewToggle ---------------- */

function ViewToggle({
  mode,
  onToggle,
  disabled = false,
}: {
  mode: ViewMode;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const next = mode === "edit" ? "read" : "edit";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={next === "read" ? "Show rendered view" : "Show raw markdown"}
      title={next === "read" ? "Read view" : "Edit view"}
      className={cn(
        "inline-flex items-center text-muted-foreground transition-colors hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {mode === "edit" ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/* helpers */

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
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

