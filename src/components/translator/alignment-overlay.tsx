"use client";
import * as React from "react";

type Rect = { top: number; left: number; width: number; height: number };

export type AlignmentVariant = "paragraph" | "tight";

type Props = {
  // We accept a RefObject (not the resolved element) so the component can
  // read .current inside effects, never during render. The overlay tracks
  // resize/scroll itself and reflects changes via state.
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLDivElement | null>;
  kind: "textarea" | "contentEditable";
  // Full plain text of the editor — used to slice content into pre/match/post
  // for the textarea mirror-div technique.
  text: string;
  start: number;
  end: number;
  variant: AlignmentVariant;
};

// Style properties that affect text layout. The mirror div MUST match these
// for client rects to line up with the textarea's rendered glyphs.
const MIRRORED_STYLES = [
  "boxSizing",
  "width",
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "fontStretch",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textAlign",
  "textIndent",
  "textTransform",
  "textRendering",
  "fontFeatureSettings",
  "whiteSpace",
  "wordBreak",
  "wordWrap",
  "overflowWrap",
  "tabSize",
  "direction",
] as const;

function measureTextareaRects(
  ta: HTMLTextAreaElement,
  text: string,
  start: number,
  end: number,
): Rect[] {
  if (start >= end) return [];
  const cs = getComputedStyle(ta);
  const mirror = document.createElement("div");
  const mirrorStyle = mirror.style as unknown as Record<string, string>;
  const csIndexed = cs as unknown as Record<string, string>;
  for (const prop of MIRRORED_STYLES) {
    mirrorStyle[prop] = csIndexed[prop];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-99999px";
  mirror.style.overflow = "hidden";

  const safeEnd = Math.min(end, text.length);
  const safeStart = Math.min(start, safeEnd);
  const before = document.createTextNode(text.slice(0, safeStart));
  const span = document.createElement("span");
  // A trailing newline inside the match makes the rect extend below the last
  // visible glyph. Strip it so the highlight hugs the text.
  let matchText = text.slice(safeStart, safeEnd);
  if (matchText.endsWith("\n")) matchText = matchText.slice(0, -1);
  span.textContent = matchText;
  const after = document.createTextNode(text.slice(safeEnd) + "​");

  mirror.appendChild(before);
  mirror.appendChild(span);
  mirror.appendChild(after);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const rects = Array.from(span.getClientRects()).map((r) => ({
    top: r.top - mirrorRect.top - ta.scrollTop,
    left: r.left - mirrorRect.left - ta.scrollLeft,
    width: r.width,
    height: r.height,
  }));

  document.body.removeChild(mirror);
  return rects;
}

function measureContentEditableRects(
  el: HTMLDivElement,
  start: number,
  end: number,
): Rect[] {
  if (start >= end) return [];
  // The translator's contentEditable holds exactly one text node, but walk
  // defensively to find the right text node and offset.
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  let consumed = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  while (node) {
    const t = node as Text;
    const len = t.nodeValue?.length ?? 0;
    if (!startNode && start <= consumed + len) {
      startNode = t;
      startOffset = Math.max(0, start - consumed);
    }
    if (!endNode && end <= consumed + len) {
      endNode = t;
      endOffset = Math.max(0, end - consumed);
      break;
    }
    consumed += len;
    node = walker.nextNode();
  }
  if (!startNode || !endNode) return [];

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const elRect = el.getBoundingClientRect();
  return Array.from(range.getClientRects()).map((r) => ({
    top: r.top - elRect.top,
    left: r.left - elRect.left,
    width: r.width,
    height: r.height,
  }));
}

type Measurement = {
  rects: Rect[];
  // Anchor rect in viewport coords. The overlay container uses this as its
  // position so its children's editor-local rects compose to viewport coords.
  anchorTop: number;
  anchorLeft: number;
  anchorWidth: number;
  anchorHeight: number;
};

export function AlignmentOverlay({ targetRef, kind, text, start, end, variant }: Props) {
  const [measurement, setMeasurement] = React.useState<Measurement | null>(null);

  React.useLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) {
      setMeasurement(null);
      return;
    }
    if (start >= end) {
      setMeasurement(null);
      return;
    }

    const measure = () => {
      const rects =
        kind === "textarea"
          ? measureTextareaRects(target as HTMLTextAreaElement, text, start, end)
          : measureContentEditableRects(target as HTMLDivElement, start, end);
      const r = target.getBoundingClientRect();
      setMeasurement({
        rects,
        anchorTop: r.top,
        anchorLeft: r.left,
        anchorWidth: r.width,
        anchorHeight: r.height,
      });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(target);
    const onScroll = () => measure();
    target.addEventListener("scroll", onScroll, { passive: true });
    let scrollParent: HTMLElement | null = null;
    if (kind === "contentEditable") {
      let p: HTMLElement | null = target.parentElement;
      while (p) {
        const overflowY = getComputedStyle(p).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          scrollParent = p;
          break;
        }
        p = p.parentElement;
      }
      scrollParent?.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      target.removeEventListener("scroll", onScroll);
      scrollParent?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [targetRef, kind, text, start, end]);

  if (!measurement || measurement.rects.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: measurement.anchorTop,
        left: measurement.anchorLeft,
        width: measurement.anchorWidth,
        height: measurement.anchorHeight,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {measurement.rects.map((r, i) => (
        <div
          key={i}
          className={`alignment-rect ${variant === "tight" ? "is-tight" : "is-paragraph"}`}
          style={{
            position: "absolute",
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
          }}
        />
      ))}
    </div>
  );
}
