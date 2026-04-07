import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaneTakeoff, Sparkles, Radio } from "lucide-react";
import { lazy, Suspense } from "react";
import { MinimalLoader } from "@/components/AppLoaders";

const CotacoesMonitorView = lazy(() => import("@/components/cotacoes/CotacoesMonitorView"));
const QuoteRequests = lazy(() => import("@/pages/QuoteRequests"));
const QuotationBriefings = lazy(() => import("@/pages/QuotationBriefings"));

export default function CotacoesUnified() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="w-full max-w-lg">
          <TabsTrigger value="monitor" className="flex-1 gap-1.5">
            <Radio className="w-4 h-4" /> Monitor
          </TabsTrigger>
          <TabsTrigger value="briefings" className="flex-1 gap-1.5">
            <Sparkles className="w-4 h-4" /> Briefings IA
          </TabsTrigger>
          <TabsTrigger value="portal" className="flex-1 gap-1.5">
            <PlaneTakeoff className="w-4 h-4" /> Solicitações Portal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-4">
          <Suspense fallback={<MinimalLoader inline />}>
            <CotacoesMonitorView />
          </Suspense>
        </TabsContent>

        <TabsContent value="briefings" className="mt-4">
          <Suspense fallback={<MinimalLoader inline />}>
            <QuotationBriefings />
          </Suspense>
        </TabsContent>

        <TabsContent value="portal" className="mt-4">
          <Suspense fallback={<MinimalLoader inline />}>
            <QuoteRequests />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
