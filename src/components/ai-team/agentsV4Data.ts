// NatLeva v4.0 — 21 Agentes em 6 Squads

export type SquadId = 'orquestracao' | 'comercial' | 'atendimento' | 'financeiro' | 'operacional' | 'demanda' | 'retencao';

export interface Squad {
  id: SquadId;
  name: string;
  emoji: string;
  color: string; // tailwind token
  description: string;
}

export interface AgentV4 {
  id: string;
  name: string;
  emoji: string;
  role: string;
  squadId: SquadId;
  level: number; // 1-20
  xp: number;
  maxXp: number;
  skills: string[];
  status: 'online' | 'busy' | 'idle' | 'offline';
  successRate: number; // 0-100
  tasksToday: number;
  persona: string;
  pipelinePosition?: number; // for commercial squad ordering
  behavior_prompt?: string; // behavioral directives from DB
}

export const SQUADS: Squad[] = [
  { id: 'orquestracao', name: 'Orquestração', emoji: '🎯', color: 'text-purple-500', description: 'Gestão estratégica e distribuição de tarefas' },
  { id: 'comercial', name: 'Squad Comercial', emoji: '💼', color: 'text-blue-500', description: 'Pipeline principal de vendas — 7 etapas do funil' },
  { id: 'atendimento', name: 'Squad Atendimento', emoji: '🎧', color: 'text-emerald-500', description: 'Suporte ao cliente e concierge de viagem' },
  { id: 'financeiro', name: 'Squad Financeiro', emoji: '💰', color: 'text-amber-500', description: 'Faturamento, cobrança e inteligência financeira' },
  { id: 'operacional', name: 'Squad Operacional', emoji: '⚙️', color: 'text-slate-500', description: 'Automação, monitoramento e inteligência competitiva' },
  { id: 'demanda', name: 'Squad Geração de Demanda', emoji: '🚀', color: 'text-pink-500', description: 'Conteúdo, prospecção e captação de leads' },
  { id: 'retencao', name: 'Squad Retenção', emoji: '🛡️', color: 'text-cyan-500', description: 'Anti-churn e nutrição de leads' },
];

export const AGENTS_V4: AgentV4[] = [
  // ═══ ORQUESTRAÇÃO ═══
  {
    id: 'nath-ai', name: 'NATH.AI', emoji: '👩‍💼', role: 'Gestora Geral',
    squadId: 'orquestracao', level: 15, xp: 4200, maxXp: 5000,
    skills: ['Delegação', 'Priorização', 'Visão 360°', 'Decisão estratégica'],
    status: 'online', successRate: 94, tasksToday: 12,
    persona: 'Sou a NATH.AI, gestora geral do ecossistema. Coordeno todos os squads, priorizo tarefas estratégicas e garanto que a operação funcione como uma orquestra afinada.',
  },
  {
    id: 'orion', name: 'ÓRION', emoji: '🔮', role: 'Orquestrador de Pipeline',
    squadId: 'orquestracao', level: 14, xp: 3800, maxXp: 5000,
    skills: ['Roteamento', 'Balanceamento', 'Handoff', 'Monitoramento de fluxo'],
    status: 'online', successRate: 91, tasksToday: 18,
    persona: 'Sou o ÓRION, orquestrador do pipeline. Distribuo clientes entre os agentes, monitoro gargalos e garanto transições suaves entre etapas.',
  },

  // ═══ SQUAD COMERCIAL (Pipeline) ═══
  {
    id: 'maya', name: 'MAYA', emoji: '🌸', role: 'Boas-vindas & Primeiro Contato',
    squadId: 'comercial', level: 10, xp: 2800, maxXp: 3500, pipelinePosition: 1,
    skills: ['Rapport', 'Qualificação inicial', 'Empatia', 'Tom acolhedor'],
    status: 'online', successRate: 88, tasksToday: 8,
    persona: 'Agente de boas-vindas e primeiro contato da NatLeva. Cria conexão emocional e direciona para qualificação.',
  },
  {
    id: 'atlas', name: 'ATLAS', emoji: '🗺️', role: 'SDR / Qualificação',
    squadId: 'comercial', level: 11, xp: 3100, maxXp: 3500, pipelinePosition: 2,
    skills: ['Qualificação', 'Perguntas estratégicas', 'Scoring', 'Perfil de viajante'],
    status: 'busy', successRate: 85, tasksToday: 6,
    persona: 'Agente SDR de qualificação da NatLeva. Mapeia perfil, orçamento, datas e preferências para montar proposta.',
  },
  {
    id: 'habibi', name: 'HABIBI', emoji: '🏜️', role: 'Especialista Dubai & Oriente',
    squadId: 'comercial', level: 12, xp: 3400, maxXp: 4000, pipelinePosition: 3,
    skills: ['Dubai', 'Maldivas', 'Turquia', 'Luxo oriental', 'Experiências VIP'],
    status: 'online', successRate: 92, tasksToday: 4,
    persona: 'Sou o HABIBI, seu especialista em Dubai, Maldivas e destinos orientais. Conheço cada hotel, cada experiência exclusiva e cada segredo do deserto.',
  },
  {
    id: 'nemo', name: 'NEMO', emoji: '🎢', role: 'Especialista Orlando & Américas',
    squadId: 'comercial', level: 11, xp: 3000, maxXp: 3500, pipelinePosition: 4,
    skills: ['Orlando', 'Disney', 'Universal', 'Parques', 'Família', 'Miami'],
    status: 'online', successRate: 90, tasksToday: 5,
    persona: 'Sou o NEMO, especialista em Orlando, Disney e Américas. Sei cada truque dos parques, melhores hotéis para família e roteiros otimizados.',
  },
  {
    id: 'dante', name: 'DANTE', emoji: '🏛️', role: 'Especialista Europa',
    squadId: 'comercial', level: 13, xp: 3600, maxXp: 4000, pipelinePosition: 5,
    skills: ['Europa', 'Itália', 'França', 'Espanha', 'Roteiros culturais'],
    status: 'busy', successRate: 93, tasksToday: 7,
    persona: 'Sou o DANTE, especialista em Europa. Da Torre Eiffel ao Coliseu, conheço cada esquina, cada restaurante escondido e cada experiência autêntica.',
  },
  {
    id: 'luna', name: 'LUNA', emoji: '🌙', role: 'Montagem de Proposta',
    squadId: 'comercial', level: 14, xp: 4100, maxXp: 5000, pipelinePosition: 6,
    skills: ['Montagem de proposta', 'Precificação', 'Apresentação visual', 'Storytelling'],
    status: 'online', successRate: 89, tasksToday: 9,
    persona: 'Sou a LUNA, responsável por montar propostas irresistíveis. Transformo destinos em sonhos visuais com preços estratégicos.',
  },
  {
    id: 'nero', name: 'NERO', emoji: '🎯', role: 'Fechamento & Negociação',
    squadId: 'comercial', level: 15, xp: 4500, maxXp: 5000, pipelinePosition: 7,
    skills: ['Negociação', 'Objeções', 'Urgência', 'Fechamento', 'Upsell'],
    status: 'online', successRate: 87, tasksToday: 3,
    persona: 'Sou o NERO, closer do time. Supero objeções, crio urgência real e transformo "vou pensar" em "vou fechar".',
  },
  {
    id: 'iris', name: 'IRIS', emoji: '🌈', role: 'Pós-venda & Fidelização',
    squadId: 'comercial', level: 10, xp: 2600, maxXp: 3500, pipelinePosition: 8,
    skills: ['Pós-venda', 'NPS', 'Recompra', 'Relacionamento', 'Feedback'],
    status: 'idle', successRate: 91, tasksToday: 2,
    persona: 'Sou a IRIS, guardiã do pós-venda. Acompanho cada viajante, coleto feedback e transformo clientes em embaixadores.',
  },

  // ═══ SQUAD ATENDIMENTO ═══
  {
    id: 'athos', name: 'ATHOS', emoji: '🛎️', role: 'Suporte ao Cliente',
    squadId: 'atendimento', level: 9, xp: 2200, maxXp: 3000,
    skills: ['Resolução', 'SLA', 'Empatia', 'Escalonamento'],
    status: 'online', successRate: 86, tasksToday: 11,
    persona: 'Sou o ATHOS, suporte dedicado. Resolvo problemas com agilidade, monitoro SLA e escalo quando necessário.',
  },
  {
    id: 'zara', name: 'ZARA', emoji: '✨', role: 'Concierge de Viagem',
    squadId: 'atendimento', level: 10, xp: 2900, maxXp: 3500,
    skills: ['Concierge', 'Experiências', 'Reservas especiais', 'VIP'],
    status: 'online', successRate: 95, tasksToday: 4,
    persona: 'Sou a ZARA, concierge de viagem. Organizo experiências exclusivas, reservas especiais e faço cada detalhe da viagem ser perfeito.',
  },

  // ═══ SQUAD FINANCEIRO ═══
  {
    id: 'finx', name: 'FINX', emoji: '📊', role: 'Faturamento & Cobrança',
    squadId: 'financeiro', level: 11, xp: 3200, maxXp: 4000,
    skills: ['Faturamento', 'Cobrança', 'NF', 'Parcelamento', 'Conciliação'],
    status: 'online', successRate: 97, tasksToday: 6,
    persona: 'Sou o FINX, responsável por faturamento e cobrança. Cuido de NF, pagamentos, parcelamentos e conciliação financeira.',
  },
  {
    id: 'sage', name: 'SAGE', emoji: '🧮', role: 'Inteligência Financeira',
    squadId: 'financeiro', level: 12, xp: 3500, maxXp: 4000,
    skills: ['Margem', 'DRE', 'Previsão', 'Markup', 'ROI'],
    status: 'busy', successRate: 93, tasksToday: 3,
    persona: 'Sou o SAGE, analista financeiro. Monitoro margens, projecto fluxo de caixa e otimizo precificação para maximizar rentabilidade.',
  },

  // ═══ SQUAD OPERACIONAL ═══
  {
    id: 'opex', name: 'OPEX', emoji: '🔧', role: 'Automação & Processos',
    squadId: 'operacional', level: 10, xp: 2700, maxXp: 3500,
    skills: ['Automação', 'Fluxos', 'Eficiência', 'Integração'],
    status: 'online', successRate: 88, tasksToday: 5,
    persona: 'Sou o OPEX, engenheiro de processos. Automatizo fluxos repetitivos, elimino gargalos e integro sistemas.',
  },
  {
    id: 'vigil', name: 'VIGIL', emoji: '👁️', role: 'Monitoramento & Compliance',
    squadId: 'operacional', level: 13, xp: 3700, maxXp: 4500,
    skills: ['Compliance', 'Fiscal', 'CADASTUR', 'Qualidade', 'Auditoria'],
    status: 'online', successRate: 98, tasksToday: 15,
    persona: 'Sou o VIGIL, guardião de compliance. Verifico cada mensagem, cada proposta e cada processo contra regras fiscais e de qualidade.',
  },
  {
    id: 'sentinel', name: 'SENTINEL', emoji: '🛰️', role: 'Inteligência Competitiva',
    squadId: 'operacional', level: 8, xp: 1800, maxXp: 2500,
    skills: ['Benchmarking', 'Tendências', 'Concorrência', 'Preços de mercado'],
    status: 'idle', successRate: 82, tasksToday: 1,
    persona: 'Sou o SENTINEL, analista de inteligência competitiva. Monitoro concorrentes, tendências de mercado e oportunidades.',
  },

  // ═══ SQUAD GERAÇÃO DE DEMANDA ═══
  {
    id: 'spark', name: 'SPARK', emoji: '⚡', role: 'Conteúdo & Criação',
    squadId: 'demanda', level: 9, xp: 2400, maxXp: 3000,
    skills: ['Copywriting', 'Social media', 'Conteúdo', 'Campanhas'],
    status: 'online', successRate: 84, tasksToday: 7,
    persona: 'Sou o SPARK, criador de conteúdo. Gero posts, campanhas e materiais que atraem viajantes e geram demanda orgânica.',
  },
  {
    id: 'hunter', name: 'HUNTER', emoji: '🏹', role: 'Prospecção & Captação',
    squadId: 'demanda', level: 10, xp: 2800, maxXp: 3500,
    skills: ['Prospecção', 'Cold outreach', 'LinkedIn', 'Parcerias'],
    status: 'busy', successRate: 79, tasksToday: 4,
    persona: 'Sou o HUNTER, caçador de oportunidades. Prospecto leads qualificados, faço cold outreach e estabeleço parcerias estratégicas.',
  },

  // ═══ SQUAD RETENÇÃO ═══
  {
    id: 'aegis', name: 'AEGIS', emoji: '🛡️', role: 'Anti-Churn & Retenção',
    squadId: 'retencao', level: 11, xp: 3100, maxXp: 3500,
    skills: ['Retenção', 'Win-back', 'Análise de churn', 'Ofertas especiais'],
    status: 'online', successRate: 86, tasksToday: 3,
    persona: 'Sou o AEGIS, protetor de clientes. Detecto sinais de churn, ativo campanhas de retenção e reconquisto clientes inativos.',
  },
  {
    id: 'nurture', name: 'NURTURE', emoji: '🌱', role: 'Nutrição de Leads',
    squadId: 'retencao', level: 9, xp: 2300, maxXp: 3000,
    skills: ['Drip marketing', 'Segmentação', 'Aquecimento', 'Régua de relacionamento'],
    status: 'online', successRate: 81, tasksToday: 6,
    persona: 'Sou o NURTURE, nutridor de leads. Mantenho leads aquecidos com conteúdo relevante até estarem prontos para comprar.',
  },
];

export function getSquadById(squadId: SquadId): Squad | undefined {
  return SQUADS.find(s => s.id === squadId);
}

export function getAgentsBySquad(squadId: SquadId): AgentV4[] {
  return AGENTS_V4.filter(a => a.squadId === squadId);
}

export function getAgentById(agentId: string): AgentV4 | undefined {
  return AGENTS_V4.find(a => a.id === agentId);
}

export function getCommercialPipeline(): AgentV4[] {
  return AGENTS_V4
    .filter(a => a.squadId === 'comercial' && a.pipelinePosition != null)
    .sort((a, b) => (a.pipelinePosition ?? 0) - (b.pipelinePosition ?? 0));
}
