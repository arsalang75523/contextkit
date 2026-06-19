import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #07110d 0%, #0b1612 45%, #111a18 100%)",
          color: "#f3fff9",
          fontFamily: "Arial, sans-serif",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(115,243,195,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(255,123,107,0.16), transparent 26%), radial-gradient(circle at center right, rgba(104,216,255,0.12), transparent 24%)"
          }}
        />
        <div
          style={{
            margin: 64,
            padding: "44px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 1072,
            height: 502,
            borderRadius: 24,
            border: "1px solid rgba(219,255,239,0.18)",
            background: "rgba(10,15,13,0.9)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.32)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                color: "#73f3c3",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "0.04em"
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "#73f3c3",
                  boxShadow: "0 0 28px rgba(115,243,195,0.55)"
                }}
              />
              ContextKit
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 72, lineHeight: 1.02, fontWeight: 700 }}>
              <span>Memory Layer</span>
              <span>for AI Agents</span>
            </div>
            <div style={{ maxWidth: 900, fontSize: 32, lineHeight: 1.35, color: "rgba(243,255,249,0.78)" }}>
              x402-paid context compression, handoffs, profile memory, API credits, and TypeScript SDK.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {["summarize", "compress", "handoff", "profile"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(219,255,239,0.14)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(243,255,249,0.78)",
                    fontSize: 24
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ color: "rgba(243,255,249,0.56)", fontSize: 24 }}>contextkit.pro</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
