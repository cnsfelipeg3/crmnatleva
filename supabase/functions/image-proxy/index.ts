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

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = getValidatedUrl(imageUrl);

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; LovableImageProxy/1.0)",
        "Referer": `${targetUrl.protocol}//${targetUrl.hostname}/`,
      },
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response(JSON.stringify({ error: "Não foi possível carregar a imagem" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response(JSON.stringify({ error: "Resposta não é uma imagem válida" }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
