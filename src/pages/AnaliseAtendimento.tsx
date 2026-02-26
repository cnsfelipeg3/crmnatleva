import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Loader2, RefreshCw, TrendingUp, MessageSquare, Clock, Target } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-atendimento`;

export default function AnaliseAtendimento() {
  const [period, setPeriod] = useState("30d");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = async () => {
    if (isLoading && abortRef.current) {
      abortRef.current.abort();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAnalysis("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ period }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao analisar");
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error("Sem resposta do servidor");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        toast.error("Erro ao conectar com a IA");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Análise de Atendimento com IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A IA analisa todas as conversas do período e identifica pontos fortes, melhorias e oportunidades.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={false} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parar
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Analisar
              </>
            )}
          </Button>
        </div>
      </div>

      {!analysis && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, title: "Conversas", desc: "Análise de tom, clareza e empatia nas respostas" },
            { icon: Clock, title: "Tempo de Resposta", desc: "Avaliação da agilidade no atendimento" },
            { icon: Target, title: "Conversão", desc: "Oportunidades de venda identificadas" },
            { icon: TrendingUp, title: "Score Geral", desc: "Nota de 0-100 para o atendimento" },
          ].map((item, i) => (
            <Card key={i} className="border-dashed opacity-60">
              <CardHeader className="pb-2">
                <item.icon className="w-8 h-8 text-primary/50 mb-2" />
                <CardTitle className="text-sm">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(analysis || isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Relatório de Análise
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              Período: {period === "7d" ? "últimos 7 dias" : period === "30d" ? "últimos 30 dias" : "últimos 90 dias"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{analysis || "Analisando conversas..."}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
