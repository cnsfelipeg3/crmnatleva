export type AgentStatus = 'idle' | 'analyzing' | 'suggesting';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  sector: string;
  status: AgentStatus;
  lastAction: string;
  currentThought: string;
  skills: string[];
}

export type TaskStatus = 'detected' | 'analyzing' | 'suggested' | 'pending';
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

export const agents: Agent[] = [
  {
    id: 'gerente',
    name: 'Gerente',
    emoji: '👨‍💼',
    role: 'Coordena os demais agentes e prioriza tarefas estratégicas',
    sector: 'Gestão',
    status: 'analyzing',
    lastAction: 'Priorizou 3 melhorias para o módulo de propostas',
    currentThought:
      'Estou avaliando as sugestões do Auditor e do Estrategista para definir a ordem de execução. Atualmente, a área de propostas apresenta maior potencial de ganho imediato.',
    skills: ['Priorização', 'Delegação', 'Visão sistêmica'],
  },
  {
    id: 'auditor',
    name: 'Auditor',
    emoji: '🔍',
    role: 'Analisa processos, identifica gargalos e inconsistências',
    sector: 'Operações',
    status: 'suggesting',
    lastAction: 'Detectou oportunidade na biblioteca de mídia',
    currentThought:
      'Identifiquei que a taxa de reutilização de mídias entre propostas é baixa — apenas 22% das fotos são reaproveitadas. Isso indica oportunidade de criar pacotes de mídia por destino.',
    skills: ['Análise de dados', 'Detecção de padrões', 'Qualidade'],
  },
  {
    id: 'estrategista',
    name: 'Estrategista',
    emoji: '🧠',
    role: 'Sugere melhorias de longo prazo e identifica tendências',
    sector: 'Produto',
    status: 'analyzing',
    lastAction: 'Analisando padrões de vendas dos últimos 30 dias',
    currentThought:
      'Percebo uma concentração de vendas em destinos europeus nos últimos 30 dias, porém a margem em destinos nacionais tem sido 18% maior. Recomendo reforçar propostas nacionais premium.',
    skills: ['Tendências', 'Estratégia comercial', 'Inovação'],
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
