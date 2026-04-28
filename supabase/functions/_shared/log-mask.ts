// PII / secret sanitization for logs.
// Usage: import { maskPII, maskObject } from "../_shared/log-mask.ts";

const PATTERNS: Array<{ re: RegExp; replace: string }> = [
  // Bearer tokens / API keys
  { re: /Bearer\s+[A-Za-z0-9._-]+/gi, replace: "Bearer ***" },
  { re: /(api[_-]?key|apikey|access[_-]?token|secret)["'\s:=]+["']?[A-Za-z0-9._-]{8,}/gi, replace: "$1=***" },
  // Email
  { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, replace: "***@***" },
  // CPF (xxx.xxx.xxx-xx or 11 digits)
  { re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replace: "***.***.***-**" },
  // Brazilian phone (+55 ...)
  { re: /\+?55\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g, replace: "+55 ** ****-****" },
  // Credit card (16 digits, tolerates spaces/dashes)
  { re: /\b(?:\d[\s-]?){13,16}\b/g, replace: "**** **** **** ****" },
  // Passport (basic loose pattern)
  { re: /\b[A-Z]{2}\d{6,9}\b/g, replace: "PP******" },
];

export function maskPII(input: string): string {
  if (!input) return input;
  let out = input;
  for (const { re, replace } of PATTERNS) {
    out = out.replace(re, replace);
  }
  return out;
}

export function maskObject<T>(obj: T): T {
  try {
    const str = JSON.stringify(obj);
    return JSON.parse(maskPII(str));
  } catch {
    return obj;
  }
}
