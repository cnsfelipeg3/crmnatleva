import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { toast } from "sonner";
import {
  Camera, User, Mail, Phone, MapPin, Calendar, Globe, Shield,
  Edit3, Check, X, Plane, Heart, Star, ChevronRight, Sparkles,
  CreditCard, FileText, Lock, Eye, EyeOff, Save, Hotel, Compass,
  Utensils, Armchair, Baby, Luggage, Clock, Mountain, Palmtree,
  Wifi, CircleDollarSign, PlaneTakeoff
} from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  cpf: string;
  rg: string;
  passport_number: string;
  passport_expiry: string;
  nationality: string;
  city: string;
  state: string;
  country: string;
  address: string;
  zip_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  // Travel preferences (expanded)
  seat_preference: string;
  dietary_preferences: string;
  frequent_flyer: string;
  cabin_class: string;
  hotel_category: string;
  trip_style: string;
  travel_pace: string;
  room_type: string;
  bed_preference: string;
  smoking_preference: string;
  special_assistance: string;
  preferred_airlines: string;
  preferred_hotel_chains: string;
  loyalty_hotel: string;
  travel_insurance: string;
  luggage_preference: string;
  transfer_preference: string;
  interests: string;
  travel_companion: string;
  budget_range: string;
  travel_notes: string;
  avatar_url: string;
  bio: string;
}

const defaultProfile: ProfileData = {
  full_name: "", email: "", phone: "", birth_date: "",
  cpf: "", rg: "", passport_number: "", passport_expiry: "",
  nationality: "Brasileira", city: "", state: "", country: "Brasil",
  address: "", zip_code: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  seat_preference: "", dietary_preferences: "", frequent_flyer: "",
  cabin_class: "", hotel_category: "", trip_style: "", travel_pace: "",
  room_type: "", bed_preference: "", smoking_preference: "Não fumante",
  special_assistance: "", preferred_airlines: "", preferred_hotel_chains: "",
  loyalty_hotel: "", travel_insurance: "", luggage_preference: "",
  transfer_preference: "", interests: "", travel_companion: "",
  budget_range: "", travel_notes: "",
  avatar_url: "", bio: "",
};

type TabKey = "pessoal" | "documentos" | "viagem" | "seguranca";

const tabs: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "pessoal", label: "Pessoal", icon: User },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "viagem", label: "Viagem", icon: Plane },
  { key: "seguranca", label: "Segurança", icon: Shield },
];

const seatOptions = ["Janela", "Corredor", "Indiferente"];
const dietOptions = ["Sem restrição", "Vegetariano", "Vegano", "Sem glúten", "Sem lactose", "Kosher", "Halal"];
const cabinOptions = ["Econômica", "Premium Economy", "Executiva", "Primeira Classe"];
const hotelCategoryOptions = ["Econômico", "Conforto", "Superior", "Luxo", "Resort All-Inclusive"];
const tripStyleOptions = ["Lazer", "Aventura", "Cultural", "Romântico", "Família", "Corporativo", "Lua de mel", "Ecoturismo", "Gastronômico"];
const travelPaceOptions = ["Relaxado", "Moderado", "Intenso"];
const roomTypeOptions = ["Standard", "Superior", "Suíte", "Suíte Premium", "Villa/Bangalô"];
const bedOptions = ["Casal", "Solteiro", "Twin (2 camas)", "Indiferente"];
const smokingOptions = ["Não fumante", "Fumante"];
const luggageOptions = ["Somente mão", "1 mala despachada", "2+ malas despachadas", "Flexível"];
const transferOptions = ["Shuttle/Compartilhado", "Transfer privativo", "Aluguel de carro", "Táxi/Uber", "Indiferente"];
const companionOptions = ["Solo", "Casal", "Família com crianças", "Família sem crianças", "Grupo de amigos", "Corporativo"];
const budgetOptions = ["Econômico (até R$3.000)", "Moderado (R$3.000-8.000)", "Conforto (R$8.000-15.000)", "Premium (R$15.000-30.000)", "Luxo (R$30.000+)"];
const insuranceOptions = ["Sempre contrato", "Apenas internacional", "Apenas quando exigido", "Não costumo contratar"];
const interestOptions = ["Praias", "Montanhas", "Cidades históricas", "Gastronomia", "Compras", "Vida noturna", "Natureza/Trilhas", "Esportes", "Spa/Bem-estar", "Parques temáticos", "Mergulho/Snorkel", "Fotografia", "Vinícolas", "Arte/Museus"];

export default function PortalProfile() {
  const { user, portalAccess } = usePortalAuth();
  const [profile, setProfile] = useState<ProfileData>({ ...defaultProfile, email: user?.email || "" });
  const [activeTab, setActiveTab] = useState<TabKey>("pessoal");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  // Load profile from clients table
  useEffect(() => {
    if (!portalAccess?.client_id) return;

    const load = async () => {
      try {
        if (!isUuid(portalAccess.client_id)) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", user?.id)
            .maybeSingle();

          if (profileData) {
            setProfile((prev) => ({
              ...prev,
              full_name: profileData.full_name || prev.full_name,
              email: profileData.email || user?.email || "",
              avatar_url: profileData.avatar_url || prev.avatar_url,
            }));
          }
          return;
        }

        const { data } = await supabase
          .from("clients")
          .select("*")
          .eq("id", portalAccess.client_id)
          .maybeSingle();

        if (data) {
          setProfile((prev) => ({
            ...prev,
            full_name: data.display_name || "",
            email: data.email || user?.email || "",
            phone: data.phone || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "Brasil",
            ...(data.observations ? tryParseExtras(data.observations) : {}),
          }));
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      }
    };

    void load();
  }, [portalAccess?.client_id, user?.id, user?.email]);

  // Calc completion
  useEffect(() => {
    const fields = [
      profile.full_name, profile.email, profile.phone, profile.birth_date,
      profile.cpf, profile.city, profile.state, profile.passport_number,
      profile.emergency_contact_name, profile.emergency_contact_phone, profile.avatar_url,
    ];
    const filled = fields.filter(f => f && f.trim().length > 0).length;
    setCompletionPercent(Math.round((filled / fields.length) * 100));
  }, [profile]);

  function tryParseExtras(obs: string): Partial<ProfileData> {
    try {
      const parsed = JSON.parse(obs);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {}
    return {};
  }

  const handleSave = async () => {
    if (!portalAccess?.client_id || !isUuid(portalAccess.client_id)) {
      toast.error("Perfil sem vínculo de cliente para edição completa");
      return;
    }

    setSaving(true);
    try {
      const { full_name, email, phone, city, state, country, ...extras } = profile;
      await supabase
        .from("clients")
        .update({
          display_name: full_name,
          email,
          phone,
          city,
          state,
          country,
          observations: JSON.stringify(extras),
        })
        .eq("id", portalAccess.client_id);
      toast.success("Perfil atualizado com sucesso!");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = (file.type.split("/")[1] || file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `portal-avatars/${user.id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from("media").upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));

      if (portalAccess?.client_id && isUuid(portalAccess.client_id)) {
        const { full_name, email, phone, city, state, country, ...extras } = {
          ...profile,
          avatar_url: avatarUrl,
        };
        await supabase
          .from("clients")
          .update({
            display_name: full_name,
            email,
            phone,
            city,
            state,
            country,
            observations: JSON.stringify(extras),
          })
          .eq("id", portalAccess.client_id);
      } else {
        await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      }

      toast.success("Foto atualizada!");
    } catch (err: any) {
      console.error("Erro ao enviar foto:", err);
      toast.error(err?.message || "Erro ao enviar foto");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setChangingPass(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  return (
    <PortalLayout>
      <div className="min-h-screen bg-gradient-to-b from-accent/5 via-background to-background">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent" />
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 20% 50%, hsl(var(--accent) / 0.15) 0%, transparent 50%)"
          }} />

          <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-28 h-28 rounded-full ring-4 ring-accent/30 ring-offset-4 ring-offset-background overflow-hidden bg-accent/10 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-accent">{initials}</span>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </motion.div>

              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">{profile.full_name || "Seu Nome"}</h1>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>

              {/* Completion Bar */}
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-accent" />
                    Perfil completo
                  </span>
                  <span className="text-xs font-semibold text-accent">{completionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Edit Toggle */}
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Editar Perfil
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {saving ? <div className="w-3.5 h-3.5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-all"
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="profile-tab-indicator"
                      className="absolute inset-0 bg-accent/10 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "pessoal" && (
                <div className="space-y-4">
                  <SectionTitle icon={User} label="Informações Pessoais" />
                  <FieldGroup>
                    <ProfileField label="Nome completo" icon={User} value={profile.full_name} field="full_name" editing={editing} onChange={updateField} />
                    <ProfileField label="E-mail" icon={Mail} value={profile.email} field="email" editing={editing} onChange={updateField} type="email" />
                    <ProfileField label="Telefone" icon={Phone} value={profile.phone} field="phone" editing={editing} onChange={updateField} placeholder="+55 11 99999-9999" />
                    <ProfileField label="Data de nascimento" icon={Calendar} value={profile.birth_date} field="birth_date" editing={editing} onChange={updateField} type="date" />
                    <ProfileField label="Nacionalidade" icon={Globe} value={profile.nationality} field="nationality" editing={editing} onChange={updateField} />
                  </FieldGroup>

                  <SectionTitle icon={MapPin} label="Endereço" />
                  <FieldGroup>
                    <ProfileField label="Endereço" icon={MapPin} value={profile.address} field="address" editing={editing} onChange={updateField} placeholder="Rua, número, complemento" />
                    <div className="grid grid-cols-2 gap-3">
                      <ProfileField label="Cidade" value={profile.city} field="city" editing={editing} onChange={updateField} />
                      <ProfileField label="Estado" value={profile.state} field="state" editing={editing} onChange={updateField} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ProfileField label="CEP" value={profile.zip_code} field="zip_code" editing={editing} onChange={updateField} placeholder="00000-000" />
                      <ProfileField label="País" value={profile.country} field="country" editing={editing} onChange={updateField} />
                    </div>
                  </FieldGroup>

                  <SectionTitle icon={Phone} label="Contato de Emergência" />
                  <FieldGroup>
                    <ProfileField label="Nome" value={profile.emergency_contact_name} field="emergency_contact_name" editing={editing} onChange={updateField} />
                    <ProfileField label="Telefone" icon={Phone} value={profile.emergency_contact_phone} field="emergency_contact_phone" editing={editing} onChange={updateField} />
                  </FieldGroup>

                  {profile.bio !== undefined && (
                    <>
                      <SectionTitle icon={Heart} label="Bio" />
                      <FieldGroup>
                        {editing ? (
                          <textarea
                            value={profile.bio}
                            onChange={e => updateField("bio", e.target.value)}
                            placeholder="Conte um pouco sobre você e seus interesses de viagem..."
                            className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {profile.bio || "Nenhuma bio adicionada"}
                          </p>
                        )}
                      </FieldGroup>
                    </>
                  )}
                </div>
              )}

              {activeTab === "documentos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={FileText} label="Documentos" />
                    <button
                      onClick={() => setShowSensitive(!showSensitive)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSensitive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showSensitive ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <FieldGroup>
                    <ProfileField
                      label="CPF" icon={CreditCard}
                      value={showSensitive ? profile.cpf : maskValue(profile.cpf)}
                      field="cpf" editing={editing} onChange={updateField}
                      placeholder="000.000.000-00"
                    />
                    <ProfileField
                      label="RG" icon={CreditCard}
                      value={showSensitive ? profile.rg : maskValue(profile.rg)}
                      field="rg" editing={editing} onChange={updateField}
                    />
                  </FieldGroup>

                  <SectionTitle icon={Globe} label="Passaporte" />
                  <FieldGroup>
                    <ProfileField
                      label="Número do passaporte"
                      value={showSensitive ? profile.passport_number : maskValue(profile.passport_number)}
                      field="passport_number" editing={editing} onChange={updateField}
                    />
                    <ProfileField label="Validade" value={profile.passport_expiry} field="passport_expiry" editing={editing} onChange={updateField} type="date" />
                  </FieldGroup>
                </div>
              )}

              {activeTab === "viagem" && (
                <div className="space-y-4">
                  {/* ✈️ Voo */}
                  <SectionTitle icon={PlaneTakeoff} label="Preferências de Voo" />
                  <FieldGroup>
                    <OptionPicker label="Assento preferido" icon={Armchair} options={seatOptions} value={profile.seat_preference} field="seat_preference" editing={editing} onChange={updateField} />
                    <OptionPicker label="Classe preferida" icon={Star} options={cabinOptions} value={profile.cabin_class} field="cabin_class" editing={editing} onChange={updateField} />
                    <OptionPicker label="Restrição alimentar" icon={Utensils} options={dietOptions} value={profile.dietary_preferences} field="dietary_preferences" editing={editing} onChange={updateField} wrap />
                    <ProfileField label="Cias aéreas preferidas" icon={Plane} value={profile.preferred_airlines} field="preferred_airlines" editing={editing} onChange={updateField} placeholder="Ex: LATAM, Azul, GOL" />
                    <ProfileField label="Programa de fidelidade aéreo" icon={Star} value={profile.frequent_flyer} field="frequent_flyer" editing={editing} onChange={updateField} placeholder="Ex: Smiles Gold - 123456789" />
                    <OptionPicker label="Bagagem" icon={Luggage} options={luggageOptions} value={profile.luggage_preference} field="luggage_preference" editing={editing} onChange={updateField} wrap />
                  </FieldGroup>

                  {/* 🏨 Hospedagem */}
                  <SectionTitle icon={Hotel} label="Preferências de Hospedagem" />
                  <FieldGroup>
                    <OptionPicker label="Categoria do hotel" icon={Star} options={hotelCategoryOptions} value={profile.hotel_category} field="hotel_category" editing={editing} onChange={updateField} wrap />
                    <OptionPicker label="Tipo de quarto" icon={Hotel} options={roomTypeOptions} value={profile.room_type} field="room_type" editing={editing} onChange={updateField} wrap />
                    <OptionPicker label="Tipo de cama" icon={Hotel} options={bedOptions} value={profile.bed_preference} field="bed_preference" editing={editing} onChange={updateField} />
                    <OptionPicker label="Fumante" icon={X} options={smokingOptions} value={profile.smoking_preference} field="smoking_preference" editing={editing} onChange={updateField} />
                    <ProfileField label="Redes hoteleiras preferidas" icon={Hotel} value={profile.preferred_hotel_chains} field="preferred_hotel_chains" editing={editing} onChange={updateField} placeholder="Ex: Marriott, Accor, Hilton" />
                    <ProfileField label="Programa de fidelidade hotel" icon={Star} value={profile.loyalty_hotel} field="loyalty_hotel" editing={editing} onChange={updateField} placeholder="Ex: Marriott Bonvoy - 123456" />
                  </FieldGroup>

                  {/* 🧭 Estilo de Viagem */}
                  <SectionTitle icon={Compass} label="Estilo de Viagem" />
                  <FieldGroup>
                    <OptionPicker label="Tipo de viagem" icon={Heart} options={tripStyleOptions} value={profile.trip_style} field="trip_style" editing={editing} onChange={updateField} wrap />
                    <OptionPicker label="Ritmo de viagem" icon={Clock} options={travelPaceOptions} value={profile.travel_pace} field="travel_pace" editing={editing} onChange={updateField} />
                    <OptionPicker label="Com quem viaja" icon={User} options={companionOptions} value={profile.travel_companion} field="travel_companion" editing={editing} onChange={updateField} wrap />
                    <OptionPicker label="Faixa de orçamento" icon={CircleDollarSign} options={budgetOptions} value={profile.budget_range} field="budget_range" editing={editing} onChange={updateField} wrap />
                  </FieldGroup>

                  {/* 🎯 Interesses & Extras */}
                  <SectionTitle icon={Mountain} label="Interesses & Extras" />
                  <FieldGroup>
                    <MultiOptionPicker label="Interesses de viagem" icon={Heart} options={interestOptions} value={profile.interests} field="interests" editing={editing} onChange={updateField} />
                    <OptionPicker label="Transfer preferido" icon={MapPin} options={transferOptions} value={profile.transfer_preference} field="transfer_preference" editing={editing} onChange={updateField} wrap />
                    <OptionPicker label="Seguro viagem" icon={Shield} options={insuranceOptions} value={profile.travel_insurance} field="travel_insurance" editing={editing} onChange={updateField} wrap />
                    <ProfileField label="Necessidades especiais / Acessibilidade" icon={Heart} value={profile.special_assistance} field="special_assistance" editing={editing} onChange={updateField} placeholder="Ex: Cadeira de rodas, alergia grave..." />
                  </FieldGroup>

                  {/* 📝 Observações */}
                  <SectionTitle icon={FileText} label="Observações de Viagem" />
                  <FieldGroup>
                    {editing ? (
                      <textarea
                        value={profile.travel_notes}
                        onChange={e => updateField("travel_notes", e.target.value)}
                        placeholder="Outras preferências, informações importantes para a agência..."
                        className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {profile.travel_notes || "Nenhuma observação adicionada"}
                      </p>
                    )}
                  </FieldGroup>
                </div>
              )}
                      editing={editing} onChange={updateField}
                      placeholder="Ex: Smiles Gold - 123456789"
                    />
                  </FieldGroup>
                </div>
              )}

              {activeTab === "seguranca" && (
                <div className="space-y-4">
                  <SectionTitle icon={Lock} label="Alterar Senha" />
                  <FieldGroup>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nova senha</label>
                      <input
                        type="password" value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirmar nova senha</label>
                      <input
                        type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Repita a nova senha"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPass || !newPassword || !confirmPassword}
                      className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      {changingPass ? "Alterando..." : "Alterar Senha"}
                    </button>
                  </FieldGroup>

                  <SectionTitle icon={Shield} label="Sessão" />
                  <FieldGroup>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">E-mail da conta</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  </FieldGroup>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PortalLayout>
  );
}

// --- Sub-components ---

function SectionTitle({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-sm">
      {children}
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  icon?: typeof User;
  value: string;
  field: keyof ProfileData;
  editing: boolean;
  onChange: (field: keyof ProfileData, value: string) => void;
  type?: string;
  placeholder?: string;
}

function ProfileField({ label, icon: Icon, value, field, editing, onChange, type = "text", placeholder }: ProfileFieldProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {editing ? (
        <div className="relative">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
          <input
            type={type}
            value={value}
            onChange={e => onChange(field, e.target.value)}
            placeholder={placeholder || label}
            className={`w-full p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all ${Icon ? "pl-10" : ""}`}
          />
        </div>
      ) : (
        <div className={`flex items-center gap-2 p-3 rounded-xl bg-muted/30 ${!value ? "italic" : ""}`}>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className={`text-sm ${value ? "text-foreground" : "text-muted-foreground"}`}>
            {value || "Não informado"}
          </span>
        </div>
      )}
    </div>
  );
}

function maskValue(val: string): string {
  if (!val || val.length < 4) return val ? "•".repeat(val.length) : "";
  return "•".repeat(val.length - 3) + val.slice(-3);
}
