import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Loader2, RefreshCw, Info, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface WhatsAppConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  business_name: string;
  business_id: string;
  quality_rating: string;
  status: string;
  access_token?: string;
}

const FB_APP_ID = "4313449025566375";

function initFBSDK() {
  if (window.FB) return;
  window.fbAsyncInit = function () {
    window.FB.init({
      appId: FB_APP_ID,
      cookie: true,
      xfbml: true,
      version: "v21.0",
    });
  };
  if (!document.getElementById("facebook-jssdk")) {
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }
}

export function WhatsAppCloudAPICard() {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    initFBSDK();
    loadConnection();
  }, []);

  async function loadConnection() {
    const { data } = await supabase
      .from("whatsapp_connections" as any)
      .select("*")
      .eq("status", "active")
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setConnection(data as any);
    }
  }

  const handleConnect = useCallback(() => {
    setLoading(true);
    initFBSDK();

    const tryLogin = () => {
      if (!window.FB) {
        setTimeout(tryLogin, 500);
        return;
      }
      window.FB.login(
        (response: any) => {
          if (response.authResponse?.code) {
            exchangeCode(response.authResponse.code);
          } else {
            setLoading(false);
            toast.error("Conexão cancelada ou popup bloqueado");
          }
        },
        {
          response_type: "code",
          override_default_response_type: true,
          extras: {
            feature: "whatsapp_embedded_signup",
            setup: {},
          },
        }
      );
    };
    tryLogin();
  }, []);

  async function exchangeCode(code: string) {
    try {
      const { data, error } = await supabase.functions.invoke("connect-whatsapp", {
        body: { code },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setConnection(data.connection);
      toast.success("WhatsApp Cloud API conectado com sucesso!");
    } catch (err: any) {
      toast.error("Erro na conexão: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!connection) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-whatsapp-numbers", {
        body: { connection_id: connection.id },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        setConnection(prev => prev ? {
          ...prev,
          phone_number: data.phone_number || prev.phone_number,
          display_name: data.display_name || prev.display_name,
          quality_rating: data.quality_rating || prev.quality_rating,
        } : null);
        toast.success("Números sincronizados!");
      } else {
        toast.error("Erro: " + (data?.error || "Falha na sincronização"));
      }
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!connection) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("disconnect-whatsapp", {
        body: { connection_id: connection.id },
      });
      if (error) throw new Error(error.message);
      setConnection(null);
      toast.success("WhatsApp Cloud API desconectado");
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + err.message);
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = connection && connection.status === "active";

  return (
    <Card className="col-span-full overflow-hidden border-border/50">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-bold">WhatsApp API Oficial</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">Conecte sua conta do Meta Business para enviar e receber mensagens via API oficial do WhatsApp.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {isConnected && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs gap-1.5"
                  disabled={disconnecting}
                >
                  {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Desconectar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar WhatsApp Cloud API?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A integração com a API Oficial será desativada. Mensagens não serão mais recebidas via webhook.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Disconnected state */}
        {!isConnected && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Precisamos de permissões para gerenciar sua conta do WhatsApp Business e automatizar suas respostas.
              <br />
              Você pode criar um bot de WhatsApp em contas conectadas.
            </p>
            <Button
              size="default"
              onClick={handleConnect}
              disabled={loading}
              className="font-semibold"
              style={{ backgroundColor: "#4F6BED", color: "#fff" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conectar WhatsApp Cloud
            </Button>
          </div>
        )}

        {/* Connected state */}
        {isConnected && (
          <div className="space-y-5">
            {/* Business info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Nome da Empresa</p>
                <p className="text-sm font-semibold">{connection.business_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">ID da Empresa</p>
                <p className="text-sm font-semibold">{connection.business_id || "—"}</p>
              </div>
            </div>

            {/* Sync button */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              style={{ backgroundColor: "rgba(37,211,102,0.1)", color: "#25D366", borderColor: "rgba(37,211,102,0.3)" }}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sincronizar Números
            </Button>

            {/* Numbers table */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider h-9">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-9">Número de Telefone</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-9">Nome WABA</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-9">WABA ID</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-9">Qualidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Badge
                        className="text-[10px] font-semibold"
                        style={{ backgroundColor: "#22c55e", color: "#fff" }}
                      >
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-semibold">{connection.phone_number || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{connection.display_name || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{connection.display_name || connection.business_name || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-mono text-muted-foreground">{connection.waba_id || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {connection.quality_rating || "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
