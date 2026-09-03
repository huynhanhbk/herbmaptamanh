import React from 'react';
import { 
  X, 
  BookOpen, 
  Award, 
  MapPin, 
  Sparkles, 
  ShieldAlert, 
  HeartHandshake, 
  CheckCircle2, 
  FileText,
  TreePine,
  Layers,
  GraduationCap
} from 'lucide-react';
import { HerbMapLogo } from './HerbMapLogo';

interface AboutProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutProjectModal: React.FC<AboutProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[92vh] text-stone-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-stone-900 text-white px-6 py-5 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center shadow-md ring-2 ring-emerald-400/40 shrink-0">
              <HerbMapLogo size="100%" variant="icon" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Về Đề Tài HerbMap Tam Anh</h2>
              <p className="text-xs text-emerald-200/80">
                Ý tưởng Khoa học Kỹ thuật — Chuyển đổi số & Bảo tồn dược liệu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 text-xs leading-relaxed">
          {/* Logo & Visual Identity Banner */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-stone-50 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 bg-white rounded-2xl p-2 shadow-xs border border-emerald-100 flex items-center justify-center">
              <HerbMapLogo size="100%" variant="full" />
            </div>
            <div className="space-y-1.5 text-stone-700">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">Biểu Trưng Chính Thức (Logo HerbMap Tam Anh)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">KHKT 2026</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Biểu trưng hội tụ 4 yếu tố cốt lõi: <b>Ghim định vị GPS</b> (công nghệ số không gian), <b>Mầm lá xanh</b> (hệ cây thuốc bản địa), <b>Trang sách bản đồ & dòng sông</b> (kho tàng tri thức dân gian và sinh thái lưu vực sông Tam Anh), cùng <b>Vòng cung bảo tồn</b> thể hiện sự gìn giữ bền vững.
              </p>
            </div>
          </div>

          {/* Section 1: Context & Objectives */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" /> Bối cảnh & Mục tiêu đề tài tại xã Tam Anh
            </h3>
            <p className="text-stone-700">
              Xã Tam Anh, thành phố Đà Nẵng sở hữu địa hình đa dạng từ vùng đồng bằng ven sông, cồn bãi cát đến vùng gò đồi, rừng thứ sinh đến đồng ruộng. Nơi đây có kho tàng cây thuốc bản địa phong phú được các thế hệ người dân đúc kết trong việc chăm sóc sức khỏe.
            </p>
            <p className="text-stone-700">
              Tuy nhiên, nguồn tư liệu này hiện đang phân tán, chưa được số hóa, đối mặt với nguy cơ mai một tri thức dân gian khi thế hệ lớn tuổi qua đi và sự suy giảm các loài cây thuốc quý do đô thị hóa và khai thác quá mức. <b>HerbMap Tam Anh</b> ra đời như một giải pháp số hóa không gian mở phục vụ tra cứu, giáo dục trải nghiệm STEM và bảo tồn thực địa.
            </p>
          </div>


          {/* Section 4: Ethical & Scientific Principles */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2 text-amber-950">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" /> Quy chuẩn đạo đức & Giới hạn y khoa
            </h3>
            <p className="leading-relaxed">
              Mọi công dụng dân gian hiển thị trong ứng dụng là <b>tư liệu tham khảo văn hóa & dược liệu</b>, hoàn toàn không phải khuyến nghị y tế tự chữa bệnh. Ứng dụng luôn ghi rõ nguồn gốc khảo sát, họ tên người chia sẻ tri thức và khuyến cáo người dân tham vấn cơ sở y tế khi có bệnh lý.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-medium">
            HerbMap Tam Anh — Thực hiện bởi cô Lê Thị Như - Trường THCS Nguyễn Khuyến
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
