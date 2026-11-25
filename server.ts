import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_AGENDAS,
  INITIAL_LOCATIONS,
  INITIAL_UNITS,
} from './src/data/initialData';
import {
  AgendaCategory,
  AgendaItem,
  AgendaStatus,
  AuditLogEntry,
  MasterLocation,
  MasterUnit,
  RoleCode,
  UserProfile,
} from './src/types/agenda';
import { canUserEditAgenda, safeExternalUrl } from './src/utils/rbac';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'siaga-store.json');

// Signing secret kept only in server memory/env
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface StoredUser extends UserProfile {
  passwordHash: string; // format: saltHex:derivedHex
  failedAttempts: number;
  lockUntil: number | null;
}

interface StoreData {
  users: StoredUser[];
  agendas: AgendaItem[];
  units: MasterUnit[];
  locations: MasterLocation[];
  auditLogs: AuditLogEntry[];
}

const VALID_ROLES: RoleCode[] = [
  'SUPER_ADMIN',
  'ADMIN_SISTEM',
  'OPERATOR_UMUM',
  'PIMPINAN',
  'KABID_UNIT',
  'PEGAWAI_VIEWER',
];

const VALID_STATUSES: AgendaStatus[] = [
  'Terjadwal',
  'Update / Baru',
  'Ditunda',
  'Dibatalkan',
];

const VALID_CATEGORIES: AgendaCategory[] = [
  'Rapat Koordinasi',
  'Sosialisasi',
  'Edukasi/Pelatihan',
  'Kunjungan',
  'Simulasi/Lapangan',
];

function nowWIBString(): string {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(' ', ' ') + ' WIB';
  } catch {
    return new Date().toISOString();
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, expectedBuf);
}

function safeCompareStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function loadStore(): StoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as StoreData;
      if (Array.isArray(parsed.agendas) && Array.isArray(parsed.users)) {
        return parsed;
      }
    } catch {
      // Fall through to default store
    }
  }

  const initial: StoreData = {
    users: [],
    agendas: INITIAL_AGENDAS,
    units: INITIAL_UNITS,
    locations: INITIAL_LOCATIONS,
    auditLogs: [],
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
  return initial;
}

const store: StoreData = loadStore();
const revokedTokenIds = new Set<string>();

function persistStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestampWIB'>) {
  store.auditLogs.unshift({
    ...entry,
    id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestampWIB: nowWIBString(),
  });
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
  persistStore();
}

function sanitizeUser(u: StoredUser): UserProfile {
  return {
    id: u.id,
    nip: u.nip,
    username: u.username,
    namaLengkap: u.namaLengkap,
    jabatan: u.jabatan,
    roleCode: u.roleCode,
    unitKerja: u.unitKerja,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
  };
}

interface TokenPayload {
  jti: string;
  userId: string;
  roleCode: RoleCode;
  exp: number;
}

function issueToken(user: StoredUser, rememberSession: boolean): string {
  const ttlMs = rememberSession ? 8 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
  const payload: TokenPayload = {
    jti: crypto.randomBytes(12).toString('hex'),
    userId: user.id,
    roleCode: user.roleCode,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (!safeCompareStrings(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (revokedTokenIds.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  authToken?: TokenPayload;
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Token sesi kedaluwarsa atau tidak sah.' });
    return;
  }
  const user = store.users.find((u) => u.id === payload.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: 'Akun tidak ditemukan atau dinonaktifkan.' });
    return;
  }
  req.authUser = user;
  req.authToken = payload;
  next();
}

function requireRoles(...allowed: RoleCode[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Autentikasi diperlukan.' });
      return;
    }
    if (!allowed.includes(req.authUser.roleCode)) {
      res.status(403).json({
        error: 'Akses ditolak. Peran Anda tidak memiliki izin untuk aksi ini.',
      });
      return;
    }
    next();
  };
}

function getEnvSuperAdminPasscode(): string {
  return (process.env.SUPER_ADMIN_PASSCODE || '').trim();
}

function hasClaimedSuperAdmin(): boolean {
  return store.users.some(
    (u) => u.roleCode === 'SUPER_ADMIN' && Boolean(u.passwordHash)
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // --- AUTH ENDPOINTS ---
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    const envPass = getEnvSuperAdminPasscode();
    const claimed = hasClaimedSuperAdmin();
    res.json({
      requiresBootstrap: !claimed && !envPass,
      hasEnvPasscode: Boolean(envPass),
      totalUsers: store.users.length,
    });
  });

  app.post('/api/auth/bootstrap-super-admin', (req: Request, res: Response) => {
    const envPass = getEnvSuperAdminPasscode();
    if (hasClaimedSuperAdmin() || envPass) {
      res.status(409).json({
        error: 'Akun Super Admin sudah diaktivasi. Silakan login.',
      });
      return;
    }

    const { nip, username, namaLengkap, jabatan, password } = req.body || {};
    if (
      typeof nip !== 'string' ||
      nip.trim().length < 5 ||
      typeof password !== 'string' ||
      password.length < 6 ||
      typeof namaLengkap !== 'string' ||
      namaLengkap.trim().length < 3
    ) {
      res.status(400).json({
        error:
          'NIP/Username minimal 5 karakter, Nama Lengkap wajib diisi, dan Kata Sandi minimal 6 karakter.',
      });
      return;
    }

    const cleanNip = nip.trim();
    const cleanUsername =
      typeof username === 'string' && username.trim()
        ? username.trim().toLowerCase()
        : cleanNip.toLowerCase();

    const newSuperAdmin: StoredUser = {
      id: `usr-${Date.now()}`,
      nip: cleanNip,
      username: cleanUsername,
      namaLengkap: namaLengkap.trim(),
      jabatan:
        typeof jabatan === 'string' && jabatan.trim()
          ? jabatan.trim()
          : 'Super Admin Sekretariat BPBD Kab. Sidoarjo',
      roleCode: 'SUPER_ADMIN',
      unitKerja: 'Sekretariat BPBD',
      isActive: true,
      passwordHash: hashPassword(password),
      failedAttempts: 0,
      lockUntil: null,
      lastLoginAt: nowWIBString(),
    };

    store.users.push(newSuperAdmin);
    addAuditLog({
      actorNip: newSuperAdmin.nip,
      actorName: newSuperAdmin.namaLengkap,
      actorRole: 'SUPER_ADMIN',
      event: 'SUPER_ADMIN_CLAIMED',
      target: newSuperAdmin.nip,
      detail: 'Aktivasi awal akun Super Admin SIAGA BPBD Sidoarjo berhasil.',
    });

    const token = issueToken(newSuperAdmin, true);
    res.status(201).json({
      token,
      user: sanitizeUser(newSuperAdmin),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password, rememberSession } = req.body || {};
    if (typeof identifier !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        error: 'NIP/Username dan Kata Sandi wajib diisi.',
      });
      return;
    }

    const cleanId = identifier.trim().toLowerCase();
    const envPass = getEnvSuperAdminPasscode();

    let user = store.users.find(
      (u) =>
        u.nip.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    // If SUPER_ADMIN_PASSCODE env is set and no Super Admin record exists yet, allow claiming via env passcode
    if (
      !user &&
      envPass &&
      (cleanId === 'superadmin' || cleanId === '198501012010011001') &&
      safeCompareStrings(password, envPass)
    ) {
      user = {
        id: `usr-${Date.now()}`,
        nip: '198501012010011001',
        username: 'superadmin',
        namaLengkap: 'Super Admin BPBD Sidoarjo',
        jabatan: 'Super Admin Sekretariat BPBD',
        roleCode: 'SUPER_ADMIN',
        unitKerja: 'Sekretariat BPBD',
        isActive: true,
        passwordHash: hashPassword(envPass),
        failedAttempts: 0,
        lockUntil: null,
      };
      store.users.push(user);
      persistStore();
    }

    const clientIp = getClientIp(req);

    if (!user) {
      addAuditLog({
        actorNip: identifier.trim().slice(0, 32),
        actorName: 'Tidak Dikenal',
        actorRole: 'PEGAWAI_VIEWER',
        event: 'LOGIN_FAILED',
        target: identifier.trim().slice(0, 32),
        detail: `Percobaan login dengan NIP/Username tidak terdaftar (IP: ${clientIp}).`,
      });
      res.status(401).json({
        error: 'NIP / Username atau Kata Sandi tidak sesuai.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error:
          'Akun ini sedang dinonaktifkan. Hubungi Super Admin / Admin Sekretariat BPBD.',
      });
      return;
    }

    if (user.lockUntil && Date.now() < user.lockUntil) {
      const minsLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      res.status(423).json({
        error: `Akun terkunci sementara karena 5 kali gagal masuk. Coba lagi dalam ${minsLeft} menit.`,
      });
      return;
    }

    const envMatchesSuperAdmin =
      user.roleCode === 'SUPER_ADMIN' &&
      Boolean(envPass) &&
      safeCompareStrings(password, envPass);

    const passwordValid =
      envMatchesSuperAdmin || verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        addAuditLog({
          actorNip: user.nip,
          actorName: user.namaLengkap,
          actorRole: user.roleCode,
          event: 'ACCOUNT_LOCKED',
          target: user.nip,
          detail: `Akun dikunci 15 menit setelah 5 kali kegagalan kata sandi (IP: ${clientIp}).`,
        });
        persistStore();
        res.status(423).json({
          error:
            'Terlalu banyak percobaan gagal (5x). Akun dikunci selama 15 menit.',
        });
        return;
      }

      addAuditLog({
        actorNip: user.nip,
        actorName: user.namaLengkap,
        actorRole: user.roleCode,
        event: 'LOGIN_FAILED',
        target: user.nip,
        detail: `Kata sandi tidak sesuai (percobaan ke-${user.failedAttempts}, IP: ${clientIp}).`,
      });
      persistStore();
      res.status(401).json({
        error: `NIP / Username atau Kata Sandi tidak sesuai. Sisa percobaan: ${
          5 - user.failedAttempts
        }.`,
      });
      return;
    }

    user.failedAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = nowWIBString();
    persistStore();

    addAuditLog({
      actorNip: user.nip,
      actorName: user.namaLengkap,
      actorRole: user.roleCode,
      event: 'LOGIN_SUCCESS',
      target: user.nip,
      detail: `Login berhasil sebagai ${user.roleCode} (${user.unitKerja}, IP: ${clientIp}).`,
    });

    const token = issueToken(user, Boolean(rememberSession));
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post(
    '/api/auth/logout',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      if (req.authToken && req.authUser) {
        revokedTokenIds.add(req.authToken.jti);
        addAuditLog({
          actorNip: req.authUser.nip,
          actorName: req.authUser.namaLengkap,
          actorRole: req.authUser.roleCode,
          event: 'LOGOUT',
          target: req.authUser.nip,
          detail: 'Pengguna mengakhiri sesi (Logout).',
        });
      }
      res.json({ ok: true });
    }
  );

  app.get(
    '/api/auth/me',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      res.json({ user: sanitizeUser(req.authUser!) });
    }
  );

  app.post(
    '/api/auth/change-password',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const { currentPassword, newPassword } = req.body || {};
      if (
        typeof currentPassword !== 'string' ||
        typeof newPassword !== 'string' ||
        !currentPassword ||
        newPassword.length < 6
      ) {
        res.status(400).json({
          error:
            'Kata sandi saat ini wajib diisi dan kata sandi baru minimal 6 karakter.',
        });
        return;
      }

      const actor = req.authUser!;
      const envPass = getEnvSuperAdminPasscode();
      const envMatchesSuperAdmin =
        actor.roleCode === 'SUPER_ADMIN' &&
        Boolean(envPass) &&
        safeCompareStrings(currentPassword, envPass);

      if (
        !envMatchesSuperAdmin &&
        !verifyPassword(currentPassword, actor.passwordHash)
      ) {
        res.status(401).json({
          error: 'Kata sandi saat ini tidak sesuai.',
        });
        return;
      }

      actor.passwordHash = hashPassword(newPassword);
      actor.failedAttempts = 0;
      actor.lockUntil = null;
      persistStore();

      addAuditLog({
        actorNip: actor.nip,
        actorName: actor.namaLengkap,
        actorRole: actor.roleCode,
        event: 'PASSWORD_CHANGED',
        target: actor.nip,
        detail: `Pengguna ${actor.namaLengkap} memperbarui kata sandi akun secara mandiri.`,
      });

      res.json({ ok: true });
    }
  );

  // --- BOOTSTRAP APP DATA ---
  app.get(
    '/api/bootstrap-data',
    requireAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({
        agendas: store.agendas,
        units: store.units,
        locations: store.locations,
      });
    }
  );

  // --- AGENDA CRUD WITH RBAC ---
  app.post(
    '/api/agendas',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body || {};
      if (
        typeof body.tanggal !== 'string' ||
        typeof body.jamMulai !== 'string' ||
        typeof body.namaKegiatan !== 'string' ||
        typeof body.lokasi !== 'string' ||
        typeof body.pic !== 'string' ||
        !body.namaKegiatan.trim() ||
        !body.lokasi.trim() ||
        !body.pic.trim()
      ) {
        res.status(400).json({ error: 'Data agenda wajib belum lengkap.' });
        return;
      }

      const status: AgendaStatus = VALID_STATUSES.includes(body.status)
        ? body.status
        : 'Update / Baru';
      const jenisKegiatan: AgendaCategory = VALID_CATEGORIES.includes(
        body.jenisKegiatan
      )
        ? body.jenisKegiatan
        : 'Rapat Koordinasi';

      const newAgenda: AgendaItem = {
        id: `ag-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        tanggal: body.tanggal.trim(),
        jamMulai: body.jamMulai.trim(),
        jamSelesai:
          typeof body.jamSelesai === 'string' && body.jamSelesai.trim()
            ? body.jamSelesai.trim()
            : 'Selesai',
        namaKegiatan: body.namaKegiatan.trim(),
        jenisKegiatan,
        lokasi: body.lokasi.trim(),
        tautanDaring: safeExternalUrl(body.tautanDaring),
        pic: body.pic.trim(),
        status,
        catatanDisposisi:
          typeof body.catatanDisposisi === 'string'
            ? body.catatanDisposisi.trim()
            : '',
        nomorSurat:
          typeof body.nomorSurat === 'string' && body.nomorSurat.trim()
            ? body.nomorSurat.trim()
            : undefined,
        sumber:
          body.sumber === 'e-Buddy' ||
          body.sumber === 'Disposisi Pimpinan' ||
          body.sumber === 'Manual'
            ? body.sumber
            : 'Manual',
        updatedAt: new Date().toISOString(),
      };

      store.agendas.push(newAgenda);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'AGENDA_CREATED',
        target: newAgenda.id,
        detail: `Menambahkan agenda "${newAgenda.namaKegiatan}" (${newAgenda.tanggal} ${newAgenda.jamMulai} WIB).`,
      });

      res.status(201).json({ agenda: newAgenda });
    }
  );

  app.patch(
    '/api/agendas/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.authUser!;
      const idx = store.agendas.findIndex((a) => a.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Agenda tidak ditemukan.' });
        return;
      }

      const existing = store.agendas[idx];
      if (!canUserEditAgenda(user, existing)) {
        res.status(403).json({
          error:
            'Anda tidak memiliki izin untuk menyunting agenda unit lain ini.',
        });
        return;
      }

      const body = req.body || {};
      const isFullEditor =
        user.roleCode === 'SUPER_ADMIN' || user.roleCode === 'OPERATOR_UMUM';

      const updated: AgendaItem = { ...existing };

      if (isFullEditor) {
        if (typeof body.tanggal === 'string' && body.tanggal.trim()) {
          updated.tanggal = body.tanggal.trim();
        }
        if (typeof body.jamMulai === 'string' && body.jamMulai.trim()) {
          updated.jamMulai = body.jamMulai.trim();
        }
        if (typeof body.jamSelesai === 'string' && body.jamSelesai.trim()) {
          updated.jamSelesai = body.jamSelesai.trim();
        }
        if (typeof body.namaKegiatan === 'string' && body.namaKegiatan.trim()) {
          updated.namaKegiatan = body.namaKegiatan.trim();
        }
        if (VALID_CATEGORIES.includes(body.jenisKegiatan)) {
          updated.jenisKegiatan = body.jenisKegiatan;
        }
        if (typeof body.lokasi === 'string' && body.lokasi.trim()) {
          updated.lokasi = body.lokasi.trim();
        }
        if ('tautanDaring' in body) {
          updated.tautanDaring = safeExternalUrl(body.tautanDaring);
        }
        if (typeof body.nomorSurat === 'string') {
          updated.nomorSurat = body.nomorSurat.trim() || undefined;
        }
      }

      // PIMPINAN, KABID_UNIT (untuk unitnya), OPERATOR_UMUM, dan SUPER_ADMIN boleh memperbarui PIC, status, & disposisi
      if (typeof body.pic === 'string' && body.pic.trim()) {
        updated.pic = body.pic.trim();
      }
      if (VALID_STATUSES.includes(body.status)) {
        updated.status = body.status;
      }
      if (
        (isFullEditor || user.roleCode === 'PIMPINAN' || user.roleCode === 'KABID_UNIT') &&
        typeof body.catatanDisposisi === 'string'
      ) {
        updated.catatanDisposisi = body.catatanDisposisi.trim();
      }

      updated.updatedAt = new Date().toISOString();
      store.agendas[idx] = updated;

      const scheduleChanged =
        existing.tanggal !== updated.tanggal ||
        existing.jamMulai !== updated.jamMulai ||
        existing.jamSelesai !== updated.jamSelesai ||
        existing.status !== updated.status;

      addAuditLog({
        actorNip: user.nip,
        actorName: user.namaLengkap,
        actorRole: user.roleCode,
        event: scheduleChanged ? 'AGENDA_RESCHEDULED' : 'AGENDA_UPDATED',
        target: updated.id,
        detail: `Memperbarui "${updated.namaKegiatan}" (Status: ${updated.status}, PIC: ${updated.pic}).`,
      });

      res.json({ agenda: updated });
    }
  );

  app.delete(
    '/api/agendas/:id',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.agendas.findIndex((a) => a.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Agenda tidak ditemukan.' });
        return;
      }
      const removed = store.agendas[idx];
      store.agendas.splice(idx, 1);

      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'AGENDA_DELETED',
        target: removed.id,
        detail: `Menghapus agenda "${removed.namaKegiatan}".`,
      });

      res.json({ ok: true });
    }
  );

  // --- MASTER UNITS & LOCATIONS ---
  app.post(
    '/api/units',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const { nama, tipe, singkatan, keterangan } = req.body || {};
      if (typeof nama !== 'string' || !nama.trim()) {
        res.status(400).json({ error: 'Nama unit/personel wajib diisi.' });
        return;
      }
      const newUnit: MasterUnit = {
        id: `unit-${Date.now()}`,
        nama: nama.trim(),
        tipe:
          tipe === 'Bidang' || tipe === 'Pimpinan' || tipe === 'Personel'
            ? tipe
            : 'Bidang',
        singkatan:
          typeof singkatan === 'string' && singkatan.trim()
            ? singkatan.trim()
            : nama.trim(),
        keterangan:
          typeof keterangan === 'string' && keterangan.trim()
            ? keterangan.trim()
            : '-',
      };
      store.units.push(newUnit);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'MASTER_UPDATED',
        target: newUnit.id,
        detail: `Menambahkan master unit/personel "${newUnit.nama}".`,
      });
      res.status(201).json({ unit: newUnit });
    }
  );

  app.delete(
    '/api/units/:id',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.units.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Unit tidak ditemukan.' });
        return;
      }
      const removed = store.units[idx];
      store.units.splice(idx, 1);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'MASTER_UPDATED',
        target: removed.id,
        detail: `Menghapus master unit/personel "${removed.nama}".`,
      });
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/locations',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const { nama, alamat, tipe } = req.body || {};
      if (
        typeof nama !== 'string' ||
        !nama.trim() ||
        typeof alamat !== 'string' ||
        !alamat.trim()
      ) {
        res.status(400).json({ error: 'Nama dan alamat lokasi wajib diisi.' });
        return;
      }
      const newLoc: MasterLocation = {
        id: `loc-${Date.now()}`,
        nama: nama.trim(),
        alamat: alamat.trim(),
        tipe:
          tipe === 'Kantor Pemerintah' ||
          tipe === 'Pos Damkar' ||
          tipe === 'Balai / Desa' ||
          tipe === 'Daring' ||
          tipe === 'Fasilitas Umum'
            ? tipe
            : 'Kantor Pemerintah',
      };
      store.locations.push(newLoc);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'MASTER_UPDATED',
        target: newLoc.id,
        detail: `Menambahkan master lokasi "${newLoc.nama}".`,
      });
      res.status(201).json({ location: newLoc });
    }
  );

  app.delete(
    '/api/locations/:id',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM', 'OPERATOR_UMUM'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.locations.findIndex((l) => l.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Lokasi tidak ditemukan.' });
        return;
      }
      const removed = store.locations[idx];
      store.locations.splice(idx, 1);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'MASTER_UPDATED',
        target: removed.id,
        detail: `Menghapus master lokasi "${removed.nama}".`,
      });
      res.json({ ok: true });
    }
  );

  // --- SUPER ADMIN & ADMIN SISTEM: USER MANAGEMENT & AUDIT LOGS ---
  app.get(
    '/api/users',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM'),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ users: store.users.map(sanitizeUser) });
    }
  );

  app.post(
    '/api/users',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM'),
    (req: AuthenticatedRequest, res: Response) => {
      const { nip, username, namaLengkap, jabatan, roleCode, unitKerja, password } =
        req.body || {};

      if (
        typeof nip !== 'string' ||
        nip.trim().length < 5 ||
        typeof namaLengkap !== 'string' ||
        namaLengkap.trim().length < 3 ||
        typeof password !== 'string' ||
        password.length < 6 ||
        !VALID_ROLES.includes(roleCode)
      ) {
        res.status(400).json({
          error:
            'NIP (min 5 karakter), Nama Lengkap, Role valid, dan Kata Sandi (min 6 karakter) wajib diisi.',
        });
        return;
      }

      if (roleCode === 'SUPER_ADMIN' && req.authUser!.roleCode !== 'SUPER_ADMIN') {
        res.status(403).json({
          error: 'Hanya Super Admin yang dapat membuat akun Super Admin.',
        });
        return;
      }

      const cleanNip = nip.trim();
      const cleanUsername =
        typeof username === 'string' && username.trim()
          ? username.trim().toLowerCase()
          : cleanNip.toLowerCase();

      const dup = store.users.find(
        (u) =>
          u.nip.toLowerCase() === cleanNip.toLowerCase() ||
          u.username.toLowerCase() === cleanUsername
      );
      if (dup) {
        res.status(409).json({
          error: 'NIP atau Username sudah terdaftar pada sistem.',
        });
        return;
      }

      const created: StoredUser = {
        id: `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        nip: cleanNip,
        username: cleanUsername,
        namaLengkap: namaLengkap.trim(),
        jabatan:
          typeof jabatan === 'string' && jabatan.trim() ? jabatan.trim() : '-',
        roleCode,
        unitKerja:
          typeof unitKerja === 'string' && unitKerja.trim()
            ? unitKerja.trim()
            : 'Sekretariat BPBD',
        isActive: true,
        passwordHash: hashPassword(password),
        failedAttempts: 0,
        lockUntil: null,
      };

      store.users.push(created);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'USER_CREATED',
        target: created.nip,
        detail: `Membuat akun "${created.namaLengkap}" dengan peran ${created.roleCode} (${created.unitKerja}).`,
      });

      res.status(201).json({ user: sanitizeUser(created) });
    }
  );

  app.patch(
    '/api/users/:id',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.users.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }

      const target = store.users[idx];
      if (
        target.roleCode === 'SUPER_ADMIN' &&
        req.authUser!.roleCode !== 'SUPER_ADMIN'
      ) {
        res.status(403).json({
          error: 'Hanya Super Admin yang dapat mengubah akun Super Admin.',
        });
        return;
      }

      const body = req.body || {};
      const prevRole = target.roleCode;

      if (typeof body.namaLengkap === 'string' && body.namaLengkap.trim()) {
        target.namaLengkap = body.namaLengkap.trim();
      }
      if (typeof body.jabatan === 'string' && body.jabatan.trim()) {
        target.jabatan = body.jabatan.trim();
      }
      if (typeof body.unitKerja === 'string' && body.unitKerja.trim()) {
        target.unitKerja = body.unitKerja.trim();
      }
      if (VALID_ROLES.includes(body.roleCode)) {
        if (
          body.roleCode === 'SUPER_ADMIN' &&
          req.authUser!.roleCode !== 'SUPER_ADMIN'
        ) {
          res.status(403).json({
            error: 'Hanya Super Admin yang dapat menetapkan peran Super Admin.',
          });
          return;
        }
        // Protect against removing last active SUPER_ADMIN
        if (
          target.roleCode === 'SUPER_ADMIN' &&
          body.roleCode !== 'SUPER_ADMIN'
        ) {
          const activeSuperAdmins = store.users.filter(
            (u) => u.roleCode === 'SUPER_ADMIN' && u.isActive
          );
          if (activeSuperAdmins.length <= 1) {
            res.status(400).json({
              error: 'Minimal harus terdapat satu Super Admin aktif.',
            });
            return;
          }
        }
        target.roleCode = body.roleCode;
      }

      if (typeof body.isActive === 'boolean') {
        if (target.roleCode === 'SUPER_ADMIN' && !body.isActive) {
          const activeSuperAdmins = store.users.filter(
            (u) => u.roleCode === 'SUPER_ADMIN' && u.isActive
          );
          if (activeSuperAdmins.length <= 1) {
            res.status(400).json({
              error: 'Tidak dapat menonaktifkan satu-satunya Super Admin aktif.',
            });
            return;
          }
        }
        target.isActive = body.isActive;
        if (body.isActive) {
          target.failedAttempts = 0;
          target.lockUntil = null;
        }
      }

      if (typeof body.newPassword === 'string' && body.newPassword.length >= 6) {
        target.passwordHash = hashPassword(body.newPassword);
        target.failedAttempts = 0;
        target.lockUntil = null;
      }

      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: prevRole !== target.roleCode ? 'ROLE_CHANGED' : 'USER_UPDATED',
        target: target.nip,
        detail:
          prevRole !== target.roleCode
            ? `Mengubah role "${target.namaLengkap}" dari ${prevRole} menjadi ${target.roleCode}.`
            : `Memperbarui profil/status akun "${target.namaLengkap}" (Aktif: ${target.isActive}).`,
      });

      res.json({ user: sanitizeUser(target) });
    }
  );

  app.delete(
    '/api/users/:id',
    requireAuth,
    requireRoles('SUPER_ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.users.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }
      const target = store.users[idx];
      if (target.id === req.authUser!.id) {
        res.status(400).json({
          error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.',
        });
        return;
      }
      store.users.splice(idx, 1);
      addAuditLog({
        actorNip: req.authUser!.nip,
        actorName: req.authUser!.namaLengkap,
        actorRole: req.authUser!.roleCode,
        event: 'USER_UPDATED',
        target: target.nip,
        detail: `Menghapus akun pengguna "${target.namaLengkap}" (${target.nip}).`,
      });
      res.json({ ok: true });
    }
  );

  app.get(
    '/api/audit-logs',
    requireAuth,
    requireRoles('SUPER_ADMIN', 'ADMIN_SISTEM', 'PIMPINAN'),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ logs: store.auditLogs });
    }
  );

  // --- VITE / STATIC FRONTEND ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIAGA AGENDA BPBD server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
