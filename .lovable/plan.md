## Objetivo

Permitir que o cliente preencha os próprios dados via link público, em um formulário com identidade visual NatLeva. No botão "Novo Passageiro", oferecer duas opções: cadastro manual (atual) ou copiar link público.

## Fluxo

1. Em `/passageiros`, o botão "Novo Passageiro" abre um pequeno menu:
   - Cadastro manual (abre o Dialog atual)
   - Copiar link de auto-cadastro (gera/copia URL pública única)
2. Cliente acessa o link, preenche o formulário e envia.
3. Submissão cria registro em `passengers` via Edge Function (sem auth), com `created_via = 'self_signup'`.
4. Atendente recebe o novo passageiro automaticamente listado em `/passageiros` (e visualiza um badge "Auto-cadastro").

## Estrutura técnica

### Banco
Migration:
- Tabela `passenger_signup_links` (id, slug único, created_by, agency_id, label opcional, expires_at nullable, max_uses nullable, uses_count, active boolean, created_at).
- Coluna `created_via text` em `passengers` (default `'manual'`).
- Coluna `signup_link_id uuid` em `passengers` (referência opcional).
- RLS: `passenger_signup_links` segue padrão atual (anon ALL para testes, conforme memória do projeto).

### Edge Function `passenger-self-signup`
- `verify_jwt = false` em `supabase/config.toml`.
- POST `{ slug, payload }` → valida slug ativo, valida payload com Zod, normaliza nome (`smartCapitalize`), CPF e telefone. Insere em `passengers`, incrementa `uses_count`, retorna `{ ok: true }`.
- GET `?slug=...` → retorna metadados públicos mínimos (logo agência, nome agência, ativo/expirado) para renderizar a página.

### Rotas
- Adicionar `/cadastro-passageiro/:slug` à lista `isPublicRoute` em `src/App.tsx`.
- Nova página `src/pages/PassengerSelfSignup.tsx` (lazy-loaded, sem layout autenticado).

### Componentes novos
- `src/pages/PassengerSelfSignup.tsx` — landing pública com hero NatLeva (logo, fundo glass-card, gold-line, tipografia display) e formulário multi-seção:
  1. Dados pessoais: nome completo*, CPF*, nascimento*, RG, e-mail*.
  2. Contato: telefone/WhatsApp* (com máscara BR).
  3. Endereço: CEP (auto-preenche via ViaCEP), rua, número, complemento, bairro, cidade, estado.
  4. Viagem internacional (toggle "Vai viajar para fora da América do Sul?"): se sim, exige passaporte* e validade*. Se não, campos opcionais.
  - Validação Zod, mensagens inline, botão "Enviar dados" com loading.
  - Tela de sucesso com checkmark e mensagem "Recebemos seus dados, obrigado!".
- `src/components/passengers/PassengerLinkDialog.tsx` — dialog acionado pelo dropdown, gera o slug, exibe URL, botão copiar, opção "abrir link em nova aba" e seletor de validade (7/30 dias/sem validade).
- Substituir o botão único "Novo Passageiro" por `DropdownMenu` com:
  - Cadastrar manualmente
  - Gerar link de auto-cadastro

### Identidade visual
- Reaproveitar `glass-card`, tokens semânticos e classes existentes (cards `#FFFFFF`, texto `#111827`, borda `0.75rem`, accent gold `4px`).
- Logo NatLeva no topo (usar mesmo asset do portal/proposta pública).
- Tipografia `font-display` para títulos, `Inter` no corpo.
- Layout single-column, max-w-2xl, padding generoso, responsivo mobile-first.

### Validação de internacional
- Lista fixa de países América do Sul não exige passaporte. Como o formulário foca em destino futuro, basta um toggle binário "Viagem internacional fora da América do Sul" para alternar `required` no passaporte e validade.

## Arquivos

**Criar**
- `supabase/functions/passenger-self-signup/index.ts`
- `src/pages/PassengerSelfSignup.tsx`
- `src/components/passengers/PassengerLinkDialog.tsx`

**Modificar**
- `src/pages/Passengers.tsx` (dropdown no botão, badge "Auto-cadastro")
- `src/App.tsx` (rota pública + lazy import + isPublicRoute)
- `supabase/config.toml` (registrar a função com `verify_jwt = false`)
- Migration SQL para tabela e colunas novas

## Não incluso
- Confirmação por e-mail/SMS do cliente (pode ser próximo passo).
- Edição de cadastro pelo próprio cliente após submissão.
