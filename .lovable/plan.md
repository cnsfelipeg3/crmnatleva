

# Plano: Template "New Flow - NatLeva" no Flow Builder

## Resumo

Adicionar um novo template no array `TEMPLATES` do `FlowBuilder.tsx` chamado **"New Flow - NatLeva"** que mapeia a jornada operacional completa com os agentes NatLeva, incluindo hierarquia de prompt, regras operacionais, campos obrigatórios, cuidados anti-bug e lógica de transferência documentados no `system_prompt` de cada nó.

## Diferença vs. template existente ("Main Flow Comercial")

O template existente usa nós genéricos de IA ("IA Recepção Premium", "IA Qualificação NatLeva") sem vincular aos agentes reais. O **New Flow** usa nós `ai_agent` com os agentes NatLeva nomeados (Maya, Atlas, Habibi, Nemo, Dante, Luna, Nero, Iris, Aegis, Nurture) e documenta as regras operacionais reais de cada um.

## Estrutura do Template (~38 nós, ~42 edges)

```text
📋 REGRAS TRANSVERSAIS (nó de documentação no topo)
│
⚡ TRIGGER: Nova Conversa
│
🔮 ÓRION — Classificar & Rotear
│   CRM: Criar Lead → Etapa "Novo Lead" → Tag "lead_novo"
│
🌸 MAYA — Acolhimento (mín. 5 trocas)
│   system_prompt documenta:
│   · Hierarquia especial (KB primeiro, behavior_prompt segundo)
│   · Coleta: nome, destino, tom, ocasião
│   · Proibições: não interrogar, não info-dump, não pedir WhatsApp
│   · Correção natural (Red Rock → Hard Rock)
│   · BEHAVIOR_CORE versão LITE
│   · Escala quando: nome + destino + 5 trocas
│
🏷️ CRM: Tag "em_acolhimento" + Etapa → "Contato Inicial"
│
🗺️ ATLAS — Qualificação SDR (mín. 6 trocas)
│   system_prompt documenta:
│   · Hierarquia padrão (12 camadas)
│   · 5 OBRIGATÓRIOS: Nome, Destino, Período, Duração, Composição
│   · 2+ DESEJÁVEIS (de 6): Orçamento, Perfil, Hospedagem, Experiências, Viajou antes?, Flexibilidade
│   · Máx 2 perguntas/msg, máx 90 palavras
│   · Anti-repetição: relê conversa antes de perguntar
│   · Anti-recap de dados (regra #10 BEHAVIOR_CORE)
│   · Detecção de urgência (lead apressado → agrupar perguntas)
│   · Resposta direta: responde pergunta do lead PRIMEIRO
│   · PROIBIDO: citar hotéis, voos, preços
│   · BEHAVIOR_CORE versão LITE
│   · Gera briefing JSON estruturado ao escalar
│
🏷️ CRM: Etapa → "Qualificação"
│
═══ CONDIÇÃO: Qual destino? ═══
│   Keywords regex case-insensitive:
│   · HABIBI: dubai, emirados, abu dhabi, maldivas, turquia, oriente
│   · NEMO: orlando, disney, miami, nova york, eua, cancun, caribe
│   · DANTE: europa, paris, itália, espanha, portugal, londres, grécia
│   · Fallback: LUNA
├── Dubai/Oriente ──→ 🏜️ HABIBI (mín. 7 trocas)
├── Orlando/Américas ──→ 🎢 NEMO (mín. 7 trocas)
├── Europa ──→ 🏛️ DANTE (mín. 7 trocas)
└── Outro ──→ direto LUNA
│
[ESPECIALISTAS] system_prompt documenta:
│   · Hierarquia padrão (12 camadas)
│   · KB filtrada por destino (SPECIALIST_KEYWORDS)
│   · BEHAVIOR_CORE versão COMPLETA (storytelling, venda invisível)
│   · Recebe briefing JSON do Atlas
│   · NÃO repete perguntas já feitas
│   · Detalhes sensoriais + 1 experiência exclusiva
│
🏷️ CRM: Etapa → "Diagnóstico" + Tag "destino_confirmado"
│
═══ CONDIÇÃO: Dados completos para cotar? ═══
├── NÃO → Loop: voltar ao especialista
└── SIM ↓
│
⏸️ HANDOFF HUMANO — Consultor cota
│   · Tag "aguardando_cotacao"
│   · Etapa → "Estruturação/Orçamento"
│   · Notificação: "Lead [nome] pronto para cotação"
│   · Briefing INTERNO (filtrado pelo Compliance Engine, nunca no chat)
│   · Retoma quando cotação pronta
│
🌙 LUNA — Proposta (mín. 5 trocas)
│   system_prompt documenta:
│   · KB: recebe docs de TODOS os destinos
│   · Recebe: briefing especialista + cotação humana
│   · Cada item conecta com algo que o lead disse
│   · Transparência: incluído/não incluído/valores/condições
│   · NUNCA inventar preço — usa só cotação humana
│
🏷️ CRM: Etapa → "Proposta Enviada" + Tag "proposta_enviada"
│
═══ CONDIÇÃO: Objeções? ═══
├── SIM → 🎯 NERO
└── NÃO → Fechamento direto
│
🎯 NERO — Negociação (mín. 5 trocas)
│   · Perguntar POR TRÁS da objeção antes de responder
│   · Argumento de VALOR antes de desconto
│   · Urgência com elegância
│   · Só transfere após SIM claro e sem ressalvas
│
🏷️ CRM: Etapa → "Negociação" → "Fechamento"
│
═══ CONDIÇÃO: Fechou? ═══
├── SIM → 🌈 IRIS (pós-venda, NPS, indicações)
│   · Etapa → "Pós-venda"
│   · Se insatisfação grave → escalar para Nath.AI
└── NÃO → 🛡️ AEGIS (anti-churn)
         · Etapa → "Perdido"
         · Detecta motivo, oferta win-back
         └── 🌱 NURTURE (reengajamento)
              · Conteúdo relevante
              · Quando pronto → Loop MAYA
```

## Nó especial: "📋 Regras Transversais"

Um nó `message` no topo do canvas (posição y: -150) com `config.text` documentando:

- **Identidade:** Todos se apresentam como "Nath" — NUNCA revelam nome interno
- **Transferência invisível:** Tag `[TRANSFERIR]` — sem mencionar "colega", "equipe"
- **Preço confidencial:** Nunca revelar antes da proposta formal
- **Concorrentes proibidos:** Booking, Airbnb, Decolar — nunca indicar
- **Full Service:** Nunca sugerir que cliente faça por conta própria
- **Formatação:** Sem travessão, sem hífen como bullet, máx 1 emoji/3-4 msgs
- **Compliance Engine:** Filtra tags internas, preços vazados, recap de dados
- **BEHAVIOR_CORE:** LITE para Maya/Atlas, COMPLETO para especialistas+
- **Hierarquia de Prompt (12 camadas):**
  1. behavior_prompt do banco (PRIORIDADE MÁXIMA)
  2. Identidade + Persona
  3. Filosofia de atendimento
  4. Anti-repetição
  5. Instruções de cargo
  6. Contexto de equipe (PIPELINE_MAP)
  7. NATH_UNIVERSAL_RULES
  8. Base de Conhecimento
  9. Skills ativas
  10. Regras Globais (ai_strategy_knowledge)
  11. Regras de transferência
  12. Instrução de preço

## Implementação Técnica

### Arquivo editado: `src/pages/FlowBuilder.tsx`

Adicionar o template como segundo item no array `TEMPLATES` (após "Main Flow Comercial", antes dos templates menores). Estrutura:

```typescript
{
  name: "New Flow - NatLeva",
  category: "comercial",
  description: "Jornada completa com agentes NatLeva: Órion → Maya → Atlas → Especialistas → Humano → Luna → Nero → Iris/Aegis/Nurture. Inclui regras operacionais, hierarquia de prompt e campos obrigatórios.",
  nodes: [
    // ~38 nós com system_prompt operacional detalhado em cada ai_agent
    // Posicionamento: grid vertical central (x: 500), ramificações horizontais para especialistas
  ],
  edges: [
    // ~42 edges com labels semânticos ("Dubai/Oriente", "SIM", "NÃO", "Dados OK", etc.)
  ],
}
```

Cada nó `ai_agent` terá o campo `config.natleva_agent` vinculado ao agente correto (maya, atlas, habibi, etc.) e `config.system_prompt` com as regras operacionais completas extraídas do `PIPELINE_MAP`, `AGENT_ROLE_INSTRUCTIONS`, e `buildAgentPrompt.ts`.

### Nenhum arquivo novo necessário

Tudo fica inline no array `TEMPLATES` existente, seguindo o mesmo padrão do "Main Flow Comercial".

