// ─── Shared Inbox Types & Constants ───

export type Stage = "novo_lead" | "contato_inicial" | "qualificacao" | "diagnostico" | "proposta_preparacao" | "proposta_enviada" | "proposta_visualizada" | "ajustes" | "negociacao" | "fechamento_andamento" | "fechado" | "pos_venda" | "perdido";
export type MsgType = "text" | "image" | "audio" | "video" | "document";
export type MsgStatus = "sent" | "delivered" | "read";

export interface Conversation {
  id: string;
  db_id?: string;
  phone: string;
  contact_name: string;
  stage: Stage;
  tags: string[];
  source: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  is_vip: boolean;
  assigned_to: string;
  score_potential: number;
  score_risk: number;
  vehicle_interest?: string;
  price_range?: string;
  payment_method?: string;
  lead_id?: string;
  is_pinned?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: "cliente" | "atendente" | "sistema";
  message_type: MsgType;
  text: string;
  media_url?: string;
  status: MsgStatus;
  created_at: string;
  external_message_id?: string;
  raw_message?: any;
  quoted_msg?: { text: string; sender_type: "cliente" | "atendente" | "sistema"; message_type: MsgType };
  edited?: boolean;
}

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
  { key: "contato_inicial", label: "Contato Inicial", color: "bg-sky-500" },
  { key: "qualificacao", label: "Qualificação", color: "bg-amber-500" },
  { key: "diagnostico", label: "Diagnóstico", color: "bg-yellow-500" },
  { key: "proposta_preparacao", label: "Estruturação", color: "bg-orange-500" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "bg-purple-500" },
  { key: "proposta_visualizada", label: "Visualizada", color: "bg-violet-500" },
  { key: "ajustes", label: "Ajustes", color: "bg-pink-500" },
  { key: "negociacao", label: "Negociação", color: "bg-primary" },
  { key: "fechamento_andamento", label: "Fechando", color: "bg-rose-500" },
  { key: "fechado", label: "Fechado ✓", color: "bg-emerald-500" },
  { key: "pos_venda", label: "Pós-venda", color: "bg-teal-500" },
  { key: "perdido", label: "Perdido", color: "bg-muted-foreground" },
];

export const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Não lidas" },
  { key: "mine", label: "Minhas" },
  { key: "vip", label: "VIP" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "proposta_enviada", label: "Proposta" },
  { key: "fechado", label: "Clientes" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "no_reply", label: "Sem resposta" },
  { key: "urgent", label: "Urgentes" },
];
