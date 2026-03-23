/**
 * Hook for persisting AI Team data to database.
 * Saves lab results, agent activity, and loads agent configs.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";

export function useAITeamPersistence() {

  // Seed default agents into DB if not present
  const seedAgents = useCallback(async () => {
    const { data: existing } = await supabase
      .from("ai_team_agents")
      .select("id")
      .limit(1);

    if (existing && existing.length > 0) return; // already seeded

    const agents = AGENTS_V4.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      role: a.role,
      squad_id: a.squadId,
      level: a.level,
      xp: a.xp,
      max_xp: a.maxXp,
      skills: a.skills,
      persona: a.persona,
      status: a.status,
      success_rate: a.successRate,
      tasks_today: a.tasksToday,
    }));

    await supabase.from("ai_team_agents").insert(agents);
  }, []);

  // Save lab test result
  const saveLabResult = useCallback(async (result: {
    agentId: string;
    profileId: string;
    profileName: string;
    response: string;
    aderencia: number;
    sentimento: number;
    clareza: number;
    proatividade: number;
    totalScore: number;
    responseTimeMs: number;
    aiEvaluation: string;
  }) => {
    await supabase.from("ai_team_lab_results").insert({
      agent_id: result.agentId,
      profile_id: result.profileId,
      profile_name: result.profileName,
      response: result.response,
      aderencia: result.aderencia,
      sentimento: result.sentimento,
      clareza: result.clareza,
      proatividade: result.proatividade,
      total_score: result.totalScore,
      response_time_ms: result.responseTimeMs,
      ai_evaluation: result.aiEvaluation,
    });
  }, []);

  // Log agent activity
  const logActivity = useCallback(async (agentId: string, eventType: string, message: string, severity: string = "low") => {
    await supabase.from("ai_team_activity_log").insert({
      agent_id: agentId,
      event_type: eventType,
      message,
      severity,
    });
  }, []);

  // Save mission
  const saveMission = useCallback(async (mission: {
    agentId: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    context?: string;
  }) => {
    await supabase.from("ai_team_missions").insert({
      agent_id: mission.agentId,
      title: mission.title,
      description: mission.description,
      priority: mission.priority,
      status: mission.status,
      context: mission.context,
    });
  }, []);

  // Update agent XP/level
  const updateAgentXP = useCallback(async (agentId: string, xp: number, level: number) => {
    await supabase.from("ai_team_agents").update({ xp, level, updated_at: new Date().toISOString() }).eq("id", agentId);
  }, []);

  // Get real metrics from sales/conversations
  const fetchRealMetrics = useCallback(async () => {
    const [salesRes, convsRes, proposalsRes] = await Promise.all([
      supabase.from("sales").select("id, status, received_value, profit, created_at", { count: "exact" }).limit(1000),
      supabase.from("conversations").select("id, status, funnel_stage, last_message_at", { count: "exact" }).limit(1000),
      supabase.from("proposals").select("id, status, created_at", { count: "exact" }).limit(1000),
    ]);

    const sales = salesRes.data ?? [];
    const convs = convsRes.data ?? [];
    const proposals = proposalsRes.data ?? [];

    const totalRevenue = sales.reduce((s, r) => s + (r.received_value || 0), 0);
    const totalProfit = sales.reduce((s, r) => s + (r.profit || 0), 0);
    const activeConvs = convs.filter(c => c.status === "active" || c.status === "open").length;
    const openProposals = proposals.filter(p => p.status === "sent" || p.status === "draft").length;

    const today = new Date().toISOString().slice(0, 10);
    const salesToday = sales.filter(s => s.created_at?.startsWith(today)).length;

    return {
      totalSales: salesRes.count ?? sales.length,
      totalRevenue,
      totalProfit,
      activeConversations: activeConvs,
      totalConversations: convsRes.count ?? convs.length,
      openProposals,
      totalProposals: proposalsRes.count ?? proposals.length,
      salesToday,
    };
  }, []);

  // Get lab history
  const fetchLabHistory = useCallback(async (agentId?: string) => {
    let query = supabase.from("ai_team_lab_results").select("*").order("created_at", { ascending: false }).limit(50);
    if (agentId) query = query.eq("agent_id", agentId);
    const { data } = await query;
    return data ?? [];
  }, []);

  return {
    seedAgents,
    saveLabResult,
    logActivity,
    saveMission,
    updateAgentXP,
    fetchRealMetrics,
    fetchLabHistory,
  };
}
