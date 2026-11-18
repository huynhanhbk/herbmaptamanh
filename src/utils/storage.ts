import { 
  MedicinalPlant, 
  BackupSnapshot, 
  ImportResult, 
  HabitatCategory, 
  UnifiedConservationStatus, 
  ConservationLevel,
  CommuneVillage,
  COMMUNE_VILLAGES,
  PlantOccurrenceStatus,
  PlantMonitoringLog,
  LocationData,
  getHabitatLabel,
  getConservationStatusLabel,
  getPlantSurveyStatus
} from '../types';
import { INITIAL_PLANTS_DATA } from '../data/plants';
import { 
  savePlantToFirestore, 
  deletePlantFromFirestore, 
  batchSavePlantsToFirestore,
} from '../lib/plantSync';
import {
  idbSaveAllPlants,
  idbGetAllPlants,
  idbSaveBackups,
  idbGetAllBackups
} from './idbStorage';

const STORAGE_KEY = 'herbmap_tamanh_plants_v2';
const ADMIN_PASSCODE_KEY = 'herbmap_tamanh_admin_pw';
const BACKUPS_STORAGE_KEY = 'herbmap_tamanh_backups_v1';
const AUTO_BACKUP_ENABLED_KEY = 'herbmap_tamanh_auto_backup_enabled';
const DEFAULT_PASSCODE = 'admin2026';

export const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';

export function isDefaultFallbackImage(url?: string): boolean {
  if (!url || !url.trim()) return true;
  return url.includes('photo-1518531933037-91b2f5f229cc');
}

const INITIAL_PLANTS_BY_ID = new Map<string, MedicinalPlant>(
  INITIAL_PLANTS_DATA.map((p) => [p.id, p])
);

// Active in-memory caches to ensure ultra-fast and complete synchronous access
let inMemoryPlantsCache: MedicinalPlant[] | null = null;
let inMemoryBackupsCache: BackupSnapshot[] | null = null;
let hasHydratedFromIDB = false;
let loadedFromCompactedLocalStorage = false;
let idbPlantsHydrationPromise: Promise<MedicinalPlant[] | null> | null = null;
let idbBackupsHydrationPromise: Promise<BackupSnapshot[] | null> | null = null;

export function hasPendingCompactedFallback(): boolean {
  return loadedFromCompactedLocalStorage && !hasHydratedFromIDB;
}

export function hydratePlantsFromIndexedDB(): Promise<MedicinalPlant[] | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!idbPlantsHydrationPromise) {
    idbPlantsHydrationPromise = idbGetAllPlants()
      .then((idbPlants) => {
        hasHydratedFromIDB = true;
        if (idbPlants && Array.isArray(idbPlants) && idbPlants.length > 0) {
          const migratedIdb = deduplicatePlants(idbPlants.map(migratePlantRecord));
          const merged =
            inMemoryPlantsCache && inMemoryPlantsCache.length > 0
              ? deduplicatePlants(
                  loadedFromCompactedLocalStorage
                    ? [...inMemoryPlantsCache, ...migratedIdb]
                    : [...migratedIdb, ...inMemoryPlantsCache]
                )
              : migratedIdb;
          inMemoryPlantsCache = merged;
          loadedFromCompactedLocalStorage = false;
          return merged;
        }
        return null;
      })
      .catch(() => {
        hasHydratedFromIDB = true;
        return null;
      });
  }
  return idbPlantsHydrationPromise;
}

export function hydrateBackupsFromIndexedDB(): Promise<BackupSnapshot[] | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!idbBackupsHydrationPromise) {
    idbBackupsHydrationPromise = idbGetAllBackups()
      .then((idbBackups) => {
        if (idbBackups && Array.isArray(idbBackups) && idbBackups.length > 0) {
          inMemoryBackupsCache = idbBackups;
          return idbBackups;
        }
        return null;
      })
      .catch(() => null);
  }
  return idbBackupsHydrationPromise;
}

// Kick off background IndexedDB hydration at module load
if (typeof window !== 'undefined') {
  void hydratePlantsFromIndexedDB();
  void hydrateBackupsFromIndexedDB();
}

function migratePlantRecord(p: any): MedicinalPlant {
  let habitatCategory: HabitatCategory = 'garden';
  if (['natural_forest', 'planted_forest', 'shrub_grassland', 'sea', 'garden', 'farmland'].includes(p.habitatCategory)) {
    habitatCategory = p.habitatCategory;
  } else if (p.habitatCategory === 'forest') {
    habitatCategory = 'natural_forest';
  } else if (p.habitatCategory === 'hill') {
    habitatCategory = 'shrub_grassland';
  } else if (p.habitatCategory === 'coastal') {
    habitatCategory = 'sea';
  } else if (p.habitatCategory === 'stream' || p.habitatCategory === 'red') {
    habitatCategory = 'farmland';
  } else {
    const habText = String(p.habitat || '').toLowerCase();
    if (habText.includes('trồng') || habText.includes('keo') || habText.includes('tràm')) habitatCategory = 'planted_forest';
    else if (habText.includes('rừng') || habText.includes('núi') || habText.includes('khe tre')) habitatCategory = 'natural_forest';
    else if (habText.includes('biển') || habText.includes('cát') || habText.includes('cồn')) habitatCategory = 'sea';
    else if (habText.includes('đồi') || habText.includes('bụi') || habText.includes('trảng')) habitatCategory = 'shrub_grassland';
    else if (habText.includes('ruộng') || habText.includes('lúa') || habText.includes('mương')) habitatCategory = 'farmland';
    else habitatCategory = 'garden';
  }

  // Commune village normalization
  let communeSection: string = String(p.location?.communeSection || 'Thôn Đức Bố');
  const matchedVillage = COMMUNE_VILLAGES.find((v) => communeSection.includes(v) || v.includes(communeSection));
  if (matchedVillage) {
    communeSection = matchedVillage;
  } else if (communeSection === 'Tam Anh Bắc') {
    communeSection = 'Thôn Đức Bố';
  } else if (communeSection === 'Tam Anh Nam') {
    communeSection = 'Thôn Diêm Phổ';
  } else if (communeSection === 'Vùng đồi Khe Tre') {
    communeSection = 'Thôn Trà Lý';
  } else if (communeSection === 'Ven sông Trầu') {
    communeSection = 'Thôn Tiên Xuân 2';
  } else if (communeSection === 'Khu vực Đồn Cát') {
    communeSection = 'Thôn Hòa An';
  }

  // 3-state occurrence status normalization: Đã ghi nhận | Biến mất | Điểm mới (Chờ duyệt)
  let occurrenceStatus: PlantOccurrenceStatus = 'present';
  let isDisappeared: boolean = Boolean(p.isDisappeared);
  let conservationStatus: UnifiedConservationStatus = 'Đã ghi nhận';

  const rawStatus = String(p.conservationStatus || p.occurrenceStatus || p.conservationLevel || '').trim();
  if (
    p.isDisappeared ||
    p.occurrenceStatus === 'disappeared' ||
    rawStatus.includes('Biến mất') ||
    rawStatus.includes('Đã biến mất')
  ) {
    occurrenceStatus = 'disappeared';
    isDisappeared = true;
    conservationStatus = 'Biến mất';
  } else if (
    p.status === 'pending' ||
    p.occurrenceStatus === 'new' ||
    rawStatus.includes('Điểm mới') ||
    rawStatus.includes('Chờ duyệt') ||
    rawStatus === 'new'
  ) {
    occurrenceStatus = 'new';
    isDisappeared = false;
    conservationStatus = 'Điểm mới (Chờ duyệt)';
  } else {
    occurrenceStatus = 'present';
    isDisappeared = false;
    conservationStatus = 'Đã ghi nhận';
  }

  const conservationLevel: ConservationLevel = 'safe';

  // Monitoring logs normalization & occurrence status derivation
  let monitoringLogs = Array.isArray(p.monitoringLogs) ? [...p.monitoringLogs] : [];
  if (monitoringLogs.length === 0) {
    const initialDate = p.dataSource?.surveyDate || (p.createdAt ? String(p.createdAt).split('T')[0] : '2026-02-12');
    monitoringLogs = [
      {
        id: `log-init-${p.id || '1'}`,
        date: initialDate,
        status: occurrenceStatus,
        conservationStatus: conservationStatus,
        statusNote: `Ghi nhận khảo sát ban đầu: Hiện trạng thực địa [${conservationStatus}].`,
        surveyor: p.dataSource?.surveyor || 'Nhóm khảo sát thực địa Tam Anh',
        createdAt: p.createdAt || new Date().toISOString(),
        approvalStatus: p.status === 'pending' ? 'pending' : 'approved',
        submittedByRole: p.status === 'pending' ? 'public' : 'admin',
        reviewedBy: p.status === 'pending' ? undefined : (p.dataSource?.verifiedBy || 'Ban Quản trị'),
      }
    ];
  } else {
    // Ensure all logs have normalized approvalStatus & 3-state conservationStatus
    monitoringLogs = monitoringLogs.map((log: PlantMonitoringLog) => {
      const normalizedLogStatus: PlantOccurrenceStatus =
        log.status === 'disappeared' ? 'disappeared' : log.status === 'new' ? 'new' : 'present';
      return {
        ...log,
        status: normalizedLogStatus,
        conservationStatus: getConservationStatusLabel(
          log.conservationStatus,
          normalizedLogStatus === 'disappeared',
          normalizedLogStatus
        ),
        approvalStatus: log.approvalStatus || 'approved',
        submittedByRole: log.submittedByRole || 'admin',
      };
    });
  }

  // Determine current occurrence & survey status strictly from latest APPROVED monitoring log
  const approvedLogs = monitoringLogs.filter(
    (l) => !l.approvalStatus || l.approvalStatus === 'approved'
  );
  const sortedApprovedLogs = [...approvedLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestApprovedLog = sortedApprovedLogs[0];
  if (p.status === 'pending') {
    occurrenceStatus = 'new';
    conservationStatus = 'Điểm mới (Chờ duyệt)';
    isDisappeared = false;
  } else if (latestApprovedLog) {
    occurrenceStatus = latestApprovedLog.status === 'disappeared' ? 'disappeared' : latestApprovedLog.status === 'new' ? 'new' : 'present';
    if (occurrenceStatus === 'disappeared') {
      conservationStatus = 'Biến mất';
      isDisappeared = true;
    } else if (occurrenceStatus === 'new') {
      conservationStatus = 'Điểm mới (Chờ duyệt)';
      isDisappeared = false;
    } else {
      conservationStatus = 'Đã ghi nhận';
      isDisappeared = false;
    }
  }

  const safeId = typeof p.id === 'string' && p.id.trim()
    ? p.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-')
    : 'TA-HERB-001';

  // Preserve & heal coverImage / photos so real images are never lost to DEFAULT_FALLBACK_IMAGE
  const rawPhotos = Array.isArray(p.photos) ? p.photos.filter((ph: any) => ph && typeof ph.url === 'string' && ph.url.trim()) : [];
  let healedCoverImage: string = typeof p.coverImage === 'string' && p.coverImage.trim() ? p.coverImage : '';
  let healedPhotos = rawPhotos;

  const firstRealPhoto = rawPhotos.find((ph: any) => !isDefaultFallbackImage(ph.url));
  if (isDefaultFallbackImage(healedCoverImage) && firstRealPhoto) {
    healedCoverImage = firstRealPhoto.url;
  }

  // If coverImage was reset to generic fallback for an initial catalog record whose original photo is distinct, restore it
  if (isDefaultFallbackImage(healedCoverImage)) {
    const initialMatch = INITIAL_PLANTS_BY_ID.get(safeId);
    const sameSpeciesName =
      initialMatch &&
      String(p.vietnameseName || '').trim().toLowerCase() === initialMatch.vietnameseName.trim().toLowerCase();
    if (initialMatch && sameSpeciesName && !isDefaultFallbackImage(initialMatch.coverImage)) {
      healedCoverImage = initialMatch.coverImage;
      if (healedPhotos.length === 0 || healedPhotos.every((ph: any) => isDefaultFallbackImage(ph.url))) {
        healedPhotos = initialMatch.photos;
      }
    }
  }

  if (!healedCoverImage) {
    healedCoverImage = DEFAULT_FALLBACK_IMAGE;
  }

  const nonDefaultPhotos = healedPhotos.filter((ph: any) => !isDefaultFallbackImage(ph.url));
  if (nonDefaultPhotos.length > 0) {
    healedPhotos = nonDefaultPhotos;
  }

  const cleanedRecord: any = {
    ...p,
    id: safeId,
    coverImage: healedCoverImage,
    photos: healedPhotos,
    habitatCategory,
    conservationStatus,
    conservationLevel,
    occurrenceStatus,
    isDisappeared,
    monitoringLogs,
    location: {
      ...p.location,
      communeSection: communeSection as CommuneVillage
    }
  };
  delete cleanedRecord._compactedForLocalStorage;
  return cleanedRecord as MedicinalPlant;
}

export function deduplicatePlants(plants: MedicinalPlant[]): MedicinalPlant[] {
  const seenMap = new Map<string, MedicinalPlant>();
  
  for (const plant of plants) {
    if (!plant || !plant.id) continue;
    const existing = seenMap.get(plant.id);
    if (!existing) {
      seenMap.set(plant.id, plant);
    } else {
      // Merge duplicate records intelligently, never letting DEFAULT_FALLBACK_IMAGE overwrite a real image
      const mergedPhotosRaw = [...(existing.photos || [])];
      (plant.photos || []).forEach((newPhoto) => {
        if (newPhoto?.url && !mergedPhotosRaw.some((p) => p.url === newPhoto.url)) {
          mergedPhotosRaw.push(newPhoto);
        }
      });

      const nonDefaultPhotos = mergedPhotosRaw.filter((ph) => !isDefaultFallbackImage(ph.url));
      const mergedPhotos = nonDefaultPhotos.length > 0 ? nonDefaultPhotos : mergedPhotosRaw;

      let preferredCover = plant.coverImage;
      if (isDefaultFallbackImage(preferredCover)) {
        if (!isDefaultFallbackImage(existing.coverImage)) {
          preferredCover = existing.coverImage;
        } else if (nonDefaultPhotos.length > 0) {
          preferredCover = nonDefaultPhotos[0].url;
        } else {
          preferredCover = plant.coverImage || existing.coverImage || DEFAULT_FALLBACK_IMAGE;
        }
      }

      const mergedLogs = [...(existing.monitoringLogs || [])];
      (plant.monitoringLogs || []).forEach((newLog) => {
        if (!mergedLogs.some((l) => l.date === newLog.date && l.status === newLog.status)) {
          mergedLogs.push(newLog);
        }
      });

      const merged: MedicinalPlant = {
        ...existing,
        ...plant,
        id: plant.id,
        photos: mergedPhotos,
        monitoringLogs: mergedLogs,
        surveyFrequencyCount: Math.max(existing.surveyFrequencyCount || 1, plant.surveyFrequencyCount || 1),
        coverImage: preferredCover,
        updatedAt: plant.updatedAt || existing.updatedAt || new Date().toISOString(),
      };
      seenMap.set(plant.id, merged);
    }
  }

  return Array.from(seenMap.values());
}

function createCompactPlantsForLocalStorage(plants: MedicinalPlant[]): MedicinalPlant[] {
  return plants.map((p) => {
    const isLargeBase64 = (url?: string) => Boolean(url && url.startsWith('data:') && url.length > 30000);
    
    let coverImage = p.coverImage;
    let wasCompacted = false;
    if (isLargeBase64(coverImage)) {
      coverImage = DEFAULT_FALLBACK_IMAGE;
      wasCompacted = true;
    }

    const photos = (p.photos || []).map((ph) => {
      if (isLargeBase64(ph.url)) {
        wasCompacted = true;
        return {
          ...ph,
          url: DEFAULT_FALLBACK_IMAGE
        };
      }
      return ph;
    });

    const monitoringLogs = (p.monitoringLogs || []).map((log) => {
      if (isLargeBase64(log.evidencePhoto)) {
        wasCompacted = true;
        return { ...log, evidencePhoto: undefined };
      }
      return log;
    });

    const compactPlant: any = {
      ...p,
      coverImage,
      photos,
      monitoringLogs
    };
    if (wasCompacted) {
      compactPlant._compactedForLocalStorage = true;
    }
    return compactPlant as MedicinalPlant;
  });
}

export function getStoredPlants(): MedicinalPlant[] {
  if (inMemoryPlantsCache && inMemoryPlantsCache.length > 0) {
    return inMemoryPlantsCache;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      // Check legacy v1 key and migrate
      const legacyData = localStorage.getItem('herbmap_tamanh_plants_v1');
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrated = deduplicatePlants(parsed.map(migratePlantRecord));
            inMemoryPlantsCache = migrated;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            } catch {}
            return migrated;
          }
        } catch {
          // ignore
        }
      }
      const deduplicatedInitial = deduplicatePlants(INITIAL_PLANTS_DATA);
      inMemoryPlantsCache = deduplicatedInitial;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicatedInitial));
      } catch {}
      return deduplicatedInitial;
    }

    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      if (parsed.some((item: any) => Boolean(item?._compactedForLocalStorage))) {
        loadedFromCompactedLocalStorage = true;
      }
      const migrated = parsed.map(migratePlantRecord);
      const deduplicated = deduplicatePlants(migrated);
      inMemoryPlantsCache = deduplicated;
      // IMPORTANT: Never overwrite IndexedDB here with localStorage data!
      // IndexedDB holds full-fidelity base64 photos that may exceed localStorage's 5MB quota.
      return deduplicated;
    }
    const fallback = deduplicatePlants(INITIAL_PLANTS_DATA);
    inMemoryPlantsCache = fallback;
    return fallback;
  } catch (err) {
    console.warn('Error reading localStorage, using initial data:', err);
    const fallback = deduplicatePlants(INITIAL_PLANTS_DATA);
    inMemoryPlantsCache = fallback;
    return fallback;
  }
}

export function savePlants(plants: MedicinalPlant[]): void {
  try {
    const deduplicated = deduplicatePlants(plants);
    inMemoryPlantsCache = deduplicated;
    loadedFromCompactedLocalStorage = false;
    
    // 1. Asynchronously persist full-fidelity data into IndexedDB (virtually unlimited capacity)
    idbSaveAllPlants(deduplicated).catch((err) => {
      console.warn('IndexedDB save warning:', err);
    });

    // 2. Try saving to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    } catch (quotaErr) {
      console.warn('LocalStorage quota reached. Purging bloated backups and saving compact payload...');
      // Clean up backups from localStorage (they are preserved safely in IndexedDB)
      try {
        localStorage.removeItem(BACKUPS_STORAGE_KEY);
      } catch {}

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
      } catch {
        // Save compact fallback in localStorage ONLY; full-fidelity images remain in memory, IndexedDB, and Firestore
        try {
          const compact = createCompactPlantsForLocalStorage(deduplicated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
        } catch (secondaryErr) {
          console.warn('LocalStorage compact save skipped, persisted safely in IndexedDB and memory.', secondaryErr);
        }
      }
    }
  } catch (err) {
    console.error('Error saving plants:', err);
  }
}

export function isDifferentLocation(loc1?: LocationData, loc2?: LocationData): boolean {
  if (!loc1 || !loc2) return true;
  const lat1 = Number(loc1.lat);
  const lng1 = Number(loc1.lng);
  const lat2 = Number(loc2.lat);
  const lng2 = Number(loc2.lng);
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return true;
  
  const latDiff = Math.abs(lat1 - lat2);
  const lngDiff = Math.abs(lng1 - lng2);
  
  // Approx 15-20 meters threshold
  if (latDiff > 0.00015 || lngDiff > 0.00015) {
    return true;
  }
  
  // Also check if commune village differs
  if (loc1.communeSection && loc2.communeSection && loc1.communeSection !== loc2.communeSection) {
    return true;
  }
  
  return false;
}

export function getNextSpeciesId(currentPlants: MedicinalPlant[]): string {
  let maxNum = 0;
  currentPlants.forEach((p) => {
    const match = (p.id || '').match(/TA-HERB-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  return `TA-HERB-${String(maxNum + 1).padStart(3, '0')}`;
}

export function getNextLocationIdForSpecies(baseSpeciesId: string, currentPlants: MedicinalPlant[]): string {
  const rootId = baseSpeciesId.replace(/-(LOC|P|loc|p)\d+$/i, '').trim();
  let maxLocNum = 1;
  const regex = new RegExp(`^${rootId}-(LOC|P|loc|p)(\\d+)$`, 'i');
  
  currentPlants.forEach((p) => {
    if (p.id === rootId) {
      if (maxLocNum < 1) maxLocNum = 1;
    }
    const match = (p.id || '').match(regex);
    if (match) {
      const num = parseInt(match[2], 10);
      if (!isNaN(num) && num > maxLocNum) {
        maxLocNum = num;
      }
    }
  });

  return `${rootId}-LOC${maxLocNum + 1}`;
}

export function addPlant(
  plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
  explicitSpeciesId?: string
): MedicinalPlant {
  const currentPlants = getStoredPlants();
  const now = new Date().toISOString();
  const isVerifiedOnSubmit = plant.status === 'verified';
  const initialConservationStatus: UnifiedConservationStatus = isVerifiedOnSubmit
    ? 'Đã ghi nhận'
    : 'Điểm mới (Chờ duyệt)';
  const initialOccurrenceStatus: PlantOccurrenceStatus = isVerifiedOnSubmit ? 'present' : 'new';

  // 1. Identify if this survey belongs to an existing species
  let matchedBaseSpecies: MedicinalPlant | undefined;
  const targetId = (explicitSpeciesId || plant.id || '').trim();

  if (targetId) {
    const rootId = targetId.replace(/-(LOC|P|loc|p)\d+$/i, '').trim();
    matchedBaseSpecies = currentPlants.find((p) => p.id === targetId || p.id === rootId);
  }

  if (!matchedBaseSpecies && plant.vietnameseName) {
    const inputName = plant.vietnameseName.trim().toLowerCase();
    const inputSci = (plant.scientificName || '').trim().toLowerCase();
    matchedBaseSpecies = currentPlants.find((p) => {
      const pName = (p.vietnameseName || '').trim().toLowerCase();
      const pSci = (p.scientificName || '').trim().toLowerCase();
      return pName === inputName || (inputSci && inputSci !== 'đang xác minh phân loại học' && pSci === inputSci);
    });
  }

  // 2. CASE: Survey for an EXISTING species in the database
  if (matchedBaseSpecies) {
    const isNewLocation = isDifferentLocation(matchedBaseSpecies.location, plant.location);
    const mustCreateNewPendingPoint = isNewLocation || plant.status === 'pending';

    if (mustCreateNewPendingPoint) {
      // Create a NEW survey location point on the map (pending Admin review -> Điểm mới (Chờ duyệt))
      const newPointId = getNextLocationIdForSpecies(matchedBaseSpecies.id, currentPlants);

      const newSurveyPoint: MedicinalPlant = {
        ...matchedBaseSpecies,
        ...plant,
        id: newPointId,
        vietnameseName: plant.vietnameseName || matchedBaseSpecies.vietnameseName,
        scientificName: plant.scientificName || matchedBaseSpecies.scientificName,
        family: plant.family || matchedBaseSpecies.family,
        genus: plant.genus ?? matchedBaseSpecies.genus,
        species: plant.species ?? matchedBaseSpecies.species,
        location: plant.location || matchedBaseSpecies.location,
        habitat: plant.habitat || matchedBaseSpecies.habitat,
        habitatCategory: plant.habitatCategory || matchedBaseSpecies.habitatCategory,
        coverImage: plant.coverImage || matchedBaseSpecies.coverImage,
        photos: plant.photos && plant.photos.length > 0 ? plant.photos : matchedBaseSpecies.photos,
        dataSource: plant.dataSource || {
          type: 'field_survey_2026',
          title: `Khảo sát điểm mới ${matchedBaseSpecies.vietnameseName}`,
          surveyor: 'Đoàn khảo sát thực địa Tam Anh',
          surveyDate: now.split('T')[0],
        },
        status: plant.status || 'pending',
        conservationStatus: initialConservationStatus,
        conservationLevel: 'safe',
        surveyFrequencyCount: 1,
        occurrenceStatus: initialOccurrenceStatus,
        isDisappeared: false,
        monitoringLogs: [
          {
            id: `log-init-${newPointId}`,
            date: plant.dataSource?.surveyDate || now.split('T')[0],
            status: initialOccurrenceStatus,
            conservationStatus: initialConservationStatus,
            statusNote: `Ghi nhận điểm khảo sát thực địa mới tại ${plant.location?.addressDescription || plant.location?.communeSection || 'xã Tam Anh'}.`,
            surveyor: plant.dataSource?.surveyor || 'Nhóm khảo sát thực địa Tam Anh',
            createdAt: now,
            approvalStatus: isVerifiedOnSubmit ? 'approved' : 'pending',
            submittedByRole: isVerifiedOnSubmit ? 'admin' : 'public',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const updatedList = deduplicatePlants([newSurveyPoint, ...currentPlants]);
      savePlants(updatedList);
      void savePlantToFirestore(newSurveyPoint);
      return newSurveyPoint;
    } else {
      // Same exact location updated directly by verified Admin
      const existingIndex = currentPlants.findIndex((p) => p.id === matchedBaseSpecies!.id);
      const mergedPhotos = [...(matchedBaseSpecies.photos || [])];
      (plant.photos || []).forEach((p) => {
        if (!mergedPhotos.some((mp) => mp.url === p.url)) {
          mergedPhotos.push(p);
        }
      });

      const newLog: PlantMonitoringLog = {
        id: `log-${Date.now()}`,
        date: plant.dataSource?.surveyDate || now.split('T')[0],
        status: 'present',
        conservationStatus: 'Đã ghi nhận',
        statusNote: `Khảo sát định kỳ ghi nhận cây vẫn phát triển tốt tại ${plant.location?.addressDescription || 'vị trí ban đầu'}.`,
        surveyor: plant.dataSource?.surveyor || 'Nhóm khảo sát thực địa Tam Anh',
        createdAt: now,
        approvalStatus: 'approved',
        submittedByRole: 'admin',
      };

      const existingLogs = Array.isArray(matchedBaseSpecies.monitoringLogs) ? matchedBaseSpecies.monitoringLogs : [];

      const updatedExistingPlant: MedicinalPlant = {
        ...matchedBaseSpecies,
        ...plant,
        id: matchedBaseSpecies.id,
        photos: mergedPhotos,
        coverImage: plant.coverImage || matchedBaseSpecies.coverImage,
        location: plant.location || matchedBaseSpecies.location,
        habitat: plant.habitat || matchedBaseSpecies.habitat,
        habitatCategory: plant.habitatCategory || matchedBaseSpecies.habitatCategory,
        status: plant.status || matchedBaseSpecies.status,
        conservationStatus: 'Đã ghi nhận',
        conservationLevel: 'safe',
        occurrenceStatus: 'present',
        surveyFrequencyCount: (matchedBaseSpecies.surveyFrequencyCount || 1) + 1,
        monitoringLogs: [newLog, ...existingLogs],
        updatedAt: now,
      };

      currentPlants[existingIndex] = updatedExistingPlant;
      const updatedList = deduplicatePlants(currentPlants);
      savePlants(updatedList);
      void savePlantToFirestore(updatedExistingPlant);
      return updatedExistingPlant;
    }
  }

  // 3. CASE: Brand NEW species
  const newSpeciesId = getNextSpeciesId(currentPlants);
  const newPlant: MedicinalPlant = {
    ...plant,
    id: newSpeciesId,
    status: plant.status || 'pending',
    conservationStatus: initialConservationStatus,
    conservationLevel: 'safe',
    surveyFrequencyCount: 1,
    occurrenceStatus: initialOccurrenceStatus,
    isDisappeared: false,
    monitoringLogs: [
      {
        id: `log-init-${newSpeciesId}`,
        date: plant.dataSource?.surveyDate || now.split('T')[0],
        status: initialOccurrenceStatus,
        conservationStatus: initialConservationStatus,
        statusNote: `Khảo sát phát hiện mới loài cây thuốc tại ${plant.location?.addressDescription || plant.location?.communeSection || 'xã Tam Anh'}.`,
        surveyor: plant.dataSource?.surveyor || 'Nhóm nghiên cứu KHKT Tam Anh',
        createdAt: now,
        approvalStatus: isVerifiedOnSubmit ? 'approved' : 'pending',
        submittedByRole: isVerifiedOnSubmit ? 'admin' : 'public',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = deduplicatePlants([newPlant, ...currentPlants]);
  savePlants(updatedList);
  void savePlantToFirestore(newPlant);
  return newPlant;
}

export function saveNewPlant(
  plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
  explicitSpeciesId?: string
): MedicinalPlant[] {
  addPlant(plant, explicitSpeciesId);
  return getStoredPlants();
}

export function updatePlantStatus(id: string, status: 'verified' | 'pending'): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const target = currentPlants.find((p) => p.id === id);
  if (!target) return currentPlants;

  const now = new Date().toISOString();
  if (status === 'verified') {
    const existingLogs = Array.isArray(target.monitoringLogs) ? target.monitoringLogs : [];
    const updatedLogs: PlantMonitoringLog[] = existingLogs.map((log) =>
      log.approvalStatus === 'pending' && log.status === 'new'
        ? {
            ...log,
            status: 'present' as PlantOccurrenceStatus,
            conservationStatus: 'Đã ghi nhận' as UnifiedConservationStatus,
            approvalStatus: 'approved' as const,
            reviewedBy: 'Ban Quản trị (Admin)',
            reviewedAt: now,
          }
        : log
    );

    updatePlant(id, {
      status: 'verified',
      conservationStatus: 'Đã ghi nhận',
      occurrenceStatus: 'present',
      conservationLevel: 'safe',
      isDisappeared: false,
      monitoringLogs: updatedLogs,
      dataSource: {
        ...target.dataSource,
        verifiedBy: target.dataSource.verifiedBy || 'Ban Quản trị HerbMap Tam Anh',
      },
    });
  } else {
    updatePlant(id, {
      status: 'pending',
      conservationStatus: 'Điểm mới (Chờ duyệt)',
      occurrenceStatus: 'new',
      conservationLevel: 'safe',
      isDisappeared: false,
    });
  }
  return getStoredPlants();
}

export function saveUpdatedPlant(
  idOrPlant: string | MedicinalPlant,
  updates?: Partial<MedicinalPlant>
): MedicinalPlant[] {
  if (typeof idOrPlant === 'string') {
    updatePlant(idOrPlant, updates || {});
  } else {
    updatePlant(idOrPlant.id, idOrPlant);
  }
  return getStoredPlants();
}

export function deletePlant(id: string): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const filtered = currentPlants.filter((p) => p.id !== id);
  if (filtered.length !== currentPlants.length) {
    savePlants(filtered);
    deletePlantFromFirestore(id);
  }
  return getStoredPlants();
}

export function resolvePlantOccurrenceStatus(
  logs?: PlantMonitoringLog[],
  fallbackOccurrence: PlantOccurrenceStatus = 'present',
  fallbackDisappeared: boolean = false,
  fallbackConservationStatus?: string
): { 
  occurrenceStatus: PlantOccurrenceStatus; 
  isDisappeared: boolean; 
  conservationStatus: UnifiedConservationStatus;
  conservationLevel: ConservationLevel;
  latestApprovedLog?: PlantMonitoringLog 
} {
  const existingLogs = Array.isArray(logs) ? [...logs] : [];
  const approvedLogs = existingLogs.filter(
    (l) => !l.approvalStatus || l.approvalStatus === 'approved'
  );

  const initialConservationStatus: UnifiedConservationStatus = getConservationStatusLabel(
    fallbackConservationStatus,
    fallbackDisappeared,
    fallbackOccurrence
  );
  const initialConservationLevel: ConservationLevel = 'safe';

  if (approvedLogs.length === 0) {
    const isDisappeared =
      fallbackDisappeared ||
      fallbackOccurrence === 'disappeared' ||
      initialConservationStatus === 'Biến mất';
    const occurrenceStatus: PlantOccurrenceStatus = isDisappeared
      ? 'disappeared'
      : initialConservationStatus === 'Điểm mới (Chờ duyệt)'
      ? 'new'
      : 'present';
    return {
      occurrenceStatus,
      isDisappeared,
      conservationStatus: isDisappeared ? 'Biến mất' : initialConservationStatus,
      conservationLevel: initialConservationLevel,
    };
  }

  // Sort approved logs by date DESC, then createdAt DESC
  approvedLogs.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createB - createA;
  });

  const latestApprovedLog = approvedLogs[0];
  const occurrenceStatus: PlantOccurrenceStatus =
    latestApprovedLog.status === 'disappeared'
      ? 'disappeared'
      : latestApprovedLog.status === 'new'
      ? 'new'
      : 'present';
  const isDisappeared = occurrenceStatus === 'disappeared';

  let conservationStatus: UnifiedConservationStatus = 'Đã ghi nhận';
  const conservationLevel: ConservationLevel = 'safe';

  if (isDisappeared) {
    conservationStatus = 'Biến mất';
  } else if (occurrenceStatus === 'new') {
    conservationStatus = 'Điểm mới (Chờ duyệt)';
  } else {
    conservationStatus = 'Đã ghi nhận';
  }

  return {
    occurrenceStatus,
    isDisappeared,
    conservationStatus,
    conservationLevel,
    latestApprovedLog,
  };
}

export function addPlantMonitoringLog(
  plantId: string,
  logData: Omit<PlantMonitoringLog, 'id' | 'createdAt'>,
  isAdmin: boolean = false
): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === plantId);
  if (index === -1) return currentPlants;

  const plant = currentPlants[index];
  const now = new Date().toISOString();

  const normalizedStatus: PlantOccurrenceStatus =
    logData.status === 'disappeared' ? 'disappeared' : logData.status === 'new' ? 'new' : 'present';

  // Determine survey occurrence status for this log (3 states)
  const logConservationStatus: UnifiedConservationStatus =
    logData.conservationStatus ||
    (normalizedStatus === 'disappeared'
      ? 'Biến mất'
      : normalizedStatus === 'new'
      ? 'Điểm mới (Chờ duyệt)'
      : 'Đã ghi nhận');

  const newLog: PlantMonitoringLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: logData.date,
    status: normalizedStatus,
    conservationStatus: logConservationStatus,
    statusNote: logData.statusNote,
    surveyor: logData.surveyor,
    contactPhone: logData.contactPhone,
    evidencePhoto: logData.evidencePhoto,
    createdAt: now,
    approvalStatus: isAdmin ? 'approved' : 'pending',
    submittedByRole: isAdmin ? 'admin' : 'public',
    reviewedBy: isAdmin ? 'Ban Quản trị (Admin)' : undefined,
    reviewedAt: isAdmin ? now : undefined,
  };

  const existingLogs = Array.isArray(plant.monitoringLogs) ? [...plant.monitoringLogs] : [];
  const updatedLogs = [newLog, ...existingLogs];

  const resolved = resolvePlantOccurrenceStatus(
    updatedLogs,
    plant.occurrenceStatus,
    plant.isDisappeared,
    plant.conservationStatus
  );

  const updatedPlant: MedicinalPlant = {
    ...plant,
    occurrenceStatus: resolved.occurrenceStatus,
    isDisappeared: resolved.isDisappeared,
    conservationStatus: resolved.conservationStatus,
    conservationLevel: resolved.conservationLevel,
    monitoringLogs: updatedLogs,
    updatedAt: now,
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  void savePlantToFirestore(updatedPlant);

  return getStoredPlants();
}

export function approvePlantMonitoringLog(
  plantId: string,
  logId: string,
  reviewerName: string = 'Ban Quản trị (Admin)'
): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === plantId);
  if (index === -1) return currentPlants;

  const plant = currentPlants[index];
  const now = new Date().toISOString();
  const existingLogs = Array.isArray(plant.monitoringLogs) ? [...plant.monitoringLogs] : [];

  const updatedLogs = existingLogs.map((log) => {
    if (log.id === logId) {
      return {
        ...log,
        approvalStatus: 'approved' as const,
        reviewedBy: reviewerName,
        reviewedAt: now,
      };
    }
    return log;
  });

  const resolved = resolvePlantOccurrenceStatus(
    updatedLogs,
    plant.occurrenceStatus,
    plant.isDisappeared,
    plant.conservationStatus
  );

  const updatedPlant: MedicinalPlant = {
    ...plant,
    occurrenceStatus: resolved.occurrenceStatus,
    isDisappeared: resolved.isDisappeared,
    conservationStatus: resolved.conservationStatus,
    conservationLevel: resolved.conservationLevel,
    monitoringLogs: updatedLogs,
    updatedAt: now,
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  void savePlantToFirestore(updatedPlant);
  return getStoredPlants();
}

export function rejectPlantMonitoringLog(
  plantId: string,
  logId: string,
  rejectionReason?: string
): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === plantId);
  if (index === -1) return currentPlants;

  const plant = currentPlants[index];
  const now = new Date().toISOString();
  const existingLogs = Array.isArray(plant.monitoringLogs) ? [...plant.monitoringLogs] : [];
  const finalReason = rejectionReason || 'Không đủ căn cứ hoặc hình ảnh không khớp thực địa';

  const updatedLogs = existingLogs.map((log) => {
    if (log.id === logId) {
      return {
        ...log,
        approvalStatus: 'rejected' as const,
        rejectionReason: finalReason,
        reviewedAt: now,
      };
    }
    return log;
  });

  const resolved = resolvePlantOccurrenceStatus(
    updatedLogs,
    plant.occurrenceStatus,
    plant.isDisappeared,
    plant.conservationStatus
  );

  const updatedPlant: MedicinalPlant = {
    ...plant,
    occurrenceStatus: resolved.occurrenceStatus,
    isDisappeared: resolved.isDisappeared,
    conservationStatus: resolved.conservationStatus,
    conservationLevel: resolved.conservationLevel,
    monitoringLogs: updatedLogs,
    updatedAt: now,
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  void savePlantToFirestore(updatedPlant);
  return getStoredPlants();
}

export function deletePlantMonitoringLog(
  plantId: string,
  logId: string
): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === plantId);
  if (index === -1) return currentPlants;

  const plant = currentPlants[index];
  const existingLogs = Array.isArray(plant.monitoringLogs) ? [...plant.monitoringLogs] : [];
  const updatedLogs = existingLogs.filter((log) => log.id !== logId);

  const resolved = resolvePlantOccurrenceStatus(
    updatedLogs,
    'present',
    false,
    plant.conservationStatus
  );

  const updatedPlant: MedicinalPlant = {
    ...plant,
    occurrenceStatus: resolved.occurrenceStatus,
    isDisappeared: resolved.isDisappeared,
    conservationStatus: resolved.conservationStatus,
    conservationLevel: resolved.conservationLevel,
    monitoringLogs: updatedLogs,
    updatedAt: new Date().toISOString(),
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  void savePlantToFirestore(updatedPlant);
  return getStoredPlants();
}

export interface PendingMonitoringLogItem {
  plantId: string;
  plantName: string;
  plantScientificName: string;
  plant: MedicinalPlant;
  log: PlantMonitoringLog;
}

export function getAllPendingMonitoringLogs(
  plantsList?: MedicinalPlant[]
): PendingMonitoringLogItem[] {
  const plants = plantsList || getStoredPlants();
  const list: PendingMonitoringLogItem[] = [];

  plants.forEach((plant) => {
    if (plant.status !== 'verified') return;

    (plant.monitoringLogs || []).forEach((log) => {
      if (log.approvalStatus === 'pending' && !String(log.id || '').startsWith('log-init-')) {
        list.push({
          plantId: plant.id,
          plantName: plant.vietnameseName,
          plantScientificName: plant.scientificName,
          plant,
          log,
        });
      }
    });
  });

  return list.sort((a, b) => new Date(b.log.createdAt).getTime() - new Date(a.log.createdAt).getTime());
}

export function updatePlant(id: string, updates: Partial<MedicinalPlant>): MedicinalPlant | null {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = currentPlants[index];
  const now = new Date().toISOString();

  // Normalize requested survey occurrence status (3 states: Đã ghi nhận | Biến mất | Điểm mới (Chờ duyệt))
  let reqConservationStatus: UnifiedConservationStatus = 'Đã ghi nhận';
  if (updates.conservationStatus) {
    reqConservationStatus = getConservationStatusLabel(updates.conservationStatus, updates.isDisappeared, updates.occurrenceStatus);
  } else if (updates.isDisappeared || updates.occurrenceStatus === 'disappeared') {
    reqConservationStatus = 'Biến mất';
  } else if (updates.occurrenceStatus === 'new') {
    reqConservationStatus = 'Điểm mới (Chờ duyệt)';
  } else {
    reqConservationStatus = getConservationStatusLabel(current.conservationStatus, current.isDisappeared, current.occurrenceStatus);
  }

  let occurrenceStatus: PlantOccurrenceStatus =
    reqConservationStatus === 'Biến mất'
      ? 'disappeared'
      : reqConservationStatus === 'Điểm mới (Chờ duyệt)'
      ? 'new'
      : 'present';
  const isDisappeared: boolean = reqConservationStatus === 'Biến mất' || occurrenceStatus === 'disappeared';
  const conservationLevel: ConservationLevel = 'safe';

  // Ensure occurrenceStatus is aligned with conservation status
  if (reqConservationStatus === 'Điểm mới (Chờ duyệt)' && !isDisappeared) {
    occurrenceStatus = 'new';
  }

  // Synchronize coverImage and photos gallery
  const newCoverImage = updates.coverImage !== undefined ? updates.coverImage : current.coverImage;
  let photos = updates.photos ? [...updates.photos] : (current.photos ? [...current.photos] : []);
  if (newCoverImage && newCoverImage !== current.coverImage) {
    if (photos.length > 0) {
      photos = [{ ...photos[0], url: newCoverImage }, ...photos.slice(1)];
    } else {
      photos = [{
        id: `photo-${id}-${Date.now()}`,
        url: newCoverImage,
        caption: `Mẫu thực địa ${updates.vietnameseName || current.vietnameseName}`,
        type: 'whole'
      }];
    }
  }

  let monitoringLogs = updates.monitoringLogs 
    ? [...updates.monitoringLogs] 
    : (Array.isArray(current.monitoringLogs) ? [...current.monitoringLogs] : []);

  // Check if status changed by admin edit to record an approved log entry if appropriate
  const statusChanged = reqConservationStatus !== current.conservationStatus || occurrenceStatus !== current.occurrenceStatus;

  if (statusChanged) {
    const statusNote = reqConservationStatus === 'Biến mất'
      ? 'Quản trị viên cập nhật: Điểm cây thuốc đã biến mất tại vị trí khảo sát.'
      : reqConservationStatus === 'Điểm mới (Chờ duyệt)'
      ? 'Quản trị viên cập nhật: Điểm mới (Chờ duyệt) ngoài thực địa.'
      : 'Quản trị viên cập nhật: Đã ghi nhận hiện diện thực địa.';

    const adminLog: PlantMonitoringLog = {
      id: `log-admin-${Date.now()}`,
      date: now.split('T')[0],
      status: occurrenceStatus,
      conservationStatus: reqConservationStatus,
      statusNote: statusNote,
      surveyor: (updates.dataSource?.surveyor || current.dataSource?.surveyor || 'Ban Quản trị HerbMap Tam Anh'),
      createdAt: now,
      approvalStatus: 'approved',
      submittedByRole: 'admin',
      reviewedBy: 'Ban Quản trị (Admin)',
      reviewedAt: now,
    };
    monitoringLogs = [adminLog, ...monitoringLogs];
  }

  const updatedPlant: MedicinalPlant = {
    ...current,
    ...updates,
    photos,
    coverImage: newCoverImage,
    conservationStatus: reqConservationStatus,
    conservationLevel,
    occurrenceStatus,
    isDisappeared,
    monitoringLogs,
    updatedAt: now,
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  void savePlantToFirestore(updatedPlant);
  return updatedPlant;
}

export function resetToDefaultData(): MedicinalPlant[] {
  const initialCopy = deduplicatePlants(INITIAL_PLANTS_DATA.map(migratePlantRecord));
  savePlants(initialCopy);
  void batchSavePlantsToFirestore(initialCopy);
  return initialCopy;
}

export function verifyAdminPasscode(inputCode: string): boolean {
  const saved = localStorage.getItem(ADMIN_PASSCODE_KEY);
  if (!saved || saved === 'tamanh2026') {
    localStorage.setItem(ADMIN_PASSCODE_KEY, DEFAULT_PASSCODE);
    return inputCode.trim() === DEFAULT_PASSCODE;
  }
  return inputCode.trim() === saved || inputCode.trim() === DEFAULT_PASSCODE;
}

export function exportPlantsAsJSON(plantsList?: MedicinalPlant[]): void {
  const plants = plantsList || getStoredPlants();
  const jsonStr = JSON.stringify(plants, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tam_anh_medicinal_plants_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPlantsAsCSV(plantsList?: MedicinalPlant[]): void {
  const plants = plantsList || getStoredPlants();
  const headers = [
    'Mã định danh (ID)',
    'Tên cây thuốc',
    'Tên khoa học',
    'Họ thực vật',
    'Sinh cảnh',
    'Vĩ độ (Lat)',
    'Kinh độ (Lng)',
    'Khu vực Tam Anh',
    'Hiện trạng thực địa',
    'Công dụng dân gian',
    'Bộ phận dùng',
    'Cách chế biến',
    'Người cung cấp tư liệu',
    'Trạng thái kiểm duyệt',
    'Ngày ghi nhận',
    'Ảnh đại diện',
  ];

  const rows = plants.map((p) => {
    const statusMeta = getPlantSurveyStatus(p);
    return [
      `"${p.id}"`,
      `"${p.vietnameseName.replace(/"/g, '""')}"`,
      `"${p.scientificName.replace(/"/g, '""')}"`,
      `"${p.family.replace(/"/g, '""')}"`,
      `"${p.habitat.replace(/"/g, '""')}"`,
      p.location.lat,
      p.location.lng,
      `"${p.location.communeSection}"`,
      `"${statusMeta.label}"`,
      `"${(p.traditionalUses.folkRemedies || []).join('; ').replace(/"/g, '""')}"`,
      `"${(p.traditionalUses.partUsed || []).join('; ').replace(/"/g, '""')}"`,
      `"${(p.traditionalUses.preparation || '').replace(/"/g, '""')}"`,
      `"${(p.traditionalUses.informantName || '').replace(/"/g, '""')}"`,
      `"${p.status === 'verified' ? 'Đã xác nhận' : 'Chờ duyệt'}"`,
      `"${p.dataSource?.surveyDate || ''}"`,
      `"${(p.coverImage || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tam_anh_cay_thuoc_bang_tinh_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// NORMALIZE HELPER FOR ROBUST IMPORT
// ----------------------------------------------------
function normalizeImportedPlant(raw: any, indexFallback: number): MedicinalPlant {
  const rawId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `TA-HERB-${String(indexFallback + 1).padStart(3, '0')}`;
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const vietnameseName = String(raw.vietnameseName || raw['Tên cây thuốc'] || raw.name || 'Cây thuốc chưa đặt tên').trim();
  const scientificName = String(raw.scientificName || raw['Tên khoa học'] || 'Đang xác minh phân loại học').trim();
  const family = String(raw.family || raw['Họ thực vật'] || 'Chưa phân loại').trim();
  const otherNames = Array.isArray(raw.otherNames) ? raw.otherNames : (raw.otherNames ? String(raw.otherNames).split(',').map((s: string) => s.trim()) : []);
  
  const coverImage = String(raw.coverImage || raw['Ảnh đại diện'] || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80').trim();
  
  let photos = Array.isArray(raw.photos) ? raw.photos : [];
  if (photos.length === 0) {
    photos = [{
      id: `photo-${id}`,
      url: coverImage,
      caption: `Mẫu thực địa ${vietnameseName}`,
      type: 'whole'
    }];
  }

  const shortDescription = String(raw.shortDescription || raw.description || `Cây thuốc ${vietnameseName} ghi nhận tại thực địa xã Tam Anh.`);

  const identificationTraits = raw.identificationTraits || {
    growthForm: 'Cây thảo / cây bụi tự nhiên.',
    leaves: 'Đặc điểm lá mọc tự nhiên.',
    flowers: 'Đặc điểm hoa dược liệu.',
    fruits: 'Quả tự nhiên.',
    roots: 'Bộ phận rễ củ.'
  };

  const habitat = String(raw.habitat || raw['Sinh cảnh'] || 'Bờ rào & nương đồi ven làng').trim();
  
  // Habitat Category mapping
  let habitatCategory: HabitatCategory = 'garden';
  if (raw.habitatCategory && ['natural_forest', 'planted_forest', 'shrub_grassland', 'sea', 'garden', 'farmland'].includes(raw.habitatCategory)) {
    habitatCategory = raw.habitatCategory;
  } else if (raw.habitatCategory === 'forest') {
    habitatCategory = 'natural_forest';
  } else if (raw.habitatCategory === 'hill') {
    habitatCategory = 'shrub_grassland';
  } else if (raw.habitatCategory === 'coastal') {
    habitatCategory = 'sea';
  } else if (raw.habitatCategory === 'stream' || raw.habitatCategory === 'red') {
    habitatCategory = 'farmland';
  } else {
    const habLower = habitat.toLowerCase();
    if (habLower.includes('trồng') || habLower.includes('keo') || habLower.includes('tràm')) habitatCategory = 'planted_forest';
    else if (habLower.includes('rừng') || habLower.includes('núi') || habLower.includes('khe tre')) habitatCategory = 'natural_forest';
    else if (habLower.includes('biển') || habLower.includes('cát') || habLower.includes('cồn')) habitatCategory = 'sea';
    else if (habLower.includes('đồi') || habLower.includes('bụi') || habLower.includes('trảng') || habLower.includes('núi chúa')) habitatCategory = 'shrub_grassland';
    else if (habLower.includes('ruộng') || habLower.includes('lúa') || habLower.includes('mương') || habLower.includes('suối')) habitatCategory = 'farmland';
    else habitatCategory = 'garden';
  }

  // Location mapping
  const lat = typeof raw.location?.lat === 'number' ? raw.location.lat : parseFloat(raw.lat || raw['Vĩ độ (Lat)'] || raw['Vĩ độ'] || '15.4635');
  const lng = typeof raw.location?.lng === 'number' ? raw.location.lng : parseFloat(raw.lng || raw['Kinh độ (Lng)'] || raw['Kinh độ'] || '108.6185');
  const addressDescription = String(raw.location?.addressDescription || raw.addressDescription || raw['Mô tả địa chỉ'] || 'Xã Tam Anh, Núi Thành, Quảng Nam');
  
  let communeSection: string = String(raw.location?.communeSection || raw.communeSection || raw['Khu vực Tam Anh'] || raw['Khu vực'] || raw['Thôn'] || 'Thôn Đức Bố');
  const matchedVillage = COMMUNE_VILLAGES.find((v) => communeSection.includes(v) || v.includes(communeSection));
  if (matchedVillage) {
    communeSection = matchedVillage;
  } else if (communeSection === 'Tam Anh Bắc') {
    communeSection = 'Thôn Đức Bố';
  } else if (communeSection === 'Tam Anh Nam') {
    communeSection = 'Thôn Diêm Phổ';
  } else if (communeSection === 'Vùng đồi Khe Tre') {
    communeSection = 'Thôn Trà Lý';
  } else if (communeSection === 'Ven sông Trầu') {
    communeSection = 'Thôn Tiên Xuân 2';
  } else if (communeSection === 'Khu vực Đồn Cát') {
    communeSection = 'Thôn Hòa An';
  } else {
    communeSection = 'Thôn Đức Bố';
  }

  // Survey occurrence status mapping (03 states: Đã ghi nhận | Biến mất | Điểm mới (Chờ duyệt))
  let occurrenceStatus: PlantOccurrenceStatus = 'present';
  let isDisappeared: boolean = Boolean(raw.isDisappeared);
  let conservationStatus: UnifiedConservationStatus = 'Đã ghi nhận';

  const rawStatus = String(raw.occurrenceStatus || raw.conservationStatus || raw['Hiện trạng thực địa'] || raw['Tình trạng bảo tồn'] || raw['Trạng thái bảo tồn'] || '').trim();
  if (isDisappeared || raw.occurrenceStatus === 'disappeared' || rawStatus.includes('Biến mất') || rawStatus.includes('Đã biến mất')) {
    occurrenceStatus = 'disappeared';
    isDisappeared = true;
    conservationStatus = 'Biến mất';
  } else if (raw.occurrenceStatus === 'new' || rawStatus.includes('Điểm mới') || rawStatus.includes('Chờ duyệt') || rawStatus.includes('mới')) {
    occurrenceStatus = 'new';
    isDisappeared = false;
    conservationStatus = 'Điểm mới (Chờ duyệt)';
  } else {
    occurrenceStatus = 'present';
    isDisappeared = false;
    conservationStatus = 'Đã ghi nhận';
  }

  const conservationLevel: ConservationLevel = 'safe';

  // Traditional Uses
  let folkRemedies: string[] = [];
  if (Array.isArray(raw.traditionalUses?.folkRemedies)) {
    folkRemedies = raw.traditionalUses.folkRemedies;
  } else if (raw['Công dụng dân gian'] || raw.folkRemedies) {
    const str = String(raw['Công dụng dân gian'] || raw.folkRemedies);
    folkRemedies = str.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }
  if (folkRemedies.length === 0) {
    folkRemedies = ['Kinh nghiệm dân gian địa phương đang được thẩm định.'];
  }

  let partUsed: string[] = [];
  if (Array.isArray(raw.traditionalUses?.partUsed)) {
    partUsed = raw.traditionalUses.partUsed;
  } else if (raw['Bộ phận dùng'] || raw.partUsed) {
    partUsed = String(raw['Bộ phận dùng'] || raw.partUsed).split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }
  if (partUsed.length === 0) partUsed = ['Toàn cây', 'Lá'];

  const preparation = String(raw.traditionalUses?.preparation || raw['Cách chế biến'] || 'Rửa sạch sắc nước uống hoặc giã đắp.');
  const informantName = String(raw.traditionalUses?.informantName || raw['Người cung cấp tư liệu'] || 'Lương y & nhân dân xã Tam Anh');
  const informantRole = String(raw.traditionalUses?.informantRole || 'Người am hiểu cây thuốc bản địa');

  // Status (verified / pending)
  const statusStr = String(raw.status || raw['Trạng thái kiểm duyệt'] || 'verified').toLowerCase();
  const status: 'verified' | 'pending' = (statusStr.includes('chờ') || statusStr.includes('pending')) ? 'pending' : 'verified';

  const surveyDate = String(raw.dataSource?.surveyDate || raw['Ngày ghi nhận'] || new Date().toISOString().split('T')[0]);

  return {
    id,
    vietnameseName,
    otherNames,
    scientificName,
    family,
    coverImage,
    photos,
    shortDescription,
    identificationTraits,
    habitat,
    habitatCategory,
    location: {
      lat: isNaN(lat) ? 15.4635 : lat,
      lng: isNaN(lng) ? 108.6185 : lng,
      addressDescription,
      communeSection
    },
    conservationStatus,
    conservationLevel,
    occurrenceStatus,
    isDisappeared,
    traditionalUses: {
      folkRemedies,
      partUsed,
      preparation,
      informantName,
      informantRole,
      hasConsent: true
    },
    dataSource: {
      type: 'field_survey_2026',
      title: 'Dữ liệu nhập từ tệp sao lưu thực địa',
      surveyor: String(raw.dataSource?.surveyor || 'Ban Chuyên môn KHKT Tam Anh'),
      surveyDate,
      verifiedBy: status === 'verified' ? 'Ban Quản trị' : undefined
    },
    status,
    surveyFrequencyCount: typeof raw.surveyFrequencyCount === 'number' ? raw.surveyFrequencyCount : 1,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ----------------------------------------------------
// IMPORT FROM JSON
// ----------------------------------------------------
export function importPlantsFromJSON(jsonText: string, mode: 'merge' | 'replace' = 'merge'): ImportResult {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : [parsed];
    
    if (rawList.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalCount: getStoredPlants().length,
        mode,
        format: 'json',
        error: 'Tệp JSON không chứa dữ liệu cây thuốc hợp lệ.',
        plants: getStoredPlants()
      };
    }

    const current = getStoredPlants();
    let maxExistingNum = 0;
    current.forEach((p) => {
      const match = (p.id || '').match(/TA-HERB-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxExistingNum) maxExistingNum = num;
      }
    });

    const normalizedNewPlants = rawList.map((item, idx) => normalizeImportedPlant(item, maxExistingNum + idx));
    
    let resultList: MedicinalPlant[];
    if (mode === 'replace') {
      resultList = normalizedNewPlants;
    } else {
      // Merge by ID
      const map = new Map<string, MedicinalPlant>();
      current.forEach((p) => map.set(p.id, p));
      normalizedNewPlants.forEach((p) => map.set(p.id, p));
      resultList = Array.from(map.values());
    }

    savePlants(resultList);
    batchSavePlantsToFirestore(resultList);

    return {
      success: true,
      importedCount: normalizedNewPlants.length,
      totalCount: resultList.length,
      mode,
      format: 'json',
      plants: resultList
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      totalCount: getStoredPlants().length,
      mode,
      format: 'json',
      error: `Lỗi đọc file JSON: ${err?.message || 'Cấu trúc cú pháp JSON không đúng.'}`,
      plants: getStoredPlants()
    };
  }
}

// ----------------------------------------------------
// ADVANCED CSV PARSER & IMPORTER
// ----------------------------------------------------
function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  // Normalize newlines
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentVal += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function importPlantsFromCSV(csvText: string, mode: 'merge' | 'replace' = 'merge'): ImportResult {
  try {
    const cleanText = csvText.replace(/^\uFEFF/, ''); // Strip BOM
    const rows = parseCSVRows(cleanText);

    if (rows.length < 2) {
      return {
        success: false,
        importedCount: 0,
        totalCount: getStoredPlants().length,
        mode,
        format: 'csv',
        error: 'Tệp CSV cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu.',
        plants: getStoredPlants()
      };
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    const getColIndex = (keywords: string[]): number => {
      return header.findIndex((h) => keywords.some((k) => h.includes(k)));
    };

    const idIdx = getColIndex(['id', 'mã']);
    const nameIdx = getColIndex(['tên cây', 'tên tiếng việt', 'vietnamese', 'name']);
    const sciIdx = getColIndex(['khoa học', 'scientific']);
    const famIdx = getColIndex(['họ', 'family']);
    const habIdx = getColIndex(['sinh cảnh', 'habitat']);
    const latIdx = getColIndex(['vĩ độ', 'lat']);
    const lngIdx = getColIndex(['kinh độ', 'lng', 'long']);
    const comIdx = getColIndex(['khu vực', 'xã', 'thôn', 'commune']);
    const conIdx = getColIndex(['bảo tồn', 'conservation', 'tình trạng']);
    const remIdx = getColIndex(['công dụng', 'bài thuốc', 'remed']);
    const partIdx = getColIndex(['bộ phận', 'part']);
    const prepIdx = getColIndex(['chế biến', 'sử dụng', 'prep']);
    const infIdx = getColIndex(['người cung cấp', 'lương y', 'informant']);
    const statIdx = getColIndex(['trạng thái', 'kiểm duyệt', 'status']);
    const dateIdx = getColIndex(['ngày', 'date']);
    const imgIdx = getColIndex(['ảnh', 'image', 'photo', 'url']);

    const current = getStoredPlants();
    let maxExistingNum = 0;
    current.forEach((p) => {
      const match = (p.id || '').match(/TA-HERB-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxExistingNum) maxExistingNum = num;
      }
    });

    const newPlants: MedicinalPlant[] = [];

    dataRows.forEach((row, rowIndex) => {
      const vName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : `Cây thuốc dòng ${rowIndex + 1}`;
      if (!vName || vName.trim() === '') return;

      const rawObj: any = {
        id: idIdx >= 0 && row[idIdx] ? row[idIdx] : `TA-HERB-${String(maxExistingNum + rowIndex + 1).padStart(3, '0')}`,
        vietnameseName: vName,
        scientificName: sciIdx >= 0 && row[sciIdx] ? row[sciIdx] : 'Đang xác minh phân loại học',
        family: famIdx >= 0 && row[famIdx] ? row[famIdx] : 'Chưa phân loại',
        habitat: habIdx >= 0 && row[habIdx] ? row[habIdx] : 'Vườn nhà & bờ rào nương rẫy',
        lat: latIdx >= 0 && row[latIdx] ? parseFloat(row[latIdx]) : 15.4635,
        lng: lngIdx >= 0 && row[lngIdx] ? parseFloat(row[lngIdx]) : 108.6185,
        communeSection: comIdx >= 0 && row[comIdx] ? row[comIdx] : 'Tam Anh Bắc',
        conservationStatus: conIdx >= 0 && row[conIdx] ? row[conIdx] : 'Đã ghi nhận',
        folkRemedies: remIdx >= 0 && row[remIdx] ? row[remIdx] : '',
        partUsed: partIdx >= 0 && row[partIdx] ? row[partIdx] : 'Toàn cây',
        preparation: prepIdx >= 0 && row[prepIdx] ? row[prepIdx] : 'Rửa sạch phơi khô sắc nước uống',
        informantName: infIdx >= 0 && row[infIdx] ? row[infIdx] : 'Nhân dân xã Tam Anh',
        status: statIdx >= 0 && row[statIdx] ? row[statIdx] : 'verified',
        surveyDate: dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0],
        coverImage: imgIdx >= 0 && row[imgIdx] ? row[imgIdx] : undefined,
      };

      newPlants.push(normalizeImportedPlant(rawObj, maxExistingNum + rowIndex));
    });

    if (newPlants.length === 0) {
      return {
        success: false,
        importedCount: 0,
        totalCount: getStoredPlants().length,
        mode,
        format: 'csv',
        error: 'Không tìm thấy dòng dữ liệu cây thuốc hợp lệ trong tệp CSV.',
        plants: getStoredPlants()
      };
    }

    const freshCurrent = getStoredPlants();
    let resultList: MedicinalPlant[];
    if (mode === 'replace') {
      resultList = newPlants;
    } else {
      const map = new Map<string, MedicinalPlant>();
      freshCurrent.forEach((p) => map.set(p.id, p));
      newPlants.forEach((p) => map.set(p.id, p));
      resultList = Array.from(map.values());
    }

    savePlants(resultList);
    batchSavePlantsToFirestore(resultList);

    return {
      success: true,
      importedCount: newPlants.length,
      totalCount: resultList.length,
      mode,
      format: 'csv',
      plants: resultList
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      totalCount: getStoredPlants().length,
      mode,
      format: 'csv',
      error: `Lỗi phân tích tệp CSV: ${err?.message || 'Định dạng dữ liệu không hợp lệ.'}`,
      plants: getStoredPlants()
    };
  }
}

// ----------------------------------------------------
// AUTOMATIC DAILY BACKUP SYSTEM
// ----------------------------------------------------
export function isAutoBackupEnabled(): boolean {
  const val = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setAutoBackupEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, String(enabled));
}

export function getDailyBackups(): BackupSnapshot[] {
  if (inMemoryBackupsCache && inMemoryBackupsCache.length > 0) {
    return inMemoryBackupsCache;
  }

  try {
    const raw = localStorage.getItem(BACKUPS_STORAGE_KEY);
    if (!raw) return [];
    const list: BackupSnapshot[] = JSON.parse(raw);
    const validList = Array.isArray(list) ? list : [];
    inMemoryBackupsCache = validList;
    return validList;
  } catch (err) {
    console.warn('Error loading backups:', err);
    return [];
  }
}

export function saveBackupsList(backups: BackupSnapshot[]): void {
  try {
    const sorted = [...backups]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    inMemoryBackupsCache = sorted;

    // 1. Save full backups with plants array into IndexedDB
    idbSaveBackups(sorted).catch((err) => {
      console.warn('IndexedDB saveBackups warning:', err);
    });

    // 2. In localStorage, store only lightweight headers (never compacted fake-image plant arrays)
    const minimalList = sorted.map((b) => ({
      id: b.id,
      timestamp: b.timestamp,
      date: b.date,
      timeString: b.timeString,
      plantCount: b.plantCount,
      plants: [],
      type: b.type,
      note: b.note,
      sizeKb: b.sizeKb
    }));
    try {
      localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(minimalList));
    } catch {}
  } catch (err) {
    console.error('Error saving backup list:', err);
  }
}

export function createBackup(type: 'auto_daily' | 'manual' = 'manual', note?: string, customPlants?: MedicinalPlant[]): BackupSnapshot {
  const currentPlants = customPlants || getStoredPlants();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);
  const snapshotJson = JSON.stringify(currentPlants);
  const sizeKb = Math.round((new Blob([snapshotJson]).size / 1024) * 10) / 10;

  const newSnapshot: BackupSnapshot = {
    id: `BK-${Date.now()}`,
    timestamp: now.toISOString(),
    date: dateStr,
    timeString: timeStr,
    plantCount: currentPlants.length,
    plants: currentPlants,
    type,
    note: note || (type === 'auto_daily' ? 'Sao lưu tự động hằng ngày' : 'Bản sao lưu thủ công'),
    sizeKb
  };

  const currentBackups = getDailyBackups();
  // Filter out any duplicate auto_daily backup for the exact same date to keep it clean
  const filtered = type === 'auto_daily' 
    ? currentBackups.filter((b) => !(b.type === 'auto_daily' && b.date === dateStr))
    : currentBackups;

  const updated = [newSnapshot, ...filtered];
  saveBackupsList(updated);
  return newSnapshot;
}

export function restoreFromBackup(backupId: string): MedicinalPlant[] | null {
  const backups = getDailyBackups();
  let target = backups.find((b) => b.id === backupId);
  
  if (!target || !target.plants || target.plants.length === 0) {
    if (inMemoryBackupsCache) {
      target = inMemoryBackupsCache.find((b) => b.id === backupId);
    }
  }

  if (!target || !target.plants || target.plants.length === 0) {
    return null;
  }
  
  savePlants(target.plants);
  batchSavePlantsToFirestore(target.plants);
  return target.plants;
}

export function deleteBackup(backupId: string): BackupSnapshot[] {
  const backups = getDailyBackups();
  const updated = backups.filter((b) => b.id !== backupId);
  saveBackupsList(updated);
  return updated;
}

/**
 * Checks if an auto backup has been run today. If not, runs it.
 */
export function checkAndRunDailyAutoBackup(): { ran: boolean; snapshot?: BackupSnapshot } {
  if (!isAutoBackupEnabled()) {
    return { ran: false };
  }

  const today = new Date().toISOString().slice(0, 10);
  const backups = getDailyBackups();
  const hasTodayBackup = backups.some((b) => b.date === today && b.type === 'auto_daily');

  if (!hasTodayBackup) {
    const plants = getStoredPlants();
    if (plants.length > 0) {
      const snapshot = createBackup('auto_daily', `Bản sao lưu tự động ngày ${today}`);
      return { ran: true, snapshot };
    }
  }

  return { ran: false };
}

