export type AgendaCategory =
  | 'Rapat Koordinasi'
  | 'Sosialisasi'
  | 'Edukasi/Pelatihan'
  | 'Kunjungan'
  | 'Simulasi/Lapangan';

export type AgendaStatus =
  | 'Terjadwal'
  | 'Update / Baru'
  | 'Ditunda'
  | 'Dibatalkan';

export interface AgendaItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm atau 'Selesai'
  namaKegiatan: string;
  jenisKegiatan: AgendaCategory;
  lokasi: string;
  tautanDaring?: string;
  pic: string;
  status: AgendaStatus;
  catatanDisposisi: string;
  nomorSurat?: string;
  sumber: 'e-Buddy' | 'Manual' | 'Disposisi Pimpinan';
  updatedAt: string;
}

export interface MasterUnit {
  id: string;
  nama: string;
  tipe: 'Bidang' | 'Pimpinan' | 'Personel';
  singkatan: string;
  keterangan: string;
}

export interface MasterLocation {
  id: string;
  nama: string;
  alamat: string;
  tipe: 'Kantor Pemerintah' | 'Pos Damkar' | 'Balai / Desa' | 'Daring' | 'Fasilitas Umum';
}

export interface ConflictDetail {
  itemId: string;
  conflictingIds: string[];
  severity: 'tinggi' | 'sedang'; // tinggi = jam beririsan, sedang = jeda <= 30 menit beda lokasi
  summary: string;
}

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN_SISTEM'
  | 'OPERATOR_UMUM'
  | 'PIMPINAN'
  | 'KABID_UNIT'
  | 'PEGAWAI_VIEWER';

export interface UserProfile {
  id: string;
  nip: string;
  username: string;
  namaLengkap: string;
  jabatan: string;
  roleCode: RoleCode;
  unitKerja: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestampWIB: string;
  actorNip: string;
  actorName: string;
  actorRole: RoleCode;
  event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'LOGOUT'
    | 'SUPER_ADMIN_CLAIMED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'PASSWORD_CHANGED'
    | 'ROLE_CHANGED'
    | 'AGENDA_CREATED'
    | 'AGENDA_UPDATED'
    | 'AGENDA_RESCHEDULED'
    | 'AGENDA_DELETED'
    | 'MASTER_UPDATED';
  target: string;
  detail: string;
}

export type ActiveNavSection =
  | 'dashboard'
  | 'input-ebuddy'
  | 'kalender-linimasa'
  | 'rekap-harian'
  | 'rekap-wa'
  | 'master-data'
  | 'super-admin';
