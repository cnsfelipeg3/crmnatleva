// Shared CORS helper with allowlist + regex for *.lovable.app
// Usage: import { buildCorsHeaders } from "../_shared/cors.ts";
//        const headers = buildCorsHeaders(req);

const ALLOWED_ORIGINS = new Set<string>([
  "https://crmnatleva.lovable.app",
  "https://adm.natleva.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
]);

const LOVABLE_REGEX = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;
const LOVABLE_PROJECT_REGEX = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i;

const STANDARD_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (LOVABLE_REGEX.test(origin)) return true;
  if (LOVABLE_PROJECT_REGEX.test(origin)) return true;
  return false;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = isAllowedOrigin(origin) ? origin! : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": STANDARD_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Vary": "Origin",
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }
  return null;
}
