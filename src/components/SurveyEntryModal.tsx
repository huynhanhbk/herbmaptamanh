import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Navigation, 
  Check, 
  AlertTriangle, 
  TreePine, 
  ShieldCheck,
  UserCheck,
  Compass,
  FileCheck2,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw
} from 'lucide-react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel, 
  UnifiedConservationStatus,
  AICandidate,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  CommuneVillage
} from '../types';
import { getStoredPlants } from '../utils/storage';

interface SurveyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNewPlant: (
    newPlant: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
    explicitSpeciesId?: string
  ) => void;
  prefillData?: { candidate: AICandidate; imageBase64: string } | null;
  onTriggerMapPickCoords: () => void;
  pickedCoords?: { lat: number; lng: number } | null;
  isAdmin: boolean;
  existingPlants?: MedicinalPlant[];
}

export const SurveyEntryModal: React.FC<SurveyEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveNewPlant,
  prefillData,
  onTriggerMapPickCoords,
  pickedCoords,
  isAdmin,
  existingPlants,
}) => {
  // Mode: Surveying an existing species in DB vs Adding a completely new species
  const [entryMode, setEntryMode] = useState<'existing_species' | 'new_species'>('existing_species');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('TA-HERB-001');
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState('');
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [showStandardTraits, setShowStandardTraits] = useState(false);

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

  // Location & Habitat (The key survey variables)
  const [habitat, setHabitat] = useState('Bờ rào & nương đồi ven làng');
  const [habitatCategory, setHabitatCategory] = useState<HabitatCategory>('garden');
  const [communeSection, setCommuneSection] = useState<CommuneVillage>('Thôn Đức Bố');
  const [addressDescription, setAddressDescription] = useState('Thôn Đức Bố, xã Tam Anh');
  const [lat, setLat] = useState<number>(15.4635);
  const [lng, setLng] = useState<number>(108.6185);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Conservation & Status
  const [conservationStatus, setConservationStatus] = useState<UnifiedConservationStatus>('An toàn');
  const [conservationLevel, setConservationLevel] = useState<ConservationLevel>('safe');

  const handleConservationStatusChange = (val: UnifiedConservationStatus) => {
    setConservationStatus(val);
    if (val === 'Nguy cấp / Cần bảo tồn') {
      setConservationLevel('endangered');
    } else if (val === 'Sắp nguy cấp') {
      setConservationLevel('vulnerable');
    } else {
      setConservationLevel('safe');
    }
  };

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

  // Ref to track if modal reopened due to map coordinate picking
  const isReturningFromMapPickRef = useRef(false);

  // Compute unique species list from stored plants (grouping multiple survey points of the same species)
  const uniqueSpeciesList = useMemo(() => {
    const list = existingPlants && existingPlants.length > 0 ? existingPlants : getStoredPlants();
    const map = new Map<string, MedicinalPlant>();
    list.forEach((p) => {
      const key = (p.vietnameseName || p.id).trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.vietnameseName.localeCompare(b.vietnameseName, 'vi'));
  }, [existingPlants, isOpen]);

  // Selected existing plant object
  const selectedExistingPlant = useMemo(() => {
    return uniqueSpeciesList.find((p) => p.id === selectedSpeciesId) || uniqueSpeciesList[0] || null;
  }, [uniqueSpeciesList, selectedSpeciesId]);

  // Helper to load an existing plant's botanical data
  const applyExistingPlant = (plant: MedicinalPlant) => {
    setSelectedSpeciesId(plant.id);
    setVietnameseName(plant.vietnameseName);
    setOtherNames((plant.otherNames || []).join(', '));
    setScientificName(plant.scientificName);
    setFamily(plant.family);
    setCoverImage(plant.coverImage);
    setShortDescription(plant.shortDescription);
    setGrowthForm(plant.identificationTraits?.growthForm || '');
    setLeavesTrait(plant.identificationTraits?.leaves || '');
    setFlowersTrait(plant.identificationTraits?.flowers || '');
    setFruitsTrait(plant.identificationTraits?.fruits || '');
    setRootsTrait(plant.identificationTraits?.roots || '');
    setHabitat(plant.habitat);
    setHabitatCategory(plant.habitatCategory);
    setConservationStatus(plant.conservationStatus);
    setConservationLevel(plant.conservationLevel);
    setFolkRemediesText((plant.traditionalUses?.folkRemedies || []).join('\n'));
    setPartUsedText((plant.traditionalUses?.partUsed || []).join(', '));
    setPreparationText(plant.traditionalUses?.preparation || 'Rửa sạch phơi khô sắc nước uống');
  };

  // Full reset function for a brand new survey
  const resetFormToDefault = (targetMode: 'existing_species' | 'new_species' = 'existing_species') => {
    setEntryMode(targetMode);
    setSpeciesSearchQuery('');
    setIsSpeciesDropdownOpen(false);
    setShowStandardTraits(false);
    setValidationError(null);
    setGpsStatusMsg(null);
    setIsGettingGPS(false);

    // Reset survey field location & informants to fresh baseline
    setHabitat('Bờ rào & nương đồi ven làng');
    setHabitatCategory('garden');
    setCommuneSection('Thôn Đức Bố');
    setAddressDescription('Thôn Đức Bố, xã Tam Anh');
    setLat(15.4635);
    setLng(108.6185);
    setInformantName('Người dân am hiểu cây thuốc bản địa Tam Anh');
    setInformantRole('Thôn Đức Bố');
    setHasConsent(true);
    setSurveyor('Nhóm nghiên cứu KHKT Trường THCS Tam Anh');
    setSurveyTitle('Khảo sát bổ sung thực địa cây thuốc Tam Anh 2026');

    if (targetMode === 'existing_species' && uniqueSpeciesList.length > 0) {
      const defaultPlant = uniqueSpeciesList[0];
      applyExistingPlant(defaultPlant);
    } else {
      setSelectedSpeciesId('');
      setVietnameseName('');
      setOtherNames('');
      setScientificName('');
      setFamily('Chưa xác định');
      setCoverImage('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80');
      setShortDescription('');
      setGrowthForm('');
      setLeavesTrait('');
      setFlowersTrait('');
      setFruitsTrait('');
      setRootsTrait('');
      setConservationStatus('An toàn');
      setConservationLevel('safe');
      setFolkRemediesText('');
      setPartUsedText('Thân cành và lá');
      setPreparationText('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
    }
  };

  // Handle modal lifecycle & prefilling
  useEffect(() => {
    if (!isOpen) {
      // When modal is closed without map picking active, reset map pick flag
      return;
    }

    // If reopening because coordinates were picked from map, preserve existing form values and only update coordinates
    if (isReturningFromMapPickRef.current) {
      isReturningFromMapPickRef.current = false;
      return;
    }

    if (prefillData) {
      const candidateName = (prefillData.candidate.vietnameseName || '').trim().toLowerCase();
      const candidateSci = (prefillData.candidate.scientificName || '').trim().toLowerCase();

      // Check if AI candidate matches any existing plant
      const matched = uniqueSpeciesList.find((p) => {
        const pName = p.vietnameseName.trim().toLowerCase();
        const pSci = p.scientificName.trim().toLowerCase();
        return (
          pName === candidateName ||
          pName.includes(candidateName) ||
          candidateName.includes(pName) ||
          (pSci && candidateSci && pSci === candidateSci)
        );
      });

      if (matched) {
        setEntryMode('existing_species');
        applyExistingPlant(matched);
        if (prefillData.imageBase64) {
          setCoverImage(prefillData.imageBase64);
        }
      } else {
        setEntryMode('new_species');
        setSelectedSpeciesId('');
        setVietnameseName(prefillData.candidate.vietnameseName || '');
        setOtherNames('');
        setScientificName(prefillData.candidate.scientificName || '');
        setFamily(prefillData.candidate.family || 'Chưa xác định');
        if (prefillData.imageBase64) {
          setCoverImage(prefillData.imageBase64);
        }
        setShortDescription(prefillData.candidate.observedFeatures?.join(', ') || '');
        setGrowthForm('');
        setLeavesTrait(prefillData.candidate.observedFeatures?.join(', ') || '');
        setFlowersTrait('');
        setFruitsTrait('');
        setRootsTrait('');
        setFolkRemediesText(prefillData.candidate.folkUseSummary || '');
        setPartUsedText('Thân cành và lá');
        setPreparationText('Rửa sạch phơi khô sắc nước uống hoặc giã tươi');
        if (prefillData.candidate.habitatInCentralVietnam) {
          setHabitat(prefillData.candidate.habitatInCentralVietnam);
        }
        setCommuneSection('Thôn Đức Bố');
        setAddressDescription('Thôn Đức Bố, xã Tam Anh');
        setLat(15.4635);
        setLng(108.6185);
      }
    } else {
      // Fresh new survey: Reset all form fields to default!
      resetFormToDefault('existing_species');
    }
  }, [isOpen, prefillData]);

  // Sync with pickedCoords from map when user clicks map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat);
      setLng(pickedCoords.lng);
    }
  }, [pickedCoords]);

  // Filtered species in dropdown
  const filteredSpecies = useMemo(() => {
    if (!speciesSearchQuery.trim()) return uniqueSpeciesList;
    const q = speciesSearchQuery.toLowerCase();
    return uniqueSpeciesList.filter(
      (p) =>
        p.vietnameseName.toLowerCase().includes(q) ||
        p.scientificName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q)
    );
  }, [uniqueSpeciesList, speciesSearchQuery]);

  // Check if current name matches any existing species while typing in new_species mode
  const autoDetectedExistingMatch = useMemo(() => {
    if (entryMode !== 'new_species' || !vietnameseName.trim()) return null;
    const name = vietnameseName.trim().toLowerCase();
    return uniqueSpeciesList.find((p) => p.vietnameseName.trim().toLowerCase() === name);
  }, [entryMode, vietnameseName, uniqueSpeciesList]);

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
        if (err.code === 1) msg = 'Quyền GPS bị chặn. Bạn có thể nhập tọa độ hoặc bấm "Chấm điểm trên Bản đồ".';
        else if (err.code === 2) msg = 'Vị trí hiện không khả dụng. Bạn có thể chọn trên bản đồ.';
        else if (err.code === 3) msg = 'Hết thời gian chờ GPS.';
        setGpsStatusMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Handle triggering map coordinate picking while preserving current typed form state
  const handlePickCoordsOnMap = () => {
    isReturningFromMapPickRef.current = true;
    onTriggerMapPickCoords();
  };

  // Handle switching to existing species mode
  const handleSwitchToExistingSpecies = () => {
    setEntryMode('existing_species');
    const plant = selectedExistingPlant || uniqueSpeciesList[0];
    if (plant) {
      applyExistingPlant(plant);
    }
  };

  // Handle switching to new species mode
  const handleSwitchToNewSpecies = () => {
    setEntryMode('new_species');
    setSelectedSpeciesId('');
    setVietnameseName('');
    setOtherNames('');
    setScientificName('');
    setFamily('Chưa xác định');
    setCoverImage('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80');
    setShortDescription('');
    setGrowthForm('');
    setLeavesTrait('');
    setFlowersTrait('');
    setFruitsTrait('');
    setRootsTrait('');
    setFolkRemediesText('');
    setPartUsedText('Thân cành và lá');
    setPreparationText('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
    setValidationError(null);
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

    const plantName = entryMode === 'existing_species' && selectedExistingPlant 
      ? selectedExistingPlant.vietnameseName 
      : vietnameseName.trim();

    if (!plantName) {
      setValidationError('Vui lòng chọn hoặc nhập tên cây thuốc.');
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

    // If surveying an existing plant, preserve its exact ID (e.g. TA-HERB-001)
    const explicitId = entryMode === 'existing_species' && selectedExistingPlant 
      ? selectedExistingPlant.id 
      : autoDetectedExistingMatch 
      ? autoDetectedExistingMatch.id 
      : undefined;

    const basePlant = entryMode === 'existing_species' && selectedExistingPlant ? selectedExistingPlant : null;

    const newRecord: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string } = {
      id: explicitId,
      vietnameseName: basePlant ? basePlant.vietnameseName : vietnameseName.trim(),
      otherNames: basePlant ? basePlant.otherNames : (otherNames ? otherNames.split(',').map((s) => s.trim()) : []),
      scientificName: basePlant ? basePlant.scientificName : (scientificName.trim() || 'Đang xác minh phân loại học'),
      family: basePlant ? basePlant.family : (family.trim() || 'Chưa phân loại'),
      coverImage: coverImage || (basePlant ? basePlant.coverImage : 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80'),
      photos: [
        {
          id: `photo-${Date.now()}`,
          url: coverImage,
          caption: `Mẫu thực địa ${plantName} tại ${addressDescription}`,
          type: 'whole',
        },
      ],
      shortDescription: shortDescription.trim() || (basePlant ? basePlant.shortDescription : `Cây thuốc ghi nhận tại ${addressDescription}, xã Tam Anh.`),
      identificationTraits: basePlant?.identificationTraits || {
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
        folkRemedies: remediesArray.length > 0 ? remediesArray : (basePlant?.traditionalUses.folkRemedies || ['Tư liệu dân gian đang được thẩm định thêm.']),
        partUsed: partsArray.length > 0 ? partsArray : (basePlant?.traditionalUses.partUsed || ['Lá', 'Thân']),
        preparation: preparationText.trim() || (basePlant?.traditionalUses.preparation || 'Rửa sạch phơi khô sắc nước uống'),
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
      status: isAdmin ? 'verified' : 'pending',
    };

    onSaveNewPlant(newRecord, explicitId);
    resetFormToDefault('existing_species');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Phiếu Khảo Sát Thực Địa Cây Thuốc</h2>
              <p className="text-xs text-stone-400">
                Ghi nhận tọa độ không gian & dữ liệu sinh cảnh xã Tam Anh
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
          
          {/* Scientific Review & Verification Info */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <b>Quy trình số hóa thực địa:</b> Phiếu ghi nhận sẽ được hiển thị ngay trên Bản đồ số và đưa vào danh sách <b>"Chờ duyệt"</b> để Hội đồng KHKT thẩm định.
              </span>
            </div>
            {isAdmin && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-700 text-white shrink-0">
                Admin (Tự động duyệt)
              </span>
            )}
          </div>

          {/* MODE SELECTOR: Surveying Existing Species vs New Species */}
          <div className="bg-stone-50 p-2 rounded-2xl border border-stone-200">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleSwitchToExistingSpecies}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  entryMode === 'existing_species'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Khảo sát loài đã có trong CSDL</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  entryMode === 'existing_species' ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  Giữ nguyên mã ID
                </span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToNewSpecies}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  entryMode === 'new_species'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Thêm loài mới chưa có</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  entryMode === 'new_species' ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  Cấp mã mới
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 1: SPECIES IDENTIFICATION */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-600" /> 1. Định danh loài cây thuốc
              </span>
              {entryMode === 'existing_species' && selectedExistingPlant && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-900 text-emerald-400">
                  Mã CSDL: {selectedExistingPlant.id}
                </span>
              )}
            </h3>

            {/* If in EXISTING SPECIES mode */}
            {entryMode === 'existing_species' && (
              <div className="space-y-3">
                <div className="relative">
                  <label className="block font-semibold text-stone-700 mb-1">
                    Chọn loài cây thuốc trong CSDL để bổ sung điểm khảo sát thực địa:
                  </label>
                  
                  {/* Select Species Dropdown Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSpeciesDropdownOpen(!isSpeciesDropdownOpen)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white flex items-center justify-between text-left hover:border-emerald-500 transition-colors shadow-2xs"
                    >
                      {selectedExistingPlant ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={selectedExistingPlant.coverImage}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-mono font-bold text-emerald-800 mr-2">[{selectedExistingPlant.id}]</span>
                            <span className="font-bold text-stone-900">{selectedExistingPlant.vietnameseName}</span>
                            <span className="text-stone-500 italic font-serif ml-2">({selectedExistingPlant.scientificName})</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400">Chọn một loài cây thuốc...</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isSpeciesDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isSpeciesDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-300 rounded-2xl shadow-xl z-30 overflow-hidden max-h-64 flex flex-col">
                        <div className="p-2 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Gõ tìm tên cây, tên khoa học, mã số..."
                            value={speciesSearchQuery}
                            onChange={(e) => setSpeciesSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs focus:outline-none placeholder-stone-400"
                            autoFocus
                          />
                        </div>

                        <div className="overflow-y-auto divide-y divide-stone-100">
                          {filteredSpecies.map((p) => {
                            const isSelected = selectedSpeciesId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  applyExistingPlant(p);
                                  setIsSpeciesDropdownOpen(false);
                                  setSpeciesSearchQuery('');
                                }}
                                className={`w-full p-2.5 flex items-center justify-between text-left hover:bg-emerald-50/70 transition-colors ${
                                  isSelected ? 'bg-emerald-50 font-bold text-emerald-950' : 'text-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={p.coverImage}
                                    alt=""
                                    className="w-7 h-7 rounded-lg object-cover border border-stone-200 shrink-0"
                                  />
                                  <div className="truncate">
                                    <span className="font-mono text-[11px] text-emerald-700 font-bold mr-1.5">[{p.id}]</span>
                                    <span className="text-xs font-semibold text-stone-900">{p.vietnameseName}</span>
                                    <span className="text-[11px] text-stone-500 italic font-serif block truncate">{p.scientificName} • {p.family}</span>
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preserved Identification Summary Card */}
                {selectedExistingPlant && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-emerald-950 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-emerald-800 text-white px-2 py-0.5 rounded-md">
                          {selectedExistingPlant.id}
                        </span>
                        <span className="font-bold text-sm text-emerald-950">{selectedExistingPlant.vietnameseName}</span>
                        <span className="italic font-serif text-xs text-emerald-800">({selectedExistingPlant.scientificName})</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-800 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedExistingPlant.family}
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                      💡 <b>Giữ nguyên mã định danh {selectedExistingPlant.id}:</b> Bạn đang ghi nhận thêm một điểm phân bố thực tế mới cho loài <b>{selectedExistingPlant.vietnameseName}</b>. Dữ liệu phân loại học và bài thuốc chuẩn sẽ được kế thừa. Hãy bổ sung tọa độ GPS, sinh cảnh và ghi nhận tại điểm này ở các mục bên dưới.
                    </p>

                    {/* Toggle standard botanical description */}
                    <button
                      type="button"
                      onClick={() => setShowStandardTraits(!showStandardTraits)}
                      className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 underline underline-offset-2"
                    >
                      {showStandardTraits ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Ẩn đặc điểm nhận dạng chuẩn
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Xem đặc điểm nhận dạng chuẩn & công dụng của loài
                        </>
                      )}
                    </button>

                    {showStandardTraits && (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/80 text-[11px] space-y-1.5 text-stone-700 animate-fadeIn">
                        <div><b>Dạng sống:</b> {selectedExistingPlant.identificationTraits?.growthForm}</div>
                        <div><b>Đặc điểm lá:</b> {selectedExistingPlant.identificationTraits?.leaves}</div>
                        <div><b>Hoa / Quả:</b> {selectedExistingPlant.identificationTraits?.flowers} / {selectedExistingPlant.identificationTraits?.fruits}</div>
                        <div><b>Bài thuốc lưu truyền:</b> {(selectedExistingPlant.traditionalUses?.folkRemedies || []).join('; ')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* If in NEW SPECIES mode */}
            {entryMode === 'new_species' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                  🌱 <b>Thêm loài mới chưa có trong CSDL:</b> Nhập đầy đủ thông tin phân loại học bên dưới. Sau khi lưu, hệ thống sẽ tự động cấp mã định danh mới tiếp theo (ví dụ: <code>TA-HERB-016</code>) vào danh lục khoa học.
                </div>

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
                      placeholder="Ví dụ: Ba kích, Huyết đằng, Xuyên tâm liên..."
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50"
                    />
                    
                    {/* Auto-detect warning if user types an existing name */}
                    {autoDetectedExistingMatch && (
                      <div className="mt-1.5 p-2 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] flex items-center justify-between gap-2">
                        <span>
                          Phát hiện loài <b>"{autoDetectedExistingMatch.vietnameseName}"</b> đã có mã <b>{autoDetectedExistingMatch.id}</b> trong CSDL!
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEntryMode('existing_species');
                            applyExistingPlant(autoDetectedExistingMatch);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px] shrink-0"
                        >
                          Giữ mã {autoDetectedExistingMatch.id}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên gọi dân gian khác (cách nhau bằng dấu phẩy):
                    </label>
                    <input
                      type="text"
                      value={otherNames}
                      onChange={(e) => setOtherNames(e.target.value)}
                      placeholder="Ví dụ: Dây ruột gà, Kê huyết đằng..."
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
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
                      placeholder="Ví dụ: Morinda officinalis How"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
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
                      placeholder="Ví dụ: Họ Cà phê (Rubiaceae)"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Photo preview & upload for the survey point */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
              <div className="sm:col-span-4 aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                <img src={coverImage} alt="Ảnh cây thuốc" className="w-full h-full object-cover" />
              </div>

              <div className="sm:col-span-8 space-y-2">
                <label className="block font-semibold text-stone-700">
                  Ảnh chụp thực địa tại điểm khảo sát này (Lá, thân, hoa hoặc quả):
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
                  <span className="text-[11px] text-stone-500">Hoặc dán link ảnh:</span>
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

          {/* SECTION 2: GPS LOCATION, COMMUNE SECTION & HABITAT (CRITICAL FOR NEW SURVEYS) */}
          <div className="space-y-3 bg-stone-50/80 p-4 rounded-3xl border border-stone-200">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" /> 2. Khu vực địa bàn & Tọa độ không gian điểm mới
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Thực địa Tam Anh
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Khu vực địa bàn thôn (15 thôn) <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={communeSection}
                  onChange={(e: any) => setCommuneSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white font-semibold text-xs"
                >
                  {COMMUNE_VILLAGES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Loại sinh cảnh phân bố (06 loại) <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={habitatCategory}
                  onChange={(e: any) => setHabitatCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white font-semibold text-xs"
                >
                  {HABITAT_OPTIONS.map((h) => (
                    <option key={h.id} value={h.id}>{h.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Mô tả đặc điểm sinh cảnh thực tế:
                </label>
                <input
                  type="text"
                  value={habitat}
                  onChange={(e) => setHabitat(e.target.value)}
                  placeholder="Ví dụ: Dưới tán cây bụi chân đồi cát, ven bờ rào vườn sau nhà dân..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                />
              </div>

              {/* Unified Conservation Status Selector */}
              <div className="sm:col-span-2 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80">
                <label className="block font-bold text-emerald-950 mb-1.5 flex items-center justify-between">
                  <span>Trạng thái bảo tồn thực tế tại điểm khảo sát:</span>
                  <span className="text-[10px] font-normal text-emerald-800">
                    Căn cứ mức độ phong phú & nguy cơ khai thác thực tế
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleConservationStatusChange('An toàn')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      conservationStatus === 'An toàn'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🟢 An toàn</span>
                    </div>
                    <span className={`text-[10px] ${conservationStatus === 'An toàn' ? 'text-emerald-100' : 'text-stone-500'}`}>
                      Cây phổ biến, sinh trưởng tốt trong tự nhiên/vườn
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConservationStatusChange('Sắp nguy cấp')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      conservationStatus === 'Sắp nguy cấp'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🟡 Sắp nguy cấp</span>
                    </div>
                    <span className={`text-[10px] ${conservationStatus === 'Sắp nguy cấp' ? 'text-amber-100' : 'text-stone-500'}`}>
                      Quần thể thu hẹp / Bị thu hái quá mức
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConservationStatusChange('Nguy cấp / Cần bảo tồn')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      conservationStatus === 'Nguy cấp / Cần bảo tồn'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-rose-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🔴 Nguy cấp / Cần bảo tồn</span>
                    </div>
                    <span className={`text-[10px] ${conservationStatus === 'Nguy cấp / Cần bảo tồn' ? 'text-rose-100' : 'text-stone-500'}`}>
                      Quý hiếm theo Sách Đỏ, ưu tiên bảo vệ
                    </span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Mô tả vị trí cụ thể thực tế (Địa chỉ, mốc nhận biết):
                </label>
                <input
                  type="text"
                  value={addressDescription}
                  onChange={(e) => setAddressDescription(e.target.value)}
                  placeholder="Ví dụ: Bờ rào nhà ông Thạch, thôn Đức Bố 1, cách chân cầu 200m..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* GPS Coordinates Box */}
              <div className="sm:col-span-2 bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Tọa độ GPS thực địa:
                  </span>
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
                      onClick={handlePickCoordsOnMap}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chấm điểm trên Bản đồ</span>
                    </button>
                  </div>
                </div>

                {gpsStatusMsg && (
                  <p className="text-[11px] text-emerald-700 font-medium">{gpsStatusMsg}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-stone-500 block mb-0.5 font-medium">Vĩ độ (Latitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 font-mono bg-stone-50"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block mb-0.5 font-medium">Kinh độ (Longitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full p-2 rounded-xl border border-stone-300 font-mono bg-stone-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: TRADITIONAL FOLK USES & INFORMANT */}
          <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" /> 3. Kinh nghiệm dân gian & Người cung cấp tư liệu tại điểm này
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                Tri thức bản địa
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Kinh nghiệm sử dụng dân gian (mỗi bài thuốc một dòng):
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
                    Họ tên người / lương y cung cấp thông tin tại điểm này:
                  </label>
                  <input
                    type="text"
                    value={informantName}
                    onChange={(e) => setInformantName(e.target.value)}
                    placeholder="Ví dụ: Ông Trần Văn Tuấn (Hội Đông y xã Tam Anh)"
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

          {/* SECTION 4: SURVEYOR INFORMATION */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5">
              4. Người khảo sát & Hồ sơ thực địa
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

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <div className="text-[11px] text-stone-500">
              {entryMode === 'existing_species' && selectedExistingPlant ? (
                <span>
                  Đang ghi nhận điểm mới cho: <b className="text-emerald-700">[{selectedExistingPlant.id}] {selectedExistingPlant.vietnameseName}</b>
                </span>
              ) : (
                <span>Đang thêm loài mới vào danh lục</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => resetFormToDefault(entryMode)}
                className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1 border border-stone-200"
                title="Xóa trắng các mục đã nhập để ghi phiếu mới từ đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm mới phiếu</span>
              </button>

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
          </div>
        </form>
      </div>
    </div>
  );
};
