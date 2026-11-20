import { MedicinalPlant, getHabitatLabel } from '../types';

const WORD_SPLIT_REGEX = /[\s,;.:/()[\]{}"'!?+-]+/;

/**
 * Normalizes Vietnamese text in NFC lowercase while keeping diacritics intact.
 */
function normalizeVietnameseAccented(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Removes Vietnamese accents/diacritics and normalizes string for accent-insensitive searching.
 * Example: "Cà gai leo" -> "ca gai leo", "Đức Bố" -> "duc bo"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedQuery {
  rawTrimmed: string;
  rawAccented: string;
  normFull: string;
  rawTokens: string[];
  normTokens: string[];
  tokenHasDiacritics: boolean[];
  queryHasDiacritics: boolean;
}

function parseQuery(query: string): ParsedQuery | null {
  if (!query || !query.trim()) return null;

  const rawTrimmed = query.trim().toLowerCase().normalize('NFC');
  const rawAccented = normalizeVietnameseAccented(query);
  const normFull = removeVietnameseTones(query);

  const rawTokens = rawAccented.split(WORD_SPLIT_REGEX).filter(Boolean);
  const normTokens = rawTokens.map((t) => removeVietnameseTones(t)).filter(Boolean);

  if (normTokens.length === 0) return null;

  const tokenHasDiacritics = rawTokens.map((t, idx) => t !== normTokens[idx]);
  const queryHasDiacritics = tokenHasDiacritics.some(Boolean);

  return {
    rawTrimmed,
    rawAccented,
    normFull,
    rawTokens,
    normTokens,
    tokenHasDiacritics,
    queryHasDiacritics,
  };
}

interface FieldTokens {
  accWords: string[];
  normWords: string[];
  accJoined: string;
  normJoined: string;
}

function tokenizeField(value?: string): FieldTokens | null {
  if (!value || !value.trim()) return null;
  const accWords = normalizeVietnameseAccented(value).split(WORD_SPLIT_REGEX).filter(Boolean);
  if (accWords.length === 0) return null;
  const normWords = accWords.map((w) => removeVietnameseTones(w));
  return {
    accWords,
    normWords,
    accJoined: accWords.join(' '),
    normJoined: normWords.join(' '),
  };
}

function matchSingleToken(
  accWord: string,
  normWord: string,
  rawTok: string,
  normTok: string,
  hasDiacritic: boolean,
  allowPrefix: boolean
): 'exact_accented' | 'exact_norm' | 'prefix_accented' | 'prefix_norm' | null {
  if (hasDiacritic) {
    if (accWord === rawTok) return 'exact_accented';
    if (allowPrefix && accWord.startsWith(rawTok)) return 'prefix_accented';
    return null;
  }

  if (accWord === rawTok) return 'exact_accented';
  if (normWord === normTok) return 'exact_norm';
  if (allowPrefix && normWord.startsWith(normTok)) return 'prefix_norm';
  return null;
}

/**
 * Scores how well a single text field matches the parsed query.
 * Returns 0 if no match; higher numbers indicate stronger relevance.
 */
function scoreFieldMatch(
  value: string | undefined,
  parsed: ParsedQuery,
  baseWeight: number,
  options: {
    allowPrefixOnLastToken: boolean;
    allowPrefixOnLongTokens?: boolean;
    allowUnorderedTokens: boolean;
    minQueryLength?: number;
  }
): number {
  if (options.minQueryLength && parsed.normFull.length < options.minQueryLength) {
    return 0;
  }

  const field = tokenizeField(value);
  if (!field) return 0;

  const { rawTokens, normTokens, tokenHasDiacritics, queryHasDiacritics } = parsed;
  const tokenCount = normTokens.length;
  const queryAccJoined = rawTokens.join(' ');
  const queryNormJoined = normTokens.join(' ');

  // 1. Exact full field match
  if (field.accJoined === queryAccJoined) {
    return baseWeight + 300;
  }
  if (!queryHasDiacritics && field.normJoined === queryNormJoined) {
    return baseWeight + 260;
  }

  // 2. Contiguous phrase match at word boundaries (start of field or anywhere in field)
  if (field.accWords.length >= tokenCount) {
    for (let start = 0; start <= field.accWords.length - tokenCount; start++) {
      let matched = true;
      let accentedHits = 0;
      let exactHits = 0;

      for (let i = 0; i < tokenCount; i++) {
        const isLast = i === tokenCount - 1;
        const allowPrefix =
          (isLast && options.allowPrefixOnLastToken) ||
          Boolean(options.allowPrefixOnLongTokens && normTokens[i].length >= 4);

        const res = matchSingleToken(
          field.accWords[start + i],
          field.normWords[start + i],
          rawTokens[i],
          normTokens[i],
          tokenHasDiacritics[i],
          allowPrefix
        );

        if (!res) {
          matched = false;
          break;
        }
        if (res === 'exact_accented' || res === 'prefix_accented') accentedHits++;
        if (res === 'exact_accented' || res === 'exact_norm') exactHits++;
      }

      if (matched) {
        const startBonus = start === 0 ? 180 : 110;
        const exactBonus = exactHits === tokenCount ? 40 : 0;
        const accentBonus = Math.round((accentedHits / tokenCount) * 30);
        return baseWeight + startBonus + exactBonus + accentBonus;
      }
    }
  }

  // 3. Unordered multi-token match within the SAME field (all tokens present as distinct words)
  if (options.allowUnorderedTokens && tokenCount > 1) {
    let accentedHits = 0;
    const allMatched = normTokens.every((normTok, i) => {
      const isLast = i === tokenCount - 1;
      const allowPrefix =
        (isLast && options.allowPrefixOnLastToken) ||
        Boolean(options.allowPrefixOnLongTokens && normTok.length >= 4);

      for (let w = 0; w < field.accWords.length; w++) {
        const res = matchSingleToken(
          field.accWords[w],
          field.normWords[w],
          rawTokens[i],
          normTok,
          tokenHasDiacritics[i],
          allowPrefix
        );
        if (res) {
          if (res === 'exact_accented' || res === 'prefix_accented') accentedHits++;
          return true;
        }
      }
      return false;
    });

    if (allMatched) {
      const accentBonus = Math.round((accentedHits / tokenCount) * 20);
      return baseWeight + 50 + accentBonus;
    }
  }

  return 0;
}

function scorePlantIdMatch(plantId: string | undefined, parsed: ParsedQuery): number {
  if (!plantId) return 0;
  const idLower = plantId.trim().toLowerCase();
  const q = parsed.rawTrimmed;

  if (!q) return 0;
  if (idLower === q) return 1150;

  // Match partial IDs only when query explicitly looks like a plant ID (contains digits or starts with herb/ta-herb/loc)
  const looksLikeIdQuery =
    /\d/.test(q) || q.startsWith('ta-herb') || q.startsWith('herb') || q.startsWith('loc');
  if (looksLikeIdQuery && q.length >= 2 && idLower.includes(q)) {
    return 950;
  }

  return 0;
}

/**
 * Computes a relevance score for a medicinal plant against the search query.
 * Returns 0 if the plant does not match.
 */
export function scorePlantSearch(plant: MedicinalPlant, query: string): number {
  const parsed = parseQuery(query);
  if (!parsed) return 1;

  let bestScore = 0;
  const consider = (score: number) => {
    if (score > bestScore) bestScore = score;
  };

  // Tier 1: Primary species identity (Vietnamese name, folk names, scientific taxonomy, ID)
  consider(
    scoreFieldMatch(plant.vietnameseName, parsed, 1000, {
      allowPrefixOnLastToken: true,
      allowPrefixOnLongTokens: true,
      allowUnorderedTokens: true,
    })
  );

  for (const otherName of plant.otherNames || []) {
    consider(
      scoreFieldMatch(otherName, parsed, 900, {
        allowPrefixOnLastToken: true,
        allowPrefixOnLongTokens: true,
        allowUnorderedTokens: true,
      })
    );
  }

  consider(scorePlantIdMatch(plant.id, parsed));

  consider(
    scoreFieldMatch(plant.scientificName, parsed, 800, {
      allowPrefixOnLastToken: true,
      allowPrefixOnLongTokens: true,
      allowUnorderedTokens: true,
    })
  );

  consider(
    scoreFieldMatch(plant.genus, parsed, 760, {
      allowPrefixOnLastToken: true,
      allowPrefixOnLongTokens: true,
      allowUnorderedTokens: false,
    })
  );

  consider(
    scoreFieldMatch(plant.species, parsed, 760, {
      allowPrefixOnLastToken: true,
      allowPrefixOnLongTokens: true,
      allowUnorderedTokens: true,
    })
  );

  consider(
    scoreFieldMatch(plant.family, parsed, 700, {
      allowPrefixOnLastToken: true,
      allowPrefixOnLongTokens: true,
      allowUnorderedTokens: true,
      minQueryLength: 2,
    })
  );

  // Tier 2: Geographic location & habitat
  consider(
    scoreFieldMatch(plant.location?.communeSection, parsed, 520, {
      allowPrefixOnLastToken: parsed.normTokens[parsed.normTokens.length - 1].length >= 2,
      allowUnorderedTokens: false,
      minQueryLength: 2,
    })
  );

  consider(
    scoreFieldMatch(plant.location?.addressDescription, parsed, 460, {
      allowPrefixOnLastToken: parsed.normTokens[parsed.normTokens.length - 1].length >= 2,
      allowUnorderedTokens: false,
      minQueryLength: 2,
    })
  );

  consider(
    scoreFieldMatch(getHabitatLabel(plant.habitatCategory), parsed, 420, {
      allowPrefixOnLastToken: parsed.normTokens[parsed.normTokens.length - 1].length >= 2,
      allowUnorderedTokens: false,
      minQueryLength: 2,
    })
  );

  consider(
    scoreFieldMatch(plant.habitat, parsed, 380, {
      allowPrefixOnLastToken: false,
      allowUnorderedTokens: false,
      minQueryLength: 2,
    })
  );

  // Tier 3: Traditional remedies, parts used, preparation
  for (const remedy of plant.traditionalUses?.folkRemedies || []) {
    consider(
      scoreFieldMatch(remedy, parsed, 340, {
        allowPrefixOnLastToken: false,
        allowUnorderedTokens: true,
        minQueryLength: 2,
      })
    );
  }

  for (const part of plant.traditionalUses?.partUsed || []) {
    consider(
      scoreFieldMatch(part, parsed, 300, {
        allowPrefixOnLastToken: false,
        allowUnorderedTokens: false,
        minQueryLength: 2,
      })
    );
  }

  consider(
    scoreFieldMatch(plant.traditionalUses?.preparation, parsed, 260, {
      allowPrefixOnLastToken: false,
      allowUnorderedTokens: false,
      minQueryLength: 3,
    })
  );

  // Tier 4: Short description (contiguous phrase match only, prevents cross-word noise)
  consider(
    scoreFieldMatch(plant.shortDescription, parsed, 220, {
      allowPrefixOnLastToken: false,
      allowUnorderedTokens: false,
      minQueryLength: 3,
    })
  );

  // Tier 5: Combined Name + Location cross-field match (e.g. "Cà gai leo Đức Bố")
  if (bestScore === 0 && parsed.normTokens.length >= 2) {
    const nameAndLocation = [
      plant.vietnameseName,
      ...(plant.otherNames || []),
      plant.location?.communeSection || '',
      plant.location?.addressDescription || '',
    ]
      .filter(Boolean)
      .join(' ');

    consider(
      scoreFieldMatch(nameAndLocation, parsed, 180, {
        allowPrefixOnLastToken: parsed.normTokens[parsed.normTokens.length - 1].length >= 2,
        allowUnorderedTokens: true,
        minQueryLength: 3,
      })
    );
  }

  return bestScore;
}

/**
 * Checks if a plant matches the search query accurately.
 */
export function matchPlantSearch(plant: MedicinalPlant, query: string): boolean {
  if (!query || !query.trim()) return true;
  return scorePlantSearch(plant, query) > 0;
}

/**
 * Searches and ranks a list of plants based on query relevance.
 * Returns a sorted list with exact and plant-name matches first.
 */
export function searchPlants(plants: MedicinalPlant[], query: string): MedicinalPlant[] {
  if (!query || !query.trim()) return plants;

  return plants
    .map((plant) => ({ plant, score: scorePlantSearch(plant, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.plant.vietnameseName.localeCompare(b.plant.vietnameseName, 'vi');
    })
    .map((entry) => entry.plant);
}
