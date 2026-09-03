import React from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  COMMUNE_VILLAGES,
  getConservationStatusLabel
} from '../types';
import { 
  ShieldAlert, 
  TreePine, 
  MapPin, 
  HeartHandshake, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Leaf, 
  Sparkles,
  Layers
} from 'lucide-react';

interface DashboardViewProps {
  plants: MedicinalPlant[];
  onSelectPlant: (plant: MedicinalPlant) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  plants,
  onSelectPlant,
}) => {
  // Metric calculations
  const totalPlants = plants.length;
  const verifiedCount = plants.filter((p) => p.status === 'verified').length;
  const endangeredCount = plants.filter((p) => p.conservationLevel === 'endangered' || p.conservationLevel === 'rare').length;
  const vulnerableCount = plants.filter((p) => p.conservationLevel === 'vulnerable').length;
  const folkRemediesCount = plants.filter((p) => p.traditionalUses.folkRemedies.length > 0).length;

  // Habitat Distribution Data (06 standardized habitats)
  const habitatColors: Record<HabitatCategory, string> = {
    'natural_forest': '#047857',
    'planted_forest': '#10b981',
    'shrub_grassland': '#d97706',
    'sea': '#0284c7',
    'garden': '#059669',
    'farmland': '#ca8a04',
  };

  const habitatMap: Record<HabitatCategory, { name: string; count: number; color: string }> = {
    'natural_forest': { name: 'Rừng tự nhiên', count: 0, color: habitatColors['natural_forest'] },
    'planted_forest': { name: 'Rừng trồng', count: 0, color: habitatColors['planted_forest'] },
    'shrub_grassland': { name: 'Trảng cây bụi, cỏ', count: 0, color: habitatColors['shrub_grassland'] },
    'sea': { name: 'Biển', count: 0, color: habitatColors['sea'] },
    'garden': { name: 'Vườn nhà', count: 0, color: habitatColors['garden'] },
    'farmland': { name: 'Đồng ruộng', count: 0, color: habitatColors['farmland'] },
  };

  plants.forEach((p) => {
    if (p.habitatCategory && habitatMap[p.habitatCategory]) {
      habitatMap[p.habitatCategory].count += 1;
    }
  });

  const habitatChartData = Object.values(habitatMap);

  // Conservation Level Data
  const conservationData = [
    { name: 'An toàn', count: plants.filter((p) => p.conservationLevel === 'safe').length, color: '#10b981' },
    { name: 'Sắp nguy cấp', count: vulnerableCount, color: '#f59e0b' },
    { name: 'Nguy cấp / Cần bảo tồn', count: endangeredCount, color: '#e11d48' },
  ];

  // Survey frequency by timeline (Months in 2026)
  const timelineData = [
    { month: 'T10/25', count: 4, label: 'Kế thừa' },
    { month: 'T11/25', count: 7, label: 'Tài liệu' },
    { month: 'T12/25', count: 10, label: 'Khảo sát sơ bộ' },
    { month: 'T01/26', count: 18, label: 'Thực địa đợt 1' },
    { month: 'T02/26', count: totalPlants + 6, label: 'Số hóa & QR' },
  ];

  // Village Distribution Data (15 villages)
  const villageData = COMMUNE_VILLAGES.map((village) => {
    const rawVillageName = village.replace('Thôn ', '');
    const count = plants.filter((p) => {
      const sec = p.location?.communeSection;
      const addr = p.location?.addressDescription || '';
      return sec === village || (addr && addr.includes(rawVillageName));
    }).length;
    return {
      name: rawVillageName,
      fullName: village,
      count: count
    };
  });

  // Declining Species Alert
  const decliningPlants = plants.filter((p) => p.trendStatus === 'declining' || p.conservationLevel === 'endangered' || p.conservationLevel === 'rare');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600/50">
                Phân tích & Thống kê sinh thái
              </span>
              <span className="text-xs text-stone-400">Tam Anh 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Báo Cáo Không Gian Cây Thuốc & Cảnh Báo Bảo Tồn
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
              Tổng hợp dữ liệu điều tra thực địa, phân bố sinh cảnh, mật độ tần suất và đánh giá nguy cơ suy giảm nguồn dược liệu bản địa tại xã Tam Anh.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Tổng loài ghi nhận</span>
            <span className="text-xl sm:text-2xl font-bold text-stone-900">{totalPlants}</span>
            <span className="text-[11px] text-emerald-600 font-medium block">
              {verifiedCount} loài đã xác nhận
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Cần bảo tồn / Nguy cấp</span>
            <span className="text-xl sm:text-2xl font-bold text-rose-700">{endangeredCount + vulnerableCount}</span>
            <span className="text-[11px] text-rose-600 font-medium block">
              {endangeredCount} loài nguy cấp cao
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Tri thức dân gian</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-800">{folkRemediesCount}</span>
            <span className="text-[11px] text-amber-700 font-medium block">
              Có người dân chia sẻ
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Điểm khảo sát GPS</span>
            <span className="text-xl sm:text-2xl font-bold text-teal-800">{totalPlants}</span>
            <span className="text-[11px] text-teal-600 font-medium block">
              Tại Tam Anh
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Habitat Distribution Pie Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Phân Bố Sinh Cảnh Cây Thuốc</h3>
              <p className="text-xs text-stone-500">Môi trường sống thực tế tại các vùng đất xã Tam Anh</p>
            </div>
            <TreePine className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={habitatChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="name"
                >
                  {habitatChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} loài`, name]}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conservation Status Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Cấp Độ Bảo Tồn & Nguy Cơ</h3>
              <p className="text-xs text-stone-500">Phân loại theo mức độ phong phú và nguy cơ cạn kiệt</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conservationData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} loài`, 'Số lượng']}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {conservationData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Village Distribution Chart (15 Villages) */}
        <div className="lg:col-span-12 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Phân Bố Cây Thuốc Theo 15 Thôn Xã Tam Anh</h3>
              <p className="text-xs text-stone-500">Mật độ ghi nhận tiêu bản cây thuốc thực địa trên từng địa bàn thôn</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800">
              15 Thôn Toàn Xã
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={villageData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  interval={0} 
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: any, item: any) => [`${value} loài cây thuốc`, item.payload.fullName]}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="Số loài cây thuốc" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Area Chart (12 cols) */}
        <div className="lg:col-span-12 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Tần Suất Ghi Nhận & Khảo Sát Không Gian</h3>
              <p className="text-xs text-stone-500">Tiến độ phát hiện, số hóa và gắn mã QR thực địa theo các giai đoạn dự án</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Đợt 1 / 2026 Hoàn tất
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Số điểm dữ liệu" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Early Warning Panel for Declining Species */}
      <div className="bg-rose-50/70 p-5 sm:p-6 rounded-3xl border-2 border-rose-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-950">
                Cảnh Báo Sớm: Các Loài Cây Thuốc Có Nguy Cơ Suy Giảm Tại Tam Anh
              </h3>
              <p className="text-xs text-rose-800">
                Phát hiện dựa trên tần suất bắt gặp thực tế thấp và áp lực khai thác hoang dã tự do
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-200 text-rose-900">
            {decliningPlants.length} loài cần ưu tiên hành động
          </span>
        </div>

        {/* List of declining herbs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {decliningPlants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => onSelectPlant(plant)}
              className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                  {plant.id}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {getConservationStatusLabel(plant.conservationStatus || plant.conservationLevel)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={plant.coverImage}
                  alt={plant.vietnameseName}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                />
                <div>
                  <h4 className="font-bold text-xs text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {plant.vietnameseName}
                  </h4>
                  <p className="text-[11px] text-stone-500 italic font-serif">
                    {plant.scientificName}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-100">
                <span className="font-semibold text-rose-900 block mb-0.5">Tình trạng thực địa:</span>
                <p className="line-clamp-2">{plant.dataSource.notes || 'Số lượng cá thể rất ít trong tự nhiên, cần nhân giống bảo tồn.'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STEM Education & Conservation Action Box */}
      <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-300" />
          <h3 className="font-bold text-base">Giải Pháp Giáo Dục STEM & Bảo Tồn Thực Địa Cấp Xã</h3>
        </div>
        <p className="text-xs text-emerald-100 leading-relaxed max-w-3xl">
          Đề tài ứng dụng HerbMap Tam Anh đề xuất mô hình <b>Vườn Thực Nghiệm Dược Liệu Học Đường</b> tại trường THCS Nguyễn Khuyến và Trạm Y tế xã:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-700/60 space-y-1">
            <span className="font-bold text-amber-300 block">1. Nhân giống bảo tồn ngoại vi (Ex-situ)</span>
            <p className="text-emerald-200/90 text-[11px]">
              Đưa các loài nguy cấp (Sâm cau rừng, Hà thủ ô trắng) về vườn trường để giâm cành, ươm hạt bảo tồn.
            </p>
          </div>
          <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-700/60 space-y-1">
            <span className="font-bold text-amber-300 block">2. Gắn biển QR thông minh ngoài tự nhiên</span>
            <p className="text-emerald-200/90 text-[11px]">
              Gắn thẻ biển báo mã QR chống nước tại các điểm bờ rào nương đồi để người dân tra cứu, tránh chặt phá nhầm.
            </p>
          </div>
          <div className="bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-700/60 space-y-1">
            <span className="font-bold text-amber-300 block">3. Trải nghiệm học tập STEM Sinh - Hóa</span>
            <p className="text-emerald-200/90 text-[11px]">
              Học sinh dùng điện thoại khảo sát, phân tích và cập nhật bản đồ số.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
