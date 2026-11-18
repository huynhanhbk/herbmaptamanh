import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { MedicinalPlant, ImportResult } from '../types';
import { importPlantsFromJSON, importPlantsFromCSV, createBackup } from '../utils/storage';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (plants: MedicinalPlant[], summaryMsg: string) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'json' | 'csv' | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);

    const isJson = file.name.toLowerCase().endsWith('.json');
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');

    if (!isJson && !isCsv) {
      setErrorMessage('Định dạng tệp không hợp lệ. Vui lòng chỉ chọn tệp có đuôi .JSON hoặc .CSV.');
      setSelectedFile(null);
      setFileContent(null);
      setFileType(null);
      setPreviewItems([]);
      return;
    }

    const type = isJson ? 'json' : 'csv';
    setFileType(type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
      generatePreview(text, type);
    };
    reader.onerror = () => {
      setErrorMessage('Không thể đọc nội dung tệp tin.');
    };
    reader.readAsText(file);
  };

  const generatePreview = (text: string, type: 'json' | 'csv') => {
    try {
      if (type === 'json') {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        setPreviewItems(list.slice(0, 4));
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const sampleRows = lines.slice(1, 5).map((row, idx) => {
            const cols = row.split(',');
            return {
              id: cols[0]?.replace(/"/g, '') || `Dòng ${idx + 1}`,
              vietnameseName: cols[1]?.replace(/"/g, '') || 'Chưa rõ tên',
              scientificName: cols[2]?.replace(/"/g, '') || 'Đang phân loại',
              habitat: cols[4]?.replace(/"/g, '') || 'Khu vực thực địa',
            };
          });
          setPreviewItems(sampleRows);
        }
      }
    } catch {
      setPreviewItems([]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (!fileContent || !fileType) {
      setErrorMessage('Vui lòng chọn tệp tin dữ liệu trước khi thực hiện.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        // Create an automatic pre-import safety backup
        createBackup('manual', `Tự động sao lưu dự phòng trước khi nhập tệp (${selectedFile?.name || fileType})`);

        let result: ImportResult;
        if (fileType === 'json') {
          result = importPlantsFromJSON(fileContent, importMode);
        } else {
          result = importPlantsFromCSV(fileContent, importMode);
        }

        if (result.success) {
          const modeText = importMode === 'replace' ? 'Ghi đè toàn bộ' : 'Gộp & Cập nhật';
          const msg = `Nhập thành công ${result.importedCount} bản ghi (${modeText}) từ tệp ${selectedFile?.name}!`;
          onImportSuccess(result.plants, msg);
          onClose();
        } else {
          setErrorMessage(result.error || 'Có lỗi xảy ra trong quá trình nhập dữ liệu.');
        }
      } catch (err: any) {
        setErrorMessage(`Lỗi xử lý: ${err?.message || 'Không xác định'}`);
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setFileContent(null);
    setFileType(null);
    setPreviewItems([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nhập Dữ Liệu Thực Địa (JSON / CSV)</h2>
              <p className="text-xs text-stone-300">
                Phục hồi dữ liệu khi chuyển máy, chuyển máy chủ hoặc đồng bộ danh lục cây thuốc
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
          {/* Info Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-amber-950">
                An toàn tuyệt đối & Tự động lưu dự phòng
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                Trước khi nhập, hệ thống sẽ tự động tạo 1 bản sao lưu dự phòng của cơ sở dữ liệu hiện tại để bạn có thể khôi phục lại bất kỳ lúc nào nếu muốn.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block">Không thể xử lý tệp tin:</span>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* File Upload Drop Area */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : 'border-stone-300 hover:border-amber-500 hover:bg-stone-50/60 bg-stone-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">
                  Kéo thả tệp JSON hoặc CSV vào đây, hoặc <span className="text-emerald-700 underline">chọn tệp từ máy tính</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Hỗ trợ định dạng: <span className="font-mono font-semibold">.JSON</span> (Toàn bộ trường dữ liệu & ảnh) hoặc <span className="font-mono font-semibold">.CSV</span> (Bảng tính Excel/Sheets)
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-stone-400 font-medium pt-2">
                <span className="flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" /> JSON chuẩn HerbMap
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Bảng tính CSV
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File Card */}
              <div className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shadow-xs text-amber-700">
                    {fileType === 'json' ? (
                      <FileCode className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Định dạng: <span className="font-semibold uppercase">{fileType}</span> • Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetFile}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-200 text-stone-700 border border-stone-200 font-semibold text-xs transition-colors"
                >
                  Chọn tệp khác
                </button>
              </div>

              {/* Import Mode Selector */}
              <div className="space-y-2">
                <label className="font-bold text-stone-800 block text-xs">
                  Phương thức nhập dữ liệu:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Merge option */}
                  <div
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">Gộp & Cập nhật (Khuyên dùng)</span>
                      <input
                        type="radio"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="accent-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Cập nhật các loài đã có theo mã ID, bổ sung thêm loài mới và giữ nguyên các loài khác hiện tại.
                    </p>
                  </div>

                  {/* Replace option */}
                  <div
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-950 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-rose-900">Ghi đè toàn bộ (Thay thế)</span>
                      <input
                        type="radio"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="accent-amber-600"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Xóa toàn bộ dữ liệu trên máy hiện tại và thay thế bằng danh sách trong tệp mới tải lên.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample Data Preview */}
              {previewItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 font-bold text-stone-700 text-xs">
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>Xem trước dữ liệu nhận diện được ({previewItems.length} mẫu đầu tiên):</span>
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-white border border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-500 text-[10px] bg-stone-100 px-1.5 py-0.5 rounded">
                            {item.id || `ID-${idx + 1}`}
                          </span>
                          <span className="font-semibold text-stone-900">
                            {item.vietnameseName || item['Tên cây thuốc'] || 'Cây thuốc'}
                          </span>
                          <span className="text-stone-500 italic text-[10px]">
                            ({item.scientificName || item['Tên khoa học'] || 'Đang phân loại'})
                          </span>
                        </div>
                        <span className="text-stone-400 text-[10px] truncate max-w-[120px]">
                          {item.habitat || item['Sinh cảnh'] || 'Tam Anh'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-semibold border border-stone-300 text-xs transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={!selectedFile || isProcessing}
            onClick={handleExecuteImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
              !selectedFile || isProcessing
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Bắt đầu nhập dữ liệu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
