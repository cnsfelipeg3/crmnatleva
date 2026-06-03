import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Search, Store, Mail, Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AffiliateStatus = "pending" | "approved" | "rejected";

type Affiliate = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: AffiliateStatus;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
};

const STATUS_META: Record<AffiliateStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  approved: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  rejected: { label: "Rejeitado", cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function AdminVitrine() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<AffiliateStatus>("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Affiliate | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Affiliate[];
    },
    enabled: role === "admin",
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AffiliateStatus; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = { status, updated_at: new Date().toISOString() };
      if (status === "approved") {
        payload.approved_at = new Date().toISOString();
        payload.approved_by = user?.id ?? null;
      }
      if (notes !== undefined) payload.notes = notes;
      const { error } = await supabase.from("affiliates").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success(vars.status === "approved" ? "Afiliado aprovado · email enviado" : "Cadastro rejeitado · email enviado");
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar"),
  });

  if (role !== "admin") {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </Card>
      </div>
    );
  }

  const filtered = affiliates.filter((a) => {
    if (a.status !== tab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q)
    );
  });

  const counts = {
    pending: affiliates.filter((a) => a.status === "pending").length,
    approved: affiliates.filter((a) => a.status === "approved").length,
    rejected: affiliates.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Vitrine · Afiliados</h1>
          <p className="text-sm text-muted-foreground">Aprove ou rejeite cadastros de afiliados. O email é enviado automaticamente.</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as AffiliateStatus)}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                Pendentes {counts.pending > 0 && <Badge variant="secondary">{counts.pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                Aprovados <Badge variant="secondary">{counts.approved}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                Rejeitados <Badge variant="secondary">{counts.rejected}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum cadastro {STATUS_META[tab].label.toLowerCase()}.</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{a.email}</span>
                      {a.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{a.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_META[a.status].cls}>{STATUS_META[a.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === "pending" ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="h-4 w-4" />Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => { setRejectTarget(a); setRejectReason(""); }}
                          disabled={updateStatus.isPending}
                        >
                          <X className="h-4 w-4" />Rejeitar
                        </Button>
                      </div>
                    ) : a.status === "rejected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}
                      >
                        Aprovar agora
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setRejectTarget(a); setRejectReason(""); }}
                      >
                        Revogar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar cadastro · {rejectTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Opcional · descreva o motivo. Será incluído no email enviado ao afiliado.</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: cadastro duplicado, dados incompletos..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectTarget && updateStatus.mutate({ id: rejectTarget.id, status: "rejected", notes: rejectReason || null as any })}
              disabled={updateStatus.isPending}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
