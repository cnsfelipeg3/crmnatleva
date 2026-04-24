import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Briefcase, DollarSign, Clock, Shield, Key, FileText, MessageSquare, Upload, Trash2, ChevronDown, ChevronRight, Check, X, Eye, Plus, Pencil, Download, CheckCircle2, Search } from "lucide-react";
import { SYSTEM_MENUS, MENU_GROUPS, ROLE_TEMPLATES, type MenuAction, type RoleTemplate } from "@/lib/systemMenus";
import CommissionRulesEditor from "@/components/rh/CommissionRulesEditor";

const POSITIONS = ["SDR", "Vendas", "Consultor", "Operação", "Financeiro", "Admin", "Marketing", "Atendimento"];
const DEPARTMENTS = ["Comercial", "Operacional", "Financeiro", "Administrativo", "Marketing", "Atendimento"];
const CONTRACT_TYPES = ["CLT", "PJ", "Freelancer", "Estágio"];
const STATUSES = ["ativo", "inativo", "afastado"];
const REMUNERATION_TYPES = ["fixo", "fixo_comissao", "somente_comissao"];
const WORK_DAYS_OPTIONS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

// === PERMISSÕES GRANULARES — BASEADO EM SYSTEM_MENUS REAIS ===
const ACTION_META: Record<MenuAction, { label: string; icon: any; desc: string }> = {
  view:   { label: "Visualizar", icon: Eye,    desc: "Pode ver o menu e seus dados" },
  create: { label: "Criar",      icon: Plus,   desc: "Pode adicionar novos registros" },
  edit:   { label: "Editar",     icon: Pencil, desc: "Pode alterar registros existentes" },
  delete: { label: "Excluir",    icon: Trash2, desc: "Pode remover registros" },
};

// Mapa de permissões por menu_key → ações habilitadas
type MenuPerm = Partial<Record<MenuAction, boolean>>;
type PermissionsMap = Record<string, MenuPerm>; // menu_key → ações

const emptyPerm = (): MenuPerm => ({});

// Aplica um ROLE_TEMPLATE a todos os SYSTEM_MENUS
const buildFromTemplate = (template: RoleTemplate): PermissionsMap => {
  const result: PermissionsMap = {};
  const fn = ROLE_TEMPLATES[template];
  for (const menu of SYSTEM_MENUS) {
    const perms = fn(menu.key);
    const filtered: MenuPerm = {};
    for (const action of menu.actions) {
      if (perms[action]) filtered[action] = true;
    }
    result[menu.key] = filtered;
  }
  return result;
};

const PERMISSION_PRESETS: Record<RoleTemplate, { label: string; description: string }> = {
  admin:       { label: "Administrador",   description: "Acesso total a tudo do sistema" },
  gestor:      { label: "Gestor / Gerente", description: "Vê e edita tudo, sem excluir financeiro/RH crítico" },
  vendedor:    { label: "Vendedor",         description: "CRM, vendas, cotações, propostas e clientes" },
  operacional: { label: "Operacional",      description: "Foca em viagens, check-in e atendimento" },
  financeiro:  { label: "Financeiro",       description: "Acesso completo ao financeiro" },
  leitura:     { label: "Somente Leitura",  description: "Pode ver tudo, não altera nada" },
};


interface EmployeeFormTabsProps {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  employees: any[];
}

export default function EmployeeFormTabs({ form, setForm, onSave, employees }: EmployeeFormTabsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [createUser, setCreateUser] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Principal");
  const [activePreset, setActivePreset] = useState<RoleTemplate | null>(null);
  const [permsLoaded, setPermsLoaded] = useState(false);

  // Permissões em formato { menu_key: { view, create, edit, delete } } — armazenadas em form.permissions
  const permissions: PermissionsMap = (form.permissions && typeof form.permissions === "object" && !Array.isArray(form.permissions))
    ? (form.permissions as PermissionsMap)
    : {};

  useEffect(() => {
    if (form.id) {
      loadDocuments();
      loadPermissionsFromDb();
    } else {
      setPermsLoaded(true);
    }
  }, [form.id]);

  const loadDocuments = async () => {
    if (!form.id) return;
    const { data } = await supabase.from("employee_documents").select("*").eq("employee_id", form.id).order("created_at", { ascending: false });
    setDocuments(data || []);
  };

  const loadPermissionsFromDb = async () => {
    if (!form.id) return;
    const { data } = await (supabase as any)
      .from("employee_permissions")
      .select("menu_key, can_view, can_create, can_edit, can_delete")
      .eq("employee_id", form.id);
    if (data && data.length > 0) {
      const map: PermissionsMap = {};
      for (const row of data as any[]) {
        const p: MenuPerm = {};
        if (row.can_view) p.view = true;
        if (row.can_create) p.create = true;
        if (row.can_edit) p.edit = true;
        if (row.can_delete) p.delete = true;
        map[row.menu_key] = p;
      }
      // Só sobrescreve form.permissions se o form ainda não tem nada gravado
      if (!form.permissions || Object.keys(form.permissions).length === 0) {
        setForm({ ...form, permissions: map });
      }
    }
    setPermsLoaded(true);
  };

  const f = (key: string) => form[key] || "";
  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  const toggleWorkDay = (day: string) => {
    const days: string[] = form.work_days || ["seg", "ter", "qua", "qui", "sex"];
    set("work_days", days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  const setMenuPerm = (menuKey: string, next: MenuPerm) => {
    const cleaned = { ...next };
    // limpa chaves false pra manter o objeto enxuto
    (Object.keys(cleaned) as MenuAction[]).forEach(k => { if (!cleaned[k]) delete cleaned[k]; });
    const nextAll = { ...permissions, [menuKey]: cleaned };
    if (Object.keys(cleaned).length === 0) delete nextAll[menuKey];
    set("permissions", nextAll);
    setActivePreset(null);
  };

  const toggleAction = (menuKey: string, action: MenuAction) => {
    const current = permissions[menuKey] || emptyPerm();
    const has = !!current[action];
    const next: MenuPerm = { ...current, [action]: !has };
    // Regra: se ativar qualquer ação, garante "view" também
    if (!has && action !== "view") next.view = true;
    // Regra: se remover "view", remove tudo
    if (has && action === "view") {
      next.create = false; next.edit = false; next.delete = false;
    }
    setMenuPerm(menuKey, next);
  };

  const setGroupActions = (group: string, mode: "all" | "view" | "none") => {
    const next = { ...permissions };
    for (const menu of SYSTEM_MENUS.filter(m => m.group === group)) {
      if (mode === "none") { delete next[menu.key]; continue; }
      const p: MenuPerm = {};
      if (mode === "all") {
        for (const a of menu.actions) p[a] = true;
      } else if (mode === "view") {
        if (menu.actions.includes("view")) p.view = true;
      }
      if (Object.keys(p).length > 0) next[menu.key] = p; else delete next[menu.key];
    }
    set("permissions", next);
    setActivePreset(null);
  };

  const applyPreset = (presetKey: RoleTemplate) => {
    const built = buildFromTemplate(presetKey);
    set("permissions", built);
    setActivePreset(presetKey);
    toast.success(`Perfil "${PERMISSION_PRESETS[presetKey].label}" aplicado`);
  };

  const groupStatus = (group: string): "total" | "custom" | "readonly" | "none" => {
    const menus = SYSTEM_MENUS.filter(m => m.group === group);
    let totalCount = 0, viewOnlyCount = 0, anyCount = 0;
    for (const menu of menus) {
      const p = permissions[menu.key];
      if (!p || Object.keys(p).length === 0) continue;
      anyCount++;
      const hasAll = menu.actions.every(a => p[a]);
      if (hasAll) totalCount++;
      else if (p.view && !p.create && !p.edit && !p.delete) viewOnlyCount++;
    }
    if (anyCount === 0) return "none";
    if (totalCount === menus.length) return "total";
    if (viewOnlyCount === menus.length) return "readonly";
    return "custom";
  };

  // Filtra menus pela busca
  const filteredMenusByGroup = MENU_GROUPS.reduce((acc, group) => {
    const menus = SYSTEM_MENUS.filter(m => m.group === group);
    const filtered = permSearch
      ? menus.filter(m => m.label.toLowerCase().includes(permSearch.toLowerCase()) || m.path.toLowerCase().includes(permSearch.toLowerCase()))
      : menus;
    if (filtered.length > 0) acc[group] = filtered;
    return acc;
  }, {} as Record<string, typeof SYSTEM_MENUS>);


  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    if (!form.id || !e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${form.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("employee-documents").upload(path, file);
    if (uploadErr) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("employee-documents").getPublicUrl(path);
    await supabase.from("employee_documents").insert({
      employee_id: form.id,
      title: file.name,
      document_type: docType,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
    });
    toast.success("Documento enviado");
    loadDocuments();
    setUploading(false);
  };

  const deleteDoc = async (doc: any) => {
    await supabase.from("employee_documents").delete().eq("id", doc.id);
    toast.success("Documento removido");
    loadDocuments();
  };


  return (
    <div className="space-y-4">
      <Tabs defaultValue="pessoais" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="pessoais" className="text-xs gap-1"><User className="w-3 h-3" />Pessoais</TabsTrigger>
          <TabsTrigger value="profissional" className="text-xs gap-1"><Briefcase className="w-3 h-3" />Profissional</TabsTrigger>
          <TabsTrigger value="remuneracao" className="text-xs gap-1"><DollarSign className="w-3 h-3" />Remuneração</TabsTrigger>
          <TabsTrigger value="horario" className="text-xs gap-1"><Clock className="w-3 h-3" />Horário</TabsTrigger>
          <TabsTrigger value="acesso" className="text-xs gap-1"><Key className="w-3 h-3" />Acesso</TabsTrigger>
          <TabsTrigger value="permissoes" className="text-xs gap-1"><Shield className="w-3 h-3" />Permissões</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs gap-1"><FileText className="w-3 h-3" />Documentos</TabsTrigger>
          <TabsTrigger value="observacoes" className="text-xs gap-1"><MessageSquare className="w-3 h-3" />Obs.</TabsTrigger>
        </TabsList>

        {/* TAB 1: DADOS PESSOAIS */}
        <TabsContent value="pessoais" className="space-y-3 mt-4">
          <div><Label>Nome completo *</Label><Input value={f("full_name")} onChange={e => set("full_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CPF</Label><Input value={f("cpf")} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
            <div><Label>RG</Label><Input value={f("rg")} onChange={e => set("rg", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de nascimento</Label><Input type="date" value={f("birth_date")} onChange={e => set("birth_date", e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={f("phone")} onChange={e => set("phone", e.target.value)} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={f("email")} onChange={e => set("email", e.target.value)} /></div>
          
          <p className="text-xs font-semibold text-muted-foreground pt-2">Endereço</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Rua</Label><Input value={f("address_street")} onChange={e => set("address_street", e.target.value)} /></div>
            <div><Label>Número</Label><Input value={f("address_number")} onChange={e => set("address_number", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Complemento</Label><Input value={f("address_complement")} onChange={e => set("address_complement", e.target.value)} /></div>
            <div><Label>Bairro</Label><Input value={f("address_neighborhood")} onChange={e => set("address_neighborhood", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Cidade</Label><Input value={f("address_city")} onChange={e => set("address_city", e.target.value)} /></div>
            <div><Label>Estado</Label><Input value={f("address_state")} onChange={e => set("address_state", e.target.value)} /></div>
            <div><Label>CEP</Label><Input value={f("address_cep")} onChange={e => set("address_cep", e.target.value)} /></div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground pt-2">Contato de Emergência</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={f("emergency_contact_name")} onChange={e => set("emergency_contact_name", e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={f("emergency_contact_phone")} onChange={e => set("emergency_contact_phone", e.target.value)} /></div>
          </div>
        </TabsContent>

        {/* TAB 2: DADOS PROFISSIONAIS */}
        <TabsContent value="profissional" className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cargo</Label>
              <Select value={f("position") || "Vendas"} onValueChange={v => set("position", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Área / Departamento</Label>
              <Select value={f("department") || "Comercial"} onValueChange={v => set("department", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo de vínculo</Label>
              <Select value={f("contract_type") || "CLT"} onValueChange={v => set("contract_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data de admissão</Label><Input type="date" value={f("hire_date")} onChange={e => set("hire_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supervisor direto</Label>
              <Select value={f("manager_id") || "none"} onValueChange={v => set("manager_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {employees.filter(e => e.id !== form.id).map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f("status") || "ativo"} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Regime de trabalho</Label>
            <Select value={f("work_regime") || "presencial"} onValueChange={v => set("work_regime", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
                <SelectItem value="remoto">Remoto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* TAB 3: REMUNERAÇÃO */}
        <TabsContent value="remuneracao" className="space-y-3 mt-4">
          <div><Label>Tipo de remuneração</Label>
            <Select value={f("remuneration_type") || "fixo"} onValueChange={v => set("remuneration_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="fixo_comissao">Fixo + Comissão</SelectItem>
                <SelectItem value="somente_comissao">Somente Comissão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Salário base (R$)</Label><Input type="number" value={f("base_salary")} onChange={e => set("base_salary", e.target.value)} /></div>
          {(f("remuneration_type") === "fixo_comissao" || f("remuneration_type") === "somente_comissao") && (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={form.commission_enabled || false} onCheckedChange={v => set("commission_enabled", v)} />
                <Label>Comissão habilitada</Label>
              </div>
              {form.commission_enabled && (
                <div className="pt-2 border-t border-border/50">
                  <CommissionRulesEditor
                    value={form.commission_rules}
                    onChange={(rules) => set("commission_rules", rules)}
                  />
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 4: CARGA HORÁRIA — DETALHADA POR DIA */}
        <TabsContent value="horario" className="space-y-4 mt-4">
          {(() => {
            const MODALITIES = [
              { value: "presencial", label: "Presencial", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
              { value: "home_office", label: "Home Office", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
              { value: "hibrido",    label: "Híbrido",     color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
              { value: "folga",      label: "Folga",       color: "bg-muted text-muted-foreground border-border" },
            ] as const;
            type DaySchedule = { active: boolean; modality: string; start: string; end: string; lunch_minutes: number };
            const defaultDay = (active: boolean): DaySchedule => ({
              active,
              modality: active ? "presencial" : "folga",
              start: form.work_schedule_start || "09:00",
              end: form.work_schedule_end || "18:00",
              lunch_minutes: form.lunch_duration_minutes ?? 60,
            });
            const schedule: Record<string, DaySchedule> = form.daily_schedule || WORK_DAYS_OPTIONS.reduce((acc, d) => {
              const isWeekday = ["seg","ter","qua","qui","sex"].includes(d.value);
              acc[d.value] = defaultDay(isWeekday);
              return acc;
            }, {} as Record<string, DaySchedule>);

            const updateDay = (day: string, patch: Partial<DaySchedule>) => {
              const next = { ...schedule, [day]: { ...schedule[day], ...patch } };
              // mantém work_days sincronizado (compatibilidade)
              const work_days = WORK_DAYS_OPTIONS.filter(d => next[d.value]?.active && next[d.value]?.modality !== "folga").map(d => d.value);
              setForm({ ...form, daily_schedule: next, work_days });
            };

            // Soma carga horária semanal (informativo)
            const totalHours = WORK_DAYS_OPTIONS.reduce((sum, d) => {
              const s = schedule[d.value];
              if (!s?.active || s.modality === "folga") return sum;
              const [sh, sm] = s.start.split(":").map(Number);
              const [eh, em] = s.end.split(":").map(Number);
              const mins = (eh * 60 + em) - (sh * 60 + sm) - (s.lunch_minutes || 0);
              return sum + Math.max(0, mins) / 60;
            }, 0);

            return (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">Carga horária semanal calculada</p>
                    <p className="text-xs text-muted-foreground">Soma automática dos dias ativos abaixo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-primary">{totalHours.toFixed(1)}h</p>
                    <Input
                      type="number"
                      className="w-24 h-7 text-xs mt-1"
                      placeholder="Meta CLT"
                      value={f("weekly_hours") || ""}
                      onChange={e => set("weekly_hours", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {WORK_DAYS_OPTIONS.map(d => {
                    const s = schedule[d.value] || defaultDay(false);
                    const isOff = !s.active || s.modality === "folga";
                    const modMeta = MODALITIES.find(m => m.value === s.modality) || MODALITIES[3];
                    return (
                      <div key={d.value} className={`rounded-lg border p-3 transition-colors ${isOff ? "bg-muted/20 border-border" : "bg-background border-primary/30"}`}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-[110px]">
                            <Switch checked={s.active && s.modality !== "folga"} onCheckedChange={v => updateDay(d.value, { active: v, modality: v ? (s.modality === "folga" ? "presencial" : s.modality) : "folga" })} />
                            <span className="text-sm font-semibold w-10">{d.label}</span>
                          </div>

                          {!isOff && (
                            <>
                              <div className="flex gap-1 flex-wrap">
                                {MODALITIES.filter(m => m.value !== "folga").map(m => (
                                  <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => updateDay(d.value, { modality: m.value })}
                                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${s.modality === m.value ? m.color : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"}`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 ml-auto flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Entrada</Label>
                                  <Input type="time" className="h-8 w-24 text-xs" value={s.start} onChange={e => updateDay(d.value, { start: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Saída</Label>
                                  <Input type="time" className="h-8 w-24 text-xs" value={s.end} onChange={e => updateDay(d.value, { end: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-[10px] text-muted-foreground">Intervalo (min)</Label>
                                  <Input type="number" min={0} className="h-8 w-16 text-xs" value={s.lunch_minutes} onChange={e => updateDay(d.value, { lunch_minutes: Number(e.target.value) })} />
                                </div>
                              </div>
                            </>
                          )}

                          {isOff && (
                            <Badge variant="outline" className="ml-auto text-xs">Folga</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const next: Record<string, DaySchedule> = {};
                    WORK_DAYS_OPTIONS.forEach(d => {
                      const wd = ["seg","ter","qua","qui","sex"].includes(d.value);
                      next[d.value] = { active: wd, modality: wd ? "presencial" : "folga", start: "09:00", end: "18:00", lunch_minutes: 60 };
                    });
                    setForm({ ...form, daily_schedule: next, work_days: ["seg","ter","qua","qui","sex"] });
                  }}>Padrão Comercial (Seg-Sex 9h-18h)</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const next: Record<string, DaySchedule> = {};
                    WORK_DAYS_OPTIONS.forEach(d => {
                      const wd = d.value !== "dom";
                      next[d.value] = { active: wd, modality: wd ? "presencial" : "folga", start: "09:00", end: d.value === "sab" ? "13:00" : "18:00", lunch_minutes: d.value === "sab" ? 0 : 60 };
                    });
                    setForm({ ...form, daily_schedule: next, work_days: ["seg","ter","qua","qui","sex","sab"] });
                  }}>6x1 (Seg-Sáb)</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const next: Record<string, DaySchedule> = {};
                    WORK_DAYS_OPTIONS.forEach(d => {
                      next[d.value] = { active: true, modality: "home_office", start: "09:00", end: d.value === "sab" || d.value === "dom" ? "13:00" : "18:00", lunch_minutes: 60 };
                    });
                    setForm({ ...form, daily_schedule: next, work_days: ["seg","ter","qua","qui","sex","sab","dom"] });
                  }}>100% Home Office</Button>
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* TAB 5: ACESSO AO SISTEMA */}
        <TabsContent value="acesso" className="space-y-4 mt-4">
          {form.system_user_id ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-500 flex items-center gap-2"><Key className="w-4 h-4" /> Usuário do sistema vinculado</p>
              <p className="text-xs text-muted-foreground">ID: {form.system_user_id}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Switch checked={createUser} onCheckedChange={setCreateUser} />
                <Label>Criar usuário para este colaborador</Label>
              </div>
              {createUser && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                  <div><Label>Email de login</Label><Input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="colaborador@natleva.com" /></div>
                  <div><Label>Senha inicial</Label><Input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="Mín. 6 caracteres" /></div>
                  <p className="text-[10px] text-muted-foreground">O usuário será convidado via edge function após salvar o colaborador.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 6: PERMISSÕES GRANULARES — BASEADO EM MENUS REAIS DO SISTEMA */}
        <TabsContent value="permissoes" className="space-y-4 mt-4">
          {/* Perfis pré-configurados */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfis pré-configurados</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Aplica um conjunto base — você pode customizar depois</p>
              </div>
              {activePreset && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Check className="w-3 h-3" /> {PERMISSION_PRESETS[activePreset]?.label}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(PERMISSION_PRESETS) as [RoleTemplate, typeof PERMISSION_PRESETS[RoleTemplate]][]).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`text-left rounded-md border px-3 py-2 transition-colors hover:border-primary/60 hover:bg-primary/5 ${activePreset === key ? "border-primary bg-primary/10" : "border-border/60 bg-background"}`}
                >
                  <p className="text-xs font-semibold">{preset.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Busca de menus */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar menu por nome ou rota (ex: vendas, /financeiro)..."
              value={permSearch}
              onChange={e => setPermSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Menus do sistema ({SYSTEM_MENUS.length} totais)
            </p>
            <p className="text-[10px] text-muted-foreground">
              {Object.values(permissions).filter(p => Object.keys(p).length > 0).length} com acesso liberado
            </p>
          </div>

          {/* Lista por GRUPO -> MENUS */}
          <div className="space-y-2">
            {Object.entries(filteredMenusByGroup).map(([group, menus]) => {
              const status = groupStatus(group);
              const isOpen = expandedGroup === group || !!permSearch;
              const statusBadge = {
                total:    { label: "Acesso total",   className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
                custom:   { label: "Personalizado",  className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
                readonly: { label: "Somente leitura", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
                none:     { label: "Sem acesso",     className: "bg-muted text-muted-foreground border-border" },
              }[status];
              return (
                <div key={group} className="rounded-lg border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isOpen && !permSearch ? null : group)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{group}</p>
                        <p className="text-[11px] text-muted-foreground">{menus.length} menus</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadge.className}`}>{statusBadge.label}</Badge>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/60 bg-muted/10 px-3 py-3 space-y-3">
                      {/* Atalhos de grupo */}
                      <div className="flex flex-wrap gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setGroupActions(group, "all")}>
                          <Check className="w-3 h-3 mr-1" /> Liberar tudo
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setGroupActions(group, "view")}>
                          <Eye className="w-3 h-3 mr-1" /> Somente leitura
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setGroupActions(group, "none")}>
                          <X className="w-3 h-3 mr-1" /> Bloquear tudo
                        </Button>
                      </div>

                      {/* Lista de menus do grupo */}
                      <div className="space-y-1.5">
                        {menus.map(menu => {
                          const perm = permissions[menu.key] || emptyPerm();
                          const hasAny = Object.keys(perm).length > 0;
                          return (
                            <div key={menu.key} className={`rounded-md border px-3 py-2 ${hasAny ? "border-primary/30 bg-primary/5" : "border-border/40 bg-background"}`}>
                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{menu.label}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">{menu.path}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {menu.actions.map(action => {
                                  const meta = ACTION_META[action];
                                  const Icon = meta.icon;
                                  const enabled = !!perm[action];
                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => toggleAction(menu.key, action)}
                                      title={meta.desc}
                                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${enabled ? "border-primary/60 bg-primary/15 text-primary" : "border-border/50 bg-background text-muted-foreground hover:border-primary/40"}`}
                                    >
                                      <Icon className="w-3 h-3 shrink-0" />
                                      <span>{meta.label}</span>
                                      {enabled && <Check className="w-2.5 h-2.5 ml-0.5 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(filteredMenusByGroup).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum menu corresponde à busca "{permSearch}"</p>
            )}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
            <strong>Dica:</strong> as permissões só passam a valer após o colaborador ter um login criado na aba <em>Acesso</em>. Administradores ignoram este filtro e vêem tudo.
          </div>
        </TabsContent>


        {/* TAB 7: DOCUMENTOS */}
        <TabsContent value="documentos" className="space-y-4 mt-4">
          {!form.id ? (
            <p className="text-sm text-muted-foreground text-center py-8">Salve o colaborador primeiro para anexar documentos.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {["contrato", "documento_pessoal", "comprovante_endereco", "acordo_interno"].map(docType => (
                  <label key={docType} className="flex flex-col items-center gap-2 border border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-center capitalize">{docType.replace(/_/g, " ")}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => handleUploadDoc(e, docType)} disabled={uploading} />
                  </label>
                ))}
              </div>
              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Documentos anexados ({documents.length})</p>
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{doc.document_type?.replace(/_/g, " ")}</p>
                      </div>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">Ver</a>
                      )}
                      <button onClick={() => deleteDoc(doc)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 8: OBSERVAÇÕES */}
        <TabsContent value="observacoes" className="space-y-3 mt-4">
          <div>
            <Label>Observações internas</Label>
            <textarea
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={f("observations")}
              onChange={e => set("observations", e.target.value)}
              placeholder="Anotações internas sobre o colaborador..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={onSave} className="w-full">{form.id ? "Salvar Alterações" : "Criar Colaborador"}</Button>
    </div>
  );
}
