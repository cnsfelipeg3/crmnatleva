import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X, Check, Plane, CreditCard, Shield, Calendar, Heart, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string | null;
}

const typeIcons: Record<string, any> = {
  countdown_30: Calendar,
  countdown_7: Calendar,
  countdown_1: Plane,
  checkin_alert: Plane,
  arrival: Plane,
  return_reminder: Plane,
  post_trip: Heart,
  payment_7: CreditCard,
  payment_2: CreditCard,
  payment_today: AlertTriangle,
  passport_expiry: Shield,
  passport_expired: AlertTriangle,
  trip_published: Info,
};

const typeColors: Record<string, string> = {
  countdown_30: "bg-blue-100 text-blue-700",
  countdown_7: "bg-blue-100 text-blue-700",
  countdown_1: "bg-accent/10 text-accent",
  checkin_alert: "bg-green-100 text-green-700",
  arrival: "bg-purple-100 text-purple-700",
  return_reminder: "bg-amber-100 text-amber-700",
  post_trip: "bg-pink-100 text-pink-700",
  payment_7: "bg-yellow-100 text-yellow-700",
  payment_2: "bg-orange-100 text-orange-700",
  payment_today: "bg-destructive/10 text-destructive",
  passport_expiry: "bg-amber-100 text-amber-700",
  passport_expired: "bg-destructive/10 text-destructive",
  trip_published: "bg-accent/10 text-accent",
};

export default function PortalNotificationPanel({ open, onClose, clientId }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("portal_notifications")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && clientId) fetchNotifications();
  }, [open, clientId]);

  const markAsRead = async (id: string) => {
    await (supabase as any)
      .from("portal_notifications")
      .update({ read_status: "read", read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: "read" } : n));
  };

  const markAllRead = async () => {
    if (!clientId) return;
    await (supabase as any)
      .from("portal_notifications")
      .update({ read_status: "read", read_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .eq("read_status", "unread");
    setNotifications(prev => prev.map(n => ({ ...n, read_status: "read" })));
  };

  const timeAgo = (d: string) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return "Agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-16 right-4 sm:right-8 z-50 w-[340px] sm:w-[380px] max-h-[70vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
              </div>
              <div className="flex items-center gap-1">
                {notifications.some(n => n.read_status === "unread") && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 px-2 text-accent">
                    <Check className="h-3 w-3 mr-1" /> Marcar todas
                  </Button>
                )}
                <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcons[n.notification_type] || Info;
                  const colorClass = typeColors[n.notification_type] || "bg-muted text-muted-foreground";
                  const isUnread = n.read_status === "unread";

                  return (
                    <div
                      key={n.id}
                      onClick={() => isUnread && markAsRead(n.id)}
                      className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30 ${
                        isUnread ? "bg-accent/5" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                      {isUnread && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
