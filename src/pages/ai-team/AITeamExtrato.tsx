import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt, Search, RefreshCw, Plus, Pencil, Trash2, CheckCircle,
  Archive, Upload, Zap, ZapOff, Bot, BookOpen, Shield, Wand2,
  GitBranch, Brain, FlaskConical, Settings, Clock, User, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  approve: CheckCircle,
  archive: Archive,
  import: Upload,
  activate: Zap,
  deactivate: ZapOff,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-emerald-500",
  update: "text-blue-500",
  delete: "text-destructive",
  approve: "text-purple-500",
  archive: "text-amber-500",
  import: "text-cyan-500",
  activate: "text-emerald-500",
  deactivate: "text-muted-foreground",
};

const ENTITY_ICONS: Record<string, typeof Bot> = {
  improvement: Zap,
  knowledge: BookOpen,
  rule: Shield,
  skill: Wand2,
  agent: Bot,
  mission: Brain,
  flow: GitBranch,
  prompt: Settings,
  lab_result: FlaskConical,
  config: Settings,
};

const ENTITY_LABELS: Record<string, string> = {
  improvement: "Melhoria",
  knowledge: "Conhecimento",
  rule: "Regra",
  skill: "Skill",
  agent: "Agente",
  mission: "Missão",
  flow: "Flow",
  prompt: "Prompt",
  lab_result: "Teste Lab",
  config: "Configuração",
};

export default function AITeamExtrato() {
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["ai_team_audit_log", filterEntity, filterAction],
    queryFn: async () => {
      let query = (supabase.from("ai_team_audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterEntity !== "all") query = query.eq("entity_type", filterEntity);
      if (filterAction !== "all") query = query.eq("action_type", filterAction);

      const { data } = await query;
      return (data || []) as any[];
    },
  });

  const filtered = search.trim()
    ? entries.filter((e: any) =>
        (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.entity_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.agent_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.performed_by || "").toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  // Group by date
  const grouped: Record<string, any[]> = {};
  filtered.forEach((entry: any) => {
    const day = format(new Date(entry.created_at), "yyyy-MM-dd");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  });

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Extrato do AI Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline completa de todas as modificações, melhorias e ações no ecossistema
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, agente, autor..."
            className="pl-8 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Atualização</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
            <SelectItem value="approve">Aprovação</SelectItem>
            <SelectItem value="archive">Arquivamento</SelectItem>
            <SelectItem value="activate">Ativação</SelectItem>
            <SelectItem value="deactivate">Desativação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando extrato...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              As ações realizadas no AI Team aparecerão aqui automaticamente
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayEntries]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1 mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {format(new Date(day), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="relative pl-6 border-l-2 border-border/50 space-y-3">
                  {dayEntries.map((entry: any) => {
                    const ActionIcon = ACTION_ICONS[entry.action_type] || Pencil;
                    const actionColor = ACTION_COLORS[entry.action_type] || "text-muted-foreground";
                    const EntityIcon = ENTITY_ICONS[entry.entity_type] || Settings;
                    const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;

                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center`}>
                          <ActionIcon className={`w-2.5 h-2.5 ${actionColor}`} />
                        </div>

                        <Card className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-md bg-muted shrink-0`}>
                                <EntityIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {entityLabel}
                                  </Badge>
                                  {entry.agent_name && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      <Bot className="w-2.5 h-2.5 mr-0.5" />
                                      {entry.agent_name}
                                    </Badge>
                                  )}
                                  {entry.entity_name && (
                                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                                      {entry.entity_name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{entry.description}</p>

                                {/* Meta info row */}
                                <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(entry.created_at), "HH:mm:ss", { locale: ptBR })}
                                  </span>
                                  {entry.performed_by && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {entry.performed_by}
                                    </span>
                                  )}
                                  {entry.approved_by && (
                                    <span className="flex items-center gap-1 text-purple-500">
                                      <CheckCircle className="w-3 h-3" />
                                      Aprovado por {entry.approved_by}
                                      {entry.approved_at && (
                                        <> às {format(new Date(entry.approved_at), "HH:mm")}</>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* Details expandable */}
                                {entry.details && Object.keys(entry.details).length > 0 && (
                                  <details className="mt-2">
                                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                                      Ver detalhes técnicos
                                    </summary>
                                    <pre className="text-[10px] bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-[120px]">
                                      {JSON.stringify(entry.details, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Stats footer */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30">
          <span>{filtered.length} registros</span>
          <span>•</span>
          <span>{Object.keys(grouped).length} dias</span>
        </div>
      )}
    </div>
  );
}
