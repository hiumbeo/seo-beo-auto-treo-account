import { useState } from 'react';
import { Award, Clock, Eye, EyeOff, Play, Square } from 'lucide-react';
import type { BadgeSpoofPublicState } from '../types';

interface BadgeSpoofTabProps {
  hasToken: boolean;
  badgeSpoof: BadgeSpoofPublicState;
  onStartSpoof: (params: {
    mode: 'played_count' | 'playtime_hours';
    gameLimit: number;
    hoursPerGame?: number;
    cookie?: string;
    fingerprint?: string;
  }) => Promise<void>;
  onStopSpoof: () => Promise<void>;
}

const PRESETS: Array<{
  id: string;
  label: string;
  detail: string;
  mode: 'played_count' | 'playtime_hours';
  gameLimit: number;
  hoursPerGame: number;
}> = [
  {
    id: 'badge-100',
    label: '100 Game · Played Badge',
    detail: '100 game Win32 × 60 giây/game',
    mode: 'played_count',
    gameLimit: 100,
    hoursPerGame: 1 / 60,
  },
  {
    id: 'hours-500',
    label: '100 Game × 5 giờ (500 giờ)',
    detail: 'Cày 500 giờ chơi qua Science',
    mode: 'playtime_hours',
    gameLimit: 100,
    hoursPerGame: 5,
  },
  {
    id: 'hours-5000',
    label: '1,000 Game × 5 giờ (5,000 giờ)',
    detail: 'Cày 5,000 giờ chơi tổng hợp',
    mode: 'playtime_hours',
    gameLimit: 1000,
    hoursPerGame: 5,
  },
];

export function BadgeSpoofTab({
  hasToken,
  badgeSpoof,
  onStartSpoof,
  onStopSpoof,
}: BadgeSpoofTabProps) {
  const [mode, setMode] = useState<'played_count' | 'playtime_hours'>(badgeSpoof.mode || 'played_count');
  const [gameLimit, setGameLimit] = useState<number>(100);
  const [hoursPerGame, setHoursPerGame] = useState<number>(5);
  const [cookieInput, setCookieInput] = useState<string>('');
  const [showCookie, setShowCookie] = useState<boolean>(false);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const pct =
    badgeSpoof.totalGames > 0
      ? Math.min(100, Math.round((badgeSpoof.processedGames / badgeSpoof.totalGames) * 100))
      : 0;

  const estimatedTotalHours =
    mode === 'playtime_hours'
      ? Math.round(gameLimit * hoursPerGame * 10) / 10
      : Math.round((gameLimit / 60) * 10) / 10;

  const handleStart = async () => {
    setSubmitting(true);
    try {
      await onStartSpoof({
        mode,
        gameLimit,
        hoursPerGame: mode === 'playtime_hours' ? hoursPerGame : undefined,
        cookie: cookieInput.trim() || undefined,
        fingerprint: fingerprint.trim() || undefined,
      });
      if (cookieInput.trim()) setCookieInput('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Farm Played Games Badge & Giờ Chơi (Science API)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gửi batch 100 game Win32 kèm <span className="font-mono">analytics_token</span> tới{' '}
              <span className="font-mono">POST /api/v9/science</span> (chuỗi 3 event: heartbeat đầu, launch_game, heartbeat cuối).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {badgeSpoof.running ? (
              <button
                type="button"
                onClick={onStopSpoof}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors whitespace-nowrap"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Dừng Farm
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasToken || submitting}
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {submitting ? 'Đang khởi chạy...' : 'Bắt đầu Farm Science'}
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#232C3F] rounded-md bg-[#0C1019] divide-y sm:divide-y-0 sm:divide-x divide-[#232C3F]">
            <div className="p-4">
              <div className="text-xs text-slate-400">Trạng thái tiến trình</div>
              <div
                className={`text-sm font-semibold mt-1 ${
                  badgeSpoof.running ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {badgeSpoof.statusMessage}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-400">Tiến độ Batch Game</div>
              <div className="text-base font-semibold text-white font-mono tabular-nums mt-1">
                {badgeSpoof.processedGames} / {badgeSpoof.totalGames} game ({pct}%)
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-400">Tổng giờ đã cộng</div>
              <div className="text-base font-semibold text-emerald-400 font-mono tabular-nums mt-1">
                {badgeSpoof.totalHoursAdded.toLocaleString('vi-VN')} giờ
              </div>
            </div>
          </div>

          {(badgeSpoof.running || badgeSpoof.totalGames > 0) && (
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-[#1C2436] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    badgeSpoof.running ? 'bg-[#5865F2]' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-300">Chế độ Farm</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('played_count');
                  setGameLimit(100);
                }}
                className={`p-4 text-left rounded-md border transition-colors ${
                  mode === 'played_count'
                    ? 'bg-[#5865F2]/10 border-[#5865F2] text-white'
                    : 'bg-[#0C1019] border-[#232C3F] text-slate-300 hover:bg-[#141B2B]'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Award className="w-4 h-4 text-[#818CF8]" />
                  <span>Farm Played Games Badge</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Gửi 60 giây mỗi game qua hàng loạt đầu game Win32 để Discord đếm số lượng game đã chơi.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('playtime_hours');
                  if (hoursPerGame < 1) setHoursPerGame(5);
                }}
                className={`p-4 text-left rounded-md border transition-colors ${
                  mode === 'playtime_hours'
                    ? 'bg-[#5865F2]/10 border-[#5865F2] text-white'
                    : 'bg-[#0C1019] border-[#232C3F] text-slate-300 hover:bg-[#141B2B]'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Farm Giờ Chơi (500 – 5,000+ Giờ)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Gửi duration từ 2–5 giờ mỗi game (có ±5% jitter tự nhiên) qua nhiều batch 100 game.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Preset nhanh</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setMode(p.mode);
                    setGameLimit(p.gameLimit);
                    setHoursPerGame(p.hoursPerGame);
                  }}
                  className="px-3.5 py-2 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-slate-200 rounded-md transition-colors text-left"
                >
                  <div className="font-semibold text-white">{p.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.detail}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1C2436]">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Số lượng game muốn gửi (tối đa 1,500)
              </label>
              <input
                type="number"
                min={1}
                max={1500}
                value={gameLimit}
                onChange={(e) => setGameLimit(Math.min(1500, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-sm font-mono tabular-nums text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {mode === 'playtime_hours'
                  ? 'Số giờ mỗi game (0.1 – 24 giờ)'
                  : 'Thời lượng mỗi game (cố định 1 phút)'}
              </label>
              <input
                type="number"
                min={0.1}
                max={24}
                step={0.5}
                disabled={mode !== 'playtime_hours'}
                value={mode === 'playtime_hours' ? hoursPerGame : 0.02}
                onChange={(e) =>
                  setHoursPerGame(Math.min(24, Math.max(0.1, Number(e.target.value) || 5)))
                }
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] disabled:opacity-50 rounded-md px-3 py-2 text-sm font-mono tabular-nums text-white outline-none"
              />
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Ước tính tổng thời lượng sẽ gửi:{' '}
            <span className="font-mono tabular-nums text-white font-semibold">
              {estimatedTotalHours.toLocaleString('vi-VN')} giờ
            </span>{' '}
            qua{' '}
            <span className="font-mono tabular-nums text-white font-semibold">
              {Math.ceil(gameLimit / 100)} batch
            </span>{' '}
            (100 game/batch).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1C2436]">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Discord Cookie (tùy chọn — dùng nếu Science trả về 401/403)
              </label>
              <div className="relative">
                <input
                  type={showCookie ? 'text' : 'password'}
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder={
                    badgeSpoof.hasCookie
                      ? `Đã lưu Cookie (${badgeSpoof.maskedCookie}) — dán mới để thay`
                      : '__dcfduid=...; __sdcfduid=...; cf_clearance=...'
                  }
                  className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md pl-3 pr-10 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCookie((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  aria-label={showCookie ? 'Ẩn cookie' : 'Hiện cookie'}
                >
                  {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Executable Fingerprint (tùy chọn)
              </label>
              <input
                type="text"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                placeholder="Bỏ trống nếu không dùng fingerprint cố định"
                className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
