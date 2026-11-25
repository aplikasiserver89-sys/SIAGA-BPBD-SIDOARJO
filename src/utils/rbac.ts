import { AgendaItem, RoleCode, UserProfile } from '../types/agenda';

export const ROLE_META: Record<
  RoleCode,
  {
    label: string;
    shortLabel: string;
    description: string;
    landingSection: 'dashboard' | 'kalender-linimasa';
  }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    shortLabel: 'Super Admin',
    description:
      'Akses penuh penyuntingan seluruh agenda, disposisi, master data, manajemen akun & role, serta audit log.',
    landingSection: 'dashboard',
  },
  ADMIN_SISTEM: {
    label: 'Admin Sistem',
    shortLabel: 'Admin IT',
    description:
      'Mengelola akun pengguna, penetapan role, master unit kerja & lokasi, siaran WA, dan pemeriksaan audit log.',
    landingSection: 'dashboard',
  },
  OPERATOR_UMUM: {
    label: 'Operator / Pengadministrasi Umum',
    shortLabel: 'Operator Umpeg',
    description:
      'Menginput & mengekstrak surat e-Buddy, menjadwalkan/mengubah/menghapus agenda, broadcast WA, dan master data.',
    landingSection: 'dashboard',
  },
  PIMPINAN: {
    label: 'Pimpinan Eksekutif (Kalaksa / Sekretaris)',
    shortLabel: 'Pimpinan',
    description:
      'Memantau ringkasan eksekutif real-time, memberikan catatan disposisi, menunjuk PIC, dan meninjau audit log.',
    landingSection: 'dashboard',
  },
  KABID_UNIT: {
    label: 'Kepala Bidang / Kasubag',
    shortLabel: 'Kabid / Kasubag',
    description:
      'Memantau jadwal terfilter bidang/unit masing-masing, menunjuk personel pelaksana, dan memperbarui status kegiatan unit.',
    landingSection: 'dashboard',
  },
  PEGAWAI_VIEWER: {
    label: 'Pegawai / Personel Lapangan',
    shortLabel: 'Pegawai',
    description:
      'Melihat linimasa agenda harian/mingguan, lokasi/tautan Zoom, dan mencetak/mengunduh Kartu Agenda Harian.',
    landingSection: 'kalender-linimasa',
  },
};

export interface RoleCapabilities {
  canCreateAgenda: boolean;
  canEditAnyAgenda: boolean;
  canDeleteAgenda: boolean;
  canEditDisposisi: boolean;
  canBroadcastWA: boolean;
  canManageMasterData: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  canViewExecutiveDashboard: boolean;
}

export function getCapabilities(role: RoleCode): RoleCapabilities {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        canCreateAgenda: true,
        canEditAnyAgenda: true,
        canDeleteAgenda: true,
        canEditDisposisi: true,
        canBroadcastWA: true,
        canManageMasterData: true,
        canManageUsers: true,
        canViewAuditLog: true,
        canViewExecutiveDashboard: true,
      };
    case 'ADMIN_SISTEM':
      return {
        canCreateAgenda: false,
        canEditAnyAgenda: false,
        canDeleteAgenda: false,
        canEditDisposisi: false,
        canBroadcastWA: true,
        canManageMasterData: true,
        canManageUsers: true,
        canViewAuditLog: true,
        canViewExecutiveDashboard: true,
      };
    case 'OPERATOR_UMUM':
      return {
        canCreateAgenda: true,
        canEditAnyAgenda: true,
        canDeleteAgenda: true,
        canEditDisposisi: true,
        canBroadcastWA: true,
        canManageMasterData: true,
        canManageUsers: false,
        canViewAuditLog: false,
        canViewExecutiveDashboard: true,
      };
    case 'PIMPINAN':
      return {
        canCreateAgenda: false,
        canEditAnyAgenda: false,
        canDeleteAgenda: false,
        canEditDisposisi: true,
        canBroadcastWA: true,
        canManageMasterData: false,
        canManageUsers: false,
        canViewAuditLog: true,
        canViewExecutiveDashboard: true,
      };
    case 'KABID_UNIT':
      return {
        canCreateAgenda: false,
        canEditAnyAgenda: false,
        canDeleteAgenda: false,
        canEditDisposisi: false,
        canBroadcastWA: false,
        canManageMasterData: false,
        canManageUsers: false,
        canViewAuditLog: false,
        canViewExecutiveDashboard: true,
      };
    case 'PEGAWAI_VIEWER':
      return {
        canCreateAgenda: false,
        canEditAnyAgenda: false,
        canDeleteAgenda: false,
        canEditDisposisi: false,
        canBroadcastWA: false,
        canManageMasterData: false,
        canManageUsers: false,
        canViewAuditLog: false,
        canViewExecutiveDashboard: false,
      };
  }
}

/**
 * Isolasi Data Unit Kerja:
 * KABID_UNIT dapat menyunting PIC/status untuk agenda yang didisposisikan ke unit kerjanya.
 */
export function canUserEditAgenda(
  user: Pick<UserProfile, 'roleCode' | 'unitKerja' | 'namaLengkap'>,
  agenda: Pick<AgendaItem, 'pic'>
): boolean {
  if (user.roleCode === 'SUPER_ADMIN' || user.roleCode === 'OPERATOR_UMUM') {
    return true;
  }
  if (user.roleCode === 'PIMPINAN') {
    return true; // Pimpinan dapat memperbarui catatan disposisi & PIC
  }
  if (user.roleCode === 'KABID_UNIT') {
    const unitLower = user.unitKerja.toLowerCase();
    const picLower = agenda.pic.toLowerCase();
    // Match exact unit or keyword like 'damkarmat', 'pk', 'kl', 'umpeg'
    const coreKeyword = unitLower
      .replace(/^bid\.\s*/i, '')
      .replace(/^sdr\.\s*/i, '')
      .trim();
    return (
      picLower.includes(unitLower) ||
      (coreKeyword.length >= 2 && picLower.includes(coreKeyword))
    );
  }
  return false;
}

export function safeExternalUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}
