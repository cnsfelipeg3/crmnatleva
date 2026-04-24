import { ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { MENU_BY_PATH } from "@/lib/systemMenus";
import { ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Bloqueia o acesso a rotas que tenham um menu_key registrado em SYSTEM_MENUS
 * caso o usuário não tenha can_view. Admin sempre passa.
 */
export default function PermissionGuard({ children }: Props) {
  const location = useLocation();
  const { loading, isAdmin, can } = usePermissions();

  if (isAdmin) return <>{children}</>;
  if (loading) return null; // evita flash

  // Tenta achar o menu pela rota exata; se não bater, libera (rota não governada)
  const menu = MENU_BY_PATH[location.pathname];
  if (!menu) return <>{children}</>;

  if (!can(menu.key, "view")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold font-display mb-2">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Você não possui permissão para acessar <span className="font-mono">{menu.label}</span>.
          Fale com um administrador se precisar de acesso.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return <>{children}</>;
}
