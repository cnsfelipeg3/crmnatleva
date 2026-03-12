import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Search, Eye, Trash2, Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { fetchAllRows } from "@/lib/fetchAll";

export default function PortalAdminDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchAllRows("attachments", "*", undefined, { cacheMs: 30000 });
      setDocuments(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = documents.filter(
    (d) =>
      d.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColor = (cat: string) => {
    const c = cat?.toLowerCase();
    if (c === "voucher") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (c === "comprovante") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (c === "passaporte") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos do Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie documentos disponíveis para os viajantes no portal
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum documento encontrado</h3>
          <p className="text-sm text-muted-foreground">Documentos anexados às vendas aparecerão aqui.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.slice(0, 50).map((doc) => (
            <Card key={doc.id} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Badge variant="outline" className={categoryColor(doc.category)}>
                {doc.category || "Geral"}
              </Badge>
              {doc.file_url && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
