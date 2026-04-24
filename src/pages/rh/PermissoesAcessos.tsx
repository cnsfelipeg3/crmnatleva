import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Save, Wand2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  SYSTEM_MENUS,
  MENU_GROUPS,
  ROLE_TEMPLATES,
  type MenuAction,
  type RoleTemplate,
  type SystemMenuItem,
} from "@/lib/systemMenus";

const ACTIONS: { key: MenuAction; label: string; col: keyof PermRow }[] = [
  { key: "view", label: "Ver", col: "can_view" },
  { key: "create", label: "Criar", col: "can_create" },
  { key: "edit", label: "Editar", col: "can_edit" },
  { key: "delete", label: "Excluir", col: "can_delete" },
];

interface PermRow {
  menu_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ROLE_OPTIONS: RoleTemplate[] = ["admin", "gestor", "vendedor", "operacional", "financeiro", "leitura"];

export default function PermissoesAcessos() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(MENU_GROUPS[0]);

  const load = async () => {
    const [e, r, l] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("hr_access_log").select("*, employees(full_name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setEmployees(e.data || []);
    setRoles(r.data || []);
    setAccessLog(l.data || []);
  };
  useEffect(() => { load(); }, []);

  const getRole = (userId: string | null | undefined) => {
    if (!userId) return null;
    return roles.find((r) => r.user_id === userId)?.role || null;
  };

  const filtered = employees.filter(
    (e) => !search || e.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openEditor = async (emp: any) => {
    setEditingEmp(emp);
    setActiveGroup(MENU_GROUPS[0]);
    const { data } = await supabase
      .from("employee_permissions")
      .select("menu_key,can_view,can_create,can_edit,can_delete")
      .eq("employee_id", emp.id);
    const map: Record<string, PermRow> = {};
    (data || []).forEach((row: any) => { map[row.menu_key] = row; });
    setPerms(map);
  };

  const togglePerm = (menuKey: string, action: MenuAction, value: boolean) => {
    setPerms((prev) => {
      const current = prev[menuKey] || {
        menu_key: menuKey, can_view: false, can_create: false, can_edit: false, can_delete: false,
      };
      const col = ACTIONS.find((a) => a.key === action)!.col;
      const next: PermRow = { ...current, [col]: value };
      // Regra de coerência: se desliga "view", desliga create/edit/delete também
      if (action === "view" && !value) {
        next.can_create = false; next.can_edit = false; next.can_delete = false;
      }
      // Se liga create/edit/delete, garante view
      if (action !== "view" && value) {
        next.can_view = true;
      }
      return { ...prev, [menuKey]: next };
    });
  };

  const applyTemplate = (template: RoleTemplate) => {
    const next: Record<string, PermRow> = {};
    SYSTEM_MENUS.forEach((m) => {
      const result = ROLE_TEMPLATES[template](m.key);
      if (Object.keys(result).length === 0) return;
      next[m.key] = {
        menu_key: m.key,
        can_view: !!result.view && m.actions.includes("view"),
        can_create: !!result.create && m.actions.includes("create"),
        can_edit: !!result.edit && m.actions.includes("edit"),
        can_delete: !!result.delete && m.actions.includes("delete"),
      };
    });
    setPerms(next);
    toast.success(`Template "${template}" aplicado — revise e salve`);
  };

  const save = async () => {
    if (!editingEmp) return;
    setSaving(true);
    // Apaga todas as permissões anteriores do colaborador e reinsere
    await supabase.from("employee_permissions").delete().eq("employee_id", editingEmp.id);
    const rows = Object.values(perms).filter(
      (p) => p.can_view || p.can_create || p.can_edit || p.can_delete
    ).map((p) => ({ ...p, employee_id: editingEmp.id }));
    if (rows.length > 0) {
      const { error } = await supabase.from("employee_permissions").insert(rows);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
    }
    toast.success("Permissões atualizadas");
    setSaving(false);
    setEditingEmp(null);
  };

  const updateRole = async (emp: any, newRole: RoleTemplate) => {
    if (!emp.user_id) { toast.error("Colaborador sem login vinculado"); return; }
    // upsert na user_roles
    const existing = roles.find((r) => r.user_id === emp.user_id);
    if (existing) {
      await supabase.from("user_roles").update({ role: newRole }).eq("id", existing.id);
    } else {
      await supabase.from("user_roles").insert({ user_id: emp.user_id, role: newRole });
    }
    toast.success(`Perfil de ${emp.full_name} alterado para ${newRole}`);
    load();
  };

  const roleColor = (r: string | null) => {
    if (!r) return "";
    const map: Record<string, string> = {
      admin: "bg-red-500/10 text-red-600",
      gestor: "bg-purple-500/10 text-purple-600",
      vendedor: "bg-blue-500/10 text-blue-600",
      operacional: "bg-amber-500/10 text-amber-600",
      financeiro: "bg-emerald-500/10 text-emerald-600",
      leitura: "bg-gray-500/10 text-gray-600",
    };
    return map[r] || "";
  };

  const menusByGroup = useMemo(() => {
    const out: Record<string, SystemMenuItem[]> = {};
    SYSTEM_MENUS.forEach((m) => {
      if (!out[m.group]) out[m.group] = [];
      out[m.group].push(m);
    });
    return out;
  }, []);

  // Resumo de permissões por colaborador
  const [permCounts, setPermCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("employee_permissions").select("employee_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.employee_id] = (counts[r.employee_id] || 0) + 1; });
      setPermCounts(counts);
    })();
  }, [editingEmp]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Permissões & Acessos</h1>
          <p className="text-sm text-muted-foreground">Controle granular de menus, ações e perfis por colaborador</p>
        </div>
      </div>

      {/* Resumo por perfil */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROLE_OPTIONS.map((r) => (
          <Card key={r} className="border-border/50">
            <CardContent className="p-3 text-center">
              <Badge className={roleColor(r) + " mb-1 capitalize"}>{r}</Badge>
              <p className="text-lg font-bold font-mono">
                {roles.filter((ro) => ro.role === r).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Lista de colaboradores */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {filtered.map((e) => {
              const userRole = getRole(e.user_id);
              const customCount = permCounts[e.id] || 0;
              return (
                <div key={e.id} className="flex items-center gap-4 p-4 hover:bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">{e.position} · {e.department}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</span>
                    <Select
                      value={userRole || ""}
                      onValueChange={(v) => updateRole(e, v as RoleTemplate)}
                      disabled={!e.user_id}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder={e.user_id ? "Sem perfil" : "Sem login"} />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="font-mono">{customCount}</span>
                    <span>menus customizados</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(e)}
                    disabled={!e.user_id}
                    title={!e.user_id ? "Colaborador sem login vinculado" : "Editar permissões granulares"}
                  >
                    Permissões <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum colaborador encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log de Acessos */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />Log de Acessos (últimos 50)
          </p>
          <div className="max-h-[300px] overflow-auto space-y-1">
            {accessLog.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-xs p-2 rounded hover:bg-muted/30">
                <span className="font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <span className="font-medium">{l.employees?.full_name || "Sistema"}</span>
                <span className="text-muted-foreground">{l.action}</span>
                {l.details && <span className="text-muted-foreground truncate max-w-[200px]">{l.details}</span>}
              </div>
            ))}
            {accessLog.length === 0 && <p className="text-xs text-muted-foreground">Nenhum log registrado</p>}
          </div>
        </CardContent>
      </Card>

      {/* Editor de Permissões */}
      <Dialog open={!!editingEmp} onOpenChange={(o) => !o && setEditingEmp(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Permissões — <span className="font-mono text-base">{editingEmp?.full_name}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Templates rápidos */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-border/40">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> Aplicar template:
            </span>
            {ROLE_OPTIONS.map((r) => (
              <Button key={r} variant="outline" size="sm" onClick={() => applyTemplate(r)} className="capitalize h-7 text-xs">
                {r}
              </Button>
            ))}
          </div>

          {/* Tabs por grupo de menu */}
          <Tabs value={activeGroup} onValueChange={setActiveGroup} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex flex-wrap h-auto justify-start">
              {MENU_GROUPS.map((g) => (
                <TabsTrigger key={g} value={g} className="text-xs">{g}</TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-auto mt-3">
              {MENU_GROUPS.map((g) => (
                <TabsContent key={g} value={g} className="mt-0">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b border-border/40 text-xs uppercase text-muted-foreground">
                        <th className="text-left py-2 pl-2 font-medium">Menu</th>
                        {ACTIONS.map((a) => (
                          <th key={a.key} className="text-center py-2 px-2 w-20 font-medium">{a.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(menusByGroup[g] || []).map((m) => {
                        const row = perms[m.key];
                        return (
                          <tr key={m.key} className="border-b border-border/20 hover:bg-muted/20">
                            <td className="py-2 pl-2">
                              <p className="font-medium">{m.label}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{m.path}</p>
                            </td>
                            {ACTIONS.map((a) => {
                              const supported = m.actions.includes(a.key);
                              const checked = supported && !!row?.[a.col];
                              return (
                                <td key={a.key} className="text-center">
                                  {supported ? (
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => togglePerm(m.key, a.key, !!v)}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TabsContent>
              ))}
            </div>
          </Tabs>

          <DialogFooter className="border-t border-border/40 pt-3">
            <Button variant="outline" onClick={() => setEditingEmp(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Salvando..." : "Salvar permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
