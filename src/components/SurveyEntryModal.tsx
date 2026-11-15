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
  RotateCcw,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  Link2
} from 'lucide-react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel, 
  UnifiedConservationStatus,
  AICandidate,
  PlantPhoto,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  CommuneVillage,
  getPlantSurveyStatus,
  getPlantGenus
} from '../types';
import { getStoredPlants } from '../utils/storage';
import { compressImageFile } from '../utils/imageCompressor';

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
  const [entryMode, setEntryMode] = useState<'existing_species' | 'new_species'>('new_species');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('');
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState('');
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [showStandardTraits, setShowStandardTraits] = useState(false);

  // Form states (1. Tên cây thuốc (Tên gọi dân gian khác) -> 2. Họ -> 3. Chi -> 4. Loài -> 5. Tên khoa học)
  const [plantNameInput, setPlantNameInput] = useState('');
  const [family, setFamily] = useState('');
  const [genus, setGenus] = useState('');
  const [speciesInput, setSpeciesInput] = useState('');
  const [scientificName, setScientificName] = useState('');

  // Multiple photo attachments state
  const DEFAULT_COVER_IMAGE =
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';
  const [attachedPhotos, setAttachedPhotos] = useState<PlantPhoto[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string>('');
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);

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
  const [addressDescription, setAddressDescription] = useState('');
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

  // Surveyor info (4. Người khảo sát và hồ sơ thực địa)
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

  // Unique families list (sorted)
  const availableFamilies = useMemo(() => {
    const set = new Set<string>();
    uniqueSpeciesList.forEach((p) => {
      if (p.family && p.family.trim()) set.add(p.family.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [uniqueSpeciesList]);

  // Unique genera list for datalist suggestions
  const availableGenera = useMemo(() => {
    const set = new Set<string>();
    uniqueSpeciesList.forEach((p) => {
      const g = getPlantGenus(p);
      if (g && g !== 'Chưa xác định') set.add(g);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [uniqueSpeciesList]);

  // Selected existing plant object (only when explicitly selected)
  const selectedExistingPlant = useMemo(() => {
    if (!selectedSpeciesId) return null;
    return uniqueSpeciesList.find((p) => p.id === selectedSpeciesId) || null;
  }, [uniqueSpeciesList, selectedSpeciesId]);

  // Active cover image URL preview
  const activeCoverImage = useMemo(() => {
    if (attachedPhotos.length > 0) {
      const found = attachedPhotos.find((p) => p.id === coverPhotoId);
      return found ? found.url : attachedPhotos[0].url;
    }
    if (selectedExistingPlant?.coverImage) {
      return selectedExistingPlant.coverImage;
    }
    return DEFAULT_COVER_IMAGE;
  }, [attachedPhotos, coverPhotoId, selectedExistingPlant]);

  // Parse "Tên cây thuốc (Tên gọi dân gian khác)"
  const parsePlantNameAndAliases = (raw: string): { mainName: string; aliases: string[] } => {
    const trimmed = raw.trim();
    const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      const main = match[1].trim();
      const aliases = match[2]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { mainName: main || trimmed, aliases };
    }
    return { mainName: trimmed, aliases: [] };
  };

  // Helper to load an existing plant's botanical data into the 5 fields
  const applyExistingPlant = (plant: MedicinalPlant) => {
    setEntryMode('existing_species');
    setSelectedSpeciesId(plant.id);
    const aliases = (plant.otherNames || []).filter(Boolean);
    setPlantNameInput(aliases.length > 0 ? `${plant.vietnameseName} (${aliases.join(', ')})` : plant.vietnameseName);
    setFamily(plant.family || '');
    setGenus(getPlantGenus(plant) !== 'Chưa xác định' ? getPlantGenus(plant) : '');
    setSpeciesInput(plant.species || plant.vietnameseName || '');
    setScientificName(plant.scientificName || '');
    setShortDescription(plant.shortDescription || '');
    setGrowthForm(plant.identificationTraits?.growthForm || '');
    setLeavesTrait(plant.identificationTraits?.leaves || '');
    const flw = plant.identificationTraits?.flowers || '';
    const frt = plant.identificationTraits?.fruits || '';
    setFlowersAndFruitsTrait(flw ? (frt && !flw.includes(frt) ? `${flw} — ${frt}` : flw) : frt);
    setRootsTrait(plant.identificationTraits?.roots || '');
    setHabitat(plant.habitat || 'Bờ rào & nương đồi ven làng');
    setHabitatCategory(plant.habitatCategory || 'garden');
    setFolkRemediesText((plant.traditionalUses?.folkRemedies || []).join('\n'));
    setPartUsedText((plant.traditionalUses?.partUsed || []).join(', '));
    setPreparationText(plant.traditionalUses?.preparation || 'Rửa sạch phơi khô sắc nước uống');
  };

  // Clear selected CSDL plant to enter freely
  const handleClearSelectedExistingPlant = () => {
    setEntryMode('new_species');
    setSelectedSpeciesId('');
    setPlantNameInput('');
    setFamily('');
    setGenus('');
    setSpeciesInput('');
    setScientificName('');
    setShortDescription('');
    setGrowthForm('');
    setLeavesTrait('');
    setFlowersAndFruitsTrait('');
    setRootsTrait('');
    setFolkRemediesText('');
    setPartUsedText('Thân cành và lá');
    setPreparationText('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
    setShowStandardTraits(false);
    setValidationError(null);
  };

  // Full reset function for a brand new survey
  const resetFormToDefault = () => {
    setEntryMode('new_species');
    setSelectedSpeciesId('');
    setSpeciesSearchQuery('');
    setIsSpeciesDropdownOpen(false);
    setShowStandardTraits(false);
    setValidationError(null);
    setGpsStatusMsg(null);
    setIsGettingGPS(false);
    setAttachedPhotos([]);
    setCoverPhotoId('');
    setPhotoUrlInput('');
    setPhotoError(null);

    // Clear Section 1 fields so required field #1 must be filled explicitly
    setPlantNameInput('');
    setFamily('');
    setGenus('');
    setSpeciesInput('');
    setScientificName('');
    setShortDescription('');
    setGrowthForm('');
    setLeavesTrait('');
    setFlowersAndFruitsTrait('');
    setRootsTrait('');

    // Reset Section 2 & 3
    setHabitat('Bờ rào & nương đồi ven làng');
    setHabitatCategory('garden');
    setCommuneSection('Thôn Đức Bố');
    setAddressDescription('');
    setLat(15.4635);
    setLng(108.6185);
    setFolkRemediesText('');
    setPartUsedText('Thân cành và lá');
    setPreparationText('Rửa sạch phơi khô nấu nước uống hoặc giã tươi');
    setInformantName('Người dân am hiểu cây thuốc bản địa');
    setInformantRole('');
    setHasConsent(true);

    // Reset Section 4 (Surveyor)
    setSurveyor('');
    setSurveyorAddress('');
    setSurveyorPhone('');
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

      const initialPhotos: PlantPhoto[] = prefillData.imageBase64
        ? [
            {
              id: `photo-ai-${Date.now()}`,
              url: prefillData.imageBase64,
              caption: `Ảnh thực địa ${prefillData.candidate.vietnameseName || 'cây thuốc'}`,
              type: 'whole',
            },
          ]
        : [];
      setAttachedPhotos(initialPhotos);
      setCoverPhotoId(initialPhotos[0]?.id || '');

      if (matched) {
        applyExistingPlant(matched);
      } else {
        setEntryMode('new_species');
        setSelectedSpeciesId('');
        const aiOther = prefillData.candidate.otherNames ? ` (${prefillData.candidate.otherNames})` : '';
        setPlantNameInput(`${prefillData.candidate.vietnameseName || ''}${aiOther}`.trim());
        setFamily(prefillData.candidate.family || '');
        const inferredGenus =
          prefillData.candidate.genus ||
          getPlantGenus({ scientificName: prefillData.candidate.scientificName });
        setGenus(inferredGenus !== 'Chưa xác định' ? inferredGenus : '');
        setSpeciesInput(prefillData.candidate.vietnameseName || '');
        setScientificName(prefillData.candidate.scientificName || '');
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
        setAddressDescription('');
        setLat(15.4635);
        setLng(108.6185);
      }
    } else {
      // Fresh new survey: Reset all form fields cleanly
      resetFormToDefault();
    }
  }, [isOpen, prefillData]);

  // Sync with pickedCoords from map when user clicks map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat);
      setLng(pickedCoords.lng);
    }
  }, [pickedCoords]);

  // Filtered species by search query for optional quick-pick from CSDL
  const filteredSpecies = useMemo(() => {
    if (!speciesSearchQuery.trim()) return uniqueSpeciesList;
    const q = speciesSearchQuery.toLowerCase();
    return uniqueSpeciesList.filter((p) => {
      return (
        p.vietnameseName.toLowerCase().includes(q) ||
        (p.otherNames || []).some((n) => n.toLowerCase().includes(q)) ||
        p.scientificName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q) ||
        getPlantGenus(p).toLowerCase().includes(q)
      );
    });
  }, [uniqueSpeciesList, speciesSearchQuery]);

  // Auto-detect existing species match while typing field #1
  const autoDetectedExistingMatch = useMemo(() => {
    if (selectedExistingPlant || !plantNameInput.trim()) return null;
    const { mainName } = parsePlantNameAndAliases(plantNameInput);
    const norm = mainName.trim().toLowerCase();
    return uniqueSpeciesList.find((p) => p.vietnameseName.trim().toLowerCase() === norm) || null;
  }, [selectedExistingPlant, plantNameInput, uniqueSpeciesList]);

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

  // Handle multiple photo file uploads with compression (max 8 photos)
  const MAX_PHOTOS = 8;
  const handleMultiplePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from<File>(e.target.files) : [];
    if (files.length === 0) return;

    setPhotoError(null);
    const remainingSlots = MAX_PHOTOS - attachedPhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(`Chỉ đính kèm tối đa ${MAX_PHOTOS} ảnh cho mỗi phiếu khảo sát.`);
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setPhotoError(`Chỉ thêm được ${remainingSlots} ảnh nữa (tối đa ${MAX_PHOTOS} ảnh/phiếu).`);
    }

    setIsCompressingPhotos(true);
    try {
      const processed: PlantPhoto[] = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        let url = '';
        try {
          url = await compressImageFile(file, 900, 900, 0.72);
        } catch {
          url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        processed.push({
          id: `photo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url,
          caption: `Ảnh thực địa ${attachedPhotos.length + i + 1}`,
          type: 'whole',
        });
      }

      setAttachedPhotos((prev) => {
        const next = [...prev, ...processed];
        if (!coverPhotoId && next.length > 0) {
          setCoverPhotoId(next[0].id);
        }
        return next;
      });
    } finally {
      setIsCompressingPhotos(false);
      e.target.value = '';
    }
  };

  // Add photo by URL
  const handleAddPhotoUrl = () => {
    const trimmed = photoUrlInput.trim();
    if (!trimmed) return;
    setPhotoError(null);
    if (attachedPhotos.length >= MAX_PHOTOS) {
      setPhotoError(`Chỉ đính kèm tối đa ${MAX_PHOTOS} ảnh cho mỗi phiếu khảo sát.`);
      return;
    }
    const newPhoto: PlantPhoto = {
      id: `photo-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: trimmed,
      caption: `Ảnh thực địa ${attachedPhotos.length + 1}`,
      type: 'whole',
    };
    setAttachedPhotos((prev) => {
      const next = [...prev, newPhoto];
      if (!coverPhotoId) setCoverPhotoId(newPhoto.id);
      return next;
    });
    setPhotoUrlInput('');
  };

  const handleUpdatePhotoMeta = (id: string, patch: Partial<PlantPhoto>) => {
    setAttachedPhotos((prev) => prev.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)));
  };

  const handleRemovePhoto = (id: string) => {
    setAttachedPhotos((prev) => {
      const next = prev.filter((ph) => ph.id !== id);
      if (coverPhotoId === id) {
        setCoverPhotoId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!plantNameInput.trim()) {
      setValidationError('Vui lòng điền Tên cây thuốc (Tên gọi dân gian khác).');
      return;
    }

    if (!surveyor.trim()) {
      setValidationError('Vui lòng nhập Họ tên người khảo sát / Nhóm nghiên cứu.');
      return;
    }

    if (!surveyorPhone.trim()) {
      setValidationError('Vui lòng nhập Số điện thoại / Zalo người khảo sát.');
      return;
    }

    const digitsOnly = surveyorPhone.replace(/[\s.-]/g, '');
    if (!/\d{8,15}/.test(digitsOnly)) {
      setValidationError('Số điện thoại / Zalo chưa hợp lệ (cần tối thiểu 8 chữ số).');
      return;
    }

    const { mainName, aliases } = parsePlantNameAndAliases(plantNameInput);
    const plantName = mainName;

    const remediesArray = folkRemediesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const partsArray = partUsedText
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // If surveying an existing plant, preserve its exact ID (e.g. TA-HERB-001)
    const matchedPlant = selectedExistingPlant || autoDetectedExistingMatch || null;
    const explicitId = matchedPlant ? matchedPlant.id : undefined;

    const resolvedCover = activeCoverImage;

    // Order attachedPhotos so cover photo is first
    let finalPhotos: PlantPhoto[] = [];
    if (attachedPhotos.length > 0) {
      const coverItem = attachedPhotos.find((p) => p.id === coverPhotoId) || attachedPhotos[0];
      const others = attachedPhotos.filter((p) => p.id !== coverItem.id);
      finalPhotos = [coverItem, ...others].map((p, idx) => ({
        ...p,
        caption: p.caption?.trim() || `Mẫu thực địa ${plantName} (${idx + 1})`,
      }));
    } else {
      finalPhotos = [
        {
          id: `photo-${Date.now()}`,
          url: resolvedCover,
          caption: `Mẫu thực địa ${plantName} tại ${addressDescription || communeSection}`,
          type: 'whole',
        },
      ];
    }

    const resolvedFamily = family.trim() || matchedPlant?.family || 'Chưa phân loại';
    const resolvedScientificName =
      scientificName.trim() || matchedPlant?.scientificName || 'Đang xác minh phân loại học';
    const resolvedGenus =
      genus.trim() ||
      (matchedPlant ? getPlantGenus(matchedPlant) : getPlantGenus({ scientificName: resolvedScientificName }));
    const resolvedSpecies = speciesInput.trim() || matchedPlant?.species || undefined;
    const resolvedOtherNames =
      aliases.length > 0 ? aliases : matchedPlant?.otherNames || [];

    // Default status for EVERY new survey is always "Điểm mới (Chờ duyệt)" until Admin approves
    const newRecord: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string } = {
      id: explicitId,
      vietnameseName: matchedPlant ? matchedPlant.vietnameseName : plantName,
      otherNames: resolvedOtherNames,
      scientificName: resolvedScientificName,
      family: resolvedFamily,
      genus: resolvedGenus,
      species: resolvedSpecies,
      coverImage: resolvedCover,
      photos: finalPhotos,
      shortDescription:
        shortDescription.trim() ||
        (matchedPlant
          ? matchedPlant.shortDescription
          : `Cây thuốc ghi nhận tại ${addressDescription || communeSection}, xã Tam Anh.`),
      identificationTraits: {
        growthForm: growthForm.trim() || matchedPlant?.identificationTraits?.growthForm || 'Cây thảo / cây bụi tự nhiên.',
        leaves: leavesTrait.trim() || matchedPlant?.identificationTraits?.leaves || 'Đang cập nhật tiêu bản lá.',
        flowers: flowersAndFruitsTrait.trim() || matchedPlant?.identificationTraits?.flowers || 'Chưa quan sát thấy hoa / quả tại thời điểm khảo sát.',
        fruits: '',
        roots: rootsTrait.trim() || matchedPlant?.identificationTraits?.roots || 'Chưa đào lấy củ rễ để bảo tồn sinh thái.',
      },
      habitat: habitat.trim() || 'Bờ rào & nương đồi ven làng',
      habitatCategory: habitatCategory,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        addressDescription: addressDescription.trim() || `${communeSection}, xã Tam Anh`,
        communeSection: communeSection,
      },
      conservationStatus: 'Điểm mới (Chờ duyệt)',
      conservationLevel: 'safe',
      occurrenceStatus: 'new',
      isDisappeared: false,
      traditionalUses: {
        folkRemedies: remediesArray.length > 0 ? remediesArray : (matchedPlant?.traditionalUses.folkRemedies || ['Tư liệu dân gian đang được thẩm định thêm.']),
        partUsed: partsArray.length > 0 ? partsArray : (matchedPlant?.traditionalUses.partUsed || ['Lá', 'Thân']),
        preparation: preparationText.trim() || (matchedPlant?.traditionalUses.preparation || 'Rửa sạch phơi khô sắc nước uống'),
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
        verifiedBy: undefined,
      },
      status: 'pending',
    };

    onSaveNewPlant(newRecord, explicitId);
    resetFormToDefault();
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
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-purple-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                <b>Quy trình kiểm duyệt thực địa:</b> Mọi phiếu khảo sát mới sau khi lưu sẽ có trạng thái mặc định là <b>🟣 Điểm mới (Chờ duyệt)</b>. Sau khi Quản trị viên xác nhận thông tin cung cấp là đúng và bấm duyệt phiếu, trạng thái cây sẽ chuyển sang <b>🟢 Đã ghi nhận</b>.
              </span>
            </div>
          </div>

          {/* SECTION 1: SPECIES IDENTIFICATION */}
          <div className="space-y-3.5">
            <h3 className="font-bold text-sm text-stone-900 border-b border-stone-200 pb-1.5 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-600" /> 1. Định danh loài cây thuốc
              </span>
              {selectedExistingPlant && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-900 text-emerald-400">
                  Liên kết CSDL: {selectedExistingPlant.id}
                </span>
              )}
            </h3>

            {/* Optional quick-pick from CSDL */}
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chọn nhanh loài đã có trong CSDL để tự động điền (không bắt buộc):</span>
                </span>
                {selectedExistingPlant && (
                  <button
                    type="button"
                    onClick={handleClearSelectedExistingPlant}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline"
                  >
                    Xóa chọn / Nhập mới
                  </button>
                )}
              </div>

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
                        className="w-6 h-6 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-mono font-bold text-emerald-800 mr-1.5">[{selectedExistingPlant.id}]</span>
                        <span className="font-bold text-stone-900">{selectedExistingPlant.vietnameseName}</span>
                        <span className="text-stone-500 italic font-serif ml-1.5">({selectedExistingPlant.scientificName})</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-stone-500 text-xs">-- Chọn nhanh từ danh lục {uniqueSpeciesList.length} loài đã có (hoặc tự nhập bên dưới) --</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isSpeciesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSpeciesDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-300 rounded-2xl shadow-xl z-30 overflow-hidden max-h-60 flex flex-col">
                    <div className="p-2 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Gõ tìm tên cây, họ, chi, tên khoa học, mã số..."
                        value={speciesSearchQuery}
                        onChange={(e) => setSpeciesSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none placeholder-stone-400"
                        autoFocus
                      />
                    </div>

                    <div className="overflow-y-auto divide-y divide-stone-100">
                      {filteredSpecies.length === 0 ? (
                        <div className="p-4 text-center text-xs text-stone-400">
                          Không tìm thấy loài phù hợp. Bạn có thể đóng và tự nhập ở các mục bên dưới.
                        </div>
                      ) : (
                        filteredSpecies.map((p) => {
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
                                  <span className="text-[11px] text-stone-500 italic font-serif block truncate">
                                    {p.family} → {getPlantGenus(p)} → {p.scientificName}
                                  </span>
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedExistingPlant && (
                <div className="pt-1 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setShowStandardTraits(!showStandardTraits)}
                    className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 underline underline-offset-2"
                  >
                    {showStandardTraits ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Ẩn đặc điểm chuẩn của loài đã chọn
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Xem đặc điểm chuẩn & bài thuốc của [{selectedExistingPlant.id}] {selectedExistingPlant.vietnameseName}
                      </>
                    )}
                  </button>

                  {showStandardTraits && (
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] space-y-1 text-stone-700 animate-fadeIn">
                      <div><b>Phân loại:</b> {selectedExistingPlant.family} → {getPlantGenus(selectedExistingPlant)} → {selectedExistingPlant.vietnameseName} (<i>{selectedExistingPlant.scientificName}</i>)</div>
                      <div><b>Dạng sống:</b> {selectedExistingPlant.identificationTraits?.growthForm}</div>
                      <div><b>Đặc điểm lá:</b> {selectedExistingPlant.identificationTraits?.leaves}</div>
                      <div><b>Bài thuốc lưu truyền:</b> {(selectedExistingPlant.traditionalUses?.folkRemedies || []).join('; ')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5 ORDERED FIELDS IN SECTION 1:
                1. Tên cây thuốc (Tên gọi dân gian khác) [REQUIRED]
                2. Họ thực vật
                3. Chi thực vật
                4. Loài thực vật
                5. Tên khoa học
            */}
            <div className="space-y-3">
              {/* 1. Tên cây thuốc (Tên gọi dân gian khác) - REQUIRED */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  1. Tên cây thuốc (Tên gọi dân gian khác) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  list="survey-plant-names-list"
                  value={plantNameInput}
                  onChange={(e) => {
                    setPlantNameInput(e.target.value);
                    if (selectedSpeciesId) {
                      setSelectedSpeciesId('');
                    }
                  }}
                  placeholder="Ví dụ: Cà gai leo (Cà quánh, Cà cườm) hoặc Lá lốt..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-stone-900"
                />
                <datalist id="survey-plant-names-list">
                  {uniqueSpeciesList.map((p) => (
                    <option
                      key={p.id}
                      value={
                        p.otherNames && p.otherNames.length > 0
                          ? `${p.vietnameseName} (${p.otherNames.join(', ')})`
                          : p.vietnameseName
                      }
                    />
                  ))}
                </datalist>

                {autoDetectedExistingMatch && (
                  <div className="mt-1.5 p-2 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] flex items-center justify-between gap-2">
                    <span>
                      Nhận diện loài <b>"{autoDetectedExistingMatch.vietnameseName}"</b> đã có mã <b>{autoDetectedExistingMatch.id}</b> trong CSDL (sẽ tự động liên kết điểm mới vào loài này).
                    </span>
                    <button
                      type="button"
                      onClick={() => applyExistingPlant(autoDetectedExistingMatch)}
                      className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px] shrink-0"
                    >
                      Điền thông tin {autoDetectedExistingMatch.id}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Họ thực vật & 3. Chi thực vật */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    2. Họ thực vật <span className="text-stone-400 font-normal">(không bắt buộc)</span>:
                  </label>
                  <input
                    type="text"
                    list="survey-families-list"
                    value={family}
                    onChange={(e) => setFamily(e.target.value)}
                    placeholder="Ví dụ: Họ Cà (Solanaceae), Họ Cà phê..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                  />
                  <datalist id="survey-families-list">
                    {availableFamilies.map((fam) => (
                      <option key={fam} value={fam} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    3. Chi thực vật <span className="text-stone-400 font-normal">(không bắt buộc)</span>:
                  </label>
                  <input
                    type="text"
                    list="survey-genera-list"
                    value={genus}
                    onChange={(e) => setGenus(e.target.value)}
                    placeholder="Ví dụ: Chi Solanum, Chi Morinda..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                  />
                  <datalist id="survey-genera-list">
                    {availableGenera.map((gen) => (
                      <option key={gen} value={gen} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 4. Loài thực vật & 5. Tên khoa học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    4. Loài thực vật <span className="text-stone-400 font-normal">(không bắt buộc)</span>:
                  </label>
                  <input
                    type="text"
                    value={speciesInput}
                    onChange={(e) => setSpeciesInput(e.target.value)}
                    placeholder="Ví dụ: Cà gai leo / Solanum procumbens..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    5. Tên khoa học <span className="text-stone-400 font-normal">(không bắt buộc)</span>:
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
            </div>

            {/* Multi-photo attachment & gallery manager for the survey point */}
            <div className="bg-stone-50/90 p-3.5 rounded-2xl border border-stone-200 space-y-3 pt-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Ảnh chụp thực địa tại điểm khảo sát (Đính kèm nhiều ảnh)</span>
                  </label>
                  <p className="text-[11px] text-stone-500">
                    Có thể chọn hoặc chụp nhiều ảnh cùng lúc (Toàn cây, Lá, Hoa, Quả, Rễ/Củ) — tối đa {MAX_PHOTOS} ảnh.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {attachedPhotos.length}/{MAX_PHOTOS} ảnh
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0">
                  <Camera className="w-4 h-4" />
                  <span>{isCompressingPhotos ? 'Đang nén ảnh...' : 'Chọn / Chụp nhiều ảnh'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isCompressingPhotos}
                    onChange={handleMultiplePhotosUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex-1 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPhotoUrl();
                        }
                      }}
                      placeholder="Hoặc dán URL ảnh (https://...) rồi bấm Thêm"
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-stone-300 text-[11px] bg-white text-stone-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm URL</span>
                  </button>
                </div>
              </div>

              {photoError && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              {attachedPhotos.length === 0 ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-dashed border-stone-300">
                  <img
                    src={activeCoverImage}
                    alt="Ảnh mặc định"
                    className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                  <div className="text-[11px] text-stone-500 leading-relaxed">
                    Chưa đính kèm ảnh mới nào cho điểm khảo sát này. Nếu không tải ảnh lên, hệ thống sẽ tạm sử dụng ảnh đại diện chuẩn của loài.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachedPhotos.map((photo, idx) => {
                    const isCover = photo.id === coverPhotoId || (!coverPhotoId && idx === 0);
                    return (
                      <div
                        key={photo.id}
                        className={`p-2 rounded-xl bg-white border flex items-start gap-2.5 transition-all ${
                          isCover ? 'border-emerald-500 ring-1 ring-emerald-400/40 shadow-xs' : 'border-stone-200'
                        }`}
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                          <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                          {isCover && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-white text-[9px] font-bold text-center py-0.5">
                              Ảnh bìa
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <select
                              value={photo.type}
                              onChange={(e) => handleUpdatePhotoMeta(photo.id, { type: e.target.value as PlantPhoto['type'] })}
                              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-700"
                            >
                              <option value="whole">Toàn cây</option>
                              <option value="leaf">Lá</option>
                              <option value="flower">Hoa</option>
                              <option value="fruit">Quả</option>
                              <option value="root">Rễ / Củ</option>
                            </select>

                            <div className="flex items-center gap-1">
                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => setCoverPhotoId(photo.id)}
                                  className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold flex items-center gap-0.5 border border-emerald-200"
                                  title="Đặt làm ảnh đại diện"
                                >
                                  <Star className="w-2.5 h-2.5" />
                                  <span>Ảnh bìa</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                title="Xóa ảnh này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => handleUpdatePhotoMeta(photo.id, { caption: e.target.value })}
                            placeholder="Chú thích ảnh..."
                            className="w-full px-2 py-1 rounded-lg border border-stone-200 text-[11px] bg-stone-50 text-stone-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

              <div className="sm:col-span-2 bg-purple-50/70 px-3.5 py-2.5 rounded-2xl border border-purple-200/80 text-[11px] text-purple-900 flex items-center gap-2">
                <span>🟣</span>
                <span>
                  Trạng thái mặc định của điểm khảo sát mới: <b>Điểm mới (Chờ duyệt)</b> — sẽ tự động chuyển sang <b>🟢 Đã ghi nhận</b> sau khi Quản trị viên xác nhận và duyệt phiếu.
                </span>
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
                  1. Họ tên người khảo sát / Nhóm nghiên cứu <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={surveyor}
                  onChange={(e) => setSurveyor(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An / Nhóm nghiên cứu KHKT Trường THCS Nguyễn Khuyến"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  2. Địa chỉ <span className="text-stone-400 font-normal">(không bắt buộc)</span>:
                </label>
                <input
                  type="text"
                  value={surveyorAddress}
                  onChange={(e) => setSurveyorAddress(e.target.value)}
                  placeholder="Ví dụ: Thôn Đức Bố, xã Tam Anh, TP. Đà Nẵng"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  3. Số điện thoại / Zalo <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="tel"
                  required
                  value={surveyorPhone}
                  onChange={(e) => setSurveyorPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 bg-white font-mono"
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
              {selectedExistingPlant ? (
                <span>
                  Đang ghi nhận điểm mới cho: <b className="text-emerald-700">[{selectedExistingPlant.id}] {selectedExistingPlant.vietnameseName}</b>
                </span>
              ) : (
                <span>Trạng thái khi gửi: <b className="text-purple-700">🟣 Điểm mới (Chờ duyệt)</b></span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFormToDefault}
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
