import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  scheduled_for: string;
  status: string;
  content: string | null;
  conversation_id: string | null;
  created_by: string;
  sent_at: string | null;
  failure_reason: string | null;
  created_at: string;
};

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  sending: { label: "Enviando", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  sent: { label: "Enviada", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
};

export default function OperacaoAgendadas() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("scheduled_messages")
      .select("id, scheduled_for, status, content, conversation_id, created_by, sent_at, failure_reason, created_at")
      .order("scheduled_for", { ascending: true })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Falha ao cancelar"); return; }
    toast.success("Agendamento cancelado");
    load();
  };

  const goToConv = async (convId: string | null) => {
    if (!convId) return;
    const { data } = await supabase.from("conversations").select("phone").eq("id", convId).maybeSingle();
    const digits = String(data?.phone || "").replace(/\D/g, "");
    if (digits) navigate(`/operacao/inbox?conversation=wa_${digits}`);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" /> Mensagens Agendadas</h1>
          <p className="text-sm text-muted-foreground">Mensagens programadas para envio automático no WhatsApp.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="sent">Enviadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="failed">Falharam</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lista</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma mensagem encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Quando</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead className="w-[120px]">Conversa</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const st = statusBadge[r.status] || { label: r.status, cls: "" };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell><Badge className={st.cls + " text-[10px]"}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs max-w-md truncate" title={r.content || ""}>{r.content || "(sem texto)"}</TableCell>
                        <TableCell>
                          {r.conversation_id ? (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => goToConv(r.conversation_id)}>Abrir</Button>
                          ) : <span className="text-[11px] text-muted-foreground">·</span>}
                        </TableCell>
                        <TableCell>
                          {r.status === "pending" && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => cancel(r.id)}>Cancelar</Button>
                          )}
                          {r.status === "failed" && r.failure_reason && (
                            <span className="text-[10px] text-destructive" title={r.failure_reason}>{r.failure_reason}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
