## Aba Marketing · Geração de Artes com IA

### Objetivo
Adicionar uma 7ª aba "Marketing" no editor de produto (`src/pages/produtos/ProdutoEditor.tsx`) que, a partir dos dados já cadastrados (título, destino, datas, preço, condições, capa), gera artes prontas para Instagram/Reels/Feed/Stories respeitando a identidade visual da NatLeva.

### Resposta: qual modelo de IA usar
Hoje, dentro do Lovable AI Gateway (sem chave externa), o melhor modelo para geração de imagem comercial com texto legível é:

- **`google/gemini-3-pro-image-preview`** (Nano Banana Pro) · melhor qualidade, melhor tipografia, ideal para peça final de venda. Mais lento e mais caro.
- **`google/gemini-3.1-flash-image-preview`** (Nano Banana 2) · qualidade muito próxima da Pro, bem mais rápido e barato. Bom para gerar variações em lote.
- **`google/gemini-2.5-flash-image`** (Nano Banana 1) · fallback rápido e barato, qualidade menor em texto.

Estratégia recomendada: **Pro para a "arte hero"** (a principal que o usuário escolhe), **Flash 2 para variações** (formatos extras e alternativas de layout). Edição/refino usa o mesmo endpoint passando a imagem anterior + prompt de ajuste.

### Identidade visual NatLeva (locked no prompt)
Vamos centralizar num arquivo `src/lib/marketing/natlevaBrand.ts` com:
- Paleta: `#FFFFFF` cards, `#111827` texto, dourado `#C9A84C` (gold-line de 4px), apoio neutro.
- Tipografia: sans serif moderna (Inter/Manrope) para corpo, display elegante para headline.
- Selo "NatLeva Viagens" + handle `@natlevaviagens` discreto no rodapé da peça.
- Linguagem visual: fotografia real do destino como background com overlay escuro suave, headline grande, badge de preço "A partir de R$ X · Xx no cartão", CTA "Garanta sua vaga" + WhatsApp `+55 (11) 96639-6692`.
- Sem emojis. Sem hyphens. Mid-dot (·) como separador. Tom premium.

### Formatos suportados (botões)
- Feed quadrado · 1080x1080 (1:1)
- Stories / Reels capa · 1080x1920 (9:16)
- Feed vertical · 1080x1350 (4:5)
- Banner horizontal · 1920x1080 (16:9)

(O modelo aceita esses aspect ratios; pedimos a imagem nesse ratio e armazenamos a resolução final.)

### UX da aba Marketing
1. Cabeçalho explicando "Gere artes prontas pra postar com a identidade NatLeva".
2. Card "Briefing da peça" pré-preenchido a partir do produto:
   - Headline sugerida (editável) · ex: "Cancun · 7 noites all-inclusive"
   - Subheadline (editável) · ex: "Saída 12/out · A partir de R$ 6.890"
   - CTA (editável) · ex: "Garanta sua vaga"
   - Tom (select): Promocional · Sofisticado · Urgência · Família
   - Imagem de referência: usa `cover_image_url` do produto (com opção de trocar por outra da galeria).
3. Seletor de formatos (multi-select chips: Feed, Stories/Reels, Vertical, Horizontal).
4. Botão **"Gerar artes"** · dispara N gerações em paralelo (uma por formato selecionado), cada uma com 2 variações.
5. Galeria de resultados com:
   - Preview grande
   - Botão **Baixar** (PNG)
   - Botão **Refinar** (abre input "ex: deixe a headline maior, troque o dourado por azul") · re-gera usando endpoint de edição passando a imagem anterior.
   - Botão **Salvar na mídia do produto** (anexa URL ao `gallery` do produto).
6. Histórico de artes geradas para o produto (persistido).

### Backend · Edge Function nova
`supabase/functions/marketing-image-gen/index.ts`
- Input: `{ product_id, format, headline, subheadline, cta, tone, reference_image_url, refine_from_url?, refine_prompt? }`
- Monta um **system prompt de marca** (cores hex, tipografia, regras: sem emoji, mid-dot, rodapé com @natlevaviagens e WhatsApp, selo NatLeva).
- Monta o **user prompt** combinando briefing + referência fotográfica (passada como `image_url` para fundo) + dimensões do formato.
- Chama Lovable AI Gateway:
  - Primeira geração da peça hero → `google/gemini-3-pro-image-preview`
  - Variações e refinos → `google/gemini-3.1-flash-image-preview`
- Recebe base64, faz upload para Supabase Storage (bucket público `marketing-assets`, path `{product_id}/{timestamp}-{format}.png`) e retorna URL pública.
- Trata 429/402 com mensagem clara para o usuário.

### Banco de dados
Migration nova:
- Bucket público `marketing-assets`.
- Tabela `product_marketing_assets`:
  - `id uuid pk`, `product_id uuid`, `format text`, `url text`, `prompt jsonb` (briefing usado), `model text`, `created_at timestamptz`.
  - RLS desabilitada (padrão do projeto, anon ALL conforme memória).

### Arquivos a criar / editar
1. `src/pages/produtos/ProdutoEditor.tsx` · adicionar `<TabsTrigger value="marketing">Marketing</TabsTrigger>` e `<TabsContent value="marketing">` renderizando o novo componente.
2. `src/components/produtos/MarketingTab.tsx` (novo) · UI completa da aba.
3. `src/components/produtos/MarketingArtCard.tsx` (novo) · card de cada arte gerada (preview + ações).
4. `src/lib/marketing/natlevaBrand.ts` (novo) · constantes de marca + função `buildBrandPrompt(briefing, format)`.
5. `src/lib/marketing/formats.ts` (novo) · definição dos 4 formatos com aspect ratio e dimensões.
6. `supabase/functions/marketing-image-gen/index.ts` (nova edge function).
7. Migration para tabela `product_marketing_assets` + bucket `marketing-assets`.

### Fora de escopo desta entrega
- Publicação automática nas redes sociais (Meta API).
- Editor manual estilo Canva (camadas/drag).
- Vídeo/Reels animado (apenas capa estática · vídeo fica para fase 2 com `videogen`).

Aprova esse escopo? Se quiser, ajusto: (a) reduzir para só 2 formatos no MVP, (b) começar só com Nano Banana Pro sem variações, ou (c) incluir geração de legenda pronta para copiar/colar junto da arte.
