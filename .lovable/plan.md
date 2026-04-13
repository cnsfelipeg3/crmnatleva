

# Template "Jornada Completa NatLeva" — Versão Detalhada

## O que é

Um template pré-montado no Flow Builder que descreve **cada etapa do atendimento com regras operacionais reais** — não apenas "Maya → Atlas → Especialista", mas exatamente **o que cada agente faz, coleta, e quando escala**.

## Estrutura do Fluxo (~35 nós)

```text
TRIGGER: Nova Conversa (WhatsApp/Instagram/Indicação)
    │
    ▼
🔮 ÓRION — Classificador (automático)
    │  · Classifica canal de origem
    │  · CRM: Criar Lead + Etapa "Novo Lead"
    │  · Tag: "lead_novo"
    ▼
🌸 MAYA — Acolhimento (mín. 5 trocas)
    │  COLETA OBRIGATÓRIA:
    │  · Nome do lead
    │  · Destino de interesse (se mencionou)
    │  · Tom da conversa (animado/inseguro/apressado)
    │  · Ocasião (se mencionou)
    │  
    │  REGRAS:
    │  · Saudação calorosa: "Oii! Tudo ótimo, e você? 😊"
    │  · NÃO interrogar — conquistar confiança
    │  · NÃO fazer info-dump sobre destinos
    │  · Se lead já deu tudo na 1ª msg → confirmar e transferir
    │  · Mínimo 5 mensagens antes de escalar
    │  
    │  ESCALA QUANDO: Lead confortável + nome coletado
    │  CRM: Etapa → "Contato Inicial" + Tag "em_acolhimento"
    ▼
🗺️ ATLAS — Qualificação SDR (mín. 6 trocas)
    │  5 CAMPOS OBRIGATÓRIOS:
    │  ✓ Nome (já vem da Maya)
    │  ✓ Destino confirmado
    │  ✓ Período/datas aproximadas
    │  ✓ Duração da viagem
    │  ✓ Composição do grupo (qtd + perfil)
    │  
    │  2+ CAMPOS DESEJÁVEIS (mín. 2):
    │  · Orçamento estimado
    │  · Perfil (família/VIP/lua-de-mel/aventureiro)
    │  · Precisa hospedagem? Voo? Tudo?
    │  · Experiências que quer viver
    │  · Já viajou pra esse destino antes?
    │  · Flexibilidade de datas
    │  
    │  REGRAS:
    │  · Máx. 2 perguntas por mensagem
    │  · Máx. 90 palavras por resposta
    │  · Coleta conversacional, NÃO formulário
    │  · Proibido citar hotéis, voos ou preços
    │  · Se detectar loop de promessas ("vou organizar") → forçar escalonamento
    │  
    │  ESCALA QUANDO: 5 obrigatórios + 2 desejáveis coletados
    │  CRM: Etapa → "Qualificação"
    ▼
═══ CONDIÇÃO: Qual destino? ═══
    ├─ Dubai/Oriente/Maldivas ──→ 🏜️ HABIBI
    ├─ Orlando/Disney/EUA ─────→ 🎢 NEMO
    ├─ Europa/Paris/Itália ────→ 🏛️ DANTE
    └─ Outro/Indefinido ───────→ 🌙 LUNA (direto)
    
    Keywords de roteamento:
    · HABIBI: dubai, emirados, abu dhabi, maldivas, oriente
    · NEMO: orlando, disney, miami, eua, nova york, cancun
    · DANTE: europa, paris, itália, portugal, espanha, grécia
    │
    ▼
🏜️/🎢/🏛️ ESPECIALISTA (mín. 7 trocas)
    │  RECEBE DO ATLAS: perfil completo, destino, orçamento, datas, preferências
    │  
    │  TRABALHO:
    │  · Personalizar roteiro usando dados do Atlas
    │  · NÃO repetir perguntas já feitas
    │  · Falar do destino com autoridade e detalhes sensoriais
    │  · Incluir 1+ experiência exclusiva
    │  · Sugerir roteiro, hotéis, experiências
    │  
    │  ENTREGA: roteiro sugerido, hotéis, experiências, estimativa, reações
    │  CRM: Etapa → "Diagnóstico" + Tag "destino_confirmado"
    ▼
═══ CONDIÇÃO: Dados completos para cotar? ═══
    ├─ NÃO → Loop: voltar ao especialista (pedir dados faltantes)
    └─ SIM ↓
    ▼
⏸️ HANDOFF HUMANO — Consultor cota
    │  · Tag: "aguardando_cotacao"
    │  · CRM: Etapa → "Estruturação/Orçamento"
    │  · Notificação: "Lead [nome] pronto para cotação"
    │  · Dados entregues: briefing completo + preferências + reações
    │  · Consultor monta cotação real com preços
    │  · Retoma automação quando cotação pronta
    ▼
🌙 LUNA — Apresentação de Proposta (mín. 5 trocas)
    │  RECEBE: briefing do especialista + cotação do humano
    │  
    │  TRABALHO:
    │  · Apresentar proposta com clareza (incluído/não incluído/valores/condições)
    │  · Cada item conecta com algo que o lead disse antes
    │  · Apresentar valor como experiência, não como custo
    │  · Ser transparente
    │  
    │  ENTREGA: proposta completa, reações, objeções
    │  CRM: Etapa → "Proposta Enviada" + Tag "proposta_enviada"
    ▼
═══ CONDIÇÃO: Objeções? ═══
    ├─ SIM → 🎯 NERO (Negociação)
    └─ NÃO → direto ao fechamento
    ▼
🎯 NERO — Negociação & Fechamento (mín. 5 trocas)
    │  RECEBE: proposta + objeções da Luna
    │  
    │  TRABALHO:
    │  · Perguntar o que está POR TRÁS da objeção antes de responder
    │  · Argumento de VALOR antes de qualquer desconto
    │  · Urgência com elegância
    │  · Só transferir após SIM claro e sem ressalvas
    │  
    │  CRM: Etapa → "Negociação" → "Fechamento em Andamento"
    ▼
═══ CONDIÇÃO: Fechou? ═══
    ├─ SIM → 🌈 IRIS (Pós-venda)
    └─ NÃO → 🛡️ AEGIS (Anti-churn)
    
    ┌─────────────────────────────┐
    │ 🌈 IRIS — Pós-venda        │
    │ · Confirmar detalhes       │
    │ · NPS / Feedback           │
    │ · Pedir indicações         │
    │ · Sugerir próxima viagem   │
    │ · CRM: Etapa → "Pós-venda"│
    │ · Se insatisfação grave    │
    │   → escalar para Nath.AI   │
    └────────────┬────────────────┘
                 ▼
              FIM (Fidelizado)
    
    ┌─────────────────────────────┐
    │ 🛡️ AEGIS — Anti-churn      │
    │ · CRM: Etapa → "Perdido"   │
    │ · Detectar motivo           │
    │ · Oferta win-back           │
    └────────────┬────────────────┘
                 ▼
    ┌─────────────────────────────┐
    │ 🌱 NURTURE — Reengajamento │
    │ · Manter lead aquecido     │
    │ · Conteúdo relevante       │
    │ · Quando pronto → MAYA     │
    └────────────┬────────────────┘
                 ▼
           Loop → MAYA (recomeça)
```

## Arquivos a criar/editar

1. **`src/components/flowbuilder/templates/jornadaNatLeva.ts`** (NOVO)
   - Função `generateJornadaTemplate()` retornando `{ nodes: Node[], edges: Edge[] }`
   - ~35 nós com posicionamento auto-layout (grid vertical + ramificações horizontais)
   - ~38 edges com labels semânticos ("Dubai/Oriente", "SIM", "NÃO", "Dados OK", etc.)
   - Cada nó de agente terá campo `description` com as regras resumidas acima (campos obrigatórios, mín. trocas, critérios de escalação)

2. **`src/pages/FlowBuilder.tsx`**
   - Adicionar botão "📋 Usar Template" no painel superior
   - Dropdown com opção "Jornada Completa NatLeva"
   - Ao clicar: popula canvas com todos os nós e edges do template
   - Confirmação antes de sobrescrever fluxo existente

## O que cada nó terá internamente

Cada nó de agente terá metadata configurada:
- **Agente NatLeva vinculado** (maya, atlas, etc.)
- **Campos obrigatórios** que precisa coletar
- **Mínimo de trocas** antes de escalar
- **Critério de escalação** (quando transferir)
- **Tags CRM** que aplica
- **Etapa do funil** que seta
- **Dados que entrega** ao próximo nó

Isso serve como documentação operacional viva e como base para quando ativarmos a execução real dos fluxos.

