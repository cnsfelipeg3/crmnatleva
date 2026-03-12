import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeDefinition } from "./nodeTypes";
import {
  Zap, MessageSquare, Send, Image, FileText, HelpCircle, ListChecks,
  GitBranch, UserPlus, Tag, ArrowRight, UserCheck, ClipboardList, Car,
  FileSignature, ShieldCheck, Bot, PauseCircle, ArrowRightLeft, Bell,
  Timer, ExternalLink, Globe, MessageCircle, Clock, TextCursorInput, Network,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquarePlus: MessageSquare,
  MessageCircle,
  ArrowRightLeft,
  Tag,
  Clock,
  Send,
  Image,
  FileText,
  TextCursorInput: HelpCircle,
  ListChecks,
  GitBranch,
  UserPlus,
  ArrowRight,
  UserCheck,
  ClipboardList,
  Car,
  FileSignature,
  ShieldCheck,
  Bot,
  PauseCircle,
  Bell,
  Timer,
  ExternalLink,
  Globe,
  Zap,
  Network,
};

function FlowNodeComponent({ data, selected }: NodeProps) {
  const def = getNodeDefinition(data.nodeType as string);
  if (!def) return <div className="p-2 bg-destructive text-destructive-foreground rounded text-xs">Bloco desconhecido</div>;

  const IconComp = ICON_MAP[def.icon] || Zap;
  const hasConditionOutputs = def.outputs.some(o => o.type === "condition-yes");
  const isRouter = (data.nodeType as string) === "condition_router";

  // For router, parse routes from config to determine dynamic outputs
  let routerOutputs: { id: string; label: string }[] = [];
  if (isRouter) {
    try {
      const routesStr = (data.config as any)?.routes;
      const routes = routesStr ? JSON.parse(routesStr) : [];
      routerOutputs = routes.map((r: any, i: number) => ({
        id: `route_${i}`,
        label: r.label || `Rota ${i + 1}`,
      }));
    } catch {
      routerOutputs = def.outputs.filter(o => o.id.startsWith("route_")).map(o => ({ id: o.id, label: o.label }));
    }
    // Always add fallback
    routerOutputs.push({ id: "fallback", label: "Nenhuma" });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`rounded-xl border-2 bg-card shadow-lg min-w-[180px] max-w-[260px] transition-all ${
            selected ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border hover:border-primary/40"
          }`}
          style={{ borderLeftColor: def.color, borderLeftWidth: 4 }}
        >
          {/* Inputs */}
          {def.inputs.map((inp) => (
            <Handle
              key={inp.id}
              type="target"
              position={Position.Top}
              id={inp.id}
              className="!w-3 !h-3 !bg-primary !border-2 !border-background !-top-1.5"
            />
          ))}

          {/* Content */}
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${def.color}20` }}
              >
                <IconComp className="h-4 w-4" style={{ color: def.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{(data.label as string) || def.label}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{def.category}</p>
              </div>
            </div>
            {!isRouter && data.config && Object.keys(data.config as object).length > 0 && (
              <div className="mt-1 px-1 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground truncate">
                {Object.entries(data.config as Record<string, unknown>).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="block truncate">{k}: {String(v).slice(0, 30)}</span>
                )).slice(0, 2)}
              </div>
            )}
          </div>

          {/* Router: right-side handles with labels */}
          {isRouter && routerOutputs.length > 0 && (
            <div className="px-3 pb-2 space-y-1">
              {routerOutputs.map((r, i) => (
                <div key={r.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${r.id === 'fallback' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${r.id === 'fallback' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  {r.label}
                </div>
              ))}
            </div>
          )}

          {/* Outputs */}
          {isRouter ? (
            <>
              {routerOutputs.map((r, i) => {
                // Position handles on the RIGHT side, spaced vertically to align with each route label
                // Header area ~44px, each route item ~24px, offset ~12px center
                const topOffset = 52 + i * 24 + 12;
                return (
                  <Handle
                    key={r.id}
                    type="source"
                    position={Position.Right}
                    id={r.id}
                    className={`!w-5 !h-5 !border-2 !border-background !-right-2.5 !cursor-crosshair ${r.id === 'fallback' ? '!bg-rose-500' : '!bg-amber-500'} hover:!scale-150 !transition-transform`}
                    style={{ top: `${topOffset}px` }}
                  />
                );
              })}
            </>
          ) : hasConditionOutputs ? (
            <>
              <Handle
                type="source"
                position={Position.Bottom}
                id="yes"
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background !-bottom-1.5"
                style={{ left: "30%" }}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="no"
                className="!w-3 !h-3 !bg-rose-500 !border-2 !border-background !-bottom-1.5"
                style={{ left: "70%" }}
              />
              <div className="flex justify-between px-4 pb-1">
                <span className="text-[8px] text-emerald-500 font-bold">SIM</span>
                <span className="text-[8px] text-rose-500 font-bold">NÃO</span>
              </div>
            </>
          ) : (
            def.outputs.map((out) => (
              <Handle
                key={out.id}
                type="source"
                position={Position.Bottom}
                id={out.id}
                className="!w-3 !h-3 !bg-primary !border-2 !border-background !-bottom-1.5"
              />
            ))
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <p className="font-bold text-xs">{def.label}</p>
        <p className="text-[10px] text-muted-foreground">{def.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const FlowNodeMemo = memo(FlowNodeComponent);