import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") || "";
const TOKEN = Deno.env.get("ZAPI_TOKEN") || "";
const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!INSTANCE_ID || !TOKEN) {
      return new Response(
        JSON.stringify({ error: "Z-API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, payload } = await req.json();
    let url = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      // === INSTÂNCIA ===
      case "get-qrcode":
        url = `${BASE_URL}/qr-code/image`;
        method = "GET";
        break;

      case "check-status":
        url = `${BASE_URL}/status`;
        method = "GET";
        break;

      case "disconnect":
        url = `${BASE_URL}/disconnect`;
        method = "DELETE";
        break;

      case "restart":
        url = `${BASE_URL}/restart`;
        method = "GET";
        break;

      case "phone-info":
        url = `${BASE_URL}/phone`;
        method = "GET";
        break;

      // === MENSAGENS - ENVIO ===
      case "send-text":
        url = `${BASE_URL}/send-text`;
        method = "POST";
        const textBody: any = {
          phone: payload.phone,
          message: payload.message,
        };
        if (payload.messageId) textBody.messageId = payload.messageId;
        body = JSON.stringify(textBody);
        break;

      case "send-image":
        url = `${BASE_URL}/send-image`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          image: payload.image,
          caption: payload.caption || "",
        });
        break;

      case "send-audio":
        url = `${BASE_URL}/send-audio`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          audio: payload.audio,
          encoding: true,
          waveform: true,
        });
        break;

      case "send-video":
        url = `${BASE_URL}/send-video`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          video: payload.video,
          caption: payload.caption || "",
        });
        break;

      case "send-document":
        url = `${BASE_URL}/send-document/${payload.extension || "pdf"}`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          document: payload.document,
          fileName: payload.fileName || "document",
        });
        break;

      case "send-sticker":
        url = `${BASE_URL}/send-sticker`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          sticker: payload.sticker,
        });
        break;

      case "send-reaction":
        url = `${BASE_URL}/send-reaction`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
          reaction: payload.reaction,
        });
        break;

      case "edit-message":
        url = `${BASE_URL}/send-text`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          message: payload.text,
          editMessageId: payload.messageId,
        });
        break;

      // === MENSAGENS - LEITURA ===
      case "get-chats":
        url = `${BASE_URL}/chats`;
        method = "GET";
        break;

      case "get-chat-messages":
        url = `${BASE_URL}/chat-messages/${payload.phone}`;
        method = "GET";
        break;

      case "get-messages":
        url = `${BASE_URL}/queue`;
        method = "GET";
        break;

      // === CONTATOS ===
      case "get-contacts":
        url = `${BASE_URL}/contacts`;
        method = "GET";
        break;

      case "get-contact":
        url = `${BASE_URL}/contacts/${payload.phone}`;
        method = "GET";
        break;

      case "get-profile-picture":
        url = `${BASE_URL}/profile-picture?phone=${encodeURIComponent(payload.phone)}`;
        method = "GET";
        break;

      case "check-number":
        url = `${BASE_URL}/phone-exists/${payload.phone}`;
        method = "GET";
        break;

      // === WEBHOOK ===
      case "set-webhook":
        url = `${BASE_URL}/update-webhook-received`;
        method = "PUT";
        body = JSON.stringify({
          value: payload.webhookUrl,
          enabled: true,
        });
        break;

      case "set-webhook-sent":
        url = `${BASE_URL}/update-webhook-received-delivery`;
        method = "PUT";
        body = JSON.stringify({
          value: payload.webhookUrl,
          enabled: true,
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const fetchOpts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Client-Token": CLIENT_TOKEN,
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOpts.body = body;
    }

    console.log(`[Z-API] ${action} → ${method} ${url}`);

    const response = await fetch(url, fetchOpts);
    const data = await response.json().catch(() => ({}));

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Z-API] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
