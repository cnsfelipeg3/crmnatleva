import { BookOpen, Search, Upload, FileText, Image, Video, Link, Music, Eye, Trash2, Download } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KB_TIPOS = [
  { id: "all", label: "Todos", icon: FileText },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "texto", label: "Texto", icon: FileText },
  { id: "imagem", label: "Imagem", icon: Image },
  { id: "video", label: "Vídeo", icon: Video },
  { id: "link", label: "Link", icon: Link },
  { id: "audio", label: "Áudio", icon: Music },
];

interface KBDoc {
  id: string;
  title: string;
  tipo: string;
  tags: string[];
  agente: string;
  resumo: string;
  chunks: number;
  updatedAt: string;
  status: "processado" | "processando" | "erro";
  size: string;
  content?: string;
}

const MOCK_DOCS: KBDoc[] = [
  { id: "1", title: "Catálogo Dubai 2026", tipo: "pdf", tags: ["dubai", "hotéis", "experiências"], agente: "HABIBI", resumo: "Guia completo de hotéis 5 estrelas, experiências VIP e roteiros exclusivos em Dubai para 2026. Inclui Atlantis The Royal, Burj Al Arab, Four Seasons DIFC e experiências como desert safari premium, jantar no Al Mahara e passeio de iate.", chunks: 5, updatedAt: "22/03/2026", status: "processado", size: "2.4 MB" },
  { id: "2", title: "Política de Preços Orlando", tipo: "pdf", tags: ["orlando", "preços", "parques"], agente: "NEMO", resumo: "Tabela de preços e markups para pacotes Orlando, Disney, Universal e experiências. Define markup mínimo de 12% para alta temporada e 8% para baixa.", chunks: 3, updatedAt: "20/03/2026", status: "processado", size: "890 KB" },
  { id: "3", title: "Script de Boas-vindas WhatsApp", tipo: "texto", tags: ["script", "boas-vindas", "whatsapp"], agente: "MAYA", resumo: "Modelo de mensagem de primeiro contato via WhatsApp com variações por perfil: casal, família, lua de mel, corporativo e grupo.", chunks: 2, updatedAt: "21/03/2026", status: "processado", size: "12 KB" },
  { id: "4", title: "Roteiros Europa Premium", tipo: "pdf", tags: ["europa", "itália", "frança", "roteiros"], agente: "DANTE", resumo: "Roteiros detalhados para Itália, França e Espanha com foco em experiências premium. Wine tours exclusivos, chef's table, visitas guiadas privadas.", chunks: 8, updatedAt: "19/03/2026", status: "processado", size: "5.1 MB" },
  { id: "5", title: "FAQ Objeções de Preço", tipo: "texto", tags: ["objeções", "preço", "negociação"], agente: "Todos", resumo: "Banco de respostas para as 15 objeções de preço mais frequentes com scripts testados e taxa de conversão de cada abordagem.", chunks: 4, updatedAt: "23/03/2026", status: "processado", size: "28 KB" },
  { id: "6", title: "Vídeo: Tour Hotel Atlantis", tipo: "video", tags: ["dubai", "atlantis", "hotel"], agente: "HABIBI", resumo: "Tour virtual pelo Hotel Atlantis The Royal com foco em suítes e restaurantes. Inclui suíte real com tobogã privativo.", chunks: 1, updatedAt: "18/03/2026", status: "processado", size: "45 MB" },
  { id: "7", title: "Guia Maldivas 2026", tipo: "pdf", tags: ["maldivas", "resorts", "lua de mel"], agente: "HABIBI", resumo: "Os 10 melhores resorts overwater das Maldivas com comparativo de preços, facilidades e experiências.", chunks: 6, updatedAt: "17/03/2026", status: "processando", size: "3.8 MB" },
  { id: "8", title: "Tabela de Fornecedores", tipo: "pdf", tags: ["fornecedores", "operadoras", "contatos"], agente: "OPEX", resumo: "Lista completa de fornecedores homologados com contatos, condições comerciais e prazos.", chunks: 3, updatedAt: "15/03/2026", status: "processado", size: "1.2 MB" },
];

const TIPO_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  texto: FileText,
  imagem: Image,
  video: Video,
  link: Link,
  audio: Music,
};

export default function AITeamConhecimento() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<KBDoc | null>(null);

  const filtered = MOCK_DOCS.filter(doc => {
    const matchSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.tags.some(t => t.includes(search.toLowerCase()));
    const matchTipo = tipoFilter === "all" || doc.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const totalChunks = MOCK_DOCS.reduce((acc, d) => acc + d.chunks, 0);
  const processedCount = MOCK_DOCS.filter(d => d.status === "processado").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">{MOCK_DOCS.length} documentos · {totalChunks} chunks · {processedCount} processados</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => toast.info("Upload disponível em breve")}><Upload className="w-4 h-4" /> Upload Documento</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Documentos", value: MOCK_DOCS.length, color: "text-blue-500" },
          { label: "Chunks RAG", value: totalChunks, color: "text-purple-500" },
          { label: "Processados", value: `${processedCount}/${MOCK_DOCS.length}`, color: "text-emerald-500" },
          { label: "Agentes Usando", value: [...new Set(MOCK_DOCS.map(d => d.agente))].length, color: "text-amber-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-3 text-center">
            <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por título ou tag..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {KB_TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipoFilter(t.id)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                tipoFilter === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Documents grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(doc => {
          const TipoIcon = TIPO_ICONS[doc.tipo] || FileText;
          return (
            <div key={doc.id} className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedDoc(doc)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TipoIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">{doc.tipo.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {doc.status === "processando" && (
                    <Badge className="bg-amber-500/10 text-amber-600 text-[9px]">Processando...</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{doc.updatedAt}</span>
                </div>
              </div>
              <h3 className="text-sm font-bold mb-1">{doc.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.resumo}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {doc.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>📌 {doc.agente}</span>
                <span>{doc.chunks} chunks · {doc.size}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Doc Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {selectedDoc?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{selectedDoc.tipo.toUpperCase()}</Badge>
                <Badge variant={selectedDoc.status === "processado" ? "default" : "secondary"} className="text-xs">
                  {selectedDoc.status === "processado" ? "✓ Processado" : "⏳ Processando"}
                </Badge>
                <span className="text-xs text-muted-foreground">{selectedDoc.size}</span>
              </div>
              
              <p className="text-sm text-muted-foreground">{selectedDoc.resumo}</p>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedDoc.chunks}</p>
                  <p className="text-[10px] text-muted-foreground">Chunks RAG</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-sm">{selectedDoc.agente}</p>
                  <p className="text-[10px] text-muted-foreground">Agente</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-sm">{selectedDoc.updatedAt}</p>
                  <p className="text-[10px] text-muted-foreground">Atualizado</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 flex-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-500 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
