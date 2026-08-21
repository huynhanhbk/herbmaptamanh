export type HabitatCategory = 'forest' | 'garden' | 'stream' | 'hill' | 'coastal' | 'red';

export type ConservationLevel = 'safe' | 'vulnerable' | 'endangered';

export type UnifiedConservationStatus = 'An toàn' | 'Sắp nguy cấp' | 'Nguy cấp / Cần bảo tồn';

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
  communeSection: 'Tam Anh Bắc' | 'Tam Anh Nam' | 'Vùng đồi Khe Tre' | 'Ven sông Trầu' | 'Khu vực Đồn Cát';
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
