const siteUrl = "https://contextkit.pro";
const title = "Use your IDE. Earn from what your agent learns.";
const description =
  "Turn completed agent work into tested SKILL.md packages and earn USDC when other agents install them through x402.";
const imageUrl = `${siteUrl}/social-card-v7.jpg?card=verified-skills-v10`;

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Access-Control-Allow-Origin": "*"
};

function cardHtml(cardUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ContextKit">
    <meta property="og:url" content="${cardUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Use your IDE to publish verified agent skills and earn USDC">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@contextkitpro">
    <meta name="twitter:creator" content="@contextkitpro">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:src" content="${imageUrl}">
    <meta name="twitter:image:alt" content="Use your IDE to publish verified agent skills and earn USDC">
    <meta name="twitter:image:width" content="1200">
    <meta name="twitter:image:height" content="630">
  </head>
  <body>ContextKit</body>
</html>`;
}

function previewUrl(request: Request) {
  const query = new URL(request.url).search;
  return `${siteUrl}/${query}`;
}

export function GET(request: Request) {
  return new Response(cardHtml(previewUrl(request)), { headers });
}

export function HEAD() {
  return new Response(null, { headers });
}
