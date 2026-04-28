import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MenuAction } from "@/lib/systemMenus";

export interface PermissionRow {
  menu_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UsePermissionsReturn {
  loading: boolean;
  isAdmin: boolean;
  permissions: Record<string, PermissionRow>;
  can: (menuKey: string, action: MenuAction) => boolean;
  reload: () => Promise<void>;
}

// === Cache de módulo ===
// Permissões raramente mudam dentro de uma sessão. Cachear por userId evita
// 2 queries (employees + employee_permissions) a cada PermissionGuard montado.
// Invalidação via `window.dispatchEvent(new Event("permissions:invalidate"))`.
const PERMISSIONS_CACHE_MS = 10 * 60_000;
const cache = new Map<string, { perms: Record<string, PermissionRow>; fetchedAt: number }>();

export function invalidatePermissionsCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("permissions:invalidate", () => cache.clear());
}

/**
 * Carrega as permissões do colaborador logado.
 * Admin sempre tem acesso a tudo (bypass · sem query).
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, PermissionRow>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = role === "admin";
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async (force = false) => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }
    if (isAdmin) {
      setPermissions({});
      setLoading(false);
      return;
    }

    // Cache hit → resposta instantânea
    const cached = cache.get(user.id);
    if (!force && cached && Date.now() - cached.fetchedAt < PERMISSIONS_CACHE_MS) {
      setPermissions(cached.perms);
      setLoading(false);
      return;
    }

    // Dedup: se já tem fetch em andamento, aguarda
    if (inFlightRef.current && !force) {
      await inFlightRef.current;
      const after = cache.get(user.id);
      if (after) setPermissions(after.perms);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchPromise = (async () => {
      // 1 round-trip: join via PostgREST embed
      const { data: emp } = await supabase
        .from("employees")
        .select("id, employee_permissions(menu_key,can_view,can_create,can_edit,can_delete)")
        .eq("user_id", user.id)
        .maybeSingle();

      const map: Record<string, PermissionRow> = {};
      const rows = (emp as any)?.employee_permissions ?? [];
      rows.forEach((row: any) => { map[row.menu_key] = row; });

      cache.set(user.id, { perms: map, fetchedAt: Date.now() });
      setPermissions(map);
      setLoading(false);
    })();

    inFlightRef.current = fetchPromise;
    try {
      await fetchPromise;
    } finally {
      inFlightRef.current = null;
    }
  }, [user, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const can = useCallback((menuKey: string, action: MenuAction) => {
    if (isAdmin) return true;
    const row = permissions[menuKey];
    if (!row) return false;
    if (action === "view") return row.can_view;
    if (action === "create") return row.can_create;
    if (action === "edit") return row.can_edit;
    if (action === "delete") return row.can_delete;
    return false;
  }, [isAdmin, permissions]);

  return { loading, isAdmin, permissions, can, reload: () => load(true) };
}
