import React, { useState, useMemo } from 'react';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel 
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
  X
} from 'lucide-react';

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

  // Filtered plants
  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = plant.vietnameseName.toLowerCase().includes(q);
        const matchSci = plant.scientificName.toLowerCase().includes(q);
        const matchFamily = plant.family.toLowerCase().includes(q);
        const matchHabitat = plant.habitat.toLowerCase().includes(q);
        const matchRemedies = plant.traditionalUses.folkRemedies.some((r) => r.toLowerCase().includes(q));
        const matchId = plant.id.toLowerCase().includes(q);

        if (!matchName && !matchSci && !matchFamily && !matchHabitat && !matchRemedies && !matchId) {
          return false;
        }
      }

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
  }, [plants, searchQuery, selectedHabitat, selectedConservation, selectedCommune]);

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
            Tra cứu nhận diện hình thái, sinh cảnh phân bố thực tế và tri thức sử dụng cây thuốc dân gian đã được ghi nhận qua khảo sát thực địa tại Tam Anh Bắc và Tam Anh Nam.
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
            placeholder="Tìm kiếm theo tên cây, tên khoa học, sinh cảnh, công dụng dân gian hoặc mã ID..."
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

        {/* Habitat Category Filters */}
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
            Tất cả
          </button>
          <button
            onClick={() => setSelectedHabitat('forest')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedHabitat === 'forest'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <TreePine className="w-3.5 h-3.5 text-emerald-600" /> Rừng thứ sinh
          </button>
          <button
            onClick={() => setSelectedHabitat('garden')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedHabitat === 'garden'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-teal-600" /> Vườn & Bờ rào
          </button>
          <button
            onClick={() => setSelectedHabitat('hill')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedHabitat === 'hill'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-amber-600" /> Gò đồi
          </button>
          <button
            onClick={() => setSelectedHabitat('stream')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedHabitat === 'stream'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Ven suối & ẩm
          </button>
          <button
            onClick={() => setSelectedHabitat('red')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              selectedHabitat === 'red'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-red-500" /> Đất đỏ
          </button>
        </div>

        {/* Secondary filters: Conservation & Commune Section */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-stone-400 font-semibold text-[11px] shrink-0">Bảo tồn:</span>
            <button
              onClick={() => setSelectedConservation('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] ${
                selectedConservation === 'all' ? 'bg-stone-800 text-white font-bold' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Mọi cấp độ
            </button>
            <button
              onClick={() => setSelectedConservation('endangered')}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                selectedConservation === 'endangered'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              🔴 Nguy cấp
            </button>
            <button
              onClick={() => setSelectedConservation('vulnerable')}
              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                selectedConservation === 'vulnerable'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              🟡 Cần bảo tồn
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-semibold text-[11px]">Khu vực:</span>
            <select
              value={selectedCommune}
              onChange={(e) => setSelectedCommune(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-stone-300 bg-stone-50 font-medium text-stone-700"
            >
              <option value="all">Toàn bộ xã Tam Anh</option>
              <option value="Tam Anh Bắc">Tam Anh Bắc (Đức Bố)</option>
              <option value="Tam Anh Nam">Tam Anh Nam (Diêm Phổ)</option>
              <option value="Vùng đồi Khe Tre">Vùng đồi Khe Tre</option>
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
            const isEndangered = plant.conservationLevel === 'endangered';
            const isVulnerable = plant.conservationLevel === 'vulnerable' || plant.conservationLevel === 'rare';

            return (
              <div
                key={plant.id}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
              >
                {/* Photo & badges */}
                <div 
                  className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
                  onClick={() => onSelectPlant(plant)}
                >
                  <img
                    src={plant.coverImage}
                    alt={plant.vietnameseName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-xs">
                      {plant.id}
                    </span>
                    {plant.status === 'pending' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-600 text-white">
                        Chờ duyệt
                      </span>
                    )}
                  </div>

                  {/* Conservation status badge */}
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs ${
                      isEndangered
                        ? 'bg-rose-600 text-white'
                        : isVulnerable
                        ? 'bg-amber-500 text-stone-900'
                        : 'bg-emerald-700 text-white'
                    }`}>
                      {plant.conservationStatus}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Plant title */}
                    <div className="cursor-pointer" onClick={() => onSelectPlant(plant)}>
                      <h3 className="font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors leading-tight">
                        {plant.vietnameseName}
                      </h3>
                      <p className="text-xs text-stone-500 italic font-serif mt-0.5">
                        {plant.scientificName}
                      </p>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed font-normal">
                      {plant.shortDescription}
                    </p>

                    {/* Folk remedies highlight snippet */}
                    <div className="mt-3 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-1.5">
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
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Hồ sơ & QR</span>
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
