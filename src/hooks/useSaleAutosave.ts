import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useSaleAutosave
 * ─────────────────────────────────────────────────────────────
 * Autosave incremental para campos simples da venda em edição.
 *
 * Como funciona:
 *  • Recebe o patch atual (subset de colunas de `sales`)
 *  • Sempre que o patch muda (e enabled=true), agenda um UPDATE
 *    parcial após `delay` ms (default 1200ms · debounce)
 *  • Só envia ao banco APÓS `ready=true` (load inicial concluído),
 *    evitando que o autosave dispare com valores vazios durante
 *    o carregamento da venda
 *  • Faz UPDATE parcial (apenas as colunas do patch), nunca apaga
 *    nada · respeita o save inteligente já implementado
 *  • Expõe status: "idle" | "saving" | "saved" | "error" e
 *    `lastSavedAt` para indicador visual
 */

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseSaleAutosaveOptions {
  saleId: string | undefined;
  enabled: boolean;
  ready: boolean;
  patch: Record<string, any>;
  delay?: number;
}

export function useSaleAutosave({
  saleId,
  enabled,
  ready,
  patch,
  delay = 1200,
}: UseSaleAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string>("");
  const inFlightRef = useRef<boolean>(false);
  const pendingPatchRef = useRef<Record<string, any> | null>(null);

  useEffect(() => {
    if (!enabled || !ready || !saleId) return;

    const serialized = JSON.stringify(patch);
    // Primeira execução após ready=true: apenas memoriza, não salva
    if (lastSerializedRef.current === "") {
      lastSerializedRef.current = serialized;
      return;
    }
    if (serialized === lastSerializedRef.current) return;

    pendingPatchRef.current = patch;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      if (inFlightRef.current) {
        // Ainda há um save em andamento · re-agenda
        timerRef.current = window.setTimeout(() => {}, 0);
        return;
      }
      const toSave = pendingPatchRef.current;
      if (!toSave) return;
      inFlightRef.current = true;
      setStatus("saving");
      setError(null);
      try {
        const { error: upErr } = await supabase
          .from("sales")
          .update(toSave)
          .eq("id", saleId);
        if (upErr) throw upErr;
        lastSerializedRef.current = JSON.stringify(toSave);
        setLastSavedAt(new Date());
        setStatus("saved");
      } catch (e: any) {
        console.error("[autosave] falhou:", e);
        setError(e?.message || "erro desconhecido");
        setStatus("error");
      } finally {
        inFlightRef.current = false;
      }
    }, delay);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(patch), enabled, ready, saleId, delay]);

  return { status, lastSavedAt, error };
}
