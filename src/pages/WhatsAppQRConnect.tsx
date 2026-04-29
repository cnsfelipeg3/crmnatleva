import { WhatsAppQRCard } from "@/components/livechat/WhatsAppQRCard";
import { AutoRejectCallsCard } from "@/components/livechat/AutoRejectCallsCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WhatsAppQRConnect() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-foreground">Conectar WhatsApp via QR Code</h1>
        <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo para conectar sua instância Z-API</p>
      </div>

      <WhatsAppQRCard />

      <AutoRejectCallsCard />
    </div>
  );
}

