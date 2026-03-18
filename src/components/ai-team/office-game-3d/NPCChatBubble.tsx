import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Send, X } from 'lucide-react';

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

interface Props {
  agentName: string;
  agentId: string;
  agentRole: string;
  onClose: () => void;
}

export default function NPCChatBubble({ agentName, agentId, agentRole, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Auto-focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => abortRef.current?.abort();
  }, []);

  const handleAsk = useCallback(async () => {
    const q = question.trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setAsked(true);
    setAnswer('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: q,
          agentName,
          agentRole: agentRole,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        setAnswer('Desculpe, não consegui processar sua pergunta. Tente novamente.');
        setIsLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnswer(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      if (!fullText) setAnswer('Hmm, não tenho dados suficientes para responder isso agora. 🤔');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAnswer('Erro de conexão. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading, agentName, agentRole]);

  return (
    <div
      style={{
        width: '280px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.08)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #6c5ce7, #a855f7)',
        color: '#fff',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700 }}>💬 Chat com {agentName}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
            width: '20px', height: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Answer area */}
      {asked && (
        <div style={{
          padding: '10px 12px',
          maxHeight: '120px',
          overflowY: 'auto',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '9px', color: '#6c5ce7', fontWeight: 700, margin: '0 0 4px 0' }}>
            {agentName}:
          </p>
          {isLoading && !answer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#6c5ce7' }} />
              <span style={{ fontSize: '10px', color: '#888' }}>Pensando...</span>
            </div>
          ) : (
            <p style={{
              fontSize: '10px', lineHeight: '1.5', color: '#2a2a2a',
              margin: 0, wordBreak: 'break-word',
            }}>
              {answer}
              {isLoading && (
                <span style={{
                  display: 'inline-block', width: '2px', height: '12px',
                  background: '#6c5ce7', marginLeft: '1px', verticalAlign: 'text-bottom',
                  animation: 'blink 0.8s infinite',
                }} />
              )}
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 10px',
      }}>
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAsk(); } }}
          placeholder="Pergunte algo..."
          disabled={isLoading}
          style={{
            flex: 1, fontSize: '11px', padding: '6px 10px',
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: '10px',
            outline: 'none', background: '#f8f8f8',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); handleAsk(); }}
          disabled={!question.trim() || isLoading}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: question.trim() && !isLoading ? '#6c5ce7' : '#ddd',
            border: 'none', cursor: question.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', transition: 'background 0.2s',
          }}
        >
          <Send size={12} />
        </button>
      </div>

      {/* Tail */}
      <div style={{
        position: 'absolute', bottom: '-8px', left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '8px solid rgba(255,255,255,0.97)',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.08))',
      }} />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes blink { 0%,50% { opacity:1 } 51%,100% { opacity:0 } }
      `}</style>
    </div>
  );
}
