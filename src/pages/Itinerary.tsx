import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ItineraryDocument from "@/components/itinerary/ItineraryDocument";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Itinerary() {
  const [params] = useSearchParams();
  const saleId = params.get("sale_id");
  const navigate = useNavigate();
  const docRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);

    const [saleRes, segRes, costRes, recvRes, paxRes] = await Promise.all([
      supabase.from("sales").select("*").eq("id", saleId).single(),
      supabase.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
      supabase.from("cost_items").select("*").eq("sale_id", saleId),
      supabase.from("accounts_receivable").select("*").eq("sale_id", saleId).order("due_date"),
      (supabase as any).from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
    ]);

    let sellerName = null;
    let clientName = null;
    if (saleRes.data?.seller_id) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", saleRes.data.seller_id).single();
      sellerName = p?.full_name;
    }
    if (saleRes.data?.client_id) {
      const { data: c } = await supabase.from("clients").select("display_name").eq("id", saleRes.data.client_id).single();
      clientName = c?.display_name;
    }

    // Check for portal published notes/cover
    let coverImageUrl = null;
    let notesForClient = null;
    const { data: pub } = await (supabase as any)
      .from("portal_published_sales")
      .select("cover_image_url, notes_for_client")
      .eq("sale_id", saleId)
      .single();
    if (pub) {
      coverImageUrl = pub.cover_image_url;
      notesForClient = pub.notes_for_client;
    }

    const costItems = costRes.data || [];
    const hotels = costItems.filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
    const services = costItems.filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel" && c.product_type !== "aereo");

    setData({
      sale: saleRes.data,
      segments: segRes.data || [],
      hotels,
      services,
      passengers: (paxRes.data || []).map((sp: any) => sp.passengers).filter(Boolean),
      receivables: recvRes.data || [],
      sellerName,
      clientName,
      coverImageUrl,
      notesForClient,
    });
    setLoading(false);
  }, [saleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportPDF = async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdfWidth = 210; // A4
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      let position = 0;
      const pageHeight = 297;

      // Multi-page
      while (position < pdfHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -position, pdfWidth, pdfHeight);
        position += pageHeight;
      }

      const fileName = `Itinerario_${data?.sale?.name?.replace(/\s+/g, "_") || "viagem"}.pdf`;
      pdf.save(fileName);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (!saleId) return <div className="p-8 text-center text-muted-foreground">Nenhuma venda selecionada.</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting || loading}>
            {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="py-8 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="shadow-2xl rounded-xl overflow-hidden">
            <ItineraryDocument ref={docRef} {...data} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Dados não encontrados.</p>
        )}
      </div>
    </div>
  );
}
