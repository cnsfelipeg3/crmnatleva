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
  'Detectar problemas',
  'Sugerir melhorias',
  'Analisar métricas',
  'Otimizar UX',
  'Revisar processos',
  'Gerar ideias',
  'Priorizar tarefas',
];

export const defaultScopes = [
  'Propostas',
  'Biblioteca de mídia',
  'CRM',
  'Financeiro',
  'Vendas',
  'Sistema geral',
];

export const defaultRestrictions = [
  'Não executar automaticamente',
  'Apenas sugerir',
  'Não alterar dados sensíveis',
  'Requer aprovação',
];

export const sectorOptions = [
  'Vendas',
  'Operações',
  'Financeiro',
  'Marketing',
  'Produto',
  'Gestão',
];

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
    currentThought:
      'Estou avaliando as sugestões do Auditor e do Estrategista para definir a ordem de execução. Atualmente, a área de propostas apresenta maior potencial de ganho imediato.',
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
    currentThought:
      'Identifiquei que a taxa de reutilização de mídias entre propostas é baixa — apenas 22% das fotos são reaproveitadas. Isso indica oportunidade de criar pacotes de mídia por destino.',
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
    currentThought:
      'Percebo uma concentração de vendas em destinos europeus nos últimos 30 dias, porém a margem em destinos nacionais tem sido 18% maior. Recomendo reforçar propostas nacionais premium.',
  },
];

export const initialTasks: Task[] = [
  {
    id: 't1',
    title: 'Criar pacotes de mídia por destino',
    description:
      'Agrupar automaticamente fotos e vídeos já utilizados por destino para acelerar montagem de propostas.',
    sourceAgentId: 'auditor',
    status: 'suggested',
    priority: 'high',
    createdAt: '2026-03-17T09:15:00',
  },
  {
    id: 't2',
    title: 'Destacar destinos nacionais premium',
    description:
      'Margem em destinos nacionais está 18% acima da média. Sugerir esses destinos com mais destaque nas propostas.',
    sourceAgentId: 'estrategista',
    status: 'analyzing',
    priority: 'high',
    createdAt: '2026-03-17T08:40:00',
  },
  {
    id: 't3',
    title: 'Revisar follow-up de propostas abertas',
    description:
      '12 propostas estão sem resposta há mais de 5 dias. Recomendar recontato prioritário.',
    sourceAgentId: 'gerente',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-03-17T10:00:00',
  },
  {
    id: 't4',
    title: 'Padronizar descrições de quartos',
    description:
      'Detectadas inconsistências em nomes de quartos entre propostas diferentes para o mesmo hotel.',
    sourceAgentId: 'auditor',
    status: 'detected',
    priority: 'medium',
    createdAt: '2026-03-17T07:20:00',
  },
  {
    id: 't5',
    title: 'Sugerir upsell em viagens de lua de mel',
    description:
      'Padrão identificado: clientes de lua de mel aceitam 40% mais upgrades quando oferecidos na proposta.',
    sourceAgentId: 'estrategista',
    status: 'suggested',
    priority: 'low',
    createdAt: '2026-03-16T16:30:00',
  },
  {
    id: 't6',
    title: 'Alerta de fornecedor com prazo atrasado',
    description:
      'Fornecedor "Hotel Fasano" com 3 confirmações pendentes acima de 48h. Risco operacional.',
    sourceAgentId: 'auditor',
    status: 'suggested',
    priority: 'high',
    createdAt: '2026-03-17T11:00:00',
  },
  {
    id: 't7',
    title: 'Otimizar tempo médio de montagem de proposta',
    description:
      'Tempo médio atual: 42 min. Meta sugerida: 25 min com templates pré-prontos por perfil de cliente.',
    sourceAgentId: 'gerente',
    status: 'analyzing',
    priority: 'medium',
    createdAt: '2026-03-17T06:50:00',
  },
  {
    id: 't8',
    title: 'Mapear sazonalidade por destino',
    description: 'Cruzar dados de vendas dos últimos 12 meses para identificar picos de demanda por destino.',
    sourceAgentId: 'estrategista',
    status: 'in_progress',
    priority: 'medium',
    createdAt: '2026-03-15T14:00:00',
  },
  {
    id: 't9',
    title: 'Implementar alertas de margem negativa',
    description: 'Sistema de detecção automática quando uma venda está prestes a operar com margem abaixo de 5%.',
    sourceAgentId: 'auditor',
    status: 'in_progress',
    priority: 'high',
    createdAt: '2026-03-14T10:30:00',
  },
  {
    id: 't10',
    title: 'Criar templates de proposta por perfil',
    description: 'Templates diferenciados para lua de mel, família, corporativo e aventura — reduzindo tempo de montagem.',
    sourceAgentId: 'gerente',
    status: 'done',
    priority: 'high',
    createdAt: '2026-03-10T09:00:00',
  },
  {
    id: 't11',
    title: 'Análise de fornecedores mais rentáveis',
    description: 'Ranking de fornecedores por margem líquida e volume de vendas no último trimestre.',
    sourceAgentId: 'auditor',
    status: 'done',
    priority: 'medium',
    createdAt: '2026-03-08T11:20:00',
  },
  {
    id: 't12',
    title: 'Ajustar precificação Europa verão',
    description: 'Recalibrar markups para temporada alta europeia baseado em dados do ano anterior.',
    sourceAgentId: 'estrategista',
    status: 'done',
    priority: 'high',
    createdAt: '2026-03-05T15:00:00',
  },
];

export const simulatedResponses: Record<string, string[]> = {
  gerente: [
    'Atualmente estou priorizando tarefas que impactam diretamente a velocidade de fechamento de vendas.',
    'Baseado na análise do Auditor, recomendo focar primeiro nos pacotes de mídia — ganho rápido e alto impacto.',
    'O time está performando bem, mas vejo espaço para reduzir o tempo de montagem de propostas em 40%.',
  ],
  auditor: [
    'Identifiquei 3 padrões de inconsistência nos dados de hospedagem que podem ser corrigidos automaticamente.',
    'A biblioteca de mídia tem potencial subutilizado — apenas 22% das fotos são reaproveitadas entre propostas.',
    'Recomendo uma revisão nos fornecedores com SLA acima de 48h. Encontrei 2 casos críticos.',
  ],
  estrategista: [
    'Vejo uma tendência clara de crescimento em viagens nacionais premium. A margem é 18% superior.',
    'Clientes que recebem proposta com fotos de alta qualidade convertem 35% mais. Vale investir na curadoria.',
    'Para o próximo trimestre, sugiro focar em pacotes experienciais — é o que mais cresce no mercado.',
  ],
};
