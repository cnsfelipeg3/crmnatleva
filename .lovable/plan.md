## Objetivo

Adicionar uma barrinha discreta no topo do CRM (acima do header atual) com abas tipo navegador, permitindo trabalhar em paralelo em várias áreas (WhatsApp, Vendas, Cotações, Propostas, etc.) sem perder o estado de cada uma ao alternar.

Premissa inegociável: zero quebra de funcionalidade existente. Toda lógica de rotas, autenticação, permissões, autosave e dados fica idêntica · a barra de abas é uma camada por cima.

---

## Como vai funcionar (visão do usuário)

```text
┌──────────────────────────────────────────────────────────────────┐
│  · Dashboard  ·  WhatsApp ×  ·  Vendas ×  ·  + Nova aba          │  ← barra discreta (32px)
├──────────────────────────────────────────────────────────────────┤
│  [header atual NatLeva · busca, notificações, fullscreen]        │
├────────────┬─────────────────────────────────────────────────────┤
│  Sidebar   │  Conteúdo da aba ATIVA                              │
│            │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

- Clique em qualquer item da sidebar = navega DENTRO da aba ativa (comportamento atual, igualzinho).
- Botão "+" abre menu rápido com áreas mais usadas (Dashboard, WhatsApp, Vendas, Cotações, Propostas, Viagens, Financeiro). Também permite abrir a rota atual em nova aba.
- Clique com botão do meio em link da sidebar OU Ctrl/Cmd+clique = abre rota em nova aba (padrão de navegador).
- Cada aba mantém: scroll, formulários abertos (ex.: ProposalEditor com autosave), filtros, conversa do WhatsApp aberta, queries em cache.
- Fechar aba (×) com confirmação se houver autosave pendente em rascunho não salvo.
- Abas persistem em localStorage por usuário · refresh da página restaura as mesmas abas abertas.
- Limite de 8 abas simultâneas (proteção de memória); ao tentar abrir a 9ª, mostra aviso.

---

## Mobile / Tablet

- Mobile (<768px): barra fica oculta (espaço é precioso). O usuário continua usando o app normalmente sem abas. Se quiser, mostramos um seletor compacto no menu lateral listando as abas abertas em outras sessões. Por padrão da entrega: desabilitada em mobile.
- Tablet retrato/paisagem: barra ativa, mas com rolagem horizontal nas abas (já cabe bem).
- Desktop: experiência completa.

---

## Arquitetura técnica

### 1. Novo TabManager (estado global das abas)

Arquivo novo: `src/contexts/TabManagerContext.tsx`

```ts
type Tab = {
  id: string;          // uuid estável
  path: string;        // ex.: "/sales/new", "/livechat/integration"
  title: string;       // derivado da rota (mapa rota → label)
  icon?: string;       // opcional, lucide icon name
  pinned?: boolean;
};

interface TabManagerContextValue {
  tabs: Tab[];
  activeId: string;
  open: (path: string, opts?: { activate?: boolean }) => void;
  close: (id: string) => void;
  activate: (id: string) => void;
  updateActivePath: (path: string) => void;  // chamado quando navega DENTRO da aba
}
```

- Persistência: `localStorage` chave `natleva-tabs-v1` (por usuário, prefixado com user id).
- Hidrata na primeira montagem após login.
- Mapa rota → título reaproveita `src/lib/systemMenus.ts` (já existe).

### 2. Cada aba = sua própria árvore de rotas montada (keep-alive)

Estratégia escolhida: trocar o `<BrowserRouter>` único atual por um `<BrowserRouter>` na aba ATIVA + `<MemoryRouter>` por aba inativa, todas montadas em paralelo, escondendo as inativas com `display: none`.

Vantagem: cada aba tem seu próprio histórico e estado React intacto · ProposalEditor com autosave continua intocado · WhatsApp inbox mantém scroll e mensagens carregadas.

Mudança em `src/App.tsx`:
- Mantém `<BrowserRouter>` externo só pra refletir a URL da aba ativa no endereço do browser.
- Adiciona `<TabManagerProvider>` por dentro do `<AuthProvider>`.
- Renderiza `<TabsViewport>` que mapeia `tabs.map(tab => <TabRouterShell key={tab.id} tab={tab} active={tab.id === activeId} />)`.
- Cada `TabRouterShell` carrega as MESMAS `<Routes>` atuais (mesmas páginas lazy, mesmos layouts, mesmo `<AppLayout>`). Nenhuma página precisa mudar.

URL na barra do navegador:
- Quando trocar de aba, `window.history.replaceState` atualiza para o `path` da aba ativa.
- Quando navegar dentro da aba (sidebar, links), `TabRouterShell` notifica o manager via `updateActivePath`.

### 3. Componente visual da barra

Arquivo novo: `src/components/tabs/TabBar.tsx`

- Altura 32px, fundo `bg-card/50` com `border-b border-border/30`.
- Cada aba: `Tab` com favicon/icon · título truncado · botão × no hover.
- Tab ativa: leve realce (`bg-background`) + linha dourada de 2px embaixo (segue brandbook v5).
- Drag-to-reorder com `@dnd-kit/core` (já está nas dependências, é usado em outros lugares).
- Botão "+" à direita abre `DropdownMenu` com atalhos.
- Renderizada apenas no `<AppLayout>` (rotas privadas), nunca em `/login`, `/portal/*`, `/proposta/*`, `/cadastro-*`.
- Em mobile, a barra é `hidden md:flex`.

### 4. Integração com sidebar (Ctrl+clique)

Mudança mínima em `src/components/NavLink.tsx`: ao detectar `e.ctrlKey || e.metaKey || e.button === 1`, chama `tabManager.open(to, { activate: false })` e dá `e.preventDefault()`. Caso contrário, comportamento atual.

### 5. Proteções contra perda de dados

- Ao fechar aba: se a página renderizada expõe `data-unsaved="true"` no DOM (já fazemos isso no autosave do ProposalEditor via flag) ou se houver rascunho com `proposal-new-draft-v1` não vazio, mostra `AlertDialog` "Tem alterações não salvas. Fechar mesmo assim?".
- Ao restaurar abas no boot: se o path requer `:id` que não existe mais (ex.: proposta excluída), mostra fallback amigável dentro da aba sem quebrar as outras.

### 6. Performance

- Limite de 8 abas montadas simultaneamente (configurável).
- Abas inativas continuam com queries em cache (já temos `gcTime: 30min` no `QueryClient`), mas nada de polling pesado novo.
- Lazy de páginas continua igual · cada aba paga o Suspense só uma vez por rota.
- WhatsApp realtime: o canal já é singleton via Supabase; múltiplas abas escutando o mesmo canal não custam nada extra.

### 7. Fallbacks e segurança

- Se algum erro acontecer no provider de abas, um `ErrorBoundary` em volta do `TabsViewport` reverte para modo single-tab automaticamente (renderiza só `<BrowserRouter><AppRoutes/></BrowserRouter>` igual a hoje).
- Feature pode ser desabilitada em runtime via `localStorage.setItem('natleva-tabs-disabled', '1')` para emergências.

---

## Arquivos afetados

Novos:
- `src/contexts/TabManagerContext.tsx` · estado global das abas + persistência.
- `src/components/tabs/TabBar.tsx` · UI da barra.
- `src/components/tabs/TabRouterShell.tsx` · wrapper que mantém cada aba montada.
- `src/components/tabs/TabsViewport.tsx` · orquestra renderização paralela.
- `src/lib/tabTitles.ts` · mapa rota → título amigável (reaproveita systemMenus).

Editados (mudanças cirúrgicas, sem mexer em lógica de página):
- `src/App.tsx` · envolve rotas privadas com `<TabManagerProvider>` + `<TabsViewport>`.
- `src/components/AppLayout.tsx` · adiciona `<TabBar />` no topo (acima do header atual), só em desktop/tablet.
- `src/components/NavLink.tsx` · suporte a Ctrl/Cmd/middle-click para abrir em nova aba.
- `src/pages/ProposalEditor.tsx` · expõe flag `data-unsaved` quando há rascunho dirty (5 linhas).

NÃO mexe em: nenhuma rota, nenhuma página de conteúdo, autenticação, permissões, hooks de dados, edge functions, banco, RLS, autosave, PWA/SW, notificações.

---

## Entregas em fases (cada uma já é estável e reversível)

1. Fase 1 · Provider + persistência + barra visual (sem keep-alive ainda) · trocar de aba navega normalmente. Já dá ganho de UX (atalhos, histórico de abas).
2. Fase 2 · Keep-alive real com MemoryRouter por aba inativa. Aqui mora o ganho grande.
3. Fase 3 · Polimento: drag-to-reorder, Ctrl+clique na sidebar, atalhos de teclado (Ctrl+T nova aba, Ctrl+W fechar, Ctrl+1..9 trocar).

---

## O que deixo de fora desta entrega

- Sincronizar abas entre dispositivos (cloud).
- Abas em mobile (avalio depois com base no uso real).
- Atalhos de teclado avançados (Fase 3, opcional).

Posso seguir para implementação?
