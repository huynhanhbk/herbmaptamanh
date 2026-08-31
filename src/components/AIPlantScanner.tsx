import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  RefreshCw, 
  FileText,
  TreePine,
  Layers,
  Search,
  ScanLine,
  Image as ImageIcon,
  Key,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldCheck
} from 'lucide-react';
import { AICandidate, AIIdentificationResult, MedicinalPlant } from '../types';
import { identifyPlantWithAI, getClientGeminiApiKey, saveClientGeminiApiKey } from '../utils/aiVision';

interface AIPlantScannerProps {
  isOpen: boolean;
  onClose: () => void;
  existingPlants: MedicinalPlant[];
  onOpenPlantDetail: (plant: MedicinalPlant) => void;
  onPrefillNewSurvey: (candidate: AICandidate, imageBase64: string) => void;
}

export const AIPlantScanner: React.FC<AIPlantScannerProps> = ({
  isOpen,
  onClose,
  existingPlants,
  onOpenPlantDetail,
  onPrefillNewSurvey,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userNotes, setUserNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Đang khởi tạo...');
  const [analysisResult, setAnalysisResult] = useState<AIIdentificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gemini API Key config state for Vercel / Client
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [activeApiKey, setActiveApiKey] = useState<string>('');
  const [savedKeySuccess, setSavedKeySuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check stored API key on mount/open
  useEffect(() => {
    if (isOpen) {
      const key = getClientGeminiApiKey();
      setActiveApiKey(key);
      setApiKeyInput(key);
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    saveClientGeminiApiKey(apiKeyInput);
    const key = getClientGeminiApiKey();
    setActiveApiKey(key);
    setSavedKeySuccess(true);
    setTimeout(() => setSavedKeySuccess(false), 2500);
  };

  // Clean reset function for the scanner
  const handleResetScanner = () => {
    setSelectedImage(null);
    setMimeType('image/jpeg');
    setUserNotes('');
    setIsAnalyzing(false);
    setAnalysisStep('Đang khởi tạo...');
    setAnalysisResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // Reset scanner state every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      handleResetScanner();
    }
  }, [isOpen]);

  // Resize and compress image using HTML5 Canvas
  const resizeAndProcessImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImage(compressedDataUrl);
          setMimeType('image/jpeg');
          setAnalysisResult(null);
          setErrorMsg(null);
        } else {
          setSelectedImage(event.target?.result as string);
          setMimeType(file.type || 'image/jpeg');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resizeAndProcessImage(file);
  };

  const handleSelectPresetSample = (plant: MedicinalPlant) => {
    setSelectedImage(plant.coverImage);
    setMimeType('image/jpeg');
    setUserNotes(`Cây thuốc ghi nhận tại ${plant.location.communeSection}, thuộc họ ${plant.family}.`);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleStartIdentification = async () => {
    if (!selectedImage) {
      setErrorMsg('Vui lòng chọn hoặc chụp một bức ảnh cây thuốc.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisStep('Đang trích xuất quang phổ diệp lục & đường nét hình thái...');

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep('Đang nhận diện giải phẫu gân lá, dạng thân và hoa...');
    }, 1000);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep('Đang đối chiếu dữ liệu hình thái với Hệ thực vật Tam Anh & Dược điển VN...');
    }, 2200);

    const stepTimer3 = setTimeout(() => {
      setAnalysisStep('Đang tính toán độ tin cậy phân loại và lập hồ sơ dược tính...');
    }, 3100);

    try {
      const data = await identifyPlantWithAI({
        imageBase64: selectedImage,
        mimeType: mimeType,
        userNotes: userNotes,
        existingPlants: existingPlants,
      });

      if (!data || !data.candidates || data.candidates.length === 0) {
        throw new Error('Không nhận diện được hình ảnh. Vui lòng thử lại với ảnh rõ nét hơn.');
      }

      setAnalysisResult(data);
    } catch (err: any) {
      console.error('AI identification error:', err);
      setErrorMsg(err.message || 'Lỗi kết nối tới mô hình AI. Vui lòng thử lại với ảnh rõ nét hơn.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsAnalyzing(false);
    }
  };

  // Find if a candidate matches any plant in the local Tam Anh database
  const findLocalMatch = (candidate: AICandidate): MedicinalPlant | undefined => {
    return existingPlants.find((plant) => {
      const normPlantName = plant.vietnameseName.toLowerCase();
      const normCandName = candidate.vietnameseName.toLowerCase();
      const normPlantSci = plant.scientificName.toLowerCase();
      const normCandSci = candidate.scientificName.toLowerCase();

      return normPlantName.includes(normCandName) || 
             normCandName.includes(normPlantName) ||
             normPlantSci.includes(normCandSci) ||
             normCandSci.includes(normPlantSci);
    });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    setUserNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-teal-900 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                Nhận Diện Thực Vật Bằng AI
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/60">
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Chụp ảnh lá, hoa, quả hoặc toàn thân cây để nhận diện sơ bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedImage && !isAnalyzing && (
              <button
                onClick={handleResetScanner}
                className="px-2.5 py-1 text-xs text-emerald-100 hover:text-white bg-emerald-800/80 hover:bg-emerald-700/80 rounded-xl transition-colors flex items-center gap-1 border border-emerald-600/50"
                title="Xóa ảnh hiện tại và quét ảnh mới"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Quét ảnh khác</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-emerald-800/80 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 text-stone-800">
          {/* Mandatory Ethical & Scientific Banner */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Quy tắc Khoa học & Đạo đức nhận diện:</p>
              <p className="text-amber-800/90 leading-relaxed mt-0.5">
                Kết quả AI chỉ đóng vai trò <b>gợi ý ban đầu hỗ trợ học tập & khảo sát</b>. Cần đối chiếu với mô tả hình thái thực tế và xác nhận từ thầy cô/chuyên gia trước khi ghi nhận chính thức hoặc ứng dụng.
              </p>
            </div>
          </div>

          {/* Vercel & Client AI Engine Optimization Panel */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-stone-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${activeApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  Mô hình nhận diện AI (Hỗ trợ Vercel & Client di động)
                </span>
                {activeApiKey ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Gemini Flash: Đã kích hoạt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px]">
                    Tự động (Backend / Client Vision)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-stone-500">
                <span className="text-[11px]">{showApiKeyConfig ? 'Ẩn cài đặt' : 'Cấu hình'}</span>
                {showApiKeyConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showApiKeyConfig && (
              <div className="p-3.5 border-t border-stone-200 bg-white space-y-3">
                <div className="text-stone-600 text-[11px] leading-relaxed space-y-1">
                  <p className="font-semibold text-stone-800">
                    💡 Hướng dẫn tối ưu nhận diện chính xác 100% khi chạy trên Vercel:
                  </p>
                  <p>
                    • <b>Cách 1 (Khuyên dùng cho Vercel):</b> Thêm biến môi trường <code className="bg-stone-100 px-1 py-0.5 rounded text-emerald-700 font-mono">GEMINI_API_KEY</code> trong <i>Vercel Project Settings → Environment Variables</i>.
                  </p>
                  <p>
                    • <b>Cách 2 (Trực tiếp trên Client/Điện thoại):</b> Dán trực tiếp khóa Google Gemini API Key miễn phí (lấy tại <i>aistudio.google.com</i>) vào ô bên dưới. Khóa sẽ được lưu an toàn trên trình duyệt của bạn.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Dán Gemini API Key (AIzaSy...)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 transition-colors shrink-0"
                  >
                    {savedKeySuccess ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{savedKeySuccess ? 'Đã lưu!' : 'Lưu khóa'}</span>
                  </button>
                  {activeApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKeyInput('');
                        saveClientGeminiApiKey('');
                        setActiveApiKey('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs transition-colors shrink-0"
                      title="Xóa khóa đã lưu"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Upload / Capture Section if no image */}
          {!selectedImage ? (
            <div className="space-y-5">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-800 group-hover:text-emerald-900">
                    Bấm để tải ảnh cây thuốc lên
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Hỗ trợ định dạng JPG, PNG (tự động tối ưu dung lượng ảnh)
                  </p>
                </div>
              </div>

              {/* Action buttons for Camera vs File */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ảnh trực tiếp</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-200 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn từ thư viện ảnh</span>
                </button>
              </div>

              {/* Quick sample test images */}
              {existingPlants.length > 0 && (
                <div className="pt-3 border-t border-stone-200">
                  <p className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hoặc thử nhanh với mẫu ảnh cây thuốc thực địa Tam Anh:</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingPlants.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPresetSample(p)}
                        className="group flex flex-col items-center text-left p-2 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 transition-all"
                      >
                        <img
                          src={p.coverImage}
                          alt={p.vietnameseName}
                          className="w-full h-16 object-cover rounded-lg mb-1.5 group-hover:scale-105 transition-transform"
                        />
                        <span className="text-[11px] font-bold text-stone-800 group-hover:text-emerald-700 line-clamp-1">
                          {p.vietnameseName}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono">
                          {p.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Image Preview & Analysis controls */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-5 relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 aspect-4/3 sm:aspect-square">
                  <img
                    src={selectedImage}
                    alt="Cây thuốc cần nhận diện"
                    className="w-full h-full object-cover"
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-3 text-center animate-pulse">
                      <ScanLine className="w-10 h-10 text-emerald-400 animate-bounce mb-2" />
                      <span className="text-xs font-bold">{analysisStep}</span>
                    </div>
                  )}
                  {!isAnalyzing && (
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                      title="Đổi ảnh khác"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Ghi chú thêm về vị trí / đặc điểm thực địa (tùy chọn):
                    </label>
                    <textarea
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      placeholder="Ví dụ: Cây mọc bờ rào ven suối thôn Đức Bố, thân leo có gai quặp, hoa màu tím nhạt..."
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-20 bg-stone-50"
                      disabled={isAnalyzing}
                    />
                  </div>

                  {!analysisResult && (
                    <button
                      onClick={handleStartIdentification}
                      disabled={isAnalyzing}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{analysisStep}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Bắt đầu Phân tích AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Error Notification */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* AI Analysis Result Display */}
              {analysisResult && (
                <div className="space-y-4 pt-2 border-t border-stone-200">
                  <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Kết quả nhận định hình thái học từ AI:</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed">{analysisResult.summary}</p>
                  </div>

                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500">
                    Gợi ý phân loại tiềm năng ({analysisResult.candidates.length} kết quả):
                  </h4>

                  <div className="space-y-3">
                    {analysisResult.candidates.map((cand, idx) => {
                      const localMatch = findLocalMatch(cand);
                      const confidencePercent = Math.min(100, Math.max(0, Math.round(cand.confidence)));

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            idx === 0
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                              : 'bg-white border-stone-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  idx === 0 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                                }`}>
                                  {idx + 1}
                                </span>
                                <h5 className="font-bold text-sm text-stone-900">{cand.vietnameseName}</h5>
                              </div>
                              <p className="text-xs text-stone-500 italic ml-7 font-serif">
                                {cand.scientificName} — <span className="not-italic">{cand.family}</span>
                              </p>
                            </div>

                            {/* Confidence badge */}
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                confidencePercent >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : confidencePercent >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {confidencePercent}% Độ tin cậy
                              </span>
                            </div>
                          </div>

                          {/* Observed features & Botanical distinctions */}
                          <div className="text-xs text-stone-600 space-y-1.5 ml-7 mb-3">
                            <p className="leading-relaxed">
                              🌿 <b className="text-stone-800">Hình thái quan sát:</b> {cand.observedFeatures.join(', ')}
                            </p>
                            {cand.distinctionTips && (
                              <p className="text-indigo-900 bg-indigo-50/80 p-2 rounded-xl border border-indigo-200/70 leading-relaxed">
                                🔍 <b>Dấu hiệu phân biệt then chốt:</b> {cand.distinctionTips}
                              </p>
                            )}
                            {cand.habitatInCentralVietnam && (
                              <p className="text-stone-700">
                                📍 <b className="text-stone-800">Phân bố & Sinh cảnh:</b> {cand.habitatInCentralVietnam}
                              </p>
                            )}
                            {cand.folkUseSummary && (
                              <p className="text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200/70 leading-relaxed">
                                🍵 <b>Kinh nghiệm & Công dụng dược liệu:</b> {cand.folkUseSummary}
                              </p>
                            )}
                          </div>

                          {/* Actions: View in local DB or prefill into field survey */}
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-200/60 ml-7">
                            {localMatch ? (
                              <button
                                onClick={() => {
                                  onOpenPlantDetail(localMatch);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã có trong CSDL Tam Anh ({localMatch.id})</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onPrefillNewSurvey(cand, selectedImage);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Tạo điểm khảo sát thực địa từ loài này</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Nhận diện ảnh khác</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Hỗ trợ nhận diện AI đa phương thức & CSDL thực địa
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
