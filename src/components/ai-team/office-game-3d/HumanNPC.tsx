import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';

interface Props {
  agentId: string;
  emoji: string;
  name: string;
  status: string;
  taskCount: number;
  position: [number, number, number];
  isNearby: boolean;
  onClick: () => void;
  showBubble?: boolean;
  onBubbleToggle?: () => void;
  greetingMessage?: string;
  playerPos?: { x: number; z: number };
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#9ca3af',
  analyzing: '#3b82f6',
  suggesting: '#10b981',
  waiting: '#f59e0b',
  alert: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  analyzing: 'Analisando',
  suggesting: 'Sugerindo',
  waiting: 'Esperando',
  alert: 'Alerta',
};

const AGENT_APPEARANCE: Record<string, { skin: string; hair: string; hairStyle: 'short' | 'long' | 'bun' | 'buzz'; shirt: string; pants: string }> = {
  auditor:      { skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'short', shirt: '#1e3a5f', pants: '#2c3e50' },
  estrategista: { skin: '#f5d0a9', hair: '#8b4513', hairStyle: 'long',  shirt: '#2d4a3e', pants: '#34495e' },
  analista:     { skin: '#c68642', hair: '#0a0a0a', hairStyle: 'buzz',  shirt: '#4a6fa5', pants: '#2c3e50' },
  financeiro:   { skin: '#f0d5b0', hair: '#654321', hairStyle: 'short', shirt: '#2e4057', pants: '#1a1a2e' },
  marketing:    { skin: '#deb887', hair: '#d4a017', hairStyle: 'long',  shirt: '#c0392b', pants: '#2c3e50' },
  comercial:    { skin: '#e8c39e', hair: '#3b2f2f', hairStyle: 'short', shirt: '#27ae60', pants: '#34495e' },
  atendimento:  { skin: '#f5cba7', hair: '#a0522d', hairStyle: 'bun',   shirt: '#8e44ad', pants: '#2c3e50' },
  operacional:  { skin: '#c68642', hair: '#1a1a1a', hairStyle: 'buzz',  shirt: '#e67e22', pants: '#2c3e50' },
  inovacao:     { skin: '#deb887', hair: '#2c1810', hairStyle: 'short', shirt: '#2980b9', pants: '#1a252f' },
  gerente:      { skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#1a1a2e', pants: '#1a1a2e' },
};

/* Thought messages per agent + status */
const BUBBLE_THOUGHTS: Record<string, Partial<Record<string, string[]>>> = {
  gerente: {
    idle: ["Tudo sob controle por aqui... revisando o status geral do time. 📋"],
    analyzing: ["Analisando a performance da equipe e cruzando métricas de conversão... 📊", "Revisando prioridades do backlog pra ver o que precisa de atenção..."],
    suggesting: ["Acho que devemos reorganizar as prioridades do módulo de propostas! 💡", "Pensei em redistribuir algumas tarefas entre os agentes..."],
    waiting: ["Esperando aprovação pra seguir com a reorganização... ⏳"],
    alert: ["⚠️ Temos tarefas acumuladas sem decisão há 48h! Preciso de atenção aqui!"],
  },
  auditor: {
    idle: ["Monitorando os processos... tudo limpo por enquanto. ✅"],
    analyzing: ["Escaneando inconsistências nas propostas recentes... 🔍", "Verificando uso da biblioteca de mídia e comparando margens..."],
    suggesting: ["Detectei um padrão automatizável na curadoria de mídia! 🤖", "Sugiro padronizar as descrições dos quartos de hotel."],
    waiting: ["Aguardando validação sobre os fornecedores que identifiquei... ⏳"],
    alert: ["🚨 Fornecedor com 3 confirmações pendentes há mais de 48h!"],
  },
  estrategista: {
    idle: ["Monitorando tendências de mercado... consolidando dados dos últimos 30 dias. 🌍"],
    analyzing: ["Estudando padrões de vendas por sazonalidade... 📈", "Analisando correlação entre qualidade de mídia e taxa de conversão..."],
    suggesting: ["Lua de mel aceita 40% mais upgrades! Deveríamos explorar isso. 💎", "Recomendo reforçar propostas nacionais premium para o Q2."],
    waiting: ["Esperando aprovação para a estratégia de destinos nacionais... ⏳"],
    alert: ["⚠️ Concentração excessiva em destinos europeus! Risco de sazonalidade!"],
  },
  analista: {
    idle: ["Consolidando dados para o próximo relatório... 📋"],
    analyzing: ["Cruzando taxas de conversão com tempo de resposta... 🔬", "Analisando o funil de vendas por etapa..."],
    suggesting: ["Fotos de qualidade aumentam conversão em 25%! Precisamos investir nisso. 📸", "O segmento premium cresceu 12% — bom sinal!"],
    waiting: ["Aguardando validação do relatório para publicar... ⏳"],
    alert: ["📉 Conversão caiu 8% comparada com a semana anterior!"],
  },
  financeiro: {
    idle: ["Monitorando o fluxo de caixa... tudo nos trilhos. 💰"],
    analyzing: ["Calculando margens por destino e fornecedor... 🧮", "Projetando fluxo de caixa para os próximos 30 dias..."],
    suggesting: ["Precisamos revisar markups com margem abaixo de 8%. 📊", "Sugiro renegociação com 3 fornecedores-chave."],
    waiting: ["Aguardando aprovação dos novos markups... ⏳"],
    alert: ["🚨 Caixa negativo projetado em 15 dias! Ação urgente!"],
  },
  marketing: {
    idle: ["Analisando engajamento dos leads recentes... 📱"],
    analyzing: ["Segmentando leads inativos com potencial... 🎯", "Verificando quais destinos estão em alta nas buscas..."],
    suggesting: ["Maldivas está trending (+45%)! Hora de uma campanha! 🏝️", "Temos 340 leads premium para reativação — potencial de R$180k!"],
    waiting: ["Esperando aprovação da campanha de remarketing... ⏳"],
    alert: ["📉 Pipeline de leads caiu 20%! Precisamos reagir!"],
  },
  comercial: {
    idle: ["De olho no pipeline de vendas... 👀"],
    analyzing: ["Calculando probabilidade de fechamento das propostas ativas... 📊", "Analisando tempo médio de decisão dos clientes..."],
    suggesting: ["Temos 5 propostas com score acima de 80%! Follow-up urgente! 🎯", "Follow-up em 24h triplica a chance de fechamento."],
    waiting: ["Aguardando retorno das propostas enviadas... ⏳"],
    alert: ["⚠️ 3 propostas perdendo timing! Cliente premium sem contato há 48h!"],
  },
  atendimento: {
    idle: ["Verificando SLA dos chamados... tudo ok por aqui. ☎️"],
    analyzing: ["Analisando tempo médio de resposta do time... ⏱️", "Verificando padrões nas reclamações recentes..."],
    suggesting: ["3 clientes sem retorno há 48h — precisa de atenção! 📞", "Um template de resposta pode reduzir 30% do tempo de atendimento."],
    waiting: ["Aguardando retorno dos clientes contactados... ⏳"],
    alert: ["🚨 SLA crítico! Clientes esperando resposta além do limite!"],
  },
  operacional: {
    idle: ["Monitorando operações... sistemas rodando normalmente. ⚙️"],
    analyzing: ["Verificando status das reservas e confirmações... 🔄", "Checando integrações com fornecedores..."],
    suggesting: ["Processo de confirmação pode ser automatizado! 🤖", "Sugiro criar alertas automáticos para vencimento de reservas."],
    waiting: ["Aguardando confirmação dos fornecedores... ⏳"],
    alert: ["⚠️ 5 reservas sem confirmação próximas do deadline!"],
  },
  inovacao: {
    idle: ["Pesquisando novas tecnologias e tendências do setor... 🚀"],
    analyzing: ["Avaliando ferramentas de IA para otimizar propostas... 🤖", "Benchmarking com concorrentes digitais..."],
    suggesting: ["IA generativa pode criar roteiros personalizados automaticamente! ✨", "Chatbot inteligente reduziria 40% dos atendimentos repetitivos."],
    waiting: ["Aguardando aprovação do protótipo... ⏳"],
    alert: ["💡 Concorrente lançou feature disruptiva! Precisamos reagir!"],
  },
};

function getAgentThought(agentId: string, status: string): string {
  const bank = BUBBLE_THOUGHTS[agentId]?.[status] || BUBBLE_THOUGHTS[agentId]?.idle || ["Trabalhando... 💭"];
  return bank[Math.floor(Math.random() * bank.length)];
}

/* Typing effect hook */
function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

function SpeechBubble({ agentId, status }: { agentId: string; status: string }) {
  const [thought] = useState(() => getAgentThought(agentId, status));
  const { displayed, done } = useTypingEffect(thought, 25);

  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '220px',
        minWidth: '140px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.06)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{
        fontSize: '10px',
        lineHeight: '1.5',
        color: '#2a2a2a',
        wordBreak: 'break-word',
      }}>
        {displayed}
        {!done && (
          <span style={{
            display: 'inline-block',
            width: '2px',
            height: '12px',
            background: '#3b82f6',
            marginLeft: '1px',
            verticalAlign: 'text-bottom',
            animation: 'blink 0.8s infinite',
          }} />
        )}
      </div>
      {/* Tail / arrow */}
      <div style={{
        position: 'absolute',
        bottom: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid rgba(255,255,255,0.97)',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
      }} />
      <style>{`@keyframes blink { 0%,50% { opacity:1 } 51%,100% { opacity:0 } }`}</style>
    </div>
  );
}

export default function HumanNPC({ agentId, emoji, name, status, taskCount, position, isNearby, onClick, showBubble, onBubbleToggle, greetingMessage, playerPos }: Props) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const color = STATUS_COLORS[status] || '#9ca3af';
  const look = AGENT_APPEARANCE[agentId] || AGENT_APPEARANCE.analista;

  const handleClick = useCallback(() => {
    if (isNearby && onBubbleToggle) {
      onBubbleToggle();
    } else {
      onClick();
    }
  }, [isNearby, onBubbleToggle, onClick]);

  // Get the facing angle from NPC_POSITIONS (default Math.PI = face desk)
  const facingAngle = (position as any).facingY ?? Math.PI;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const offset = position[0] * 2 + position[2];

    groupRef.current.position.y = Math.sin(t * 1.5 + offset) * 0.005; // very subtle bob

    // Turn toward boss when greeting, otherwise face desk
    if (greetingMessage && playerPos) {
      const dx = playerPos.x - position[0];
      const dz = playerPos.z - position[2];
      const targetAngle = Math.atan2(dx, dz);
      const cur = groupRef.current.rotation.y;
      let diff = targetAngle - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.08;
    } else {
      // Face the desk with tiny idle sway
      const sway = status === 'idle' ? Math.sin(t * 0.3 + offset) * 0.03 : Math.sin(t * 0.6 + offset) * 0.06;
      groupRef.current.rotation.y = facingAngle + sway;
    }

    if (ringRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.12;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ground shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.28, 24]} />
          <meshStandardMaterial color="#000" transparent opacity={0.15} />
        </mesh>

        {/* Status glow ring */}
        {status !== 'idle' && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
            <ringGeometry args={[0.3, 0.38, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} transparent opacity={0.4} />
          </mesh>
        )}

        {/* Proximity ring */}
        {isNearby && (
          <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.4, 0.48, 32]} />
            <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.6} transparent opacity={0.35} />
          </mesh>
        )}

        {/* === HUMANOID BODY === */}
        <group onClick={handleClick}>
          {/* Shoes */}
          <mesh position={[-0.055, 0.025, 0.03]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0.055, 0.025, 0.03]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.2} />
          </mesh>

          {/* Legs */}
          <mesh position={[-0.055, 0.18, 0]} castShadow>
            <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
            <meshStandardMaterial color={look.pants} roughness={0.7} />
          </mesh>
          <mesh position={[0.055, 0.18, 0]} castShadow>
            <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
            <meshStandardMaterial color={look.pants} roughness={0.7} />
          </mesh>

          {/* Hips/Belt */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.18, 0.04, 0.1]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
          </mesh>

          {/* Torso */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.18, 6, 12]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} metalness={0.08} />
          </mesh>

          {/* Collar detail */}
          <mesh position={[0, 0.56, 0.06]}>
            <boxGeometry args={[0.06, 0.025, 0.02]} />
            <meshStandardMaterial color={look.shirt} roughness={0.4} />
          </mesh>

          {/* Arms */}
          <mesh position={[-0.14, 0.44, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} />
          </mesh>
          <mesh position={[0.14, 0.44, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} />
          </mesh>

          {/* Hands */}
          <mesh position={[-0.14, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0.14, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.05, 8]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Head */}
          <mesh position={[0, 0.69, 0]} castShadow>
            <sphereGeometry args={[0.085, 16, 14]} />
            <meshStandardMaterial color={look.skin} roughness={0.55} metalness={0.02} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.08, 0.69, 0]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0.08, 0.69, 0]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Eyes — whites */}
          <mesh position={[-0.028, 0.7, 0.075]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshStandardMaterial color="#fff" roughness={0.15} />
          </mesh>
          <mesh position={[0.028, 0.7, 0.075]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshStandardMaterial color="#fff" roughness={0.15} />
          </mesh>
          {/* Pupils */}
          <mesh position={[-0.028, 0.7, 0.087]}>
            <sphereGeometry args={[0.006, 6, 4]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
          </mesh>
          <mesh position={[0.028, 0.7, 0.087]}>
            <sphereGeometry args={[0.006, 6, 4]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, 0.685, 0.085]}>
            <boxGeometry args={[0.015, 0.02, 0.015]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Mouth line */}
          <mesh position={[0, 0.665, 0.08]}>
            <boxGeometry args={[0.025, 0.004, 0.005]} />
            <meshStandardMaterial color="#b5836b" roughness={0.7} />
          </mesh>

          {/* Eyebrows */}
          <mesh position={[-0.028, 0.72, 0.075]}>
            <boxGeometry args={[0.025, 0.005, 0.008]} />
            <meshStandardMaterial color={look.hair} roughness={0.8} />
          </mesh>
          <mesh position={[0.028, 0.72, 0.075]}>
            <boxGeometry args={[0.025, 0.005, 0.008]} />
            <meshStandardMaterial color={look.hair} roughness={0.8} />
          </mesh>

          {/* Hair */}
          {look.hairStyle === 'short' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.082, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.77, 0.02]}>
                <boxGeometry args={[0.14, 0.03, 0.08]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'long' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.09, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.68, -0.05]} castShadow>
                <capsuleGeometry args={[0.06, 0.12, 4, 8]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'bun' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.082, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.8, -0.03]} castShadow>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'buzz' && (
            <mesh position={[0, 0.74, -0.005]} castShadow>
              <sphereGeometry args={[0.084, 12, 10]} />
              <meshStandardMaterial color={look.hair} roughness={0.9} />
            </mesh>
          )}
        </group>

        {/* Speech Bubble (click-triggered) */}
        {showBubble && !greetingMessage && (
          <Html position={[0, 1.35, 0]} center distanceFactor={4} style={{ pointerEvents: 'auto' }}>
            <SpeechBubble agentId={agentId} status={status} />
          </Html>
        )}

        {/* Greeting Bubble (auto-triggered on boss proximity) */}
        {greetingMessage && (
          <Html position={[0, 1.35, 0]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                maxWidth: '220px',
                minWidth: '120px',
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(12px)',
                borderRadius: '14px',
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
                border: '1px solid rgba(201,169,110,0.2)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                animation: 'greetPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{
                fontSize: '10px',
                lineHeight: '1.5',
                color: '#2a2a2a',
                wordBreak: 'break-word',
              }}>
                {greetingMessage}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(255,255,255,0.97)',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
              }} />
            </div>
            <style>{`
              @keyframes greetPop {
                0% { opacity: 0; transform: scale(0.6) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
          </Html>
        )}

        {/* Label */}
        <Html position={[0, 1.0, 0]} center distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '18px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              {emoji}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700, color: '#3a3530',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
              padding: '2px 8px', borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              {name}
            </span>
            {(isNearby || status !== 'idle') && (
              <span style={{
                fontSize: '7px', fontWeight: 600, color: color,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                padding: '1px 6px', borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                ● {STATUS_LABELS[status] || status}
              </span>
            )}
            {taskCount > 0 && (
              <span style={{
                fontSize: '7px', fontWeight: 700, color: '#fff',
                background: '#ef4444', padding: '0 5px', borderRadius: '8px',
                minWidth: '14px', textAlign: 'center',
                boxShadow: '0 1px 3px rgba(239,68,68,0.4)',
              }}>
                {taskCount}
              </span>
            )}
          </div>
        </Html>

        {/* Interaction prompt */}
        {isNearby && !showBubble && (
          <Html position={[0, 1.3, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              fontSize: '10px', fontWeight: 600, color: '#fff',
              background: 'rgba(20,18,15,0.88)', backdropFilter: 'blur(4px)',
              padding: '4px 12px', borderRadius: '10px', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}>
              Toque para perguntar 💬
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
