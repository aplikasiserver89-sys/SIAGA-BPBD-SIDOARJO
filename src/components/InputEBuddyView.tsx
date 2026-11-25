import React, { useState } from 'react';
import {
  ClipboardPaste,
  Plus,
  Wand2,
} from 'lucide-react';
import { EBUDDY_SAMPLES } from '../data/initialData';
import { MasterUnit } from '../types/agenda';
import { parseEBuddyText } from '../utils/agendaHelpers';
import { AgendaDraftPrefill } from './CreateAgendaModal';

interface InputEBuddyViewProps {
  defaultDate: string;
  units: MasterUnit[];
  onOpenCreateModal: (prefill?: AgendaDraftPrefill) => void;
}

export const InputEBuddyView: React.FC<InputEBuddyViewProps> = ({
  defaultDate,
  units,
  onOpenCreateModal,
}) => {
  const [rawMemoText, setRawMemoText] = useState('');

  const handleExtractAndOpen = (textOverride?: string) => {
    const source = textOverride ?? rawMemoText;
    if (!source.trim()) return;

    const parsed = parseEBuddyText(source, units);
    onOpenCreateModal({
      tanggal: parsed.tanggal || defaultDate,
      jamMulai: parsed.jamMulai || '08:00',
      jamSelesai: parsed.jamSelesai || 'Selesai',
      namaKegiatan: parsed.namaKegiatan || '',
      jenisKegiatan: parsed.jenisKegiatan || 'Rapat Koordinasi',
      lokasi: parsed.lokasi || '',
      tautanDaring: parsed.tautanDaring || '',
      pic: parsed.pic || '',
      status: 'Update / Baru',
      nomorSurat: parsed.nomorSurat || '',
      sumber: 'e-Buddy',
      catatanDisposisi: parsed.catatanDisposisi || '',
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Ekstraksi Cepat Surat Masuk & Disposisi
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Input Agenda dari e-Buddy
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Klik tombol <strong>Input Agenda Baru</strong> untuk mengisi jadwal
            secara langsung, atau tempel teks surat masuk e-Buddy di bawah ini.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenCreateModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Input Agenda Baru</span>
        </button>
      </div>

      {/* Focused e-Buddy Paste & Extract Card (Manual fields hidden until triggered) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Ekstrak Teks Surat / Memo e-Buddy
            </h3>
          </div>
          {rawMemoText && (
            <button
              type="button"
              onClick={() => setRawMemoText('')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Bersihkan
            </button>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">
            Uji cepat dengan contoh teks surat masuk:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EBUDDY_SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  setRawMemoText(sample.text);
                  handleExtractAndOpen(sample.text);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-sky-50 hover:text-sky-800 rounded-md transition-colors text-left"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="ebuddy-raw-textarea"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Tempel teks undangan, disposisi e-Buddy, atau pesan WhatsApp
          </label>
          <textarea
            id="ebuddy-raw-textarea"
            rows={8}
            placeholder={`Contoh format:\nNomor Surat: 005/2194/438.1.1/2026\nPerihal: Rapat Koordinasi Hidrometeorologi\nHari/Tanggal: Senin, 23 November 2026\nPukul: 08.00 - 10.30 WIB\nTempat: Ruang Rapat Setda Kab. Sidoarjo\nDisposisi: Kalaksa menugaskan Bid. KL`}
            value={rawMemoText}
            onChange={(e) => setRawMemoText(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onOpenCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Isi Form Kosong</span>
          </button>

          <button
            type="button"
            disabled={!rawMemoText.trim()}
            onClick={() => handleExtractAndOpen()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            <span>Ekstrak & Buat Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
