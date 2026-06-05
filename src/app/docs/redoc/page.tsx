import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redoc API Reference"
};

export default function RedocPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div id="redoc-container" />
      <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js" async />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener("load", function () {
              window.Redoc.init("/openapi.json", {}, document.getElementById("redoc-container"));
            });
          `
        }}
      />
    </main>
  );
}
