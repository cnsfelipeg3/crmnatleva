import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Paperclip, FileText, Image as ImageIcon, File, FileSpreadsheet, Download, ExternalLink, FolderOpen } from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";
import { toast } from "sonner";
import { getProductLabel } from "@/lib/productTypes";
import { AttachmentsSkeleton } from "@/components/skeletons/PageSkeletons";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  category: string;
  created_at: string;
}

const CATEGORY_MAP: Record<string, string> = {
  // Novas categorias setorizadas (NewSale wizard)
  prints_emissao:     "Prints para Emissão",
  voucher_aereo:      "Voucher Aéreo",
  voucher_hospedagem: "Voucher Hospedagem",
  voucher_transfer:   "Voucher Transfer",
  voucher_pacote:     "Voucher Pacote",
  ingressos:          "Ingressos",
  comprovante:        "Comprovante de Pagamento",
  nota_fiscal:        "Nota Fiscal",
  outros:             "Outros",
  // Legado · vendas antigas continuam renderizando com seus labels originais
  voucher:            "Vouchers",
  aereo:              getProductLabel("aereo"),
  hotel:              getProductLabel("hospedagem"),
  seguro:             getProductLabel("seguro-viagem"),
};

/**
 * Heurística para inferir categoria a partir do nome do arquivo quando o
 * registro veio salvo como "outros" (ex.: vendas legado ou uploads antigos).
 * Mantém a categoria original quando ela já é específica.
 */
function inferCategoryFromName(name: string, original: string): string {
  if (original && original !== "outros") return original;
  const n = (name || "").toLowerCase();
  if (/espelho|print|reserva.*print|emiss[aã]o/.test(n) && !/voucher/.test(n)) return "prints_emissao";
  if (/voucher.*a[eé]reo|aereo|a[eé]reo|bilhete|e-?ticket|passagem/.test(n)) return "voucher_aereo";
  if (/voucher.*(hotel|hosped|pousada|resort)|hotel|hosped|pousada|resort/.test(n)) return "voucher_hospedagem";
  if (/transfer|traslado|translad/.test(n)) return "voucher_transfer";
  if (/pacote|operadora/.test(n)) return "voucher_pacote";
  if (/ingresso|ticket\b|parque|show|atra[cç][aã]o|disney|universal/.test(n)) return "ingressos";
  if (/comprovante|pix|pagamento|pago|cart[aã]o|boleto|recibo/.test(n)) return "comprovante";
  if (/nota.?fiscal|\bnf\b|nfe/.test(n)) return "nota_fiscal";
  if (/passaporte|rg|cpf|documento|cnh/.test(n)) return "outros";
  return original || "outros";
}

function getFileIcon(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { Icon: FileText, color: "text-destructive" };
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return { Icon: ImageIcon, color: "text-info" };
  if (["xls", "xlsx"].includes(ext || "")) return { Icon: FileSpreadsheet, color: "text-emerald-600" };
  return { Icon: File, color: "text-muted-foreground" };
}

function getFileLabel(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "Imagem";
  if (["doc", "docx"].includes(ext || "")) return "Word";
  if (["xls", "xlsx"].includes(ext || "")) return "Excel";
  return ext?.toUpperCase() || "Arquivo";
}

async function downloadFile(att: Attachment) {
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
    toast.success(`${att.file_name} baixado`);
  } catch {
    window.open(att.file_url, "_blank");
  }
}

function AttachmentRow({ att }: { att: Attachment }) {
  const { Icon, color } = getFileIcon(att.file_name);
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{att.file_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{getFileLabel(att.file_name)}</span>
          <span className="text-[10px] text-muted-foreground">{formatDateBR(att.created_at)}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => window.open(att.file_url, "_blank", "noopener,noreferrer")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Abrir"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={async () => { setDownloading(true); await downloadFile(att); setDownloading(false); }}
          disabled={downloading}
          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
          title="Baixar"
        >
          {downloading
            ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            : <Download className="w-3.5 h-3.5 text-primary" />
          }
        </button>
      </div>
    </div>
  );
}

export default function SaleAttachmentsSection({ attachments, loading = false }: { attachments: Attachment[]; loading?: boolean }) {
  if (loading) return <AttachmentsSkeleton rows={4} />;
  const grouped = useMemo(() => {
    const map: Record<string, Attachment[]> = {};
    attachments.forEach(att => {
      const key = inferCategoryFromName(att.file_name || "", att.category || "outros");
      if (!map[key]) map[key] = [];
      map[key].push(att);
    });
    return map;
  }, [attachments]);

  const CATEGORY_ORDER = [
    "prints_emissao", "voucher_aereo", "voucher_hospedagem", "voucher_transfer",
    "voucher_pacote", "ingressos", "comprovante", "nota_fiscal",
    "voucher", "aereo", "hotel", "seguro", "outros",
  ];
  const categories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_ORDER.indexOf(a) === -1 ? 99 : CATEGORY_ORDER.indexOf(a)) - (CATEGORY_ORDER.indexOf(b) === -1 ? 99 : CATEGORY_ORDER.indexOf(b))
  );

  if (!attachments.length) {
    return (
      <Card className="p-5 glass-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Paperclip className="w-3.5 h-3.5 text-primary" />
          </div>
          Arquivos e Documentos
        </h3>
        <div className="text-center py-8">
          <FolderOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum arquivo encontrado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 glass-card">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Paperclip className="w-3.5 h-3.5 text-primary" />
        </div>
        Arquivos e Documentos
        <Badge variant="secondary" className="text-[10px] ml-1">{attachments.length}</Badge>
      </h3>

      {categories.length === 1 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {CATEGORY_MAP[categories[0]] || categories[0]}
          </p>
          {grouped[categories[0]].map(att => <AttachmentRow key={att.id} att={att} />)}
        </div>
      ) : (
        <Tabs defaultValue={categories[0]}>
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0 mb-3">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {CATEGORY_MAP[cat] || cat}
                <Badge variant="neutral" className="text-[9px] px-1.5 py-0">{grouped[cat].length}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-2 mt-0">
              {grouped[cat].map(att => <AttachmentRow key={att.id} att={att} />)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </Card>
  );
}
