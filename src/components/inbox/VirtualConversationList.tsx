import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, MessageSquare } from "lucide-react";
import type { Conversation } from "./types";
import { ConversationItem } from "./ConversationItem";
import { getActivePresence, type PresenceMap } from "@/hooks/usePresenceByPhone";

interface OwnerInfo {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface VirtualConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  profilePics: Map<string, string>;
  presenceByPhone?: PresenceMap;
  onSelect: (id: string, jumpToMsgId?: string) => void;
  onTogglePin: (id: string, e?: React.MouseEvent) => void;
  onToggleUnread?: (conv: Conversation) => void;
  onToggleArchive?: (conv: Conversation) => void;
  isLoading: boolean;
  searchQuery: string;
  ownerMap?: Map<string, OwnerInfo>;
  currentUserId?: string | null;
  contentMatchInfo?: Map<string, { msgId: string; snippet: string }>;
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
  ownerMap,
  currentUserId,
  contentMatchInfo,
}: VirtualConversationListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 88,
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
    <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" style={{ WebkitOverflowScrolling: "touch" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const conv = conversations[virtualItem.index];
          const convDbId = (conv as any).db_id || conv.id;
          const match = contentMatchInfo?.get(convDbId);
          return (
            <div
              key={conv.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                overflow: "hidden",
                contain: "strict",
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <ConversationItem
                conv={conv}
                isSelected={conv.id === selectedId}
                profilePic={profilePics.get(conv.id)}
                presence={presenceByPhone ? getActivePresence(presenceByPhone, conv.phone) : null}
                onSelect={(id) => onSelect(id, match?.msgId)}
                onTogglePin={onTogglePin}
                onToggleUnread={onToggleUnread}
                onToggleArchive={onToggleArchive}
                owner={conv.assigned_to ? ownerMap?.get(conv.assigned_to) || null : null}
                isMine={!!currentUserId && conv.assigned_to === currentUserId}
                searchTerm={searchQuery}
                contentMatchSnippet={match?.snippet}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
