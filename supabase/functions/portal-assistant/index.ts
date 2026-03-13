import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Fetch ALL published trips for this client
    const { data: published } = await admin
      .from("portal_published_sales")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true);

    const publishedSaleIds = (published || []).map((p: any) => p.sale_id);

    // Also fetch sales directly linked to this client
    const { data: directSales } = await admin
      .from("sales")
      .select("id")
      .eq("client_id", clientId);

    const directSaleIds = (directSales || []).map((s: any) => s.id);

    // Also check if client name matches any sale name
    let nameSaleIds: string[] = [];
    if (client?.display_name && client.display_name.length > 3) {
      const { data: nameSales } = await admin
        .from("sales")
        .select("id")
        .ilike("name", `%${client.display_name}%`)
        .limit(20);
      nameSaleIds = (nameSales || []).map((s: any) => s.id);
    }

    // Merge all unique sale IDs
    const saleIds = [...new Set([...publishedSaleIds, ...directSaleIds, ...nameSaleIds])];
    console.log(`Portal Assistant: client=${clientId}, name=${client?.display_name}, total_sales=${saleIds.length}`);

    let tripContext = "";

    if (saleIds.length > 0) {
      const targetIds = saleIds;

      const [salesRes, segRes, costRes, recvRes, paxRes, attRes, lodgRes, checkinRes] = await Promise.all([
        admin.from("sales").select("*").in("id", targetIds),
        admin.from("flight_segments").select("*").in("sale_id", targetIds).order("departure_date").order("segment_order"),
        admin.from("cost_items").select("*").in("sale_id", targetIds),
        admin.from("accounts_receivable").select("*").in("sale_id", targetIds).order("due_date"),
        admin.from("sale_passengers").select("*, passengers(*)").in("sale_id", targetIds),
        admin.from("attachments").select("id, file_name, category, file_type").in("sale_id", targetIds),
        admin.from("lodging_confirmation_tasks").select("*").in("sale_id", targetIds),
        admin.from("checkin_tasks").select("*").in("sale_id", targetIds),
      ]);

      // Fetch seller profiles
      const sellerIds = [...new Set((salesRes.data || []).map((s: any) => s.seller_id).filter(Boolean))];
      let sellerMap: Record<string, string> = {};
      if (sellerIds.length > 0) {
        const { data: profiles } = await admin.from("profiles").select("id, full_name, email").in("id", sellerIds);
        for (const p of profiles || []) {
          sellerMap[p.id] = p.full_name || p.email || "Consultor NatLeva";
        }
      }

      for (const sale of salesRes.data || []) {
        const pub = (published || []).find((p: any) => p.sale_id === sale.id);
        const segs = (segRes.data || []).filter((s: any) => s.sale_id === sale.id);
        const costs = (costRes.data || []).filter((c: any) => c.sale_id === sale.id);
        const recvs = (recvRes.data || []).filter((r: any) => r.sale_id === sale.id);
        const paxs = (paxRes.data || []).filter((p: any) => p.sale_id === sale.id);
        const atts = (attRes.data || []).filter((a: any) => a.sale_id === sale.id);
        const lodg = (lodgRes.data || []).filter((l: any) => l.sale_id === sale.id);
        const checkins = (checkinRes.data || []).filter((c: any) => c.sale_id === sale.id);

        const hotels = costs.filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
        const services = costs.filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel" && c.product_type !== "aereo");

        const sellerName = sale.seller_id ? (sellerMap[sale.seller_id] || "Equipe NatLeva") : "Equipe NatLeva";

        const totalPaid = recvs.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + Number(r.gross_value || 0), 0);
        const totalDue = recvs.reduce((s: number, r: any) => s + Number(r.gross_value || 0), 0);
        const pending = totalDue - totalPaid;
        const nextDue = recvs.find((r: any) => r.status !== "pago");

        const isFocused = sale_id === sale.id;
        tripContext += `\n\n${"=".repeat(60)}\n`;
        tripContext += `VIAGEM: ${pub?.custom_title || sale.name || "Viagem"}${isFocused ? " ★ (VIAGEM ATUAL EM FOCO)" : ""}\n`;
        tripContext += `${"=".repeat(60)}\n`;
        tripContext += `ID: ${sale.id}\n`;
        tripContext += `Status da venda: ${sale.status || "N/A"}\n`;
        tripContext += `Destino: ${sale.destination_iata || "N/A"} | Origem: ${sale.origin_iata || "N/A"}\n`;
        tripContext += `Data de embarque: ${sale.departure_date || "N/A"}\n`;
        tripContext += `Data de retorno: ${sale.return_date || "N/A"}\n`;
        tripContext += `Consultor responsável: ${sellerName}\n`;
        tripContext += `Localizador geral: ${sale.locator || "N/A"}\n`;
        tripContext += `Companhia aérea principal: ${sale.airline || "N/A"}\n`;
        if (sale.observations) tripContext += `Observações: ${sale.observations}\n`;

        // Flight segments
        if (segs.length > 0) {
          tripContext += `\n── VOOS (${segs.length} segmentos) ──\n`;
          for (const seg of segs) {
            tripContext += `  ✈ ${seg.airline || ""} ${seg.flight_number || "s/n"}\n`;
            tripContext += `    Trecho: ${seg.origin_iata} → ${seg.destination_iata}\n`;
            tripContext += `    Data: ${seg.departure_date || "N/A"}\n`;
            tripContext += `    Horário: ${seg.departure_time || "N/A"} → ${seg.arrival_time || "N/A"}\n`;
            tripContext += `    Classe: ${seg.flight_class || seg.cabin_type || "N/A"}\n`;
            tripContext += `    Direção: ${seg.direction === "outbound" ? "IDA" : seg.direction === "return" ? "VOLTA" : seg.direction || "N/A"}\n`;
            if (seg.terminal) tripContext += `    Terminal: ${seg.terminal}\n`;
            if (seg.operated_by) tripContext += `    Operado por: ${seg.operated_by}\n`;
            if (seg.duration_minutes) tripContext += `    Duração: ${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60}min\n`;
            if (seg.connection_time_minutes) tripContext += `    Conexão após este voo: ${seg.connection_time_minutes}min\n`;
            if (seg.baggage_info) tripContext += `    Bagagem: ${seg.baggage_info}\n`;
          }
        } else {
          tripContext += `\n── VOOS ──\nNenhum segmento de voo cadastrado.\n`;
        }

        // Hotels from lodging tasks
        if (lodg.length > 0) {
          tripContext += `\n── HOSPEDAGEM (${lodg.length} reservas) ──\n`;
          for (const l of lodg) {
            tripContext += `  🏨 ${l.hotel_name || "Hotel"}\n`;
            tripContext += `    Cidade: ${l.city || "N/A"}\n`;
            if (l.address) tripContext += `    Endereço: ${l.address}\n`;
            tripContext += `    Check-in: ${l.checkin_date || "N/A"}\n`;
            tripContext += `    Check-out: ${l.checkout_date || "N/A"}\n`;
            tripContext += `    Tipo de quarto: ${l.room_type || "N/A"}\n`;
            if (l.meal_plan) tripContext += `    Regime: ${l.meal_plan}\n`;
            tripContext += `    Confirmação: ${l.confirmation_number || "N/A"}\n`;
            tripContext += `    Status: ${l.status || "N/A"}\n`;
            if (l.notes) tripContext += `    Observações: ${l.notes}\n`;
          }
        } else if (hotels.length > 0) {
          tripContext += `\n── HOSPEDAGEM ──\n`;
          for (const h of hotels) {
            tripContext += `  🏨 ${h.description || "Hotel"}\n`;
            tripContext += `    Reserva: ${h.reservation_code || "N/A"}\n`;
          }
        }

        // Services & experiences
        if (services.length > 0) {
          tripContext += `\n── SERVIÇOS E EXPERIÊNCIAS (${services.length}) ──\n`;
          for (const s of services) {
            tripContext += `  • ${s.description || s.category}\n`;
            tripContext += `    Tipo: ${s.product_type || s.category}\n`;
            if (s.reservation_code) tripContext += `    Reserva: ${s.reservation_code}\n`;
          }
        }

        // Passengers
        if (paxs.length > 0) {
          tripContext += `\n── PASSAGEIROS (${paxs.length}) ──\n`;
          for (const p of paxs) {
            const pax = p.passengers;
            if (pax) {
              tripContext += `  👤 ${pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim()}\n`;
              if (pax.cpf) tripContext += `    CPF: ${pax.cpf}\n`;
              if (pax.birth_date) tripContext += `    Nascimento: ${pax.birth_date}\n`;
              if (pax.passport_number) tripContext += `    Passaporte: ${pax.passport_number}\n`;
              if (pax.passport_expiry) tripContext += `    Validade passaporte: ${pax.passport_expiry}\n`;
              if (pax.phone) tripContext += `    Telefone: ${pax.phone}\n`;
              if (pax.email) tripContext += `    Email: ${pax.email}\n`;
            }
          }
        }

        // Check-in tasks
        if (checkins.length > 0) {
          tripContext += `\n── CHECK-IN ──\n`;
          for (const ci of checkins) {
            tripContext += `  • Direção: ${ci.direction === "outbound" ? "IDA" : "VOLTA"} | Status: ${ci.status}\n`;
            if (ci.checkin_open_datetime_utc) tripContext += `    Abertura: ${ci.checkin_open_datetime_utc}\n`;
            if (ci.seat_info) tripContext += `    Assento: ${ci.seat_info}\n`;
          }
        }

        // Financial
        tripContext += `\n── FINANCEIRO ──\n`;
        tripContext += `  Valor total: R$ ${totalDue.toFixed(2)}\n`;
        tripContext += `  Já pago: R$ ${totalPaid.toFixed(2)}\n`;
        tripContext += `  Pendente: R$ ${pending.toFixed(2)}\n`;
        if (recvs.length > 0) {
          tripContext += `  Parcelas:\n`;
          for (const r of recvs) {
            const statusEmoji = r.status === "pago" ? "✅" : r.status === "vencido" ? "🔴" : "⏳";
            tripContext += `    ${statusEmoji} ${r.installment_number || "?"}/${r.installment_total || "?"} | R$ ${Number(r.gross_value).toFixed(2)} | Vencimento: ${r.due_date || "N/A"} | ${r.status} | Método: ${r.payment_method || "N/A"}\n`;
          }
        }
        if (nextDue) {
          tripContext += `  ⚡ Próximo vencimento: ${nextDue.due_date} - R$ ${Number(nextDue.gross_value).toFixed(2)}\n`;
        }

        // Documents
        if (atts.length > 0) {
          tripContext += `\n── DOCUMENTOS DISPONÍVEIS (${atts.length}) ──\n`;
          for (const a of atts) {
            tripContext += `  📄 ${a.file_name} (${a.category})\n`;
          }
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const clientName = client?.display_name?.split(" ")[0] || "Cliente";

    const systemPrompt = `Você é o **Concierge NatLeva**, o assistente pessoal de viagens do portal NatLeva Viagens. Você é um especialista premium em viagens com acesso completo aos dados das viagens do cliente.

IDENTIDADE:
- Você é um concierge digital de luxo — acolhedor, preciso e sofisticado
- Trate o cliente pelo primeiro nome: "${clientName}"
- Use no máximo 1 emoji por mensagem
- Respostas concisas (4-6 linhas), mas completas
- Use **negrito** para destaques importantes
- Use tabelas Markdown para comparações, listas de voos, parcelas financeiras
- Micro-validações naturais: "Ótima pergunta!", "Vamos lá!", "Com certeza!"

REGRAS ABSOLUTAS:
- Responda SEMPRE em português brasileiro
- Use EXCLUSIVAMENTE dados do contexto abaixo — NUNCA invente informações
- Datas no formato DD/MM/AAAA
- Valores monetários com R$ e duas casas decimais
- Se a informação NÃO estiver nos dados, diga: "Não encontrei essa informação no seu itinerário. Posso te ajudar a entrar em contato com seu consultor NatLeva para esclarecer!"
- Se o cliente tiver múltiplas viagens e não especificar qual, liste brevemente e pergunte qual deseja explorar
- Para questões fora do escopo de viagem, redirecione educadamente

CAPACIDADES:
- Voos: horários, companhias, escalas, classes, terminais, duração, bagagem
- Hotéis: nome, endereço, cidade, check-in/out, tipo de quarto, regime de hospedagem, confirmação
- Passageiros: nomes, documentos, passaportes e validades
- Financeiro: valor total, parcelas, status de pagamento, próximo vencimento
- Documentos: listar documentos disponíveis
- Serviços: transfers, passeios, ingressos, atividades contratadas
- Check-in: status e janelas de abertura
- Consultor: identificar o responsável pela viagem
- Dicas contextuais: clima, fuso horário, cultura do destino baseado nos dados IATA

DATA DE HOJE: ${today}

DADOS DO CLIENTE:
Nome: ${client?.display_name || "Cliente"}
Email: ${client?.email || "N/A"}
Telefone: ${client?.phone || "N/A"}
Cidade: ${client?.city || "N/A"}, ${client?.state || "N/A"}

${saleIds.length > 0 ? `TOTAL DE VIAGENS ENCONTRADAS: ${saleIds.length}` : "NENHUMA VIAGEM ENCONTRADA — informe que o itinerário ainda não foi publicado no portal."}
${tripContext || "\nNenhum dado de viagem disponível no momento."}`;

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversation_history?.length) {
      for (const msg of conversation_history.slice(-12)) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: "user", content: question });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Serviço de IA temporariamente indisponível." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
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

          // Log interaction (non-critical)
          if (fullAnswer) {
            try {
              await admin.from("portal_assistant_logs").insert({
                client_id: clientId,
                sale_id: sale_id || null,
                question,
                answer: fullAnswer,
              });
            } catch (logErr) {
              console.error("Log insert error (non-critical):", logErr);
            }
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
