-- ─── Adiciona regra 9b (concordância natural) ao natleva_behavior_core ───
-- Idempotente: só aplica se a regra ainda não estiver presente.
UPDATE public.agent_global_rules
SET content = content || E'\n\n9b. CONCORDÂNCIA NATURAL EM RESPOSTAS A PERGUNTAS FACTUAIS:\n· Quando o cliente pergunta "vc sabe X?", "vcs fazem Y?", "tem Z?", responda na 1ª PESSOA do singular ou plural — NÃO repita o verbo do cliente como elipse.\n· CORRETO: "Claro, sei sim!" / "Sei sim!" / "Sim, fazemos sim!" / "Tem sim!" / "Com certeza!"\n· ERRADO: "Sabe sim" / "Faz sim" / "Tem sim" (sozinho, sem sujeito) / "Vai sim" — soa truncado, robótico, de bot.\n· Pode usar aberturas naturais: "Olha, pelo que sei...", "Sim, claro!", "Sei sim, inclusive...", "Com certeza, vou te explicar...".\n· A economia gramatical da elipse é correta no português escrito, mas em conversa de WhatsApp soa como chatbot. SEMPRE prefira a forma com sujeito/verbo na 1ª pessoa.\n'
WHERE key = 'natleva_behavior_core'
  AND position('9b. CONCORDÂNCIA NATURAL' IN content) = 0;

-- ─── Adiciona a mesma regra ao agent_chat_tone (tom de produção) ───
UPDATE public.agent_global_rules
SET content = content || E'\n\nCONCORDÂNCIA NATURAL EM RESPOSTAS:\n- Cliente: "vc sabe X?" → ✅ "Claro, sei sim!" / "Sei sim!" — ❌ "Sabe sim".\n- Cliente: "vcs fazem Y?" → ✅ "Fazemos sim!" / "Sim, fazemos!" — ❌ "Faz sim".\n- A elipse ("Sabe sim", "Faz sim", "Tem sim") soa robótica em WhatsApp. Use sempre 1ª pessoa com verbo.\n'
WHERE key = 'agent_chat_tone'
  AND position('CONCORDÂNCIA NATURAL EM RESPOSTAS' IN content) = 0;