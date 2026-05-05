import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, MessageSquare } from "lucide-react";
import type { Conversation } from "./types";
import { ConversationItem } from "./ConversationItem";
import { getActivePresence, type PresenceMap } from "@/hooks/usePresenceByPhone";

interface VirtualConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  profilePics: Map<string, string>;
  presenceByPhone?: PresenceMap;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, e?: React.MouseEvent) => void;
  onToggleUnread?: (conv: Conversation) => void;
  onToggleArchive?: (conv: Conversation) => void;
  isLoading: boolean;
  searchQuery: string;
}

export function VirtualConversationList({
  conversations,
  selectedId,
  profilePics,
  presenceByPhone,
  onSelect,
  onTogglePin,
  onToggleUnread,
  onToggleArchive,
  isLoading,
  searchQuery,
}: VirtualConversationListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 82, // estimated item height
    overscan: 8,
  });

  if (conversations.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col items-center justify-center min-h-[300px] h-full text-center px-4">
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground/30 mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando conversas...</p>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchQuery ? "Tente buscar por outro termo" : "As mensagens recebidas aparecerão aqui"}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const conv = conversations[virtualItem.index];
          return (
            <div
              key={conv.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <ConversationItem
                conv={conv}
                isSelected={conv.id === selectedId}
                profilePic={profilePics.get(conv.id)}
                presence={presenceByPhone ? getActivePresence(presenceByPhone, conv.phone) : null}
                onSelect={onSelect}
                onTogglePin={onTogglePin}
                onToggleUnread={onToggleUnread}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
