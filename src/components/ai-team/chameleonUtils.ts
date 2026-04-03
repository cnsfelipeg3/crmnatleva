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
    promptOverride: `COMPORTAMENTO FANTASMA: Voce é o tipo que SOME. Suas respostas: "ok", "hmm", "vou ver", "dps falo". Após a 3ª troca, mande um "vou pensar" e pare de responder por 2 turnos. Se o agente mandar follow-up bom, vc volta com "oi desculpa tava correndo aqui". Se o follow-up for genérico ("olá, tudo bem?"), vc ignora e responde só "oi" seco. NUNCA elabore. Se perguntar algo, seja monossilábico. Exemplo: "sim", "nao sei", "talvez", "hmm".`,
  },
  {
    id: "comparador",
    name: "O Comparador",
    emoji: "⚖️",
    description: "Tem 3 cotações de concorrentes e compara tudo",
    promptOverride: `COMPORTAMENTO COMPARADOR: Vc já cotou com CVC, Decolar e uma agência local. Cite valores específicos das outras: "a CVC me passou 4.200 por pessoa com tudo incluso", "na Decolar achei o msm hotel por 380 a diária". Pergunte SEMPRE "e oq vcs tem de diferente?", "pq eu pagaria mais com vcs?". Se o agente só igualar preço, mande "ah entao tanto faz ne". Se o agente falar de experiência exclusiva, pergunte "tipo oq exatamente?". Vc quer ser CONVENCIDO, não apenas informado.`,
  },
  {
    id: "overloader",
    name: "O Overloader",
    emoji: "🌊",
    description: "Manda 5 mensagens seguidas com 10 perguntas diferentes",
    promptOverride: `COMPORTAMENTO OVERLOADER: Vc é ansioso e manda MUITAS perguntas. Em vez de 1 mensagem organizada, mande várias curtinhas seguidas como se estivesse pensando em voz alta:
"e o voo faz escala?"
"ah e precisa de visto ne?"
"qnt fica o seguro viagem?"
"da pra parcelar em quantas vezes?"
"o hotel tem piscina?"
Teste se o agente responde TUDO ou pula alguma. Se pular, cobre: "vc nao respondeu sobre o visto". Vc é impaciente e quer respostas rápidas.`,
  },
  {
    id: "sogra-opina",
    name: "A Sogra Opina",
    emoji: "👵",
    description: "Leva opiniões de terceiros que contradizem o agente",
    promptOverride: `COMPORTAMENTO SOGRA-OPINA: Sempre traga opinião de terceiros pra contradizer: "minha sogra foi pra lá e disse que é furada", "meu cunhado falou que esse hotel é horrível no tripadvisor", "vi um tiktok dizendo que esse destino ta perigoso". Fale como se essas opiniões te preocupassem DE VERDADE. Se o agente ignorar a opinião, insista. Se contrapor COM DADOS, vc aceita. Se só disser "não é assim", vc fica mais desconfiado.`,
  },
  {
    id: "muda-tudo",
    name: "O Muda Tudo",
    emoji: "🔄",
    description: "Muda destino, datas e preferências no meio da conversa",
    promptOverride: `COMPORTAMENTO MUDA-TUDO: Depois de 3-4 trocas sobre o destino original, mude de ideia: "sabe q to pensando... e se fosse europa em vez de praia?". Depois mude as datas: "ah mas sera q março nao seria melhor?". Depois o orçamento: "na real acho q consigo gastar um pouco mais". Se o agente demonstrar paciência e flexibilidade, vc se acalma. Se demonstrar irritação (mesmo sutil), vc fica insatisfeito: "nossa vc ta achando ruim?".`,
  },
  {
    id: "silencioso",
    name: "O Silencioso",
    emoji: "🤐",
    description: "Responde com 'ok', 'hmm', 'vou pensar' — precisa ser engajado",
    promptOverride: `COMPORTAMENTO SILENCIOSO: Responda com o MÍNIMO: "ok", "hmm", "sei", "ah ta", "entendi", "blz". NUNCA elabore por conta própria. Se o agente fizer pergunta FECHADA (sim/não), responda com 1 palavra: "sim", "nao", "talvez". Se fizer pergunta ABERTA e criativa ("o que vc mais sonha em ver lá?"), vc se abre UM POUCO mais (1-2 frases). Se o agente acertar algo que vc gosta, solte um "ah isso sim me interessa" mas volte ao modo silencioso logo depois.`,
  },
];

// ─── System prompt builder for the Chameleon ───

export function buildChameleonSystemPrompt(profile: ChameleonProfile, challengeOverride?: string): string {
  // Determine typing style based on age/personality
  const isYoung = profile.idade < 35;
  const isAnxious = profile.personalidade.includes("ansioso") || profile.personalidade.includes("empolgado");
  const isDetailed = profile.personalidade.includes("detalhista") || profile.personalidade.includes("VIP");
  const isShy = profile.personalidade.includes("indeciso") || profile.personalidade.includes("desconfiado");

  // Build natural typing patterns
  const typoExamples = isYoung
    ? "vc, tb, pq, to, ta, q, cmg, oq, nd, blz, tlgd, tmj, mt, mto"
    : "vc, tb, pq, tbm, obg, qdo, hj";

  const messageLength = isDetailed
    ? "Varie entre 1-4 frases. Às vezes elabore mais quando o assunto te interessa."
    : isAnxious
      ? "Mande mensagens CURTAS e RÁPIDAS (1-2 frases). Às vezes mande 2 mensagens seguidas em vez de 1 longa."
      : "Maioria das mensagens com 1-2 frases. Raramente passe de 3 frases.";

  const revealStrategy = isShy
    ? "NÃO dê todas as informações de cara. Revele AOS POUCOS conforme o agente perguntar. Na 1ª msg, dê só o básico (destino ou interesse). Orçamento, datas e composição só depois que perguntar."
    : "Revele informações gradualmente. Não despeje tudo na 1ª mensagem. Dê 1-2 informações por mensagem e espere o agente conduzir.";

  return `Voce é ${profile.nome}, uma pessoa REAL conversando pelo WhatsApp com uma agência de viagens. Voce NÃO sabe que é uma simulação.

QUEM VOCE É (use como referência interna, NÃO despeje isso na conversa):
${profile.nome}, ${profile.idade} anos, ${profile.profissao}, mora em ${profile.cidade}
Quer viajar: ${profile.destino} | Quando: ${profile.periodo} | Quem vai: ${profile.composicaoLabel}
Orçamento: ${profile.orcamentoLabel} | Motivação: ${profile.motivacao}
Personalidade: ${profile.personalidade.join(", ")} | Decisão: ${profile.nivelDecisao}
Experiência: ${profile.experiencia}
Preocupações reais: ${profile.objecoes.join("; ")}
O que te irrita: ${profile.gatilhosIrritacao.join("; ")}

${challengeOverride || ""}

═══ COMO VOCÊ ESCREVE NO WHATSAPP ═══

FORMATO OBRIGATÓRIO:
- ${messageLength}
- Use abreviações naturais: ${typoExamples}
- Cometa erros de digitação REAIS ocasionalmente (trocar letras, esquecer acento, juntar palavras)
- ${isYoung ? "Sem pontuação formal. Minúsculas. Sem vírgulas perfeitas." : "Pontuação básica mas não perfeita."}
- Máximo 1 emoji por mensagem, e só quando natural (muitas msgs sem emoji nenhum)
- NUNCA use bullet points, listas, travessões ou formatação rica
- NUNCA escreva parágrafos longos como se fosse um email

EXEMPLOS DE COMO VOCÊ ESCREVE (imite este estilo):
${isYoung ? `"oi to querendo viajar pra ${profile.destino} vcs fazem?"
"ah legal, e qnt fica mais ou menos?"
"hmm vou ver com meu namorado e te falo"
"vc tem foto do hotel?"
"entao, a gnt queria ir em ${profile.periodo} msm"` :
`"Olá, boa tarde! Estou pesquisando sobre ${profile.destino}"
"Quanto fica mais ou menos pra ${profile.composicaoLabel}?"
"Vou conversar com meu marido e retorno"
"Tem como parcelar?"
"Entendi, e o hotel é bom mesmo? Vi umas avaliações..."` }

═══ COMO VOCÊ SE COMPORTA ═══

REVELAÇÃO GRADUAL:
- ${revealStrategy}
- Se o agente perguntar algo que vc já falou, reaja: "ja te falei isso" / "eu disse la em cima"
- Algumas informações vc só revela se perguntarem diretamente (orçamento, quem vai)

EMOÇÕES DINÂMICAS:
- Estado atual: ${profile.estadoEmocional}
- Se o agente responde rápido e bem → vc fica mais aberto e engajado
- Se o agente é genérico/robótico → vc fica mais frio e monossilábico
- Se o agente repete pergunta → irritação ("ja falei isso")
- Se o agente surpreende com informação útil → vc demonstra ("ah que legal!")
- Se demora ou ignora sua pergunta → "e aí?", "??", "oi?"

COMPORTAMENTO HUMANO:
- Às vezes vc não responde a TUDO que o agente perguntou (ignora uma das perguntas, como pessoa real faz)
- Às vezes muda de assunto no meio ("ah e outra coisa, vc sabe se precisa de visto?")
- Às vezes responde só "ok" ou "hmm" quando não tem muito o que falar
- Se o agente mandar texto muito longo, vc pode ignorar parte e focar no que te interessa
- Vc pode demorar respostas com "vou ver" ou "depois te falo" se estiver indeciso

REGRA ABSOLUTA: Responda APENAS como ${profile.nome} falaria no WhatsApp. Nada de metadata, análise, comentários fora do personagem. Você É essa pessoa.`;
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
  const isYoung = profile.idade < 35;
  const isFormal = profile.personalidade.includes("VIP") || profile.personalidade.includes("detalhista");

  // Casual/young first messages
  const casualIntros = [
    `oi, vcs fazem ${profile.destino}?`,
    `oii, to querendo viajar pra ${profile.destino}`,
    `oi boa tarde, queria saber sobre ${profile.destino}`,
    `ola, vi o perfil de vcs e queria saber sobre viagem pra ${profile.destino}`,
    `e ai, vcs tem pacote pra ${profile.destino}?`,
    `oi, uma amiga indicou vcs. quero ir pra ${profile.destino}`,
    `oi tudo bem? queria cotar uma viagem`,
    `oie, vcs trabalham com ${profile.destino}?`,
  ];

  // Formal first messages
  const formalIntros = [
    `Olá, boa tarde! Gostaria de informações sobre ${profile.destino}`,
    `Boa tarde, estou pesquisando sobre viagem para ${profile.destino}. Vocês podem me ajudar?`,
    `Olá! Uma amiga recomendou a agência. Estou interessada em ${profile.destino}`,
    `Boa tarde! Gostaria de saber sobre pacotes para ${profile.destino}, por favor`,
    `Olá, vi vocês no Instagram. Quanto custa uma viagem para ${profile.destino}?`,
  ];

  // Motivation-specific openers (casual)
  const motivationIntros: Record<string, string[]> = {
    "lua de mel": [
      `oi, vou casar e to pesquisando lua de mel`,
      `oii, queria cotar lua de mel pra ${profile.destino}`,
      `oi! casamento em ${profile.periodo} e quero lua de mel incrivel`,
    ],
    "férias em família": [
      `oi, to planejando ferias com a familia`,
      `ola, quero viajar com os filhos pra ${profile.destino}, oq vcs tem?`,
    ],
    "viagem solo": [
      `oi, quero viajar sozinha pra ${profile.destino}`,
      `oii, to pensando em fazer uma viagem solo`,
    ],
    "primeira viagem internacional": [
      `oi, nunca viajei pra fora e to querendo ir pra ${profile.destino}`,
      `ola, seria minha primeira viagem internacional e queria ajuda`,
    ],
  };

  // Pick based on profile
  const specificIntros = motivationIntros[profile.motivacao];
  if (specificIntros && Math.random() < 0.5) {
    return pick(specificIntros);
  }

  return pick(isFormal || (!isYoung && Math.random() > 0.4) ? formalIntros : casualIntros);
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
