export type HabitatCategory = 
  | 'natural_forest'     // Rừng tự nhiên
  | 'planted_forest'     // Rừng trồng
  | 'shrub_grassland'    // Trảng cây bụi, trảng cỏ
  | 'sea'                // Biển
  | 'garden'             // Vườn nhà
  | 'farmland';          // Đồng ruộng

export type CommuneVillage =
  | 'Thôn Diêm Phổ'
  | 'Thôn Mỹ Sơn'
  | 'Thôn Tiên Xuân 1'
  | 'Thôn Tiên Xuân 2'
  | 'Thôn Xuân Ngọc'
  | 'Thôn Xuân Tân'
  | 'Thôn Phú Vinh'
  | 'Thôn Hòa An'
  | 'Thôn Bình An'
  | 'Thôn Hòa Bình'
  | 'Thôn Đông Thạnh'
  | 'Thôn Đức Bố'
  | 'Thôn Thuận An'
  | 'Thôn Trà Lý'
  | 'Thôn An Lương';

export const COMMUNE_VILLAGES: CommuneVillage[] = [
  'Thôn Diêm Phổ',
  'Thôn Mỹ Sơn',
  'Thôn Tiên Xuân 1',
  'Thôn Tiên Xuân 2',
  'Thôn Xuân Ngọc',
  'Thôn Xuân Tân',
  'Thôn Phú Vinh',
  'Thôn Hòa An',
  'Thôn Bình An',
  'Thôn Hòa Bình',
  'Thôn Đông Thạnh',
  'Thôn Đức Bố',
  'Thôn Thuận An',
  'Thôn Trà Lý',
  'Thôn An Lương'
];

export const HABITAT_OPTIONS: { id: HabitatCategory; label: string; description: string; color: string }[] = [
  { id: 'natural_forest', label: 'Rừng tự nhiên', description: 'Rừng tự nhiên, núi cao, rừng phòng hộ đầu nguồn', color: '#047857' },
  { id: 'planted_forest', label: 'Rừng trồng', description: 'Rừng keo, tràm, cây lâm nghiệp tái sinh', color: '#0d9488' },
  { id: 'shrub_grassland', label: 'Trảng cây bụi, trảng cỏ', description: 'Gò đồi cây bụi thấp hoang dại, trảng cỏ sỏi cát', color: '#d97706' },
  { id: 'sea', label: 'Biển', description: 'Vùng bãi bồi ven biển, cồn cát và rừng ngập mặn', color: '#0284c7' },
  { id: 'garden', label: 'Vườn nhà', description: 'Vườn nhà dân cư, hàng rào, khuôn viên', color: '#16a34a' },
  { id: 'farmland', label: 'Đồng ruộng', description: 'Đồng lúa, bờ mương tưới tiêu, bãi nương canh tác', color: '#ca8a04' },
];

export function getHabitatLabel(cat: HabitatCategory | string): string {
  switch (cat) {
    case 'natural_forest':
    case 'forest':
      return 'Rừng tự nhiên';
    case 'planted_forest':
      return 'Rừng trồng';
    case 'shrub_grassland':
    case 'hill':
      return 'Trảng cây bụi, trảng cỏ';
    case 'sea':
    case 'coastal':
      return 'Biển';
    case 'garden':
      return 'Vườn nhà';
    case 'farmland':
    case 'stream':
    case 'red':
      return 'Đồng ruộng';
    default:
      return 'Vườn nhà';
  }
}

export type ConservationLevel = 'safe' | 'vulnerable' | 'endangered';

export type UnifiedConservationStatus = 'An toàn' | 'Sắp nguy cấp' | 'Nguy cấp / Cần bảo tồn';

export type PlantOccurrenceStatus = 
  | 'present'       // Còn tồn tại / Đang phát triển tốt
  | 'degraded'      // Bị suy thoái / Suy giảm số lượng
  | 'disappeared';  // Đã biến mất / Không còn tìm thấy tại tọa độ này

export interface PlantMonitoringLog {
  id: string;
  date: string; // YYYY-MM-DD
  status: PlantOccurrenceStatus;
  statusNote: string; // Ghi chú chi tiết (nguyên nhân thay đổi, tác động môi trường, thu hoạch...)
  surveyor: string; // Người / Đoàn giám sát
  evidencePhoto?: string; // Ảnh chụp thực địa đợt kiểm tra mới
  createdAt: string;
}

export function getConservationStatusLabel(statusOrLevel?: string): UnifiedConservationStatus {
  if (!statusOrLevel) return 'An toàn';
  const str = String(statusOrLevel).trim().toLowerCase();
  if (str.includes('nguy cấp') || str.includes('cần bảo tồn') || str.includes('đỏ') || str.includes('endangered')) {
    return 'Nguy cấp / Cần bảo tồn';
  }
  if (str.includes('sắp nguy cấp') || str.includes('vulnerable') || str.includes('hiếm')) {
    return 'Sắp nguy cấp';
  }
  return 'An toàn';
}

export type DataSourceType = 'research_heritage' | 'field_survey_2026' | 'community_contribution';

export interface PlantPhoto {
  id: string;
  url: string;
  caption: string;
  type: 'whole' | 'leaf' | 'flower' | 'fruit' | 'root';
}

export interface IdentificationTraits {
  growthForm: string; // Thân thảo, cây bụi, dây leo, thân gỗ...
  leaves: string;     // Đặc điểm lá (mọc đối, so le, mép răng cưa...)
  flowers: string;    // Đặc điểm hoa (màu sắc, cụm hoa, mùa hoa)
  fruits?: string;    // Đặc điểm quả / hạt (tùy chọn)
  roots?: string;     // Đặc điểm củ / rễ (tùy chọn)
}

export interface TraditionalUses {
  folkRemedies: string[];     // Các bài thuốc / kinh nghiệm lưu truyền
  partUsed: string[];         // Bộ phận dùng (Lá, rễ, củ, thân, hoa)
  preparation: string;        // Phương pháp chế biến truyền thống (sắc uống, giã đắp...)
  informantName: string;      // Tên lương y / người cung cấp tư liệu
  informantRole: string;      // Danh xưng / vai trò
  hasConsent: boolean;        // Đã được đồng thuận chia sẻ
}

export interface LocationData {
  lat: number;
  lng: number;
  addressDescription: string;
  communeSection: CommuneVillage | string;
  elevationMeters?: number;
}

export interface DataSource {
  type: DataSourceType;
  title: string;
  surveyor: string;
  surveyDate: string;
  verifiedBy?: string;
  notes?: string;
}

export interface MedicinalPlant {
  id: string; // Ví dụ: TA-HERB-001
  vietnameseName: string;
  otherNames?: string[];
  scientificName: string;
  family: string;
  coverImage: string;
  photos: PlantPhoto[];
  shortDescription: string;
  identificationTraits: IdentificationTraits;
  habitat: string;
  habitatCategory: HabitatCategory;
  location: LocationData;
  conservationStatus: UnifiedConservationStatus;
  conservationLevel: ConservationLevel;
  traditionalUses: TraditionalUses;
  dataSource: DataSource;
  status: 'verified' | 'pending';
  surveyFrequencyCount: number; // Tần suất ghi nhận thực tế (đo lường suy giảm/phổ biến)
  trendStatus?: 'stable' | 'declining' | 'increasing';
  occurrenceStatus?: PlantOccurrenceStatus; // Trạng thái tồn tại hiện thời ('present' | 'degraded' | 'disappeared')
  isDisappeared?: boolean; // True nếu ở đợt cập nhật mới nhất loài cây này đã biến mất tại vị trí/tọa độ này
  monitoringLogs?: PlantMonitoringLog[]; // Lịch sử các lần khảo sát / kiểm tra tình trạng thực địa theo thời gian
  createdAt: string;
  updatedAt: string;
}

export interface AICandidate {
  vietnameseName: string;
  scientificName: string;
  family: string;
  confidence: number;
  observedFeatures: string[];
  habitatInCentralVietnam?: string;
  folkUseSummary?: string;
  distinctionTips?: string;
}

export interface AIIdentificationResult {
  summary: string;
  candidates: AICandidate[];
  safetyDisclaimer: string;
}

export interface FilterState {
  searchQuery: string;
  habitatCategory: 'all' | HabitatCategory;
  conservationLevel: 'all' | ConservationLevel;
  communeSection: 'all' | string;
  status: 'all' | 'verified' | 'pending';
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss
  plantCount: number;
  plants: MedicinalPlant[];
  type: 'auto_daily' | 'manual';
  note?: string;
  sizeKb?: number;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  totalCount: number;
  mode: 'merge' | 'replace';
  format: 'json' | 'csv';
  error?: string;
  warnings?: string[];
  plants: MedicinalPlant[];
}

