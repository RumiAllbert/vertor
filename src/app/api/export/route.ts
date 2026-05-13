import { NextRequest } from "next/server";
import { z } from "zod";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
} from "docx";
import { jsPDF } from "jspdf";
import { languageName } from "@/lib/languages";

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

// Slugify a title for use in a filename. Keep Unicode letters/digits so a
// Chinese / Cyrillic / Arabic title survives intact, just collapse whitespace
// and strip filesystem-hostile punctuation.
function slugifyTitle(title: string): string {
  const cleaned = title
    .normalize("NFC")
    .replace(/["'`]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  return cleaned.slice(0, 80) || "untitled";
}

// Compact language token for the filename: "en", "zh", "fr".
function langToken(code: string): string {
  if (!code) return "";
  return code.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function buildFilename(
  title: string,
  sourceLang: string,
  targetLang: string,
  mode: "translation" | "side-by-side",
  ext: string,
): string {
  const slug = slugifyTitle(title);
  const src = langToken(sourceLang);
  const tgt = langToken(targetLang);
  const langPart = src && tgt ? `${src}-to-${tgt}` : tgt || src;
  const parts = [slug, langPart].filter(Boolean);
  if (mode === "side-by-side") parts.push("bilingual");
  return `${parts.join("--")}.${ext}`;
}

// RFC 5987 — include both ASCII fallback and UTF-8 form so Chinese / Arabic
// titles survive the round-trip through Content-Disposition.
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "_");
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

function langLabel(sourceLang: string, targetLang: string): string {
  const s = sourceLang ? languageName(sourceLang) : "";
  const t = targetLang ? languageName(targetLang) : "";
  if (s && t) return `${s} → ${t}`;
  return t || s || "";
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  const { format, title, source, translation, sourceLang, targetLang, mode } = parsed.data;

  const sourceParas = source.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const transParas = translation.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const langPair = langLabel(sourceLang, targetLang);
  const filename = (ext: string) => buildFilename(title, sourceLang, targetLang, mode, ext);

  // -------- TXT --------
  if (format === "txt") {
    const header = [title, langPair ? `(${langPair})` : "", ""].filter((l, i) =>
      i === 2 ? true : l.length > 0,
    );
    const body =
      mode === "side-by-side"
        ? sourceParas
            .map((p, i) => `${p}\n\n— —\n\n${transParas[i] ?? ""}`)
            .join("\n\n———\n\n")
        : translation;
    return new Response([...header, body].join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": contentDisposition(filename("txt")),
      },
    });
  }

  // -------- Markdown --------
  if (format === "md") {
    const header = `# ${title}\n${langPair ? `\n_${langPair}_\n` : ""}`;
    const body =
      mode === "side-by-side"
        ? sourceParas
            .map(
              (p, i) =>
                `> ${p.replace(/\n/g, "\n> ")}\n\n${transParas[i] ?? ""}`,
            )
            .join("\n\n---\n\n")
        : translation;
    return new Response(`${header}\n${body}`, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": contentDisposition(filename("md")),
      },
    });
  }

  // -------- LaTeX --------
  if (format === "tex") {
    const subtitle = langPair
      ? `\\begin{center}\\small\\textit{${escapeLatex(langPair)}}\\end{center}\n\\vspace{0.5em}\n`
      : "";
    const head =
      `\\documentclass[11pt]{article}\n` +
      `\\usepackage[utf8]{inputenc}\n` +
      `\\usepackage{geometry}\n` +
      `\\geometry{margin=1in}\n` +
      `\\usepackage{parskip}\n` +
      `\\title{${escapeLatex(title)}}\n` +
      `\\date{}\n` +
      `\\begin{document}\n` +
      `\\maketitle\n` +
      subtitle;
    const body =
      mode === "side-by-side"
        ? sourceParas
            .map(
              (p, i) =>
                `\\noindent\\textit{${escapeLatex(p)}}\n\n${escapeLatex(transParas[i] ?? "")}\n\n\\hrulefill\n`,
            )
            .join("\n")
        : transParas.map((p) => escapeLatex(p)).join("\n\n");
    const tex = `${head}${body}\n\\end{document}\n`;
    return new Response(tex, {
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": contentDisposition(filename("tex")),
      },
    });
  }

  // -------- DOCX --------
  if (format === "docx") {
    const children: Paragraph[] = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
    ];
    if (langPair) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [
            new TextRun({ text: langPair, italics: true, color: "666666", size: 22 }),
          ],
        }),
      );
    } else {
      children.push(new Paragraph({ text: "", spacing: { after: 240 } }));
    }
    if (mode === "side-by-side") {
      sourceParas.forEach((p, i) => {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: p, italics: true, color: "555555" }),
            ],
          }),
        );
        children.push(
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: transParas[i] ?? "" })],
          }),
        );
      });
    } else {
      transParas.forEach((p) =>
        children.push(
          new Paragraph({
            spacing: { after: 200, line: 360 },
            children: [new TextRun({ text: p })],
          }),
        ),
      );
    }
    const doc = new Document({
      creator: "Vertor",
      title,
      sections: [{ children }],
    });
    const buf = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": contentDisposition(filename("docx")),
      },
    });
  }

  // -------- PDF --------
  if (format === "pdf") {
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    pdf.setProperties({ title, creator: "Vertor", subject: langPair });

    const margin = 64;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const width = pageW - margin * 2;
    const lineHeight = 16;
    let y = margin;
    let pageNum = 1;

    const drawFooter = () => {
      pdf.setFont("times", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(150);
      pdf.text(String(pageNum), pageW / 2, pageH - margin / 2, { align: "center" });
      pdf.setTextColor(0);
    };

    const ensureRoom = (need: number) => {
      if (y + need > pageH - margin) {
        drawFooter();
        pdf.addPage();
        pageNum += 1;
        y = margin;
      }
    };

    // Title block
    pdf.setFont("times", "bold");
    pdf.setFontSize(20);
    const titleLines = pdf.splitTextToSize(title, width) as string[];
    titleLines.forEach((line) => {
      pdf.text(line, pageW / 2, y, { align: "center" });
      y += 24;
    });
    if (langPair) {
      y += 4;
      pdf.setFont("times", "italic");
      pdf.setFontSize(11);
      pdf.setTextColor(110);
      pdf.text(langPair, pageW / 2, y, { align: "center" });
      pdf.setTextColor(0);
      y += 22;
    }
    // Thin rule under header
    pdf.setDrawColor(200);
    pdf.line(margin + width * 0.3, y, margin + width * 0.7, y);
    y += 24;

    pdf.setFont("times", "normal");
    pdf.setFontSize(12);

    const writeBlock = (text: string, italic = false, muted = false) => {
      pdf.setFont("times", italic ? "italic" : "normal");
      if (muted) pdf.setTextColor(110);
      const wrapped = pdf.splitTextToSize(text, width) as string[];
      wrapped.forEach((line) => {
        ensureRoom(lineHeight);
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      if (muted) pdf.setTextColor(0);
      y += lineHeight * 0.6;
    };

    const writeSeparator = () => {
      ensureRoom(lineHeight);
      pdf.setDrawColor(220);
      pdf.line(margin + width * 0.4, y, margin + width * 0.6, y);
      y += lineHeight;
    };

    if (mode === "side-by-side") {
      sourceParas.forEach((p, i) => {
        writeBlock(p, true, true);
        writeBlock(transParas[i] ?? "");
        if (i < sourceParas.length - 1) writeSeparator();
      });
    } else {
      transParas.forEach((p) => writeBlock(p));
    }
    drawFooter();
    const buf = pdf.output("arraybuffer");
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(filename("pdf")),
      },
    });
  }

  return new Response("unsupported format", { status: 400 });
}
