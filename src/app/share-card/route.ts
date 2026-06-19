const siteUrl = "https://contextkit.pro";
const title = "ContextKit | Context Infrastructure for AI Agents.";
const description =
  "Reduce token costs, compress conversations, and enable seamless agent handoffs using x402-powered APIs for Bankr and autonomous AI agents.";
const imageUrl = `${siteUrl}/social-card-v6.jpg?card=twitter-root-v7`;

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Access-Control-Allow-Origin": "*"
};

function cardHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${siteUrl}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ContextKit">
    <meta property="og:url" content="${siteUrl}/">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="2400">
    <meta property="og:image:height" content="1200">
    <meta property="og:image:alt" content="ContextKit memory layer for AI agents">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@contextkitpro">
    <meta name="twitter:creator" content="@contextkitpro">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:src" content="${imageUrl}">
    <meta name="twitter:image:alt" content="ContextKit memory layer for AI agents">
  </head>
  <body>ContextKit</body>
</html>`;
}

export function GET() {
  return new Response(cardHtml(), { headers });
}

export function HEAD() {
  return new Response(null, { headers });
}
