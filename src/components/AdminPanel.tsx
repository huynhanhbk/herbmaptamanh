import React, { useState, useEffect } from 'react';
import { MedicinalPlant, PlantMonitoringLog } from '../types';
import { 
  ShieldCheck, 
  Trash2, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Search, 
  ExternalLink,
  Lock,
  Unlock,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  TreePine,
  AlertTriangle,
  Pencil,
  Upload,
  Database,
  CalendarCheck,
  Layers,
  History,
  Phone,
  User,
  X,
  Check,
  EyeOff
} from 'lucide-react';
import { 
  updatePlantStatus, 
  deletePlant, 
  resetToDefaultData, 
  exportPlantsAsJSON, 
  exportPlantsAsCSV,
  saveUpdatedPlant,
  getDailyBackups,
  isAutoBackupEnabled,
  getAllPendingMonitoringLogs,
  approvePlantMonitoringLog,
  rejectPlantMonitoringLog,
  deletePlantMonitoringLog
} from '../utils/storage';
import { matchPlantSearch } from '../utils/searchHelper';
import { EditPlantModal } from './EditPlantModal';
import { DataImportModal } from './DataImportModal';
import { BackupManagerModal } from './BackupManagerModal';

interface AdminPanelProps {
  plants: MedicinalPlant[];
  onPlantsUpdated: (plants: MedicinalPlant[]) => void;
  onSelectPlant: (plant: MedicinalPlant) => void;
  onLocateOnMap: (plant: MedicinalPlant) => void;
  onLogoutAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  plants,
  onPlantsUpdated,
  onSelectPlant,
  onLocateOnMap,
  onLogoutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'plants' | 'monitoring'>('plants');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [editingPlant, setEditingPlant] = useState<MedicinalPlant | null>(null);
  const [deleteConfirmPlant, setDeleteConfirmPlant] = useState<{ id: string; name: string } | null>(null);
  const [rejectLogState, setRejectLogState] = useState<{ plantId: string; logId: string; plantName: string; reason: string } | null>(null);
  const [deleteLogState, setDeleteLogState] = useState<{ plantId: string; logId: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  
  // Modals for Import & Backup Manager
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupStats, setBackupStats] = useState<{ total: number; latestDate?: string; autoActive: boolean }>({
    total: 0,
    autoActive: true,
  });

  const refreshBackupStats = () => {
    const list = getDailyBackups();
    const latest = list.length > 0 ? list[0].date : undefined;
    setBackupStats({
      total: list.length,
      latestDate: latest,
      autoActive: isAutoBackupEnabled(),
    });
  };

  useEffect(() => {
    refreshBackupStats();
  }, [plants]);

  const showNotice = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleApprove = (id: string, name: string) => {
    const updated = updatePlantStatus(id, 'verified');
    onPlantsUpdated(updated);
    showNotice(`Đã phê duyệt & xác nhận khoa học loài "${name}"!`);
  };

  const handleRevertToPending = (id: string, name: string) => {
    const updated = updatePlantStatus(id, 'pending');
    onPlantsUpdated(updated);
    showNotice(`Đã chuyển loài "${name}" về trạng thái Chờ duyệt.`);
  };

  const handleOpenEdit = (plant: MedicinalPlant) => {
    setEditingPlant(plant);
  };

  const handleSavePlantUpdates = (
    idOrPlant: string | MedicinalPlant,
    updatedFields?: Partial<MedicinalPlant>
  ) => {
    let updated: MedicinalPlant[];
    if (typeof idOrPlant === 'string') {
      updated = saveUpdatedPlant(idOrPlant, updatedFields || {});
    } else {
      updated = saveUpdatedPlant(idOrPlant.id, idOrPlant);
    }
    onPlantsUpdated(updated);
    const targetId = typeof idOrPlant === 'string' ? idOrPlant : idOrPlant.id;
    const target = updated.find((p) => p.id === targetId);
    showNotice(`Đã lưu cập nhật thông tin loài "${target?.vietnameseName || ''}" thành công!`);
    setEditingPlant(null);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmPlant({ id, name });
  };

  const confirmDeletePlant = () => {
    if (!deleteConfirmPlant) return;
    const { id, name } = deleteConfirmPlant;
    const updated = deletePlant(id);
    onPlantsUpdated(updated);
    showNotice(`Đã xóa vĩnh viễn cây thuốc "${name}" khỏi cơ sở dữ liệu.`);
    setDeleteConfirmPlant(null);
  };

  const handleApproveLog = (plantId: string, logId: string, plantName: string) => {
    const updated = approvePlantMonitoringLog(plantId, logId);
    onPlantsUpdated(updated);
    showNotice(`Đã phê duyệt đợt kiểm tra thực địa cho loài "${plantName}"!`);
  };

  const handleRejectLog = (plantId: string, logId: string, plantName: string) => {
    setRejectLogState({ 
      plantId, 
      logId, 
      plantName, 
      reason: 'Ảnh không rõ ràng hoặc thông tin chưa chính xác ngoài thực địa' 
    });
  };

  const confirmRejectLog = () => {
    if (!rejectLogState) return;
    const { plantId, logId, plantName, reason } = rejectLogState;
    const updated = rejectPlantMonitoringLog(plantId, logId, reason);
    onPlantsUpdated(updated);
    showNotice(`Đã từ chối đợt báo cáo cho loài "${plantName}".`);
    setRejectLogState(null);
  };

  const handleDeleteLog = (plantId: string, logId: string) => {
    setDeleteLogState({ plantId, logId });
  };

  const confirmDeleteLog = () => {
    if (!deleteLogState) return;
    const { plantId, logId } = deleteLogState;
    const updated = deletePlantMonitoringLog(plantId, logId);
    onPlantsUpdated(updated);
    showNotice('Đã xóa bản ghi đợt kiểm tra.');
    setDeleteLogState(null);
  };

  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmResetData = () => {
    const defaultData = resetToDefaultData();
    onPlantsUpdated(defaultData);
    showNotice('Đã khôi phục cơ sở dữ liệu về 14 loài cây thuốc chuẩn ban đầu!');
    setIsResetConfirmOpen(false);
  };

  const handleDownloadJSON = () => {
    exportPlantsAsJSON(plants);
    showNotice('Đã xuất tệp JSON CSDL thành công!');
  };

  const handleDownloadCSV = () => {
    exportPlantsAsCSV(plants);
    showNotice('Đã xuất tệp CSV Bảng tính CSDL thành công!');
  };

  const handleImportSuccess = (updatedPlants: MedicinalPlant[], message: string) => {
    onPlantsUpdated(updatedPlants);
    refreshBackupStats();
    showNotice(message);
  };

  const handleRestoreSuccess = (restoredPlants: MedicinalPlant[], message: string) => {
    onPlantsUpdated(restoredPlants);
    refreshBackupStats();
    showNotice(message);
  };

  const filtered = plants.filter((plant) => {
    if (filterStatus === 'pending' && plant.status !== 'pending') return false;
    if (filterStatus === 'verified' && plant.status !== 'verified') return false;
    if (adminSearch.trim()) {
      return matchPlantSearch(plant, adminSearch);
    }
    return true;
  });

  const pendingCount = plants.filter((p) => p.status === 'pending').length;
  const verifiedCount = plants.filter((p) => p.status === 'verified').length;

  const pendingMonitoringLogs = getAllPendingMonitoringLogs();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-stone-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-amber-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-800 text-amber-200 border border-amber-600/50 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Ban Chuyên Môn / Quản Trị Viên
            </span>
            <span className="text-xs text-stone-400">Hội Đồng KHKT Xã Tam Anh</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Kiểm Duyệt Thực Địa & Quản Trị CSDL Cây Thuốc
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
            Thẩm định tọa độ GPS, đối chiếu mẫu ảnh lá-hoa-quả, nhập/xuất tệp dữ liệu CSV/JSON và quản lý sao lưu tự động hằng ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Backup Modal trigger */}
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-xs font-semibold border border-amber-700/60 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Quản lý sao lưu tự động hằng ngày & điểm phục hồi"
          >
            <Database className="w-3.5 h-3.5 text-amber-300" />
            <span>Sao lưu & Phục hồi</span>
            {backupStats.autoActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Quick Import Modal trigger */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 text-xs font-semibold border border-emerald-700/60 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Nhập file CSV hoặc JSON từ máy tính/server khác"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-300" />
            <span>Nhập File (JSON/CSV)</span>
          </button>

          <button
            onClick={onLogoutAdmin}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Đăng xuất Quản trị</span>
          </button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('plants')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'plants'
              ? 'bg-stone-900 text-white shadow-md'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <TreePine className="w-4 h-4" />
          <span>Hồ sơ Cây thuốc & Phiếu mới</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-purple-500 text-white text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'monitoring'
              ? 'bg-amber-700 text-white shadow-md'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Giám sát Thực địa Chờ duyệt</span>
          {pendingMonitoringLogs.length > 0 ? (
            <span className="px-2 py-0.2 rounded-full bg-amber-400 text-stone-950 font-extrabold text-[10px] animate-pulse">
              {pendingMonitoringLogs.length}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-600 text-[10px]">
              0
            </span>
          )}
        </button>
      </div>

      {/* Auto Backup & Database Health Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Backup health badge */}
        <div 
          onClick={() => setIsBackupModalOpen(true)}
          className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 shadow-2xs cursor-pointer flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-900 text-xs">Tự động sao lưu hằng ngày</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  {backupStats.autoActive ? 'BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {backupStats.latestDate ? `Gần nhất: ${backupStats.latestDate}` : 'Tự động sao lưu mỗi ngày'} • {backupStats.total} bản lưu
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            Quản lý &rarr;
          </span>
        </div>

        {/* Monitoring logs pending badge */}
        <div 
          onClick={() => setActiveTab('monitoring')}
          className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 shadow-2xs cursor-pointer flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-900 text-xs">Đợt giám sát chờ duyệt</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  pendingMonitoringLogs.length > 0 ? 'bg-amber-200 text-amber-900 font-extrabold' : 'bg-stone-100 text-stone-600'
                }`}>
                  {pendingMonitoringLogs.length} đợt
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Báo cáo biến động thực địa từ cộng đồng
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            Kiểm duyệt &rarr;
          </span>
        </div>

        {/* Database Total Stats */}
        <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-xs block">Tổng số loài trong CSDL</span>
              <p className="text-[11px] text-stone-500">
                {verifiedCount} đã thẩm định • {pendingCount} phiếu mới chờ duyệt
              </p>
            </div>
          </div>
          <span className="font-extrabold text-stone-900 text-base">
            {plants.length} loài
          </span>
        </div>
      </div>

      {/* Success notice */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-900/95 text-emerald-100 border border-emerald-700 text-xs flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {/* TAB 1: PLANTS LIST & NEW SURVEY REVIEWS */}
      {activeTab === 'plants' && (
        <>
          {/* Control Tools Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tất cả ({plants.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Phiếu mới chờ duyệt ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('verified')}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                  filterStatus === 'verified'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Đã xác nhận ({verifiedCount})
              </button>
            </div>

            {/* Search input & Export/Import buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Tìm theo tên, mã..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50 text-xs"
                />
              </div>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5 transition-colors"
                title="Nhập dữ liệu tệp CSV hoặc JSON"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Nhập File</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold flex items-center gap-1.5 transition-colors"
                title="Xuất bảng tính CSV để báo cáo"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={handleDownloadJSON}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold flex items-center gap-1.5 transition-colors"
                title="Xuất tệp dữ liệu JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Xuất JSON</span>
              </button>

              <button
                onClick={handleResetData}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 transition-colors"
                title="Khôi phục danh sách mẫu ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Khôi phục gốc</span>
              </button>
            </div>
          </div>

          {/* Table of plant records */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Cây thuốc & Ảnh</th>
                    <th className="p-3.5">Phân loại & Sinh cảnh</th>
                    <th className="p-3.5">Tọa độ GPS & Khu vực</th>
                    <th className="p-3.5">Tri thức dân gian</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 pr-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-stone-400">
                        Không có bản ghi nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((plant) => {
                      const isPending = plant.status === 'pending';

                      return (
                        <tr key={plant.id} className="hover:bg-stone-50/80 transition-colors">
                          {/* Photo & Name */}
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={plant.coverImage}
                                alt={plant.vietnameseName}
                                className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0 cursor-pointer"
                                onClick={() => onSelectPlant(plant)}
                              />
                              <div>
                                <span className="font-mono text-[10px] font-bold text-stone-500 block">
                                  {plant.id}
                                </span>
                                <span 
                                  className="font-bold text-stone-900 text-xs hover:text-emerald-700 cursor-pointer block leading-tight"
                                  onClick={() => onSelectPlant(plant)}
                                >
                                  {plant.vietnameseName}
                                </span>
                                <span className="text-[11px] text-stone-500 italic font-serif">
                                  {plant.scientificName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Family & Habitat */}
                          <td className="p-3.5">
                            <span className="text-stone-900 font-medium block">{plant.family}</span>
                            <span className="text-[11px] text-stone-500">{plant.habitat}</span>
                          </td>

                          {/* Location & GPS */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-800">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{plant.location.lat.toFixed(5)}, {plant.location.lng.toFixed(5)}</span>
                            </div>
                            <span className="text-[11px] text-stone-600 block mt-0.5">
                              {plant.location.address || 'Tam Anh, TP.Đà Nẵng'}
                            </span>
                          </td>

                          {/* Traditional Uses */}
                          <td className="p-3.5 max-w-xs">
                            <p className="line-clamp-2 text-[11px] text-stone-600">
                              {plant.traditionalUses.remedies || plant.traditionalUses.preparation}
                            </p>
                            <span className="text-[10px] text-stone-400 block mt-0.5">
                              Nguồn: {plant.traditionalUses.informantName} ({plant.traditionalUses.informantRole})
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                <Clock className="w-3 h-3 text-purple-600" />
                                Chờ duyệt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Đã xác nhận
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <button
                                  onClick={() => handleApprove(plant.id, plant.vietnameseName)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                                  title="Duyệt & xác nhận khoa học"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Duyệt</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRevertToPending(plant.id, plant.vietnameseName)}
                                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                                  title="Chuyển về trạng thái chờ duyệt"
                                >
                                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEdit(plant)}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors border border-amber-200/60"
                                title="Chỉnh sửa toàn diện thông tin cây thuốc"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onSelectPlant(plant)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                                title="Xem chi tiết hồ sơ & in biển QR"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
                              </button>

                              <button
                                onClick={() => handleDelete(plant.id, plant.vietnameseName)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-rose-600 transition-colors"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MONITORING LOGS REVIEW */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                Danh sách Đợt Giám sát & Báo cáo Thực địa Chờ Ban Quản trị Duyệt
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Các đợt kiểm tra thực địa do cộng đồng, học sinh hoặc khách khảo sát gửi lên. Chỉ khi Ban Quản trị duyệt thì trạng thái mới chính thức cập nhật vào Bản đồ và Lịch sử giám sát.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 shrink-0">
              {pendingMonitoringLogs.length} đợt chờ duyệt
            </span>
          </div>

          {pendingMonitoringLogs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-stone-800">Không có đợt giám sát nào đang chờ duyệt</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Tất cả các báo cáo diễn biến cây dược liệu thực địa đã được phê duyệt hoặc xử lý đầy đủ.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMonitoringLogs.map(({ plant, log }) => {
                let statusBadge = (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🟢 Báo cáo: An toàn
                  </span>
                );
                if (log.status === 'degraded') {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      🟡 Báo cáo: Bị suy giảm
                    </span>
                  );
                } else if (log.status === 'disappeared') {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-900 border border-stone-300">
                      ⚫ Báo cáo: Biến mất (Lưu trữ điểm đã mất)
                    </span>
                  );
                } else if (log.status === 'new') {
                  statusBadge = (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                      🟣 Báo cáo: Điểm mới
                    </span>
                  );
                }

                return (
                  <div key={log.id} className="bg-white rounded-3xl border-2 border-amber-300 shadow-md p-5 space-y-4 relative">
                    {/* Plant header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <img 
                          src={plant.coverImage} 
                          alt={plant.vietnameseName} 
                          className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shrink-0" 
                        />
                        <div>
                          <span className="text-[10px] font-mono font-bold text-stone-500 block">
                            {plant.id}
                          </span>
                          <h4 className="font-bold text-sm text-stone-900 leading-tight">
                            {plant.vietnameseName}
                          </h4>
                          <span className="text-xs text-stone-500 italic font-serif">
                            {plant.scientificName}
                          </span>
                        </div>
                      </div>

                      {statusBadge}
                    </div>

                    {/* Report details */}
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-amber-950">
                          <span>📅 Ngày kiểm tra: <b>{log.date}</b></span>
                          <span className="text-stone-500 font-mono">
                            📍 {plant.location.lat.toFixed(5)}, {plant.location.lng.toFixed(5)}
                          </span>
                        </div>
                        <p className="text-stone-800 leading-relaxed pt-1">
                          <b>Ghi chú thực địa:</b> {log.statusNote}
                        </p>
                      </div>

                      {log.evidencePhoto && (
                        <div>
                          <span className="text-[11px] font-bold text-stone-600 block mb-1">Ảnh thực địa đính kèm:</span>
                          <div className="w-32 h-32 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
                            <img 
                              src={log.evidencePhoto} 
                              alt="Ảnh thực địa" 
                              className="w-full h-full object-cover hover:scale-105 transition-transform" 
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-[11px] text-stone-600 border-t border-stone-100">
                        <span>👤 Người báo cáo: <b>{log.surveyor}</b></span>
                        {log.contactPhone && (
                          <span className="text-emerald-800 font-semibold">📞 SĐT: {log.contactPhone}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectPlant(plant)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xem hồ sơ loài</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onLocateOnMap(plant)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Vị trí bản đồ</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectLog(plant.id, log.id, plant.vietnameseName)}
                          className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveLog(plant.id, log.id, plant.vietnameseName)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>Phê duyệt đợt này</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full Record Edit Modal */}
      {editingPlant && (
        <EditPlantModal
          plant={editingPlant}
          isOpen={!!editingPlant}
          onClose={() => setEditingPlant(null)}
          onSave={handleSavePlantUpdates}
        />
      )}

      {/* Data Import Modal (JSON/CSV) */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Backup & Daily Snapshot Manager Modal */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => {
          setIsBackupModalOpen(false);
          refreshBackupStats();
        }}
        onRestoreSuccess={handleRestoreSuccess}
      />

      {/* In-App Delete Plant Confirmation Modal */}
      {deleteConfirmPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900">Xác nhận xóa cây thuốc?</h3>
              <p className="text-xs text-stone-600">
                Bạn có chắc chắn muốn xóa vĩnh viễn cây thuốc <span className="font-bold text-rose-700">"{deleteConfirmPlant.name}"</span> (Mã: <span className="font-mono font-semibold">{deleteConfirmPlant.id}</span>) khỏi cơ sở dữ liệu?
              </p>
              <p className="text-[11px] text-stone-400">Thao tác này sẽ xóa đồng bộ trên toàn hệ thống và lưu trữ.</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlant(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeletePlant}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Reject Log Modal */}
      {rejectLogState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <X className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900">Từ chối đợt báo cáo thực địa?</h3>
              <p className="text-xs text-stone-600">
                Loài: <span className="font-bold text-stone-800">{rejectLogState.plantName}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Lý do từ chối (được lưu vào lịch sử):</label>
              <input
                type="text"
                value={rejectLogState.reason}
                onChange={(e) => setRejectLogState({ ...rejectLogState, reason: e.target.value })}
                placeholder="Nhập lý do từ chối..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-stone-50"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectLogState(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={confirmRejectLog}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Log Modal */}
      {deleteLogState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900">Xóa bản ghi kiểm tra này?</h3>
              <p className="text-xs text-stone-600">
                Bản ghi nhật ký giám sát sẽ bị xóa khỏi lịch sử của loài cây thuốc.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteLogState(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Reset Database Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-rose-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-stone-900">Khôi phục cơ sở dữ liệu gốc?</h3>
              <p className="text-xs text-stone-600">
                Thao tác này sẽ thiết lập lại toàn bộ danh mục cây thuốc về <span className="font-bold text-emerald-800">14 loài cây thuốc chuẩn ban đầu</span> của xã Tam Anh.
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                ⚠️ Khuyến nghị: Hãy xuất file JSON sao lưu trước khi thực hiện thao tác này nếu bạn muốn giữ lại dữ liệu hiện tại!
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Khôi phục về CSDL gốc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
