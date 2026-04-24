import { useEffect, useState, useCallback } from "react";
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

/**
 * Carrega as permissões do colaborador logado.
 * Admin sempre tem acesso a tudo (bypass).
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, PermissionRow>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = role === "admin";

  const load = useCallback(async () => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }
    if (isAdmin) {
      // Admin não precisa carregar — tudo true.
      setPermissions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    // 1. Pega o employee.id do user logado
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!emp?.id) {
      setPermissions({});
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("employee_permissions")
      .select("menu_key,can_view,can_create,can_edit,can_delete")
      .eq("employee_id", emp.id);

    const map: Record<string, PermissionRow> = {};
    (data || []).forEach((row: any) => { map[row.menu_key] = row; });
    setPermissions(map);
    setLoading(false);
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

  return { loading, isAdmin, permissions, can, reload: load };
}
