import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlaneTakeoff,
  BedDouble,
  PlusCircle,
  Users,
  MessageSquare,
  ClipboardList,
  FileText,
  Building2,
  Search,
  Map,
  Sparkles,
  Wallet,
  CalendarHeart,
  Image as ImageIcon,
  MessagesSquare,
} from "lucide-react";

// Emails que enxergam ações exclusivas de gestor (Feedback 1:1 etc.)
const MANAGER_EMAILS = ["arthurlessa713@gmail.com"];

interface QuickAction {
  menuKey: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // semantic gradient/bg class
}

// Ordem por relevância operacional. Cada um aparece só se o user tem can_view.
const QUICK_ACTIONS: QuickAction[] = [
  {
    menuKey: "sales.new",
    title: "Registrar Nova Venda",
    description: "Criar uma venda do zero ou a partir de uma cotação.",
    path: "/sales/new",
    icon: PlusCircle,
    accent: "from-primary/15 to-primary/5",
  },
  {
    menuKey: "viagens.checkin",
    title: "Fazer Check-in",
    description: "Realizar check-in dos próximos voos.",
    path: "/checkin",
    icon: PlaneTakeoff,
    accent: "from-amber-500/15 to-amber-500/5",
  },
  {
    menuKey: "viagens.hospedagem",
    title: "Confirmar Hospedagens",
    description: "Confirmar reservas de hotéis.",
    path: "/hospedagem",
    icon: BedDouble,
    accent: "from-blue-500/15 to-blue-500/5",
  },
  {
    menuKey: "clientes.passageiros",
    title: "Cadastrar Passageiro",
    description: "Adicionar um novo passageiro/cliente.",
    path: "/passengers",
    icon: Users,
    accent: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    menuKey: "operacao.inbox",
    title: "WhatsApp / Inbox",
    description: "Atender conversas em tempo real.",
    path: "/operacao/inbox",
    icon: MessageSquare,
    accent: "from-green-600/15 to-green-600/5",
  },
  {
    menuKey: "pendencias",
    title: "Minhas Pendências",
    description: "Tarefas e ações que precisam de você.",
    path: "/pendencias",
    icon: ClipboardList,
    accent: "from-orange-500/15 to-orange-500/5",
  },
  {
    menuKey: "cotacoes",
    title: "Cotações & Propostas",
    description: "Acompanhar pipeline comercial.",
    path: "/cotacoes",
    icon: FileText,
    accent: "from-purple-500/15 to-purple-500/5",
  },
  {
    menuKey: "viagens.torre",
    title: "Torre de Controle",
    description: "Visão operacional das viagens.",
    path: "/viagens",
    icon: Map,
    accent: "from-indigo-500/15 to-indigo-500/5",
  },
  {
    menuKey: "viagens.booking-search",
    title: "Buscar Hotéis",
    description: "Pesquisar disponibilidade no Booking.",
    path: "/booking-search",
    icon: Building2,
    accent: "from-sky-500/15 to-sky-500/5",
  },
  {
    menuKey: "viagens.flights-search",
    title: "Buscar Voos",
    description: "Pesquisar passagens aéreas.",
    path: "/flights-search",
    icon: Search,
    accent: "from-cyan-500/15 to-cyan-500/5",
  },
  {
    menuKey: "sales",
    title: "Minhas Vendas",
    description: "Lista completa de vendas.",
    path: "/sales",
    icon: Wallet,
    accent: "from-teal-500/15 to-teal-500/5",
  },
  {
    menuKey: "clientes.aniversariantes",
    title: "Aniversariantes",
    description: "Clientes para parabenizar este mês.",
    path: "/birthdays",
    icon: CalendarHeart,
    accent: "from-pink-500/15 to-pink-500/5",
  },
  {
    menuKey: "midias",
    title: "Mídias",
    description: "Banco de imagens e vídeos.",
    path: "/midias",
    icon: ImageIcon,
    accent: "from-fuchsia-500/15 to-fuchsia-500/5",
  },
  {
    menuKey: "ai-team.simulador",
    title: "Simulador IA",
    description: "Treinar atendimentos com a IA.",
    path: "/ai-team/simulador",
    icon: Sparkles,
    accent: "from-violet-500/15 to-violet-500/5",
  },
];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { can, loading } = usePermissions();

  if (loading) return null;

  const isManager = MANAGER_EMAILS.includes((profile?.email || "").toLowerCase());

  const managerActions: QuickAction[] = isManager
    ? [
        {
          menuKey: "rh.feedbacks",
          title: "Feedback 1:1",
          description: "Registrar feedbacks para colaboradores.",
          path: "/rh/feedbacks",
          icon: MessagesSquare,
          accent: "from-rose-500/15 to-rose-500/5",
        },
      ]
    : [];

  const visible = [
    ...managerActions,
    ...QUICK_ACTIONS.filter((a) => can(a.menuKey, "view")),
  ];

  const firstName = (profile?.full_name || "").split(" ")[0] || "olá";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-3xl font-display font-bold text-foreground">
          {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Aqui estão os atalhos das ações que você usa no dia a dia. Clique em
          qualquer card para começar.
        </p>
      </header>

      {visible.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Sem atalhos disponíveis</h2>
          <p className="text-sm text-muted-foreground">
            Você ainda não tem permissões atribuídas. Fale com um administrador
            para liberar os módulos do sistema.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.menuKey}
                onClick={() => navigate(a.path)}
                className="group text-left"
              >
                <Card
                  className={`p-5 h-full transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-0.5 bg-gradient-to-br ${a.accent} border-border/60`}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground leading-snug">
                        {a.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {a.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Precisa de algo que não está aqui?</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => navigate("/sales")}
        >
          Ver todos os módulos no menu lateral →
        </Button>
      </div>
    </div>
  );
}
