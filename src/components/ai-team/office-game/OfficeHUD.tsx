import { ArrowLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function OfficeHUD({ onBack }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
                     bg-white/80 backdrop-blur-sm border border-black/5 text-[#3a3530]
                     shadow-sm hover:bg-white transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Dashboard
        </button>
        <div className="text-[10px] font-semibold tracking-wider uppercase text-[#8a8580]
                        bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-black/5">
          AI Team Office
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="text-[11px] text-[#8a8580] bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5">
          <span className="font-medium">WASD</span> mover&ensp;•&ensp;<span className="font-medium">Clique</span> andar&ensp;•&ensp;<span className="font-medium">E</span> interagir
        </div>
      </div>
    </div>
  );
}
