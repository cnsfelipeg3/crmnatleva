import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  Panel,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlowNodeMemo } from "./FlowNode";
import { DeletableEdge } from "./DeletableEdge";
import { FlowNodeLibrary } from "./FlowNodeLibrary";
import { FlowBlockConfig } from "./FlowBlockConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Play, ArrowLeft, Copy, Trash2, Undo, Redo, CheckCircle2, Clock, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NodeDefinition } from "./nodeTypes";

const nodeTypes = { flowNode: FlowNodeMemo };
const edgeTypes = { deletable: DeletableEdge };

interface Props {
  flowId: string;
  flowName: string;
  flowStatus: string;
  onBack: () => void;
  onSimulate: (flowId: string) => void;
}

export function FlowCanvas({ flowId, flowName, flowStatus, onBack, onSimulate }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [name, setName] = useState(flowName);
  const [status, setStatus] = useState(flowStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load flow data
  useEffect(() => {
    loadFlow();
  }, [flowId]);

  const loadFlow = async () => {
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("flow_nodes").select("*").eq("flow_id", flowId),
      supabase.from("flow_edges").select("*").eq("flow_id", flowId),
    ]);

    if (nodesRes.data) {
      setNodes(nodesRes.data.map(n => ({
        id: n.node_id,
        type: "flowNode",
        position: { x: n.position_x, y: n.position_y },
        data: { nodeType: n.node_type, label: n.label, config: n.config },
      })));
    }
    if (edgesRes.data) {
      setEdges(edgesRes.data.map(e => ({
        id: e.edge_id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
        label: e.label,
        animated: true,
        type: "deletable",
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      })));
    }
  };

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: any) => {
    setEdges(eds => eds.map(e => e.id === edge.id
      ? { ...e, data: { ...((e.data as any) || {}), isHovered: true } }
      : e
    ));
  }, []);

  const onEdgeMouseLeave = useCallback((_: React.MouseEvent, edge: any) => {
    setEdges(eds => eds.map(e => e.id === edge.id
      ? { ...e, data: { ...((e.data as any) || {}), isHovered: false } }
      : e
    ));
  }, []);

  // Inject onDelete into edge data
  const edgesWithDelete = edges.map(e => ({
    ...e,
    type: "deletable",
    data: { ...((e.data as any) || {}), onDelete: handleDeleteEdge },
  }));

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      animated: true,
      type: "deletable",
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    } as any, eds));
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveFlow(), 5000);
  };

  const handleNodesChange: typeof onNodesChange = (changes) => {
    onNodesChange(changes);
    if (changes.some(c => c.type === "position" && (c as any).dragging === false)) {
      setHasChanges(true);
      scheduleAutoSave();
    }
  };

  const handleEdgesChange: typeof onEdgesChange = (changes) => {
    onEdgesChange(changes);
    setHasChanges(true);
    scheduleAutoSave();
  };

  // Drag and drop from library
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/flownode");
    if (!data || !rfInstance.current) return;

    const def: NodeDefinition = JSON.parse(data);
    const position = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });

    // Snap to grid (20px)
    position.x = Math.round(position.x / 20) * 20;
    position.y = Math.round(position.y / 20) * 20;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: "flowNode",
      position,
      data: { nodeType: def.type, label: def.label, config: {} },
    };

    setNodes(nds => [...nds, newNode]);
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const handleUpdateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
    ));
    setSelectedNode(prev => prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, config } } : prev);
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const handleUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
    ));
    setSelectedNode(prev => prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, label } } : prev);
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setHasChanges(true);
    scheduleAutoSave();
  }, []);

  const saveFlow = async () => {
    setIsSaving(true);
    try {
      // Update flow name/status
      await supabase.from("flows").update({ name, status }).eq("id", flowId);

      // Delete existing nodes/edges and re-insert
      await Promise.all([
        supabase.from("flow_nodes").delete().eq("flow_id", flowId),
        supabase.from("flow_edges").delete().eq("flow_id", flowId),
      ]);

      if (nodes.length > 0) {
        await supabase.from("flow_nodes").insert(
          nodes.map(n => ({
            flow_id: flowId,
            node_id: n.id,
            node_type: n.data.nodeType as string,
            label: (n.data.label as string) || null,
            position_x: n.position.x,
            position_y: n.position.y,
            config: JSON.parse(JSON.stringify((n.data.config as Record<string, unknown>) || {})),
          }))
        );
      }

      if (edges.length > 0) {
        await supabase.from("flow_edges").insert(
          edges.map(e => ({
            flow_id: flowId,
            edge_id: e.id,
            source_node_id: e.source,
            target_node_id: e.target,
            source_handle: e.sourceHandle || null,
            target_handle: e.targetHandle || null,
            label: (e.label as string) || null,
          }))
        );
      }

      setHasChanges(false);
      toast({ title: "Fluxo salvo", description: "Alterações salvas com sucesso." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handlePublish = async () => {
    const newStatus = status === "ativo" ? "pausado" : "ativo";
    setStatus(newStatus);
    await supabase.from("flows").update({ status: newStatus }).eq("id", flowId);
    // Save version snapshot
    await supabase.from("flow_versions").insert({
      flow_id: flowId,
      version: 1,
      snapshot: { nodes, edges },
      change_notes: newStatus === "ativo" ? "Publicado" : "Pausado",
    });
    toast({
      title: newStatus === "ativo" ? "Fluxo publicado!" : "Fluxo pausado",
      description: newStatus === "ativo" ? "O fluxo está ativo." : "O fluxo foi pausado.",
    });
  };

  const statusBadge = {
    rascunho: { label: "Rascunho", variant: "secondary" as const, icon: Clock },
    ativo: { label: "Ativo", variant: "default" as const, icon: CheckCircle2 },
    pausado: { label: "Pausado", variant: "outline" as const, icon: Pause },
  }[status] || { label: status, variant: "secondary" as const, icon: Clock };

  const StatusIcon = statusBadge.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setHasChanges(true); }}
            className="h-8 text-sm font-bold w-[200px] border-none bg-transparent px-1 focus-visible:ring-1"
          />
          <Badge variant={statusBadge.variant} className="text-[10px] gap-1">
            <StatusIcon className="h-3 w-3" /> {statusBadge.label}
          </Badge>
          {hasChanges && <span className="text-[10px] text-amber-500 font-mono">● não salvo</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onSimulate(flowId)} className="text-xs gap-1">
            <Play className="h-3.5 w-3.5" /> Simular
          </Button>
          <Button variant="outline" size="sm" onClick={saveFlow} disabled={isSaving} className="text-xs gap-1">
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            className="text-xs gap-1"
            variant={status === "ativo" ? "destructive" : "default"}
          >
            {status === "ativo" ? <><Pause className="h-3.5 w-3.5" /> Pausar</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Publicar</>}
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        <FlowNodeLibrary onDragStart={() => {}} />

        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edgesWithDelete}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onInit={(instance) => { rfInstance.current = instance as any; }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            snapToGrid
            snapGrid={[20, 20]}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
            <Controls className="!bg-card !border-border !rounded-lg !shadow-lg" />
            <MiniMap
              nodeColor={(n) => {
                const type = n.data?.nodeType as string;
                if (type?.startsWith("trigger")) return "#10b981";
                if (type?.startsWith("send") || type?.startsWith("question")) return "#3b82f6";
                if (type?.startsWith("condition")) return "#f59e0b";
                if (type?.startsWith("action")) return "#0ea5e9";
                if (type?.startsWith("ai")) return "#a855f7";
                if (type?.startsWith("handoff")) return "#f43f5e";
                return "#64748b";
              }}
              className="!bg-card !border-border !rounded-lg"
              maskColor="hsl(var(--background) / 0.7)"
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 text-center text-muted-foreground">
                  <p className="text-sm font-medium">Canvas vazio</p>
                  <p className="text-xs mt-1">Arraste blocos da biblioteca à esquerda para começar</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {selectedNode && (
          <FlowBlockConfig
            node={selectedNode}
            onUpdate={handleUpdateNodeConfig}
            onLabelChange={handleUpdateNodeLabel}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
