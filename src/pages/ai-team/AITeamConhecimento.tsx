import { BookOpen, Search, Upload, FileText, Image, Video, Link, Music } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KB_TIPOS = [
  { id: "all", label: "Todos", icon: FileText },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "texto", label: "Texto", icon: FileText },
  { id: "imagem", label: "Imagem", icon: Image },
  { id: "video", label: "Vídeo", icon: Video },
  { id: "link", label: "Link", icon: Link },
  { id: "audio", label: "Áudio", icon: Music },
];

const MOCK_DOCS = [
  { id: "1", title: "Catálogo Dubai 2026", tipo: "pdf", tags: ["dubai", "hotéis", "experiências"], agente: "HABIBI", resumo: "Guia completo de hotéis 5 estrelas, experiências VIP e roteiros exclusivos em Dubai para 2026.", chunks: 5, updatedAt: "22/03/2026" },
  { id: "2", title: "Política de Preços Orlando", tipo: "pdf", tags: ["orlando", "preços", "parques"], agente: "NEMO", resumo: "Tabela de preços e markups para pacotes Orlando, Disney, Universal e experiências.", chunks: 3, updatedAt: "20/03/2026" },
  { id: "3", title: "Script de Boas-vindas WhatsApp", tipo: "texto", tags: ["script", "boas-vindas", "whatsapp"], agente: "MAYA", resumo: "Modelo de mensagem de primeiro contato via WhatsApp com variações por perfil.", chunks: 2, updatedAt: "21/03/2026" },
  { id: "4", title: "Roteiros Europa Premium", tipo: "pdf", tags: ["europa", "itália", "frança", "roteiros"], agente: "DANTE", resumo: "Roteiros detalhados para Itália, França e Espanha com foco em experiências premium.", chunks: 8, updatedAt: "19/03/2026" },
  { id: "5", title: "FAQ Objeções de Preço", tipo: "texto", tags: ["objeções", "preço", "negociação"], agente: "Todos", resumo: "Banco de respostas para as 15 objeções de preço mais frequentes.", chunks: 4, updatedAt: "23/03/2026" },
  { id: "6", title: "Vídeo: Tour Hotel Atlantis", tipo: "video", tags: ["dubai", "atlantis", "hotel"], agente: "HABIBI", resumo: "Tour virtual pelo Hotel Atlantis The Royal com foco em suítes e restaurantes.", chunks: 1, updatedAt: "18/03/2026" },
];

export default function AITeamConhecimento() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");

  const filtered = MOCK_DOCS.filter(doc => {
    const matchSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.tags.some(t => t.includes(search.toLowerCase()));
    const matchTipo = tipoFilter === "all" || doc.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Documentos que alimentam os prompts dos agentes</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5"><Upload className="w-4 h-4" /> Upload Documento</Button>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por título ou tag..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
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
        {filtered.map(doc => (
          <div key={doc.id} className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[10px]">{doc.tipo.toUpperCase()}</Badge>
              <span className="text-[10px] text-muted-foreground">{doc.updatedAt}</span>
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
              <span>{doc.chunks} chunks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
