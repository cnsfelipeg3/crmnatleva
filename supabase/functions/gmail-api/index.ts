// Gmail API proxy via Lovable connector gateway
// Actions: list_threads, get_thread, get_message, send, reply, mark_read, mark_unread, trash, list_labels, profile

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64urlEncode(str: string): string {
  // UTF-8 safe base64url
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64encodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function buildRawEmail(opts: {
  to: string;
  from?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: boolean;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}): string {
  const headers: string[] = [];
  if (opts.from) headers.push(`From: ${opts.from}`);
  headers.push(`To: ${opts.to}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  headers.push(`Subject: =?UTF-8?B?${b64encodeUtf8(opts.subject)}?=`);
  headers.push("MIME-Version: 1.0");
  headers.push(`Content-Type: ${opts.html ? "text/html" : "text/plain"}; charset="UTF-8"`);
  headers.push("Content-Transfer-Encoding: base64");
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  // Encode body as base64 with CRLF every 76 chars to comply with RFC
  const encodedBody = b64encodeUtf8(opts.body).replace(/(.{76})/g, "$1\r\n");
  const message = headers.join("\r\n") + "\r\n\r\n" + encodedBody;
  return b64urlEncode(message);
}

function decodeBody(data?: string): string {
  if (!data) return "";
  try {
    return b64urlDecode(data);
  } catch {
    return "";
  }
}

interface InlineAtt {
  cid: string;
  attachmentId: string;
  mimeType: string;
  filename?: string;
}

function extractParts(payload: any): { text: string; html: string; inline: InlineAtt[] } {
  let text = "";
  let html = "";
  const inline: InlineAtt[] = [];
  const walk = (part: any) => {
    if (!part) return;
    const mime = part.mimeType || "";
    const headers = part.headers || [];
    const cidHeader = headers.find((h: any) => h.name?.toLowerCase() === "content-id")?.value || "";
    const dispHeader = headers.find((h: any) => h.name?.toLowerCase() === "content-disposition")?.value || "";
    const cid = cidHeader.replace(/^<|>$/g, "").trim();
    if (mime === "text/plain" && part.body?.data) text += decodeBody(part.body.data);
    else if (mime === "text/html" && part.body?.data) html += decodeBody(part.body.data);
    else if (mime.startsWith("image/") && part.body?.attachmentId && (cid || /inline/i.test(dispHeader))) {
      inline.push({
        cid: cid || part.partId || "",
        attachmentId: part.body.attachmentId,
        mimeType: mime,
        filename: part.filename,
      });
    }
    if (Array.isArray(part.parts)) part.parts.forEach(walk);
  };
  walk(payload);
  if (!text && !html && payload?.body?.data) {
    text = decodeBody(payload.body.data);
  }
  return { text, html, inline };
}

function headerVal(headers: any[], name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

async function gw(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY not configured");

  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Gmail API ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();

    let result: any;
    switch (action) {
      case "profile": {
        result = await gw(`/users/me/profile`);
        break;
      }
      case "list_labels": {
        result = await gw(`/users/me/labels`);
        break;
      }
      case "list_threads": {
        const q = params.q || "in:inbox";
        const max = params.maxResults || 25;
        const pageToken = params.pageToken ? `&pageToken=${encodeURIComponent(params.pageToken)}` : "";
        const labelParams = (params.labelIds || []).map((l: string) => `&labelIds=${encodeURIComponent(l)}`).join("");
        const list = await gw(`/users/me/threads?maxResults=${max}&q=${encodeURIComponent(q)}${pageToken}${labelParams}`);
        const threads = list.threads || [];
        // Hydrate with metadata in parallel
        const detailed = await Promise.all(
          threads.map(async (t: any) => {
            try {
              const full = await gw(
                `/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
              );
              const msgs = full.messages || [];
              const last = msgs[msgs.length - 1];
              const first = msgs[0];
              const headers = last?.payload?.headers || [];
              const allLabels = new Set<string>();
              msgs.forEach((m: any) => (m.labelIds || []).forEach((l: string) => allLabels.add(l)));
              const fromAddrs = new Set<string>();
              msgs.forEach((m: any) => {
                const f = headerVal(m.payload?.headers || [], "From");
                if (f) fromAddrs.add(f);
              });
              return {
                id: t.id,
                historyId: full.historyId,
                snippet: last?.snippet || first?.snippet || "",
                messageCount: msgs.length,
                from: headerVal(headers, "From"),
                to: headerVal(headers, "To"),
                subject: headerVal(first?.payload?.headers || [], "Subject"),
                date: headerVal(headers, "Date"),
                internalDate: last?.internalDate,
                labels: Array.from(allLabels),
                unread: Array.from(allLabels).includes("UNREAD"),
                starred: Array.from(allLabels).includes("STARRED"),
                participants: Array.from(fromAddrs),
              };
            } catch {
              return { id: t.id, error: true };
            }
          })
        );
        result = {
          threads: detailed,
          nextPageToken: list.nextPageToken || null,
          resultSizeEstimate: list.resultSizeEstimate || 0,
        };
        break;
      }
      case "get_thread": {
        const full = await gw(`/users/me/threads/${params.threadId}?format=full`);
        const messages = await Promise.all(
          (full.messages || []).map(async (m: any) => {
            const headers = m.payload?.headers || [];
            const parts = extractParts(m.payload);
            // Inline cid: images -> data URLs
            let html = parts.html;
            if (html && parts.inline.length) {
              const fetched = await Promise.all(
                parts.inline.map(async (att) => {
                  try {
                    const r = await gw(`/users/me/messages/${m.id}/attachments/${att.attachmentId}`);
                    const data = (r.data || "").replace(/-/g, "+").replace(/_/g, "/");
                    return { ...att, dataUrl: `data:${att.mimeType};base64,${data}` };
                  } catch {
                    return { ...att, dataUrl: "" };
                  }
                })
              );
              for (const a of fetched) {
                if (!a.dataUrl || !a.cid) continue;
                const escaped = a.cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                html = html.replace(new RegExp(`cid:${escaped}`, "gi"), a.dataUrl);
              }
            }
            return {
              id: m.id,
              threadId: m.threadId,
              labelIds: m.labelIds || [],
              snippet: m.snippet,
              internalDate: m.internalDate,
              from: headerVal(headers, "From"),
              to: headerVal(headers, "To"),
              cc: headerVal(headers, "Cc"),
              subject: headerVal(headers, "Subject"),
              date: headerVal(headers, "Date"),
              messageIdHeader: headerVal(headers, "Message-ID"),
              referencesHeader: headerVal(headers, "References"),
              text: parts.text,
              html,
            };
          })
        );
        result = { id: full.id, historyId: full.historyId, messages };
        break;
      }
      case "send": {
        const raw = buildRawEmail({
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject || "",
          body: params.body || "",
          html: !!params.html,
        });
        result = await gw(`/users/me/messages/send`, {
          method: "POST",
          body: JSON.stringify({ raw }),
        });
        break;
      }
      case "reply": {
        // Get the last message in the thread for headers
        const thread = await gw(`/users/me/threads/${params.threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`);
        const msgs = thread.messages || [];
        const last = msgs[msgs.length - 1];
        const headers = last?.payload?.headers || [];
        const msgIdHeader = headerVal(headers, "Message-ID");
        const refsHeader = headerVal(headers, "References");
        const subject = headerVal(headers, "Subject");
        const from = headerVal(headers, "From");
        const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
        const to = params.to || from;
        const raw = buildRawEmail({
          to,
          subject: replySubject,
          body: params.body || "",
          html: !!params.html,
          inReplyTo: msgIdHeader,
          references: refsHeader ? `${refsHeader} ${msgIdHeader}` : msgIdHeader,
        });
        result = await gw(`/users/me/messages/send`, {
          method: "POST",
          body: JSON.stringify({ raw, threadId: params.threadId }),
        });
        break;
      }
      case "mark_read": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        });
        break;
      }
      case "mark_unread": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({ addLabelIds: ["UNREAD"] }),
        });
        break;
      }
      case "trash": {
        result = await gw(`/users/me/threads/${params.threadId}/trash`, { method: "POST" });
        break;
      }
      case "star": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({
            [params.starred ? "addLabelIds" : "removeLabelIds"]: ["STARRED"],
          }),
        });
        break;
      }
      case "archive": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
        });
        break;
      }
      case "mark_spam": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({ addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] }),
        });
        break;
      }
      case "unmark_spam": {
        result = await gw(`/users/me/threads/${params.threadId}/modify`, {
          method: "POST",
          body: JSON.stringify({ removeLabelIds: ["SPAM"], addLabelIds: ["INBOX"] }),
        });
        break;
      }
      case "bulk_modify": {
        const ids: string[] = params.threadIds || [];
        const addLabelIds: string[] = params.addLabelIds || [];
        const removeLabelIds: string[] = params.removeLabelIds || [];
        const results = await Promise.allSettled(
          ids.map((id) =>
            gw(`/users/me/threads/${id}/modify`, {
              method: "POST",
              body: JSON.stringify({ addLabelIds, removeLabelIds }),
            })
          )
        );
        result = {
          ok: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };
        break;
      }
      case "bulk_trash": {
        const ids: string[] = params.threadIds || [];
        const results = await Promise.allSettled(
          ids.map((id) => gw(`/users/me/threads/${id}/trash`, { method: "POST" }))
        );
        result = {
          ok: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        };
        break;
      }
      case "counts": {
        // Returns unread counts for common labels
        const labels = await gw(`/users/me/labels`);
        const wanted = new Set(["INBOX", "UNREAD", "STARRED", "SENT", "TRASH", "SPAM"]);
        const detail = await Promise.all(
          (labels.labels || [])
            .filter((l: any) => wanted.has(l.id))
            .map(async (l: any) => {
              const d = await gw(`/users/me/labels/${l.id}`);
              return { id: d.id, unread: d.messagesUnread || 0, total: d.messagesTotal || 0 };
            })
        );
        result = { labels: detail };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gmail-api] error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
