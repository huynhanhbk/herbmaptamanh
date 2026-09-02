import React, { useState, useMemo } from 'react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  getHabitatLabel,
  getConservationStatusLabel,
  getPlantSurveyStatus
} from '../types';
import { 
  Search, 
  Filter, 
  MapPin, 
  QrCode, 
  Sparkles, 
  TreePine, 
  Home, 
  Mountain, 
  Droplets, 
  ChevronRight, 
  ShieldAlert, 
  HeartHandshake, 
  Compass,
  X,
  Waves,
  Wheat,
  Trees
} from 'lucide-react';
import { matchPlantSearch } from '../utils/searchHelper';

interface CatalogListProps {
  plants: MedicinalPlant[];
  onSelectPlant: (plant: MedicinalPlant) => void;
  onLocateOnMap: (plant: MedicinalPlant) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAIScanner: () => void;
}

export const CatalogList: React.FC<CatalogListProps> = ({
  plants,
  onSelectPlant,
  onLocateOnMap,
  searchQuery,
  setSearchQuery,
  onOpenAIScanner,
}) => {
  const [selectedHabitat, setSelectedHabitat] = useState<'all' | HabitatCategory>('all');
  const [selectedConservation, setSelectedConservation] = useState<'all' | ConservationLevel>('all');
  const [selectedCommune, setSelectedCommune] = useState<string>('all');
  const [selectedOccurrence, setSelectedOccurrence] = useState<'all' | 'present' | 'degraded' | 'disappeared'>('all');

  // Counts for occurrence status
  const occurrenceCounts = useMemo(() => {
    return {
      all: plants.length,
      present: plants.filter((p) => (!p.occurrenceStatus || p.occurrenceStatus === 'present') && !p.isDisappeared).length,
      degraded: plants.filter((p) => p.occurrenceStatus === 'degraded' && !p.isDisappeared).length,
      disappeared: plants.filter((p) => p.occurrenceStatus === 'disappeared' || p.isDisappeared).length,
    };
  }, [plants]);

  // Filtered plants
  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      const isDisappeared = plant.isDisappeared || plant.occurrenceStatus === 'disappeared';
      const isDegraded = !isDisappeared && plant.occurrenceStatus === 'degraded';
      const isPresent = !isDisappeared && !isDegraded;

      // Smart exact & approximate search query filter
      if (searchQuery.trim()) {
        if (!matchPlantSearch(plant, searchQuery)) {
          return false;
        }
      }

      // Occurrence status filter
      if (selectedOccurrence === 'present' && !isPresent) return false;
      if (selectedOccurrence === 'degraded' && !isDegraded) return false;
      if (selectedOccurrence === 'disappeared' && !isDisappeared) return false;

      // Habitat filter
      if (selectedHabitat !== 'all' && plant.habitatCategory !== selectedHabitat) {
        return false;
      }

      // Conservation filter
      if (selectedConservation !== 'all' && plant.conservationLevel !== selectedConservation) {
        return false;
      }

      // Commune section filter
      if (selectedCommune !== 'all' && plant.location.communeSection !== selectedCommune) {
        return false;
      }

      return true;
    });
  }, [plants, searchQuery, selectedOccurrence, selectedHabitat, selectedConservation, selectedCommune]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header Overview Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-stone-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 border border-emerald-600/50">
              Cơ sở dữ liệu không gian
            </span>
            <span className="text-xs text-stone-300">
              {filteredPlants.length} / {plants.length} loài cây thuốc
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Danh Lục Cây Thuốc Dân Gian Xã Tam Anh
          </h1>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Tra cứu nhận diện hình thái, sinh cảnh phân bố thực tế (06 loại sinh cảnh) và 15 thôn trên địa bàn xã Tam Anh.
          </p>

          {/* Quick AI Trigger */}
          <div className="pt-2">
            <button
              onClick={onOpenAIScanner}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Chụp ảnh nhận diện nhanh bằng AI</span>
            </button>
          </div>
        </div>

        {/* Decorative background leaf */}
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-emerald-300">
          <TreePine className="w-72 h-72" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên cây, tên khoa học, sinh cảnh, thôn/xóm, công dụng hoặc mã ID..."
            className="w-full text-xs text-stone-800 pl-10 pr-9 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-stone-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Occurrence Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs border-b border-stone-100 pb-2">
          <span className="text-stone-400 font-semibold text-[11px] shrink-0 mr-1">Hiện trạng:</span>
          <button
            onClick={() => setSelectedOccurrence('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedOccurrence === 'all'
                ? 'bg-stone-900 text-white font-bold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800/40 text-stone-200 font-mono">
              {occurrenceCounts.all}
            </span>
          </button>
          <button
            onClick={() => setSelectedOccurrence('present')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedOccurrence === 'present'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            <span>🟢 Đang tồn tại</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/40 text-emerald-100 font-mono">
              {occurrenceCounts.present}
            </span>
          </button>
          <button
            onClick={() => setSelectedOccurrence('degraded')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedOccurrence === 'degraded'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
            }`}
          >
            <span>🟡 Bị suy thoái</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900/40 text-amber-100 font-mono">
              {occurrenceCounts.degraded}
            </span>
          </button>
          <button
            onClick={() => setSelectedOccurrence('disappeared')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedOccurrence === 'disappeared'
                ? 'bg-rose-800 text-white font-bold shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900'
            }`}
            title="Lưu trữ các điểm khảo sát trong lịch sử nay cây đã mất hoặc cần trồng lại"
          >
            <span>⚫ Điểm đã mất</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/50 text-rose-200 font-mono">
              {occurrenceCounts.disappeared}
            </span>
          </button>
        </div>

        {/* Habitat Category Filters (06 categories) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-stone-400 font-semibold text-[11px] shrink-0">Sinh cảnh:</span>
          <button
            onClick={() => setSelectedHabitat('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              selectedHabitat === 'all'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Tất cả (06)
          </button>
          {HABITAT_OPTIONS.map((hab) => (
            <button
              key={hab.id}
              onClick={() => setSelectedHabitat(hab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                selectedHabitat === hab.id
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>{hab.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary filters: Conservation & Commune Village (15 villages) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-stone-400 font-semibold text-[11px] shrink-0">Bảo tồn:</span>
            <button
              onClick={() => setSelectedConservation('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] ${
                selectedConservation === 'all' ? 'bg-stone-800 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedConservation('safe')}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                selectedConservation === 'safe'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              🟢 An toàn
            </button>
            <button
              onClick={() => setSelectedConservation('vulnerable')}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                selectedConservation === 'vulnerable'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              🟡 Sắp nguy cấp
            </button>
            <button
              onClick={() => setSelectedConservation('endangered')}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                selectedConservation === 'endangered'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              🔴 Nguy cấp / Cần bảo tồn
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-semibold text-[11px]">Khu vực (15 thôn):</span>
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-700 max-w-[200px]"
            >
              <option value="all">Toàn bộ 15 thôn xã Tam Anh</option>
              {COMMUNE_VILLAGES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Medicinal Plant Cards */}
      {filteredPlants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-base">Không tìm thấy cây thuốc phù hợp</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc sinh cảnh / khu vực.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedHabitat('all');
              setSelectedConservation('all');
              setSelectedCommune('all');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlants.map((plant) => {
            const statusMeta = getPlantSurveyStatus(plant);
            const isPlantDisappeared = statusMeta.key === 'disappeared';

            return (
              <div
                key={plant.id}
                className={`bg-white rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1 ${
                  isPlantDisappeared 
                    ? 'border-stone-300 bg-stone-50/70 opacity-90' 
                    : statusMeta.key === 'vulnerable'
                    ? 'border-amber-300' 
                    : statusMeta.key === 'endangered'
                    ? 'border-rose-300'
                    : statusMeta.key === 'new'
                    ? 'border-purple-300'
                    : 'border-stone-200/90'
                }`}
              >
                {/* Photo & badges */}
                <div 
                  className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
                  onClick={() => onSelectPlant(plant)}
                >
                  <img
                    src={plant.coverImage}
                    alt={plant.vietnameseName}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                      isPlantDisappeared ? 'grayscale opacity-75' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-xs">
                      {plant.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg text-white shadow-sm flex items-center gap-1 ${statusMeta.bgClass}`}>
                      <span>{statusMeta.emoji}</span>
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Habitat badge */}
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm bg-black/60 text-white backdrop-blur-xs">
                      {getHabitatLabel(plant.habitatCategory)}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Plant title */}
                    <div className="cursor-pointer" onClick={() => onSelectPlant(plant)}>
                      <h3 className={`font-bold text-base transition-colors leading-tight ${
                        isPlantDisappeared ? 'text-stone-600 line-through' : 'text-stone-900 group-hover:text-emerald-800'
                      }`}>
                        {plant.vietnameseName}
                      </h3>
                      <p className="text-xs text-stone-500 italic font-serif mt-0.5">
                        {plant.scientificName}
                      </p>
                    </div>

                    {isPlantDisappeared ? (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                        <p className="font-semibold flex items-center gap-1">
                          <span>⚠️ Điểm thuốc đã mất khỏi thực địa</span>
                        </p>
                        <p className="text-[10.5px] text-rose-700 leading-snug">
                          Dữ liệu đã được lưu trữ trong danh mục Điểm đã mất. Có thể phục hồi khi trồng lại cây mới tại vị trí này.
                        </p>
                      </div>
                    ) : statusMeta.key === 'vulnerable' ? (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                        <span>⚠️ <b>Hiện trạng:</b> Quần thể sắp nguy cấp / bị suy thoái số lượng.</span>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed font-normal">
                        {plant.shortDescription}
                      </p>
                    )}

                    {/* Folk remedies highlight snippet */}
                    <div className="mt-2.5 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        <b>Dân gian:</b> {plant.traditionalUses.folkRemedies[0] || 'Kinh nghiệm lưu truyền'}
                      </span>
                    </div>
                  </div>

                  {/* Location & Action Buttons */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1 text-stone-500 text-[11px] truncate">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{plant.location.communeSection}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onLocateOnMap(plant)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                        title="Xem vị trí trên bản đồ"
                      >
                        <Compass className="w-4 h-4 text-emerald-700" />
                      </button>

                      <button
                        onClick={() => onSelectPlant(plant)}
                        className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-2xs ${
                          isPlantDisappeared
                            ? 'bg-rose-700 hover:bg-rose-800 text-white'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {isPlantDisappeared ? (
                          <>
                            <span>🌱 Phục hồi / Chi tiết</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3 h-3" />
                            <span>Hồ sơ & QR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
