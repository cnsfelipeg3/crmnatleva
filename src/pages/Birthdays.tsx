import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Gift, MessageCircle, Cake, PartyPopper, Download, Filter } from "lucide-react";

interface BirthdayPassenger {
  id: string;
  full_name: string;
  birth_date: string;
  phone: string | null;
  cpf: string | null;
}

function getDaysUntilBirthday(birthDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = birthDate.split("-").map(Number);
  const thisYear = today.getFullYear();

  let next = new Date(thisYear, m - 1, d);
  next.setHours(0, 0, 0, 0);

  if (next < today) {
    next = new Date(thisYear + 1, m - 1, d);
    next.setHours(0, 0, 0, 0);
  }

  const diff = next.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getAge(birthDate: string): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function buildWhatsAppUrl(phone: string, name: string): string {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const firstName = name.split(" ")[0];
  const message = encodeURIComponent(
    `🎂 Feliz Aniversário, ${firstName}! 🎉\n\nA equipe NatLeva deseja a você um dia muito especial, cheio de alegria e realizações! ✈️🌍\n\nQue este novo ano traga viagens incríveis! 💚`
  );
  return `https://wa.me/${number}?text=${message}`;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Birthdays() {
  const [passengers, setPassengers] = useState<BirthdayPassenger[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("all");
  const [proximityFilter, setProximityFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("passengers")
        .select("id, full_name, birth_date, phone, cpf")
        .not("birth_date", "is", null);
      setPassengers((data || []) as BirthdayPassenger[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const sorted = useMemo(() => {
    let list = passengers.filter((p) => p.birth_date);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.full_name.toLowerCase().includes(q));
    }
    if (monthFilter !== "all") {
      const m = parseInt(monthFilter);
      list = list.filter(p => parseInt(p.birth_date.split("-")[1]) === m);
    }
    if (proximityFilter === "today") list = list.filter(p => getDaysUntilBirthday(p.birth_date) === 0);
    else if (proximityFilter === "week") list = list.filter(p => getDaysUntilBirthday(p.birth_date) <= 7);
    else if (proximityFilter === "month") list = list.filter(p => getDaysUntilBirthday(p.birth_date) <= 30);

    return list.sort((a, b) => getDaysUntilBirthday(a.birth_date) - getDaysUntilBirthday(b.birth_date));
  }, [passengers, search, monthFilter, proximityFilter]);

  const todayCount = passengers.filter(p => p.birth_date && getDaysUntilBirthday(p.birth_date) === 0).length;
  const weekCount = passengers.filter(p => p.birth_date && getDaysUntilBirthday(p.birth_date) <= 7).length;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
            <Cake className="w-6 h-6 text-primary" />
            Aniversariantes
          </h1>
          <p className="text-sm text-muted-foreground">
            {sorted.length} passageiros • {todayCount > 0 && <span className="text-primary font-semibold">{todayCount} hoje!</span>} {weekCount > 0 && <span className="text-accent-foreground">{weekCount} esta semana</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos meses</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={proximityFilter} onValueChange={setProximityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Proximidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Próx. 7 dias</SelectItem>
            <SelectItem value="month">Próx. 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Gift className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">
            {search ? "Nenhum aniversariante encontrado." : "Nenhum passageiro com data de nascimento cadastrada."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => {
            const days = getDaysUntilBirthday(p.birth_date);
            const age = getAge(p.birth_date);
            const isToday = days === 0;
            const isThisWeek = days > 0 && days <= 7;

            return (
              <Card
                key={p.id}
                className={`p-4 glass-card transition-shadow hover:shadow-md ${
                  isToday ? "ring-2 ring-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.15)]" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      isToday
                        ? "bg-primary/20 text-primary"
                        : isThisWeek
                        ? "bg-accent/60 text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isToday ? (
                      <PartyPopper className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-bold font-mono">{formatDateBR(p.birth_date)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {formatDateBR(p.birth_date)} · {age + (isToday ? 1 : days <= 0 ? 1 : 0)} anos
                        {isToday ? "" : days === 1 ? " (amanhã)" : ` (em ${days} dias)`}
                      </span>
                      {isToday && (
                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                          🎂 Hoje!
                        </Badge>
                      )}
                      {isThisWeek && !isToday && (
                        <Badge variant="secondary" className="text-[10px]">
                          Esta semana
                        </Badge>
                      )}
                    </div>
                  </div>

                  {p.phone ? (
                    <Button
                      size="sm"
                      variant={isToday ? "default" : "outline"}
                      className="shrink-0 gap-1.5"
                      onClick={() => window.open(buildWhatsAppUrl(p.phone!, p.full_name), "_blank")}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Parabéns</span>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                      Sem telefone
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
