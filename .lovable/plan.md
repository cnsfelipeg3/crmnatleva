## Objetivo

Substituir todos os 49 inputs nativos `type="date"` espalhados em 23 arquivos pelo componente `DatePartsInput` (mesmo usado no cadastro de passageiro). Sem mexer em dados, apenas UX e formato de entrada.

## Por que é seguro

- O `DatePartsInput` já existe e está testado.
- Ele emite o mesmo formato ISO `YYYY-MM-DD` que o `<input type="date">` produz hoje.
- Nenhuma migração de banco, nenhuma mudança em queries, nenhum risco de perda de dados.
- A troca é puramente visual/UX: campo segmentado DD / MM / AAAA com auto-tab, back-tab, paste inteligente e validação.

## Escopo (49 ocorrências em 23 arquivos)

Agrupados por área para execução em lotes incrementais:

**Lote 1 · RH (já parcial)**
- `src/components/rh/EmployeeFormTabs.tsx`
- `src/pages/rh/MetasBonus.tsx`
- `src/pages/rh/FeedbacksRH.tsx`
- `src/pages/rh/Desempenho.tsx`
- `src/pages/rh/ContratosDocumentos.tsx`
- `src/pages/rh/Advertencias.tsx`

**Lote 2 · Vendas / Propostas / Operações**
- `src/pages/NewSale.tsx`
- `src/pages/SaleDetail.tsx`
- `src/pages/TripAlterations.tsx`
- `src/pages/ProposalEditor.tsx`
- `src/components/proposal/ProposalFlightSearch.tsx`
- `src/components/proposal/FlightSegmentForm.tsx`
- `src/components/FlightRegistrationSection.tsx`
- `src/components/HotelEntriesEditor.tsx`
- `src/components/SalePaymentsEditor.tsx`

**Lote 3 · Passageiros / Financeiro**
- `src/pages/Passengers.tsx`
- `src/pages/PassengerProfile.tsx`
- `src/pages/financeiro/Comissoes.tsx`
- `src/pages/financeiro/FechamentoFornecedores.tsx`

**Lote 4 · Portal do viajante**
- `src/pages/portal/PortalProfile.tsx`
- `src/pages/portal/PortalNewQuote.tsx`
- `src/pages/portal/PortalFinance.tsx`
- `src/components/portal/PortalExpenseSplit.tsx`

## Padrão de substituição

Antes:
```tsx
<Input type="date" value={form.data} onChange={(e) => setForm({...form, data: e.target.value})} />
```

Depois:
```tsx
<DatePartsInput value={form.data} onChange={(iso) => setForm({...form, data: iso})} />
```

Regras de aplicação por contexto:
- **Datas de nascimento**: `disableFuture`
- **Validade de documento / vencimento**: `disablePast`
- **Datas de viagem (embarque/desembarque, check-in/out)**: sem restrição (pode ser passada para registro retroativo)
- **Filtros de período**: sem restrição

## Fora do escopo (mantidos como estão)

- Date pickers de **filtros inteligentes** (`SmartFilters.tsx`) que usam shadcn Calendar com seleção por range · UX já validada e diferente.
- Componentes de **visualização** (TripCard, JourneyHero, ItineraryDocument) que apenas exibem datas, não recebem input.
- `calendar.tsx` (componente base shadcn).

## Execução

Faço os 4 lotes em sequência, um commit por lote, para você validar cada área antes de seguir. Se preferir tudo de uma vez, executo em uma única passada · me avise.

## Riscos

Praticamente zero. O componente já está em produção no cadastro de passageiro funcionando bem. Caso algum campo específico tenha lógica customizada (ex.: `min`/`max` dinâmico), eu trato no momento da troca preservando o comportamento.
