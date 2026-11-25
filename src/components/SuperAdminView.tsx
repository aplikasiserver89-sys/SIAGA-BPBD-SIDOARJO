import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Plus,
  RefreshCw,
  ScrollText,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  AuditLogEntry,
  MasterUnit,
  RoleCode,
  UserProfile,
} from '../types/agenda';
import { ROLE_META } from '../utils/rbac';

interface SuperAdminViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  auditLogs: AuditLogEntry[];
  units: MasterUnit[];
  onRefreshAdminData: () => Promise<void>;
  onCreateUser: (payload: {
    nip: string;
    username: string;
    namaLengkap: string;
    jabatan: string;
    roleCode: RoleCode;
    unitKerja: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateUser: (
    userId: string,
    payload: {
      namaLengkap?: string;
      jabatan?: string;
      roleCode?: RoleCode;
      unitKerja?: string;
      isActive?: boolean;
      newPassword?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>;
}

const ROLE_LIST: RoleCode[] = [
  'SUPER_ADMIN',
  'ADMIN_SISTEM',
  'OPERATOR_UMUM',
  'PIMPINAN',
  'KABID_UNIT',
  'PEGAWAI_VIEWER',
];

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentUser,
  users,
  auditLogs,
  units,
  onRefreshAdminData,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const canManageUsers =
    currentUser.roleCode === 'SUPER_ADMIN' ||
    currentUser.roleCode === 'ADMIN_SISTEM';

  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'matrix'>(
    canManageUsers ? 'users' : 'audit'
  );

  // Create User Form
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [roleCode, setRoleCode] = useState<RoleCode>('OPERATOR_UMUM');
  const [unitKerja, setUnitKerja] = useState('Sekretariat BPBD');
  const [password, setPassword] = useState('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editRole, setEditRole] = useState<RoleCode>('OPERATOR_UMUM');
  const [editUnit, setEditUnit] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');

  // Audit Filter
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unitOptions = useMemo(() => {
    const base = new Set<string>([
      'Sekretariat BPBD',
      'Pimpinan BPBD',
      'Bid. Damkarmat',
      'Bid. PK',
      'Bid. KL',
      'Bid. RR',
    ]);
    units.forEach((u) => base.add(u.nama));
    return Array.from(base);
  }, [units]);

  const filteredLogs = useMemo(() => {
    if (eventFilter === 'ALL') return auditLogs;
    return auditLogs.filter((l) => l.event === eventFilter);
  }, [auditLogs, eventFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await onCreateUser({
      nip: nip.trim(),
      username: username.trim() || nip.trim(),
      namaLengkap: namaLengkap.trim(),
      jabatan: jabatan.trim() || '-',
      roleCode,
      unitKerja,
      password,
    });
    if (res.ok) {
      setFeedback({
        type: 'success',
        message: `Akun "${namaLengkap}" (${ROLE_META[roleCode].label}) berhasil dibuat.`,
      });
      setNip('');
      setUsername('');
      setNamaLengkap('');
      setJabatan('');
      setPassword('');
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Gagal membuat akun pengguna.',
      });
    }
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEditNama(u.namaLengkap);
    setEditJabatan(u.jabatan);
    setEditRole(u.roleCode);
    setEditUnit(u.unitKerja);
    setEditNewPassword('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFeedback(null);
    const res = await onUpdateUser(editingUser.id, {
      namaLengkap: editNama.trim(),
      jabatan: editJabatan.trim(),
      roleCode: editRole,
      unitKerja: editUnit,
      newPassword: editNewPassword.length >= 6 ? editNewPassword : undefined,
    });
    if (res.ok) {
      setFeedback({
        type: 'success',
        message: `Perubahan akun "${editNama}" berhasil disimpan.`,
      });
      setEditingUser(null);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Gagal memperbarui akun.',
      });
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    setFeedback(null);
    const res = await onUpdateUser(u.id, { isActive: !u.isActive });
    if (!res.ok) {
      setFeedback({
        type: 'error',
        message: res.error || 'Gagal mengubah status akun.',
      });
    } else {
      setFeedback({
        type: 'success',
        message: `Akun "${u.namaLengkap}" kini ${
          !u.isActive ? 'Aktif' : 'Dinonaktifkan'
        }.`,
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshAdminData();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Pengendalian Akses & Keamanan RBAC
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {canManageUsers
              ? 'Super Admin — Manajemen Pengguna & Audit Log'
              : 'Audit Log Aktivitas & Keamanan Sistem'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Kelola akun ASN/Pegawai BPBD Kabupaten Sidoarjo, penetapan peran
            berjenjang (RBAC), reset kata sandi, dan tinjau catatan audit
            perubahan jadwal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Akun Pengguna ({users.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Jejak Audit Log ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Matriks Hak Akses RBAC</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: USERS */}
      {activeTab === 'users' && canManageUsers && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Add User Form */}
          <form
            onSubmit={handleCreateSubmit}
            className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Plus className="w-4 h-4 text-sky-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Tambah Akun Pegawai / Pejabat
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP (18 digit) / ID Pegawai *
              </label>
              <input
                type="text"
                required
                minLength={5}
                placeholder="199004122020121004"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="opsional (default NIP)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kata Sandi Awal *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Sdr. Agus Sugiharto, S.Sos."
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jabatan
              </label>
              <input
                type="text"
                placeholder="Contoh: Pengadministrasi Umum / Kabid PK"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role RBAC *
                </label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value as RoleCode)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                >
                  {ROLE_LIST.filter(
                    (r) =>
                      r !== 'SUPER_ADMIN' ||
                      currentUser.roleCode === 'SUPER_ADMIN'
                  ).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unit Kerja *
                </label>
                <select
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
              {ROLE_META[roleCode].description}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors"
            >
              Simpan & Aktifkan Akun
            </button>
          </form>

          {/* Users Table */}
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Akun Terdaftar
              </h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {users.filter((u) => u.isActive).length} aktif dari{' '}
                {users.length} akun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Pegawai & NIP</th>
                    <th className="py-3 px-4">Role & Unit Kerja</th>
                    <th className="py-3 px-4">Status & Login Terakhir</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {u.namaLengkap}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                          NIP: {u.nip} · @{u.username}
                        </div>
                        <div className="text-xs text-slate-500">{u.jabatan}</div>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-sky-800 text-xs">
                          {ROLE_META[u.roleCode].label}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {u.unitKerja}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-xs">
                        <div
                          className={`font-semibold ${
                            u.isActive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                          {u.lastLoginAt || 'Belum pernah login'}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="Edit peran / reset kata sandi"
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              title={
                                u.isActive
                                  ? 'Nonaktifkan akun'
                                  : 'Aktifkan kembali akun'
                              }
                              className={`p-1.5 rounded-md transition-colors ${
                                u.isActive
                                  ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {u.isActive ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {currentUser.roleCode === 'SUPER_ADMIN' &&
                            u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await onDeleteUser(u.id);
                                  if (!res.ok) {
                                    setFeedback({
                                      type: 'error',
                                      message:
                                        res.error || 'Gagal menghapus akun.',
                                    });
                                  }
                                }}
                                title="Hapus akun pengguna"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Catatan Jejak Audit Otomatis (Audit Trail)
            </h3>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-sky-600"
            >
              <option value="ALL">Semua Peristiwa</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
              <option value="AGENDA_CREATED">AGENDA_CREATED</option>
              <option value="AGENDA_UPDATED">AGENDA_UPDATED</option>
              <option value="AGENDA_RESCHEDULED">AGENDA_RESCHEDULED</option>
              <option value="AGENDA_DELETED">AGENDA_DELETED</option>
              <option value="ROLE_CHANGED">ROLE_CHANGED</option>
              <option value="USER_CREATED">USER_CREATED</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Waktu (WIB)</th>
                  <th className="py-3 px-4">Pelaku & Peran</th>
                  <th className="py-3 px-4">Peristiwa</th>
                  <th className="py-3 px-4">Rincian Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-slate-500 text-sm"
                    >
                      Belum ada catatan audit untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap align-top">
                        {log.timestampWIB}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900">
                          {log.actorName}
                        </div>
                        <div className="text-slate-500 font-mono">
                          {log.actorNip} · {log.actorRole}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top font-mono font-semibold">
                        <span
                          className={
                            log.event.includes('FAILED') ||
                            log.event.includes('LOCKED') ||
                            log.event.includes('DELETED')
                              ? 'text-red-700'
                              : log.event.includes('ROLE') ||
                                  log.event.includes('RESCHEDULED')
                                ? 'text-amber-700'
                                : 'text-sky-800'
                          }
                        >
                          {log.event}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-slate-700 leading-relaxed">
                        {log.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Matriks Hak Akses Fitur & Data (C = Tambah, R = Lihat, U = Ubah, D
              = Hapus, X = Kirim/Eksekusi)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#0F294A] text-white">
                  <th className="py-3 px-4">Modul / Fitur Sistem</th>
                  <th className="py-3 px-3">Super Admin</th>
                  <th className="py-3 px-3">Admin Sistem</th>
                  <th className="py-3 px-3">Operator Umum</th>
                  <th className="py-3 px-3">Pimpinan</th>
                  <th className="py-3 px-3">Kabid / Kasubag</th>
                  <th className="py-3 px-3">Pegawai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {[
                  ['Dashboard Linimasa Agenda Harian', 'R', 'R', 'R', 'R', 'R', 'R'],
                  ['Input & Ekstraksi Surat e-Buddy', 'C / R / U', 'R', 'C / R / U', '—', '—', '—'],
                  ['Edit / Reschedule / Pembatalan Jadwal', 'U / D', '—', 'U / D', 'Disposisi', 'Unit', '—'],
                  ['Penunjukan Staf Pelaksana (PIC)', 'C / U', '—', 'C / U', 'U', 'U (Unit)', '—'],
                  ['Broadcast WhatsApp & Kartu Harian', 'X', 'X', 'X', 'X', 'R / X', 'R / X'],
                  ['Master Data (Unit & Lokasi Sidoarjo)', 'C / R / U / D', 'C / R / U / D', 'C / R / U', 'R', 'R', 'R'],
                  ['Manajemen Akun, Role & Audit Log', 'C / R / U / D', 'C / R / U / D', '—', 'R (Log)', '—', '—'],
                ].map((row) => (
                  <tr key={row[0]} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {row[0]}
                    </td>
                    {row.slice(1).map((cell, idx) => (
                      <td
                        key={idx}
                        className="py-3 px-3 font-mono font-semibold text-slate-700"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleEditSubmit}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Pengguna & Hak Akses
                </h3>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  NIP: {editingUser.nip} · @{editingUser.username}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jabatan
              </label>
              <input
                type="text"
                value={editJabatan}
                onChange={(e) => setEditJabatan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role RBAC
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as RoleCode)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                >
                  {ROLE_LIST.filter(
                    (r) =>
                      r !== 'SUPER_ADMIN' ||
                      currentUser.roleCode === 'SUPER_ADMIN'
                  ).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unit Kerja
                </label>
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Kata Sandi Baru (Kosongkan jika tidak diubah)</span>
              </label>
              <input
                type="password"
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
