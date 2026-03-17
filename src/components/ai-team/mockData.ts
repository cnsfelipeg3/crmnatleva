export type AgentStatus = 'idle' | 'analyzing' | 'suggesting' | 'waiting' | 'alert';
export type AgentLevel = 'basic' | 'intermediate' | 'advanced';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  sector: string;
  level: AgentLevel;
  skills: string[];
  scope: string[];
  restrictions: string[];
  behaviorPrompt: string;
  status: AgentStatus;
  lastAction: string;
  currentThought: string;
}

export type TaskStatus = 'detected' | 'analyzing' | 'suggested' | 'pending' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  sourceAgentId: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
}

export const defaultSkills = [
  'Detectar problemas', 'Sugerir melhorias', 'Analisar métricas',
  'Otimizar UX', 'Revisar processos', 'Gerar ideias', 'Priorizar tarefas',
];

export const defaultScopes = [
  'Propostas', 'Biblioteca de mídia', 'CRM', 'Financeiro', 'Vendas', 'Sistema geral',
];

export const defaultRestrictions = [
  'Não executar automaticamente', 'Apenas sugerir', 'Não alterar dados sensíveis', 'Requer aprovação',
];

export const sectorOptions = [
  'Vendas', 'Operações', 'Financeiro', 'Marketing', 'Produto', 'Gestão',
];

/* ═══════════════════════════════════════════
   10 Agentes
   ═══════════════════════════════════════════ */

export const agents: Agent[] = [
  {
    id: 'gerente',
    name: 'Gerente',
    emoji: '👨‍💼',
    role: 'Coordena os demais agentes e prioriza tarefas estratégicas',
    sector: 'Gestão',
    level: 'advanced',
    skills: ['Priorização', 'Delegação', 'Visão sistêmica'],
    scope: ['Sistema geral'],
    restrictions: ['Requer aprovação'],
    behaviorPrompt: 'Seja estratégico e focado em resultados. Priorize tarefas de maior impacto.',
    status: 'analyzing',
    lastAction: 'Priorizou 3 melhorias para o módulo de propostas',
    currentThought: 'Estou avaliando as sugestões do Auditor e do Estrategista para definir a ordem de execução.',
  },
  {
    id: 'auditor',
    name: 'Auditor',
    emoji: '🔍',
    role: 'Analisa processos, identifica gargalos e inconsistências',
    sector: 'Operações',
    level: 'advanced',
    skills: ['Análise de dados', 'Detecção de padrões', 'Qualidade'],
    scope: ['Propostas', 'Biblioteca de mídia', 'CRM'],
    restrictions: ['Apenas sugerir', 'Não alterar dados sensíveis'],
    behaviorPrompt: 'Seja meticuloso e orientado por dados. Identifique inconsistências e oportunidades.',
    status: 'suggesting',
    lastAction: 'Detectou oportunidade na biblioteca de mídia',
    currentThought: 'A taxa de reutilização de mídias entre propostas é baixa — apenas 22%.',
  },
  {
    id: 'estrategista',
    name: 'Estrategista',
    emoji: '🧠',
    role: 'Sugere melhorias de longo prazo e identifica tendências',
    sector: 'Produto',
    level: 'advanced',
    skills: ['Tendências', 'Estratégia comercial', 'Inovação'],
    scope: ['Vendas', 'Propostas', 'Financeiro'],
    restrictions: ['Apenas sugerir', 'Requer aprovação'],
    behaviorPrompt: 'Pense a longo prazo. Identifique tendências e proponha inovações de alto impacto.',
    status: 'analyzing',
    lastAction: 'Analisando padrões de vendas dos últimos 30 dias',
    currentThought: 'Concentração de vendas em destinos europeus, mas margem nacional é 18% superior.',
  },
  {
    id: 'analista',
    name: 'Analista de Dados',
    emoji: '📊',
    role: 'Interpreta métricas, KPIs e gera relatórios acionáveis',
    sector: 'Produto',
    level: 'advanced',
    skills: ['Métricas', 'BI', 'Correlações', 'Visualização de dados'],
    scope: ['Sistema geral', 'Vendas', 'Financeiro'],
    restrictions: ['Apenas sugerir', 'Não alterar dados sensíveis'],
    behaviorPrompt: 'Seja quantitativo e objetivo. Busque insights acionáveis em cada métrica.',
    status: 'idle',
    lastAction: 'Gerou relatório de conversão semanal',
    currentThought: 'Consolidando métricas da última semana para identificar anomalias.',
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    emoji: '💰',
    role: 'Monitora margem, lucro, custos e saúde financeira',
    sector: 'Financeiro',
    level: 'advanced',
    skills: ['Margem', 'Fluxo de caixa', 'Precificação', 'DRE'],
    scope: ['Financeiro', 'Vendas'],
    restrictions: ['Não executar automaticamente', 'Requer aprovação'],
    behaviorPrompt: 'Seja conservador e foque em rentabilidade. Alerte sobre riscos financeiros.',
    status: 'analyzing',
    lastAction: 'Analisando margens por destino',
    currentThought: 'Verificando se os markups aplicados estão dentro da política de margem mínima.',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    emoji: '🧲',
    role: 'Sugere campanhas, posicionamento e ações de atração',
    sector: 'Marketing',
    level: 'intermediate',
    skills: ['Posicionamento', 'Segmentação', 'Copy', 'Campanhas'],
    scope: ['CRM', 'Vendas', 'Propostas'],
    restrictions: ['Apenas sugerir', 'Requer aprovação'],
    behaviorPrompt: 'Seja criativo e orientado a conversão. Proponha campanhas com ROI mensurável.',
    status: 'idle',
    lastAction: 'Sugeriu campanha de reativação de leads inativos',
    currentThought: 'Monitorando perfil de clientes que não interagiram nos últimos 30 dias.',
  },
  {
    id: 'comercial',
    name: 'Comercial',
    emoji: '🤝',
    role: 'Detecta oportunidades de fechamento e conversão',
    sector: 'Vendas',
    level: 'advanced',
    skills: ['Negociação', 'Timing', 'Objeções', 'Pipeline'],
    scope: ['Vendas', 'CRM', 'Propostas'],
    restrictions: ['Apenas sugerir', 'Não alterar dados sensíveis'],
    behaviorPrompt: 'Seja direto e focado em fechamento. Identifique o momento certo para agir.',
    status: 'suggesting',
    lastAction: 'Identificou 3 propostas com alta probabilidade de fechamento',
    currentThought: 'Propostas com mais de 2 interações na última semana têm 60% mais chance de fechar.',
  },
  {
    id: 'atendimento',
    name: 'Atendimento',
    emoji: '📞',
    role: 'Identifica problemas de clientes e monitora satisfação',
    sector: 'Operações',
    level: 'intermediate',
    skills: ['Empatia', 'Resolução', 'SLA', 'NPS'],
    scope: ['CRM', 'Sistema geral'],
    restrictions: ['Apenas sugerir', 'Não executar automaticamente'],
    behaviorPrompt: 'Seja empático e priorize a satisfação do cliente. Alerte sobre SLA em risco.',
    status: 'idle',
    lastAction: 'Monitorou tempo médio de resposta',
    currentThought: 'Verificando se há clientes com chamados sem resposta há mais de 24h.',
  },
  {
    id: 'operacional',
    name: 'Operacional',
    emoji: '⚙️',
    role: 'Otimiza processos internos e fluxos de trabalho',
    sector: 'Operações',
    level: 'intermediate',
    skills: ['Eficiência', 'Automação', 'Fluxos', 'Processos'],
    scope: ['Sistema geral', 'Propostas'],
    restrictions: ['Apenas sugerir', 'Requer aprovação'],
    behaviorPrompt: 'Seja pragmático e foque em simplificar. Elimine etapas desnecessárias.',
    status: 'analyzing',
    lastAction: 'Mapeando gargalos no fluxo de propostas',
    currentThought: 'Analisando tempo médio em cada etapa do funil de propostas.',
  },
  {
    id: 'inovacao',
    name: 'Inovação',
    emoji: '🚀',
    role: 'Sugere novas features, produtos e diferenciação',
    sector: 'Produto',
    level: 'advanced',
    skills: ['Ideação', 'MVP', 'Tendências tech', 'Diferenciação'],
    scope: ['Sistema geral', 'Vendas', 'Propostas'],
    restrictions: ['Apenas sugerir', 'Requer aprovação'],
    behaviorPrompt: 'Pense fora da caixa. Sugira inovações que criem vantagem competitiva real.',
    status: 'idle',
    lastAction: 'Pesquisou tendências de mercado em travel tech',
    currentThought: 'Explorando como IA generativa pode ser usada na montagem de itinerários.',
  },
];

/* ═══════════════════════════════════════════
   Tarefas iniciais
   ═══════════════════════════════════════════ */

export const initialTasks: Task[] = [
  { id: 't1', title: 'Criar pacotes de mídia por destino', description: 'Agrupar fotos e vídeos já utilizados por destino para acelerar montagem de propostas.', sourceAgentId: 'auditor', status: 'suggested', priority: 'high', createdAt: '2026-03-17T09:15:00' },
  { id: 't2', title: 'Destacar destinos nacionais premium', description: 'Margem em destinos nacionais está 18% acima da média.', sourceAgentId: 'estrategista', status: 'analyzing', priority: 'high', createdAt: '2026-03-17T08:40:00' },
  { id: 't3', title: 'Revisar follow-up de propostas abertas', description: '12 propostas estão sem resposta há mais de 5 dias.', sourceAgentId: 'gerente', status: 'pending', priority: 'medium', createdAt: '2026-03-17T10:00:00' },
  { id: 't4', title: 'Padronizar descrições de quartos', description: 'Inconsistências em nomes de quartos entre propostas do mesmo hotel.', sourceAgentId: 'auditor', status: 'detected', priority: 'medium', createdAt: '2026-03-17T07:20:00' },
  { id: 't5', title: 'Sugerir upsell em viagens de lua de mel', description: 'Clientes de lua de mel aceitam 40% mais upgrades quando oferecidos.', sourceAgentId: 'estrategista', status: 'suggested', priority: 'low', createdAt: '2026-03-16T16:30:00' },
  { id: 't6', title: 'Alerta de fornecedor com prazo atrasado', description: 'Hotel Fasano com 3 confirmações pendentes acima de 48h.', sourceAgentId: 'auditor', status: 'suggested', priority: 'high', createdAt: '2026-03-17T11:00:00' },
  { id: 't7', title: 'Otimizar tempo de montagem de proposta', description: 'Tempo médio atual: 42 min. Meta: 25 min com templates pré-prontos.', sourceAgentId: 'gerente', status: 'analyzing', priority: 'medium', createdAt: '2026-03-17T06:50:00' },
  { id: 't8', title: 'Mapear sazonalidade por destino', description: 'Cruzar dados de vendas dos últimos 12 meses por destino.', sourceAgentId: 'estrategista', status: 'in_progress', priority: 'medium', createdAt: '2026-03-15T14:00:00' },
  { id: 't9', title: 'Alertas de margem negativa', description: 'Detecção automática quando venda opera com margem abaixo de 5%.', sourceAgentId: 'auditor', status: 'in_progress', priority: 'high', createdAt: '2026-03-14T10:30:00' },
  { id: 't10', title: 'Templates de proposta por perfil', description: 'Templates para lua de mel, família, corporativo e aventura.', sourceAgentId: 'gerente', status: 'done', priority: 'high', createdAt: '2026-03-10T09:00:00' },
  { id: 't11', title: 'Ranking de fornecedores rentáveis', description: 'Ranking por margem líquida e volume de vendas no trimestre.', sourceAgentId: 'auditor', status: 'done', priority: 'medium', createdAt: '2026-03-08T11:20:00' },
  { id: 't12', title: 'Recalibrar markups Europa verão', description: 'Ajustar precificação para temporada alta europeia.', sourceAgentId: 'estrategista', status: 'done', priority: 'high', createdAt: '2026-03-05T15:00:00' },
  // New tasks from new agents
  { id: 't13', title: 'Dashboard de KPIs de conversão', description: 'Criar visualização com taxa de conversão por etapa do funil.', sourceAgentId: 'analista', status: 'suggested', priority: 'medium', createdAt: '2026-03-17T09:30:00' },
  { id: 't14', title: 'Alerta de fluxo de caixa negativo', description: 'Projeção indica caixa negativo em 15 dias se tendência continuar.', sourceAgentId: 'financeiro', status: 'suggested', priority: 'high', createdAt: '2026-03-17T10:15:00' },
  { id: 't15', title: 'Campanha de reativação Q1', description: 'Leads inativos há 60+ dias com perfil premium. Potencial R$120k.', sourceAgentId: 'marketing', status: 'suggested', priority: 'medium', createdAt: '2026-03-17T08:00:00' },
  { id: 't16', title: 'Propostas prontas para fechamento', description: '5 propostas com score >80% de conversão aguardando ação comercial.', sourceAgentId: 'comercial', status: 'suggested', priority: 'high', createdAt: '2026-03-17T11:10:00' },
  { id: 't17', title: 'Clientes sem resposta há 48h', description: '3 clientes com chamado aberto e sem retorno do time.', sourceAgentId: 'atendimento', status: 'suggested', priority: 'high', createdAt: '2026-03-17T09:45:00' },
  { id: 't18', title: 'Automatizar etapa de briefing', description: 'Etapa de briefing consome 18min em média. Pode ser reduzida com template.', sourceAgentId: 'operacional', status: 'analyzing', priority: 'medium', createdAt: '2026-03-17T07:00:00' },
  { id: 't19', title: 'Itinerário gerado por IA', description: 'Prototipar geração automática de itinerário com base no perfil do cliente.', sourceAgentId: 'inovacao', status: 'suggested', priority: 'low', createdAt: '2026-03-17T10:30:00' },
];

/* ═══════════════════════════════════════════
   Simulated Responses (terminal)
   ═══════════════════════════════════════════ */

export const simulatedResponses: Record<string, string[]> = {
  gerente: [
    'Estou priorizando tarefas que impactam velocidade de fechamento.',
    'Recomendo focar nos pacotes de mídia — ganho rápido e alto impacto.',
    'Vejo espaço para reduzir o tempo de montagem de propostas em 40%.',
  ],
  auditor: [
    'Identifiquei 3 padrões de inconsistência nos dados de hospedagem.',
    'Apenas 22% das fotos são reaproveitadas entre propostas.',
    'Recomendo revisão nos fornecedores com SLA acima de 48h.',
  ],
  estrategista: [
    'Tendência clara de crescimento em viagens nacionais premium.',
    'Propostas com fotos de alta qualidade convertem 35% mais.',
    'Sugiro foco em pacotes experienciais para o próximo trimestre.',
  ],
  analista: [
    'Taxa de conversão caiu 8% esta semana vs. semana anterior.',
    'Correlação forte entre tempo de resposta e taxa de fechamento.',
    'Destinos com mais de 10 fotos na proposta convertem 25% mais.',
  ],
  financeiro: [
    'Margem média está em 12.4% — abaixo da meta de 15%.',
    'Custos operacionais subiram 7% no último mês.',
    'Recomendo revisar markups em destinos com margem inferior a 8%.',
  ],
  marketing: [
    '340 leads inativos com perfil de alto valor identificados.',
    'Campanha de remarketing pode recuperar até R$180k em pipeline.',
    'Destino mais buscado do mês: Maldivas (+45% vs. mês anterior).',
  ],
  comercial: [
    '5 propostas estão no momento ideal de fechamento.',
    'Tempo médio de decisão do cliente: 4.2 dias.',
    'Propostas com follow-up em 24h fecham 3x mais.',
  ],
  atendimento: [
    'Tempo médio de resposta atual: 6.5h (meta: 4h).',
    '3 clientes reportaram insatisfação com confirmação de hotel.',
    'NPS estimado do mês: 72 (queda de 5 pontos).',
  ],
  operacional: [
    'Fluxo de proposta tem 3 etapas que podem ser automatizadas.',
    'Tempo de montagem reduziria 35% com templates pré-configurados.',
    'Gargalo principal: aprovação de fornecedor (média 18h).',
  ],
  inovacao: [
    'IA generativa pode montar 80% do itinerário automaticamente.',
    'Concorrentes já oferecem portal do viajante com tracking em tempo real.',
    'Sugiro prototipar proposta interativa com galeria imersiva.',
  ],
};
