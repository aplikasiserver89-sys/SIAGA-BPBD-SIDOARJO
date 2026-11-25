import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { AgendaItem, ConflictDetail, UserProfile } from '../types/agenda';
import {
  buildWhatsAppShareUrl,
  formatTanggalIndonesia,
  generateLeadershipWA,
  generateStaffGroupWA,
} from '../utils/agendaHelpers';
import {
  copyPosterImageToClipboard,
  downloadPosterImage,
  renderAgendaPosterCanvas,
  SharePosterResult,
  sharePosterToWhatsApp,
} from '../utils/posterGenerator';
import { getCapabilities } from '../utils/rbac';
import { WhatsAppIcon } from './WhatsAppIcon';

interface BroadcastReprintViewProps {
  currentUser: UserProfile;
  agendas: AgendaItem[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  conflictsMap: Map<string, ConflictDetail>;
}

export const BroadcastReprintView: React.FC<BroadcastReprintViewProps> = ({
  currentUser,
  agendas,
  selectedDate,
  onChangeDate,
  conflictsMap,
}) => {
  const caps = getCapabilities(currentUser.roleCode);
  const [waMode, setWaMode] = useState<'pimpinan' | 'pegawai'>('pegawai');

  const [includeDisposisi, setIncludeDisposisi] = useState(true);
  const [includeConflictNote, setIncludeConflictNote] = useState(true);
  const [onlyUpdates, setOnlyUpdates] = useState(false);

  const [showPosterUpdateTag, setShowPosterUpdateTag] = useState(true);
  const [showPosterConflictTag, setShowPosterConflictTag] = useState(false);
  const [includePosterZoomLink, setIncludePosterZoomLink] = useState(false);
  const [showPosterThumbnails, setShowPosterThumbnails] = useState(true);

  const [copiedMode, setCopiedMode] = useState<'pimpinan' | 'pegawai' | null>(
    null
  );
  const [copiedImage, setCopiedImage] = useState<'ok' | 'unsupported' | null>(
    null
  );
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [sharePosterStatus, setSharePosterStatus] =
    useState<SharePosterResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const leadershipText = useMemo(
    () =>
      generateLeadershipWA(agendas, selectedDate, conflictsMap, {
        includeDisposisi,
        includeConflictNote,
        onlyUpdates,
      }),
    [
      agendas,
      selectedDate,
      conflictsMap,
      includeDisposisi,
      includeConflictNote,
      onlyUpdates,
    ]
  );

  const staffGroupText = useMemo(
    () =>
      generateStaffGroupWA(agendas, selectedDate, conflictsMap, {
        includeDisposisi,
        includeConflictNote,
        onlyUpdates,
      }),
    [
      agendas,
      selectedDate,
      conflictsMap,
      includeDisposisi,
      includeConflictNote,
      onlyUpdates,
    ]
  );

  const activeMessage = waMode === 'pimpinan' ? leadershipText : staffGroupText;

  // Render live Canvas Poster whenever agendas, date, or poster options change
  useEffect(() => {
    let active = true;
    const draw = async () => {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore
        }
      }
      if (!active || !canvasRef.current) return;
      await renderAgendaPosterCanvas(
        canvasRef.current,
        agendas,
        selectedDate,
        conflictsMap,
        {
          showConflictTag: showPosterConflictTag,
          showUpdateTag: showPosterUpdateTag,
          includeZoomLink: includePosterZoomLink,
          showThumbnails: showPosterThumbnails,
          onlyUpdates,
        }
      );
    };
    void draw();
    return () => {
      active = false;
    };
  }, [
    agendas,
    selectedDate,
    conflictsMap,
    showPosterConflictTag,
    showPosterUpdateTag,
    includePosterZoomLink,
    showPosterThumbnails,
    onlyUpdates,
  ]);

  const handleCopyWA = async (target: 'pimpinan' | 'pegawai') => {
    const text = target === 'pimpinan' ? leadershipText : staffGroupText;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(target);
      setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownloadPoster = (format: 'png' | 'jpg') => {
    if (!canvasRef.current) return;
    downloadPosterImage(canvasRef.current, selectedDate, format);
  };

  const handleCopyPosterImage = async () => {
    if (!canvasRef.current) return;
    const ok = await copyPosterImageToClipboard(canvasRef.current);
    setCopiedImage(ok ? 'ok' : 'unsupported');
    setTimeout(() => setCopiedImage(null), 2500);
  };

  const handleSharePosterToWA = async () => {
    if (!canvasRef.current || isSharingPoster) return;
    setIsSharingPoster(true);
    try {
      const result = await sharePosterToWhatsApp(
        canvasRef.current,
        selectedDate
      );
      if (result !== 'aborted') {
        setSharePosterStatus(result);
        if (result === 'shared') {
          setTimeout(() => setSharePosterStatus(null), 3000);
        }
      }
    } finally {
      setIsSharingPoster(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Distribusi Informasi Resmi & Rekap Visual Grup WA
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {caps.canBroadcastWA
              ? 'Poster Gambar WA & Pesan Teks Broadcast'
              : 'Poster Gambar Agenda Grup WA'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Bagikan atau unduh poster infografis agenda harian (PNG/JPG) siap
            kirim ke Grup WhatsApp, atau salin pesan teks WA terstruktur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            aria-label="Pilih tanggal broadcast WhatsApp"
            className="px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-800 tabular-nums focus:outline-none focus:border-sky-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {caps.canBroadcastWA && (
          <div className="no-print xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Generator Pesan Teks WhatsApp
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setWaMode('pimpinan')}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  waMode === 'pimpinan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ringkasan Pimpinan
              </button>
              <button
                type="button"
                onClick={() => setWaMode('pegawai')}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  waMode === 'pegawai'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grup WA Pegawai
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDisposisi}
                  onChange={(e) => setIncludeDisposisi(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Sertakan catatan disposisi & arahan pimpinan</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConflictNote}
                  onChange={(e) => setIncludeConflictNote(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Sertakan penanda peringatan bentrok jam WIB</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyUpdates}
                  onChange={(e) => setOnlyUpdates(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Hanya tampilkan agenda berstatus [Update / Baru]</span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>
                  Pratinjau teks (
                  {waMode === 'pimpinan'
                    ? 'Format Pimpinan'
                    : 'Format Kronologis Grup WA'}
                  )
                </span>
                <span className="font-mono tabular-nums">
                  {activeMessage.length} karakter
                </span>
              </div>
              <textarea
                readOnly
                rows={15}
                value={activeMessage}
                className="w-full px-3.5 py-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleCopyWA('pimpinan')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedMode === 'pimpinan' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Ringkasan Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Ringkasan Pimpinan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopyWA('pegawai')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedMode === 'pegawai' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Pesan Grup Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Pesan Grup WA Pegawai</span>
                  </>
                )}
              </button>
            </div>

            <a
              href={buildWhatsAppShareUrl(activeMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
            >
              <WhatsAppIcon className="w-4 h-4 shrink-0" />
              <span>
                Share{' '}
                {waMode === 'pimpinan' ? 'Ringkasan Pimpinan' : 'Pesan Grup'} ke
                WhatsApp
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-85 shrink-0" />
            </a>
          </div>
        )}

        {/* Right: Poster Gambar WhatsApp */}
        <div
          className={`${
            caps.canBroadcastWA ? 'xl:col-span-7' : 'xl:col-span-12'
          } space-y-4`}
        >
          {/* Poster Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900">
                <ImageIcon className="w-4 h-4 text-orange-600" />
                <span>Poster Gambar Grup WA</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPosterImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedImage === 'ok' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Gambar Tersalin (Ctrl+V di WA)</span>
                    </>
                  ) : copiedImage === 'unsupported' ? (
                    <span>Gunakan Unduh PNG/JPG</span>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Gambar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPoster('jpg')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>Unduh JPG</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPoster('png')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar WA (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSharePosterToWA}
                  disabled={isSharingPoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  {sharePosterStatus === 'shared' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Gambar Terkirim</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>
                        {isSharingPoster
                          ? 'Menyiapkan...'
                          : 'Share ke WhatsApp'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {(sharePosterStatus === 'fallback_clipboard' ||
              sharePosterStatus === 'fallback_download') && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <div className="leading-relaxed">
                  {sharePosterStatus === 'fallback_clipboard' ? (
                    <span>
                      <strong>Poster gambar telah disalin (hanya gambar).</strong>{' '}
                      Buka WhatsApp lalu tempel (Paste) gambar poster di grup
                      atau kontak tujuan.
                    </span>
                  ) : (
                    <span>
                      <strong>Poster PNG telah diunduh (hanya gambar).</strong>{' '}
                      Buka WhatsApp lalu lampirkan file gambar poster yang
                      tersimpan.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://wa.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-md transition-colors whitespace-nowrap"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>Buka WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSharePosterStatus(null)}
                    aria-label="Tutup informasi share WhatsApp"
                    className="p-1 text-emerald-700 hover:text-emerald-900 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPosterUpdateTag}
                  onChange={(e) => setShowPosterUpdateTag(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Tandai agenda [UPDATE / BARU]</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPosterConflictTag}
                  onChange={(e) => setShowPosterConflictTag(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Tampilkan penanda Bentrok Jam di poster</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePosterZoomLink}
                  onChange={(e) => setIncludePosterZoomLink(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Sertakan URL tautan Zoom di poster</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPosterThumbnails}
                  onChange={(e) => setShowPosterThumbnails(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span>Tampilkan foto ilustrasi kegiatan</span>
              </label>
            </div>
          </div>

          {/* Live Canvas Poster Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="mx-auto max-w-[680px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block"
                aria-label={`Pratinjau poster gambar agenda ${formatTanggalIndonesia(selectedDate)}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
