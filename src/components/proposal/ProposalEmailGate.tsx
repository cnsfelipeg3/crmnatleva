import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Sparkles, Globe, Shield } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva-clean.webp";
import { sanitizeProposalCoverUrl } from "@/lib/proposalCoverImage";

interface Props {
  proposalTitle?: string;
  destination?: string;
  coverImage?: string;
  onSubmit: (email: string, name?: string) => void;
  loading?: boolean;
}

export default function ProposalEmailGate({ proposalTitle, destination, coverImage, onSubmit, loading }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }
    setError("");
    onSubmit(trimmed, name.trim() || undefined);
  };

  const safeCover = sanitizeProposalCoverUrl(coverImage);
  const bgImage = safeCover || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [-20, 20, -20], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-black/5">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center bg-white">
            <motion.img
              src={logoNatleva}
              alt="NatLeva Viagens"
              className="h-10 mx-auto mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs tracking-[0.2em] uppercase mb-3">
                <Globe className="w-3.5 h-3.5" />
                <span>Proposta Exclusiva</span>
              </div>

              {proposalTitle && (
                <h1 className="text-2xl font-bold text-neutral-900 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {proposalTitle}
                </h1>
              )}

              {destination && (
                <p className="text-neutral-600 text-sm flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {destination}
                </p>
              )}
            </motion.div>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="px-8 pb-10 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-neutral-600 text-sm text-center mb-6 leading-relaxed">
              Insira seu e-mail para visualizar todos os detalhes da sua viagem personalizada.
            </p>

            <div className="space-y-3 mb-5">
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-11 pr-4 py-3.5 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-600 text-xs px-1">
                  {error}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold py-3.5 rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full" />
              ) : (
                <>
                  Ver minha proposta <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-5 text-neutral-500 text-[10px]">
              <Shield className="w-3 h-3" />
              <span>Seus dados estão protegidos e não serão compartilhados</span>
            </div>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}
