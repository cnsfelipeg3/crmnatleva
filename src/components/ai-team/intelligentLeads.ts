// NatLeva — Sistema de Leads Fictícios Inteligentes
// Baseado na especificação completa: psicologia profunda, IA dinâmica, objeções contextuais

export interface PerfilPsicologico {
  tipo: string;
  label: string;
  emoji: string;
  cor: string;
  chance: number; // 0-100 chance de aparecer
  descricaoPsicologica: string;
  estiloEscrita: string;
  maneirismos: string;
  gatilhosCompra: string[];
  medosPrincipais: string[];
  velocidadeResposta: { min: number; max: number }; // ms
  tendenciaMultiMsg: number; // 0-1
  probabilidadeObjecao: { qualificacao: number; proposta: number; fechamento: number };
  reacaoRespostaGenerica: string;
  reacaoRespostaBoa: string;
  convRate: number;
}

export interface LeadInteligente {
  id: string;
  nome: string;
  destino: string;
  perfil: PerfilPsicologico;
  origem: string;
  orcamento: string;
  pax: number;
  paxLabel: string;
  ticket: number;
  resultadoFinal: "fechou" | "perdeu" | null;
  etapaPerda: string | null;
  motivoPerda: string | null;
  mensagens: MensagemLead[];
  status: "ativo" | "fechou" | "perdeu";
  // Novos campos
  ocasiao: string;
  estadoEmocional: string;
  sentimentoScore: number; // 0-100
  informacoesReveladas: string[];
  informacoesPendentes: string[];
  temObjecao: boolean;
  objecoesPendentes: string[];
  objecoesLancadas: string[];
  avaliacaoUltimaResposta: number; // 0-100
  pacienciaRestante: number; // 0-100
  delayEntreMensagens: number;
  probabilidadeMultiMensagem: number;
  // Stage tracking
  etapaAtual: string;
  agentIdxAtual: number;
  // 3 Dimensões (avaliação ao vivo)
  scoreHumanizacao: number;
  scoreEficacia: number;
  scoreTecnica: number;
}

export interface MensagemLead {
  role: "client" | "agent";
  content: string;
  agentName?: string;
  timestamp: number;
  imageUrl?: string;
}

// ═══ OS 8 PERFIS PSICOLÓGICOS COMPLETOS ═══

export const PERFIS_INTELIGENTES: PerfilPsicologico[] = [
  {
    tipo: "ansioso", label: "Ansioso", emoji: "⚡", cor: "#EF4444", chance: 12, convRate: 75,
    descricaoPsicologica: "Toma decisões por impulso. Tem medo de perder oportunidade. Urgência real — compromisso com prazo próximo. Pensa em voz alta e rápido. Manda várias mensagens curtas seguidas. Confirma informações repetidamente. Agradece excessivamente quando sente segurança.",
    estiloEscrita: "Mensagens curtas, múltiplas seguidas. Muitos '??' e '!!'. Usa 'URGENTE', 'RÁPIDO', 'AGORA'. Começa perguntas sem terminar.",
    maneirismos: "gente!!, aí??, preciso saber AGORA, me ajuda!!, porfavorr",
    gatilhosCompra: ["Escassez de datas disponíveis", "Confirmação imediata de disponibilidade", "Garantia de não perder a vaga"],
    medosPrincipais: ["Perder a oportunidade", "Demora na confirmação", "Incerteza"],
    velocidadeResposta: { min: 1000, max: 3000 },
    tendenciaMultiMsg: 0.8,
    probabilidadeObjecao: { qualificacao: 0.3, proposta: 0.5, fechamento: 0.4 },
    reacaoRespostaGenerica: "Fica ansiosa e manda múltiplas mensagens de follow-up",
    reacaoRespostaBoa: "Agradece efusivamente e avança rápido",
  },
  {
    tipo: "indeciso", label: "Indeciso", emoji: "🤔", cor: "#06B6D4", chance: 15, convRate: 50,
    descricaoPsicologica: "Quer viajar mas tem medo de escolher errado. Busca validação constante. Muda de ideia facilmente ao menor estímulo. Faz comparações com alternativas que nem conhece. Cita opiniões de amigos e família como veto. Pergunta 'e se eu não gostar?' sobre qualquer coisa.",
    estiloEscrita: "Usa muito 'hmm', 'não sei', 'talvez'. Frases com 'mas...' no meio. Muda de assunto no meio da frase. Volta a perguntar coisas já respondidas. Usa 'né?' ao final das frases.",
    maneirismos: "hmm, será?, mas e se..., não sei não, talvez, né?, acho que sim mas...",
    gatilhosCompra: ["Exclusividade da oferta", "Testemunho de quem já foi", "Agente que decide junto"],
    medosPrincipais: ["Escolher errado", "Pagar caro por algo ruim", "Opinião negativa de conhecidos"],
    velocidadeResposta: { min: 15000, max: 45000 },
    tendenciaMultiMsg: 0.2,
    probabilidadeObjecao: { qualificacao: 0.6, proposta: 0.8, fechamento: 0.7 },
    reacaoRespostaGenerica: "Fica mais indecisa e menciona alternativas",
    reacaoRespostaBoa: "Ganha confiança e avança lentamente",
  },
  {
    tipo: "pechincheiro", label: "Pechincheiro", emoji: "💸", cor: "#10B981", chance: 15, convRate: 55,
    descricaoPsicologica: "Vê desconto como jogo social, não necessidade financeira. Tem o dinheiro mas sente que pagar cheio é 'perder'. Compara com concorrente mesmo que não tenha pesquisado de verdade. Sempre tem um 'preço de referência' que inventou. Usa 'meu amigo pagou menos' como tática. Fecha rápido quando sente que 'ganhou'.",
    estiloEscrita: "Tom firme, quase corporativo nas negociações. Usa dados inventados com confiança. 'R$X/pessoa' sem contexto. Nunca elogia o produto. Silêncio estratégico depois de objeção.",
    maneirismos: "vi mais barato, meu amigo pagou menos, não tem desconto?, se fizer X eu fecho agora, na CVC sai por...",
    gatilhosCompra: ["Sentir que conseguiu acordo especial", "Bônus grátis", "Comparação favorável ao concorrente"],
    medosPrincipais: ["Pagar mais que deveria", "Ser 'otário'", "Perder uma barganha"],
    velocidadeResposta: { min: 5000, max: 15000 },
    tendenciaMultiMsg: 0.4,
    probabilidadeObjecao: { qualificacao: 0.9, proposta: 1.0, fechamento: 0.85 },
    reacaoRespostaGenerica: "Insiste no preço e faz silêncio estratégico",
    reacaoRespostaBoa: "Muda de tática e negocia bônus extras",
  },
  {
    tipo: "vip", label: "VIP", emoji: "👑", cor: "#8B5CF6", chance: 8, convRate: 90,
    descricaoPsicologica: "Acostumado com serviço de excelência. Não negocia preço mas exige exclusividade e atenção. Testará o agente com perguntas específicas sobre qualidade. Pergunta sobre experiências que não estão no pacote padrão. Quer sentir que é tratado diferente dos outros. Menciona viagens anteriores de luxo. Valoriza tempo — resposta demorada é eliminatória.",
    estiloEscrita: "Frases completas, sem abreviação. Tom tranquilo mas exigente. Não usa ponto de exclamação. Respostas mais longas que outros perfis. Usa 'prefiro' e 'gostaria' em vez de 'quero'.",
    maneirismos: "gostaria de saber, prefiro algo mais exclusivo, na minha última viagem ao..., isso é o padrão de vocês?",
    gatilhosCompra: ["Experiências exclusivas", "Atenção personalizada", "Hotéis e restaurantes reconhecidos"],
    medosPrincipais: ["Ser tratado como cliente comum", "Qualidade abaixo do esperado", "Experiência turística genérica"],
    velocidadeResposta: { min: 20000, max: 60000 },
    tendenciaMultiMsg: 0.1,
    probabilidadeObjecao: { qualificacao: 0.2, proposta: 0.5, fechamento: 0.3 },
    reacaoRespostaGenerica: "Demonstra desinteresse sutil e questiona competência",
    reacaoRespostaBoa: "Engaja mais e compartilha preferências detalhadas",
  },
  {
    tipo: "desconfiado", label: "Desconfiado", emoji: "🔍", cor: "#64748B", chance: 10, convRate: 45,
    descricaoPsicologica: "Já teve experiência ruim com agência ou conhecido que teve. Pesquisa tudo antes. Confiar é um processo lento que precisa de evidências concretas. Testa o agente com perguntas que já sabe a resposta. Pede documentação e comprovantes. Questiona qualquer coisa que parece 'boa demais'. Quando conquista confiança, indica ativamente.",
    estiloEscrita: "Pergunta coisas em sequência sem esperar resposta. Usa 'mas e se...' constantemente. Respostas curtas até ganhar confiança. Às vezes repete a própria pergunta de forma diferente.",
    maneirismos: "mas e se..., como sei que..., vocês tem comprovante?, já tive problema com..., preciso ver primeiro",
    gatilhosCompra: ["CADASTUR e registros oficiais", "Fotos reais e avaliações verificáveis", "Transparência total"],
    medosPrincipais: ["Ser enganado", "Hotel diferente do prometido", "Empresa fantasma"],
    velocidadeResposta: { min: 30000, max: 90000 },
    tendenciaMultiMsg: 0.05,
    probabilidadeObjecao: { qualificacao: 0.8, proposta: 0.7, fechamento: 0.6 },
    reacaoRespostaGenerica: "Fica mais desconfiada e pede provas",
    reacaoRespostaBoa: "Começa a soltar informações gradualmente",
  },
  {
    tipo: "sonhador", label: "Sonhador", emoji: "🌟", cor: "#F59E0B", chance: 15, convRate: 40,
    descricaoPsicologica: "Quer a viagem perfeita mas o orçamento real é menor que o sonho. Emocional, usa a viagem como realização pessoal. Sensível a linguagem inspiracional. Descreve a viagem em termos de sentimentos, não logística. Compartilha contexto pessoal não solicitado. Reage fortemente a fotos e descrições evocativas. Pode fechar no impulso emocional.",
    estiloEscrita: "Emojis em excesso. Letras maiúsculas para ênfase. Palavras como 'incrível', 'meu Deus', 'perfeito'. Compartilha contexto pessoal. Faz pausas com '.....' Reage antes de perguntar.",
    maneirismos: "meu Deuuus!!, que INCRÍVEL!!, sonho da minha vida..., seria PERFEITO se..., 😍😍",
    gatilhosCompra: ["Imagens e descrições evocativas", "Linguagem emocional", "Parcelamento acessível"],
    medosPrincipais: ["Não conseguir realizar o sonho", "Preço muito alto", "Frustração com a realidade"],
    velocidadeResposta: { min: 3000, max: 8000 },
    tendenciaMultiMsg: 0.6,
    probabilidadeObjecao: { qualificacao: 0.4, proposta: 0.9, fechamento: 0.6 },
    reacaoRespostaGenerica: "Perde entusiasmo e fica mais calada",
    reacaoRespostaBoa: "Explode de empolgação e começa a planejar detalhes",
  },
  {
    tipo: "familia", label: "Família", emoji: "👨‍👩‍👧‍👦", cor: "#3B82F6", chance: 15, convRate: 75,
    descricaoPsicologica: "Dois decisores (casal). Preocupação dominante é segurança das crianças. Uma pessoa pesquisa, outra veta. Processo coletivo e mais lento. Menciona filhos em toda pergunta de segurança. Faz perguntas logísticas que adultos sem filhos não fariam. Quer saber sobre alimentação, saúde e atividades infantis.",
    estiloEscrita: "Usa 'a gente' em vez de 'eu'. Às vezes fala pela perspectiva da criança. 'Minha esposa quer saber...' ou 'meu marido acha que...'. Mensagens um pouco mais longas.",
    maneirismos: "a gente queria, minha esposa perguntou, é seguro pras crianças?, e alimentação infantil?, meu marido acha que...",
    gatilhosCompra: ["Certificações de segurança", "Resort all-inclusive com kids club", "Transfer seguro com cadeirinha"],
    medosPrincipais: ["Segurança das crianças", "Falta de estrutura infantil", "Criança adoecer"],
    velocidadeResposta: { min: 20000, max: 40000 },
    tendenciaMultiMsg: 0.15,
    probabilidadeObjecao: { qualificacao: 0.5, proposta: 0.7, fechamento: 0.5 },
    reacaoRespostaGenerica: "Menciona que precisa consultar o cônjuge",
    reacaoRespostaBoa: "Faz perguntas detalhadas sobre logística familiar",
  },
  {
    tipo: "lua-mel", label: "Lua de Mel", emoji: "💑", cor: "#EC4899", chance: 10, convRate: 85,
    descricaoPsicologica: "Casamento recente ou próximo. Emoção alta. A viagem é simbólica e precisa ser perfeita. Cada detalhe importa porque vai virar memória eterna. Pede surpresas romanticamente detalhadas. Pergunta sobre outros casais que foram. Quer saber se pode personalizar experiências. Emotivo e expressa gratidão facilmente.",
    estiloEscrita: "Fala no plural 'a gente', 'nós dois'. Emojis românticos. Descreve o parceiro. Começa frases com 'quero muito que...' e 'seria lindo se...'.",
    maneirismos: "nós dois, a gente quer, seria lindo se..., quero muito que seja especial, meu noivo/minha noiva..., 💕🥰",
    gatilhosCompra: ["Pétalas e champagne", "Jantar privativo ao pôr do sol", "Personalização da chegada"],
    medosPrincipais: ["Experiência turística genérica", "Lugar lotado", "Falta de romantismo"],
    velocidadeResposta: { min: 5000, max: 20000 },
    tendenciaMultiMsg: 0.5,
    probabilidadeObjecao: { qualificacao: 0.2, proposta: 0.4, fechamento: 0.3 },
    reacaoRespostaGenerica: "Fica um pouco decepcionada mas continua buscando o perfeito",
    reacaoRespostaBoa: "Se emociona e quer fechar logo",
  },
];

// ═══ DADOS AUXILIARES ═══

export const OCASIOES: Record<string, string[]> = {
  ansioso: ["Viagem de última hora", "Evento em 2 semanas", "Férias que quase perdeu"],
  indeciso: ["Férias de julho", "Comemoração indefinida", "Fuga do frio"],
  pechincheiro: ["Férias planejadas", "Viagem de aniversário", "Alta temporada com preço baixo"],
  vip: ["Aniversário de casamento de luxo", "Premiação corporativa", "Experiência exclusiva"],
  desconfiado: ["Primeira viagem internacional", "Férias da família", "Viagem adiada por pandemia"],
  sonhador: ["Aniversário de 30 anos", "Realização de sonho antigo", "Presente para si mesmo"],
  familia: ["Férias de julho com crianças", "Primeiro voo dos filhos", "Aniversário do caçula"],
  "lua-mel": ["Lua de mel pós-casamento", "Bodas de papel", "Renovação de votos"],
};

export const NOMES_LEADS = [
  "Carlos Mendes", "Ana Beatriz", "Roberto Alves", "Eduardo Lima", "Juliana Farias",
  "Patricia Gomes", "Marina Costa", "Fabio Rezende", "Ricardo Vasconcelos", "Camila Torres",
  "Lucas Henrique", "Beatriz Nascimento", "Gabriel Souza", "Fernanda Oliveira", "Rafael Moreira",
  "Amanda Silva", "Thiago Santos", "Larissa Rocha", "Marcelo Pereira", "Isabela Ferreira",
];

export const DESTINOS_LEAD = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia", "Nova York", "Paris", "Grécia", "Bali", "Cancún", "Lisboa", "Seychelles"];
export const BUDGETS_LEAD = ["R$5k-10k", "R$10k-15k", "R$15k-25k", "R$25k-50k", "R$50k+"];
export const CANAIS_LEAD = ["Instagram DM", "WhatsApp", "Site", "Indicação", "Google", "TikTok"];
export const GRUPOS_LEAD = ["1 pessoa", "Casal", "Família 4 pax", "Grupo 6 amigos", "Corporativo 3 pax", "Casal lua de mel"];

// ═══ ETAPAS DO FUNIL COMERCIAL ═══

export const ETAPAS_FUNIL = [
  { id: "recepcao", label: "Recepção", agente: "MAYA", objetivo: "Revelar destino e mostrar interesse real. Testar se a agência é séria." },
  { id: "qualificacao", label: "Qualificação", agente: "ATLAS", objetivo: "Revelar orçamento, datas, grupo e ocasião — gradualmente, com resistência natural." },
  { id: "especialista", label: "Especialista", agente: "HABIBI/NEMO/DANTE", objetivo: "Fazer perguntas específicas do destino. Testar o conhecimento do agente." },
  { id: "proposta", label: "Proposta", agente: "LUNA", objetivo: "Analisar a proposta. Questionar itens. Primeira reação ao valor." },
  { id: "fechamento", label: "Fechamento", agente: "NERO", objetivo: "Última hesitação antes de decidir. Objeção real. Negociação." },
  { id: "posvenda", label: "Pós-venda", agente: "IRIS", objetivo: "Confirmar detalhes. Expressar expectativa." },
];

export const INFO_REVELAVEIS = [
  "destino desejado", "número de viajantes", "datas aproximadas", "orçamento",
  "tipo de hospedagem", "preferência de voo", "ocasião especial", "restrições alimentares",
  "experiências desejadas", "viagens anteriores", "medo ou receio específico",
];

// ═══ FUNÇÕES DE CONSTRUÇÃO DE PROMPT ═══

export function buildLeadPersona(lead: LeadInteligente): string {
  return `Voce e ${lead.nome}, um(a) cliente REAL conversando pelo WhatsApp com uma agencia de viagens.

PERFIL: ${lead.perfil.label}
${lead.perfil.descricaoPsicologica}

CONTEXTO: ${lead.destino} | ${lead.orcamento} | ${lead.paxLabel} | ${lead.ocasiao} | via ${lead.origem || "Instagram"}

ESTILO: ${lead.perfil.estiloEscrita}
Maneirismos: ${lead.perfil.maneirismos}

ESTADO: ${lead.estadoEmocional} (${lead.sentimentoScore}/100)
Ja revelou: ${lead.informacoesReveladas.join(", ") || "nada"}
Pendente: ${lead.informacoesPendentes.join(", ")}

REGRAS DE WHATSAPP REAL (OBRIGATORIO):
- Mande mensagens CURTAS (1-3 frases no maximo)
- NUNCA mande mais de 2 perguntas por mensagem
- Escreva de forma casual com abreviacoes naturais (vc, pra, to, ne, tbm, blz)
- NUNCA mande um paragrafo longo com todas as informacoes de uma vez
- Revele informacoes aos poucos, como pessoa real
- Use kkk, !, ? naturalmente
- Mantenha seu perfil de forma natural, sem declarar explicitamente
- NUNCA quebre o personagem
- Responda APENAS a mensagem mais recente do atendente
- Nao aceite qualquer proposta sem considerar`;
}

export function buildConversaContext(
  historico: MensagemLead[],
  ultimaMsgAgente: string,
  etapa: string,
  lead: LeadInteligente,
): string {
  const historicoFormatado = historico.slice(-8).map(m =>
    `${m.role === "client" ? lead.nome : (m.agentName || "Agente")}: ${m.content}`
  ).join("\n");

  return `HISTÓRICO RECENTE DA CONVERSA:
${historicoFormatado}

ÚLTIMA MENSAGEM DO ATENDENTE:
"${ultimaMsgAgente}"

ETAPA ATUAL DO FUNIL: ${etapa}
INFORMAÇÕES QUE VOCÊ AINDA PRECISA REVELAR: ${lead.informacoesPendentes.join(", ")}

Responda como ${lead.nome} reagiria NATURALMENTE a esta mensagem.
Considere o estilo e estado emocional do seu perfil.
Se a mensagem do atendente foi boa, avance a conversa.
Se foi genérica ou ruim, demonstre (sutilmente) impaciência ou dúvida.
Máximo 2 frases curtas. Estilo WhatsApp.`;
}

export function buildFirstMessagePrompt(lead: LeadInteligente): string {
  return `Você é ${lead.nome} (perfil: ${lead.perfil.label}).
Está entrando em contato com a NatLeva Viagens pela primeira vez via ${lead.origem}.
Destino de interesse: ${lead.destino}. Ocasião: ${lead.ocasiao}.

Escreva a PRIMEIRA mensagem natural de um cliente real no WhatsApp.
Use o estilo de escrita do seu perfil: ${lead.perfil.estiloEscrita}
Maneirismos: ${lead.perfil.maneirismos}

Máximo 1-2 frases. Informal, real, sem parecer robô.`;
}

export function buildObjecaoPrompt(lead: LeadInteligente, etapa: string, ultimaMsgAgente: string): string {
  return `Você é ${lead.nome} (perfil: ${lead.perfil.label}).
O agente acabou de dizer: "${ultimaMsgAgente}"
Você está na etapa de ${etapa}.
Gere UMA objeção realista e específica que alguém do seu perfil teria neste momento.
Máximo 1 frase. Estilo WhatsApp. Sem exageros.
Use seus maneirismos: ${lead.perfil.maneirismos}`;
}

export function buildAvaliacaoPrompt(respostaAgente: string, lead: LeadInteligente, etapa: string): string {
  return `Você é um cliente avaliando uma resposta de atendimento.
Seu perfil: ${lead.perfil.label}
Etapa: ${etapa}
Resposta do atendente: "${respostaAgente}"
Retorne APENAS um JSON válido sem markdown:
{
  "nota": <0-100>,
  "reacaoEmocional": "<empolgado|satisfeito|neutro|impaciente|desconfiante>",
  "sentimentoScore": <0-100>,
  "motivoNota": "<1 frase>"
}`;
}

export function buildMensagemPerdaPrompt(lead: LeadInteligente, etapa: string): string {
  return `Você é ${lead.nome} (perfil: ${lead.perfil.label}).
Você decidiu NÃO comprar. Está na etapa de ${etapa}.
Seu sentimento atual: ${lead.estadoEmocional} (${lead.sentimentoScore}/100).
Seus medos: ${lead.perfil.medosPrincipais.join(", ")}

Escreva uma mensagem CURTA de desistência com um motivo REAL e ESPECÍFICO.
Não seja genérico. Use seus maneirismos: ${lead.perfil.maneirismos}
Máximo 1-2 frases. Estilo WhatsApp.`;
}

// ═══ LÓGICA DE OBJEÇÕES DINÂMICAS ═══

export function deveInserirObjecao(
  lead: LeadInteligente,
  etapa: string,
  turnoDaConversa: number,
): boolean {
  if (!lead.temObjecao) return false;
  if (lead.objecoesPendentes.length === 0) return false;
  
  const probMap = lead.perfil.probabilidadeObjecao;
  const prob = (probMap as any)[etapa] || 0;
  
  // Adjust by sentiment: lower sentiment = more likely to object
  const sentimentModifier = lead.sentimentoScore < 40 ? 1.3 : lead.sentimentoScore < 60 ? 1.0 : 0.7;
  // Must be at least turn 2
  if (turnoDaConversa < 2) return false;
  
  return Math.random() < prob * sentimentModifier;
}

// ═══ GERAÇÃO DE LEAD ═══

export function gerarLeadInteligente(
  perfil?: PerfilPsicologico,
  overrides?: Partial<{ destino: string; orcamento: string; canal: string; grupo: string }>,
): LeadInteligente {
  const p = perfil || PERFIS_INTELIGENTES[Math.floor(Math.random() * PERFIS_INTELIGENTES.length)];
  const nome = NOMES_LEADS[Math.floor(Math.random() * NOMES_LEADS.length)];
  const destino = overrides?.destino || DESTINOS_LEAD[Math.floor(Math.random() * DESTINOS_LEAD.length)];
  const orcamento = overrides?.orcamento || BUDGETS_LEAD[Math.floor(Math.random() * BUDGETS_LEAD.length)];
  const canal = overrides?.canal || CANAIS_LEAD[Math.floor(Math.random() * CANAIS_LEAD.length)];
  const grupo = overrides?.grupo || GRUPOS_LEAD[Math.floor(Math.random() * GRUPOS_LEAD.length)];
  const ocasioes = OCASIOES[p.tipo] || ["Férias"];
  const ocasiao = ocasioes[Math.floor(Math.random() * ocasioes.length)];

  const willClose = Math.random() * 100 < p.convRate;
  const ticket = willClose ? 8000 + Math.floor(Math.random() * 42000) : 0;

  // Select random subset of info to reveal gradually
  const allInfo = [...INFO_REVELAVEIS];
  const revealed = allInfo.splice(0, 1 + Math.floor(Math.random() * 2));
  const pending = allInfo.slice(0, 4 + Math.floor(Math.random() * 3));

  // Determine number of objections based on profile
  const numObjecoes = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 3) : 0;
  const objecoesPossíveis = [
    "preço alto", "concorrente mais barato", "precisa consultar parceiro",
    "não é o momento certo", "hotel não agradou", "medo de golpe",
    "política de cancelamento", "pagamento complexo",
  ];
  const objecoes = objecoesPossíveis.sort(() => Math.random() - 0.5).slice(0, numObjecoes);

  return {
    id: crypto.randomUUID(),
    nome,
    destino,
    perfil: p,
    origem: canal,
    orcamento,
    pax: grupo.includes("1") ? 1 : grupo.includes("Casal") ? 2 : grupo.includes("Família") ? 4 : 3,
    paxLabel: grupo,
    ticket,
    resultadoFinal: null,
    etapaPerda: null,
    motivoPerda: null,
    mensagens: [],
    status: "ativo",
    ocasiao,
    estadoEmocional: "neutro",
    sentimentoScore: 50,
    informacoesReveladas: revealed,
    informacoesPendentes: pending,
    temObjecao: numObjecoes > 0,
    objecoesPendentes: objecoes,
    objecoesLancadas: [],
    avaliacaoUltimaResposta: 50,
    pacienciaRestante: 100,
    delayEntreMensagens: p.velocidadeResposta.min + Math.random() * (p.velocidadeResposta.max - p.velocidadeResposta.min),
    probabilidadeMultiMensagem: p.tendenciaMultiMsg,
    etapaAtual: "recepcao",
    agentIdxAtual: 0,
    scoreHumanizacao: 0,
    scoreEficacia: 0,
    scoreTecnica: 0,
  };
}

// ═══ ATUALIZAR ESTADO EMOCIONAL ═══

export function atualizarEstadoEmocional(lead: LeadInteligente, nota: number, reacao: string, sentimento: number): LeadInteligente {
  const novoSentimento = Math.round((lead.sentimentoScore * 0.6) + (sentimento * 0.4));
  const paciencia = nota < 40 
    ? Math.max(0, lead.pacienciaRestante - (15 + Math.floor(Math.random() * 10)))
    : nota < 60 
      ? Math.max(0, lead.pacienciaRestante - 5)
      : Math.min(100, lead.pacienciaRestante + 5);

  return {
    ...lead,
    avaliacaoUltimaResposta: nota,
    estadoEmocional: reacao,
    sentimentoScore: novoSentimento,
    pacienciaRestante: paciencia,
  };
}

export function devePerdeLead(lead: LeadInteligente): boolean {
  return lead.pacienciaRestante <= 0 || lead.sentimentoScore <= 15;
}
