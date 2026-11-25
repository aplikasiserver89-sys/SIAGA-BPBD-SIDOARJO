import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import {
  AgendaCategory,
  AgendaItem,
  AgendaStatus,
  MasterLocation,
  MasterUnit,
} from '../types/agenda';
import {
  getHariIndonesia,
  previewDraftConflicts,
} from '../utils/agendaHelpers';

export interface AgendaDraftPrefill {
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  namaKegiatan?: string;
  jenisKegiatan?: AgendaCategory;
  lokasi?: string;
  tautanDaring?: string;
  pic?: string;
  status?: AgendaStatus;
  nomorSurat?: string;
  sumber?: AgendaItem['sumber'];
  catatanDisposisi?: string;
}

interface CreateAgendaModalProps {
  isOpen: boolean;
  defaultDate: string;
  prefill?: AgendaDraftPrefill | null;
  existingAgendas: AgendaItem[];
  units: MasterUnit[];
  locations: MasterLocation[];
  onClose: () => void;
  onSubmitAgenda: (item: AgendaItem) => Promise<void> | void;
}

const CATEGORIES: AgendaCategory[] = [
  'Rapat Koordinasi',
  'Sosialisasi',
  'Edukasi/Pelatihan',
  'Kunjungan',
  'Simulasi/Lapangan',
];

const STATUSES: AgendaStatus[] = [
  'Update / Baru',
  'Terjadwal',
  'Ditunda',
  'Dibatalkan',
];

export const CreateAgendaModal: React.FC<CreateAgendaModalProps> = ({
  isOpen,
  defaultDate,
  prefill,
  existingAgendas,
  units,
  locations,
  onClose,
  onSubmitAgenda,
}) => {
  const [tanggal, setTanggal] = useState(defaultDate);
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('10:00');
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [jenisKegiatan, setJenisKegiatan] =
    useState<AgendaCategory>('Rapat Koordinasi');
  const [lokasi, setLokasi] = useState('');
  const [tautanDaring, setTautanDaring] = useState('');
  const [pic, setPic] = useState('');
  const [status, setStatus] = useState<AgendaStatus>('Update / Baru');
  const [nomorSurat, setNomorSurat] = useState('');
  const [sumber, setSumber] = useState<AgendaItem['sumber']>('e-Buddy');
  const [catatanDisposisi, setCatatanDisposisi] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTanggal(prefill?.tanggal || defaultDate);
    setJamMulai(prefill?.jamMulai || '08:00');
    setJamSelesai(prefill?.jamSelesai || '10:00');
    setNamaKegiatan(prefill?.namaKegiatan || '');
    setJenisKegiatan(prefill?.jenisKegiatan || 'Rapat Koordinasi');
    setLokasi(prefill?.lokasi || '');
    setTautanDaring(prefill?.tautanDaring || '');
    setPic(prefill?.pic || '');
    setStatus(prefill?.status || 'Update / Baru');
    setNomorSurat(prefill?.nomorSurat || '');
    setSumber(prefill?.sumber || 'e-Buddy');
    setCatatanDisposisi(prefill?.catatanDisposisi || '');
  }, [isOpen, prefill, defaultDate]);

  const hariText = useMemo(() => getHariIndonesia(tanggal), [tanggal]);

  const draftConflicts = useMemo(
    () =>
      previewDraftConflicts(
        { tanggal, jamMulai, jamSelesai, lokasi, status },
        existingAgendas
      ),
    [tanggal, jamMulai, jamSelesai, lokasi, status, existingAgendas]
  );

  if (!isOpen) return null;

  const handleReset = () => {
    setTanggal(defaultDate);
    setJamMulai('08:00');
    setJamSelesai('10:00');
    setNamaKegiatan('');
    setLokasi('');
    setTautanDaring('');
    setPic('');
    setNomorSurat('');
    setCatatanDisposisi('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKegiatan.trim() || !lokasi.trim() || !pic.trim()) return;

    setIsSaving(true);
    try {
      const newItem: AgendaItem = {
        id: `ag-${Date.now()}`,
        tanggal,
        jamMulai,
        jamSelesai: jamSelesai.trim() || 'Selesai',
        namaKegiatan: namaKegiatan.trim(),
        jenisKegiatan,
        lokasi: lokasi.trim(),
        tautanDaring: tautanDaring.trim() || undefined,
        pic: pic.trim(),
        status,
        catatanDisposisi: catatanDisposisi.trim(),
        nomorSurat: nomorSurat.trim() || undefined,
        sumber,
        updatedAt: new Date().toISOString(),
      };
      await onSubmitAgenda(newItem);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-agenda-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h2
              id="create-agenda-title"
              className="text-base font-bold text-slate-900"
            >
              Buat Agenda Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lengkapi rincian jadwal kegiatan BPBD Kabupaten Sidoarjo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              aria-label="Tutup form agenda"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {draftConflicts.length > 0 && (
            <div className="p-3.5 rounded-lg bg-red-50/80 border border-red-200 text-xs text-red-900 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Deteksi Bentrok Waktu ({draftConflicts.length} agenda pada{' '}
                  {hariText}, {tanggal})
                </span>
              </div>
              <ul className="space-y-1 pl-5 list-disc">
                {draftConflicts.map((c) => (
                  <li key={c.item.id}>
                    <span className="font-mono tabular-nums font-semibold">
                      {c.item.jamMulai.replace(':', '.')} WIB
                    </span>{' '}
                    — {c.item.namaKegiatan} ({c.item.pic})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hari
              </label>
              <input
                type="text"
                readOnly
                value={hariText}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jam Mulai (WIB) *
              </label>
              <input
                type="time"
                required
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jam Selesai (WIB)
              </label>
              <input
                type="text"
                placeholder="10:30 atau Selesai"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Kegiatan / Perihal Surat *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rapat Koordinasi Penanggulangan Bencana Hidrometeorologi"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jenis Kegiatan *
              </label>
              <select
                value={jenisKegiatan}
                onChange={(e) =>
                  setJenisKegiatan(e.target.value as AgendaCategory)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status Agenda *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AgendaStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sumber Informasi
              </label>
              <select
                value={sumber}
                onChange={(e) =>
                  setSumber(e.target.value as AgendaItem['sumber'])
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="e-Buddy">e-Buddy</option>
                <option value="Disposisi Pimpinan">Disposisi Pimpinan</option>
                <option value="Manual">Input Manual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lokasi / Tempat Kegiatan *
              </label>
              <input
                type="text"
                required
                list="modal-create-locations"
                placeholder="Pilih atau ketik lokasi di Sidoarjo..."
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              <datalist id="modal-create-locations">
                {locations.map((loc) => (
                  <option
                    key={loc.id}
                    value={
                      loc.tipe === 'Daring'
                        ? loc.nama
                        : `${loc.nama}, ${loc.alamat}`
                    }
                  />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tautan Daring / Zoom (Opsional)
              </label>
              <input
                type="text"
                placeholder="https://zoom.us/j/..."
                value={tautanDaring}
                onChange={(e) => setTautanDaring(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Penanggung Jawab / PIC / Peserta *
              </label>
              <input
                type="text"
                required
                list="modal-create-units"
                placeholder="Contoh: Bid. PK dan Bid. Damkarmat"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              <datalist id="modal-create-units">
                {units.map((u) => (
                  <option key={u.id} value={u.nama} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Surat Masuk (Opsional)
              </label>
              <input
                type="text"
                placeholder="005/.../438.../2026"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Disposisi / Perlengkapan
            </label>
            <textarea
              rows={2}
              placeholder="Arahan pimpinan atau perlengkapan..."
              value={catatanDisposisi}
              onChange={(e) => setCatatanDisposisi(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] disabled:bg-slate-400 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Agenda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
