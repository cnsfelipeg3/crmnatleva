import { LiveChatSimulator } from "@/components/livechat/LiveChatSimulator";
import { TestTube } from "lucide-react";

export default function OperacaoSimulador() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TestTube className="w-6 h-6 text-primary" />
          Simulador
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Teste fluxos de automação e respostas de agentes IA</p>
      </div>
      <LiveChatSimulator />
    </div>
  );
}
