import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ROLES = ["admin", "gestor", "vendedor", "operacional", "financeiro", "leitura"];

export default function PermissoesAcessos() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [e, r, l] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("hr_access_log").select("*, employees(full_name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setEmployees(e.data || []);
    setRoles(r.data || []);
    setAccessLog(l.data || []);
  };
  useEffect(() => { load(); }, []);

  const getRole = (userId: string) => {
    const r = roles.find(r => r.user_id === userId);
    return r?.role || "—";
  };

  const filtered = employees.filter(e => !search || e.full_name.toLowerCase().includes(search.toLowerCase()));

  const roleColor = (r: string) => {
    const map: Record<string, string> = { admin: "bg-red-500/10 text-red-600", gestor: "bg-purple-500/10 text-purple-600", vendedor: "bg-blue-500/10 text-blue-600", operacional: "bg-amber-500/10 text-amber-600", financeiro: "bg-emerald-500/10 text-emerald-600", leitura: "bg-gray-500/10 text-gray-600" };
    return map[r] || "";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Permissões & Acessos</h1></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROLES.map(r => (
          <Card key={r} className="border-border/50">
            <CardContent className="p-3 text-center">
              <Badge className={roleColor(r) + " mb-1 capitalize"}>{r}</Badge>
              <p className="text-lg font-bold font-mono">{roles.filter(ro => ro.role === r).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Login (user_id)</TableHead>
                <TableHead>Perfil de Acesso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell className="text-xs">{e.position}</TableCell>
                  <TableCell className="font-mono text-xs">{e.user_id ? e.user_id.slice(0, 8) + "..." : "Sem login"}</TableCell>
                  <TableCell>{e.user_id ? <Badge className={roleColor(getRole(e.user_id)) + " capitalize"}>{getRole(e.user_id)}</Badge> : <Badge variant="outline">N/A</Badge>}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Access Log */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" />Log de Acessos (últimos 50)</p>
          <div className="max-h-[300px] overflow-auto space-y-1">
            {accessLog.map(l => (
              <div key={l.id} className="flex items-center gap-3 text-xs p-2 rounded hover:bg-muted/30">
                <span className="font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <span className="font-medium">{l.employees?.full_name || "Sistema"}</span>
                <span className="text-muted-foreground">{l.action}</span>
                {l.details && <span className="text-muted-foreground truncate max-w-[200px]">{l.details}</span>}
              </div>
            ))}
            {accessLog.length === 0 && <p className="text-xs text-muted-foreground">Nenhum log registrado</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
