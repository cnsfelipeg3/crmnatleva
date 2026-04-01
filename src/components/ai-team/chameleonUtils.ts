/**
 * Chameleon Agent — Lead Simulator AI
 * NatLeva v4.3
 * 
 * Utility functions for the Chameleon mode.
 * 100% isolated — does NOT modify any existing file.
 */

import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { buildUnifiedAgentPrompt } from "@/utils/buildAgentPrompt";

// ─── Types ───

export interface ChameleonProfile {
  nome: string;
  idade: number;
  profissao: string;
  cidade: string;
  destino: string;
  orcamento: string;
  orcamentoLabel: string;
  composicao: string;
  composicaoLabel: string;
  periodo: string;
  motivacao: string;
  personalidade: string[];
  nivelDecisao: string;
  objecoes: string[];
  estadoEmocional: string;
  experiencia: string;
  gatilhosIrritacao: string[];
}

export interface ChallengeProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  promptOverride: string;
}

export interface ChameleonMessage {
  role: "lead" | "agent";
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp: number;
  sentiment?: string;
}

export interface ChameleonDebriefData {
  scores: {
    escutaAtiva: number;
    memoria: number;
    naturalidade: number;
    valorAgregado: number;
    inteligenciaEmocional: number;
    eficiencia: number;
  };
  scoreGeral: number;
  momentosPositivos: Array<{ frase: string; motivo: string }>;
  errosCriticos: Array<{ frase: string; motivo: string }>;
  veredicto: string;
  sugestoes: Array<{ agente: string; sugestao: string }>;
}

// ─── Data pools for profile generation ───

const NOMES_MASCULINOS = [
  "Rafael", "Lucas", "Bruno", "Pedro", "Gustavo", "André", "Carlos", "Fernando",
  "Marcelo", "Thiago", "Leonardo", "Diego", "Rodrigo", "Felipe", "Henrique",
  "Matheus", "Daniel", "Vinícius", "Gabriel", "Eduardo",
];

const NOMES_FEMININOS = [
  "Ana", "Juliana", "Camila", "Isabela", "Fernanda", "Patricia", "Mariana",
  "Luciana", "Renata", "Tatiana", "Beatriz", "Carolina", "Larissa", "Amanda",
  "Bruna", "Letícia", "Vanessa", "Débora", "Natália", "Priscila",
];

const SOBRENOMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida",
  "Costa", "Pereira", "Carvalho", "Gomes", "Martins", "Araújo", "Melo",
  "Barbosa", "Ribeiro", "Cardoso", "Moreira", "Nascimento", "Lima",
];

const PROFISSOES = [
  "médica", "advogado", "engenheira", "empresário", "dentista", "professora",
  "arquiteto", "designer", "psicóloga", "gerente de marketing", "executivo",
  "farmacêutica", "nutricionista", "fisioterapeuta", "jornalista", "analista de TI",
  "vendedor", "influenciadora digital", "contador", "funcionária pública",
];

const CIDADES = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre",
  "Salvador", "Brasília", "Recife", "Florianópolis", "Goiânia", "Campinas",
  "Ribeirão Preto", "Santos", "Vitória", "Manaus", "Natal", "Fortaleza",
];

const DESTINOS = [
  "Maldivas", "Dubai", "Orlando", "Paris", "Roma", "Londres", "Tóquio",
  "Bali", "Cancún", "Grécia", "Tailândia", "Nova York", "Lisboa", "Barcelona",
  "Cairo", "Turquia", "Croácia", "Marrocos", "Santiago", "Buenos Aires",
];

const PERSONALIDADES = [
  "ansioso", "decidido", "detalhista", "desconfiado", "empolgado",
  "pechincheiro", "indeciso", "VIP", "sonhador", "pragmático",
];

const MOTIVACOES = [
  "lua de mel", "férias em família", "viagem solo", "evento especial",
  "aniversário de casamento", "descanso", "aventura", "formatura",
  "comemoração de promoção", "primeira viagem internacional",
];

const COMPOSICOES = [
  { label: "solo", value: "1 pessoa, viajando sozinho(a)" },
  { label: "casal", value: "casal, 2 pessoas" },
  { label: "família com filhos", value: "família com filhos pequenos (2-3 crianças)" },
  { label: "grupo de amigos", value: "grupo de 4-6 amigos" },
  { label: "corporativo", value: "viagem corporativa, 3-5 executivos" },
];

const OBJECOES = [
  "acha caro, quer desconto",
  "desconfia de agência online",
  "tem medo de voar",
  "indeciso entre 2 destinos",
  "parceiro(a) não está convencido(a)",
  "comparando com 3 concorrentes",
  "quer garantia de cancelamento",
  "preocupado com documentação",
  "já teve experiência ruim com outra agência",
  "quer tudo incluso mas com orçamento limitado",
];

const GATILHOS_IRRITACAO = [
  "respostas genéricas sem personalização",
  "perguntar algo que já foi respondido",
  "demora para responder",
  "tom muito formal/robótico",
  "muitas perguntas seguidas sem agregar valor",
  "ignorar perguntas feitas pelo lead",
  "usar clichês de vendas",
];

// ─── Profile generation ───

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomAge(): number {
  return Math.floor(Math.random() * 43) + 22; // 22-65
}

export function generateRandomProfile(): ChameleonProfile {
  const isFem = Math.random() > 0.5;
  const nome = `${pick(isFem ? NOMES_FEMININOS : NOMES_MASCULINOS)} ${pick(SOBRENOMES)}`;
  const comp = pick(COMPOSICOES);
  const orcamentos = [
    { label: "baixo (até R$5k)", value: "baixo" },
    { label: "médio (R$5k-15k)", value: "medio" },
    { label: "alto (R$15k-40k)", value: "alto" },
    { label: "ilimitado", value: "ilimitado" },
    { label: "não definido", value: "nao_definido" },
  ];
  const orc = pick(orcamentos);

  return {
    nome,
    idade: randomAge(),
    profissao: pick(PROFISSOES),
    cidade: pick(CIDADES),
    destino: pick(DESTINOS),
    orcamento: orc.value,
    orcamentoLabel: orc.label,
    composicao: comp.label,
    composicaoLabel: comp.value,
    periodo: pick(["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]) + " " + (2026 + Math.floor(Math.random() * 2)),
    motivacao: pick(MOTIVACOES),
    personalidade: pickN(PERSONALIDADES, 2 + Math.floor(Math.random() * 2)),
    nivelDecisao: pick(["decidido", "indeciso", "pesquisando"]),
    objecoes: pickN(OBJECOES, 1 + Math.floor(Math.random() * 2)),
    estadoEmocional: pick(["animado", "ansioso", "neutro", "desconfiado", "empolgado"]),
    experiencia: pick(["nunca viajou internacional", "viajou 1-2 vezes", "viajante frequente", "viajante experiente"]),
    gatilhosIrritacao: pickN(GATILHOS_IRRITACAO, 2),
  };
}

// ─── Challenge profiles ───

export const CHALLENGE_PROFILES: ChallengeProfile[] = [
  {
    id: "fantasma",
    name: "O Fantasma",
    emoji: "👻",
    description: "Responde com atraso, mensagens mínimas, some e volta",
    promptOverride: `Voce e o tipo de cliente que SOME. Suas respostas sao curtissimas: "ok", "hmm", "vou ver", "depois falo". As vezes demora minutos pra responder. Nao da muita abertura. O agente precisa te ENGAJAR ativamente. Se o agente for bom, voce gradualmente se abre. Se for generico, voce some de vez com um "vou pensar" final.`,
  },
  {
    id: "comparador",
    name: "O Comparador",
    emoji: "⚖️",
    description: "Tem 3 cotações de concorrentes e compara tudo",
    promptOverride: `Voce ja tem cotacoes de 3 outras agencias (CVC, Decolar e uma boutique local). Compara TUDO: preco, hotel, voo, servico. Cita valores das outras ("a CVC me cobrou X", "a Decolar tem esse hotel por Y"). Voce quer saber o DIFERENCIAL da NatLeva. Se o agente so igualar preco, voce perde interesse. Se agregar VALOR (experiencias exclusivas, atendimento personalizado), voce se interessa.`,
  },
  {
    id: "overloader",
    name: "O Overloader",
    emoji: "🌊",
    description: "Manda 5 mensagens seguidas com 10 perguntas diferentes",
    promptOverride: `Voce e ansioso e manda MUITAS perguntas de uma vez. Em vez de esperar resposta, dispara 3-5 mensagens seguidas com perguntas sobre tudo: preco, hotel, voo, documentacao, seguro, cancelamento, passeios, transfer, clima, gorjeta. Testa se o agente consegue organizar e responder tudo sem perder nada.`,
  },
  {
    id: "sogra-opina",
    name: "A Sogra Opina",
    emoji: "👵",
    description: "Leva opiniões de terceiros que contradizem o agente",
    promptOverride: `Voce sempre cita terceiros que CONTRADIZEM o agente: "minha sogra disse que Dubai em julho e insuportavel", "meu cunhado falou que esse hotel e ruim", "li num blog que esse voo atrasa sempre". Voce testa se o agente sabe contornar opinioes externas com argumentos solidos, sem desrespeitar as fontes do cliente.`,
  },
  {
    id: "muda-tudo",
    name: "O Muda Tudo",
    emoji: "🔄",
    description: "Muda destino, datas e preferências no meio da conversa",
    promptOverride: `Voce comeca querendo um destino mas no meio da conversa muda de ideia. "Sabe que, to pensando melhor, e se fosse Europa em vez de praia?". Depois muda as datas. Depois o orcamento. Testa a PACIENCIA e FLEXIBILIDADE do agente. Se o agente demonstra irritacao ou falta de paciencia, voce fica insatisfeito. Se lida bem, voce se decide.`,
  },
  {
    id: "silencioso",
    name: "O Silencioso",
    emoji: "🤐",
    description: "Responde com 'ok', 'hmm', 'vou pensar' — precisa ser engajado",
    promptOverride: `Voce responde com o MINIMO possivel: "ok", "hmm", "sei", "pode ser", "vou pensar", "entendi". NUNCA elabora. O agente precisa fazer perguntas ABERTAS e interessantes pra te tirar do casulo. Se o agente fizer pergunta fechada (sim/nao), voce responde com 1 palavra. Se fizer pergunta aberta criativa, voce se abre um pouco mais.`,
  },
];

// ─── System prompt builder for the Chameleon ───

export function buildChameleonSystemPrompt(profile: ChameleonProfile, challengeOverride?: string): string {
  return `Voce e um cliente real de agencia de viagens conversando pelo WhatsApp. Voce NAO e um robo, NAO e um teste, NAO e uma simulacao. Voce e uma PESSOA com desejos, medos, duvidas, humor e personalidade propria.

SEU PERFIL:
${profile.nome}: ${profile.idade} anos, ${profile.profissao}, ${profile.cidade}
Personalidade: ${profile.personalidade.join(", ")}
Motivacao da viagem: ${profile.motivacao}
Destino desejado: ${profile.destino}
Orcamento: ${profile.orcamentoLabel}
Quem vai: ${profile.composicaoLabel}
Periodo: ${profile.periodo}
Nivel de decisao: ${profile.nivelDecisao}
Objecoes provaveis: ${profile.objecoes.join("; ")}
Estado emocional inicial: ${profile.estadoEmocional}
Experiencia com viagens: ${profile.experiencia}
Gatilhos de irritacao: ${profile.gatilhosIrritacao.join("; ")}

${challengeOverride || ""}

COMO VOCE SE COMPORTA:
- Escreve como pessoa real no WhatsApp: abreviacoes, erros de digitacao ocasionais, mensagens as vezes curtas as vezes longas
- Tem MEMORIA: lembra tudo que ja foi dito na conversa. Se o agente repetir uma pergunta, voce reage ("ja te falei isso")
- Tem EMOCAO: seu humor muda baseado em como o agente te trata. Bom atendimento te deixa mais aberto, mau atendimento te deixa mais fechado
- Tem PACIENCIA LIMITADA: se o agente fizer muitas perguntas sem agregar valor, voce demonstra impaciencia
- Tem VIDA PROPRIA: as vezes manda msgs curtas, as vezes longas, as vezes muda de assunto
- Faz PERGUNTAS REAIS que um cliente faria: sobre precos, documentacao, seguranca, cancelamento, comparacao com concorrentes
- Testa os LIMITES: se o agente diz algo generico, voce pede mais detalhes. Se promete algo, voce pergunta "como assim?"
- NUNCA revela que e uma IA ou uma simulacao. Voce e ${profile.nome}, ponto final.

REGRAS:
- Responda APENAS como ${profile.nome}. Nada de metadata, scores, ou comentarios fora do personagem
- Nunca use travessao
- Maximo 1 emoji por mensagem, e so quando fizer sentido pro personagem
- Varie o tamanho das mensagens (as vezes 1 linha, as vezes um paragrafo)
- Se o agente perguntar algo que voce ja respondeu, reaja com leve irritacao
- Se o agente te surpreender positivamente, demonstre
- Responda em portugues brasileiro casual`;
}

// ─── Debrief prompt ───

export function buildDebriefPrompt(profile: ChameleonProfile, transcript: ChameleonMessage[]): string {
  const convoText = transcript.map(m => {
    if (m.role === "agent") return `Nath (agente${m.agentName ? ` - ${m.agentName}` : ""}): "${m.content}"`;
    return `${profile.nome} (lead): "${m.content}"`;
  }).join("\n");

  return `Voce acabou de simular o lead ${profile.nome} em uma conversa com agentes da NatLeva.
Agora saia do personagem e analise a conversa como um ESPECIALISTA em atendimento.

CONVERSA COMPLETA:
${convoText}

PERFIL DO LEAD:
- ${profile.nome}, ${profile.idade} anos, ${profile.profissao}
- Personalidade: ${profile.personalidade.join(", ")}
- Motivacao: ${profile.motivacao}
- Destino: ${profile.destino}
- Orcamento: ${profile.orcamentoLabel}

Avalie cada agente que participou em 6 dimensoes (nota 0-10):
1. ESCUTA ATIVA: Respondeu ao que o lead disse? Leu entre as linhas?
2. MEMORIA: Repetiu perguntas? Lembrou de informacoes anteriores?
3. NATURALIDADE: Pareceu humano ou robotico? Variou o tom?
4. VALOR AGREGADO: Deu informacoes uteis? Ou so fez perguntas?
5. INTELIGENCIA EMOCIONAL: Detectou o estado emocional? Adaptou o tom?
6. EFICIENCIA: Avancou o funil sem ser apressado? Equilibrou rapport e qualificacao?

Responda em JSON valido com esta estrutura exata:
{
  "scores": {
    "escutaAtiva": 0,
    "memoria": 0,
    "naturalidade": 0,
    "valorAgregado": 0,
    "inteligenciaEmocional": 0,
    "eficiencia": 0
  },
  "scoreGeral": 0,
  "momentosPositivos": [{"frase": "...", "motivo": "..."}],
  "errosCriticos": [{"frase": "...", "motivo": "..."}],
  "veredicto": "Se eu fosse cliente real, ...",
  "sugestoes": [{"agente": "...", "sugestao": "..."}]
}

IMPORTANTE: Responda APENAS o JSON, sem markdown, sem texto antes ou depois.`;
}

// ─── First message from the Chameleon ───

export function buildFirstChameleonMessage(profile: ChameleonProfile): string {
  const greetings = ["Oi", "Oii", "Ola", "E aí", "Bom dia", "Boa tarde"];
  const greeting = pick(greetings);
  
  // Build a natural first message based on profile
  const intros: string[] = [];

  if (profile.motivacao === "lua de mel") {
    intros.push(`${greeting}! To noiva e quero organizar a lua de mel, ${profile.destino} parece incrivel`);
    intros.push(`${greeting}, vou casar e queria saber sobre pacotes pra ${profile.destino}`);
  } else if (profile.motivacao.includes("família")) {
    intros.push(`${greeting}! Quero viajar com a familia pra ${profile.destino}, vcs fazem esse destino?`);
    intros.push(`${greeting}, to planejando ferias com os filhos e queria saber sobre ${profile.destino}`);
  } else if (profile.motivacao === "viagem solo") {
    intros.push(`${greeting}! To querendo viajar sozinha pra ${profile.destino}, vcs podem me ajudar?`);
    intros.push(`${greeting}, quero fazer uma viagem solo pra ${profile.destino}, como funciona?`);
  } else {
    intros.push(`${greeting}! Vi o insta de vcs e queria saber sobre viagens pra ${profile.destino}`);
    intros.push(`${greeting}, to querendo ir pra ${profile.destino} e queria uma cotacao`);
    intros.push(`${greeting}! Vcs fazem ${profile.destino}? Quero saber mais`);
  }

  return pick(intros);
}

// ─── Agent prompt building (reads existing pipeline, does NOT modify) ───

export function buildAgentPromptForChameleon(
  agentId: string,
  globalRulesBlock: string,
  dbAgentData?: { behavior_prompt?: string | null; persona?: string | null; skills?: string[] },
): string {
  const agent = AGENTS_V4.find(a => a.id === agentId);
  if (!agent) return "";

  return buildUnifiedAgentPrompt({
    agent,
    globalRulesBlock,
    dbOverride: dbAgentData ? {
      behavior_prompt: dbAgentData.behavior_prompt,
      persona: dbAgentData.persona,
      skills: dbAgentData.skills,
    } : undefined,
    enableTransfers: true,
    hasNextAgent: true,
  });
}

// ─── Sentiment detection from conversation flow ───

export function detectSentiment(messages: ChameleonMessage[]): string {
  if (messages.length === 0) return "😐";
  const lastLead = [...messages].reverse().find(m => m.role === "lead");
  if (!lastLead) return "😐";
  const t = lastLead.content.toLowerCase();
  
  if (/incrivel|maravilh|ador|perfeito|amei|show|top|sensacional/.test(t)) return "😍";
  if (/obrigad|legal|bom|boa|interessante|gostei/.test(t)) return "😊";
  if (/ja falei|ja disse|repet|irritad|cansa|demora/.test(t)) return "😤";
  if (/hmm|sei|vou pensar|talvez|nao sei/.test(t)) return "🤔";
  if (/caro|barato|desconto|concorren|outra agencia/.test(t)) return "💸";
  if (/medo|preocup|segur|garanti/.test(t)) return "😰";
  return "😐";
}

// ─── Available destinations for config ───
export const AVAILABLE_DESTINATIONS = DESTINOS;
export const AVAILABLE_PERSONALITIES = PERSONALIDADES;
export const AVAILABLE_COMPOSITIONS = COMPOSICOES.map(c => c.label);
export const BUDGET_OPTIONS = ["baixo", "médio", "alto", "ilimitado", "não definido"];
