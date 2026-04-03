

## Plano: Diagramas simplificados para leigos

Vou recriar os 3 diagramas usando linguagem simples, sem termos técnicos, com analogias do dia a dia.

### Abordagem
- **Diagrama 1 — "A Jornada do Cliente"**: Mostrar como o cliente passa de agente em agente como se fosse um atendimento VIP em etapas, com descrições do que cada um FAZ (não termos como "handoff" ou "JSON")
- **Diagrama 2 — "Como a Nath pensa"**: Em vez de "hierarquia de prompt", mostrar como camadas de "personalidade" e "regras" formam o cérebro da Nath, usando analogia de camadas (tipo cebola ou pirâmide)
- **Diagrama 3 — "De onde vem o conhecimento"**: Mostrar de forma simples que a Nath consulta diferentes "fontes" antes de responder, e depois passa por uma "revisão" antes de enviar

### Mudanças de linguagem
| Técnico | Leigo |
|---|---|
| behavior_prompt | "Manual do cargo" |
| Persona/Identity | "Personalidade" |
| Anti-Repetição | "Memória da conversa" |
| Knowledge Block | "Biblioteca de informações" |
| Compliance Engine | "Revisão antes de enviar" |
| RLS / DB | "Banco de dados" → "Fontes de informação" |
| Transfer rules | "Regra de passagem de bastão" |
| JSON briefing | "Resumo do cliente" |

### Entregas
3 arquivos `.mmd` novos com nomes descritivos em `/mnt/documents/`:
1. `Jornada_do_Cliente.mmd`
2. `Como_a_Nath_Pensa.mmd`
3. `Fontes_de_Conhecimento.mmd`

