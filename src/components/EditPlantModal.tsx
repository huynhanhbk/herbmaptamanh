import React, { useState } from 'react';
import { 
  X, 
  Save, 
  MapPin, 
  Image as ImageIcon, 
  Upload, 
  AlertTriangle, 
  Leaf, 
  ShieldCheck, 
  CheckCircle, 
  Plus, 
  Trash2,
  Clock
} from 'lucide-react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel, 
  UnifiedConservationStatus,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  CommuneVillage
} from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface EditPlantModalProps {
  plant: MedicinalPlant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedFields: Partial<MedicinalPlant>) => void;
}

export const EditPlantModal: React.FC<EditPlantModalProps> = ({
  plant,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !plant) return null;

  // Form states initialized with plant values
  const [vietnameseName, setVietnameseName] = useState(plant.vietnameseName);
  const [otherNamesStr, setOtherNamesStr] = useState((plant.otherNames || []).join(', '));
  const [scientificName, setScientificName] = useState(plant.scientificName);
  const [family, setFamily] = useState(plant.family);
  const [coverImage, setCoverImage] = useState(plant.coverImage);
  const [shortDescription, setShortDescription] = useState(plant.shortDescription || '');
  
  // Traits
  const [growthForm, setGrowthForm] = useState(plant.identificationTraits?.growthForm || 'Thân thảo');
  const [leaves, setLeaves] = useState(plant.identificationTraits?.leaves || '');
  const [flowers, setFlowers] = useState(plant.identificationTraits?.flowers || '');
  const [fruits, setFruits] = useState(plant.identificationTraits?.fruits || '');

  // Habitat & Location
  const [habitatCategory, setHabitatCategory] = useState<HabitatCategory>(plant.habitatCategory || 'garden');
  const [habitat, setHabitat] = useState(plant.habitat);
  const [lat, setLat] = useState(plant.location.lat.toString());
  const [lng, setLng] = useState(plant.location.lng.toString());
  const [communeSection, setCommuneSection] = useState(plant.location.communeSection);
  const [addressDescription, setAddressDescription] = useState(plant.location.addressDescription || '');

  // Traditional Uses
  const [folkRemedies, setFolkRemedies] = useState<string[]>(
    plant.traditionalUses?.folkRemedies?.length ? plant.traditionalUses.folkRemedies : ['']
  );
  const [partUsedStr, setPartUsedStr] = useState((plant.traditionalUses?.partUsed || []).join(', '));
  const [preparation, setPreparation] = useState(plant.traditionalUses?.preparation || 'Sắc nước uống hoặc giã đắp');
  const [informantName, setInformantName] = useState(plant.traditionalUses?.informantName || 'Lương y & Nhân dân xã Tam Anh');
  const [informantRole, setInformantRole] = useState(plant.traditionalUses?.informantRole || 'Người dân bản địa');

  // Status & Conservation
  const [conservationStatus, setConservationStatus] = useState<UnifiedConservationStatus>(
    (plant.conservationStatus as UnifiedConservationStatus) || 'An toàn'
  );
  const [conservationLevel, setConservationLevel] = useState<ConservationLevel>(plant.conservationLevel || 'safe');
  const [status, setStatus] = useState<'verified' | 'pending'>(plant.status);
  const [surveyor, setSurveyor] = useState(plant.dataSource?.surveyor || '');

  const handleConservationChange = (val: UnifiedConservationStatus) => {
    setConservationStatus(val);
    if (val === 'Nguy cấp / Cần bảo tồn') {
      setConservationLevel('endangered');
    } else if (val === 'Sắp nguy cấp') {
      setConservationLevel('vulnerable');
    } else {
      setConservationLevel('safe');
    }
  };

  const [activeTab, setActiveTab] = useState<'general' | 'traits' | 'location' | 'remedy'>('general');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRemedyChange = (index: number, value: string) => {
    const updated = [...folkRemedies];
    updated[index] = value;
    setFolkRemedies(updated);
  };

  const handleAddRemedy = () => {
    setFolkRemedies([...folkRemedies, '']);
  };

  const handleRemoveRemedy = (index: number) => {
    if (folkRemedies.length > 1) {
      setFolkRemedies(folkRemedies.filter((_, i) => i !== index));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1000, 1000, 0.78);
      setCoverImage(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!vietnameseName.trim()) {
      setValidationError('Vui lòng nhập tên tiếng Việt của cây thuốc.');
      setActiveTab('general');
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setValidationError('Tọa độ GPS vĩ độ/kinh độ không hợp lệ.');
      setActiveTab('location');
      return;
    }

    const updatedData: Partial<MedicinalPlant> = {
      vietnameseName: vietnameseName.trim(),
      otherNames: otherNamesStr.split(',').map((s) => s.trim()).filter(Boolean),
      scientificName: scientificName.trim(),
      family: family.trim(),
      coverImage: coverImage.trim(),
      shortDescription: shortDescription.trim(),
      habitatCategory,
      habitat: habitat.trim(),
      conservationStatus,
      conservationLevel,
      status,
      identificationTraits: {
        growthForm: growthForm.trim(),
        leaves: leaves.trim(),
        flowers: flowers.trim(),
        fruits: fruits.trim(),
      },
      location: {
        ...plant.location,
        lat: parsedLat,
        lng: parsedLng,
        communeSection: communeSection as any,
        addressDescription: addressDescription.trim(),
      },
      traditionalUses: {
        ...plant.traditionalUses,
        folkRemedies: folkRemedies.map((r) => r.trim()).filter(Boolean),
        partUsed: partUsedStr.split(',').map((s) => s.trim()).filter(Boolean),
        preparation: preparation.trim(),
        informantName: informantName.trim(),
        informantRole: informantRole.trim(),
      },
      dataSource: {
        ...plant.dataSource,
        surveyor: surveyor.trim() || plant.dataSource.surveyor,
        verifiedBy: status === 'verified' ? 'Ban Chuyên môn KHKT Tam Anh' : undefined,
      },
    };

    onSave(plant.id, updatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white px-5 py-4 flex items-center justify-between border-b border-amber-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-700/80 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Chỉnh Sửa Hồ Sơ Cây Thuốc</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/80">
                  {plant.id}
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                {plant.vietnameseName} ({plant.scientificName})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-stone-200 bg-stone-50 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            1. Định danh & Phân loại
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('traits')}
            className={`px-3 py-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'traits'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            2. Đặc điểm hình thái
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`px-3 py-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'location'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            3. Tọa độ & Sinh cảnh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remedy')}
            className={`px-3 py-2 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'remedy'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-lg'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            4. Tri thức & Bài thuốc
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-stone-800 text-xs">
          {validationError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tên tiếng Việt phổ thông <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={vietnameseName}
                    onChange={(e) => setVietnameseName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tên gọi khác / Tên dân gian địa phương:
                  </label>
                  <input
                    type="text"
                    value={otherNamesStr}
                    onChange={(e) => setOtherNamesStr(e.target.value)}
                    placeholder="Phân cách bằng dấu phẩy, ví dụ: Cà quạnh, Cà cườm"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tên khoa học (In nghiêng) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50 font-serif italic"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Họ thực vật <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={family}
                    onChange={(e) => setFamily(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                  />
                </div>
              </div>

              {/* Cover Image URL / Upload */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ảnh đại diện mẫu vật (URL hoặc Tải ảnh mới):
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={coverImage}
                    alt={vietnameseName}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-300 shrink-0 bg-stone-100"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50 text-[11px]"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer font-medium border border-stone-300 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-stone-600" />
                      <span>Chọn ảnh từ máy tính/điện thoại</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Mô tả vắn tắt / Giới thiệu tổng quan:
                </label>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                />
              </div>

              {/* Status Control */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Trạng thái kiểm duyệt KHKT:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'verified' | 'pending')}
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-semibold text-amber-900"
                  >
                    <option value="verified">✅ Đã xác nhận khoa học (Xuất bản bản đồ)</option>
                    <option value="pending">⏳ Chờ duyệt bổ sung thực địa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Người thực hiện khảo sát / Cập nhật:
                  </label>
                  <input
                    type="text"
                    value={surveyor}
                    onChange={(e) => setSurveyor(e.target.value)}
                    placeholder="Nhóm tác giả đề tài KHKT Tam Anh"
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRAITS */}
          {activeTab === 'traits' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Dạng sống / Thân cây:
                  </label>
                  <select
                    value={growthForm}
                    onChange={(e) => setGrowthForm(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  >
                    <option value="Thân thảo nhiều năm">Thân thảo nhiều năm</option>
                    <option value="Thân thảo hàng năm">Thân thảo hàng năm</option>
                    <option value="Cây bụi nhỏ">Cây bụi nhỏ</option>
                    <option value="Cây bụi leo / Dây leo">Cây bụi leo / Dây leo</option>
                    <option value="Cây thân gỗ nhỏ">Cây thân gỗ nhỏ</option>
                    <option value="Thực vật biểu sinh / Thân rễ">Thực vật biểu sinh / Thân rễ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Đặc điểm Lá:
                  </label>
                  <input
                    type="text"
                    value={leaves}
                    onChange={(e) => setLeaves(e.target.value)}
                    placeholder="Mọc so le, mép nguyên hoặc xẻ thùy, có gai..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Đặc điểm Hoa:
                  </label>
                  <input
                    type="text"
                    value={flowers}
                    onChange={(e) => setFlowers(e.target.value)}
                    placeholder="Màu sắc, cụm hoa ở nách lá hay đầu cành..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Đặc điểm Quả / Hạt / Thân củ:
                  </label>
                  <input
                    type="text"
                    value={fruits}
                    onChange={(e) => setFruits(e.target.value)}
                    placeholder="Quả mọng hình cầu, khi chín màu đỏ mọng..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCATION & HABITAT */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Nhóm sinh cảnh (06 loại):
                  </label>
                  <select
                    value={habitatCategory}
                    onChange={(e) => setHabitatCategory(e.target.value as HabitatCategory)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-medium text-xs"
                  >
                    {HABITAT_OPTIONS.map((h) => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Mô tả sinh cảnh chi tiết:
                  </label>
                  <input
                    type="text"
                    value={habitat}
                    onChange={(e) => setHabitat(e.target.value)}
                    placeholder="Bờ rào, ven đường mòn, lùm cây bụi bãi hoang..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs"
                  />
                </div>
              </div>

              {/* Coordinates GPS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Vĩ độ (Latitude) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Kinh độ (Longitude) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Khu vực thôn (15 thôn):
                  </label>
                  <select
                    value={communeSection}
                    onChange={(e) => setCommuneSection(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold"
                  >
                    {COMMUNE_VILLAGES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tình trạng bảo tồn:
                  </label>
                  <select
                    value={conservationStatus}
                    onChange={(e) => handleConservationChange(e.target.value as UnifiedConservationStatus)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-medium text-xs"
                  >
                    <option value="An toàn">🟢 An toàn</option>
                    <option value="Sắp nguy cấp">🟡 Sắp nguy cấp</option>
                    <option value="Nguy cấp / Cần bảo tồn">🔴 Nguy cấp / Cần bảo tồn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Địa chỉ thực địa / Điểm mốc nhận biết:
                </label>
                <input
                  type="text"
                  value={addressDescription}
                  onChange={(e) => setAddressDescription(e.target.value)}
                  placeholder="Gần nhà văn hóa thôn Đức Bố 1, cách bờ mương 20m..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>
            </div>
          )}

          {/* TAB 4: TRADITIONAL USES & REMEDIES */}
          {activeTab === 'remedy' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-stone-700">
                    Bài thuốc / Kinh nghiệm dân gian lưu truyền:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRemedy}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm bài thuốc
                  </button>
                </div>

                <div className="space-y-2">
                  {folkRemedies.map((remedy, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-stone-400 shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={remedy}
                        onChange={(e) => handleRemedyChange(idx, e.target.value)}
                        placeholder="Ví dụ: Dùng 30g rễ và thân sắc uống hàng ngày chữa viêm gan, hạ men gan..."
                        className="flex-1 p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                      />
                      {folkRemedies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRemedy(idx)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Bộ phận sử dụng làm thuốc:
                  </label>
                  <input
                    type="text"
                    value={partUsedStr}
                    onChange={(e) => setPartUsedStr(e.target.value)}
                    placeholder="Lá, thân, rễ, củ, hoa..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Cách chế biến & Sử dụng:
                  </label>
                  <input
                    type="text"
                    value={preparation}
                    onChange={(e) => setPreparation(e.target.value)}
                    placeholder="Sắc nước uống, giã nát đắp ngoài, ngâm rượu..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Tên người cung cấp tư liệu / Nhân chứng dân gian:
                  </label>
                  <input
                    type="text"
                    value={informantName}
                    onChange={(e) => setInformantName(e.target.value)}
                    placeholder="Lương y Nguyễn Văn A / Bác Ba (thôn Đức Bố)"
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Vai trò / Danh xưng:
                  </label>
                  <input
                    type="text"
                    value={informantRole}
                    onChange={(e) => setInformantRole(e.target.value)}
                    placeholder="Lương y chi hội Đông y xã / Người cao tuổi địa phương"
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition-colors"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cập Nhật Hồ Sơ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
