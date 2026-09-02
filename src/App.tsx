import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HerbMap } from './components/HerbMap';
import { CatalogList } from './components/CatalogList';
import { DashboardView } from './components/DashboardView';
import { AdminPanel } from './components/AdminPanel';
import { SpeciesDetailModal } from './components/SpeciesDetailModal';
import { AIPlantScanner } from './components/AIPlantScanner';
import { QRScannerModal } from './components/QRScannerModal';
import { SurveyEntryModal } from './components/SurveyEntryModal';
import { AboutProjectModal } from './components/AboutProjectModal';
import { MedicinalPlant, AICandidate, PlantMonitoringLog } from './types';
import { 
  getStoredPlants, 
  saveNewPlant, 
  verifyAdminPasscode, 
  checkAndRunDailyAutoBackup, 
  addPlantMonitoringLog,
  approvePlantMonitoringLog,
  rejectPlantMonitoringLog,
  deletePlantMonitoringLog
} from './utils/storage';
import { subscribeToPlantsRealtime, syncInitialPlantsToFirestore } from './lib/plantSync';
import { Lock, CheckCircle, X, ShieldAlert } from 'lucide-react';

export function App() {
  const [plants, setPlants] = useState<MedicinalPlant[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'catalog' | 'dashboard' | 'admin'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [adminPassInput, setAdminPassInput] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected plant for detail modal
  const [selectedPlant, setSelectedPlant] = useState<MedicinalPlant | null>(null);
  const [mapSelectedPlantId, setMapSelectedPlantId] = useState<string | null>(null);

  // Modals state
  const [isAIScannerOpen, setIsAIScannerOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  // Prefill state for survey entry from AI
  const [surveyPrefillData, setSurveyPrefillData] = useState<{ candidate: AICandidate; imageBase64: string } | null>(null);

  // Map coordinate picking state
  const [isPickingCoords, setIsPickingCoords] = useState<boolean>(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load plants on mount, sync with cloud Firestore in real-time, and trigger auto backup check
  useEffect(() => {
    const loaded = getStoredPlants();
    setPlants(loaded);

    // Initial check & seed to Firestore if cloud is fresh
    syncInitialPlantsToFirestore().catch((e) => console.warn('Firestore initial sync check:', e));

    // Subscribe to real-time changes across all connected devices (phones, computers, browsers)
    const unsubscribe = subscribeToPlantsRealtime((cloudPlants) => {
      setPlants(cloudPlants);
      // If currently viewing a plant that got updated on another device, keep detail modal in sync
      setSelectedPlant((prev) => {
        if (!prev) return null;
        const updated = cloudPlants.find((p) => p.id === prev.id);
        return updated || prev;
      });
    });

    // Run automatic daily backup snapshot check
    try {
      checkAndRunDailyAutoBackup();
    } catch (e) {
      console.warn('Auto backup check:', e);
    }

    // Check URL parameters for direct plant link (e.g. ?speciesId=TA-HERB-001)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const speciesId = params.get('speciesId');
      if (speciesId) {
        const found = loaded.find((p) => p.id === speciesId);
        if (found) {
          setSelectedPlant(found);
        }
      }

      const tabParam = params.get('tab');
      if (tabParam === 'catalog' || tabParam === 'dashboard' || tabParam === 'map' || tabParam === 'admin') {
        setActiveTab(tabParam);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle open plant detail
  const handleSelectPlant = (plant: MedicinalPlant) => {
    setSelectedPlant(plant);
    setMapSelectedPlantId(plant.id);
  };

  // Handle locate plant on map
  const handleLocateOnMap = (plant: MedicinalPlant) => {
    setMapSelectedPlantId(plant.id);
    setActiveTab('map');
  };

  // Handle select plant by ID (e.g. from QR scanner)
  const handleSelectPlantById = (id: string) => {
    const found = plants.find((p) => p.id.toUpperCase() === id.toUpperCase());
    if (found) {
      setSelectedPlant(found);
      setMapSelectedPlantId(found.id);
    } else {
      showToast(`Không tìm thấy cây thuốc với mã "${id}".`);
    }
  };

  // Handle prefilling survey from AI Scanner
  const handlePrefillNewSurveyFromAI = (candidate: AICandidate, imageBase64: string) => {
    setSurveyPrefillData({ candidate, imageBase64 });
    setIsSurveyModalOpen(true);
  };

  // Handle saving new plant record
  const handleSaveNewPlant = (
    newPlantData: Omit<MedicinalPlant, 'id' | 'createdAt' | 'updatedAt' | 'surveyFrequencyCount'> & { id?: string },
    explicitSpeciesId?: string
  ) => {
    const updated = saveNewPlant(newPlantData, explicitSpeciesId);
    setPlants(updated);
    setSurveyPrefillData(null);
    setPickedCoords(null);
    setIsPickingCoords(false);
    showToast(
      explicitSpeciesId 
        ? `Đã ghi nhận điểm khảo sát thực địa mới cho loài [${newPlantData.vietnameseName}] trên Bản đồ số!` 
        : 'Đã lưu phiếu khảo sát thực địa thành công vào cơ sở dữ liệu số!'
    );
  };

  // Handle adding monitoring log (e.g. tracking presence, degradation, disappearance over time)
  const handleAddMonitoringLog = (
    plantId: string,
    logData: Omit<PlantMonitoringLog, 'id' | 'createdAt'>
  ) => {
    const updated = addPlantMonitoringLog(plantId, logData, isAdmin);
    setPlants(updated);
    const updatedPlant = updated.find((p) => p.id === plantId);
    if (updatedPlant) {
      setSelectedPlant(updatedPlant);
    }
    if (isAdmin) {
      showToast(
        logData.status === 'disappeared'
          ? 'Ban Quản trị: Đã duyệt ghi nhận cây biến mất và gỡ điểm đánh dấu khỏi Bản đồ!'
          : 'Ban Quản trị: Đã ghi nhận & phê duyệt đợt kiểm tra thực địa thành công!'
      );
    } else {
      showToast('Đã gửi báo cáo đợt kiểm tra thực địa! Báo cáo đang ở trạng thái "Chờ duyệt" bởi Ban Quản trị.');
    }
  };

  // Admin approval handlers for individual monitoring logs
  const handleApproveMonitoringLog = (plantId: string, logId: string) => {
    const updated = approvePlantMonitoringLog(plantId, logId);
    setPlants(updated);
    const updatedPlant = updated.find((p) => p.id === plantId);
    if (updatedPlant) {
      setSelectedPlant(updatedPlant);
    }
    showToast('Đã phê duyệt đợt kiểm tra thực địa và đồng bộ diễn biến cây!');
  };

  const handleRejectMonitoringLog = (plantId: string, logId: string, reason?: string) => {
    const updated = rejectPlantMonitoringLog(plantId, logId, reason);
    setPlants(updated);
    const updatedPlant = updated.find((p) => p.id === plantId);
    if (updatedPlant) {
      setSelectedPlant(updatedPlant);
    }
    showToast('Đã từ chối đợt báo cáo thực địa.');
  };

  const handleDeleteMonitoringLog = (plantId: string, logId: string) => {
    const updated = deletePlantMonitoringLog(plantId, logId);
    setPlants(updated);
    const updatedPlant = updated.find((p) => p.id === plantId);
    if (updatedPlant) {
      setSelectedPlant(updatedPlant);
    }
    showToast('Đã xóa bản ghi đợt kiểm tra.');
  };

  // Handle map coordinate picked
  const handleCoordinatesPicked = (lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
    setIsPickingCoords(false);
    setIsSurveyModalOpen(true);
  };

  // Trigger coordinate picking from survey form
  const handleTriggerPickCoordsFromForm = () => {
    setIsSurveyModalOpen(false);
    setIsPickingCoords(true);
    setActiveTab('map');
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasscode(adminPassInput)) {
      setIsAdmin(true);
      setIsAdminLoginOpen(false);
      setAdminPassInput('');
      setAdminLoginError(null);
      setActiveTab('admin');
      showToast('Đăng nhập Ban Quản trị thành công!');
    } else {
      setAdminLoginError('Mật khẩu quản trị không chính xác.');
    }
  };

  const pendingCount = plants.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAIScanner={() => setIsAIScannerOpen(true)}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onOpenNewSurvey={() => {
          setSurveyPrefillData(null);
          setIsSurveyModalOpen(true);
        }}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={() => {
          setIsAdmin(false);
          setActiveTab('map');
          showToast('Đã đăng xuất quyền Quản trị.');
        }}
        totalPlantsCount={plants.length}
        pendingCount={pendingCount}
        plants={plants}
        onSelectPlant={handleSelectPlant}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full relative">
        {activeTab === 'map' && (
          <HerbMap
            plants={plants}
            onSelectPlant={handleSelectPlant}
            selectedPlantId={mapSelectedPlantId}
            pickingCoordinatesMode={isPickingCoords}
            onCoordinatesPicked={handleCoordinatesPicked}
            onCancelPickCoordinates={() => {
              setIsPickingCoords(false);
              setIsSurveyModalOpen(true);
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogList
            plants={plants}
            onSelectPlant={handleSelectPlant}
            onLocateOnMap={handleLocateOnMap}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenAIScanner={() => setIsAIScannerOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            plants={plants}
            onSelectPlant={handleSelectPlant}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            plants={plants}
            onPlantsUpdated={(updated) => setPlants(updated)}
            onSelectPlant={handleSelectPlant}
            onLocateOnMap={handleLocateOnMap}
            onLogoutAdmin={() => {
              setIsAdmin(false);
              setActiveTab('map');
            }}
          />
        )}
      </main>

      {/* Admin Login Modal */}
      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-stone-200 text-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <button
                onClick={() => {
                  setIsAdminLoginOpen(false);
                  setAdminLoginError(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-base text-stone-900">Đăng nhập Ban Quản Trị</h3>
              <p className="text-xs text-stone-500 mt-1">
                Dành cho Ban Quản trị và Thầy Cô hướng dẫn để kiểm duyệt và quản trị cơ sở dữ liệu thực địa.
              </p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mật mã quản trị:
                </label>
                <input
                  type="password"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="Nhập mật mã..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                  autoFocus
                />
                {adminLoginError && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">{adminLoginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Xác nhận đăng nhập
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Species Detail & Field QR Signage Modal */}
      {selectedPlant && (
        <SpeciesDetailModal
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
          onOpenMapLocation={handleLocateOnMap}
          onAddMonitoringLog={handleAddMonitoringLog}
          isAdmin={isAdmin}
          onApproveMonitoringLog={handleApproveMonitoringLog}
          onRejectMonitoringLog={handleRejectMonitoringLog}
          onDeleteMonitoringLog={handleDeleteMonitoringLog}
        />
      )}

      {/* AI Multimodal Plant Scanner Modal */}
      <AIPlantScanner
        isOpen={isAIScannerOpen}
        onClose={() => setIsAIScannerOpen(false)}
        existingPlants={plants}
        onOpenPlantDetail={handleSelectPlant}
        onPrefillNewSurvey={handlePrefillNewSurveyFromAI}
      />

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        plants={plants}
        onSelectPlantById={handleSelectPlantById}
      />

      {/* Field Survey Data Entry Modal */}
      <SurveyEntryModal
        isOpen={isSurveyModalOpen}
        onClose={() => {
          setIsSurveyModalOpen(false);
          setSurveyPrefillData(null);
        }}
        onSaveNewPlant={handleSaveNewPlant}
        prefillData={surveyPrefillData}
        onTriggerMapPickCoords={handleTriggerPickCoordsFromForm}
        pickedCoords={pickedCoords}
        isAdmin={isAdmin}
        existingPlants={plants}
      />

      {/* About Project & Scientific Methodology Modal */}
      <AboutProjectModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

export default App;
