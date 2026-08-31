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
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-xs text-amber-300">
              <Award className="w-6 h-6" />
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
          {/* Section 1: Context & Objectives */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" /> 1. Bối cảnh & Mục tiêu đề tài tại xã Tam Anh
            </h3>
            <p className="text-stone-700">
              Xã Tam Anh (gồm Tam Anh Bắc và Tam Anh Nam, huyện Núi Thành, tỉnh Quảng Nam) sở hữu địa hình đa dạng từ vùng đồng bằng ven sông Trầu, cồn bãi cát đến vùng gò đồi, rừng thứ sinh Khe Tre và chân núi Chúa. Nơi đây có kho tàng cây thuốc bản địa phong phú được các thế hệ người dân đúc kết trong việc chăm sóc sức khỏe.
            </p>
            <p className="text-stone-700">
              Tuy nhiên, nguồn tư liệu này hiện đang phân tán, chưa được số hóa, đối mặt với nguy cơ mai một tri thức dân gian khi thế hệ lớn tuổi qua đi và sự suy giảm các loài cây thuốc quý do đô thị hóa và khai thác quá mức. <b>HerbMap Tam Anh</b> ra đời như một giải pháp số hóa không gian mở phục vụ tra cứu, giáo dục trải nghiệm STEM và bảo tồn thực địa.
            </p>
          </div>

          {/* Section 2: Core Methodology */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-700" /> 2. Phương pháp luận & Nguồn dữ liệu thực tế
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 text-xs block">Khảo sát thực địa GPS:</span>
                <p className="text-stone-600 text-[11px]">
                  Điều tra tọa độ vị trí thực tế của từng cây thuốc, chụp tiêu bản ảnh 4 góc (thân cây, lá, hoa, quả, củ) và ghi nhận môi trường sinh thái phân bố.
                </p>
              </div>
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 text-xs block">Phỏng vấn nhân chứng & Lương y:</span>
                <p className="text-stone-600 text-[11px]">
                  Ghi âm và lập phiếu thu thập kinh nghiệm chế biến, bộ phận sử dụng dân gian từ các cụ cao niên và lương y tại Tam Anh có sự đồng thuận chia sẻ.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Human & AI Collaboration */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" /> 3. Vai trò của AI & Con người trong hệ thống
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-emerald-900">
              <li>
                <b>AI (Google Gemini Vision):</b> Đóng vai trò trợ lý nhận diện hình thái sơ bộ dựa trên ảnh chụp thực tế ngoài thực địa, đưa ra top 3 ứng viên và chỉ số tin cậy.
              </li>
              <li>
                <b>Con người (Giáo viên / Thầy thuốc / Học sinh):</b> Là người kiểm chứng khoa học cuối cùng. Mọi dữ liệu công khai trên bản đồ số đều phải qua khâu thẩm định thực tế.
              </li>
            </ul>
          </div>

          {/* Section 4: Ethical & Scientific Principles */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2 text-amber-950">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" /> 4. Quy chuẩn đạo đức & Giới hạn y khoa
            </h3>
            <p className="leading-relaxed">
              Mọi công dụng dân gian hiển thị trong ứng dụng là <b>tư liệu tham khảo văn hóa & dược liệu</b>, hoàn toàn không phải khuyến nghị y tế tự chữa bệnh. Ứng dụng luôn ghi rõ nguồn gốc khảo sát, họ tên người chia sẻ tri thức và khuyến cáo người dân tham vấn cơ sở y tế khi có bệnh lý.
            </p>
          </div>

          {/* Section 5: References & Sources */}
          <div className="space-y-1.5 text-stone-600">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800">
              5. Tài liệu tham khảo chính:
            </h3>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              <li>Báo cáo điều tra thực địa cây thuốc dân gian xã Tam Anh (Đề tài KHKT 2026).</li>
            </ul>
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
