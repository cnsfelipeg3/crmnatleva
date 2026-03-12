import { ReactNode, useState } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, User, Home, Map, MessageCircle } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva-clean.png";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, signOut, user } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/portal" className="flex items-center gap-3">
              <img src={logoNatleva} alt="NatLeva" className="h-8" />
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

            <div className="flex items-center gap-3">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoNatleva} alt="NatLeva" className="h-5 opacity-40" />
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
