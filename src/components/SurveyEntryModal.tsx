import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Upload, 
  Navigation, 
  Check, 
  AlertTriangle, 
  TreePine, 
  ShieldCheck,
  UserCheck,
  Compass,
  FileCheck2
} from 'lucide-react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel, 
  AICandidate 
} from '../types';

interface SurveyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNewPlant: (newPlant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'>) => void;
  prefillData?: { candidate: AICandidate; imageBase64: string } | null;
  onTriggerMapPickCoords: () => void;
  pickedCoords?: { lat: number; lng: number } | null;
  isAdmin: boolean;
}

export const SurveyEntryModal: React.FC<SurveyEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveNewPlant,
  prefillData,
  onTriggerMapPickCoords,
  pickedCoords,
  isAdmin,
}) => {
  // Form states
  const [vietnameseName, setVietnameseName] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [family, setFamily] = useState('Chưa xác định');
  const [coverImage, setCoverImage] = useState<string>(
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80'
  );
  const [shortDescription, setShortDescription] = useState('');
  
  // Botanical traits
  const [growthForm, setGrowthForm] = useState('');
  const [leavesTrait, setLeavesTrait] = useState('');
  const [flowersTrait, setFlowersTrait] = useState('');
  const [fruitsTrait, setFruitsTrait] = useState('');
  const [rootsTrait, setRootsTrait] = useState('');

  // Location & Habitat
  const [habitat, setHabitat] = useState('Bờ rào & nương đồi ven làng');
  const [habitatCategory, setHabitatCategory] = useState<HabitatCategory>('garden');
  const [communeSection, setCommuneSection] = useState<'Tam Anh Bắc' | 'Tam Anh Nam' | 'Vùng đồi Khe Tre' | 'Ven sông Trầu' | 'Khu vực Đồn Cát'>('Tam Anh Bắc');
  const [addressDescription, setAddressDescription] = useState('Thôn Đức Bố, xã Tam Anh Bắc');
  const [lat, setLat] = useState<number>(15.4635);
  const [lng, setLng] = useState<number>(108.6185);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Conservation & Status
  const [conservationStatus, setConservationStatus] = useState<MedicinalPlant['conservationStatus']>('Ít quan tâm');
  const [conservationLevel, setConservationLevel] = useState<ConservationLevel>('safe');

  // Folk remedies & Informant
  const [folkRemediesText, setFolkRemediesText] = useState('');
  const [partUsedText, setPartUsedText] = useState('Thân cành và lá');
  const [preparationText, setPreparationText] = useState('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
  const [informantName, setInformantName] = useState('Người dân am hiểu cây thuốc bản địa Tam Anh');
  const [informantRole, setInformantRole] = useState('Thôn Đức Bố');
  const [hasConsent, setHasConsent] = useState(true);

  // Surveyor info
  const [surveyor, setSurveyor] = useState('Nhóm nghiên cứu KHKT Trường THCS Tam Anh');
  const [surveyTitle, setSurveyTitle] = useState('Khảo sát bổ sung thực địa cây thuốc Tam Anh 2026');

  // Populate when prefillData changes or modal opens
  useEffect(() => {
    if (prefillData) {
      setVietnameseName(prefillData.candidate.vietnameseName || '');
      setScientificName(prefillData.candidate.scientificName || '');
      setFamily(prefillData.candidate.family || 'Chưa xác định');
      if (prefillData.imageBase64) {
        setCoverImage(prefillData.imageBase64);
      }
      setShortDescription(prefillData.candidate.observedFeatures?.join(', ') || '');
      setFolkRemediesText(prefillData.candidate.folkUseSummary || '');
      if (prefillData.candidate.habitatInCentralVietnam) {
        setHabitat(prefillData.candidate.habitatInCentralVietnam);
      }
    }
  }, [prefillData, isOpen]);

  // Sync with pickedCoords from map if user clicks map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat);
      setLng(pickedCoords.lng);
    }
  }, [pickedCoords]);

  if (!isOpen) return null;

  // Update GPS from device
  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setIsGettingGPS(true);
    setGpsStatusMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGPS(false);
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setGpsStatusMsg(`Đã lấy GPS thành công (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err: GeolocationPositionError) => {
        setIsGettingGPS(false);
        let msg = 'Không thể lấy GPS tự động.';
        if (err.code === 1) msg = 'Quyền GPS bị chặn. Bạn có thể nhập tọa độ hoặc bấm "Chọn trên bản đồ".';
        else if (err.code === 2) msg = 'Vị trí hiện không khả dụng. Bạn có thể chọn trên bản đồ.';
        else if (err.code === 3) msg = 'Hết thời gian chờ GPS.';
        setGpsStatusMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!vietnameseName.trim()) {
      setValidationError('Vui lòng nhập tên cây thuốc.');
      return;
    }

    const remediesArray = folkRemediesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const partsArray = partUsedText
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newRecord: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> = {
      vietnameseName: vietnameseName.trim(),
      otherNames: otherNames ? otherNames.split(',').map((s) => s.trim()) : [],
      scientificName: scientificName.trim() || 'Đang xác minh phân loại học',
      family: family.trim() || 'Chưa phân loại',
      coverImage: coverImage,
      photos: [
        {
          id: 'photo-01',
          url: coverImage,
          caption: `Mẫu thực địa ${vietnameseName}`,
          type: 'whole',
        },
      ],
      shortDescription: shortDescription.trim() || `Cây thuốc ghi nhận tại ${addressDescription}, xã Tam Anh.`,
      identificationTraits: {
        growthForm: growthForm || 'Cây thảo / cây bụi tự nhiên.',
        leaves: leavesTrait || 'Đang cập nhật tiêu bản lá.',
        flowers: flowersTrait || 'Chưa quan sát thấy hoa tại thời điểm khảo sát.',
        fruits: fruitsTrait || 'Chưa quan sát thấy quả.',
        roots: rootsTrait || 'Chưa đào lấy củ rễ để bảo tồn sinh thái.',
      },
      habitat: habitat.trim(),
      habitatCategory: habitatCategory,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        addressDescription: addressDescription.trim(),
        communeSection: communeSection,
      },
      conservationStatus: conservationStatus,
      conservationLevel: conservationLevel,
      traditionalUses: {
        folkRemedies: remediesArray.length > 0 ? remediesArray : ['Tư liệu dân gian đang được thẩm định thêm.'],
        partUsed: partsArray.length > 0 ? partsArray : ['Lá', 'Thân'],
        preparation: preparationText.trim(),
        informantName: informantName.trim(),
        informantRole: informantRole.trim(),
        hasConsent: hasConsent,
      },
      dataSource: {
        type: 'field_survey_2026',
        title: surveyTitle.trim(),
        surveyor: surveyor.trim(),
        surveyDate: new Date().toISOString().split('T')[0],
        verifiedBy: isAdmin ? 'Ban Quản Trị Hệ Thống' : undefined,
      },
      status: isAdmin ? 'verified' : 'pending', // Pending review unless admin
    };

    onSaveNewPlant(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ghi Nhận Điểm Cây Thuốc Mới Thực Địa</h2>
              <p className="text-xs text-stone-400">
                Phiếu khảo sát cơ sở dữ liệu không gian xã Tam Anh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6 text-stone-800 text-xs">
          {/* Note on approval workflow */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <b>Quy trình kiểm chứng khoa học:</b> Bản ghi mới sẽ ở trạng thái <b>"Chờ duyệt"</b> và được hiển thị chính thức sau khi thầy cô / ban chuyên môn đối chiếu thực địa.
              </span>
            </div>
            {isAdmin && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-700 text-white shrink-0">
                Quyền Admin (Tự động duyệt)
              </span>
            )}
          </div>

          {/* Section 1: Basic Plant Names & Photo */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-600" /> 1. Định danh thực vật
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên tiếng Việt phổ thông / địa phương <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={vietnameseName}
                  onChange={(e) => setVietnameseName(e.target.value)}
                  placeholder="Ví dụ: Cà gai leo, Chè vằng, Dây thìa canh..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên gọi dân gian khác (cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={otherNames}
                  onChange={(e) => setOtherNames(e.target.value)}
                  placeholder="Ví dụ: Cà quánh, Cà gai dây..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên khoa học quốc tế (nếu biết):
                </label>
                <input
                  type="text"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder="Ví dụ: Solanum procumbens Lour."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50 italic font-serif"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Họ thực vật:
                </label>
                <input
                  type="text"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  placeholder="Ví dụ: Họ Cà (Solanaceae)"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50"
                />
              </div>
            </div>

            {/* Photo preview & upload */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
              <div className="sm:col-span-4 aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                <img src={coverImage} alt="Ảnh cây thuốc" className="w-full h-full object-cover" />
              </div>

              <div className="sm:col-span-8 space-y-2">
                <label className="block font-semibold text-stone-700">
                  Ảnh thực địa (Lá, hoa, quả hoặc toàn thân cây):
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                    <Camera className="w-4 h-4" />
                    <span>Chụp / Tải ảnh lên</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-stone-500">Hoặc dán URL ảnh:</span>
                </div>
                <input
                  type="text"
                  value={coverImage.startsWith('data:') ? 'Ảnh đính kèm từ thiết bị' : coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  disabled={coverImage.startsWith('data:')}
                  placeholder="https://..."
                  className="w-full p-2 rounded-xl border border-stone-300 text-[11px] bg-stone-50 text-stone-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: GPS Location & Habitat */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-600" /> 2. Sinh cảnh & Tọa độ không gian
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Khu vực địa bàn xã:
                </label>
                <select
                  value={communeSection}
                  onChange={(e: any) => setCommuneSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 font-semibold"
                >
                  <option value="Tam Anh Bắc">Thôn thuộc Tam Anh Bắc (Đức Bố 1, 2...)</option>
                  <option value="Tam Anh Nam">Thôn thuộc Tam Anh Nam (Diêm Phổ...)</option>
                  <option value="Vùng đồi Khe Tre">Vùng đồi rừng Khe Tre / Núi Chúa</option>
                  <option value="Ven sông Trầu">Ven lưu vực sông Trầu / Tam Kỳ</option>
                  <option value="Khu vực Đồn Cát">Khu vực cồn bãi cát ven biển</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Loại sinh cảnh phân bố:
                </label>
                <select
                  value={habitatCategory}
                  onChange={(e: any) => setHabitatCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 font-semibold"
                >
                  <option value="garden">Vườn nhà & bờ rào nương rẫy</option>
                  <option value="forest">Rừng thứ sinh ẩm / đồi núi</option>
                  <option value="hill">Gò đồi cây bụi khô cằn</option>
                  <option value="stream">Ven bờ suối, bờ ruộng ẩm</option>
                  <option value="coastal">Cồn cát / ven biển</option>
                  <option value="red">Vùng đất đỏ / đồi núi bazan</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Mô tả vị trí cụ thể thực tế:
                </label>
                <input
                  type="text"
                  value={addressDescription}
                  onChange={(e) => setAddressDescription(e.target.value)}
                  placeholder="Ví dụ: Bờ rào nhà ông Thạch, thôn Đức Bố 1, cách chân cầu 200m..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>

              {/* GPS Coordinates Box */}
              <div className="sm:col-span-2 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-stone-800">Tọa độ GPS thực địa:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGetCurrentGPS}
                      disabled={isGettingGPS}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isGettingGPS ? 'animate-spin' : ''}`} />
                      <span>{isGettingGPS ? 'Đang đọc GPS...' : 'Lấy GPS thiết bị'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onTriggerMapPickCoords}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chấm điểm trên Bản đồ</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-stone-500 block mb-0.5">Vĩ độ (Latitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block mb-0.5">Kinh độ (Longitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Traditional Folk Uses (Ethical compliance) */}
          <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" /> 3. Kinh nghiệm dân gian & Người cung cấp thông tin
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                Tư liệu tham khảo
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Kinh nghiệm sử dụng dân gian (mỗi công dụng một dòng):
                </label>
                <textarea
                  value={folkRemediesText}
                  onChange={(e) => setFolkRemediesText(e.target.value)}
                  placeholder="Ví dụ:&#10;- Sắc nước uống thanh nhiệt, giải độc gan&#10;- Giã đắp giảm sưng đau khớp gối..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 resize-none h-16 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Bộ phận thường dùng:
                  </label>
                  <input
                    type="text"
                    value={partUsedText}
                    onChange={(e) => setPartUsedText(e.target.value)}
                    placeholder="Ví dụ: Rễ củ, Thân lá phơi khô"
                    className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Cách thức chế biến truyền thống:
                  </label>
                  <input
                    type="text"
                    value={preparationText}
                    onChange={(e) => setPreparationText(e.target.value)}
                    placeholder="Ví dụ: Sao vàng hạ thổ, sắc 20g lấy nước uống"
                    className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Họ tên người / lương y cung cấp thông tin:
                  </label>
                  <input
                    type="text"
                    value={informantName}
                    onChange={(e) => setInformantName(e.target.value)}
                    placeholder="Ví dụ: Ông Trần Văn Tuấn (Hội Đông y xã)"
                    className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-emerald-900">
                    <input
                      type="checkbox"
                      checked={hasConsent}
                      onChange={(e) => setHasConsent(e.target.checked)}
                      className="rounded border-stone-400 text-emerald-600 h-4 w-4"
                    />
                    <span>Người cung cấp đã đồng ý chia sẻ tư liệu</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Surveyor information */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5">
              4. Người khảo sát & Hồ sơ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Họ tên người khảo sát / Nhóm nghiên cứu:
                </label>
                <input
                  type="text"
                  value={surveyor}
                  onChange={(e) => setSurveyor(e.target.value)}
                  placeholder="Ví dụ: Nhóm STEM Trường THCS Tam Anh"
                  className="w-full p-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên chương trình / Đề tài khảo sát:
                </label>
                <input
                  type="text"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition-colors"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-all hover:scale-[1.01]"
            >
              <Check className="w-4 h-4" />
              <span>Lưu phiếu khảo sát thực địa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
