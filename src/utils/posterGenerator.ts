import { OFFICIAL_BPBD_LOGO_SRC } from '../components/BpbdEmblem';
import { AgendaCategory, AgendaItem, ConflictDetail } from '../types/agenda';
import {
  formatTanggalIndonesia,
  sortAgendasChronological,
} from './agendaHelpers';

export interface PosterOptions {
  showConflictTag: boolean;
  showUpdateTag: boolean;
  includeZoomLink: boolean;
  onlyUpdates: boolean;
  showThumbnails?: boolean;
  customSubtitle?: string;
}

const POSTER_ASSETS = {
  logo: OFFICIAL_BPBD_LOGO_SRC,
  headerHero: '/src/assets/images/poster_header_hero_1795442668021.jpg',
  thumbDamkar: '/src/assets/images/thumb_damkar_kunjungan_1795442668250.jpg',
  thumbRapat: '/src/assets/images/thumb_rapat_koordinasi_1795442668672.jpg',
  thumbZoom: '/src/assets/images/thumb_daring_zoom_1795442668276.jpg',
  thumbSimulasi: '/src/assets/images/thumb_simulasi_lapangan_1795442669815.jpg',
};

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getThumbnailSrcForAgenda(item: AgendaItem): string {
  const hay = `${item.namaKegiatan} ${item.lokasi}`.toLowerCase();
  if (
    hay.includes('zoom') ||
    hay.includes('daring') ||
    hay.includes('online') ||
    Boolean(item.tautanDaring)
  ) {
    return POSTER_ASSETS.thumbZoom;
  }
  if (
    item.jenisKegiatan === 'Simulasi/Lapangan' ||
    hay.includes('simulasi') ||
    hay.includes('apar') ||
    hay.includes('gempa')
  ) {
    return POSTER_ASSETS.thumbSimulasi;
  }
  if (
    item.jenisKegiatan === 'Kunjungan' ||
    hay.includes('kunjungan') ||
    hay.includes('ra ') ||
    hay.includes('tk ') ||
    hay.includes('unit buduran')
  ) {
    return POSTER_ASSETS.thumbDamkar;
  }
  return POSTER_ASSETS.thumbRapat;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawCategoryIcon(
  ctx: CanvasRenderingContext2D,
  category: AgendaCategory,
  cx: number,
  cy: number,
  r: number,
  accentColor: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.fillStyle = accentColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (category === 'Edukasi/Pelatihan') {
    ctx.strokeRect(cx - 10, cy - 7, 20, 12);
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy + 8);
    ctx.lineTo(cx + 13, cy + 8);
    ctx.stroke();
  } else if (category === 'Simulasi/Lapangan') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.quadraticCurveTo(cx + 9, cy - 2, cx + 6, cy + 7);
    ctx.quadraticCurveTo(cx, cy + 12, cx - 6, cy + 7);
    ctx.quadraticCurveTo(cx - 9, cy - 2, cx, cy - 11);
    ctx.fill();
  } else if (category === 'Rapat Koordinasi') {
    ctx.strokeRect(cx - 10, cy - 8, 20, 12);
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 8);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 5, cy + 8);
    ctx.stroke();
  } else if (category === 'Kunjungan') {
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 3, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 4, cy + 7, 6.5, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 11, cy - 1);
    ctx.lineTo(cx + 8, cy - 1);
    ctx.lineTo(cx + 8, cy + 9);
    ctx.lineTo(cx - 8, cy + 9);
    ctx.lineTo(cx - 8, cy - 1);
    ctx.lineTo(cx - 11, cy - 1);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

export async function renderAgendaPosterCanvas(
  canvas: HTMLCanvasElement,
  agendas: AgendaItem[],
  selectedDate: string,
  conflictsMap: Map<string, ConflictDetail>,
  options: PosterOptions
) {
  const showThumbnails = options.showThumbnails !== false;

  const [logoImg, headerHeroImg, thumbDamkar, thumbRapat, thumbZoom, thumbSimulasi] =
    await Promise.all([
      loadImage(POSTER_ASSETS.logo),
      loadImage(POSTER_ASSETS.headerHero),
      loadImage(POSTER_ASSETS.thumbDamkar),
      loadImage(POSTER_ASSETS.thumbRapat),
      loadImage(POSTER_ASSETS.thumbZoom),
      loadImage(POSTER_ASSETS.thumbSimulasi),
    ]);

  const thumbMap: Record<string, HTMLImageElement | null> = {
    [POSTER_ASSETS.thumbDamkar]: thumbDamkar,
    [POSTER_ASSETS.thumbRapat]: thumbRapat,
    [POSTER_ASSETS.thumbZoom]: thumbZoom,
    [POSTER_ASSETS.thumbSimulasi]: thumbSimulasi,
  };

  const filtered = sortAgendasChronological(
    agendas.filter((a) => {
      if (a.tanggal !== selectedDate) return false;
      if (options.onlyUpdates && a.status !== 'Update / Baru') return false;
      return true;
    })
  );

  const WIDTH = 1080;
  const HEADER_H = 236;
  const TOP_PAD = 26;
  const FOOTER_H = 148;
  const ROW_GAP = 14;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const TEXT_MAX_W = showThumbnails ? 360 : 480;
  const PIC_MAX_W = showThumbnails ? 155 : 210;

  interface MeasuredRow {
    item: AgendaItem;
    titleLines: string[];
    locLines: string[];
    picLines: string[];
    rowH: number;
    hasBadgeLine: boolean;
  }

  const measuredRows: MeasuredRow[] = filtered.map((item) => {
    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapText(ctx, item.namaKegiatan, TEXT_MAX_W);

    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    const locFull = `di ${item.lokasi}${
      options.includeZoomLink && item.tautanDaring
        ? ` (${item.tautanDaring})`
        : ''
    }`;
    const locLines = wrapText(ctx, locFull, TEXT_MAX_W);

    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    const picLines = wrapText(ctx, item.pic, PIC_MAX_W);

    const hasBadgeLine =
      (options.showUpdateTag && item.status === 'Update / Baru') ||
      item.status === 'Ditunda' ||
      item.status === 'Dibatalkan' ||
      (options.showConflictTag &&
        conflictsMap.get(item.id)?.severity === 'tinggi');

    const textHeight =
      (hasBadgeLine ? 22 : 0) +
      titleLines.length * 25 +
      6 +
      locLines.length * 21;
    const picHeight = picLines.length * 21 + 26;
    const rowH = Math.max(96, textHeight + 22, picHeight + 16);

    return { item, titleLines, locLines, picLines, rowH, hasBadgeLine };
  });

  const bodyContentHeight =
    measuredRows.length === 0
      ? 220
      : measuredRows.reduce((sum, r) => sum + r.rowH, 0) +
        (measuredRows.length - 1) * ROW_GAP;

  const TOTAL_H = HEADER_H + TOP_PAD + bodyContentHeight + 34 + FOOTER_H;

  canvas.width = WIDTH;
  canvas.height = TOTAL_H;

  // 1. Soft Warm Light Background (matching official poster)
  const bgGrad = ctx.createLinearGradient(0, HEADER_H, 0, TOTAL_H - FOOTER_H);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.75, '#F8FAFC');
  bgGrad.addColorStop(1, '#FFF7ED');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, TOTAL_H);

  // 2. Header Banner with Hero Photo & Diagonal Orange Ribbon
  const headerGrad = ctx.createLinearGradient(0, 0, WIDTH, HEADER_H);
  headerGrad.addColorStop(0, '#071A36');
  headerGrad.addColorStop(0.55, '#0F2E59');
  headerGrad.addColorStop(1, '#173E74');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, WIDTH, HEADER_H);

  if (headerHeroImg) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(540, 0);
    ctx.lineTo(WIDTH, 0);
    ctx.lineTo(WIDTH, HEADER_H);
    ctx.lineTo(465, HEADER_H);
    ctx.closePath();
    ctx.clip();

    drawCoverImage(ctx, headerHeroImg, 465, 0, WIDTH - 465, HEADER_H);

    // Smooth dark blue/navy left fade scrim + subtle top-right dark gradient for tagline legibility
    const scrim = ctx.createLinearGradient(465, 0, WIDTH, 0);
    scrim.addColorStop(0, 'rgba(7, 26, 54, 0.92)');
    scrim.addColorStop(0.32, 'rgba(15, 46, 89, 0.35)');
    scrim.addColorStop(0.7, 'rgba(7, 26, 54, 0.15)');
    scrim.addColorStop(1, 'rgba(7, 26, 54, 0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(465, 0, WIDTH - 465, HEADER_H);
    ctx.restore();

    // Diagonal Orange Divider Stripe (like reference poster)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(535, 0);
    ctx.lineTo(549, 0);
    ctx.lineTo(474, HEADER_H);
    ctx.lineTo(460, HEADER_H);
    ctx.closePath();
    ctx.fillStyle = '#F97316';
    ctx.fill();
    ctx.restore();
  }

  // Official Uploaded BPBD Kab. Sidoarjo Logo (top-left, cleanly circular-cropped)
  if (logoImg) {
    ctx.save();
    const logoCx = 94;
    const logoCy = 86;
    const logoR = 58;
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.clip();

    // Crop the centered circular emblem region from the 4:3 JPEG
    const cropSize = Math.min(logoImg.naturalWidth, logoImg.naturalHeight) * 0.78;
    const sx = (logoImg.naturalWidth - cropSize) / 2;
    const sy = (logoImg.naturalHeight - cropSize) / 2;
    ctx.drawImage(
      logoImg,
      sx,
      sy,
      cropSize,
      cropSize,
      logoCx - logoR,
      logoCy - logoR,
      logoR * 2,
      logoR * 2
    );
    ctx.restore();
  }

  // Main Header Title
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AGENDA KEGIATAN', 174, 76);

  ctx.fillStyle = '#FBBF24';
  ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('BPBD KAB. SIDOARJO', 174, 124);
  ctx.restore();

  // Right Tagline (top-right corner over dark scrim)
  ctx.save();
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Sidoarjo', WIDTH - 26, 36);
  ctx.fillText('Tangguh', WIDTH - 26, 58);
  ctx.fillStyle = '#FDE68A';
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Selamat', WIDTH - 26, 80);
  ctx.fillText('Bersama', WIDTH - 26, 100);
  ctx.restore();

  // Orange Date Ribbon Bar
  const dateLabel = formatTanggalIndonesia(selectedDate);
  const pillX = 32;
  const pillY = 160;
  const pillW = 550;
  const pillH = 52;
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pillGrad.addColorStop(0, '#EA580C');
  pillGrad.addColorStop(1, '#F97316');
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 26);
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.stroke();

  // Calendar Icon inside Date Pill
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.3;
  ctx.strokeRect(pillX + 22, pillY + 15, 22, 20);
  ctx.beginPath();
  ctx.moveTo(pillX + 22, pillY + 22);
  ctx.lineTo(pillX + 44, pillY + 22);
  ctx.moveTo(pillX + 28, pillY + 12);
  ctx.lineTo(pillX + 28, pillY + 17);
  ctx.moveTo(pillX + 38, pillY + 12);
  ctx.lineTo(pillX + 38, pillY + 17);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(dateLabel, pillX + 58, pillY + pillH / 2 + 1);

  // 3. Vertical Dotted Connector Line
  if (measuredRows.length > 1) {
    let firstCenterY = 0;
    let lastCenterY = 0;
    let accY = HEADER_H + TOP_PAD;
    measuredRows.forEach((r, idx) => {
      const cy = accY + r.rowH / 2;
      if (idx === 0) firstCenterY = cy;
      if (idx === measuredRows.length - 1) lastCenterY = cy;
      accY += r.rowH + ROW_GAP;
    });

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(106, firstCenterY);
    ctx.lineTo(106, lastCenterY);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Render Chronological Rows
  if (measuredRows.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Belum ada agenda tercatat untuk ${dateLabel}`,
      WIDTH / 2,
      HEADER_H + 120
    );
  } else {
    let cursorY = HEADER_H + TOP_PAD;

    measuredRows.forEach((row, idx) => {
      const { item, titleLines, locLines, picLines, rowH, hasBadgeLine } = row;
      const isOrange = idx % 2 === 0;
      const badgeColor = isOrange ? '#EA580C' : '#0B5394';
      const conflict = conflictsMap.get(item.id);

      // Clean subtle row divider / card surface
      drawRoundedRect(ctx, 24, cursorY, WIDTH - 48, rowH, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Time Pill Capsule (Left)
      const timeBoxX = 34;
      const timeBoxW = 148;
      const timeBoxH = 62;
      const timeBoxY = cursorY + (rowH - timeBoxH) / 2;
      drawRoundedRect(ctx, timeBoxX, timeBoxY, timeBoxW, timeBoxH, 31);
      ctx.fillStyle = badgeColor;
      ctx.fill();

      drawCategoryIcon(
        ctx,
        item.jenisKegiatan,
        timeBoxX + 30,
        timeBoxY + timeBoxH / 2,
        20,
        badgeColor
      );

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 21px "IBM Plex Mono", monospace';
      ctx.fillText(
        item.jamMulai.replace(':', '.'),
        timeBoxX + 58,
        timeBoxY + 23
      );
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText('WIB', timeBoxX + 60, timeBoxY + 44);

      // Middle Content: Activity Title + Location
      const contentX = 200;
      let textY = cursorY + 14;
      ctx.textBaseline = 'top';

      if (hasBadgeLine) {
        let badgeText = '';
        let badgeFill = '#D97706';
        if (item.status === 'Dibatalkan') {
          badgeText = '[DIBATALKAN]';
          badgeFill = '#DC2626';
        } else if (item.status === 'Ditunda') {
          badgeText = '[DITUNDA]';
          badgeFill = '#475569';
        } else if (options.showUpdateTag && item.status === 'Update / Baru') {
          badgeText = 'UPDATE / BARU';
          badgeFill = '#D97706';
        }
        if (
          options.showConflictTag &&
          conflict?.severity === 'tinggi' &&
          item.status !== 'Dibatalkan'
        ) {
          badgeText = badgeText
            ? `${badgeText} · BENTROK JAM PARALEL`
            : 'BENTROK JAM PARALEL';
          if (!badgeText.startsWith('UPDATE')) badgeFill = '#DC2626';
        }

        ctx.fillStyle = badgeFill;
        ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(badgeText, contentX, textY);
        textY += 20;
      }

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      titleLines.forEach((line) => {
        ctx.fillText(line, contentX, textY);
        textY += 25;
      });

      textY += 3;
      ctx.fillStyle = '#334155';
      ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
      locLines.forEach((line) => {
        ctx.fillText(line, contentX, textY);
        textY += 21;
      });

      // Right Section: Warm Peach PIC Card + Optional Documentary Thumbnail
      const thumbW = showThumbnails ? 136 : 0;
      const thumbGap = showThumbnails ? 12 : 0;
      const picBoxW = showThumbnails ? 202 : 262;
      const picBoxX = WIDTH - 36 - thumbW - thumbGap - picBoxW;
      const picBoxH = Math.max(54, picLines.length * 21 + 22);
      const picBoxY = cursorY + (rowH - picBoxH) / 2;

      drawRoundedRect(ctx, picBoxX, picBoxY, picBoxW, picBoxH, 10);
      ctx.fillStyle = '#FFF3E8';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#FED7AA';
      ctx.stroke();

      // Orange Person Silhouette
      const iconCx = picBoxX + 20;
      const iconCy = picBoxY + picBoxH / 2;
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(iconCx, iconCy - 5, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(iconCx, iconCy + 9, 8.8, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.textBaseline = 'top';
      const picTextStartY =
        picBoxY + (picBoxH - picLines.length * 21) / 2 + 1;
      picLines.forEach((line, lIdx) => {
        ctx.fillText(line, picBoxX + 36, picTextStartY + lIdx * 21);
      });

      // Far-Right Rounded Photo Thumbnail (like reference poster!)
      if (showThumbnails) {
        const thumbX = WIDTH - 36 - thumbW;
        const thumbH = Math.min(78, rowH - 16);
        const thumbY = cursorY + (rowH - thumbH) / 2;
        const thumbSrc = getThumbnailSrcForAgenda(item);
        const thumbImg = thumbMap[thumbSrc];

        ctx.save();
        drawRoundedRect(ctx, thumbX, thumbY, thumbW, thumbH, 10);
        ctx.clip();
        if (thumbImg) {
          drawCoverImage(ctx, thumbImg, thumbX, thumbY, thumbW, thumbH);
        } else {
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
        }
        ctx.restore();

        drawRoundedRect(ctx, thumbX, thumbY, thumbW, thumbH, 10);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#CBD5E1';
        ctx.stroke();
      }

      cursorY += rowH + ROW_GAP;
    });
  }

  // 5. Sidoarjo Skyline + Official Motto Footer
  const footerY = TOTAL_H - FOOTER_H;

  ctx.save();
  ctx.fillStyle = '#1E3A5F';
  const silY = footerY + 46;
  ctx.fillRect(0, silY, WIDTH, 18);
  // Monumen Jayandaru & Bridge silhouettes
  ctx.beginPath();
  ctx.moveTo(WIDTH * 0.24, silY);
  ctx.lineTo(WIDTH * 0.255, silY - 40);
  ctx.lineTo(WIDTH * 0.27, silY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(WIDTH * 0.56, silY);
  ctx.lineTo(WIDTH * 0.575, silY - 36);
  ctx.lineTo(WIDTH * 0.59, silY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(WIDTH * 0.84, silY);
  ctx.lineTo(WIDTH * 0.855, silY - 32);
  ctx.lineTo(WIDTH * 0.87, silY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#0A2240';
  ctx.fillRect(0, footerY + 54, WIDTH, FOOTER_H - 54);

  ctx.fillStyle = '#EA580C';
  ctx.fillRect(0, footerY + 50, WIDTH, 5);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FBBF24';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('SIAP  •  CEPAT  •  TEPAT  •  HUMANIS', 40, footerY + 102);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Sidoarjo Tangguh', WIDTH - 40, footerY + 88);
  ctx.fillStyle = '#BAE6FD';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Masyarakat Selamat, Bersama Kita Lebih Kuat',
    WIDTH - 40,
    footerY + 116
  );
}

export function downloadPosterImage(
  canvas: HTMLCanvasElement,
  selectedDate: string,
  format: 'png' | 'jpg'
) {
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mime, 0.95);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `agenda-bpbd-sidoarjo-${selectedDate}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyPosterImageToClipboard(
  canvas: HTMLCanvasElement
): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        resolve(true);
      } catch {
        resolve(false);
      }
    }, 'image/png');
  });
}

export type SharePosterResult =
  | 'shared'
  | 'aborted'
  | 'fallback_clipboard'
  | 'fallback_download';

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function sharePosterToWhatsApp(
  canvas: HTMLCanvasElement,
  selectedDate: string
): Promise<SharePosterResult> {
  const fileName = `agenda-bpbd-sidoarjo-${selectedDate}.png`;
  const blob = await canvasToPngBlob(canvas);

  if (blob && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], fileName, { type: 'image/png' });
    const canShareFiles =
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
        });
        return 'shared';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return 'aborted';
        }
        // Fallback below if blocked by iframe permissions or browser policy
      }
    }
  }

  const copied = await copyPosterImageToClipboard(canvas);
  if (copied) {
    return 'fallback_clipboard';
  }

  downloadPosterImage(canvas, selectedDate, 'png');
  return 'fallback_download';
}
