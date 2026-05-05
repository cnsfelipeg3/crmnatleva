import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";

export function AttachmentDropOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px]" />
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative bg-card border-2 border-dashed border-primary/60 rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-3"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 rounded-t-2xl" />
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="text-base font-semibold text-foreground">Solte para anexar</div>
            <div className="text-xs text-muted-foreground">imagens · vídeos · PDFs · documentos</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
