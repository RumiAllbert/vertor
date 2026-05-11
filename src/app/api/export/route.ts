import { NextRequest } from "next/server";
import { z } from "zod";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { jsPDF } from "jspdf";

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
      sourceParas.forEach((p, i) => {
        children.push(
          new Paragraph({ children: [new TextRun({ text: p, italics: true, color: "555555" })] }),
        );
        children.push(new Paragraph(transParas[i] ?? ""));
        children.push(new Paragraph({ text: "" }));
      });
    } else {
      transParas.forEach((p) => children.push(new Paragraph(p)));
    }
    const doc = new Document({ sections: [{ children }] });
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
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 56;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 16;
    let y = margin;

    pdf.setFont("times", "bold");
    pdf.setFontSize(18);
    pdf.text(title, margin, y);
    y += 28;
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);

    const writeBlock = (text: string, italic = false) => {
      pdf.setFont("times", italic ? "italic" : "normal");
      const wrapped = pdf.splitTextToSize(text, width) as string[];
      wrapped.forEach((line) => {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      y += lineHeight / 2;
    };

    if (mode === "side-by-side") {
      sourceParas.forEach((p, i) => {
        writeBlock(p, true);
        writeBlock(transParas[i] ?? "");
      });
    } else {
      transParas.forEach((p) => writeBlock(p));
    }
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
