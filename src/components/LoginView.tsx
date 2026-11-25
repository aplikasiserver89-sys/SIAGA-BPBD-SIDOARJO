import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { UserProfile } from '../types/agenda';
import { BpbdEmblem } from './BpbdEmblem';

interface LoginViewProps {
  requiresBootstrap: boolean;
  onAuthenticated: (token: string, user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  requiresBootstrap,
  onAuthenticated,
}) => {
  // Standard login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // First-run Super Admin bootstrap states
  const [bootNip, setBootNip] = useState('198501012010011001');
  const [bootUsername, setBootUsername] = useState('superadmin');
  const [bootName, setBootName] = useState('Super Admin Sekretariat BPBD');
  const [bootJabatan, setBootJabatan] = useState(
    'Super Admin / Pranata Komputer Sekretariat'
  );
  const [bootPassword, setBootPassword] = useState('');
  const [bootPasswordConfirm, setBootPasswordConfirm] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!identifier.trim() || !password) {
      setErrorMsg('NIP / Username Kedinasan dan Kata Sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          rememberSession,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal masuk ke sistem.');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setErrorMsg('Tidak dapat terhubung ke server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (bootPassword.length < 6) {
      setErrorMsg('Kata sandi Super Admin minimal 6 karakter.');
      return;
    }
    if (bootPassword !== bootPasswordConfirm) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: bootNip.trim(),
          username: bootUsername.trim(),
          namaLengkap: bootName.trim(),
          jabatan: bootJabatan.trim(),
          password: bootPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengaktivasi akun Super Admin.');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setErrorMsg('Gagal menghubungi server untuk aktivasi Super Admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Left Institutional Identity Column */}
        <div className="lg:col-span-5 bg-[#0F294A] text-white p-7 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <BpbdEmblem className="w-16 h-16 shrink-0" />
              <div>
                <div className="text-xs font-medium text-sky-300 tracking-wide">
                  PEMERINTAH KABUPATEN SIDOARJO
                </div>
                <div className="text-base font-bold leading-snug text-white">
                  BPBD KABUPATEN SIDOARJO
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E3F6D]">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                SIAGA BPBD SIDOARJO
              </h1>
              <p className="mt-1.5 text-sm text-sky-100/90 leading-relaxed">
                Sistem Informasi Agenda Kegiatan & Disposisi Real-Time
              </p>
              <div className="mt-3 text-xs font-semibold tracking-wide text-amber-300">
                Siap • Cepat • Tepat • Humanis
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-200 leading-relaxed">
              <p>
                SIAGA BPBD Sidoarjo adalah aplikasi web dan asisten cerdas
                berbasis AI yang dirancang untuk mendigitalisasi alur
                pengelolaan agenda kegiatan kedinasan di lingkungan Badan
                Penanggulangan Bencana Daerah (BPBD) Kabupaten Sidoarjo. Sistem
                ini menyelesaikan kendala pemrosesan surat masuk
                undangan/disposisi dari aplikasi e-Buddy yang selama ini
                dilakukan secara manual oleh ASN Pengadministrasi Umum sebelum
                disebarkan ke pimpinan dan grup WhatsApp pegawai.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E3F6D] text-xs text-slate-300">
            Jl. Raya Kemiri No. 1, Kec. Sidoarjo, Kabupaten Sidoarjo
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          {requiresBootstrap ? (
            <form onSubmit={handleBootstrapSubmit} className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Aktivasi Awal Sistem</span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Buat Akun Super Admin Utama
                </h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Belum ada akun Super Admin terdaftar pada server. Tetapkan
                  kredensial Super Admin untuk mulai mengelola agenda dan
                  membuat akun Operator, Pimpinan, Kabid, serta Pegawai.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Kedinasan (18 digit) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bootNip}
                    onChange={(e) => setBootNip(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={bootUsername}
                    onChange={(e) => setBootUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={bootName}
                    onChange={(e) => setBootName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={bootJabatan}
                    onChange={(e) => setBootJabatan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Super Admin *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      value={bootPassword}
                      onChange={(e) => setBootPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi"
                    value={bootPasswordConfirm}
                    onChange={(e) => setBootPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-slate-400 rounded-lg transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'MENGAKTIVASI AKUN...'
                    : 'AKTIVASI SUPER ADMIN & MASUK'}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Portal Masuk SIAGA BPBD
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Masuk menggunakan NIP (18 digit) atau Username kedinasan Anda.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  NIP / Username Kedinasan *
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Masukkan 18 digit NIP atau username pegawai..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kata Sandi *
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    aria-label={
                      showPassword
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>
                    Pertahankan sesi masuk selama jam kerja (07.30 – 16.00 WIB)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotHelp((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-sky-700 hover:underline font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Lupa Kata Sandi / Hubungi Admin Sekretariat</span>
                </button>
              </div>

              {showForgotHelp && (
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
                  Untuk pemulihan kata sandi atau pembukaan kunci akun, hubungi{' '}
                  <span className="font-semibold">
                    Super Admin / Admin IT Sekretariat Subbag. Umpeg BPBD Kab.
                    Sidoarjo
                  </span>{' '}
                  agar kata sandi diatur ulang secara aman melalui menu
                  Manajemen Pengguna.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-sm font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-slate-400 rounded-lg transition-colors tracking-wide"
              >
                {isLoading
                  ? 'MEMVERIFIKASI KREDENSIAL...'
                  : 'MASUK KE DASHBOARD SIAGA BPBD'}
              </button>

              <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                Akses terbatas untuk ASN & Pegawai BPBD Kabupaten Sidoarjo.
                Seluruh aktivitas login dan perubahan jadwal tercatat dalam Audit
                Log.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
