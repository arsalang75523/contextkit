import { NextResponse, type NextRequest } from "next/server";

const publicPreviewPaths = new Set(["/", "/share", "/share-card", "/social-card-v6.jpg"]);
const publicPreviewHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, User-Agent, X-Requested-With, Accept, Range",
  "Access-Control-Max-Age": "86400"
};
const noStorePreviewHeaders = {
  ...publicPreviewHeaders,
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0"
};
const socialPreviewCrawlerPattern = /twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot/i;

function isProgrammaticPreviewRequest(request: NextRequest) {
  const accept = request.headers.get("accept")?.trim();
  const fetchDestination = request.headers.get("sec-fetch-dest");

  // Server-side card validators commonly use the Fetch default Accept header.
  // Browsers send an HTML Accept value plus Sec-Fetch-Dest: document instead.
  return accept === "*/*" && !fetchDestination;
}

export function middleware(request: NextRequest) {
  if (publicPreviewPaths.has(request.nextUrl.pathname)) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: publicPreviewHeaders
      });
    }

    if (
      request.nextUrl.pathname === "/" &&
      ["GET", "HEAD"].includes(request.method) &&
      (socialPreviewCrawlerPattern.test(request.headers.get("user-agent") ?? "") || isProgrammaticPreviewRequest(request))
    ) {
      const shareUrl = request.nextUrl.clone();
      shareUrl.pathname = "/share-card";
      const response = NextResponse.rewrite(shareUrl);
      for (const [key, value] of Object.entries(noStorePreviewHeaders)) {
        response.headers.set(key, value);
      }
      response.headers.set("X-ContextKit-Preview-Rewrite", "/share-card");
      return response;
    }

    const response = NextResponse.next();
    const responseHeaders =
      request.nextUrl.pathname === "/" && ["GET", "HEAD"].includes(request.method)
        ? noStorePreviewHeaders
        : publicPreviewHeaders;
    for (const [key, value] of Object.entries(responseHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && request.nextUrl.pathname !== "/dashboard/login") {
    const session = request.cookies.get("ck_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/dashboard/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/share", "/share-card", "/social-card-v6.jpg", "/dashboard/:path*"]
};
