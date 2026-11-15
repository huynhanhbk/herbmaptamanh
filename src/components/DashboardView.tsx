import React, { useMemo, useState } from 'react';
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
  getPlantSurveyStatus,
  getPlantGenus
} from '../types';
import { 
  ShieldAlert, 
  TreePine, 
  MapPin, 
  HeartHandshake, 
  TrendingDown, 
  CheckCircle2, 
  BookOpen, 
  Leaf, 
  Sparkles,
  Search,
  BarChart3,
  X
} from 'lucide-react';
import { HerbMapLogo } from './HerbMapLogo';

interface DashboardViewProps {
  plants: MedicinalPlant[];
  onSelectPlant: (plant: MedicinalPlant) => void;
}

interface SpeciesStatRow {
  speciesKey: string;
  vietnameseName: string;
  scientificName: string;
  family: string;
  genus: string;
  recordedCount: number;
  pendingNewCount: number;
  disappearedCount: number;
  totalPoints: number;
  villages: string[];
  samplePlant: MedicinalPlant;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  plants,
  onSelectPlant,
}) => {
  const [speciesFilterQuery, setSpeciesFilterQuery] = useState('');

  // Metric calculations
  const totalPlants = plants.length;
  const verifiedCount = plants.filter((p) => p.status === 'verified').length;
  
  // Field survey occurrence counts (03 standardized states)
  const recordedCount = plants.filter((p) => getPlantSurveyStatus(p).key === 'recorded').length;
  const disappearedCount = plants.filter((p) => getPlantSurveyStatus(p).key === 'disappeared').length;
  const newPointsCount = plants.filter((p) => getPlantSurveyStatus(p).key === 'new').length;

  const folkRemediesCount = plants.filter((p) => p.traditionalUses.folkRemedies.length > 0).length;

  // Exact per-species statistics of "Đã ghi nhận" survey points
  const speciesStats = useMemo<SpeciesStatRow[]>(() => {
    const map = new Map<string, SpeciesStatRow>();

    plants.forEach((p) => {
      const name = (p.vietnameseName || p.id).trim();
      const key = name.toLowerCase();
      const st = getPlantSurveyStatus(p).key;
      const village = p.location?.communeSection;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          speciesKey: key,
          vietnameseName: name,
          scientificName: p.scientificName,
          family: p.family,
          genus: getPlantGenus(p),
          recordedCount: 0,
          pendingNewCount: 0,
          disappearedCount: 0,
          totalPoints: 0,
          villages: [],
          samplePlant: p,
        };
        map.set(key, entry);
      }

      if (st === 'recorded') {
        entry.recordedCount += 1;
        // Prefer a recorded point as the representative clickable plant
        if (getPlantSurveyStatus(entry.samplePlant).key !== 'recorded') {
          entry.samplePlant = p;
        }
      } else if (st === 'new') {
        entry.pendingNewCount += 1;
      } else if (st === 'disappeared') {
        entry.disappearedCount += 1;
      }

      entry.totalPoints += 1;
      if (village && !entry.villages.includes(village)) {
        entry.villages.push(village);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.recordedCount !== a.recordedCount) return b.recordedCount - a.recordedCount;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.vietnameseName.localeCompare(b.vietnameseName, 'vi');
    });
  }, [plants]);

  const speciesWithRecordedPointsCount = useMemo(
    () => speciesStats.filter((s) => s.recordedCount > 0).length,
    [speciesStats]
  );

  const filteredSpeciesStats = useMemo(() => {
    if (!speciesFilterQuery.trim()) return speciesStats;
    const q = speciesFilterQuery.trim().toLowerCase();
    return speciesStats.filter(
      (s) =>
        s.vietnameseName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.family.toLowerCase().includes(q) ||
        s.genus.toLowerCase().includes(q) ||
        s.villages.some((v) => v.toLowerCase().includes(q))
    );
  }, [speciesStats, speciesFilterQuery]);

  const recordedSpeciesChartData = useMemo(() => {
    return speciesStats
      .filter((s) => s.recordedCount > 0)
      .map((s) => ({
        name: s.vietnameseName,
        recordedCount: s.recordedCount,
        totalPoints: s.totalPoints,
      }));
  }, [speciesStats]);

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

  // Field Survey Occurrence Data (03 standardized states)
  const occurrenceData = [
    { name: 'Đã ghi nhận', count: recordedCount, color: '#059669' },
    { name: 'Biến mất', count: disappearedCount, color: '#475569' },
    { name: 'Điểm mới (Chờ duyệt)', count: newPointsCount, color: '#7c3aed' },
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

  // Disappeared Species Alert
  const disappearedPlants = plants.filter((p) => getPlantSurveyStatus(p).key === 'disappeared');

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
              Báo Cáo Không Gian Cây Thuốc & Thống Kê Khảo Sát
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
              Tổng hợp dữ liệu điều tra thực địa, phân bố sinh cảnh, số lượng điểm đã ghi nhận theo từng loài cây thuốc và theo dõi các điểm biến mất tại xã Tam Anh.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 shrink-0">
            <div className="w-14 h-14 bg-white rounded-full p-1 shadow-md flex items-center justify-center shrink-0">
              <HerbMapLogo size="100%" variant="icon" />
            </div>
            <div className="text-left pr-2">
              <span className="font-extrabold text-sm block tracking-tight text-white">HERBMAP</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">TAM ANH</span>
              <span className="text-[9px] text-stone-400 block mt-0.5">Hệ thống CSDL không gian</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Điểm đã ghi nhận</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700">{recordedCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium block">
              Trên {speciesWithRecordedPointsCount} loài cây thuốc
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Tổng điểm khảo sát</span>
            <span className="text-xl sm:text-2xl font-bold text-stone-900">{totalPlants}</span>
            <span className="text-[11px] text-stone-600 font-medium block">
              {verifiedCount} điểm đã xác nhận
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Điểm mới (Chờ duyệt)</span>
            <span className="text-xl sm:text-2xl font-bold text-purple-800">{newPointsCount}</span>
            <span className="text-[11px] text-purple-600 font-medium block">
              Đang chờ BQT thẩm định
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 block">Điểm đã biến mất</span>
            <span className="text-xl sm:text-2xl font-bold text-rose-700">{disappearedCount}</span>
            <span className="text-[11px] text-rose-600 font-medium block">
              {folkRemediesCount} hồ sơ có bài thuốc
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: EXACT COUNT OF "ĐÃ GHI NHẬN" POINTS PER SPECIES */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base text-stone-900">
                  Thống Kê Số Lượng Điểm "Đã Ghi Nhận" Theo Từng Loài Cây Thuốc
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Chính xác theo thực địa
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Thống kê chính xác tổng số điểm có trạng thái <b>"Đã ghi nhận"</b> của từng loài cây thuốc đã được khảo sát trong cơ sở dữ liệu ({recordedCount} điểm đã ghi nhận / {speciesStats.length} loài).
              </p>
            </div>
          </div>

          {/* Search box inside species stats */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={speciesFilterQuery}
              onChange={(e) => setSpeciesFilterQuery(e.target.value)}
              placeholder="Lọc theo tên loài, họ, chi hoặc thôn..."
              className="w-full pl-8 pr-8 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs text-stone-800 focus:outline-none focus:border-emerald-500"
            />
            {speciesFilterQuery && (
              <button
                type="button"
                onClick={() => setSpeciesFilterQuery('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* BarChart of Species Recorded Point Counts */}
        {recordedSpeciesChartData.length > 0 && (
          <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700">
                Biểu đồ số điểm "Đã ghi nhận" theo loài cây thuốc
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {speciesWithRecordedPointsCount} loài có điểm đã ghi nhận
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recordedSpeciesChartData} margin={{ top: 10, right: 15, left: -15, bottom: 38 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    interval={0} 
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} điểm`, 'Đã ghi nhận']}
                    contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Bar dataKey="recordedCount" fill="#059669" radius={[6, 6, 0, 0]} name="Điểm đã ghi nhận" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Per-Species Breakdown Table */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3 pl-4 w-12 text-center">STT</th>
                <th className="p-3">Loài cây thuốc & Phân loại (Họ → Chi)</th>
                <th className="p-3 text-center">Số điểm Đã ghi nhận</th>
                <th className="p-3">Phân bố tại các thôn</th>
                <th className="p-3 pr-4 text-right">Tổng khảo sát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSpeciesStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-400">
                    Không tìm thấy loài cây thuốc phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSpeciesStats.map((row, idx) => (
                  <tr
                    key={row.speciesKey}
                    onClick={() => onSelectPlant(row.samplePlant)}
                    className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-3 pl-4 text-center font-mono text-stone-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={row.samplePlant.coverImage}
                          alt={row.vietnameseName}
                          className="w-9 h-9 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-stone-900 group-hover:text-emerald-800 transition-colors block">
                            {row.vietnameseName}
                          </span>
                          <span className="text-[11px] text-stone-500 italic font-serif block">
                            {row.scientificName}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {row.family} → {row.genus}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs ${
                          row.recordedCount > 0
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                        }`}
                      >
                        <span>🟢 {row.recordedCount} điểm</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {row.villages.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200"
                          >
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <span className="font-mono font-bold text-stone-800 block">
                        {row.totalPoints} điểm
                      </span>
                      {(row.pendingNewCount > 0 || row.disappearedCount > 0) && (
                        <span className="text-[10px] text-stone-500 block">
                          {row.pendingNewCount > 0 && `🟣 ${row.pendingNewCount} chờ duyệt`}
                          {row.pendingNewCount > 0 && row.disappearedCount > 0 && ' · '}
                          {row.disappearedCount > 0 && `⚫ ${row.disappearedCount} biến mất`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  formatter={(value: any, name: any) => [`${value} điểm`, name]}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Field Survey Occurrence Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Hiện Trạng Thực Địa (03 Trạng Thái)</h3>
              <p className="text-xs text-stone-500">Thống kê theo 03 trạng thái ghi nhận thực tế tại các điểm khảo sát</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occurrenceData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} điểm`, 'Số lượng']}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {occurrenceData.map((entry, index) => (
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
                  formatter={(value: any, name: any, item: any) => [`${value} điểm khảo sát`, item.payload.fullName]}
                  contentStyle={{ borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="Số điểm cây thuốc" />
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

      {/* Warning Panel for Disappeared Species */}
      <div className="bg-rose-50/70 p-5 sm:p-6 rounded-3xl border-2 border-rose-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-rose-950">
                Theo Dõi Thực Địa: Các Điểm Khảo Sát Đã Biến Mất
              </h3>
              <p className="text-xs text-rose-800">
                Danh sách các điểm ghi nhận trước đây nhưng hiện không còn tìm thấy tại vị trí khảo sát
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-200 text-rose-900">
            {disappearedPlants.length} điểm biến mất
          </span>
        </div>

        {disappearedPlants.length === 0 ? (
          <div className="bg-white/90 p-5 rounded-2xl border border-rose-100 text-center text-xs text-stone-500">
            Hiện chưa ghi nhận điểm khảo sát nào ở trạng thái "Biến mất".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {disappearedPlants.map((plant) => {
              const statusMeta = getPlantSurveyStatus(plant);
              return (
                <div
                  key={plant.id}
                  onClick={() => onSelectPlant(plant)}
                  className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      {plant.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}>
                      {statusMeta.emoji} {statusMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={plant.coverImage}
                      alt={plant.vietnameseName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200 grayscale"
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
                    <span className="font-semibold text-rose-900 block mb-0.5">Hiện trạng thực địa:</span>
                    <p className="line-clamp-2">{plant.dataSource.notes || 'Không còn tìm thấy cá thể tại vị trí khảo sát này.'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              Đưa các loài quý hiếm về vườn trường để giâm cành, ươm hạt và theo dõi sinh trưởng.
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
