import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  RotateCcw, 
  Download, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  FileCode,
  ToggleLeft,
  ToggleRight,
  HardDrive
} from 'lucide-react';
import { MedicinalPlant, BackupSnapshot } from '../types';
import { 
  getDailyBackups, 
  createBackup, 
  restoreFromBackup, 
  deleteBackup, 
  isAutoBackupEnabled, 
  setAutoBackupEnabled,
  getStoredPlants
} from '../utils/storage';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (plants: MedicinalPlant[], msg: string) => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [autoBackupActive, setAutoBackupActive] = useState<boolean>(true);
  const [manualNote, setManualNote] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackupData();
    }
  }, [isOpen]);

  const loadBackupData = () => {
    setBackups(getDailyBackups());
    setAutoBackupActive(isAutoBackupEnabled());
  };

  if (!isOpen) return null;

  const showMsg = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleToggleAutoBackup = () => {
    const nextVal = !autoBackupActive;
    setAutoBackupActive(nextVal);
    setAutoBackupEnabled(nextVal);
    showMsg(nextVal ? 'Đã bật tính năng tự động sao lưu dữ liệu hằng ngày!' : 'Đã tắt tính năng tự động sao lưu.');
  };

  const handleCreateManualBackup = () => {
    setIsCreating(true);
    setTimeout(() => {
      const note = manualNote.trim() || 'Bản sao lưu thủ công';
      const snap = createBackup('manual', note);
      setManualNote('');
      setIsCreating(false);
      loadBackupData();
      showMsg(`Đã tạo thành công bản sao lưu "${snap.note}" (${snap.plantCount} loài)!`);
    }, 300);
  };

  const handleRestore = (backup: BackupSnapshot) => {
    if (
      confirm(
        `Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu ngày ${backup.date} (${backup.timeString}) gồm ${backup.plantCount} loài cây thuốc?\n\nDữ liệu hiện tại sẽ được cập nhật lại theo bản sao lưu này.`
      )
    ) {
      const restored = restoreFromBackup(backup.id);
      if (restored) {
        onRestoreSuccess(restored, `Đã phục hồi thành công dữ liệu từ bản sao lưu ngày ${backup.date}!`);
        onClose();
      } else {
        alert('Không thể phục hồi từ bản sao lưu này do dữ liệu bị lỗi.');
      }
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa bản sao lưu "${name}"?`)) {
      const updated = deleteBackup(id);
      setBackups(updated);
      showMsg('Đã xóa bản sao lưu.');
    }
  };

  const handleDownloadSnapshot = (snap: BackupSnapshot) => {
    const jsonStr = JSON.stringify(snap.plants, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HerbMap_TamAnh_Backup_${snap.date}_${snap.timeString.replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMsg(`Đã tải về tệp JSON bản sao lưu ngày ${snap.date}!`);
  };

  const currentCount = getStoredPlants().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sao Lưu & Phục Hồi Dữ Liệu Tự Động</h2>
              <p className="text-xs text-stone-300">
                Lưu trữ các điểm phục hồi an toàn, tự động sao lưu hằng ngày chống thất thoát dữ liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-stone-700 text-xs flex-1">
          {/* Status notification */}
          {statusNotice && (
            <div className="p-3 rounded-2xl bg-emerald-900/90 text-emerald-100 border border-emerald-700 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Daily Auto Backup Config Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">
                  Chế độ Tự động Sao lưu Hằng ngày (Daily Auto-Backup)
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    autoBackupActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {autoBackupActive ? 'Đang kích hoạt' : 'Đã tạm dừng'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed max-w-lg">
                Hệ thống tự động chụp ảnh dữ liệu (snapshot) mỗi ngày khi có người truy cập và lưu trữ tối đa 15 bản sao lưu gần nhất.
              </p>
            </div>

            <button
              onClick={handleToggleAutoBackup}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shrink-0 ${
                autoBackupActive
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              {autoBackupActive ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bật tự động</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>Tắt</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Backup Trigger Form */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-700" />
                Tạo bản sao lưu tức thì (Thủ công)
              </span>
              <span className="text-[11px] text-amber-800">
                CSDL hiện có: <strong className="font-bold">{currentCount} loài</strong>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Ghi chú (Ví dụ: Trước khi nghiệm thu cấp Huyện, Sau đợt đi rừng...)"
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleCreateManualBackup}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? 'Đang tạo...' : 'Tạo bản sao lưu ngay'}</span>
              </button>
            </div>
          </div>

          {/* Backups List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Danh sách các bản sao lưu đã tạo ({backups.length})</span>
              </h3>
              <span className="text-[10px] text-stone-400">
                Nhấp "Phục hồi" để lấy lại dữ liệu của thời điểm đó
              </span>
            </div>

            {backups.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 space-y-2">
                <Database className="w-8 h-8 mx-auto text-stone-300" />
                <p className="font-semibold text-xs text-stone-600">Chưa có bản sao lưu nào trong bộ nhớ.</p>
                <p className="text-[11px]">Bấm nút "Tạo bản sao lưu ngay" ở trên để lưu điểm phục hồi đầu tiên.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {backups.map((snap) => {
                  const isAuto = snap.type === 'auto_daily';

                  return (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-stone-300 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isAuto
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {isAuto ? 'Tự động hằng ngày' : 'Thủ công'}
                          </span>
                          <span className="font-bold text-stone-900 text-xs">
                            {snap.date} • {snap.timeString}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            ({snap.plantCount} loài • {snap.sizeKb || 12} KB)
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 font-medium">
                          {snap.note || 'Bản sao lưu CSDL'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleRestore(snap)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Phục hồi dữ liệu về phiên bản này"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Phục hồi</span>
                        </button>

                        <button
                          onClick={() => handleDownloadSnapshot(snap)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                          title="Tải tệp JSON của bản sao lưu này về máy"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-700" />
                        </button>

                        <button
                          onClick={() => handleDelete(snap.id, snap.note || snap.date)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Xóa bản sao lưu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Dữ liệu sao lưu được lưu trữ an toàn trong Indexed/Local Storage trình duyệt.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
