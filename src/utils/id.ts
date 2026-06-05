export function createId(prefix: string) {
  const random = crypto.getRandomValues(new Uint8Array(12));
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${suffix}`;
}
