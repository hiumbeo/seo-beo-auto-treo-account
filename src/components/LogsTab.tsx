import { useState } from 'react';
import { History } from 'lucide-react';
import type { LogEntry } from '../types';

interface LogsTabProps {
  logs: LogEntry[];
  snipedCount?: number;
  onOpenSnipe?: () => void;
}

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  info: 'text-slate-300',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
  gateway: 'text-[#818CF8]',
};

export function LogsTab({ logs, snipedCount = 0, onOpenSnipe }: LogsTabProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered =
    filter === 'all'
      ? logs
      : logs.filter((l) => l.level === filter || l.source.toLowerCase() === filter);

  return (
    <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Nhật ký Gateway & API Trực tiếp</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Theo dõi toàn bộ frame OP 1 / 2 / 3 / 10 / 11, Snipe tin xóa và Streak sync từ Discord.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenSnipe && (
            <button
              type="button"
              onClick={onOpenSnipe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border border-[#5865F2]/40 text-[#A5B4FC] rounded-md transition-colors whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              Mở Snipe Tin Xóa ({snipedCount})
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-[#090C12] border border-[#232C3F] rounded-md">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'gateway', label: 'Gateway' },
              { id: 'snipe', label: 'Snipe' },
              { id: 'success', label: 'Thành công' },
              { id: 'warn', label: 'Cảnh báo' },
              { id: 'error', label: 'Lỗi' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-[#1D2538] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#090C12] font-mono text-xs divide-y divide-[#151B29] max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Chưa có sự kiện nào trong bộ lọc này.</div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[#111622]/70">
              <span className="text-slate-500 tabular-nums shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('vi-VN')}
              </span>
              <span className="text-slate-400 w-20 shrink-0 truncate">[{entry.source}]</span>
              <span className={`${LEVEL_STYLES[entry.level]} break-all`}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
