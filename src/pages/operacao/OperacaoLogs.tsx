/**
 * @deprecated 06/05/2026 — tela ocultada do menu por estar vazia (nenhuma automação grava em ai_execution_logs).
 * Para reativar:
 *   1. Descomentar a entrada de menu em src/components/AppSidebar.tsx
 *   2. Descomentar o lazy import e a <Route> em src/App.tsx
 *   3. Garantir que automações/IA estão gravando em `ai_execution_logs`
 * Arquivo, componentes e tabela preservados intencionalmente.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, Search, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OperacaoLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_execution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = search.trim()
    ? logs.filter(l =>
        (l.provider || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.model || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.input_summary || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const StatusIcon = ({ status }: { status?: string | null }) => {
    if (!status || status === "success") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />
            Logs & Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de execuções de IA e automações</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar logs..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <ScrollText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)]">
          <div className="space-y-2">
            {filtered.map(log => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <StatusIcon status={log.error_message ? "error" : "success"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{log.provider}</span>
                      {log.model && <Badge variant="secondary" className="text-[10px]">{log.model}</Badge>}
                      {log.response_time_ms && (
                        <span className="text-[10px] text-muted-foreground">{log.response_time_ms}ms</span>
                      )}
                    </div>
                    {log.input_summary && <p className="text-xs text-muted-foreground mt-1 truncate">{log.input_summary}</p>}
                    {log.error_message && <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
