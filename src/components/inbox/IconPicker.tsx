import { useMemo, useState } from "react";
import { icons as LucideIcons, Search, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Curated catalog: each entry maps a Lucide PascalCase name to PT-BR keywords.
// Storage key format for non-curated picks: "lucide:IconName".
const ICON_CATALOG: { name: keyof typeof LucideIcons; kw: string }[] = [
  { name: "Folder", kw: "pasta arquivo diretorio" },
  { name: "FolderOpen", kw: "pasta aberta" },
  { name: "FolderHeart", kw: "pasta favorita coracao" },
  { name: "FolderLock", kw: "pasta segura privada cadeado" },
  { name: "Star", kw: "estrela favorito destaque" },
  { name: "Bookmark", kw: "marcador salvar" },
  { name: "Tag", kw: "etiqueta tag rotulo" },
  { name: "Tags", kw: "etiquetas tags multiplas" },
  { name: "Flag", kw: "bandeira sinalizar" },
  { name: "Briefcase", kw: "trabalho maleta negocio" },
  { name: "Building2", kw: "empresa predio escritorio" },
  { name: "Users", kw: "clientes pessoas equipe time" },
  { name: "User", kw: "pessoa usuario contato" },
  { name: "UserPlus", kw: "novo contato lead" },
  { name: "Plane", kw: "viagem aviao aereo voo" },
  { name: "PlaneTakeoff", kw: "decolagem partida" },
  { name: "PlaneLanding", kw: "chegada pouso" },
  { name: "Heart", kw: "favorito amor coracao" },
  { name: "Bell", kw: "importante notificacao sino alerta" },
  { name: "CircleDollarSign", kw: "financeiro dinheiro pagamento" },
  { name: "DollarSign", kw: "dinheiro valor preco" },
  { name: "CreditCard", kw: "cartao pagamento credito" },
  { name: "Wallet", kw: "carteira financeiro" },
  { name: "TrendingUp", kw: "crescimento vendas alta" },
  { name: "Mail", kw: "email mensagem" },
  { name: "MailCheck", kw: "email confirmado" },
  { name: "Inbox", kw: "caixa entrada" },
  { name: "Send", kw: "enviar envio" },
  { name: "MessageCircle", kw: "mensagem chat" },
  { name: "MessagesSquare", kw: "conversas chat" },
  { name: "Phone", kw: "telefone ligacao contato" },
  { name: "PhoneCall", kw: "ligacao chamada" },
  { name: "Calendar", kw: "calendario agenda data" },
  { name: "CalendarCheck", kw: "agendado confirmado" },
  { name: "Clock", kw: "tempo hora relogio" },
  { name: "AlarmClock", kw: "alarme despertador urgente" },
  { name: "MapPin", kw: "localizacao destino mapa" },
  { name: "Map", kw: "mapa rota" },
  { name: "Globe", kw: "mundo internacional global" },
  { name: "Compass", kw: "bussola direcao" },
  { name: "Hotel", kw: "hotel hospedagem hospedaria" },
  { name: "BedDouble", kw: "cama hotel quarto hospedagem" },
  { name: "Utensils", kw: "restaurante comida gastronomia" },
  { name: "Coffee", kw: "cafe pausa break" },
  { name: "Wine", kw: "vinho bebida" },
  { name: "Camera", kw: "camera foto" },
  { name: "Image", kw: "imagem foto" },
  { name: "Music", kw: "musica audio" },
  { name: "Gift", kw: "presente brinde bonus" },
  { name: "Crown", kw: "vip premium realeza" },
  { name: "Gem", kw: "joia premium diamante luxo" },
  { name: "Sparkles", kw: "brilho destaque magico" },
  { name: "Award", kw: "premio medalha conquista" },
  { name: "Trophy", kw: "trofeu vitoria" },
  { name: "Target", kw: "meta alvo objetivo" },
  { name: "Rocket", kw: "lancamento foguete rapido" },
  { name: "Zap", kw: "rapido urgente raio" },
  { name: "Flame", kw: "fogo quente hot" },
  { name: "Sun", kw: "sol verao praia" },
  { name: "Moon", kw: "lua noite" },
  { name: "Cloud", kw: "nuvem clima" },
  { name: "Umbrella", kw: "guarda chuva protecao" },
  { name: "ShoppingBag", kw: "compras sacola" },
  { name: "ShoppingCart", kw: "carrinho compras" },
  { name: "Package", kw: "pacote produto entrega" },
  { name: "Truck", kw: "entrega caminhao envio" },
  { name: "FileText", kw: "documento arquivo texto" },
  { name: "FileCheck", kw: "documento aprovado" },
  { name: "ClipboardList", kw: "lista tarefas checklist" },
  { name: "BookOpen", kw: "livro leitura conteudo" },
  { name: "GraduationCap", kw: "educacao formatura curso" },
  { name: "Lightbulb", kw: "ideia inspiracao lampada" },
  { name: "TriangleAlert", kw: "atencao aviso cuidado" },
  { name: "ShieldCheck", kw: "seguro protecao verificado" },
  { name: "Lock", kw: "cadeado seguro privado" },
  { name: "Key", kw: "chave acesso" },
  { name: "Settings", kw: "configuracoes ajustes" },
  { name: "Wrench", kw: "ferramenta manutencao" },
  { name: "Filter", kw: "filtro" },
  { name: "Search", kw: "busca procurar" },
  { name: "Eye", kw: "visualizar ver" },
  { name: "ThumbsUp", kw: "curtir gostei aprovado" },
  { name: "Smile", kw: "feliz sorriso" },
  { name: "House", kw: "casa inicio" },
  { name: "Store", kw: "loja comercio" },
  { name: "Car", kw: "carro transporte" },
  { name: "Bus", kw: "onibus transporte" },
  { name: "Ship", kw: "navio cruzeiro maritimo" },
  { name: "Anchor", kw: "ancora porto maritimo" },
  { name: "Mountain", kw: "montanha aventura" },
  { name: "Trees", kw: "natureza arvores ecoturismo" },
  { name: "TreePalm", kw: "praia palmeira tropical" },
  { name: "Tent", kw: "camping acampamento" },
  { name: "Activity", kw: "atividade pulso" },
  { name: "ChartBar", kw: "grafico relatorio analise" },
  { name: "ChartPie", kw: "grafico pizza relatorio" },
];

export function resolveIcon(iconKey?: string): React.ComponentType<{ className?: string }> {
  if (!iconKey) return Folder as never;
  if (iconKey.startsWith("lucide:")) {
    const name = iconKey.slice(7) as keyof typeof LucideIcons;
    return (LucideIcons[name] as never) || (Folder as never);
  }
  // legacy short keys handled by caller via LABEL_ICON_OPTIONS; fall back here
  const map: Record<string, keyof typeof LucideIcons> = {
    folder: "Folder", folderOpen: "FolderOpen", star: "Star", bookmark: "Bookmark",
    tag: "Tag", flag: "Flag", briefcase: "Briefcase", building: "Building2",
    users: "Users", plane: "Plane", heart: "Heart", bell: "Bell", dollar: "CircleDollarSign",
  };
  const name = map[iconKey];
  return name ? (LucideIcons[name] as never) : (Folder as never);
}

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
}

export function IconPicker({ value, onChange, size = "md" }: IconPickerProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ICON_CATALOG;
    return ICON_CATALOG.filter(
      (i) => i.name.toLowerCase().includes(term) || i.kw.includes(term)
    );
  }, [q]);

  const btnSize = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ícone (ex.: viagem, dinheiro, vip)"
          className="pl-7 h-8 text-xs"
        />
      </div>
      <div className="grid grid-cols-7 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {filtered.map((it) => {
          const Cmp = LucideIcons[it.name] as React.ComponentType<{ className?: string }>;
          const key = `lucide:${it.name}`;
          // also treat curated short-key equivalents as selected
          const selected = value === key || resolveIcon(value) === Cmp;
          return (
            <button
              key={it.name}
              type="button"
              onClick={() => onChange(key)}
              title={it.name}
              className={cn(
                "flex items-center justify-center rounded-md border transition-colors",
                btnSize,
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent text-foreground"
              )}
            >
              <Cmp className={iconSize} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-7 text-center text-xs text-muted-foreground py-4">
            Nenhum ícone encontrado
          </div>
        )}
      </div>
    </div>
  );
}
