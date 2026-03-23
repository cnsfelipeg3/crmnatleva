import { Settings, Save, TestTube, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function AITeamConfig() {
  const [agencyName, setAgencyName] = useState("NatLeva Viagens");
  const [segment, setSegment] = useState("Viagens Premium");
  const [slogan, setSlogan] = useState("Transformando sonhos em experiências inesquecíveis");
  const [tomVoz, setTomVoz] = useState("Profissional, acolhedor e consultivo. Foco em experiências premium com toque humano.");
  const [maxResponseTime, setMaxResponseTime] = useState("30");

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Settings className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Identidade da agência e parâmetros globais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Importar</Button>
          <Button size="sm"><Save className="w-4 h-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold">🏢 Identidade da Agência</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome da Agência</label>
            <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Segmento</label>
            <Input value={segment} onChange={e => setSegment(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
          <Input value={slogan} onChange={e => setSlogan(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tom de Voz Global</label>
          <Textarea value={tomVoz} onChange={e => setTomVoz(e.target.value)} rows={3} />
          <p className="text-[10px] text-muted-foreground mt-1">Este tom é injetado em todos os 21 agentes via buildPromptV2()</p>
        </div>
      </div>

      {/* Model */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold">🤖 Modelo de IA</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Lovable AI Gateway</p>
            <p className="text-xs text-muted-foreground">google/gemini-3-flash-preview</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600">Conectado</Badge>
            <Button variant="outline" size="sm"><TestTube className="w-4 h-4 mr-1" /> Testar</Button>
          </div>
        </div>
      </div>

      {/* Operational */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold">⚙️ Parâmetros Operacionais</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Horário de Operação</label>
            <Input defaultValue="08:00 - 22:00" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tempo Máx. Resposta (seg)</label>
            <Input value={maxResponseTime} onChange={e => setMaxResponseTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Critérios de Escalonamento</label>
          <Textarea defaultValue="Escalonar para humano quando: score de confiança < 60%, objeção não mapeada, solicitação de cancelamento, ou cliente irritado." rows={2} />
        </div>
      </div>

      {/* API Usage */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-bold mb-4">📊 Uso da API</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">1,247</p>
            <p className="text-xs text-muted-foreground">Chamadas hoje</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">R$ 12,40</p>
            <p className="text-xs text-muted-foreground">Custo estimado</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">340ms</p>
            <p className="text-xs text-muted-foreground">Latência média</p>
          </div>
        </div>
      </div>
    </div>
  );
}
