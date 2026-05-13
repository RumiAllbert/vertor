import { NextRequest } from "next/server";
import { z } from "zod";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  ExternalHyperlink,
  AlignmentType,
  type ParagraphChild,
} from "docx";
import { jsPDF } from "jspdf";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type {
  Root,
  RootContent,
  PhrasingContent,
  Heading,
  List,
  ListItem,
  Blockquote,
  Code,
  Paragraph as MdParagraph,
} from "mdast";

export const runtime = "nodejs";

const Body = z.object({
  format: z.enum(["docx", "pdf", "tex", "txt", "md"]),
  title: z.string().default("Untitled"),
  source: z.string().default(""),
  translation: z.string().default(""),
  sourceLang: z.string().default(""),
  targetLang: z.string().default(""),
  mode: z.enum(["translation", "side-by-side"]).default("translation"),
});

function escapeLatex(s: string) {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function safeFile(name: string, ext: string) {
  const base = name.replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "") || "vertor";
  return `${base}.${ext}`;
}

function parseMd(md: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(md) as Root;
}

/* ---------------- DOCX ---------------- */

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

type DocxStyle = {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string;
};

function mergeStyle(a: DocxStyle, b: DocxStyle): DocxStyle {
  return { ...a, ...b, bold: a.bold || b.bold, italics: a.italics || b.italics, strike: a.strike || b.strike, code: a.code || b.code };
}

function inlineToDocx(nodes: PhrasingContent[], style: DocxStyle = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "text":
        out.push(
          new TextRun({
            text: n.value,
            bold: style.bold,
            italics: style.italics,
            strike: style.strike,
            color: style.color,
            font: style.code ? "Courier New" : undefined,
          }),
        );
        break;
      case "strong":
        out.push(...inlineToDocx(n.children, mergeStyle(style, { bold: true })));
        break;
      case "emphasis":
        out.push(...inlineToDocx(n.children, mergeStyle(style, { italics: true })));
        break;
      case "delete":
        out.push(...inlineToDocx(n.children, mergeStyle(style, { strike: true })));
        break;
      case "inlineCode":
        out.push(
          new TextRun({
            text: n.value,
            font: "Courier New",
            bold: style.bold,
            italics: style.italics,
            color: style.color,
          }),
        );
        break;
      case "link": {
        const inner = inlineToDocx(n.children, mergeStyle(style, { color: "0563C1" }));
        // ExternalHyperlink only accepts run-like children; flatten any nested
        // hyperlinks (rare) into bare TextRuns.
        const flat = inner.flatMap((r) =>
          r instanceof ExternalHyperlink ? [] : [r as TextRun],
        );
        out.push(new ExternalHyperlink({ link: n.url, children: flat }));
        break;
      }
      case "break":
        out.push(new TextRun({ break: 1 }));
        break;
      case "image":
        // Render alt text as a fallback; embedding the image bytes is out of scope.
        if (n.alt) out.push(new TextRun({ text: n.alt, italics: true, color: style.color }));
        break;
      default: {
        const node = n as unknown as { children?: PhrasingContent[]; value?: string };
        if (Array.isArray(node.children)) out.push(...inlineToDocx(node.children, style));
        else if (typeof node.value === "string") out.push(new TextRun({ text: node.value, color: style.color }));
      }
    }
  }
  return out;
}

const ORDERED_REF = "vertor-ordered";

function listToParagraphs(list: List, style: DocxStyle, depth = 0): Paragraph[] {
  const out: Paragraph[] = [];
  const ordered = !!list.ordered;
  for (const item of list.children as ListItem[]) {
    let placedMarker = false;
    for (const child of item.children) {
      if (child.type === "paragraph") {
        out.push(
          new Paragraph({
            children: inlineToDocx(child.children, style),
            ...(ordered
              ? { numbering: { reference: ORDERED_REF, level: depth } }
              : { bullet: { level: depth } }),
          }),
        );
        placedMarker = true;
      } else if (child.type === "list") {
        out.push(...listToParagraphs(child, style, depth + 1));
      } else if (child.type === "code") {
        out.push(
          new Paragraph({
            indent: { left: 360 + depth * 360 },
            children: [new TextRun({ text: child.value, font: "Courier New" })],
          }),
        );
      }
    }
    if (!placedMarker) {
      out.push(
        new Paragraph({
          ...(ordered
            ? { numbering: { reference: ORDERED_REF, level: depth } }
            : { bullet: { level: depth } }),
        }),
      );
    }
  }
  return out;
}

function blockToParagraphs(node: RootContent, style: DocxStyle = {}): Paragraph[] {
  switch (node.type) {
    case "heading": {
      const h = node as Heading;
      return [
        new Paragraph({
          heading: HEADING_LEVELS[Math.min(Math.max(h.depth, 1), 6) - 1],
          children: inlineToDocx(h.children, style),
        }),
      ];
    }
    case "paragraph": {
      const p = node as MdParagraph;
      return [new Paragraph({ children: inlineToDocx(p.children, style) })];
    }
    case "list":
      return listToParagraphs(node as List, style);
    case "blockquote": {
      const bq = node as Blockquote;
      const out: Paragraph[] = [];
      for (const c of bq.children) {
        if (c.type === "paragraph") {
          out.push(
            new Paragraph({
              indent: { left: 360 },
              children: inlineToDocx(
                c.children,
                mergeStyle(style, { italics: true, color: style.color ?? "555555" }),
              ),
            }),
          );
        } else {
          out.push(...blockToParagraphs(c, mergeStyle(style, { italics: true })));
        }
      }
      return out;
    }
    case "code": {
      const c = node as Code;
      return [
        new Paragraph({
          children: [new TextRun({ text: c.value, font: "Courier New", color: style.color })],
        }),
      ];
    }
    case "thematicBreak":
      return [new Paragraph({ text: "———", alignment: AlignmentType.CENTER })];
    default:
      return [];
  }
}

function rootToParagraphs(root: Root, style: DocxStyle = {}): Paragraph[] {
  const out: Paragraph[] = [];
  for (const node of root.children) out.push(...blockToParagraphs(node, style));
  return out;
}

/* ---------------- PDF ---------------- */

type PdfRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
  strike?: boolean;
  href?: string;
};

function inlinePdf(nodes: PhrasingContent[], style: Partial<PdfRun> = {}): PdfRun[] {
  const out: PdfRun[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "text":
        out.push({ text: n.value, ...style });
        break;
      case "strong":
        out.push(...inlinePdf(n.children, { ...style, bold: true }));
        break;
      case "emphasis":
        out.push(...inlinePdf(n.children, { ...style, italic: true }));
        break;
      case "delete":
        out.push(...inlinePdf(n.children, { ...style, strike: true }));
        break;
      case "inlineCode":
        out.push({ text: n.value, ...style, mono: true });
        break;
      case "link":
        out.push(...inlinePdf(n.children, { ...style, href: n.url }));
        break;
      case "break":
        out.push({ text: "\n", ...style });
        break;
      case "image":
        if (n.alt) out.push({ text: n.alt, ...style, italic: true });
        break;
      default: {
        const node = n as unknown as { children?: PhrasingContent[]; value?: string };
        if (Array.isArray(node.children)) out.push(...inlinePdf(node.children, style));
        else if (typeof node.value === "string") out.push({ text: node.value, ...style });
      }
    }
  }
  return out;
}

const PDF_HEADING_SIZE = [22, 18, 15, 13, 12, 11];

function buildPdf(title: string, blocks: { kind: "source" | "translation"; root: Root }[]) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 56;
  const baseSize = 12;
  let y = margin;

  const lineHeight = (size: number) => Math.round(size * 1.4);

  const setFontFor = (r: PdfRun, size: number) => {
    const family = r.mono ? "courier" : "times";
    const variant =
      r.bold && r.italic ? "bolditalic" : r.bold ? "bold" : r.italic ? "italic" : "normal";
    pdf.setFont(family, variant);
    pdf.setFontSize(size);
  };

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeRuns = (runs: PdfRun[], size: number, indent = 0, dim = false) => {
    const lh = lineHeight(size);
    const maxX = pageW - margin;
    let x = margin + indent;
    let lineStarted = false;
    ensureSpace(lh);
    for (const r of runs) {
      if (!r.text) continue;
      // Honor explicit newlines from <br>.
      const segments = r.text.split("\n");
      segments.forEach((segment, idx) => {
        if (idx > 0) {
          y += lh;
          ensureSpace(lh);
          x = margin + indent;
          lineStarted = false;
        }
        if (!segment) return;
        // Split into tokens (words + whitespace) so we can wrap on space.
        const tokens = segment.match(/\s+|\S+/g) ?? [];
        for (const token of tokens) {
          const isSpace = /^\s+$/.test(token);
          setFontFor(r, size);
          const w = pdf.getTextWidth(token);
          if (!isSpace && x + w > maxX && lineStarted) {
            y += lh;
            ensureSpace(lh);
            x = margin + indent;
            lineStarted = false;
          }
          if (isSpace && !lineStarted) continue;
          if (r.href) {
            pdf.setTextColor(5, 99, 193);
            pdf.textWithLink(token, x, y, { url: r.href });
            pdf.setTextColor(0, 0, 0);
          } else if (dim) {
            pdf.setTextColor(110, 110, 110);
            pdf.text(token, x, y);
            pdf.setTextColor(0, 0, 0);
          } else {
            pdf.text(token, x, y);
          }
          if (r.strike) {
            const strikeY = y - size * 0.3;
            pdf.setDrawColor(0);
            pdf.line(x, strikeY, x + w, strikeY);
          }
          x += w;
          if (!isSpace) lineStarted = true;
        }
      });
    }
    y += lh;
  };

  const writeList = (list: List, depth: number, dim = false) => {
    let i = 1;
    for (const item of list.children as ListItem[]) {
      const marker = list.ordered ? `${i}. ` : "•  ";
      const indent = 18 + depth * 18;
      let firstParagraph = true;
      for (const c of item.children) {
        if (c.type === "paragraph") {
          if (firstParagraph) {
            setFontFor({ text: marker }, baseSize);
            ensureSpace(lineHeight(baseSize));
            if (dim) pdf.setTextColor(110, 110, 110);
            pdf.text(marker, margin + indent - 14, y);
            if (dim) pdf.setTextColor(0, 0, 0);
            firstParagraph = false;
          }
          writeRuns(inlinePdf(c.children), baseSize, indent, dim);
        } else if (c.type === "list") {
          writeList(c, depth + 1, dim);
        }
      }
      i++;
    }
  };

  const writeBlock = (node: RootContent, dim = false) => {
    switch (node.type) {
      case "heading": {
        const h = node as Heading;
        const size = PDF_HEADING_SIZE[Math.min(Math.max(h.depth, 1), 6) - 1];
        const runs = inlinePdf(h.children, { bold: h.depth <= 4 });
        writeRuns(runs, size, 0, dim);
        y += 2;
        break;
      }
      case "paragraph": {
        const p = node as MdParagraph;
        writeRuns(inlinePdf(p.children), baseSize, 0, dim);
        break;
      }
      case "list":
        writeList(node as List, 0, dim);
        break;
      case "blockquote": {
        const bq = node as Blockquote;
        for (const c of bq.children) {
          if (c.type === "paragraph") {
            writeRuns(inlinePdf(c.children, { italic: true }), baseSize, 18, dim);
          }
        }
        break;
      }
      case "code": {
        const c = node as Code;
        writeRuns([{ text: c.value, mono: true }], baseSize - 1, 12, dim);
        break;
      }
      case "thematicBreak":
        ensureSpace(20);
        pdf.setDrawColor(180);
        pdf.line(margin, y, pageW - margin, y);
        y += 18;
        break;
    }
  };

  // Title
  pdf.setFont("times", "bold");
  pdf.setFontSize(20);
  pdf.text(title, margin, y);
  y += 28;

  for (const block of blocks) {
    writeBlock(block.root.children[0] ?? { type: "paragraph", children: [] }, block.kind === "source");
  }

  return pdf;
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  const { format, title, source, translation, sourceLang, targetLang, mode } = parsed.data;

  const sourceParas = source.split(/\n\s*\n/).filter(Boolean);
  const transParas = translation.split(/\n\s*\n/).filter(Boolean);

  // -------- TXT --------
  if (format === "txt") {
    const body =
      mode === "side-by-side"
        ? sourceParas.map((p, i) => `${p}\n\n— —\n\n${transParas[i] ?? ""}`).join("\n\n———\n\n")
        : translation;
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFile(title, "txt")}"`,
      },
    });
  }

  // -------- Markdown --------
  if (format === "md") {
    const body =
      mode === "side-by-side"
        ? `# ${title}\n\n${sourceParas
            .map(
              (p, i) =>
                `> ${p.replace(/\n/g, "\n> ")}\n\n${transParas[i] ?? ""}`,
            )
            .join("\n\n---\n\n")}`
        : `# ${title}\n\n${translation}`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFile(title, "md")}"`,
      },
    });
  }

  // -------- LaTeX --------
  if (format === "tex") {
    const langMeta = `% source: ${sourceLang || "auto"} -> target: ${targetLang || "?"}\n`;
    const head = `\\documentclass[11pt]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{geometry}\n\\geometry{margin=1in}\n\\usepackage{parskip}\n\\title{${escapeLatex(title)}}\n\\date{}\n\\begin{document}\n\\maketitle\n`;
    const body =
      mode === "side-by-side"
        ? sourceParas
            .map(
              (p, i) =>
                `\\noindent\\textit{${escapeLatex(p)}}\n\n${escapeLatex(transParas[i] ?? "")}\n\n\\hrulefill\n`,
            )
            .join("\n")
        : transParas.map((p) => escapeLatex(p)).join("\n\n");
    const tex = `${langMeta}${head}${body}\n\\end{document}\n`;
    return new Response(tex, {
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFile(title, "tex")}"`,
      },
    });
  }

  // -------- DOCX --------
  if (format === "docx") {
    const children: Paragraph[] = [
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ];

    if (mode === "side-by-side") {
      const srcBlocks = parseMd(source).children;
      const tgtBlocks = parseMd(translation).children;
      const len = Math.max(srcBlocks.length, tgtBlocks.length);
      for (let i = 0; i < len; i++) {
        if (srcBlocks[i]) {
          children.push(...blockToParagraphs(srcBlocks[i], { italics: true, color: "555555" }));
        }
        if (tgtBlocks[i]) {
          children.push(...blockToParagraphs(tgtBlocks[i]));
        }
        children.push(new Paragraph({ text: "" }));
      }
    } else {
      children.push(...rootToParagraphs(parseMd(translation)));
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: ORDERED_REF,
            levels: [
              { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START },
              { level: 1, format: "decimal", text: "%2.", alignment: AlignmentType.START },
              { level: 2, format: "decimal", text: "%3.", alignment: AlignmentType.START },
              { level: 3, format: "decimal", text: "%4.", alignment: AlignmentType.START },
            ],
          },
        ],
      },
      sections: [{ children }],
    });
    const buf = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFile(title, "docx")}"`,
      },
    });
  }

  // -------- PDF --------
  if (format === "pdf") {
    const blocks: { kind: "source" | "translation"; root: Root }[] = [];

    if (mode === "side-by-side") {
      const srcBlocks = parseMd(source).children;
      const tgtBlocks = parseMd(translation).children;
      const len = Math.max(srcBlocks.length, tgtBlocks.length);
      for (let i = 0; i < len; i++) {
        if (srcBlocks[i]) blocks.push({ kind: "source", root: { type: "root", children: [srcBlocks[i]] } as Root });
        if (tgtBlocks[i]) blocks.push({ kind: "translation", root: { type: "root", children: [tgtBlocks[i]] } as Root });
      }
    } else {
      for (const node of parseMd(translation).children) {
        blocks.push({ kind: "translation", root: { type: "root", children: [node] } as Root });
      }
    }

    const pdf = buildPdf(title, blocks);
    const buf = pdf.output("arraybuffer");
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFile(title, "pdf")}"`,
      },
    });
  }

  return new Response("unsupported format", { status: 400 });
}
