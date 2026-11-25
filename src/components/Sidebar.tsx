import React from 'react';
import {
  Building2,
  CalendarClock,
  FileInput,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MessageSquareShare,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ActiveNavSection, UserProfile } from '../types/agenda';
import { getCapabilities, ROLE_META } from '../utils/rbac';
import { BpbdEmblem } from './BpbdEmblem';

interface SidebarProps {
  currentUser: UserProfile;
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  conflictCountToday: number;
  updateCountToday: number;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
  conflictCountToday,
  updateCountToday,
  onLogout,
}) => {
  const caps = getCapabilities(currentUser.roleCode);

  const navItems: {
    id: ActiveNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    visible: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Agenda',
      icon: LayoutDashboard,
      visible: caps.canViewExecutiveDashboard,
    },
    {
      id: 'input-ebuddy',
      label: 'Input Surat / e-Buddy',
      icon: FileInput,
      visible: caps.canCreateAgenda,
    },
    {
      id: 'kalender-linimasa',
      label: 'Kalender & Linimasa',
      icon: CalendarClock,
      visible: true,
    },
    {
      id: 'rekap-harian',
      label: 'Rekap Agenda Per Hari',
      icon: FileSpreadsheet,
      visible: true,
    },
    {
      id: 'rekap-wa',
      label: caps.canBroadcastWA
        ? 'Rekap & Broadcast WA'
        : 'Poster Agenda WA',
      icon: MessageSquareShare,
      visible: true,
    },
    {
      id: 'master-data',
      label: 'Master Unit & Lokasi',
      icon: Building2,
      visible: caps.canManageMasterData,
    },
    {
      id: 'super-admin',
      label: caps.canManageUsers
        ? 'Super Admin & Pengguna'
        : 'Audit Log Keamanan',
      icon: ShieldCheck,
      visible: caps.canManageUsers || caps.canViewAuditLog,
    },
  ];

  const handleSelect = (id: ActiveNavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 bg-[#0F294A] text-slate-100 flex flex-col border-r border-[#1B3B66] transition-transform duration-200 ease-out lg:static lg:translate-x-0 shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1E3F6D]">
          <div className="flex items-center gap-3 min-w-0">
            <BpbdEmblem className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-white truncate">
                SIAGA AGENDA BPBD
              </div>
              <div className="text-xs text-sky-200/80 truncate">
                Kabupaten Sidoarjo
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-md focus-visible:outline-2 focus-visible:outline-sky-400"
            aria-label="Tutup menu navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
          aria-label="Menu Utama"
        >
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const showNoticeCount =
                item.id === 'dashboard' && conflictCountToday > 0
                  ? conflictCountToday
                  : item.id === 'rekap-wa' && updateCountToday > 0
                    ? updateCountToday
                    : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    isActive
                      ? 'bg-[#1A4376] text-white'
                      : 'text-slate-300 hover:bg-[#16365E] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-sky-300' : 'text-slate-400'
                      }`}
                      strokeWidth={1.9}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {showNoticeCount > 0 && (
                    <span
                      className={`text-xs font-mono tabular-nums shrink-0 ${
                        item.id === 'dashboard'
                          ? 'text-red-300 font-semibold'
                          : 'text-amber-300 font-semibold'
                      }`}
                    >
                      {showNoticeCount}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Active User Profile & Logout */}
        <div className="px-4 py-4 border-t border-[#1E3F6D] space-y-3 text-xs">
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">
              {currentUser.namaLengkap}
            </div>
            <div className="text-sky-300 font-medium mt-0.5 truncate">
              {ROLE_META[currentUser.roleCode].shortLabel} ·{' '}
              {currentUser.unitKerja}
            </div>
            <div className="text-slate-400 font-mono tabular-nums mt-0.5 truncate">
              NIP {currentUser.nip}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100 bg-[#16365E] hover:bg-red-700/80 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
