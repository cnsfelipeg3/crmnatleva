import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Inbox, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExcludedConversation {
  id: string;
  phone: string | null;
  contact_name: string | null;
  display_name: string | null;
  excluded_at: string;
  excluded_reason: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export default function ConversasExcluidas() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ExcludedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, phone, contact_name, display_name, excluded_at, excluded_reason, last_message_at, last_message_preview")
      .not("excluded_at", "is", null)
      .order("excluded_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const { error } = await supabase
      .from("conversations")
      .update({ excluded_at: null, excluded_reason: null } as any)
      .eq("id", id);
    setRestoringId(null);
    if (error) {
      toast({ title: "Erro ao reativar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conversa reativada", description: "A conversa voltou a aparecer no inbox." });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversas Excluídas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de conversas removidas do inbox via fluxo de exclusão. Você pode reativar para que voltem a aparecer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Nenhuma conversa excluída no momento.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {r.contact_name || r.display_name || r.phone || "Sem nome"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.phone} · Excluída em{" "}
                  {format(new Date(r.excluded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {r.excluded_reason && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    Motivo: {r.excluded_reason}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={restoringId === r.id}
                onClick={() => handleRestore(r.id)}
              >
                {restoringId === r.id ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Reativar
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
