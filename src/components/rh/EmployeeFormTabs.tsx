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
import { User, Briefcase, DollarSign, Clock, Shield, Key, FileText, MessageSquare, Upload, Trash2 } from "lucide-react";

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

const MODULES = ["Vendas", "Viagens", "Clientes", "Financeiro", "Operações", "Relatórios", "Administração", "RH"];
const PERMISSION_LEVELS = ["sem_acesso", "parcial", "total"];
const PERMISSION_PRESETS: Record<string, Record<string, string>> = {
  administrador: Object.fromEntries(MODULES.map(m => [m, "total"])),
  vendedor: { Vendas: "total", Viagens: "parcial", Clientes: "total", Financeiro: "sem_acesso", Operações: "sem_acesso", Relatórios: "parcial", Administração: "sem_acesso", RH: "sem_acesso" },
  operacional: { Vendas: "parcial", Viagens: "total", Clientes: "parcial", Financeiro: "sem_acesso", Operações: "total", Relatórios: "parcial", Administração: "sem_acesso", RH: "sem_acesso" },
  financeiro: { Vendas: "parcial", Viagens: "sem_acesso", Clientes: "parcial", Financeiro: "total", Operações: "sem_acesso", Relatórios: "total", Administração: "sem_acesso", RH: "sem_acesso" },
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

  const permissions: Record<string, string> = form.permissions || {};

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

  const setPermission = (mod: string, level: string) => {
    set("permissions", { ...permissions, [mod]: level });
  };

  const applyPreset = (preset: string) => {
    set("permissions", { ...PERMISSION_PRESETS[preset] });
    toast.success(`Perfil "${preset}" aplicado`);
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

        {/* TAB 6: PERMISSÕES */}
        <TabsContent value="permissoes" className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Aplicar perfil pré-configurado:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(PERMISSION_PRESETS).map(preset => (
                <Button key={preset} variant="outline" size="sm" className="text-xs capitalize" onClick={() => applyPreset(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 bg-muted/50 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Módulo</span><span>Sem Acesso</span><span>Parcial</span><span>Total</span>
            </div>
            {MODULES.map(mod => (
              <div key={mod} className="grid grid-cols-4 items-center px-4 py-2.5 border-t text-sm">
                <span className="font-medium">{mod}</span>
                {PERMISSION_LEVELS.map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`perm-${mod}`}
                      checked={(permissions[mod] || "sem_acesso") === level}
                      onChange={() => setPermission(mod, level)}
                      className="accent-primary"
                    />
                    <Badge variant="outline" className={`text-[9px] ${permLevelColor(level)}`}>{permLevelLabel(level)}</Badge>
                  </label>
                ))}
              </div>
            ))}
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
