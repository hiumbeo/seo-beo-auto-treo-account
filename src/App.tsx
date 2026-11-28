import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Code2,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  History,
  KeyRound,
  LayoutDashboard,
  Menu,
  Play,
  Square,
  Terminal,
  Trash2,
  UserCheck,
  Volume2,
  X,
} from 'lucide-react';
import type { ActivityConfig, BotPublicState } from './types';
import { PresencePreview } from './components/PresencePreview';
import { RobloxAccountTab } from './components/RobloxAccountTab';
import { GameCatalogTab } from './components/GameCatalogTab';
import { StreakAndQuestsTab } from './components/StreakAndQuestsTab';
import { VoiceStreamTab } from './components/VoiceStreamTab';
import { BadgeSpoofTab } from './components/BadgeSpoofTab';
import { LogsTab } from './components/LogsTab';
import { SnipeTab } from './components/SnipeTab';
import { ExportBotTab } from './components/ExportBotTab';

type NavTab = 'overview' | 'roblox' | 'games' | 'voice' | 'streak' | 'badge' | 'logs' | 'snipe' | 'export';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { id: 'roblox', label: 'Tài khoản Roblox', icon: UserCheck },
  { id: 'games', label: 'Kho Game & RPC', icon: Gamepad2 },
  { id: 'voice', label: 'Voice & Stream Ảnh', icon: Volume2 },
  { id: 'streak', label: 'Chuỗi & Auto Quest', icon: Flame },
  { id: 'badge', label: 'Farm Badge & Giờ Chơi', icon: Award },
  { id: 'snipe', label: 'Snipe Tin Xóa', icon: History },
  { id: 'logs', label: 'Nhật ký Gateway', icon: Terminal },
  { id: 'export', label: 'Host Render & Export', icon: Code2 },
];

const CONNECTION_LABELS: Record<BotPublicState['connectionState'], { text: string; color: string }> = {
  disconnected: { text: 'Chưa kết nối', color: 'text-slate-400' },
  connecting: { text: 'Đang kết nối Gateway...', color: 'text-amber-400' },
  connected: { text: 'Gateway đã kết nối', color: 'text-emerald-400' },
  reconnecting: { text: 'Đang tự nối lại...', color: 'text-amber-400' },
};

export default function App() {
  const [state, setState] = useState<BotPublicState | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let active = true;

    fetch('/api/state')
      .then((r) => r.json())
      .then((initial: BotPublicState) => {
        if (active) setState(initial);
      })
      .catch(() => {});

    es = new EventSource('/api/events');
    es.onmessage = (evt) => {
      try {
        const next = JSON.parse(evt.data) as BotPublicState;
        if (active) setState(next);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      active = false;
      es?.close();
    };
  }, []);

  const currentGameStreak = useMemo(() => {
    if (!state) return 0;
    const match = state.inventoryEntries.find(
      (e) => e.applicationId === state.config.applicationId
    );
    return match?.streakDays || 0;
  }, [state]);

  const activeQuestsCount = useMemo(() => {
    if (!state) return 0;
    return state.quests.filter((q) => q.enrolled && !q.completed).length;
  }, [state]);

  const notify = (msg: string) => {
    setErrorMsg(null);
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(null), 4000);
  };

  const handleVerifyToken = async () => {
    if (!tokenInput.trim()) {
      setErrorMsg('Vui lòng dán Discord Token trước khi xác thực.');
      return;
    }
    setBusyAction('verify');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Xác thực token thất bại.');
      }
      setState(json.state);
      setTokenInput('');
      notify(`Đã xác thực tài khoản ${json.user.global_name || json.user.username}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi xác thực token.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartBot = async () => {
    setBusyAction('start');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Không thể khởi chạy self-bot.');
      }
      setState(json.state);
      if (tokenInput.trim()) setTokenInput('');
      notify(`Đã kích hoạt hoạt động ${json.state.config.gameName} trực tiếp trên Discord Gateway.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khởi chạy self-bot.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleStopBot = async () => {
    setBusyAction('stop');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/bot/stop', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Không thể dừng self-bot.');
      }
      setState(json.state);
      notify('Đã dừng self-bot và gỡ trạng thái game.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi dừng self-bot.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateConfig = async (partial: Partial<ActivityConfig>) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/bot/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Cập nhật thất bại.');
      }
      setState(json.state);
      notify('Đã cập nhật cấu hình Activity.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình.');
    }
  };

  const handleApplyRobloxPreset = async () => {
    setErrorMsg(null);
    const res = await fetch('/api/bot/roblox-preset', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify('Đã đặt lại cấu hình Roblox chính hãng (363445589247131668).');
    }
  };

  const handleClearToken = async () => {
    const res = await fetch('/api/auth/clear', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify('Đã xóa token khỏi cấu hình cục bộ.');
    }
  };

  const handleSyncStreak = async () => {
    setErrorMsg(null);
    const res = await fetch('/api/streak/sync', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Không thể đồng bộ chuỗi từ Discord.');
      return;
    }
    setState(json.state);
    notify('Đã đồng bộ chuỗi chơi game thực tế từ Discord Content Inventory.');
  };

  const handleSyncQuests = async () => {
    setErrorMsg(null);
    const res = await fetch('/api/quests/sync', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Không thể tải danh sách Quest.');
      return;
    }
    setState(json.state);
    notify('Đã cập nhật danh sách Quest từ Discord.');
  };

  const handleEnrollQuest = async (questId: string) => {
    setErrorMsg(null);
    const res = await fetch(`/api/quests/${questId}/enroll`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Nhận Quest thất bại.');
      return;
    }
    setState(json.state);
    notify('Đã nhận Quest thành công.');
  };

  const handleSendQuestHeartbeat = async (questId: string, applicationId: string) => {
    setErrorMsg(null);
    const res = await fetch(`/api/quests/${questId}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Gửi Quest heartbeat thất bại.');
      return;
    }
    setState(json.state);
  };

  const handleRunAutoQuests = async (opts: {
    boostRatio: number;
    sweepRegions: boolean;
    autoBackToVN: boolean;
  }) => {
    setErrorMsg(null);
    const res = await fetch('/api/quests/auto-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Không thể chạy Auto Quest.');
      return;
    }
    setState(json.state);
    notify(`Đang chạy Auto Quest (boost x${opts.boostRatio}).`);
  };

  const handleStopAutoQuests = async () => {
    const res = await fetch('/api/quests/auto-stop', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify('Đã dừng Auto Quest.');
    }
  };

  const handleSweepQuestRegions = async (autoBackToVN: boolean) => {
    setErrorMsg(null);
    const res = await fetch('/api/quests/sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoBackToVN }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Không thể quét Quest toàn cầu.');
      return;
    }
    setState(json.state);
    notify('Đang quét Quest qua 40 khu vực toàn cầu.');
  };

  const handleStartBadgeSpoof = async (params: {
    mode: 'played_count' | 'playtime_hours';
    gameLimit: number;
    hoursPerGame?: number;
    cookie?: string;
    fingerprint?: string;
  }) => {
    setErrorMsg(null);
    const res = await fetch('/api/badge/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Không thể chạy Farm Badge / Giờ chơi.');
      return;
    }
    setState(json.state);
    notify('Đã khởi chạy Farm Science Badge / Giờ chơi.');
  };

  const handleStopBadgeSpoof = async () => {
    const res = await fetch('/api/badge/stop', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify('Đã dừng Farm Science Badge / Giờ chơi.');
    }
  };

  const handleConnectRoblox = async (params: { identifier?: string; cookie?: string }) => {
    setErrorMsg(null);
    const res = await fetch('/api/roblox/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Kết nối tài khoản Roblox thất bại.');
      return;
    }
    setState(json.state);
    notify(`Đã kết nối tài khoản Roblox @${json.account.username}.`);
  };

  const handleDisconnectRoblox = async () => {
    const res = await fetch('/api/roblox/disconnect', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify('Đã ngắt kết nối tài khoản Roblox.');
    }
  };

  const handleSyncRoblox = async () => {
    setErrorMsg(null);
    const res = await fetch('/api/roblox/sync', { method: 'POST' });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Đồng bộ trạng thái Roblox thất bại.');
      return;
    }
    setState(json.state);
    notify('Đã làm mới trạng thái tài khoản Roblox.');
  };

  const handleClearSnipe = async (channelId?: string) => {
    setErrorMsg(null);
    const res = await fetch('/api/snipe/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    });
    const json = await res.json();
    if (json.ok) {
      setState(json.state);
      notify(channelId ? 'Đã xóa lịch sử snipe của kênh đã chọn.' : 'Đã xóa toàn bộ lịch sử snipe.');
    }
  };

  const handleTestSnipeWebhook = async (webhookUrl: string) => {
    setErrorMsg(null);
    const res = await fetch('/api/snipe/webhook/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMsg(json.error || 'Gửi thử Snipe Webhook thất bại.');
      return;
    }
    notify('Đã gửi tin nhắn thử nghiệm tới Snipe Webhook.');
  };

  const connMeta = state
    ? CONNECTION_LABELS[state.connectionState]
    : CONNECTION_LABELS.disconnected;

  const currentTabTitle =
    NAV_ITEMS.find((i) => i.id === activeTab)?.label || 'Bảng điều khiển';

  return (
    <div className="min-h-screen bg-[#090C12] text-slate-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] shrink-0 bg-[#0D111A] border-r border-[#1E2638] flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-[#1E2638] flex items-center justify-between">
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Roblox Activity Bot
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#5865F2]/15 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#141A27]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#5865F2]' : 'text-slate-500'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'snipe' && (state?.snipedMessages?.length || 0) > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#5865F2]/25 text-[#A5B4FC] rounded">
                    {state?.snipedMessages.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1E2638] bg-[#0B0E16]">
          <div className="text-xs text-slate-400 mb-1">Tài khoản Discord</div>
          <div className="text-sm font-semibold text-white truncate">
            {state?.user ? state.user.global_name || state.user.username : 'Chưa xác thực'}
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className={`font-medium ${connMeta.color}`}>{connMeta.text}</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 border-b border-[#1E2638] bg-[#0D111A] flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-400 truncate whitespace-nowrap">
              <span>Self-Bot</span>
              <span className="mx-2 text-slate-600">/</span>
              <span className="text-white font-medium">{currentTabTitle}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono whitespace-nowrap">
            <span>{state?.config.gameName || 'Roblox'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {state?.pingMs !== null && state?.pingMs !== undefined ? `${state.pingMs} ms` : '-- ms'}
            </span>
          </div>

          <div className="shrink-0">
            {state?.activityActive ? (
              <button
                type="button"
                disabled={busyAction === 'stop'}
                onClick={handleStopBot}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {busyAction === 'stop' ? 'Đang dừng...' : 'Dừng Activity'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busyAction === 'start'}
                onClick={handleStartBot}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {busyAction === 'start'
                  ? 'Đang kết nối...'
                  : `Khởi chạy ${state?.config.gameName || 'Roblox'}`}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1280px] w-full mx-auto space-y-6">
          {(errorMsg || (state?.connectionState === 'disconnected' && state.logs[0]?.level === 'error')) && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-md flex items-start gap-3 text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="flex-1">
                {errorMsg || state?.logs[0]?.message}
              </span>
              {errorMsg && (
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-400 hover:text-white text-xs"
                >
                  Đóng
                </button>
              )}
            </div>
          )}

          {noticeMsg && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-md flex items-center justify-between gap-3 text-sm text-emerald-200">
              <span>{noticeMsg}</span>
              <button
                type="button"
                onClick={() => setNoticeMsg(null)}
                className="text-emerald-400 hover:text-white text-xs"
              >
                Đóng
              </button>
            </div>
          )}

          {activeTab === 'overview' && state && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#232C3F] rounded-lg bg-[#111622] divide-y sm:divide-y-0 sm:divide-x divide-[#232C3F]">
                <div className="p-4">
                  <div className="text-xs text-slate-400">Kết nối Gateway</div>
                  <div className={`text-base font-semibold mt-1 ${connMeta.color}`}>
                    {connMeta.text}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1 truncate">
                    {state.sessionId ? `Session ${state.sessionId.slice(0, 10)}...` : 'Chưa có phiên'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Độ trễ Heartbeat</div>
                  <div className="text-base font-semibold text-white font-mono tabular-nums mt-1">
                    {state.pingMs !== null ? `${state.pingMs} ms` : 'Chưa đo'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums mt-1">
                    {state.heartbeatIntervalMs
                      ? `Chu kỳ ${(state.heartbeatIntervalMs / 1000).toFixed(1)}s`
                      : 'Chu kỳ chờ HELLO'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Chuỗi Game Ghi Nhận</div>
                  <div className="text-base font-semibold text-amber-400 font-mono tabular-nums mt-1">
                    {currentGameStreak} ngày
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {state.headlessSessionActive ? 'Headless API đang bật' : 'Gateway OP 3 Desktop'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-xs text-slate-400">Quest Heartbeat</div>
                  <div className="text-base font-semibold text-white font-mono tabular-nums mt-1">
                    {activeQuestsCount} nhiệm vụ
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {state.config.autoQuestHeartbeat ? 'Tự động gửi mỗi 35s' : 'Đang tắt tự động'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#232C3F] flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-white">
                          Xác thực Tài khoản & Token Discord
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Self-bot kết nối thẳng tới Discord Gateway v9 bằng phiên PC Discord Desktop Windows.
                        </p>
                      </div>
                      {state.hasToken && (
                        <button
                          type="button"
                          onClick={handleClearToken}
                          className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa Token
                        </button>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      {state.hasToken && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pb-3 border-b border-[#1C2436]">
                          <span className="inline-flex items-center gap-2 font-mono">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                            Token hiện tại: {state.maskedToken}
                          </span>
                          <span className="text-emerald-400 font-medium">Đã sẵn sàng chạy</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          {state.hasToken ? 'Đổi Token mới (tùy chọn)' : 'Discord User Token'}
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="relative flex-1">
                            <input
                              type={showToken ? 'text' : 'password'}
                              value={tokenInput}
                              onChange={(e) => setTokenInput(e.target.value)}
                              placeholder="Dán token tài khoản Discord của bạn vào đây..."
                              className="w-full bg-[#090C12] border border-[#232C3F] focus:border-[#5865F2] rounded-md pl-3 pr-10 py-2 text-sm font-mono text-white placeholder:text-slate-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken((s) => !s)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                              aria-label={showToken ? 'Ẩn token' : 'Hiện token'}
                            >
                              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={busyAction === 'verify'}
                            onClick={handleVerifyToken}
                            className="px-4 py-2 text-sm font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            {busyAction === 'verify' ? 'Đang kiểm tra...' : 'Kiểm tra Token'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 space-y-3 border-t border-[#1C2436]">
                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                              Lưu Token cục bộ trên máy chủ
                            </div>
                            <div className="text-xs text-slate-400">
                              Lưu trong data/bot-config.json để không phải nhập lại sau khi khởi động lại server.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={state.config.saveTokenLocally}
                            onChange={(e) =>
                              handleUpdateConfig({ saveTokenLocally: e.target.checked })
                            }
                            className="w-4 h-4 accent-[#5865F2] shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                              Tự động chạy Roblox Activity khi bật máy chủ
                            </div>
                            <div className="text-xs text-slate-400">
                              Tự động nối lại Discord Gateway và phát hoạt động Roblox ngay khi server khởi động.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={state.config.autoStart}
                            onChange={(e) => handleUpdateConfig({ autoStart: e.target.checked })}
                            className="w-4 h-4 accent-[#5865F2] shrink-0"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#232C3F]">
                      <h2 className="text-base font-semibold text-white">
                        Cơ chế Giữ Chuỗi & Hoạt động Game Thật
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kết hợp 4 kênh tín hiệu để Discord ghi nhận giờ chơi, chuỗi ngày và tiến độ Quest thật.
                      </p>
                    </div>

                    <div className="divide-y divide-[#1C2436]">
                      <label className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#141A27]">
                        <div>
                          <div className="text-sm font-medium text-white">
                            Auto Streak Keeper (Tự làm mới sang ngày mới)
                          </div>
                          <div className="text-xs text-slate-400">
                            Tự động làm mới phiên chơi qua mốc 00:00 UTC để Discord đếm chuỗi ngày liên tiếp.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={state.config.autoStreakKeeper}
                          onChange={(e) =>
                            handleUpdateConfig({ autoStreakKeeper: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#5865F2] shrink-0"
                        />
                      </label>

                      <label className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#141A27]">
                        <div>
                          <div className="text-sm font-medium text-white">
                            Headless Game Session API
                          </div>
                          <div className="text-xs text-slate-400">
                            Đăng ký phiên hoạt động game trực tiếp qua /users/@me/headless-sessions.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={state.config.useHeadlessSession}
                          onChange={(e) =>
                            handleUpdateConfig({ useHeadlessSession: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#5865F2] shrink-0"
                        />
                      </label>

                      <label className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#141A27]">
                        <div>
                          <div className="text-sm font-medium text-white">
                            Desktop Game Science Telemetry
                          </div>
                          <div className="text-xs text-slate-400">
                            Gửi sự kiện launch_game & running_game (RobloxPlayerBeta.exe) giống app Discord PC.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={state.config.sendScienceTelemetry}
                          onChange={(e) =>
                            handleUpdateConfig({ sendScienceTelemetry: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#5865F2] shrink-0"
                        />
                      </label>

                      <label className="px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#141A27]">
                        <div>
                          <div className="text-sm font-medium text-white">
                            Auto Quest Heartbeat (Mỗi 35 giây)
                          </div>
                          <div className="text-xs text-slate-400">
                            Tự động gửi nhịp tim cho các Discord Quest đã nhận mà không cần mở game thật.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={state.config.autoQuestHeartbeat}
                          onChange={(e) =>
                            handleUpdateConfig({ autoQuestHeartbeat: e.target.checked })
                          }
                          className="w-4 h-4 accent-[#5865F2] shrink-0"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <PresencePreview
                    user={state.user}
                    config={state.config}
                    activityActive={state.activityActive}
                    activityStartedAt={state.activityStartedAt}
                    streakDays={currentGameStreak}
                    robloxAccount={state.robloxAccount}
                    voice={state.voice}
                  />

                  <div className="bg-[#111622] border border-[#232C3F] rounded-lg p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <UserCheck className="w-4 h-4 text-[#5865F2]" />
                        <span>Tài khoản Roblox Liên kết</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('roblox')}
                        className="text-xs text-[#818CF8] hover:text-white transition-colors"
                      >
                        {state.robloxAccount ? 'Cấu hình đồng bộ' : 'Kết nối ngay'}
                      </button>
                    </div>

                    {state.robloxAccount ? (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-10 h-10 rounded-md bg-[#182032] border border-[#2B3752] overflow-hidden shrink-0 flex items-center justify-center">
                          {state.robloxAccount.avatarUrl ? (
                            <img
                              src={state.robloxAccount.avatarUrl}
                              alt={state.robloxAccount.username}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-300">
                              {state.robloxAccount.username.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">
                            {state.robloxAccount.displayName} (@{state.robloxAccount.username})
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {state.robloxAccount.presence?.userPresenceType === 2
                              ? `Đang chơi: ${state.robloxAccount.presence.gameName || state.robloxAccount.presence.lastLocation}`
                              : state.robloxAccount.presence?.userPresenceType === 1
                              ? 'Đang online Web Roblox'
                              : 'Đang giữ chuỗi Roblox 24/7'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Chưa kết nối tài khoản Roblox. Liên kết bằng Username, User ID hoặc Cookie
                        <span className="font-mono text-slate-300"> .ROBLOSECURITY </span>
                        để tự động hiện tên map Roblox bạn đang chơi lên Discord.
                      </p>
                    )}
                  </div>

                  <div className="bg-[#111622] border border-[#232C3F] rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Activity className="w-4 h-4 text-[#5865F2]" />
                      <span>Phiên bản Roblox Chính Hãng</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Khác với Custom Status chỉ hiện chữ trang trí, bot này gắn đúng{' '}
                      <span className="font-mono text-slate-200">application_id: 363445589247131668</span>{' '}
                      kèm định danh trình khách Discord Desktop Windows và tiến trình{' '}
                      <span className="font-mono text-slate-200">robloxplayerbeta.exe</span>.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('roblox')}
                        className="px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md transition-colors"
                      >
                        Kết nối Acc Roblox
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('games')}
                        className="px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md transition-colors"
                      >
                        Đổi game hoặc chỉnh RPC
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('voice')}
                        className="px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md transition-colors"
                      >
                        Vào Voice & Stream Ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('streak')}
                        className="px-3 py-1.5 text-xs font-medium bg-[#182032] hover:bg-[#222D45] border border-[#2C374F] text-white rounded-md transition-colors"
                      >
                        Kiểm tra Chuỗi & Quest
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roblox' && state && (
            <RobloxAccountTab
              robloxAccount={state.robloxAccount}
              config={state.config}
              onConnect={handleConnectRoblox}
              onDisconnect={handleDisconnectRoblox}
              onSyncNow={handleSyncRoblox}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'games' && state && (
            <GameCatalogTab
              config={state.config}
              onUpdateConfig={handleUpdateConfig}
              onApplyRobloxPreset={handleApplyRobloxPreset}
            />
          )}

          {activeTab === 'voice' && state && (
            <VoiceStreamTab
              state={state}
              onUpdateConfig={handleUpdateConfig}
              onStateChange={(next) => setState(next)}
              onNotify={notify}
              onError={(msg) => setErrorMsg(msg)}
            />
          )}

          {activeTab === 'streak' && state && (
            <StreakAndQuestsTab
              hasToken={state.hasToken}
              inventoryEntries={state.inventoryEntries}
              lastInventorySyncAt={state.lastInventorySyncAt}
              quests={state.quests}
              lastQuestSyncAt={state.lastQuestSyncAt}
              activeAppId={state.config.applicationId}
              questRunner={state.questRunner}
              questBoostRatio={state.config.questBoostRatio}
              questAutoBackToVN={state.config.questAutoBackToVN}
              onSyncStreak={handleSyncStreak}
              onSyncQuests={handleSyncQuests}
              onEnrollQuest={handleEnrollQuest}
              onSendQuestHeartbeat={handleSendQuestHeartbeat}
              onRunAutoQuests={handleRunAutoQuests}
              onStopAutoQuests={handleStopAutoQuests}
              onSweepQuestRegions={handleSweepQuestRegions}
              onUpdateQuestConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'badge' && state && (
            <BadgeSpoofTab
              hasToken={state.hasToken}
              badgeSpoof={state.badgeSpoof}
              onStartSpoof={handleStartBadgeSpoof}
              onStopSpoof={handleStopBadgeSpoof}
            />
          )}

          {activeTab === 'snipe' && state && (
            <SnipeTab
              snipedMessages={state.snipedMessages || []}
              gatewayConnected={state.connectionState === 'connected'}
              webhookUrl={state.config.snipeWebhookUrl || ''}
              onUpdateWebhook={(url) => handleUpdateConfig({ snipeWebhookUrl: url })}
              onTestWebhook={handleTestSnipeWebhook}
              onClearSnipe={handleClearSnipe}
            />
          )}

          {activeTab === 'logs' && state && (
            <LogsTab
              logs={state.logs}
              snipedCount={state.snipedMessages?.length || 0}
              onOpenSnipe={() => setActiveTab('snipe')}
            />
          )}

          {activeTab === 'export' && <ExportBotTab />}
        </main>
      </div>
    </div>
  );
}
