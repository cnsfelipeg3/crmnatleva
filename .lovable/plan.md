
Diagnóstico

- O problema é real. No print, a agente usa “Fê” em várias respostas seguidas; isso ainda soa mecânico.
- Pelo código atual, a proteção existe, mas está falhando por alguns motivos objetivos:
  1. `complianceEngine.ts` não reconhece bem formatos como “Pode me chamar de Fernanda (ou Fê)”;
  2. apelidos curtos e com acento (`Lu`, `Ju`, `Fê`) têm alta chance de escapar;
  3. o filtro depende demais do texto recente da conversa, então no automático/camaleão ele pode “esquecer” o nome;
  4. o modo automático não aplica o mesmo fallback final de limpeza que manual/camaleão;
  5. a contagem atual de uso do nome está frágil e pode subcontar repetições.

Plano de correção

1. Fortalecer a leitura de nome e apelido
- Criar um extrator único para nome do cliente + apelidos.
- Cobrir padrões como:
  - “sou a Fernanda”
  - “me chamo Fernanda”
  - “pode me chamar de Fernanda”
  - “pode me chamar de Fernanda (ou Fê)”
  - apelidos curtos como `Lu`, `Ju`, `Fê`.

2. Passar o nome conhecido para o motor
- `SimuladorAutoMode.tsx`: usar `lead.nome` explicitamente.
- `SimuladorChameleonMode.tsx`: usar `profile.nome`.
- `SimuladorManualMode.tsx`: continuar derivando do chat, mas com detector melhor.
- Vou levar isso para o pipeline de compliance de forma clara, sem mexer no workflow dos agentes.

3. Unificar a trava nos 3 modos
- Aplicar a mesma sanitização final em manual, automático e camaleão.
- Regra segura e humana:
  - nunca usar o nome em mensagens consecutivas;
  - no máximo 1 uso nas últimas 3 respostas do agente;
  - se o modelo insistir, o nome/apelido é removido automaticamente antes de aparecer na UI.

4. Reforço leve de prompt, sem revirar o sistema
- Em `buildAgentPrompt.ts`, reforçar para agentes comerciais que nome é ocasional, não abertura padrão.
- A garantia principal continuará sendo determinística no pós-processamento.

5. Blindagem contra regressão
- Não vou mexer em:
  - transferência
  - funil
  - scoring
  - handoff
  - lógica central dos agentes
  - simulador de leads
- A mudança fica focada em anti-repetição de nome e unificação entre modos.

6. Testes antes de considerar “resolvido”
- Adicionar testes para:
  - `Fernanda / Fê`
  - `Lu / Ju`
  - nome conhecido no automático/camaleão mesmo sem reapresentação no chat
  - remoção em repetição consecutiva
  - preservação de uso ocasional e natural quando fizer sentido

Arquivos que pretendo tocar

- `src/components/ai-team/complianceEngine.ts`
- `src/components/ai-team/agentFormatting.ts`
- `src/components/ai-team/SimuladorAutoMode.tsx`
- `src/components/ai-team/SimuladorManualMode.tsx`
- `src/components/ai-team/SimuladorChameleonMode.tsx`
- `src/utils/buildAgentPrompt.ts`
- testes em `src/test/...`

Detalhes técnicos

- Vou trocar a lógica atual por uma detecção com suporte a alias/apelido.
- Vou usar matching seguro para nomes com acento.
- Vou eliminar a dependência excessiva de “só o trecho recente da conversa”.
- A correção será aditiva e contida: primeiro fortalecer identidade do cliente, depois unificar a sanitização final nos 3 modos.
