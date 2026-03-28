/**
 * Centralized debug logging — only outputs in development mode.
 * Usage: import { debugLog, debugWarn } from "@/lib/debugMode";
 *        debugLog("[PREFIX]", "message", data);
 */
export const DEBUG_MODE = import.meta.env.DEV || false;

export function debugLog(...args: unknown[]) {
  if (DEBUG_MODE) console.log(...args);
}

export function debugWarn(...args: unknown[]) {
  if (DEBUG_MODE) console.warn(...args);
}
