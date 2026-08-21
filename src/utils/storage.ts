import { MedicinalPlant } from '../types';
import { INITIAL_PLANTS_DATA } from '../data/plants';

const STORAGE_KEY = 'herbmap_tamanh_plants_v1';
const ADMIN_PASSCODE_KEY = 'herbmap_tamanh_admin_pw';
const DEFAULT_PASSCODE = 'tamanh2026';

export function getStoredPlants(): MedicinalPlant[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PLANTS_DATA));
      return INITIAL_PLANTS_DATA;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return INITIAL_PLANTS_DATA;
  }
}

export function savePlants(plants: MedicinalPlant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
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

  // 3. If it is a completely new species, generate the next sequential identifier (TA-HERB-XXX)
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

  const updated = [newPlant, ...currentPlants];
  savePlants(updated);
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
  updatePlant(id, { status });
  return getStoredPlants();
}

export function saveUpdatedPlant(id: string, updates: Partial<MedicinalPlant>): MedicinalPlant[] {
  updatePlant(id, updates);
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
  return updatedPlant;
}

export function deletePlant(id: string): boolean {
  const currentPlants = getStoredPlants();
  const filtered = currentPlants.filter((p) => p.id !== id);
  if (filtered.length !== currentPlants.length) {
    savePlants(filtered);
    return true;
  }
  return false;
}

export function resetToDefaultData(): MedicinalPlant[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PLANTS_DATA));
  return INITIAL_PLANTS_DATA;
}

export function verifyAdminPasscode(inputCode: string): boolean {
  const saved = localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_PASSCODE;
  return inputCode.trim() === saved;
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
    'Người cung cấp tư liệu',
    'Trạng thái kiểm duyệt',
    'Ngày ghi nhận',
  ];

  const rows = plants.map((p) => [
    `"${p.id}"`,
    `"${p.vietnameseName}"`,
    `"${p.scientificName}"`,
    `"${p.family}"`,
    `"${p.habitat}"`,
    p.location.lat,
    p.location.lng,
    `"${p.location.communeSection}"`,
    `"${p.conservationStatus}"`,
    `"${p.traditionalUses.folkRemedies.join('; ')}"`,
    `"${p.traditionalUses.informantName}"`,
    `"${p.status === 'verified' ? 'Đã xác nhận' : 'Chờ duyệt'}"`,
    `"${p.dataSource.surveyDate}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
