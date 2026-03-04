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
import PassengerProfile from "@/pages/PassengerProfile";
import Birthdays from "@/pages/Birthdays";
import SettingsIndex from "@/pages/settings/SettingsIndex";
import GenericSettingsList from "@/pages/settings/GenericSettingsList";
import Checkin from "@/pages/Checkin";
import Lodging from "@/pages/Lodging";
import ClientDetail from "@/pages/ClientDetail";
import ImportData from "@/pages/ImportData";
import Pendencias from "@/pages/Pendencias";
import Viagens from "@/pages/Viagens";
import ClientIntelligence from "@/pages/ClientIntelligence";
import NatLevaIntelligence from "@/pages/NatLevaIntelligence";
import NotFound from "@/pages/NotFound";
import UserLocations from "@/pages/settings/UserLocations";
import LiveChat from "@/pages/LiveChat";
import WhatsAppIntegration from "@/pages/WhatsAppIntegration";
import FlowBuilder from "@/pages/FlowBuilder";
import AIIntegrations from "@/pages/AIIntegrations";
import AIKnowledgeBase from "@/pages/AIKnowledgeBase";
import ImportChatGuru from "@/pages/ImportChatGuru";
import AnaliseAtendimento from "@/pages/AnaliseAtendimento";

// RH
import RHIndex from "@/pages/rh/RHIndex";
import Colaboradores from "@/pages/rh/Colaboradores";
import Ponto from "@/pages/rh/Ponto";
import FolhaPagamentos from "@/pages/rh/FolhaPagamentos";
import MetasBonus from "@/pages/rh/MetasBonus";
import Desempenho from "@/pages/rh/Desempenho";
import FeedbacksRH from "@/pages/rh/FeedbacksRH";
import Advertencias from "@/pages/rh/Advertencias";
import ContratosDocumentos from "@/pages/rh/ContratosDocumentos";
import PermissoesAcessos from "@/pages/rh/PermissoesAcessos";
import ClimaTime from "@/pages/rh/ClimaTime";
import RelatoriosRH from "@/pages/rh/RelatoriosRH";
import ConfiguracoesRH from "@/pages/rh/ConfiguracoesRH";

// Financeiro
import FinanceiroIndex from "@/pages/financeiro/FinanceiroIndex";
import ContasReceber from "@/pages/financeiro/ContasReceber";
import ContasPagar from "@/pages/financeiro/ContasPagar";
import FluxoCaixa from "@/pages/financeiro/FluxoCaixa";
import CartaoCredito from "@/pages/financeiro/CartaoCredito";
import Fornecedores from "@/pages/financeiro/Fornecedores";
import TaxasTarifas from "@/pages/financeiro/TaxasTarifas";
import GatewayPagamentos from "@/pages/financeiro/GatewayPagamentos";
import PlanoContas from "@/pages/financeiro/PlanoContas";
import Comissoes from "@/pages/financeiro/Comissoes";
import DREReport from "@/pages/financeiro/DREReport";

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
        <Route path="/viagens" element={<Viagens />} />
        <Route path="/checkin" element={<Checkin />} />
        <Route path="/hospedagem" element={<Lodging />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/passengers" element={<Passengers />} />
        <Route path="/passengers/:id" element={<PassengerProfile />} />
        <Route path="/inteligencia-clientes" element={<ClientIntelligence />} />
        <Route path="/natleva-intelligence" element={<NatLevaIntelligence />} />
        <Route path="/birthdays" element={<Birthdays />} />
        <Route path="/import" element={<ImportData />} />
        <Route path="/pendencias" element={<Pendencias />} />
        <Route path="/livechat" element={<LiveChat />} />
        <Route path="/livechat/integration" element={<WhatsAppIntegration />} />
         <Route path="/livechat/flows" element={<FlowBuilder />} />
         <Route path="/livechat/integrations" element={<AIIntegrations />} />
         <Route path="/livechat/knowledge-base" element={<AIKnowledgeBase />} />
         <Route path="/livechat/import-chatguru" element={<ImportChatGuru />} />
         <Route path="/livechat/analise" element={<AnaliseAtendimento />} />

        {/* Financeiro */}
        <Route path="/financeiro" element={<FinanceiroIndex />} />
        <Route path="/financeiro/receber" element={<ContasReceber />} />
        <Route path="/financeiro/pagar" element={<ContasPagar />} />
        <Route path="/financeiro/fluxo" element={<FluxoCaixa />} />
        <Route path="/financeiro/cartoes" element={<CartaoCredito />} />
        <Route path="/financeiro/fornecedores" element={<Fornecedores />} />
            <Route path="/financeiro/taxas" element={<TaxasTarifas />} />
            <Route path="/financeiro/gateways" element={<GatewayPagamentos />} />
        <Route path="/financeiro/plano-contas" element={<PlanoContas />} />
        <Route path="/financeiro/comissoes" element={<Comissoes />} />
        <Route path="/financeiro/dre" element={<DREReport />} />

        {/* RH */}
        <Route path="/rh" element={<RHIndex />} />
        <Route path="/rh/colaboradores" element={<Colaboradores />} />
        <Route path="/rh/ponto" element={<Ponto />} />
        <Route path="/rh/folha" element={<FolhaPagamentos />} />
        <Route path="/rh/metas" element={<MetasBonus />} />
        <Route path="/rh/desempenho" element={<Desempenho />} />
        <Route path="/rh/feedbacks" element={<FeedbacksRH />} />
        <Route path="/rh/advertencias" element={<Advertencias />} />
        <Route path="/rh/documentos" element={<ContratosDocumentos />} />
        <Route path="/rh/permissoes" element={<PermissoesAcessos />} />
        <Route path="/rh/clima" element={<ClimaTime />} />
        <Route path="/rh/relatorios" element={<RelatoriosRH />} />
        <Route path="/rh/config" element={<ConfiguracoesRH />} />

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
        <Route path="/settings/user-locations" element={<UserLocations />} />
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
