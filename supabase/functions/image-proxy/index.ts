import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "host.docker.internal",
]);

function isPrivateIPv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().trim();
  if (!normalized) return true;
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local") || normalized.endsWith(".internal") || normalized.endsWith(".localhost")) return true;
  return isPrivateIPv4(normalized);
}

function getValidatedUrl(raw: string): URL {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("URL de imagem inválida"); }
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Somente URLs HTTP(S) são aceitas");
  if (isBlockedHost(parsed.hostname)) throw new Error("Host bloqueado");
  return parsed;
}

function parseOptionalReferer(raw: string): URL | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol) || isBlockedHost(parsed.hostname)) return undefined;
    return parsed;
  } catch { return undefined; }
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
    .map((url) => { try { return getValidatedUrl(url); } catch { return null; } })
    .filter((url): url is URL => Boolean(url));
}

async function fetchImageCandidate(candidate: URL, refererUrl?: URL): Promise<Response | null> {
  // Single attempt with the most likely-to-succeed referer (origin of the image itself).
  // Multiple retries were causing 100s+ stalls on hostile hosts that always return 500.
  const referer = refererUrl?.toString() || `${candidate.protocol}//${candidate.hostname}/`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s hard cap per image
    const response = await fetch(candidate.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: new URL(referer).origin,
      },
    });
    clearTimeout(timeout);

    if (!response.ok || !response.body) {
      console.warn(`[image-proxy] ${candidate} → ${response.status}`);
      await response.text().catch(() => {});
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const isImageLike = contentType.toLowerCase().startsWith("image/") ||
                        contentType.includes("octet-stream") ||
                        !contentType;
    if (!isImageLike) {
      await response.text().catch(() => {});
      return null;
    }

    return response;
  } catch (err) {
    console.warn(`[image-proxy] fetch error for ${candidate}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function getExtFromContentType(ct: string): string {
  if (ct.includes("webp")) return "webp";
  if (ct.includes("png")) return "png";
  if (ct.includes("avif")) return "avif";
  return "jpg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const imageUrl = String(payload?.imageUrl || "").trim();
    const refererUrl = parseOptionalReferer(String(payload?.refererUrl || ""));

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = getValidatedUrl(imageUrl);
    console.log(`[image-proxy] Processing: ${imageUrl}`);
    const candidates = buildCandidateUrls(targetUrl, refererUrl);
    console.log(`[image-proxy] Candidates: ${candidates.map(c => c.toString()).join(', ')}`);

    for (const candidate of candidates) {
      const upstreamResponse = await fetchImageCandidate(candidate, refererUrl);
      if (!upstreamResponse) continue;

      const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
      const contentLength = Number(upstreamResponse.headers.get("content-length") || "0");
      if (Number.isFinite(contentLength) && contentLength > 12 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Imagem muito grande para proxy" }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Read image into ArrayBuffer
      const imageBytes = await upstreamResponse.arrayBuffer();

      if (imageBytes.byteLength < 100) {
        // Likely an error page, skip
        continue;
      }

      // Upload to Supabase Storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const ext = getExtFromContentType(contentType);
      const fileName = `proxy/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, imageBytes, {
          contentType,
          cacheControl: "public, max-age=86400",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Fallback: return the image directly as before
        return new Response(imageBytes, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);

      return new Response(JSON.stringify({ publicUrl: publicUrlData.publicUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Não foi possível carregar a imagem" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
