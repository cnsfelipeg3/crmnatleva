import { ReactNode, useState, useEffect } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, User, Home, Map, MessageCircle, Bell, Sun, Moon, Wallet, PlaneTakeoff, Maximize, Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import PortalNotificationPanel from "@/components/portal/PortalNotificationPanel";
import PortalAssistant from "@/components/portal/PortalAssistant";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, signOut, user, portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
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

  const tripPathMatch = location.pathname.match(/^\/portal\/viagem\/([^/]+)/);
  const saleFromPath = tripPathMatch?.[1] ? decodeURIComponent(tripPathMatch[1]) : null;
  const saleFromQuery = new URLSearchParams(location.search).get("sale");
  const assistantSaleId = saleFromPath || saleFromQuery || null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Floating Navbar */}
      <div className="sticky top-0 z-50 px-3 sm:px-5 pt-3">
        <header className="max-w-6xl mx-auto rounded-2xl bg-card/60 backdrop-blur-2xl border border-border/30 shadow-[0_8px_32px_-8px_hsl(var(--foreground)/0.08)]">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link to="/portal" className="flex items-center gap-2.5 group">
                <img src={logoNatleva} alt="NatLeva" className="h-7 dark:brightness-[1.8] transition-transform group-hover:scale-105" />
              </Link>

              {/* Center Nav */}
              <nav className="hidden md:flex items-center bg-muted/40 rounded-xl p-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  title={darkMode ? "Modo claro" : "Modo escuro"}
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  title="Notificações"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-accent text-accent-foreground text-[9px] font-bold rounded-full px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-2 border-l border-border/40">
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <span className="max-w-[140px] truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>

                <button onClick={handleLogout} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 ml-0.5" title="Sair">
                  <LogOut className="h-3.5 w-3.5" />
                </button>

                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground">
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
                className="md:hidden border-t border-border/30 overflow-hidden"
              >
                <div className="px-3 py-2.5 space-y-0.5">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        location.pathname === item.to
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-border/30 mt-2">
                    <p className="text-xs text-muted-foreground px-3 py-1">{user?.email}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

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
      <PortalAssistant saleId={assistantSaleId} />

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
