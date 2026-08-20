import React, { useState, useRef } from 'react';
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
  Search
} from 'lucide-react';
import { AICandidate, AIIdentificationResult, MedicinalPlant } from '../types';

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
  const [analysisResult, setAnalysisResult] = useState<AIIdentificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysisResult(null);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartIdentification = async () => {
    if (!selectedImage) {
      setErrorMsg('Vui lòng chọn hoặc chụp một bức ảnh cây thuốc.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/identify-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: mimeType,
          userNotes: userNotes,
        }),
      });

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không nhận diện được hình ảnh. Vui lòng thử lại.');
      }

      setAnalysisResult(json.data);
    } catch (err: any) {
      console.error('AI identification error:', err);
      setErrorMsg(err.message || 'Lỗi kết nối tới mô hình AI. Vui lòng thử lại với ảnh rõ nét hơn.');
    } finally {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                Nhận Diện Thực Vật Bằng AI
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/60">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                Chụp ảnh lá, hoa, quả hoặc toàn thân cây để nhận diện sơ bộ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-emerald-800/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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

          {/* Upload / Capture Section if no image */}
          {!selectedImage ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50/80 hover:bg-emerald-50/30 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-800 group-hover:text-emerald-900">
                    Bấm để tải ảnh cây thuốc lên
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Hỗ trợ định dạng JPG, PNG (khuyên dùng ảnh rõ nét hoa, lá, quả)
                  </p>
                </div>
              </div>

              {/* Action buttons for Camera vs File */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.02]"
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
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                    title="Đổi ảnh khác"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                          <span>Đang đối chiếu dữ liệu thực vật học...</span>
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
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
                    <span className="font-bold text-stone-900 block mb-0.5">🔍 Nhận định hình thái từ AI:</span>
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

                          {/* Observed features */}
                          <div className="text-xs text-stone-600 space-y-1 ml-7 mb-3">
                            <p>
                              🌿 <b>Đặc điểm nhận dạng:</b> {cand.observedFeatures.join(', ')}
                            </p>
                            {cand.habitatInCentralVietnam && (
                              <p>
                                📍 <b>Phân bố miền Trung / Tam Anh:</b> {cand.habitatInCentralVietnam}
                              </p>
                            )}
                            {cand.folkUseSummary && (
                              <p className="text-amber-800 bg-amber-50/60 p-1.5 rounded-lg border border-amber-200/50">
                                🍵 <b>Kinh nghiệm dân gian:</b> {cand.folkUseSummary}
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
            Hỗ trợ nhận diện AI đa phương thức
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
