# NatLeva — Checklist de Regressão (QA Manual)

## Pré-requisitos
- [ ] Usuário logado no sistema
- [ ] Internet disponível (para Amadeus autocomplete)

---

## TESTE 1 — Criação de Venda End-to-End
1. [ ] Clicar "Nova Venda" no menu lateral
2. [ ] Pular Step 1 (IA) → clicar "Preencher Manualmente"
3. [ ] Step 2 - Dados Básicos:
   - [ ] Nome: "QA — Venda E2E"
   - [ ] Data fechamento: hoje
   - [ ] Pagamento: PIX
4. [ ] Step 3 - Passageiros: Adultos=2
5. [ ] Step 4 - Aéreo:
   - [ ] Origem: digitar "GRU" → selecionar "São Paulo/Guarulhos"
   - [ ] Destino: digitar "FCO" → selecionar "Roma/Fiumicino"
   - [ ] Data ida: data futura (+30 dias)
   - [ ] Data volta: data futura (+37 dias)
   - [ ] Companhia: "TP" ou "TAP"
6. [ ] Step 5 - Segmentos: preencher pelo menos 1 trecho ida
7. [ ] Step 6 - Hotel:
   - [ ] Digitar "Riu" → selecionar hotel sugerido
   - [ ] Check-in e checkout preenchidos
8. [ ] Step 7 - Financeiro:
   - [ ] Valor recebido: 10000
9. [ ] Step 8 - Revisão: clicar "Salvar Venda"

### Verificações pós-salvar:
- [ ] Venda aparece na lista de Vendas
- [ ] Detalhe da venda mostra origem/destino com IATA
- [ ] Logo da companhia aérea aparece
- [ ] Hotel salvo com nome correto
- [ ] Check-in: tarefas vinculadas existem
- [ ] Confirmar Hospedagens: tarefas D14/D7/H24 existem
- [ ] Dados persistem ao recarregar a página

---

## TESTE 2 — Edição de Venda + Recálculo de Tarefas
1. [ ] Abrir venda "QA — Venda E2E"
2. [ ] Clicar "Editar"
3. [ ] Alterar data ida para +2 dias
4. [ ] Alterar check-in hotel para +2 dias
5. [ ] Clicar "Salvar"

### Verificações:
- [ ] Check-in: tarefa atualizada com nova janela
- [ ] Confirmar Hospedagens: D14/D7/H24 recalculadas
- [ ] Sem duplicação de tarefas
- [ ] Status/ordem coerentes

---

## TESTE 3 — Cancelamento de Venda
1. [ ] Abrir venda "QA — Venda E2E"
2. [ ] Clicar "Editar"
3. [ ] Mudar status para "Cancelado"
4. [ ] Salvar

### Verificações:
- [ ] Venda exibe status "Cancelado"
- [ ] Check-in: tarefas ficam CANCELADAS (não na fila ativa)
- [ ] Confirmar Hospedagens: tarefas ficam CANCELADAS
- [ ] Histórico preservado

---

## TESTE 4 — Autocomplete de Hotéis
1. [ ] Abrir Nova Venda → Step 6
2. [ ] Digitar "four" no campo Hotel
3. [ ] Verificar: dropdown aparece após 3 caracteres
4. [ ] Verificar: cada sugestão mostra Nome + Cidade/País
5. [ ] Selecionar um item
6. [ ] Verificar: campo Hotel preenchido com nome oficial
7. [ ] Verificar: cidade/país salvos

---

## TESTE 5 — Autocomplete de Origem (Aeroportos)
1. [ ] Nova Venda → Step 4
2. [ ] Digitar "GRU" no campo Origem
3. [ ] Verificar: dropdown aparece com GRU
4. [ ] Selecionar "São Paulo/Guarulhos"
5. [ ] Verificar: campo preenchido com "GRU"

---

## TESTE 6 — Autocomplete de Destino (Aeroportos)
1. [ ] No campo Destino, digitar "FCO"
2. [ ] Verificar: dropdown aparece
3. [ ] Selecionar "Roma/Fiumicino"
4. [ ] Verificar: campo preenchido com "FCO"

---

## REGRESSÃO RÁPIDA (5 min)
- [ ] Menu Check-in carrega e filtra corretamente
- [ ] Menu Confirmar Hospedagens carrega e filtra
- [ ] Cards mostram dados essenciais (PNR, hotel, datas)
- [ ] Marcar tarefa como concluída grava evidência
- [ ] Logos de companhias aéreas visíveis em Vendas, Detalhe, Check-in
- [ ] Dashboard carrega sem erro
- [ ] Prontuário do cliente acessível (se cliente associado)
- [ ] Nenhuma tela quebrada

---

## Resultado
- Data: ___________
- Executor: ___________
- Pass: ___/___  |  Fail: ___
- Observações: ___________
