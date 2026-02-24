/**
 * Smart name capitalization utility for NatLeva.
 * 
 * Rules:
 * - First letter of each word capitalized
 * - Prepositions (de, da, do, das, dos, e) lowercase in the middle
 * - Preserves accents
 * - Removes extra spaces
 * - Handles hyphenated names (capitalize after hyphen)
 */

const PREPOSITIONS = new Set(["de", "da", "do", "das", "dos", "e"]);

export function smartCapitalizeName(name: string | null | undefined): string {
  if (!name) return "";

  // Trim and collapse multiple spaces
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const words = cleaned.split(" ");

  return words
    .map((word, index) => {
      // Skip empty words
      if (!word) return word;

      // Check if the entire word is a preposition (case-insensitive)
      const lower = word.toLowerCase();

      // Prepositions stay lowercase unless they're the first word
      if (index > 0 && PREPOSITIONS.has(lower)) {
        return lower;
      }

      // Handle hyphenated words: capitalize each part
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => capitalizeWord(part))
          .join("-");
      }

      return capitalizeWord(word);
    })
    .join(" ");
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  // Lowercase everything, then uppercase first char
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Validates a name for common issues.
 * Returns null if valid, or an error message.
 */
export function validateName(name: string): string | null {
  if (!name || name.trim().length < 2) {
    return "Nome deve ter pelo menos 2 caracteres.";
  }

  // Check if entirely uppercase (more than 2 words all caps)
  const words = name.trim().split(/\s+/);
  const allCaps = words.length > 1 && words.every(w => w === w.toUpperCase() && /[A-ZÀ-Ú]/.test(w));
  if (allCaps) {
    return "Nome não pode estar todo em caixa alta. Será corrigido automaticamente.";
  }

  // Check for numbers in name
  if (/\d/.test(name)) {
    return "Nome não deve conter números.";
  }

  return null;
}
