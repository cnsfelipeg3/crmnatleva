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

// ─── Destination cost tiers (per person baseline) ───

type DestinationTier = "economico" | "medio" | "premium" | "luxury";

const DESTINATION_TIER: Record<string, DestinationTier> = {
  "Buenos Aires": "economico",
  "Santiago": "economico",
  "Cancún": "medio",
  "Orlando": "medio",
  "Lisboa": "medio",
  "Barcelona": "medio",
  "Marrocos": "medio",
  "Turquia": "medio",
  "Cairo": "medio",
  "Croácia": "medio",
  "Paris": "premium",
  "Roma": "premium",
  "Londres": "premium",
  "Nova York": "premium",
  "Tóquio": "premium",
  "Dubai": "premium",
  "Grécia": "premium",
  "Tailândia": "premium",
  "Maldivas": "luxury",
  "Bali": "luxury",
};

// Minimum budget key by tier + whether group/family (2+ people)
const MIN_BUDGET_BY_TIER: Record<DestinationTier, { solo: string; group: string }> = {
  economico: { solo: "baixo", group: "baixo" },
  medio:     { solo: "baixo", group: "medio" },
  premium:   { solo: "medio", group: "alto" },
  luxury:    { solo: "alto",  group: "alto" },
};

const BUDGET_ORDER = ["baixo", "medio", "alto", "ilimitado", "nao_definido"];

function budgetAtLeast(min: string): Array<{ label: string; value: string }> {
  const allBudgets = [
    { label: "baixo (até R$5k)", value: "baixo" },
    { label: "médio (R$5k-15k)", value: "medio" },
    { label: "alto (R$15k-40k)", value: "alto" },
    { label: "ilimitado", value: "ilimitado" },
    { label: "não definido", value: "nao_definido" },
  ];
  const minIdx = BUDGET_ORDER.indexOf(min);
  return allBudgets.filter(b => {
    const idx = BUDGET_ORDER.indexOf(b.value);
    // "nao_definido" always allowed
    return b.value === "nao_definido" || idx >= minIdx;
  });
}

// ─── Motivation ↔ Composition coherence ───

const MOTIVATION_COMPOSITION: Record<string, string[]> = {
  "lua de mel": ["casal"],
  "aniversário de casamento": ["casal"],
  "viagem solo": ["solo"],
  "férias em família": ["família com filhos", "casal + filhos adolescentes"],
  "férias escolares": ["família com filhos", "casal + filhos adolescentes"],
  "despedida de solteira": ["grupo de amigos"],
  "evento especial": ["casal", "solo", "grupo de amigos"],
  "descanso": ["casal", "solo", "mãe e filha"],
  "aventura": ["solo", "casal", "grupo de amigos"],
  "formatura": ["grupo de amigos", "solo"],
  "comemoração de promoção": ["casal", "solo"],
  "primeira viagem internacional": ["casal", "solo", "família com filhos"],
  "presente de aniversário": ["casal", "solo", "mãe e filha"],
};

// ─── Experience ↔ Destination coherence ───

const BEGINNER_DESTINATIONS = [
  "Buenos Aires", "Santiago", "Cancún", "Orlando", "Lisboa",
];

const PERSONALIDADES = [
  "ansioso", "decidido", "detalhista", "desconfiado", "empolgado",
  "pechincheiro", "indeciso", "VIP", "sonhador", "pragmático",
  "apressado", "reservado", "impulsivo", "cauteloso",
];

const MOTIVACOES = [
  "lua de mel", "férias em família", "viagem solo", "evento especial",
  "aniversário de casamento", "descanso", "aventura", "formatura",
  "comemoração de promoção", "primeira viagem internacional",
  "despedida de solteira", "presente de aniversário", "férias escolares",
];

const COMPOSICOES = [
  { label: "solo", value: "1 pessoa, viajando sozinho(a)" },
  { label: "casal", value: "casal, 2 pessoas" },
  { label: "família com filhos", value: "família com filhos pequenos (2-3 crianças)" },
  { label: "grupo de amigos", value: "grupo de 4-6 amigos" },
  { label: "corporativo", value: "viagem corporativa, 3-5 executivos" },
  { label: "casal + filhos adolescentes", value: "casal com 2 filhos adolescentes" },
  { label: "mãe e filha", value: "mãe e filha viajando juntas" },
];

const OBJECOES = [
  "acha caro, quer desconto",
  "desconfia de agência online",
  "tem medo de voar",
  "indeciso entre 2 destinos",
  "parceiro(a) não está convencido(a)",
  "comparando com 3 concorrentes",
  "quer garantia de cancelamento",
  "preocupado com documentação e visto",
  "já teve experiência ruim com outra agência",
  "quer tudo incluso mas com orçamento limitado",
  "precisa convencer o cônjuge",
  "não sabe se consegue férias nesse período",
  "preocupado com segurança no destino",
];

const GATILHOS_IRRITACAO = [
  "respostas genéricas sem personalização",
  "perguntar algo que já foi respondido",
  "demora para responder",
  "tom muito formal/robótico",
  "muitas perguntas seguidas sem agregar valor",
  "ignorar perguntas feitas pelo lead",
  "usar clichês de vendas",
  "mandar texto muito longo tipo email",
  "não entender o que o cliente quer",
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

  // 1. Pick motivation first
  const motivacao = pick(MOTIVACOES);

  // 2. Derive composition coherently from motivation
  const allowedComps = MOTIVATION_COMPOSITION[motivacao];
  let comp;
  if (allowedComps) {
    comp = COMPOSICOES.find(c => c.label === pick(allowedComps)) || pick(COMPOSICOES);
  } else {
    // sem motivação mapeada → qualquer composição EXCETO corporativo
    const nonCorpComps = COMPOSICOES.filter(c => c.label !== "corporativo");
    comp = pick(nonCorpComps);
  }

  // 3. Determine experience
  const isGroup = !["solo", "casal", "mãe e filha"].includes(comp.label);
  let experiencia = pick(["nunca viajou internacional", "viajou 1-2 vezes", "viajante frequente", "viajante experiente"]);

  // 4. Pick destination coherent with experience
  let destino: string;
  if (experiencia === "nunca viajou internacional") {
    destino = pick(BEGINNER_DESTINATIONS);
  } else {
    destino = pick(DESTINOS);
  }

  // Also enforce: luxury/premium destinations require at least some experience
  const tier = DESTINATION_TIER[destino] || "medio";
  if ((tier === "luxury" || tier === "premium") && experiencia === "nunca viajou internacional") {
    experiencia = "viajou 1-2 vezes";
  }

  // 5. Pick budget coherent with destination + composition
  const minBudget = MIN_BUDGET_BY_TIER[tier][isGroup ? "group" : "solo"];
  const validBudgets = budgetAtLeast(minBudget);
  // Distribuição realista de mercado (não uniform):
  // medio: 50%, baixo: 20%, alto: 20%, ilimitado: 5%, nao_definido: 5%
  const BUDGET_WEIGHTS: Record<string, number> = {
    baixo: 20,
    medio: 50,
    alto: 20,
    ilimitado: 5,
    nao_definido: 5,
  };
  const weighted: { label: string; value: string }[] = [];
  for (const b of validBudgets) {
    const w = BUDGET_WEIGHTS[b.value] ?? 5;
    for (let i = 0; i < w; i++) weighted.push(b);
  }
  const orc = pick(weighted);

  return {
    nome,
    idade: randomAge(),
    profissao: pick(PROFISSOES),
    cidade: pick(CIDADES),
    destino,
    orcamento: orc.value,
    orcamentoLabel: orc.label,
    composicao: comp.label,
    composicaoLabel: comp.value,
    periodo: pick(["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]) + " " + (2026 + Math.floor(Math.random() * 2)),
    motivacao,
    personalidade: pickN(PERSONALIDADES, 2 + Math.floor(Math.random() * 2)),
    nivelDecisao: pick(["decidido", "indeciso", "pesquisando"]),
    objecoes: pickN(OBJECOES, 1 + Math.floor(Math.random() * 2)),
    estadoEmocional: pick(["animado", "ansioso", "neutro", "desconfiado", "empolgado"]),
    experiencia,
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
  {
    id: "detalhista-total",
    name: "O Detalhista Total",
    emoji: "📋",
    description: "Passa TODOS os detalhes da viagem gradualmente — teste de captura completa",
    promptOverride: `COMPORTAMENTO DETALHISTA TOTAL — REVELAÇÃO PROGRESSIVA ULTRA-REALISTA:

Voce é um cliente que SABE EXATAMENTE o que quer. Já pesquisou bastante e tem preferências bem definidas. Mas vc é uma pessoa normal no WhatsApp — NÃO despeja tudo de uma vez. Revele as informações AOS POUCOS, como uma conversa real fluiria.

═══ ROTEIRO DE REVELAÇÃO (siga esta ordem ao longo da conversa) ═══

MENSAGEM 1-2 (Abertura): Diga só o destino e que quer cotação. Algo como "oi, to querendo viajar pra [destino], vcs fazem pacote?" ou "uma amiga indicou vcs, quero ir pra [destino]".

MENSAGEM 3-4 (Composição): Quando perguntarem quem vai, diga a composição. Ex: "somos eu e minha esposa" ou "vou com 3 amigos". Se tiver crianças, mencione as idades.

MENSAGEM 5-6 (Datas): Revele o período. Ex: "a gnt ta pensando em ir em setembro, tipo dia 15 a 25 mais ou menos" ou "queria sair dia 10 de outubro e voltar dia 22".

MENSAGEM 7-8 (Orçamento): Quando tocarem no assunto, passe o range. Ex: "olha, a gnt tava pensando em gastar uns 15 a 20 mil por pessoa" ou "nosso limite é 25k pro casal".

MENSAGEM 9-10 (Voo - Preferências): Mencione preferências de voo NATURALMENTE. Ex: "ah e sobre o voo, a gnt prefere executiva, nao curto viagem longa na economica" ou "tem voo direto ou só com escala?". Mencione cia aérea se tiver preferência: "a gnt gosta muito da Emirates" ou "prefiro LATAM pq tenho milhas".

MENSAGEM 11-12 (Horários): Passe preferência de horário. Ex: "ah prefiro voo que sai de noite pra chegar de manhã" ou "nao quero voo que sai mto cedo tipo 5h da manha".

MENSAGEM 13-14 (Hotel): Dê detalhes do hotel. Ex: "hotel tem q ser 5 estrelas com café incluso" ou "queria um resort all inclusive com piscina". Mencione localização: "perto da praia" ou "centro da cidade".

MENSAGEM 15-16 (Extras): Mencione transfer, passeios, seguro. Ex: "vcs incluem transfer do aeroporto?" ou "queria contratar seguro viagem tb". Pergunte sobre experiências: "tem como incluir um jantar especial?" ou "quero fazer um passeio de barco".

MENSAGEM 17+ (Documentação/Fechamento): Pergunte sobre visto, documentação, forma de pagamento. Ex: "precisa de visto ne?" ou "da pra parcelar no cartao?". Se o agente for bom, demonstre intenção de fechar: "beleza, monta pra mim certinho q eu fecho".

═══ DETALHES QUE VOCÊ DEVE TER PRONTOS (use quando natural) ═══
- Cidade de saída: informe quando perguntarem (ex: "a gnt sai de São Paulo, Guarulhos")
- Aeroporto preferido: se tiver alternativas, mencione (ex: "tanto faz Guarulhos ou Congonhas")
- Passaporte: "sim, todos com passaporte em dia, vence só em 2029"
- Experiência anterior: "ja fui pra [destino similar] ano passado, foi otimo"
- Restrições alimentares: mencione se relevante (ex: "minha esposa é vegetariana")
- Datas flexíveis: "as datas tem uma flexibilidade de +/- 3 dias"
- Bagagem: "a gnt leva bastante mala, preciso de pelo menos 2 despachos"

═══ REGRAS IMPORTANTES ═══
- NÃO despeje tudo de uma vez. Máximo 2-3 informações novas por mensagem.
- Espere o agente perguntar ou o assunto surgir naturalmente.
- Se o agente NÃO perguntar algo importante (como datas ou orçamento), NÃO ofereça espontaneamente — espere.
- Reaja positivamente quando o agente fizer boas perguntas: "boa pergunta!" ou "ah é vdd, deixa eu te falar..."
- Se o agente pular etapas (ir direto pra preço sem perguntar datas), questione: "mas vc nem perguntou quando a gnt quer ir"`,
  },
];

// ─── System prompt builder for the Chameleon ───

export function buildChameleonSystemPrompt(profile: ChameleonProfile, challengeOverride?: string): string {
  // Determine typing style based on age/personality
  const isYoung = profile.idade < 35;
  const isProfessionalSenior = profile.idade >= 40 && /(médic|advogad|engenheir|empresári|executiv|gerente|jornalist|arquitet|psic[óo]log)/i.test(profile.profissao);
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
- ${
  isProfessionalSenior
    ? "Pontuação correta. Maiúsculas no início de frase. Pode usar abreviações comuns (vc, tb) mas com moderação. Mantém tom respeitoso."
    : isYoung
      ? "Sem pontuação formal. Minúsculas. Sem vírgulas perfeitas. Abreviações soltas."
      : "Pontuação básica mas não perfeita. Mistura abreviações (tb, vc) com palavras inteiras."
}
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

SAUDAÇÃO REALISTA (CRÍTICO):
- Você cumprimenta APENAS na 1ª mensagem da conversa. Daí em diante, NUNCA mais diga "boa tarde", "bom dia", "boa noite", "olá", "oi" no INÍCIO de uma mensagem.
- Cliente real só cumprimenta 1 vez e segue conversando. Repetir "Boa tarde, tudo bem?" a cada mensagem é comportamento de chatbot, não de humano.
- Se o agente perguntar "tudo bem?", você responde naturalmente ("tudo, e vc?" ou pula direto pro assunto), mas NÃO inicia sua mensagem com saudação de período.
- Exceção: se a conversa parou por horas e está sendo retomada no dia seguinte, pode cumprimentar de novo (mas isso não acontece dentro de 1 sessão de Camaleão).

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
    // novas variações sem saudação:
    `vcs fazem ${profile.destino}? to pesquisando`,
    `to querendo cotar uma viagem pra ${profile.destino}, conseguem ajudar?`,
    `pacote pra ${profile.destino}, vcs montam?`,
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
  agencyName?: string,
  agencyTone?: string,
  knowledgeBlock?: string,
): string {
  const agent = AGENTS_V4.find(a => a.id === agentId);
  if (!agent) return "";

  return buildUnifiedAgentPrompt({
    agent,
    globalRulesBlock,
    agencyName,
    agencyTone,
    knowledgeBlock,
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
