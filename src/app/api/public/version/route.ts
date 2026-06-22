const REPOSITORY = "arsalang75523/contextkit";
const FALLBACK_VERSION = "v1.2.4";

type GitHubCommit = {
  sha?: string;
  commit?: { message?: string };
};

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/commits/main`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 }
    });

    if (!response.ok) return Response.json({ version: FALLBACK_VERSION }, { headers: cacheHeaders() });

    const commit = await response.json() as GitHubCommit;
    return Response.json(
      {
        version: versionFromCommit(commit.commit?.message, commit.sha),
        commit: commit.sha?.slice(0, 7)
      },
      { headers: cacheHeaders() }
    );
  } catch {
    return Response.json({ version: FALLBACK_VERSION }, { headers: cacheHeaders() });
  }
}

function versionFromCommit(message?: string, sha?: string) {
  const match = message?.match(/\bv\.?\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?\b/i)?.[0];
  if (match) return match.replace(/^v\./i, "v");
  return sha ? `git-${sha.slice(0, 7)}` : FALLBACK_VERSION;
}

function cacheHeaders() {
  return { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
}
