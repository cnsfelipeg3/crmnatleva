import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plane, Hotel, Shield, Ticket, CreditCard, MapPin, FileText, FolderOpen,
  Download, Eye, Search, X, Star, ExternalLink,
} from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  category: string;
  created_at: string;
  cost_item_id?: string;
}

interface PortalDocumentsCenterProps {
  attachments: Attachment[];
  sale: any;
  segments: any[];
  hotels: any[];
  services: any[];
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; priority: number }> = {
  aereo: { label: "Aéreo", icon: Plane, priority: 1 },
  hotel: { label: "Hospedagem", icon: Hotel, priority: 2 },
  voucher: { label: "Hospedagem", icon: Hotel, priority: 2 },
  seguro: { label: "Seguro Viagem", icon: Shield, priority: 3 },
  ingresso: { label: "Ingressos", icon: Ticket, priority: 4 },
  comprovante: { label: "Financeiro", icon: CreditCard, priority: 5 },
  roteiro: { label: "Itinerário", icon: MapPin, priority: 6 },
  outros: { label: "Outros", icon: FolderOpen, priority: 7 },
};

function getCategory(cat: string) {
  return CATEGORY_MAP[cat] || CATEGORY_MAP.outros;
}

function getFileIcon(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return "🖼️";
  if (["doc", "docx"].includes(ext || "")) return "📝";
  if (["xls", "xlsx"].includes(ext || "")) return "📊";
  return "📎";
}

function isPriorityDoc(att: Attachment, sale: any) {
  const priorityCats = ["aereo", "seguro"];
  if (priorityCats.includes(att.category)) return true;
  if (att.category === "hotel" || att.category === "voucher") return true;
  return false;
}

const FILTER_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "aereo", label: "Voos" },
  { key: "hotel", label: "Hotéis" },
  { key: "seguro", label: "Seguro" },
  { key: "ingresso", label: "Ingressos" },
  { key: "comprovante", label: "Pagamentos" },
  { key: "roteiro", label: "Itinerário" },
];

export default function PortalDocumentsCenter({ attachments, sale, segments, hotels, services }: PortalDocumentsCenterProps) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...attachments];
    if (filter !== "all") {
      list = list.filter(a => {
        if (filter === "hotel") return a.category === "hotel" || a.category === "voucher";
        return a.category === filter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.file_name?.toLowerCase().includes(q) ||
        getCategory(a.category).label.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const pa = isPriorityDoc(a, sale) ? 0 : 1;
      const pb = isPriorityDoc(b, sale) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return getCategory(a.category).priority - getCategory(b.category).priority;
    });
    return list;
  }, [attachments, filter, search, sale]);

  const grouped = useMemo(() => {
    const map: Record<string, Attachment[]> = {};
    filtered.forEach(att => {
      const key = att.category === "voucher" ? "hotel" : att.category;
      if (!map[key]) map[key] = [];
      map[key].push(att);
    });
    return Object.entries(map).sort(([a], [b]) =>
      (getCategory(a).priority) - (getCategory(b).priority)
    );
  }, [filtered]);

  const activeFilters = useMemo(() => {
    const cats = new Set(attachments.map(a => a.category === "voucher" ? "hotel" : a.category));
    return FILTER_OPTIONS.filter(f => f.key === "all" || cats.has(f.key));
  }, [attachments]);

  function openDocument(att: Attachment) {
    window.open(att.file_url, "_blank", "noopener,noreferrer");
  }

  if (!attachments.length) {
    return (
      <div className="text-center py-10">
        <FolderOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum documento disponível ainda.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Seus documentos aparecerão aqui quando forem adicionados pela NatLeva.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/30 border-border/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {activeFilters.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {activeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>{filtered.length} documento{filtered.length !== 1 ? "s" : ""}</span>
        {filter !== "all" && (
          <Badge variant="secondary" className="text-[10px]">{FILTER_OPTIONS.find(f => f.key === filter)?.label}</Badge>
        )}
      </div>

      {/* Document Groups */}
      <div className="space-y-5">
        {grouped.map(([cat, docs]) => {
          const catConfig = getCategory(cat);
          const CatIcon = catConfig.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2.5">
                <CatIcon className="h-4 w-4 text-accent" />
                <h4 className="text-sm font-semibold text-foreground">{catConfig.label}</h4>
                <span className="text-xs text-muted-foreground">({docs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {docs.map(att => {
                  const priority = isPriorityDoc(att, sale);
                  return (
                    <motion.div
                      key={att.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
                        priority
                          ? "bg-accent/5 border-accent/20 hover:border-accent/40"
                          : "bg-muted/20 border-border/50 hover:border-border"
                      }`}
                      onClick={() => openDocument(att)}
                    >
                      <div className="w-11 h-11 rounded-lg bg-background flex items-center justify-center flex-shrink-0 text-lg border border-border/30">
                        {getFileIcon(att.file_name)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {priority && <Star className="h-3 w-3 text-accent flex-shrink-0" />}
                          <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(att.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); openDocument(att); }}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Visualizar"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <a
                          href={att.file_url}
                          download
                          onClick={e => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
        </div>
      )}
    </div>
  );
}
