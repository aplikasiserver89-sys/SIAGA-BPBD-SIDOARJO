import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AgendaStatus } from '../types/agenda';

interface StatusIndicatorProps {
  status: AgendaStatus;
  hasConflict?: boolean;
  conflictSeverity?: 'tinggi' | 'sedang';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  hasConflict = false,
  conflictSeverity,
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'Terjadwal':
        return {
          icon: CheckCircle2,
          colorClass: 'text-emerald-700',
          label: 'Terjadwal',
        };
      case 'Update / Baru':
        return {
          icon: Sparkles,
          colorClass: 'text-amber-700',
          label: 'Update / Baru',
        };
      case 'Ditunda':
        return {
          icon: Clock,
          colorClass: 'text-slate-600',
          label: 'Ditunda',
        };
      case 'Dibatalkan':
        return {
          icon: XCircle,
          colorClass: 'text-red-700',
          label: 'Dibatalkan',
        };
    }
  };

  const { icon: Icon, colorClass, label } = getStatusDisplay();

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium">
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        <span>{label}</span>
      </span>

      {hasConflict && (
        <>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${
              conflictSeverity === 'tinggi' ? 'text-red-700' : 'text-amber-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>
              {conflictSeverity === 'tinggi'
                ? 'Bentrok Jam WIB'
                : 'Jeda Waktu Ketat'}
            </span>
          </span>
        </>
      )}
    </div>
  );
};
