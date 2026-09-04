import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  getHabitatLabel,
  SurveyPointStatusKey,
  SURVEY_POINT_STATUS_CONFIG,
  getPlantSurveyStatus,
} from '../types';
import { 
  Compass, 
  Layers, 
  Navigation, 
  ShieldAlert, 
  Sparkles, 
  TreePine, 
  Home, 
  Mountain, 
  Droplets, 
  Waves,
  Eye,
  Info,
  Filter,
  CheckCircle2,
  Trees,
  Wheat,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertTriangle,
  Leaf,
  X
} from 'lucide-react';

interface HerbMapProps {
  plants: MedicinalPlant[];
  onSelectPlant: (plant: MedicinalPlant) => void;
  selectedPlantId?: string | null;
  pickingCoordinatesMode?: boolean;
  onCoordinatesPicked?: (lat: number, lng: number) => void;
  onCancelPickCoordinates?: () => void;
}

export const HerbMap: React.FC<HerbMapProps> = ({
  plants,
  onSelectPlant,
  selectedPlantId,
  pickingCoordinatesMode = false,
  onCoordinatesPicked,
  onCancelPickCoordinates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Filters inside map view - Unified 5 status filters
  const [selectedHabitat, setSelectedHabitat] = useState<'all' | HabitatCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | SurveyPointStatusKey>('all');
  const [showOnlyVerified, setShowOnlyVerified] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [mapTileLayer, setMapTileLayer] = useState<'osm' | 'topo'>('osm');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedMarkerCoords, setPickedMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsNotification, setGpsNotification] = useState<string | null>(null);

  // Calculate counts for each of the 4 field survey statuses
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: plants.length,
      safe: 0,
      degraded: 0,
      disappeared: 0,
      new: 0,
    };
    plants.forEach((p) => {
      const meta = getPlantSurveyStatus(p);
      counts[meta.key] = (counts[meta.key] || 0) + 1;
    });
    return counts;
  }, [plants]);

  // Habitat plant counts
  const habitatCounts = useMemo(() => {
    const counts: Record<string, number> = { all: plants.length };
    HABITAT_OPTIONS.forEach((h) => {
      counts[h.id] = plants.filter((p) => p.habitatCategory === h.id).length;
    });
    return counts;
  }, [plants]);

  // Filtered plants based on unified 5 statuses and habitat
  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      const meta = getPlantSurveyStatus(plant);
      
      // If user is filtering by a specific status
      if (selectedStatus !== 'all') {
        if (meta.key !== selectedStatus) return false;
      } else {
        // By default when viewing 'all', hide disappeared plants unless user specifically selects 'disappeared' status
        if (meta.key === 'disappeared') return false;
      }

      if (selectedHabitat !== 'all' && plant.habitatCategory !== selectedHabitat) return false;
      if (showOnlyVerified && plant.status !== 'verified') return false;

      return true;
    });
  }, [plants, selectedStatus, selectedHabitat, showOnlyVerified]);

  // Helper for habitat icons
  const renderHabitatIcon = (id: string) => {
    switch (id) {
      case 'natural_forest':
        return <TreePine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'planted_forest':
        return <Trees className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
      case 'shrub_grassland':
        return <Mountain className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'sea':
        return <Waves className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'garden':
        return <Home className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
      case 'farmland':
        return <Wheat className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  // Default Tam Anh Center Coordinates (Núi Thành, Quảng Nam)
  const TAM_ANH_CENTER = [15.4625, 108.6180] as [number, number];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: TAM_ANH_CENTER,
      zoom: 14,
      zoomControl: false,
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Default OSM tile layer
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tam Anh HerbMap',
      maxZoom: 19,
    });

    osmLayer.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map click for coordinate picking
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (pickingCoordinatesMode && onCoordinatesPicked) {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));
        setPickedMarkerCoords({ lat: clickedLat, lng: clickedLng });
        onCoordinatesPicked(clickedLat, clickedLng);
      }
    };

    if (pickingCoordinatesMode) {
      map.on('click', handleMapClick);
      if (container) {
        container.style.cursor = 'crosshair';
      }
    } else {
      if (container) {
        container.style.cursor = '';
      }
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickingCoordinatesMode, onCoordinatesPicked]);

  // Update Tile Layer when changed
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapTileLayer === 'topo') {
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
        maxZoom: 17,
      }).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | HerbMap Tam Anh',
        maxZoom: 19,
      }).addTo(map);
    }
  }, [mapTileLayer]);

  /**
   * Create custom marker icon strictly following the 5 unified survey statuses:
   * 1. safe: Emerald Green with Leaf SVG
   * 2. vulnerable: Amber Yellow with Alert Triangle SVG (includes degraded)
   * 3. endangered: Rose Red with Shield Alert SVG
   * 4. disappeared: Dark Stone with X SVG
   * 5. new: Violet Purple with Sparkles/Star SVG
   */
  const createHerbIcon = (plant: MedicinalPlant, isSelected: boolean) => {
    const statusMeta = getPlantSurveyStatus(plant);
    const sizeClass = isSelected 
      ? 'w-10 h-10 -translate-x-5 -translate-y-5 ring-4 ring-white shadow-2xl scale-110' 
      : 'w-8 h-8 -translate-x-4 -translate-y-4 shadow-md';

    let iconSvg = '';
    switch (statusMeta.key) {
      case 'safe':
        // Clean Leaf SVG
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        `;
        break;
      case 'degraded':
        // Alert Triangle SVG (Bị suy giảm)
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        `;
        break;
      case 'disappeared':
        // X cross SVG
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        break;
      case 'new':
        // Sparkles / Star SVG
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
        `;
        break;
    }

    const html = `
      <div class="relative group cursor-pointer transition-transform duration-200 hover:scale-110">
        <div class="${sizeClass} ${statusMeta.markerBg} ${statusMeta.markerRing} border-2 border-white rounded-full flex items-center justify-center text-white ${statusMeta.key === 'disappeared' ? 'opacity-80 ring-stone-400/50' : ''}">
          ${iconSvg}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-herb-div-icon',
      html: html,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });
  };

  // Render Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    filteredPlants.forEach((plant) => {
      const isSelected = selectedPlantId === plant.id;
      const statusMeta = getPlantSurveyStatus(plant);
      const icon = createHerbIcon(plant, isSelected);

      const marker = L.marker([plant.location.lat, plant.location.lng], { icon });

      // Create Custom Popup
      const popupDiv = document.createElement('div');
      popupDiv.className = 'w-64 sm:w-72 overflow-hidden rounded-2xl bg-white font-sans text-stone-800 shadow-xl border border-stone-200';

      const statusBadge = `
        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusMeta.badgeClass} flex items-center gap-1">
          <span>${statusMeta.emoji}</span>
          <span>${statusMeta.label}</span>
        </span>
      `;

      popupDiv.innerHTML = `
        <div class="relative h-28 w-full overflow-hidden bg-stone-100">
          <img src="${plant.coverImage}" alt="${plant.vietnameseName}" class="w-full h-full object-cover ${statusMeta.key === 'disappeared' ? 'grayscale opacity-75' : ''}" />
          <div class="absolute top-2 left-2 flex gap-1">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs font-mono">${plant.id}</span>
          </div>
          <div class="absolute bottom-2 right-2">
            ${statusBadge}
          </div>
        </div>
        <div class="p-3.5 space-y-2">
          <div>
            <h3 class="font-bold text-sm text-stone-900 leading-snug ${statusMeta.key === 'disappeared' ? 'line-through text-stone-500' : ''}">${plant.vietnameseName}</h3>
            <p class="text-xs text-stone-500 italic font-serif">${plant.scientificName}</p>
          </div>
          
          <div class="p-2 rounded-xl bg-stone-50 border border-stone-100 text-[11px] space-y-1">
            <p class="text-stone-600 line-clamp-2 leading-relaxed">${plant.shortDescription}</p>
            <div class="text-[10px] font-semibold ${statusMeta.textClass} pt-1 border-t border-stone-200/60">
              📌 ${statusMeta.subLabel}
            </div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-stone-500 pt-1.5 border-t border-stone-100">
            <span class="truncate max-w-[130px]">📍 ${plant.location.communeSection}</span>
            <button id="btn-view-${plant.id}" class="px-3 py-1 rounded-lg ${statusMeta.bgClass} hover:opacity-90 text-white font-semibold text-[11px] transition-all shadow-xs cursor-pointer">
              Xem hồ sơ & Lịch sử
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupDiv, { maxWidth: 300, minWidth: 260 });
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-${plant.id}`);
        if (btn) {
          btn.onclick = () => onSelectPlant(plant);
        }
      });

      marker.on('click', () => {
        onSelectPlant(plant);
      });

      markersGroup.addLayer(marker);
    });
  }, [filteredPlants, selectedPlantId, onSelectPlant]);

  // Center on Selected Plant when selectedPlantId changes
  useEffect(() => {
    if (!selectedPlantId || !mapInstanceRef.current) return;
    const plant = plants.find((p) => p.id === selectedPlantId);
    if (plant) {
      mapInstanceRef.current.setView([plant.location.lat, plant.location.lng], 16, {
        animate: true,
      });
    }
  }, [selectedPlantId, plants]);

  // Locate User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsNotification('Trình duyệt không hỗ trợ định vị GPS.');
      setTimeout(() => setGpsNotification(null), 3000);
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'user-loc-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-xl animate-pulse"></div>
                  <div class="absolute w-10 h-10 rounded-full bg-blue-400/30 animate-ping"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const marker = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstanceRef.current);
            marker.bindPopup('<b>Vị trí thực địa của bạn</b>');
            userLocationMarkerRef.current = marker;
          }
        }
      },
      (err) => {
        setLocatingUser(false);
        let msg = 'Không thể lấy định vị GPS.';
        if (err.code === 1) {
          msg = 'Vui lòng cấp quyền truy cập vị trí trên trình duyệt.';
        } else if (err.code === 2) {
          msg = 'Không tìm thấy tín hiệu vệ tinh GPS.';
        }
        setGpsNotification(msg);
        setTimeout(() => setGpsNotification(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Reset to Tam Anh Center
  const handleCenterTamAnh = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(TAM_ANH_CENTER, 14, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-stone-100 overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Picking Coordinates Banner */}
      {pickingCoordinatesMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-stone-900/95 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-center gap-3 animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-semibold text-emerald-100">🎯 Nhấp chuột vào điểm bất kỳ trên bản đồ để lấy tọa độ thực địa</span>
          {onCancelPickCoordinates && (
            <button
              onClick={onCancelPickCoordinates}
              className="ml-2 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-bold border border-stone-700 transition-colors"
            >
              Hủy / Quay lại phiếu
            </button>
          )}
        </div>
      )}

      {/* GPS Notice toast */}
      {gpsNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-stone-900/95 backdrop-blur-md text-amber-300 text-xs px-4 py-2 rounded-xl shadow-xl border border-amber-800/80 flex items-center gap-2">
          <span>⚠️ {gpsNotification}</span>
        </div>
      )}

      {/* Unified Filter Bar (Top overlay) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xl md:max-w-2xl z-10 flex flex-col gap-1.5 pointer-events-none transition-all">
        <div className="pointer-events-auto bg-stone-900/95 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-stone-800/90 shadow-2xl text-xs space-y-2.5">
          {/* Header Bar with quick status badge and Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
              className="flex items-center gap-2 cursor-pointer select-none group min-w-0"
              title={isFilterExpanded ? 'Bấm để thu gọn bộ lọc' : 'Bấm để mở rộng bộ lọc'}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-950/90 border border-emerald-700/70 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-emerald-900 transition-colors">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-stone-200 text-xs tracking-wide group-hover:text-white transition-colors truncate">
                Lọc Trạng Thái & Sinh Cảnh
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[11px] font-semibold font-mono shrink-0">
                {filteredPlants.length}/{plants.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(selectedHabitat !== 'all' || selectedStatus !== 'all' || showOnlyVerified) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHabitat('all');
                    setSelectedStatus('all');
                    setShowOnlyVerified(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors border border-stone-700"
                  title="Đặt lại bộ lọc về mặc định"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Đặt lại</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium flex items-center gap-1 transition-colors border border-stone-700"
                title={isFilterExpanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
              >
                <span>{isFilterExpanded ? 'Thu gọn' : 'Tùy chọn'}</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick 4-Status Field Survey Filter Pills Row (Always visible, uncluttered) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedStatus === 'all'
                  ? 'bg-stone-700 text-white font-bold shadow-xs border border-stone-500 ring-1 ring-white/20'
                  : 'text-stone-400 hover:text-stone-200 bg-stone-800/80 border border-stone-700/60'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-stone-900 text-stone-300">
                {statusCounts.all}
              </span>
            </button>

            {/* 1. An toàn */}
            <button
              onClick={() => setSelectedStatus('safe')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedStatus === 'safe'
                  ? 'bg-emerald-700 text-white font-bold shadow-xs border border-emerald-400 ring-1 ring-emerald-300/40'
                  : 'text-emerald-300 hover:bg-emerald-950/80 bg-stone-800/80 border border-stone-700/60'
              }`}
            >
              <span>🟢 An toàn</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-950 text-emerald-200">
                {statusCounts.safe}
              </span>
            </button>

            {/* 2. Bị suy giảm */}
            <button
              onClick={() => setSelectedStatus('degraded')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedStatus === 'degraded'
                  ? 'bg-amber-600 text-white font-bold shadow-xs border border-amber-300 ring-1 ring-amber-300/40'
                  : 'text-amber-300 hover:bg-amber-950/80 bg-stone-800/80 border border-stone-700/60'
              }`}
            >
              <span>🟡 Bị suy giảm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-950 text-amber-200">
                {statusCounts.degraded}
              </span>
            </button>

            {/* 3. Biến mất */}
            <button
              onClick={() => setSelectedStatus('disappeared')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedStatus === 'disappeared'
                  ? 'bg-stone-600 text-white font-bold shadow-xs border border-stone-400 ring-1 ring-stone-300/40'
                  : 'text-stone-400 hover:bg-stone-750 bg-stone-800/80 border border-stone-700/60'
              }`}
            >
              <span>⚫ Biến mất</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-stone-900 text-stone-300">
                {statusCounts.disappeared}
              </span>
            </button>

            {/* 4. Điểm mới */}
            <button
              onClick={() => setSelectedStatus('new')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedStatus === 'new'
                  ? 'bg-purple-700 text-white font-bold shadow-xs border border-purple-400 ring-1 ring-purple-300/40'
                  : 'text-purple-300 hover:bg-purple-950/80 bg-stone-800/80 border border-stone-700/60'
              }`}
            >
              <span>🟣 Điểm mới</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-950 text-purple-200">
                {statusCounts.new}
              </span>
            </button>
          </div>

          {/* Expanded Filter Panel (Habitats & Verified check) */}
          {isFilterExpanded && (
            <div className="space-y-2.5 pt-2 border-t border-stone-800/80 animate-fadeIn">
              {/* Habitat Selection Grid */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1 px-0.5">
                  <span className="font-medium">Sinh cảnh phân bố:</span>
                  <span className="text-emerald-400 text-[10px]">06 loại thực địa Tam Anh</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {/* All option */}
                  <button
                    type="button"
                    onClick={() => setSelectedHabitat('all')}
                    className={`px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
                      selectedHabitat === 'all'
                        ? 'bg-emerald-800 text-white border-emerald-500 shadow-xs ring-1 ring-emerald-400/30 font-semibold'
                        : 'bg-stone-800/80 hover:bg-stone-750 text-stone-300 border-stone-700/80 hover:border-stone-600'
                    }`}
                  >
                    <span className="text-[11px] truncate">Tất cả sinh cảnh</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      selectedHabitat === 'all' ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-900 text-stone-400'
                    }`}>
                      {habitatCounts.all}
                    </span>
                  </button>

                  {/* 06 Standard Habitat Options */}
                  {HABITAT_OPTIONS.map((hab) => {
                    const isSelected = selectedHabitat === hab.id;
                    const count = habitatCounts[hab.id] || 0;
                    return (
                      <button
                        key={hab.id}
                        type="button"
                        onClick={() => setSelectedHabitat(hab.id)}
                        className={`px-2 py-1.5 rounded-xl text-left flex items-center justify-between gap-1 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-500 shadow-xs ring-1 ring-emerald-400/30 font-semibold'
                            : 'bg-stone-800/80 hover:bg-stone-750 text-stone-300 border-stone-700/80 hover:border-stone-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          {renderHabitatIcon(hab.id)}
                          <span className="text-[11px] truncate">{hab.label}</span>
                        </div>
                        <span className={`text-[10px] px-1 py-0.2 rounded font-mono shrink-0 ${
                          isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-900 text-stone-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verified checkbox */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer select-none text-stone-300">
                  <input
                    type="checkbox"
                    checked={showOnlyVerified}
                    onChange={(e) => setShowOnlyVerified(e.target.checked)}
                    className="rounded border-stone-600 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 bg-stone-900"
                  />
                  <span>Chỉ hiển thị các điểm đã kiểm duyệt thực địa</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Map Action Buttons (Right side) */}
      <div className="absolute bottom-20 right-3 sm:bottom-6 sm:right-4 z-10 flex flex-col gap-2">
        {/* GPS Live Locate button */}
        <button
          onClick={handleLocateMe}
          disabled={locatingUser}
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-emerald-700 cursor-pointer"
          title="Định vị vị trí hiện tại ngoài thực địa (GPS)"
        >
          <Navigation className={`w-5 h-5 ${locatingUser ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Center on Tam Anh */}
        <button
          onClick={handleCenterTamAnh}
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Đưa về tâm xã Tam Anh"
        >
          <Compass className="w-5 h-5 text-emerald-700" />
        </button>

        {/* Toggle Tile Layer: Standard / Topo */}
        <button
          onClick={() => setMapTileLayer(mapTileLayer === 'osm' ? 'topo' : 'osm')}
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Chuyển đổi lớp bản đồ (Địa hình / Đường sá)"
        >
          <Layers className="w-5 h-5 text-stone-700" />
        </button>
      </div>
    </div>
  );
};
