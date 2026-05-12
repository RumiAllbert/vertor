import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(39,35,31,0.45)",
          background:
            "radial-gradient(circle at 48% 45%, rgba(27,83,216,0.34), transparent 62%), #f4f0e2",
          color: "#27231f",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 22,
          fontStyle: "italic",
          lineHeight: 1,
        }}
      >
        V
      </div>
    ),
    size,
  );
}
