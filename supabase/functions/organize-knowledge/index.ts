import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── ÓRION v1 — System Prompt ───
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


// ─── Truncation Strategy (60% head + 35% tail) ───
function truncateForOrion(text: string, maxChars = 40000): string {
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
    // Layer 1: clean markdown
    let clean = (rawText || "").trim();
    clean = clean.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();

    // Layer 2: find JSON boundaries
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("JSON nao encontrado na resposta");
    }
    const jsonStr = clean.slice(firstBrace, lastBrace + 1);

    // Layer 3: parse
    const parsed = JSON.parse(jsonStr);

    // Layer 4: validate required fields
    const result = {
      titulo_sugerido: parsed.titulo_sugerido || "",
      resumo: parsed.resumo || "Conteudo processado pelo ORION.",
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
      cerebroVersao: "orion-v1",
      status: "processado",
    };
    // Merge top-level fatos_chave into taxonomia if taxonomia doesn't have them
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
      cerebroVersao: "orion-v1",
      status: "pendente_reprocessamento",
      erro: e.message,
    };
  }
}

// ─── Call Claude with retry ───
async function callOrion(systemPrompt: string, content: string, retries = 1): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 12000,
          system: systemPrompt,
          messages: [{ role: "user", content }],
        }),
      });

      if (!r.ok) {
        if (r.status === 429) {
          if (attempt < retries) { await new Promise(w => setTimeout(w, 2000)); continue; }
          throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
        }
        if (r.status === 402) {
          throw new Error("Créditos insuficientes na Anthropic.");
        }
        const errText = await r.text();
        console.error("Anthropic error:", r.status, errText);
        if (attempt < retries) { await new Promise(w => setTimeout(w, 2000)); continue; }
        throw new Error(`API retornou ${r.status}`);
      }

      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      return d?.content?.[0]?.text?.trim() || "";
    } catch (e) {
      if (attempt < retries) { await new Promise(w => setTimeout(w, 2000)); continue; }
      throw e;
    }
  }
  throw new Error("callOrion: todas as tentativas falharam");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const { content, transcript, title, tipo } = await req.json();
    if (!content && !transcript) {
      return new Response(JSON.stringify({ error: "Conteúdo não fornecido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user message with intelligent truncation
    const rawContent = content || transcript || "";
    const truncated = truncateForOrion(rawContent, 40000);

    let userMessage: string;
    if (transcript && transcript.length > 200 && content) {
      const truncatedTranscript = truncateForOrion(transcript, 20000);
      userMessage = `Documento: ${title || "Conteudo"}\nTipo: ${tipo || "youtube"}\nConteudo:\n${truncated}\n\n---\n\nTranscricao original para referencia:\n${truncatedTranscript}`;
    } else {
      userMessage = `Documento: ${title || "Conteudo"}\nTipo: ${tipo || "texto"}\nConteudo:\n${truncated}`;
    }

    // Call ÓRION with retry
    const rawResponse = await callOrion(ORION_SYSTEM_PROMPT, userMessage);
    const result = parseOrionResponse(rawResponse);

    const elapsed = Date.now() - startTime;

    return new Response(JSON.stringify({
      organized_content: result.resumo,
      taxonomy: result,
      processing_time_ms: elapsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("organize-knowledge error:", e);
    const elapsed = Date.now() - startTime;

    // Return fallback instead of crashing
    return new Response(JSON.stringify({
      organized_content: "Erro no processamento. Reprocesse manualmente.",
      taxonomy: {
        titulo_sugerido: "",
        resumo: "Erro no processamento. Reprocesse manualmente.",
        tags: [],
        chunks: [],
        taxonomia: getEmptyTaxonomia(),
        processadoEm: new Date().toISOString(),
        cerebroVersao: "orion-v1",
        status: "pendente_reprocessamento",
        erro: e.message,
      },
      processing_time_ms: elapsed,
      error: e.message,
    }), {
      status: 200, // Return 200 with error info so frontend doesn't crash
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
