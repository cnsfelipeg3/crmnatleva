import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, Sparkles, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIExtractButtonProps {
  onExtracted: (fields: Record<string, any>, rawText?: string) => void;
  compact?: boolean;
}

export default function AIExtractButton({ onExtracted, compact }: AIExtractButtonProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const handleExtract = async () => {
    if (!files.length && !textInput.trim()) {
      toast({ title: "Forneça arquivos ou texto para extrair", variant: "destructive" });
      return;
    }
    setExtracting(true);
    try {
      const images: string[] = [];
      for (const file of files) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        images.push(base64);
      }

      const { data, error } = await supabase.functions.invoke("extract-sale-data", {
        body: { images, text_input: textInput },
      });

      if (error) throw error;
      onExtracted(data?.fields || {}, data?.raw_text);
      toast({ title: "Extração concluída!", description: "Dados extraídos com IA." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na extração", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card className={cn("p-4 border-dashed border-2 border-border space-y-3", compact && "p-3")}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Preencher com IA</span>
      </div>

      <div
        className={cn(
          "border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById("ai-extract-upload")?.click()}
      >
        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">Arraste prints, PDFs ou planilhas</p>
        <input type="file" accept="image/*,.pdf,.csv,.xlsx" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" id="ai-extract-upload" />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {files.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] flex items-center gap-1">
              {f.name.slice(0, 20)}
              <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }}>
                <Trash2 className="w-2.5 h-2.5 hover:text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Texto complementar</Label>
        <Textarea
          placeholder="Cole dados adicionais: WhatsApp, e-mail, etc..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      <Button onClick={handleExtract} disabled={extracting} size="sm" className="w-full">
        {extracting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Extraindo...</> : <><Sparkles className="w-3 h-3 mr-1" /> Extrair com IA</>}
      </Button>
    </Card>
  );
}
