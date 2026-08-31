import React, { useState, useEffect } from 'react';
import { MedicinalPlant } from '../types';
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
  Layers
} from 'lucide-react';
import { 
  updatePlantStatus, 
  deletePlant, 
  resetToDefaultData, 
  exportPlantsAsJSON, 
  exportPlantsAsCSV,
  saveUpdatedPlant,
  getDailyBackups,
  isAutoBackupEnabled
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [editingPlant, setEditingPlant] = useState<MedicinalPlant | null>(null);
  
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

  const handleSavePlantUpdates = (id: string, updates: Partial<MedicinalPlant>) => {
    const updated = saveUpdatedPlant(id, updates);
    onPlantsUpdated(updated);
    showNotice(`Đã cập nhật thành công hồ sơ cây thuốc ${id}!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa bản ghi thực địa "${name}" (${id})?`)) {
      const success = deletePlant(id);
      if (success) {
        onPlantsUpdated(plants.filter((p) => p.id !== id));
        showNotice(`Đã xóa bản ghi ${id}.`);
      }
    }
  };

  const handleResetData = () => {
    if (confirm('Khôi phục danh lục ban đầu 15 loài cây thuốc chuẩn thực địa Tam Anh?')) {
      const reset = resetToDefaultData();
      onPlantsUpdated(reset);
      showNotice('Đã khôi phục dữ liệu gốc!');
    }
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportPlantsAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HerbMap_TamAnh_Data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Đã xuất file JSON thành công!');
  };

  const handleDownloadCSV = () => {
    const csvStr = exportPlantsAsCSV();
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HerbMap_TamAnh_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Đã xuất bảng tính CSV thành công!');
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

        {/* Import & Migrate quick bar */}
        <div 
          onClick={() => setIsImportModalOpen(true)}
          className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 shadow-2xs cursor-pointer flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-xs block">Nhập dữ liệu (JSON / CSV)</span>
              <p className="text-[11px] text-stone-500">
                Khôi phục hoặc chuyển đổi dữ liệu từ server khác
              </p>
            </div>
          </div>
          <span className="text-xs text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            Tải tệp lên &rarr;
          </span>
        </div>

        {/* Database Total Stats */}
        <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-xs block">Tổng số loài trong CSDL</span>
              <p className="text-[11px] text-stone-500">
                {verifiedCount} đã thẩm định • {pendingCount} chờ duyệt
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
            Chờ duyệt ({pendingCount})
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
                        <span className="font-semibold text-stone-900 block">{plant.location.communeSection}</span>
                        <span className="text-[10px] font-mono text-stone-500 block">
                          {plant.location.lat.toFixed(4)}, {plant.location.lng.toFixed(4)}
                        </span>
                        <button
                          onClick={() => onLocateOnMap(plant)}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 mt-0.5"
                        >
                          <MapPin className="w-3 h-3" /> Xem bản đồ
                        </button>
                      </td>

                      {/* Folk remedy */}
                      <td className="p-3.5 max-w-xs">
                        <p className="line-clamp-2 text-[11px] text-stone-600">
                          {plant.traditionalUses.folkRemedies[0] || 'Kinh nghiệm dân gian'}
                        </p>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          Tư liệu: {plant.traditionalUses.informantName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            <Clock className="w-3 h-3" /> Chờ duyệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" /> Đã xác nhận
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <button
                              onClick={() => handleApprove(plant.id, plant.vietnameseName)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                              title="Phê duyệt bản ghi này lên bản đồ số chính thức"
                            >
                              <CheckCircle className="w-3 h-3" />
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
    </div>
  );
};
