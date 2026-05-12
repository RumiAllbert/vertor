import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { OG_ALT } from "@/lib/brand-metadata";

export const alt = OG_ALT;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#f4f0e2",
          color: "#27231f",
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-22%",
            background:
              "radial-gradient(ellipse at 42% 52%, rgba(27,83,216,0.82), transparent 31%), radial-gradient(ellipse at 56% 42%, rgba(216,91,236,0.72), transparent 27%), radial-gradient(ellipse at 63% 58%, rgba(45,118,107,0.48), transparent 24%)",
            filter: "blur(36px)",
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 52,
            border: "1px solid rgba(39,35,31,0.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 78,
            left: 90,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(39,35,31,0.55)",
          }}
        >
          Vertor
        </div>
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 245,
            fontSize: 138,
            fontStyle: "italic",
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
          }}
        >
          Vertor
        </div>
        <div
          style={{
            position: "absolute",
            left: 90,
            bottom: 136,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Translate. Refine. Ship.
        </div>
        <div
          style={{
            position: "absolute",
            left: 90,
            bottom: 104,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 15,
            letterSpacing: "0.08em",
            color: "rgba(39,35,31,0.62)",
          }}
        >
          A literary translator for prose where voice matters.
        </div>
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 100,
            display: "flex",
            flexDirection: "column",
            width: 468,
            height: 384,
            border: "1px solid rgba(39,35,31,0.26)",
            background: "rgba(244,240,226,0.92)",
            boxShadow: "20px 28px 70px rgba(39,35,31,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 38,
              padding: "0 16px",
              borderBottom: "1px solid rgba(39,35,31,0.15)",
            }}
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(39,35,31,0.2)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", height: 346 }}>
            <Pane label="Source">
              aquella tarde remota en que su padre lo llevo a conocer el hielo.
            </Pane>
            <Pane label="Translation" last>
              that <span style={{ color: "#1b53d8", textDecoration: "underline" }}>distant</span>{" "}
              afternoon when his father took him to discover ice.
            </Pane>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function Pane({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "50%",
        padding: "28px 24px",
        borderRight: last ? "none" : "1px solid rgba(39,35,31,0.13)",
        fontSize: 20,
        lineHeight: 1.38,
      }}
    >
      <span
        style={{
          marginBottom: 24,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(39,35,31,0.48)",
        }}
      >
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
