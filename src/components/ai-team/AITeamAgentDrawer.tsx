import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import type { Agent, Task } from "./mockData";
import { simulatedResponses } from "./mockData";
import { cn } from "@/lib/utils";

interface Props {
  agent: Agent | null;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMsg {
  role: "user" | "agent";
  text: string;
}

const levelLabels: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export default function AITeamAgentDrawer({ agent, tasks, open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);

  if (!agent) return null;

  const agentTasks = tasks.filter((t) => t.sourceAgentId === agent.id);
  const responses = simulatedResponses[agent.id] ?? [
    "Estou processando essa informação.",
    "Vou analisar isso com base no meu escopo de atuação.",
    "Entendido. Vou trabalhar nisso dentro das minhas restrições.",
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: "user", text: input.trim() };
    const reply = responses[Math.floor(Math.random() * responses.length)];
    setChat((prev) => [...prev, userMsg, { role: "agent", text: reply }]);
    setInput("");
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setChat([]); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <span className="text-2xl">{agent.emoji}</span> {agent.name}
            <Badge variant="secondary" className="text-[10px]">{agent.sector}</Badge>
            {agent.level && (
              <Badge variant="outline" className="text-[10px]">{levelLabels[agent.level] ?? agent.level}</Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>{agent.role}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5 overflow-y-auto">
          {/* Current thought */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">💭 Pensamento atual</p>
            <p className="text-sm leading-relaxed">{agent.currentThought}</p>
          </div>

          {/* Skills */}
          {agent.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Habilidades</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Scope */}
          {agent.scope.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escopo de atuação</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.scope.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Restrictions */}
          {agent.restrictions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restrições</h4>
              <div className="flex flex-wrap gap-1.5">
                {agent.restrictions.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs font-normal text-muted-foreground border-muted-foreground/30">{r}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Behavior */}
          {agent.behaviorPrompt && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comportamento</h4>
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50 italic">
                "{agent.behaviorPrompt}"
              </p>
            </div>
          )}

          {/* Related tasks */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tarefas relacionadas ({agentTasks.length})
            </h4>
            {agentTasks.map((t) => (
              <div key={t.id} className="text-sm border rounded-md p-3 space-y-0.5">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            ))}
            {agentTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa atribuída.</p>
            )}
          </div>

          {/* Chat */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Perguntar ao agente
            </h4>

            {chat.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {chat.map((m, i) => (
                  <div
                    key={`chat-${i}-${m.role}`}
                    className={cn(
                      "text-sm rounded-lg px-3 py-2 max-w-[85%]",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder={`Perguntar ao ${agent.name}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="text-sm"
              />
              <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
