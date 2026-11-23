import { useState } from 'react';
import { Award, Flame, Play, RefreshCw } from 'lucide-react';
import type { DiscordQuestItem, InventoryGameEntry } from '../types';

interface StreakAndQuestsTabProps {
  hasToken: boolean;
  inventoryEntries: InventoryGameEntry[];
  lastInventorySyncAt: string | null;
  quests: DiscordQuestItem[];
  lastQuestSyncAt: string | null;
  activeAppId: string;
  onSyncStreak: () => Promise<void>;
  onSyncQuests: () => Promise<void>;
  onEnrollQuest: (questId: string) => Promise<void>;
  onSendQuestHeartbeat: (questId: string, applicationId: string) => Promise<void>;
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0 phút';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (hrs > 0) return `${hrs} giờ ${mins} phút`;
  return `${mins} phút`;
}

export function StreakAndQuestsTab({
  hasToken,
  inventoryEntries,
  lastInventorySyncAt,
  quests,
  lastQuestSyncAt,
  activeAppId,
  onSyncStreak,
  onSyncQuests,
  onEnrollQuest,
  onSendQuestHeartbeat,
}: StreakAndQuestsTabProps) {
  const [syncingInv, setSyncingInv] = useState(false);
  const [syncingQuests, setSyncingQuests] = useState(false);
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);

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
              Discord Quests & Auto Heartbeat
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tự động gửi nhịp tim <span className="font-mono">POST /quests/{'{id}'}/heartbeat</span> để cày tiến độ Quest thật ·{' '}
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

        {quests.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
            <p className="text-sm text-slate-300 font-medium">
              Hiện chưa có Quest nào hoặc chưa đồng bộ tài khoản
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Bấm "Tải danh sách Quest" sau khi xác thực token để xem các nhiệm vụ Discord hiện có trên tài khoản.
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
