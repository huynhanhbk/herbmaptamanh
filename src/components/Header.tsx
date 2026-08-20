import React, { useState } from 'react';
import { 
  Compass, 
  ListFilter, 
  BarChart3, 
  PlusCircle, 
  Sparkles, 
  QrCode, 
  Lock, 
  Unlock, 
  Search, 
  Menu, 
  X,
  Leaf,
  Info,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'catalog' | 'dashboard' | 'admin';
  setActiveTab: (tab: 'map' | 'catalog' | 'dashboard' | 'admin') => void;
  onOpenAIScanner: () => void;
  onOpenQRScanner: () => void;
  onOpenNewSurvey: () => void;
  onOpenAbout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  totalPlantsCount: number;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAIScanner,
  onOpenQRScanner,
  onOpenNewSurvey,
  onOpenAbout,
  searchQuery,
  setSearchQuery,
  isAdmin,
  onOpenAdminLogin,
  onLogoutAdmin,
  totalPlantsCount,
  pendingCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800/90 text-stone-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* ================= ZONE 1: BRAND LOGO & TITLE ================= */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
            onClick={() => setActiveTab('map')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-950/50 group-hover:scale-105 transition-transform duration-200">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1">
                  HerbMap <span className="text-emerald-400 font-extrabold">Tam Anh</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 hidden sm:inline-block">
                  KHKT 2026
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-400 font-medium tracking-tight mt-1 hidden md:block">
                Bản đồ số & CSDL Dược liệu Dân gian Bảo tồn
              </p>
            </div>
          </div>

          {/* ================= ZONE 2: PRIMARY NAVIGATION TABS (DESKTOP) ================= */}
          <nav className="hidden md:flex items-center bg-stone-950/60 p-1 rounded-xl border border-stone-800 shadow-inner">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Bản đồ số</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Danh lục ({totalPlantsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-300 hover:text-amber-100 hover:bg-amber-950/40'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản trị</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* ================= ZONE 3: ACTIONS & TOOLS ================= */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Quick Search bar (Desktop) */}
            <div className="hidden xl:flex items-center relative w-48 2xl:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm cây thuốc..."
                className="w-full bg-stone-950/70 hover:bg-stone-950 text-xs text-stone-100 pl-8 pr-7 py-1.5 rounded-xl border border-stone-800 focus:outline-none focus:border-emerald-500 placeholder-stone-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-stone-400 hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* AI Identifier Trigger - Distinctive Highlight */}
            <button
              onClick={onOpenAIScanner}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all hover:scale-[1.02] active:scale-95 border border-emerald-400/30"
              title="Nhận diện loài cây bằng AI (Ảnh chụp lá, hoa, quả)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline">Nhận diện AI</span>
              <span className="sm:hidden text-[11px]">AI</span>
            </button>

            {/* Field Tool: QR Scanner */}
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 bg-stone-800/90 hover:bg-stone-700/90 text-stone-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border border-stone-700/80 transition-colors"
              title="Quét mã QR tại biển cây thuốc thực địa"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Quét QR</span>
            </button>

            {/* Field Tool: New Survey Entry */}
            <button
              onClick={onOpenNewSurvey}
              className="flex items-center gap-1.5 bg-stone-800/90 hover:bg-stone-700/90 text-stone-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border border-stone-700/80 transition-colors"
              title="Ghi nhận điểm cây thuốc mới ngoài thực địa"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline">Khảo sát</span>
            </button>

            {/* About Project Modal Trigger */}
            <button
              onClick={onOpenAbout}
              className="p-1.5 text-stone-400 hover:text-emerald-300 rounded-xl hover:bg-stone-800 transition-colors hidden sm:flex items-center justify-center border border-transparent hover:border-stone-700"
              title="Về đề tài KHKT HerbMap Tam Anh"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Admin Lock / Unlock Button */}
            {!isAdmin ? (
              <button
                onClick={onOpenAdminLogin}
                className="p-1.5 text-stone-400 hover:text-amber-400 rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center border border-transparent hover:border-stone-700"
                title="Đăng nhập Ban Quản trị / Giám khảo"
              >
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onLogoutAdmin}
                className="p-1.5 text-amber-400 hover:text-stone-300 rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center border border-amber-800/50 bg-amber-950/40"
                title="Đang ở chế độ Quản trị (Bấm để đăng xuất)"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpenMobile(!isSearchOpenMobile)}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-xl hover:bg-stone-800 transition-colors xl:hidden"
              title="Tìm kiếm cây thuốc"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-stone-300 hover:text-white rounded-xl hover:bg-stone-800 transition-colors md:hidden"
              aria-label="Mở menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        {isSearchOpenMobile && (
          <div className="xl:hidden py-2 px-1 border-t border-stone-800/80 animate-fadeIn">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên cây thuốc, họ thực vật, công dụng..."
                className="w-full bg-stone-950 text-xs text-stone-100 pl-9 pr-8 py-2 rounded-xl border border-stone-700 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Expanded Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-1 border-t border-stone-800/80 space-y-3 animate-fadeIn">
            {/* Navigation Buttons Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('map');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'map' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-800 text-stone-300'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Bản đồ số</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('catalog');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'catalog' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-800 text-stone-300'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>Danh lục ({totalPlantsCount})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-800 text-stone-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Thống kê bảo tồn</span>
              </button>

              <button
                onClick={() => {
                  onOpenAbout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold bg-stone-800 text-stone-300 hover:text-white"
              >
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Về đề tài KHKT</span>
              </button>
            </div>

            {/* Quick Field Tools row */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/60">
              <button
                onClick={() => {
                  onOpenQRScanner();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-800 text-xs font-medium text-stone-300 hover:bg-stone-700"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Quét mã QR</span>
              </button>

              <button
                onClick={() => {
                  onOpenNewSurvey();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-800 text-xs font-medium text-stone-300 hover:bg-stone-700"
              >
                <PlusCircle className="w-4 h-4 text-teal-400" />
                <span>Khảo sát thực địa</span>
              </button>
            </div>

            {/* Admin view for mobile */}
            {isAdmin && (
              <div className="pt-2 border-t border-stone-800/60">
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold ${
                    activeTab === 'admin' ? 'bg-amber-600 text-white' : 'bg-amber-950/40 text-amber-300 border border-amber-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Trang Quản trị & Duyệt phiếu</span>
                  </div>
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {pendingCount} chờ duyệt
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

