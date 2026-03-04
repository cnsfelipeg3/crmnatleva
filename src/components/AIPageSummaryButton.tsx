import { useState, useRef } from "react";
import { Sparkles, X, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/sales": "Vendas",
  "/passengers": "Passageiros",
  "/viagens": "Viagens",
  "/checkin": "Check-in",
  "/lodging": "Hospedagem",
  "/live-chat": "Live Chat",
  "/flow-builder": "Flow Builder",
  "/birthdays": "Aniversários",
  "/pendencias": "Pendências",
  "/financeiro": "Financeiro",
  "/financeiro/contas-receber": "Contas a Receber",
  "/financeiro/contas-pagar": "Contas a Pagar",
  "/financeiro/fluxo-caixa": "Fluxo de Caixa",
  "/financeiro/comissoes": "Comissões",
  "/financeiro/cartao-credito": "Cartão de Crédito",
  "/financeiro/fornecedores": "Fornecedores",
  "/financeiro/plano-contas": "Plano de Contas",
  "/financeiro/dre": "DRE",
  "/financeiro/taxas-tarifas": "Taxas e Tarifas",
  "/financeiro/simulador-taxas": "Simulador de Taxas",
  "/financeiro/gateway-pagamentos": "Gateway de Pagamentos",
  "/rh": "Recursos Humanos",
  "/rh/colaboradores": "Colaboradores",
  "/rh/ponto": "Ponto",
  "/rh/folha": "Folha de Pagamentos",
  "/rh/desempenho": "Desempenho",
  "/rh/metas-bonus": "Metas e Bônus",
  "/rh/feedbacks": "Feedbacks",
  "/rh/advertencias": "Advertências",
  "/rh/contratos": "Contratos",
  "/rh/clima": "Clima do Time",
  "/rh/permissoes": "Permissões",
  "/rh/relatorios": "Relatórios RH",
  "/rh/configuracoes": "Configurações RH",
  "/natleva-intelligence": "NatLeva Intelligence",
  "/client-intelligence": "Client Intelligence",
  "/ai-integrations": "Integrações IA",
  "/ai-knowledge-base": "Base de Conhecimento",
  "/settings": "Configurações",
  "/admin/users": "Gestão de Usuários",
  "/import-data": "Importar Dados",
  "/analise-atendimento": "Análise de Atendimento",
};

function extractPageContent(): string {
  const main = document.querySelector("main");
  if (!main) return "";

  const clone = main.cloneNode(true) as HTMLElement;

  // Remove interactive/irrelevant elements
  clone.querySelectorAll("button, svg, img, input, textarea, [role='dialog'], .sr-only, script, style, nav").forEach(el => el.remove());

  // Get tables as structured data
  const tables: string[] = [];
  clone.querySelectorAll("table").forEach((table, i) => {
    const rows: string[] = [];
    table.querySelectorAll("tr").forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll("th, td").forEach(td => cells.push((td as HTMLElement).innerText.trim()));
      if (cells.length) rows.push(cells.join(" | "));
    });
    if (rows.length) tables.push(`Tabela ${i + 1}:\n${rows.join("\n")}`);
  });

  // Get text content
  const text = clone.innerText?.replace(/\n{3,}/g, "\n\n").trim() || "";

  // Get cards / KPIs
  const kpis: string[] = [];
  main.querySelectorAll("[class*='card'], [class*='Card']").forEach(card => {
    const t = (card as HTMLElement).innerText?.trim();
    if (t && t.length < 200) kpis.push(t);
  });

  let result = "";
  if (kpis.length) result += "KPIs e Cards:\n" + kpis.slice(0, 30).join("\n---\n") + "\n\n";
  if (tables.length) result += tables.join("\n\n") + "\n\n";
  result += "Conteúdo geral:\n" + text;

  return result.slice(0, 15000);
}

export default function AIPageSummaryButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  const pageName = PAGE_LABELS[location.pathname] || location.pathname.replace(/\//g, " ").trim() || "Página";

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setSummary("");

    try {
      const pageContent = extractPageContent();
      if (!pageContent || pageContent.length < 30) {
        toast.error("Não há dados suficientes nesta página para gerar um resumo.");
        setLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ pageName, pageContent }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar resumo");
      }

      // Stream response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setSummary(fullText);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar resumo");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado!");
  };

  const downloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summary, 170);
    let y = 20;
    doc.setFontSize(10);
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 5;
    }
    doc.save(`resumo-ia-${pageName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF baixado!");
  };

  return (
    <>
      <Button
        onClick={generate}
        variant="outline"
        size="sm"
        className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs h-8"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Resumo IA</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Resumo IA — {pageName}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {summary && !loading && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadPdf}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          <div ref={contentRef} className="flex-1 overflow-auto pr-2">
            {loading && !summary && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Analisando dados da página...</p>
              </div>
            )}

            {summary && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            )}

            {loading && summary && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                <Loader2 className="w-3 h-3 animate-spin" />
                Gerando...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
