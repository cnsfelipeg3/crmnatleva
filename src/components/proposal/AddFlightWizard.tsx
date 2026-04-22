import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plane, ArrowRight, ArrowLeftRight, Network, GitBranch,
  Sparkles, PencilLine, Upload, X, FileText, Loader2, Check, ArrowLeft,
} from "lucide-react";

export type ItineraryType = "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY" | "OPEN_JAW";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Cria item manual com itinerary_type pré-selecionado e segmento(s) vazios. */
  onCreateManual: (itineraryType: ItineraryType) => void;
  /** Cria item já preenchido a partir de extração com IA. */
  onCreateFromExtraction: (itineraryType: ItineraryType, extracted: { title?: string; description?: string; data?: Record<string, any> }) => void;
}

type Step = "itinerary" | "method" | "upload";

const ITINERARY_OPTIONS: { value: ItineraryType; label: string; desc: string; icon: any }[] = [
  { value: "ONE_WAY", label: "Somente Ida", desc: "Apenas o trecho de ida (sem retorno).", icon: ArrowRight },
  { value: "ROUND_TRIP", label: "Ida e Volta", desc: "Ida + volta no mesmo par origem/destino.", icon: ArrowLeftRight },
  { value: "MULTI_CITY", label: "Multi-trecho", desc: "3 ou mais cidades em sequência.", icon: Network },
  { value: "OPEN_JAW", label: "Open-Jaw", desc: "A volta sai/chega em cidade diferente da ida.", icon: GitBranch },
];

const ACCEPT = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function AddFlightWizard({ open, onOpenChange, onCreateManual, onCreateFromExtraction }: Props) {
  const [step, setStep] = useState<Step>("itinerary");
  const [itinerary, setItinerary] = useState<ItineraryType | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("itinerary");
    setItinerary(null);
    setFiles([]);
    setPreviews({});
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    const valid: File[] = [];
    for (const f of list) {
      if (!ACCEPT.includes(f.type)) {
        toast.error(`Formato não suportado: ${f.name}`);
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} excede ${MAX_SIZE_MB}MB`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_FILES);
      if (prev.length + valid.length > MAX_FILES) {
        toast.warning(`Máximo de ${MAX_FILES} arquivos por extração`);
      }
      return merged;
    });
    valid.forEach((f) => {
      if (f.type.startsWith("image/")) {
        const r = new FileReader();
        r.onload = (e) => {
          const url = (e.target?.result as string) || "";
          setPreviews((p) => ({ ...p, [`${f.name}-${f.size}`]: url }));
        };
        r.readAsDataURL(f);
      }
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExtract = async () => {
    if (!itinerary || files.length === 0) return;
    setLoading(true);
    try {
      const images = await Promise.all(
        files.map(async (f) => {
          const base64 = await fileToBase64(f);
          const ext = f.name.split(".").pop()?.toLowerCase() || (f.type.includes("pdf") ? "pdf" : "png");
          return { base64, file_type: ext };
        }),
      );

      const { data, error } = await supabase.functions.invoke("extract-booking-data", {
        body: { images, item_type: "flight" },
      });

      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      const extracted = (data as any)?.extracted;
      if (!extracted) {
        toast.error("Não foi possível extrair dados.");
        return;
      }

      // Reforça o itinerary_type escolhido pelo usuário no wizard
      const enriched = {
        ...extracted,
        data: { ...(extracted.data || {}), itinerary_type: itinerary },
      };

      onCreateFromExtraction(itinerary, enriched);
      toast.success(`Aéreo criado a partir de ${files.length} arquivo(s)!`);
      handleClose(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao extrair. Tente imagens mais nítidas.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === "itinerary" ? 1 : step === "method" ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Adicionar aéreo</DialogTitle>
              <DialogDescription>
                Etapa {stepIndex} de {step === "upload" ? 3 : itinerary ? 3 : 3}
              </DialogDescription>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  s <= stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        {/* ─── ETAPA 1: Tipo de itinerário ─── */}
        {step === "itinerary" && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Como será o modelo do itinerário desta proposta?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ITINERARY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = itinerary === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setItinerary(opt.value)}
                    className={cn(
                      "text-left rounded-xl border-2 p-3.5 transition-all hover:border-primary/60 hover:bg-primary/5",
                      active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">{opt.label}</p>
                          {active && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button disabled={!itinerary} onClick={() => setStep("method")}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* ─── ETAPA 2: Método ─── */}
        {step === "method" && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Como deseja incluir os detalhes dos voos?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!itinerary) return;
                  onCreateManual(itinerary);
                  toast.success("Bloco de aéreo criado. Preencha os trechos manualmente.");
                  handleClose(false);
                }}
                className="text-left rounded-xl border-2 border-border bg-background p-4 transition-all hover:border-primary/60 hover:bg-primary/5"
              >
                <div className="w-10 h-10 rounded-lg bg-muted text-foreground/70 flex items-center justify-center mb-2">
                  <PencilLine className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold text-foreground">Preencher manualmente</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                  Crio o bloco com a estrutura do itinerário escolhido e você adiciona os trechos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStep("upload")}
                className="text-left rounded-xl border-2 border-primary/40 bg-primary/5 p-4 transition-all hover:border-primary hover:bg-primary/10"
              >
                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">Extração inteligente</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                    IA
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                  Suba prints, e-mails ou PDFs e a IA preenche todos os trechos automaticamente.
                </p>
              </button>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("itinerary")} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* ─── ETAPA 3: Upload (extração) ─── */}
        {step === "upload" && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-foreground">
                Envie um ou mais arquivos da reserva/cotação
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pode enviar até {MAX_FILES} prints/PDFs ao mesmo tempo (ex.: print da ida + print da volta).
                A IA combina tudo em um único itinerário.
              </p>
            </div>

            {/* Dropzone */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              disabled={files.length >= MAX_FILES}
              className={cn(
                "w-full rounded-xl border-2 border-dashed border-primary/30 bg-background/50 px-4 py-6 text-center transition-colors",
                files.length >= MAX_FILES
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:border-primary/60 hover:bg-primary/5 cursor-pointer",
              )}
            >
              <Upload className="w-6 h-6 mx-auto text-primary/70 mb-1.5" />
              <p className="text-xs font-semibold text-foreground">
                {files.length >= MAX_FILES
                  ? `Limite de ${MAX_FILES} arquivos atingido`
                  : "Clique ou arraste arquivos"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                PNG, JPG, WEBP ou PDF · até {MAX_SIZE_MB}MB cada · máx. {MAX_FILES} arquivos
              </p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT.join(",")}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {/* Lista de arquivos */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {files.map((f, idx) => {
                  const key = `${f.name}-${f.size}`;
                  const preview = previews[key];
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                      {preview ? (
                        <img src={preview} alt={f.name} className="w-10 h-10 rounded object-cover bg-muted shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(f.size / 1024).toFixed(0)} KB · #{idx + 1}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="w-7 h-7 rounded-full hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-muted-foreground transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("method")} disabled={loading} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleClose(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleExtract} disabled={loading || files.length === 0} className="gap-1.5">
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Extraindo {files.length} arquivo(s)…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Extrair com IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
