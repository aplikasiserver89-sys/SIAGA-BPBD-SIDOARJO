import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
  FilePlus2,
  List,
  MapPin,
  Search,
  Table2,
  UserCheck,
} from 'lucide-react';
import {
  AgendaItem,
  AgendaStatus,
  ConflictDetail,
  MasterUnit,
  UserProfile,
} from '../types/agenda';
import {
  formatRentangWIB,
  formatTanggalIndonesia,
  getActiveOrUpcomingAgenda,
  sortAgendasChronological,
} from '../utils/agendaHelpers';
import {
  canUserEditAgenda,
  getCapabilities,
  safeExternalUrl,
} from '../utils/rbac';
import { StatusIndicator } from './StatusIndicator';

interface DashboardViewProps {
  currentUser: UserProfile;
  agendas: AgendaItem[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  conflictsMap: Map<string, ConflictDetail>;
  currentMinutesWIB: number;
  units: MasterUnit[];
  onInspectItem: (item: AgendaItem) => void;
  onQuickStatusChange: (id: string, status: AgendaStatus) => void;
  onNavigateToInput: () => void;
  onNavigateToBroadcast: () => void;
}

type FilterStatus =
  | 'Semua'
  | 'Update / Baru'
  | 'Berbenturan'
  | 'Terjadwal'
  | 'Ditunda';

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  agendas,
  selectedDate,
  onChangeDate,
  conflictsMap,
  currentMinutesWIB,
  units,
  onInspectItem,
  onQuickStatusChange,
  onNavigateToInput,
  onNavigateToBroadcast,
}) => {
  const caps = getCapabilities(currentUser.roleCode);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('Semua');
  const [picFilter, setPicFilter] = useState<string>(() =>
    currentUser.roleCode === 'KABID_UNIT' ? currentUser.unitKerja : 'Semua'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'table' | 'timeline'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.roleCode === 'KABID_UNIT') {
      setPicFilter(currentUser.unitKerja);
    } else {
      setPicFilter('Semua');
    }
  }, [currentUser.id, currentUser.roleCode, currentUser.unitKerja]);

  const dayAgendas = useMemo(
    () =>
      sortAgendasChronological(
        agendas.filter((item) => item.tanggal === selectedDate)
      ),
    [agendas, selectedDate]
  );

  const totalToday = dayAgendas.length;
  const updateCount = dayAgendas.filter(
    (item) => item.status === 'Update / Baru'
  ).length;
  const activeOrUpcoming = useMemo(
    () => getActiveOrUpcomingAgenda(agendas, selectedDate, currentMinutesWIB),
    [agendas, selectedDate, currentMinutesWIB]
  );
  const conflictItemsCount = Array.from(conflictsMap.values()).filter(
    (c) => c.severity === 'tinggi'
  ).length;

  const picOptions = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => set.add(u.nama));
    dayAgendas.forEach((a) => set.add(a.pic));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [units, dayAgendas]);

  const filteredAgendas = useMemo(() => {
    return dayAgendas.filter((item) => {
      if (statusFilter === 'Update / Baru' && item.status !== 'Update / Baru') {
        return false;
      }
      if (statusFilter === 'Terjadwal' && item.status !== 'Terjadwal') {
        return false;
      }
      if (statusFilter === 'Ditunda' && item.status !== 'Ditunda') {
        return false;
      }
      if (statusFilter === 'Berbenturan' && !conflictsMap.has(item.id)) {
        return false;
      }

      if (picFilter !== 'Semua') {
        const coreKeyword = picFilter
          .toLowerCase()
          .replace(/^bid\.\s*/i, '')
          .trim();
        const picLower = item.pic.toLowerCase();
        if (
          !picLower.includes(picFilter.toLowerCase()) &&
          !(coreKeyword.length >= 2 && picLower.includes(coreKeyword))
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.namaKegiatan} ${item.lokasi} ${item.pic} ${item.jenisKegiatan} ${item.catatanDisposisi}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [dayAgendas, statusFilter, picFilter, searchQuery, conflictsMap]);

  const conflictHoursSummary = useMemo(() => {
    const slots = new Set<string>();
    dayAgendas.forEach((item) => {
      const c = conflictsMap.get(item.id);
      if (c?.severity === 'tinggi') {
        slots.add(`${item.jamMulai.replace(':', '.')} WIB`);
      }
    });
    return Array.from(slots);
  }, [dayAgendas, conflictsMap]);

  const handleCopyItemWA = async (item: AgendaItem) => {
    const safeUrl = safeExternalUrl(item.tautanDaring);
    const msg = `🕒 *${formatRentangWIB(item.jamMulai, item.jamSelesai)}*${
      item.status === 'Update / Baru' ? ' *[UPDATE / BARU]*' : ''
    }\n📌 ${item.namaKegiatan}\n📍 Lokasi: ${item.lokasi}${
      safeUrl ? `\n🔗 Tautan: ${safeUrl}` : ''
    }\n👥 PIC/Peserta: *${item.pic}*`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Pemantauan Operasional Harian
            {currentUser.roleCode === 'PIMPINAN'
              ? ' · Mode Ringkasan Eksekutif Pimpinan'
              : currentUser.roleCode === 'KABID_UNIT'
                ? ` · Fokus Unit ${currentUser.unitKerja}`
                : currentUser.roleCode === 'SUPER_ADMIN'
                  ? ' · Mode Super Admin (Akses Edit Penuh)'
                  : ''}
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {formatTanggalIndonesia(selectedDate)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              aria-label="Pilih tanggal agenda"
              className="text-sm font-medium text-slate-800 bg-transparent focus:outline-none tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={onNavigateToBroadcast}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="w-4 h-4 text-sky-700" />
            <span>
              {caps.canBroadcastWA
                ? 'Poster Gambar & Broadcast WA'
                : 'Poster Gambar & Kartu Agenda'}
            </span>
          </button>

          {caps.canCreateAgenda && (
            <button
              type="button"
              onClick={onNavigateToInput}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Ekstrak Memo e-Buddy</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Total Agenda Hari Ini
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {totalToday}
            </span>
            <span className="text-xs text-slate-500">kegiatan terjadwal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === 'Update / Baru' ? 'Semua' : 'Update / Baru'
            )
          }
          className={`text-left bg-white border rounded-xl p-5 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
            statusFilter === 'Update / Baru'
              ? 'border-amber-400 bg-amber-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500">
            Agenda Baru / Update Hari Ini
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-amber-600">
              {updateCount}
            </span>
            <span className="text-xs font-medium text-amber-700">
              {updateCount > 0 ? 'Perlu diinfokan' : 'Tidak ada susulan'}
            </span>
          </div>
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {activeOrUpcoming.mode === 'berlangsung'
              ? 'Sedang Berlangsung (WIB)'
              : activeOrUpcoming.mode === 'terdekat'
                ? 'Agenda Terdekat (WIB)'
                : 'Status Jadwal Hari Ini'}
          </div>
          <div className="mt-2 min-w-0">
            {activeOrUpcoming.item ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                    {activeOrUpcoming.item.jamMulai.replace(':', '.')} WIB
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-medium text-slate-600 truncate">
                    {activeOrUpcoming.item.pic}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-700 truncate font-medium">
                  {activeOrUpcoming.item.namaKegiatan}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 mt-1">
                Belum ada kegiatan aktif
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === 'Berbenturan' ? 'Semua' : 'Berbenturan'
            )
          }
          className={`text-left bg-white border rounded-xl p-5 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
            statusFilter === 'Berbenturan'
              ? 'border-red-400 bg-red-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500">
            Potensi Bentrok Jam (WIB)
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span
              className={`text-3xl font-bold font-mono tabular-nums ${
                conflictItemsCount > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {conflictItemsCount}
            </span>
            <span
              className={`text-xs font-medium ${
                conflictItemsCount > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {conflictItemsCount > 0
                ? 'Klik untuk filter bentrok'
                : 'Semua jam aman'}
            </span>
          </div>
        </button>
      </div>

      {/* Conflict Alert Panel */}
      {conflictItemsCount > 0 && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-900">
                Peringatan Bentrok Jadwal pada{' '}
                {conflictHoursSummary.join(', ')}
              </div>
              <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                Terdapat {conflictItemsCount} agenda dengan rentang jam WIB
                bersamaan. Pastikan pimpinan dan setiap bidang telah menunjuk
                perwakilan terpisah agar tidak terjadi kekosongan kehadiran.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === 'Berbenturan' ? 'Semua' : 'Berbenturan'
              )
            }
            className="px-3.5 py-2 text-xs font-semibold text-red-800 bg-white border border-red-200 hover:bg-red-100/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {statusFilter === 'Berbenturan'
              ? 'Tampilkan Semua Agenda'
              : 'Tinjau Agenda Bentrok'}
          </button>
        </div>
      )}

      {/* Filter & View Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="tablist"
            aria-label="Filter status agenda"
          >
            {(
              [
                'Semua',
                'Update / Baru',
                'Berbenturan',
                'Terjadwal',
                'Ditunda',
              ] as FilterStatus[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari kegiatan, lokasi, atau PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <select
              value={picFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              aria-label="Filter berdasarkan bidang atau PIC"
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-sky-600 max-w-[210px]"
            >
              <option value="Semua">Semua Bidang / PIC</option>
              {picOptions.map((pic) => (
                <option key={pic} value={pic}>
                  {pic}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLayoutMode('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  layoutMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  layoutMode === 'timeline'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Linimasa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredAgendas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Tidak ada agenda yang sesuai filter
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Belum ada kegiatan tercatat untuk{' '}
            <span className="font-medium text-slate-700">
              {formatTanggalIndonesia(selectedDate)}
            </span>{' '}
            pada kriteria ini.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {(statusFilter !== 'Semua' ||
              picFilter !== 'Semua' ||
              searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('Semua');
                  setPicFilter('Semua');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Reset Filter
              </button>
            )}
            {caps.canCreateAgenda && (
              <button
                type="button"
                onClick={onNavigateToInput}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors"
              >
                Tambah Agenda Baru
              </button>
            )}
          </div>
        </div>
      ) : layoutMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-36 whitespace-nowrap">
                    Waktu (WIB)
                  </th>
                  <th className="py-3 px-4 min-w-[260px]">
                    Kegiatan & Rincian Surat
                  </th>
                  <th className="py-3 px-4 min-w-[210px]">
                    Lokasi / Tautan
                  </th>
                  <th className="py-3 px-4 min-w-[170px]">PIC / Bidang</th>
                  <th className="py-3 px-4 min-w-[180px]">
                    Status & Bentrok
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAgendas.map((item) => {
                  const conflict = conflictsMap.get(item.id);
                  const canEditRow = canUserEditAgenda(currentUser, item);
                  const safeUrl = safeExternalUrl(item.tautanDaring);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        conflict?.severity === 'tinggi'
                          ? 'bg-red-50/20'
                          : item.status === 'Update / Baru'
                            ? 'bg-amber-50/20'
                            : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-slate-900">
                          {item.jamMulai.replace(':', '.')} WIB
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                          s.d.{' '}
                          {item.jamSelesai.toLowerCase() === 'selesai'
                            ? 'Selesai'
                            : `${item.jamSelesai.replace(':', '.')} WIB`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => onInspectItem(item)}
                          className="text-left font-semibold text-slate-900 hover:text-sky-700 transition-colors leading-snug"
                        >
                          {item.namaKegiatan}
                        </button>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.jenisKegiatan} · {item.sumber}
                          {item.nomorSurat ? ` · No. ${item.nomorSurat}` : ''}
                        </div>
                        {item.catatanDisposisi && (
                          <div className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                            Disposisi: {item.catatanDisposisi}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-slate-700 text-xs sm:text-sm">
                        <div className="leading-snug">{item.lokasi}</div>
                        {safeUrl && (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-sky-700 hover:underline break-all"
                          >
                            {safeUrl}
                          </a>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top font-medium text-slate-800 text-xs sm:text-sm">
                        {item.pic}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <StatusIndicator
                          status={item.status}
                          hasConflict={Boolean(conflict)}
                          conflictSeverity={conflict?.severity}
                        />
                        {canEditRow && (
                          <div className="mt-2">
                            <select
                              value={item.status}
                              aria-label={`Ubah status ${item.namaKegiatan}`}
                              onChange={(e) =>
                                onQuickStatusChange(
                                  item.id,
                                  e.target.value as AgendaStatus
                                )
                              }
                              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-sky-600"
                            >
                              <option value="Terjadwal">Terjadwal</option>
                              <option value="Update / Baru">
                                Update / Baru
                              </option>
                              <option value="Ditunda">Ditunda</option>
                              <option value="Dibatalkan">Dibatalkan</option>
                            </select>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyItemWA(item)}
                            title="Salin ringkasan WA agenda ini"
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                            aria-label="Salin ringkasan WhatsApp"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onInspectItem(item)}
                            title={
                              canEditRow
                                ? 'Lihat atau edit rincian'
                                : 'Lihat rincian agenda'
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            aria-label="Lihat rincian agenda"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filteredAgendas.map((item) => {
            const conflict = conflictsMap.get(item.id);
            return (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-start gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="md:w-40 shrink-0">
                  <div className="text-base font-bold font-mono tabular-nums text-[#0F294A]">
                    {item.jamMulai.replace(':', '.')} WIB
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                    s.d.{' '}
                    {item.jamSelesai.toLowerCase() === 'selesai'
                      ? 'Selesai'
                      : `${item.jamSelesai.replace(':', '.')} WIB`}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusIndicator
                      status={item.status}
                      hasConflict={Boolean(conflict)}
                      conflictSeverity={conflict?.severity}
                    />
                    <span className="text-xs text-slate-500">
                      {item.jenisKegiatan} · {item.sumber}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectItem(item)}
                    className="text-left text-base font-semibold text-slate-900 hover:text-sky-700 transition-colors leading-snug"
                  >
                    {item.namaKegiatan}
                  </button>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.lokasi}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.pic}</span>
                    </span>
                  </div>

                  {item.catatanDisposisi && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Disposisi: {item.catatanDisposisi}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyItemWA(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin WA</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onInspectItem(item)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors whitespace-nowrap"
                  >
                    Rincian
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
