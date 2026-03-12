import { motion } from "framer-motion";

interface ExperienceBlockProps {
  service: {
    id?: string;
    description?: string;
    category?: string;
    product_type?: string;
    reservation_code?: string;
  };
  index?: number;
}

function getEmoji(category: string) {
  const c = category.toLowerCase();
  if (c.includes("transfer") || c.includes("transporte")) return "🚙";
  if (c.includes("seguro")) return "🛡";
  if (c.includes("passeio") || c.includes("experiencia") || c.includes("experiência")) return "🏔";
  if (c.includes("ingresso") || c.includes("parque")) return "🎢";
  if (c.includes("gastronomia") || c.includes("restaurante") || c.includes("jantar")) return "🍽";
  if (c.includes("mergulho") || c.includes("aqua")) return "🤿";
  if (c.includes("foto")) return "📸";
  if (c.includes("carro") || c.includes("aluguel")) return "🚗";
  if (c.includes("chip")) return "📱";
  return "⭐";
}

export default function ExperienceBlock({ service: s, index = 0 }: ExperienceBlockProps) {
  const cat = s.product_type || s.category || "";
  const emoji = getEmoji(cat);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.03 + index * 0.04 }}
      className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all bg-card group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{s.description || s.category}</p>
        {s.reservation_code && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Cód: {s.reservation_code}</p>}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-full flex-shrink-0 hidden sm:inline">{cat}</span>
    </motion.div>
  );
}
