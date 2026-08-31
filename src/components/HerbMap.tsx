import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel,
  HABITAT_OPTIONS,
  COMMUNE_VILLAGES,
  getHabitatLabel
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
  RotateCcw
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

  // Filters inside map view
  const [selectedHabitat, setSelectedHabitat] = useState<'all' | HabitatCategory>('all');
  const [selectedConservation, setSelectedConservation] = useState<'all' | ConservationLevel | 'pending'>('all');
  const [showOnlyVerified, setShowOnlyVerified] = useState<boolean>(false);
  const [showDisappearedHistory, setShowDisappearedHistory] = useState<boolean>(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [mapTileLayer, setMapTileLayer] = useState<'osm' | 'topo'>('osm');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedMarkerCoords, setPickedMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Disappeared plants count
  const disappearedCount = useMemo(() => {
    return plants.filter((p) => p.isDisappeared || p.occurrenceStatus === 'disappeared').length;
  }, [plants]);

  // Habitat plant counts for radio badges (calculated on active/non-disappeared plants by default)
  const habitatCounts = useMemo(() => {
    const activePlants = showDisappearedHistory
      ? plants
      : plants.filter((p) => !p.isDisappeared && p.occurrenceStatus !== 'disappeared');
    const counts: Record<string, number> = { all: activePlants.length };
    HABITAT_OPTIONS.forEach((h) => {
      counts[h.id] = activePlants.filter((p) => p.habitatCategory === h.id).length;
    });
    return counts;
  }, [plants, showDisappearedHistory]);

  // Filtered plant count
  const filteredPlantsCount = useMemo(() => {
    return plants.filter((plant) => {
      const isPlantDisappeared = plant.isDisappeared || plant.occurrenceStatus === 'disappeared';
      if (isPlantDisappeared && !showDisappearedHistory) return false;
      if (selectedHabitat !== 'all' && plant.habitatCategory !== selectedHabitat) return false;
      if (selectedConservation === 'pending') {
        if (plant.status !== 'pending') return false;
      } else if (selectedConservation !== 'all') {
        if (plant.conservationLevel !== selectedConservation) return false;
      }
      if (showOnlyVerified && plant.status !== 'verified') return false;
      return true;
    }).length;
  }, [plants, selectedHabitat, selectedConservation, showOnlyVerified, showDisappearedHistory]);

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

  // Handle map click for coordinate picking with active closure & cursor styling
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

  // Create custom marker icons based on conservation & habitat
  const createHerbIcon = (plant: MedicinalPlant, isSelected: boolean) => {
    const isPlantDisappeared = plant.isDisappeared || plant.occurrenceStatus === 'disappeared';
    let bgColor = 'bg-emerald-600';
    let borderColor = 'border-white';
    let ringColor = 'ring-emerald-400/50';

    if (isPlantDisappeared) {
      bgColor = 'bg-stone-600';
      borderColor = 'border-rose-400';
      ringColor = 'ring-stone-400/50';
    } else if (plant.status === 'pending') {
      bgColor = 'bg-purple-600';
      ringColor = 'ring-purple-400/50';
    } else if (plant.conservationLevel === 'endangered') {
      bgColor = 'bg-rose-600';
      ringColor = 'ring-rose-400/50';
    } else if (plant.conservationLevel === 'vulnerable') {
      bgColor = 'bg-amber-600';
      ringColor = 'ring-amber-400/50';
    }

    const sizeClass = isSelected ? 'w-10 h-10 -translate-x-5 -translate-y-5 ring-4' : 'w-8 h-8 -translate-x-4 -translate-y-4';

    const html = `
      <div class="relative group cursor-pointer">
        <div class="${sizeClass} ${bgColor} ${ringColor} ${borderColor} rounded-full border-2 shadow-lg flex items-center justify-center text-white transition-all transform hover:scale-110 ${isPlantDisappeared ? 'opacity-75' : ''}">
          ${isPlantDisappeared ? `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ` : `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          `}
        </div>
        ${plant.status === 'pending' && !isPlantDisappeared ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 border border-white rounded-full"></span>' : ''}
        ${isPlantDisappeared ? '<span class="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] font-bold bg-rose-600 text-white rounded-full border border-white">Hết</span>' : ''}
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

    // Filter plants (automatically exclude disappeared plants unless showDisappearedHistory is ON)
    const filteredPlants = plants.filter((plant) => {
      const isPlantDisappeared = plant.isDisappeared || plant.occurrenceStatus === 'disappeared';
      if (isPlantDisappeared && !showDisappearedHistory) return false;
      if (selectedHabitat !== 'all' && plant.habitatCategory !== selectedHabitat) return false;
      if (selectedConservation === 'pending') {
        if (plant.status !== 'pending') return false;
      } else if (selectedConservation !== 'all') {
        if (plant.conservationLevel !== selectedConservation) return false;
      }
      if (showOnlyVerified && plant.status !== 'verified') return false;
      return true;
    });

    filteredPlants.forEach((plant) => {
      const isSelected = selectedPlantId === plant.id;
      const isPlantDisappeared = plant.isDisappeared || plant.occurrenceStatus === 'disappeared';
      const icon = createHerbIcon(plant, isSelected);

      const marker = L.marker([plant.location.lat, plant.location.lng], { icon });

      // Create Custom Popup
      const popupDiv = document.createElement('div');
      popupDiv.className = 'w-64 sm:w-72 overflow-hidden rounded-xl bg-white font-sans text-stone-800 shadow-md';

      let statusBadge = '';
      if (isPlantDisappeared) {
        statusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">⚠️ Đã biến mất tại tọa độ này</span>';
      } else if (plant.status === 'pending') {
        statusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">Điểm mới (chờ duyệt)</span>';
      } else if (plant.conservationLevel === 'endangered') {
        statusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">Nguy cấp / Cần bảo tồn</span>';
      } else if (plant.conservationLevel === 'vulnerable') {
        statusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Sắp nguy cấp</span>';
      } else {
        statusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">An toàn</span>';
      }

      popupDiv.innerHTML = `
        <div class="relative h-28 w-full overflow-hidden bg-stone-100">
          <img src="${plant.coverImage}" alt="${plant.vietnameseName}" class="w-full h-full object-cover ${isPlantDisappeared ? 'grayscale opacity-75' : ''}" />
          <div class="absolute top-2 left-2 flex gap-1">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs font-mono">${plant.id}</span>
            ${plant.status === 'pending' ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-700 text-white">Chờ duyệt</span>' : ''}
            ${isPlantDisappeared ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-700 text-white">Lịch sử</span>' : ''}
          </div>
          <div class="absolute bottom-2 right-2">
            ${statusBadge}
          </div>
        </div>
        <div class="p-3">
          <h3 class="font-bold text-sm text-stone-900 leading-snug ${isPlantDisappeared ? 'line-through text-stone-500' : ''}">${plant.vietnameseName}</h3>
          <p class="text-xs text-stone-500 italic mb-1.5">${plant.scientificName}</p>
          ${isPlantDisappeared ? `
            <div class="p-1.5 mb-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
              📌 <b>Lưu ý:</b> Đợt giám sát mới nhất ghi nhận cây không còn tại vị trí này.
            </div>
          ` : `
            <p class="text-[11px] text-stone-600 line-clamp-2 mb-2 leading-relaxed">${plant.shortDescription}</p>
          `}
          <div class="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            <span class="truncate max-w-[150px]">📍 ${plant.location.communeSection}</span>
            <button id="btn-view-${plant.id}" class="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-xs">
              Lịch sử & Chi tiết
            </button>
          </div>
        </div>
      `;

      // Bind button click event inside popup
      marker.bindPopup(popupDiv, { maxWidth: 300, minWidth: 260 });
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-${plant.id}`);
        if (btn) {
          btn.onclick = () => onSelectPlant(plant);
        }
      });

      marker.addTo(markersGroup);

      // If this plant is the selected one, pan to it
      if (isSelected && mapInstanceRef.current) {
        mapInstanceRef.current.setView([plant.location.lat, plant.location.lng], 16, { animate: true });
        marker.openPopup();
      }
    });

    // If picking coordinates mode, show picked marker
    if (pickingCoordinatesMode && pickedMarkerCoords && mapInstanceRef.current) {
      const pickIcon = L.divIcon({
        className: 'custom-pick-icon',
        html: `
          <div class="w-8 h-8 -translate-x-4 -translate-y-4 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white animate-bounce">
            📍
          </div>
        `,
        iconSize: [32, 32],
      });
      L.marker([pickedMarkerCoords.lat, pickedMarkerCoords.lng], { icon: pickIcon })
        .bindPopup('<b>Tọa độ mới được chọn</b><br>Bấm vào biểu mẫu để lưu vị trí này.')
        .addTo(markersGroup)
        .openPopup();
    }
  }, [plants, selectedHabitat, selectedConservation, showOnlyVerified, selectedPlantId, pickingCoordinatesMode, pickedMarkerCoords]);

  const [gpsNotification, setGpsNotification] = useState<string | null>(null);

  // Locate User GPS position
  const handleLocateMe = () => {
    setGpsNotification(null);
    if (!navigator.geolocation) {
      setGpsNotification('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingUser(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });

          // Remove old user marker
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }

          const userIcon = L.divIcon({
            className: 'user-gps-marker',
            html: `
              <div class="relative flex items-center justify-center">
                <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon })
            .bindPopup(`<b>Vị trí thực địa của bạn</b><br>Độ chính xác: ±${Math.round(accuracy)}m`)
            .addTo(mapInstanceRef.current);

          userLocationMarkerRef.current = userMarker;
          userMarker.openPopup();
        }
      },
      (error: GeolocationPositionError) => {
        setLocatingUser(false);
        let msg = 'Không thể lấy vị trí GPS.';
        if (error.code === 1) {
          msg = 'Quyền GPS bị chặn hoặc không được cấp phép.';
        } else if (error.code === 2) {
          msg = 'Tín hiệu vị trí hiện không khả dụng.';
        } else if (error.code === 3) {
          msg = 'Hết thời gian chờ phản hồi GPS.';
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

      {/* Floating Filter Bar (Top overlay) - Streamlined & Minimalist */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xl md:max-w-2xl z-10 flex flex-col gap-1.5 pointer-events-none transition-all">
        <div className="pointer-events-auto bg-stone-900/95 backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border border-stone-800/90 shadow-xl text-xs space-y-2">
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
                Lọc Sinh Cảnh & Điểm Thuốc
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[11px] font-semibold font-mono shrink-0">
                {filteredPlantsCount}/{plants.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(selectedHabitat !== 'all' || selectedConservation !== 'all' || showOnlyVerified || showDisappearedHistory) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHabitat('all');
                    setSelectedConservation('all');
                    setShowOnlyVerified(false);
                    setShowDisappearedHistory(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors border border-stone-700"
                  title="Đặt lại toàn bộ bộ lọc về mặc định"
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
                <span>{isFilterExpanded ? 'Thu gọn' : 'Lọc chi tiết'}</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Compact summary bar when collapsed */}
          {!isFilterExpanded && (
            <div className="flex items-center justify-between text-[11px] text-stone-300 pt-1 border-t border-stone-800/80">
              <div className="flex items-center gap-1.5 truncate text-stone-400">
                <span>Đang hiển thị:</span>
                <span className="font-semibold text-emerald-400 truncate">
                  {selectedHabitat === 'all' ? 'Tất cả sinh cảnh' : getHabitatLabel(selectedHabitat)}
                </span>
                {selectedConservation !== 'all' && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300 font-medium">
                      {selectedConservation === 'safe' ? 'An toàn' : selectedConservation === 'vulnerable' ? 'Sắp nguy cấp' : selectedConservation === 'endangered' ? 'Nguy cấp' : 'Điểm mới'}
                    </span>
                  </>
                )}
                {showOnlyVerified && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300">Đã duyệt</span>
                  </>
                )}
                {showDisappearedHistory && (
                  <>
                    <span>•</span>
                    <span className="text-rose-300">Kèm điểm đã mất</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Expanded Filter Panel */}
          {isFilterExpanded && (
            <div className="space-y-2 pt-1 border-t border-stone-800/80 animate-fadeIn">
              {/* Habitat Selection (Compact Pill/Grid) */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1 px-0.5">
                  <span className="font-medium">Sinh cảnh phân bố:</span>
                  <span className="text-emerald-400 text-[10px]">06 loại thực địa</span>
                </div>

                <div 
                  role="radiogroup" 
                  aria-label="Chọn nhóm sinh cảnh"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
                >
                  {/* All option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedHabitat === 'all'}
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
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedHabitat(hab.id)}
                        className={`px-2 py-1.5 rounded-xl text-left flex items-center justify-between gap-1 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-500 shadow-xs ring-1 ring-emerald-400/30 font-semibold'
                            : 'bg-stone-800/80 hover:bg-stone-750 text-stone-300 border-stone-700/80 hover:border-stone-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          {renderHabitatIcon(hab.id)}
                          <span className="text-[11px] truncate">
                            {hab.label}
                          </span>
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

              {/* Conservation status & verified toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800/80 pt-2 text-xs">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  <span className="text-stone-400 text-[11px] font-medium shrink-0 mr-1">Bảo tồn:</span>
                  <button
                    onClick={() => setSelectedConservation('all')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedConservation === 'all' ? 'text-white bg-stone-700 font-semibold border border-stone-600' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setSelectedConservation('safe')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      selectedConservation === 'safe'
                        ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-600 font-semibold'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    🟢 An toàn
                  </button>
                  <button
                    onClick={() => setSelectedConservation('vulnerable')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      selectedConservation === 'vulnerable'
                        ? 'bg-amber-900/90 text-amber-200 border border-amber-600 font-semibold'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    🟡 Sắp nguy cấp
                  </button>
                  <button
                    onClick={() => setSelectedConservation('endangered')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      selectedConservation === 'endangered'
                        ? 'bg-rose-900/90 text-rose-200 border border-rose-600 font-semibold'
                        : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    🔴 Nguy cấp
                  </button>
                  <button
                    onClick={() => setSelectedConservation('pending')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      selectedConservation === 'pending'
                        ? 'bg-purple-900/90 text-purple-200 border border-purple-600 font-semibold'
                        : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    🟣 Điểm mới
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-stone-300 shrink-0 bg-stone-800/80 px-2 py-1 rounded-lg border border-stone-700 hover:bg-stone-750 transition-colors">
                    <input
                      type="checkbox"
                      checked={showOnlyVerified}
                      onChange={(e) => setShowOnlyVerified(e.target.checked)}
                      className="rounded border-stone-600 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 bg-stone-900"
                    />
                    <span>Đã kiểm duyệt</span>
                  </label>

                  {disappearedCount > 0 && (
                    <label 
                      className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] shrink-0 px-2 py-1 rounded-lg border transition-colors ${
                        showDisappearedHistory 
                          ? 'bg-rose-950/80 text-rose-200 border-rose-700' 
                          : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-stone-300'
                      }`}
                      title="Bật để xem lại các điểm khảo sát trong lịch sử nay cây đã biến mất"
                    >
                      <input
                        type="checkbox"
                        checked={showDisappearedHistory}
                        onChange={(e) => setShowDisappearedHistory(e.target.checked)}
                        className="rounded border-stone-600 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 bg-stone-900"
                      />
                      <span>Điểm đã mất ({disappearedCount})</span>
                    </label>
                  )}
                </div>
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
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-emerald-700"
          title="Định vị vị trí hiện tại ngoài thực địa (GPS)"
        >
          <Navigation className={`w-5 h-5 ${locatingUser ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Center on Tam Anh */}
        <button
          onClick={handleCenterTamAnh}
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Đưa về tâm xã Tam Anh"
        >
          <Compass className="w-5 h-5 text-emerald-700" />
        </button>

        {/* Toggle Tile Layer: Standard / Topo */}
        <button
          onClick={() => setMapTileLayer(mapTileLayer === 'osm' ? 'topo' : 'osm')}
          className="w-11 h-11 rounded-xl bg-white text-stone-800 hover:bg-stone-50 border border-stone-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          title="Chuyển đổi lớp bản đồ (Địa hình / Đường sá)"
        >
          <Layers className="w-5 h-5 text-stone-700" />
        </button>
      </div>

      {/* Map Legend (Bottom left) */}
      <div className="absolute bottom-4 left-3 z-10 hidden sm:block bg-stone-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-stone-800 shadow-xl text-stone-200 text-xs max-w-xs">
        <h4 className="font-semibold text-stone-300 text-[11px] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-400" /> Chú giải điểm khảo sát
        </h4>
        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block shrink-0"></span>
            <span className="truncate">An toàn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600 border border-white inline-block shrink-0"></span>
            <span className="truncate">Sắp nguy cấp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-white inline-block shrink-0"></span>
            <span className="truncate">Nguy cấp / Cần bảo tồn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 border border-white inline-block shrink-0"></span>
            <span className="truncate">Điểm mới (chờ duyệt)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
