## Prateleira NatLeva · Marketplace de Viagens Prontas

Transformar o módulo atual de "Produtos" (passeios soltos) em uma **Prateleira NatLeva** completa, capaz de cadastrar qualquer tipo de produto pronto (aéreo, hospedagem, pacote, passeio) com datas, preços, condições de pagamento e página de vendas individual + vitrine pública estilo marketplace.

---

### 1. Renomeação e nova navegação

- Renomear o item de menu "Produtos" para **"Prateleira NatLeva"** dentro de Viagens.
- Rotas:
  - `/prateleira` (admin · lista interna com filtros, status, busca)
  - `/prateleira/novo` e `/prateleira/:slug/editar` (editor)
  - `/prateleira/:slug` (página de vendas individual · pública)
  - `/p` (vitrine pública estilo marketplace · `crmnatleva.lovable.app/p`)
- Manter rotas antigas `/produtos*` redirecionando para evitar quebra de links já divulgados.

---

### 2. Modelo de dados (extensão da tabela existente)

A tabela `experience_products` será expandida (não recriada) para suportar qualquer tipo de produto. Novos campos:

**Tipo e datas**
- `product_kind` (enum: `aereo`, `hospedagem`, `pacote`, `passeio`, `cruzeiro`, `outros`)
- `departure_date`, `return_date` (datas fixas)
- `flexible_dates` (boolean · "saídas sob consulta")
- `available_dates` (jsonb · múltiplas saídas: `[{departure, return, seats_left}]`)

**Preços e condições**
- `price_promo` (preço promocional)
- `price_label` (ex: "por pessoa", "casal", "total")
- `installments_max`, `installments_no_interest`, `pix_discount_percent`
- `payment_terms` (jsonb estruturado: cartão, PIX, boleto, condições especiais)
- `is_promo` + `promo_badge` (ex: "Black Friday", "Últimas vagas")

**Origem/Destino e logística**
- `origin_city`, `origin_iata`
- `destination_iata`
- `airline`, `hotel_name`, `hotel_stars`
- `nights`, `pax_min`, `pax_max`, `seats_total`, `seats_left`

**Vendas e SEO**
- `sale_page_enabled` (toggle página individual ligada/desligada)
- `seo_title`, `seo_description`, `og_image`
- `whatsapp_cta_text` (mensagem pré-preenchida ao clicar "Quero esse")
- `view_count`, `lead_count` (analytics)

Todos os arrays (includes, excludes, highlights) e gallery permanecem `jsonb`.

**Nova tabela** `prateleira_leads`:
- Captura quem clicou em "Tenho interesse" em cada produto
- Campos: `product_id`, `name`, `email`, `phone` (com country code), `message`, `viewed_at`, `ip`, `device`, `utm_*`
- Integra com o pipeline existente (vira lead/cotação automaticamente)

---

### 3. Editor flexível (admin)

Editor em **abas** para não virar formulário gigante:

1. **Básico** — tipo de produto, título, slug, destino, datas, status (ativo/rascunho/pausado)
2. **Mídia** — capa + galeria (drag & drop, reorder)
3. **Conteúdo de venda** — descrição curta, descrição longa (rich text), highlights, includes/excludes, "como funciona"
4. **Preço & Pagamento** — preço cheio, promocional, parcelamento, PIX, condições especiais (campo livre), badge promocional
5. **Logística** — origem, destino, cia aérea, hotel, noites, vagas, datas múltiplas
6. **Página de vendas** — toggle ativo/inativo, SEO (title, description, OG image), mensagem do botão WhatsApp, preview ao vivo

Todos os campos opcionais — flexibilidade total. Validação só no essencial (título + tipo + destino).

---

### 4. Página de vendas individual (`/prateleira/:slug`)

Pública, otimizada para conversão:

- Hero com capa, badge promo, título, datas, preço (de/por quando promocional)
- Galeria (carrossel)
- Highlights em cards
- Bloco de descrição/itinerário
- Includes vs excludes (lado a lado, com ícones lucide)
- **Bloco de pagamento destacado** — parcelamento, PIX, condições especiais
- CTA fixo ("Tenho interesse") → modal com nome + email + WhatsApp (PhoneInput com bandeirinhas, BR pré-selecionado · mesmo padrão do `ProposalEmailGate`)
- Ao enviar: grava em `prateleira_leads`, dispara WhatsApp para o número da agência com contexto + abre WhatsApp do cliente com mensagem pré-preenchida
- SEO completo (title, meta, OG, JSON-LD `Product`)
- Tracking de view_count + tempo na página

---

### 5. Vitrine marketplace (`/p`)

Pública, estilo Booking/Airbnb mas com a estética NatLeva:

- Hero com search bar (destino, mês, tipo de produto, faixa de preço)
- Filtros laterais: tipo de produto, destino, faixa de preço, datas, "só promoções"
- Grid de cards (capa, badge promo, destino, datas, preço de/por, parcelamento)
- Ordenação: relevância, menor preço, saindo em breve, novidades
- Cards clicam → página individual
- Empty state convidativo quando filtro vazio

---

### 6. Admin · lista interna (`/prateleira`)

- Cards/tabela com: capa thumb, título, tipo (badge), destino, datas, preço, status, views, leads
- Filtros: tipo, status (ativo/rascunho/pausado), destino, com/sem promoção
- Busca textual
- Ações em massa: ativar/pausar/duplicar/excluir
- Botão "Compartilhar" copia link da página individual
- Atalho "Ver na vitrine pública"

---

### 7. Integração com o resto do CRM

- Lead capturado vira automaticamente um item na fila de cotações (status "Lead Prateleira")
- Conversa no LiveChat já entra com contexto do produto que o cliente clicou
- Métricas aparecem no dashboard: produtos mais vistos, mais convertidos, taxa de conversão por produto

---

### 8. Detalhes técnicos

- Tabela `experience_products` recebe `ALTER TABLE ADD COLUMN` (sem perda de dados · produtos atuais viram `product_kind = 'passeio'`)
- Nova tabela `prateleira_leads` com índice em `product_id` e `created_at`
- Rotas públicas com `verify_jwt = false` no edge (se houver função de tracking)
- PhoneInput reusando o componente já criado para `ProposalEmailGate`
- Tema escuro/claro mantido em todas as telas novas
- Mobile-first rigoroso (vitrine e página de venda são as mais críticas · serão consumidas no celular via WhatsApp)
- Sem emojis · ícones lucide-react
- Tokens semânticos de cor (sem hex direto)

---

### Ordem sugerida de execução (3 fases)

**Fase 1 · Fundação**
- Migration estendendo `experience_products` + nova tabela `prateleira_leads`
- Renomear menu, ajustar rotas, redirects de `/produtos`
- Refatorar lista admin (`/prateleira`) com filtros novos

**Fase 2 · Editor + Página individual**
- Editor em abas com todos os campos novos
- Página de vendas pública `/prateleira/:slug` com captura de lead

**Fase 3 · Vitrine marketplace**
- Página `/p` com search, filtros e grid
- Integração de leads com pipeline de cotações
- Dashboard de métricas

---

Posso seguir nessa direção? Se quiser, ajusto qualquer parte antes de começar (ex: nome de rota, campos específicos que faltam, ou começar só pela Fase 1 e validar antes de avançar).