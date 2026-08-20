import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MedicinalPlant, 
  HabitatCategory, 
  ConservationLevel 
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
  CheckCircle2
} from 'lucide-react';

interface HerbMapProps {
  plants: MedicinalPlant[];
  onSelectPlant: (plant: MedicinalPlant) => void;
  selectedPlantId?: string | null;
  pickingCoordinatesMode?: boolean;
  onCoordinatesPicked?: (lat: number, lng: number) => void;
}

export const HerbMap: React.FC<HerbMapProps> = ({
  plants,
  onSelectPlant,
  selectedPlantId,
  pickingCoordinatesMode = false,
  onCoordinatesPicked,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Filters inside map view
  const [selectedHabitat, setSelectedHabitat] = useState<'all' | HabitatCategory>('all');
  const [selectedConservation, setSelectedConservation] = useState<'all' | ConservationLevel>('all');
  const [showOnlyVerified, setShowOnlyVerified] = useState<boolean>(false);
  const [mapTileLayer, setMapTileLayer] = useState<'osm' | 'topo'>('osm');
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedMarkerCoords, setPickedMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);

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

    // Handle map click for coordinate picking
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingCoordinatesMode && onCoordinatesPicked) {
        onCoordinatesPicked(e.latlng.lat, e.latlng.lng);
        setPickedMarkerCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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
    let bgColor = 'bg-emerald-600';
    let borderColor = 'border-white';
    let ringColor = 'ring-emerald-400/50';

    if (plant.conservationLevel === 'endangered') {
      bgColor = 'bg-rose-600';
      ringColor = 'ring-rose-400/50';
    } else if (plant.conservationLevel === 'rare' || plant.conservationLevel === 'vulnerable') {
      bgColor = 'bg-amber-600';
      ringColor = 'ring-amber-400/50';
    }

    if (plant.status === 'pending') {
      bgColor = 'bg-purple-600';
      ringColor = 'ring-purple-400/50';
    }

    const sizeClass = isSelected ? 'w-10 h-10 -translate-x-5 -translate-y-5 ring-4' : 'w-8 h-8 -translate-x-4 -translate-y-4';

    const html = `
      <div class="relative group cursor-pointer">
        <div class="${sizeClass} ${bgColor} ${ringColor} ${borderColor} rounded-full border-2 shadow-lg flex items-center justify-center text-white transition-all transform hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        ${plant.status === 'pending' ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 border border-white rounded-full"></span>' : ''}
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

    // Filter plants
    const filteredPlants = plants.filter((plant) => {
      if (selectedHabitat !== 'all' && plant.habitatCategory !== selectedHabitat) return false;
      if (selectedConservation !== 'all' && plant.conservationLevel !== selectedConservation) return false;
      if (showOnlyVerified && plant.status !== 'verified') return false;
      return true;
    });

    filteredPlants.forEach((plant) => {
      const isSelected = selectedPlantId === plant.id;
      const icon = createHerbIcon(plant, isSelected);

      const marker = L.marker([plant.location.lat, plant.location.lng], { icon });

      // Create Custom Popup
      const popupDiv = document.createElement('div');
      popupDiv.className = 'w-64 sm:w-72 overflow-hidden rounded-xl bg-white font-sans text-stone-800 shadow-md';

      let statusBadge = plant.conservationStatus === 'Nguy cấp (Cần bảo tồn)'
        ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Nguy cấp</span>'
        : plant.conservationStatus === 'Sắp bị đe dọa'
        ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Sắp nguy cấp</span>'
        : '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Bình thường</span>';

      popupDiv.innerHTML = `
        <div class="relative h-28 w-full overflow-hidden bg-stone-100">
          <img src="${plant.coverImage}" alt="${plant.vietnameseName}" class="w-full h-full object-cover" />
          <div class="absolute top-2 left-2 flex gap-1">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs font-mono">${plant.id}</span>
            ${plant.status === 'pending' ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-700 text-white">Chờ duyệt</span>' : ''}
          </div>
          <div class="absolute bottom-2 right-2">
            ${statusBadge}
          </div>
        </div>
        <div class="p-3">
          <h3 class="font-bold text-sm text-stone-900 leading-snug">${plant.vietnameseName}</h3>
          <p class="text-xs text-stone-500 italic mb-1.5">${plant.scientificName}</p>
          <p class="text-[11px] text-stone-600 line-clamp-2 mb-2 leading-relaxed">${plant.shortDescription}</p>
          <div class="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            <span class="truncate max-w-[150px]">📍 ${plant.location.communeSection}</span>
            <button id="btn-view-${plant.id}" class="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-xs">
              Chi tiết & QR
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-indigo-900/90 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full shadow-xl border border-indigo-700 flex items-center gap-2 animate-pulse">
          <span>📍 Bấm vào một vị trí trên bản đồ để chọn tọa độ GPS thực địa</span>
        </div>
      )}

      {/* GPS Notice toast */}
      {gpsNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-stone-900/95 backdrop-blur-md text-amber-300 text-xs px-4 py-2 rounded-xl shadow-xl border border-amber-800/80 flex items-center gap-2">
          <span>⚠️ {gpsNotification}</span>
        </div>
      )}

      {/* Floating Filter Bar (Top overlay) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xl z-10 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-stone-900/85 backdrop-blur-md p-2 rounded-2xl border border-stone-800 shadow-xl text-xs space-y-2">
          {/* Habitat filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-stone-400 text-[11px] font-medium shrink-0 flex items-center gap-1 pl-1">
              <Filter className="w-3 h-3 text-emerald-400" /> Sinh cảnh:
            </span>
            <button
              onClick={() => setSelectedHabitat('all')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedHabitat === 'all'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedHabitat('forest')}
              className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedHabitat === 'forest'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <TreePine className="w-3 h-3 text-emerald-400" /> Rừng thứ sinh
            </button>
            <button
              onClick={() => setSelectedHabitat('garden')}
              className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedHabitat === 'garden'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Home className="w-3 h-3 text-teal-400" /> Vườn & bờ rào
            </button>
            <button
              onClick={() => setSelectedHabitat('hill')}
              className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedHabitat === 'hill'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Mountain className="w-3 h-3 text-amber-400" /> Gò đồi
            </button>
            <button
              onClick={() => setSelectedHabitat('stream')}
              className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedHabitat === 'stream'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Droplets className="w-3 h-3 text-cyan-400" /> Ven suối
            </button>
            <button
              onClick={() => setSelectedHabitat('red')}
              className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedHabitat === 'red'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <Mountain className="w-3 h-3 text-red-400" /> Đất đỏ
            </button>
          </div>

          {/* Conservation status & verified toggle */}
          <div className="flex items-center justify-between gap-2 border-t border-stone-800 pt-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setSelectedConservation('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  selectedConservation === 'all' ? 'text-white bg-stone-700' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Mọi trạng thái
              </button>
              <button
                onClick={() => setSelectedConservation('endangered')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                  selectedConservation === 'endangered'
                    ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                🔴 Nguy cấp
              </button>
              <button
                onClick={() => setSelectedConservation('vulnerable')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                  selectedConservation === 'vulnerable'
                    ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                🟡 Cần bảo tồn
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-stone-300 shrink-0">
              <input
                type="checkbox"
                checked={showOnlyVerified}
                onChange={(e) => setShowOnlyVerified(e.target.checked)}
                className="rounded border-stone-700 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 bg-stone-800"
              />
              <span>Đã xác nhận</span>
            </label>
          </div>
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
      <div className="absolute bottom-4 left-3 z-10 hidden sm:block bg-stone-900/90 backdrop-blur-md p-3 rounded-2xl border border-stone-800 shadow-xl text-stone-200 text-xs max-w-xs">
        <h4 className="font-semibold text-stone-300 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-400" /> Chú giải điểm khảo sát
        </h4>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block"></span>
            <span>Ít quan tâm (An toàn)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600 border border-white inline-block"></span>
            <span>Sắp nguy cấp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-white inline-block"></span>
            <span>Nguy cấp / Cần bảo tồn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 border border-white inline-block"></span>
            <span>Điểm mới (Chờ duyệt)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
