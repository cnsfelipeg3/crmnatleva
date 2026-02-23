import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronLeft, ChevronRight, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_SELLERS } from "@/data/mockData";

const steps = [
  { id: 1, label: "Upload & IA", icon: Sparkles },
  { id: 2, label: "Dados Básicos" },
  { id: 3, label: "Passageiros" },
  { id: 4, label: "Aéreo" },
  { id: 5, label: "Hotel" },
  { id: 6, label: "Financeiro" },
  { id: 7, label: "Revisão" },
];

export default function NewSale() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground">Registre uma nova venda passo a passo</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step > s.id ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
                {s.id}
              </span>
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <Card className="p-6 glass-card min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-serif text-foreground mb-1">Captura Inteligente</h2>
              <p className="text-sm text-muted-foreground">
                Faça upload de prints, comprovantes ou documentos. A IA preencherá os campos automaticamente.
              </p>
            </div>
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
            >
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, PDF — prints de emissão, WhatsApp, comprovantes, vouchers
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Selecionar Arquivos
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <Button variant="outline" onClick={next} className="w-full">
              Preencher Manualmente
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Dados Básicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Venda</Label>
                <Input placeholder="Ex: Roma - Família Silva" />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MOCK_SELLERS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Fechamento</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão de crédito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais sobre a venda..." rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TAG ChatGuru</Label>
                <Input placeholder="Ex: LEAD_QUALIFICADO" />
              </div>
              <div className="space-y-2">
                <Label>Link Chat</Label>
                <Input placeholder="https://wa.me/..." />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Passageiros</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Adultos (18+)</Label>
                <Input type="number" min={1} defaultValue={2} />
              </div>
              <div className="space-y-2">
                <Label>Crianças (0-17)</Label>
                <Input type="number" min={0} defaultValue={0} />
              </div>
              <div className="space-y-2">
                <Label>Idade das Crianças</Label>
                <Input placeholder="Ex: 3, 8" />
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Na próxima iteração: cadastro individual de passageiros com CPF, passaporte, endereço e validações.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Aéreo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem (IATA)</Label>
                <Input placeholder="GRU" />
              </div>
              <div className="space-y-2">
                <Label>Destino (IATA)</Label>
                <Input placeholder="FCO" />
              </div>
              <div className="space-y-2">
                <Label>Data Ida</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Data Volta</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Companhia Aérea</Label>
                <Input placeholder="TAP" />
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economica">Econômica</SelectItem>
                    <SelectItem value="premium">Premium Economy</SelectItem>
                    <SelectItem value="executiva">Executiva</SelectItem>
                    <SelectItem value="primeira">Primeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Localizador</Label>
                <Input placeholder="ABC123" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Conexões</Label>
                <Input placeholder="LIS, MAD" />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Hotel</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel</Label>
                <Input placeholder="Nome do hotel" />
              </div>
              <div className="space-y-2">
                <Label>Quarto</Label>
                <Input placeholder="Duplo - 1 cama casal" />
              </div>
              <div className="space-y-2">
                <Label>Alimentação</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem alimentação</SelectItem>
                    <SelectItem value="cafe">Café da manhã</SelectItem>
                    <SelectItem value="meia">Meia pensão</SelectItem>
                    <SelectItem value="completa">Pensão completa</SelectItem>
                    <SelectItem value="all">All inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código de Reserva</Label>
                <Input placeholder="HOTEL-998877" className="font-mono" />
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Financeiro</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Recebido (R$)</Label>
                <Input type="number" placeholder="6500.00" />
              </div>
              <div className="space-y-2">
                <Label>Valor Pago (R$)</Label>
                <Input type="number" placeholder="5200.00" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-3">Detalhamento — Aéreo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor pago em R$</Label>
                  <Input type="number" placeholder="1200.00" />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de Milhas</Label>
                  <Input type="number" placeholder="120000" />
                </div>
                <div className="space-y-2">
                  <Label>Preço do Milheiro (R$)</Label>
                  <Input type="number" placeholder="28.00" />
                </div>
                <div className="space-y-2">
                  <Label>Taxas (R$)</Label>
                  <Input type="number" placeholder="380.00" />
                </div>
                <div className="space-y-2">
                  <Label>Por onde foi emitido</Label>
                  <Input placeholder="Smiles (site/app)" />
                </div>
                <div className="space-y-2">
                  <Label>Programa utilizado</Label>
                  <Input placeholder="Smiles" />
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-3">Detalhamento — Hotel</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor pago em R$</Label>
                  <Input type="number" placeholder="800.00" />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de Milhas</Label>
                  <Input type="number" placeholder="90000" />
                </div>
                <div className="space-y-2">
                  <Label>Preço do Milheiro (R$)</Label>
                  <Input type="number" placeholder="25.50" />
                </div>
                <div className="space-y-2">
                  <Label>Taxas (R$)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Revisão Final</h2>
            <div className="p-6 bg-muted/50 rounded-xl space-y-3 text-sm">
              <p className="text-muted-foreground">
                Revise todos os dados antes de salvar. Os campos obrigatórios serão validados ao confirmar.
              </p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">Rascunho</span>
                <span className="text-muted-foreground">Criado por</span>
                <span className="font-medium">Você</span>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate("/sales")}
            >
              <Check className="w-4 h-4 mr-2" /> Salvar Venda
            </Button>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 1}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>
        {step < 7 && (
          <Button onClick={next}>
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
