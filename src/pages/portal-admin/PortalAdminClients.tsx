import { useState, useEffect, useMemo } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { useNavigate } from "react-router-dom";
import { fetchAllRows } from "@/lib/fetchAll";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Users, Eye, Globe, Mail, Phone, Plane, Calendar,
  MoreHorizontal, Key, Send, ArrowRight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";

export default function PortalAdminClients() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      fetchAllRows("clients", "id, display_name, email, phone, created_at, city, state", { order: { column: "created_at", ascending: false } }),
      fetchAllRows("sales", "id, client_id, departure_date, return_date, destination_iata", { order: { column: "departure_date", ascending: false } }),
    ]).then(([c, s]) => {
      setClients(c);
      setSales(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authLoading]);

  const clientStats = useMemo(() => {
    const map: Record<string, { tripCount: number; lastTrip: string | null }> = {};
    sales.forEach(s => {
      if (!s.client_id) return;
      if (!map[s.client_id]) map[s.client_id] = { tripCount: 0, lastTrip: null };
      map[s.client_id].tripCount++;
      if (!map[s.client_id].lastTrip || (s.departure_date && s.departure_date > map[s.client_id].lastTrip!)) {
        map[s.client_id].lastTrip = s.departure_date;
      }
    });
    return map;
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [clients, search]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando clientes...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-serif text-foreground">Clientes do Portal</h1>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} clientes cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente por nome, e-mail ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {filtered.slice(0, 50).map(client => {
              const stats = clientStats[client.id];
              return (
                <Card key={client.id} className="p-4 glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/clients/${client.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{client.display_name}</p>
                      <p className="text-xs text-muted-foreground">{client.email || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{stats?.tripCount || 0} viagens</Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop */}
          <Card className="glass-card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">E-mail</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Telefone</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Viagens</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Última Viagem</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cadastro</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map(client => {
                    const stats = clientStats[client.id];
                    return (
                      <tr key={client.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{client.display_name}</p>
                          {client.city && <p className="text-xs text-muted-foreground">{client.city}{client.state ? `, ${client.state}` : ""}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{client.email || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{client.phone ? formatPhoneDisplay(client.phone) : "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{stats?.tripCount || 0}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{stats?.lastTrip ? formatDateBR(stats.lastTrip) : "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateBR(client.created_at)}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> Ver Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <Plane className="w-3.5 h-3.5 mr-2" /> Ver Viagens
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <Key className="w-3.5 h-3.5 mr-2" /> Redefinir Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <Send className="w-3.5 h-3.5 mr-2" /> Enviar Acesso ao Portal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
