import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  MedicinalPlant, 
  ConservationLevel 
} from '../types';
import { 
  X, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  QrCode, 
  Download, 
  Printer, 
  Share2, 
  Compass, 
  ExternalLink, 
  Sparkles, 
  HeartHandshake, 
  UserCheck, 
  Check, 
  Copy,
  TreePine,
  Layers,
  ChevronRight
} from 'lucide-react';

interface SpeciesDetailModalProps {
  plant: MedicinalPlant | null;
  onClose: () => void;
  onOpenMapLocation?: (plant: MedicinalPlant) => void;
}

export const SpeciesDetailModal: React.FC<SpeciesDetailModalProps> = ({
  plant,
  onClose,
  onOpenMapLocation,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // Reset states when plant changes
  useEffect(() => {
    setActivePhotoIndex(0);
    setShowQRCard(false);
  }, [plant?.id]);

  if (!plant) return null;

  // Generate permanent URL for this plant
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const plantPermanentUrl = `${currentUrl}?speciesId=${plant.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(plantPermanentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQRPNG = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `HerbMap_TamAnh_QR_${plant.id}_${plant.vietnameseName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handlePrintFieldCard = () => {
    window.print();
  };

  const allPhotos = plant.photos && plant.photos.length > 0 
    ? plant.photos 
    : [{ id: 'default', url: plant.coverImage, caption: 'Toàn cây ' + plant.vietnameseName, type: 'whole' as const }];

  const currentPhoto = allPhotos[activePhotoIndex] || allPhotos[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Hidden printable field signage card for print mode */}
      <div className="printable-qr-sign hidden print:block bg-white p-8 max-w-md mx-auto border-4 border-emerald-900 rounded-3xl text-stone-900 text-center font-sans">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold tracking-tight text-emerald-900 uppercase">HerbMap Tam Anh</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-4 border-b-2 border-emerald-100 pb-2">
          Điểm Khảo Sát & Bảo Tồn Cây Thuốc Thực Địa
        </p>

        <h2 className="text-3xl font-extrabold text-stone-900 mb-1">{plant.vietnameseName}</h2>
        <p className="text-base italic text-stone-600 mb-4 font-serif">{plant.scientificName}</p>

        <div className="my-6 p-4 bg-stone-50 border-2 border-dashed border-emerald-300 rounded-2xl inline-block shadow-sm">
          <QRCodeSVG 
            value={plantPermanentUrl} 
            size={220} 
            level="H" 
            includeMargin={true}
          />
          <p className="text-[11px] font-mono font-bold text-stone-500 mt-2">MÃ: {plant.id}</p>
        </div>

        <div className="text-left bg-stone-100/80 p-3 rounded-xl mb-4 text-xs space-y-1">
          <p>📍 <b>Vị trí:</b> {plant.location.addressDescription}</p>
          <p>🧭 <b>Tọa độ:</b> {plant.location.lat.toFixed(5)}, {plant.location.lng.toFixed(5)}</p>
          <p>🛡️ <b>Tình trạng:</b> {plant.conservationStatus}</p>
        </div>

        <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-[10px] text-amber-900 font-medium">
          ⚠️ <b>Khuyến cáo:</b> Tư liệu phục vụ giáo dục, bảo tồn và tham khảo văn hóa dân gian. Không sử dụng thay thế chỉ định y khoa.
        </div>

        <p className="text-[10px] text-stone-400 mt-4">
          Dự án KHKT cấp xã 2026 — UBND Xã Tam Anh & Trường THCS Tam Anh
        </p>
      </div>

      {/* Main Interactive Modal Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh] no-print">
        {/* Header bar with plant title & close button */}
        <div className="sticky top-0 z-20 bg-stone-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-700/80 text-emerald-100 font-mono text-xs font-bold">
              {plant.id}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">{plant.vietnameseName}</h2>
              <p className="text-xs text-stone-400 italic font-serif">{plant.scientificName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowQRCard(!showQRCard)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showQRCard ? 'bg-emerald-600 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
              }`}
              title="Xem / Tải mã QR thực địa"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Mã QR</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors"
              title="Sao chép liên kết"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 text-stone-800">
          {/* QR Card Drawer if opened */}
          {showQRCard && (
            <div className="bg-gradient-to-br from-emerald-950 to-stone-900 p-5 rounded-2xl text-white border border-emerald-800/60 shadow-xl space-y-4 animate-slideDown">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50">
                    Mã QR Thực Địa
                  </span>
                  <h3 className="text-base font-bold text-stone-100">Gắn biển khảo sát tại xã Tam Anh</h3>
                  <p className="text-xs text-stone-300 max-w-md">
                    In mã QR này để gắn biển tên tại cây thuốc ngoài thực địa. Người dân và học sinh có thể dùng điện thoại quét để mở ngay hồ sơ này.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-300/80 break-all">{plantPermanentUrl}</p>
                </div>

                {/* QR Code Canvas */}
                <div ref={qrCanvasRef} className="p-3 bg-white rounded-xl shadow-lg shrink-0">
                  <QRCodeCanvas
                    value={plantPermanentUrl}
                    size={130}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-emerald-800/40">
                <button
                  onClick={handleDownloadQRPNG}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stone-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải ảnh QR (PNG)</span>
                </button>

                <button
                  onClick={handlePrintFieldCard}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In thẻ biển báo thực địa (Print)</span>
                </button>
              </div>
            </div>
          )}

          {/* Photo Gallery & Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Photo View (5 cols) */}
            <div className="md:col-span-5 space-y-2.5">
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group">
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-600/90 text-white mr-1.5">
                    {currentPhoto.type === 'leaf' ? 'Lá cây' : currentPhoto.type === 'flower' ? 'Hoa' : currentPhoto.type === 'fruit' ? 'Quả' : currentPhoto.type === 'root' ? 'Rễ củ' : 'Toàn cây'}
                  </span>
                  <span className="text-xs font-medium line-clamp-1">{currentPhoto.caption}</span>
                </div>
              </div>

              {/* Thumbnails if multiple photos */}
              {allPhotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activePhotoIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Metadata Box */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Họ thực vật:</span>
                  <span className="font-semibold text-stone-900">{plant.family}</span>
                </div>
                {plant.otherNames && plant.otherNames.length > 0 && (
                  <div className="flex items-start justify-between">
                    <span className="text-stone-500">Tên gọi khác:</span>
                    <span className="font-medium text-stone-800 text-right">{plant.otherNames.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Tình trạng bảo tồn:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    plant.conservationLevel === 'endangered' 
                      ? 'bg-rose-100 text-rose-800' 
                      : plant.conservationLevel === 'vulnerable' || plant.conservationLevel === 'rare'
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {plant.conservationStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Kiểm duyệt:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {plant.status === 'verified' ? 'Đã xác nhận thực địa' : 'Chờ thẩm định'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Main Botanical Info (7 cols) */}
            <div className="md:col-span-7 space-y-5">
              {/* Short description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Mô tả tổng quan</h4>
                <p className="text-sm text-stone-700 leading-relaxed font-normal">{plant.shortDescription}</p>
              </div>

              {/* Identification Botanical Traits */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <TreePine className="w-4 h-4 text-emerald-600" /> Đặc điểm hình thái nhận biết
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-0.5">Dạng sống & Thân cành:</span>
                    <span className="text-stone-600 leading-relaxed">{plant.identificationTraits.growthForm}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-0.5">Đặc điểm Lá:</span>
                    <span className="text-stone-600 leading-relaxed">{plant.identificationTraits.leaves}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="font-semibold text-stone-900 block mb-0.5">Hoa & Quả:</span>
                    <span className="text-stone-600 leading-relaxed">
                      {plant.identificationTraits.flowers} {plant.identificationTraits.fruits && `— ${plant.identificationTraits.fruits}`}
                    </span>
                  </div>
                  {plant.identificationTraits.roots && (
                    <div className="bg-white p-2.5 rounded-xl border border-stone-100 shadow-2xs">
                      <span className="font-semibold text-stone-900 block mb-0.5">Rễ / Củ:</span>
                      <span className="text-stone-600 leading-relaxed">{plant.identificationTraits.roots}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Habitat & Location info */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Sinh cảnh & Tọa độ thực địa
                  </h4>
                  {onOpenMapLocation && (
                    <button
                      onClick={() => {
                        onOpenMapLocation(plant);
                        onClose();
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline underline-offset-2"
                    >
                      <Compass className="w-3.5 h-3.5" /> Xem trên Bản đồ số
                    </button>
                  )}
                </div>

                <div className="text-xs text-stone-700 space-y-1">
                  <p>🌿 <b>Sinh cảnh:</b> {plant.habitat}</p>
                  <p>📍 <b>Địa điểm:</b> {plant.location.addressDescription} ({plant.location.communeSection})</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] text-stone-600">
                      GPS: {plant.location.lat.toFixed(5)}, {plant.location.lng.toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${plant.location.lat},${plant.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Chỉ đường Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Traditional Folk Uses Section (Mandatory Ethical Notice) */}
          <div className="bg-amber-50/70 p-5 rounded-3xl border-2 border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-200/80 text-amber-900">
                  <HeartHandshake className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-amber-950 uppercase tracking-tight">
                    Tri thức Dân gian Bản địa & Kinh nghiệm Cổ truyền
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Ghi nhận qua phỏng vấn người am hiểu cây thuốc tại xã Tam Anh
                  </p>
                </div>
              </div>

              {/* ETHICAL DISCLAIMER BADGE */}
              <div className="bg-amber-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Tư liệu tham khảo dân gian — Không phải khuyến nghị y tế</span>
              </div>
            </div>

            {/* Folk remedies list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/60 shadow-2xs space-y-1.5">
                <h5 className="font-bold text-stone-900 text-xs">Kinh nghiệm sử dụng lưu truyền:</h5>
                <ul className="space-y-1 list-disc list-inside text-stone-700 leading-relaxed">
                  {plant.traditionalUses.folkRemedies.map((remedy, idx) => (
                    <li key={idx}>{remedy}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/90 p-3 rounded-2xl border border-amber-200/60 shadow-2xs space-y-1.5">
                <h5 className="font-bold text-stone-900 text-xs">Bộ phận dùng & Chế biến:</h5>
                <p className="text-stone-700">
                  🌿 <b>Bộ phận dùng:</b> {plant.traditionalUses.partUsed.join(', ')}
                </p>
                <p className="text-stone-700">
                  🍵 <b>Cách chế biến:</b> {plant.traditionalUses.preparation}
                </p>
              </div>
            </div>

            {/* Informant Provenance attribution */}
            <div className="flex items-center justify-between text-xs bg-amber-100/60 p-2.5 rounded-xl text-amber-950 border border-amber-200/80">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>
                  <b>Người cung cấp tư liệu:</b> {plant.traditionalUses.informantName} ({plant.traditionalUses.informantRole})
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 shrink-0">
                ✓ Đã xin phép chia sẻ
              </span>
            </div>
          </div>

          {/* Data Provenance & Verification */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-1.5">
            <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">
              Nguồn dữ liệu & Hồ sơ khoa học
            </h4>
            <p>
              🔬 <b>Đề tài:</b> {plant.dataSource.title}
            </p>
            <p>
              👤 <b>Người khảo sát / Thu thập:</b> {plant.dataSource.surveyor} (Ngày {plant.dataSource.surveyDate})
            </p>
            {plant.dataSource.verifiedBy && (
              <p>
                ✅ <b>Chuyên môn thẩm định:</b> {plant.dataSource.verifiedBy}
              </p>
            )}
            {plant.dataSource.notes && (
              <p className="italic text-stone-500">
                📝 <b>Ghi chú:</b> {plant.dataSource.notes}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-stone-100 px-4 sm:px-6 py-3 border-t border-stone-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-500 font-medium">
            HerbMap Tam Anh — Khoa học Kỹ thuật 2026
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQRCard(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xem Thẻ Mã QR</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
