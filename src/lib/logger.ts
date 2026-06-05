export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, metadata: Record<string, unknown> = {}) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...metadata
  };

  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(entry));
}
