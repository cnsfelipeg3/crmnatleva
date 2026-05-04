import { Mic } from "lucide-react";

interface TypingIndicatorProps {
  status: "composing" | "recording";
}

/**
 * Visual indicator displayed inside the chat thread when the contact is
 * currently typing or recording an audio. Mimics a contact-side bubble.
 */
export function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
        {status === "composing" ? (
          <div className="flex items-center gap-1 h-4">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce"
                style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <Mic className="h-4 w-4 text-red-500 animate-pulse" />
            <span>gravando áudio…</span>
          </div>
        )}
      </div>
    </div>
  );
}
