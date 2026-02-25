import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Users, Clock, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type UserLoc = {
  id: string;
  user_id: string;
  city: string;
  state: string | null;
  country: string | null;
  lat: number;
  lon: number;
  updated_at: string;
  profile?: { full_name: string; email: string; avatar_url: string | null };
};

export default function UserLocations() {
  const [locations, setLocations] = useState<UserLoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    setLoading(true);
    const { data: locs } = await supabase
      .from("user_locations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (locs && locs.length > 0) {
      // Fetch profiles for these users
      const userIds = locs.map((l: any) => l.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched = locs.map((l: any) => ({
        ...l,
        profile: profileMap.get(l.user_id) || undefined,
      }));
      setLocations(enriched);
    } else {
      setLocations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Group by city
  const cityGroups = locations.reduce<Record<string, UserLoc[]>>((acc, loc) => {
    const key = `${loc.city}${loc.state ? `, ${loc.state}` : ""}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(loc);
    return acc;
  }, {});

  const sortedCities = Object.entries(cityGroups).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Localizações dos Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Veja de onde seus usuários estão acessando o sistema
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLocations} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{locations.length}</p>
            <p className="text-xs text-muted-foreground">Usuários com localização</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{sortedCities.length}</p>
            <p className="text-xs text-muted-foreground">Cidades diferentes</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {sortedCities.length > 0 ? sortedCities[0][0] : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Cidade mais frequente</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : locations.length === 0 ? (
        <Card className="p-10 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum usuário compartilhou sua localização ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            A localização é solicitada opcionalmente no NatLeva Intelligence.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By city */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Por Cidade
            </h3>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {sortedCities.map(([city, users]) => (
                  <div key={city} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary/60" />
                      <span className="text-sm font-medium text-foreground">{city}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {users.length} {users.length === 1 ? "usuário" : "usuários"}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* User list */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Todos os Usuários
            </h3>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(loc.profile?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {loc.profile?.full_name || loc.profile?.email || "Usuário"}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {loc.city}{loc.state ? `, ${loc.state}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(loc.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[9px] text-muted-foreground/40 font-mono">
                        {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}
