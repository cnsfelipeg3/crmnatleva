// Structured JSON logger with PII masking.
// Usage:
//   import { createLogger } from "../_shared/logger.ts";
//   const log = createLogger("extract-sale-data");
//   log.info("extracted", { saleId, durationMs });

import { maskObject } from "./log-mask.ts";

type Level = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
  child: (extra: Record<string, unknown>) => Logger;
}

function emit(level: Level, fn: string, msg: string, base: Record<string, unknown>, ctx?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    fn,
    msg,
    ...base,
    ...(ctx ?? {}),
  };
  const safe = maskObject(payload);
  const line = JSON.stringify(safe);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(fn: string, base: Record<string, unknown> = {}): Logger {
  return {
    debug: (m, c) => emit("debug", fn, m, base, c),
    info: (m, c) => emit("info", fn, m, base, c),
    warn: (m, c) => emit("warn", fn, m, base, c),
    error: (m, c) => emit("error", fn, m, base, c),
    child: (extra) => createLogger(fn, { ...base, ...extra }),
  };
}
