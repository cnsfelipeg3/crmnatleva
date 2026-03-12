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
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let created = 0;

    // Get all active published sales with client info
    const { data: published } = await admin
      .from("portal_published_sales")
      .select("sale_id, client_id")
      .eq("is_active", true);

    if (!published?.length) {
      return new Response(JSON.stringify({ created: 0, message: "No published sales" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saleIds = published.map((p: any) => p.sale_id);
    const clientMap = new Map(published.map((p: any) => [p.sale_id, p.client_id]));

    // Fetch sales data
    const { data: sales } = await admin.from("sales").select("*").in("id", saleIds);
    const { data: segments } = await admin.from("flight_segments").select("*").in("sale_id", saleIds).order("departure_date");
    const { data: receivables } = await admin.from("accounts_receivable").select("*").in("sale_id", saleIds).eq("status", "pendente");
    const { data: passengers } = await admin.from("sale_passengers").select("*, passengers(*)").in("sale_id", saleIds);

    // Get existing notifications to avoid duplicates
    const { data: existing } = await admin
      .from("portal_notifications")
      .select("sale_id, notification_type, metadata")
      .in("sale_id", saleIds);

    const existsKey = (saleId: string, type: string, extra?: string) =>
      (existing || []).some((n: any) => n.sale_id === saleId && n.notification_type === type && (!extra || n.metadata?.key === extra));

    const insert = async (clientId: string, saleId: string, type: string, title: string, message: string, meta?: any) => {
      if (existsKey(saleId, type, meta?.key)) return;
      await admin.from("portal_notifications").insert({
        client_id: clientId,
        sale_id: saleId,
        notification_type: type,
        title,
        message,
        channel: "portal",
        status: "sent",
        sent_at: now.toISOString(),
        metadata: meta || {},
      });
      created++;
    };

    for (const sale of (sales || [])) {
      const clientId = clientMap.get(sale.id);
      if (!clientId) continue;

      const saleSegments = (segments || []).filter((s: any) => s.sale_id === sale.id);
      const saleReceivables = (receivables || []).filter((r: any) => r.sale_id === sale.id);
      const salePax = (passengers || []).filter((p: any) => p.sale_id === sale.id);
      const saleName = sale.name || "sua viagem";
      const dest = sale.destination_iata || "destino";

      const departureDate = sale.departure_date;
      const returnDate = sale.return_date;

      // ---- COUNTDOWN NOTIFICATIONS ----
      if (departureDate) {
        const dep = new Date(departureDate + "T00:00:00");
        const daysUntil = Math.ceil((dep.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil === 30) {
          await insert(clientId, sale.id, "countdown_30", "Sua viagem está chegando! 🎉",
            `Faltam 30 dias para ${saleName}! Acesse seu portal para conferir todos os detalhes do itinerário.`,
            { key: `countdown_30_${departureDate}` });
        }
        if (daysUntil === 7) {
          await insert(clientId, sale.id, "countdown_7", "Falta pouco para sua viagem! ✈️",
            `Faltam apenas 7 dias para ${saleName}! Revise seus documentos, confira os voos e prepare as malas.`,
            { key: `countdown_7_${departureDate}` });
        }
        if (daysUntil === 1) {
          const firstSeg = saleSegments[0];
          const flightInfo = firstSeg ? `\nVoo ${firstSeg.airline} ${firstSeg.flight_number} — ${firstSeg.departure_time?.slice(0, 5) || ""}\nAeroporto: ${firstSeg.origin_iata}` : "";
          await insert(clientId, sale.id, "countdown_1", "Sua viagem começa amanhã! 🌟",
            `${saleName} começa amanhã!${flightInfo}\n\nChegue ao aeroporto com antecedência. Boa viagem!`,
            { key: `countdown_1_${departureDate}` });
        }

        // Check-in alert (24h before each flight)
        for (const seg of saleSegments) {
          if (seg.departure_date) {
            const segDep = new Date(seg.departure_date + "T00:00:00");
            const hoursUntil = (segDep.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntil > 0 && hoursUntil <= 26) {
              await insert(clientId, sale.id, "checkin_alert", `Check-in disponível — ${seg.airline} ${seg.flight_number} ✅`,
                `O check-in online do seu voo ${seg.airline} ${seg.flight_number} (${seg.origin_iata} → ${seg.destination_iata}) já está disponível! Faça o check-in com antecedência para garantir seu assento.`,
                { key: `checkin_${seg.id}` });
            }
          }
        }

        // During trip — arrival notification
        if (daysUntil <= 0 && returnDate) {
          const ret = new Date(returnDate + "T00:00:00");
          const daysToReturn = Math.ceil((ret.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil === 0) {
            await insert(clientId, sale.id, "arrival", `Bem-vindo ao seu destino! 🌍`,
              `Esperamos que sua chegada a ${dest} seja incrível! Confira os detalhes de hospedagem e serviços no seu portal.`,
              { key: `arrival_${departureDate}` });
          }
          // Return reminder
          if (daysToReturn === 1) {
            const lastSeg = saleSegments[saleSegments.length - 1];
            const retInfo = lastSeg ? `Voo ${lastSeg.airline} ${lastSeg.flight_number} — ${lastSeg.departure_time?.slice(0, 5) || ""}` : "";
            await insert(clientId, sale.id, "return_reminder", "Seu retorno é amanhã ✈️",
              `Seu voo de retorno está programado para amanhã. ${retInfo}\nChegue ao aeroporto com antecedência.`,
              { key: `return_${returnDate}` });
          }
        }

        // Post-trip
        if (returnDate) {
          const ret = new Date(returnDate + "T00:00:00");
          const daysSinceReturn = Math.ceil((now.getTime() - ret.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceReturn === 2) {
            await insert(clientId, sale.id, "post_trip", "Esperamos que sua viagem tenha sido incrível! 💛",
              `Obrigado por viajar com a NatLeva! Adoraríamos saber como foi sua experiência em ${dest}. Sua opinião é muito importante para nós.`,
              { key: `post_${returnDate}` });
          }
        }
      }

      // ---- PAYMENT REMINDERS ----
      for (const recv of saleReceivables) {
        if (!recv.due_date) continue;
        const due = new Date(recv.due_date + "T00:00:00");
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const parcelLabel = recv.installment_number && recv.installment_total
          ? `Parcela ${recv.installment_number}/${recv.installment_total}`
          : "Parcela";
        const valueStr = recv.gross_value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "";

        if (daysUntilDue === 7) {
          await insert(clientId, sale.id, "payment_7", `Lembrete de pagamento — ${saleName} 💳`,
            `${parcelLabel} de ${valueStr} vence em 7 dias (${new Date(recv.due_date + "T00:00:00").toLocaleDateString("pt-BR")}).`,
            { key: `pay7_${recv.id}` });
        }
        if (daysUntilDue === 2) {
          await insert(clientId, sale.id, "payment_2", `Parcela próxima do vencimento — ${saleName}`,
            `${parcelLabel} de ${valueStr} vence em 2 dias. Não esqueça de efetuar o pagamento.`,
            { key: `pay2_${recv.id}` });
        }
        if (daysUntilDue === 0) {
          await insert(clientId, sale.id, "payment_today", `Parcela vence hoje — ${saleName} ⚠️`,
            `${parcelLabel} de ${valueStr} vence hoje. Efetue o pagamento para manter sua viagem em dia.`,
            { key: `pay0_${recv.id}` });
        }
      }

      // ---- PASSPORT ALERTS ----
      for (const sp of salePax) {
        const pax = sp.passengers;
        if (!pax?.passport_expiry) continue;
        const expiry = new Date(pax.passport_expiry + "T00:00:00");
        const monthsUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsUntil < 6 && monthsUntil > 0) {
          await insert(clientId, sale.id, "passport_expiry", `Atenção à validade do passaporte 🛂`,
            `O passaporte de ${pax.full_name} expira em ${new Date(pax.passport_expiry + "T00:00:00").toLocaleDateString("pt-BR")}. Muitos países exigem pelo menos 6 meses de validade.`,
            { key: `passport_${pax.id}` });
        }
        if (monthsUntil <= 0) {
          await insert(clientId, sale.id, "passport_expired", `Passaporte vencido! ⚠️`,
            `O passaporte de ${pax.full_name} está vencido. Providencie a renovação antes da viagem.`,
            { key: `passport_exp_${pax.id}` });
        }
      }
    }

    return new Response(JSON.stringify({ created, processed: sales?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification engine error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
