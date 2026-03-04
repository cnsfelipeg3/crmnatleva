import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Users, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  gestor: { label: "Gestor", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  vendedor: { label: "Vendedor", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  operacional: { label: "Operacional", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  financeiro: { label: "Financeiro", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  leitura: { label: "Somente Leitura", color: "bg-muted text-muted-foreground border-border" },
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Acesso total ao sistema, gerenciamento de usuários e configurações",
  gestor: "Visualiza todas as vendas, relatórios e métricas da equipe",
  vendedor: "Acessa apenas suas próprias vendas e clientes",
  operacional: "Campos técnicos, anexos e check-in",
  financeiro: "Custos, dashboard financeiro e relatórios",
  leitura: "Acesso somente leitura a todas as áreas",
};

async function callAdminApi(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const resp = await supabase.functions.invoke("admin-users", {
    body: { action, ...params },
  });
  if (resp.error) throw new Error(resp.error.message);
  if (resp.data?.error) throw new Error(resp.data.error);
  return resp.data;
}

export default function AdminUsers() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "vendedor" as string });
  const [showPassword, setShowPassword] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const result = await callAdminApi("list");
      return result.users || [];
    },
    enabled: role === "admin",
  });

  const inviteMutation = useMutation({
    mutationFn: () => callAdminApi("invite", form),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setInviteOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "vendedor" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (params: { user_id: string; role: string }) => callAdminApi("update_role", params),
    onSuccess: () => {
      toast.success("Permissão atualizada!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => callAdminApi("delete", { user_id }),
    onSuccess: () => {
      toast.success("Usuário removido!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground mt-2">Apenas administradores podem acessar esta área.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">Cadastre, edite permissões e gerencie os acessos ao sistema</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Usuário</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Senha inicial</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Função / Permissão</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{label}</span>
                          <span className="text-[10px] text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ROLE_LABELS).map(([key, { label, color }]) => {
          const count = users.filter((u: any) => u.role === key).length;
          return (
            <Card key={key} className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <Badge variant="outline" className={`text-[10px] mt-1 ${color}`}>{label}</Badge>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((u: any) => {
                const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.vendedor;
                const isMe = u.id === user?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || "—"}
                      {isMe && <Badge variant="outline" className="ml-2 text-[9px]">Você</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(newRole) => {
                          if (newRole !== u.role) {
                            updateRoleMutation.mutate({ user_id: u.id, role: newRole });
                          }
                        }}
                        disabled={isMe}
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <Badge variant="outline" className={`text-[10px] ${roleInfo.color}`}>
                            {roleInfo.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {!isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover ${u.full_name || u.email}? Esta ação não pode ser desfeita.`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
