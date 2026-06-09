import { lazy, Suspense } from "react";
import SmartSuspense from "@/components/SmartSuspense";
import { MinimalLoader, SessionAwareLoader } from "@/components/AppLoaders";
import { LoginSkeleton, RouteAwareSkeleton } from "@/components/skeletons/PageSkeletons";
const PerfDebugOverlay: React.ComponentType = import.meta.env.DEV
  ? (lazy(() => import("@/components/PerfDebugOverlay")) as unknown as React.ComponentType)
  : (() => null);
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useIsAffiliateOnly } from "@/hooks/useIsAffiliateOnly";
import { TabManagerProvider } from "@/contexts/TabManagerContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { RefTracker } from "@/components/vitrine/RefTracker";

// Portal do Cliente
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";

const lazyRetry = (fn: () => Promise<any>) =>
  lazy(() => fn().catch(() => {
    window.location.reload();
    return new Promise(() => {}); // never resolves, page will reload
  }));

const AppLayout = lazyRetry(() => import("@/components/AppLayout"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const Sales = lazy(() => import("@/pages/Sales"));
const SaleDetail = lazy(() => import("@/pages/SaleDetail"));
const NewSale = lazy(() => import("@/pages/NewSale"));
const Passengers = lazy(() => import("@/pages/Passengers"));
const PassengerProfile = lazy(() => import("@/pages/PassengerProfile"));
const Birthdays = lazy(() => import("@/pages/Birthdays"));
const Leads = lazy(() => import("@/pages/Leads"));
const SettingsIndex = lazy(() => import("@/pages/settings/SettingsIndex"));
const GenericSettingsList = lazy(() => import("@/pages/settings/GenericSettingsList"));
const Checkin = lazy(() => import("@/pages/Checkin"));
const Lodging = lazy(() => import("@/pages/Lodging"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const ImportData = lazy(() => import("@/pages/ImportData"));

const Viagens = lazy(() => import("@/pages/Viagens"));
const TorreDeControle = lazy(() => import("@/pages/TorreDeControle"));
const ClientIntelligence = lazy(() => import("@/pages/ClientIntelligence"));
const NatLevaIntelligence = lazy(() => import("@/pages/NatLevaIntelligence"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const UserLocations = lazy(() => import("@/pages/settings/UserLocations"));

const WhatsAppIntegration = lazy(() => import("@/pages/WhatsAppIntegration"));
const WhatsAppQRConnect = lazy(() => import("@/pages/WhatsAppQRConnect"));
const FlowBuilder = lazy(() => import("@/pages/FlowBuilder"));
const AIIntegrations = lazy(() => import("@/pages/AIIntegrations"));
const AIKnowledgeBase = lazy(() => import("@/pages/AIKnowledgeBase"));
const ImportChatGuru = lazy(() => import("@/pages/ImportChatGuru"));
const AnaliseAtendimento = lazy(() => import("@/pages/AnaliseAtendimento"));
const WhatsAppStatus = lazy(() => import("@/pages/livechat/WhatsAppStatus"));
const ApresentacaoGeral = lazy(() => import("@/pages/ApresentacaoGeral"));
const TripDetail = lazy(() => import("@/pages/TripDetail"));
const TripAlterations = lazy(() => import("@/pages/TripAlterations"));
const Itinerary = lazy(() => import("@/pages/Itinerary"));
const SupplierRegistration = lazy(() => import("@/pages/SupplierRegistration"));
const Diagnostico = lazy(() => import("@/pages/Diagnostico"));
const Inbox = lazy(() => import("@/pages/Inbox"));

// Booking RapidAPI (BETA) — módulo experimental isolado
const BookingSearchPage = lazy(() => import("@/pages/booking-rapidapi/BookingSearchPage"));
const FlightsSearchPage = lazy(() => import("@/pages/booking-rapidapi/FlightsSearchPage"));
// Google Flights BETA (DataCrawler) — módulo experimental isolado
const GoogleFlightsSearchPage = lazy(() => import("@/pages/google-flights/GoogleFlightsSearchPage"));

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
const ConversasExcluidas = lazy(() => import("@/pages/admin/ConversasExcluidas"));
const RegrasGlobaisAgentes = lazy(() => import("@/pages/admin/RegrasGlobaisAgentes"));
const Megafone = lazy(() => import("@/pages/admin/Megafone"));
const AdminVitrine = lazy(() => import("@/pages/admin/AdminVitrine"));

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
const AIStrategyKnowledge = lazy(() => import("@/pages/AIStrategyKnowledge"));
const AILearningDashboard = lazy(() => import("@/pages/AILearningDashboard"));
const CerebroNatLeva = lazy(() => import("@/pages/CerebroNatLeva"));
const AITeam = lazy(() => import("@/pages/AITeam"));
const AITeamAgentDetail = lazy(() => import("@/pages/AITeamAgentDetail"));
const AITeamLayout = lazy(() => import("@/components/ai-team/AITeamLayout"));
const AITeamEquipe = lazy(() => import("@/pages/ai-team/AITeamEquipe"));
const AITeamEvolution = lazy(() => import("@/pages/ai-team/AITeamEvolution"));
const AITeamConhecimento = lazy(() => import("@/pages/ai-team/AITeamConhecimento"));
const AITeamSkills = lazy(() => import("@/pages/ai-team/AITeamSkills"));
const AITeamWorkflow = lazy(() => import("@/pages/ai-team/AITeamWorkflow"));
const AITeamMemoria = lazy(() => import("@/pages/ai-team/AITeamMemoria"));
const AITeamAcademia = lazy(() => import("@/pages/ai-team/AITeamAcademia"));
const AITeamSimulador = lazy(() => import("@/pages/ai-team/AITeamSimulador"));
const AITeamExtrato = lazy(() => import("@/pages/ai-team/AITeamExtrato"));
const AITeamSaude = lazy(() => import("@/pages/ai-team/AITeamSaude"));
const AITeamConfig = lazy(() => import("@/pages/ai-team/AITeamConfig"));
const AITeamChangelog = lazy(() => import("@/pages/ai-team/AITeamChangelog"));
const AITeamPerformance = lazy(() => import("@/pages/AITeamPerformance"));

// Portal do Cliente
const PortalLogin = lazy(() => import("@/pages/portal/PortalLogin"));
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalTripDetail = lazy(() => import("@/pages/portal/PortalTripDetail"));
const PortalDemoTrip = lazy(() => import("@/pages/portal/PortalDemoTrip"));
const PortalMyTrips = lazy(() => import("@/pages/portal/PortalMyTrips"));
const PortalFinance = lazy(() => import("@/pages/portal/PortalFinance"));
const PortalNewQuote = lazy(() => import("@/pages/portal/PortalNewQuote"));
const PortalProfile = lazy(() => import("@/pages/portal/PortalProfile"));
const PortalConcierge = lazy(() => import("@/pages/portal/PortalConcierge"));

// CRM

const Proposals = lazy(() => import("@/pages/Proposals"));
const ProposalsDashboard = lazy(() => import("@/pages/ProposalsDashboard"));
const ProposalEditor = lazy(() => import("@/pages/ProposalEditor"));
const ProposalTemplates = lazy(() => import("@/pages/ProposalTemplates"));
const ProposalTemplateEditor = lazy(() => import("@/pages/ProposalTemplateEditor"));
const ProposalPublicView = lazy(() => import("@/pages/ProposalPublicView"));
const PassengerSelfSignup = lazy(() => import("@/pages/PassengerSelfSignup"));
const MediaLibrary = lazy(() => import("@/pages/MediaLibrary"));

// Prateleira NatLeva (ex-Produtos)
const Produtos = lazy(() => import("@/pages/produtos/Produtos"));
const ProdutoDetalhe = lazy(() => import("@/pages/produtos/ProdutoDetalhe"));
const ProdutoEditor = lazy(() => import("@/pages/produtos/ProdutoEditor"));
const PrateleiraVitrine = lazy(() => import("@/pages/prateleira/PrateleiraVitrine"));
const PrateleiraVendaPublica = lazy(() => import("@/pages/prateleira/PrateleiraVendaPublica"));
const PrateleiraRetorno = lazy(() => import("@/pages/prateleira/PrateleiraRetorno"));
const CheckoutLayout = lazy(() => import("@/components/checkout/CheckoutLayout"));
const CheckoutResumo = lazy(() => import("@/pages/checkout/CheckoutResumo"));
const CheckoutContato = lazy(() => import("@/pages/checkout/CheckoutContato"));
const CheckoutPassageiros = lazy(() => import("@/pages/checkout/CheckoutPassageiros"));
const CheckoutTermos = lazy(() => import("@/pages/checkout/CheckoutTermos"));
const CheckoutPagamento = lazy(() => import("@/pages/checkout/CheckoutPagamento"));

// Vitrine de Afiliados (área logada)
const VitrineLogin = lazy(() => import("@/pages/vitrine/VitrineLogin"));
const VitrineCadastro = lazy(() => import("@/pages/vitrine/VitrineCadastro"));
const AffiliateGuard = lazy(() => import("@/components/vitrine/AffiliateGuard"));
const AffiliateLayout = lazy(() => import("@/components/vitrine/AffiliateLayout"));
const VitrineHome = lazy(() => import("@/pages/vitrine/VitrineHome"));
const VitrineComissoes = lazy(() => import("@/pages/vitrine/VitrineComissoes"));
const VitrineIndicacoes = lazy(() => import("@/pages/vitrine/VitrineIndicacoes"));
const VitrineMetas = lazy(() => import("@/pages/vitrine/VitrineMetas"));
const VitrinePremiacoes = lazy(() => import("@/pages/vitrine/VitrinePremiacoes"));
const VitrineMateriais = lazy(() => import("@/pages/vitrine/VitrineMateriais"));
const VitrinePerfil = lazy(() => import("@/pages/vitrine/VitrinePerfil"));
const VitrineLeads = lazy(() => import("@/pages/vitrine/VitrineLeads"));
const AdminVitrineLeads = lazy(() => import("@/pages/admin/AdminVitrineLeads"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

// Operação Diária
const OperacaoInbox = lazy(() => import("@/pages/operacao/OperacaoInbox"));
const OperacaoAtalhos = lazy(() => import("@/pages/operacao/OperacaoAtalhos"));
const OperacaoAgendadas = lazy(() => import("@/pages/operacao/OperacaoAgendadas"));
const OperacaoIntegracoes = lazy(() => import("@/pages/operacao/OperacaoIntegracoes"));

const OperacaoTagsPipeline = lazy(() => import("@/pages/operacao/OperacaoTagsPipeline"));
// Tela "Logs & Auditoria" ocultada em 06/05/2026 (sem dados gravados). Para reativar, descomentar abaixo e a rota correspondente.
// const OperacaoLogs = lazy(() => import("@/pages/operacao/OperacaoLogs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Catálogos e dashboards raramente mudam dentro da mesma sessão de uso.
      // 10min de staleTime + 30min de gcTime = navegação muito mais fluida.
      staleTime: 10 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      refetchOnMount: false,
    },
  },
});

function ScreenLoader() {
   return <SessionAwareLoader />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { loading: affLoading, isAffiliateOnly } = useIsAffiliateOnly();
  const location = useLocation();
  // Skeleton consistente com a rota destino · evita flash branco / spinner sem contexto
  if (isLoading || (isAuthenticated && affLoading)) return <RouteAwareSkeleton pathname={location.pathname} />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  // SEGURANÇA: afiliados puros não acessam nenhuma rota interna · só /vitrine
  if (isAffiliateOnly) return <Navigate to="/vitrine" replace />;
  return <>{children}</>;
}

function LoginRedirect() {
  const { isLoading } = useAuth();
  const { loading: affLoading, isAffiliateOnly } = useIsAffiliateOnly();
  if (isLoading || affLoading) return <LoginSkeleton />;
  return <Navigate to={isAffiliateOnly ? "/vitrine" : "/dashboard"} replace />;
}

// Admin (e gestor) veem o dashboard BI completo. Demais colaboradores veem
// um dashboard simples com atalhos relevantes — evita a tela "Acesso restrito".
function DashboardSwitch() {
  const { role } = useAuth();
  const isFullDashboard = role === "admin" || role === "gestor";
  return isFullDashboard ? <Dashboard /> : <EmployeeDashboard />;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const isPublicRoute =
    location.pathname.startsWith("/proposta/") ||
    location.pathname.startsWith("/portal/") ||
    location.pathname.startsWith("/cadastro-passageiro/") ||
    location.pathname === "/cadastro-fornecedor" ||
    location.pathname === "/p" ||
    location.pathname.startsWith("/p/") ||
    location.pathname.startsWith("/loja") ||
    location.pathname.startsWith("/checkout/") ||
    location.pathname === "/unsubscribe";

  return (
    <SmartSuspense>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <PerfDebugOverlay />
        </Suspense>
      )}
      <ErrorBoundary>
      <RefTracker />
      <Routes>
        <Route
          path="/login"
          element={isLoading && !isPublicRoute ? <LoginSkeleton /> : isAuthenticated ? <LoginRedirect /> : <Login />}
        />
        {/* Raiz: vai pro dashboard (ou /vitrine se for afiliado) se logado, senão pro login */}
        <Route path="/" element={isAuthenticated ? <LoginRedirect /> : <Navigate to="/login" replace />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardSwitch />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/new" element={<NewSale />} />
          <Route path="/sales/:id/edit" element={<NewSale />} />
          <Route path="/sales/:id" element={<SaleDetail />} />
          <Route path="/itinerario" element={<Itinerary />} />
          <Route path="/viagens" element={<TorreDeControle />} />
          <Route path="/viagens/monitor" element={<Viagens />} />
          <Route path="/viagens/:id" element={<TripDetail />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/hospedagem" element={<Lodging />} />
          <Route path="/alteracoes" element={<TripAlterations />} />
          <Route path="/produtos" element={<Navigate to="/prateleira" replace />} />
          <Route path="/produtos/novo" element={<Navigate to="/prateleira/novo" replace />} />
          <Route path="/produtos/:slug" element={<ProdutoDetalhe />} />
          <Route path="/produtos/:slug/editar" element={<ProdutoEditor />} />
          <Route path="/prateleira" element={<Produtos />} />
          <Route path="/prateleira/novo" element={<ProdutoEditor />} />
          <Route path="/prateleira/:slug" element={<ProdutoDetalhe />} />
          <Route path="/prateleira/:slug/editar" element={<ProdutoEditor />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/passengers" element={<Passengers />} />
          <Route path="/passengers/:id" element={<PassengerProfile />} />
          <Route path="/inteligencia-clientes" element={<ClientIntelligence />} />
          <Route path="/natleva-intelligence" element={<NatLevaIntelligence />} />
          <Route path="/birthdays" element={<Birthdays />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/import" element={<ImportData />} />
          
          
          <Route path="/propostas" element={<Proposals />} />
          <Route path="/propostas/dashboard" element={<ProposalsDashboard />} />
          <Route path="/propostas/modelos" element={<ProposalTemplates />} />
          <Route path="/propostas/modelos/novo" element={<ProposalTemplateEditor />} />
          <Route path="/propostas/modelos/:id" element={<ProposalTemplateEditor />} />
          <Route path="/propostas/nova" element={<ProposalEditor />} />
          <Route path="/propostas/:id" element={<ProposalEditor />} />
          
          <Route path="/livechat/integration" element={<WhatsAppIntegration />} />
          <Route path="/livechat/whatsapp-qr" element={<WhatsAppQRConnect />} />
          <Route path="/livechat/flows" element={<Navigate to="/ai-team/workflow" replace />} />
          <Route path="/livechat/integrations" element={<AIIntegrations />} />
          <Route path="/livechat/knowledge-base" element={<AIKnowledgeBase />} />
          <Route path="/livechat/import-chatguru" element={<ImportChatGuru />} />
          <Route path="/livechat/analise" element={<AnaliseAtendimento />} />
          <Route path="/livechat/status" element={<WhatsAppStatus />} />

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
          <Route path="/admin/conversas-excluidas" element={<ConversasExcluidas />} />
          <Route path="/admin/regras-globais" element={<RegrasGlobaisAgentes />} />
          <Route path="/admin/megafone" element={<Megafone />} />
          <Route path="/admin/vitrine" element={<AdminVitrine />} />
          <Route path="/admin/vitrine/leads" element={<AdminVitrineLeads />} />

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
          <Route path="/implementacao/estrategia-ia" element={<AIStrategyKnowledge />} />
          <Route path="/implementacao/aprendizados-ia" element={<AILearningDashboard />} />
          <Route path="/implementacao/cerebro-natleva" element={<CerebroNatLeva />} />

          {/* AI Team */}
          <Route path="/ai-team" element={<AITeamLayout />}>
            <Route index element={<AITeam />} />
            <Route path="equipe" element={<AITeamEquipe />} />
            <Route path="evolution" element={<AITeamEvolution />} />
            <Route path="conhecimento" element={<AITeamConhecimento />} />
            <Route path="skills" element={<AITeamSkills />} />
            <Route path="workflow" element={<AITeamWorkflow />} />
            <Route path="memoria" element={<AITeamMemoria />} />
            <Route path="academia" element={<AITeamAcademia />} />
            <Route path="simulador" element={<AITeamSimulador />} />
            <Route path="laboratorio" element={<Navigate to="/ai-team/simulador" replace />} />
            <Route path="extrato" element={<AITeamExtrato />} />
            <Route path="saude" element={<AITeamSaude />} />
            <Route path="config" element={<AITeamConfig />} />
            <Route path="changelog" element={<AITeamChangelog />} />
            <Route path="agent/:agentId" element={<AITeamAgentDetail />} />
            <Route path="performance" element={<AITeamPerformance />} />
          </Route>

          {/* Operação Diária */}
          <Route path="/operacao/inbox" element={<OperacaoInbox />} />
          <Route path="/operacao/atalhos" element={<OperacaoAtalhos />} />
          <Route path="/operacao/agendadas" element={<OperacaoAgendadas />} />
          <Route path="/operacao/flows" element={<Navigate to="/ai-team/workflow" replace />} />
          <Route path="/operacao/integracoes" element={<OperacaoIntegracoes />} />
          
          <Route path="/operacao/pipeline" element={<OperacaoTagsPipeline />} />
          <Route path="/operacao/simulador" element={<Navigate to="/ai-team/simulador" replace />} />
          {/* Rota /operacao/logs ocultada em 06/05/2026 (tela sem dados). Para reativar, descomentar import em src/App.tsx e item de menu em AppSidebar.tsx. */}
          {/* <Route path="/operacao/logs" element={<OperacaoLogs />} /> */}

          {/* Mídias */}
          <Route path="/midias" element={<MediaLibrary />} />

          {/* Booking RapidAPI (BETA) — módulo experimental isolado */}
          <Route path="/booking-search" element={<BookingSearchPage />} />
          <Route path="/flights-search" element={<FlightsSearchPage />} />
          <Route path="/google-flights-search" element={<GoogleFlightsSearchPage />} />

          {/* Apresentação */}
          <Route path="/apresentacao" element={<ApresentacaoGeral />} />

          <Route path="/settings" element={<SettingsIndex />} />
          <Route path="/settings/sellers" element={<GenericSettingsList title="Vendedores" defaultItems={["Admin NatLeva"]} />} />
          <Route path="/settings/airlines" element={<GenericSettingsList title="Companhias Aéreas" defaultItems={["LATAM", "GOL", "Azul", "TAP", "Emirates", "Qatar Airways", "Turkish Airlines"]} />} />
          <Route path="/settings/airports" element={<GenericSettingsList title="Aeroportos" defaultItems={["GRU", "CGH", "GIG", "SDU", "BSB", "CNF", "SSA", "REC", "FOR", "POA"]} />} />
          <Route path="/settings/miles-programs" element={<GenericSettingsList title="Programas de Milhas" defaultItems={["Smiles", "LATAM Pass", "TudoAzul", "Livelo", "Esfera"]} />} />
          <Route path="/settings/payment-methods" element={<GenericSettingsList title="Meios de Pagamento" defaultItems={["PIX", "Cartão de crédito", "Transferência", "Boleto"]} />} />
          <Route path="/settings/tags" element={<GenericSettingsList title="Tags" defaultItems={["VIP", "Corporativo", "Lua de Mel", "Família", "Grupo"]} />} />
          <Route path="/settings/products" element={<GenericSettingsList title="Produtos" defaultItems={[]} />} />
          <Route path="/settings/permissions" element={<GenericSettingsList title="Permissões" defaultItems={["admin", "gestor", "vendedor", "operacional", "financeiro", "leitura"]} />} />
          <Route path="/settings/calc-rules" element={<GenericSettingsList title="Regras de Cálculo" defaultItems={["Milheiro padrão: R$ 20,00", "Taxa fixa emissão: R$ 50,00", "Markup padrão: 15%"]} />} />
          <Route path="/settings/user-locations" element={<UserLocations />} />
        </Route>

        {/* Portal do Cliente - rotas separadas fora do CRM */}
        <Route path="/portal/login" element={<Suspense fallback={<MinimalLoader />}><PortalLogin /></Suspense>} />
        <Route path="/portal" element={<Suspense fallback={<MinimalLoader />}><PortalDashboard /></Suspense>} />
        <Route path="/portal/viagens" element={<Suspense fallback={<MinimalLoader />}><PortalMyTrips /></Suspense>} />
        <Route path="/portal/viagem/:saleId" element={<Suspense fallback={<MinimalLoader />}><PortalTripDetail /></Suspense>} />
        <Route path="/portal/modelo" element={<Suspense fallback={<MinimalLoader />}><PortalDemoTrip /></Suspense>} />
        <Route path="/portal/financeiro" element={<Suspense fallback={<MinimalLoader />}><PortalFinance /></Suspense>} />
        <Route path="/portal/nova-cotacao" element={<Suspense fallback={<MinimalLoader />}><PortalNewQuote /></Suspense>} />
        <Route path="/portal/perfil" element={<Suspense fallback={<MinimalLoader />}><PortalProfile /></Suspense>} />
        <Route path="/portal/concierge" element={<Suspense fallback={<MinimalLoader />}><PortalConcierge /></Suspense>} />

        {/* Cadastro público de fornecedor */}
        <Route path="/cadastro-fornecedor" element={<Suspense fallback={<MinimalLoader />}><SupplierRegistration /></Suspense>} />

        {/* Auto-cadastro público de passageiro */}
        <Route path="/cadastro-passageiro/:slug" element={<Suspense fallback={<MinimalLoader />}><PassengerSelfSignup /></Suspense>} />

        {/* Proposta pública */}
        <Route path="/proposta/:slug" element={<Suspense fallback={<MinimalLoader />}><ProposalPublicView /></Suspense>} />

        {/* Loja pública NatLeva · qualquer pessoa pode navegar e comprar via WhatsApp da Nath */}
        <Route path="/loja" element={<Suspense fallback={<MinimalLoader />}><PrateleiraVitrine /></Suspense>} />
        <Route path="/loja/:slug" element={<Suspense fallback={<MinimalLoader />}><PrateleiraVendaPublica /></Suspense>} />
        <Route path="/loja/:slug/retorno" element={<Suspense fallback={<MinimalLoader />}><PrateleiraRetorno /></Suspense>} />

        {/* Funil de checkout em etapas (convidado) */}
        <Route path="/checkout/:orderId" element={<Suspense fallback={<MinimalLoader />}><CheckoutLayout /></Suspense>}>
          <Route index element={<Navigate to="resumo" replace />} />
          <Route path="resumo" element={<Suspense fallback={<MinimalLoader />}><CheckoutResumo /></Suspense>} />
          <Route path="contato" element={<Suspense fallback={<MinimalLoader />}><CheckoutContato /></Suspense>} />
          <Route path="passageiros" element={<Suspense fallback={<MinimalLoader />}><CheckoutPassageiros /></Suspense>} />
          <Route path="termos" element={<Suspense fallback={<MinimalLoader />}><CheckoutTermos /></Suspense>} />
          <Route path="pagamento" element={<Suspense fallback={<MinimalLoader />}><CheckoutPagamento /></Suspense>} />
        </Route>

        {/* Aliases legados · mantidos pra não quebrar links já compartilhados */}
        <Route path="/p" element={<Suspense fallback={<MinimalLoader />}><PrateleiraVitrine /></Suspense>} />
        <Route path="/p/:slug" element={<Suspense fallback={<MinimalLoader />}><PrateleiraVendaPublica /></Suspense>} />

        {/* Painel do Afiliado (área logada) · ecossistema completo do programa de bônus NatLeva */}
        <Route path="/vitrine/login" element={<Suspense fallback={<MinimalLoader />}><VitrineLogin /></Suspense>} />
        <Route path="/vitrine/cadastro" element={<Suspense fallback={<MinimalLoader />}><VitrineCadastro /></Suspense>} />
        <Route path="/vitrine" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineHome /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/pacotes" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><Produtos lockedMode="afiliado" /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/indicacoes" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineIndicacoes /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/leads" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineLeads /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/comissoes" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineComissoes /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/metas" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineMetas /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/premiacoes" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrinePremiacoes /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/materiais" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrineMateriais /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/perfil" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><AffiliateLayout><VitrinePerfil /></AffiliateLayout></AffiliateGuard></Suspense>} />
        <Route path="/vitrine/pacotes/:slug" element={<Suspense fallback={<MinimalLoader />}><AffiliateGuard><PrateleiraVendaPublica /></AffiliateGuard></Suspense>} />

        {/* Página pública de cancelamento de inscrição (e-mails) */}
        <Route path="/unsubscribe" element={<Suspense fallback={<MinimalLoader />}><Unsubscribe /></Suspense>} />



        {/* Diagnóstico de performance — rota leve fora do layout pesado */}
        <Route path="/diagnostico" element={<Suspense fallback={<MinimalLoader />}><Diagnostico /></Suspense>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </SmartSuspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <AuthProvider>
        <PortalAuthProvider>
          <BrowserRouter>
            <TabManagerProvider>
              <AppRoutes />
            </TabManagerProvider>
          </BrowserRouter>
        </PortalAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
