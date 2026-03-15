const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "host.docker.internal",
]);

function isPrivateIPv4(hostname: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (!match) return false;

  const [a, b] = [Number(match[1]), Number(match[2])];

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().trim();
  if (!normalized) return true;

  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (normalized.endsWith(".internal")) return true;
  if (normalized.endsWith(".localhost")) return true;
  if (isPrivateIPv4(normalized)) return true;

  return false;
}

function getValidatedUrl(raw: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL de imagem inválida");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Somente URLs HTTP(S) são aceitas");
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error("Host bloqueado");
  }

  return parsed;
}

function parseOptionalReferer(raw: string): URL | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol)) return undefined;
    if (isBlockedHost(parsed.hostname)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function buildCandidateUrls(targetUrl: URL, refererUrl?: URL): URL[] {
  const candidates = new Set<string>([targetUrl.toString()]);

  if (targetUrl.hostname === "s3.amazonaws.com") {
    const parts = targetUrl.pathname.split("/").filter(Boolean);
    if (parts.length > 1) {
      const inferredHost = parts[0];
      const restPath = `/${parts.slice(1).join("/")}`;

      candidates.add(`https://${inferredHost}${restPath}${targetUrl.search}`);

      if (refererUrl) {
        const refHost = refererUrl.hostname;
        candidates.add(`https://${refHost}${restPath}${targetUrl.search}`);

        if (refHost.startsWith("www.")) {
          candidates.add(`https://${refHost.replace(/^www\./, "")}${restPath}${targetUrl.search}`);
        } else {
          candidates.add(`https://www.${refHost}${restPath}${targetUrl.search}`);
        }
      }
    }
  }

  return Array.from(candidates)
    .map((url) => {
      try {
        return getValidatedUrl(url);
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => Boolean(url));
}

async function fetchImageCandidate(candidate: URL, refererUrl?: URL): Promise<Response | null> {
  const referers = Array.from(
    new Set(
      [
        refererUrl?.toString(),
        `${candidate.protocol}//${candidate.hostname}/`,
        undefined,
      ].filter((v) => typeof v === "string" || v === undefined),
    ),
  ) as Array<string | undefined>;

  for (const referer of referers) {
    try {
      const response = await fetch(candidate.toString(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
        headers: {
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; LovableImageProxy/1.1)",
          ...(referer ? { "Referer": referer } : {}),
        },
      });

      if (!response.ok || !response.body) continue;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) continue;

      return response;
    } catch {
      // try next strategy/candidate
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const imageUrl = String(payload?.imageUrl || "").trim();
    const refererUrl = parseOptionalReferer(String(payload?.refererUrl || ""));

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = getValidatedUrl(imageUrl);
    const candidates = buildCandidateUrls(targetUrl, refererUrl);

    for (const candidate of candidates) {
      const upstreamResponse = await fetchImageCandidate(candidate, refererUrl);
      if (!upstreamResponse) continue;

      const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
      const contentLength = Number(upstreamResponse.headers.get("content-length") || "0");
      if (Number.isFinite(contentLength) && contentLength > 12 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Imagem muito grande para proxy" }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(upstreamResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Não foi possível carregar a imagem" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});