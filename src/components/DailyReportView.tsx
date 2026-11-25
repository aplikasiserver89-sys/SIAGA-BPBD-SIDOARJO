import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MapPin,
  UserCheck,
} from 'lucide-react';
import {
  AgendaItem,
  ConflictDetail,
  MasterUnit,
} from '../types/agenda';
import {
  formatRentangWIB,
  formatTanggalIndonesia,
} from '../utils/agendaHelpers';
import { safeExternalUrl } from '../utils/rbac';
import {
  downloadDailyAgendaExcel,
  downloadDailyAgendaPdf,
  filterDailyReportAgendas,
} from '../utils/reportExporter';
import { BpbdEmblem } from './BpbdEmblem';
import { StatusIndicator } from './StatusIndicator';

interface DailyReportViewProps {
  agendas: AgendaItem[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  conflictsMap: Map<string, ConflictDetail>;
  units: MasterUnit[];
  onInspectItem: (item: AgendaItem) => void;
}

const STATUS_FILTERS = [
  'Semua',
  'Terjadwal',
  'Update / Baru',
  'Ditunda',
  'Dibatalkan',
];

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  agendas,
  selectedDate,
  onChangeDate,
  conflictsMap,
  units,
  onInspectItem,
}) => {
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [unitFilter, setUnitFilter] = useState('Semua');
  const [includeDisposisi, setIncludeDisposisi] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const reportOptions = useMemo(
    () => ({
      includeDisposisi,
      statusFilter,
      unitFilter,
    }),
    [includeDisposisi, statusFilter, unitFilter]
  );

  const filteredAgendas = useMemo(
    () => filterDailyReportAgendas(agendas, selectedDate, reportOptions),
    [agendas, selectedDate, reportOptions]
  );

  const totalCount = filteredAgendas.length;
  const activeCount = filteredAgendas.filter(
    (a) => a.status !== 'Dibatalkan' && a.status !== 'Ditunda'
  ).length;
  const updateCount = filteredAgendas.filter(
    (a) => a.status === 'Update / Baru'
  ).length;
  const conflictCount = filteredAgendas.filter(
    (a) => conflictsMap.get(a.id)?.severity === 'tinggi'
  ).length;

  const handleDownloadExcel = () => {
    downloadDailyAgendaExcel(agendas, selectedDate, conflictsMap, reportOptions);
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadDailyAgendaPdf(
        agendas,
        selectedDate,
        conflictsMap,
        reportOptions
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return;
    const dt = new Date(y, m - 1, d + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    onChangeDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Laporan Resmi Harian BPBD Kabupaten Sidoarjo
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Rekap Agenda Per Hari
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Susun laporan rekapitulasi agenda kegiatan harian berdasarkan tanggal
            dan unduh langsung dalam format Excel (.xlsx) atau PDF (.pdf).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
          >
            {isExportingPdf ? (
              <>
                <Download className="w-4 h-4 animate-pulse" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Download PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tanggal Laporan
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Hari sebelumnya"
              >
                -1 Hr
              </button>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onChangeDate(e.target.value)}
                  aria-label="Pilih tanggal laporan agenda"
                  className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-800 tabular-nums focus:outline-none focus:border-sky-600"
                />
              </div>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Hari berikutnya"
              >
                +1 Hr
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Filter Bidang / PIC
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600"
              >
                <option value="Semua">Semua Bidang / Personel</option>
                {units.map((u) => (
                  <option key={u.id} value={u.nama}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Filter Status Agenda
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600"
            >
              {STATUS_FILTERS.map((st) => (
                <option key={st} value={st}>
                  {st === 'Semua' ? 'Semua Status' : st}
                </option>
              ))}
            </select>
          </div>

          <div className="pb-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDisposisi}
                onChange={(e) => setIncludeDisposisi(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              <span>Sertakan disposisi & nomor surat di laporan</span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Total Agenda Laporan
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Agenda Aktif / Berjalan
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {activeCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Agenda Update / Baru
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600">
            {updateCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Jadwal Jam Paralel
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-700">
            {conflictCount}
          </div>
        </div>
      </div>

      {/* Official Daily Report Preview Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-[#0F294A] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <BpbdEmblem className="w-11 h-11 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-sky-200 tracking-wide">
                PEMERINTAH KABUPATEN SIDOARJO
              </div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white">
                BADAN PENANGGULANGAN BENCANA DAERAH (BPBD)
              </div>
              <div className="text-xs text-slate-300">
                Laporan Rekapitulasi Agenda Kegiatan Harian
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-[#163A66] px-3 py-2 rounded-lg shrink-0 self-start sm:self-center">
            <Calendar className="w-4 h-4 text-amber-300" />
            <span className="font-semibold text-white">
              {formatTanggalIndonesia(selectedDate)}
            </span>
          </div>
        </div>

        {filteredAgendas.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada agenda kegiatan untuk{' '}
            <span className="font-semibold text-slate-700">
              {formatTanggalIndonesia(selectedDate)}
            </span>{' '}
            sesuai filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold w-12 text-center">
                    No
                  </th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    Waktu (WIB)
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[220px]">
                    Nama Kegiatan
                  </th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    Jenis
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[180px]">
                    Lokasi / Tautan
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[160px]">
                    PIC / Bidang
                  </th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">
                    Status
                  </th>
                  {includeDisposisi && (
                    <th className="py-3 px-4 font-semibold min-w-[190px]">
                      Disposisi & No. Surat
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAgendas.map((item, idx) => {
                  const conflict = conflictsMap.get(item.id);
                  const safeUrl = safeExternalUrl(item.tautanDaring);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onInspectItem(item)}
                      className="hover:bg-sky-50/50 transition-colors cursor-pointer align-top"
                    >
                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#0F294A] whitespace-nowrap">
                        {formatRentangWIB(item.jamMulai, item.jamSelesai)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {item.namaKegiatan}
                        </div>
                        {conflict?.severity === 'tinggi' && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{conflict.summary}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {item.jenisKegiatan}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words">
                            {item.lokasi}
                            {safeUrl ? ` (${safeUrl})` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-900">
                        <div className="flex items-start gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{item.pic}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusIndicator
                          status={item.status}
                          hasConflict={Boolean(conflict)}
                          conflictSeverity={conflict?.severity}
                        />
                      </td>
                      {includeDisposisi && (
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.nomorSurat && (
                            <div className="font-mono text-[11px] text-slate-500 mb-0.5">
                              No. {item.nomorSurat}
                            </div>
                          )}
                          <div>{item.catatanDisposisi || '-'}</div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Klik baris agenda untuk melihat rincian disposisi. Gunakan tombol
            Download Excel atau Download PDF di kanan atas.
          </span>
          <span className="font-medium text-slate-700">
            Subbag. Umpeg · BPBD Kab. Sidoarjo
          </span>
        </div>
      </div>
    </div>
  );
};
