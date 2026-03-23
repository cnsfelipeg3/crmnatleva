/**
 * Agent Engine v4 — pure simulation logic for 21 agents across 7 squads.
 * Every function is pure: receives state + time, returns new state.
 */

import type { Agent, Task, AgentStatus, TaskPriority } from "./mockData";
import {
  type AgentMemory,
  createEmptyMemory,
  addMemory,
  decayPreferences,
  computeRelevance,
  getPreferenceWeight,
  shouldUseMemoryThought,
} from "./agentMemory";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export interface AgentEvent {
  id: string;
  agentId: string;
  type: "insight" | "alert" | "action" | "status_change";
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high";
}

export interface EngineAgent extends Agent {
  nextTickAt: number;
  eventHistory: AgentEvent[];
  memory: AgentMemory;
}

export interface EngineState {
  agents: EngineAgent[];
  tasks: Task[];
  events: AgentEvent[];
  lastTaskCreatedAt: number;
  lastAlertAt: number;
  tickCount: number;
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const MAX_TASKS_PER_AGENT = 15;
const MAX_EVENTS_PER_AGENT = 20;
const MAX_GLOBAL_EVENTS = 120;
const MIN_TASK_INTERVAL_MS = 10_000;
const MIN_ALERT_INTERVAL_MS = 18_000;
const DECAY_EVERY_N_TICKS = 30;

const statusDuration: Record<AgentStatus, [number, number]> = {
  idle:       [5_000,  12_000],
  analyzing:  [7_000,  15_000],
  suggesting: [4_000,  10_000],
  waiting:    [8_000,  18_000],
  alert:      [3_000,  7_000],
};

type Weights = Record<string, number>;
type TransitionMap = Partial<Record<AgentStatus, Weights>>;

const defaultWeights: TransitionMap = {
  idle:       { analyzing: 0.6, idle: 0.4 },
  analyzing:  { suggesting: 0.5, alert: 0.15, idle: 0.2, analyzing: 0.15 },
  suggesting: { waiting: 0.5, idle: 0.5 },
  waiting:    { idle: 0.6, analyzing: 0.4 },
  alert:      { suggesting: 0.5, waiting: 0.5 },
};

/* Squad-specific weight overrides */
const transitionWeights: Record<string, TransitionMap> = {
  // Orquestração — high analyzing, frequent suggestions
  "nath-ai": {
    idle: { analyzing: 0.7, idle: 0.3 },
    analyzing: { suggesting: 0.5, waiting: 0.25, alert: 0.15, analyzing: 0.1 },
    suggesting: { waiting: 0.55, idle: 0.45 },
    waiting: { idle: 0.55, analyzing: 0.45 },
    alert: { suggesting: 0.6, waiting: 0.4 },
  },
  orion: {
    idle: { analyzing: 0.7, idle: 0.3 },
    analyzing: { suggesting: 0.45, alert: 0.2, idle: 0.15, analyzing: 0.2 },
    suggesting: { waiting: 0.5, idle: 0.5 },
    waiting: { idle: 0.6, analyzing: 0.4 },
    alert: { suggesting: 0.6, waiting: 0.4 },
  },
  // Closer — more alerts, pressure
  nero: {
    idle: { analyzing: 0.65, idle: 0.35 },
    analyzing: { suggesting: 0.4, alert: 0.25, idle: 0.15, analyzing: 0.2 },
    suggesting: { waiting: 0.45, idle: 0.55 },
    waiting: { idle: 0.55, analyzing: 0.45 },
    alert: { suggesting: 0.7, waiting: 0.3 },
  },
  // VIGIL — very alert-oriented
  vigil: {
    idle: { analyzing: 0.75, idle: 0.25 },
    analyzing: { alert: 0.35, suggesting: 0.35, analyzing: 0.15, idle: 0.15 },
    suggesting: { waiting: 0.5, idle: 0.5 },
    waiting: { idle: 0.6, analyzing: 0.4 },
    alert: { suggesting: 0.6, waiting: 0.4 },
  },
};

/* ═══════════════════════════════════════════
   Message banks — all 21 agents
   ═══════════════════════════════════════════ */

const thoughtBank: Record<string, Partial<Record<AgentStatus, string[]>>> = {
  // ═══ ORQUESTRAÇÃO ═══
  "nath-ai": {
    idle: ["Monitorando performance geral dos 6 squads.", "Revisando métricas consolidadas."],
    analyzing: ["Avaliando carga de trabalho entre squads...", "Redistribuindo prioridades...", "Cruzando KPIs do pipeline comercial..."],
    suggesting: ["Redistribuir 3 leads do ATLAS para o HABIBI.", "Escalar prioridade da proposta Dubai VIP.", "Rebalancear carga entre squads."],
    waiting: ["Aguardando aprovação para rebalanceamento.", "Esperando decisão sobre prioridades."],
    alert: ["Squad Comercial sobrecarregado — 3 agentes no limite.", "Pipeline desbalanceado entre destinos."],
  },
  orion: {
    idle: ["Monitorando fluxo do pipeline.", "Verificando handoffs entre agentes."],
    analyzing: ["Rastreando gargalos entre ATLAS→HABIBI...", "Verificando tempo médio por etapa...", "Otimizando roteamento de leads..."],
    suggesting: ["Handoff MAYA→ATLAS pode ser automático.", "Rota alternativa: leads Europa direto para DANTE.", "Sugestão: bypass qualificação para VIP."],
    waiting: ["Aguardando confirmação de rota.", "Esperando validação de handoff."],
    alert: ["Gargalo crítico: 5 leads parados entre ATLAS e LUNA.", "Handoff falhando entre squads."],
  },
  // ═══ SQUAD COMERCIAL ═══
  maya: {
    idle: ["Aguardando novos leads.", "Preparando mensagens de boas-vindas."],
    analyzing: ["Analisando perfil do novo lead...", "Classificando tipo de viajante...", "Verificando canal de origem do lead..."],
    suggesting: ["Lead premium detectado — direcionar para HABIBI.", "Família com crianças — roteiro NEMO.", "Lua de mel — acionar DANTE para Europa."],
    waiting: ["Aguardando resposta do lead.", "Esperando classificação completa."],
    alert: ["3 leads sem resposta há 2h — SLA em risco.", "Lead VIP aguardando primeiro contato."],
  },
  atlas: {
    idle: ["Aguardando leads para qualificação.", "Revisando critérios de scoring."],
    analyzing: ["Qualificando lead por orçamento e datas...", "Aplicando scoring por perfil...", "Mapeando preferências do viajante..."],
    suggesting: ["Lead score 85 — ready for specialist.", "Perfil família Orlando → NEMO.", "Budget premium → HABIBI para Dubai."],
    waiting: ["Aguardando dados adicionais do lead.", "Esperando confirmação de budget."],
    alert: ["5 leads sem qualificação há 48h.", "Scoring abaixo da média — revisar critérios."],
  },
  habibi: {
    idle: ["Monitorando destinos orientais.", "Atualizando experiências VIP Dubai."],
    analyzing: ["Montando roteiro Dubai personalizado...", "Verificando disponibilidade Maldivas...", "Cotando experiências premium no deserto..."],
    suggesting: ["Upgrade para suite no Atlantis disponível.", "Experiência exclusiva no deserto em oferta.", "Maldivas: villa overwater com 20% off."],
    waiting: ["Aguardando confirmação do hotel.", "Esperando retorno sobre experiência VIP."],
    alert: ["Hotel esgotado para datas solicitadas.", "Preço do voo Dubai subiu 30% — urgente."],
  },
  nemo: {
    idle: ["Monitorando parques Orlando.", "Verificando promoções Disney."],
    analyzing: ["Planejando roteiro de parques otimizado...", "Calculando melhor hotel por proximidade...", "Verificando ingressos com desconto..."],
    suggesting: ["Roteiro 7 dias com todos os parques top.", "Hotel com cozinha perto do Magic Kingdom.", "Combo ingresso + refeição economiza 15%."],
    waiting: ["Aguardando confirmação de hotel.", "Esperando decisão sobre parques."],
    alert: ["Ingressos Disney subindo amanhã — urgência.", "Hotel preferido lotado para as datas."],
  },
  dante: {
    idle: ["Monitorando destinos europeus.", "Atualizando roteiros culturais."],
    analyzing: ["Montando roteiro Itália + França...", "Verificando trens entre cidades...", "Cotando experiências gastronômicas..."],
    suggesting: ["Roteiro Toscana + Costa Amalfitana perfeito.", "Trem Roma→Florença com vista panorâmica.", "Tour gastronômico em Barcelona em promoção."],
    waiting: ["Aguardando confirmação de reservas.", "Esperando decisão sobre cidades."],
    alert: ["Voo para Roma cancelado — alternativas.", "Alta temporada Europa — preços subindo."],
  },
  luna: {
    idle: ["Preparando templates de propostas.", "Revisando elementos visuais."],
    analyzing: ["Montando proposta visual...", "Calculando precificação otimizada...", "Selecionando fotos de impacto..."],
    suggesting: ["Proposta com storytelling aumenta 40% conversão.", "Incluir mapa interativo do roteiro.", "Precificação em 3 tiers: Essential/Premium/VIP."],
    waiting: ["Aguardando aprovação da proposta.", "Esperando feedback visual do cliente."],
    alert: ["3 propostas sem envio há 24h.", "Template com erro de precificação."],
  },
  nero: {
    idle: ["Monitorando propostas abertas.", "Analisando objeções recentes."],
    analyzing: ["Probabilidade de fechamento por proposta...", "Analisando objeções mais comuns...", "Timing ideal para follow-up..."],
    suggesting: ["5 propostas com score >80% para follow-up.", "Oferta relâmpago para destravar indeciso.", "Objeção 'preço' — mostrar comparativo."],
    waiting: ["Aguardando retorno do cliente.", "Esperando decisão final."],
    alert: ["3 propostas perdendo timing AGORA.", "Cliente VIP pode fechar com concorrente."],
  },
  iris: {
    idle: ["Monitorando satisfação pós-viagem.", "Preparando NPS."],
    analyzing: ["Coletando feedback pós-viagem...", "Analisando padrão de recompra...", "Identificando embaixadores..."],
    suggesting: ["Enviar NPS para 8 clientes retornados.", "Cliente satisfeito → oferecer programa de indicação.", "Recompra: destino complementar para viajante."],
    waiting: ["Aguardando respostas NPS.", "Esperando feedback."],
    alert: ["NPS negativo detectado — ação imediata.", "Cliente reclamou no WhatsApp."],
  },
  // ═══ SQUAD ATENDIMENTO ═══
  athos: {
    idle: ["Monitorando chamados abertos.", "Verificando SLA de resposta."],
    analyzing: ["Classificando urgência dos chamados...", "Tempo de resposta por canal...", "Padrões de reclamação..."],
    suggesting: ["3 chamados podem ser resolvidos com FAQ.", "Escalar chamado do cliente VIP.", "Template de resposta para dúvida comum."],
    waiting: ["Aguardando resolução de chamado.", "Esperando retorno do fornecedor."],
    alert: ["SLA estourado: resposta acima de 6h.", "Chamado crítico sem atendimento."],
  },
  zara: {
    idle: ["Preparando experiências exclusivas.", "Monitorando reservas especiais."],
    analyzing: ["Organizando transfer VIP...", "Verificando disponibilidade de experiência...", "Cotando restaurante exclusivo..."],
    suggesting: ["Surpresa de aniversário no hotel — reservar.", "Transfer de luxo do aeroporto em promoção.", "Experiência sunset cruise disponível."],
    waiting: ["Aguardando confirmação do restaurante.", "Esperando disponibilidade."],
    alert: ["Reserva especial cancelada — alternativa urgente.", "Transfer não confirmado para amanhã."],
  },
  // ═══ SQUAD FINANCEIRO ═══
  finx: {
    idle: ["Monitorando pagamentos.", "Verificando vencimentos."],
    analyzing: ["Conciliando pagamentos recebidos...", "Verificando parcelas em atraso...", "Emitindo NFs pendentes..."],
    suggesting: ["5 parcelas vencem esta semana — enviar lembretes.", "Conciliação bancária com 3 divergências.", "NF pendente para 2 vendas fechadas."],
    waiting: ["Aguardando confirmação de pagamento.", "Esperando emissão de NF."],
    alert: ["R$ 15.000 em parcelas vencidas.", "Pagamento não identificado na conta."],
  },
  sage: {
    idle: ["Monitorando margens.", "Consolidando DRE."],
    analyzing: ["Analisando margem por destino...", "Projetando fluxo de caixa 30 dias...", "Comparando markup vs. mercado..."],
    suggesting: ["Markup Dubai pode subir 3% sem perder competitividade.", "Renegociar 2 fornecedores acima do benchmark.", "DRE mostra oportunidade em destinos nacionais."],
    waiting: ["Aguardando aprovação de markup.", "Esperando dados do fornecedor."],
    alert: ["Margem média caiu para 8% — abaixo da meta.", "Fluxo de caixa negativo projetado em 15 dias."],
  },
  // ═══ SQUAD OPERACIONAL ═══
  opex: {
    idle: ["Monitorando fluxos operacionais.", "Verificando automações."],
    analyzing: ["Mapeando gargalos no processo...", "Tempo por etapa do pipeline...", "Identificando etapas automatizáveis..."],
    suggesting: ["Automatizar briefing (-18min por proposta).", "3 etapas redundantes no fluxo.", "Integração Amadeus para cotação automática."],
    waiting: ["Aguardando aprovação de automação.", "Esperando deploy da integração."],
    alert: ["Gargalo: aprovação de fornecedor (18h média).", "Montagem de propostas subiu 25%."],
  },
  vigil: {
    idle: ["Monitorando compliance.", "Escaneando processos."],
    analyzing: ["Verificando mensagens contra regras fiscais...", "Auditando propostas recentes...", "Checando CADASTUR e documentação..."],
    suggesting: ["Padronizar disclaimers em propostas.", "Atualizar template de contrato.", "3 mensagens precisam de revisão fiscal."],
    waiting: ["Aguardando validação jurídica.", "Esperando atualização de regras."],
    alert: ["Menção a câmbio paralelo detectada.", "Proposta sem disclaimer obrigatório.", "CADASTUR vencendo em 15 dias."],
  },
  sentinel: {
    idle: ["Monitorando concorrência.", "Rastreando tendências."],
    analyzing: ["Comparando preços com concorrentes...", "Analisando tendências do mercado...", "Benchmarking de serviços..."],
    suggesting: ["Concorrente lançou pacote Maldivas 10% mais barato.", "Tendência: viagens de experiência crescendo 45%.", "Oportunidade: destinos nacionais premium."],
    waiting: ["Aguardando dados de mercado.", "Esperando análise comparativa."],
    alert: ["Concorrente ganhou 3 clientes nossos este mês.", "Gap de preço significativo detectado."],
  },
  // ═══ SQUAD GERAÇÃO DE DEMANDA ═══
  spark: {
    idle: ["Planejando conteúdo.", "Analisando engajamento."],
    analyzing: ["Melhores horários de publicação...", "Conteúdo com maior engajamento...", "Temas trending para travel..."],
    suggesting: ["Post sobre Maldivas pode gerar 50+ leads.", "Reels de Dubai performam 3x melhor.", "Newsletter semanal com destinos trending."],
    waiting: ["Aguardando aprovação de conteúdo.", "Esperando arte do designer."],
    alert: ["Engajamento caiu 30% esta semana.", "Nenhum post publicado há 3 dias."],
  },
  hunter: {
    idle: ["Buscando oportunidades.", "Monitorando canais."],
    analyzing: ["Prospectando leads qualificados...", "Analisando parcerias potenciais...", "Cold outreach performance..."],
    suggesting: ["340 leads inativos com potencial de reativação.", "Parceria com influencer de viagem.", "LinkedIn: 5 leads corporativos identificados."],
    waiting: ["Aguardando retorno de prospecção.", "Esperando resposta de parceria."],
    alert: ["Pipeline de leads caiu 20%.", "Meta de captação em risco."],
  },
  // ═══ SQUAD RETENÇÃO ═══
  aegis: {
    idle: ["Monitorando sinais de churn.", "Analisando inatividade."],
    analyzing: ["Detectando padrões de churn...", "Classificando clientes em risco...", "Preparando campanhas win-back..."],
    suggesting: ["12 clientes com risco alto de churn.", "Campanha win-back com desconto exclusivo.", "Oferta de aniversário para clientes inativos."],
    waiting: ["Aguardando resposta da campanha.", "Esperando análise de churn."],
    alert: ["Cliente VIP não compra há 6 meses.", "Taxa de churn subiu 5% este mês."],
  },
  nurture: {
    idle: ["Monitorando régua de relacionamento.", "Verificando sequências."],
    analyzing: ["Segmentando leads por temperatura...", "Performance das sequências de email...", "Leads prontos para handoff comercial..."],
    suggesting: ["45 leads quentes prontos para comercial.", "Sequência 'Destinos de Inverno' com 35% open rate.", "Reativar leads que abriram email 3x sem clicar."],
    waiting: ["Aguardando envio de sequência.", "Esperando resultado de segmentação."],
    alert: ["Sequência de emails com bounce alto.", "Leads esfriando — nutrir urgente."],
  },
};

const memoryThoughts: Record<string, string[]> = {
  "nath-ai": ["Ajustei prioridades com base nas suas decisões.", "Reforçando padrão de delegação que você aprova."],
  orion: ["Roteamento ajustado por suas aprovações.", "Handoffs otimizados com base no seu feedback."],
  maya: ["Boas-vindas alinhadas ao tom que você prefere.", "Classificação de leads ajustada."],
  atlas: ["Scoring calibrado por suas decisões.", "Qualificação ajustada ao seu padrão."],
  habibi: ["Experiências orientais alinhadas ao seu gosto.", "Propostas Dubai ajustadas."],
  nemo: ["Roteiros Orlando otimizados por suas decisões.", "Parques priorizados conforme seu padrão."],
  dante: ["Roteiros Europa refinados por feedback.", "Experiências culturais ajustadas."],
  luna: ["Propostas visuais no estilo que você aprova.", "Precificação calibrada."],
  nero: ["Técnica de fechamento ajustada ao seu estilo.", "Follow-up calibrado por suas decisões."],
  iris: ["Pós-venda alinhado ao seu padrão de qualidade.", "NPS ajustado por feedback."],
  athos: ["SLA ajustado por suas prioridades.", "Resolução de chamados otimizada."],
  zara: ["Experiências concierge alinhadas ao seu gosto.", "Reservas especiais priorizadas."],
  finx: ["Conciliação ajustada por suas regras.", "Alertas financeiros calibrados."],
  sage: ["Margens monitoradas conforme seus critérios.", "DRE ajustado por suas aprovações."],
  opex: ["Automações priorizadas por suas decisões.", "Fluxos otimizados por feedback."],
  vigil: ["Regras de compliance ajustadas.", "Auditorias focadas nas suas prioridades."],
  sentinel: ["Benchmarking ajustado por seus interesses.", "Monitoramento de concorrência refinado."],
  spark: ["Conteúdo alinhado ao tom que você aprova.", "Estratégia de posts calibrada."],
  hunter: ["Prospecção focada nos canais que você prefere.", "Cold outreach ajustado."],
  aegis: ["Retenção priorizada por suas decisões.", "Win-back calibrado."],
  nurture: ["Régua de relacionamento ajustada.", "Segmentação refinada por feedback."],
};

const taskTemplates: Record<string, Array<{ title: string; description: string; priority: TaskPriority; context: string }>> = {
  "nath-ai": [
    { title: "Rebalancear carga entre squads", description: "Squad Comercial sobrecarregado vs. Retenção ociosa.", priority: "high", context: "gestão" },
    { title: "Relatório semanal de performance", description: "Consolidar KPIs de todos os 6 squads.", priority: "medium", context: "relatório" },
    { title: "Revisar prioridades do pipeline", description: "Realinhar com metas do mês.", priority: "medium", context: "estratégia" },
  ],
  orion: [
    { title: "Otimizar roteamento de leads", description: "Leads parados entre etapas > 24h.", priority: "high", context: "pipeline" },
    { title: "Automatizar handoff MAYA→ATLAS", description: "Transição manual consome 8min.", priority: "medium", context: "automação" },
    { title: "Mapear gargalos do pipeline", description: "Identificar etapas com maior tempo.", priority: "low", context: "pipeline" },
  ],
  maya: [
    { title: "Responder 3 leads sem contato", description: "Leads aguardando primeiro contato há 2h.", priority: "high", context: "boas-vindas" },
    { title: "Atualizar mensagem de boas-vindas", description: "A/B test com novo tom.", priority: "low", context: "boas-vindas" },
    { title: "Classificar leads do Instagram", description: "12 leads sem classificação.", priority: "medium", context: "qualificação" },
  ],
  atlas: [
    { title: "Qualificar 5 leads pendentes", description: "Leads sem qualificação há 48h.", priority: "high", context: "qualificação" },
    { title: "Calibrar modelo de scoring", description: "Precisão caiu 5% este mês.", priority: "medium", context: "scoring" },
    { title: "Perfil detalhado para lead VIP", description: "Budget alto detectado.", priority: "high", context: "qualificação" },
  ],
  habibi: [
    { title: "Montar roteiro Dubai VIP", description: "Cliente premium aguardando.", priority: "high", context: "proposta" },
    { title: "Atualizar preços Maldivas", description: "Tarifas mudaram esta semana.", priority: "medium", context: "pricing" },
    { title: "Experiência deserto exclusiva", description: "Novo parceiro disponível.", priority: "low", context: "experiência" },
  ],
  nemo: [
    { title: "Roteiro Orlando 7 dias", description: "Família com 2 crianças.", priority: "high", context: "proposta" },
    { title: "Atualizar preços parques", description: "Disney subiu ingressos.", priority: "medium", context: "pricing" },
    { title: "Combo hotel + ingressos", description: "Negociar pacote econômico.", priority: "medium", context: "proposta" },
  ],
  dante: [
    { title: "Roteiro Itália 12 dias", description: "Casal lua de mel premium.", priority: "high", context: "proposta" },
    { title: "Verificar trens europeus", description: "Greve na França afeta rotas.", priority: "medium", context: "operacional" },
    { title: "Tour gastronômico Barcelona", description: "Parceiro com disponibilidade.", priority: "low", context: "experiência" },
  ],
  luna: [
    { title: "Montar proposta visual Dubai", description: "Lead VIP aguardando 24h.", priority: "high", context: "proposta" },
    { title: "Criar template destinos nacionais", description: "Faltam templates para Brasil.", priority: "medium", context: "template" },
    { title: "Incluir mapa interativo", description: "Aumenta conversão em 25%.", priority: "low", context: "proposta" },
  ],
  nero: [
    { title: "Follow-up 5 propostas abertas", description: "Score >80% sem resposta.", priority: "high", context: "fechamento" },
    { title: "Preparar contra-objeção de preço", description: "3 clientes acharam caro.", priority: "high", context: "objeção" },
    { title: "Oferta relâmpago para indecisos", description: "2 leads em cima do muro.", priority: "medium", context: "fechamento" },
  ],
  iris: [
    { title: "Enviar NPS pós-viagem", description: "8 clientes retornaram esta semana.", priority: "medium", context: "pós-venda" },
    { title: "Programa de indicação", description: "3 clientes satisfeitos podem indicar.", priority: "low", context: "fidelização" },
    { title: "Follow-up cliente insatisfeito", description: "NPS 6 detectado.", priority: "high", context: "pós-venda" },
  ],
  athos: [
    { title: "Resolver 3 chamados pendentes", description: "SLA perto do limite.", priority: "high", context: "suporte" },
    { title: "Criar FAQ para dúvidas comuns", description: "Reduzir 30% dos chamados.", priority: "medium", context: "suporte" },
    { title: "Escalar chamado VIP", description: "Cliente premium insatisfeito.", priority: "high", context: "suporte" },
  ],
  zara: [
    { title: "Organizar transfer VIP", description: "Cliente chega amanhã.", priority: "high", context: "concierge" },
    { title: "Reservar restaurante exclusivo", description: "Aniversário do cliente.", priority: "medium", context: "experiência" },
    { title: "Surprise & delight", description: "Preparar surpresa no hotel.", priority: "low", context: "concierge" },
  ],
  finx: [
    { title: "Enviar lembretes de parcelas", description: "5 vencem esta semana.", priority: "high", context: "cobrança" },
    { title: "Conciliação bancária", description: "3 divergências encontradas.", priority: "medium", context: "financeiro" },
    { title: "Emitir NFs pendentes", description: "2 vendas sem NF.", priority: "medium", context: "fiscal" },
  ],
  sage: [
    { title: "Revisar markups <8%", description: "3 destinos com margem baixa.", priority: "high", context: "margem" },
    { title: "Projeção de fluxo de caixa", description: "Próximos 30 dias.", priority: "medium", context: "financeiro" },
    { title: "Renegociar fornecedor caro", description: "Acima do benchmark 15%.", priority: "medium", context: "fornecedor" },
  ],
  opex: [
    { title: "Automatizar briefing", description: "18min por proposta — automatizável.", priority: "medium", context: "automação" },
    { title: "Eliminar 3 etapas redundantes", description: "Processo duplicado.", priority: "high", context: "processo" },
    { title: "Benchmark tempo por etapa", description: "Comparar com meta.", priority: "low", context: "processo" },
  ],
  vigil: [
    { title: "Auditoria de compliance", description: "20 mensagens para revisar.", priority: "high", context: "compliance" },
    { title: "Atualizar disclaimers", description: "Nova regra fiscal.", priority: "medium", context: "fiscal" },
    { title: "Verificar CADASTUR", description: "Vencimento próximo.", priority: "high", context: "regulatório" },
  ],
  sentinel: [
    { title: "Relatório de concorrência", description: "3 concorrentes monitorados.", priority: "medium", context: "inteligência" },
    { title: "Alerta de preço concorrente", description: "Maldivas 10% mais barato.", priority: "high", context: "pricing" },
    { title: "Tendências do mercado", description: "Viagens de experiência em alta.", priority: "low", context: "tendências" },
  ],
  spark: [
    { title: "Criar 3 posts para Instagram", description: "Destinos trending.", priority: "medium", context: "conteúdo" },
    { title: "Newsletter semanal", description: "Curadoria de destinos.", priority: "low", context: "conteúdo" },
    { title: "Reels Dubai", description: "Performance 3x maior.", priority: "medium", context: "conteúdo" },
  ],
  hunter: [
    { title: "Reativar 340 leads inativos", description: "Leads premium dormentes.", priority: "high", context: "prospecção" },
    { title: "Prospecção LinkedIn", description: "5 leads corporativos.", priority: "medium", context: "prospecção" },
    { title: "Parceria com influencer", description: "Audiência de 500k.", priority: "low", context: "parceria" },
  ],
  aegis: [
    { title: "Campanha anti-churn", description: "12 clientes em risco.", priority: "high", context: "retenção" },
    { title: "Win-back VIP", description: "Cliente premium inativo 6 meses.", priority: "high", context: "retenção" },
    { title: "Desconto de aniversário", description: "Oferta personalizada.", priority: "medium", context: "retenção" },
  ],
  nurture: [
    { title: "Handoff 45 leads quentes", description: "Prontos para comercial.", priority: "high", context: "nurturing" },
    { title: "Sequência destinos de inverno", description: "35% open rate.", priority: "medium", context: "email" },
    { title: "Reaquecimento de leads frios", description: "Abriram 3x sem clicar.", priority: "medium", context: "nurturing" },
  ],
};

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

let _idCounter = 100;
function uid(): string { return `gen_${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`; }

function pickWeighted(weights: Record<string, number>, seed: number): AgentStatus {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + (w as number), 0);
  let r = (Math.abs(seed) % 1000) / 1000 * total;
  for (const [key, w] of entries) {
    r -= w as number;
    if (r <= 0) return key as AgentStatus;
  }
  return entries[entries.length - 1][0] as AgentStatus;
}

function randRange(min: number, max: number, seed: number): number {
  const t = (seed % 10000) / 10000;
  const jitter = 0.7 + t * 0.6;
  return Math.round((min + (max - min) * t) * jitter);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function getThought(agent: EngineAgent, status: AgentStatus, seed: number): string {
  if (
    (status === "suggesting" || status === "analyzing") &&
    shouldUseMemoryThought(agent.memory) &&
    seed % 5 === 0
  ) {
    const mThoughts = memoryThoughts[agent.id];
    if (mThoughts?.length) return pickRandom(mThoughts, seed + 99);
  }
  const bank = thoughtBank[agent.id]?.[status] ?? [`Operando em modo ${status}.`];
  return pickRandom(bank, seed);
}

function getActionLabel(status: AgentStatus): string {
  switch (status) {
    case "idle": return "Entrou em modo de espera";
    case "analyzing": return "Iniciou nova análise";
    case "suggesting": return "Gerou nova recomendação";
    case "waiting": return "Aguardando decisão";
    case "alert": return "Emitiu alerta";
    default: return "Atualizou status";
  }
}

/* ═══════════════════════════════════════════
   Init
   ═══════════════════════════════════════════ */

export function createInitialState(baseAgents: Agent[], baseTasks: Task[], now: number): EngineState {
  const agents: EngineAgent[] = baseAgents.map((a, i) => ({
    ...a,
    nextTickAt: now + randRange(3_000, 10_000, i * 137),
    eventHistory: [],
    memory: createEmptyMemory(),
  }));

  return {
    agents,
    tasks: [...baseTasks],
    events: [],
    lastTaskCreatedAt: now - MIN_TASK_INTERVAL_MS,
    lastAlertAt: now - MIN_ALERT_INTERVAL_MS,
    tickCount: 0,
  };
}

/* ═══════════════════════════════════════════
   TICK — allow up to 3 transitions per tick for 21 agents
   ═══════════════════════════════════════════ */

const MAX_TRANSITIONS_PER_TICK = 3;

export function tick(state: EngineState, now: number): EngineState {
  let { agents, tasks, events, lastTaskCreatedAt, lastAlertAt, tickCount } = state;
  let changed = false;
  let transitionsThisTick = 0;

  const seed = now ^ (tickCount * 7919);
  const shouldDecay = tickCount > 0 && tickCount % DECAY_EVERY_N_TICKS === 0;

  const newAgents = agents.map((agent, idx) => {
    let currentAgent = agent;

    if (shouldDecay) {
      currentAgent = { ...currentAgent, memory: decayPreferences(currentAgent.memory) };
      changed = true;
    }

    if (now < currentAgent.nextTickAt) return currentAgent;
    if (transitionsThisTick >= MAX_TRANSITIONS_PER_TICK) return currentAgent;

    const agentSeed = seed ^ (idx * 3571);
    const weights = transitionWeights[currentAgent.id]?.[currentAgent.status] ?? defaultWeights[currentAgent.status] ?? { idle: 1 };

    let filteredWeights = { ...weights };
    if (now - lastAlertAt < MIN_ALERT_INTERVAL_MS && "alert" in filteredWeights) {
      const alertW = (filteredWeights as Record<string, number>)["alert"] ?? 0;
      delete (filteredWeights as Record<string, number>)["alert"];
      const keys = Object.keys(filteredWeights);
      if (keys.length > 0) {
        const share = alertW / keys.length;
        keys.forEach(k => { (filteredWeights as Record<string, number>)[k] += share; });
      }
    }

    const nextStatus = pickWeighted(filteredWeights as Record<string, number>, agentSeed);
    const [minDur, maxDur] = statusDuration[nextStatus] ?? [10_000, 15_000];
    const duration = randRange(minDur, maxDur, agentSeed + 1);

    const thought = getThought(currentAgent, nextStatus, agentSeed + 2);
    const actionLabel = getActionLabel(nextStatus);

    const evt: AgentEvent = {
      id: uid(),
      agentId: currentAgent.id,
      type: nextStatus === "alert" ? "alert" : nextStatus === "suggesting" ? "insight" : "status_change",
      message: thought,
      timestamp: now,
      severity: nextStatus === "alert" ? "high" : nextStatus === "suggesting" ? "medium" : "low",
    };

    events = [evt, ...events].slice(0, MAX_GLOBAL_EVENTS);

    let agentMemory = addMemory(currentAgent.memory, {
      type: nextStatus === "alert" ? "alert" : "interaction",
      content: thought,
      timestamp: now,
      relevanceScore: computeRelevance({ type: nextStatus === "alert" ? "alert" : "interaction" }),
      agentId: currentAgent.id,
      context: nextStatus === "alert" ? "alerta" : nextStatus,
    });

    if ((nextStatus === "suggesting" || nextStatus === "alert") && now - lastTaskCreatedAt >= MIN_TASK_INTERVAL_MS) {
      const templates = taskTemplates[currentAgent.id];
      if (templates && Math.abs(agentSeed) % 100 < (nextStatus === "suggesting" ? 55 : 75)) {
        const filtered = templates.filter(tmpl => getPreferenceWeight(agentMemory, tmpl.context) > -0.5);
        const pool = filtered.length > 0 ? filtered : templates;
        const tmpl = pickRandom(pool, agentSeed + 3);
        const agentTaskCount = tasks.filter(t => t.sourceAgentId === currentAgent.id).length;
        if (agentTaskCount < MAX_TASKS_PER_AGENT) {
          const newTask: Task = {
            id: uid(),
            title: tmpl.title,
            description: tmpl.description,
            sourceAgentId: currentAgent.id,
            status: "suggested",
            priority: tmpl.priority,
            createdAt: new Date(now).toISOString(),
          };
          tasks = [newTask, ...tasks];
          lastTaskCreatedAt = now;
        }
      }
    }

    if (nextStatus === "alert") lastAlertAt = now;

    transitionsThisTick++;
    changed = true;

    const newHistory = [evt, ...currentAgent.eventHistory].slice(0, MAX_EVENTS_PER_AGENT);

    return {
      ...currentAgent,
      status: nextStatus,
      currentThought: thought,
      lastAction: actionLabel,
      nextTickAt: now + duration,
      eventHistory: newHistory,
      memory: agentMemory,
    };
  });

  if (!changed) return state;

  return {
    agents: newAgents,
    tasks,
    events,
    lastTaskCreatedAt,
    lastAlertAt,
    tickCount: tickCount + 1,
  };
}
