import React, { useState } from 'react';
import { Building2, MapPin, Plus, Trash2, Users } from 'lucide-react';
import { MasterLocation, MasterUnit } from '../types/agenda';

interface MasterDataViewProps {
  units: MasterUnit[];
  locations: MasterLocation[];
  onAddUnit: (unit: MasterUnit) => void;
  onDeleteUnit: (id: string) => void;
  onAddLocation: (loc: MasterLocation) => void;
  onDeleteLocation: (id: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  units,
  locations,
  onAddUnit,
  onDeleteUnit,
  onAddLocation,
  onDeleteLocation,
}) => {
  const [unitName, setUnitName] = useState('');
  const [unitType, setUnitType] = useState<MasterUnit['tipe']>('Bidang');
  const [unitShort, setUnitShort] = useState('');
  const [unitNote, setUnitNote] = useState('');

  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locType, setLocType] =
    useState<MasterLocation['tipe']>('Kantor Pemerintah');

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    onAddUnit({
      id: `unit-${Date.now()}`,
      nama: unitName.trim(),
      tipe: unitType,
      singkatan: unitShort.trim() || unitName.trim(),
      keterangan: unitNote.trim() || '-',
    });
    setUnitName('');
    setUnitShort('');
    setUnitNote('');
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locAddress.trim()) return;
    onAddLocation({
      id: `loc-${Date.now()}`,
      nama: locName.trim(),
      alamat: locAddress.trim(),
      tipe: locType,
    });
    setLocName('');
    setLocAddress('');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-medium text-sky-700">
          Referensi Cepat Pengadministrasi Umum
        </div>
        <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Master Bidang, Personel & Lokasi Sidoarjo
        </h2>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          Data bidang, pimpinan, personel, dan lokasi strategis di Kabupaten
          Sidoarjo ini otomatis muncul sebagai pilihan cepat di formulir input
          dan membantu pengenalan otomatis teks e-Buddy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Master Unit / Bidang / Personel */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Bidang, Pimpinan & Personel ({units.length})
              </h3>
            </div>
          </div>

          {/* Add Unit Form */}
          <form
            onSubmit={handleCreateUnit}
            className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="Nama Bidang / Personel"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              <select
                value={unitType}
                onChange={(e) =>
                  setUnitType(e.target.value as MasterUnit['tipe'])
                }
                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="Bidang">Bidang</option>
                <option value="Pimpinan">Pimpinan</option>
                <option value="Personel">Personel</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Singkatan (opsional)"
                value={unitShort}
                onChange={(e) => setUnitShort(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              <input
                type="text"
                placeholder="Keterangan jabatan / tugas"
                value={unitNote}
                onChange={(e) => setUnitNote(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Unit / Personel</span>
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-200">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {unit.nama}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {unit.tipe} · {unit.keterangan}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteUnit(unit.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors shrink-0"
                  aria-label={`Hapus ${unit.nama}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Master Lokasi Sidoarjo */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Lokasi Umum Kabupaten Sidoarjo ({locations.length})
              </h3>
            </div>
          </div>

          {/* Add Location Form */}
          <form
            onSubmit={handleCreateLocation}
            className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="Nama Lokasi / Gedung"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              <select
                value={locType}
                onChange={(e) =>
                  setLocType(e.target.value as MasterLocation['tipe'])
                }
                className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="Kantor Pemerintah">Kantor Pemerintah</option>
                <option value="Pos Damkar">Pos Damkar</option>
                <option value="Balai / Desa">Balai / Desa</option>
                <option value="Fasilitas Umum">Fasilitas Umum</option>
                <option value="Daring">Daring</option>
              </select>
            </div>

            <input
              type="text"
              required
              placeholder="Alamat lengkap (Jl., Kecamatan, Sidoarjo)"
              value={locAddress}
              onChange={(e) => setLocAddress(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Lokasi</span>
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-200">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{loc.nama}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {loc.tipe} · {loc.alamat}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteLocation(loc.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors shrink-0"
                  aria-label={`Hapus ${loc.nama}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
