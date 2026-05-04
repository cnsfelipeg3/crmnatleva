// ════════════════════════════════════════════════════════════════
// FailedMessagesBadge · Bell + counter + popover com ações
// ════════════════════════════════════════════════════════════════

import { Bell, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFailedMessagesBadge } from "@/hooks/useFailedMessagesBadge";
import { humanizeFailureReason } from "@/lib/zapiFailureClassifier";
import { cn } from "@/lib/utils";

const MAX_LIST = 10;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function FailedMessagesBadge() {
  const navigate = useNavigate();
  const { count, items, acknowledgeOne, acknowledgeAll } = useFailedMessagesBadge();

  const visible = items.slice(0, MAX_LIST);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            count > 0
              ? `${count} mensagem(ns) com falha não lidas`
              : "Mensagens com falha"
          }
          className={cn(
            "relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
            count > 0 && "text-foreground",
          )}
        >
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-4 text-center"
              aria-hidden
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
          <div className="text-sm font-medium text-foreground">
            Mensagens não enviadas
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={() => acknowledgeAll()}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma mensagem com falha pendente.
          </div>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto divide-y divide-border/30">
            {visible.map((row) => {
              const reason = humanizeFailureReason(row.failure_reason);
              return (
                <li
                  key={row.id}
                  className="px-3 py-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground truncate">
                        {reason}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelative(row.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {row.conversation_id && (
                        <button
                          type="button"
                          title="Abrir conversa"
                          onClick={() => {
                            acknowledgeOne(row.id, row.source_table);
                            navigate(
                              `/operacao/inbox?conversation=${row.conversation_id}&highlight=${row.id}`,
                            );
                          }}
                          className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Marcar como lida"
                        onClick={() => acknowledgeOne(row.id, row.source_table)}
                        className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {count > MAX_LIST && (
              <li className="px-3 py-2 text-[10px] text-center text-muted-foreground">
                + {count - MAX_LIST} mais
              </li>
            )}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
