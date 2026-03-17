import { Suspense, useEffect, useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import OfficeScene from './OfficeScene';
import VirtualJoystick from './VirtualJoystick';
import type { Agent, Task } from '../mockData';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onBack: () => void;
  onSelectAgent: (agent: Agent) => void;
}

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

export default function OfficeGame3DView({ agents, tasks, onBack, onSelectAgent }: Props) {
  const isMobile = useIsMobile();
  const joystickRef = useRef({ x: 0, z: 0 });
  const [joystickInput, setJoystickInput] = useState({ x: 0, z: 0 });

  // E/Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const handleJoystickMove = useCallback((dx: number, dz: number) => {
    joystickRef.current = { x: dx, z: dz };
    setJoystickInput({ x: dx, z: dz });
  }, []);

  const handleJoystickRelease = useCallback(() => {
    joystickRef.current = { x: 0, z: 0 };
    setJoystickInput({ x: 0, z: 0 });
  }, []);

  const dpr = isMobile ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 2);

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#e8e4dc' }}>
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-[#8a8580] font-medium">Carregando escritório 3D...</div>
          </div>
        </div>
      }>
        <Canvas
          shadows
          camera={{
            position: [0, 6, 8],
            fov: isMobile ? 55 : 45,
            near: 0.1,
            far: 60,
          }}
          dpr={dpr}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#e8e4dc');
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = 2; // PCFSoftShadowMap
            gl.toneMapping = 4; // ACESFilmicToneMapping
            gl.toneMappingExposure = 1.1;
          }}
        >
          <OfficeScene
            agents={agents}
            tasks={tasks}
            onSelectAgent={onSelectAgent}
            joystickInput={joystickInput}
          />
        </Canvas>
      </Suspense>

      {/* Mobile joystick */}
      {isMobile && (
        <VirtualJoystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />
      )}

      {/* Interact button for mobile */}
      {isMobile && (
        <div className="absolute bottom-20 right-6 z-50 pointer-events-auto">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/25 flex items-center justify-center">
            <span className="text-xs font-bold text-white/70">TAP</span>
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 text-[10px] sm:text-xs font-medium rounded-full
                       bg-white/80 backdrop-blur-sm border border-black/5 text-[#3a3530]
                       shadow-sm hover:bg-white active:scale-95 transition-all duration-150"
          >
            <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Voltar ao Dashboard</span>
            <span className="sm:hidden">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] sm:text-[10px] font-semibold tracking-wider uppercase text-[#8a8580]
                          bg-white/60 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 rounded-full border border-black/5">
              <span className="hidden sm:inline">AI Team Office 3D</span>
              <span className="sm:hidden">3D Office</span>
            </span>
          </div>
        </div>

        {/* Agent count on mobile */}
        {isMobile && (
          <div className="absolute top-12 left-3 pointer-events-none">
            <span className="text-[9px] font-medium text-[#8a8580] bg-white/50 backdrop-blur-sm px-2 py-1 rounded-full border border-black/5">
              {agents.length} agentes ativos
            </span>
          </div>
        )}

        {/* Bottom hint */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2">
          <div className="text-[9px] sm:text-[11px] text-[#8a8580] bg-white/60 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-black/5">
            {isMobile ? (
              <>
                <span className="font-medium">Joystick</span> mover&ensp;•&ensp;
                <span className="font-medium">Toque</span> interagir
              </>
            ) : (
              <>
                <span className="font-medium">WASD</span> mover&ensp;•&ensp;
                <span className="font-medium">Clique</span> andar&ensp;•&ensp;
                <span className="font-medium">Botão direito</span> rotacionar&ensp;•&ensp;
                <span className="font-medium">E</span> interagir&ensp;•&ensp;
                <span className="font-medium">ESC</span> sair
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
