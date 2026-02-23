import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import SaleDetail from "@/pages/SaleDetail";
import NewSale from "@/pages/NewSale";
import Passengers from "@/pages/Passengers";
import SettingsIndex from "@/pages/settings/SettingsIndex";
import GenericSettingsList from "@/pages/settings/GenericSettingsList";
import Checkin from "@/pages/Checkin";
import Lodging from "@/pages/Lodging";
import ClientDetail from "@/pages/ClientDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/sales/new" element={<NewSale />} />
        <Route path="/sales/:id" element={<SaleDetail />} />
        <Route path="/checkin" element={<Checkin />} />
        <Route path="/hospedagem" element={<Lodging />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/passengers" element={<Passengers />} />
        <Route path="/settings" element={<SettingsIndex />} />
        <Route path="/settings/sellers" element={<GenericSettingsList title="Vendedores" defaultItems={["Admin NatLeva"]} />} />
        <Route path="/settings/airlines" element={<GenericSettingsList title="Companhias Aéreas" defaultItems={["LATAM", "GOL", "Azul", "TAP", "Emirates", "Qatar Airways", "Turkish Airlines"]} />} />
        <Route path="/settings/airports" element={<GenericSettingsList title="Aeroportos" defaultItems={["GRU", "CGH", "GIG", "SDU", "BSB", "CNF", "SSA", "REC", "FOR", "POA"]} />} />
        <Route path="/settings/miles-programs" element={<GenericSettingsList title="Programas de Milhas" defaultItems={["Smiles", "LATAM Pass", "TudoAzul", "Livelo", "Esfera"]} />} />
        <Route path="/settings/payment-methods" element={<GenericSettingsList title="Meios de Pagamento" defaultItems={["PIX", "Cartão de crédito", "Transferência", "Boleto"]} />} />
        <Route path="/settings/tags" element={<GenericSettingsList title="Tags" defaultItems={["VIP", "Corporativo", "Lua de Mel", "Família", "Grupo"]} />} />
        <Route path="/settings/products" element={<GenericSettingsList title="Produtos" defaultItems={["Aéreo", "Hotel", "Seguro Viagem", "Transfer", "Passeios"]} />} />
        <Route path="/settings/permissions" element={<GenericSettingsList title="Permissões" defaultItems={["admin", "gestor", "vendedor", "operacional", "financeiro", "leitura"]} />} />
        <Route path="/settings/calc-rules" element={<GenericSettingsList title="Regras de Cálculo" defaultItems={["Milheiro padrão: R$ 20,00", "Taxa fixa emissão: R$ 50,00", "Markup padrão: 15%"]} />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
