import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  count: number;
  onClick: () => void;
}

export function NewMessagesBadge({ count, onClick }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClick}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                     flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     bg-primary text-primary-foreground shadow-lg
                     active:scale-95 transition-transform"
          aria-label={`${count} novas mensagens, rolar até o fim`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">
            {count} {count === 1 ? "nova mensagem" : "novas mensagens"}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
