import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";

export function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const isHovered = (data as any)?.isHovered === true;

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    (data as any)?.onDelete?.(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeDasharray: isHovered ? "6 3" : undefined,
          stroke: isHovered ? "hsl(0 84% 60%)" : (style?.stroke || "hsl(var(--primary))"),
        }}
        interactionWidth={20}
      />
      {isHovered && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <button
              onClick={onDelete}
              className="flex items-center justify-center h-6 w-6 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-125 transition-transform cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
