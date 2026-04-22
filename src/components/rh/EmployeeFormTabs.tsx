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
import { User, Briefcase, DollarSign, Clock, Shield, Key, FileText, MessageSquare, Upload, Trash2, ChevronDown, ChevronRight, Check, X, Eye, Plus, Pencil, Download, CheckCircle2 } from "lucide-react";

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

// === PERMISSÕES GRANULARES ===
type PermAction = "view" | "create" | "edit" | "delete" | "export" | "approve";
const ACTION_META: Record<PermAction, { label: string; icon: any; desc: string }> = {
  view:    { label: "Visualizar", icon: Eye,          desc: "Pode ver os dados do módulo" },
  create:  { label: "Criar",      icon: Plus,         desc: "Pode adicionar novos registros" },
  edit:    { label: "Editar",     icon: Pencil,       desc: "Pode alterar registros existentes" },
  delete:  { label: "Excluir",    icon: Trash2,       desc: "Pode remover registros" },
  export:  { label: "Exportar",   icon: Download,     desc: "Pode baixar dados (CSV/PDF)" },
  approve: { label: "Aprovar",    icon: CheckCircle2, desc: "Pode aprovar/validar fluxos" },
};

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  actions: PermAction[];
  features: { key: string; label: string; description?: string }[];
}

const MODULE_CATALOG: ModuleDef[] = [
  { key: "vendas", label: "Vendas", description: "CRM, pipeline e gestão comercial",
    actions: ["view", "create", "edit", "delete", "export", "approve"],
    features: [
      { key: "ver_todas",       label: "Ver vendas de todos", description: "Caso desmarcado, vê apenas as próprias" },
      { key: "alterar_status",  label: "Alterar status da venda" },
      { key: "ver_lucro",       label: "Visualizar margem e lucro" },
      { key: "editar_comissao", label: "Editar valor de comissão" },
      { key: "cancelar",        label: "Cancelar venda" },
    ] },
  { key: "viagens", label: "Viagens", description: "Torre de controle e operações de viagem",
    actions: ["view", "create", "edit", "delete", "export"],
    features: [
      { key: "checkin",              label: "Realizar check-in" },
      { key: "emissao",              label: "Confirmar emissão" },
      { key: "alterar_voos",         label: "Alterar segmentos de voo" },
      { key: "gerenciar_hospedagem", label: "Gerenciar hospedagem" },
    ] },
  { key: "clientes", label: "Clientes", description: "Cadastro, perfil 360 e passageiros",
    actions: ["view", "create", "edit", "delete", "export"],
    features: [
      { key: "ver_todos",            label: "Ver clientes de outros vendedores" },
      { key: "ver_dados_sensiveis",  label: "Ver CPF/Passaporte completos" },
      { key: "mesclar",              label: "Mesclar duplicados" },
      { key: "transferir",           label: "Transferir cliente entre vendedores" },
    ] },
  { key: "financeiro", label: "Financeiro", description: "Contas a pagar/receber, comissões e DRE",
    actions: ["view", "create", "edit", "delete", "export", "approve"],
    features: [
      { key: "contas_pagar",     label: "Contas a pagar" },
      { key: "contas_receber",   label: "Contas a receber" },
      { key: "conciliacao",      label: "Conciliação bancária" },
      { key: "fechar_comissao",  label: "Fechar/aprovar comissões" },
      { key: "dre",              label: "DRE e relatórios fiscais" },
      { key: "plano_contas",     label: "Editar plano de contas" },
    ] },
  { key: "operacoes", label: "Operações", description: "Inbox, atendimento e automações",
    actions: ["view", "create", "edit", "delete"],
    features: [
      { key: "inbox",            label: "Atender Inbox WhatsApp" },
      { key: "responder_lead",   label: "Responder leads de outros" },
      { key: "fluxos",           label: "Editar fluxos de automação" },
      { key: "transferir_atend", label: "Transferir atendimento" },
    ] },
  { key: "relatorios", label: "Relatórios & BI", description: "Dashboards, métricas e exportações",
    actions: ["view", "export"],
    features: [
      { key: "dashboard_geral",       label: "Dashboard geral" },
      { key: "dashboard_financeiro",  label: "Dashboard financeiro" },
      { key: "dashboard_comercial",   label: "Dashboard comercial" },
      { key: "ranking_vendedores",    label: "Ranking de vendedores" },
      { key: "ver_metas_outros",      label: "Ver metas de outros vendedores" },
    ] },
  { key: "ai_team", label: "Inteligência IA", description: "Agentes, conhecimento e estratégia",
    actions: ["view", "create", "edit", "delete"],
    features: [
      { key: "editar_agentes",     label: "Editar prompts dos agentes" },
      { key: "base_conhecimento",  label: "Gerenciar base de conhecimento" },
      { key: "regras_globais",     label: "Editar regras globais da agência" },
      { key: "simulador",          label: "Acessar simuladores" },
    ] },
  { key: "administracao", label: "Administração", description: "Configurações gerais do sistema",
    actions: ["view", "edit"],
    features: [
      { key: "integracoes",     label: "Integrações (Z-API, Amadeus, etc.)" },
      { key: "config_agencia",  label: "Configurações da agência" },
      { key: "logs_sistema",    label: "Ver logs do sistema" },
      { key: "backup",          label: "Backup e restauração" },
    ] },
  { key: "rh", label: "Recursos Humanos", description: "Colaboradores, ponto e folha",
    actions: ["view", "create", "edit", "delete", "export"],
    features: [
      { key: "ver_salarios",     label: "Ver salários e remuneração" },
      { key: "gerenciar_perms",  label: "Gerenciar permissões de outros" },
      { key: "ponto",            label: "Controle de ponto" },
      { key: "documentos",       label: "Gerenciar documentos pessoais" },
    ] },
];

type ModulePerm = { actions: PermAction[]; features: Record<string, boolean> };
type PermissionsMap = Record<string, ModulePerm>;
const emptyModulePerm = (): ModulePerm => ({ actions: [], features: {} });
const buildPreset = (template: (mod: ModuleDef) => ModulePerm): PermissionsMap =>
  Object.fromEntries(MODULE_CATALOG.map(m => [m.key, template(m)]));

const PERMISSION_PRESETS: Record<string, { label: string; description: string; build: () => PermissionsMap }> = {
  administrador: { label: "Administrador", description: "Acesso total a tudo, incluindo configurações sensíveis",
    build: () => buildPreset(m => ({ actions: [...m.actions], features: Object.fromEntries(m.features.map(f => [f.key, true])) })) },
  gestor: { label: "Gestor / Gerente", description: "Vê e edita tudo, sem mexer em integrações nem RH sensível",
    build: () => buildPreset(m => {
      if (m.key === "administracao") return { actions: ["view"], features: { logs_sistema: true } };
      if (m.key === "rh") return { actions: ["view", "edit"], features: { ver_salarios: true, ponto: true, documentos: true } };
      return { actions: m.actions.filter(a => a !== "delete"), features: Object.fromEntries(m.features.map(f => [f.key, true])) };
    }) },
  vendedor: { label: "Vendedor", description: "Vê apenas as próprias vendas/clientes; sem financeiro nem admin",
    build: () => buildPreset(m => {
      if (m.key === "vendas") return { actions: ["view", "create", "edit", "export"], features: { alterar_status: true, ver_lucro: false, ver_todas: false, editar_comissao: false, cancelar: false } };
      if (m.key === "clientes") return { actions: ["view", "create", "edit"], features: { ver_todos: false, ver_dados_sensiveis: true, mesclar: false, transferir: false } };
      if (m.key === "viagens") return { actions: ["view"], features: {} };
      if (m.key === "relatorios") return { actions: ["view"], features: { dashboard_comercial: true, ranking_vendedores: true } };
      if (m.key === "operacoes") return { actions: ["view", "create"], features: { inbox: true, responder_lead: false } };
      return emptyModulePerm();
    }) },
  operacional: { label: "Operacional", description: "Foca em viagens, check-in e atendimento",
    build: () => buildPreset(m => {
      if (m.key === "viagens") return { actions: ["view", "create", "edit", "export"], features: Object.fromEntries(m.features.map(f => [f.key, true])) };
      if (m.key === "operacoes") return { actions: ["view", "create", "edit"], features: { inbox: true, responder_lead: true, transferir_atend: true } };
      if (m.key === "clientes") return { actions: ["view", "edit"], features: { ver_todos: true, ver_dados_sensiveis: true } };
      if (m.key === "vendas") return { actions: ["view"], features: { ver_todas: true } };
      if (m.key === "relatorios") return { actions: ["view"], features: { dashboard_geral: true } };
      return emptyModulePerm();
    }) },
  financeiro: { label: "Financeiro", description: "Acesso completo ao financeiro, leitura nas demais áreas",
    build: () => buildPreset(m => {
      if (m.key === "financeiro") return { actions: [...m.actions], features: Object.fromEntries(m.features.map(f => [f.key, true])) };
      if (m.key === "vendas") return { actions: ["view", "export"], features: { ver_todas: true, ver_lucro: true } };
      if (m.key === "clientes") return { actions: ["view"], features: { ver_todos: true, ver_dados_sensiveis: true } };
      if (m.key === "relatorios") return { actions: ["view", "export"], features: Object.fromEntries(m.features.map(f => [f.key, true])) };
      return emptyModulePerm();
    }) },
  leitura: { label: "Somente Leitura", description: "Pode ver tudo, não pode alterar nada",
    build: () => buildPreset(_m => ({ actions: ["view"], features: {} })) },
};

const MODULES = MODULE_CATALOG.map(m => m.key);

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

  // Migra permissões antigas (string por módulo) para o novo formato granular
  const rawPermissions = form.permissions || {};
  const permissions: PermissionsMap = MODULE_CATALOG.reduce((acc, mod) => {
    const existing = rawPermissions[mod.key];
    if (existing && typeof existing === "object" && "actions" in existing) {
      acc[mod.key] = existing as ModulePerm;
    } else if (typeof existing === "string") {
      // legacy: "total" | "parcial" | "sem_acesso"
      if (existing === "total") acc[mod.key] = { actions: [...mod.actions], features: Object.fromEntries(mod.features.map(f => [f.key, true])) };
      else if (existing === "parcial") acc[mod.key] = { actions: ["view"], features: {} };
      else acc[mod.key] = emptyModulePerm();
    } else {
      acc[mod.key] = emptyModulePerm();
    }
    return acc;
  }, {} as PermissionsMap);

  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (form.id) loadDocuments();
  }, [form.id]);

  const loadDocuments = async () => {
    if (!form.id) return;
    const { data } = await supabase.from("employee_documents").select("*").eq("employee_id", form.id).order("created_at", { ascending: false });
    setDocuments(data || []);
  };

  const f = (key: string) => form[key] || "";
  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  const toggleWorkDay = (day: string) => {
    const days: string[] = form.work_days || ["seg", "ter", "qua", "qui", "sex"];
    set("work_days", days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  const setModulePerm = (modKey: string, next: ModulePerm) => {
    set("permissions", { ...permissions, [modKey]: next });
    setActivePreset(null);
  };

  const toggleAction = (modKey: string, action: PermAction) => {
    const current = permissions[modKey] || emptyModulePerm();
    const has = current.actions.includes(action);
    let nextActions = has ? current.actions.filter(a => a !== action) : [...current.actions, action];
    // Regra: se ativar qualquer ação, garante "view" também
    if (!has && action !== "view" && !nextActions.includes("view")) nextActions = ["view", ...nextActions];
    // Regra: se remover "view", remove tudo
    if (has && action === "view") nextActions = [];
    setModulePerm(modKey, { ...current, actions: nextActions });
  };

  const toggleFeature = (modKey: string, featKey: string) => {
    const current = permissions[modKey] || emptyModulePerm();
    setModulePerm(modKey, { ...current, features: { ...current.features, [featKey]: !current.features[featKey] } });
  };

  const setAllActions = (modKey: string, mode: "all" | "none" | "readonly") => {
    const mod = MODULE_CATALOG.find(m => m.key === modKey)!;
    if (mode === "all") setModulePerm(modKey, { actions: [...mod.actions], features: Object.fromEntries(mod.features.map(f => [f.key, true])) });
    else if (mode === "readonly") setModulePerm(modKey, { actions: ["view"], features: {} });
    else setModulePerm(modKey, emptyModulePerm());
  };

  const applyPreset = (presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    set("permissions", preset.build());
    setActivePreset(presetKey);
    toast.success(`Perfil "${preset.label}" aplicado`);
  };

  const moduleStatus = (modKey: string): "total" | "custom" | "readonly" | "none" => {
    const mod = MODULE_CATALOG.find(m => m.key === modKey)!;
    const p = permissions[modKey] || emptyModulePerm();
    if (p.actions.length === 0) return "none";
    if (p.actions.length === 1 && p.actions[0] === "view" && Object.values(p.features).every(v => !v)) return "readonly";
    if (p.actions.length === mod.actions.length && mod.features.every(f => p.features[f.key])) return "total";
    return "custom";
  };

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

  const permLevelLabel = (l: string) => l === "total" ? "Total" : l === "parcial" ? "Parcial" : "Sem acesso";
  const permLevelColor = (l: string) => l === "total" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : l === "parcial" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "bg-muted text-muted-foreground border-border";

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
                <div><Label>% de comissão</Label><Input type="number" step="0.1" value={f("commission_percent")} onChange={e => set("commission_percent", e.target.value)} /></div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 4: CARGA HORÁRIA */}
        <TabsContent value="horario" className="space-y-3 mt-4">
          <div><Label>Carga horária semanal (horas)</Label><Input type="number" value={f("weekly_hours") || 44} onChange={e => set("weekly_hours", Number(e.target.value))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Entrada</Label><Input type="time" value={f("work_schedule_start") || "09:00"} onChange={e => set("work_schedule_start", e.target.value)} /></div>
            <div><Label>Saída</Label><Input type="time" value={f("work_schedule_end") || "18:00"} onChange={e => set("work_schedule_end", e.target.value)} /></div>
          </div>
          <div><Label>Intervalo (minutos)</Label><Input type="number" value={f("lunch_duration_minutes") || 60} onChange={e => set("lunch_duration_minutes", Number(e.target.value))} /></div>
          <div>
            <Label>Dias trabalhados</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {WORK_DAYS_OPTIONS.map(d => {
                const active = (form.work_days || ["seg", "ter", "qua", "qui", "sex"]).includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWorkDay(d.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
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

        {/* TAB 6: PERMISSÕES GRANULARES */}
        <TabsContent value="permissoes" className="space-y-4 mt-4">
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
              {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissões por módulo</p>
            {MODULE_CATALOG.map(mod => {
              const perm = permissions[mod.key] || emptyModulePerm();
              const status = moduleStatus(mod.key);
              const isOpen = expandedModule === mod.key;
              const statusBadge = {
                total:    { label: "Acesso total",   className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
                custom:   { label: "Personalizado",  className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
                readonly: { label: "Somente leitura", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
                none:     { label: "Sem acesso",     className: "bg-muted text-muted-foreground border-border" },
              }[status];
              return (
                <div key={mod.key} className="rounded-lg border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedModule(isOpen ? null : mod.key)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{mod.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{mod.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadge.className}`}>{statusBadge.label}</Badge>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/60 bg-muted/10 px-4 py-3 space-y-4">
                      {/* Atalhos */}
                      <div className="flex flex-wrap gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setAllActions(mod.key, "all")}>
                          <Check className="w-3 h-3 mr-1" /> Liberar tudo
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setAllActions(mod.key, "readonly")}>
                          <Eye className="w-3 h-3 mr-1" /> Somente leitura
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setAllActions(mod.key, "none")}>
                          <X className="w-3 h-3 mr-1" /> Bloquear tudo
                        </Button>
                      </div>

                      {/* Ações (verbos) */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ações permitidas</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {mod.actions.map(action => {
                            const meta = ACTION_META[action];
                            const Icon = meta.icon;
                            const enabled = perm.actions.includes(action);
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => toggleAction(mod.key, action)}
                                title={meta.desc}
                                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${enabled ? "border-primary/60 bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:border-primary/40"}`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{meta.label}</span>
                                {enabled && <Check className="w-3 h-3 ml-auto shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-funcionalidades */}
                      {mod.features.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Funcionalidades específicas</p>
                          <div className="space-y-1">
                            {mod.features.map(feat => {
                              const enabled = !!perm.features[feat.key];
                              return (
                                <label
                                  key={feat.key}
                                  className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer"
                                >
                                  <Switch checked={enabled} onCheckedChange={() => toggleFeature(mod.key, feat.key)} className="mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium">{feat.label}</p>
                                    {feat.description && <p className="text-[10px] text-muted-foreground">{feat.description}</p>}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
            <strong>Dica:</strong> as permissões só passam a valer após o colaborador ter um login criado na aba <em>Acesso</em>. Sem login vinculado, ele aparece no cadastro mas não acessa o sistema.
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
