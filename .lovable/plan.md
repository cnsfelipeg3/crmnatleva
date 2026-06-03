## O que já existe (não vou mexer)

- `affiliates.ref_code` único por afiliado
- Tabela `affiliate_referrals` registra cliques, leads, conversões
- `RefTracker` captura `?ref=` em `/loja` e `/p/:slug` e grava em `affiliate_referrals`
- `affiliate_commissions` já calcula comissão por venda
- `/vitrine/indicacoes` mostra leads do afiliado (versão simples)
- `/admin/vitrine` gerencia status dos afiliados

## O que falta · serão as adições

### 1 · Link personalizado por pacote na prateleira do afiliado

Hoje o afiliado tem só **1 link genérico** em `/vitrine/materiais` (`/loja?ref=CODIGO`).
Vou criar uma página `/vitrine/produtos` (Prateleira do Afiliado) listando todos os pacotes ativos com:
- Card do pacote (capa, título, preço, comissão em R$)
- Botão **"Copiar link"** que gera `https://crmnatleva.lovable.app/p/<slug-do-pacote>?ref=<ref_code>`
- Botão **"Compartilhar no WhatsApp"** com mensagem pronta
- Mini stats por pacote (cliques, leads, vendas dos últimos 30d)

### 2 · Enriquecer o tracking

Pequena expansão na tabela `affiliate_referrals` para capturar mais sinais:
- `referrer` (página de origem · de onde o lead clicou)
- `device_type` (mobile/desktop/tablet)
- `country`, `city` (via header)
- `session_id` (uuid no localStorage pra agrupar várias visitas do mesmo visitante)
- `time_on_page_seconds` (ping do `/p/:slug`)

`RefTracker` continua o mesmo · só passa a enviar esses campos extras.

### 3 · Dashboard de leads do afiliado · `/vitrine/leads`

Nova página com:
- **KPIs do topo:** total de cliques · leads únicos · conversões · taxa de conversão · receita gerada · comissão acumulada
- **Gráfico:** linha de cliques vs leads vs vendas (últimos 30/60/90 dias)
- **Top pacotes:** ranking dos pacotes que mais geraram cliques/leads/conversões pra ele
- **Funil:** cliques → leads → negociando → convertidos
- **Tabela detalhada de leads:** data, pacote visitado, dispositivo, cidade, status do funil, comissão estimada, link da conversa
- Filtros por período, pacote, status

### 4 · Dashboard do gestor · `/admin/vitrine/leads`

Nova aba dentro do `/admin/vitrine` com visão consolidada:
- **KPIs globais:** total de afiliados ativos, cliques agregados, leads, conversões, receita gerada por afiliados, comissões pagas/pendentes
- **Ranking dos afiliados** por cliques, leads, conversões, receita
- **Top pacotes vendidos por afiliados**
- **Tabela "Quem trouxe quem":** lead → afiliado → pacote → status → valor
- **Heatmap de horários** com mais movimento de cliques
- Drilldown: clica num afiliado e vê o painel individual dele

## Mudanças no banco · migration mínima

```sql
ALTER TABLE affiliate_referrals
  ADD COLUMN device_type text,
  ADD COLUMN referrer text,
  ADD COLUMN country text,
  ADD COLUMN city text,
  ADD COLUMN session_id uuid,
  ADD COLUMN time_on_page_seconds int;

CREATE INDEX idx_aff_ref_affiliate_created ON affiliate_referrals(affiliate_id, created_at DESC);
CREATE INDEX idx_aff_ref_product ON affiliate_referrals(product_id);
```

E vou popular esses campos novos nos ~734 registros fictícios atuais com dados realistas (dispositivo, cidade, etc).

## Arquivos novos / alterados

**Novos**
- `src/pages/vitrine/VitrineProdutos.tsx` · prateleira com link personalizado
- `src/pages/vitrine/VitrineLeads.tsx` · dashboard de leads do afiliado
- `src/pages/admin/AdminVitrineLeads.tsx` · visão do gestor
- `src/components/vitrine/useAffiliateLeadsStats.ts` · hook compartilhado

**Alterados (sem quebrar o atual)**
- `src/lib/affiliateTracking.ts` · adiciona session_id, device, referrer
- `src/components/vitrine/RefTracker.tsx` · ping de tempo na página
- `src/components/vitrine/AffiliateSidebar.tsx` · adiciona itens "Prateleira" e "Leads"
- `src/pages/admin/AdminVitrine.tsx` · adiciona tab "Leads & Tráfego"
- `src/App.tsx` · novas rotas

## O que NÃO mexo (garantia de não quebrar)

- `/vitrine/comissoes`, `/vitrine/indicacoes`, `/vitrine/perfil`, `/vitrine/cadastro`, `/vitrine/home`, `/vitrine/metas`, `/vitrine/materiais`, `/vitrine/premiacoes`
- Tabela `affiliates`, `affiliate_commissions` (estrutura)
- Lógica de captura de `?ref=` continua idêntica · só adiciona campos novos

## Ordem de execução

1. Migration (campos novos + índices)
2. Popular campos nos dados fictícios
3. Enriquecer `affiliateTracking.ts` e `RefTracker`
4. Criar `VitrineProdutos` (prateleira com links personalizados)
5. Criar `VitrineLeads` (dashboard do afiliado)
6. Criar `AdminVitrineLeads` (visão do gestor) + tab no admin
7. Atualizar sidebar e rotas

Posso seguir?