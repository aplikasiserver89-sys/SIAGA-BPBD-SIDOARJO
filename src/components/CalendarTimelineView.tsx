import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  UserCheck,
} from 'lucide-react';
import { AgendaItem, ConflictDetail } from '../types/agenda';
import {
  detectConflictsForDate,
  formatRentangWIB,
  formatTanggalIndonesia,
  formatTanggalRingkas,
  parseDateSafe,
  sortAgendasChronological,
  timeToMinutes,
} from '../utils/agendaHelpers';
import { StatusIndicator } from './StatusIndicator';

interface CalendarTimelineViewProps {
  agendas: AgendaItem[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  conflictsMap: Map<string, ConflictDetail>;
  onInspectItem: (item: AgendaItem) => void;
  onQuickAddAtHour: (hour: string) => void;
  canCreateAgenda: boolean;
}

const HOURS_WIB = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = parseDateSafe(dateStr);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarTimelineView: React.FC<CalendarTimelineViewProps> = ({
  agendas,
  selectedDate,
  onChangeDate,
  conflictsMap,
  onInspectItem,
  onQuickAddAtHour,
  canCreateAgenda,
}) => {
  // 7-day strip centered around selectedDate (start from -1 day to +5 days)
  const dateStrip = useMemo(() => {
    const startOffset = -1;
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = shiftDate(selectedDate, startOffset + i);
      const count = agendas.filter((a) => a.tanggal === dateStr).length;
      const dayConflicts = detectConflictsForDate(agendas, dateStr);
      const hasHighConflict = Array.from(dayConflicts.values()).some(
        (c) => c.severity === 'tinggi'
      );
      return { dateStr, count, hasHighConflict };
    });
  }, [agendas, selectedDate]);

  const dayAgendas = useMemo(
    () =>
      sortAgendasChronological(
        agendas.filter((a) => a.tanggal === selectedDate)
      ),
    [agendas, selectedDate]
  );

  // Group items by starting hour bucket (e.g., 08:00-08:59 goes under '08:00')
  const itemsByHourBucket = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    HOURS_WIB.forEach((h) => map.set(h, []));
    const earlier: AgendaItem[] = [];
    const later: AgendaItem[] = [];

    dayAgendas.forEach((item) => {
      const mins = timeToMinutes(item.jamMulai);
      const hourNum = Math.floor(mins / 60);
      if (hourNum < 7) {
        earlier.push(item);
      } else if (hourNum > 20) {
        later.push(item);
      } else {
        const key = `${String(hourNum).padStart(2, '0')}:00`;
        const list = map.get(key) || [];
        list.push(item);
        map.set(key, list);
      }
    });

    return { map, earlier, later };
  }, [dayAgendas]);

  return (
    <div className="space-y-6">
      {/* Header & Date Navigator */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-sky-700">
            Matriks Waktu Harian (WIB)
          </div>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {formatTanggalIndonesia(selectedDate)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Agenda pada jam yang sama ditampilkan berdampingan agar potensi
            bentrok PIC langsung terlihat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeDate(shiftDate(selectedDate, -1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 transition-colors"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            aria-label="Pilih tanggal kalender"
            className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-800 tabular-nums focus:outline-none focus:border-sky-600"
          />

          <button
            type="button"
            onClick={() => onChangeDate(shiftDate(selectedDate, 1))}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 transition-colors"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-Day Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {dateStrip.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onChangeDate(day.dateStr)}
              className={`p-3 rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                isSelected
                  ? 'bg-[#0F294A] border-[#0F294A] text-white'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  isSelected ? 'text-sky-200' : 'text-slate-500'
                }`}
              >
                {formatTanggalIndonesia(day.dateStr).split(',')[0]}
              </div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatTanggalRingkas(day.dateStr)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span
                  className={`font-mono tabular-nums ${
                    isSelected ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {day.count} agenda
                </span>
                {day.hasHighConflict && (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      isSelected ? 'text-red-300' : 'text-red-600'
                    }`}
                    title="Terdapat bentrok jam WIB"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chronological Hourly Grid */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
        {itemsByHourBucket.earlier.length > 0 && (
          <HourRow
            hourLabel="Sebelum 07.00"
            items={itemsByHourBucket.earlier}
            conflictsMap={conflictsMap}
            onInspectItem={onInspectItem}
            onQuickAdd={() => onQuickAddAtHour('06:30')}
            canCreateAgenda={canCreateAgenda}
          />
        )}

        {HOURS_WIB.map((hour) => {
          const items = itemsByHourBucket.map.get(hour) || [];
          return (
            <HourRow
              key={hour}
              hourLabel={`${hour.replace(':', '.')} WIB`}
              items={items}
              conflictsMap={conflictsMap}
              onInspectItem={onInspectItem}
              onQuickAdd={() => onQuickAddAtHour(hour)}
              canCreateAgenda={canCreateAgenda}
            />
          );
        })}

        {itemsByHourBucket.later.length > 0 && (
          <HourRow
            hourLabel="Setelah 21.00"
            items={itemsByHourBucket.later}
            conflictsMap={conflictsMap}
            onInspectItem={onInspectItem}
            onQuickAdd={() => onQuickAddAtHour('21:00')}
            canCreateAgenda={canCreateAgenda}
          />
        )}
      </div>
    </div>
  );
};

interface HourRowProps {
  hourLabel: string;
  items: AgendaItem[];
  conflictsMap: Map<string, ConflictDetail>;
  onInspectItem: (item: AgendaItem) => void;
  onQuickAdd: () => void;
  canCreateAgenda: boolean;
}

const HourRow: React.FC<HourRowProps> = ({
  hourLabel,
  items,
  conflictsMap,
  onInspectItem,
  onQuickAdd,
  canCreateAgenda,
}) => {
  const hasMultipleAtSameHour = items.length > 1;

  return (
    <div className="flex flex-col sm:flex-row group">
      {/* Hour Column */}
      <div className="sm:w-32 shrink-0 px-4 py-3.5 bg-slate-50/70 sm:border-r border-slate-200 flex sm:flex-col items-center sm:items-start justify-between gap-2">
        <span className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-slate-700">
          {hourLabel}
        </span>

        {hasMultipleAtSameHour && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{items.length} paralel</span>
          </span>
        )}
      </div>

      {/* Slots Area */}
      <div className="flex-1 p-3.5 min-h-[64px] flex items-center">
        {items.length === 0 ? (
          <div className="w-full flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 opacity-60" />
              <span>Slot waktu kosong</span>
            </span>
            {canCreateAgenda && (
              <button
                type="button"
                onClick={onQuickAdd}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 rounded-md transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah di jam ini</span>
              </button>
            )}
          </div>
        ) : (
          <div
            className={`w-full grid gap-3 ${
              items.length >= 3
                ? 'grid-cols-1 md:grid-cols-3'
                : items.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1'
            }`}
          >
            {items.map((item) => {
              const conflict = conflictsMap.get(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInspectItem(item)}
                  className={`text-left p-3.5 rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                    conflict?.severity === 'tinggi'
                      ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                      : item.status === 'Update / Baru'
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-slate-50/50 border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#0F294A]">
                      {formatRentangWIB(item.jamMulai, item.jamSelesai)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.jenisKegiatan}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                    {item.namaKegiatan}
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.lokasi}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.pic}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/70">
                    <StatusIndicator
                      status={item.status}
                      hasConflict={Boolean(conflict)}
                      conflictSeverity={conflict?.severity}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
