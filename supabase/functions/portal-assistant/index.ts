import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: access } = await admin
      .from("portal_access")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!access) {
      return new Response(JSON.stringify({ error: "No portal access" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = access.client_id;
    const body = await req.json();
    const { question, sale_id, conversation_history } = body;

    if (!question) {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client info
    const { data: client } = await admin.from("clients").select("*").eq("id", clientId).single();

    // Fetch published trips
    const { data: published } = await admin
      .from("portal_published_sales")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true);

    const saleIds = (published || []).map((p: any) => p.sale_id);
    let tripContext = "";

    if (saleIds.length > 0) {
      const targetIds = sale_id ? [sale_id] : saleIds;

      const [salesRes, segRes, costRes, recvRes, paxRes, attRes, lodgRes] = await Promise.all([
        admin.from("sales").select("*").in("id", targetIds),
        admin.from("flight_segments").select("*").in("sale_id", targetIds).order("segment_order"),
        admin.from("cost_items").select("*").in("sale_id", targetIds),
        admin.from("accounts_receivable").select("*").in("sale_id", targetIds).order("due_date"),
        admin.from("sale_passengers").select("*, passengers(*)").in("sale_id", targetIds),
        admin.from("attachments").select("id, file_name, category, file_type").in("sale_id", targetIds),
        admin.from("lodging_confirmation_tasks").select("*").in("sale_id", targetIds),
      ]);

      for (const sale of salesRes.data || []) {
        const pub = published?.find((p: any) => p.sale_id === sale.id);
        const segs = (segRes.data || []).filter((s: any) => s.sale_id === sale.id);
        const costs = (costRes.data || []).filter((c: any) => c.sale_id === sale.id);
        const recvs = (recvRes.data || []).filter((r: any) => r.sale_id === sale.id);
        const paxs = (paxRes.data || []).filter((p: any) => p.sale_id === sale.id);
        const atts = (attRes.data || []).filter((a: any) => a.sale_id === sale.id);
        const lodg = (lodgRes.data || []).filter((l: any) => l.sale_id === sale.id);

        const hotels = costs.filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
        const services = costs.filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel");

        let sellerName = "Equipe NatLeva";
        if (sale.seller_id) {
          const { data: profile } = await admin.from("profiles").select("full_name").eq("id", sale.seller_id).single();
          if (profile?.full_name) sellerName = profile.full_name;
        }

        const totalPaid = recvs.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.gross_value || 0), 0);
        const totalDue = recvs.reduce((s: number, r: any) => s + Number(r.gross_value || 0), 0);
        const pending = totalDue - totalPaid;

        tripContext += `\n\n=== VIAGEM: ${pub?.custom_title || sale.name || "Viagem"} ===\n`;
        tripContext += `ID: ${sale.id}\n`;
        tripContext += `Destino: ${sale.destination_iata || "N/A"} | Origem: ${sale.origin_iata || "N/A"}\n`;
        tripContext += `Saída: ${sale.departure_date || "N/A"} | Retorno: ${sale.return_date || "N/A"}\n`;
        tripContext += `Consultor: ${sellerName}\n`;
        tripContext += `Localizador: ${sale.locator || "N/A"}\n`;

        if (segs.length > 0) {
          tripContext += `\nVOOS:\n`;
          for (const seg of segs) {
            tripContext += `- ${seg.airline || ""} ${seg.flight_number || ""} | ${seg.origin_iata}→${seg.destination_iata} | ${seg.departure_date || ""} ${seg.departure_time || ""} → ${seg.arrival_time || ""} | Classe: ${seg.flight_class || seg.cabin_type || "N/A"} | Dir: ${seg.direction}\n`;
          }
        }

        if (hotels.length > 0) {
          tripContext += `\nHOTÉIS:\n`;
          for (const h of hotels) {
            tripContext += `- ${h.description || "Hotel"} | Reserva: ${h.reservation_code || "N/A"}\n`;
          }
        }

        if (lodg.length > 0) {
          tripContext += `\nHOSPEDAGEM DETALHADA:\n`;
          for (const l of lodg) {
            tripContext += `- ${l.hotel_name || ""} | ${l.city || ""} | Check-in: ${l.checkin_date || "N/A"} | Check-out: ${l.checkout_date || "N/A"} | Quarto: ${l.room_type || "N/A"} | Reserva: ${l.confirmation_number || "N/A"}\n`;
          }
        }

        if (services.length > 0) {
          tripContext += `\nSERVIÇOS:\n`;
          for (const s of services) {
            tripContext += `- ${s.description || s.category} | Tipo: ${s.product_type || s.category} | Reserva: ${s.reservation_code || "N/A"}\n`;
          }
        }

        if (paxs.length > 0) {
          tripContext += `\nPASSAGEIROS:\n`;
          for (const p of paxs) {
            const pax = p.passengers;
            if (pax) {
              tripContext += `- ${pax.first_name || ""} ${pax.last_name || ""} | Doc: ${pax.document_number || "N/A"} | Passaporte: ${pax.passport_number || "N/A"}\n`;
            }
          }
        }

        tripContext += `\nFINANCEIRO:\n`;
        tripContext += `Valor total: R$ ${totalDue.toFixed(2)} | Pago: R$ ${totalPaid.toFixed(2)} | Pendente: R$ ${pending.toFixed(2)}\n`;
        if (recvs.length > 0) {
          tripContext += `Parcelas:\n`;
          for (const r of recvs) {
            tripContext += `  - ${r.installment_number}/${r.installment_total} | R$ ${Number(r.gross_value).toFixed(2)} | Vencimento: ${r.due_date || "N/A"} | Status: ${r.status}\n`;
          }
        }

        if (atts.length > 0) {
          tripContext += `\nDOCUMENTOS DISPONÍVEIS:\n`;
          for (const a of atts) {
            tripContext += `- ${a.file_name} (${a.category})\n`;
          }
        }
      }
    }

    const systemPrompt = `Você é o Assistente NatLeva, um concierge digital de viagens premium. Você ajuda clientes da agência NatLeva a encontrar informações sobre suas viagens.

REGRAS:
- Responda sempre em português brasileiro, de forma clara, elegante e amigável
- Use no máximo 1 emoji por mensagem
- Seja conciso mas completo
- Se a informação não estiver nos dados, diga que não possui essa informação e sugira contatar o consultor
- NUNCA invente dados — use apenas o que está no contexto
- Formate respostas de forma organizada (use negrito com ** para destaques)
- Se o cliente tiver múltiplas viagens e não especificar, pergunte sobre qual viagem está perguntando
- Para questões fora do escopo (não relacionadas à viagem), redirecione educadamente

DADOS DO CLIENTE:
Nome: ${client?.display_name || "Cliente"}
Email: ${client?.email || "N/A"}
Telefone: ${client?.phone || "N/A"}

DADOS DAS VIAGENS:${tripContext || "\nNenhuma viagem encontrada."}

CONTATO NATLEVA:
Suporte WhatsApp: (11) 99999-9999
Email: contato@natleva.com.br`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversation_history?.length) {
      for (const msg of conversation_history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    // Call AI via Lovable proxy
    const aiResp = await fetch("https://lovable.dev/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream response back
    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    let fullAnswer = "";
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // Parse to collect full answer
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullAnswer += content;
              } catch {}
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Log interaction
          if (fullAnswer) {
            await admin.from("portal_assistant_logs").insert({
              client_id: clientId,
              sale_id: sale_id || null,
              question,
              answer: fullAnswer,
            });
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (err) {
    console.error("Portal assistant error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
