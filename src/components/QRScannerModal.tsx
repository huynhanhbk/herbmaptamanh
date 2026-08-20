import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  X, 
  Camera, 
  Upload, 
  QrCode, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { MedicinalPlant } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plants: MedicinalPlant[];
  onSelectPlantById: (id: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  plants,
  onSelectPlantById,
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera QR Scanning
  const startCamera = async () => {
    setCameraError(null);
    setScanStatusMessage(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
        scanVideoLoop();
      }
    } catch (err: any) {
      console.warn('Camera access note:', err);
      setCameraError('Không thể mở camera (có thể do quyền truy cập trong trình duyệt hoặc iframe). Vui lòng thử tải ảnh chứa mã QR hoặc nhập mã tra cứu.');
      setIsScanning(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanMode, isOpen]);

  if (!isOpen) return null;

  // Scan frame from video feed
  const scanVideoLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleQRCodeFound(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoLoop);
  };

  // Process decoded QR text
  const handleQRCodeFound = (data: string) => {
    stopCamera();
    
    // Check if data contains speciesId=TA-HERB-XXX or is raw TA-HERB-XXX
    let matchedId: string | null = null;

    if (data.includes('speciesId=')) {
      const urlParams = new URLSearchParams(data.split('?')[1]);
      matchedId = urlParams.get('speciesId');
    } else if (data.startsWith('TA-HERB-') || data.startsWith('HERB-')) {
      matchedId = data.trim();
    } else {
      // Look for any plant ID in the text
      const found = plants.find((p) => data.includes(p.id));
      if (found) {
        matchedId = found.id;
      }
    }

    if (matchedId) {
      onSelectPlantById(matchedId);
      onClose();
    } else {
      setScanStatusMessage(`Mã QR đã quét: "${data}". Không khớp với mã loài trong HerbMap.`);
      startCamera();
    }
  };

  // Handle uploaded image file scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatusMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleQRCodeFound(code.data);
          } else {
            setScanStatusMessage('Không tìm thấy mã QR trong ảnh vừa chọn. Vui lòng chọn ảnh chụp rõ nét hơn.');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setScanStatusMessage(null);
    const target = manualCode.trim().toUpperCase();
    const found = plants.find((p) => p.id.toUpperCase() === target || p.id.toUpperCase().includes(target));
    if (found) {
      onSelectPlantById(found.id);
      onClose();
    } else {
      setScanStatusMessage(`Không tìm thấy cây thuốc có mã "${target}".`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-md bg-stone-900 text-white rounded-3xl shadow-2xl overflow-hidden border border-stone-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Quét Mã QR Thực Địa</h3>
              <p className="text-[11px] text-stone-400">Xem thông tin cây thuốc tại điểm khảo sát</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector: Camera vs Image Upload */}
        <div className="grid grid-cols-2 p-2 bg-stone-950 gap-1 border-b border-stone-800">
          <button
            onClick={() => setScanMode('camera')}
            className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              scanMode === 'camera' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Quét Trực Tiếp</span>
          </button>

          <button
            onClick={() => setScanMode('upload')}
            className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              scanMode === 'upload' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Ảnh Mã QR</span>
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 flex flex-col items-center justify-center">
          {scanMode === 'camera' ? (
            <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning visual overlay reticle */}
              <div className="absolute inset-4 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400 animate-bounce"></div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-stone-900/95 p-4 flex flex-col items-center justify-center text-center text-xs text-rose-300">
                  <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="mb-3">{cameraError}</p>
                  <button
                    onClick={() => setScanMode('upload')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold"
                  >
                    Chuyển sang tải ảnh mã QR
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Photo of QR View */
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square max-w-[280px] rounded-2xl border-2 border-dashed border-stone-700 hover:border-emerald-500 bg-stone-950/60 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
            >
              <Upload className="w-10 h-10 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-stone-200">Chọn ảnh có chứa mã QR</p>
              <p className="text-[11px] text-stone-500 mt-1">Từ thư viện ảnh trên điện thoại / máy tính</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Status / Error Message */}
          {scanStatusMessage && (
            <div className="w-full mt-3 p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs text-center">
              {scanStatusMessage}
            </div>
          )}

          {/* Quick Manual Code Input */}
          <form onSubmit={handleManualSearch} className="w-full mt-4 pt-3 border-t border-stone-800 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Hoặc nhập mã (VD: TA-HERB-001)"
              className="flex-1 text-xs bg-stone-800 text-white px-3 py-2 rounded-xl border border-stone-700 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="bg-stone-950 px-4 py-2.5 text-[11px] text-stone-500 text-center border-t border-stone-800">
          Hướng camera vào mã QR gắn trên biển tên cây thuốc tại thực địa xã Tam Anh
        </div>
      </div>
    </div>
  );
};
