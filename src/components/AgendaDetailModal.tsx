import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AgendaCategory,
  AgendaItem,
  AgendaStatus,
  ConflictDetail,
  MasterLocation,
  MasterUnit,
  UserProfile,
} from '../types/agenda';
import {
  buildWhatsAppShareUrl,
  formatRentangWIB,
  formatTanggalIndonesia,
  previewDraftConflicts,
} from '../utils/agendaHelpers';
import {
  canUserEditAgenda,
  getCapabilities,
  safeExternalUrl,
} from '../utils/rbac';
import { StatusIndicator } from './StatusIndicator';
import { WhatsAppIcon } from './WhatsAppIcon';

interface AgendaDetailModalProps {
  currentUser: UserProfile;
  item: AgendaItem | null;
  allItems: AgendaItem[];
  conflict?: ConflictDetail;
  units: MasterUnit[];
  locations: MasterLocation[];
  onClose: () => void;
  onSave: (updated: AgendaItem) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: AgendaCategory[] = [
  'Rapat Koordinasi',
  'Sosialisasi',
  'Edukasi/Pelatihan',
  'Kunjungan',
  'Simulasi/Lapangan',
];

const STATUSES: AgendaStatus[] = [
  'Terjadwal',
  'Update / Baru',
  'Ditunda',
  'Dibatalkan',
];

export const AgendaDetailModal: React.FC<AgendaDetailModalProps> = ({
  currentUser,
  item,
  allItems,
  conflict,
  units,
  locations,
  onClose,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AgendaItem | null>(item);
  const [copiedSingle, setCopiedSingle] = useState(false);

  useEffect(() => {
    setDraft(item);
    setIsEditing(false);
    setCopiedSingle(false);
  }, [item]);

  if (!item || !draft) return null;

  const caps = getCapabilities(currentUser.roleCode);
  const canEdit = canUserEditAgenda(currentUser, item);
  const isFullEditor = caps.canEditAnyAgenda; // SUPER_ADMIN or OPERATOR_UMUM
  const canDelete = caps.canDeleteAgenda;
  const safeUrl = safeExternalUrl(item.tautanDaring);

  const conflictingItems = conflict
    ? allItems.filter((x) => conflict.conflictingIds.includes(x.id))
    : [];

  const liveDraftConflicts = isEditing
    ? previewDraftConflicts(draft, allItems)
    : [];

  const singleAgendaText = [
    `*INFO AGENDA BPBD KAB. SIDOARJO*`,
    `Hari/Tanggal: ${formatTanggalIndonesia(item.tanggal)}`,
    `Pukul: ${formatRentangWIB(item.jamMulai, item.jamSelesai)}`,
    `Kegiatan: ${item.namaKegiatan}`,
    `Lokasi: ${item.lokasi}${safeUrl ? ` (${safeUrl})` : ''}`,
    `PIC / Peserta: ${item.pic}`,
    `Status: ${item.status}`,
    item.catatanDisposisi ? `Disposisi: ${item.catatanDisposisi}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopySingle = async () => {
    try {
      await navigator.clipboard.writeText(singleAgendaText);
      setCopiedSingle(true);
      setTimeout(() => setCopiedSingle(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.namaKegiatan.trim()) return;
    onSave({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agenda-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">
              {formatTanggalIndonesia(item.tanggal)} ·{' '}
              <span className="font-mono tabular-nums text-slate-700">
                {formatRentangWIB(item.jamMulai, item.jamSelesai)}
              </span>
            </div>
            <h2
              id="agenda-modal-title"
              className="mt-1 text-base font-semibold text-slate-900 leading-snug"
            >
              {isEditing
                ? isFullEditor
                  ? 'Edit Rincian Agenda (Akses Penuh)'
                  : 'Perbarui Disposisi & PIC Unit'
                : item.namaKegiatan}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Tutup jendela detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isEditing ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusIndicator
                status={item.status}
                hasConflict={Boolean(conflict)}
                conflictSeverity={conflict?.severity}
              />

              <div className="text-xs text-slate-500">
                {item.jenisKegiatan} · Sumber: {item.sumber}
                {item.nomorSurat ? ` · No. ${item.nomorSurat}` : ''}
              </div>
            </div>

            {conflict && conflictingItems.length > 0 && (
              <div
                className={`p-4 rounded-lg border text-sm ${
                  conflict.severity === 'tinggi'
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {conflict.severity === 'tinggi'
                      ? 'Perhatian: Terjadi Bentrok Rentang Jam WIB'
                      : 'Perhatian: Jeda Waktu Persiapan Ketat (<= 30 Menit)'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {conflictingItems.map((other) => (
                    <li key={other.id} className="flex flex-wrap gap-1">
                      <span className="font-mono tabular-nums font-semibold">
                        {other.jamMulai.replace(':', '.')} WIB
                      </span>
                      <span>—</span>
                      <span className="font-medium">{other.namaKegiatan}</span>
                      <span className="text-slate-600">({other.pic})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Lokasi / Tautan
                </dt>
                <dd className="mt-1 text-slate-900 font-medium">
                  {item.lokasi}
                </dd>
                {safeUrl && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700 hover:underline break-all"
                  >
                    <span>{safeUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Penanggung Jawab / PIC / Peserta
                </dt>
                <dd className="mt-1 text-slate-900 font-medium">{item.pic}</dd>
              </div>
            </dl>

            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-500">
                Catatan Disposisi & Arahan Pimpinan
              </div>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                {item.catatanDisposisi || 'Belum ada catatan disposisi khusus.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(item.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Agenda</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySingle}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedSingle ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Format WA</span>
                    </>
                  )}
                </button>

                <a
                  href={buildWhatsAppShareUrl(singleAgendaText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Share ke WhatsApp</span>
                </a>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isFullEditor
                      ? 'Edit Agenda & Disposisi'
                      : 'Ubah Disposisi / PIC'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isFullEditor && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      required
                      value={draft.tanggal}
                      onChange={(e) =>
                        setDraft({ ...draft, tanggal: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jam Mulai (WIB)
                    </label>
                    <input
                      type="time"
                      required
                      value={draft.jamMulai}
                      onChange={(e) =>
                        setDraft({ ...draft, jamMulai: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jam Selesai (WIB)
                    </label>
                    <input
                      type="text"
                      placeholder="11:30 atau Selesai"
                      value={draft.jamSelesai}
                      onChange={(e) =>
                        setDraft({ ...draft, jamSelesai: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Kegiatan
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.namaKegiatan}
                    onChange={(e) =>
                      setDraft({ ...draft, namaKegiatan: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jenis Kegiatan
                    </label>
                    <select
                      value={draft.jenisKegiatan}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          jenisKegiatan: e.target.value as AgendaCategory,
                        })
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
                      Status Agenda
                    </label>
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          status: e.target.value as AgendaStatus,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lokasi / Tempat
                  </label>
                  <input
                    type="text"
                    required
                    list="modal-locations-list"
                    value={draft.lokasi}
                    onChange={(e) =>
                      setDraft({ ...draft, lokasi: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                  <datalist id="modal-locations-list">
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
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PIC / Bidang / Peserta
                </label>
                <input
                  type="text"
                  required
                  list="modal-units-list"
                  value={draft.pic}
                  onChange={(e) => setDraft({ ...draft, pic: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
                <datalist id="modal-units-list">
                  {units.map((u) => (
                    <option key={u.id} value={u.nama} />
                  ))}
                </datalist>
              </div>

              {isFullEditor ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tautan Daring (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://zoom.us/j/..."
                    value={draft.tautanDaring || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, tautanDaring: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Status Pelaksanaan
                  </label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as AgendaStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan Disposisi
              </label>
              <textarea
                rows={3}
                value={draft.catatanDisposisi}
                onChange={(e) =>
                  setDraft({ ...draft, catatanDisposisi: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            {isFullEditor && liveDraftConflicts.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-semibold">
                  Peringatan Bentrok Jam WIB:
                </span>{' '}
                Jadwal ini beririsan/berdekatan dengan{' '}
                {liveDraftConflicts
                  .map(
                    (c) =>
                      `${c.item.jamMulai.replace(':', '.')} WIB (${c.item.namaKegiatan})`
                  )
                  .join('; ')}
                .
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
