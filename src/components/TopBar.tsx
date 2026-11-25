import React from 'react';
import { Calendar, Clock, Menu, Plus } from 'lucide-react';
import { ActiveNavSection, UserProfile } from '../types/agenda';
import { formatTanggalIndonesia } from '../utils/agendaHelpers';
import { getCapabilities, ROLE_META } from '../utils/rbac';

interface TopBarProps {
  currentUser: UserProfile;
  activeSection: ActiveNavSection;
  selectedDate: string;
  currentTimeWIB: string;
  useSimulatedTime: boolean;
  onToggleSimulatedTime: () => void;
  onOpenMobileMenu: () => void;
  onQuickAdd: () => void;
}

const SECTION_TITLES: Record<ActiveNavSection, string> = {
  dashboard: 'Dashboard Agenda',
  'input-ebuddy': 'Input Surat / e-Buddy',
  'kalender-linimasa': 'Kalender & Linimasa WIB',
  'rekap-harian': 'Rekap Agenda Per Hari',
  'rekap-wa': 'Rekap & Broadcast WhatsApp',
  'master-data': 'Master Unit & Lokasi Sidoarjo',
  'super-admin': 'Super Admin · Akun & Audit Log',
};

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeSection,
  selectedDate,
  currentTimeWIB,
  useSimulatedTime,
  onToggleSimulatedTime,
  onOpenMobileMenu,
  onQuickAdd,
}) => {
  const caps = getCapabilities(currentUser.roleCode);

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 text-sm">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">
            BPBD Kab. Sidoarjo
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-semibold text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTanggalIndonesia(selectedDate)}</span>
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={onToggleSimulatedTime}
            title="Klik untuk beralih antara jam simulasi operasional (08:15 WIB) dan jam WIB saat ini"
            className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-700 hover:text-sky-700 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-600 rounded"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>{currentTimeWIB} WIB</span>
            <span className="text-slate-400 font-sans">
              ({useSimulatedTime ? 'Simulasi Pagi' : 'Real-Time'})
            </span>
          </button>
        </div>

        {caps.canCreateAgenda &&
        activeSection !== 'rekap-wa' &&
        activeSection !== 'input-ebuddy' &&
        activeSection !== 'rekap-harian' ? (
          <button
            type="button"
            onClick={onQuickAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F294A] hover:bg-[#163A66] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Input Agenda</span>
          </button>
        ) : (
          <div className="text-xs font-semibold text-sky-800 whitespace-nowrap shrink-0">
            {ROLE_META[currentUser.roleCode].shortLabel}
          </div>
        )}
      </div>
    </header>
  );
};
