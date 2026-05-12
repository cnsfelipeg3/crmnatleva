## Objetivo

Transformar a aba **Analytics** da proposta numa central de inteligência completa, em tempo real, sem campos vazios e com leitura clara do comportamento do cliente.

## Diagnóstico do estado atual

A coleta de dados já existe (`proposal_viewers`, `proposal_interactions`, `proposal_clicks`, `proposal_shares`), mas o painel mostra zeros porque:

1. **Tempo total · Engajamento · Score = 0** · O `useProposalTracking` só persiste `total_time_seconds` e `engagement_score` no `unmount` do componente. Em mobile (Safari/iOS) o cliente fecha a aba e o evento nunca dispara, então só sobra o `active_seconds` parcial.
2. **0/0 Compartilhamentos** · sem botão visível de compartilhar no público; nada gera registro em `proposal_shares`.
3. **Mapa de calor vazio** · canvas de aspect 9:18 com poucos cliques, sem referência visual da proposta por trás.
4. **Sem realtime** · refetch a cada 30s, então nada "pulsa" enquanto o cliente está navegando ao vivo.
5. **Indicadores faltando** · taxa de retorno, scroll médio, "ao vivo agora", funil de seções, comparação dispositivo, hora de pico, tempo até primeiro engajamento, taxa de CTA, geolocalização visual.

## O que será entregue

### 1. Tracking confiável (corrige os zeros)

Atualizar `src/hooks/useProposalTracking.ts`:
- Persistir `total_time_seconds` + `engagement_score` + `scroll_depth_max` a cada heartbeat de 15s (hoje só vai `active_seconds`).
- Usar `navigator.sendBeacon` no `pagehide` para garantir flush no fechamento mobile.
- Adicionar evento `first_engagement` (primeiro scroll real ou primeiro clique) para calcular tempo até engajar.
- Registrar evento `return_visit` quando `total_views > 1`.

### 2. Realtime ao vivo

No `ProposalAnalyticsPanel`:
- Subscrever via Supabase Realtime nas tabelas `proposal_viewers`, `proposal_interactions`, `proposal_clicks` filtradas por `proposal_id` e invalidar as queries do React Query (refetch instantâneo).
- Indicador "AO VIVO" piscando quando há `last_active_at` < 60s.
- Card "Visitantes online agora" com avatar + seção atual.

### 3. KPIs reformulados (zero campo vazio)

Substituir os 7 cards atuais por uma grade de **12 indicadores**:
- Visualizações totais
- Visitantes únicos
- Tempo total + tempo médio por visita
- Engajamento médio (com cor por faixa: frio/morno/quente)
- Scroll profundo médio (%)
- Taxa de retorno (% que voltou 2+ vezes)
- Cliques em CTAs / total
- Cliques no WhatsApp
- Compartilhamentos · aberturas
- Tempo até primeiro engajamento (mediana)
- Dispositivo dominante (com %)
- Hora de pico (heatmap horário)

Quando um KPI tem zero, mostra placeholder explicativo ("aguardando primeiro acesso") em vez de "0".

### 4. Novos painéis

- **Linha do tempo de atividade** · gráfico de área (recharts) com visualizações por hora dos últimos 7 dias.
- **Funil de seções** · % de visitantes que chegou em cada seção (Hero -> Voos -> Hotéis -> Valores -> CTA), revelando onde perdem interesse.
- **Mapa geográfico** · lista compacta agrupada por cidade/país com bandeira e nº de visitantes.
- **Heatmap melhorado** · usa o screenshot da proposta como fundo (já temos `coverImageUrl`); fallback para grid neutro com labels de seção.
- **Top elementos clicados** · ranking com texto + nº cliques + % do total (já existe parcial, será polido).
- **Visitantes detalhados** · adicionar:
  - Status ao vivo (bolinha verde se < 60s)
  - Tempo ativo vs tempo total
  - Histórico de retornos (3x em datas X, Y, Z)
  - Última seção vista
  - Botão "Enviar follow-up no WhatsApp" usando o telefone do cliente, com mensagem sugerida pelo score.
- **Insights da Nath** · 3-5 sugestões automáticas baseadas em regras: "Cliente Karina viu 5x mas não clicou em CTA -> sugerir desconto", "Pico de acessos às 22h -> melhor horário para enviar follow-up", "Mobile concentra 80% -> revisar layout mobile".

### 5. Compartilhamento

- Adicionar botão "Compartilhar com a família" na view pública (`ProposalPublicView`) que cria registro em `proposal_shares` e gera link com `?ref=share_token`.
- Quando alguém abre via `?ref=`, incrementa `open_count` e marca `referred_by_share_id` no novo viewer.

### 6. Layout · responsivo

- Grid mobile-first: 2 colunas em sm, 3 em md, 4 em lg para KPIs.
- Cards com altura fixa em desktop, scroll interno em mobile.
- Tema claro/escuro respeitado via tokens semânticos.
- Sem emojis, ícones lucide-react com semântica clara.

## Arquivos afetados

**Editar:**
- `src/components/proposal/ProposalAnalyticsPanel.tsx` (reescrita completa)
- `src/hooks/useProposalTracking.ts` (heartbeat persistindo todos os campos + sendBeacon)
- `src/pages/ProposalPublicView.tsx` (botão compartilhar)

**Criar:**
- `src/components/proposal/analytics/KpiGrid.tsx`
- `src/components/proposal/analytics/LiveVisitorsCard.tsx`
- `src/components/proposal/analytics/SectionFunnelCard.tsx`
- `src/components/proposal/analytics/HourlyActivityChart.tsx`
- `src/components/proposal/analytics/GeographicCard.tsx`
- `src/components/proposal/analytics/AiInsightsCard.tsx`
- `src/components/proposal/analytics/ViewerDetailRow.tsx`
- `src/lib/proposalAnalytics.ts` (cálculos puros: funil, mediana, score, hora de pico)

**Sem mudança em DB** · a estrutura atual já comporta tudo; só vou usar melhor.

## Garantias

- Não quebra a coleta existente (campos atuais continuam preenchidos).
- Sem deletar dados nem migrações destrutivas.
- Componentes pequenos, isolados, com responsabilidade única.
- TypeScript estrito, textos pt-BR, design tokens semânticos, sem emojis.

## Fora do escopo desta entrega

- Exportar PDF do relatório de analytics (posso adicionar depois se quiser).
- Comparar performance entre múltiplas propostas (dashboard cross-proposal).

Posso seguir? Confirma e eu construo.