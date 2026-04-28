import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscoverDestinations, type DiscoveredDestination, type DiscoverResponse } from "@/hooks/useDiscoverDestinations";
import { GFlightDestinationCard } from "./GFlightDestinationCard";
import { AudioRecorder } from "./AudioRecorder";
import { formatBRL } from "./gflightsTypes";

interface Props {
  onSelectDestination: (dest: DiscoveredDestination, ctx: DiscoverResponse) => void;
}

const EXAMPLES = [
  "Tenho R$ 5.000, sou de São Paulo e quero 10 dias em outubro com a esposa, lugar com praia",
  "R$ 8 mil, família de 4, quero levar as crianças em janeiro, destino familiar",
  "R$ 3 mil pra fim de semana romântico em julho, saindo do Rio",
  "R$ 15 mil, aventura em setembro, 2 pessoas, gosto de natureza",
];

export function GFlightDiscoverPanel({ onSelectDestination }: Props) {
  const [query, setQuery] = useState("");
  const discoverMutation = useDiscoverDestinations();
  const data = discoverMutation.data;

  function handleSubmit() {
    if (query.trim().length < 10) return;
    discoverMutation.mutate({ naturalQuery: query.trim() });
  }

  function handleAudioTranscribed(text: string) {
    setQuery(text);
    if (text.trim().length >= 10) {
      discoverMutation.mutate({ naturalQuery: text.trim() });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Descobrir destinos com IA</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Descreva a viagem em poucas palavras · ou grave um áudio. A IA descobre os destinos que cabem
          no seu orçamento e período.
        </p>

        <Textarea
          placeholder="Ex: tenho R$ 5 mil, sou de SP, quero 10 dias em outubro com a esposa, lugar com praia"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[80px] text-sm bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            onClick={handleSubmit}
            disabled={query.trim().length < 10 || discoverMutation.isPending}
            size="sm"
            className="gap-2"
          >
            {discoverMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {discoverMutation.isPending ? "Descobrindo..." : "Descobrir destinos"}
          </Button>

          <AudioRecorder
            onTranscribed={handleAudioTranscribed}
            disabled={discoverMutation.isPending}
          />

          <span className="text-[10px] text-muted-foreground">⌘+Enter · ou grave um áudio 🎙️</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground mr-1">Exemplos:</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setQuery(ex)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary/40 transition-colors text-muted-foreground"
              type="button"
            >
              {ex.slice(0, 40)}…
            </button>
          ))}
        </div>
      </Card>

      {discoverMutation.isPending && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            ✨ Buscando em até 20 destinos da NatLeva… isso pode levar até 30 segundos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      )}

      {discoverMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(discoverMutation.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {data?.success && data.results.length > 0 && (
        <div className="space-y-3">
          <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
            <div className="text-xs space-y-1">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Encontrei {data.results.length} destinos pra você
              </div>
              <div className="text-muted-foreground">
                {data.extracted?.budget && (
                  <span>💰 Orçamento: <strong>{formatBRL(data.extracted.budget)}</strong> · </span>
                )}
                {data.extracted?.origin && <span>✈️ De: <strong>{data.extracted.origin}</strong> · </span>}
                {data.period && (
                  <span>
                    📅 Período: <strong>{String(data.period.month).padStart(2, "0")}/{data.period.year}</strong> ·{" "}
                  </span>
                )}
                {data.extracted?.durationDays && <span>⏱️ ~{data.extracted.durationDays} dias · </span>}
                {data.extracted?.mood && <span>🎯 {data.extracted.mood}</span>}
              </div>
              <div className="text-[10px] text-muted-foreground pt-1">
                Buscamos em {data.totalCandidates} destinos · {data.totalWithFlights} retornaram preços ·{" "}
                {data.totalFitsBudget} cabem no orçamento
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.results.map((d, i) => (
              <GFlightDestinationCard
                key={d.iata}
                destination={d}
                isCheapest={i === 0}
                departureDate={data.period?.day1}
                returnDate={data.period?.returnDate}
                paxAdults={data.extracted?.paxAdults || 1}
                originIata={data.extracted?.origin || "GRU"}
                onSelectDestination={(dest) => onSelectDestination(dest, data)}
              />
            ))}
          </div>
        </div>
      )}

      {data?.success && data.results.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum destino encontrado com esses critérios. Tente um orçamento maior, período diferente ou
            flexibilizar o estilo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
