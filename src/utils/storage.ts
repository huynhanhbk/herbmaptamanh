import { 
  MedicinalPlant, 
  BackupSnapshot, 
  ImportResult, 
  HabitatCategory, 
  UnifiedConservationStatus, 
  ConservationLevel,
  CommuneVillage,
  COMMUNE_VILLAGES,
  PlantMonitoringLog,
  getHabitatLabel,
  getConservationStatusLabel
} from '../types';
import { INITIAL_PLANTS_DATA } from '../data/plants';
import { 
  savePlantToFirestore, 
  deletePlantFromFirestore, 
  batchSavePlantsToFirestore 
} from '../lib/plantSync';

const STORAGE_KEY = 'herbmap_tamanh_plants_v2';
const ADMIN_PASSCODE_KEY = 'herbmap_tamanh_admin_pw';
const BACKUPS_STORAGE_KEY = 'herbmap_tamanh_backups_v1';
const AUTO_BACKUP_ENABLED_KEY = 'herbmap_tamanh_auto_backup_enabled';
const DEFAULT_PASSCODE = 'admin2026';

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

  // Conservation status normalization: ensure no legacy "Ít quan tâm" remains
  const conservationStatus: UnifiedConservationStatus = getConservationStatusLabel(p.conservationStatus || p.conservationLevel);
  let conservationLevel: ConservationLevel = 'safe';
  if (conservationStatus === 'Nguy cấp / Cần bảo tồn') {
    conservationLevel = 'endangered';
  } else if (conservationStatus === 'Sắp nguy cấp') {
    conservationLevel = 'vulnerable';
  } else {
    conservationLevel = 'safe';
  }

  // Monitoring logs normalization & occurrence status derivation
  let monitoringLogs = Array.isArray(p.monitoringLogs) ? [...p.monitoringLogs] : [];
  if (monitoringLogs.length === 0) {
    const initialDate = p.dataSource?.surveyDate || (p.createdAt ? p.createdAt.split('T')[0] : '2026-02-12');
    monitoringLogs = [
      {
        id: `log-init-${p.id || '1'}`,
        date: initialDate,
        status: 'present',
        statusNote: `Ghi nhận khảo sát ban đầu: Cây hiện diện và sinh trưởng tại sinh cảnh ${p.habitat || 'thực địa Tam Anh'}.`,
        surveyor: p.dataSource?.surveyor || 'Nhóm khảo sát thực địa Tam Anh',
        createdAt: p.createdAt || new Date().toISOString(),
      }
    ];
  }

  // Determine current occurrence status from latest monitoring log
  const sortedLogs = [...monitoringLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestLog = sortedLogs[0];
  const occurrenceStatus = latestLog ? latestLog.status : (p.occurrenceStatus || 'present');
  const isDisappeared = occurrenceStatus === 'disappeared';

  return {
    ...p,
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
}

export function deduplicatePlants(plants: MedicinalPlant[]): MedicinalPlant[] {
  const seenMap = new Map<string, MedicinalPlant>();
  
  for (const plant of plants) {
    if (!plant || !plant.id) continue;
    const existing = seenMap.get(plant.id);
    if (!existing) {
      seenMap.set(plant.id, plant);
    } else {
      // Merge duplicate records intelligently
      const mergedPhotos = [...(existing.photos || [])];
      (plant.photos || []).forEach((newPhoto) => {
        if (!mergedPhotos.some((p) => p.url === newPhoto.url)) {
          mergedPhotos.push(newPhoto);
        }
      });

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
        coverImage: plant.coverImage || existing.coverImage,
        updatedAt: new Date().toISOString(),
      };
      seenMap.set(plant.id, merged);
    }
  }

  return Array.from(seenMap.values());
}

export function getStoredPlants(): MedicinalPlant[] {
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
          }
        } catch {
          // ignore
        }
      }
      const deduplicatedInitial = deduplicatePlants(INITIAL_PLANTS_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicatedInitial));
      return deduplicatedInitial;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const migrated = parsed.map(migratePlantRecord);
      const deduplicated = deduplicatePlants(migrated);
      // If duplicates existed in localStorage, auto-heal and rewrite clean array
      if (deduplicated.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
      }
      return deduplicated;
    }
    return deduplicatePlants(INITIAL_PLANTS_DATA);
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return deduplicatePlants(INITIAL_PLANTS_DATA);
  }
}

export function savePlants(plants: MedicinalPlant[]): void {
  try {
    const deduplicated = deduplicatePlants(plants);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export function addPlant(
  plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
  explicitSpeciesId?: string
): MedicinalPlant {
  const currentPlants = getStoredPlants();
  
  // 1. Check if an explicit species ID was selected (e.g. 'TA-HERB-001')
  let assignedId = explicitSpeciesId?.trim() || plant.id?.trim();

  // 2. If not explicitly provided, look up if a plant with the same Vietnamese name or scientific name exists
  if (!assignedId) {
    const inputName = plant.vietnameseName.trim().toLowerCase();
    const inputSciName = plant.scientificName?.trim().toLowerCase();

    const matchedPlant = currentPlants.find((p) => {
      const existingName = p.vietnameseName.trim().toLowerCase();
      const existingSciName = p.scientificName.trim().toLowerCase();
      return (
        existingName === inputName ||
        (inputSciName && inputSciName !== 'đang xác minh phân loại học' && existingSciName === inputSciName)
      );
    });

    if (matchedPlant) {
      assignedId = matchedPlant.id;
    }
  }

  const existingIndex = assignedId ? currentPlants.findIndex((p) => p.id === assignedId) : -1;

  // 3. If it is a completely new species, generate the next sequential identifier (TA-HERB-XXX)
  if (!assignedId || existingIndex === -1) {
    if (!assignedId) {
      let maxNum = 0;
      currentPlants.forEach((p) => {
        const match = p.id.match(/TA-HERB-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      assignedId = `TA-HERB-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const now = new Date().toISOString();
    const newPlant: MedicinalPlant = {
      ...plant,
      id: assignedId,
      surveyFrequencyCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const updated = deduplicatePlants([newPlant, ...currentPlants]);
    savePlants(updated);
    savePlantToFirestore(newPlant);
    return newPlant;
  }

  // 4. If assignedId already exists in currentPlants, update/enrich the existing record rather than duplicating it!
  const existingPlant = currentPlants[existingIndex];
  const now = new Date().toISOString();

  // Merge photos
  const mergedPhotos = [...(existingPlant.photos || [])];
  (plant.photos || []).forEach((p) => {
    if (!mergedPhotos.some((mp) => mp.url === p.url)) {
      mergedPhotos.push(p);
    }
  });

  const updatedExistingPlant: MedicinalPlant = {
    ...existingPlant,
    ...plant,
    id: assignedId,
    photos: mergedPhotos,
    coverImage: plant.coverImage || existingPlant.coverImage,
    location: plant.location || existingPlant.location,
    habitat: plant.habitat || existingPlant.habitat,
    habitatCategory: plant.habitatCategory || existingPlant.habitatCategory,
    status: plant.status || existingPlant.status,
    surveyFrequencyCount: (existingPlant.surveyFrequencyCount || 1) + 1,
    updatedAt: now,
  };

  currentPlants[existingIndex] = updatedExistingPlant;
  const updated = deduplicatePlants(currentPlants);
  savePlants(updated);
  savePlantToFirestore(updatedExistingPlant);
  return updatedExistingPlant;
}

export function saveNewPlant(
  plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
  explicitSpeciesId?: string
): MedicinalPlant[] {
  addPlant(plant, explicitSpeciesId);
  return getStoredPlants();
}

export function updatePlantStatus(id: string, status: 'verified' | 'pending'): MedicinalPlant[] {
  updatePlant(id, { status });
  return getStoredPlants();
}

export function saveUpdatedPlant(id: string, updates: Partial<MedicinalPlant>): MedicinalPlant[] {
  updatePlant(id, updates);
  return getStoredPlants();
}

export function addPlantMonitoringLog(
  plantId: string,
  logData: Omit<PlantMonitoringLog, 'id' | 'createdAt'>
): MedicinalPlant[] {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === plantId);
  if (index === -1) return currentPlants;

  const plant = currentPlants[index];
  const now = new Date().toISOString();
  const newLog: PlantMonitoringLog = {
    id: `log-${Date.now()}`,
    date: logData.date,
    status: logData.status,
    statusNote: logData.statusNote,
    surveyor: logData.surveyor,
    evidencePhoto: logData.evidencePhoto,
    createdAt: now,
  };

  const existingLogs = Array.isArray(plant.monitoringLogs) ? [...plant.monitoringLogs] : [];
  const updatedLogs = [newLog, ...existingLogs];

  // Sort logs descending by date
  updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestLog = updatedLogs[0];
  const occurrenceStatus = latestLog ? latestLog.status : 'present';
  const isDisappeared = occurrenceStatus === 'disappeared';

  const updatedPlant: MedicinalPlant = {
    ...plant,
    occurrenceStatus,
    isDisappeared,
    monitoringLogs: updatedLogs,
    updatedAt: now,
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  savePlantToFirestore(updatedPlant);
  return getStoredPlants();
}

export function updatePlant(id: string, updates: Partial<MedicinalPlant>): MedicinalPlant | null {
  const currentPlants = getStoredPlants();
  const index = currentPlants.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updatedPlant: MedicinalPlant = {
    ...currentPlants[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  currentPlants[index] = updatedPlant;
  savePlants(currentPlants);
  savePlantToFirestore(updatedPlant);
  return updatedPlant;
}

export function deletePlant(id: string): boolean {
  const currentPlants = getStoredPlants();
  const filtered = currentPlants.filter((p) => p.id !== id);
  if (filtered.length !== currentPlants.length) {
    savePlants(filtered);
    deletePlantFromFirestore(id);
    return true;
  }
  return false;
}

export function resetToDefaultData(): MedicinalPlant[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PLANTS_DATA));
  batchSavePlantsToFirestore(INITIAL_PLANTS_DATA);
  return INITIAL_PLANTS_DATA;
}

export function verifyAdminPasscode(inputCode: string): boolean {
  const saved = localStorage.getItem(ADMIN_PASSCODE_KEY);
  if (!saved || saved === 'tamanh2026') {
    localStorage.setItem(ADMIN_PASSCODE_KEY, DEFAULT_PASSCODE);
    return inputCode.trim() === DEFAULT_PASSCODE;
  }
  return inputCode.trim() === saved || inputCode.trim() === DEFAULT_PASSCODE;
}

export function exportPlantsAsJSON(): string {
  const plants = getStoredPlants();
  return JSON.stringify(plants, null, 2);
}

export function exportPlantsAsCSV(): string {
  const plants = getStoredPlants();
  const headers = [
    'Mã định danh (ID)',
    'Tên cây thuốc',
    'Tên khoa học',
    'Họ thực vật',
    'Sinh cảnh',
    'Vĩ độ (Lat)',
    'Kinh độ (Lng)',
    'Khu vực Tam Anh',
    'Tình trạng bảo tồn',
    'Công dụng dân gian',
    'Bộ phận dùng',
    'Cách chế biến',
    'Người cung cấp tư liệu',
    'Trạng thái kiểm duyệt',
    'Ngày ghi nhận',
    'Ảnh đại diện',
  ];

  const rows = plants.map((p) => [
    `"${p.id}"`,
    `"${p.vietnameseName.replace(/"/g, '""')}"`,
    `"${p.scientificName.replace(/"/g, '""')}"`,
    `"${p.family.replace(/"/g, '""')}"`,
    `"${p.habitat.replace(/"/g, '""')}"`,
    p.location.lat,
    p.location.lng,
    `"${p.location.communeSection}"`,
    `"${p.conservationStatus}"`,
    `"${(p.traditionalUses.folkRemedies || []).join('; ').replace(/"/g, '""')}"`,
    `"${(p.traditionalUses.partUsed || []).join('; ').replace(/"/g, '""')}"`,
    `"${(p.traditionalUses.preparation || '').replace(/"/g, '""')}"`,
    `"${(p.traditionalUses.informantName || '').replace(/"/g, '""')}"`,
    `"${p.status === 'verified' ? 'Đã xác nhận' : 'Chờ duyệt'}"`,
    `"${p.dataSource?.surveyDate || ''}"`,
    `"${(p.coverImage || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ----------------------------------------------------
// NORMALIZE HELPER FOR ROBUST IMPORT
// ----------------------------------------------------
function normalizeImportedPlant(raw: any, indexFallback: number): MedicinalPlant {
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `TA-HERB-${String(indexFallback + 1).padStart(3, '0')}`;
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

  // Conservation status mapping
  let conservationStatus: UnifiedConservationStatus = 'An toàn';
  const rawStatus = String(raw.conservationStatus || raw['Tình trạng bảo tồn'] || raw['Trạng thái bảo tồn'] || '').trim();
  if (rawStatus.includes('Nguy cấp') || rawStatus.includes('Cần bảo tồn') || rawStatus.includes('Đỏ') || rawStatus.includes('EN')) {
    conservationStatus = 'Nguy cấp / Cần bảo tồn';
  } else if (rawStatus.includes('Sắp nguy cấp') || rawStatus.includes('VU')) {
    conservationStatus = 'Sắp nguy cấp';
  } else {
    conservationStatus = 'An toàn';
  }

  let conservationLevel: ConservationLevel = 'safe';
  if (conservationStatus === 'Nguy cấp / Cần bảo tồn') conservationLevel = 'endangered';
  else if (conservationStatus === 'Sắp nguy cấp') conservationLevel = 'vulnerable';

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

    const normalizedNewPlants = rawList.map((item, idx) => normalizeImportedPlant(item, idx));
    const current = getStoredPlants();
    
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

    const newPlants: MedicinalPlant[] = [];

    dataRows.forEach((row, rowIndex) => {
      const vName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : `Cây thuốc dòng ${rowIndex + 1}`;
      if (!vName || vName.trim() === '') return;

      const rawObj: any = {
        id: idIdx >= 0 && row[idIdx] ? row[idIdx] : `TA-HERB-${String(rowIndex + 1).padStart(3, '0')}`,
        vietnameseName: vName,
        scientificName: sciIdx >= 0 && row[sciIdx] ? row[sciIdx] : 'Đang xác minh phân loại học',
        family: famIdx >= 0 && row[famIdx] ? row[famIdx] : 'Chưa phân loại',
        habitat: habIdx >= 0 && row[habIdx] ? row[habIdx] : 'Vườn nhà & bờ rào nương rẫy',
        lat: latIdx >= 0 && row[latIdx] ? parseFloat(row[latIdx]) : 15.4635,
        lng: lngIdx >= 0 && row[lngIdx] ? parseFloat(row[lngIdx]) : 108.6185,
        communeSection: comIdx >= 0 && row[comIdx] ? row[comIdx] : 'Tam Anh Bắc',
        conservationStatus: conIdx >= 0 && row[conIdx] ? row[conIdx] : 'An toàn',
        folkRemedies: remIdx >= 0 && row[remIdx] ? row[remIdx] : '',
        partUsed: partIdx >= 0 && row[partIdx] ? row[partIdx] : 'Toàn cây',
        preparation: prepIdx >= 0 && row[prepIdx] ? row[prepIdx] : 'Rửa sạch phơi khô sắc nước uống',
        informantName: infIdx >= 0 && row[infIdx] ? row[infIdx] : 'Nhân dân xã Tam Anh',
        status: statIdx >= 0 && row[statIdx] ? row[statIdx] : 'verified',
        surveyDate: dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0],
        coverImage: imgIdx >= 0 && row[imgIdx] ? row[imgIdx] : undefined,
      };

      newPlants.push(normalizeImportedPlant(rawObj, rowIndex));
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

    const current = getStoredPlants();
    let resultList: MedicinalPlant[];
    if (mode === 'replace') {
      resultList = newPlants;
    } else {
      const map = new Map<string, MedicinalPlant>();
      current.forEach((p) => map.set(p.id, p));
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
  try {
    const raw = localStorage.getItem(BACKUPS_STORAGE_KEY);
    if (!raw) return [];
    const list: BackupSnapshot[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error loading backups:', err);
    return [];
  }
}

export function saveBackupsList(backups: BackupSnapshot[]): void {
  try {
    // Keep max 15 recent snapshots to preserve local storage limits
    const sorted = [...backups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);
    localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(sorted));
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
  const target = backups.find((b) => b.id === backupId);
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

