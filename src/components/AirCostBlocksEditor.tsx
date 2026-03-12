import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Plane, AlertCircle, CheckCircle2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlightSegment } from "@/components/FlightTimeline";

/* ─── Types ─────────────────────────────────── */

export interface AirCostBlock {
  id: string;
  label: string;
  segment_indices: number[];
  emission_type: "milhas" | "pagante";
  supplier_id: string;
  miles_program: string;
  miles_qty: string;
  miles_price: string;
  taxes: string;
  emission_source: string;
  cash_value: string;
  reservation_code: string;
  notes: string;
  // Pagante payment details
  payment_method: string;
  payment_currency: string;
  payment_card_label: string;
  payment_installments: string;
  payment_card_holder: string;
}

export function createEmptyAirCostBlock(label?: string): AirCostBlock {
  return {
    id: crypto.randomUUID(),
    label: label || "Bloco de Custo",
    segment_indices: [],
    emission_type: "milhas",
    supplier_id: "",
    miles_program: "",
    miles_qty: "",
    miles_price: "",
    taxes: "",
    emission_source: "",
    cash_value: "",
    reservation_code: "",
    notes: "",
    payment_method: "",
    payment_currency: "BRL",
    payment_card_label: "",
    payment_installments: "1",
    payment_card_holder: "",
  };
}

export function calcBlockCost(b: AirCostBlock): number {
  if (b.emission_type === "pagante") return parseFloat(b.cash_value) || 0;
  const qty = parseFloat(b.miles_qty) || 0;
  const price = parseFloat(b.miles_price) || 0;
  const taxes = parseFloat(b.taxes) || 0;
  return (qty / 1000) * price + taxes;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── Props ─────────────────────────────────── */

interface Props {
  blocks: AirCostBlock[];
  onChange: (blocks: AirCostBlock[]) => void;
  segments: FlightSegment[];
  suppliers: any[];
  allMilesPrograms: any[];
  getSupplierPrograms: (supplierId: string) => string[];
  autoFillMilesPrice: (supplierId: string, programName: string, milesQty: string, callback: (price: string) => void) => void;
}

/* ─── Component ─────────────────────────────── */

export default function AirCostBlocksEditor({
  blocks, onChange, segments, suppliers, allMilesPrograms,
  getSupplierPrograms, autoFillMilesPrice,
}: Props) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(blocks.map(b => b.id)));

  const validSegments = segments.filter(s => s.origin_iata && s.destination_iata);

  // Generate a descriptive label from segment indices
  const generateLabelFromSegments = (indices: number[]): string => {
    if (indices.length === 0) return "Novo Detalhamento";
    const segs = indices.map(i => validSegments[i]).filter(Boolean);
    if (segs.length === 0) return "Novo Detalhamento";
    
    // If all segments selected, show full route
    if (indices.length === validSegments.length && validSegments.length > 1) {
      const first = segs[0];
      const last = segs[segs.length - 1];
      return `${first.origin_iata} → ${last.destination_iata} (Todos os trechos)`;
    }
    
    // Check if it's ida+volta combined
    const hasIda = segs.some(s => s.direction === "ida");
    const hasVolta = segs.some(s => s.direction === "volta");
    if (hasIda && hasVolta) {
      const idaFirst = segs.find(s => s.direction === "ida");
      const voltaLast = segs.filter(s => s.direction === "volta").pop();
      return `${idaFirst?.origin_iata} → ${voltaLast?.destination_iata} (Ida + Volta)`;
    }
    
    // Single or multiple segments of same direction
    if (segs.length === 1) {
      const s = segs[0];
      const dir = s.direction === "ida" ? "Ida" : s.direction === "volta" ? "Volta" : "Interno";
      return `${s.origin_iata} → ${s.destination_iata} (${dir})`;
    }
    
    const first = segs[0];
    const last = segs[segs.length - 1];
    const dir = first.direction === "ida" ? "Ida" : first.direction === "volta" ? "Volta" : "Interno";
    return `${first.origin_iata} → ${last.destination_iata} (${dir})`;
  };

  const addBlock = () => {
    const newBlock = createEmptyAirCostBlock("Novo Detalhamento");
    onChange([...blocks, newBlock]);
    setExpandedBlocks(prev => new Set([...prev, newBlock.id]));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, field: string, value: any) => {
    onChange(blocks.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b, [field]: value };
      // Reset miles fields when switching to pagante
      if (field === "emission_type" && value === "pagante") {
        updated.miles_qty = "";
        updated.miles_price = "";
        updated.miles_program = "";
      }
      // Reset supplier-dependent fields
      if (field === "supplier_id") {
        updated.miles_program = "";
        updated.miles_price = "";
      }
      return updated;
    }));
  };

  const toggleSegment = (blockId: string, segIdx: number) => {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      const indices = b.segment_indices.includes(segIdx)
        ? b.segment_indices.filter(i => i !== segIdx)
        : [...b.segment_indices, segIdx];
      return { ...b, segment_indices: indices, label: generateLabelFromSegments(indices) };
    }));
  };

  const toggleAllSegments = (blockId: string) => {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      const allSelected = validSegments.every((_, i) => b.segment_indices.includes(i));
      const indices = allSelected ? [] : validSegments.map((_, i) => i);
      return { ...b, segment_indices: indices, label: generateLabelFromSegments(indices) };
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Validation: which segments are covered
  const coveredSegments = new Set<number>();
  blocks.forEach(b => b.segment_indices.forEach(i => coveredSegments.add(i)));
  const allCovered = validSegments.length > 0 && validSegments.every((_, i) => coveredSegments.has(i));
  const uncoveredCount = validSegments.filter((_, i) => !coveredSegments.has(i)).length;

  // Check for duplicates (same segment in multiple blocks)
  const segmentCounts = new Map<number, number>();
  blocks.forEach(b => b.segment_indices.forEach(i => segmentCounts.set(i, (segmentCounts.get(i) || 0) + 1)));
  const hasDuplicates = [...segmentCounts.values()].some(c => c > 1);

  const totalCost = blocks.reduce((sum, b) => sum + calcBlockCost(b), 0);

  // Suggest auto-grouping
  const suggestAutoGroup = () => {
    if (validSegments.length === 0) return;
    // Group ida segments together, volta together, internals individually
    const idaIndices: number[] = [];
    const voltaIndices: number[] = [];
    const internalBlocks: number[][] = [];

    validSegments.forEach((seg, i) => {
      if (seg.direction === "ida") idaIndices.push(i);
      else if (seg.direction === "volta") voltaIndices.push(i);
      else internalBlocks.push([i]);
    });

    const newBlocks: AirCostBlock[] = [];

    // If both ida and volta exist, default to "together"
    if (idaIndices.length > 0 && voltaIndices.length > 0) {
      const block = createEmptyAirCostBlock("Ida + Volta");
      block.segment_indices = [...idaIndices, ...voltaIndices];
      newBlocks.push(block);
    } else if (idaIndices.length > 0) {
      const block = createEmptyAirCostBlock("Ida");
      block.segment_indices = idaIndices;
      newBlocks.push(block);
    }

    internalBlocks.forEach((indices, i) => {
      const seg = validSegments[indices[0]];
      const block = createEmptyAirCostBlock(`Interno ${seg.origin_iata} → ${seg.destination_iata}`);
      block.segment_indices = indices;
      newBlocks.push(block);
    });

    onChange(newBlocks);
    setExpandedBlocks(new Set(newBlocks.map(b => b.id)));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Composição Financeira do Aéreo</h2>
          <p className="text-sm text-muted-foreground">Agrupe trechos por emissão e registre os custos</p>
        </div>
      </div>

      {/* Validation status */}
      {validSegments.length > 0 && (
        <div className={cn(
          "rounded-lg px-4 py-3 mb-4 flex items-center gap-3 text-sm border",
          allCovered && !hasDuplicates
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
        )}>
          {allCovered && !hasDuplicates ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>
            {allCovered && !hasDuplicates
              ? `Todos os ${validSegments.length} trecho(s) estão cobertos por blocos de custo`
              : hasDuplicates
                ? "Atenção: há trechos vinculados a mais de um bloco"
                : `${uncoveredCount} trecho(s) ainda não vinculado(s) a nenhum bloco de custo`
            }
          </span>
        </div>
      )}

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="text-center py-8 bg-muted/30 rounded-xl mb-4">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-2">Nenhum bloco de custo criado</p>
          <p className="text-xs text-muted-foreground mb-4">Agrupe seus trechos por emissão para registrar os custos corretamente</p>
          <div className="flex justify-center gap-2">
            {validSegments.length > 0 && (
              <Button variant="outline" onClick={suggestAutoGroup} size="sm">
                <Plane className="w-4 h-4 mr-2" /> Sugerir agrupamento
              </Button>
            )}
            <Button onClick={addBlock} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Criar bloco manual
            </Button>
          </div>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-3">
        {blocks.map((block, bi) => {
          const blockCost = calcBlockCost(block);
          const isExpanded = expandedBlocks.has(block.id);

          return (
            <Collapsible key={block.id} open={isExpanded} onOpenChange={() => toggleExpand(block.id)}>
              <Card className="border-border/60 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {bi + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{block.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {block.segment_indices.length} trecho(s) • {block.emission_type === "milhas" ? "Milhas" : "Pagante"}
                          {blockCost > 0 && ` • ${fmt(blockCost)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {block.segment_indices.length === 0 && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200">
                          Sem trechos
                        </Badge>
                      )}
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4 border-t border-border/40">
                    {/* Block label */}
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome do bloco</Label>
                        <Input
                          value={block.label}
                          onChange={e => updateBlock(block.id, "label", e.target.value)}
                          className="h-9 text-sm"
                          placeholder="Ex: Ida + Volta Internacional"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Localizador da emissão</Label>
                        <Input
                          value={block.reservation_code}
                          onChange={e => updateBlock(block.id, "reservation_code", e.target.value.toUpperCase())}
                          className="h-9 text-sm font-mono"
                          placeholder="ABC123"
                        />
                      </div>
                    </div>

                    {/* Segment selection */}
                    {validSegments.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Trechos incluídos neste bloco</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {validSegments.map((seg, si) => {
                            const isSelected = block.segment_indices.includes(si);
                            const isInOtherBlock = !isSelected && blocks.some(b => b.id !== block.id && b.segment_indices.includes(si));
                            return (
                              <label
                                key={si}
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                                  isSelected
                                    ? "border-primary/50 bg-primary/5"
                                    : isInOtherBlock
                                      ? "border-border/40 bg-muted/20 opacity-50"
                                      : "border-border/40 hover:bg-muted/30"
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSegment(block.id, si)}
                                />
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {seg.direction === "ida" ? "IDA" : seg.direction === "volta" ? "VLT" : "INT"}
                                  </Badge>
                                  <span className="font-mono text-xs truncate">
                                    {seg.origin_iata} → {seg.destination_iata}
                                  </span>
                                  {seg.flight_number && (
                                    <span className="text-[10px] text-muted-foreground">{seg.flight_number}</span>
                                  )}
                                </div>
                                {isInOtherBlock && (
                                  <span className="text-[10px] text-muted-foreground">Em outro bloco</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Emission type + Supplier */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fornecedor</Label>
                        <div className="flex gap-2">
                          <Select value={block.supplier_id} onValueChange={v => updateBlock(block.id, "supplier_id", v)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" title="Cadastrar novo fornecedor" onClick={() => window.open("/financeiro/fornecedores", "_blank")}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo de Emissão</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={block.emission_type === "milhas" ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateBlock(block.id, "emission_type", "milhas")}
                            className="flex-1 h-9 text-xs"
                          >
                            🎯 Milhas
                          </Button>
                          <Button
                            type="button"
                            variant={block.emission_type === "pagante" ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateBlock(block.id, "emission_type", "pagante")}
                            className="flex-1 h-9 text-xs"
                          >
                            💰 Pagante
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Cost fields */}
                    {block.emission_type === "milhas" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Programa de Milhas</Label>
                          <Select
                            value={block.miles_program}
                            onValueChange={v => {
                              updateBlock(block.id, "miles_program", v);
                              if (block.supplier_id && block.miles_qty) {
                                autoFillMilesPrice(block.supplier_id, v, block.miles_qty, (price) => {
                                  updateBlock(block.id, "miles_price", price);
                                });
                              }
                            }}
                            disabled={!block.supplier_id}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder={block.supplier_id ? "Selecione" : "Selecione fornecedor"} />
                            </SelectTrigger>
                            <SelectContent>
                              {block.supplier_id && getSupplierPrograms(block.supplier_id).map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Qtd Milhas</Label>
                          <Input
                            type="number"
                            className="h-9 text-sm"
                            value={block.miles_qty}
                            onChange={e => {
                              updateBlock(block.id, "miles_qty", e.target.value);
                              if (block.supplier_id && block.miles_program) {
                                autoFillMilesPrice(block.supplier_id, block.miles_program, e.target.value, (price) => {
                                  updateBlock(block.id, "miles_price", price);
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Preço Milheiro R$</Label>
                          <Input
                            type="number" step="0.01" className="h-9 text-sm"
                            value={block.miles_price}
                            onChange={e => updateBlock(block.id, "miles_price", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Taxa em Dinheiro R$</Label>
                          <Input
                            type="number" step="0.01" className="h-9 text-sm"
                            value={block.taxes}
                            onChange={e => updateBlock(block.id, "taxes", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Valor Pago</Label>
                            <Input
                              type="number" step="0.01" className="h-9 text-sm"
                              value={block.cash_value}
                              onChange={e => updateBlock(block.id, "cash_value", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Moeda</Label>
                            <Select value={block.payment_currency || "BRL"} onValueChange={v => updateBlock(block.id, "payment_currency", v)}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BRL">R$ — Real</SelectItem>
                                <SelectItem value="USD">US$ — Dólar</SelectItem>
                                <SelectItem value="EUR">€ — Euro</SelectItem>
                                <SelectItem value="GBP">£ — Libra</SelectItem>
                                <SelectItem value="ARS">ARS — Peso Argentino</SelectItem>
                                <SelectItem value="CLP">CLP — Peso Chileno</SelectItem>
                                <SelectItem value="COP">COP — Peso Colombiano</SelectItem>
                                <SelectItem value="MXN">MXN — Peso Mexicano</SelectItem>
                                <SelectItem value="PEN">PEN — Sol Peruano</SelectItem>
                                <SelectItem value="JPY">¥ — Iene</SelectItem>
                                <SelectItem value="CAD">CAD — Dólar Canadense</SelectItem>
                                <SelectItem value="AUD">AUD — Dólar Australiano</SelectItem>
                                <SelectItem value="CHF">CHF — Franco Suíço</SelectItem>
                                <SelectItem value="OTHER">Outra</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Forma de Pagamento</Label>
                            <Select value={block.payment_method || ""} onValueChange={v => updateBlock(block.id, "payment_method", v)}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                                <SelectItem value="boleto">Boleto</SelectItem>
                                <SelectItem value="wise">Wise</SelectItem>
                                <SelectItem value="paypal">PayPal</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Cartão / Conta</Label>
                            <Input
                              className="h-9 text-sm"
                              value={block.payment_card_label || ""}
                              onChange={e => updateBlock(block.id, "payment_card_label", e.target.value)}
                              placeholder="Ex: Visa final 1234, Wise..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Parcelas</Label>
                            <Select value={block.payment_installments || "1"} onValueChange={v => updateBlock(block.id, "payment_installments", v)}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {(block.payment_method === "cartao_credito" || block.payment_method === "cartao_debito") && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Titular do Cartão</Label>
                              <Input
                                className="h-9 text-sm"
                                value={block.payment_card_holder || ""}
                                onChange={e => updateBlock(block.id, "payment_card_holder", e.target.value)}
                                placeholder="Nome como está no cartão"
                              />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Emissão por</Label>
                            <Input
                              className="h-9 text-sm"
                              value={block.emission_source}
                              onChange={e => updateBlock(block.id, "emission_source", e.target.value)}
                              placeholder="Site, app, telefone..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Block cost summary */}
                    {blockCost > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custo deste bloco</span>
                        <span className="text-sm font-bold text-primary">{fmt(blockCost)}</span>
                      </div>
                    )}

                    {/* Remove */}
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeBlock(block.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remover bloco
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Add block */}
      {blocks.length > 0 && (
        <Button variant="outline" onClick={addBlock} className="w-full mt-3">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Bloco de Custo
        </Button>
      )}

      {/* Total */}
      {totalCost > 0 && (
        <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-muted-foreground">Total Custo Aéreo</span>
          <span className="text-lg font-bold text-primary">{fmt(totalCost)}</span>
        </div>
      )}
    </Card>
  );
}
