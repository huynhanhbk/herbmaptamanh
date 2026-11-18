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
  AICandidate,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  CommuneVillage,
  getPlantGenus,
  getPlantSpecies
} from '../types';
import { getStoredPlants } from '../utils/storage';
import { compressImageFile, compressBase64Image } from '../utils/imageCompressor';

const DEFAULT_COVER_IMAGE =
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';
const MAX_SURVEY_PHOTOS = 5;

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

  // Form states — Mục 1: Định danh loài cây thuốc
  const [vietnameseName, setVietnameseName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [family, setFamily] = useState('');
  const [genus, setGenus] = useState('');
  const [species, setSpecies] = useState('');
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVER_IMAGE);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [activePreviewPhotoIndex, setActivePreviewPhotoIndex] = useState<number>(0);
  const [photoUploadNotice, setPhotoUploadNotice] = useState<string | null>(null);
  const [shortDescription, setShortDescription] = useState('');
  
  // Botanical traits (4 Unified Fields)
  const [growthForm, setGrowthForm] = useState('');
  const [leavesTrait, setLeavesTrait] = useState('');
  const [flowersAndFruitsTrait, setFlowersAndFruitsTrait] = useState('');
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

  // Folk remedies & Informant
  const [folkRemediesText, setFolkRemediesText] = useState('');
  const [partUsedText, setPartUsedText] = useState('');
  const [preparationText, setPreparationText] = useState('');
  const [informantName, setInformantName] = useState('Người dân am hiểu cây thuốc bản địa');
  const [informantRole, setInformantRole] = useState('');
  const [hasConsent, setHasConsent] = useState(true);

  // Mục 4: Surveyor info
  const [surveyor, setSurveyor] = useState('');
  const [surveyorAddress, setSurveyorAddress] = useState('');
  const [surveyorPhone, setSurveyorPhone] = useState('');

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
    setScientificName(plant.scientificName || '');
    setFamily(plant.family || '');
    setGenus(getPlantGenus(plant));
    setSpecies(getPlantSpecies(plant));
    setCoverImage(plant.coverImage);
    setUploadedPhotos([]);
    setActivePreviewPhotoIndex(0);
    setPhotoUploadNotice(null);
    setShortDescription(plant.shortDescription);
    setGrowthForm(plant.identificationTraits?.growthForm || '');
    setLeavesTrait(plant.identificationTraits?.leaves || '');
    const flw = plant.identificationTraits?.flowers || '';
    const frt = plant.identificationTraits?.fruits || '';
    setFlowersAndFruitsTrait(flw ? (frt && !flw.includes(frt) ? `${flw} — ${frt}` : flw) : frt);
    setRootsTrait(plant.identificationTraits?.roots || '');
    setHabitat(plant.habitat);
    setHabitatCategory(plant.habitatCategory);
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
    setAddressDescription('');
    setLat(15.4635);
    setLng(108.6185);
    setInformantName('Người dân am hiểu cây thuốc bản địa');
    setInformantRole('');
    setHasConsent(true);
    setSurveyor('');
    setSurveyorAddress('');
    setSurveyorPhone('');

    if (targetMode === 'existing_species' && uniqueSpeciesList.length > 0) {
      const defaultPlant = uniqueSpeciesList[0];
      applyExistingPlant(defaultPlant);
    } else {
      setSelectedSpeciesId('');
      setVietnameseName('');
      setScientificName('');
      setFamily('');
      setGenus('');
      setSpecies('');
      setCoverImage(DEFAULT_COVER_IMAGE);
      setUploadedPhotos([]);
      setActivePreviewPhotoIndex(0);
      setPhotoUploadNotice(null);
      setShortDescription('');
      setGrowthForm('');
      setLeavesTrait('');
      setFlowersAndFruitsTrait('');
      setRootsTrait('');
      setFolkRemediesText('');
      setPartUsedText('Thân cành và lá');
      setPreparationText('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
    }
  };

  // Handle modal lifecycle & prefilling
  useEffect(() => {
    if (!isOpen) {
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
          setUploadedPhotos([prefillData.imageBase64]);
          setActivePreviewPhotoIndex(0);
        } else {
          setUploadedPhotos([]);
        }
      } else {
        setEntryMode('new_species');
        setSelectedSpeciesId('');
        const aiName = prefillData.candidate.vietnameseName || '';
        const aiOther = prefillData.candidate.otherNames ? ` (${prefillData.candidate.otherNames})` : '';
        setVietnameseName(`${aiName}${aiOther}`.trim());
        const aiSci = prefillData.candidate.scientificName || '';
        setScientificName(aiSci);
        setFamily(prefillData.candidate.family || '');
        setGenus(getPlantGenus({ scientificName: aiSci }));
        setSpecies(getPlantSpecies({ scientificName: aiSci }));
        if (prefillData.imageBase64) {
          setCoverImage(prefillData.imageBase64);
          setUploadedPhotos([prefillData.imageBase64]);
          setActivePreviewPhotoIndex(0);
        } else {
          setUploadedPhotos([]);
        }
        setShortDescription(prefillData.candidate.observedFeatures?.join(', ') || '');
        setGrowthForm('');
        setLeavesTrait(prefillData.candidate.observedFeatures?.join(', ') || '');
        setFlowersAndFruitsTrait('');
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
        (p.otherNames || []).some((n) => n.toLowerCase().includes(q)) ||
        p.scientificName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q)
    );
  }, [uniqueSpeciesList, speciesSearchQuery]);

  // Check if current name matches any existing species while typing in new_species mode
  const autoDetectedExistingMatch = useMemo(() => {
    if (entryMode !== 'new_species' || !vietnameseName.trim()) return null;
    const primaryInput = vietnameseName.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    if (!primaryInput) return null;
    return uniqueSpeciesList.find((p) => p.vietnameseName.trim().toLowerCase() === primaryInput);
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
    setScientificName('');
    setFamily('');
    setGenus('');
    setSpecies('');
    setCoverImage(DEFAULT_COVER_IMAGE);
    setUploadedPhotos([]);
    setActivePreviewPhotoIndex(0);
    setPhotoUploadNotice(null);
    setShortDescription('');
    setGrowthForm('');
    setLeavesTrait('');
    setFlowersAndFruitsTrait('');
    setRootsTrait('');
    setFolkRemediesText('');
    setPartUsedText('');
    setPreparationText('');
    setValidationError(null);
  };

  // Handle Photo upload with automatic compression (supports up to 5 photos)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from<File>(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setPhotoUploadNotice(null);
    const remainingSlots = MAX_SURVEY_PHOTOS - uploadedPhotos.length;
    if (remainingSlots <= 0) {
      setPhotoUploadNotice(`Đã đạt tối đa ${MAX_SURVEY_PHOTOS} ảnh thực địa cho mỗi phiếu.`);
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setPhotoUploadNotice(
        `Chỉ thêm ${remainingSlots} ảnh (tối đa ${MAX_SURVEY_PHOTOS} ảnh cho mỗi phiếu khảo sát).`
      );
    }

    const processedImages: string[] = [];
    for (const file of selectedFiles) {
      try {
        let compressed = await compressImageFile(file, 900, 900, 0.68);
        if (compressed.length > 140000) {
          compressed = await compressBase64Image(compressed, 720, 720, 0.55, true);
        }
        processedImages.push(compressed);
      } catch {
        const fallbackDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        if (fallbackDataUrl) processedImages.push(fallbackDataUrl);
      }
    }

    if (processedImages.length > 0) {
      const nextPhotos = [...uploadedPhotos, ...processedImages].slice(0, MAX_SURVEY_PHOTOS);
      setUploadedPhotos(nextPhotos);
      setCoverImage(nextPhotos[0]);
      setActivePreviewPhotoIndex(nextPhotos.length - 1);
    }
  };

  const handleRemoveUploadedPhoto = (indexToRemove: number) => {
    const nextPhotos = uploadedPhotos.filter((_, idx) => idx !== indexToRemove);
    setUploadedPhotos(nextPhotos);
    setPhotoUploadNotice(null);
    if (nextPhotos.length > 0) {
      setCoverImage(nextPhotos[0]);
      setActivePreviewPhotoIndex((prev) => Math.min(prev, nextPhotos.length - 1));
    } else {
      const fallbackImg =
        entryMode === 'existing_species' && selectedExistingPlant
          ? selectedExistingPlant.coverImage
          : DEFAULT_COVER_IMAGE;
      setCoverImage(fallbackImg);
      setActivePreviewPhotoIndex(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const plantNameRaw = entryMode === 'existing_species' && selectedExistingPlant 
      ? selectedExistingPlant.vietnameseName 
      : vietnameseName.trim();

    if (!plantNameRaw) {
      setValidationError('Vui lòng chọn hoặc nhập Tên cây thuốc (Tên gọi dân gian khác).');
      return;
    }

    if (!surveyor.trim()) {
      setValidationError('Vui lòng nhập Họ tên người khảo sát / Nhóm nghiên cứu.');
      return;
    }

    if (!surveyorPhone.trim()) {
      setValidationError('Vui lòng nhập Số điện thoại / Zalo.');
      return;
    }

    // Parse primary Vietnamese name and folk aliases inside parentheses if provided in new_species mode
    let parsedPrimaryName = plantNameRaw;
    let parsedOtherNames: string[] = [];
    if (entryMode === 'new_species') {
      const parenMatch = plantNameRaw.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (parenMatch) {
        parsedPrimaryName = parenMatch[1].trim();
        parsedOtherNames = parenMatch[2]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
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
    const displayLocation = addressDescription.trim() || communeSection;

    const effectivePhotoUrls =
      uploadedPhotos.length > 0
        ? uploadedPhotos
        : [coverImage || (basePlant ? basePlant.coverImage : DEFAULT_COVER_IMAGE)];
    const finalCoverImage = effectivePhotoUrls[0] || DEFAULT_COVER_IMAGE;

    const newRecord: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string } = {
      id: explicitId,
      vietnameseName: basePlant ? basePlant.vietnameseName : parsedPrimaryName,
      otherNames: basePlant ? basePlant.otherNames : parsedOtherNames,
      scientificName: scientificName.trim() || (basePlant ? basePlant.scientificName : 'Đang xác minh phân loại học'),
      family: family.trim() || (basePlant ? basePlant.family : 'Chưa xác định'),
      genus: genus.trim() || (basePlant ? getPlantGenus(basePlant) : undefined),
      species: species.trim() || (basePlant ? getPlantSpecies(basePlant) : undefined),
      coverImage: finalCoverImage,
      photos: effectivePhotoUrls.map((photoUrl, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url: photoUrl,
        caption: `Mẫu thực địa ${parsedPrimaryName} tại ${displayLocation}${effectivePhotoUrls.length > 1 ? ` (Ảnh ${idx + 1})` : ''}`,
        type: 'whole',
      })),
      shortDescription: shortDescription.trim() || (basePlant ? basePlant.shortDescription : `Cây thuốc ghi nhận tại ${displayLocation}, xã Tam Anh.`),
      identificationTraits: {
        growthForm: growthForm.trim() || basePlant?.identificationTraits?.growthForm || 'Cây thảo / cây bụi tự nhiên.',
        leaves: leavesTrait.trim() || basePlant?.identificationTraits?.leaves || 'Đang cập nhật tiêu bản lá.',
        flowers: flowersAndFruitsTrait.trim() || basePlant?.identificationTraits?.flowers || 'Chưa quan sát thấy hoa / quả tại thời điểm khảo sát.',
        fruits: '',
        roots: rootsTrait.trim() || basePlant?.identificationTraits?.roots || 'Chưa đào lấy củ rễ để bảo tồn sinh thái.',
      },
      habitat: habitat.trim(),
      habitatCategory: habitatCategory,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        addressDescription: displayLocation,
        communeSection: communeSection,
      },
      conservationStatus: 'Điểm mới (Chờ duyệt)',
      conservationLevel: 'safe',
      occurrenceStatus: 'new',
      isDisappeared: false,
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
        title: 'Khảo sát bổ sung thực địa cây thuốc Tam Anh 2026',
        surveyor: surveyor.trim(),
        surveyorAddress: surveyorAddress.trim() || undefined,
        surveyorPhone: surveyorPhone.trim(),
        surveyDate: new Date().toISOString().split('T')[0],
      },
      status: 'pending',
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
                <b>Quy trình số hóa thực địa:</b> Khi thực hiện phiếu khảo sát mới, trạng thái mặc định của cây sẽ là <b>"Điểm mới (Chờ duyệt)"</b>. Sau khi quản trị viên xác nhận thông tin và duyệt phiếu, trạng thái sẽ chuyển sang <b>"Đã ghi nhận"</b>.
              </span>
            </div>
            {isAdmin && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-700 text-white shrink-0">
                Admin
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
                    Tên cây thuốc (Tên gọi dân gian khác) <span className="text-rose-500">*</span>:
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
                            <span className="font-bold text-stone-900">
                              {selectedExistingPlant.vietnameseName}
                              {selectedExistingPlant.otherNames && selectedExistingPlant.otherNames.length > 0
                                ? ` (${selectedExistingPlant.otherNames.join(', ')})`
                                : ''}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400">Ví dụ như Cà gai leo, cam thảo... (Bấm để sổ danh sách)</span>
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
                            placeholder="Gõ tìm tên cây, tên dân gian, tên khoa học, mã số..."
                            value={speciesSearchQuery}
                            onChange={(e) => setSpeciesSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs focus:outline-none placeholder-stone-400"
                            autoFocus
                          />
                        </div>

                        <div className="overflow-y-auto divide-y divide-stone-100">
                          {filteredSpecies.map((p) => {
                            const isSelected = selectedSpeciesId === p.id;
                            const folkText = p.otherNames && p.otherNames.length > 0 ? ` (${p.otherNames.join(', ')})` : '';
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
                                    <span className="text-xs font-semibold text-stone-900">{p.vietnameseName}{folkText}</span>
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

                {/* Ordered optional botanical taxonomy fields (2 -> 5) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Họ thực vật:
                    </label>
                    <input
                      type="text"
                      value={family}
                      onChange={(e) => setFamily(e.target.value)}
                      placeholder="Ví dụ: Họ Cà (Solanaceae)"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Chi thực vật:
                    </label>
                    <input
                      type="text"
                      value={genus}
                      onChange={(e) => setGenus(e.target.value)}
                      placeholder="Ví dụ: Solanum"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Loài thực vật:
                    </label>
                    <input
                      type="text"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      placeholder="Ví dụ: Solanum procumbens"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên khoa học:
                    </label>
                    <input
                      type="text"
                      value={scientificName}
                      onChange={(e) => setScientificName(e.target.value)}
                      placeholder="Ví dụ: Solanum procumbens Lour."
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
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
                  🌱 <b>Thêm loài mới chưa có trong CSDL:</b> Nhập thông tin định danh bên dưới. Sau khi lưu, hệ thống sẽ tự động cấp mã định danh mới tiếp theo (ví dụ: <code>TA-HERB-016</code>) vào danh lục khoa học.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên cây thuốc (Tên gọi dân gian khác) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={vietnameseName}
                      onChange={(e) => setVietnameseName(e.target.value)}
                      placeholder="Ví dụ: Cà gai leo, cam thảo..."
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

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Chi thực vật:
                    </label>
                    <input
                      type="text"
                      value={genus}
                      onChange={(e) => setGenus(e.target.value)}
                      placeholder="Ví dụ: Morinda"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Loài thực vật:
                    </label>
                    <input
                      type="text"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      placeholder="Ví dụ: Morinda officinalis"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên khoa học:
                    </label>
                    <input
                      type="text"
                      value={scientificName}
                      onChange={(e) => setScientificName(e.target.value)}
                      placeholder="Ví dụ: Morinda officinalis How"
                      className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50 italic font-serif"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Photo preview & upload for the survey point (up to 5 photos) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start pt-2">
              <div className="sm:col-span-4 space-y-2">
                <div className="aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 relative">
                  <img
                    src={
                      uploadedPhotos.length > 0
                        ? uploadedPhotos[activePreviewPhotoIndex] || uploadedPhotos[0]
                        : coverImage
                    }
                    alt="Ảnh cây thuốc"
                    className="w-full h-full object-cover"
                  />
                  {uploadedPhotos.length > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-stone-900/80 text-white text-[10px] font-bold">
                      {activePreviewPhotoIndex + 1}/{uploadedPhotos.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-8 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="block font-semibold text-stone-700">
                    Ảnh chụp thực địa tại điểm khảo sát này (Lá, thân, hoa hoặc quả):
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Đã chọn {uploadedPhotos.length}/{MAX_SURVEY_PHOTOS} ảnh
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label
                    className={`px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ${
                      uploadedPhotos.length >= MAX_SURVEY_PHOTOS
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {uploadedPhotos.length >= MAX_SURVEY_PHOTOS
                        ? `Đã đủ ${MAX_SURVEY_PHOTOS} ảnh`
                        : uploadedPhotos.length > 0
                        ? `Thêm ảnh (${uploadedPhotos.length}/${MAX_SURVEY_PHOTOS})`
                        : 'Chụp / Tải ảnh lên (Tối đa 5 ảnh)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadedPhotos.length >= MAX_SURVEY_PHOTOS}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-stone-500">Hoặc dán link ảnh:</span>
                </div>

                {photoUploadNotice && (
                  <p className="text-[11px] text-amber-700 font-medium">{photoUploadNotice}</p>
                )}

                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {uploadedPhotos.map((photoUrl, idx) => (
                      <div
                        key={`survey-photo-${idx}`}
                        onClick={() => setActivePreviewPhotoIndex(idx)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          activePreviewPhotoIndex === idx
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                            : 'border-stone-200 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <img src={photoUrl} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveUploadedPhoto(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-950/75 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                          title="Xóa ảnh này"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={
                    uploadedPhotos.length > 0
                      ? `Đã đính kèm ${uploadedPhotos.length} ảnh từ thiết bị`
                      : coverImage.startsWith('data:')
                      ? 'Ảnh đính kèm từ thiết bị'
                      : coverImage
                  }
                  onChange={(e) => setCoverImage(e.target.value)}
                  disabled={uploadedPhotos.length > 0 || coverImage.startsWith('data:')}
                  placeholder="https://..."
                  className="w-full p-2 rounded-xl border border-stone-300 text-[11px] bg-stone-50 text-stone-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION: 4 ĐẶC ĐIỂM HÌNH THÁI NHẬN BIẾT */}
          <div className="space-y-3 bg-emerald-50/40 p-4 rounded-3xl border border-emerald-200/80">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-700" /> Đặc điểm hình thái nhận biết thực địa
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Tiêu bản số hóa
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80">
              Ghi nhận các đặc trưng phân loại thực vật học quan sát được tại hiện trường giúp đối chiếu nhận diện loài và xây dựng tiêu bản số.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 text-xs">
                  1. Dạng sống và Thân cành:
                </label>
                <input
                  type="text"
                  value={growthForm}
                  onChange={(e) => setGrowthForm(e.target.value)}
                  placeholder="Ví dụ: Cây thảo sống nhiều năm, thân vuông mọc đứng, cao 40-70cm..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 text-xs">
                  2. Đặc điểm Lá:
                </label>
                <input
                  type="text"
                  value={leavesTrait}
                  onChange={(e) => setLeavesTrait(e.target.value)}
                  placeholder="Ví dụ: Lá mọc đối chéo chữ thập, phiến lá hình trứng thuôn dài..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 text-xs">
                  3. Hoa và quả:
                </label>
                <input
                  type="text"
                  value={flowersAndFruitsTrait}
                  onChange={(e) => setFlowersAndFruitsTrait(e.target.value)}
                  placeholder="Ví dụ: Cụm hoa chùm nách lá màu trắng phớt tím; quả nang dẹp..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 text-xs">
                  4. Rễ / Củ:
                </label>
                <input
                  type="text"
                  value={rootsTrait}
                  onChange={(e) => setRootsTrait(e.target.value)}
                  placeholder="Ví dụ: Rễ cọc đâm sâu, củ phình to nạc màu vàng ngà, thơm..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white text-xs"
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
              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Họ tên người khảo sát / Nhóm nghiên cứu <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={surveyor}
                  onChange={(e) => setSurveyor(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A / Nhóm nghiên cứu THCS Tam Anh"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Địa chỉ:
                </label>
                <input
                  type="text"
                  value={surveyorAddress}
                  onChange={(e) => setSurveyorAddress(e.target.value)}
                  placeholder="Ví dụ: Thôn Đức Bố, xã Tam Anh"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Số điện thoại / Zalo <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={surveyorPhone}
                  onChange={(e) => setSurveyorPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:border-emerald-500"
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
