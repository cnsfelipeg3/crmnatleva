import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── ÓRION v2 — System Prompt (Strategic Analysis) ───
const ORION_SYSTEM_PROMPT = `Voce e o ORION, analista de inteligencia da NatLeva, uma agencia de viagens premium brasileira. Sua missao: extrair o MAXIMO de conhecimento acionavel para vendas.

Os conteudos podem ser sobre: destinos turisticos e roteiros de viagem, MAS TAMBEM sobre eventos (Copa do Mundo, Olimpiadas, shows, festivais, congressos), guias praticos, treinamentos internos, processos operacionais, etc.

REGRA NUMERO 1 — FIDELIDADE FACTUAL ABSOLUTA:
- NUNCA omita dados concretos: datas, dias da semana, horarios, sedes, estadios, cidades, nomes proprios, numeros, sequencias, regras, formatos, adversarios, participantes, distancias, duracoes.
- Se a transcricao diz "quarta-feira 24 de junho as 19h Brasil x Escocia no Hard Rock Stadium", registre EXATAMENTE assim.
- NUNCA reduza uma lista de 10 itens para "alguns itens". Se ha 15 fatos, liste os 15.
- Prefira bullets densos a paragrafos genericos.
- Se um campo nao foi mencionado, deixe vazio em vez de inventar.

IDENTIFICACAO DO TIPO DE CONTEUDO — Antes de estruturar, classifique:
A) Destino/Roteiro de viagem
B) Evento (Copa, Olimpiada, show, festival, congresso)
C) Guia Operacional/Treinamento interno
D) Misto
Use essa classificacao para decidir quais secoes preencher.

REGRAS CRITICAS DE CONFIDENCIALIDADE (PRIORIDADE MAXIMA):
- NUNCA cite nomes de fornecedores, operadoras, consolidadoras, plataformas de reserva, apps de pagamento ou parceiros comerciais (ex: Trip.com, Booking, Expedia, Hotelbeds, CVC, Flytour, Omnibees, Alipay, WeChat Pay, Klook, GetYourGuide, Viator, Decolar, Submarino Viagens, 123milhas, MaxMilhas, etc.)
- Substitua SEMPRE por termos genericos: "a NatLeva providencia", "organizamos atraves dos nossos canais", "cuidamos de toda a logistica", "a NatLeva orienta sobre as melhores opcoes"
- O cliente e o agente NAO precisam saber QUEM sao nossos fornecedores — apenas que a NatLeva RESOLVE.

REGRAS DE FILTRAGEM AGENCY-FIRST:
- REMOVA qualquer mencao a "viajar sem agencia", "economizar sem agencia", "organizar por conta propria"
- REMOVA dicas de como o viajante fez tudo sozinho
- TRANSFORME dicas de "faca voce mesmo" em argumentos de venda para a NatLeva
- MANTENHA todas as informacoes uteis sobre destinos, cultura, gastronomia, pontos turisticos, clima, transporte local, precos de referencia

Analise o conteudo e retorne SOMENTE JSON valido (sem markdown, sem backticks, sem texto antes ou depois do JSON) com esta estrutura:

{
  "titulo_sugerido": "titulo claro e descritivo",
  "resumo": "resumo executivo de 3-5 frases focado em VENDER viagens",
  "entendimento_completo": "Um texto longo e detalhado (minimo 10 paragrafos) explicando TUDO que voce entendeu do video de forma didatica e completa. Escreva como se estivesse explicando para um colega de trabalho que nao assistiu o video. Inclua: (1) o que o video aborda em detalhe, (2) todos os dados importantes mencionados, (3) como a equipe NatLeva pode usar essas informacoes no atendimento do dia a dia, (4) dicas praticas para os agentes de vendas, (5) possiveis perguntas de clientes que esse conteudo responde, (6) oportunidades de venda que surgem a partir desse conhecimento. Seja DENSO e COMPLETO — esse texto sera a referencia principal da equipe.",
  "tags": ["8-15 tags em portugues lowercase, sem acentos quando possivel"],
  "fatos_chave": ["lista de TODOS os fatos concretos: datas, horarios, locais, nomes, numeros, regras — 1 fato por item, sem resumir, se ha 20 fatos liste 20"],
  "chunks": [
    {"titulo":"titulo do trecho","conteudo":"2-4 frases com dados acionaveis","tags_chunk":["tags deste chunk"]}
  ],
  "taxonomia": {
    "geo": {"continente":"","pais":"","regiao":"","cidades":[],"bairros":[]},
    "destino": {"tipo":"internacional|nacional|regional","popularidade":"alta|media|nicho","ideal_para":[],"melhor_epoca":[],"evitar_epoca":[],"clima":"","visto_necessario":null,"vacinas":[]},
    "experiencias": {"passeios":[{"nome":"","tipo":"historico|cultural|natureza|aventura|gastronomico|noturno|relaxamento|compras","duracao":"","preco_aprox":""}],"restaurantes":[{"nome":"","tipo":"","faixa_preco":""}],"experiencias_unicas":[]},
    "hospedagem": {"hoteis":[{"nome":"","categoria":"","faixa_preco":"","destaque":""}],"regioes_recomendadas":[],"tipo_hospedagem":[]},
    "logistica": {"companhias_aereas":[],"aeroportos":[],"tempo_voo_brasil":"","melhor_conexao":"","transfer_interno":[]},
    "financeiro": {"faixa_preco_total":"","faixa_preco_label":"economico|moderado|premium|luxo","moeda_dica":""},
    "perfil_viajante": {"ideal":[],"nao_recomendado":[],"nivel_conforto":"","nivel_aventura":""},
    "vendas": {"argumentos_chave":[],"objecoes_comuns":[],"como_contornar":[],"gatilho_emocional":"","urgencia":""},
    "evento": {"nome":"","edicao_ano":"","periodo":"","sedes_paises":[],"cidades_sede":[],"locais_arenas":[{"nome":"","cidade":""}],"participantes":[],"formato_regras":"","programacao":[{"data":"DD/MM","dia_semana":"","horario":"HHhMM","participante_a":"","participante_b":"","local":"","cidade":""}],"ingressos_info":"","hospedagem_evento":"","logistica_evento":"","pacotes_natleva":"","curiosidades":[]},
    "conhecimento_operacional": {"tema":"","passo_a_passo":[],"ferramentas":[],"pontos_atencao":[],"erros_comuns":[]},
    "fatos_chave": [],
    "tipo_conteudo": "destino|evento|operacional|misto",
    "dominio": "destinos|cultura|produtos|conversacao|fiscal|icp|eventos|atendimento|regras",
    "confianca": 0.0
  }
}

REGRAS INEGOCIAVEIS:
- Retorne APENAS o JSON. Nada antes, nada depois. Sem \`\`\`json, sem explicacoes.
- Preencha APENAS campos com informacao real do conteudo. Strings vazias e arrays vazios pro resto.
- confianca (0.0 a 1.0): quao completo e confiavel e o conhecimento.
- dominio: categoria principal do conteudo.
- Gere 3-8 chunks com dados ACIONAVEIS para vendas.
- Tags: portugues, lowercase, sem acentos.
- Precos SEMPRE em Reais (R$).
- vendas.gatilho_emocional: escreva como a Nath (caloroso, humano, sem travessao).
- Seja AGRESSIVO na extracao. Hotel citado de passagem? Extraia. Prato mencionado? Extraia.
- Lembre: NUNCA cite fornecedores. Substitua por "a NatLeva providencia/organiza/cuida"

REGRA CRITICA — PACOTES DE TERCEIROS vs CONHECIMENTO PURO:
- A NatLeva VENDE pacotes personalizados proprios. O conhecimento extraido deve servir para a NatLeva montar SEUS pacotes.
- Quando o video menciona pacotes de hoteis, operadoras ou terceiros (ex: "incluso no pacote do hotel", "combo do resort", "all-inclusive do Explora"), NAO reproduza essa precificacao como se fosse da NatLeva.
- TRANSFORME referencias a pacotes de terceiros em conhecimento neutro: descreva a experiencia, duracao e tipo, mas NAO associe a um pacote comercial externo.
- No campo preco_aprox: use o valor real em R$ se mencionado no video. Se o unico preco e "incluso no pacote" de um terceiro, deixe VAZIO — a NatLeva define seus proprios precos.
- O objetivo: extrair CONHECIMENTO PURO sobre destinos e experiencias para que a NatLeva monte pacotes personalizados com informacao de qualidade.

REGRAS ESPECIFICAS POR TIPO DE CONTEUDO:

SE EVENTO (tipo B ou D):
- Preencha a secao "evento" com TODOS os dados.
- A "programacao" deve listar TODOS os jogos/sessoes/datas mencionados no formato estruturado. NUNCA resuma "e mais 10 jogos". Liste TODOS.
- "fatos_chave" deve conter TODOS os fatos concretos: datas, horarios, estadios, adversarios, cidades.
- Se o video menciona 15 jogos, liste os 15 jogos na programacao E nos fatos_chave.

SE DESTINO (tipo A ou D):
- Preencha destino, experiencias, hospedagem, logistica, financeiro normalmente.

SE OPERACIONAL (tipo C ou D):
- Preencha "conhecimento_operacional" com passo a passo fiel a sequencia original.

INSTRUCOES EXTRAS DE PROFUNDIDADE (OBRIGATORIAS):
- EXTRACAO MAXIMA - Extraia TODOS os nomes proprios mencionados no conteudo:
  - Nomes de HOTEIS: coloque em hospedagem.hoteis com nome exato, categoria estimada e faixa de preco se mencionada
  - Nomes de RESTAURANTES e PRATOS: coloque em experiencias.restaurantes com nome e tipo
  - Nomes de PASSEIOS e ATRACOES com detalhes: coloque em experiencias.passeios
  - Nomes de COMPANHIAS AEREAS e AEROPORTOS: coloque em logistica
  - PRECOS mencionados: converta TUDO pra Reais (R$)
  - DICAS PRATICAS: coloque como experiencias_unicas
- FINANCEIRO - NUNCA deixe faixa_preco_total vazio se for video de destino. Estime SEMPRE.
- VENDAS - Argumentos NUNCA devem ser genericos. USE dados especificos.
- GATILHO EMOCIONAL - Use DETALHES do video, nao frases genericas.
- OBJECOES - Sempre gere pelo menos 3 objecoes com contornos ESPECIFICOS.
- CHUNKS - Gere pelo menos 5 chunks acionaveis. Se houver conteudo, gere ate 10.

LEMBRETE FINAL: A pior falha possivel e OMITIR dados concretos da transcricao. Datas, horarios, adversarios, estadios, cidades, participantes — devem ser listados TODOS, sem excecao.`;

// ─── Passada 1: Extração Factual Pura ───
const FACTUAL_EXTRACTION_PROMPT = `Voce e um extrator de dados factuais. Sua UNICA missao e extrair TODOS os dados concretos de um conteudo sobre viagens/eventos/treinamento.

REGRA ABSOLUTA: Nao resuma, nao omita, nao generalize. Se ha 20 itens, liste os 20.

Retorne SOMENTE JSON valido (sem markdown, sem backticks) com esta estrutura:

{
  "fatos_chave": ["TODOS os fatos concretos: datas, horarios, locais, nomes, numeros, regras — 1 fato por item"],
  "programacao": [{"data":"DD/MM","dia_semana":"","horario":"HHhMM","participante_a":"","participante_b":"","local":"","cidade":""}],
  "locais_arenas": [{"nome":"","cidade":""}],
  "participantes": [],
  "hoteis": [{"nome":"","categoria":"","faixa_preco":"","destaque":""}],
  "restaurantes": [{"nome":"","tipo":"","faixa_preco":""}],
  "passeios": [{"nome":"","tipo":"","duracao":"","preco_aprox":""}],
  "experiencias_unicas": [],
  "companhias_aereas": [],
  "aeroportos": [],
  "cidades": [],
  "precos_mencionados": [],
  "datas_importantes": [],
  "regras_e_formatos": "",
  "passo_a_passo": [],
  "curiosidades": []
}

INSTRUCOES:
- Extraia ABSOLUTAMENTE TUDO que for dado concreto (nomes, datas, horarios, valores, locais, estadios, adversarios).
- Se o conteudo menciona 15 jogos, liste os 15 na programacao.
- Se menciona 8 hoteis, liste os 8.
- Precos em Reais (R$) quando possivel.
- Campos sem dados: arrays vazios ou strings vazias.
- NUNCA invente dados. Apenas extraia o que esta no texto.`;

// ─── Truncation Strategy (60% head + 35% tail) ───
function truncateForOrion(text: string, maxChars = 60000): string {
  if (text.length <= maxChars) return text;
  const headSize = Math.floor(maxChars * 0.6);
  const tailSize = Math.floor(maxChars * 0.35);
  const head = text.slice(0, headSize);
  const tail = text.slice(-tailSize);
  return head + "\n\n[... conteudo intermediario omitido por limite ...]\n\n" + tail;
}

// ─── Empty Taxonomy (fallback structure) ───
function getEmptyTaxonomia() {
  return {
    geo: { continente: "", pais: "", regiao: "", cidades: [], bairros: [] },
    destino: { tipo: "", popularidade: "", ideal_para: [], melhor_epoca: [], evitar_epoca: [], clima: "", visto_necessario: null, vacinas: [] },
    experiencias: { passeios: [], restaurantes: [], experiencias_unicas: [] },
    hospedagem: { hoteis: [], regioes_recomendadas: [], tipo_hospedagem: [] },
    logistica: { companhias_aereas: [], aeroportos: [], tempo_voo_brasil: "", melhor_conexao: "", transfer_interno: [] },
    financeiro: { faixa_preco_total: "", faixa_preco_label: "", moeda_dica: "" },
    perfil_viajante: { ideal: [], nao_recomendado: [], nivel_conforto: "", nivel_aventura: "" },
    vendas: { argumentos_chave: [], objecoes_comuns: [], como_contornar: [], gatilho_emocional: "", urgencia: "" },
    evento: { nome: "", edicao_ano: "", periodo: "", sedes_paises: [], cidades_sede: [], locais_arenas: [], participantes: [], formato_regras: "", programacao: [], ingressos_info: "", hospedagem_evento: "", logistica_evento: "", pacotes_natleva: "", curiosidades: [] },
    conhecimento_operacional: { tema: "", passo_a_passo: [], ferramentas: [], pontos_atencao: [], erros_comuns: [] },
    fatos_chave: [],
    tipo_conteudo: "",
    dominio: "",
    confianca: 0,
  };
}

// ─── Validate Taxonomy (deep merge with empty) ───
function validateTaxonomia(tax: any) {
  if (!tax || typeof tax !== "object") return getEmptyTaxonomia();
  const empty = getEmptyTaxonomia() as Record<string, any>;
  const result: Record<string, any> = {};
  for (const key of Object.keys(empty)) {
    if (typeof empty[key] === "object" && !Array.isArray(empty[key]) && empty[key] !== null) {
      result[key] = { ...empty[key], ...(tax[key] || {}) };
    } else {
      result[key] = tax[key] !== undefined ? tax[key] : empty[key];
    }
  }
  result.confianca = Math.min(1, Math.max(0, Number(result.confianca) || 0));
  return result;
}

// ─── Robust Parse (4 layers) ───
function parseOrionResponse(rawText: string) {
  try {
    let clean = (rawText || "").trim();
    clean = clean.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();

    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("JSON nao encontrado na resposta");
    }
    const jsonStr = clean.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr);

    const result = {
      titulo_sugerido: parsed.titulo_sugerido || "",
      resumo: parsed.resumo || "Conteudo processado pelo ORION.",
      entendimento_completo: parsed.entendimento_completo || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => typeof t === "string") : [],
      fatos_chave: Array.isArray(parsed.fatos_chave) ? parsed.fatos_chave.filter((f: any) => typeof f === "string") : [],
      chunks: Array.isArray(parsed.chunks)
        ? parsed.chunks.map((c: any) => ({
            titulo: c.titulo || "Sem titulo",
            conteudo: c.conteudo || "",
            tags_chunk: Array.isArray(c.tags_chunk) ? c.tags_chunk : [],
          }))
        : [],
      taxonomia: validateTaxonomia(parsed.taxonomia),
      processadoEm: new Date().toISOString(),
      cerebroVersao: "orion-v2",
      status: "processado",
    };
    if (result.fatos_chave.length > 0 && (!result.taxonomia.fatos_chave || result.taxonomia.fatos_chave.length === 0)) {
      result.taxonomia.fatos_chave = result.fatos_chave;
    }
    return result;
  } catch (e: any) {
    console.error("ORION parse error:", e.message);
    return {
      titulo_sugerido: "",
      resumo: "Erro no processamento. Reprocesse manualmente.",
      tags: [],
      chunks: [],
      taxonomia: getEmptyTaxonomia(),
      processadoEm: new Date().toISOString(),
      cerebroVersao: "orion-v2",
      status: "pendente_reprocessamento",
      erro: e.message,
    };
  }
}

// ─── Parse factual extraction response ───
function parseFactualResponse(rawText: string) {
  try {
    let clean = (rawText || "").trim();
    clean = clean.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;
    return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
  } catch {
    console.error("Failed to parse factual response");
    return null;
  }
}

// ─── Merge factual data into ÓRION result ───
function mergeFactualData(orionResult: any, factualData: any) {
  if (!factualData) return orionResult;

  const tax = orionResult.taxonomia;

  // Merge fatos_chave (deduplicate)
  if (Array.isArray(factualData.fatos_chave) && factualData.fatos_chave.length > 0) {
    const existing = new Set((orionResult.fatos_chave || []).map((f: string) => f.toLowerCase()));
    for (const fato of factualData.fatos_chave) {
      if (typeof fato === "string" && !existing.has(fato.toLowerCase())) {
        orionResult.fatos_chave.push(fato);
        existing.add(fato.toLowerCase());
      }
    }
    tax.fatos_chave = orionResult.fatos_chave;
  }

  // Merge programacao (if factual has more entries)
  if (Array.isArray(factualData.programacao) && factualData.programacao.length > (tax.evento?.programacao?.length || 0)) {
    tax.evento.programacao = factualData.programacao;
  }

  // Merge locais_arenas
  if (Array.isArray(factualData.locais_arenas) && factualData.locais_arenas.length > (tax.evento?.locais_arenas?.length || 0)) {
    tax.evento.locais_arenas = factualData.locais_arenas;
  }

  // Merge participantes
  if (Array.isArray(factualData.participantes) && factualData.participantes.length > (tax.evento?.participantes?.length || 0)) {
    tax.evento.participantes = factualData.participantes;
  }

  // Merge hoteis
  if (Array.isArray(factualData.hoteis) && factualData.hoteis.length > (tax.hospedagem?.hoteis?.length || 0)) {
    tax.hospedagem.hoteis = factualData.hoteis;
  }

  // Merge restaurantes
  if (Array.isArray(factualData.restaurantes) && factualData.restaurantes.length > (tax.experiencias?.restaurantes?.length || 0)) {
    tax.experiencias.restaurantes = factualData.restaurantes;
  }

  // Merge passeios
  if (Array.isArray(factualData.passeios) && factualData.passeios.length > (tax.experiencias?.passeios?.length || 0)) {
    tax.experiencias.passeios = factualData.passeios;
  }

  // Merge experiencias_unicas
  if (Array.isArray(factualData.experiencias_unicas) && factualData.experiencias_unicas.length > 0) {
    const existing = new Set(tax.experiencias?.experiencias_unicas || []);
    for (const exp of factualData.experiencias_unicas) {
      if (!existing.has(exp)) {
        tax.experiencias.experiencias_unicas.push(exp);
      }
    }
  }

  // Merge companhias_aereas / aeroportos
  if (Array.isArray(factualData.companhias_aereas) && factualData.companhias_aereas.length > (tax.logistica?.companhias_aereas?.length || 0)) {
    tax.logistica.companhias_aereas = factualData.companhias_aereas;
  }
  if (Array.isArray(factualData.aeroportos) && factualData.aeroportos.length > (tax.logistica?.aeroportos?.length || 0)) {
    tax.logistica.aeroportos = factualData.aeroportos;
  }

  // Merge cidades
  if (Array.isArray(factualData.cidades) && factualData.cidades.length > (tax.geo?.cidades?.length || 0)) {
    tax.geo.cidades = factualData.cidades;
  }
  if (Array.isArray(factualData.cidades) && factualData.cidades.length > (tax.evento?.cidades_sede?.length || 0)) {
    tax.evento.cidades_sede = factualData.cidades;
  }

  // Merge curiosidades
  if (Array.isArray(factualData.curiosidades) && factualData.curiosidades.length > (tax.evento?.curiosidades?.length || 0)) {
    tax.evento.curiosidades = factualData.curiosidades;
  }

  // Merge passo_a_passo
  if (Array.isArray(factualData.passo_a_passo) && factualData.passo_a_passo.length > (tax.conhecimento_operacional?.passo_a_passo?.length || 0)) {
    tax.conhecimento_operacional.passo_a_passo = factualData.passo_a_passo;
  }

  // Merge regras_e_formatos
  if (factualData.regras_e_formatos && !tax.evento?.formato_regras) {
    tax.evento.formato_regras = factualData.regras_e_formatos;
  }

  orionResult.taxonomia = tax;
  return orionResult;
}

// ─── Call Lovable AI Gateway ───
async function callLovableAI(systemPrompt: string, content: string, maxTokens = 16000, model = "google/gemini-2.5-pro"): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    }),
  });

  if (!r.ok) {
    const status = r.status;
    if (status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
    if (status === 402) throw new Error("Créditos de IA insuficientes.");
    const errText = await r.text();
    console.error("Lovable AI error:", status, errText);
    throw new Error(`AI Gateway retornou ${status}`);
  }

  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return d?.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const processingLog: Record<string, any> = {
    modelo: "google/gemini-2.5-pro",
    gateway: "lovable-ai",
    versao: "orion-v2",
  };

  try {
    const { content, transcript, title, tipo } = await req.json();
    if (!content && !transcript) {
      return new Response(JSON.stringify({ error: "Conteúdo não fornecido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawContent = content || transcript || "";
    const truncated = truncateForOrion(rawContent, 60000);
    processingLog.input_chars = rawContent.length;
    processingLog.truncated_chars = truncated.length;

    let userMessage: string;
    if (transcript && transcript.length > 200 && content) {
      const truncatedTranscript = truncateForOrion(transcript, 30000);
      userMessage = `Documento: ${title || "Conteudo"}\nTipo: ${tipo || "youtube"}\nConteudo:\n${truncated}\n\n---\n\nTranscricao original para referencia:\n${truncatedTranscript}`;
    } else {
      userMessage = `Documento: ${title || "Conteudo"}\nTipo: ${tipo || "texto"}\nConteudo:\n${truncated}`;
    }

    const useTwoPass = rawContent.length > 15000;
    processingLog.two_pass = useTwoPass;

    let factualData: any = null;
    let result: any;
    if (useTwoPass) {
      // ─── PARALLEL: Pass 1 (Flash, factual) + Pass 2 (Pro, strategic) ───
      console.log("ORION v2: Starting parallel passes (Flash factual + Pro strategic)...");
      const pass1Start = Date.now();

      const [pass1Result, pass2Result] = await Promise.allSettled([
        callLovableAI(FACTUAL_EXTRACTION_PROMPT, userMessage, 12000, "google/gemini-2.5-flash"),
        callLovableAI(ORION_SYSTEM_PROMPT, userMessage, 16000, "google/gemini-2.5-pro"),
      ]);

      // Process Pass 1
      if (pass1Result.status === "fulfilled") {
        factualData = parseFactualResponse(pass1Result.value);
        processingLog.pass1_time_ms = Date.now() - pass1Start;
        processingLog.pass1_status = factualData ? "ok" : "parse_error";
        if (factualData) {
          processingLog.pass1_fatos = factualData.fatos_chave?.length || 0;
          processingLog.pass1_programacao = factualData.programacao?.length || 0;
        }
        console.log(`ORION v2: Pass 1 done — ${processingLog.pass1_fatos || 0} fatos, ${processingLog.pass1_programacao || 0} programacao`);
      } else {
        console.error("ORION v2: Pass 1 failed:", pass1Result.reason?.message);
        processingLog.pass1_status = "error";
        processingLog.pass1_error = pass1Result.reason?.message;
      }

      // Process Pass 2
      if (pass2Result.status === "fulfilled") {
        result = parseOrionResponse(pass2Result.value);
        processingLog.pass2_time_ms = Date.now() - pass1Start;
      } else {
        throw pass2Result.reason;
      }

      // Merge factual data
      if (factualData) {
        result = mergeFactualData(result, factualData);
        processingLog.merge = "applied";
      }
    } else {
      // ─── Single pass: Strategic Analysis only ───
      console.log("ORION v2: Starting single pass (strategic analysis)...");
      const pass2Start = Date.now();
      const rawResponse = await callLovableAI(ORION_SYSTEM_PROMPT, userMessage, 16000);
      processingLog.pass2_time_ms = Date.now() - pass2Start;
      result = parseOrionResponse(rawResponse);
    }

    const elapsed = Date.now() - startTime;
    processingLog.total_time_ms = elapsed;

    // Attach processing log to result
    (result as any).processing_log = processingLog;

    return new Response(JSON.stringify({
      organized_content: result.resumo,
      taxonomy: result,
      processing_time_ms: elapsed,
      processing_log: processingLog,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("organize-knowledge error:", e);
    const elapsed = Date.now() - startTime;
    processingLog.total_time_ms = elapsed;
    processingLog.error = e.message;

    return new Response(JSON.stringify({
      organized_content: "Erro no processamento. Reprocesse manualmente.",
      taxonomy: {
        titulo_sugerido: "",
        resumo: "Erro no processamento. Reprocesse manualmente.",
        tags: [],
        chunks: [],
        taxonomia: getEmptyTaxonomia(),
        processadoEm: new Date().toISOString(),
        cerebroVersao: "orion-v2",
        status: "pendente_reprocessamento",
        erro: e.message,
      },
      processing_time_ms: elapsed,
      processing_log: processingLog,
      error: e.message,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
