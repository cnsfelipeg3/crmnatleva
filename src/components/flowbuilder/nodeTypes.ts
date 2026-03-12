// Flow Builder Node Type Definitions

export interface NodeCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  nodes: NodeDefinition[];
}

export interface NodeDefinition {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: string;
  color: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  configSchema: ConfigField[];
}

export interface PortDefinition {
  id: string;
  label: string;
  type: "default" | "condition-yes" | "condition-no";
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean" | "tags" | "variable" | "json";
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  description?: string;
}

// ─── Node Categories & Definitions ───

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: "triggers",
    label: "Triggers",
    icon: "Zap",
    color: "emerald",
    nodes: [
      {
        type: "trigger_new_conversation",
        label: "Nova Conversa",
        icon: "MessageSquarePlus",
        description: "Dispara quando uma nova conversa é iniciada",
        category: "triggers",
        color: "#10b981",
        inputs: [],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "source_filter", label: "Filtrar por origem", type: "select", options: [
            { label: "Todas", value: "all" },
            { label: "WhatsApp", value: "whatsapp_api" },
            { label: "Instagram", value: "instagram" },
            { label: "WebMotors", value: "webmotors" },
            { label: "OLX", value: "olx" },
            { label: "Indicação", value: "indicacao" },
          ]},
        ],
      },
      {
        type: "trigger_new_message",
        label: "Nova Mensagem",
        icon: "MessageCircle",
        description: "Dispara quando uma nova mensagem é recebida",
        category: "triggers",
        color: "#10b981",
        inputs: [],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "keyword_filter", label: "Filtrar por palavra-chave", type: "text", placeholder: "Ex: preço, disponível" },
        ],
      },
      {
        type: "trigger_stage_change",
        label: "Mudança de Etapa",
        icon: "ArrowRightLeft",
        description: "Dispara quando a etapa do funil muda",
        category: "triggers",
        color: "#10b981",
        inputs: [],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "from_stage", label: "De etapa", type: "select", options: [
            { label: "Qualquer", value: "any" },
            { label: "Novo Lead", value: "novo_lead" },
            { label: "Qualificação", value: "qualificacao" },
            { label: "Negociação", value: "negociacao" },
          ]},
          { key: "to_stage", label: "Para etapa", type: "select", options: [
            { label: "Qualquer", value: "any" },
            { label: "Qualificação", value: "qualificacao" },
            { label: "Proposta", value: "proposta_enviada" },
            { label: "Fechado", value: "fechado" },
            { label: "Perdido", value: "perdido" },
          ]},
        ],
      },
      {
        type: "trigger_tag_applied",
        label: "Tag Aplicada",
        icon: "Tag",
        description: "Dispara quando uma tag é aplicada à conversa",
        category: "triggers",
        color: "#10b981",
        inputs: [],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "tag_name", label: "Nome da tag", type: "text", required: true, placeholder: "Ex: VIP" },
        ],
      },
      {
        type: "trigger_scheduled",
        label: "Timer / Agendado",
        icon: "Clock",
        description: "Dispara em horário agendado ou intervalo",
        category: "triggers",
        color: "#10b981",
        inputs: [],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "schedule_type", label: "Tipo", type: "select", options: [
            { label: "Intervalo", value: "interval" },
            { label: "Horário fixo", value: "cron" },
          ]},
          { key: "interval_minutes", label: "Intervalo (minutos)", type: "number", placeholder: "30" },
        ],
      },
    ],
  },
  {
    id: "messages",
    label: "Mensagens",
    icon: "MessageSquare",
    color: "blue",
    nodes: [
      {
        type: "send_text",
        label: "Enviar Texto",
        icon: "Send",
        description: "Envia uma mensagem de texto ao cliente",
        category: "messages",
        color: "#3b82f6",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "message", label: "Mensagem", type: "textarea", required: true, placeholder: "Olá {{cliente.nome}}!" },
        ],
      },
      {
        type: "send_media",
        label: "Enviar Mídia",
        icon: "Image",
        description: "Envia imagem, vídeo ou documento",
        category: "messages",
        color: "#3b82f6",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "media_type", label: "Tipo de mídia", type: "select", options: [
            { label: "Imagem", value: "image" },
            { label: "Áudio", value: "audio" },
            { label: "Vídeo", value: "video" },
            { label: "Documento", value: "document" },
          ]},
          { key: "media_url", label: "URL da mídia", type: "text", placeholder: "https://..." },
          { key: "caption", label: "Legenda", type: "textarea" },
        ],
      },
      {
        type: "send_template",
        label: "Enviar Template",
        icon: "FileText",
        description: "Envia template aprovado (Cloud API)",
        category: "messages",
        color: "#3b82f6",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "template_name", label: "Nome do template", type: "text", required: true },
          { key: "language", label: "Idioma", type: "select", options: [
            { label: "Português (BR)", value: "pt_BR" },
            { label: "Inglês", value: "en" },
          ]},
          { key: "parameters", label: "Parâmetros (JSON)", type: "json" },
        ],
      },
    ],
  },
  {
    id: "questions",
    label: "Perguntas",
    icon: "HelpCircle",
    color: "violet",
    nodes: [
      {
        type: "question_text",
        label: "Texto Livre",
        icon: "TextCursorInput",
        description: "Captura resposta de texto livre do cliente",
        category: "questions",
        color: "#8b5cf6",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "question", label: "Pergunta", type: "textarea", required: true, placeholder: "Qual seu nome completo?" },
          { key: "save_to_variable", label: "Salvar em variável", type: "variable", placeholder: "cliente.nome" },
          { key: "timeout_seconds", label: "Timeout (segundos)", type: "number", placeholder: "300" },
        ],
      },
      {
        type: "question_buttons",
        label: "Opções / Botões",
        icon: "ListChecks",
        description: "Apresenta opções para o cliente escolher",
        category: "questions",
        color: "#8b5cf6",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "question", label: "Pergunta", type: "textarea", required: true },
          { key: "options", label: "Opções (JSON)", type: "json", placeholder: '["SUV", "Sedan", "Hatch"]' },
          { key: "save_to_variable", label: "Salvar em variável", type: "variable" },
        ],
      },
    ],
  },
  {
    id: "conditions",
    label: "Condições",
    icon: "GitBranch",
    color: "amber",
    nodes: [
      {
        type: "condition_if_else",
        label: "IF / ELSE",
        icon: "GitBranch",
        description: "Ramifica o fluxo com base em uma condição",
        category: "conditions",
        color: "#f59e0b",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [
          { id: "yes", label: "Sim ✓", type: "condition-yes" },
          { id: "no", label: "Não ✗", type: "condition-no" },
        ],
        configSchema: [
          { key: "condition_type", label: "Tipo de condição", type: "select", options: [
            { label: "Palavra-chave", value: "keyword" },
            { label: "Tag contém", value: "tag_contains" },
            { label: "Etapa é", value: "stage_is" },
            { label: "Campo CRM", value: "crm_field" },
            { label: "Variável", value: "variable" },
          ]},
          { key: "operator", label: "Operador", type: "select", options: [
            { label: "Igual a", value: "eq" },
            { label: "Contém", value: "contains" },
            { label: "Maior que", value: "gt" },
            { label: "Menor que", value: "lt" },
            { label: "Existe", value: "exists" },
          ]},
          { key: "value", label: "Valor", type: "text", required: true },
        ],
      },
    ],
  },
  {
    id: "actions",
    label: "Ações FEBEAL",
    icon: "Cog",
    color: "sky",
    nodes: [
      {
        type: "action_create_lead",
        label: "Criar/Atualizar Lead",
        icon: "UserPlus",
        description: "Cria ou atualiza lead no CRM",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "name_var", label: "Variável do nome", type: "variable", placeholder: "cliente.nome" },
          { key: "phone_var", label: "Variável do telefone", type: "variable", placeholder: "cliente.telefone" },
          { key: "lead_source", label: "Origem", type: "text" },
        ],
      },
      {
        type: "action_apply_tag",
        label: "Aplicar/Remover Tag",
        icon: "Tag",
        description: "Aplica ou remove uma tag da conversa",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "action", label: "Ação", type: "select", options: [
            { label: "Aplicar", value: "apply" },
            { label: "Remover", value: "remove" },
          ]},
          { key: "tag_name", label: "Tag", type: "text", required: true },
        ],
      },
      {
        type: "action_change_stage",
        label: "Alterar Etapa",
        icon: "ArrowRight",
        description: "Move a conversa para outra etapa do pipeline",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "target_stage", label: "Etapa destino", type: "select", required: true, options: [
            { label: "Novo Lead", value: "novo_lead" },
            { label: "Qualificação", value: "qualificacao" },
            { label: "Prep. Proposta", value: "proposta_preparacao" },
            { label: "Proposta Enviada", value: "proposta_enviada" },
            { label: "Negociação", value: "negociacao" },
            { label: "Fechado", value: "fechado" },
            { label: "Pós-venda", value: "pos_venda" },
            { label: "Perdido", value: "perdido" },
          ]},
        ],
      },
      {
        type: "action_assign",
        label: "Atribuir Responsável",
        icon: "UserCheck",
        description: "Atribui a conversa a um vendedor",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "assign_type", label: "Tipo", type: "select", options: [
            { label: "Vendedor específico", value: "specific" },
            { label: "Round-robin", value: "round_robin" },
            { label: "Menos ocupado", value: "least_busy" },
          ]},
          { key: "user_id", label: "ID do vendedor", type: "text" },
        ],
      },
      {
        type: "action_create_task",
        label: "Criar Tarefa",
        icon: "ClipboardList",
        description: "Cria uma tarefa interna para follow-up",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "title", label: "Título", type: "text", required: true },
          { key: "description", label: "Descrição", type: "textarea" },
          { key: "due_hours", label: "Prazo (horas)", type: "number", placeholder: "24" },
        ],
      },
      {
        type: "action_link_vehicle",
        label: "Vincular Veículo",
        icon: "Car",
        description: "Vincula veículo do estoque à conversa",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "vehicle_var", label: "Variável do veículo", type: "variable", placeholder: "veiculo.id" },
        ],
      },
      {
        type: "action_create_proposal",
        label: "Criar Proposta",
        icon: "FileSignature",
        description: "Gera proposta comercial automática",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "template", label: "Template de proposta", type: "select", options: [
            { label: "Padrão", value: "default" },
            { label: "Premium", value: "premium" },
            { label: "Financiamento", value: "financing" },
          ]},
        ],
      },
      {
        type: "action_request_kyc",
        label: "Solicitar Documentos (KYC)",
        icon: "ShieldCheck",
        description: "Envia link de auto-cadastro para documentos",
        category: "actions",
        color: "#0ea5e9",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "doc_types", label: "Documentos necessários", type: "tags", placeholder: "RG/CNH, CPF, Comprovante" },
        ],
      },
    ],
  },
  {
    id: "ai",
    label: "Inteligência Artificial",
    icon: "Brain",
    color: "purple",
    nodes: [
      {
        type: "ai_agent",
        label: "Agente IA",
        icon: "Bot",
        description: "Processamento de IA configurável",
        category: "ai",
        color: "#a855f7",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "provider", label: "Provider IA", type: "select", options: [
            { label: "Lovable AI (Gemini)", value: "lovable" },
            { label: "OpenAI", value: "openai" },
            { label: "Anthropic", value: "anthropic" },
          ]},
          { key: "model", label: "Modelo", type: "text", placeholder: "gpt-4o" },
          { key: "system_prompt", label: "Prompt do sistema", type: "textarea", description: "Instrução base para a IA", placeholder: "Você é o Lucas, um atendente de 23 anos da FEBEAL Motors. Você é simpático, educado e apaixonado por carros. Seu objetivo é ajudar cada lead a encontrar o carro dos sonhos. Sempre responda de forma amigável e prestativa, faça perguntas para entender o que o cliente busca (tipo de veículo, orçamento, uso), sugira opções do estoque e conduza a conversa para um agendamento de visita. Use linguagem natural e descontraída, mas profissional." },
          { key: "temperature", label: "Temperatura", type: "number", placeholder: "0.7" },
          { key: "save_response_to", label: "Salvar resposta em", type: "variable" },
        ],
      },
    ],
  },
  {
    id: "handoff",
    label: "Handoff Humano",
    icon: "UserCog",
    color: "rose",
    nodes: [
      {
        type: "handoff_pause",
        label: "Pausar Automação",
        icon: "PauseCircle",
        description: "Pausa a automação e aguarda ação humana",
        category: "handoff",
        color: "#f43f5e",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "reason", label: "Motivo da pausa", type: "textarea" },
          { key: "resume_on", label: "Retomar quando", type: "select", options: [
            { label: "Manualmente", value: "manual" },
            { label: "Após resposta humana", value: "after_reply" },
            { label: "Timeout (voltar ao fluxo)", value: "timeout" },
          ]},
          { key: "timeout_minutes", label: "Timeout (minutos)", type: "number" },
        ],
      },
      {
        type: "handoff_transfer",
        label: "Transferir p/ Vendedor",
        icon: "ArrowRightLeft",
        description: "Transfere a conversa para um vendedor",
        category: "handoff",
        color: "#f43f5e",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "transfer_to", label: "Transferir para", type: "select", options: [
            { label: "Vendedor designado", value: "assigned" },
            { label: "Gestor", value: "manager" },
            { label: "Próximo disponível", value: "next_available" },
          ]},
          { key: "message", label: "Mensagem de handoff", type: "textarea" },
        ],
      },
      {
        type: "handoff_notify",
        label: "Notificar Time",
        icon: "Bell",
        description: "Envia notificação para o time",
        category: "handoff",
        color: "#f43f5e",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "notify_channel", label: "Canal", type: "select", options: [
            { label: "In-app", value: "inapp" },
            { label: "WhatsApp grupo", value: "whatsapp_group" },
            { label: "E-mail", value: "email" },
          ]},
          { key: "message", label: "Mensagem", type: "textarea", required: true },
        ],
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilitários",
    icon: "Wrench",
    color: "slate",
    nodes: [
      {
        type: "util_delay",
        label: "Delay / Timer",
        icon: "Timer",
        description: "Aguarda antes de continuar o fluxo",
        category: "utilities",
        color: "#64748b",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "delay_seconds", label: "Delay (segundos)", type: "number", required: true, placeholder: "5" },
        ],
      },
      {
        type: "util_goto",
        label: "Goto / Subflow",
        icon: "ExternalLink",
        description: "Redireciona para outro fluxo",
        category: "utilities",
        color: "#64748b",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [],
        configSchema: [
          { key: "target_flow_id", label: "Fluxo destino", type: "text", required: true },
        ],
      },
      {
        type: "util_webhook",
        label: "Webhook (n8n)",
        icon: "Globe",
        description: "Chama webhook externo (n8n, Zapier, etc.)",
        category: "utilities",
        color: "#64748b",
        inputs: [{ id: "in", label: "Entrada", type: "default" }],
        outputs: [{ id: "out", label: "Saída", type: "default" }],
        configSchema: [
          { key: "url", label: "URL do webhook", type: "text", required: true, placeholder: "https://n8n.example.com/webhook/..." },
          { key: "method", label: "Método", type: "select", options: [
            { label: "POST", value: "POST" },
            { label: "GET", value: "GET" },
          ]},
          { key: "headers", label: "Headers (JSON)", type: "json" },
          { key: "body_template", label: "Body template", type: "json" },
          { key: "save_response_to", label: "Salvar resposta em", type: "variable" },
        ],
      },
    ],
  },
];

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  for (const cat of NODE_CATEGORIES) {
    const found = cat.nodes.find(n => n.type === type);
    if (found) return found;
  }
  return undefined;
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return NODE_CATEGORIES.flatMap(c => c.nodes);
}
