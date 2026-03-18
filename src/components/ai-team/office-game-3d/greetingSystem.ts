/**
 * Proximity Greeting System
 * Manages cooldowns, phrase selection, and status-aware greetings
 * when the boss (player) approaches NPCs.
 */

export interface GreetingEvent {
  npcId: string;
  message: string;
  timestamp: number;
}

// ── Cooldown tracker ──────────────────────────────
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000; // 30s per NPC
const PROXIMITY_RADIUS = 1.8;

// Track "entered" vs "staying" — only trigger on entry
const wasNearby = new Set<string>();

export function checkProximityGreeting(
  npcId: string,
  npcX: number,
  npcZ: number,
  playerX: number,
  playerZ: number,
  npcStatus?: string,
  npcPerformance?: string,
): GreetingEvent | null {
  const dx = playerX - npcX;
  const dz = playerZ - npcZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const isNear = dist < PROXIMITY_RADIUS;
  const wasNear = wasNearby.has(npcId);

  if (!isNear) {
    wasNearby.delete(npcId);
    return null;
  }

  // Only trigger on ENTRY (not while staying)
  if (wasNear) return null;
  wasNearby.add(npcId);

  // Check cooldown
  const now = Date.now();
  const lastGreet = cooldowns.get(npcId) || 0;
  if (now - lastGreet < COOLDOWN_MS) return null;

  // Fire!
  cooldowns.set(npcId, now);
  const message = pickGreeting(npcStatus, npcPerformance);
  return { npcId, message, timestamp: now };
}

// ── Phrase pool ───────────────────────────────────
const GREETINGS_ENERGY = [
  "Fala chefe!! Hoje é dia de bater meta 🚀",
  "Bora pra cima chefe, o dia tá forte hoje!",
  "Tamo acelerando aqui hein 💪",
  "Chefe no pedaço! Agora é resultado!",
  "Opa chefe! Energia tá lá em cima! ⚡",
  "Eae chefe, bora fazer acontecer!",
  "Show chefe! Hoje tem gol! ⚽",
];

const GREETINGS_CASUAL = [
  "E aí chefe, tudo certo? 😎",
  "Passando pra dar aquela pressão boa? 😂",
  "Tá de olho em nós hoje hein!",
  "Opa! Visita do boss, haha 😄",
  "Salve chefe! Tá tudo rodando liso aqui!",
  "Fala chefe, firmeza? 🤙",
  "Eae chefe! Passou pra conferir o time?",
];

const GREETINGS_COMMERCIAL = [
  "Tô com um cliente quente aqui 🔥",
  "Negociação avançando, já já sai!",
  "Acho que esse aqui vai fechar hoje 👀",
  "Pipeline tá bonito chefe, pode confiar!",
  "Tem lead novo entrando toda hora! 📈",
  "Esse cliente tá praticamente fechado! 💰",
];

const GREETINGS_CLOSING = [
  "Já já sai venda chefe! 💸",
  "Só esperando o sinal do cliente!",
  "Pode preparar o confete! 🎉",
  "Esse aqui é certo, chefe! ✅",
  "Acabei de mandar a proposta final!",
];

const GREETINGS_PRESSURE = [
  "Hoje não pode escapar nenhum lead hein! 😂",
  "Meta não vai bater sozinha não!",
  "Chefe, relaxa que aqui tá voando! ✈️",
  "Pode cobrar que a gente entrega! 💪",
  "A pressão boa tá fazendo efeito haha 😅",
];

const GREETINGS_IDLE = [
  "Já já entro em ação chefe! ⏳",
  "Tô me preparando aqui, calma 😅",
  "Analisando os dados antes de agir...",
  "Um momento, tô organizando as prioridades!",
  "Pode deixar, já tô voltando pro jogo!",
];

const GREETINGS_HIGH_PERF = [
  "Tô voando hoje chefe! Olha os números! 🚀",
  "Batendo meta com folga! 🏆",
  "Tá saindo tudo como planejado! ✨",
  "Sem stress chefe, tá tudo dominado! 😎",
  "Ranking tá bonito né? 😏",
  "Pode contar comigo chefe, tô on fire! 🔥",
];

const GREETINGS_LOW_PERF = [
  "Tô me recuperando chefe, pode confiar 💪",
  "Dia tá difícil, mas não desisto não!",
  "Próxima hora vai ser diferente, prometo!",
  "Calma chefe, tô ajustando a estratégia...",
];

// Track last used indices to avoid immediate repeats
const lastUsedIndex = new Map<string, number>();

function pickRandom(arr: string[], poolKey: string): string {
  let idx: number;
  const lastIdx = lastUsedIndex.get(poolKey) ?? -1;
  do {
    idx = Math.floor(Math.random() * arr.length);
  } while (arr.length > 1 && idx === lastIdx);
  lastUsedIndex.set(poolKey, idx);
  return arr[idx];
}

function pickGreeting(status?: string, performance?: string): string {
  // Priority: performance > status > random
  if (performance === 'low') {
    return pickRandom(GREETINGS_LOW_PERF, 'low');
  }
  if (performance === 'high') {
    // 50% chance high-perf message, 50% contextual
    if (Math.random() < 0.5) return pickRandom(GREETINGS_HIGH_PERF, 'high');
  }

  switch (status) {
    case 'idle':
    case 'waiting':
      return pickRandom(GREETINGS_IDLE, 'idle');
    case 'analyzing':
      return pickRandom([...GREETINGS_CASUAL, ...GREETINGS_PRESSURE], 'analyzing');
    case 'suggesting':
      return pickRandom(GREETINGS_COMMERCIAL, 'commercial');
    case 'alert':
      return pickRandom(GREETINGS_PRESSURE, 'pressure');
    default:
      break;
  }

  // Random pool mix
  const roll = Math.random();
  if (roll < 0.3) return pickRandom(GREETINGS_ENERGY, 'energy');
  if (roll < 0.55) return pickRandom(GREETINGS_CASUAL, 'casual');
  if (roll < 0.75) return pickRandom(GREETINGS_COMMERCIAL, 'comm');
  if (roll < 0.9) return pickRandom(GREETINGS_CLOSING, 'closing');
  return pickRandom(GREETINGS_PRESSURE, 'pressure');
}

// Pick greeting specifically for commercial agents by zone
export function pickCommercialGreeting(zone: string, performance: string): string {
  if (performance === 'low') return pickRandom(GREETINGS_LOW_PERF, 'low');
  if (performance === 'high' && Math.random() < 0.5) return pickRandom(GREETINGS_HIGH_PERF, 'high');

  switch (zone) {
    case 'prospeccao':
      return pickRandom([...GREETINGS_ENERGY, "Leads entrando chefe! 📥", "Volume tá alto hoje! 💪"], 'prosp');
    case 'qualificacao':
      return pickRandom([...GREETINGS_CASUAL, "Analisando o perfil desse cliente... 🔍", "Esse lead tem potencial! 📊"], 'qual');
    case 'negociacao':
      return pickRandom([...GREETINGS_COMMERCIAL, "Tô pressionando o fechamento! 🤝", "Proposta na mesa, chefe! 📋"], 'neg');
    case 'fechamento':
      return pickRandom([...GREETINGS_CLOSING, "Confete pronto chefe! 🎉", "É gol! Quase lá! ⚽"], 'fech');
    case 'lider':
      return pickRandom(["E aí chefe, veio conferir os números? 📊", "Funil tá bonito hoje! 😎", "Time tá performando, pode ficar tranquilo!"], 'lider');
    default:
      return pickRandom(GREETINGS_ENERGY, 'energy');
  }
}
