import { useState } from "react";
import { Instagram, Mail, Phone, Building2, ShieldCheck, BadgeCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PublicFooter() {
  const year = new Date().getFullYear();
  const [cadasturOpen, setCadasturOpen] = useState(false);
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="space-y-3">
            <div className="font-serif text-2xl tracking-tight text-foreground">NatLeva</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Viagens desenhadas no detalhe · curadoria humana, atendimento direto e experiências sob medida.
            </p>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <a href="https://wa.me/5511966396692" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  +55 (11) 96639-6692
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <a href="mailto:contato@natleva.com" className="hover:text-foreground transition-colors">
                  contato@natleva.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-amber-600" />
                <a href="https://instagram.com/natlevaviagens" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  @natlevaviagens
                </a>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Empresa</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>NatLeva Viagens Ltda<br />CNPJ: 52.910.644/0001-10</span>
            </div>
          </div>

          {/* Confiança */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Confiança</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>Pagamentos protegidos · proposta detalhada · sem letra miúda do orçamento ao voucher.</span>
            </div>
            <button
              type="button"
              onClick={() => setCadasturOpen(true)}
              className="flex items-start gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <BadgeCheck className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span className="underline decoration-dotted decoration-amber-600/50 underline-offset-4 group-hover:decoration-amber-600">
                CADASTUR · Cadastro de Prestadores de Serviços Turísticos aprovado no Ministério do Turismo
              </span>
            </button>
          </div>
        </div>

        <Dialog open={cadasturOpen} onOpenChange={setCadasturOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
            <DialogTitle className="sr-only">Certificado CADASTUR · NatLeva Viagens</DialogTitle>
            <DialogDescription className="sr-only">
              Certificado de Cadastro de Prestadores de Serviços Turísticos emitido pelo Ministério do Turismo.
            </DialogDescription>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-foreground">Certificado CADASTUR</span>
              </div>
              <a
                href="/cadastur/certificado-cadastur.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Abrir PDF original
              </a>
            </div>
            <div className="max-h-[80vh] overflow-auto bg-muted/40 p-4">
              <img
                src="/cadastur/certificado-cadastur.jpg"
                alt="Certificado CADASTUR · NatLeva Viagens Ltda · Ministério do Turismo"
                className="w-full h-auto rounded-md shadow-sm bg-white"
              />
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {year} NatLeva Viagens · Todos os direitos reservados.</div>
          <div className="flex items-center gap-4">
            <span>Política de Privacidade</span>
            <span className="opacity-40">·</span>
            <span>Termos de Uso</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
