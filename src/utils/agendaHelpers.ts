import {
  AgendaCategory,
  AgendaItem,
  ConflictDetail,
  MasterUnit,
} from '../types/agenda';

const HARI_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const BULAN_MAP: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  agu: '08',
  agt: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nov: '11',
  desember: '12',
  des: '12',
};

export function parseDateSafe(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getHariIndonesia(dateStr: string): string {
  if (!dateStr) return '';
  const dt = parseDateSafe(dateStr);
  return HARI_ID[dt.getDay()] || '';
}

export function formatTanggalIndonesia(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const hari = getHariIndonesia(dateStr);
  const bulan = BULAN_ID[m - 1] || '';
  return `${hari}, ${d} ${bulan} ${y}`;
}

export function formatTanggalRingkas(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const bulan = (BULAN_ID[m - 1] || '').slice(0, 3);
  return `${d} ${bulan} ${y}`;
}

export function timeToMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function getEndMinutes(item: Pick<AgendaItem, 'jamMulai' | 'jamSelesai'>): number {
  const start = timeToMinutes(item.jamMulai);
  if (!item.jamSelesai || item.jamSelesai.toLowerCase() === 'selesai') {
    return start + 120; // asumsi 2 jam bila tidak ada jam selesai eksplisit
  }
  const end = timeToMinutes(item.jamSelesai);
  return end > start ? end : start + 90;
}

export function formatRentangWIB(
  jamMulai: string,
  jamSelesai?: string
): string {
  const startDisp = jamMulai.replace(':', '.');
  if (!jamSelesai || jamSelesai.toLowerCase() === 'selesai') {
    return `${startDisp} WIB - Selesai`;
  }
  return `${startDisp} - ${jamSelesai.replace(':', '.')} WIB`;
}

export function sortAgendasChronological(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    const diff = timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
    if (diff !== 0) return diff;
    return a.namaKegiatan.localeCompare(b.namaKegiatan);
  });
}

export function detectConflictsForDate(
  items: AgendaItem[],
  targetDate: string
): Map<string, ConflictDetail> {
  const active = items.filter(
    (item) =>
      item.tanggal === targetDate &&
      item.status !== 'Dibatalkan' &&
      item.status !== 'Ditunda'
  );

  const map = new Map<string, ConflictDetail>();

  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    const aStart = timeToMinutes(a.jamMulai);
    const aEnd = getEndMinutes(a);

    const highIds: string[] = [];
    const medIds: string[] = [];

    for (let j = 0; j < active.length; j++) {
      if (i === j) continue;
      const b = active[j];
      const bStart = timeToMinutes(b.jamMulai);
      const bEnd = getEndMinutes(b);

      const overlaps = aStart < bEnd && bStart < aEnd;
      if (overlaps) {
        highIds.push(b.id);
      } else {
        const gap =
          aEnd <= bStart ? bStart - aEnd : bEnd <= aStart ? aStart - bEnd : 999;
        const sameLoc =
          a.lokasi.trim().toLowerCase() === b.lokasi.trim().toLowerCase();
        if (gap <= 30 && !sameLoc) {
          medIds.push(b.id);
        }
      }
    }

    if (highIds.length > 0) {
      map.set(a.id, {
        itemId: a.id,
        conflictingIds: [...highIds, ...medIds],
        severity: 'tinggi',
        summary: `Bentrok jam WIB dengan ${highIds.length} agenda lain`,
      });
    } else if (medIds.length > 0) {
      map.set(a.id, {
        itemId: a.id,
        conflictingIds: medIds,
        severity: 'sedang',
        summary: `Jeda <= 30 menit dengan ${medIds.length} agenda berbeda lokasi`,
      });
    }
  }

  return map;
}

export function previewDraftConflicts(
  draft: {
    id?: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    lokasi: string;
    status: string;
  },
  existingItems: AgendaItem[]
): { item: AgendaItem; type: 'overlap' | 'tight' }[] {
  if (
    !draft.tanggal ||
    !draft.jamMulai ||
    draft.status === 'Dibatalkan' ||
    draft.status === 'Ditunda'
  ) {
    return [];
  }

  const dStart = timeToMinutes(draft.jamMulai);
  const dEnd = getEndMinutes({
    jamMulai: draft.jamMulai,
    jamSelesai: draft.jamSelesai,
  });

  const results: { item: AgendaItem; type: 'overlap' | 'tight' }[] = [];

  for (const item of existingItems) {
    if (
      item.id === draft.id ||
      item.tanggal !== draft.tanggal ||
      item.status === 'Dibatalkan' ||
      item.status === 'Ditunda'
    ) {
      continue;
    }

    const iStart = timeToMinutes(item.jamMulai);
    const iEnd = getEndMinutes(item);

    if (dStart < iEnd && iStart < dEnd) {
      results.push({ item, type: 'overlap' });
    } else {
      const gap =
        dEnd <= iStart ? iStart - dEnd : iEnd <= dStart ? dStart - iEnd : 999;
      const sameLoc =
        draft.lokasi.trim().toLowerCase() === item.lokasi.trim().toLowerCase();
      if (gap <= 30 && !sameLoc) {
        results.push({ item, type: 'tight' });
      }
    }
  }

  return results;
}

export function getActiveOrUpcomingAgenda(
  items: AgendaItem[],
  targetDate: string,
  currentMinutesWIB: number
): {
  mode: 'berlangsung' | 'terdekat' | 'selesai' | 'kosong';
  item: AgendaItem | null;
} {
  const dayItems = sortAgendasChronological(
    items.filter(
      (x) =>
        x.tanggal === targetDate &&
        x.status !== 'Dibatalkan' &&
        x.status !== 'Ditunda'
    )
  );

  if (dayItems.length === 0) {
    return { mode: 'kosong', item: null };
  }

  const ongoing = dayItems.find((x) => {
    const start = timeToMinutes(x.jamMulai);
    const end = getEndMinutes(x);
    return currentMinutesWIB >= start && currentMinutesWIB < end;
  });

  if (ongoing) {
    return { mode: 'berlangsung', item: ongoing };
  }

  const upcoming = dayItems.find(
    (x) => timeToMinutes(x.jamMulai) > currentMinutesWIB
  );
  if (upcoming) {
    return { mode: 'terdekat', item: upcoming };
  }

  return { mode: 'selesai', item: dayItems[dayItems.length - 1] };
}

export interface ParsedEBuddyResult {
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  namaKegiatan?: string;
  jenisKegiatan?: AgendaCategory;
  lokasi?: string;
  tautanDaring?: string;
  pic?: string;
  nomorSurat?: string;
  catatanDisposisi?: string;
  fieldsExtracted: string[];
}

export function parseEBuddyText(
  rawText: string,
  units: MasterUnit[]
): ParsedEBuddyResult {
  const text = rawText.trim();
  const fieldsExtracted: string[] = [];
  if (!text) return { fieldsExtracted };

  const result: ParsedEBuddyResult = { fieldsExtracted };

  // 1. Nomor Surat
  const nomorMatch = text.match(
    /(?:nomor(?:\s*surat)?|no\.?(?:\s*surat)?)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (nomorMatch) {
    result.nomorSurat = nomorMatch[1].trim();
    fieldsExtracted.push('Nomor Surat');
  }

  // 2. Tanggal (e.g., 23 November 2026 or 23/11/2026 or 23-11-2026)
  const textDateMatch = text.match(
    /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|agt|sep|sept|okt|nov|des)\s+(\d{4})/i
  );
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0');
    const month = BULAN_MAP[textDateMatch[2].toLowerCase()] || '11';
    const year = textDateMatch[3];
    result.tanggal = `${year}-${month}-${day}`;
    fieldsExtracted.push('Tanggal');
  } else {
    const numDateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (numDateMatch) {
      const day = numDateMatch[1].padStart(2, '0');
      const month = numDateMatch[2].padStart(2, '0');
      const year = numDateMatch[3];
      result.tanggal = `${year}-${month}-${day}`;
      fieldsExtracted.push('Tanggal');
    }
  }

  // 3. Jam Mulai & Selesai (WIB)
  const timeRangeMatch = text.match(
    /(\d{1,2})[:.](\d{2})\s*(?:-|–|s\.?d\.?|sampai(?:\s+dengan)?|hingga)\s*(?:(\d{1,2})[:.](\d{2})|(selesai))/i
  );
  if (timeRangeMatch) {
    const sh = timeRangeMatch[1].padStart(2, '0');
    const sm = timeRangeMatch[2];
    result.jamMulai = `${sh}:${sm}`;
    if (timeRangeMatch[3] && timeRangeMatch[4]) {
      result.jamSelesai = `${timeRangeMatch[3].padStart(2, '0')}:${timeRangeMatch[4]}`;
    } else {
      result.jamSelesai = 'Selesai';
    }
    fieldsExtracted.push('Jam WIB');
  } else {
    const singleTimeMatch = text.match(
      /(?:pukul|jam|waktu)\s*[:\-]?\s*(\d{1,2})[:.](\d{2})/i
    );
    if (singleTimeMatch) {
      result.jamMulai = `${singleTimeMatch[1].padStart(2, '0')}:${singleTimeMatch[2]}`;
      result.jamSelesai = 'Selesai';
      fieldsExtracted.push('Jam WIB');
    }
  }

  // 4. Nama Kegiatan
  const kegiatanMatch = text.match(
    /(?:acara|kegiatan|perihal|hal|undangan)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (kegiatanMatch) {
    result.namaKegiatan = kegiatanMatch[1].trim();
    fieldsExtracted.push('Nama Kegiatan');
  } else {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 10 &&
          !/^(disposisi|nomor|no\.|hari|tanggal|pukul|jam|waktu|tempat|lokasi|peserta|pic)/i.test(
            l
          )
      );
    if (lines.length > 0) {
      result.namaKegiatan = lines[0].replace(/^[-•*]\s*/, '');
      fieldsExtracted.push('Nama Kegiatan');
    }
  }

  // 5. Link Zoom / Daring & Lokasi
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    result.tautanDaring = urlMatch[0].replace(/[.,;)]+$/, '');
    fieldsExtracted.push('Tautan Daring');
  }

  const lokasiMatch = text.match(
    /(?:tempat|lokasi|bertempat\s+di)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (lokasiMatch) {
    let locVal = lokasiMatch[1].trim();
    if (result.tautanDaring && locVal.includes(result.tautanDaring)) {
      locVal = locVal.replace(result.tautanDaring, '').trim();
    }
    result.lokasi = locVal || 'Daring (Zoom Meeting)';
    fieldsExtracted.push('Lokasi');
  } else if (/zoom|google\s*meet|daring|online|virtual/i.test(text)) {
    result.lokasi = 'Daring (Zoom Meeting)';
    fieldsExtracted.push('Lokasi');
  }

  // 6. PIC / Penanggung Jawab / Peserta
  const picMatch = text.match(
    /(?:pic|penanggung\s*jawab|peserta(?:\/pic)?|dihadiri\s*oleh|menghadiri)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (picMatch) {
    result.pic = picMatch[1].trim();
    fieldsExtracted.push('PIC / Peserta');
  } else {
    const matchedUnits = units
      .filter((u) => text.toLowerCase().includes(u.nama.toLowerCase()))
      .map((u) => u.nama);
    if (matchedUnits.length > 0) {
      result.pic = matchedUnits.slice(0, 2).join(' dan ');
      fieldsExtracted.push('PIC / Peserta');
    }
  }

  // 7. Catatan / Disposisi
  const dispMatch = text.match(
    /(?:disposisi|catatan|keterangan|nb|mohon)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (dispMatch && !/^surat\s+masuk/i.test(dispMatch[1].trim())) {
    result.catatanDisposisi = dispMatch[1].trim();
    fieldsExtracted.push('Catatan Disposisi');
  }

  // 8. Klasifikasi Jenis Kegiatan
  const lower = (result.namaKegiatan || text).toLowerCase();
  if (/simulasi|lapangan|peninjauan|evakuasi|cek\s+lokasi/.test(lower)) {
    result.jenisKegiatan = 'Simulasi/Lapangan';
  } else if (/kunjungan|audiensi|study|edukasi\s+tk|ra\s+|sd\s+/.test(lower)) {
    result.jenisKegiatan = 'Kunjungan';
  } else if (/pelatihan|diklat|bimtek|workshop|k3|training/.test(lower)) {
    result.jenisKegiatan = 'Edukasi/Pelatihan';
  } else if (/sosialisasi|penyuluhan|kampanye/.test(lower)) {
    result.jenisKegiatan = 'Sosialisasi';
  } else {
    result.jenisKegiatan = 'Rapat Koordinasi';
  }

  return result;
}

export interface WAMessageOptions {
  includeDisposisi: boolean;
  includeConflictNote: boolean;
  onlyUpdates: boolean;
}

export function generateLeadershipWA(
  items: AgendaItem[],
  tanggal: string,
  conflicts: Map<string, ConflictDetail>,
  options: WAMessageOptions
): string {
  const filtered = sortAgendasChronological(
    items.filter((x) => {
      if (x.tanggal !== tanggal) return false;
      if (options.onlyUpdates && x.status !== 'Update / Baru') return false;
      return true;
    })
  );

  const tglText = formatTanggalIndonesia(tanggal);
  if (filtered.length === 0) {
    return `Yth. Bapak Kalaksa, Ibu Sekretaris, dan Para Kabid/Kasubbag BPBD Kab. Sidoarjo.\n\nBelum terdapat agenda terjadwal untuk *${tglText}* sesuai filter yang dipilih.`;
  }

  const conflictSlots = new Set<string>();
  filtered.forEach((item) => {
    const c = conflicts.get(item.id);
    if (c?.severity === 'tinggi') {
      conflictSlots.add(item.jamMulai.replace(':', '.'));
    }
  });

  const lines: string[] = [
    `*RINGKASAN AGENDA PIMPINAN — BPBD KAB. SIDOARJO*`,
    `Hari/Tanggal: *${tglText}*`,
    `Total Agenda: ${filtered.length} kegiatan`,
    ``,
  ];

  filtered.forEach((item, idx) => {
    const jam = item.jamMulai.replace(':', '.');
    const statusTag =
      item.status === 'Update / Baru'
        ? ' [UPDATE/BARU]'
        : item.status === 'Ditunda'
          ? ' [DITUNDA]'
          : item.status === 'Dibatalkan'
            ? ' [DIBATALKAN]'
            : '';
    const conflictTag =
      options.includeConflictNote && conflicts.get(item.id)?.severity === 'tinggi'
        ? ' ⚠️(Bentrok Jam)'
        : '';

    lines.push(`${idx + 1}. *${jam} WIB* — ${item.namaKegiatan}${statusTag}${conflictTag}`);
    lines.push(
      `   • Lokasi: ${item.lokasi}${item.tautanDaring ? ` (${item.tautanDaring})` : ''}`
    );
    lines.push(`   • PIC/Perwakilan: *${item.pic}*`);
    if (options.includeDisposisi && item.catatanDisposisi) {
      lines.push(`   • Disposisi: _${item.catatanDisposisi}_`);
    }
  });

  if (options.includeConflictNote && conflictSlots.size > 0) {
    lines.push(``);
    lines.push(
      `⚠️ *Catatan Koordinasi Jam Paralel:* Pukul ${Array.from(conflictSlots).join(', ')} WIB terdapat agenda bersamaan. Mohon arahan/konfirmasi perwakilan masing-masing bidang.`
    );
  }

  lines.push(``);
  lines.push(`_Disampaikan oleh Pengadministrasi Umum · SIAGA AGENDA BPBD Sidoarjo_`);

  return lines.join('\n');
}

export function generateStaffGroupWA(
  items: AgendaItem[],
  tanggal: string,
  conflicts: Map<string, ConflictDetail>,
  options: WAMessageOptions
): string {
  const filtered = sortAgendasChronological(
    items.filter((x) => {
      if (x.tanggal !== tanggal) return false;
      if (options.onlyUpdates && x.status !== 'Update / Baru') return false;
      return true;
    })
  );

  const tglText = formatTanggalIndonesia(tanggal);
  if (filtered.length === 0) {
    return `*INFO AGENDA KEGIATAN BPBD KAB. SIDOARJO*\n${tglText}\n\nBelum ada agenda tercatat untuk filter saat ini.`;
  }

  const lines: string[] = [
    `Assalamu'alaikum Wr. Wb. / Selamat Pagi Rekan-rekan BPBD Kab. Sidoarjo.`,
    `Berikut disampaikan *Rekap Agenda Kegiatan BPBD Kabupaten Sidoarjo* :`,
    ``,
    `📅 *${tglText}*`,
    `------------------------------------`,
  ];

  filtered.forEach((item) => {
    const jam = formatRentangWIB(item.jamMulai, item.jamSelesai);
    const updateBadge =
      item.status === 'Update / Baru' ? ` *[UPDATE / BARU]*` : '';
    const cancelBadge =
      item.status === 'Ditunda'
        ? ` *[DITUNDA]*`
        : item.status === 'Dibatalkan'
          ? ` *[DIBATALKAN]*`
          : '';

    lines.push(`🕒 *${jam}*${updateBadge}${cancelBadge}`);
    lines.push(`📌 ${item.namaKegiatan}`);
    lines.push(
      `📍 Lokasi: ${item.lokasi}${item.tautanDaring ? `\n🔗 Tautan: ${item.tautanDaring}` : ''}`
    );
    lines.push(`👥 PIC / Peserta: *${item.pic}*`);
    if (options.includeDisposisi && item.catatanDisposisi) {
      lines.push(`📝 Catatan: ${item.catatanDisposisi}`);
    }
    if (options.includeConflictNote && conflicts.get(item.id)?.severity === 'tinggi') {
      lines.push(`⚠️ _Perhatian: Waktu bersamaan dengan agenda lain, mohon koordinasi personel._`);
    }
    lines.push(``);
  });

  lines.push(`------------------------------------`);
  lines.push(
    `Mohon kepada Bidang/Personel yang tercantum untuk mempersiapkan kehadiran dan dokumentasi kegiatan.`
  );
  lines.push(`Terima kasih. — *Admin Agenda / Umpeg BPBD Kab. Sidoarjo*`);

  return lines.join('\n');
}

export function buildWhatsAppShareUrl(message: string): string {
  const cleanText = (message || '').trim().slice(0, 3800);
  return `https://wa.me/?text=${encodeURIComponent(cleanText)}`;
}

export function downloadAgendaCsv(items: AgendaItem[], tanggal: string) {
  const sorted = sortAgendasChronological(
    items.filter((x) => x.tanggal === tanggal)
  );
  const headers = [
    'Tanggal',
    'Hari',
    'Jam Mulai (WIB)',
    'Jam Selesai (WIB)',
    'Nama Kegiatan',
    'Jenis Kegiatan',
    'Lokasi',
    'Tautan Daring',
    'PIC / Peserta',
    'Status',
    'Nomor Surat',
    'Sumber',
    'Catatan Disposisi',
  ];

  const escapeCsv = (val: string) => {
    const str = (val || '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sorted.map((item) =>
    [
      item.tanggal,
      getHariIndonesia(item.tanggal),
      item.jamMulai,
      item.jamSelesai,
      item.namaKegiatan,
      item.jenisKegiatan,
      item.lokasi,
      item.tautanDaring || '',
      item.pic,
      item.status,
      item.nomorSurat || '',
      item.sumber,
      item.catatanDisposisi,
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-agenda-bpbd-sidoarjo-${tanggal}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
