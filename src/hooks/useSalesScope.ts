import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Define o escopo de visibilidade de vendas para o usuário logado.
 *
 * - `canViewAll = true` quando o usuário é admin OU possui a permissão
 *   especial `sales.view_all` (can_view) liberada na tabela `employee_permissions`.
 * - Caso contrário o usuário só pode ver vendas em que é o `seller_id`.
 *
 * Esta flag é totalmente isolada das demais permissões (sales, sales.new, etc.) ·
 * funciona como um interruptor à parte só para escopo de listagem.
 */
export function useSalesScope() {
  const { user } = useAuth();
  const { isAdmin, can, loading } = usePermissions();
  const canViewAll = isAdmin || can("sales.view_all", "view");
  return {
    loading,
    canViewAll,
    sellerId: user?.id ?? null,
    /** True se a venda está dentro do escopo do usuário. */
    canSeeSale: (sale: { seller_id?: string | null } | null | undefined) => {
      if (!sale) return false;
      if (canViewAll) return true;
      return !!user?.id && sale.seller_id === user.id;
    },
  };
}
