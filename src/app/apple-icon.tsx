import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 48% 45%, rgba(27,83,216,0.38), transparent 60%), radial-gradient(circle at 60% 42%, rgba(216,91,236,0.18), transparent 54%), #f4f0e2",
          color: "#27231f",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 124,
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
