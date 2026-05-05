import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, Loader2, FileText, Image as ImageIcon, Download, Trash2,
  Eye, Paperclip, FileBadge,
} from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";

interface Attachment {
  id: string;
  passenger_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  description: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "passaporte", label: "Passaporte" },
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "visto", label: "Visto" },
  { value: "vacina", label: "Certificado de Vacina" },
  { value: "comprovante", label: "Comprovante" },
  { value: "outro", label: "Outro" },
];

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string | null) {
  return !!mime && mime.startsWith("image/");
}

export default function PassengerAttachments({ passengerId }: { passengerId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("documento");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("passenger_attachments")
      .select("*")
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os anexos");
    } else {
      setItems((data as Attachment[]) || []);
    }
    setLoading(false);
  }, [passengerId]);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name}: máximo 20MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "bin";
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${passengerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        const up = await supabase.storage.from("passenger-attachments").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type,
        });
        if (up.error) { toast.error(`${file.name}: ${up.error.message}`); continue; }
        const { data: pub } = supabase.storage.from("passenger-attachments").getPublicUrl(path);
        const ins = await supabase.from("passenger_attachments").insert({
          passenger_id: passengerId,
          file_name: file.name,
          file_path: path,
          file_url: pub.publicUrl,
          mime_type: file.type,
          size_bytes: file.size,
          category,
          description: description || null,
        });
        if (ins.error) { toast.error(`${file.name}: ${ins.error.message}`); continue; }
        ok++;
      }
      if (ok > 0) {
        toast.success(`${ok} anexo${ok > 1 ? "s" : ""} enviado${ok > 1 ? "s" : ""}`);
        setDescription("");
        await load();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (a: Attachment) => {
    if (!confirm(`Remover "${a.file_name}"?`)) return;
    await supabase.storage.from("passenger-attachments").remove([a.file_path]);
    const { error } = await supabase.from("passenger_attachments").delete().eq("id", a.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Anexo removido");
    setItems((arr) => arr.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-4">
      {/* Uploader */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" />
          <h3 className="font-display text-base">Adicionar anexo</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: passaporte válido até 2030" />
          </div>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border border-dashed border-border bg-card/40 cursor-pointer hover:bg-card/60 transition text-sm text-muted-foreground">
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Enviando…</>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Clique para anexar arquivos (até 20MB cada)</span>
              <span className="text-xs">PDF, imagens e documentos</span>
            </>
          )}
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </label>
      </Card>

      {/* Lista */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base flex items-center gap-2">
            <FileBadge className="w-4 h-4 text-primary" />
            Anexos ({items.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Nenhum anexo ainda. Use o uploader acima para adicionar documentos do passageiro.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((a) => {
              const cat = CATEGORIES.find((c) => c.value === a.category)?.label || a.category || "Documento";
              return (
                <div key={a.id} className="rounded-lg border border-border bg-card/40 overflow-hidden group">
                  <div className="aspect-video bg-muted/40 flex items-center justify-center relative">
                    {isImage(a.mime_type) ? (
                      <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-10 h-10 text-muted-foreground" />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur text-[10px] font-medium uppercase tracking-wide">
                      {cat}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium truncate" title={a.file_name}>{a.file_name}</p>
                      {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateBR(a.created_at)} · {formatSize(a.size_bytes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => isImage(a.mime_type) ? setPreviewUrl(a.file_url) : window.open(a.file_url, "_blank")}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                        <a href={a.file_url} download={a.file_name} target="_blank" rel="noreferrer">
                          <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive ml-auto" onClick={() => handleDelete(a)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Visualizar anexo</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-lg" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewUrl(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
