import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o curador de conhecimento da NatLeva, uma agência de viagens premium.

Sua tarefa é receber conhecimento bruto extraído de vídeos do YouTube e REORGANIZÁ-LO para ser útil como treinamento dos agentes de atendimento da NatLeva.

REGRAS CRÍTICAS DE FILTRAGEM:
0. CONFIDENCIALIDADE DE FORNECEDORES (PRIORIDADE MÁXIMA): NUNCA cite nomes de fornecedores, operadoras, consolidadoras, plataformas de reserva, apps de pagamento ou parceiros comerciais (ex: Trip.com, Booking, Expedia, Hotelbeds, CVC, Flytour, Omnibees, Alipay, WeChat Pay, Klook, GetYourGuide, Viator, etc.). Substitua SEMPRE por termos genéricos como "a NatLeva providencia", "organizamos através dos nossos canais", "cuidamos de toda a logística", "a NatLeva orienta sobre as melhores opções de pagamento local". O cliente e o agente NÃO precisam saber QUEM são nossos fornecedores — apenas que a NatLeva RESOLVE.
1. REMOVA qualquer menção a "viajar sem agência", "economizar sem agência", "organizar por conta própria", "não precisa de agência" ou qualquer incentivo a não usar serviços de agência de viagens. Esses trechos são IRRELEVANTES e PREJUDICIAIS ao treinamento dos agentes.
2. REMOVA dicas de como o viajante fez tudo sozinho — os agentes da NatLeva fazem isso PELO cliente.
3. TRANSFORME dicas de "faça você mesmo" em argumentos de venda: ex: "é complicado reservar trens na China" → "A NatLeva cuida de todas as reservas de transporte interno, incluindo trens-bala, para que o cliente não precise se preocupar."
4. MANTENHA todas as informações úteis sobre destinos: cultura, gastronomia, pontos turísticos, clima, transporte local, dicas práticas, preços de referência, experiências recomendadas.
5. MANTENHA informações sobre documentação, vistos, seguros, vacinas.
6. ADICIONE uma seção "Argumentos de Venda" com pontos que os agentes podem usar para convencer clientes sobre esse destino.
7. ADICIONE uma seção "Alertas para o Agente" com coisas que o agente precisa saber (ex: "pagamentos por QR code são predominantes na China, orientar cliente a levar dinheiro como backup").

FORMATO DE SAÍDA (markdown):

## Resumo do Destino
[Resumo focado no que o AGENTE precisa saber para vender e orientar o cliente]

## Informações Essenciais
[Dados práticos: moeda, idioma, fuso, clima, melhor época, documentação]

## Experiências & Roteiro Sugerido
[O que recomendar ao cliente, pontos turísticos, experiências únicas, gastronomia]

## Logística & Transporte
[Como funciona o transporte local, o que a NatLeva pode providenciar]

## Argumentos de Venda
[Por que o cliente PRECISA de uma agência para esse destino — baseado nas complexidades reais mencionadas no vídeo]

## Alertas para o Agente
[Cuidados, pegadinhas, informações críticas que o agente deve saber]

## Dicas de Atendimento
[Como abordar esse destino com o cliente, perguntas para fazer, como apresentar]

Seja ESPECÍFICO, cite dados reais do vídeo. NÃO invente informações que não estavam no conteúdo original.`;

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
      ? `Aqui está o CONHECIMENTO BRUTO extraído de um vídeo do YouTube:\n\n${content}\n\n---\n\nE aqui está a TRANSCRIÇÃO ORIGINAL do vídeo para referência (use para extrair detalhes que possam ter sido perdidos):\n\n${transcript.slice(0, 30000)}`
      : `Aqui está o CONHECIMENTO BRUTO extraído de um vídeo do YouTube. Reorganize para uso dos agentes da NatLeva:\n\n${content}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
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
    const organized = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ organized_content: organized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
