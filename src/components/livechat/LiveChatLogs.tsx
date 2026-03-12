import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Play, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExecutionLog {
  id: string;
  flow_id: string;
  status: string;
  is_simulation: boolean;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  execution_path: unknown;
  variables_snapshot: unknown;
  trigger_type: string | null;
}

export function LiveChatLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [detailLog, setDetailLog] = useState<ExecutionLog | null>(null);
  const [flowNames, setFlowNames] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("flow_execution_logs").select("*").order("started_at", { ascending: false }).limit(100);
    setLogs(data || []);

    // Fetch flow names
    const flowIds = [...new Set((data || []).map(l => l.flow_id))];
    if (flowIds.length > 0) {
      const { data: flows } = await supabase.from("flows").select("id, name").in("id", flowIds);
      setFlowNames(Object.fromEntries((flows || []).map(f => [f.id, f.name])));
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l => {
    if (filter === "simulated") return l.is_simulation;
    if (filter === "error") return l.status === "error";
    if (filter === "completed") return l.status === "completed";
    return true;
  });

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    completed: { label: "Concluído", color: "text-emerald-500", icon: CheckCircle2 },
    error: { label: "Erro", color: "text-destructive", icon: AlertTriangle },
    running: { label: "Em execução", color: "text-primary", icon: Clock },
    simulated: { label: "Simulação", color: "text-violet-500", icon: Play },
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Logs & Auditoria</h2>
          <p className="text-xs text-muted-foreground">Histórico de execuções dos fluxos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="completed" className="text-xs">Concluídos</SelectItem>
              <SelectItem value="simulated" className="text-xs">Simulações</SelectItem>
              <SelectItem value="error" className="text-xs">Erros</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="text-xs gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Nenhum log encontrado</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Fluxo</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Tipo</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Blocos</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Data</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Duração</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => {
                    const sc = statusConfig[log.status] || statusConfig.completed;
                    const Icon = sc.icon;
                    const duration = log.completed_at
                      ? `${((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000).toFixed(1)}s`
                      : "—";
                    return (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <div className={`flex items-center gap-1.5 ${sc.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            <span>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-medium">{flowNames[log.flow_id] || log.flow_id.slice(0, 8)}</td>
                        <td className="px-4 py-2">
                          <Badge variant={log.is_simulation ? "secondary" : "outline"} className="text-[9px]">
                            {log.is_simulation ? "Simulação" : "Produção"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">{Array.isArray(log.execution_path) ? (log.execution_path as unknown[]).length : 0}</td>
                        <td className="px-4 py-2 text-muted-foreground">{new Date(log.started_at).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-2 font-mono">{duration}</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDetailLog(log)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Detalhes da Execução</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Fluxo:</span> <strong>{flowNames[detailLog.flow_id] || detailLog.flow_id}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <strong>{detailLog.status}</strong></div>
                <div><span className="text-muted-foreground">Início:</span> {new Date(detailLog.started_at).toLocaleString("pt-BR")}</div>
                <div><span className="text-muted-foreground">Fim:</span> {detailLog.completed_at ? new Date(detailLog.completed_at).toLocaleString("pt-BR") : "—"}</div>
              </div>
              {detailLog.error_message && (
                <div className="p-2 rounded bg-destructive/10 text-destructive">{detailLog.error_message}</div>
              )}
              <div>
                <p className="font-bold mb-1">Caminho de execução:</p>
                <pre className="p-2 rounded bg-muted text-[10px] overflow-auto max-h-[200px]">
                  {JSON.stringify(detailLog.execution_path, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-bold mb-1">Variáveis capturadas:</p>
                <pre className="p-2 rounded bg-muted text-[10px] overflow-auto max-h-[200px]">
                  {JSON.stringify(detailLog.variables_snapshot, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
