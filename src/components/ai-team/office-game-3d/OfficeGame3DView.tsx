import { Suspense, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import OfficeScene from './OfficeScene';
import type { Agent, Task } from '../mockData';
import { ArrowLeft } from 'lucide-react';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onBack: () => void;
  onSelectAgent: (agent: Agent) => void;
}

export default function OfficeGame3DView({ agents, tasks, onBack, onSelectAgent }: Props) {
  // E key for interaction (handled at top level)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#e8e4dc' }}>
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-sm text-[#8a8580]">Carregando escritório 3D...</div>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [0, 8, 10], fov: 50, near: 0.1, far: 100 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor('#e8e4dc');
            gl.shadowMap.type = 1; // PCFShadowMap
          }}
        >
          <OfficeScene
            agents={agents}
            tasks={tasks}
            onSelectAgent={onSelectAgent}
          />
        </Canvas>
      </Suspense>

      {/* HUD Overlay */}
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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#8a8580]
                          bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-black/5">
              AI Team Office 3D
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="text-[11px] text-[#8a8580] bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-black/5">
            <span className="font-medium">WASD</span> mover&ensp;•&ensp;
            <span className="font-medium">Clique</span> andar&ensp;•&ensp;
            <span className="font-medium">E</span> interagir&ensp;•&ensp;
            <span className="font-medium">ESC</span> sair
          </div>
        </div>
      </div>
    </div>
  );
}
