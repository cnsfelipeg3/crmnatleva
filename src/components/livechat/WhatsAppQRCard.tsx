import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Loader2, RefreshCw, Wifi, WifiOff, Smartphone, Users, MessageCircle, Hash, CheckCircle2, Signal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ConnectionStatus = "disconnected" | "awaiting_scan" | "syncing" | "connected";

interface ConnectionInfo {
  phone_number?: string;
  profile_name?: string;
}

const QR_REFRESH_SECONDS = 15;
const POLL_INTERVAL_MS = 3000;
const TOTAL_TIMEOUT_MS = 180000;

async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro na chamada ao proxy");
  return data;
}

export function WhatsAppQRCard() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connInfo, setConnInfo] = useState<ConnectionInfo>({});
  const [timerProgress, setTimerProgress] = useState(100);

  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const qrTimerRef = useRef<ReturnType<typeof setInterval>>();
  const timerCountRef = useRef(QR_REFRESH_SECONDS);
  const totalStartRef = useRef<number>(0);

  useEffect(() => {
    checkExistingConnection();
    return () => clearAllTimers();
  }, []);

  function clearAllTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
  }

  async function checkExistingConnection() {
    try {
      const data = await callZapiProxy("check-status");
      if (data?.connected) {
        setStatus("connected");
        // Get phone info
        try {
          const phoneData = await callZapiProxy("phone-info");
          if (phoneData?.phone) {
            setConnInfo({ phone_number: phoneData.phone, profile_name: phoneData.name || "" });
          }
        } catch {}
      }
    } catch {
      // Not connected
    }
  }

  const fetchQRCode = useCallback(async () => {
    try {
      const data = await callZapiProxy("get-qrcode");
      const raw = data?.value || data?.qrcode || data?.base64 || "";
      console.log("=== QR CODE DEBUG ===");
      console.log("Resposta completa:", JSON.stringify(data));
      console.log("Valor extraído (100 chars):", String(raw).substring(0, 100));
      if (raw) {
        // Normalize: if already has data:image prefix, use as-is; otherwise add it
        const qrSrc = String(raw).startsWith("data:image") ? raw : `data:image/png;base64,${raw}`;
        setQrBase64(qrSrc);
        timerCountRef.current = QR_REFRESH_SECONDS;
        setTimerProgress(100);
      } else {
        setQrBase64(null);
      }
    } catch (err: any) {
      console.error("QR fetch error:", err);
    }
  }, []);

  function handleConnectionSuccess(phoneData?: any) {
    clearAllTimers();
    setStatus("connected");
    setQrBase64(null);
    if (phoneData?.phone) {
      setConnInfo({ phone_number: phoneData.phone, profile_name: phoneData.name || "" });
    }
    toast.success("WhatsApp conectado com sucesso!");

    // Configure webhook automatically (including sent-by-me events)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const webhookUrl = `${supabaseUrl}/functions/v1/zapi-webhook`;
      Promise.allSettled([
        callZapiProxy("set-webhook", { webhookUrl }),
        callZapiProxy("set-webhook-sent", { webhookUrl }),
        callZapiProxy("set-notify-sent-by-me"),
      ]).catch(() => {});
    }
  }

  function startQRTimer() {
    timerCountRef.current = QR_REFRESH_SECONDS;
    setTimerProgress(100);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    qrTimerRef.current = setInterval(() => {
      timerCountRef.current -= 1;
      setTimerProgress((timerCountRef.current / QR_REFRESH_SECONDS) * 100);
      if (timerCountRef.current <= 0) {
        fetchQRCode();
        timerCountRef.current = QR_REFRESH_SECONDS;
        setTimerProgress(100);
      }
    }, 1000);
  }

  function startStatusPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    totalStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - totalStartRef.current > TOTAL_TIMEOUT_MS) {
        clearAllTimers();
        toast.error("Timeout na conexão. Tente novamente.");
        setStatus("disconnected");
        return;
      }
      try {
        const data = await callZapiProxy("check-status");
        if (data?.connected) {
          const phoneData = await callZapiProxy("phone-info").catch(() => ({}));
          handleConnectionSuccess(phoneData);
        }
      } catch {}
    }, POLL_INTERVAL_MS);
  }

  async function handleConnect() {
    setLoading(true);
    setStatus("awaiting_scan");
    try {
      // Check if already connected
      const statusData = await callZapiProxy("check-status");
      if (statusData?.connected) {
        const phoneData = await callZapiProxy("phone-info").catch(() => ({}));
        handleConnectionSuccess(phoneData);
        setLoading(false);
        return;
      }
      await fetchQRCode();
      startQRTimer();
      startStatusPolling();
    } catch (err: any) {
      toast.error("Erro ao conectar: " + (err.message || "Tente novamente"));
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await callZapiProxy("disconnect");
      clearAllTimers();
      setStatus("disconnected");
      setQrBase64(null);
      setConnInfo({});
      toast.success("WhatsApp desconectado");
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + err.message);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleRestart() {
    setLoading(true);
    try {
      await callZapiProxy("restart");
      toast.success("Reconexão iniciada");
      setStatus("awaiting_scan");
      await fetchQRCode();
      startQRTimer();
      startStatusPolling();
    } catch (err: any) {
      toast.error("Erro ao reiniciar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    clearAllTimers();
    setStatus("disconnected");
    setQrBase64(null);
  }

  const StatusBadgeEl = () => {
    if (status === "connected") {
      return (
        <Badge variant="outline" className="text-[9px] gap-1 border-green-500/30 bg-green-500/10 text-green-500">
          <Wifi className="h-2.5 w-2.5" /> Conectado
        </Badge>
      );
    }
    if (status === "awaiting_scan") {
      return (
        <Badge variant="outline" className="text-[9px] gap-1 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Aguardando
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[9px] gap-1">
        <WifiOff className="h-2.5 w-2.5 text-muted-foreground" /> Desconectado
      </Badge>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: "#25D366" }} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(37,211,102,0.12)" }}
            >
              <Smartphone className="h-4 w-4" style={{ color: "#25D366" }} />
            </div>
            <div>
              <CardTitle className="text-sm">WhatsApp QR Code</CardTitle>
              <CardDescription className="text-[10px]">
                Conecte seu WhatsApp escaneando o QR Code
              </CardDescription>
            </div>
          </div>
          <StatusBadgeEl />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          {/* STATE: Disconnected */}
          {status === "disconnected" && (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-[10px] text-muted-foreground">
                Conecte seu WhatsApp escaneando o QR Code. Suas conversas aparecerão automaticamente no chat.
              </p>
              <Button
                size="sm"
                className="w-full text-xs font-semibold"
                style={{ backgroundColor: "#25D366", color: "#fff" }}
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                Conectar WhatsApp
              </Button>
            </motion.div>
          )}

          {/* STATE: Awaiting Scan (QR Code visible) */}
          {status === "awaiting_scan" && (
            <motion.div
              key="awaiting_scan"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <p className="text-[10px] text-center font-semibold text-muted-foreground">
                Escaneie o QR Code com seu WhatsApp
              </p>

              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-4 shadow-lg" style={{ minWidth: 180, minHeight: 180 }}>
                  {qrBase64 ? (
                    <motion.img
                      key={qrBase64.slice(-20)}
                      initial={{ opacity: 0.5, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={qrBase64}
                      alt="QR Code WhatsApp"
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#25D366" }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Progress value={timerProgress} className="h-1.5 [&>div]:bg-[#25D366]" />
                <p className="text-[9px] text-center text-muted-foreground">
                  QR atualiza em {Math.ceil((timerProgress / 100) * QR_REFRESH_SECONDS)}s
                </p>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>1. Abra o WhatsApp no celular</p>
                <p>2. Toque em Menu ou Configurações</p>
                <p>3. Toque em "Aparelhos conectados" → "Conectar aparelho"</p>
                <p>4. Aponte a câmera para o QR Code</p>
              </div>

              <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleCancel}>
                Cancelar
              </Button>
            </motion.div>
          )}

          {/* STATE: Connected */}
          {status === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {connInfo.phone_number && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Número: </span>
                  <span className="font-semibold">+{connInfo.phone_number}</span>
                </div>
              )}
              {connInfo.profile_name && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Perfil: </span>
                  <span className="font-semibold">{connInfo.profile_name}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={handleRestart}
                  disabled={loading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reiniciar
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <WifiOff className="h-3 w-3 mr-1" />
                      )}
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todas as conversas em andamento serão encerradas. Você precisará escanear o QR Code
                        novamente para reconectar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sim, desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
