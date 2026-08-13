const encoder = new TextEncoder();

export const hostedDelegationHeader = "X-ContextKit-Delegation";

type HostedDelegationPayload = {
  version: 1;
  ownerId: string;
  apiKeyId: string;
  requestId: string;
  path: string;
  bodySha256: string;
  expiresAt: number;
};

type CreateHostedDelegationInput = Omit<HostedDelegationPayload, "version" | "bodySha256" | "expiresAt"> & {
  body: string;
  ttlSeconds?: number;
  now?: number;
};

export async function createHostedDelegation(secret: string, input: CreateHostedDelegationInput) {
  requireSecret(secret);
  const payload: HostedDelegationPayload = {
    version: 1,
    ownerId: input.ownerId,
    apiKeyId: input.apiKeyId,
    requestId: input.requestId,
    path: input.path,
    bodySha256: await sha256(input.body),
    expiresAt: Math.floor((input.now ?? Date.now()) / 1000) + (input.ttlSeconds ?? 120)
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await sign(secret, encoded)}`;
}

export async function verifyHostedDelegation(
  secret: string,
  token: string,
  input: { path: string; body: string; now?: number }
) {
  requireSecret(secret);
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !await verify(secret, encoded, signature)) {
    throw new Error("invalid_hosted_delegation");
  }

  let payload: HostedDelegationPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as HostedDelegationPayload;
  } catch {
    throw new Error("invalid_hosted_delegation");
  }

  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (
    payload.version !== 1 ||
    !payload.ownerId ||
    !payload.apiKeyId ||
    !payload.requestId ||
    payload.path !== input.path ||
    payload.expiresAt < now ||
    payload.expiresAt > now + 300 ||
    payload.bodySha256 !== await sha256(input.body)
  ) {
    throw new Error("invalid_hosted_delegation");
  }

  return payload;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

async function sign(secret: string, value: string) {
  const key = await hmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verify(secret: string, value: string, signature: string) {
  try {
    const key = await hmacKey(secret, ["verify"]);
    return crypto.subtle.verify("HMAC", key, base64UrlDecodeBytes(signature), encoder.encode(value));
  } catch {
    return false;
  }
}

function hmacKey(secret: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64url");
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function base64UrlDecodeBytes(value: string) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64url"));
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireSecret(secret: string) {
  if (!secret || secret.length < 24) throw new Error("hosted_delegation_secret_not_configured");
}
