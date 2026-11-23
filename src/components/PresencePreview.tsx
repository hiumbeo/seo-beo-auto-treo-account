import { useEffect, useState } from 'react';
import { Gamepad2, Monitor, Radio, Volume2 } from 'lucide-react';
import type { ActivityConfig, DiscordUserProfile, RobloxAccountPublic, VoiceStatePublic } from '../types';

interface PresencePreviewProps {
  user: DiscordUserProfile | null;
  config: ActivityConfig;
  activityActive: boolean;
  activityStartedAt: number | null;
  streakDays: number;
  robloxAccount: RobloxAccountPublic | null;
  voice?: VoiceStatePublic;
}

export function formatElapsed(startedAt: number | null, nowMs: number): string {
  if (!startedAt) return '00:00:00';
  const totalSec = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

const STATUS_LABELS: Record<ActivityConfig['status'], { label: string; color: string }> = {
  online: { label: 'Trực tuyến', color: 'bg-emerald-500' },
  idle: { label: 'Chờ', color: 'bg-amber-500' },
  dnd: { label: 'Không làm phiền', color: 'bg-rose-500' },
  invisible: { label: 'Ẩn trạng thái', color: 'bg-slate-500' },
};

export function PresencePreview({
  user,
  config,
  activityActive,
  activityStartedAt,
  streakDays,
  robloxAccount,
  voice,
}: PresencePreviewProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [gameIconFailed, setGameIconFailed] = useState(false);

  const rbxSyncEnabled = Boolean(
    robloxAccount &&
      config.robloxSyncMode !== 'off' &&
      config.applicationId === '363445589247131668'
  );
  const liveInGame =
    rbxSyncEnabled && robloxAccount?.presence?.userPresenceType === 2
      ? robloxAccount.presence.gameName || robloxAccount.presence.lastLocation
      : null;

  const effectiveDetails =
    config.details.trim() || (liveInGame ? `Đang chơi: ${liveInGame}` : '');
  const effectiveState =
    config.state.trim() ||
    (rbxSyncEnabled && robloxAccount && config.robloxShowAccountInState
      ? `Acc: @${robloxAccount.username}`
      : '');

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.id, user?.avatar]);

  useEffect(() => {
    setGameIconFailed(false);
  }, [config.applicationId, config.iconHash, robloxAccount?.presence?.gameIconUrl]);

  useEffect(() => {
    if (!activityActive) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activityActive]);

  const avatarUrl =
    user && user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : null;

  const gameIconUrl =
    (liveInGame && robloxAccount?.presence?.gameIconUrl) ||
    (config.applicationId && config.iconHash
      ? `https://cdn.discordapp.com/app-icons/${config.applicationId}/${config.iconHash}.png?size=128`
      : null);

  const statusMeta = STATUS_LABELS[config.status] || STATUS_LABELS.online;

  return (
    <div className="bg-[#111622] border border-[#232C3F] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#232C3F] flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-slate-100">Xem trước Hồ sơ Discord</h3>
        <span className="text-xs text-slate-400 font-mono">
          {activityActive ? 'Đang phát trực tiếp' : 'Chưa kích hoạt'}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3.5 pb-5 border-b border-[#1E2638]">
          <div className="relative w-12 h-12 shrink-0 rounded-full bg-[#1C2333] border border-[#2C374F] flex items-center justify-center overflow-hidden">
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt={user?.username || 'Discord Avatar'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-semibold text-slate-300">
                {(user?.global_name || user?.username || 'D').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-white truncate">
              {user ? user.global_name || user.username : 'Chưa kết nối tài khoản'}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="truncate font-mono">
                {user ? `@${user.username}` : '@discord_user'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${statusMeta.color}`} />
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="text-xs font-medium text-slate-400 mb-3">
            Hoạt động đang chơi
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 shrink-0 rounded-md bg-[#182032] border border-[#2B3752] flex items-center justify-center overflow-hidden">
              {gameIconUrl && !gameIconFailed ? (
                <img
                  src={gameIconUrl}
                  alt={config.gameName || 'Game Icon'}
                  referrerPolicy="no-referrer"
                  onError={() => setGameIconFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gamepad2 className="w-7 h-7 text-[#5865F2]" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {config.gameName || 'Roblox'}
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  {activityActive ? formatElapsed(activityStartedAt, nowMs) : '00:00:00'}
                </span>
              </div>

              {effectiveDetails ? (
                <p className="text-xs text-slate-300 truncate">{effectiveDetails}</p>
              ) : (
                <p className="text-xs text-slate-500 truncate">
                  {config.executableName || 'robloxplayerbeta.exe'}
                </p>
              )}

              {effectiveState ? (
                <p className="text-xs text-slate-400 truncate">
                  {effectiveState}
                  {config.useParty ? ` (${config.partySize} / ${config.partyMax})` : ''}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Monitor className="w-3.5 h-3.5" />
                  PC Desktop
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">ID {config.applicationId}</span>
                {streakDays > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-medium tabular-nums">
                      Chuỗi {streakDays} ngày
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {voice?.connected && (
            <div className="mt-4 pt-4 border-t border-[#1E2638] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Volume2 className="w-3.5 h-3.5" />
                  Đang treo Voice ({voice.channelId})
                </span>
                {voice.streamActive && (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-mono font-semibold">
                    <Radio className="w-3.5 h-3.5" />
                    LIVE ẢNH
                  </span>
                )}
              </div>
              {voice.streamActive && (
                <div className="aspect-video w-full rounded-md overflow-hidden border border-[#27324A] bg-[#090C12]">
                  <img
                    src={voice.streamImageUrl}
                    alt="Đang stream ảnh trên Discord"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
