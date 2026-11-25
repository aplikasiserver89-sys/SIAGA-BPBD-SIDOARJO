import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgendaDetailModal } from './components/AgendaDetailModal';
import { BroadcastReprintView } from './components/BroadcastReprintView';
import { CalendarTimelineView } from './components/CalendarTimelineView';
import {
  AgendaDraftPrefill,
  CreateAgendaModal,
} from './components/CreateAgendaModal';
import { DashboardView } from './components/DashboardView';
import { DailyReportView } from './components/DailyReportView';
import { InputEBuddyView } from './components/InputEBuddyView';
import { LoginView } from './components/LoginView';
import { MasterDataView } from './components/MasterDataView';
import { Sidebar } from './components/Sidebar';
import { SuperAdminView } from './components/SuperAdminView';
import { TopBar } from './components/TopBar';
import { DEFAULT_DATE } from './data/initialData';
import {
  ActiveNavSection,
  AgendaItem,
  AgendaStatus,
  AuditLogEntry,
  MasterLocation,
  MasterUnit,
  RoleCode,
  UserProfile,
} from './types/agenda';
import { detectConflictsForDate, timeToMinutes } from './utils/agendaHelpers';
import { getCapabilities, ROLE_META } from './utils/rbac';

function getRealWIBTimeString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date()).replace('.', ':');
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  }
}

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [requiresBootstrap, setRequiresBootstrap] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [activeSection, setActiveSection] =
    useState<ActiveNavSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [units, setUnits] = useState<MasterUnit[]>([]);
  const [locations, setLocations] = useState<MasterLocation[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DATE);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPrefill, setCreatePrefill] =
    useState<AgendaDraftPrefill | null>(null);

  const [inspectingItemId, setInspectingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [useSimulatedTime, setUseSimulatedTime] = useState(true);
  const [realTimeWIB, setRealTimeWIB] = useState<string>(() =>
    getRealWIBTimeString()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setRealTimeWIB(getRealWIBTimeString());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    setAuthChecking(true);
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setRequiresBootstrap(Boolean(data.requiresBootstrap));
    } catch {
      setRequiresBootstrap(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus]);

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (init?.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401) {
        setAuthToken(null);
        setCurrentUser(null);
      }
      return res;
    },
    [authToken]
  );

  const loadProtectedData = useCallback(
    async (token: string, user: UserProfile) => {
      const headers = { Authorization: `Bearer ${token}` };
      const caps = getCapabilities(user.roleCode);

      try {
        const res = await fetch('/api/bootstrap-data', { headers });
        if (res.ok) {
          const data = await res.json();
          setAgendas(data.agendas || []);
          setUnits(data.units || []);
          setLocations(data.locations || []);
        }

        if (caps.canManageUsers) {
          const usersRes = await fetch('/api/users', { headers });
          if (usersRes.ok) {
            const uData = await usersRes.json();
            setUsersList(uData.users || []);
          }
        } else {
          setUsersList([]);
        }

        if (caps.canViewAuditLog) {
          const logsRes = await fetch('/api/audit-logs', { headers });
          if (logsRes.ok) {
            const lData = await logsRes.json();
            setAuditLogs(lData.logs || []);
          }
        } else {
          setAuditLogs([]);
        }
      } catch {
        setActionError('Gagal memuat data operasional dari server.');
      }
    },
    []
  );

  const handleAuthenticated = async (token: string, user: UserProfile) => {
    setAuthToken(token);
    setCurrentUser(user);
    setRequiresBootstrap(false);
    setActionError(null);
    setActiveSection(ROLE_META[user.roleCode].landingSection);
    await loadProtectedData(token, user);
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      setAgendas([]);
      setUsersList([]);
      setAuditLogs([]);
      void checkAuthStatus();
    }
  };

  const refreshAdminData = useCallback(async () => {
    if (!authToken || !currentUser) return;
    await loadProtectedData(authToken, currentUser);
  }, [authToken, currentUser, loadProtectedData]);

  const openCreateAgendaModal = (prefill?: AgendaDraftPrefill) => {
    setCreatePrefill(prefill || null);
    setIsCreateModalOpen(true);
  };

  const handleAddAgenda = async (newItem: AgendaItem) => {
    setActionError(null);
    const res = await apiFetch('/api/agendas', {
      method: 'POST',
      body: JSON.stringify(newItem),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Gagal menyimpan agenda baru.');
      return;
    }
    setAgendas((prev) => [...prev, data.agenda]);
    setSelectedDate(data.agenda.tanggal);
  };

  const handleSaveEditedAgenda = async (updated: AgendaItem) => {
    setActionError(null);
    const res = await apiFetch(`/api/agendas/${updated.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Gagal menyimpan perubahan agenda.');
      return;
    }
    setAgendas((prev) =>
      prev.map((item) => (item.id === updated.id ? data.agenda : item))
    );
  };

  const handleDeleteAgenda = async (id: string) => {
    setActionError(null);
    const res = await apiFetch(`/api/agendas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || 'Gagal menghapus agenda.');
      return;
    }
    setAgendas((prev) => prev.filter((item) => item.id !== id));
  };

  const handleQuickStatusChange = async (id: string, status: AgendaStatus) => {
    setActionError(null);
    const res = await apiFetch(`/api/agendas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || 'Gagal memperbarui status agenda.');
      return;
    }
    setAgendas((prev) =>
      prev.map((item) => (item.id === id ? data.agenda : item))
    );
  };

  const handleAddUnit = async (u: MasterUnit) => {
    const res = await apiFetch('/api/units', {
      method: 'POST',
      body: JSON.stringify(u),
    });
    if (res.ok) {
      const data = await res.json();
      setUnits((prev) => [...prev, data.unit]);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    const res = await apiFetch(`/api/units/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUnits((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleAddLocation = async (loc: MasterLocation) => {
    const res = await apiFetch('/api/locations', {
      method: 'POST',
      body: JSON.stringify(loc),
    });
    if (res.ok) {
      const data = await res.json();
      setLocations((prev) => [...prev, data.location]);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    const res = await apiFetch(`/api/locations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLocations((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleCreateUser = async (payload: {
    nip: string;
    username: string;
    namaLengkap: string;
    jabatan: string;
    roleCode: RoleCode;
    unitKerja: string;
    password: string;
  }) => {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    await refreshAdminData();
    return { ok: true };
  };

  const handleUpdateUser = async (
    userId: string,
    payload: {
      namaLengkap?: string;
      jabatan?: string;
      roleCode?: RoleCode;
      unitKerja?: string;
      isActive?: boolean;
      newPassword?: string;
    }
  ) => {
    const res = await apiFetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    await refreshAdminData();
    return { ok: true };
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    await refreshAdminData();
    return { ok: true };
  };

  const currentTimeWIB = useSimulatedTime ? '08:15' : realTimeWIB;
  const currentMinutesWIB = useMemo(
    () => timeToMinutes(currentTimeWIB),
    [currentTimeWIB]
  );

  const conflictsMap = useMemo(
    () => detectConflictsForDate(agendas, selectedDate),
    [agendas, selectedDate]
  );

  const conflictCountToday = useMemo(
    () =>
      Array.from(conflictsMap.values()).filter((c) => c.severity === 'tinggi')
        .length,
    [conflictsMap]
  );

  const updateCountToday = useMemo(
    () =>
      agendas.filter(
        (a) => a.tanggal === selectedDate && a.status === 'Update / Baru'
      ).length,
    [agendas, selectedDate]
  );

  const inspectingItem = useMemo(
    () => agendas.find((a) => a.id === inspectingItemId) || null,
    [agendas, inspectingItemId]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-600">
        Memeriksa status keamanan sistem SIAGA BPBD Sidoarjo...
      </div>
    );
  }

  if (!currentUser || !authToken) {
    return (
      <LoginView
        requiresBootstrap={requiresBootstrap}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const caps = getCapabilities(currentUser.roleCode);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        currentUser={currentUser}
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          if (section === 'super-admin') {
            void refreshAdminData();
          }
        }}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        conflictCountToday={conflictCountToday}
        updateCountToday={updateCountToday}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentUser={currentUser}
          activeSection={activeSection}
          selectedDate={selectedDate}
          currentTimeWIB={currentTimeWIB}
          useSimulatedTime={useSimulatedTime}
          onToggleSimulatedTime={() => setUseSimulatedTime((prev) => !prev)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onQuickAdd={() => openCreateAgendaModal()}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-4">
          {actionError && (
            <div className="no-print p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-center justify-between gap-2">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-xs font-semibold text-red-700 hover:underline"
              >
                Tutup
              </button>
            </div>
          )}

          {activeSection === 'dashboard' && caps.canViewExecutiveDashboard && (
            <DashboardView
              currentUser={currentUser}
              agendas={agendas}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              conflictsMap={conflictsMap}
              currentMinutesWIB={currentMinutesWIB}
              units={units}
              onInspectItem={(item) => setInspectingItemId(item.id)}
              onQuickStatusChange={handleQuickStatusChange}
              onNavigateToInput={() => setActiveSection('input-ebuddy')}
              onNavigateToBroadcast={() => setActiveSection('rekap-wa')}
            />
          )}

          {activeSection === 'input-ebuddy' && caps.canCreateAgenda && (
            <InputEBuddyView
              defaultDate={selectedDate}
              units={units}
              onOpenCreateModal={(prefill) => openCreateAgendaModal(prefill)}
            />
          )}

          {activeSection === 'kalender-linimasa' && (
            <CalendarTimelineView
              agendas={agendas}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              conflictsMap={conflictsMap}
              onInspectItem={(item) => setInspectingItemId(item.id)}
              onQuickAddAtHour={(hour) =>
                openCreateAgendaModal({ tanggal: selectedDate, jamMulai: hour })
              }
              canCreateAgenda={caps.canCreateAgenda}
            />
          )}

          {activeSection === 'rekap-harian' && (
            <DailyReportView
              agendas={agendas}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              conflictsMap={conflictsMap}
              units={units}
              onInspectItem={(item) => setInspectingItemId(item.id)}
            />
          )}

          {activeSection === 'rekap-wa' && (
            <BroadcastReprintView
              currentUser={currentUser}
              agendas={agendas}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              conflictsMap={conflictsMap}
            />
          )}

          {activeSection === 'master-data' && caps.canManageMasterData && (
            <MasterDataView
              units={units}
              locations={locations}
              onAddUnit={handleAddUnit}
              onDeleteUnit={handleDeleteUnit}
              onAddLocation={handleAddLocation}
              onDeleteLocation={handleDeleteLocation}
            />
          )}

          {activeSection === 'super-admin' &&
            (caps.canManageUsers || caps.canViewAuditLog) && (
              <SuperAdminView
                currentUser={currentUser}
                users={usersList}
                auditLogs={auditLogs}
                units={units}
                onRefreshAdminData={refreshAdminData}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
        </main>
      </div>

      <CreateAgendaModal
        isOpen={isCreateModalOpen}
        defaultDate={selectedDate}
        prefill={createPrefill}
        existingAgendas={agendas}
        units={units}
        locations={locations}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreatePrefill(null);
        }}
        onSubmitAgenda={handleAddAgenda}
      />

      <AgendaDetailModal
        currentUser={currentUser}
        item={inspectingItem}
        allItems={agendas}
        conflict={
          inspectingItem ? conflictsMap.get(inspectingItem.id) : undefined
        }
        units={units}
        locations={locations}
        onClose={() => setInspectingItemId(null)}
        onSave={handleSaveEditedAgenda}
        onDelete={handleDeleteAgenda}
      />
    </div>
  );
}
