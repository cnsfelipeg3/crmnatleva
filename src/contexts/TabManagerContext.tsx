import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { titleForPath } from "@/lib/tabTitles";

export interface AppTab {
  id: string;
  path: string;
  title: string;
  pinned?: boolean;
  createdAt: number;
}

interface TabManagerContextValue {
  tabs: AppTab[];
  activeId: string | null;
  open: (path: string, opts?: { activate?: boolean; focusIfExists?: boolean }) => void;
  close: (id: string) => void;
  closeOthers: (id: string) => void;
  activate: (id: string) => void;
  rename: (id: string, title: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  togglePin: (id: string) => void;
  enabled: boolean;
}

const TabManagerContext = createContext<TabManagerContextValue | null>(null);

const MAX_TABS = 8;

function storageKey(userId: string | null | undefined): string {
  return `natleva-tabs-v1::${userId || "anon"}`;
}

function makeId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isFeatureDisabled(): boolean {
  // Feature SEMPRE habilitada · garantia de acessibilidade universal
  // (flag legada removida para evitar usuários travados sem barra de abas)
  return false;
}

function isPublicPath(p: string): boolean {
  return (
    p === "/login" ||
    p.startsWith("/portal/") ||
    p.startsWith("/proposta/") ||
    p.startsWith("/cadastro-passageiro/") ||
    p === "/cadastro-fornecedor" ||
    p === "/diagnostico"
  );
}

export function TabManagerProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const enabled = !isFeatureDisabled();

  const [tabs, setTabs] = useState<AppTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const lastSyncedPathRef = useRef<string | null>(null);

  // Hidrata do localStorage ao logar
  useEffect(() => {
    if (!enabled || !isAuthenticated || hydratedRef.current) return;
    try {
      const raw = window.localStorage.getItem(storageKey(userId));
      const currentPath = location.pathname + location.search;
      if (raw) {
        const parsed = JSON.parse(raw) as { tabs: AppTab[]; activeId: string | null };
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          // Se a rota atual não bater com nenhuma aba salva, abre como nova/ativa
          const matchByPath = parsed.tabs.find((t) => t.path === currentPath);
          if (matchByPath && !isPublicPath(currentPath)) {
            setTabs(parsed.tabs);
            setActiveId(matchByPath.id);
          } else if (!isPublicPath(currentPath)) {
            const newTab: AppTab = { id: makeId(), path: currentPath, title: titleForPath(currentPath), createdAt: Date.now() };
            setTabs([...parsed.tabs.slice(0, MAX_TABS - 1), newTab]);
            setActiveId(newTab.id);
          } else {
            // rota pública · só restaura sem ativar nova
            setTabs(parsed.tabs);
            setActiveId(parsed.activeId);
          }
          hydratedRef.current = true;
          return;
        }
      }
      // Sem nada salvo · cria aba inicial com a rota atual (se for privada)
      if (!isPublicPath(currentPath)) {
        const initial: AppTab = { id: makeId(), path: currentPath, title: titleForPath(currentPath), createdAt: Date.now() };
        setTabs([initial]);
        setActiveId(initial.id);
      }
      hydratedRef.current = true;
    } catch (err) {
      console.warn("[TabManager] hydrate failed", err);
      hydratedRef.current = true;
    }
  }, [enabled, isAuthenticated, userId, location.pathname, location.search]);

  // Persiste em localStorage
  useEffect(() => {
    if (!enabled || !hydratedRef.current) return;
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify({ tabs, activeId }));
    } catch {
      /* ignore quota */
    }
  }, [enabled, tabs, activeId, userId]);

  // Sincroniza: quando o usuário navega (sidebar, links internos), atualiza o path da aba ativa
  // E auto-cura: se por qualquer motivo não houver abas em rota privada, cria uma.
  useEffect(() => {
    if (!enabled || !hydratedRef.current) return;
    const currentPath = location.pathname + location.search;
    if (isPublicPath(currentPath)) return;

    // Auto-heal: nenhum tab existente em rota privada · cria a aba inicial
    if (tabs.length === 0 || !activeId) {
      const initial: AppTab = { id: makeId(), path: currentPath, title: titleForPath(currentPath), createdAt: Date.now() };
      setTabs((prev) => (prev.length === 0 ? [initial] : prev));
      setActiveId((prev) => prev ?? initial.id);
      lastSyncedPathRef.current = currentPath;
      return;
    }

    const activeTab = tabs.find((t) => t.id === activeId);
    if (!activeTab) {
      // activeId aponta para aba inexistente · ativa a primeira disponível
      setActiveId(tabs[0].id);
      return;
    }
    if (activeTab.path === currentPath) {
      lastSyncedPathRef.current = currentPath;
      return;
    }
    if (lastSyncedPathRef.current === currentPath) return;
    lastSyncedPathRef.current = currentPath;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, path: currentPath, title: titleForPath(currentPath) } : t)),
    );
  }, [enabled, location.pathname, location.search, activeId, tabs]);

  const open = useCallback<TabManagerContextValue["open"]>((path, opts) => {
    const activate = opts?.activate ?? true;
    const focusIfExists = opts?.focusIfExists ?? true;
    setTabs((prev) => {
      if (focusIfExists) {
        const existing = prev.find((t) => t.path === path);
        if (existing) {
          if (activate) {
            setActiveId(existing.id);
            navigate(path);
          }
          return prev;
        }
      }
      if (prev.length >= MAX_TABS) {
        // Remove a aba mais antiga não pinada
        const removable = prev.find((t) => !t.pinned);
        if (!removable) return prev;
        const filtered = prev.filter((t) => t.id !== removable.id);
        const created: AppTab = { id: makeId(), path, title: titleForPath(path), createdAt: Date.now() };
        if (activate) {
          setActiveId(created.id);
          navigate(path);
        }
        return [...filtered, created];
      }
      const created: AppTab = { id: makeId(), path, title: titleForPath(path), createdAt: Date.now() };
      if (activate) {
        setActiveId(created.id);
        navigate(path);
      }
      return [...prev, created];
    });
  }, [navigate]);

  const close = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId) {
        const fallback = next[idx] || next[idx - 1] || next[0];
        if (fallback) {
          setActiveId(fallback.id);
          navigate(fallback.path);
        } else {
          setActiveId(null);
        }
      }
      return next;
    });
  }, [activeId, navigate]);

  const closeOthers = useCallback((id: string) => {
    setTabs((prev) => {
      const keep = prev.find((t) => t.id === id);
      const pinned = prev.filter((t) => t.pinned && t.id !== id);
      const next = keep ? [...pinned, keep] : prev;
      if (keep) {
        setActiveId(keep.id);
        navigate(keep.path);
      }
      return next;
    });
  }, [navigate]);

  const activate = useCallback((id: string) => {
    setTabs((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) {
        setActiveId(id);
        if (location.pathname + location.search !== t.path) navigate(t.path);
      }
      return prev;
    });
  }, [location.pathname, location.search, navigate]);

  const rename = useCallback((id: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setTabs((prev) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
  }, []);

  // Atalhos de teclado: Ctrl/Cmd+W fecha aba ativa, Ctrl/Cmd+T abre dashboard como nova
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      // Ctrl+1..9
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const t = tabs[idx];
        if (t) {
          e.preventDefault();
          activate(t.id);
        }
      } else if (e.key.toLowerCase() === "w" && e.shiftKey) {
        // evita conflito com Ctrl+W do navegador · usar Ctrl+Shift+W
        if (activeId) {
          e.preventDefault();
          close(activeId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, tabs, activeId, activate, close]);

  const value = useMemo<TabManagerContextValue>(() => ({
    tabs,
    activeId,
    open,
    close,
    closeOthers,
    activate,
    rename,
    reorder,
    togglePin,
    enabled,
  }), [tabs, activeId, open, close, closeOthers, activate, rename, reorder, togglePin, enabled]);

  return <TabManagerContext.Provider value={value}>{children}</TabManagerContext.Provider>;
}

export function useTabManager(): TabManagerContextValue {
  const ctx = useContext(TabManagerContext);
  if (!ctx) {
    // Fallback inerte se usado fora do provider (não quebra nada)
    return {
      tabs: [],
      activeId: null,
      open: () => { /* noop */ },
      close: () => { /* noop */ },
      closeOthers: () => { /* noop */ },
      activate: () => { /* noop */ },
      rename: () => { /* noop */ },
      reorder: () => { /* noop */ },
      togglePin: () => { /* noop */ },
      enabled: false,
    };
  }
  return ctx;
}

export { MAX_TABS };
