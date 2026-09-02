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

export type UnifiedConservationStatus = 'An toàn' | 'Sắp nguy cấp' | 'Nguy cấp / Cần bảo tồn' | 'Đã biến mất';

export type PlantOccurrenceStatus = 
  | 'present'       // Còn tồn tại / Đang phát triển tốt
  | 'degraded'      // Bị suy thoái / Suy giảm số lượng (thuộc nhóm Sắp nguy cấp)
  | 'disappeared';  // Đã biến mất / Không còn tìm thấy tại tọa độ này

/**
 * 5 Unified Survey Point Statuses:
 * 1. safe: An toàn (Green / Emerald)
 * 2. vulnerable: Sắp nguy cấp (Amber / Yellow - bao gồm cả trạng thái Suy thoái)
 * 3. endangered: Nguy cấp / Cần bảo tồn (Rose / Red)
 * 4. disappeared: Điểm đã mất (Dark Stone / Slate)
 * 5. new: Điểm mới (Purple / Violet - Chờ duyệt)
 */
export type SurveyPointStatusKey = 'safe' | 'vulnerable' | 'endangered' | 'disappeared' | 'new';

export interface SurveyPointStatusMeta {
  key: SurveyPointStatusKey;
  label: string;
  subLabel: string;
  colorHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  markerBg: string;
  markerRing: string;
  emoji: string;
  description: string;
}

export const SURVEY_POINT_STATUS_CONFIG: Record<SurveyPointStatusKey, SurveyPointStatusMeta> = {
  safe: {
    key: 'safe',
    label: 'An toàn',
    subLabel: 'Còn tồn tại & phát triển',
    colorHex: '#059669',
    bgClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    markerBg: 'bg-emerald-600',
    markerRing: 'ring-emerald-400/60',
    emoji: '🟢',
    description: 'Quần thể cây thuốc sinh trưởng tốt, trữ lượng ổn định, phổ biến ngoài thực địa.',
  },
  vulnerable: {
    key: 'vulnerable',
    label: 'Sắp nguy cấp',
    subLabel: 'Bị suy thoái / Suy giảm cá thể',
    colorHex: '#d97706',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    markerBg: 'bg-amber-500',
    markerRing: 'ring-amber-400/60',
    emoji: '🟡',
    description: 'Quần thể bị suy thoái, suy giảm số lượng hoặc có nguy cơ cạn kiệt nếu khai thác quá mức.',
  },
  endangered: {
    key: 'endangered',
    label: 'Nguy cấp / Cần bảo tồn',
    subLabel: 'Quý hiếm, nguy cơ biến mất cao',
    colorHex: '#e11d48',
    bgClass: 'bg-rose-600',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    markerBg: 'bg-rose-600',
    markerRing: 'ring-rose-400/60',
    emoji: '🔴',
    description: 'Loài dược liệu quý hiếm trong Sách Đỏ, cá thể ít, cần ưu tiên nhân giống và bảo vệ nghiêm ngặt.',
  },
  disappeared: {
    key: 'disappeared',
    label: 'Đã biến mất',
    subLabel: 'Đã mất tại điểm thực địa',
    colorHex: '#475569',
    bgClass: 'bg-stone-600',
    textClass: 'text-stone-700',
    borderClass: 'border-stone-500',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    markerBg: 'bg-stone-600',
    markerRing: 'ring-stone-400/60',
    emoji: '⚫',
    description: 'Điểm khảo sát trước đây nay cây đã bị mất hoặc không còn tại tọa độ này (tạm ẩn trên bản đồ chính).',
  },
  new: {
    key: 'new',
    label: 'Mới ghi nhận',
    subLabel: 'Mới khảo sát / Chờ duyệt',
    colorHex: '#7c3aed',
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-500',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    markerBg: 'bg-purple-600',
    markerRing: 'ring-purple-400/60',
    emoji: '🟣',
    description: 'Điểm khảo sát mới được cộng đồng đóng góp, đang chờ Ban Quản trị phê duyệt thông tin.',
  },
};

/**
 * Resolves any plant into exactly one of the 5 unified survey statuses:
 * 1. 'disappeared' if isDisappeared or occurrenceStatus is 'disappeared' or conservationStatus is 'Đã biến mất'
 * 2. 'new' if status is 'pending'
 * 3. 'endangered' if conservationLevel is 'endangered' or conservationStatus is 'Nguy cấp / Cần bảo tồn'
 * 4. 'vulnerable' if conservationLevel is 'vulnerable' OR conservationStatus is 'Sắp nguy cấp' OR occurrenceStatus is 'degraded' (Suy thoái)
 * 5. 'safe' otherwise
 */
export function getPlantSurveyStatus(plant: {
  status?: string;
  conservationLevel?: string;
  conservationStatus?: string;
  occurrenceStatus?: string;
  isDisappeared?: boolean;
}): SurveyPointStatusMeta {
  if (
    plant.isDisappeared || 
    plant.occurrenceStatus === 'disappeared' || 
    plant.conservationStatus === 'Đã biến mất' ||
    plant.conservationLevel === ('disappeared' as any)
  ) {
    return SURVEY_POINT_STATUS_CONFIG.disappeared;
  }
  if (plant.status === 'pending') {
    return SURVEY_POINT_STATUS_CONFIG.new;
  }
  if (
    plant.conservationLevel === 'endangered' || 
    plant.conservationStatus === 'Nguy cấp / Cần bảo tồn'
  ) {
    return SURVEY_POINT_STATUS_CONFIG.endangered;
  }
  if (
    plant.conservationLevel === 'vulnerable' || 
    plant.conservationStatus === 'Sắp nguy cấp' ||
    plant.occurrenceStatus === 'degraded'
  ) {
    return SURVEY_POINT_STATUS_CONFIG.vulnerable;
  }
  return SURVEY_POINT_STATUS_CONFIG.safe;
}

export interface PlantMonitoringLog {
  id: string;
  date: string; // YYYY-MM-DD
  status: PlantOccurrenceStatus;
  conservationStatus?: UnifiedConservationStatus; // Trạng thái bảo tồn thực tế tại đợt giám sát
  statusNote: string; // Ghi chú chi tiết (nguyên nhân thay đổi, tác động môi trường, thu hoạch...)
  surveyor: string; // Người / Đoàn giám sát
  contactPhone?: string; // Số điện thoại liên hệ xác minh của người gửi
  evidencePhoto?: string; // Ảnh chụp thực địa đợt kiểm tra mới
  createdAt: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected'; // Trạng thái: approved (Admin duyệt ngay), pending (Người lạ/cộng đồng gửi)
  submittedByRole?: 'admin' | 'public'; // Quyền người gửi: admin hoặc public
  reviewedBy?: string; // Tên Admin/Chuyên gia phê duyệt
  reviewedAt?: string; // Thời gian phê duyệt
  rejectionReason?: string; // Lý do nếu từ chối
}

export function getConservationStatusLabel(
  statusOrLevel?: string,
  isDisappeared?: boolean,
  occurrenceStatus?: string
): UnifiedConservationStatus {
  if (isDisappeared || occurrenceStatus === 'disappeared') return 'Đã biến mất';
  if (!statusOrLevel) return 'An toàn';
  const str = String(statusOrLevel).trim().toLowerCase();
  if (str.includes('biến mất') || str.includes('disappeared') || str.includes('đã mất')) {
    return 'Đã biến mất';
  }
  if (str.includes('nguy cấp') || str.includes('cần bảo tồn') || str.includes('đỏ') || str.includes('endangered')) {
    return 'Nguy cấp / Cần bảo tồn';
  }
  if (str.includes('sắp nguy cấp') || str.includes('vulnerable') || str.includes('suy thoái') || str.includes('degraded') || str.includes('hiếm')) {
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
  otherNames?: string;
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

