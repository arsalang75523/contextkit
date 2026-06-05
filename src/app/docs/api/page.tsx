import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swagger API Docs"
};

export default function SwaggerDocsPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <div id="swagger-ui" />
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" async />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener("load", function () {
              window.SwaggerUIBundle({
                url: "/openapi.json",
                dom_id: "#swagger-ui",
                deepLinking: true,
                persistAuthorization: true
              });
            });
          `
        }}
      />
    </main>
  );
}
