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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "full_analysis";

    const results: Record<string, any> = {};

    // ═══ 1. HOT CLIENT DETECTION ═══
    if (action === "full_analysis" || action === "hot_clients") {
      // Get proposals with viewer engagement
      const { data: proposals } = await admin
        .from("proposals")
        .select("id, title, client_name, destinations, strategy, status, views_count, last_viewed_at, created_at, total_value, client_id")
        .in("status", ["draft", "sent", "viewed"])
        .order("created_at", { ascending: false })
        .limit(100);

      const hotClients: any[] = [];

      for (const p of proposals || []) {
        // Get viewer engagement data
        const { data: viewers } = await admin
          .from("proposal_viewers")
          .select("*")
          .eq("proposal_id", p.id)
          .order("engagement_score", { ascending: false })
          .limit(5);

        // Get conversation activity if client linked
        let recentMessages = 0;
        if (p.client_id) {
          const { data: convs } = await admin
            .from("conversations")
            .select("id")
            .eq("client_id", p.client_id)
            .limit(1);
          if (convs?.[0]) {
            const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();
            const { count } = await admin
              .from("conversation_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", convs[0].id)
              .gte("created_at", twoDaysAgo);
            recentMessages = count || 0;
          }
        }

        // Get learned patterns for this destination/strategy
        let patternBoost = 0;
        if (p.destinations || p.strategy) {
          const { data: patterns } = await admin
            .from("ai_learned_patterns")
            .select("confidence, detected_rule")
            .eq("is_active", true)
            .gte("confidence", 60)
            .limit(20);
          for (const pat of patterns || []) {
            const rule = (pat.detected_rule || "").toLowerCase();
            const dest = (p.destinations || "").toLowerCase();
            const strat = (p.strategy || "").toLowerCase();
            if ((dest && rule.includes(dest)) || (strat && rule.includes(strat))) {
              patternBoost = Math.max(patternBoost, pat.confidence * 0.15);
            }
          }
        }

        // Calculate probability score
        const topViewer = viewers?.[0];
        const engagementScore = topViewer?.engagement_score || 0;
        const viewCount = p.views_count || 0;
        const hoursSinceCreation = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
        const hoursSinceViewed = p.last_viewed_at 
          ? (Date.now() - new Date(p.last_viewed_at).getTime()) / 3600000
          : 999;

        let probability = 0;
        // Engagement: max 35pts
        probability += Math.min(35, engagementScore * 0.35);
        // Views: max 15pts (3+ views = full)
        probability += Math.min(15, viewCount * 5);
        // Recency of view: max 20pts
        if (hoursSinceViewed < 2) probability += 20;
        else if (hoursSinceViewed < 12) probability += 15;
        else if (hoursSinceViewed < 24) probability += 10;
        else if (hoursSinceViewed < 48) probability += 5;
        // Recent messages: max 15pts
        probability += Math.min(15, recentMessages * 3);
        // Pattern boost: max 15pts
        probability += Math.min(15, patternBoost);

        probability = Math.min(100, Math.round(probability));

        if (probability >= 20 || viewCount > 0) {
          hotClients.push({
            proposal_id: p.id,
            client_name: p.client_name || topViewer?.name || topViewer?.email || "Desconhecido",
            client_id: p.client_id,
            destination: p.destinations,
            strategy: p.strategy,
            probability,
            views: viewCount,
            engagement_score: engagementScore,
            last_viewed: p.last_viewed_at,
            cta_clicked: topViewer?.cta_clicked || false,
            whatsapp_clicked: topViewer?.whatsapp_clicked || false,
            total_value: p.total_value,
            viewer_email: topViewer?.email,
            sections_viewed: topViewer?.sections_viewed || [],
            scroll_depth: topViewer?.scroll_depth_max || 0,
          });
        }
      }

      // Sort by probability
      hotClients.sort((a, b) => b.probability - a.probability);

      // Upsert insights for top hot clients
      for (const hc of hotClients.slice(0, 20)) {
        await admin.from("natleva_brain_insights").upsert({
          insight_type: "hot_client",
          category: "vendas",
          title: `${hc.client_name} — ${hc.destination || "destino indefinido"}`,
          description: `Probabilidade de fechamento: ${hc.probability}%. ${hc.views} visualizações, engagement ${hc.engagement_score}/100.${hc.whatsapp_clicked ? " ✅ Clicou no WhatsApp!" : ""}`,
          confidence: hc.probability,
          probability_score: hc.probability,
          related_client_id: hc.client_id || null,
          related_proposal_id: hc.proposal_id,
          destination: hc.destination,
          strategy: hc.strategy,
          action_suggested: hc.probability >= 70 ? "Contato imediato — cliente quente!" : hc.probability >= 40 ? "Enviar follow-up personalizado" : "Monitorar",
          metadata: {
            views: hc.views,
            engagement_score: hc.engagement_score,
            cta_clicked: hc.cta_clicked,
            whatsapp_clicked: hc.whatsapp_clicked,
            viewer_email: hc.viewer_email,
            sections_viewed: hc.sections_viewed,
            scroll_depth: hc.scroll_depth,
            total_value: hc.total_value,
          },
          tags: [
            hc.probability >= 70 ? "quente" : hc.probability >= 40 ? "morno" : "frio",
            hc.whatsapp_clicked ? "whatsapp_clicado" : null,
            hc.cta_clicked ? "cta_clicado" : null,
            hc.destination?.toLowerCase(),
          ].filter(Boolean),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }

      results.hot_clients = hotClients.slice(0, 20);
    }

    // ═══ 2. COLD CLIENT DETECTION ═══
    if (action === "full_analysis" || action === "cold_clients") {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();
      
      const { data: viewedProposals } = await admin
        .from("proposals")
        .select("id, title, client_name, client_id, destinations, last_viewed_at, created_at, strategy")
        .in("status", ["sent", "viewed"])
        .not("last_viewed_at", "is", null)
        .lt("last_viewed_at", twoDaysAgo)
        .order("last_viewed_at", { ascending: true })
        .limit(30);

      const coldClients = (viewedProposals || []).map((p) => {
        const hoursSince = (Date.now() - new Date(p.last_viewed_at!).getTime()) / 3600000;
        return {
          proposal_id: p.id,
          client_name: p.client_name || "Sem nome",
          client_id: p.client_id,
          destination: p.destinations,
          hours_since_last_view: Math.round(hoursSince),
          last_viewed: p.last_viewed_at,
          risk_level: hoursSince > 168 ? "critical" : hoursSince > 72 ? "high" : "medium",
        };
      });

      for (const cc of coldClients.slice(0, 10)) {
        await admin.from("natleva_brain_insights").upsert({
          insight_type: "cold_client",
          category: "cliente",
          title: `⚠️ ${cc.client_name} esfriando — ${cc.destination || ""}`,
          description: `Última visualização há ${cc.hours_since_last_view}h. Risco: ${cc.risk_level}.`,
          confidence: cc.risk_level === "critical" ? 90 : cc.risk_level === "high" ? 70 : 50,
          impact_level: cc.risk_level,
          related_client_id: cc.client_id,
          related_proposal_id: cc.proposal_id,
          destination: cc.destination,
          action_suggested: cc.risk_level === "critical" ? "Contato urgente ou nova abordagem" : "Enviar follow-up leve",
          tags: ["esfriando", cc.risk_level, cc.destination?.toLowerCase()].filter(Boolean),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }

      results.cold_clients = coldClients;
    }

    // ═══ 3. IGNORED PROPOSALS ═══
    if (action === "full_analysis" || action === "ignored_proposals") {
      const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      
      const { data: ignored } = await admin
        .from("proposals")
        .select("id, title, client_name, client_id, destinations, created_at, strategy")
        .eq("status", "sent")
        .is("last_viewed_at", null)
        .lt("created_at", oneDayAgo)
        .order("created_at", { ascending: true })
        .limit(20);

      const ignoredProposals = (ignored || []).map((p) => {
        const hoursSince = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
        return {
          proposal_id: p.id,
          client_name: p.client_name || "Sem nome",
          client_id: p.client_id,
          destination: p.destinations,
          hours_since_sent: Math.round(hoursSince),
        };
      });

      for (const ip of ignoredProposals.slice(0, 10)) {
        await admin.from("natleva_brain_insights").upsert({
          insight_type: "ignored_proposal",
          category: "proposta",
          title: `📭 Proposta ignorada: ${ip.client_name}`,
          description: `Enviada há ${ip.hours_since_sent}h e nunca foi aberta.`,
          confidence: 80,
          impact_level: ip.hours_since_sent > 72 ? "high" : "medium",
          related_client_id: ip.client_id,
          related_proposal_id: ip.proposal_id,
          destination: ip.destination,
          action_suggested: "Reenviar proposta ou fazer follow-up via WhatsApp",
          tags: ["ignorada", "followup_necessario"],
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }

      results.ignored_proposals = ignoredProposals;
    }

    // ═══ 4. CONVERSION METRICS ═══
    if (action === "full_analysis" || action === "metrics") {
      const { data: allProposals } = await admin
        .from("proposals")
        .select("id, status, views_count, strategy, destinations, created_at, total_value")
        .order("created_at", { ascending: false })
        .limit(500);

      const total = allProposals?.length || 0;
      const viewed = allProposals?.filter((p) => (p.views_count || 0) > 0).length || 0;
      const won = allProposals?.filter((p) => p.status === "accepted").length || 0;
      const lost = allProposals?.filter((p) => p.status === "rejected" || p.status === "expired").length || 0;

      results.metrics = {
        total_proposals: total,
        open_rate: total > 0 ? Math.round((viewed / total) * 100) : 0,
        close_rate: total > 0 ? Math.round((won / total) * 100) : 0,
        loss_rate: total > 0 ? Math.round((lost / total) * 100) : 0,
        total_won: won,
        total_lost: lost,
        total_active: allProposals?.filter((p) => ["draft", "sent", "viewed"].includes(p.status)).length || 0,
      };

      // Strategy breakdown
      const strategyMap = new Map<string, { total: number; won: number; viewed: number }>();
      for (const p of allProposals || []) {
        const s = p.strategy || "sem_estrategia";
        const entry = strategyMap.get(s) || { total: 0, won: 0, viewed: 0 };
        entry.total++;
        if (p.status === "accepted") entry.won++;
        if ((p.views_count || 0) > 0) entry.viewed++;
        strategyMap.set(s, entry);
      }
      results.strategy_breakdown = Object.fromEntries(
        [...strategyMap.entries()].map(([k, v]) => [k, {
          ...v,
          close_rate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
          open_rate: v.total > 0 ? Math.round((v.viewed / v.total) * 100) : 0,
        }])
      );
    }

    // ═══ 5. UPSELL DETECTION ═══
    if (action === "full_analysis" || action === "upsell") {
      const { data: viewers } = await admin
        .from("proposal_viewers")
        .select("*, proposal_id")
        .gte("engagement_score", 60)
        .eq("cta_clicked", false)
        .order("engagement_score", { ascending: false })
        .limit(20);

      const upsellOpps: any[] = [];
      for (const v of viewers || []) {
        const { data: prop } = await admin
          .from("proposals")
          .select("id, title, client_name, strategy, destinations, total_value")
          .eq("id", v.proposal_id)
          .single();
        if (prop && prop.strategy && !["premium", "luxo"].includes(prop.strategy.toLowerCase())) {
          upsellOpps.push({
            proposal_id: prop.id,
            client_name: prop.client_name || v.email,
            current_strategy: prop.strategy,
            engagement_score: v.engagement_score,
            destination: prop.destinations,
            suggestion: `Cliente com alto engajamento (${v.engagement_score}/100) na estratégia ${prop.strategy}. Considerar upgrade.`,
          });
        }
      }

      for (const up of upsellOpps.slice(0, 5)) {
        await admin.from("natleva_brain_insights").upsert({
          insight_type: "upsell_opportunity",
          category: "vendas",
          title: `🚀 Upgrade: ${up.client_name}`,
          description: up.suggestion,
          confidence: Math.min(90, up.engagement_score),
          related_proposal_id: up.proposal_id,
          destination: up.destination,
          strategy: up.current_strategy,
          action_suggested: `Oferecer pacote Premium para ${up.client_name}`,
          tags: ["upsell", "upgrade", up.destination?.toLowerCase()].filter(Boolean),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }

      results.upsell_opportunities = upsellOpps;
    }

    // ═══ 6. AI ANALYSIS (if LOVABLE_API_KEY available) ═══
    if ((action === "full_analysis" || action === "ai_insights") && LOVABLE_API_KEY) {
      try {
        // Get recent learned patterns
        const { data: patterns } = await admin
          .from("ai_learned_patterns")
          .select("title, detected_rule, confidence, sample_size, category")
          .eq("is_active", true)
          .gte("confidence", 50)
          .order("confidence", { ascending: false })
          .limit(15);

        // Get recent learning events summary
        const { data: events } = await admin
          .from("ai_learning_events")
          .select("event_type, destination, strategy_chosen, deal_won, loss_reason, client_profile")
          .order("created_at", { ascending: false })
          .limit(100);

        const wonEvents = events?.filter((e) => e.deal_won === true) || [];
        const lostEvents = events?.filter((e) => e.deal_won === false) || [];

        const prompt = `Você é o Cérebro NatLeva, analista de inteligência comercial de uma agência de viagens premium.

DADOS DA OPERAÇÃO:
- Padrões detectados: ${JSON.stringify(patterns?.map((p) => `${p.title}: ${p.detected_rule} (${p.confidence}% confiança, ${p.sample_size} amostras)`) || "nenhum")}
- Vendas ganhas recentes: ${wonEvents.length} (destinos: ${[...new Set(wonEvents.map((e) => e.destination).filter(Boolean))].join(", ") || "variados"})
- Vendas perdidas recentes: ${lostEvents.length} (motivos: ${[...new Set(lostEvents.map((e) => e.loss_reason).filter(Boolean))].join(", ") || "não informados"})
- Estratégias que ganharam: ${[...new Set(wonEvents.map((e) => e.strategy_chosen).filter(Boolean))].join(", ") || "variadas"}

GERE 3-5 INSIGHTS ESTRATÉGICOS em JSON array:
[{"title":"...", "description":"...", "category":"vendas|proposta|cliente|destino|estrategia", "confidence":0-100, "action":"...", "tags":["..."]}]

Seja específico, use dados reais. Foque em oportunidades de melhoria.`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            tools: [{
              type: "function",
              function: {
                name: "generate_insights",
                description: "Generate strategic commercial insights",
                parameters: {
                  type: "object",
                  properties: {
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          category: { type: "string" },
                          confidence: { type: "number" },
                          action: { type: "string" },
                          tags: { type: "array", items: { type: "string" } },
                        },
                        required: ["title", "description", "category", "confidence", "action", "tags"],
                      },
                    },
                  },
                  required: ["insights"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "generate_insights" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            const aiInsights = parsed.insights || [];
            
            for (const ins of aiInsights) {
              await admin.from("natleva_brain_insights").insert({
                insight_type: "strategy_insight",
                category: ins.category || "geral",
                title: `🧠 ${ins.title}`,
                description: ins.description,
                confidence: ins.confidence || 70,
                action_suggested: ins.action,
                tags: [...(ins.tags || []), "ia_gerado"],
                is_active: true,
              });
            }
            results.ai_insights = aiInsights;
          }
        }
      } catch (aiErr) {
        console.error("[Brain] AI analysis error:", aiErr);
        results.ai_insights_error = (aiErr as Error).message;
      }
    }

    // Deactivate old insights (>7 days)
    await admin
      .from("natleva_brain_insights")
      .update({ is_active: false })
      .lt("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .eq("is_active", true)
      .eq("promoted_to_knowledge", false);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Brain] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
