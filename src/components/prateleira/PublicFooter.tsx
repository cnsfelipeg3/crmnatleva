import { Instagram, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";

export default function PublicFooter() {
  const year = new Date().getFullYear();
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
                <a href="https://wa.me/5571992997905" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  +55 71 9299-7905
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
                <a href="https://instagram.com/natleva" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  @natleva
                </a>
              </li>
            </ul>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Onde estamos</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>Salvador · Bahia · Brasil<br />Atendimento 100% digital</span>
            </div>
          </div>

          {/* Confiança */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Confiança</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>Pagamentos protegidos · proposta detalhada · sem letra miúda do orçamento ao voucher.</span>
            </div>
          </div>
        </div>

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
