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

export function addPlant(plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'>): MedicinalPlant {
  const currentPlants = getStoredPlants();
  const nextNumber = currentPlants.length + 1;
  const newId = `TA-HERB-${String(nextNumber).padStart(3, '0')}`;
  
  const newPlant: MedicinalPlant = {
    ...plant,
    id: newId,
    surveyFrequencyCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newPlant, ...currentPlants];
  savePlants(updated);
  return newPlant;
}

export function saveNewPlant(plant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'>): MedicinalPlant[] {
  addPlant(plant);
  return getStoredPlants();
}

export function updatePlantStatus(id: string, status: 'verified' | 'pending'): MedicinalPlant[] {
  updatePlant(id, { status });
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
