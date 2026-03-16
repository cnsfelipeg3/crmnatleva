import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Fetch all learning events with outcomes ──
    const { data: events, error: evErr } = await supabase
      .from("ai_learning_events")
      .select("*")
      .not("deal_won", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (evErr) throw evErr;
    if (!events || events.length < 5) {
      return new Response(JSON.stringify({
        message: "Insufficient data for pattern detection",
        events_analyzed: events?.length || 0,
        patterns_generated: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patterns: any[] = [];

    // ── 2. Strategy win rate by overall ──
    const strategyGroups: Record<string, { won: number; total: number }> = {};
    for (const e of events) {
      if (!e.strategy_chosen) continue;
      const s = e.strategy_chosen.toLowerCase();
      if (!strategyGroups[s]) strategyGroups[s] = { won: 0, total: 0 };
      strategyGroups[s].total++;
      if (e.deal_won) strategyGroups[s].won++;
    }
    for (const [strategy, stats] of Object.entries(strategyGroups)) {
      if (stats.total < 3) continue;
      const rate = Math.round((stats.won / stats.total) * 100);
      patterns.push({
        category: "estrategia_comercial",
        title: `Taxa de fechamento da estratégia ${strategy.charAt(0).toUpperCase() + strategy.slice(1)}`,
        description: `Análise baseada em ${stats.total} propostas com estratégia ${strategy}.`,
        detected_rule: `A estratégia ${strategy} tem taxa de fechamento de ${rate}%. (${stats.won} ganhas de ${stats.total} total)`,
        confidence: Math.min(95, 50 + stats.total * 2),
        sample_size: stats.total,
        estimated_impact: rate >= 50 ? "alto" : rate >= 30 ? "médio" : "baixo",
        data_source: "proposals",
        function_area: "estrategia_comercial",
        tags: [strategy, "taxa_conversao"],
        origin_context: "análise global de estratégias",
      });
    }

    // ── 3. Strategy win rate by destination ──
    const destStratGroups: Record<string, Record<string, { won: number; total: number }>> = {};
    for (const e of events) {
      if (!e.destination || !e.strategy_chosen) continue;
      const dest = e.destination.toLowerCase();
      const strat = e.strategy_chosen.toLowerCase();
      if (!destStratGroups[dest]) destStratGroups[dest] = {};
      if (!destStratGroups[dest][strat]) destStratGroups[dest][strat] = { won: 0, total: 0 };
      destStratGroups[dest][strat].total++;
      if (e.deal_won) destStratGroups[dest][strat].won++;
    }
    for (const [dest, strategies] of Object.entries(destStratGroups)) {
      const entries = Object.entries(strategies).filter(([, s]) => s.total >= 2);
      if (entries.length === 0) continue;
      const best = entries.sort((a, b) => (b[1].won / b[1].total) - (a[1].won / a[1].total))[0];
      const rate = Math.round((best[1].won / best[1].total) * 100);
      const totalSample = entries.reduce((sum, [, s]) => sum + s.total, 0);
      if (totalSample < 3) continue;
      patterns.push({
        category: "estrategia_por_destino",
        title: `Melhor estratégia para ${dest.charAt(0).toUpperCase() + dest.slice(1)}`,
        description: `Para o destino ${dest}, a estratégia "${best[0]}" tem a maior taxa de conversão.`,
        detected_rule: `Destino "${dest}": estratégia "${best[0]}" converte ${rate}% (${best[1].won}/${best[1].total}). Priorizar esta estratégia para este destino.`,
        confidence: Math.min(90, 40 + totalSample * 3),
        sample_size: totalSample,
        estimated_impact: "alto",
        data_source: "proposals",
      });
    }

    // ── 4. Strategy win rate by client profile / trip type ──
    const profileGroups: Record<string, Record<string, { won: number; total: number }>> = {};
    for (const e of events) {
      const profile = e.client_profile || e.trip_type;
      if (!profile || !e.strategy_chosen) continue;
      const key = profile.toLowerCase();
      const strat = e.strategy_chosen.toLowerCase();
      if (!profileGroups[key]) profileGroups[key] = {};
      if (!profileGroups[key][strat]) profileGroups[key][strat] = { won: 0, total: 0 };
      profileGroups[key][strat].total++;
      if (e.deal_won) profileGroups[key][strat].won++;
    }
    for (const [profile, strategies] of Object.entries(profileGroups)) {
      const entries = Object.entries(strategies).filter(([, s]) => s.total >= 2);
      if (entries.length === 0) continue;
      const best = entries.sort((a, b) => (b[1].won / b[1].total) - (a[1].won / a[1].total))[0];
      const rate = Math.round((best[1].won / best[1].total) * 100);
      const totalSample = entries.reduce((sum, [, s]) => sum + s.total, 0);
      if (totalSample < 3) continue;
      patterns.push({
        category: "estrategia_por_perfil",
        title: `Melhor estratégia para perfil "${profile}"`,
        description: `Clientes com perfil "${profile}" respondem melhor à estratégia "${best[0]}".`,
        detected_rule: `Perfil "${profile}": estratégia "${best[0]}" converte ${rate}% (${best[1].won}/${best[1].total}).`,
        confidence: Math.min(90, 40 + totalSample * 3),
        sample_size: totalSample,
        estimated_impact: "alto",
        data_source: "proposals",
      });
    }

    // ── 5. Time-to-close insights ──
    const closedEvents = events.filter(e => e.deal_won && e.time_to_close_hours != null);
    if (closedEvents.length >= 3) {
      const avgHours = closedEvents.reduce((s, e) => s + Number(e.time_to_close_hours), 0) / closedEvents.length;
      const avgDays = Math.round(avgHours / 24 * 10) / 10;
      patterns.push({
        category: "timing_comercial",
        title: "Tempo médio de fechamento",
        description: `Baseado em ${closedEvents.length} vendas fechadas.`,
        detected_rule: `O tempo médio de fechamento é ${avgDays} dias (${Math.round(avgHours)}h). Follow-ups devem considerar este ciclo.`,
        confidence: Math.min(85, 50 + closedEvents.length),
        sample_size: closedEvents.length,
        estimated_impact: "médio",
        data_source: "proposals",
      });
    }

    // ── 6. Loss reason analysis ──
    const lossReasons: Record<string, number> = {};
    for (const e of events) {
      if (e.deal_won === false && e.loss_reason) {
        const r = e.loss_reason.toLowerCase();
        lossReasons[r] = (lossReasons[r] || 0) + 1;
      }
    }
    const topLoss = Object.entries(lossReasons).sort((a, b) => b[1] - a[1]);
    if (topLoss.length > 0 && topLoss[0][1] >= 2) {
      patterns.push({
        category: "analise_perdas",
        title: `Principal motivo de perda: "${topLoss[0][0]}"`,
        description: `O motivo "${topLoss[0][0]}" aparece em ${topLoss[0][1]} propostas perdidas.`,
        detected_rule: `O principal motivo de perda é "${topLoss[0][0]}" (${topLoss[0][1]} ocorrências). A IA deve antecipar esta objeção nas propostas.`,
        confidence: Math.min(85, 50 + topLoss[0][1] * 5),
        sample_size: topLoss[0][1],
        estimated_impact: "alto",
        data_source: "proposals",
      });
    }

    // ── 7. Upsert patterns ──
    let created = 0, updated = 0;
    for (const p of patterns) {
      const { data: existing } = await supabase
        .from("ai_learned_patterns")
        .select("id")
        .eq("title", p.title)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("ai_learned_patterns").update({
          ...p,
          updated_at: new Date().toISOString(),
        }).eq("id", existing[0].id);
        updated++;
      } else {
        await supabase.from("ai_learned_patterns").insert(p);
        created++;
      }
    }

    return new Response(JSON.stringify({
      events_analyzed: events.length,
      patterns_generated: patterns.length,
      created,
      updated,
      categories: [...new Set(patterns.map(p => p.category))],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("ai-learn-patterns error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
