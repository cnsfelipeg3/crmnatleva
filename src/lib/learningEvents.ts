import { supabase } from "@/integrations/supabase/client";

interface LearningEventData {
  event_type: string;
  client_id?: string | null;
  conversation_id?: string | null;
  proposal_id?: string | null;
  sale_id?: string | null;
  destination?: string | null;
  trip_type?: string | null;
  client_profile?: string | null;
  passenger_count?: number | null;
  strategy_chosen?: string | null;
  flight_option_chosen?: string | null;
  hotel_option_chosen?: string | null;
  proposal_text_summary?: string | null;
  client_responded?: boolean | null;
  client_opened?: boolean | null;
  deal_won?: boolean | null;
  time_to_response_hours?: number | null;
  time_to_close_hours?: number | null;
  loss_reason?: string | null;
  observations?: string | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
}

/**
 * Emit a learning event to the ai_learning_events table.
 * Fire-and-forget — never blocks the UI.
 */
export function emitLearningEvent(data: LearningEventData) {
  supabase
    .from("ai_learning_events" as any)
    .insert(data as any)
    .then(({ error }) => {
      if (error) console.warn("[LearningEvent] Failed to emit:", error.message);
    });
}

/**
 * When a proposal outcome changes, emit event and update related events.
 */
export function emitProposalOutcome(opts: {
  proposalId: string;
  outcome: "won" | "lost" | "expired";
  strategy?: string;
  destination?: string;
  clientProfile?: string;
  tripType?: string;
  lossReason?: string;
  createdAt?: string;
  userId?: string;
}) {
  const now = new Date();
  const createdAt = opts.createdAt ? new Date(opts.createdAt) : now;
  const hoursToClose = opts.outcome === "won"
    ? Math.round((now.getTime() - createdAt.getTime()) / 3600000 * 10) / 10
    : null;

  emitLearningEvent({
    event_type: `proposal_${opts.outcome}`,
    proposal_id: opts.proposalId,
    strategy_chosen: opts.strategy,
    destination: opts.destination,
    client_profile: opts.clientProfile,
    trip_type: opts.tripType,
    deal_won: opts.outcome === "won",
    time_to_close_hours: hoursToClose,
    loss_reason: opts.outcome === "lost" ? (opts.lossReason || "não informado") : null,
    created_by: opts.userId,
  });
}
