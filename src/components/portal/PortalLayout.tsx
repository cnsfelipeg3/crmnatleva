import { ReactNode, useState, useEffect } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, User, Home, Map, MessageCircle, Bell, Sun, Moon, Wallet, PlaneTakeoff } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import PortalNotificationPanel from "@/components/portal/PortalNotificationPanel";
import PortalAssistant from "@/components/portal/PortalAssistant";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, signOut, user, portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portal-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("portal-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fetch unread count
  useEffect(() => {
    if (!portalAccess?.client_id) return;
    const fetchCount = async () => {
      const { count } = await (supabase as any)
        .from("portal_notifications")
        .select("id", { count: "exact", head: true })
        .eq("client_id", portalAccess.client_id)
        .eq("read_status", "unread");
      setUnreadCount(count || 0);
    };
    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel("portal-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "portal_notifications",
      }, () => fetchCount())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "portal_notifications",
      }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [portalAccess?.client_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;

  const handleLogout = async () => {
    await signOut();
    navigate("/portal/login");
  };

  const navItems = [
    { to: "/portal", icon: Home, label: "Início" },
    { to: "/portal/viagens", icon: Map, label: "Minhas Viagens" },
    { to: "/portal/financeiro", icon: Wallet, label: "Financeiro" },
    { to: "/portal/nova-cotacao", icon: PlaneTakeoff, label: "Nova Cotação" },
    { to: "/portal/perfil", icon: User, label: "Meu Perfil" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/portal" className="flex items-center gap-3">
              <img src={logoNatleva} alt="NatLeva" className="h-8 dark:brightness-[1.8]" />
              <span className="hidden sm:inline text-sm font-semibold text-foreground">Minhas Viagens</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === item.to
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title={darkMode ? "Modo claro" : "Modo escuro"}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Notificações"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="max-w-[180px] truncate">{user?.email}</span>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Sair">
                <LogOut className="h-4 w-4" />
              </button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground">
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border overflow-hidden bg-card"
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      location.pathname === item.to ? "bg-accent/10 text-accent" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <div className="pt-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground px-3 py-1">{user?.email}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Notification Panel */}
      <PortalNotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        clientId={portalAccess?.client_id || null}
      />

      <main className="flex-1">
        {children}
      </main>

      {/* AI Assistant */}
      <PortalAssistant />

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoNatleva} alt="NatLeva" className="h-5 opacity-40 dark:brightness-[1.8]" />
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} NatLeva Viagens</span>
            </div>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Suporte via WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
