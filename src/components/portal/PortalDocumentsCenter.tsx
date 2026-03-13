import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plane, Hotel, Shield, Ticket, CreditCard, MapPin, FileText, FolderOpen,
  Download, Eye, Search, X, Star, ExternalLink, DownloadCloud, Filter,
  CheckCircle2, File, Image as ImageIcon, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

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

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; priority: number }> = {
  aereo: { label: "Aéreo", icon: Plane, color: "text-info", priority: 1 },
  hotel: { label: "Hospedagem", icon: Hotel, color: "text-accent", priority: 2 },
  voucher: { label: "Hospedagem", icon: Hotel, color: "text-accent", priority: 2 },
  seguro: { label: "Seguro Viagem", icon: Shield, color: "text-warning", priority: 3 },
  ingresso: { label: "Ingressos", icon: Ticket, color: "text-primary", priority: 4 },
  comprovante: { label: "Financeiro", icon: CreditCard, color: "text-success", priority: 5 },
  roteiro: { label: "Itinerário", icon: MapPin, color: "text-info", priority: 6 },
  outros: { label: "Outros", icon: FolderOpen, color: "text-muted-foreground", priority: 7 },
};

function getCategory(cat: string) {
  return CATEGORY_MAP[cat] || CATEGORY_MAP.outros;
}

function getFileIcon(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { icon: FileText, color: "text-destructive" };
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return { icon: ImageIcon, color: "text-info" };
  if (["doc", "docx"].includes(ext || "")) return { icon: File, color: "text-primary" };
  if (["xls", "xlsx"].includes(ext || "")) return { icon: FileSpreadsheet, color: "text-success" };
  return { icon: File, color: "text-muted-foreground" };
}

function getFileSize(fileName: string) {
  // Estimate based on extension
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "Imagem";
  if (["doc", "docx"].includes(ext || "")) return "Word";
  if (["xls", "xlsx"].includes(ext || "")) return "Excel";
  return ext?.toUpperCase() || "Arquivo";
}

function isPriorityDoc(att: Attachment) {
  const priorityCats = ["aereo", "seguro"];
  if (priorityCats.includes(att.category)) return true;
  if (att.category === "hotel" || att.category === "voucher") return true;
  return false;
}

const FILTER_OPTIONS = [
  { key: "all", label: "Todos", icon: FolderOpen },
  { key: "aereo", label: "Voos", icon: Plane },
  { key: "hotel", label: "Hotéis", icon: Hotel },
  { key: "seguro", label: "Seguro", icon: Shield },
  { key: "ingresso", label: "Ingressos", icon: Ticket },
  { key: "comprovante", label: "Pagamentos", icon: CreditCard },
  { key: "roteiro", label: "Itinerário", icon: MapPin },
];

export default function PortalDocumentsCenter({ attachments, sale, segments, hotels, services }: PortalDocumentsCenterProps) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

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
      const pa = isPriorityDoc(a) ? 0 : 1;
      const pb = isPriorityDoc(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return getCategory(a.category).priority - getCategory(b.category).priority;
    });
    return list;
  }, [attachments, filter, search]);

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

  async function downloadDocument(att: Attachment, e: React.MouseEvent) {
    e.stopPropagation();
    setDownloading(att.id);
    try {
      const response = await fetch(att.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`${att.file_name} baixado com sucesso`);
    } catch {
      // Fallback: open in new tab
      window.open(att.file_url, "_blank");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    toast.info("Iniciando download dos documentos...");
    for (const att of filtered) {
      try {
        const response = await fetch(att.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = att.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      } catch {
        window.open(att.file_url, "_blank");
      }
    }
    toast.success(`${filtered.length} documento${filtered.length > 1 ? "s" : ""} baixado${filtered.length > 1 ? "s" : ""}`);
  }

  if (!attachments.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
          <FolderOpen className="h-10 w-10 text-muted-foreground/20" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">Nenhum documento ainda</p>
        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
          Seus documentos de viagem aparecerão aqui assim que forem adicionados pela equipe NatLeva.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with search + download all */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/20 border-border/40 rounded-xl"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {filtered.length > 1 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadAll}
            className="flex items-center gap-2 text-xs font-semibold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 px-4 py-2.5 rounded-xl transition-colors"
          >
            <DownloadCloud className="h-4 w-4" />
            Baixar todos ({filtered.length})
          </motion.button>
        )}
      </div>

      {/* Filter pills */}
      {activeFilters.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {activeFilters.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>{filtered.length} documento{filtered.length !== 1 ? "s" : ""}</span>
        {filter !== "all" && (
          <Badge variant="secondary" className="text-[10px]">{FILTER_OPTIONS.find(f => f.key === filter)?.label}</Badge>
        )}
      </div>

      {/* Document Groups */}
      <div className="space-y-6">
        {grouped.map(([cat, docs]) => {
          const catConfig = getCategory(cat);
          const CatIcon = catConfig.icon;
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center`}>
                  <CatIcon className={`h-3.5 w-3.5 ${catConfig.color}`} />
                </div>
                <h4 className="text-sm font-bold text-foreground">{catConfig.label}</h4>
                <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{docs.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {docs.map((att, i) => {
                  const priority = isPriorityDoc(att);
                  const fileInfo = getFileIcon(att.file_name);
                  const FileIcon = fileInfo.icon;
                  const isDownloading = downloading === att.id;

                  return (
                    <motion.div
                      key={att.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        priority
                          ? "bg-accent/[0.03] border-accent/15 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5"
                          : "bg-card border-border/30 hover:border-border/60 hover:shadow-sm"
                      }`}
                      onClick={() => openDocument(att)}
                    >
                      {/* File icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        priority ? "bg-accent/10" : "bg-muted/40"
                      }`}>
                        <FileIcon className={`h-5 w-5 ${fileInfo.color}`} />
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {priority && <Star className="h-3 w-3 text-accent flex-shrink-0" />}
                          <p className="text-sm font-semibold text-foreground truncate">{att.file_name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                            {getFileSize(att.file_name)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(att.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={e => { e.stopPropagation(); openDocument(att); }}
                          className="p-2.5 rounded-xl hover:bg-muted transition-colors"
                          title="Visualizar"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={e => downloadDocument(att, e)}
                          disabled={isDownloading}
                          className="p-2.5 rounded-xl hover:bg-accent/10 transition-colors"
                          title="Baixar"
                        >
                          {isDownloading ? (
                            <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 text-accent" />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-10"
        >
          <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum documento encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente outro filtro ou termo de busca</p>
        </motion.div>
      )}
    </div>
  );
}
