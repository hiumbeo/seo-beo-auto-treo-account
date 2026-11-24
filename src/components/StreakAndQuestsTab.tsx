import { useState } from 'react';
import { Award, Flame, Globe, Play, RefreshCw, Square, Zap } from 'lucide-react';
import type { DiscordQuestItem, InventoryGameEntry, QuestRunnerPublicState } from '../types';

interface StreakAndQuestsTabProps {
  hasToken: boolean;
  inventoryEntries: InventoryGameEntry[];
  lastInventorySyncAt: string | null;
  quests: DiscordQuestItem[];
  lastQuestSyncAt: string | null;
  activeAppId: string;
  questRunner: QuestRunnerPublicState;
  questBoostRatio: number;
  questAutoBackToVN: boolean;
  onSyncStreak: () => Promise<void>;
  onSyncQuests: () => Promise<void>;
  onEnrollQuest: (questId: string) => Promise<void>;
  onSendQuestHeartbeat: (questId: string, applicationId: string) => Promise<void>;
  onRunAutoQuests: (opts: {
    boostRatio: number;
    sweepRegions: boolean;
    autoBackToVN: boolean;
  }) => Promise<void>;
  onStopAutoQuests: () => Promise<void>;
  onSweepQuestRegions: (autoBackToVN: boolean) => Promise<void>;
  onUpdateQuestConfig: (partial: {
    questBoostRatio?: number;
    questAutoBackToVN?: boolean;
  }) => Promise<void>;
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0 phút';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (hrs > 0) return `${hrs} giờ ${mins} phút`;
  return `${mins} phút`;
}

const BOOST_OPTIONS = [1, 2.5, 5, 8];

export function StreakAndQuestsTab({
  hasToken,
  inventoryEntries,
  lastInventorySyncAt,
  quests,
  lastQuestSyncAt,
  activeAppId,
  questRunner,
  questBoostRatio,
  questAutoBackToVN,
  onSyncStreak,
  onSyncQuests,
  onEnrollQuest,
  onSendQuestHeartbeat,
  onRunAutoQuests,
  onStopAutoQuests,
  onSweepQuestRegions,
  onUpdateQuestConfig,
}: StreakAndQuestsTabProps) {
  const [syncingInv, setSyncingInv] = useState(false);
  const [syncingQuests, setSyncingQuests] = useState(false);
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);
  const [boostRatio, setBoostRatio] = useState<number>(questBoostRatio || 2.5);
  const [autoBackToVN, setAutoBackToVN] = useState<boolean>(questAutoBackToVN ?? true);

  const handleSyncInventory = async () => {
    setSyncingInv(true);
    try {
      await onSyncStreak();
    } finally {
      setSyncingInv(false);
    }
  };

  const handleSyncQuests = async () => {
    setSyncingQuests(true);
    try {
      await onSyncQuests();
    } finally {
      setSyncingQuests(false);
    }
  };

  const isRunnerBusy = questRunner.running || questRunner.sweeping;

  return (
    <div className="space-y-6">
      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Chuỗi chơi game thực tế từ Discord Content Inventory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dữ liệu trả về trực tiếp từ <span className="font-mono">GET /content-inventory/users/@me</span> ·{' '}
              {lastInventorySyncAt
                ? `Đồng bộ lúc ${new Date(lastInventorySyncAt).toLocaleTimeString('vi-VN')}`
                : 'Chưa đồng bộ'}
            </p>
          </div>
          <button
            type="button"
            disabled={!hasToken || syncingInv}
            onClick={handleSyncInventory}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#182032] hover:bg-[#202B42] border border-[#2C374F] disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingInv ? 'animate-spin' : ''}`} />
            {syncingInv ? 'Đang đồng bộ...' : 'Đồng bộ Chuỗi từ Discord'}
          </button>
        </div>

        {inventoryEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Flame className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
            <p className="text-sm text-slate-300 font-medium">
              Chưa có dữ liệu Game Activity được ghi nhận từ Discord API
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              Khi self-bot chạy hoạt động Roblox (Desktop + Application ID 363445589247131668) tối thiểu 15 phút,
              Discord sẽ ghi nhận vào lịch sử chơi gần đây và bắt đầu tính chuỗi ngày.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232C3F] text-xs font-medium text-slate-400 bg-[#0E131D]">
                  <th className="py-3 px-5">Trò chơi</th>
                  <th className="py-3 px-5">Application ID</th>
                  <th className="py-3 px-5 text-right">Chuỗi ngày</th>
                  <th className="py-3 px-5 text-right">Thời lượng ghi nhận</th>
                  <th className="py-3 px-5 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2436] text-sm">
                {inventoryEntries.map((entry) => {
                  const isCurrent = entry.applicationId === activeAppId;
                  return (
                    <tr
                      key={entry.id}
                      className={isCurrent ? 'bg-[#5865F2]/5' : 'hover:bg-[#161D2B]/60'}
                    >
                      <td className="py-3 px-5 font-medium text-white">{entry.gameName}</td>
                      <td className="py-3 px-5 font-mono text-xs text-slate-400">
                        {entry.applicationId || '-'}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums">
                        {entry.streakDays > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            {entry.streakDays} ngày
                          </span>
                        ) : (
                          <span className="text-slate-500">0 ngày</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-300">
                        {formatDuration(entry.durationSeconds)}
                      </td>
                      <td className="py-3 px-5 text-right text-xs">
                        {entry.isLive ? (
                          <span className="text-emerald-400 font-medium">Đang phát trực tiếp</span>
                        ) : (
                          <span className="text-slate-400">Đã lưu lịch sử</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232C3F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Discord Auto Quest Engine (Video + Game + Quét 40 Quốc Gia)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ đủ 5 loại: <span className="font-mono">WATCH_VIDEO</span>,{' '}
              <span className="font-mono">WATCH_VIDEO_ON_MOBILE</span>,{' '}
              <span className="font-mono">PLAY_ON_DESKTOP</span>,{' '}
              <span className="font-mono">STREAM_ON_DESKTOP</span>,{' '}
              <span className="font-mono">PLAY_ACTIVITY</span> ·{' '}
              {lastQuestSyncAt
                ? `Đồng bộ lúc ${new Date(lastQuestSyncAt).toLocaleTimeString('vi-VN')}`
                : 'Chưa tải'}
            </p>
          </div>
          <button
            type="button"
            disabled={!hasToken || syncingQuests}
            onClick={handleSyncQuests}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#182032] hover:bg-[#202B42] border border-[#2C374F] disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingQuests ? 'animate-spin' : ''}`} />
            {syncingQuests ? 'Đang tải Quest...' : 'Tải danh sách Quest'}
          </button>
        </div>

        <div className="px-5 py-4 bg-[#0C1019] border-b border-[#232C3F] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                Trạng thái Auto Quest · Vùng hiện tại:{' '}
                <span className="font-mono text-white">{questRunner.currentRegion}</span>
              </div>
              <div
                className={`text-sm font-medium ${
                  isRunnerBusy ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {questRunner.statusMessage}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isRunnerBusy ? (
                <button
                  type="button"
                  onClick={onStopAutoQuests}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md transition-colors whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Dừng Auto Quest
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!hasToken}
                    onClick={() => onSweepQuestRegions(autoBackToVN)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#818CF8]" />
                    Quét Quest Toàn Cầu (40 nước)
                  </button>
                  <button
                    type="button"
                    disabled={!hasToken}
                    onClick={() =>
                      onRunAutoQuests({
                        boostRatio,
                        sweepRegions: false,
                        autoBackToVN,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white rounded-md transition-colors whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Chạy Auto Tất Cả Quest
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#1C2436]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Tốc độ Boost:</span>
              <div className="inline-flex items-center gap-1 p-1 bg-[#111622] border border-[#232C3F] rounded-md">
                {BOOST_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setBoostRatio(opt);
                      onUpdateQuestConfig({ questBoostRatio: opt });
                    }}
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded transition-colors ${
                      boostRatio === opt
                        ? 'bg-[#5865F2] text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt}x
                  </button>
                ))}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackToVN}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoBackToVN(val);
                  onUpdateQuestConfig({ questAutoBackToVN: val });
                }}
                className="w-4 h-4 accent-[#5865F2]"
              />
              <span>Tự động đưa tài khoản về vùng Việt Nam (VN) sau khi quét</span>
            </label>
          </div>
        </div>

        {quests.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
            <p className="text-sm text-slate-300 font-medium">
              Hiện chưa có Quest nào hoặc chưa đồng bộ tài khoản
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Bấm "Tải danh sách Quest" hoặc "Quét Quest Toàn Cầu (40 nước)" để săn thêm Quest ẩn theo khu vực.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1C2436]">
            {quests.map((q) => {
              const pct = Math.min(
                100,
                Math.round((q.currentSeconds / Math.max(1, q.targetSeconds)) * 100)
              );
              const isBusy = busyQuestId === q.id;
              return (
                <div
                  key={q.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{q.title}</span>
                      <span className="text-xs text-slate-400 font-mono">· {q.gameTitle}</span>
                      <span className="text-xs text-slate-500 font-mono">· {q.taskType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-1.5 bg-[#1C2436] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            q.completed ? 'bg-emerald-500' : 'bg-[#5865F2]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-300">
                        {Math.floor(q.currentSeconds)}s / {q.targetSeconds}s ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {q.completed ? (
                      <span className="text-xs font-medium text-emerald-400">Đã hoàn thành</span>
                    ) : !q.enrolled ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          setBusyQuestId(q.id);
                          try {
                            await onEnrollQuest(q.id);
                          } finally {
                            setBusyQuestId(null);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap"
                      >
                        {isBusy ? 'Đang nhận...' : 'Nhận Quest'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          setBusyQuestId(q.id);
                          try {
                            await onSendQuestHeartbeat(q.id, q.applicationId || activeAppId);
                          } finally {
                            setBusyQuestId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        {isBusy ? 'Đang gửi...' : 'Gửi Heartbeat ngay'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
