import { MedicinalPlant } from '../types';

/**
 * Removes Vietnamese accents/diacritics and normalizes string for fuzzy/unaccented searching.
 * Example: "Cà gai leo" -> "ca gai leo", "Đức Bố" -> "duc bo"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let clean = str.toLowerCase();
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // replace specific Vietnamese characters like đ
  clean = clean.replace(/[đĐ]/g, 'd');
  // clean up extra whitespaces
  return clean.trim();
}

/**
 * Checks if a plant matches the search query accurately or approximately.
 * Supports:
 * - Exact / substring match
 * - Accent-insensitive Vietnamese matching
 * - Multi-token search (all query terms present in any combination of fields)
 * - Searching by Vietnamese name, other names, scientific name, family, remedy, part used, preparation, habitat, location, and ID.
 */
export function matchPlantSearch(plant: MedicinalPlant, query: string): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim().toLowerCase();
  const normalizedQuery = removeVietnameseTones(rawQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (queryTokens.length === 0) return true;

  // Build comprehensive searchable text from all plant properties
  const plantSearchableTexts = [
    plant.id,
    plant.vietnameseName,
    ...(plant.otherNames || []),
    plant.scientificName,
    plant.family,
    plant.habitat,
    plant.habitatCategory,
    plant.shortDescription || '',
    plant.conservationStatus,
    plant.location?.communeSection || '',
    plant.location?.addressDescription || '',
    plant.traditionalUses?.informantName || '',
    plant.traditionalUses?.informantRole || '',
    plant.traditionalUses?.preparation || '',
    ...(plant.traditionalUses?.folkRemedies || []),
    ...(plant.traditionalUses?.partUsed || []),
    plant.identificationTraits?.growthForm || '',
    plant.identificationTraits?.leaves || '',
    plant.identificationTraits?.flowers || '',
    plant.identificationTraits?.fruits || '',
    plant.identificationTraits?.roots || '',
    plant.dataSource?.surveyor || '',
    plant.dataSource?.title || '',
  ].filter(Boolean);

  const fullRawText = plantSearchableTexts.join(' ').toLowerCase();
  const fullNormalizedText = removeVietnameseTones(fullRawText);

  // 1. Direct raw or normalized substring inclusion (Fast path)
  if (fullRawText.includes(rawQuery) || fullNormalizedText.includes(normalizedQuery)) {
    return true;
  }

  // 2. Token-based matching: Every token in the query must be found in the normalized text
  const allTokensMatch = queryTokens.every((token) => fullNormalizedText.includes(token));
  if (allTokensMatch) {
    return true;
  }

  // 3. Approximate prefix / partial match for individual tokens
  const words = fullNormalizedText.split(/[\s,;./()+-]+/).filter(Boolean);
  const allTokensPartiallyMatch = queryTokens.every((token) => {
    if (token.length <= 2) {
      return fullNormalizedText.includes(token);
    }
    return words.some((w) => w.includes(token) || token.includes(w));
  });

  return allTokensPartiallyMatch;
}

/**
 * Searches and scores a list of plants based on query relevance.
 * Returns sorted list of matching plants.
 */
export function searchPlants(plants: MedicinalPlant[], query: string): MedicinalPlant[] {
  if (!query || !query.trim()) return plants;

  const rawQuery = query.trim().toLowerCase();
  const normQuery = removeVietnameseTones(rawQuery);

  const matched = plants.filter((plant) => matchPlantSearch(plant, query));

  // Sort matched plants by relevance:
  // 1. Exact name match
  // 2. Name starts with query
  // 3. Name contains query
  // 4. Scientific name or family contains query
  // 5. Traditional uses / other fields contain query
  return matched.sort((a, b) => {
    const aNormName = removeVietnameseTones(a.vietnameseName);
    const bNormName = removeVietnameseTones(b.vietnameseName);

    const aExact = aNormName === normQuery;
    const bExact = bNormName === normQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStartsWith = aNormName.startsWith(normQuery);
    const bStartsWith = bNormName.startsWith(normQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    const aIncludes = aNormName.includes(normQuery);
    const bIncludes = bNormName.includes(normQuery);
    if (aIncludes && !bIncludes) return -1;
    if (!aIncludes && bIncludes) return 1;

    return 0;
  });
}
