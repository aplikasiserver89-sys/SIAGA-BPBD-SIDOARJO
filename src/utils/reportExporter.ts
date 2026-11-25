import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { OFFICIAL_BPBD_LOGO_SRC } from '../components/BpbdEmblem';
import { AgendaItem, ConflictDetail } from '../types/agenda';
import {
  formatTanggalIndonesia,
  formatTanggalRingkas,
  getHariIndonesia,
  sortAgendasChronological,
} from './agendaHelpers';
import { safeExternalUrl } from './rbac';

export interface DailyReportOptions {
  includeDisposisi: boolean;
  statusFilter: string;
  unitFilter: string;
}

export function filterDailyReportAgendas(
  agendas: AgendaItem[],
  selectedDate: string,
  options: DailyReportOptions
): AgendaItem[] {
  return sortAgendasChronological(
    agendas.filter((item) => {
      if (item.tanggal !== selectedDate) return false;
      if (
        options.statusFilter !== 'Semua' &&
        item.status !== options.statusFilter
      ) {
        return false;
      }
      if (
        options.unitFilter !== 'Semua' &&
        !item.pic.toLowerCase().includes(options.unitFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
  );
}

function formatJamRangeColumn(item: AgendaItem): string {
  const start = item.jamMulai.replace(':', '.');
  const end =
    !item.jamSelesai || item.jamSelesai.toLowerCase() === 'selesai'
      ? 'Selesai'
      : `${item.jamSelesai.replace(':', '.')} WIB`;
  return `${start} WIB - ${end}`;
}

export function downloadDailyAgendaExcel(
  agendas: AgendaItem[],
  selectedDate: string,
  conflictsMap: Map<string, ConflictDetail>,
  options: DailyReportOptions
) {
  const rows = filterDailyReportAgendas(agendas, selectedDate, options);
  const tglLabel = formatTanggalIndonesia(selectedDate);

  const headerMeta: (string | number)[][] = [
    ['PEMERINTAH KABUPATEN SIDOARJO'],
    ['BADAN PENANGGULANGAN BENCANA DAERAH (BPBD)'],
    ['LAPORAN REKAPITULASI AGENDA KEGIATAN HARIAN'],
    [
      `Hari / Tanggal: ${tglLabel}   |   Filter Status: ${options.statusFilter}   |   Filter Bidang/PIC: ${options.unitFilter}   |   Total: ${rows.length} Kegiatan`,
    ],
    [],
    [
      'No',
      'Tanggal',
      'Hari',
      'Jam Mulai (WIB)',
      'Jam Selesai (WIB)',
      'Nama Kegiatan',
      'Jenis Kegiatan',
      'Lokasi / Tautan Daring',
      'PIC / Bidang / Peserta',
      'Status',
      'Keterangan Bentrok',
      'Sumber / Nomor Surat',
      ...(options.includeDisposisi ? ['Catatan Disposisi'] : []),
    ],
  ];

  const dataRows = rows.map((item, idx) => {
    const safeUrl = safeExternalUrl(item.tautanDaring);
    const conflict = conflictsMap.get(item.id);
    const lokasiText = safeUrl ? `${item.lokasi} (${safeUrl})` : item.lokasi;
    const sumberText = item.nomorSurat
      ? `${item.sumber} · No. ${item.nomorSurat}`
      : item.sumber;

    return [
      idx + 1,
      item.tanggal,
      getHariIndonesia(item.tanggal),
      `${item.jamMulai.replace(':', '.')} WIB`,
      !item.jamSelesai || item.jamSelesai.toLowerCase() === 'selesai'
        ? 'Selesai'
        : `${item.jamSelesai.replace(':', '.')} WIB`,
      item.namaKegiatan,
      item.jenisKegiatan,
      lokasiText,
      item.pic,
      item.status,
      conflict ? conflict.summary : '-',
      sumberText,
      ...(options.includeDisposisi ? [item.catatanDisposisi || '-'] : []),
    ];
  });

  if (dataRows.length === 0) {
    dataRows.push([
      '-',
      selectedDate,
      getHariIndonesia(selectedDate),
      '-',
      '-',
      'Tidak ada agenda tercatat untuk filter ini',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      ...(options.includeDisposisi ? ['-'] : []),
    ]);
  }

  const sheetData = [...headerMeta, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const lastColIdx = options.includeDisposisi ? 12 : 11;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } },
  ];

  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 10 }, // Hari
    { wch: 14 }, // Jam Mulai
    { wch: 14 }, // Jam Selesai
    { wch: 42 }, // Nama Kegiatan
    { wch: 18 }, // Jenis Kegiatan
    { wch: 34 }, // Lokasi
    { wch: 24 }, // PIC
    { wch: 15 }, // Status
    { wch: 26 }, // Bentrok
    { wch: 22 }, // Sumber
    ...(options.includeDisposisi ? [{ wch: 36 }] : []),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Agenda Harian');
  XLSX.writeFile(wb, `Laporan-Agenda-BPBD-Sidoarjo-${selectedDate}.xlsx`);
}

async function loadCircularLogoDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 180;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.clip();

        const cropSize = Math.min(img.naturalWidth, img.naturalHeight) * 0.78;
        const sx = (img.naturalWidth - cropSize) / 2;
        const sy = (img.naturalHeight - cropSize) / 2;
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = OFFICIAL_BPBD_LOGO_SRC;
  });
}

export async function downloadDailyAgendaPdf(
  agendas: AgendaItem[],
  selectedDate: string,
  conflictsMap: Map<string, ConflictDetail>,
  options: DailyReportOptions
) {
  const rows = filterDailyReportAgendas(agendas, selectedDate, options);
  const tglLabel = formatTanggalIndonesia(selectedDate);
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // Official Header Banner
  doc.setFillColor(15, 41, 74); // #0F294A
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(234, 88, 12); // #EA580C accent stripe
  doc.rect(0, 30, pageWidth, 1.5, 'F');

  const logoDataUrl = await loadCircularLogoDataUrl();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, 5, 20, 20);
  }

  const textStartX = logoDataUrl ? marginX + 25 : marginX;
  doc.setTextColor(186, 230, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PEMERINTAH KABUPATEN SIDOARJO', textStartX, 10.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('BADAN PENANGGULANGAN BENCANA DAERAH (BPBD)', textStartX, 16.8);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Jl. Raya Kemiri No. 1 Sidoarjo · Laporan Rekapitulasi Agenda Kegiatan Harian (SIAGA AGENDA BPBD)',
    textStartX,
    22.8
  );

  // Right Date Box in Header
  doc.setTextColor(253, 224, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(tglLabel, pageWidth - marginX, 14.5, { align: 'right' });

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Total: ${rows.length} Kegiatan · Status: ${options.statusFilter}`,
    pageWidth - marginX,
    21,
    { align: 'right' }
  );

  const headCols = [
    'No',
    'Waktu (WIB)',
    'Nama Kegiatan',
    'Jenis',
    'Lokasi / Tautan',
    'PIC / Bidang',
    'Status',
    ...(options.includeDisposisi ? ['Catatan Disposisi & No. Surat'] : []),
  ];

  const bodyRows =
    rows.length === 0
      ? [
          [
            '-',
            '-',
            `Tidak ada agenda tercatat untuk tanggal ${tglLabel}`,
            '-',
            '-',
            '-',
            '-',
            ...(options.includeDisposisi ? ['-'] : []),
          ],
        ]
      : rows.map((item, idx) => {
          const safeUrl = safeExternalUrl(item.tautanDaring);
          const conflict = conflictsMap.get(item.id);
          const lokasiText = safeUrl
            ? `${item.lokasi}\n${safeUrl}`
            : item.lokasi;
          const statusText =
            conflict?.severity === 'tinggi'
              ? `${item.status}\n(Jam Paralel)`
              : item.status;
          const dispParts = [
            item.nomorSurat ? `No. Surat: ${item.nomorSurat}` : '',
            item.catatanDisposisi || '',
          ]
            .filter(Boolean)
            .join('\n');

          return [
            String(idx + 1),
            formatJamRangeColumn(item),
            item.namaKegiatan,
            item.jenisKegiatan,
            lokasiText,
            item.pic,
            statusText,
            ...(options.includeDisposisi ? [dispParts || '-'] : []),
          ];
        });

  autoTable(doc, {
    head: [headCols],
    body: bodyRows,
    startY: 37,
    margin: { left: marginX, right: marginX, bottom: 24 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      cellPadding: 2.6,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 41, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: options.includeDisposisi
      ? {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 56 },
          3: { cellWidth: 26 },
          4: { cellWidth: 46 },
          5: { cellWidth: 32 },
          6: { cellWidth: 24 },
          7: { cellWidth: 43 },
        }
      : {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 34, fontStyle: 'bold' },
          2: { cellWidth: 70 },
          3: { cellWidth: 30 },
          4: { cellWidth: 58 },
          5: { cellWidth: 40 },
          6: { cellWidth: 27 },
        },
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'SIAGA AGENDA BPBD Kabupaten Sidoarjo — Laporan Rekap Agenda Harian',
        marginX,
        pageHeight - 8
      );
      doc.text(
        `Halaman ${hookData.pageNumber} dari ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 60;

  if (finalY + 28 < pageHeight - 14) {
    const signX = pageWidth - marginX - 64;
    const signY = finalY + 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Sidoarjo, ${formatTanggalRingkas(selectedDate)}`, signX, signY);
    doc.text('Pengadministrasi Umum · Subbag. Umpeg', signX, signY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 41, 74);
    doc.text('BPBD Kabupaten Sidoarjo', signX, signY + 15);
  }

  doc.save(`Laporan-Agenda-BPBD-Sidoarjo-${selectedDate}.pdf`);
}
