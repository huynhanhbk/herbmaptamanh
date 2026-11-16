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
  checkAndRunDailyAutoBackup, 
  addPlantMonitoringLog,
  approvePlantMonitoringLog,
  rejectPlantMonitoringLog,
  deletePlantMonitoringLog,
  setCloudPendingPlants,
  clearCloudPendingPlants
} from './utils/storage';
import { 
  subscribeToPlantsRealtime, 
  subscribeToPendingPlantsRealtime,
  syncInitialPlantsToFirestore,
  checkUserIsAdmin,
  subscribeToPendingSurveysRealtime,
  PendingCommunitySurvey
} from './lib/plantSync';
import { auth, googleProvider } from './lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User
} from 'firebase/auth';
import { Lock, CheckCircle, AlertTriangle, X, ShieldAlert, Mail, Loader2 } from 'lucide-react';

export function App() {
  const [plants, setPlants] = useState<MedicinalPlant[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'catalog' | 'dashboard' | 'admin'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [needsVerificationUser, setNeedsVerificationUser] = useState<User | null>(null);
  const [externalPendingSurveys, setExternalPendingSurveys] = useState<PendingCommunitySurvey[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);

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

  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, durationMs: number = 3500, variant: 'success' | 'error' = 'success') => {
    setToastMessage({ text: msg, variant });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, durationMs);
  };

  // Load plants on mount, sync with cloud Firestore in real-time, and trigger auto backup check
  useEffect(() => {
    const loaded = getStoredPlants();
    setPlants(loaded);

    // Initial check & seed to Firestore if cloud is fresh
    syncInitialPlantsToFirestore().catch((e) => console.warn('Firestore initial sync check:', e));

    // Subscribe to real-time changes across all connected devices (phones, computers, browsers)
    const unsubscribePlants = subscribeToPlantsRealtime((cloudPlants) => {
      setPlants(cloudPlants);
      // If currently viewing a plant that got updated on another device, keep detail modal in sync
      setSelectedPlant((prev) => {
        if (!prev) return null;
        const updated = cloudPlants.find((p) => p.id === prev.id);
        return updated || prev;
      });
    });

    // Subscribe to Firebase Authentication state for Admin RBAC
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setAdminUser(null);
        return;
      }
      const authorized = await checkUserIsAdmin(user);
      if (authorized) {
        setIsAdmin(true);
        setAdminUser(user);
        setNeedsVerificationUser(null);
        syncInitialPlantsToFirestore().catch(() => {});
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
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

    const handleSyncError = (ev: Event) => {
      const detail = (ev as CustomEvent<{ message?: string; isError?: boolean }>).detail;
      if (detail?.message) {
        showToast(detail.message, 6000, detail.isError === false ? 'success' : 'error');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('herbmap-firestore-sync-error', handleSyncError);
    }

    return () => {
      unsubscribePlants();
      unsubscribeAuth();
      if (typeof window !== 'undefined') {
        window.removeEventListener('herbmap-firestore-sync-error', handleSyncError);
      }
    };
  }, []);

  // Subscribe to pending community new-plant surveys (/pending_surveys) and monitoring logs (/surveys) when Admin is authenticated
  useEffect(() => {
    if (!isAdmin) {
      setExternalPendingSurveys([]);
      setPlants(clearCloudPendingPlants());
      return;
    }
    const unsubscribePendingPlants = subscribeToPendingPlantsRealtime(
      (pendingList) => {
        const merged = setCloudPendingPlants(pendingList);
        setPlants(merged);
      },
      (err) => {
        console.warn('Real-time pending_surveys listener issue:', err);
      }
    );
    const unsubscribeSurveys = subscribeToPendingSurveysRealtime((surveys) => {
      setExternalPendingSurveys(surveys);
    });
    return () => {
      unsubscribePendingPlants();
      unsubscribeSurveys();
    };
  }, [isAdmin]);

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
    const isDirectVerified = newPlantData.status === 'verified';
    showToast(
      isDirectVerified
        ? explicitSpeciesId
          ? `Ban Quản trị: Đã ghi nhận điểm khảo sát mới cho loài [${newPlantData.vietnameseName}] ở trạng thái Đã ghi nhận!`
          : 'Ban Quản trị: Đã lưu điểm khảo sát thực địa mới ở trạng thái Đã ghi nhận!'
        : explicitSpeciesId
        ? `Đã ghi nhận điểm khảo sát thực địa mới cho loài [${newPlantData.vietnameseName}] ở trạng thái Điểm mới (Chờ duyệt)!`
        : 'Đã lưu phiếu khảo sát thực địa thành công ở trạng thái Điểm mới (Chờ duyệt)!'
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
    const ext = externalPendingSurveys.find((s) => s.id === logId);
    const reviewerLabel = adminUser?.email ? `Ban Quản trị (${adminUser.email})` : 'Ban Quản trị (Admin)';
    const updated = approvePlantMonitoringLog(plantId, logId, reviewerLabel, ext);
    setPlants(updated);
    if (ext) {
      setExternalPendingSurveys((prev) => prev.filter((s) => s.id !== logId));
    }
    const updatedPlant = updated.find((p) => p.id === plantId);
    if (updatedPlant) {
      setSelectedPlant(updatedPlant);
    }
    showToast('Đã phê duyệt đợt kiểm tra thực địa và đồng bộ diễn biến cây!');
  };

  const handleRejectMonitoringLog = (plantId: string, logId: string, reason?: string) => {
    const ext = externalPendingSurveys.find((s) => s.id === logId);
    const updated = rejectPlantMonitoringLog(plantId, logId, reason, ext);
    setPlants(updated);
    if (ext) {
      setExternalPendingSurveys((prev) => prev.filter((s) => s.id !== logId));
    }
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

  const formatAuthErrorMessage = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Bạn đã đóng cửa sổ đăng nhập Google.';
      case 'auth/popup-blocked':
        return 'Trình duyệt đang chặn cửa sổ bật lên (Popup). Vui lòng cho phép popup và thử lại.';
      case 'auth/unauthorized-domain':
        return 'Tên miền hiện tại chưa được cấp phép trong Firebase Authentication (Authorized domains).';
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email hoặc mật khẩu quản trị không chính xác.';
      case 'auth/invalid-email':
        return 'Địa chỉ Email không đúng định dạng.';
      case 'auth/too-many-requests':
        return 'Thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.';
      default:
        return err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.';
    }
  };

  const handleGoogleAdminLogin = async () => {
    setIsAuthLoading(true);
    setAdminLoginError(null);
    setNeedsVerificationUser(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const authorized = await checkUserIsAdmin(cred.user);
      if (authorized) {
        setIsAdmin(true);
        setAdminUser(cred.user);
        setIsAdminLoginOpen(false);
        setActiveTab('admin');
        showToast(`Đăng nhập Ban Quản trị (${cred.user.email}) thành công!`);
      } else {
        await signOut(auth);
        setIsAdmin(false);
        setAdminUser(null);
        setAdminLoginError(
          `Tài khoản Google "${cred.user.email || 'này'}" chưa được cấp quyền Ban Quản trị HerbMap Tam Anh.`
        );
      }
    } catch (err) {
      setAdminLoginError(formatAuthErrorMessage(err));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim() || !adminPasswordInput) {
      setAdminLoginError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setIsAuthLoading(true);
    setAdminLoginError(null);
    setNeedsVerificationUser(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmailInput.trim(), adminPasswordInput);
      if (!cred.user.emailVerified) {
        setNeedsVerificationUser(cred.user);
        setAdminLoginError(
          'Email của tài khoản này chưa được xác minh (email_verified). Vui lòng xác minh Email trước khi truy cập quyền Quản trị hoặc dùng nút Đăng nhập Google.'
        );
        return;
      }
      const authorized = await checkUserIsAdmin(cred.user);
      if (authorized) {
        setIsAdmin(true);
        setAdminUser(cred.user);
        setIsAdminLoginOpen(false);
        setAdminEmailInput('');
        setAdminPasswordInput('');
        setAdminLoginError(null);
        setActiveTab('admin');
        showToast(`Đăng nhập Ban Quản trị (${cred.user.email}) thành công!`);
      } else {
        await signOut(auth);
        setIsAdmin(false);
        setAdminUser(null);
        setAdminLoginError(
          `Tài khoản "${cred.user.email || 'này'}" chưa được cấp quyền Ban Quản trị HerbMap Tam Anh.`
        );
      }
    } catch (err) {
      setAdminLoginError(formatAuthErrorMessage(err));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!needsVerificationUser) return;
    setIsAuthLoading(true);
    try {
      await sendEmailVerification(needsVerificationUser);
      showToast(`Đã gửi email xác minh đến ${needsVerificationUser.email}. Hãy kiểm tra hộp thư!`);
    } catch (err) {
      setAdminLoginError(formatAuthErrorMessage(err));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    setIsAdmin(false);
    setAdminUser(null);
    setPlants(clearCloudPendingPlants());
    setActiveTab('map');
    showToast('Đã đăng xuất quyền Quản trị.');
  };

  const pendingCount = plants.filter((p) => p.status === 'pending').length + (isAdmin ? externalPendingSurveys.length : 0);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-4 z-50 bg-stone-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs animate-fadeIn max-w-md ${
            toastMessage.variant === 'error' ? 'border-rose-500/70' : 'border-emerald-500/50'
          }`}
        >
          {toastMessage.variant === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
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
        onLogoutAdmin={handleLogoutAdmin}
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
            onLogoutAdmin={handleLogoutAdmin}
            adminEmail={adminUser?.email}
            externalPendingSurveys={externalPendingSurveys}
            onExternalSurveysUpdated={setExternalPendingSurveys}
          />
        )}
      </main>

      {/* Admin Login Modal (Firebase Authentication: Google & Email/Password) */}
      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 text-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <button
                onClick={() => {
                  setIsAdminLoginOpen(false);
                  setAdminLoginError(null);
                  setNeedsVerificationUser(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-base text-stone-900">Đăng nhập Ban Quản Trị (Firebase Auth)</h3>
              <p className="text-xs text-stone-500 mt-1">
                Xác thực tài khoản Quản trị viên để duyệt phiếu khảo sát, chỉnh sửa hoặc xóa bản ghi trên hệ thống.
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isAuthLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {isAuthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
              )}
              <span>Đăng nhập bằng tài khoản Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="shrink mx-3 text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                Hoặc đăng nhập bằng Email
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <form onSubmit={handleEmailAdminLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email quản trị:
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="email"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mật khẩu:
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
                />
              </div>

              {adminLoginError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{adminLoginError}</span>
                  </div>
                  {needsVerificationUser && (
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      disabled={isAuthLoading}
                      className="text-amber-800 underline font-bold hover:text-amber-950 block"
                    >
                      Gửi lại email xác minh
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAuthLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Đăng nhập bằng Email</span>
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
