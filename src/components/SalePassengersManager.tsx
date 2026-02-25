import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, X, User, AlertTriangle, Plus, Loader2, CreditCard, UserCheck } from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SalePassenger {
  id: string;
  passenger_id: string;
  role: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
}

interface Props {
  saleId: string;
  payerPassengerId: string | null;
  onPayerChange: (payerId: string | null) => void;
  editable?: boolean;
}

const ROLES = [
  { value: "titular", label: "Titular" },
  { value: "acompanhante", label: "Acompanhante" },
  { value: "crianca", label: "Criança" },
  { value: "bebe", label: "Bebê" },
  { value: "outro", label: "Outro" },
];

export default function SalePassengersManager({ saleId, payerPassengerId, onPayerChange, editable = true }: Props) {
  const [passengers, setPassengers] = useState<SalePassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<SalePassenger | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPassengers = async () => {
    const { data } = await supabase
      .from("sale_passengers")
      .select("id, passenger_id, role, passengers:passenger_id(full_name, cpf, birth_date, passport_number, passport_expiry, phone)")
      .eq("sale_id", saleId);
    if (data) {
      setPassengers(data.map((d: any) => ({
        id: d.id,
        passenger_id: d.passenger_id,
        role: d.role || "acompanhante",
        full_name: d.passengers?.full_name || "",
        cpf: d.passengers?.cpf,
        birth_date: d.passengers?.birth_date,
        passport_number: d.passengers?.passport_number,
        passport_expiry: d.passengers?.passport_expiry,
        phone: d.passengers?.phone,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPassengers(); }, [saleId]);

  // Search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("passengers")
        .select("id, full_name, cpf, birth_date, passport_number, passport_expiry, phone")
        .or(`full_name.ilike.%${query}%,cpf.ilike.%${query}%,phone.ilike.%${query}%,passport_number.ilike.%${query}%`)
        .limit(10);
      setResults(data || []);
      setSearching(false);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addPassenger = async (p: any) => {
    if (passengers.some(s => s.passenger_id === p.id)) {
      toast({ title: "Passageiro já vinculado", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("sale_passengers").insert({
      sale_id: saleId,
      passenger_id: p.id,
      role: "acompanhante",
    });
    if (error) {
      toast({ title: "Erro ao vincular", description: error.message, variant: "destructive" });
      return;
    }
    // Audit log
    await supabase.from("audit_log").insert({
      sale_id: saleId,
      user_id: user?.id,
      action: "passageiro_adicionado",
      details: `Passageiro "${p.full_name}" adicionado à venda`,
      new_value: { passenger_id: p.id, full_name: p.full_name },
    });
    toast({ title: `${p.full_name} adicionado!` });
    setQuery("");
    setShowResults(false);
    fetchPassengers();
  };

  const removePassenger = async (sp: SalePassenger) => {
    // If removing the payer, need to set a new one
    if (sp.passenger_id === payerPassengerId) {
      const remaining = passengers.filter(p => p.passenger_id !== sp.passenger_id);
      if (remaining.length > 0) {
        onPayerChange(remaining[0].passenger_id);
        await supabase.from("sales").update({ payer_passenger_id: remaining[0].passenger_id }).eq("id", saleId);
      } else {
        onPayerChange(null);
        await supabase.from("sales").update({ payer_passenger_id: null }).eq("id", saleId);
      }
    }
    await supabase.from("sale_passengers").delete().eq("id", sp.id);
    await supabase.from("audit_log").insert({
      sale_id: saleId,
      user_id: user?.id,
      action: "passageiro_removido",
      details: `Passageiro "${sp.full_name}" removido da venda`,
      old_value: { passenger_id: sp.passenger_id, full_name: sp.full_name },
    });
    toast({ title: `${sp.full_name} removido` });
    setRemoveConfirm(null);
    fetchPassengers();
  };

  const updateRole = async (sp: SalePassenger, newRole: string) => {
    await supabase.from("sale_passengers").update({ role: newRole }).eq("id", sp.id);
    await supabase.from("audit_log").insert({
      sale_id: saleId,
      user_id: user?.id,
      action: "papel_alterado",
      details: `Papel de "${sp.full_name}" alterado de "${sp.role}" para "${newRole}"`,
      old_value: { role: sp.role },
      new_value: { role: newRole },
    });
    setPassengers(prev => prev.map(p => p.id === sp.id ? { ...p, role: newRole } : p));
  };

  const setPayer = async (passengerId: string) => {
    await supabase.from("sales").update({ payer_passenger_id: passengerId }).eq("id", saleId);
    onPayerChange(passengerId);
    const pax = passengers.find(p => p.passenger_id === passengerId);
    await supabase.from("audit_log").insert({
      sale_id: saleId,
      user_id: user?.id,
      action: "pagador_alterado",
      details: `Pagador alterado para "${pax?.full_name}"`,
      new_value: { payer_passenger_id: passengerId },
    });
    toast({ title: `${pax?.full_name} definido como pagador` });
  };

  const isPayer = (passengerId: string) => passengerId === payerPassengerId;

  if (loading) return <div className="text-sm text-muted-foreground py-4 text-center">Carregando passageiros...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Passageiros Vinculados ({passengers.length})
        </h3>
      </div>

      {/* Search to add */}
      {editable && (
        <div className="relative" ref={ref}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Adicionar passageiro (nome, CPF, telefone, passaporte)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-9"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          {showResults && results.length > 0 && (
            <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border">
              {results.map((p) => {
                const already = passengers.some(s => s.passenger_id === p.id);
                return (
                  <button
                    key={p.id}
                    disabled={already}
                    onClick={() => addPassenger(p)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 disabled:opacity-40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {[p.cpf, p.phone, p.passport_number].filter(Boolean).join(" · ") || "Sem documentos"}
                      </p>
                    </div>
                    {already && <Badge variant="secondary" className="text-[10px] shrink-0">Já vinculado</Badge>}
                  </button>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* Passenger list */}
      {passengers.length > 0 ? (
        <div className="space-y-2">
          {passengers.map((sp) => (
            <Card key={sp.id} className={`p-3 flex items-center gap-3 ${isPayer(sp.passenger_id) ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {isPayer(sp.passenger_id) ? <CreditCard className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{sp.full_name}</p>
                  {isPayer(sp.passenger_id) && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">💳 Pagador</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {sp.cpf && <span className="text-[10px] text-muted-foreground font-mono">{sp.cpf}</span>}
                  {sp.birth_date && <span className="text-[10px] text-muted-foreground">{formatDateBR(sp.birth_date)}</span>}
                  {sp.passport_number && <Badge variant="outline" className="text-[10px]">🛂 {sp.passport_number}</Badge>}
                  {sp.passport_expiry && new Date(sp.passport_expiry) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) && (
                    <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" /> Passaporte vencendo</Badge>
                  )}
                </div>
              </div>
              {editable && (
                <div className="flex items-center gap-1 shrink-0">
                  <Select value={sp.role} onValueChange={(v) => updateRole(sp, v)}>
                    <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!isPayer(sp.passenger_id) && (
                    <Button variant="ghost" size="sm" onClick={() => setPayer(sp.passenger_id)} title="Definir como pagador" className="h-7 w-7 p-0">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setRemoveConfirm(sp)} className="h-7 w-7 p-0">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
          ⚠️ Nenhum passageiro vinculado. Use a busca acima para adicionar.
        </p>
      )}

      {/* Remove confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover passageiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover <strong>{removeConfirm?.full_name}</strong> desta venda?
              {removeConfirm && isPayer(removeConfirm.passenger_id) && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este passageiro é o pagador. Outro passageiro será definido automaticamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeConfirm && removePassenger(removeConfirm)}>Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
