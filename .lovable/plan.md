

# Plano: Turbinar a Inteligência do ÓRION

## Diagnóstico Atual

O ÓRION hoje tem 3 gargalos principais que causam perda de dados:

1. **Modelo limitado**: Usa Claude Sonnet 4 via API Anthropic direta (custo extra, sem necessidade — já existe Lovable AI com modelos superiores)
2. **Limite de saída baixo**: 12.000 tokens de output — para vídeos longos com muitos dados (ex: programação de jogos da Copa), o JSON é truncado e dados são perdidos
3. **Processamento single-pass**: Uma única chamada tenta extrair TUDO — se o conteúdo é muito denso, a IA prioriza algumas seções e ignora outras
4. **Truncamento de entrada agressivo**: 40K chars com corte no meio do texto — dados importantes no meio do vídeo podem ser perdidos

## O Que Vai Mudar

### 1. Migrar para Lovable AI com modelo mais potente
- Trocar de Claude Sonnet (Anthropic API direta) para **Gemini 2.5 Pro** via Lovable AI Gateway
- Vantagens: contexto maior (1M tokens), melhor extração de dados estruturados, sem custo extra de API key Anthropic
- Elimina dependência da `ANTHROPIC_API_KEY` para essa função

### 2. Aumentar limite de saída para 16.000 tokens
- De 12K para 16K tokens — evita truncamento de JSONs grandes (programações de eventos, listas de hotéis)

### 3. Processamento em 2 passadas para conteúdos longos
- **Passada 1**: Extração completa de dados factuais (fatos, programação, nomes, datas, locais)
- **Passada 2**: Análise estratégica e vendas (resumo, entendimento completo, argumentos, gatilhos)
- Merge automático dos resultados
- Ativado apenas para conteúdos > 15.000 caracteres (vídeos curtos continuam single-pass)

### 4. Aumentar limite de entrada para 60.000 caracteres
- Com Gemini 2.5 Pro, podemos processar muito mais texto sem truncar

### 5. Log de processamento visível
- Salvar no resultado: modelo usado, tokens consumidos, tempo, se usou 1 ou 2 passadas
- Visível na UI para diagnóstico

## Detalhes Técnicos

- **Arquivo editado**: `supabase/functions/organize-knowledge/index.ts`
- Substituir `callOrion` (Anthropic) por chamada ao Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Usar `LOVABLE_API_KEY` (já disponível) em vez de `ANTHROPIC_API_KEY`
- Modelo: `google/gemini-2.5-pro`
- Para a passada 1, usar um system prompt focado em extração factual pura
- Para a passada 2, usar o prompt atual focado em análise estratégica
- Merge inteligente: dados factuais da passada 1 preenchem campos que a passada 2 não cobriu

## Resultado Esperado

- Estádios, datas, horários e programações completas não serão mais perdidos
- Vídeos longos terão extração muito mais completa
- Custo menor (sem API Anthropic separada)
- Diagnóstico fácil quando algo não sair como esperado

