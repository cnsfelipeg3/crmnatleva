/**
 * Auto Tag Extractor — extracts structured tags from conversation messages
 * Tags follow the format: "category:value"
 */

const DESTINATIONS: Record<string, string[]> = {
  "maldivas": ["maldivas", "maldives"],
  "dubai": ["dubai", "abu dhabi", "emirados"],
  "paris": ["paris", "frança", "france"],
  "orlando": ["orlando", "disney", "universal"],
  "roma": ["roma", "itália", "italia", "rome"],
  "londres": ["londres", "london", "inglaterra"],
  "nova-york": ["nova york", "new york", "nyc", "manhattan"],
  "cancun": ["cancun", "cancún", "riviera maya"],
  "santiago": ["santiago", "chile"],
  "buenos-aires": ["buenos aires", "argentina"],
  "lisboa": ["lisboa", "portugal"],
  "madrid": ["madrid", "espanha"],
  "tokyo": ["tokyo", "tóquio", "japão", "japan"],
  "bali": ["bali", "indonésia"],
  "cairo": ["cairo", "egito", "egypt"],
  "bariloche": ["bariloche"],
  "gramado": ["gramado", "serra gaúcha"],
  "salvador": ["salvador", "bahia"],
  "recife": ["recife", "porto de galinhas"],
  "natal": ["natal"],
  "fortaleza": ["fortaleza", "jericoacoara"],
  "florianopolis": ["florianópolis", "floripa"],
  "bonito": ["bonito"],
  "fernando-de-noronha": ["noronha", "fernando de noronha"],
  "maceio": ["maceió", "maceio"],
  "europa": ["europa", "europe"],
  "asia": ["ásia", "asia"],
  "africa": ["áfrica", "africa"],
  "caribe": ["caribe", "caribbean"],
  "turquia": ["turquia", "istambul", "capadócia"],
  "grecia": ["grécia", "santorini", "mykonos"],
  "tailandia": ["tailândia", "bangkok", "phuket"],
  "marrocos": ["marrocos", "marrakech"],
  "croacia": ["croácia", "dubrovnik"],
  "suica": ["suíça", "zurique", "interlaken"],
  "miami": ["miami", "fort lauderdale"],
  "las-vegas": ["las vegas", "vegas"],
  "punta-cana": ["punta cana", "república dominicana"],
};

const BUDGET_PATTERNS: { pattern: RegExp; tag: string }[] = [
  { pattern: /(?:acima|mais)\s*(?:de|d)\s*(?:r\$\s*)?(\d+)\s*mil/i, tag: "budget:luxo" },
  { pattern: /(?:r\$\s*)?(\d{2,3})\s*(?:mil|k)/i, tag: "" }, // resolved dynamically
  { pattern: /econômic|barato|mais\s*em\s*conta|orçamento\s*apertado/i, tag: "budget:economico" },
  { pattern: /luxo|premium|5\s*estrelas|first\s*class|primeira\s*classe/i, tag: "budget:luxo" },
  { pattern: /intermediári|confort|bom\s*custo|4\s*estrelas/i, tag: "budget:intermediario" },
];

const TRAVELER_PATTERNS: { pattern: RegExp; tag: string }[] = [
  { pattern: /casal(?!\s*com)/i, tag: "travelers:casal" },
  { pattern: /casal\s*com\s*(?:filhos?|crianças?|kids)/i, tag: "travelers:familia" },
  { pattern: /famíli|familia|filhos?|crianças?/i, tag: "travelers:familia" },
  { pattern: /sozinho|solo|mochil/i, tag: "travelers:solo" },
  { pattern: /grupo|amigos|turma|galera/i, tag: "travelers:grupo" },
  { pattern: /lua\s*de\s*mel|honeymoon|recém\s*casad/i, tag: "travelers:lua-de-mel" },
  { pattern: /idoso|melhor\s*idade|aposentad|3ª\s*idade/i, tag: "travelers:melhor-idade" },
];

const INTEREST_PATTERNS: { pattern: RegExp; tag: string }[] = [
  { pattern: /lua\s*de\s*mel|honeymoon/i, tag: "interest:lua-de-mel" },
  { pattern: /aventura|radical|trilha|trekking|mergulho/i, tag: "interest:aventura" },
  { pattern: /relax|descanso|spa|resort|all\s*inclusive/i, tag: "interest:relax" },
  { pattern: /gastronom|culinári|restaurante|comida/i, tag: "interest:gastronomia" },
  { pattern: /cultur|museu|histór|arte|monument/i, tag: "interest:cultura" },
  { pattern: /compras|shopping|outlet/i, tag: "interest:compras" },
  { pattern: /parque|disney|universal|beto\s*carrero/i, tag: "interest:parques" },
  { pattern: /praia|litoral|mar|costa|ilha/i, tag: "interest:praia" },
  { pattern: /ski|neve|inverno|snowboard/i, tag: "interest:neve" },
  { pattern: /safári|safari|savana|vida\s*selvagem/i, tag: "interest:safari" },
  { pattern: /cruzeiro|navio|cruise/i, tag: "interest:cruzeiro" },
  { pattern: /aniversári|bodas|comemoraç|celebraç/i, tag: "interest:celebracao" },
  { pattern: /corporativ|incentivo|evento|congress/i, tag: "interest:corporativo" },
  { pattern: /esportiv|f1|formula|futebol|copa|olimpiad/i, tag: "interest:esportivo" },
];

const URGENCY_PATTERNS: { pattern: RegExp; tag: string }[] = [
  { pattern: /urg|amanhã|semana\s*que\s*vem|próxim[ao]\s*(semana|mês)/i, tag: "urgency:urgente" },
  { pattern: /mês\s*que\s*vem|daqui\s*a?\s*\d+\s*semana/i, tag: "urgency:medio-prazo" },
  { pattern: /planej|pensando|talvez|quem\s*sabe|no\s*futuro|ano\s*que\s*vem/i, tag: "urgency:flexivel" },
  { pattern: /férias\s*de?\s*(julho|janeiro|dezembro)/i, tag: "urgency:sazonal" },
];

export interface ExtractedTags {
  destinos: string[];
  budget: string[];
  travelers: string[];
  interests: string[];
  urgency: string[];
}

export function extractTagsFromMessages(messages: Array<{ content?: string; role?: string; sender_type?: string }>): string[] {
  // Combine all messages into a single text for analysis
  const allText = messages
    .map(m => m.content || "")
    .join(" ")
    .toLowerCase();

  const tags = new Set<string>();

  // Extract destinations
  for (const [dest, keywords] of Object.entries(DESTINATIONS)) {
    if (keywords.some(kw => allText.includes(kw))) {
      tags.add(`destino:${dest}`);
    }
  }

  // Extract budget
  for (const bp of BUDGET_PATTERNS) {
    const match = allText.match(bp.pattern);
    if (match) {
      if (bp.tag) {
        tags.add(bp.tag);
      } else if (match[1]) {
        const value = parseInt(match[1]);
        if (value >= 50) tags.add("budget:luxo");
        else if (value >= 20) tags.add("budget:premium");
        else if (value >= 10) tags.add("budget:intermediario");
        else tags.add("budget:economico");
      }
    }
  }

  // Extract travelers
  for (const tp of TRAVELER_PATTERNS) {
    if (tp.pattern.test(allText)) {
      tags.add(tp.tag);
    }
  }

  // Extract interests
  for (const ip of INTEREST_PATTERNS) {
    if (ip.pattern.test(allText)) {
      tags.add(ip.tag);
    }
  }

  // Extract urgency
  for (const up of URGENCY_PATTERNS) {
    if (up.pattern.test(allText)) {
      tags.add(up.tag);
      break; // only one urgency tag
    }
  }

  return Array.from(tags);
}

export function mergeTagsWithoutDuplicates(existing: string[] | null, newTags: string[]): string[] {
  const merged = new Set(existing || []);
  newTags.forEach(t => merged.add(t));
  return Array.from(merged);
}

export function getTagCategory(tag: string): string {
  const [category] = tag.split(":");
  return category || "outro";
}

export function getTagLabel(tag: string): string {
  const parts = tag.split(":");
  return parts[1] || parts[0];
}

export const TAG_CATEGORY_COLORS: Record<string, string> = {
  destino: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  budget: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  travelers: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interest: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  urgency: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  outro: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};
