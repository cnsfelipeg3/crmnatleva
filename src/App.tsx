import { lazy, Suspense } from "react";
import NatLevaLoader from "@/components/NatLevaLoader";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Portal do Cliente
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";

const AppLayout = lazy(() => import("@/components/AppLayout"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Sales = lazy(() => import("@/pages/Sales"));
const SaleDetail = lazy(() => import("@/pages/SaleDetail"));
const NewSale = lazy(() => import("@/pages/NewSale"));
const Passengers = lazy(() => import("@/pages/Passengers"));
const PassengerProfile = lazy(() => import("@/pages/PassengerProfile"));
const Birthdays = lazy(() => import("@/pages/Birthdays"));
const SettingsIndex = lazy(() => import("@/pages/settings/SettingsIndex"));
const GenericSettingsList = lazy(() => import("@/pages/settings/GenericSettingsList"));
const Checkin = lazy(() => import("@/pages/Checkin"));
const Lodging = lazy(() => import("@/pages/Lodging"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const ImportData = lazy(() => import("@/pages/ImportData"));
const Pendencias = lazy(() => import("@/pages/Pendencias"));
const Viagens = lazy(() => import("@/pages/Viagens"));
const ClientIntelligence = lazy(() => import("@/pages/ClientIntelligence"));
const NatLevaIntelligence = lazy(() => import("@/pages/NatLevaIntelligence"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const UserLocations = lazy(() => import("@/pages/settings/UserLocations"));
const LiveChat = lazy(() => import("@/pages/LiveChat"));
const WhatsAppIntegration = lazy(() => import("@/pages/WhatsAppIntegration"));
const WhatsAppQRConnect = lazy(() => import("@/pages/WhatsAppQRConnect"));
const FlowBuilder = lazy(() => import("@/pages/FlowBuilder"));
const AIIntegrations = lazy(() => import("@/pages/AIIntegrations"));
const AIKnowledgeBase = lazy(() => import("@/pages/AIKnowledgeBase"));
const ImportChatGuru = lazy(() => import("@/pages/ImportChatGuru"));
const AnaliseAtendimento = lazy(() => import("@/pages/AnaliseAtendimento"));
const ApresentacaoGeral = lazy(() => import("@/pages/ApresentacaoGeral"));
const TripDetail = lazy(() => import("@/pages/TripDetail"));
const TripAlterations = lazy(() => import("@/pages/TripAlterations"));
const Itinerary = lazy(() => import("@/pages/Itinerary"));

// RH
const RHIndex = lazy(() => import("@/pages/rh/RHIndex"));
const Colaboradores = lazy(() => import("@/pages/rh/Colaboradores"));
const Ponto = lazy(() => import("@/pages/rh/Ponto"));
const FolhaPagamentos = lazy(() => import("@/pages/rh/FolhaPagamentos"));
const MetasBonus = lazy(() => import("@/pages/rh/MetasBonus"));
const Desempenho = lazy(() => import("@/pages/rh/Desempenho"));
const FeedbacksRH = lazy(() => import("@/pages/rh/FeedbacksRH"));
const Advertencias = lazy(() => import("@/pages/rh/Advertencias"));
const ContratosDocumentos = lazy(() => import("@/pages/rh/ContratosDocumentos"));
const PermissoesAcessos = lazy(() => import("@/pages/rh/PermissoesAcessos"));
const ClimaTime = lazy(() => import("@/pages/rh/ClimaTime"));
const RelatoriosRH = lazy(() => import("@/pages/rh/RelatoriosRH"));
const ConfiguracoesRH = lazy(() => import("@/pages/rh/ConfiguracoesRH"));

// Financeiro
const FinanceiroIndex = lazy(() => import("@/pages/financeiro/FinanceiroIndex"));
const ContasReceber = lazy(() => import("@/pages/financeiro/ContasReceber"));
const ContasPagar = lazy(() => import("@/pages/financeiro/ContasPagar"));
const FluxoCaixa = lazy(() => import("@/pages/financeiro/FluxoCaixa"));
const CartaoCredito = lazy(() => import("@/pages/financeiro/CartaoCredito"));
const Fornecedores = lazy(() => import("@/pages/financeiro/Fornecedores"));
const TaxasTarifas = lazy(() => import("@/pages/financeiro/TaxasTarifas"));
const GatewayPagamentos = lazy(() => import("@/pages/financeiro/GatewayPagamentos"));
const PlanoContas = lazy(() => import("@/pages/financeiro/PlanoContas"));
const Comissoes = lazy(() => import("@/pages/financeiro/Comissoes"));
const DREReport = lazy(() => import("@/pages/financeiro/DREReport"));
const SimuladorTaxas = lazy(() => import("@/pages/financeiro/SimuladorTaxas"));
const FechamentoFornecedores = lazy(() => import("@/pages/financeiro/FechamentoFornecedores"));

// Admin
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

// Portal Admin
const PortalAdminDashboard = lazy(() => import("@/pages/portal-admin/PortalAdminDashboard"));
const PortalAdminTrips = lazy(() => import("@/pages/portal-admin/PortalAdminTrips"));
const PortalAdminTripDetail = lazy(() => import("@/pages/portal-admin/PortalAdminTripDetail"));
const PortalAdminClients = lazy(() => import("@/pages/portal-admin/PortalAdminClients"));
const PortalAdminDocuments = lazy(() => import("@/pages/portal-admin/PortalAdminDocuments"));
const PortalAdminNotifications = lazy(() => import("@/pages/portal-admin/PortalAdminNotifications"));
const PortalAdminConfig = lazy(() => import("@/pages/portal-admin/PortalAdminConfig"));

// Implementação
const BaseConhecimento = lazy(() => import("@/pages/implementacao/BaseConhecimento"));

// Portal do Cliente
const PortalLogin = lazy(() => import("@/pages/portal/PortalLogin"));
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalTripDetail = lazy(() => import("@/pages/portal/PortalTripDetail"));
const PortalDemoTrip = lazy(() => import("@/pages/portal/PortalDemoTrip"));
const PortalFinance = lazy(() => import("@/pages/portal/PortalFinance"));
const PortalNewQuote = lazy(() => import("@/pages/portal/PortalNewQuote"));
const PortalProfile = lazy(() => import("@/pages/portal/PortalProfile"));

// CRM
const QuoteRequests = lazy(() => import("@/pages/QuoteRequests"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const ProposalEditor = lazy(() => import("@/pages/ProposalEditor"));
const ProposalPublicView = lazy(() => import("@/pages/ProposalPublicView"));
const MediaLibrary = lazy(() => import("@/pages/MediaLibrary"));

// Operação Diária
const OperacaoInbox = lazy(() => import("@/pages/operacao/OperacaoInbox"));
const OperacaoFlowBuilder = lazy(() => import("@/pages/operacao/OperacaoFlowBuilder"));
const OperacaoIntegracoes = lazy(() => import("@/pages/operacao/OperacaoIntegracoes"));
const OperacaoAgentesIA = lazy(() => import("@/pages/operacao/OperacaoAgentesIA"));
const OperacaoTagsPipeline = lazy(() => import("@/pages/operacao/OperacaoTagsPipeline"));
const OperacaoSimulador = lazy(() => import("@/pages/operacao/OperacaoSimulador"));
const OperacaoLogs = lazy(() => import("@/pages/operacao/OperacaoLogs"));

const queryClient = new QueryClient();

function ScreenLoader() {
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <ScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <ScreenLoader />;

  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/new" element={<NewSale />} />
          <Route path="/sales/:id" element={<SaleDetail />} />
          <Route path="/itinerario" element={<Itinerary />} />
          <Route path="/viagens" element={<Viagens />} />
          <Route path="/viagens/:id" element={<TripDetail />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/hospedagem" element={<Lodging />} />
          <Route path="/alteracoes" element={<TripAlterations />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/passengers" element={<Passengers />} />
          <Route path="/passengers/:id" element={<PassengerProfile />} />
          <Route path="/inteligencia-clientes" element={<ClientIntelligence />} />
          <Route path="/natleva-intelligence" element={<NatLevaIntelligence />} />
          <Route path="/birthdays" element={<Birthdays />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/pendencias" element={<Pendencias />} />
          <Route path="/cotacoes" element={<QuoteRequests />} />
          <Route path="/propostas" element={<Proposals />} />
          <Route path="/propostas/nova" element={<ProposalEditor />} />
          <Route path="/propostas/:id" element={<ProposalEditor />} />
          <Route path="/livechat" element={<LiveChat />} />
          <Route path="/livechat/integration" element={<WhatsAppIntegration />} />
          <Route path="/livechat/whatsapp-qr" element={<WhatsAppQRConnect />} />
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
          <Route path="/financeiro/simulador" element={<SimuladorTaxas />} />
          <Route path="/financeiro/fechamento" element={<FechamentoFornecedores />} />

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

          {/* Admin */}
          <Route path="/admin/users" element={<AdminUsers />} />

          {/* Portal Admin */}
          <Route path="/portal-admin" element={<PortalAdminDashboard />} />
          <Route path="/portal-admin/viagens" element={<PortalAdminTrips />} />
          <Route path="/portal-admin/viagens/:id" element={<PortalAdminTripDetail />} />
          <Route path="/portal-admin/clientes" element={<PortalAdminClients />} />
          <Route path="/portal-admin/documentos" element={<PortalAdminDocuments />} />
          <Route path="/portal-admin/notificacoes" element={<PortalAdminNotifications />} />
          <Route path="/portal-admin/config" element={<PortalAdminConfig />} />

          {/* Implementação */}
          <Route path="/implementacao/base-conhecimento" element={<BaseConhecimento />} />

          {/* Operação Diária */}
          <Route path="/operacao/inbox" element={<OperacaoInbox />} />
          <Route path="/operacao/flows" element={<OperacaoFlowBuilder />} />
          <Route path="/operacao/integracoes" element={<OperacaoIntegracoes />} />
          <Route path="/operacao/agentes" element={<OperacaoAgentesIA />} />
          <Route path="/operacao/pipeline" element={<OperacaoTagsPipeline />} />
          <Route path="/operacao/simulador" element={<OperacaoSimulador />} />
          <Route path="/operacao/logs" element={<OperacaoLogs />} />

          {/* Apresentação */}
          <Route path="/apresentacao" element={<ApresentacaoGeral />} />

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

        {/* Portal do Cliente - rotas separadas fora do CRM */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal" element={<PortalDashboard />} />
        <Route path="/portal/viagens" element={<PortalDashboard />} />
        <Route path="/portal/viagem/:saleId" element={<PortalTripDetail />} />
        <Route path="/portal/modelo" element={<PortalDemoTrip />} />
        <Route path="/portal/financeiro" element={<PortalFinance />} />
        <Route path="/portal/nova-cotacao" element={<PortalNewQuote />} />
        <Route path="/portal/perfil" element={<PortalProfile />} />

        {/* Proposta pública */}
        <Route path="/proposta/:slug" element={<ProposalPublicView />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PortalAuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PortalAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
