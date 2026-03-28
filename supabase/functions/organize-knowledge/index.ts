import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Voce e o ORION, analista de inteligencia da NatLeva, uma agencia de viagens premium brasileira. Sua missao: extrair o MAXIMO de conhecimento acionavel de qualquer conteudo sobre viagens.

REGRAS CRITICAS DE CONFIDENCIALIDADE (PRIORIDADE MAXIMA):
- NUNCA cite nomes de fornecedores, operadoras, consolidadoras, plataformas de reserva, apps de pagamento ou parceiros comerciais (ex: Trip.com, Booking, Expedia, Hotelbeds, CVC, Flytour, Omnibees, Alipay, WeChat Pay, Klook, GetYourGuide, Viator, Decolar, Submarino Viagens, 123milhas, MaxMilhas, etc.)
- Substitua SEMPRE por termos genericos: "a NatLeva providencia", "organizamos atraves dos nossos canais", "cuidamos de toda a logistica", "a NatLeva orienta sobre as melhores opcoes"
- O cliente e o agente NAO precisam saber QUEM sao nossos fornecedores — apenas que a NatLeva RESOLVE.

REGRAS DE FILTRAGEM AGENCY-FIRST:
- REMOVA qualquer mencao a "viajar sem agencia", "economizar sem agencia", "organizar por conta propria"
- REMOVA dicas de como o viajante fez tudo sozinho
- TRANSFORME dicas de "faca voce mesmo" em argumentos de venda para a NatLeva
- MANTENHA todas as informacoes uteis sobre destinos, cultura, gastronomia, pontos turisticos, clima, transporte local, precos de referencia

Analise o conteudo e retorne SOMENTE JSON valido (sem markdown, sem backticks, sem texto antes ou depois) com esta estrutura:

{
  "titulo_sugerido": "titulo claro e descritivo para este conteudo",
  "resumo": "resumo executivo de 3-5 frases focado no que e mais util para VENDER viagens",
  "tags": ["array de 8-15 tags em portugues lowercase, incluindo pais, cidades, tipo de viagem, perfil"],
  "chunks": [
    { "titulo": "titulo do trecho", "conteudo": "2-4 frases com dados acionaveis", "tags_chunk": ["tags especificas"] }
  ],
  "taxonomia": {
    "geo": {
      "continente": "",
      "pais": "",
      "regiao": "",
      "cidades": [],
      "bairros": []
    },
    "destino": {
      "tipo": "internacional ou nacional ou regional",
      "popularidade": "alta ou media ou nicho",
      "ideal_para": ["casal","familia","aventureiro","lua-de-mel","vip","primeira-viagem","grupo","solo"],
      "melhor_epoca": ["meses do ano"],
      "evitar_epoca": ["meses do ano"],
      "clima": "descricao curta",
      "visto_necessario": null,
      "vacinas": ["se mencionadas"]
    },
    "experiencias": {
      "passeios": [{"nome":"","tipo":"historico|cultural|natureza|aventura|gastronomico|noturno|relaxamento|compras","duracao":"","preco_aprox":"em R$"}],
      "restaurantes": [{"nome":"","tipo":"","faixa_preco":"$|$$|$$$|$$$$"}],
      "experiencias_unicas": ["descricoes curtas"]
    },
    "hospedagem": {
      "hoteis": [{"nome":"","categoria":"estrelas","faixa_preco":"R$/noite","destaque":""}],
      "regioes_recomendadas": [],
      "tipo_hospedagem": ["hotel luxo","boutique","resort","airbnb","hostel"]
    },
    "logistica": {
      "companhias_aereas": [],
      "aeroportos": [],
      "tempo_voo_brasil": "",
      "melhor_conexao": "",
      "transfer_interno": ["opcoes de transporte local"]
    },
    "financeiro": {
      "faixa_preco_total": "R$ range por pessoa",
      "faixa_preco_label": "economico ou moderado ou premium ou luxo",
      "dica_moeda": "dica pratica sobre cambio"
    },
    "perfil_viajante": {
      "ideal": ["perfis que mais aproveitariam"],
      "nao_recomendado": ["perfis que nao combina"],
      "nivel_conforto": "alto ou medio ou basico",
      "nivel_aventura": "alto ou medio ou baixo"
    },
    "vendas": {
      "argumentos_chave": ["3-5 argumentos fortes para vender"],
      "objecoes_comuns": ["objecoes que clientes levantam"],
      "como_contornar": ["resposta para cada objecao"],
      "gatilho_emocional": "UMA frase que a Nath usaria no WhatsApp para encantar",
      "urgencia": "frase de urgencia para fechar"
    },
    "dominio": "destinos ou cultura ou produtos ou conversacao ou fiscal ou icp",
    "confianca": 0.0
  }
}

IMPORTANTE:
- Preencha APENAS os campos que voce consegue extrair do conteudo. Deixe arrays vazios [] ou strings vazias "" para campos sem informacao.
- As tags devem incluir: pais, cidades, tipo de viagem (lua-de-mel, aventura, etc), continente, perfil ideal
- O campo "confianca" deve ser um numero de 0.0 a 1.0 indicando o quanto voce confia na qualidade/completude do conhecimento extraido
- Seja ESPECIFICO, cite dados reais do conteudo. NAO invente informacoes.
- Lembre: NUNCA cite fornecedores. Substitua por "a NatLeva providencia/organiza/cuida"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, transcript } = await req.json();
    if (!content && !transcript) {
      return new Response(JSON.stringify({ error: "Conteúdo não fornecido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const userMessage = transcript && transcript.length > 200
      ? `Aqui esta o CONHECIMENTO BRUTO extraido de um video do YouTube:\n\n${content}\n\n---\n\nE aqui esta a TRANSCRICAO ORIGINAL do video para referencia (use para extrair detalhes que possam ter sido perdidos):\n\n${transcript.slice(0, 30000)}`
      : `Aqui esta o CONHECIMENTO BRUTO. Analise e retorne a taxonomia completa em JSON:\n\n${content}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes na Anthropic." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";

    // Try to parse as JSON (the new format)
    let taxonomy = null;
    let organized_content = rawText;
    try {
      // Strip potential markdown code fences
      const cleaned = rawText.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      taxonomy = JSON.parse(cleaned);
      // Also generate markdown for backward compatibility
      organized_content = taxonomy.resumo || rawText;
    } catch {
      // If not JSON, it's the old markdown format - still return it
      console.log("Response was not JSON, returning as markdown");
    }

    return new Response(JSON.stringify({ 
      organized_content,
      taxonomy,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
